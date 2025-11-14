# Chique Plugin - Troubleshooting Guide

## Quick Diagnostics

### Use the Test Page First

Before deploying to Freque, use `test-character.html`:

1. Place `test-character.html` in same directory as `moho_char.gltf`
2. Open in browser (via local web server or file://)
3. Should see character load and rotate
4. If this works, GLTF is valid
5. If this fails, texture paths or GLTF is corrupt

## Common Issues

### Issue 1: "Failed to load GLTF"

**Symptoms:**
- Plugin loads but character doesn't appear
- Console shows 404 error
- Status message shows loading error

**Solutions:**

A. **Check file path in chique.js**
```javascript
// Line ~343 in chique.js
const gltfPath = './plugins/chique/moho_char.gltf';
```

Might need to be:
```javascript
const gltfPath = './moho_char.gltf';  // If in same directory
// or
const gltfPath = '../moho_char.gltf';  // If path is different
```

B. **Verify file location**
```
plugins/
  chique/
    ├── chique.js          ← Check here
    └── moho_char.gltf     ← Must be here
```

C. **Check filename case**
- Filename must be exactly: `moho_char.gltf`
- Case-sensitive on Linux/Mac servers

### Issue 2: "Textures not loading / White character"

**Symptoms:**
- Character appears but is white/blank
- Console shows 404 errors for PNG files
- Character loads but has no texture detail

**Solutions:**

A. **Verify texture folder name**
Must be exactly: `moho_char__gltf` (double underscore)

```
plugins/chique/
  ├── moho_char.gltf
  └── moho_char__gltf/    ← Check this folder name
```

B. **Check all PNGs are present**
Run this in terminal:
```bash
ls -1 moho_char__gltf/ | wc -l
```
Should return: 41

C. **Verify PNG filenames match GLTF**
The GLTF file references specific filenames with GUIDs. They must match exactly:
- `cabeza_copy_bc89490f-62e7-4149-b987-35a11ea8f72b.png`
- NOT `cabeza_copy.png`
- NOT `Cabeza_Copy_bc89490f.png`

D. **Check relative paths**
Open `moho_char.gltf` and search for "uri":
```json
"uri":"moho_char__gltf/cabeza_copy_bc89490f-62e7-4149-b987-35a11ea8f72b.png"
```
Paths should start with `moho_char__gltf/`

### Issue 3: "Character not animating"

**Symptoms:**
- Character loads and appears
- No movement when audio plays
- All visual but no audio reactivity

**Solutions:**

A. **Check audio is playing**
- Open Freque audio visualizer
- Verify audio input is active
- Try a test tone or loud music

B. **Increase intensity**
- Open plugin controls
- Set "Overall Intensity" to 2.0
- Set "Head Bob" to 2.0
- Try "Headbanger" preset

C. **Check console for errors**
```javascript
// Look for:
[Chique] Found X bones  // Should be > 0
```

D. **Verify bones are indexed**
Add debug logging to `animateBones()`:
```javascript
animateBones() {
    console.log('Animating with bands:', this.smoothedBands);
    // ... rest of code
}
```

### Issue 4: "Plugin not appearing in Freque"

**Symptoms:**
- Chique not in plugin list
- Other plugins work fine
- No errors in console

**Solutions:**

A. **Check file location**
```
freque/
  plugins/
    chique/
      chique.js    ← Must be here
```

B. **Verify Freque plugin system**
Check if other custom plugins load. If not, Freque's plugin system may not be enabled.

C. **Check JavaScript syntax**
Open browser console while loading Freque
Look for syntax errors in chique.js

D. **Verify auto-registration**
Bottom of chique.js should have:
```javascript
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new ChiquePlugin(window.visualizer);
    }
}, 500);
```

### Issue 5: "Character is too small/large"

**Solutions:**

A. **Adjust Character Scale control**
- Open plugin controls
- Adjust "Character Scale" slider
- Range: 0.1 - 3.0

B. **Adjust Camera Distance**
- Increase "Camera Distance" to zoom out
- Decrease to zoom in
- Range: 5 - 50

C. **Modify scale in code**
Edit chique.js line ~333:
```javascript
this.character.scale.set(2.0, 2.0, 2.0);  // Make bigger
```

### Issue 6: "Poor performance / Lag"

**Symptoms:**
- Low framerate
- Stuttering animation
- Browser feels slow

**Solutions:**

A. **Reduce feather intensity**
- Lower "Feather Flutter" to 0.5
- Feathers are most performance-intensive

B. **Increase smoothing**
- Set "Motion Smoothing" to 0.3+
- Reduces update frequency

C. **Close other plugins**
- Disable other active Freque plugins
- Each plugin uses GPU/CPU resources

D. **Check browser hardware acceleration**
- Chrome: `chrome://gpu`
- Should show "Hardware accelerated"

E. **Lower renderer quality**
Edit chique.js line ~277:
```javascript
this.renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,  // Change from true
    preserveDrawingBuffer: true
});
```

### Issue 7: "Beat detection not working"

**Symptoms:**
- No pulse on beats
- Character doesn't react to kicks/snares

**Solutions:**

A. **Enable Beat Pulse**
- Check "Beat Pulse" checkbox is enabled

B. **Test with strong beat**
- Use music with clear kicks
- Try electronic music or test tone

C. **Adjust threshold**
Edit chique.js line ~47:
```javascript
this.beatDetection = {
    lastBeatTime: 0,
    threshold: 1.1,  // Lower = more sensitive (was 1.3)
    minTimeBetweenBeats: 200
};
```

D. **Check energy history**
Add debug logging:
```javascript
detectBeat(timestamp) {
    console.log('Energy:', this.currentEnergy, 'Avg:', this.smoothedEnergy);
    // ... rest of code
}
```

### Issue 8: "Bones not found"

**Symptoms:**
- Console shows: `[Chique] Found 0 bones`
- Character loads but doesn't animate

**Solutions:**

A. **Check GLTF structure**
Open test-character.html to verify bones are indexed

B. **Verify bone naming**
MOHO exports use format: `L|bonename__XXXX`
Example: `L|cabeza copy__0012`

C. **Debug bone indexing**
Add logging to `indexBones()`:
```javascript
indexBones(object) {
    object.traverse((child) => {
        console.log('Found node:', child.name);
        // ... rest of code
    });
}
```

### Issue 9: "CORS errors"

**Symptoms:**
- Console shows: "CORS policy blocked"
- Textures fail to load
- Character appears white

**Solutions:**

A. **Run from web server**
Don't use `file://` protocol
Use local server:
```bash
python -m http.server 8000
# or
npx serve
```

B. **Check server CORS headers**
Server must allow cross-origin texture loading

C. **Use relative paths**
Ensure GLTF uses relative paths (not absolute URLs)

### Issue 10: "Three.js not defined"

**Symptoms:**
- Console: `THREE is not defined`
- Plugin fails to initialize

**Solutions:**

A. **Verify Three.js is loaded**
Check Freque includes Three.js before plugins load

B. **Check version compatibility**
Plugin tested with Three.js r128
Might need updates for newer versions

C. **Add Three.js dependency check**
Top of chique.js:
```javascript
if (typeof THREE === 'undefined') {
    console.error('[Chique] Three.js not loaded!');
    alert('Chique requires Three.js. Please ensure Freque has Three.js enabled.');
}
```

## Debug Checklist

Before asking for help, verify:

- [ ] test-character.html works
- [ ] All 41 PNG files present in moho_char__gltf/
- [ ] Filenames match exactly (with GUIDs)
- [ ] Browser console shows no errors
- [ ] Audio is playing in Freque
- [ ] Plugin appears in Freque plugin list
- [ ] Character visible in viewport
- [ ] Controls panel accessible
- [ ] Three.js loaded (check console: `THREE`)

## Getting Help

### Information to Provide

When reporting issues, include:

1. **Browser & OS**: Chrome 98 on Windows 10
2. **Freque version**: 2.1.0
3. **Console errors**: Copy full error messages
4. **File structure**: Screenshot of directory
5. **What works**: test-character.html? Other plugins?
6. **What doesn't work**: Specific symptoms

### Console Commands for Debugging

Open browser console (F12) and try:

```javascript
// Check Three.js loaded
console.log(THREE);

// Check plugin registered
console.log(window.visualizer);

// Check audio data
console.log(window.visualizer.getAudioFrequencies());

// Check bones (after character loads)
// Find plugin instance and check bones object
```

## Advanced Troubleshooting

### Test Individual Components

1. **Test GLTF loading** → Use test-character.html
2. **Test bone indexing** → Check console logs
3. **Test audio data** → Print frequency values
4. **Test animation code** → Use test animation button

### Isolate the Problem

Work backwards:
1. Does character appear at all? (Rendering works)
2. Do controls appear? (UI works)
3. Does character move manually? (Controls work)
4. Does audio play? (Audio system works)
5. Do bones respond to controls? (Mapping works)

### Compare with Working Plugin

If other Freque plugins work:
- Compare file structure
- Compare registration code
- Check if Three.js initialization differs

## Still Not Working?

### Nuclear Options

A. **Fresh start**
1. Delete entire chique directory
2. Re-download all files
3. Verify checksums/file sizes
4. Reinstall from scratch

B. **Simplify character**
Try with simpler GLTF to rule out model issues

C. **Use different browser**
Test in Chrome, Firefox, and Edge

D. **Check Freque updates**
Update Freque to latest version

## Prevention Tips

### Before Deployment

1. ✅ Test with test-character.html
2. ✅ Verify all files present
3. ✅ Check console for errors
4. ✅ Test in Freque with simple audio first
5. ✅ Create backup of working version

### After Changes

1. ✅ Test immediately after modifications
2. ✅ Keep previous working version
3. ✅ Document changes made
4. ✅ Test with multiple audio sources

---

**Last Resort**: Re-export character from MOHO with simplified hierarchy and test with minimal bone set first.
