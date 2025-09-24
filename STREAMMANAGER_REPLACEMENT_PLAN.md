# StreamManager Replacement Plan

## Overview
Complete replacement of StreamManager with LiveDisplayManager to fix Live Display functionality and ensure identical output to Record system.

## Approach
Build independent new system first, test thoroughly, then optionally remove old system.

## Phase Plan

### Phase 1: Create Independent LiveDisplayManager
- **Goal**: Create exact duplicate of RecordManager for streaming
- **Test**: Verify LiveDisplayManager can create composite canvas and stream
- **Deliverable**: New `LiveDisplayManager` class in `js/main.js`
- **Independence**: Completely separate from StreamManager

### Phase 2: Update MultiDisplayManager to Use LiveDisplayManager
- **Goal**: Connect MultiDisplayManager to new LiveDisplayManager
- **Test**: Verify multiple display windows work independently
- **Deliverable**: Working multi-display system with new backend
- **Independence**: Uses new system, ignores old StreamManager

### Phase 3: Test All Video Filters/Presets in New System
- **Goal**: Ensure all video filters and presets work in new displays
- **Test**: Verify Record and new Live Display produce identical output
- **Deliverable**: Complete working new system
- **Independence**: New system fully functional

### Phase 4: Remove Old StreamManager (Optional)
- **Goal**: Clean removal of old StreamManager code
- **Test**: Verify main window video still works, no errors
- **Deliverable**: Clean codebase
- **Independence**: Old system removed, new system remains

## Implementation Details

### Phase 1: LiveDisplayManager Class
```javascript
class LiveDisplayManager {
    constructor(visualizer, displayId = 'main') {
        this.visualizer = visualizer;
        this.displayId = displayId;
        this.isStreaming = false;
        this.pc = null;
        this.stream = null;
        this.compositeCanvas = null;
        this.compositeCtx = null;
        this.animationFrame = null;
        this.channel = new BroadcastChannel(`mvpro-live-display-${displayId}`);
        this.displayWindow = null;
        this.hasOffered = false;
        this.pendingIceCandidates = [];
        
        // IDENTICAL to RecordManager
        this.loadSettings();
        this.initializeUI();
    }
    
    // EXACT DUPLICATE of RecordManager methods:
    loadSettings() { /* same as Record */ }
    getRecordingDimensions() { /* same as Record */ }
    setupCompositeCanvas() { /* same as Record */ }
    startCompositing() { /* same as Record */ }
    compositeFrame() { /* same as Record */ }
    drawVideoWithProperLetterboxing() { /* same as Record */ }
    
    // NEW: WebRTC streaming instead of MediaRecorder
    async startStreaming() {
        // Create composite canvas (same as Record)
        await this.setupCompositeCanvas();
        
        // Get stream from composite canvas (same as Record)
        const videoStream = this.compositeCanvas.captureStream(30);
        
        // Setup WebRTC (new)
        this.pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        // Add tracks to peer connection
        videoStream.getVideoTracks().forEach(track => {
            this.pc.addTrack(track, videoStream);
        });
        
        // Start compositing (same as Record)
        this.startCompositing();
        
        // Setup WebRTC negotiation
        this.setupWebRTC();
    }
    
    // NEW: WebRTC methods
    setupWebRTC() { /* WebRTC negotiation logic */ }
    openDisplayWindow() { /* Open display.html window */ }
    handleAnswer(answer) { /* Handle WebRTC answer */ }
    handleIceCandidate(candidate) { /* Handle ICE candidates */ }
}
```

### Phase 2: MultiDisplayManager Integration
```javascript
class MultiDisplayManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.displays = new Map();
        this.displayManagers = new Map(); // NEW: Store LiveDisplayManager instances
        
        this.init();
    }
    
    // NEW: Create LiveDisplayManager for each display
    createDisplay(displayId) {
        const displayManager = new LiveDisplayManager(this.visualizer, displayId);
        this.displayManagers.set(displayId, displayManager);
        
        const display = new DisplayInstance(displayId, this.visualizer, displayManager);
        this.displays.set(displayId, display);
        
        return display;
    }
    
    // UPDATE: Use LiveDisplayManager for streaming
    toggleDisplay(displayId) {
        const display = this.displays.get(displayId);
        const displayManager = this.displayManagers.get(displayId);
        
        if (display && display.window && !display.window.closed) {
            // Close existing display
            displayManager.stopStreaming();
            display.close();
            this.displays.delete(displayId);
            this.displayManagers.delete(displayId);
            this.updateDisplayButton(displayId, false);
        } else {
            // Create new display with LiveDisplayManager
            const newDisplay = this.createDisplay(displayId);
            
            if (newDisplay.openWindow()) {
                this.updateDisplayButton(displayId, true);
                // Start streaming with LiveDisplayManager
                setTimeout(() => {
                    const manager = this.displayManagers.get(displayId);
                    manager.startStreaming();
                }, 1000);
            } else {
                this.displays.delete(displayId);
                this.displayManagers.delete(displayId);
            }
        }
    }
}
```

## Success Criteria

### Phase 1 Success:
- LiveDisplayManager creates composite canvas
- LiveDisplayManager can start streaming
- No errors in console
- Completely independent from StreamManager

### Phase 2 Success:
- Multiple display windows work
- Each display uses LiveDisplayManager
- All displays show identical content
- No StreamManager interference

### Phase 3 Success:
- All video filters work in new displays
- All presets work in new displays
- Record and Live Display produce identical output
- Performance is acceptable

### Phase 4 Success:
- StreamManager completely removed
- Main window video still works
- No StreamManager errors
- New system still works

## Benefits

### Safety:
- Old system remains until new system is proven
- No risk of breaking existing functionality
- Easy rollback if issues arise

### Independence:
- New system completely separate
- No interference with old system
- Clean testing environment

### Gradual Migration:
- Build new system first
- Test thoroughly before removal
- User can choose which system to use

## Current Status
- **Phase 1**: Ready to implement
- **Phase 2**: Pending Phase 1 completion
- **Phase 3**: Pending Phase 2 completion
- **Phase 4**: Optional, pending Phase 3 completion
