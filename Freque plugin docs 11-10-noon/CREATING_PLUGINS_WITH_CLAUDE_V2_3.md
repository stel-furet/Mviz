# Creating Freque Plugins with Claude v2.2

**Complete guide for using Claude to create audio-reactive visualizations**

---

## What's New in v2.2

- **WebGL/WebGL2 Plugin Prompting** - How to request shader-based visualizations ⭐ NEW
- **Procedural Effect Patterns** - Prompting for GPU-accelerated effects ⭐ NEW
- **PSYCH Plugin as Reference** - Real-world WebGL2 example ⭐ NEW

## What's in v2.1

- **Advanced Control Patterns** - Non-linear scaling and source-dependent adjustments

## What's in v2.0

- **Video Reflection Prompting** - How to request cube camera systems
- **Advanced Three.js Requests** - Complex 3D scene prompting
- **Performance Considerations** - Asking for optimized implementations
- **Dual Mode Patterns** - Requesting multiple rendering modes

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [The Universal Plugin Prompt](#the-universal-plugin-prompt)
3. [Requesting 2D Canvas Plugins](#requesting-2d-canvas-plugins) ⭐ NEW
4. [Requesting WebGL/WebGL2 Plugins](#requesting-webglwebgl2-plugins) ⭐ NEW
5. [Requesting Three.js Plugins](#requesting-threejs-plugins)
6. [Video Reflection Systems](#video-reflection-systems)
7. [Common Request Patterns](#common-request-patterns)
8. [Troubleshooting](#troubleshooting)

---

# Quick Start

## Your First Plugin in 10 Minutes

### Step 1: Copy the Template

```
Claude, create a Freque plugin:

Plugin Name: particleburst
Type: 2D Canvas

Visual Description:
Colorful particles that burst outward from the center on beat drops.

Audio Reactivity:
- Bass: Triggers particle bursts
- Mid: Controls particle speed
- Treble: Changes particle colors

Controls:
- Particle Count: dial, 50-500, default 200
- Burst Size: dial, 1.0-5.0, default 2.0
- Color Scheme: dropdown with dropdown-selector-mixer class, [Rainbow, Warm, Cool, Monochrome]
- Auto Burst: checkbox toggle with btn-primary-mixer class, starts OFF, automatic particle bursts

Presets:
1. Gentle: Small bursts, slow speed, cool colors
2. Intense: Large bursts, fast speed, warm colors
```

### Step 2: Send to Claude

Copy the filled template and send it. Claude will generate complete, working code.

### Step 3: Save the File

Save as `particleburst-freque-plugin.js` in the `js/plugins/` directory.

### Step 4: Reload Freque

Refresh your browser. The plugin appears in the mixer!

---

# The Universal Plugin Prompt

## Complete Template

```
Claude, help me create a Freque plugin:

═══════════════════════════════════════
BASIC INFO
═══════════════════════════════════════
Plugin Name: [one-word-or-hyphenated]
Type: [2D Canvas / WebGL Shader / WebGL2 Shader / 3D Three.js]
Description: [one sentence description]

═══════════════════════════════════════
VISUAL DESCRIPTION
═══════════════════════════════════════
Main Elements:
[Describe what you see - particles, shapes, lines, etc.]

Movement Style:
[How things move - float, spin, pulse, wave, etc.]

Color Scheme:
[Colors and how they change with audio]

Layout:
[Where things appear - center, edges, random, grid, etc.]

Special Effects:
[Any special visual effects - glow, trails, fade, blur, etc.]

═══════════════════════════════════════
AUDIO REACTIVITY
═══════════════════════════════════════
Bass Response (Low Frequencies):
[What bass affects - size, quantity, movement speed, etc.]

Mid Response (Mid Frequencies):
[What mids affect - rotation, color, spread, etc.]

Treble Response (High Frequencies):
[What treble affects - brightness, detail, shimmer, etc.]

Beat Detection:
[What happens on beat drops - burst, pulse, flash, etc.]

═══════════════════════════════════════
CONTROLS
═══════════════════════════════════════
IMPORTANT: 
- Toggle controls use checkbox type with className: 'btn-primary-mixer'
- Numeric controls use dial type (not slider)
- Dropdowns must include className: 'dropdown-selector-mixer'

Dials (numeric controls):
- [Name]: dial, [min]-[max], default [value], [what it controls]

Dropdowns (must include className):
- [Name]: dropdown with dropdown-selector-mixer class, [option1, option2, option3...], [what it controls]

Toggles (ON/OFF switches - must include className):
- [Name]: checkbox toggle with btn-primary-mixer class, starts [ON/OFF], [what it toggles on/off]

Mode Buttons (switches between modes):
- [Name]: button toggle, switches between [Mode A / Mode B]

Action Buttons (one-time actions):
- [Name]: button, [what it does when clicked]

═══════════════════════════════════════
PRESETS (minimum 2)
═══════════════════════════════════════
Preset 1 - [Name]:
Purpose: [What music/mood this suits]
Settings: [Key control values]

Preset 2 - [Name]:
Purpose: [What music/mood this suits]
Settings: [Key control values]

Preset 3 - [Name] (optional):
Purpose: [What music/mood this suits]
Settings: [Key control values]

═══════════════════════════════════════
SPECIAL REQUESTS
═══════════════════════════════════════
[Any specific techniques, technologies, references]
[Performance requirements]
[Compatibility needs]
```

---

# Requesting Three.js Plugins

## Basic Three.js Request

```
Claude, create a Three.js plugin for Freque:

Plugin Name: floatingspheres
Type: 3D Three.js

Create floating metallic spheres that reflect the video/background.
Use proper Freque Three.js setup with:
- Container-based sizing (not canvas buffer)
- Individual CSS property assignment
- Proper environment mapping from video or background image
```

## Important: Three.js Setup Requirements

**ALWAYS include this in Three.js requests:**

```
CRITICAL Three.js Requirements:
1. Get dimensions from #visualizationContainer element
2. Use manual CSS property assignment (NOT cssText copying)
3. Set canvas CSS to width: 100% and height: 100%
4. Use devicePixelRatio for high-DPI displays
5. Set output encoding to sRGBEncoding
```

Claude has been trained on these patterns and will implement them correctly.

---

# Requesting 2D Canvas Plugins

## When to Use 2D Canvas

Best for:
- Simple visualizations (waveforms, spectrum analyzers)
- Drawing shapes, text, images
- Particle systems in 2D space
- Classic canvas drawing API effects

## 2D Canvas Plugin Template

```
Claude, create a 2D canvas Freque plugin:

Plugin Name: waveform-pulse
Type: 2D Canvas

Visual Description:
An animated waveform that draws across the screen from left to right.
The waveform height responds to audio amplitude. Background fades slowly
creating a trailing effect.

Audio Reactivity:
- Bass: Controls waveform thickness
- Mid: Controls waveform amplitude
- Treble: Changes waveform color (hue shift)
- Beat detection: Creates a pulse flash

Controls:
- Line Thickness: dial, 1-10, default 3
- Smoothness: dial, 0.1-1.0, default 0.5
- Color Scheme: dropdown with dropdown-selector-mixer class, [Rainbow, Warm, Cool, Monochrome]
- Fade Speed: dial, 0.01-0.5, default 0.1

Presets:
1. Smooth: Thin lines, high smoothness, cool colors, slow fade
2. Aggressive: Thick lines, low smoothness, warm colors, fast fade
```

## 2D Canvas Key Points

**What Claude will use:**
- `this.ctx` for 2D canvas context (auto-created)
- Canvas drawing methods: `fillRect`, `strokeRect`, `beginPath`, `lineTo`, etc.
- `this.canvas.width` and `this.canvas.height` for dimensions
- Standard canvas compositing and blend modes

**Example request phrases:**
- "Draw circles using canvas arc"
- "Use fillRect to create bars"
- "Apply motion blur with low alpha clearRect"
- "Use canvas gradients for color effects"

---

# Requesting WebGL/WebGL2 Plugins

## When to Use WebGL/WebGL2

Best for:
- **Procedural shader effects** (liquid simulations, fractals, noise)
- **GPU-accelerated effects** (thousands of particles, complex calculations)
- **Fullscreen shader art** (raymarching, domain warping, procedural textures)
- **Advanced post-processing** (blur, bloom, distortion)

**Browser Support:**
- WebGL 1.0: ~97% (excellent compatibility)
- WebGL 2.0: ~95% (good compatibility)

## WebGL2 Plugin Template (Advanced Shaders)

```
Claude, create a WebGL2 shader-based Freque plugin:

Plugin Name: liquid-flow
Type: WebGL2 Shader

Visual Description:
Procedural liquid/bubble effect using domain warping and metaballs.
Smooth organic flowing shapes with bright edge highlights and
iridescent shimmer effects. Think lava lamp meets soap bubbles.

Shader Technique:
- Fullscreen fragment shader (GLSL 3.0 ES)
- Perlin noise for organic flow
- Domain warping for complex motion
- Metaball/SDF-based bubble shapes
- Smooth color gradients

Audio Reactivity:
- Bass: Modulates bubble density
- Mid: Controls flow speed
- Treble: Affects edge brightness
- Beat detection: Triggers color shifts

Controls:
- Animation Speed: dial, 0-3, default 1.0
- Bubble Density: dial, 0.5-2.5, default 1.5
- Flow Complexity: dial, 0.2-2.0, default 1.0
- Edge Brightness: dial, 0-5, default 1.5
- Color Scheme: dropdown with dropdown-selector-mixer class, [Acid Orange/Cyan, Blue Bubbles, Red Lava, Purple Dream, Rainbow]
- Zoom: dial, 1-10, default 4.0

Technical Requirements:
- WebGL2 context with high precision
- Fullscreen quad rendering
- Smooth noise functions
- Multiple time variables for independent animation
- Proper DPI scaling for 4K support

Performance Target:
- 60fps at 4K resolution
- Optimized fragment shader
- Minimal uniform updates
```

## WebGL Plugin Template (Better Compatibility)

```
Claude, create a WebGL shader-based Freque plugin:

Plugin Name: particle-galaxy
Type: WebGL Shader

Visual Description:
GPU-accelerated particle system creating a galaxy spiral effect.
Thousands of particles orbiting around a center point with
depth-based opacity and color variations.

Shader Technique:
- GLSL 1.0 for compatibility
- Point sprites for particles
- Vertex shader for position calculations
- Fragment shader for color/alpha

Audio Reactivity:
- Bass: Expands/contracts the galaxy
- Mid: Controls rotation speed
- Treble: Affects particle brightness

Controls:
- Particle Count: slider, 1000-50000, default 10000
- Rotation Speed: slider, -5 to 5, default 1.0
- Spread: slider, 1-10, default 5.0
- Particle Size: slider, 1-10, default 3.0

Technical Requirements:
- WebGL 1.0 context for maximum compatibility
- Vertex buffer for particle positions
- Uniform updates for audio reactivity
- Point sprite rendering
```

## What Claude Will Implement for WebGL Plugins

### WebGL2 Shader Plugin Setup

1. **Context Creation**
   ```javascript
   this.gl = this.canvas.getContext('webgl2', {
       alpha: false,
       antialias: true,
       powerPreference: 'high-performance'
   });
   ```

2. **Shader Compilation** (GLSL 3.0 ES)
   ```glsl
   #version 300 es
   precision highp float;
   
   uniform vec2 resolution;
   uniform float time;
   out vec4 fragColor;
   
   void main() {
       vec2 uv = gl_FragCoord.xy / resolution;
       fragColor = vec4(uv, 0.5, 1.0);
   }
   ```

3. **Fullscreen Quad**
   - Vertex buffer with quad covering -1 to 1
   - Triangle strip rendering

4. **Uniform Management**
   - Resolution, time, audio data
   - User control values
   - Color scheme parameters

5. **Resize Handling**
   - DPI-aware canvas sizing
   - Viewport updates
   - 4K-ready resolution

### Key Differences: WebGL vs WebGL2

| Feature | WebGL 1.0 | WebGL2 |
|---------|-----------|--------|
| GLSL Version | 1.0 | 3.0 ES |
| Syntax | `attribute`, `varying` | `in`, `out` |
| Output | `gl_FragColor` | `out vec4 fragColor` |
| Loops | Limited | Full support |
| 3D Textures | ❌ No | ✅ Yes |
| Integer Textures | ❌ No | ✅ Yes |
| Transform Feedback | ❌ No | ✅ Yes |

## WebGL Plugin Request Patterns

### For Procedural Effects

```
Claude, create a WebGL2 plugin with:
- Raymarching distance field for 3D-looking effects
- Perlin noise for organic motion
- Domain warping for complex patterns
- Smooth color palette using cosine gradients
- Audio-reactive parameters (time scale, density, intensity)
```

### For Particle Systems

```
Claude, create a WebGL plugin with:
- Vertex shader for particle position calculations
- Point sprites for rendering
- 10,000+ particles for dense effects
- Audio-reactive forces (attraction, repulsion, swirl)
- Color variation based on velocity/position
```

### For Post-Processing

```
Claude, create a WebGL2 plugin with:
- Render-to-texture for multi-pass effects
- Gaussian blur implementation
- Bloom/glow effect
- Chromatic aberration
- Audio-reactive distortion
```

## Critical WebGL Plugin Requirements

**ALWAYS specify in your request:**

1. **Context type**: "WebGL2" or "WebGL 1.0"
2. **Shader technique**: What shader effect you want
3. **Audio reactivity**: Which audio bands affect what
4. **Performance target**: "60fps at 4K" or similar

**Example Critical Request:**
```
IMPORTANT TECHNICAL REQUIREMENTS:
- Use WebGL2 context (this.gl = this.canvas.getContext('webgl2'))
- Create context in onInitialize() BEFORE accessing this.ctx
- Override shouldClearCanvas() to return false
- Use GLSL 3.0 ES syntax (#version 300 es)
- Handle DPI scaling for high-resolution displays
- Target 60fps at 4K resolution
```

## Reference Examples

### Simple WebGL2 Template Request

```
Claude, create a basic WebGL2 test plugin:

- Fullscreen gradient that changes color with audio
- Fragment shader only (simple quad rendering)
- Color changes based on bass, mid, treble
- One slider for animation speed
- Minimal code, well-commented
```

### Advanced WebGL2 Request (PSYCH-style)

```
Claude, create an advanced WebGL2 liquid bubble visualizer:

Shader Technique:
- Metaball-based bubble field generation
- Multi-octave Perlin noise for organic flow
- Domain warping for complex motion patterns
- Smooth color gradients with multiple schemes
- Edge detection for bright bubble outlines
- Interior shimmer effects using noise

Technical Requirements:
- WebGL2 with GLSL 3.0 ES shaders
- Multiple independent time variables
- Perlin noise implementation in shader
- Smooth random functions for animation morphing
- Support for 5+ color schemes
- Audio-reactive density, edge brightness

Controls:
- Animation Speed: 0-3
- Rotation Speed: -20 to 20
- Bubble Density: 0.3-2.5
- Flow Complexity: 0.2-2.0
- Bubble Separation: 1.5-8.0
- Background Speed/Intensity
- Edge Brightness: 0-5
- Color Intensity: 0.5-3
- Color Scheme dropdown
- Color/Animation Morph toggles with speed controls

Performance:
- Optimize for 4K/60fps
- Efficient noise calculations
- Minimal uniform updates
```

---

# Requesting Three.js Plugins

## When to Use Three.js

Best for:
- 3D scenes with meshes, lights, cameras
- Video reflections (cube camera systems)
- Complex 3D geometry and materials
- Environment mapping and PBR rendering

---

# Video Reflection Systems

## When to Request Cube Cameras

If you want **video reflections on chrome/metallic surfaces**, you MUST request a cube camera system:

```
Claude, create a Three.js plugin with chrome spheres reflecting the video.

IMPORTANT: 
- Use cube camera system for video reflections (required for Three.js r120+)
- Create inverted video sphere for cube camera to capture
- Update cube camera every frame to keep reflections synchronized
- Use layer management to hide/show video sphere
```

## Video Reflection Request Template

```
Claude, create a reflective metallic [object] plugin:

Technology Requirements:
- Three.js with cube camera system for video reflections
- Support both video (#bgVideo) and background image (#bgImage) sources
- Dual mode: direct texture AND chrome reflection
- Dynamic cube camera positioning for realistic reflections

Visual:
- [Describe your reflective objects]
- Chrome/metallic material
- Reflections show the video/background

Controls:
- Toggle between direct texture and reflection modes
- Toggle between video and background image sources
- Metalness: 0.0-1.0, default 1.0
- Roughness: 0.0-1.0, default 0.0
- Reflection Intensity: 0.0-3.0, default 0.5

Performance:
- Use shared cube camera (not per-object)
- 2048 cube map resolution for balance
- Only update cube camera when in reflection mode
```

## What Claude Will Implement

When you request a video reflection system, Claude will create:

1. **Cube Render Target**
   - High resolution (2048 or 4096)
   - RGBA format with mipmaps
   - sRGB encoding

2. **Cube Camera**
   - Positioned strategically (often at origin or average object position)
   - Enabled to see hidden layer
   - Updates every frame

3. **Large Inverted Video Sphere**
   - 500 unit radius
   - Video texture with EquirectangularReflectionMapping
   - Hidden from main camera via layer system
   - Proper rotation for correct reflections

4. **Material Setup**
   - envMap using cube map texture
   - High metalness (0.8-1.0)
   - Low roughness (0.0-0.2)
   - Adjustable envMapIntensity

5. **Update Loop**
   - Video texture needsUpdate every frame
   - Cube camera update when in reflection mode
   - Temporary object hiding during capture

## Cube Camera Prompting Examples

### Example 1: Chrome Spheres

```
Claude, create chrome spheres that reflect the video input.

Requirements:
- Use cube camera for video reflections
- Support both video and background image
- Dynamic cube camera positioning (average sphere position)
- Layer system to hide/show video sphere
- Proper sRGB encoding throughout

Spheres:
- 10-30 spheres
- Floating animation
- Audio-reactive size (bass)
- Ultra chrome appearance
```

### Example 2: Reflective Floor

```
Claude, create a reflective floor plugin showing video reflections.

Requirements:
- Large plane geometry for floor
- Cube camera positioned above floor
- Video sphere for reflections
- Support toggling between mirror and matte

Floor:
- Positioned below camera view
- PBR material (metalness + roughness)
- Grid lines for reference
- Audio-reactive ripple effect
```

### Example 3: Mirror Ball

```
Claude, create a disco mirror ball with video reflections.

Requirements:
- Single large sphere at center
- Cube camera at sphere center
- Ultra-high quality reflections (4096 cube map)
- Rotation animation
- Beat-reactive spin speed
```

## Performance Considerations

### Requesting Optimized Cube Cameras

```
Claude, create [plugin] with video reflections.

Performance Requirements:
- Use shared cube camera (not per-object)
- 1024 or 2048 cube map resolution
- Update cube camera every other frame
- Only update when video is playing
- Dispose resources properly in cleanup
```

### Quality vs Performance Trade-off

You can specify:

```
Cube Map Quality:
- 4096 resolution for ultra quality (expensive)
- 2048 resolution for high quality (balanced)  ← RECOMMENDED
- 1024 resolution for good quality (performance)

Update Frequency:
- Every frame for perfect sync (expensive)
- Every 2-3 frames for good balance  ← RECOMMENDED
- Every 5 frames for performance
```

---

# Common Request Patterns

## Advanced Control Patterns

### Non-Linear Control Scaling

When you need finer control in certain ranges, request two-part scaling:

```
Claude, create a Float Speed control with non-linear scaling:

Control: Float Speed slider (0-10)
Scaling Behavior:
- 0-3: Maps to 0-1.0x speed (slow motion to normal)
- 3: Center point = 1.0x normal speed (easy reset)
- 3-10: Maps to 1.0-2.0x speed (normal to double speed)

Implementation:
const speedFactor = value <= 3 
    ? value / 3.0
    : 1.0 + ((value - 3) / 7.0);

Why: Provides finer precision in the slow-motion range where users 
spend more time, while still allowing high-speed effects.
```

**When to Use This Pattern:**
- Any control where one range needs more precision
- Controls with a "normal" center point
- Speed/rate controls where 0 should be "frozen"
- Intensity controls where subtle changes matter more at low values

**Example Request:**
```
Claude, create an intensity control:
- Range: 0-10
- 0-5: Fine control (maps to 0-0.5)  
- 5: Normal intensity (0.5)
- 5-10: Coarse control (maps to 0.5-1.0)
Use two-part scaling for better UX.
```

### Source-Dependent Material Adjustments

Request automatic adjustments when different sources need different handling:

```
Claude, create reflective spheres that support both video and images:

Auto-adjust brightness:
- Video reflections: Use 80% of set intensity (they render brighter)
- Image reflections: Use 100% of set intensity
- User sets one value, system adjusts automatically
- Transparent to user (no extra controls)

Implementation:
if (sourceType === 'video') {
    material.envMapIntensity = userValue * 0.8;
} else {
    material.envMapIntensity = userValue;
}
```

**Why Request This:**
Different texture sources (video vs static images) can render with different characteristics. Automatic adjustments maintain visual consistency without requiring users to manage multiple controls.

---

## 2D Canvas Plugins

### Particle Systems

```
Claude, create a 2D particle system:

Particles:
- 500-2000 particles
- Emit from center/edges/random
- Float/drift/burst patterns
- Size based on bass
- Color based on treble
- Fade trails for motion blur

Audio:
- Bass triggers emission
- Mids control speed
- Treble affects color

Controls:
- Particle count
- Emission rate
- Particle lifetime
- Trail length
- Color scheme
```

### Waveforms

```
Claude, create an audio waveform visualizer:

Waveform:
- Circular/linear layout
- Smooth curves
- Line or bar style
- Gradient colors
- Glow effect

Audio:
- Use actual waveform data
- Bass emphasizes low frequencies
- Treble emphasizes high frequencies

Controls:
- Waveform style (line/bars)
- Color scheme
- Thickness
- Smoothing
```

## 3D Three.js Plugins

### Geometric Shapes

```
Claude, create 3D geometric shapes:

Shapes:
- Cubes, spheres, toruses, etc.
- Multiple objects in scene
- Rotation animations
- Audio-reactive scale
- PBR materials

Controls:
- Shape type selector
- Material properties
- Animation speed
- Quantity
- Arrangement (grid/random/orbit)
```

### Tunnel/Corridor Effects

```
Claude, create a tunnel effect:

Tunnel:
- Repeating rings/segments
- Forward motion illusion
- Texture or geometric
- Audio pulses through tunnel
- Camera movement

Audio:
- Bass expands rings
- Beat creates pulse wave
- Treble affects texture detail
```

## Dual Mode Patterns

```
Claude, create a plugin with multiple render modes:

Modes:
1. Particles (2D canvas)
2. Geometry (3D Three.js)
3. Waveform (2D canvas)

Each mode:
- Shares same controls where applicable
- Different visual style
- Toggle between modes with button

Controls:
- Mode selector
- [Shared controls]
- [Mode-specific controls]
```

---

# Troubleshooting

## Common Issues and How to Ask Claude

### Issue: "WebGL2 not supported" error

**Ask Claude:**
```
Claude, I'm getting "WebGL2 not supported" error but my browser supports it.

Please verify:
1. Context is created in onInitialize() before accessing this.ctx
2. Using this.gl = this.canvas.getContext('webgl2', {...})
3. Context creation happens BEFORE any this.ctx access
4. shouldClearCanvas() returns false
5. No 2D context is created accidentally

Also please add a proper fallback message to the user if WebGL2 truly isn't supported.
```

### Issue: Black screen / nothing rendering (WebGL)

**Ask Claude:**
```
Claude, my WebGL plugin shows a black screen.

Please check:
1. Shader compilation successful (check for errors in compile log)
2. Shader linking successful (check link status)
3. Uniforms are being set in onRender
4. Vertex buffer is bound correctly
5. Drawing command is called (gl.drawArrays)
6. Viewport is set to correct dimensions
7. Clear color is set if needed

Add console.log statements for debugging each step.
```

### Issue: Shader compile errors

**Ask Claude:**
```
Claude, I'm getting shader compilation errors.

For WebGL2:
- Ensure using #version 300 es
- Use 'in' and 'out' instead of 'attribute' and 'varying'
- Use 'texture' instead of 'texture2D'
- Declare output: out vec4 fragColor

For WebGL 1.0:
- Don't use #version directive
- Use 'attribute' and 'varying'
- Use 'texture2D' for sampling
- Use gl_FragColor for output

Please check and fix the shader syntax for [WebGL/WebGL2].
```

### Issue: Low resolution / blurry (WebGL)

**Ask Claude:**
```
Claude, my WebGL plugin looks blurry or low resolution.

Please add proper DPI scaling:
1. Multiply canvas width/height by devicePixelRatio
2. Set gl.viewport to actual canvas dimensions
3. Pass actual pixel dimensions to resolution uniform
4. Update resize handling to maintain DPI scaling

Target: Should look sharp on 4K displays and Retina screens.
```

### Issue: Video reflections not working

**Ask Claude:**
```
Claude, the video reflections aren't showing on my chrome spheres.
Can you:
1. Verify cube camera setup is correct
2. Check video sphere is on layer 1
3. Confirm cube camera update is in onRender
4. Check video element is playing
5. Verify sRGB encoding is consistent
```

### Issue: Canvas sizing wrong

**Ask Claude:**
```
Claude, the Three.js canvas isn't sizing correctly.
Please verify:
1. Using visualizationContainer for dimensions
2. Setting individual CSS properties (not cssText)
3. Using percentages for width/height
4. Setting devicePixelRatio properly
```

### Issue: Textures upside down

**Ask Claude:**
```
Claude, the video/image textures appear upside down.
Please:
1. Set flipY = true on textures
2. Remove any rotation-based fixes
3. Check mapping type is correct
```

### Issue: Dropdowns not displaying properly

**Ask Claude:**
```
Claude, my dropdowns aren't styled correctly or aren't visible.

Please ensure:
1. className: 'dropdown-selector-mixer' is specified in addControl
2. The dropdown has proper options array with value/label pairs
3. onChange handler is implemented

Example:
this.addControl('colorScheme', {
    type: 'dropdown',
    label: 'Color Scheme',
    className: 'dropdown-selector-mixer',  // REQUIRED
    options: [
        { value: 0, label: 'Option 1' },
        { value: 1, label: 'Option 2' }
    ],
    value: 0,
    onChange: (value) => {
        this.colorScheme = parseInt(value);
    }
});
```

### Issue: Toggle controls not working

**Ask Claude:**
```
Claude, my toggle controls (ON/OFF switches) aren't working.

Please use this EXACT pattern for toggles:

Use type: 'checkbox' (NOT type: 'button'):

this.myToggle = false;
this.addControl('myToggle', {
    type: 'checkbox',        // ✅ Use checkbox for toggles
    label: 'My Toggle',
    checked: false,          // Initial state
    onChange: (value) => {   // ✅ Use onChange
        this.myToggle = value;
        console.log('Toggle:', value);
    }
});

For toggles that start ON:
this.audioReactive = true;
this.addControl('audioReactive', {
    type: 'checkbox',
    label: 'Audio Reactive',
    checked: true,           // Starts ON
    onChange: (value) => {
        this.audioReactive = value;
    }
});

IMPORTANT: 
- Use type: 'checkbox' for ON/OFF toggles
- Use type: 'button' only for mode switching or one-time actions
- No manual DOM manipulation needed - checkbox handles state automatically
```

### Issue: Button labels not updating

**Ask Claude:**
```
Claude, button labels aren't updating when I click them.
Please use direct DOM queries with data-control attributes:

const button = document.querySelector('[data-control="controlName"]');
button.textContent = newLabel;
```

### Issue: Performance problems

**Ask Claude:**
```
Claude, the plugin is running slowly.
Please optimize:
1. Reduce cube map resolution to 1024 or 2048
2. Use shared cube camera instead of per-object
3. Update cube camera every 2-3 frames
4. Check geometry complexity
5. Only update when necessary

For WebGL shaders:
1. Reduce fragment shader complexity
2. Minimize texture lookups
3. Use lower precision where possible (mediump vs highp)
4. Reduce number of loop iterations
```

---

# Advanced Prompting Techniques

## Iterative Development

### Start Simple

```
Claude, create a basic chrome sphere plugin with:
- One sphere at center
- Video reflections
- Size slider
- Audio-reactive scale
```

### Then Add Features

```
Claude, update the sphere plugin to:
- Add 5-20 spheres
- Random positions
- Floating animation
- Beat-reactive pulse
```

### Then Polish

```
Claude, enhance the plugin with:
- Dual mode (direct texture + reflection)
- Background sphere visibility toggle
- Dynamic cube camera positioning
- Performance optimizations
```

## Combining References

```
Claude, create a plugin combining:
- The cube camera system from Chrome Spheres
- The particle emission from [another plugin]
- The audio analysis from [another plugin]
- Custom visual style: [describe]
```

## Requesting Specific Technologies

```
Claude, create a plugin using:
- Three.js InstancedMesh for performance
- Custom GLSL shaders for effects
- Post-processing with bloom
- Advanced PBR materials
```

---

# Visual Description Library

## Movement Verbs

- **Float** - Gentle up/down motion
- **Drift** - Slow sideways motion
- **Pulse** - Rhythmic expand/contract
- **Spin** - Rotation on axis
- **Orbit** - Circle around point
- **Wave** - Undulating motion
- **Burst** - Sudden outward explosion
- **Spiral** - Circular with forward/back
- **Wobble** - Irregular shaking
- **Glide** - Smooth continuous motion

## Effect Words

- **Glow** - Soft light emanation
- **Trail** - Motion blur behind objects
- **Fade** - Gradual transparency
- **Shimmer** - Subtle sparkle
- **Ripple** - Expanding circular waves
- **Bloom** - Bright light overflow
- **Distortion** - Warped/twisted appearance
- **Reflection** - Mirror-like surface
- **Refraction** - Light bending
- **Dispersion** - Rainbow prismatic effect

## Color Descriptors

- **Gradient** - Smooth color transition
- **Vibrant** - Highly saturated
- **Pastel** - Soft, light colors
- **Monochrome** - Single color variations
- **Warm** - Reds, oranges, yellows
- **Cool** - Blues, greens, purples
- **Neon** - Bright, glowing colors
- **Metallic** - Chrome, gold, silver
- **Iridescent** - Rainbow-shifting colors

## Layout Terms

- **Center-focused** - Emanating from middle
- **Edge-emphasized** - Action at borders
- **Grid** - Organized rows/columns
- **Random** - Unpredictable placement
- **Circular** - Ring arrangement
- **Radial** - Spoke pattern from center
- **Layered** - Multiple depth levels
- **Scattered** - Loosely distributed
- **Clustered** - Grouped together

---

# Real-World Examples

## Example 1: Chrome Spheres

**User Request:**
```
Claude, create floating chrome spheres that reflect the video/background.

Spheres:
- 15-20 spheres
- Different sizes
- Floating animation
- Chrome appearance

Video Reflections:
- Use cube camera system
- Support video and background image
- Toggle between texture modes
- Show/hide background sphere

Audio:
- Bass → size
- Mids → movement
- Treble → shininess
- Beat pulse

Controls:
- Sphere count: 1-50
- Size range: 5-10
- Float speed: 0-10
- Metalness: 0-1
- Roughness: 0-1
- Reflection intensity: 0-3
```

**Result:** Complete Chrome Spheres plugin with sophisticated cube camera system, dual modes, and full audio reactivity.

## Example 2: Energy Particles

**User Request:**
```
Claude, create an energy particle system:

Particles burst from center on beats, drift outward, and fade.
Colors shift with treble frequencies.
Bass determines burst intensity.
Mids control drift speed.

Controls:
- Particle count
- Burst size
- Lifetime
- Color scheme
- Trail length

2 Presets:
- Gentle: Small bursts, slow fade
- Explosive: Large bursts, fast fade
```

**Result:** Beautiful particle system with beat detection, color shifting, and smooth trails.

## Example 3: Tunnel Vision

**User Request:**
```
Claude, create a 3D tunnel effect:

Camera moves through infinite tunnel of rings.
Rings pulse with audio.
Texture or video on rings.
Bass makes tunnel expand.
Beat creates shockwave effect.

Modes:
- Geometric rings
- Textured panels
- Video mapped

Controls:
- Speed
- Ring spacing
- Texture/video source
- Pulse intensity
```

**Result:** Immersive 3D tunnel with multiple visual modes and strong audio reactivity.

---

# Tips for Success

## Do's

✅ **Be specific about visuals** - "Floating chrome spheres" is better than "3D objects"

✅ **Explain audio mapping** - Tell Claude exactly what affects what

✅ **Request proper Three.js setup** - Mention container sizing, CSS, encoding

✅ **Ask for cube cameras when needed** - For video reflections on metallic surfaces

✅ **Specify control types and ranges** - Give exact min/max values

✅ **Provide at least 2 presets** - Help define the plugin's range

✅ **Mention performance needs** - If targeting mobile or lower-end hardware

✅ **Ask questions if unclear** - Claude can help refine your vision

## Don'ts

❌ **Don't be vague** - "Make it cool" doesn't give enough guidance

❌ **Don't skip audio mapping** - Audio reactivity is core to Freque

❌ **Don't forget presets** - They're required for the plugin system

❌ **Don't ignore performance** - Mention if you need optimization

❌ **Don't assume** - Clearly state if you want video reflections

## Getting the Best Results

### 1. Start with Clear Vision
Think about what you want to see and how it should move.

### 2. Use the Template
The universal template ensures you cover everything.

### 3. Reference Examples
Mention other plugins or effects you like.

### 4. Iterate
Start simple, then ask Claude to add features.

### 5. Test and Refine
Try it, note issues, ask Claude to fix them.

---

# Conclusion

Claude is your partner in plugin creation. With clear descriptions and specific requirements, you can create professional-quality audio visualizations without deep coding knowledge.

**Remember:**
- Use the universal template
- Be specific about visuals and audio mapping
- Request proper Three.js setup for 3D plugins
- Ask for cube cameras when you want video reflections
- Start simple and iterate
- Don't hesitate to ask questions

**Happy creating! 🚀🎨🎵**

*Guide Version 2.0 - Updated with video reflection prompting*
