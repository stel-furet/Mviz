/**
 * Nebula Plugin - Supernova Remnant Visualization
 * Converts native Nebula system to plugin architecture
 * Migrates all 41 controls from header panel to mixer channel strip
 */

class NebulaPlugin extends FrequePluginBase {
    constructor(visualizer) {
        // Initialize base plugin with metadata
        super('nebula', visualizer, {
            displayName: 'Nebula',
            author: 'Freque Team',
            description: 'Supernova Remnant Visualization with Three.js',
            targetFPS: 60
        });
        
        // Initialize nebula visualization properties (don't create NebulaVisualization yet)
        this.nebulaViz = null;
        
        // Initialize plugin-specific properties
        this.initializeNebulaProperties();
        
        // Setup input section controls (channel-input-section)
        this.setupNebulaInputControls();
        
        // Setup all 41 controls in proper containers
        this.setupNebulaControls();
        this.setupNebulaPresets();
        
        // Update input controls after a delay to ensure UI is ready
        setTimeout(() => {
            if (this.inputControls && window.updatePluginInputControls) {
                window.updatePluginInputControls(this.pluginName, this.inputControls);
            }
        }, 500);
    }
    
    initializeNebulaProperties() {
        // Initialize properties that will be controlled by UI
        this.overallOpacity = 1.0;
        this.cameraDistance = 80;
        this.starCount = 1000;
        this.bloomEnabled = true;
        this.knockoutBackground = true;
        this.morphingEnabled = false;
        this.morphingSpeed = 1.0;
        
        // Color properties
        this.hueShift = 0;
        this.saturation = 100;
        this.brightness = 100;
        
        // Structure properties
        this.filamentDensity = 1.4;
        this.particlesPerFilament = 120;
        this.particleSize = 1.0;
        this.expansion = 36;
        this.chaos = 2.8;
        this.asymmetry = 1.1;
        
        // Pulsar properties
        this.showPulsar = true;
        this.pulsarSize = 5;
        this.pulseRate = 2.0;
        
        // Audio reactive properties
        this.audioReactive = true;
        this.audioSensitivity = 1.0;
        this.audioColor = false;
        this.audioRotation = false;
        this.audioDistance = false;
        this.audioPulsar = true;
        this.audioDensity = true;
        this.audioChaos = true;
        this.audioExpansion = true;
        
        // Camera properties
        this.cameraOrbit = false;
        this.orbitSpeed = 5.0;
        this.flyThrough = false;
        this.flySpeed = 0.25;
    }
    
    // Helper method to add controls to the input section
    addInputControl(controlId, controlConfig) {
        if (!this.inputControls) {
            this.inputControls = new Map();
        }
        this.inputControls.set(controlId, controlConfig);
    }

    // Helper method to safely update nebula settings
    updateNebulaSetting(property, value, nested = null) {
        if (this.nebulaViz && this.nebulaViz.updateSetting) {
            if (nested) {
                // Handle nested properties like audioPresets.color
                if (!this.nebulaViz.settings[property]) {
                    this.nebulaViz.settings[property] = {};
                }
                this.nebulaViz.settings[property][nested] = value;
            } else {
                // Use NebulaVisualization's updateSetting method for proper updates
                this.nebulaViz.updateSetting(property, value);
            }
        } else {
            const propName = nested ? `${property}.${nested}` : property;
        }
    }
    
    // Required method for plugin system opacity slider
    setOpacity(value) {
        // Plugin base class passes 0-100, convert to 0-1 for nebula
        const normalizedValue = value / 100;
        this.overallOpacity = normalizedValue;
        this.updateNebulaSetting('overallOpacity', normalizedValue);
        if (this.nebulaViz) {
            this.nebulaViz.opacity = normalizedValue;
        }
        
        // Call parent class method to handle canvas opacity
        super.setOpacity(value);
    }
    
    // Helper method to add section headers to controls
    addControlSectionHeader(title) {
        // Create a unique ID for this section
        const sectionId = `${this.pluginName}-section-${title.toLowerCase().replace(/\s+/g, '-')}`;
        
        // Add a special control that acts as a section header
        this.addControl(sectionId, {
            type: 'section-header',
            label: title,
            isHeader: true
        });
    }

    // Setup input section controls (channel-input-section)
    setupNebulaInputControls() {
        this.addInputControl('knockoutBackgroundToggle', {
            type: 'button',
            label: 'Background: OFF',
            wrapperClass: 'btn-toggle',
            onClick: () => {
                this.knockoutBackground = !this.knockoutBackground;
                this.updateNebulaSetting('knockoutBackground', this.knockoutBackground);
                // Update button text (inverted logic: knockoutBackground=true means Background:OFF)
                const button = document.querySelector(`[data-plugin="nebula"] .channel-input-section [data-control="knockoutBackgroundToggle"]`);
                if (button) {
                    button.textContent = `Background: ${this.knockoutBackground ? 'OFF' : 'ON'}`;
                }
            }
        });
    }
    
    setupNebulaPresets() {
        // Color Presets (6 buttons)
        this.addPreset('default', { 
            label: 'Default', 
            onClick: () => this.applyColorPreset('default') 
        });
        this.addPreset('fire', { 
            label: 'Fire', 
            onClick: () => this.applyColorPreset('fire') 
        });
        this.addPreset('ice', { 
            label: 'Ice', 
            onClick: () => this.applyColorPreset('ice') 
        });
        this.addPreset('toxic', { 
            label: 'Toxic', 
            onClick: () => this.applyColorPreset('toxic') 
        });
        this.addPreset('sunset', { 
            label: 'Sunset', 
            onClick: () => this.applyColorPreset('sunset') 
        });
        this.addPreset('deepspace', { 
            label: 'Deep Space', 
            onClick: () => this.applyColorPreset('deepspace') 
        });
        
        // Preset Management (4 controls)
        this.addPreset('presetSelector', { 
            type: 'dropdown', 
            label: 'Load Preset...', 
            options: this.getStoredPresetsForDropdown(),
            onChange: (value) => this.loadPreset(value)
        });
        this.addPreset('save', { 
            label: 'Save', 
            onClick: () => this.saveCurrentPreset() 
        });
        this.addPreset('export', { 
            label: 'Export', 
            onClick: () => this.exportAllPresets() 
        });
        this.addPreset('import', { 
            label: 'Import', 
            onClick: () => this.importPresets() 
        });
    }
    
    setupNebulaControls() {
        // Add section headers for control groups
        this.addControlSectionHeader('Camera Controls');
        
        // Camera Controls (4 controls)
        this.addControl('cameraOrbitToggle', {
            type: 'checkbox',
            label: 'Orbit',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.cameraOrbit = value;
                this.updateNebulaSetting('cameraOrbit', value);
            }
        });
        
        this.addControl('orbitSpeed', {
            type: 'slider',
            label: 'Orbit Speed',
            min: 0,
            max: 10,
            step: 0.1,
            value: this.orbitSpeed,
            onChange: (value) => {
                this.orbitSpeed = value;
                this.updateNebulaSetting('orbitSpeed', value);
            }
        });
        
        this.addControl('flyThroughToggle', {
            type: 'checkbox',
            label: 'Fly Through',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.flyThrough = value;
                this.updateNebulaSetting('flyThrough', value);
            }
        });
        
        this.addControl('flySpeed', {
            type: 'slider',
            label: 'Fly Speed',
            min: 0.05,
            max: 3.0,
            step: 0.05,
            value: this.flySpeed,
            onChange: (value) => {
                this.flySpeed = value;
                this.updateNebulaSetting('flySpeed', value);
            }
        });
        
        this.addControlSectionHeader('Basic Controls');
        
        // Basic Controls (5 controls - opacity auto-generated by plugin system)
        this.addControl('cameraDistance', {
            type: 'slider',
            label: 'Camera Distance',
            min: -180,
            max: 180,
            step: 10,
            value: this.cameraDistance,
            onChange: (value) => {
                this.cameraDistance = value;
                this.updateNebulaSetting('cameraDistance', value);
            }
        });
        
        this.addControl('starCount', {
            type: 'slider',
            label: 'Star Count',
            min: 1000,
            max: 10000,
            step: 500,
            value: this.starCount,
            onChange: (value) => {
                this.starCount = value;
                this.updateNebulaSetting('starCount', value);
            }
        });
        
        this.addControl('bloomToggle', {
            type: 'button',
            label: 'Bloom: ON',
            wrapperClass: 'btn-primary-mixer',
            onClick: () => {
                this.bloomEnabled = !this.bloomEnabled;
                this.updateNebulaSetting('bloom', this.bloomEnabled);
                // Update button text
                const button = document.querySelector(`[data-plugin="nebula"] [data-control="bloomToggle"]`);
                if (button) {
                    button.textContent = `Bloom: ${this.bloomEnabled ? 'ON' : 'OFF'}`;
                }
            }
        });
        
        this.addControl('morphingToggle', {
            type: 'button',
            label: 'Morphing: OFF',
            wrapperClass: 'btn-primary-mixer',
            onClick: () => {
                this.morphingEnabled = !this.morphingEnabled;
                
                // Update nebula setting
                this.updateNebulaSetting('morphingMode', this.morphingEnabled);
                
                // Update button text - use specific channel strip selector
                const channelStrip = document.querySelector(`.channel-strip[data-plugin="nebula"]`);
                if (channelStrip) {
                    const button = channelStrip.querySelector(`[data-control="morphingToggle"]`);
                    if (button) {
                        button.textContent = `Morphing: ${this.morphingEnabled ? 'ON' : 'OFF'}`;
                    } else {
                        console.error(`🌌 NEBULA PLUGIN: Morphing button not found in channel strip`);
                    }
                } else {
                    console.error(`🌌 NEBULA PLUGIN: Channel strip not found`);
                }
            }
        });

        // Preset Management Buttons (part of Basic Controls in native system)
        this.addControl('savePreset', {
            type: 'button',
            label: 'Save',
            wrapperClass: 'btn-secondary',
            onClick: () => this.savePreset()
        });

        this.addControl('exportPresets', {
            type: 'button',
            label: 'Export',
            wrapperClass: 'btn-secondary',
            onClick: () => this.exportPresets()
        });

        this.addControl('importPresets', {
            type: 'button',
            label: 'Import',
            wrapperClass: 'btn-secondary',
            onClick: () => this.importPresets()
        });
        
        this.addControl('morphingSpeed', {
            type: 'slider',
            label: 'Morphing Speed',
            min: 0.1,
            max: 2.0,
            step: 0.1,
            value: this.morphingSpeed,
            onChange: (value) => {
                this.morphingSpeed = value;
                this.updateNebulaSetting('morphingSpeed', value);
            }
        });
        
        this.addControlSectionHeader('Color Controls');
        
        // Color Controls (3 controls)
        this.addControl('hueShift', {
            type: 'slider',
            label: 'Hue Shift',
            min: 0,
            max: 360,
            step: 5,
            value: this.hueShift,
            unit: '°',
            onChange: (value) => {
                this.hueShift = value;
                this.updateNebulaSetting('hueShift', value);
            }
        });
        
        this.addControl('saturation', {
            type: 'slider',
            label: 'Saturation',
            min: 0,
            max: 200,
            step: 5,
            value: this.saturation,
            unit: '%',
            onChange: (value) => {
                this.saturation = value;
                this.updateNebulaSetting('saturation', value);
            }
        });
        
        this.addControl('brightness', {
            type: 'slider',
            label: 'Brightness',
            min: 20,
            max: 200,
            step: 5,
            value: this.brightness,
            unit: '%',
            onChange: (value) => {
                this.brightness = value;
                this.updateNebulaSetting('brightness', value);
            }
        });
        
        this.addControlSectionHeader('Structure Controls');
        
        // Structure Controls (6 controls)
        this.addControl('filamentDensity', {
            type: 'slider',
            label: 'Filament Density',
            min: 0.5,
            max: 3.0,
            step: 0.1,
            value: this.filamentDensity,
            onChange: (value) => {
                this.filamentDensity = value;
                this.updateNebulaSetting('filamentDensity', value);
            }
        });
        
        this.addControl('particlesPerFilament', {
            type: 'slider',
            label: 'Particles Per Filament',
            min: 50,
            max: 300,
            step: 10,
            value: this.particlesPerFilament,
            onChange: (value) => {
                this.particlesPerFilament = value;
                this.updateNebulaSetting('particlesPerFilament', value);
            }
        });
        
        this.addControl('particleSize', {
            type: 'slider',
            label: 'Particle Size',
            min: 0.3,
            max: 3.0,
            step: 0.1,
            value: this.particleSize,
            onChange: (value) => {
                this.particleSize = value;
                this.updateNebulaSetting('particleSize', value);
            }
        });
        
        this.addControl('expansion', {
            type: 'slider',
            label: 'Expansion',
            min: 10,
            max: 80,
            step: 2,
            value: this.expansion,
            onChange: (value) => {
                this.expansion = value;
                this.updateNebulaSetting('expansion', value);
            }
        });
        
        this.addControl('chaos', {
            type: 'slider',
            label: 'Chaos',
            min: 1.0,
            max: 5.0,
            step: 0.1,
            value: this.chaos,
            onChange: (value) => {
                this.chaos = value;
                this.updateNebulaSetting('chaos', value);
            }
        });
        
        this.addControl('asymmetry', {
            type: 'slider',
            label: 'Asymmetry',
            min: 0.5,
            max: 2.0,
            step: 0.1,
            value: this.asymmetry,
            onChange: (value) => {
                this.asymmetry = value;
                this.updateNebulaSetting('asymmetry', value);
            }
        });
        
        this.addControlSectionHeader('Pulsar Controls');
        
        // Pulsar Controls (3 controls)
        this.addControl('showPulsarToggle', {
            type: 'button',
            label: 'Show Pulsar: ON',
            wrapperClass: 'btn-primary-mixer',
            onClick: () => {
                this.showPulsar = !this.showPulsar;
                this.updateNebulaSetting('showPulsar', this.showPulsar);
                // Update button text
                const button = document.querySelector(`[data-plugin="nebula"] [data-control="showPulsarToggle"]`);
                if (button) {
                    button.textContent = `Show Pulsar: ${this.showPulsar ? 'ON' : 'OFF'}`;
                }
            }
        });
        
        this.addControl('pulsarSize', {
            type: 'slider',
            label: 'Pulsar Size',
            min: 1,
            max: 15,
            step: 1,
            value: this.pulsarSize,
            onChange: (value) => {
                this.pulsarSize = value;
                this.updateNebulaSetting('pulsarSize', value);
            }
        });
        
        this.addControl('pulseRate', {
            type: 'slider',
            label: 'Pulse Rate',
            min: 0.25,
            max: 5.0,
            step: 0.25,
            value: this.pulseRate,
            onChange: (value) => {
                this.pulseRate = value;
                this.updateNebulaSetting('pulseRate', value);
            }
        });
        
        this.addControlSectionHeader('Audio Reactive Controls');
        
        // Audio Reactive Controls (9 controls)
        this.addControl('audioReactive', {
            type: 'checkbox',
            label: 'Audio React',
            checked: true,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.audioReactive = value;
                this.updateNebulaSetting('audioReactive', value);
                console.log('🎵 Nebula Audio React:', value);
            }
        });
        
        this.addControl('audioSensitivity', {
            type: 'slider',
            label: 'Audio Sensitivity',
            min: 0.1,
            max: 2.0,
            step: 0.1,
            value: this.audioSensitivity,
            onChange: (value) => {
                this.audioSensitivity = value;
                this.updateNebulaSetting('audioSensitivity', value);
            }
        });
        
        this.addControl('audioColor', {
            type: 'checkbox',
            label: 'Color',
            checked: false,
            className: 'btn-preset',
            onChange: (value) => {
                this.audioColor = value;
                this.updateNebulaSetting('audioPresets', value, 'color');
            }
        });
        
        this.addControl('audioRotation', {
            type: 'checkbox',
            label: 'Rotation',
            checked: false,
            className: 'btn-preset',
            onChange: (value) => {
                this.audioRotation = value;
                this.updateNebulaSetting('audioPresets', value, 'rotation');
            }
        });
        
        this.addControl('audioDistance', {
            type: 'checkbox',
            label: 'Distance',
            checked: false,
            className: 'btn-preset',
            onChange: (value) => {
                this.audioDistance = value;
                this.updateNebulaSetting('audioPresets', value, 'distance');
            }
        });
        
        this.addControl('audioPulsar', {
            type: 'checkbox',
            label: 'Pulsar',
            checked: true,
            className: 'btn-preset',
            onChange: (value) => {
                this.audioPulsar = value;
                this.updateNebulaSetting('audioPresets', value, 'pulsar');
            }
        });
        
        this.addControl('audioDensity', {
            type: 'checkbox',
            label: 'Density',
            checked: true,
            className: 'btn-preset',
            onChange: (value) => {
                this.audioDensity = value;
                this.updateNebulaSetting('audioPresets', value, 'filamentDensity');
            }
        });
        
        this.addControl('audioChaos', {
            type: 'checkbox',
            label: 'Chaos',
            checked: true,
            className: 'btn-preset',
            onChange: (value) => {
                this.audioChaos = value;
                this.updateNebulaSetting('audioPresets', value, 'chaos');
            }
        });
        
        this.addControl('audioExpansion', {
            type: 'checkbox',
            label: 'Expansion',
            checked: true,
            className: 'btn-preset',
            onChange: (value) => {
                this.audioExpansion = value;
                this.updateNebulaSetting('audioPresets', value, 'expansion');
            }
        });
        
        this.addControlSectionHeader('Camera Controls');
        
        // Camera Controls (4 controls)
        this.addControl('cameraOrbit', {
            type: 'checkbox',
            label: 'Camera Orbit',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.cameraOrbit = value;
                this.updateNebulaSetting('cameraOrbit', value);
            }
        });
        
        this.addControl('orbitSpeed', {
            type: 'slider',
            label: 'Orbit Speed',
            min: 0,
            max: 10,
            step: 0.1,
            value: this.orbitSpeed,
            onChange: (value) => {
                this.orbitSpeed = value;
                this.updateNebulaSetting('orbitSpeed', value);
            }
        });
        
        this.addControl('flyThrough', {
            type: 'checkbox',
            label: 'Fly Through',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.flyThrough = value;
                this.updateNebulaSetting('flyThrough', value);
            }
        });
        
        this.addControl('flySpeed', {
            type: 'slider',
            label: 'Fly Speed',
            min: 0.05,
            max: 3.0,
            step: 0.05,
            value: this.flySpeed,
            onChange: (value) => {
                this.flySpeed = value;
                this.updateNebulaSetting('flySpeed', value);
            }
        });
    }
    
    // Preset Management Methods
    applyColorPreset(presetName) {
        // Apply color presets (duplicate native functionality)
        const presets = {
            default: { hueShift: 0, saturation: 100, brightness: 100 },
            fire: { hueShift: 15, saturation: 150, brightness: 120 },
            ice: { hueShift: 200, saturation: 80, brightness: 90 },
            toxic: { hueShift: 90, saturation: 180, brightness: 110 },
            sunset: { hueShift: 30, saturation: 140, brightness: 115 },
            deepspace: { hueShift: 270, saturation: 60, brightness: 70 }
        };
        
        if (presets[presetName]) {
            const preset = presets[presetName];
            
            // Update plugin properties
            this.hueShift = preset.hueShift;
            this.saturation = preset.saturation;
            this.brightness = preset.brightness;
            
            // Update nebula visualization using proper updateSetting method
            this.updateNebulaSetting('hueShift', this.hueShift);
            this.updateNebulaSetting('saturation', this.saturation);
            this.updateNebulaSetting('brightness', this.brightness);
            
            // Update UI controls to reflect new values
            this.updateControlValues();
        }
    }
    
    getStoredPresets() {
        // Get saved presets from localStorage
        try {
            const saved = localStorage.getItem('nebulaPresets');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading nebula presets:', error);
            return {};
        }
    }
    
    getStoredPresetsForDropdown() {
        // Get presets formatted for dropdown options
        const presets = this.getStoredPresets();
        return Object.keys(presets).map(name => ({
            value: name,
            label: name
        }));
    }
    
    saveCurrentPreset() {
        // Save current settings as preset
        const presetName = prompt('Enter preset name:');
        if (presetName && presetName.trim()) {
            const currentSettings = this.getCurrentSettings();
            const presets = this.getStoredPresets();
            presets[presetName.trim()] = currentSettings;
            localStorage.setItem('nebulaPresets', JSON.stringify(presets));
            
            
            // Update the dropdown with new preset
            this.updatePresetDropdown();
            
            alert(`Preset "${presetName}" saved successfully!`);
        }
    }
    
    updatePresetDropdown() {
        // Update the preset selector dropdown with current presets
        const channelStrip = document.querySelector(`.channel-strip[data-plugin="nebula"]`);
        if (channelStrip) {
            const dropdown = channelStrip.querySelector('[data-control="presetSelector"]');
            if (dropdown) {
                // Clear existing options except the first one
                const firstOption = dropdown.firstElementChild;
                dropdown.innerHTML = '';
                dropdown.appendChild(firstOption);
                
                // Add current presets
                const presets = this.getStoredPresetsForDropdown();
                presets.forEach(preset => {
                    const option = document.createElement('option');
                    option.value = preset.value;
                    option.textContent = preset.label;
                    dropdown.appendChild(option);
                });
            }
        }
    }
    
    exportAllPresets() {
        // Export presets to file
        const presets = this.getStoredPresets();
        const dataStr = JSON.stringify(presets, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'nebula-presets.json';
        link.click();
        URL.revokeObjectURL(url);
    }
    
    importPresets() {
        // Import presets from file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const presets = JSON.parse(e.target.result);
                        localStorage.setItem('nebulaPresets', JSON.stringify(presets));
                        this.updatePresetDropdown();
                        alert('Presets imported successfully!');
                    } catch (error) {
                        alert('Error importing presets: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    getCurrentSettings() {
        // Get current settings for saving
        return {
            overallOpacity: this.overallOpacity,
            cameraDistance: this.cameraDistance,
            starCount: this.starCount,
            bloomEnabled: this.bloomEnabled,
            morphingEnabled: this.morphingEnabled,
            morphingSpeed: this.morphingSpeed,
            hueShift: this.hueShift,
            saturation: this.saturation,
            brightness: this.brightness,
            filamentDensity: this.filamentDensity,
            particlesPerFilament: this.particlesPerFilament,
            particleSize: this.particleSize,
            expansion: this.expansion,
            chaos: this.chaos,
            asymmetry: this.asymmetry,
            showPulsar: this.showPulsar,
            pulsarSize: this.pulsarSize,
            pulseRate: this.pulseRate,
            audioReactive: this.audioReactive,
            audioSensitivity: this.audioSensitivity,
            audioColor: this.audioColor,
            audioRotation: this.audioRotation,
            audioDistance: this.audioDistance,
            audioPulsar: this.audioPulsar,
            audioDensity: this.audioDensity,
            audioChaos: this.audioChaos,
            audioExpansion: this.audioExpansion,
            cameraOrbit: this.cameraOrbit,
            orbitSpeed: this.orbitSpeed,
            flyThrough: this.flyThrough,
            flySpeed: this.flySpeed
        };
    }
    
    updateControlValues() {
        // Update UI control values after preset application
        // This will be handled by the plugin system
    }
    
    loadPreset(presetName) {
        // Load a saved preset
        const presets = this.getStoredPresets();
        if (presets[presetName]) {
            const preset = presets[presetName];
            
            // Update plugin properties
            Object.assign(this, preset);
            
            // Update nebula visualization using proper updateSetting method for each property
            Object.keys(preset).forEach(property => {
                if (this.nebulaViz && this.nebulaViz.updateSetting) {
                    this.updateNebulaSetting(property, preset[property]);
                }
            });
            
            // Update UI controls
            this.updateControlValues();
            
        } else {
            console.error(`🌌 NEBULA PLUGIN: Preset "${presetName}" not found`);
        }
    }
    
    // Plugin lifecycle methods
    onInitialize() {
        try {
            // Create nebula visualization - let it create its own canvas first
            this.nebulaViz = new NebulaVisualization(null, null);
            
            // Copy plugin canvas properties to nebula canvas
            const nebulaCanvas = this.nebulaViz.canvas;
            nebulaCanvas.width = this.canvas.width;
            nebulaCanvas.height = this.canvas.height;
            nebulaCanvas.style.position = this.canvas.style.position;
            nebulaCanvas.style.top = this.canvas.style.top;
            nebulaCanvas.style.left = this.canvas.style.left;
            nebulaCanvas.style.zIndex = this.canvas.style.zIndex;
            nebulaCanvas.style.display = this.canvas.style.display;
            nebulaCanvas.style.opacity = this.canvas.style.opacity;
            nebulaCanvas.setAttribute('data-visualization', 'plugin-nebula');
            nebulaCanvas.setAttribute('data-plugin', 'nebula');
            nebulaCanvas.id = this.canvas.id;
            nebulaCanvas.className = this.canvas.className;
            
            // Replace plugin canvas with nebula canvas in DOM
            const parent = this.canvas.parentNode;
            if (parent) {
                parent.replaceChild(nebulaCanvas, this.canvas);
                this.canvas = nebulaCanvas;
            }
            
            // Initialize the nebula visualization
            if (this.nebulaViz && typeof this.nebulaViz.init === 'function') {
                this.nebulaViz.init();
            } else {
                console.error('Nebula Plugin: NebulaVisualization.init() not available');
            }
            
            // Apply initial settings
            this.applyInitialSettings();
            
            // Enable the nebula visualization
            if (this.nebulaViz) {
                this.nebulaViz.enabled = true;
            }
            
            // Initialize preset dropdown with any existing presets
            setTimeout(() => this.updatePresetDropdown(), 100);
            
        } catch (error) {
            console.error('Nebula Plugin initialization error:', error);
        }
    }
    
    applyInitialSettings() {
        if (!this.nebulaViz || !this.nebulaViz.settings) return;
        
        // Apply all plugin properties to nebula visualization using updateSetting for proper initialization
        this.nebulaViz.settings.overallOpacity = this.overallOpacity;
        this.nebulaViz.settings.cameraDistance = this.cameraDistance;
        this.nebulaViz.settings.starCount = this.starCount;
        this.nebulaViz.settings.bloom = this.bloomEnabled;
        
        // Use updateSetting for knockoutBackground to trigger applyBackgroundKnockout()
        if (this.nebulaViz.updateSetting) {
            this.nebulaViz.updateSetting('knockoutBackground', this.knockoutBackground);
        } else {
            this.nebulaViz.settings.knockoutBackground = this.knockoutBackground;
        }
        
        this.nebulaViz.settings.morphingMode = this.morphingEnabled;
        this.nebulaViz.settings.morphingSpeed = this.morphingSpeed;
        
        // Color settings
        this.nebulaViz.settings.hueShift = this.hueShift;
        this.nebulaViz.settings.saturation = this.saturation;
        this.nebulaViz.settings.brightness = this.brightness;
        
        // Structure settings
        this.nebulaViz.settings.filamentDensity = this.filamentDensity;
        this.nebulaViz.settings.particlesPerFilament = this.particlesPerFilament;
        this.nebulaViz.settings.particleSize = this.particleSize;
        this.nebulaViz.settings.expansion = this.expansion;
        this.nebulaViz.settings.chaos = this.chaos;
        this.nebulaViz.settings.asymmetry = this.asymmetry;
        
        // Pulsar settings
        this.nebulaViz.settings.showPulsar = this.showPulsar;
        this.nebulaViz.settings.pulsarSize = this.pulsarSize;
        this.nebulaViz.settings.pulseRate = this.pulseRate;
        
        // Audio reactive settings
        this.nebulaViz.settings.audioReactive = this.audioReactive;
        this.nebulaViz.settings.audioSensitivity = this.audioSensitivity;
        
        // Camera settings
        this.nebulaViz.settings.cameraOrbit = this.cameraOrbit;
        this.nebulaViz.settings.orbitSpeed = this.orbitSpeed;
        this.nebulaViz.settings.flyThrough = this.flyThrough;
        this.nebulaViz.settings.flySpeed = this.flySpeed;
        this.nebulaViz.settings.audioPresets.color = this.audioColor;
        this.nebulaViz.settings.audioPresets.rotation = this.audioRotation;
        this.nebulaViz.settings.audioPresets.distance = this.audioDistance;
        this.nebulaViz.settings.audioPresets.pulsar = this.audioPulsar;
        this.nebulaViz.settings.audioPresets.filamentDensity = this.audioDensity;
        this.nebulaViz.settings.audioPresets.chaos = this.audioChaos;
        this.nebulaViz.settings.audioPresets.expansion = this.audioExpansion;
        
        // Camera settings
        this.nebulaViz.settings.cameraOrbit = this.cameraOrbit;
        this.nebulaViz.settings.orbitSpeed = this.orbitSpeed;
        this.nebulaViz.settings.flyThrough = this.flyThrough;
        this.nebulaViz.settings.flySpeed = this.flySpeed;
        
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        // Update nebula with audio data
        if (this.nebulaViz && this.nebulaViz.updateAudioData && sharedAudioData) {
            this.nebulaViz.updateAudioData(sharedAudioData);
        }
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        // Delegate to wrapped nebula visualization (minimal changes)
        if (this.nebulaViz && this.nebulaViz.update && this.nebulaViz.render) {
            // Call update first (handles time increment and pulsar pulsing)
            this.nebulaViz.update(sharedAudioData);
            
            // Then render the frame
            this.nebulaViz.render();
        } else {
        }
        
        // Increment frame counter
        this.frameCount = (this.frameCount || 0) + 1;
    }
    
    onResize(width, height) {
        // Handle canvas resize
        if (this.nebulaViz && this.nebulaViz.resize) {
            this.nebulaViz.resize(width, height);
        }
    }
    
    onDestroy() {
        // Clean up nebula visualization
        if (this.nebulaViz && this.nebulaViz.destroy) {
            this.nebulaViz.destroy();
        }
    }
    
    // ==================== PLUGIN RENDERING API OVERRIDES ====================
    // These methods customize how Nebula is rendered in recording/live display
    
    /**
     * Three.js handles its own clearing - don't clear the canvas
     */
    shouldClearCanvas() {
        return false; // Three.js WebGL renderer handles clearing
    }
    
    /**
     * Get Nebula's actual opacity from its settings
     */
    getOpacity() {
        return this.nebulaViz?.settings?.overallOpacity || 1.0;
    }
    
    /**
     * Return 'screen' blend mode when knockout is enabled for canvas compositing
     */
    getBlendMode() {
        if (this.nebulaViz?.settings?.knockoutBackground) {
            return 'screen'; // Screen blend mode knocks out black background
        }
        return null;
    }
}

// Auto-register plugin when dependencies are available
(function() {
    function tryRegister() {
        if (window.visualizer && window.pluginManager && window.FrequePluginBase) {
            try {
                const nebulaPlugin = new NebulaPlugin(window.visualizer);
            } catch (error) {
                console.error('🌌 Failed to auto-register Nebula plugin:', error);
            }
        } else {
            // Retry after a short delay
            setTimeout(tryRegister, 100);
        }
    }
    
    // Start registration attempts
    setTimeout(tryRegister, 500);
})();
