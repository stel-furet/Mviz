# Native Blobs System Documentation

## Overview
This document preserves the complete native Blobs visualization system before migration to plugin architecture.

## Native Blobs Channel Strip (HTML)
**Location**: `index.html` lines 3284-3421

### Complete HTML Structure:
```html
<!-- Blobs Channel -->
<div class="channel-strip viz-channel">
    <div class="channel-drag-button" title="Drag to reorder">
        <svg width="16" height="8" viewBox="0 0 16 8" class="drag-arrows">
            <path d="M2 4 L0 2 L0 6 Z" fill="currentColor"/>
            <path d="M14 4 L16 2 L16 6 Z" fill="currentColor"/>
            <path d="M4 3 L12 3 L12 5 L4 5 Z" fill="currentColor" opacity="0.5"/>
        </svg>
    </div>
    <div class="channel-header">Blobs</div>
    
    <div class="channel-toggle-section">
        <button class="btn-toggle" id="mixerBlobsToggle" title="Toggle Blobs">
            <span class="toggle-text">OFF</span>
        </button>
    </div>
    
    <div class="vertical-slider-section">
        <div class="vertical-slider-container">
            <div class="vertical-slider-label top">Opacity</div>
            <div class="vertical-slider-wrapper">
                <div class="vertical-slider" id="mixerBlobsOpacitySlider" data-min="0" data-max="100" data-value="100">
                    <div class="vertical-slider-track"></div>
                    <div class="vertical-slider-fill"></div>
                    <div class="vertical-slider-thumb"></div>
                </div>
            </div>
            <div class="vertical-slider-label bottom" id="mixerBlobsOpacityValue">100</div>
        </div>
    </div>
    
    <div class="channel-presets-section">
        <div class="control-mini-label collapsible-header" data-target="blobsPresets">
            <span>Presets</span>
            <span class="collapse-indicator"></span>
        </div>
        <div class="collapsible-content" id="blobsPresets">
            <!-- Empty - preset buttons will go here -->
        </div>
    </div>
    
    <div class="channel-controls-section">
        <div class="control-mini-label collapsible-header" data-target="blobsControls">
            <span>Controls</span>
            <span class="collapse-indicator"></span>
        </div>
        <div class="collapsible-content" id="blobsControls">
            <!-- Blobs Controls -->
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Saturation</div>
                    <div class="control-mini-value" id="mixerBlobsSaturationValue">100%</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsSaturationSlider" min="0" max="200" step="1" value="100">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Posterize</div>
                    <div class="control-mini-value" id="mixerBlobsPosterizeValue">16</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsPosterizeSlider" min="2" max="16" step="1" value="16">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Contrast</div>
                    <div class="control-mini-value" id="mixerBlobsContrastValue">100%</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsContrastSlider" min="10" max="300" step="1" value="100">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Brightness</div>
                    <div class="control-mini-value" id="mixerBlobsBrightnessValue">100%</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsBrightnessSlider" min="10" max="300" step="1" value="100">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Intensity</div>
                    <div class="control-mini-value" id="mixerBlobsIntensityValue">100%</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsIntensitySlider" min="10" max="200" step="1" value="100">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Min Size</div>
                    <div class="control-mini-value" id="mixerBlobsMinSizeValue">2.0</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsMinSizeSlider" min="0.5" max="10" step="0.1" value="2">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Max Size</div>
                    <div class="control-mini-value" id="mixerBlobsMaxSizeValue">8px</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsMaxSizeSlider" min="1" max="10" step="0.1" value="1">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Agitate</div>
                    <div class="control-mini-value" id="mixerBlobsAgitateValue">100%</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsAgitateSlider" min="10" max="500" step="1" value="100">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Density</div>
                    <div class="control-mini-value" id="mixerBlobsDensityValue">200</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsDensitySlider" min="100" max="500" step="1" value="200">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Lifespan</div>
                    <div class="control-mini-value" id="mixerBlobsDecayValue">10x</div>
                </div>
                <input type="range" class="mini-slider" id="mixerBlobsDecaySlider" min="1" max="10" step="0.1" value="10">
            </div>
            
            <div class="button-mini-wrapper">
                <button id="mixerBlobsBeatReactBtn" class="btn-primary-mixer">Beat React: On</button>
            </div>
        </div>
    </div>
</div>
```

## Native Blobs Control Parameters

### 1. Opacity Slider
- **Element ID**: `mixerBlobsOpacitySlider`
- **Value Display**: `mixerBlobsOpacityValue`
- **Range**: 0-100
- **Function**: `this.visualizer.setBlobsOpacity(value / 100)`

### 2. Saturation Slider
- **Element ID**: `mixerBlobsSaturationSlider`
- **Value Display**: `mixerBlobsSaturationValue`
- **Range**: 0-200%
- **Function**: `this.visualizer.blobsVisualization.saturation = value / 100`

### 3. Posterize Slider
- **Element ID**: `mixerBlobsPosterizeSlider`
- **Value Display**: `mixerBlobsPosterizeValue`
- **Range**: 2-16
- **Function**: `this.visualizer.blobsVisualization.posterize = value`

### 4. Contrast Slider
- **Element ID**: `mixerBlobsContrastSlider`
- **Value Display**: `mixerBlobsContrastValue`
- **Range**: 10-300%
- **Function**: `this.visualizer.blobsVisualization.contrast = value / 100`

### 5. Brightness Slider
- **Element ID**: `mixerBlobsBrightnessSlider`
- **Value Display**: `mixerBlobsBrightnessValue`
- **Range**: 10-300%
- **Function**: `this.visualizer.blobsVisualization.brightness = value / 100`

### 6. Intensity Slider
- **Element ID**: `mixerBlobsIntensitySlider`
- **Value Display**: `mixerBlobsIntensityValue`
- **Range**: 10-200%
- **Function**: `this.visualizer.blobsVisualization.intensity = value / 100`

### 7. Min Size Slider
- **Element ID**: `mixerBlobsMinSizeSlider`
- **Value Display**: `mixerBlobsMinSizeValue`
- **Range**: 0.5-10 (step 0.1)
- **Function**: `this.visualizer.blobsVisualization.setMinSize(value)`

### 8. Max Size Slider
- **Element ID**: `mixerBlobsMaxSizeSlider`
- **Value Display**: `mixerBlobsMaxSizeValue`
- **Range**: 1-10 (step 0.1)
- **Function**: `this.visualizer.blobsVisualization.setMaxSize(value)`
- **Display Logic**: `8 + (sliderValue - 1) * (248 - 8) / (10 - 1)` pixels

### 9. Agitate Slider
- **Element ID**: `mixerBlobsAgitateSlider`
- **Value Display**: `mixerBlobsAgitateValue`
- **Range**: 10-500%
- **Function**: `this.visualizer.blobsVisualization.agitate = value / 100`

### 10. Density Slider
- **Element ID**: `mixerBlobsDensitySlider`
- **Value Display**: `mixerBlobsDensityValue`
- **Range**: 100-500
- **Function**: `this.visualizer.blobsVisualization.density = value`

### 11. Lifespan (Decay) Slider
- **Element ID**: `mixerBlobsDecaySlider`
- **Value Display**: `mixerBlobsDecayValue`
- **Range**: 1-10 (step 0.1)
- **Function**: `this.visualizer.blobsVisualization.decay = value`

### 12. Beat React Button
- **Element ID**: `mixerBlobsBeatReactBtn`
- **Function**: `this.visualizer.blobsVisualization.toggleBeatReact()`
- **States**: "Beat React: On" / "Beat React: Off"

## Native Blobs Toggle System

### Main Toggle Function
```javascript
// Location: js/main.js
mixerBlobsToggle.addEventListener('click', () => {
    if (this.visualizer) {
        this.visualizer.toggleBlobs();
        this.updateMixerBlobsToggle();
    }
});
```

### Update Functions Called During Initialization
```javascript
// All located in js/main.js around lines 2020-2034
this.updateMixerBlobsToggle();
this.updateMixerBlobsOpacitySlider();
this.updateMixerBlobsSaturationSlider();
this.updateMixerBlobsPosterizeSlider();
this.updateMixerBlobsContrastSlider();
this.updateMixerBlobsBrightnessSlider();
this.updateMixerBlobsIntensitySlider();
this.updateMixerBlobsMinSizeSlider();
this.updateMixerBlobsMaxSizeSlider();
this.updateMixerBlobsAgitateSlider();
this.updateMixerBlobsDensitySlider();
this.updateMixerBlobsDecaySlider();
this.updateMixerBlobsBeatReactButton();
```

## Native Blobs Visualization Reference

### Key Properties
- **Access Path**: `this.visualizer.blobsVisualization`
- **Toggle Method**: `this.visualizer.toggleBlobs()`
- **Opacity Method**: `this.visualizer.setBlobsOpacity(value)`

### Required Plugin Implementation Methods
Based on native system, the plugin needs these methods:
- `setSaturation(value)` - 0.0 to 2.0
- `setPosterize(value)` - 2 to 16
- `setContrast(value)` - 0.1 to 3.0
- `setBrightness(value)` - 0.1 to 3.0
- `setIntensity(value)` - 0.1 to 2.0
- `setMinSize(value)` - 0.5 to 10.0
- `setMaxSize(value)` - 1.0 to 10.0
- `setAgitate(value)` - 0.1 to 5.0
- `setDensity(value)` - 100 to 500
- `setDecay(value)` - 1.0 to 10.0
- `toggleBeatReact()` - boolean toggle

## Header Synchronization
All mixer controls have corresponding header controls that need to be synchronized:
- `blobsSaturationSlider` ↔ `mixerBlobsSaturationSlider`
- `blobsPosterizeSlider` ↔ `mixerBlobsPosterizeSlider`
- `blobsContrastSlider` ↔ `mixerBlobsContrastSlider`
- `blobsBrightnessSlider` ↔ `mixerBlobsBrightnessSlider`
- `blobsIntensitySlider` ↔ `mixerBlobsIntensitySlider`
- `blobsMinSizeSlider` ↔ `mixerBlobsMinSizeSlider`
- `blobsMaxSizeSlider` ↔ `mixerBlobsMaxSizeSlider`
- `blobsAgitateSlider` ↔ `mixerBlobsAgitateSlider`
- `blobsDensitySlider` ↔ `mixerBlobsDensitySlider`
- `blobsDecaySlider` ↔ `mixerBlobsDecaySlider`

## CSS Classes Used
- `.channel-strip.viz-channel` - Main channel container
- `.vertical-slider` - Custom vertical opacity slider
- `.control-mini-group` - Parameter control groups
- `.mini-slider` - Horizontal parameter sliders
- `.btn-primary-mixer` - Beat React button styling
- `.collapsible-header` - Expandable section headers
- `.collapsible-content` - Expandable section content

## Migration Notes
1. All 12 controls need to be replicated in plugin channel strip
2. Exact same styling and behavior required
3. Header controls should be removed after migration
4. Plugin must implement all parameter methods
5. Beat React functionality needs plugin implementation
6. Opacity slider uses custom vertical slider system
7. Max Size has special pixel conversion logic
