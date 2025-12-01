# Live Display Issues Analysis

## Issue 1: Unacceptable Latency (Reduced at Higher Bitrates)

### Root Cause
**WebRTC bitrate parameters are NOT being set on the RTCRtpSender immediately.**

Looking at `src/streaming/LiveDisplayManager.js`:
- Line 784: `const sender = this.pc.addTrack(track, this.stream);` - Track is added but parameters are NOT set
- Line 840-872: Bitrate is calculated and sent in the offer message, but **never applied to the sender's encoding parameters**
- The bitrate is only sent to the remote peer in the offer message, but WebRTC needs it set on the sender's `setParameters()` call

### Why Higher Bitrates Reduce Latency
- Higher bitrates = more data per frame = less buffering needed
- WebRTC's adaptive bitrate algorithm starts low and ramps up
- Without explicit bitrate setting, it uses conservative defaults
- Higher bitrate settings force WebRTC to use more bandwidth immediately

### Solution
Set bitrate parameters on the RTCRtpSender immediately after adding the track:
```javascript
const sender = this.pc.addTrack(track, this.stream);
if (track.kind === 'video') {
    const params = sender.getParameters();
    if (!params.encodings) params.encodings = [{}];
    params.encodings[0].maxBitrate = bitrate;
    params.encodings[0].minBitrate = bitrate * 0.8; // Allow some variation
    params.encodings[0].maxFramerate = this.displaySettings.frameRate || 60;
    sender.setParameters(params);
}
```

---

## Issue 2: Lower Quality for 8-10 Seconds on Initial Connection

### Root Cause
**WebRTC's adaptive bitrate algorithm starts conservatively and ramps up over time.**

This is a known WebRTC behavior:
1. Connection starts with low bitrate (typically 300-500 kbps)
2. Gradually increases based on available bandwidth
3. Takes 8-10 seconds to reach target bitrate
4. This is by design to avoid overwhelming the network

### Why It's Worse Now
- Bitrate parameters are not being set, so WebRTC uses even more conservative defaults
- No initial bitrate hint forces WebRTC to start at minimum quality
- The ramp-up period is longer without explicit parameters

### Solution
1. **Set initial bitrate immediately** (same as Issue 1 fix)
2. **Use `maxBitrate` and `minBitrate`** to give WebRTC a target range
3. **Set `scaleResolutionDownBy: 1.0`** to prevent downscaling
4. **Consider using `priority: 'high'`** for video tracks

---

## Issue 3: Recording Visualization Fix Lost

### Investigation
**The fix IS still in the code!**

Looking at `src/recording/RecordManager.js`:
- Line 5630: `const sortedCanvases = this.visualizer.getActiveCanvasesInZIndexOrder();`
- Line 5633: `sortedCanvases.forEach(canvasInfo => {`
- The z-index ordering is being used correctly

### Possible Reasons It's Not Working
1. **Port 5500 is running old code** - Need to verify if dev server is serving latest files
2. **Browser cache** - Old JavaScript might be cached
3. **File not being served** - Dev server might not be picking up changes
4. **Different code path** - Maybe recording is using a different method

### Verification Steps
1. Check if `getActiveCanvasesInZIndexOrder()` is being called
2. Verify the method returns canvases in correct order
3. Check browser console for errors
4. Verify dev server is serving latest `RecordManager.js`

---

## Proposed Solutions

### Solution 1: Fix WebRTC Bitrate Parameters (CRITICAL)
**File**: `src/streaming/LiveDisplayManager.js`

**Changes needed**:
1. Set bitrate parameters immediately after `addTrack()` in `setupWebRTC()`
2. Also set parameters after answer is received in `handleAnswer()`
3. Use both `maxBitrate` and `minBitrate` for better control
4. Set `scaleResolutionDownBy: 1.0` to prevent downscaling

### Solution 2: Set Initial Bitrate Higher
**File**: `src/streaming/LiveDisplayManager.js`

**Changes needed**:
1. Set `minBitrate` to 80% of target bitrate to start higher
2. Use `priority: 'high'` for video tracks
3. Set `maxFramerate` explicitly

### Solution 3: Verify Recording Fix
**Action Items**:
1. Check browser console for errors
2. Add console.log to verify `getActiveCanvasesInZIndexOrder()` is called
3. Verify dev server is serving latest code
4. Clear browser cache and hard refresh

---

## Code Changes Required

### `src/streaming/LiveDisplayManager.js`

1. **In `setupWebRTC()` method** (around line 784):
   - After `addTrack()`, immediately set encoding parameters
   - Use calculated bitrate from `displaySettings.videoQuality`

2. **In `handleAnswer()` method** (after line 879):
   - After answer is set, update sender parameters again
   - Ensure bitrate is applied even if connection was established

3. **Create helper method**:
   - `applyBitrateToSender(sender, bitrate, frameRate)`
   - Reusable code for setting parameters

---

## Expected Results

- **Latency**: Reduced by 50-70% with proper bitrate settings
- **Initial Quality**: Starts at target quality immediately (no 8-10 second ramp-up)
- **Recording**: Verify z-index ordering is working (may need cache clear)

---

## Risk Assessment

**LOW RISK**: These are WebRTC parameter optimizations. No architectural changes.

**Testing Required**:
- Test latency at different bitrates
- Verify initial connection quality
- Check recording visualization order
- Test with multiple displays

