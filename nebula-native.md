# Native Nebula System Backup

This file contains the complete backup of the native Nebula visualization system before conversion to plugin architecture.

## Native Nebula Header Button (index.html)

```html
<!-- Nebula Button -->
<button id="headerNebulaBtn" class="header-btn" title="Nebula Settings">
    <span class="header-btn-text">Nebula</span>
</button>
```

## Native Nebula Header Panel (index.html)

```html
<!-- Nebula settings panel -->
<div class="panel-floating" id="headerNebulaPanel" data-button-id="headerNebulaBtn" style="display: none;">
    <div class="panel-header">
        <span>Nebula Controls</span>
        <button class="panel-close-btn" id="headerNebulaCloseBtn">×</button>
    </div>
<div class="panel-content">
    
    <!-- Basic Controls -->
    <div class="control-group">
        <div class="group-label">Basic Controls</div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Opacity</div>
            <input type="range" id="nebulaOverallOpacity" min="0.0" max="1.0" value="1.0" step="0.05" class="slider-1">
            <span class="slider-1-value">100%</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Camera Distance</div>
            <input type="range" id="nebulaCameraDistance" min="-180" max="180" value="80" step="10" class="slider-1">
            <span class="slider-1-value">80</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Star Count</div>
            <input type="range" id="nebulaStarCount" min="1000" max="10000" value="1000" step="500" class="slider-1">
            <span class="slider-1-value">1000</span>
        </div>
        
        <div class="button-container">
            <button class="btn-toggle" id="nebulaBloomToggle" data-setting="bloom">
                <span class="toggle-text">Bloom:ON</span>
            </button>
        </div>
        
        <div class="button-container">
            <button class="btn-toggle" id="nebulaMorphingToggle" data-setting="morphingMode">
                <span class="toggle-text">Morphing:OFF</span>
            </button>
        </div>
        
        <div class="preset-buttons">
            <button id="nebulaSavePresetBtn" class="btn-secondary">Save</button>
            <button id="nebulaExportPresetsBtn" class="btn-secondary">Export</button>
            <button id="nebulaImportPresetsBtn" class="btn-secondary">Import</button>
        </div>
        
        <!-- Hidden file input for import -->
        <input type="file" id="nebulaImportPresetsFile" accept=".json" style="display: none;">
    </div>
    
    <!-- Morphing Controls -->
    <div class="control-group" id="nebulaMorphingControls" style="display: none;">
        <div class="group-label">Morphing Controls</div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Morphing Speed</div>
            <input type="range" id="nebulaMorphingSpeed" min="0.1" max="2.0" value="1.0" step="0.1" class="slider-1">
            <span class="slider-1-value">1.0</span>
        </div>
    </div>
</div>

<!-- Color Controls -->
<div class="control-group">
    <div class="group-label">Color Controls</div>
    
    <!-- Color Presets -->
    <div class="preset-buttons" style="margin-bottom: 12px;">
        <button id="nebulaPresetDefault" class="btn-preset nebula-color-preset" data-preset="default">Default</button>
        <button id="nebulaPresetFire" class="btn-preset nebula-color-preset" data-preset="fire">Fire</button>
        <button id="nebulaPresetIce" class="btn-preset nebula-color-preset" data-preset="ice">Ice</button>
        <button id="nebulaPresetToxic" class="btn-preset nebula-color-preset" data-preset="toxic">Toxic</button>
        <button id="nebulaPresetSunset" class="btn-preset nebula-color-preset" data-preset="sunset">Sunset</button>
        <button id="nebulaPresetDeepSpace" class="btn-preset nebula-color-preset" data-preset="deepspace">Deep Space</button>
    </div>
    
    <div class="control-group">
        <div class="slider-1-wrapper">
            <div class="slider-label">Hue Shift</div>
            <input type="range" id="nebulaHueShift" min="0" max="360" value="0" step="5" class="slider-1">
            <span class="slider-1-value">0°</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Saturation</div>
            <input type="range" id="nebulaSaturation" min="0" max="200" value="100" step="5" class="slider-1">
            <span class="slider-1-value">100%</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Brightness</div>
            <input type="range" id="nebulaBrightness" min="20" max="200" value="100" step="5" class="slider-1">
            <span class="slider-1-value">100%</span>
        </div>
    </div>
</div>

<!-- Structure Controls -->
<div class="control-group">
    <div class="group-label">Structure Controls</div>
    
    <div class="control-group">
        <div class="slider-1-wrapper">
            <div class="slider-label">Filament Density</div>
            <input type="range" id="nebulaFilamentDensity" min="0.5" max="3.0" value="1.4" step="0.1" class="slider-1">
            <span class="slider-1-value">1.4</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Particles Per Filament</div>
            <input type="range" id="nebulaParticlesPerFilament" min="50" max="300" value="120" step="10" class="slider-1">
            <span class="slider-1-value">120</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Particle Size</div>
            <input type="range" id="nebulaParticleSize" min="0.3" max="3.0" value="1.0" step="0.1" class="slider-1">
            <span class="slider-1-value">1.0</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Expansion</div>
            <input type="range" id="nebulaExpansion" min="10" max="80" value="36" step="2" class="slider-1">
            <span class="slider-1-value">36</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Chaos</div>
            <input type="range" id="nebulaChaos" min="1.0" max="5.0" value="2.8" step="0.1" class="slider-1">
            <span class="slider-1-value">2.8</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Asymmetry</div>
            <input type="range" id="nebulaAsymmetry" min="0.5" max="2.0" value="1.1" step="0.1" class="slider-1">
            <span class="slider-1-value">1.1</span>
        </div>
    </div>
</div>

<!-- Pulsar Controls -->
<div class="control-group">
    <div class="group-label">Pulsar Controls</div>
    
    <div class="control-group">
        <div class="button-container">
            <button class="btn-toggle" id="nebulaShowPulsarToggle" data-setting="showPulsar">
                <span class="toggle-text">Show Pulsar:ON</span>
            </button>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Pulsar Size</div>
            <input type="range" id="nebulaPulsarSize" min="1" max="15" value="5" step="1" class="slider-1">
            <span class="slider-1-value">5</span>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Pulse Rate</div>
            <input type="range" id="nebulaPulseRate" min="0.25" max="5.0" value="2.0" step="0.25" class="slider-1">
            <span class="slider-1-value">2.0</span>
        </div>
    </div>
</div>

<!-- Audio Reactive Controls -->
<div class="control-group">
    <div class="group-label">Audio Reactive Controls</div>
    
    <div class="control-group">
        <button class="btn-toggle" id="nebulaAudioReactiveToggle" data-setting="audioReactive">
            <span class="toggle-text">Audio React:ON</span>
        </button>
        
        <div class="preset-buttons" style="margin-bottom: 8px;">
            <button id="headerNebulaColorPresetBtn" class="btn-preset">Color</button>
            <button id="headerNebulaRotationPresetBtn" class="btn-preset">Rotation</button>
            <button id="headerNebulaDistancePresetBtn" class="btn-preset">Distance</button>
            <button id="headerNebulaPulsarPresetBtn" class="btn-preset">Pulsar</button>
            <button id="headerNebulaFilamentDensityPresetBtn" class="btn-preset">Density</button>
            <button id="headerNebulaChaosPresetBtn" class="btn-preset">Chaos</button>
            <button id="headerNebulaExpansionPresetBtn" class="btn-preset">Expansion</button>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Audio Sensitivity</div>
            <input type="range" id="nebulaAudioSensitivity" min="0.1" max="2.0" value="1.0" step="0.1" class="slider-1">
            <span class="slider-1-value">1.0</span>
        </div>
    </div>
</div>

<!-- Camera Controls -->
<div class="control-group">
    <div class="group-label">Camera Controls</div>
    
    <div class="control-group">
        <div class="button-container">
            <button class="btn-toggle" id="nebulaCameraOrbitToggle" data-setting="cameraOrbit">
                <span class="toggle-text">Orbit:OFF</span>
            </button>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Orbit Speed</div>
            <input type="range" id="nebulaOrbitSpeed" min="0" max="10" value="5" step="0.1" class="slider-1">
            <span class="slider-1-value">3.0</span>
        </div>
        
        <div class="button-container">
            <button class="btn-toggle" id="nebulaFlyThroughToggle" data-setting="flyThrough">
                <span class="toggle-text">Fly Through:OFF</span>
            </button>
        </div>
        
        <div class="slider-1-wrapper">
            <div class="slider-label">Fly Speed</div>
            <input type="range" id="nebulaFlySpeed" min="0.05" max="3.0" value="0.25" step="0.05" class="slider-1">
            <span class="slider-1-value">0.25</span>
        </div>
    </div>
</div>

</div>
</div>
```

## Native Nebula Mixer Channel Strip (index.html)

```html
<!-- Nebula Channel -->
<div class="channel-strip viz-channel">
    <div class="channel-drag-button" title="Drag to reorder">
        <svg width="16" height="8" viewBox="0 0 16 8" class="drag-arrows">
            <path d="M2 4 L0 2 L0 6 Z" fill="currentColor"/>
            <path d="M14 4 L16 2 L16 6 Z" fill="currentColor"/>
            <path d="M4 3 L12 3 L12 5 L4 5 Z" fill="currentColor" opacity="0.5"/>
        </svg>
    </div>
    <div class="channel-header">Nebula</div>
    
    <div class="channel-toggle-section">
        <button class="btn-toggle" id="mixerNebulaToggle" title="Toggle Nebula">
            <span class="toggle-text">OFF</span>
        </button>
    </div>
    
    <div class="vertical-slider-section">
        <div class="vertical-slider-container">
            <div class="vertical-slider-label top">Opacity</div>
            <div class="vertical-slider-wrapper">
                <div class="vertical-slider" id="mixerNebulaOpacitySlider" data-min="0" data-max="100" data-value="100">
                    <div class="vertical-slider-track"></div>
                    <div class="vertical-slider-fill"></div>
                    <div class="vertical-slider-thumb"></div>
                </div>
            </div>
            <div class="vertical-slider-label bottom" id="mixerNebulaOpacityValue">100</div>
        </div>
    </div>
    
    <div class="channel-presets-section">
        <div class="control-mini-label collapsible-header" data-target="nebulaPresets">
            <span>Presets</span>
            <span class="collapse-indicator"></span>
        </div>
        <div class="collapsible-content" id="nebulaPresets">
            <!-- Color Presets -->
            <div class="preset-buttons">
                <button id="mixerNebulaPresetDefault" class="btn-preset">Default</button>
                <button id="mixerNebulaPresetFire" class="btn-preset">Fire</button>
                <button id="mixerNebulaPresetIce" class="btn-preset">Ice</button>
                <button id="mixerNebulaPresetToxic" class="btn-preset">Toxic</button>
                <button id="mixerNebulaPresetSunset" class="btn-preset">Sunset</button>
                <button id="mixerNebulaPresetDeepSpace" class="btn-preset">Deep Space</button>
            </div>
            
            <!-- Preset Management -->
            <div class="control-mini-group">
                <div class="control-mini-label">Load Preset</div>
                <select id="mixerNebulaPresetSelector" class="dropdown-selector-mixer">
                    <option value="">Select Preset...</option>
                </select>
            </div>
            
            <div class="control-mini-group">
                <button id="mixerNebulaSavePresetBtn" class="btn-preset" title="Save Current as Preset">Save</button>
                <button id="mixerNebulaExportPresetsBtn" class="btn-preset" title="Export All Presets">Export</button>
                <button id="mixerNebulaImportPresetsBtn" class="btn-preset" title="Import Presets">Import</button>
                <input type="file" id="mixerNebulaImportFile" accept=".json" style="display: none;">
            </div>
        </div>
    </div>
    
    <div class="channel-controls-section">
        <div class="control-mini-label collapsible-header" data-target="nebulaControls">
            <span>Controls</span>
            <span class="collapse-indicator"></span>
        </div>
        <div class="collapsible-content" id="nebulaControls">
            <!-- Basic Controls -->
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Camera Distance</div>
                    <div class="control-mini-value" id="mixerNebulaCameraDistanceValue">80</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaCameraDistanceSlider" min="-180" max="180" step="10" value="80">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Star Count</div>
                    <div class="control-mini-value" id="mixerNebulaStarCountValue">1000</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaStarCountSlider" min="1000" max="10000" step="500" value="1000">
            </div>
            
            <!-- Structure Controls -->
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Filament Density</div>
                    <div class="control-mini-value" id="mixerNebulaFilamentDensityValue">1.4</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaFilamentDensitySlider" min="0.5" max="3.0" step="0.1" value="1.4">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Particles Per Filament</div>
                    <div class="control-mini-value" id="mixerNebulaParticlesPerFilamentValue">120</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaParticlesPerFilamentSlider" min="50" max="300" step="10" value="120">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Particle Size</div>
                    <div class="control-mini-value" id="mixerNebulaParticleSizeValue">1.0</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaParticleSizeSlider" min="0.3" max="3.0" step="0.1" value="1.0">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Expansion</div>
                    <div class="control-mini-value" id="mixerNebulaExpansionValue">36</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaExpansionSlider" min="10" max="80" step="2" value="36">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Chaos</div>
                    <div class="control-mini-value" id="mixerNebulaChaosValue">2.8</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaChaosSlider" min="1.0" max="5.0" step="0.1" value="2.8">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Asymmetry</div>
                    <div class="control-mini-value" id="mixerNebulaAsymmetryValue">1.1</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaAsymmetrySlider" min="0.5" max="2.0" step="0.1" value="1.1">
            </div>
            
            <!-- Color Controls -->
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Hue Shift</div>
                    <div class="control-mini-value" id="mixerNebulaHueShiftValue">0°</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaHueShiftSlider" min="0" max="360" step="5" value="0">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Saturation</div>
                    <div class="control-mini-value" id="mixerNebulaSaturationValue">100%</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaSaturationSlider" min="0" max="200" step="5" value="100">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Brightness</div>
                    <div class="control-mini-value" id="mixerNebulaBrightnessValue">100%</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaBrightnessSlider" min="20" max="200" step="5" value="100">
            </div>
            
            <!-- Pulsar Controls -->
            <div class="control-mini-group">
                <button class="btn-toggle" id="mixerNebulaShowPulsarToggle" title="Show Pulsar">
                    <span class="toggle-text">ON</span>
                    <div class="toggle-label">Show Pulsar</div>
                </button>
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Pulsar Size</div>
                    <div class="control-mini-value" id="mixerNebulaPulsarSizeValue">5</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaPulsarSizeSlider" min="1" max="15" step="1" value="5">
            </div>
            
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Pulse Rate</div>
                    <div class="control-mini-value" id="mixerNebulaPulseRateValue">2.0</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaPulseRateSlider" min="0.25" max="5.0" step="0.25" value="2.0">
            </div>
            
            <!-- Audio Reactive Controls -->
            <div class="control-mini-group">
                <button class="btn-toggle" id="mixerNebulaAudioReactiveToggle" title="Audio Reactive">
                    <span class="toggle-text">ON</span>
                    <div class="toggle-label">Audio React</div>
                </button>
            </div>
            <div class="control-mini-group">
                <button class="btn-toggle" id="mixerNebulaColorReactiveToggle" title="Color Reactive">
                    <span class="toggle-text">OFF</span>
                    <div class="toggle-label">Color</div>
                </button>
            </div>
            <div class="control-mini-group">
                <button class="btn-toggle" id="mixerNebulaRotationReactiveToggle" title="Rotation Reactive">
                    <span class="toggle-text">OFF</span>
                    <div class="toggle-label">Rotation</div>
                </button>
            </div>
            <div class="control-mini-group">
                <button class="btn-toggle" id="mixerNebulaPulsarReactiveToggle" title="Pulsar Reactive">
                    <span class="toggle-text">OFF</span>
                    <div class="toggle-label">Pulsar</div>
                </button>
            </div>
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Audio Sensitivity</div>
                    <div class="control-mini-value" id="mixerNebulaAudioSensitivityValue">1.0</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaAudioSensitivitySlider" min="0.1" max="2.0" step="0.1" value="1.0">
            </div>
            
            <!-- Camera Controls -->
            <div class="control-mini-group">
                <button class="btn-toggle" id="mixerNebulaCameraOrbitToggle" title="Camera Orbit">
                    <span class="toggle-text">OFF</span>
                    <div class="toggle-label">Orbit</div>
                </button>
            </div>
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Orbit Speed</div>
                    <div class="control-mini-value" id="mixerNebulaOrbitSpeedValue">5.0</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaOrbitSpeedSlider" min="0" max="10" step="0.1" value="5">
            </div>
            <div class="control-mini-group">
                <button class="btn-toggle" id="mixerNebulaFlyThroughToggle" title="Fly Through">
                    <span class="toggle-text">OFF</span>
                    <div class="toggle-label">Fly Through</div>
                </button>
            </div>
            <div class="control-mini-group">
                <div class="control-mini-header">
                    <div class="control-mini-label">Fly Speed</div>
                    <div class="control-mini-value" id="mixerNebulaFlySpeedValue">0.25</div>
                </div>
                <input type="range" class="mini-slider" id="mixerNebulaFlySpeedSlider" min="0.05" max="3.0" step="0.05" value="0.25">
            </div>
        </div>
    </div>
</div>
```

## Native Nebula Event Listeners and Update Functions (main.js)

All native Nebula event listeners and update functions from main.js that need to be removed after plugin migration.

This backup preserves the complete native Nebula system for reference and potential rollback if needed.
