# Freque Plugin Development Guide

**Version 2.0 - Complete & Corrected**  
*Last Updated: November 2025*

---

## Table of Contents

### 🚀 Part I: Quick Start
1. [What is a Freque Plugin?](#what-is-a-freque-plugin)
2. [5-Minute Plugin Creation](#5-minute-plugin-creation)
3. [Using Claude to Create Plugins](#using-claude-to-create-plugins)
4. [Common Patterns](#common-patterns)
5. [Troubleshooting Quick Reference](#troubleshooting-quick-reference)

### 📚 Part II: Detailed Reference
6. [Plugin Architecture Deep Dive](#plugin-architecture-deep-dive)
7. [Complete API Reference](#complete-api-reference)
8. [UI Controls System](#ui-controls-system)
9. [Audio Integration](#audio-integration)
10. [Three.js & WebGL Integration](#threejs--webgl-integration)
11. [Advanced Topics](#advanced-topics)
12. [Best Practices](#best-practices)

---

# 🚀 PART I: QUICK START

## What is a Freque Plugin?

A Freque plugin is a JavaScript class that extends `FrequePluginBase` to create custom audio-reactive visualizations. Plugins automatically integrate with:

- **Master Animation Loop (MAL)** - Single coordinated animation system
- **Audio System** - Real-time audio frequency data
- **Mixer UI** - Automatic channel strip with controls
- **Z-index Management** - Proper layering with other visuals
- **Auto-loading** - Automatic discovery from `/js/plugins/` directory

### What Can Plugins Do?

✅ 2D canvas animations (particles, shapes, effects)  
✅ 3D visualizations with Three.js  
✅ Shader-based effects (GLSL)  
✅ React to audio frequencies in real-time  
✅ Provide user controls (sliders, buttons, dropdowns)  
✅ Include preset configurations  
✅ Layer with other visualizations

---

## 5-Minute Plugin Creation

### Step 1: Copy the Template

Create a file named `myeffect-freque-plugin.js` in `/js/plugins/`:

```javascript
/**
 * My Effect Plugin
 * Brief description of what it does
 */

class MyEffectPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('myeffect', visualizer, {
            version: '1.0.0',
            author: 'Your Name',
            description: 'My awesome effect',
            targetFPS: 60
        });
        
        // Your properties
        this.particleCount = 100;
        this.particleSize = 5;
        this.particles = [];
        
        // Setup
        this.setupControls();
        this.setupPresets();
    }
    
    setupControls() {
        this.addControl('particleCount', {
            type: 'slider',
            label: 'Particle Count',
            min: 10,
            max: 500,
            value: this.particleCount,
            onChange: (value) => {
                this.particleCount = value;
            }
        });
    }
    
    setupPresets() {
        this.addPreset('gentle', {
            name: 'Gentle',
            values: { particleCount: 50 }
        });
    }
    
    onInitialize() {
        // Initialize your visualization
        this.createParticles();
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        // Update animation state
        const energy = this.getAudioEnergy();
        this.updateParticles(energy);
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        // Draw to canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawParticles();
    }
    
    createParticles() {
        // Your initialization code
    }
    
    updateParticles(energy) {
        // Your update logic
    }
    
    drawParticles() {
        // Your rendering code
    }
}

// Auto-register
window.MyEffectPlugin = MyEffectPlugin;
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new MyEffectPlugin(window.visualizer);
    }
}, 500);
```

### Step 2: Upload to Server

Place your file in: `/js/plugins/myeffect-freque-plugin.js`

**Important:** File must end with `-freque-plugin.js` for auto-discovery!

### Step 3: Reload Page

The plugin will automatically:
- ✅ Load and register with MAL
- ✅ Create a mixer channel strip
- ✅ Appear in the mixer with ON/OFF toggle
- ✅ Show your controls and presets

### Step 4: Test It

1. Find your plugin in the mixer
2. Click the ON button
3. Adjust opacity slider
4. Try your controls
5. Test presets

**That's it!** You've created a Freque plugin. 🎉

---

## Using Claude to Create Plugins

### The Quick Method

**Just ask me naturally!** Here are examples:

**Example 1: Simple Request**
```
Claude, create a Freque plugin that shows pulsing circles 
that grow with bass frequencies. Add controls for circle 
count, size, and color.
```

**Example 2: Specific Effect**
```
I want a plugin that creates a spiral effect with particles 
that rotate faster when treble increases. Include presets 
for "slow spiral" and "fast spiral".
```

**Example 3: Three.js Request**
```
Make a Three.js plugin with a rotating cube that changes 
color based on audio frequencies. Add controls for rotation 
speed and cube size.
```

### The Structured Method

Use this template for more complex plugins:

```
Claude, help me create a Freque plugin:

Plugin Name: [Your Plugin Name]
Plugin ID: [lowercase-no-spaces]

Visual Effect:
- [Describe what you want to see]
- [Include details about shapes, colors, movement]

Audio Reactivity:
- Bass: [What should bass frequencies affect?]
- Mid: [What should mid frequencies affect?]
- Treble: [What should treble frequencies affect?]
- Beat: [What should happen on beat detection?]

Controls Needed:
- [Control 1: type and purpose]
- [Control 2: type and purpose]
- [Control 3: type and purpose]

Presets:
- [Preset 1 name and settings]
- [Preset 2 name and settings]

Technology:
[ ] 2D Canvas (simple drawings, particles)
[ ] Three.js (3D objects, advanced effects)
[ ] Shaders (GLSL, custom effects)
```

### What I'll Provide

When you ask me to create a plugin, I'll give you:

1. ✅ **Complete working code** ready to use
2. ✅ **Proper FrequePluginBase integration**
3. ✅ **All requested controls and presets**
4. ✅ **Audio reactivity implementation**
5. ✅ **Comments explaining key parts**
6. ✅ **Usage instructions**

### Example Conversation

**You:** "Claude, create a plugin with glowing dots that pulse with the music"

**Me:** I'll create a complete plugin with:
- Particle system with glow effects
- Audio-reactive size pulsing
- Controls for particle count, glow intensity, color
- Presets for different moods
- [Complete code follows...]

**You:** "Can you add rotation to the particles?"

**Me:** I'll modify the plugin to add:
- Rotation based on audio energy
- Rotation speed control
- [Updated code follows...]

### Common Requests I Can Handle

**Visual Effects:**
- Particle systems (dots, stars, shapes)
- Geometric patterns (spirals, grids, tunnels)
- Waveforms and frequency bars
- 3D objects (cubes, spheres, meshes)
- Shader effects (distortion, color shifts)
- Trail effects and motion blur
- Kaleidoscope patterns
- Fractal animations

**Audio Mappings:**
- Frequency-based (bass/mid/treble)
- Beat detection triggers
- Energy-based scaling
- Tempo synchronization
- Volume-reactive opacity
- Spectrum-based colors

**Controls:**
- Sliders (numeric values)
- Dropdowns (options)
- Checkboxes (on/off)
- Buttons (actions)
- Color pickers (via custom controls)

---

## Common Patterns

### Pattern 1: 2D Canvas Particles

**Use for:** Dots, stars, simple shapes, 2D effects

```javascript
class ParticlePlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('particles', visualizer, {
            version: '1.0.0',
            description: '2D Particle System'
        });
        this.particles = [];
    }
    
    onInitialize() {
        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2
            });
        }
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        const energy = this.getAudioEnergy();
        this.particles.forEach(p => {
            p.x += p.vx * (1 + energy);
            p.y += p.vy * (1 + energy);
            // Wrap around edges
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
        });
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const energy = this.getAudioEnergy();
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + energy * 0.5})`;
        
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 2 + energy * 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}
```

### Pattern 2: Three.js 3D Objects

**Use for:** 3D shapes, meshes, advanced 3D effects

```javascript
class ThreeJSPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('threejs', visualizer, {
            version: '1.0.0',
            description: 'Three.js Effect'
        });
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mesh = null;
    }
    
    // CRITICAL: Override for Three.js
    shouldClearCanvas() {
        return false; // Three.js handles its own clearing
    }
    
    onInitialize() {
        // Setup Three.js scene
        this.scene = new THREE.Scene();
        
        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.width / this.canvas.height,
            0.1,
            1000
        );
        this.camera.position.z = 5;
        
        // Setup renderer using plugin canvas
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        
        // Create a cube
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            wireframe: true 
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        const energy = this.getAudioEnergy();
        
        // Rotate based on audio
        if (this.mesh) {
            this.mesh.rotation.x += 0.01 * (1 + energy);
            this.mesh.rotation.y += 0.01 * (1 + energy);
        }
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    onResize(width, height) {
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }
    
    onCleanup() {
        // Clean up Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}
```

### Pattern 3: Frequency-Based Visualization

**Use for:** Spectrum analyzers, frequency bars, audio-reactive colors

```javascript
class FrequencyPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('frequency', visualizer, {
            version: '1.0.0',
            description: 'Frequency Visualizer'
        });
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const frequencies = this.getAudioFrequencies();
        if (!frequencies || frequencies.length === 0) return;
        
        const barWidth = this.canvas.width / frequencies.length;
        
        frequencies.forEach((value, index) => {
            const barHeight = (value / 255) * this.canvas.height;
            const x = index * barWidth;
            const y = this.canvas.height - barHeight;
            
            // Color based on frequency position
            const hue = (index / frequencies.length) * 360;
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
            
            this.ctx.fillRect(x, y, barWidth - 2, barHeight);
        });
    }
}
```

---

## Troubleshooting Quick Reference

### Plugin Not Loading

**Problem:** Plugin doesn't appear in mixer

**Solutions:**
1. ✅ Check filename ends with `-freque-plugin.js`
2. ✅ Verify file is in `/js/plugins/` directory
3. ✅ Check console for JavaScript errors
4. ✅ Ensure `FrequePluginBase` is loaded (check page source)
5. ✅ Try hard refresh (Ctrl+Shift+R)

### Plugin Loads But Doesn't Display

**Problem:** Plugin ON but nothing shows

**Solutions:**
1. ✅ Check `onRender()` actually draws something
2. ✅ Verify canvas is not empty: `console.log(this.canvas.width)`
3. ✅ Check z-index isn't behind other layers
4. ✅ Ensure opacity is not 0
5. ✅ Verify `this.ctx` exists in render method

### Controls Not Appearing

**Problem:** No controls in channel strip

**Solutions:**
1. ✅ Check `addControl()` is called in constructor
2. ✅ Verify control configuration is correct
3. ✅ Look for errors in console
4. ✅ Try calling `setupControls()` after super()

### Audio Not Reactive

**Problem:** Visualization doesn't respond to audio

**Solutions:**
1. ✅ Use `this.getAudioEnergy()` not custom audio code
2. ✅ Verify audio is playing
3. ✅ Check that `sharedAudioData` is not null
4. ✅ Test with console: `console.log(this.getAudioEnergy())`

### Three.js Issues

**Problem:** Three.js plugin shows blank screen

**Solutions:**
1. ✅ Override `shouldClearCanvas()` to return `false`
2. ✅ Ensure Three.js is loaded before plugin
3. ✅ Check renderer is using plugin canvas
4. ✅ Verify camera position isn't inside objects
5. ✅ Check scene has objects added

### Performance Issues

**Problem:** Low frame rate, choppy animation

**Solutions:**
1. ✅ Reduce particle count
2. ✅ Use object pooling instead of creating/destroying
3. ✅ Minimize canvas operations in `onRender()`
4. ✅ Set `targetFPS: 30` if 60fps not needed
5. ✅ Profile with browser DevTools

---

# 📚 PART II: DETAILED REFERENCE

## Plugin Architecture Deep Dive

### The Master Animation Loop (MAL)

All plugins integrate with the Master Animation Controller, which provides:

**Benefits:**
- ✅ Single coordinated animation loop (eliminates multiple RAF calls)
- ✅ Shared audio data (no duplicate processing)
- ✅ Priority-based execution
- ✅ Frame rate management
- ✅ Error isolation

**Priority System:**
```javascript
PRIORITIES = {
    AUDIOMOTION: 1,    // Spectrum analyzer
    RECORDING: 2,      // Recording system
    FLUID: 3,          // Fluid dynamics
    NEBULA: 4,         // Nebula visualization
    WEBGL: 5,          // WebGL effects
    BLOBS: 6,          // Blob visualization
    AI: 7,             // AI systems
    // Plugins: Use zIndex as priority (9+)
}
```

**How It Works:**
1. MAL calls `update()` on all active systems in priority order
2. MAL calls `render()` on all active systems
3. Audio data is generated once and shared
4. Each plugin receives: `(deltaTime, timestamp, sharedAudioData)`

### Z-Index System

**Layer Stack:**
```
Z-Index 1   - Background Image
Z-Index 2   - Video Input
Z-Index 3   - AudioMotion Analyzer
Z-Index 4   - Infinite Zoom
Z-Index 5   - Blobs
Z-Index 6   - Starfall
Z-Index 7   - Fluidity (Fluid Dynamics)
Z-Index 8   - Nebula
Z-Index 9+  - PLUGINS (auto-assigned incrementally)
Z-Index 100 - Kaleidoscope (always on top)
```

**Your plugin automatically gets:**
- Z-index starting at 9 (first plugin)
- Increments for each additional plugin (10, 11, 12...)
- Can be reordered via drag-drop in mixer
- Used as MAL priority (higher z-index = later execution)

### File Structure

**Required:**
```
myeffect-freque-plugin.js
├── Plugin class extending FrequePluginBase
├── Constructor with super() call
├── setupControls() method (optional)
├── setupPresets() method (optional)
├── onUpdate() method (optional)
├── onRender() method (optional)
└── Auto-registration code at bottom
```

**Naming Convention:**
- File: `<pluginid>-freque-plugin.js`
- Class: `<PluginName>Plugin`
- Plugin ID: lowercase, no spaces, hyphens ok

**Example:**
- File: `audio-waves-freque-plugin.js`
- Class: `AudioWavesPlugin`
- ID: `'audiowaves'` or `'audio-waves'`

### Auto-Loading System

The `plugin-autoloader.js` system:

1. **Scans** `/js/plugins/` directory every 12 seconds
2. **Discovers** files matching `*-freque-plugin.js`
3. **Loads** new plugins automatically
4. **Tracks** missing plugins (deleted files)
5. **Cleanup** on manual refresh

**How to trigger manual refresh:**
```javascript
window.pluginAutoLoader.refreshPlugins();
```

---

## Complete API Reference

### FrequePluginBase Constructor

```javascript
constructor(pluginName, visualizer, config)
```

**Parameters:**
- `pluginName` (string) - Unique identifier (lowercase, no spaces)
- `visualizer` (object) - Reference to main visualizer (always `window.visualizer`)
- `config` (object) - Configuration options

**Config Options:**
```javascript
{
    version: '1.0.0',           // Plugin version
    author: 'Your Name',        // Your name
    description: 'My Plugin',   // Short description
    displayName: 'My Plugin',   // UI display name (optional)
    targetFPS: 60,             // Target frame rate (30 or 60)
    metadata: {}               // Additional metadata
}
```

### Lifecycle Methods

#### `onInitialize()`
Called once when plugin is first activated.

**Use for:**
- Creating initial objects/particles
- Setting up Three.js scene
- Loading resources
- One-time setup

```javascript
onInitialize() {
    this.particles = [];
    for (let i = 0; i < 100; i++) {
        this.particles.push(this.createParticle());
    }
}
```

#### `onStart()`
Called every time plugin is activated (ON button clicked).

**Use for:**
- Resuming animation
- Re-enabling features
- Ensuring state is valid

```javascript
onStart() {
    if (this.particles.length === 0) {
        this.onInitialize();
    }
}
```

#### `onStop()`
Called when plugin is deactivated (OFF button clicked).

**Use for:**
- Pausing animation
- Hiding elements
- Cleanup of temporary resources

```javascript
onStop() {
    // Plugin-specific stop logic
}
```

#### `onUpdate(deltaTime, timestamp, sharedAudioData)`
Called every frame by MAL (60 times per second typically).

**Parameters:**
- `deltaTime` (number) - Time since last frame in milliseconds
- `timestamp` (number) - Current timestamp from performance.now()
- `sharedAudioData` (object) - Audio features (see Audio Integration section)

**Use for:**
- Updating animation state
- Physics calculations
- Audio analysis
- State management

```javascript
onUpdate(deltaTime, timestamp, sharedAudioData) {
    const energy = this.getAudioEnergy();
    this.particles.forEach(p => {
        p.x += p.vx * (1 + energy);
        p.y += p.vy * (1 + energy);
    });
}
```

#### `onRender(deltaTime, timestamp, sharedAudioData)`
Called every frame by MAL after `onUpdate()`.

**Parameters:** Same as `onUpdate()`

**Use for:**
- Drawing to canvas
- Rendering Three.js scene
- Visual output only

```javascript
onRender(deltaTime, timestamp, sharedAudioData) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(p => {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
    });
}
```

#### `onResize(width, height)`
Called when canvas is resized (window resize, orientation change).

**Parameters:**
- `width` (number) - New canvas width
- `height` (number) - New canvas height

**Use for:**
- Repositioning objects proportionally
- Updating Three.js camera aspect
- Recalculating layout

```javascript
onResize(width, height) {
    // Reposition particles proportionally
    this.particles.forEach(p => {
        p.x = (p.x / this.canvas.width) * width;
        p.y = (p.y / this.canvas.height) * height;
    });
    
    // Update Three.js camera
    if (this.camera) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
}
```

#### `onCleanup()`
Called when plugin is completely removed from system.

**Use for:**
- Disposing Three.js resources
- Removing event listeners
- Freeing memory
- Final cleanup

```javascript
onCleanup() {
    this.particles = [];
    if (this.renderer) {
        this.renderer.dispose();
    }
}
```

#### `onPresetApply(presetId, preset)`
Called when user selects a preset.

**Parameters:**
- `presetId` (string) - ID of preset being applied
- `preset` (object) - Full preset configuration

**Use for:**
- Re-initializing with new settings
- Updating UI controls
- Custom preset logic

```javascript
onPresetApply(presetId, preset) {
    this.initializeParticles(); // Reinit with new count
}
```

#### `onOpacityChange(opacity)`
Called when opacity slider is changed.

**Parameters:**
- `opacity` (number) - New opacity value (0-1)

**Use for:**
- Custom opacity handling
- Fading effects
- Synchronized animations

```javascript
onOpacityChange(opacity) {
    if (this.mesh) {
        this.mesh.material.opacity = opacity;
    }
}
```

#### `onError(error)`
Called when an error occurs in plugin.

**Parameters:**
- `error` (Error) - Error object

**Use for:**
- Custom error handling
- Logging
- Recovery attempts

```javascript
onError(error) {
    console.error(`${this.pluginName} error:`, error);
    this.stop(); // Safe shutdown
}
```

### Advanced Rendering Methods

For plugins that need custom compositing behavior:

#### `shouldClearCanvas()`
Return whether canvas should be cleared before rendering.

**Returns:** boolean

**Default:** `true` (clear for 2D canvas)  
**Three.js:** Return `false` (Three.js handles clearing)

```javascript
shouldClearCanvas() {
    return false; // Don't clear for WebGL/Three.js
}
```

#### `getOpacity()`
Return current opacity for composite rendering.

**Returns:** number (0-1)

```javascript
getOpacity() {
    return this.opacity; // Default implementation
}
```

#### `getBlendMode()`
Return CSS blend mode for compositing.

**Returns:** string

```javascript
getBlendMode() {
    return 'normal'; // Can be: multiply, screen, overlay, etc.
}
```

#### `beforeComposite(ctx, width, height)`
Called before plugin is composited to output.

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Composite canvas context
- `width` (number) - Target width
- `height` (number) - Target height

```javascript
beforeComposite(ctx, width, height) {
    ctx.globalCompositeOperation = 'screen';
}
```

#### `customComposite(ctx, width, height)`
Override default drawImage compositing.

**Parameters:** Same as `beforeComposite()`  
**Returns:** boolean - true if handled, false for default

```javascript
customComposite(ctx, width, height) {
    // Custom drawing logic
    ctx.drawImage(this.canvas, 0, 0, width, height);
    return true; // Handled
}
```

#### `afterComposite(ctx)`
Called after plugin is composited.

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Composite canvas context

```javascript
afterComposite(ctx) {
    // Additional drawing or cleanup
}
```

---

## UI Controls System

### Control Types

Four control types are supported: **slider**, **button**, **dropdown**, **checkbox**

### Slider Control

**Use for:** Numeric values with range

```javascript
this.addControl('mySlider', {
    type: 'slider',
    label: 'My Slider',
    min: 0,
    max: 100,
    value: 50,
    unit: '%',  // Optional: displayed after value
    onChange: (value) => {
        this.myProperty = value;
    }
});
```

**Properties:**
- `type: 'slider'` (required)
- `label` (string) - Display label
- `min` (number) - Minimum value
- `max` (number) - Maximum value
- `value` (number) - Initial value
- `unit` (string) - Optional unit suffix (%, px, x, etc.)
- `onChange` (function) - Callback with new value

### Button Control

**Use for:** Actions, triggers, resets

```javascript
this.addControl('resetBtn', {
    type: 'button',
    label: 'Reset',
    className: 'btn-primary', // See CSS Classes below
    onClick: () => {
        this.reset();
    }
});
```

**Properties:**
- `type: 'button'` (required)
- `label` (string) - Button text
- `className` (string) - CSS class (see below)
- `onClick` (function) - Click handler

**Available CSS Classes:**
- `btn-primary` - Main action (blue) ✅ USE THIS
- `btn-danger` - Destructive action (red)
- `btn-preset` - Preset style
- `btn-secondary` - Secondary action
- `btn-toggle` - Toggle style

**⚠️ IMPORTANT:** The guide previously mentioned `btn-control` - this class **does not exist**. Use `btn-primary` instead.

### Dropdown Control

**Use for:** Multiple options, mode selection

```javascript
this.addControl('colorScheme', {
    type: 'dropdown',
    label: 'Color Scheme',
    options: [
        { value: 'blue', label: 'Blue' },
        { value: 'red', label: 'Red' },
        { value: 'rainbow', label: 'Rainbow' }
    ],
    value: 'blue', // Optional: initial selection
    onChange: (value) => {
        this.colorScheme = value;
    }
});
```

**Properties:**
- `type: 'dropdown'` (required)
- `label` (string) - Display label
- `options` (array) - Array of {value, label} objects
- `value` (string) - Optional initial value
- `onChange` (function) - Callback with selected value

### Checkbox Control

**Use for:** Boolean on/off toggles

```javascript
this.addControl('showTrails', {
    type: 'checkbox',
    label: 'Show Trails',
    checked: true,
    onChange: (checked) => {
        this.showTrails = checked;
    }
});
```

**Properties:**
- `type: 'checkbox'` (required)
- `label` (string) - Display label
- `checked` (boolean) - Initial state
- `onChange` (function) - Callback with new state

### Presets

Presets allow users to quickly apply configurations.

```javascript
setupPresets() {
    this.addPreset('gentle', {
        name: 'Gentle Mode',
        values: {
            particleCount: 50,
            particleSize: 2,
            showTrails: true
        }
    });
    
    this.addPreset('intense', {
        name: 'Intense Mode',
        values: {
            particleCount: 300,
            particleSize: 8,
            showTrails: false
        }
    });
}
```

**Preset Properties:**
- `name` (string) - Display name in UI
- `values` (object) - Key-value pairs matching control IDs

**How It Works:**
1. User clicks preset button
2. Plugin's `onPresetApply()` is called
3. Control values are updated automatically
4. Custom preset logic runs

### Channel Strip Layout

```
┌─────────────────────────┐
│ ⬍⬍ Drag Handle         │
│ Plugin Name             │
├─────────────────────────┤
│ ⚫ ON/OFF Toggle        │
│ 🎚️ Opacity Slider (0-100)│
├─────────────────────────┤
│ 📥 Input Section        │ ← Dropdowns appear here
├─────────────────────────┤
│ 🎨 Presets ▼ (collapsed)│
│   • Gentle Mode         │
│   • Intense Mode        │
├─────────────────────────┤
│ 🎛️ Controls ▼ (collapsed)│
│   Particle Count: 100   │
│   Size: 5               │
│   Show Trails: ✓        │
└─────────────────────────┘
```

**Features:**
- Drag handle to reorder plugins
- Collapsible sections to save space
- Automatic layout
- Responsive design

---

## Audio Integration

### Shared Audio Data

The MAL generates audio data **once per frame** and shares it with all plugins. This eliminates duplicate FFT calculations.

**sharedAudioData Object:**
```javascript
{
    energy: 0.75,           // Overall energy (0-1)
    bass: 0.8,              // Bass energy (0-1)
    mid: 0.6,               // Mid energy (0-1)
    treble: 0.4,            // Treble energy (0-1)
    peak: 0.9,              // Peak value (0-1)
    rms: 0.65,              // RMS value (0-1)
    zcr: 120,               // Zero crossing rate
    centroid: 2500,         // Spectral centroid (Hz)
    rolloff: 8000,          // Spectral rolloff (Hz)
    flux: 0.3,              // Spectral flux
    frequencies: Uint8Array,// Frequency data (0-255)
    waveform: Uint8Array,   // Waveform data (0-255)
    dataArray: Uint8Array,  // Raw analyzer data
    analyser: AnalyserNode  // Web Audio analyser
}
```

### Helper Methods

#### `getAudioEnergy()`
Get overall audio energy level.

**Returns:** number (0-1)

```javascript
const energy = this.getAudioEnergy();
// Use for: size, speed, intensity
```

#### `getAudioFrequencies()`
Get frequency data array.

**Returns:** Uint8Array (values 0-255)

```javascript
const freqs = this.getAudioFrequencies();
// Use for: frequency bars, spectrum analysis
```

#### `getAudioWaveform()`
Get waveform data array.

**Returns:** Uint8Array (values 0-255)

```javascript
const waveform = this.getAudioWaveform();
// Use for: oscilloscope, wave shapes
```

### Audio Reactivity Patterns

**Pattern 1: Size Scaling**
```javascript
const energy = this.getAudioEnergy();
const size = baseSize * (1 + energy * 2);
```

**Pattern 2: Color Shifting**
```javascript
const energy = this.getAudioEnergy();
const hue = energy * 360;
this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
```

**Pattern 3: Speed Modulation**
```javascript
const energy = this.getAudioEnergy();
particle.x += particle.vx * (1 + energy);
```

**Pattern 4: Frequency Bands**
```javascript
const frequencies = this.getAudioFrequencies();
const bass = frequencies.slice(0, 50);
const mid = frequencies.slice(50, 150);
const treble = frequencies.slice(150, 255);

const bassEnergy = bass.reduce((a,b) => a+b, 0) / bass.length / 255;
const midEnergy = mid.reduce((a,b) => a+b, 0) / mid.length / 255;
const trebleEnergy = treble.reduce((a,b) => a+b, 0) / treble.length / 255;
```

**Pattern 5: Beat Detection**
```javascript
onUpdate(deltaTime, timestamp, sharedAudioData) {
    const energy = this.getAudioEnergy();
    
    // Simple beat detection
    if (energy > 0.8 && !this.lastBeat) {
        this.onBeat();
        this.lastBeat = true;
    } else if (energy < 0.5) {
        this.lastBeat = false;
    }
}

onBeat() {
    // Trigger particle burst, flash, etc.
}
```

---

## Three.js & WebGL Integration

### Basic Three.js Setup

```javascript
class ThreeJSPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('threejs', visualizer, {
            version: '1.0.0',
            description: 'Three.js Plugin'
        });
        
        // Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.objects = [];
    }
    
    // CRITICAL: Must override for Three.js
    shouldClearCanvas() {
        return false; // Three.js handles clearing
    }
    
    onInitialize() {
        this.setupThreeJS();
        this.createObjects();
    }
    
    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,                              // FOV
            this.canvas.width / this.canvas.height, // Aspect
            0.1,                             // Near
            1000                             // Far
        );
        this.camera.position.z = 5;
        
        // Renderer - USE PLUGIN CANVAS
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,        // Transparent background
            antialias: true     // Smooth edges
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.setClearColor(0x000000, 0); // Transparent
    }
    
    createObjects() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00 
        });
        const cube = new THREE.Mesh(geometry, material);
        this.scene.add(cube);
        this.objects.push(cube);
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        const energy = this.getAudioEnergy();
        
        // Update object properties
        this.objects.forEach(obj => {
            obj.rotation.x += 0.01 * (1 + energy);
            obj.rotation.y += 0.01 * (1 + energy);
        });
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    onResize(width, height) {
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }
    
    onCleanup() {
        // Dispose Three.js resources
        this.objects.forEach(obj => {
            obj.geometry.dispose();
            obj.material.dispose();
        });
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}
```

### Audio-Reactive Three.js

**React to Frequency Bands:**
```javascript
onUpdate(deltaTime, timestamp, sharedAudioData) {
    const freqs = this.getAudioFrequencies();
    
    // Split into bands
    const bassRange = freqs.slice(0, 50);
    const midRange = freqs.slice(50, 150);
    const trebleRange = freqs.slice(150, 255);
    
    const bass = this.average(bassRange) / 255;
    const mid = this.average(midRange) / 255;
    const treble = this.average(trebleRange) / 255;
    
    // Apply to objects
    if (this.cube) {
        this.cube.scale.x = 1 + bass;
        this.cube.scale.y = 1 + mid;
        this.cube.scale.z = 1 + treble;
        
        this.cube.material.color.setHSL(treble, 1, 0.5);
    }
}

average(arr) {
    return arr.reduce((a,b) => a+b, 0) / arr.length;
}
```

### Particle Systems in Three.js

```javascript
onInitialize() {
    // Create geometry with many points
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1000 * 3); // 1000 particles * xyz
    
    for (let i = 0; i < 1000; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    
    geometry.setAttribute('position', 
        new THREE.BufferAttribute(positions, 3)
    );
    
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
}

onUpdate(deltaTime, timestamp, sharedAudioData) {
    const energy = this.getAudioEnergy();
    
    // Update particle material
    this.particles.material.size = 0.1 + energy * 0.5;
    
    // Rotate particle system
    this.particles.rotation.y += 0.001 * (1 + energy);
}
```

### Shader Integration

**Custom Vertex Shader:**
```javascript
const vertexShader = `
    uniform float time;
    uniform float audioEnergy;
    varying vec3 vPosition;
    
    void main() {
        vPosition = position;
        vec3 pos = position;
        
        // Distort based on audio
        pos.x += sin(pos.y * 2.0 + time) * audioEnergy;
        pos.y += cos(pos.x * 2.0 + time) * audioEnergy;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragmentShader = `
    uniform float audioEnergy;
    varying vec3 vPosition;
    
    void main() {
        vec3 color = vec3(audioEnergy, 0.5, 1.0 - audioEnergy);
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Create material
this.material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
        time: { value: 0 },
        audioEnergy: { value: 0 }
    }
});

// Update uniforms in onUpdate()
onUpdate(deltaTime, timestamp, sharedAudioData) {
    const energy = this.getAudioEnergy();
    this.material.uniforms.time.value = timestamp * 0.001;
    this.material.uniforms.audioEnergy.value = energy;
}
```

---

## Advanced Topics

### Plugin Manager Interface

While `window.pluginManager` exists, the actual functionality is in `window.pluginMixerIntegration`:

```javascript
// Get plugin instance
const plugin = window.pluginManager?.getPlugin('myeffect');

// Check if plugin exists
if (plugin) {
    plugin.toggle();
    plugin.setOpacity(50);
}

// Access mixer integration
window.pluginMixerIntegration.addPluginControls(
    this.pluginName, 
    this.controls
);
```

### Custom Registration

Override registration for custom behavior:

```javascript
registerWithPluginManager() {
    super.registerWithPluginManager();
    
    // Custom post-registration logic
    setTimeout(() => {
        if (window.pluginMixerIntegration) {
            window.pluginMixerIntegration.addPluginControls(
                this.pluginName, 
                this.controls
            );
        }
    }, 1000);
}
```

### Performance Optimization

**1. Object Pooling**
```javascript
class PooledParticlePlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('pooled', visualizer, {});
        this.particlePool = [];
        this.activeParticles = [];
    }
    
    getParticle() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return this.createNewParticle();
    }
    
    releaseParticle(particle) {
        this.particlePool.push(particle);
    }
}
```

**2. Conditional Rendering**
```javascript
onRender(deltaTime, timestamp, sharedAudioData) {
    // Skip rendering if not visible
    if (this.opacity < 0.01) return;
    
    // Render your visualization
}
```

**3. Frame Rate Targeting**
```javascript
constructor(visualizer) {
    super('myeffect', visualizer, {
        targetFPS: 30 // Reduce from 60 if not needed
    });
}
```

**4. Batch Canvas Operations**
```javascript
onRender(deltaTime, timestamp, sharedAudioData) {
    // Bad: Multiple fill calls
    this.particles.forEach(p => {
        this.ctx.fillRect(p.x, p.y, 5, 5);
    });
    
    // Good: Path batching
    this.ctx.beginPath();
    this.particles.forEach(p => {
        this.ctx.rect(p.x, p.y, 5, 5);
    });
    this.ctx.fill();
}
```

### Error Handling

**Graceful Degradation:**
```javascript
onRender(deltaTime, timestamp, sharedAudioData) {
    try {
        // Your rendering code
        this.drawComplexEffect();
    } catch (error) {
        console.error(`${this.pluginName}: Render error`, error);
        
        // Fallback to simple rendering
        this.drawFallback();
    }
}

onError(error) {
    console.error(`${this.pluginName}: Critical error`, error);
    
    // Attempt recovery
    this.stop();
    
    // Notify user
    if (window.showNotification) {
        window.showNotification(
            `Plugin ${this.pluginName} encountered an error`,
            'error'
        );
    }
}
```

### Memory Management

**Proper Cleanup:**
```javascript
onCleanup() {
    // Clear arrays
    this.particles = [];
    this.objects = [];
    
    // Dispose Three.js
    if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
    }
    
    // Remove event listeners
    if (this.eventHandler) {
        window.removeEventListener('resize', this.eventHandler);
    }
    
    // Clear references
    this.scene = null;
    this.camera = null;
}
```

---

## Best Practices

### Code Organization

**Good Structure:**
```javascript
class MyPlugin extends FrequePluginBase {
    // 1. Constructor - setup
    constructor(visualizer) { }
    
    // 2. Setup methods
    setupControls() { }
    setupPresets() { }
    
    // 3. Lifecycle methods
    onInitialize() { }
    onUpdate() { }
    onRender() { }
    
    // 4. Helper methods (private)
    updateParticles() { }
    drawParticles() { }
    
    // 5. Utility methods
    createParticle() { }
    calculateSomething() { }
}
```

### Naming Conventions

**Files:**
- `audio-waves-freque-plugin.js` ✅
- `AudioWaves-plugin.js` ❌ (wrong suffix)
- `audio_waves.js` ❌ (wrong format)

**Variables:**
- `this.particleCount` ✅ (camelCase)
- `this.particle_count` ❌ (snake_case)
- `this.ParticleCount` ❌ (PascalCase)

**Functions:**
- `updateParticles()` ✅ (descriptive)
- `update()` ❌ (too generic, conflicts with base)
- `doStuff()` ❌ (not descriptive)

### Performance Guidelines

**Do:**
- ✅ Use `getAudioEnergy()` for simple reactivity
- ✅ Cache calculations that don't change
- ✅ Use object pooling for many objects
- ✅ Minimize canvas state changes
- ✅ Test on lower-end devices

**Don't:**
- ❌ Create/destroy objects every frame
- ❌ Process audio data yourself (use shared data)
- ❌ Use `requestAnimationFrame` (MAL handles this)
- ❌ Access DOM in update/render loops
- ❌ Create multiple canvases

### Testing Checklist

Before releasing your plugin:

- [ ] Works with audio playing
- [ ] Works with no audio
- [ ] All controls function correctly
- [ ] All presets apply correctly
- [ ] Opacity control works
- [ ] ON/OFF toggle works
- [ ] Survives window resize
- [ ] No console errors
- [ ] Performs well (60fps)
- [ ] Cleans up properly on removal
- [ ] Auto-loads from plugins directory

### Documentation

Include at top of your plugin file:

```javascript
/**
 * Plugin Name
 * 
 * Description: What does this plugin do?
 * 
 * Author: Your Name
 * Version: 1.0.0
 * Date: 2025-11-06
 * 
 * Features:
 * - Feature 1
 * - Feature 2
 * 
 * Controls:
 * - Control 1: Purpose
 * - Control 2: Purpose
 * 
 * Audio Reactivity:
 * - Bass: Affects X
 * - Mid: Affects Y
 * 
 * Dependencies:
 * - Three.js (if applicable)
 * 
 * Known Issues:
 * - None
 */
```

---

## Support & Resources

**Documentation:**
- This guide (complete reference)
- Example plugins in `/js/plugins/`
- Storm template: `storm-freque-plugin.js`

**Tools:**
- Plugin autoloader (automatic discovery)
- Plugin loader (manual loading)
- Browser DevTools (debugging)

**Getting Help:**
- Check troubleshooting section first
- Review example plugins
- Test with Storm template
- Use Claude to create/debug plugins

**Best Resources:**
- Three.js docs: https://threejs.org/docs/
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

**Happy Plugin Development! 🚀**

*Remember: You can always ask Claude to create plugins for you using natural language. Just describe what you want, and Claude will generate the complete code!*
