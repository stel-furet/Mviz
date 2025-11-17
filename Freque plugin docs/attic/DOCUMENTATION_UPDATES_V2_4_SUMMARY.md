# Freque Plugin Documentation Updates v2.4

**Summary of Changes - November 14, 2025**

---

## What's New in v2.4

### GLB/GLTF Character Integration Guide
- Complete implementation guide for audio-reactive bone manipulation
- Generic patterns applicable to any character model or animation style
- Multi-cycle rhythm layering techniques
- Relative bone transformation patterns
- Common pitfalls and solutions

---

## Documentation Structure

### Core Guides

1. **FREQUE_PLUGIN_DEVELOPMENT_GUIDE_V2_3.md**
   - Main technical reference for all plugin types
   - Canvas contexts, WebGL, Three.js integration
   - No changes required for v2.4

2. **CREATING_PLUGINS_WITH_CLAUDE_V2_3.md**
   - Prompt templates for Claude AI
   - Request patterns for different plugin types
   - No changes required for v2.4

3. **GLTF_CHARACTER_PLUGIN_INTEGRATION_GUIDE.md** ⭐ NEW
   - GLB/GLTF model loading and integration
   - Procedural skeletal animation implementation
   - Audio-reactive bone manipulation
   - Multi-cycle rhythm systems
   - Complete code examples and patterns
   - Generic patterns for any animation style

4. **QUICK_REFERENCE_CARD_V2_3.md**
   - One-page cheat sheet
   - No changes required for v2.4

5. **README_V2_4.md**
   - Overview and quick start
   - Updated with v2.4 content

---

## New Content: GLB/GLTF Character Animation

### Topics Covered

#### Core Concepts
- Procedural vs pre-baked animations
- Relative bone transformations
- Root bone hierarchy (hips → legs → feet)
- Multi-cycle rhythm layering
- Compound movement systems

#### Implementation Patterns

**Relative Transformations:**
```javascript
// Store base pose from pre-baked animation
if (!this.baseRotations) {
    this.baseRotations.hips = {
        x: bone.rotation.x,
        y: bone.rotation.y,
        z: bone.rotation.z
    };
}

// Apply procedural movement as offset
const offset = Math.sin(time) * amount;
bone.rotation.z = this.baseRotations.hips.z + offset;
```

**Multi-Cycle Variation:**
```javascript
const longCycle = time * 0.2 * Math.PI * 2;   // 30s
const mediumCycle = time * 0.5 * Math.PI * 2; // 12s
const shortCycle = time * 0.9 * Math.PI * 2;  // 7s

const variation = Math.sin(longCycle) * 0.5 + 0.5;
const amount = baseAmount * (0.7 + variation * 0.6);
```

**Stationary Character (Feet Planted):**
```javascript
// Minimal hip rotation
const hipAmount = 0.01;  // < 0.02 keeps feet stable

// Major spine rotation
const spineAmount = 0.25;  // Creates visible movement
```

#### Audio Integration

**Beat Detection:**
```javascript
const beatIntensity = Math.min(bassEnergy * 2, 1.0);
const movementAmount = baseAmount * (1 + beatIntensity * 0.5);
```

**Energy-Based State Management:**
```javascript
if (customMode && totalEnergy >= MIN_ENERGY) {
    // Apply procedural animation
} else if (!customMode && totalEnergy > MIN_ENERGY) {
    // Use pre-baked animations
} else {
    // Return to idle
}
```

#### Common Pitfalls

1. **Character Rotation Issues**
   - ❌ Rotating entire character to fix orientation
   - ✅ Use relative bone transformations from base pose

2. **Feet Movement/Floating**
   - ❌ Too much hip rotation (> 0.02 radians)
   - ✅ Minimal hips, major spine/torso rotation

3. **Repetitive Animation**
   - ❌ Single sine wave
   - ✅ Multiple overlapping cycles with variation

4. **Broken Pose on Mode Change**
   - ❌ Not clearing base rotations
   - ✅ Reset baseRotations when switching modes

---

## Usage Recommendations

### For Plugin Developers

**When creating GLB/GLTF character plugins:**

1. **Read the main guide first:**
   - FREQUE_PLUGIN_DEVELOPMENT_GUIDE_V2_3.md

2. **For character integration:**
   - GLTF_CHARACTER_PLUGIN_INTEGRATION_GUIDE.md

3. **For AI-assisted development:**
   - CREATING_PLUGINS_WITH_CLAUDE_V2_3.md

4. **For quick reference:**
   - QUICK_REFERENCE_CARD_V2_3.md

### For Claude AI

**When prompting for character animation:**

```
Claude, create a GLB/GLTF character plugin for Freque:

Reference: See GLTF_CHARACTER_PLUGIN_INTEGRATION_GUIDE.md for implementation patterns

Requirements:
- Load GLB/GLTF model with pre-baked animations
- Add procedural animation mode with audio reactivity
- Relative bone transformations (store base, apply offsets)
- Multi-cycle rhythm layering (3-5 different frequencies)
- Minimal root bone movement (if character should stay stationary)
- Proper state management for mode toggling

Movement Style: [Describe: e.g., swaying, gesturing, etc.]
Audio Mapping: [Specify how audio affects movement]
```

---

## File Organization

```
Freque plugin docs 11-10-noon/
│
├── FREQUE_PLUGIN_DEVELOPMENT_GUIDE_V2_3.md
│   └── Main technical reference
│
├── CREATING_PLUGINS_WITH_CLAUDE_V2_3.md
│   └── AI prompting guide
│
├── GLTF_CHARACTER_PLUGIN_INTEGRATION_GUIDE.md ⭐ NEW
│   └── GLB/GLTF character animation guide
│
├── QUICK_REFERENCE_CARD_V2_3.md
│   └── One-page cheat sheet
│
├── README_V2_4.md
│   └── Overview and quick start
│
└── DOCUMENTATION_UPDATES_V2_4_SUMMARY.md ⭐ NEW
    └── This file
```

---

## Key Features

### GLB/GLTF Integration

✅ **Model Loading:**
- Load character models from GLB/GLTF files
- Extract skeleton and bone hierarchy
- Support multiple character models

✅ **Animation Systems:**
- Pre-baked animations from model files
- Procedural skeletal animation
- Hybrid modes combining both approaches

✅ **Audio Reactivity:**
- Beat detection from bass frequencies
- Energy-based movement intensity
- Multi-frequency audio mapping

### Procedural Animation Features

**Rhythm Layers:**
- Multiple time scales (e.g., 30s, 12s, 7s cycles)
- Beat-synchronized primary movement
- Long-cycle variation for organic feel

**Bone Manipulation:**
- Hips: Minimal (for stationary characters)
- Spine/Torso: Major movement source
- Head: Bob, nod, sway
- Shoulders: Lift, roll, shrug
- Arms: Swing, gesture, position

**Audio Mapping:**
- Bass (0-150 Hz) → Beat intensity
- Mid (150-500 Hz) → Variation timing
- Treble (500-2000 Hz) → Movement accents
- Total energy → Mode activation threshold

**Performance:**
- ~50-60 math operations per frame
- <0.1ms computation time
- <1KB memory overhead
- Maintains 60fps on target hardware

---

## Version History

### v2.4 (November 14, 2025)
- Added GLB/GLTF character integration guide
- Documented generic procedural animation patterns
- Added multi-cycle rhythm techniques
- Documented common pitfalls and solutions
- Removed plugin-specific references

### v2.3 (November 10, 2025)
- WebGL/WebGL2 plugin architecture
- Context type flexibility
- Lazy context loading
- Backwards compatibility

### v2.2 (Previous)
- Cube camera video reflection system
- Layer management
- Color space management

### v2.1 (Previous)
- Float speed non-linear scaling
- Video intensity auto-adjustment
- Control update behavior

---

## Future Enhancements

### Potential Additions

**Advanced Animation Techniques:**
- IK (Inverse Kinematics) integration
- Physics-based secondary motion
- Facial expression animation
- Hand gesture systems

**Audio Features:**
- BPM detection and sync
- Melodic contour following
- Genre-specific movement styles
- User-recordable gesture patterns

**Performance:**
- Animation state caching
- Bone hierarchy optimization
- SIMD vector operations
- Web Worker offloading

---

## Migration Notes

### No Breaking Changes

**v2.4 is fully backwards compatible:**
- Existing plugins work unchanged
- No API modifications
- Pure additive documentation
- New patterns are optional

**When to adopt v2.4 patterns:**
- Creating new GLB/GLTF character plugins
- Adding procedural animation to existing characters
- Implementing audio-reactive bone manipulation
- Building any character animation systems

---

## Support and Resources

### Documentation
- Full guides in `Freque plugin docs 11-10-noon/`
- Generic code examples applicable to any plugin
- Reference implementations in `js/plugins/`

### Example Implementations
GLB/GLTF character plugins in the Freque ecosystem demonstrate these patterns in practice. Check the plugin directory for working examples.

### Community
- Freque Discord server
- GitHub issues and discussions
- Plugin showcase and examples

---

## Conclusion

v2.4 documentation adds comprehensive coverage of GLB/GLTF character integration and procedural skeletal animation techniques. These patterns are generic and applicable to any animation style or character model.

The addition focuses on:
- **Generic implementation patterns** over specific examples
- **Flexible techniques** for any animation style
- **Common pitfalls** and proven solutions
- **Complete code samples** ready to adapt

All existing documentation remains valid and unchanged. v2.4 is a pure additive release.

---

**Documentation Version:** 2.4  
**Release Date:** November 14, 2025  
**Status:** Complete ✅
