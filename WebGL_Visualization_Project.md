# WebGL Visualization System Project

## Project Overview
Create a WebGL-based visualization system to replace the problematic Blobs visualization with photorealistic fluid rendering capabilities.

## Problem Statement
The current Blobs visualization has persistent rectangular artifacts that appear during particle rendering, despite multiple debugging attempts over 4+ hours. The issue is traced to gradient creation (`createRadialGradient`) causing canvas context corruption and transform matrix issues.

## Requirements

### UI Requirements
- ✅ Use existing CSS in base.css only
- ✅ No JavaScript-generated UI elements
- ✅ No inline CSS
- ✅ No inherited properties except font
- ✅ HTML panel using existing panel positioning system
- ✅ Position to right of Blobs button
- ✅ Isolated system - no interference with other visualizations

### System Architecture
- ✅ Leave Blobs as-is for now
- ✅ Isolated WebGL system
- ✅ Layer above Infinite Zoom (z-index: 5)
- ✅ Future integration: Live Display, Record, Kaleidoscope
- ✅ Goal: Photorealistic fluid rendering with WebGL shaders

### Technical Specifications
- ✅ Default: WebGL Particle System
- ✅ Audio Integration: Frequency data, waveform data, beat detection
- ✅ Error Handling: "WebGL not supported. Check Browser settings."
- ✅ Target: MacBook Pro M1, latest OS, latest Chrome
- ✅ Visual Style: Configurable color schemes

## Research Findings

### Infinite Zoom Canvas Analysis
**Key Behaviors:**
1. **Canvas Creation & Sizing:**
   - Creates canvas with initial 800x600 dimensions
   - Uses `position: absolute`, `top: 0`, `left: 0`
   - `pointerEvents: none`
   - **Z-index: 4** (above kaleidoscope)
   - Resizes to fill `visualizationContainer` dimensions

2. **Resize Behavior:**
   - Gets container `getBoundingClientRect()`
   - Sets canvas width/height to container dimensions
   - No aspect ratio preservation - fills container completely

3. **Rendering:**
   - Uses 2D canvas context (`getContext('2d')`)
   - Updates via `update()` method with audio features
   - Handles zoom, rotation, object positioning
   - Audio-reactive with beat detection

### WebGL Best Practices Research
- Limit number of color stops in gradients to avoid browser rendering artifacts
- Use pre-rendered gradient images instead of dynamic generation
- Implement mesh-based gradients for smoother transitions
- Test across different browsers for rendering consistency
- Optimize canvas dimensions for performance

## Questions & Answers

### Q1: Which default visualization should we start with?
**A:** Particle System (similar to current blobs but WebGL)

### Q2: What specific settings should be exposed in the panel?
**A:** All correct, we will add if needed (particle count, size, speed, colors, gravity, audio reactivity)

### Q3: Should it replace Blobs entirely or be alongside it?
**A:** Leave Blobs as-is for now, position WebGL button to the right

### Q4: Any specific visual effects you want to prioritize?
**A:** Photorealistic fluid rendering with WebGL shaders

### Q5: Performance requirements?
**A:** Just an error message if WebGL not supported. Target requirements are MacBook Pro M1 running latest OS and latest Chrome.

### Q6: Visual style preferences?
**A:** Be configurable (multiple color schemes)

### Q7: Panel ID naming convention?
**A:** Should it be `webglPanel` or `webGLPanel`?

### Q8: Button ID naming convention?
**A:** Should it be `webglBtn` or `webGLBtn`?

### Q9: CSS Classes naming convention?
**A:** Any specific naming convention preferences?

### Q10: Initial Settings defaults?
**A:** What default values for particle count, size, etc.?

### Q11: Z-index placement?
**A:** 5 (above Infinite Zoom's z-index: 4)

### Q12: Canvas sizing behavior?
**A:** Yes, match Infinite Zoom's resize behavior exactly

### Q13: Audio integration approach?
**A:** Yes, use same audio features as Infinite Zoom

### Q14: Frame rate limiting?
**A:** Yes, implement frame rate limiting like other visualizations

### Q15: File structure - separate file?
**A:** Yes, implement in `mvpro_webgl.js` following existing architecture pattern

## Implementation Plan

### File Structure
```
js/mvpro_webgl.js
├── WebGLVisualizationManager (main class)
├── WebGLParticleSystem (default visualization)
├── WebGLShaderManager (shader compilation/management)
└── WebGLUtils (helper functions)
```

### Phase 1: UI Infrastructure
1. **Add WebGL button HTML** to header (right of Blobs button)
2. **Create WebGL panel HTML** using existing panel structure  
3. **Add CSS classes** in base.css for WebGL components
4. **Implement panel positioning** using existing system
5. **Add toggle functionality** (ON/OFF)

### Phase 2: WebGL Core System (`mvpro_webgl.js`)
1. **Create `WebGLVisualizationManager` class**
2. **Implement canvas creation** (mirror Infinite Zoom approach)
3. **Add resize method** (identical to Infinite Zoom)
4. **WebGL context management** with error handling
5. **Z-index: 5** (above Infinite Zoom)
6. **Frame rate limiting** (like other visualizations)

### Phase 3: Particle System Implementation
1. **Create `WebGLParticleSystem` class**
2. **Implement vertex/fragment shaders** for photorealistic fluid rendering
3. **Add audio reactivity** (same audio features as Infinite Zoom)
4. **Canvas fills container** (no aspect ratio constraints)
5. **Performance monitoring** and optimization

### Phase 4: Integration
1. **Connect UI controls** to WebGL parameters
2. **Integrate with existing audio system**
3. **Test isolation** (no interference with other visualizations)
4. **Add error handling** ("WebGL not supported. Check Browser settings.")

### Phase 4.5: Beat React System (NEW)
1. **Analyze Kaleidoscope beat detection** algorithm
2. **Create `WebGLBeatDetector` class** with improved algorithm
3. **Implement beat effects** for particles (size, speed, count, generation)
4. **Add configurable beat intensity** controls
5. **Design extensible beat system** for future liquid visualizations
6. **Ensure UI compliance** (HTML panels, CSS classes, no JS-generated UI)

### Phase 5: Future Extensibility
1. **Create plugin architecture** for new WebGL visualizations
2. **Plan integration points** for Live Display, Record, Kaleidoscope
3. **Document layer management** and performance requirements

### Phase 6: Liquid Visualization (Future)
1. **Replace particle system** with liquid simulation
2. **Implement photorealistic fluid rendering** (Navier-Stokes equations)
3. **Beat react adapts** to liquid parameters (viscosity, flow, surface tension)

## Technical Specifications
- **File**: `js/mvpro_webgl.js`
- **Z-index**: 5 (above Infinite Zoom)
- **Canvas sizing**: Match Infinite Zoom exactly
- **Audio integration**: Same features as Infinite Zoom
- **Frame rate**: Limited like other visualizations
- **Error handling**: Graceful degradation with user message
- **WebGL Context**: `getContext('webgl2')` with `webgl` fallback
- **Target Platform**: MacBook Pro M1, latest OS, latest Chrome

## Progress Tracking
- [x] Phase 1: UI Infrastructure ✅
- [x] Phase 2: WebGL Core System ✅
- [x] Phase 3: Particle System Implementation ✅
- [x] Phase 4: Integration ✅
- [ ] Phase 4.5: Beat React System (IN PROGRESS)
- [ ] Phase 5: Future Extensibility
- [ ] Phase 6: Liquid Visualization (Future)

## Notes
- Each phase allows for testing and plan updates
- WebGL system must be completely isolated from other visualizations
- Future integration planned for Live Display, Record, and Kaleidoscope
- Focus on photorealistic fluid rendering as primary goal
