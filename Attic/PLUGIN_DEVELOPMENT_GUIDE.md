# Freque Plugin Development Guide

## Overview

The Freque Plugin Architecture allows developers to create custom visualizations that integrate seamlessly with the Master Animation Loop (MAL), automatic UI generation, and the existing mixer system. This guide provides everything you need to create your own plugins.

## Quick Start

1. **Copy the Template**: Start with `js/plugins/templates/storm-freque-plugin.js`
2. **Rename**: Change filename to `yourplugin-freque-plugin.js`
3. **Customize**: Modify the class name and implement your visualization
4. **Load**: Use the plugin loader to add your plugin to Freque

## Plugin Architecture

### Base Class: `FrequePluginBase`

All plugins must extend `FrequePluginBase`, which provides:
- Automatic MAL integration
- Canvas creation and management
- Z-index allocation
- UI channel strip generation
- Shared audio data access

### File Structure

```
yourplugin-freque-plugin.js
├── Plugin metadata (name, version, author)
├── Plugin class extending FrequePluginBase
├── UI control definitions
├── Preset configurations
└── Visualization logic (update/render methods)
```

## Creating Your First Plugin

### 1. Basic Plugin Structure

```javascript
class YourPlugin extends FrequePluginBase {
    constructor(visualizer) {
        // Initialize base plugin
        super('yourplugin', visualizer, {
            version: '1.0.0',
            author: 'Your Name',
            description: 'Your Plugin Description',
            targetFPS: 60
        });
        
        // Your plugin properties
        this.yourProperty = 'value';
        
        // Setup controls and presets
        this.setupControls();
        this.setupPresets();
    }
}
```

### 2. Required Methods

#### `onUpdate(deltaTime, timestamp, sharedAudioData)`
Update your visualization state (physics, animations, etc.)

```javascript
onUpdate(deltaTime, timestamp, sharedAudioData) {
    // Get audio energy
    const energy = this.getAudioEnergy();
    
    // Update your visualization state
    this.updateYourVisualization(energy);
}
```

#### `onRender(deltaTime, timestamp, sharedAudioData)`
Draw your visualization to the canvas

```javascript
onRender(deltaTime, timestamp, sharedAudioData) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw your visualization
    this.drawYourVisualization();
}
```

### 3. Optional Lifecycle Methods

```javascript
onInitialize() {
    // Called when plugin is first initialized
}

onStart() {
    // Called when plugin is activated
}

onStop() {
    // Called when plugin is deactivated
}

onResize(width, height) {
    // Called when canvas is resized
}

onCleanup() {
    // Called when plugin is removed
}

onPresetApply(presetId, preset) {
    // Called when a preset is applied
}
```

## UI Controls

The plugin system supports four types of UI controls that are automatically styled using existing CSS classes.

### Slider Control

```javascript
this.addControl('mySlider', {
    type: 'slider',
    label: 'My Slider',
    min: 0,
    max: 100,
    value: 50,
    unit: '%', // Optional
    onChange: (value) => {
        this.myProperty = value;
    }
});
```

### Button Control

```javascript
this.addControl('myButton', {
    type: 'button',
    label: 'Click Me',
    className: 'btn-control', // or 'btn-danger', 'btn-preset'
    onClick: () => {
        this.doSomething();
    }
});
```

### Dropdown Control

```javascript
this.addControl('myDropdown', {
    type: 'dropdown',
    label: 'Select Option',
    options: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
    ],
    onChange: (value) => {
        this.selectedOption = value;
    }
});
```

### Checkbox Control

```javascript
this.addControl('myCheckbox', {
    type: 'checkbox',
    label: 'Enable Feature',
    checked: true,
    onChange: (checked) => {
        this.featureEnabled = checked;
    }
});
```

## Presets

Presets allow users to quickly apply predefined configurations:

```javascript
setupPresets() {
    this.addPreset('gentle', {
        name: 'Gentle Mode',
        values: {
            mySlider: 25,
            myDropdown: 'option1',
            myCheckbox: false
        }
    });
    
    this.addPreset('intense', {
        name: 'Intense Mode',
        values: {
            mySlider: 90,
            myDropdown: 'option3',
            myCheckbox: true
        }
    });
}
```

## Audio Data Access

The base class provides convenient methods to access shared audio data:

```javascript
// Get overall energy level (0-1)
const energy = this.getAudioEnergy();

// Get frequency data array
const frequencies = this.getAudioFrequencies();

// Get waveform data array
const waveform = this.getAudioWaveform();

// Access raw shared audio data
const rawData = this.sharedAudioData;
```

## Canvas Management

The base class automatically handles:
- Canvas creation with unique ID
- Z-index assignment
- Resize handling
- Context management

You can access:
- `this.canvas` - The canvas element
- `this.ctx` - The 2D rendering context
- `this.zIndex` - Current z-index

## Channel Strip Layout

Every plugin automatically gets a channel strip with these containers:

```
┌─────────────────────┐
│ Plugin Name         │
├─────────────────────┤
│ ON/OFF (automatic)  │
│ Opacity (automatic) │
│ Presets (yours)     │
│ Controls (yours)    │
├─────────────────────┤
│ Remove (automatic)  │
└─────────────────────┘
```

## Z-Index Management

Z-indexes are automatically assigned:
- Audio/Video: 1
- AudioMotion: 2  
- Infinite Zoom: 3
- Reserved: 4-10
- **Plugins: 11+** (auto-assigned)
- Kaleidoscope: 100 (always top)

## Loading Your Plugin

### Method 1: Direct Script Tag
Add to `index.html`:
```html
<script src="js/plugins/yourplugin-freque-plugin.js"></script>
```

### Method 2: Dynamic Loading
Use the plugin loader:
```javascript
// Load from URL
await window.pluginLoader.loadPlugin('path/to/yourplugin-freque-plugin.js');

// Or load Storm template for testing
await window.pluginLoader.loadStormTemplate();
```

## Best Practices

### Performance
- Use `requestAnimationFrame` timing from MAL (don't create your own)
- Minimize canvas operations in `onRender`
- Use object pooling for particles/elements
- Cache calculations when possible

### Audio Reactivity
- Use `this.getAudioEnergy()` for simple reactivity
- Access frequency bands for detailed analysis
- Smooth audio data to avoid jittery animations

### UI Design
- Use existing CSS classes only
- Follow the established visual style
- Provide meaningful control labels
- Create useful presets

### Code Organization
```javascript
class YourPlugin extends FrequePluginBase {
    constructor() { /* Setup */ }
    
    // Lifecycle methods
    onInitialize() { }
    onUpdate() { }
    onRender() { }
    
    // Helper methods
    setupControls() { }
    setupPresets() { }
    
    // Visualization logic
    updateVisualization() { }
    drawVisualization() { }
    
    // Utility methods
    calculateSomething() { }
}
```

## Example: Simple Particle System

```javascript
class SimpleParticlesPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('simpleparticles', visualizer, {
            version: '1.0.0',
            author: 'You',
            description: 'Simple Particle System'
        });
        
        this.particles = [];
        this.particleCount = 100;
        
        this.setupControls();
    }
    
    setupControls() {
        this.addControl('count', {
            type: 'slider',
            label: 'Particle Count',
            min: 10,
            max: 500,
            value: this.particleCount,
            onChange: (value) => {
                this.particleCount = value;
                this.initParticles();
            }
        });
    }
    
    onInitialize() {
        this.initParticles();
    }
    
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
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
        
        this.particles.forEach(particle => {
            particle.x += particle.vx * (1 + energy);
            particle.y += particle.vy * (1 + energy);
            
            // Wrap around edges
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
        });
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const energy = this.getAudioEnergy();
        
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + energy * 0.5})`;
        
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 2 + energy * 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    onResize(width, height) {
        // Reposition particles proportionally
        this.particles.forEach(particle => {
            particle.x = (particle.x / this.canvas.width) * width;
            particle.y = (particle.y / this.canvas.height) * height;
        });
    }
}

// Auto-register
if (window.visualizer) {
    new SimpleParticlesPlugin(window.visualizer);
}
```

## Troubleshooting

### Plugin Not Loading
- Check console for JavaScript errors
- Verify file path is correct
- Ensure plugin extends `FrequePluginBase`
- Check that `window.visualizer` exists

### Controls Not Appearing
- Verify `this.addControl()` is called in constructor
- Check control configuration object
- Ensure plugin manager is loaded

### Canvas Issues
- Don't create your own canvas - use `this.canvas`
- Check `onInitialize()` is called
- Verify container exists

### Performance Issues
- Minimize operations in `onRender()`
- Use object pooling for many elements
- Check frame rate with browser dev tools

## API Reference

### FrequePluginBase Methods

#### Constructor
```javascript
super(pluginName, visualizer, config)
```

#### Lifecycle Hooks
- `onInitialize()` - Plugin initialization
- `onStart()` - Plugin activation  
- `onStop()` - Plugin deactivation
- `onUpdate(deltaTime, timestamp, sharedAudioData)` - Update loop
- `onRender(deltaTime, timestamp, sharedAudioData)` - Render loop
- `onResize(width, height)` - Canvas resize
- `onCleanup()` - Plugin removal
- `onPresetApply(presetId, preset)` - Preset application

#### UI Methods
- `addControl(id, config)` - Add UI control
- `addPreset(id, config)` - Add preset
- `setOpacity(value)` - Set plugin opacity
- `setZIndex(zIndex)` - Set z-index

#### Audio Methods
- `getAudioEnergy()` - Get energy level (0-1)
- `getAudioFrequencies()` - Get frequency array
- `getAudioWaveform()` - Get waveform array

#### Utility Methods
- `start()` - Start plugin
- `stop()` - Stop plugin  
- `toggle()` - Toggle plugin
- `getInfo()` - Get plugin info

## Support

For questions and support:
1. Check the Storm template plugin for examples
2. Review existing plugins in `/js/plugins/`
3. Test with the plugin loader console commands
4. Check browser console for errors

Happy plugin development! 🚀
