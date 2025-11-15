/**
 * Base Plugin Class for Freque MAL Plugin System
 * Provides standardized MAL integration, canvas management, and UI controls
 * All plugins should extend this base class
 */

class FrequePluginBase {
    constructor(pluginName, visualizer, config = {}) {
        // Core plugin properties
        this.pluginName = pluginName;
        this.visualizer = visualizer;
        this.isActive = false;
        this.isInitialized = false;
        
        // Canvas management
        this.canvas = null;
        this._ctx = null; // Private storage for lazy-loaded 2D context
        this.canvasId = `${pluginName}-plugin-canvas`;
        this.zIndex = 11; // Will be auto-assigned by plugin manager
        
        // Lazy-load 2D context for backwards compatibility
        // This allows WebGL plugins to get their context before 2D is created
        Object.defineProperty(this, 'ctx', {
            get: function() {
                if (!this._ctx && this.canvas) {
                    console.log(`🎨 Plugin ${this.pluginName}: Creating 2D context on first access`);
                    this._ctx = this.canvas.getContext('2d', { willReadFrequently: true });
                }
                return this._ctx;
            },
            set: function(value) {
                this._ctx = value;
            }
        });
        
        // Plugin metadata
        this.metadata = {
            name: pluginName,
            version: config.version || '1.0.0',
            author: config.author || 'Unknown',
            description: config.description || 'Freque Plugin',
            ...config.metadata
        };
        
        // UI controls
        this.opacity = 1.0;
        this.controls = new Map();
        this.presets = new Map();
        this.presetsLoaded = false; // Track if presets have been loaded from storage
        this.savedPresetsCache = null; // Cache for saved presets from localStorage
        
        // User presets (separate from hardcoded presets)
        this.userPresets = [];
        
        // Performance tracking
        this.lastFrameTime = 0;
        this.targetFPS = config.targetFPS || 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Audio data
        this.sharedAudioData = null;
        
        // Bind methods
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        
        // Auto-register with MAL
        this.registerWithMAL();
        
        // Auto-register with Plugin Manager
        this.registerWithPluginManager();
        
        // Load presets from storage BEFORE setupPresets() runs
        // This allows hardcoded presets to merge with saved presets
        this.loadPresetsFromStorage();
        
        // Load user presets from storage
        this.loadUserPresetsFromStorage();
    }
    
    /**
     * Register plugin with Master Animation Loop
     */
    registerWithMAL() {
        if (window.masterAnimationController) {
            window.masterAnimationController.registerSystem(this.pluginName, {
                priority: this.zIndex, // Use z-index as priority
                targetFPS: this.targetFPS,
                update: (deltaTime, timestamp, sharedAudioData) => this.update(deltaTime, timestamp, sharedAudioData),
                render: (deltaTime, timestamp, sharedAudioData) => this.render(deltaTime, timestamp, sharedAudioData),
                cleanup: () => this.cleanup(),
                errorHandler: (error) => this.handleError(error)
            });
        }
    }
    
    /**
     * Register plugin with Plugin Manager for UI and canvas management
     */
    registerWithPluginManager() {
        // console.log(`🔌 REGISTER DEBUG: ${this.pluginName} attempting to register with plugin manager`);
        // console.log(`🔌 REGISTER DEBUG: Plugin manager exists:`, !!window.pluginManager);
        // console.log(`🔌 REGISTER DEBUG: Mixer integration exists:`, !!window.pluginMixerIntegration);
        
        if (window.pluginManager && window.pluginMixerIntegration) {
            window.pluginManager.registerPlugin(this);
        } else {
            console.warn(`🔌 Plugin systems not ready for ${this.pluginName} - retrying in 100ms`);
            setTimeout(() => {
                this.registerWithPluginManager();
            }, 100);
        }
    }
    
    /**
     * Initialize plugin canvas and UI
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.createCanvas();
        this.createUI();
        this.isInitialized = true;
        
        // Call plugin-specific initialization
        if (this.onInitialize) {
            this.onInitialize();
        }
    }
    
    /**
     * Create plugin canvas with proper z-index and styling
     */
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = this.canvasId;
        this.canvas.className = 'plugin-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = this.zIndex.toString();
        this.canvas.style.display = 'none';
        this.canvas.style.opacity = this.opacity.toString();
        
        // Add metadata attributes
        this.canvas.setAttribute('data-plugin', this.pluginName);
        this.canvas.setAttribute('data-visualization', 'plugin-' + this.pluginName);
        this.canvas.setAttribute('data-owner', 'FrequePlugin');
        this.canvas.setAttribute('data-created', new Date().toISOString());
        
        // Add to visualization container
        const container = document.getElementById('visualizationContainer');
        if (container) {
            container.appendChild(this.canvas);
            this.resize();
        } else {
            console.error(`Plugin ${this.pluginName}: visualizationContainer not found!`);
        }
    }
    
    /**
     * Create UI channel strip for plugin
     */
    createUI() {
        // Check if channel strip already exists
        if (window.pluginMixerIntegration && window.pluginMixerIntegration.channelStrips) {
            const existingStrip = window.pluginMixerIntegration.channelStrips.get(this.pluginName);
            if (existingStrip) {
                return;
            }
        }
        if (window.pluginManager && window.pluginManager.createChannelStrip) {
            window.pluginManager.createChannelStrip(this);
        }
    }
    
    /**
     * Resize canvas to match container
     */
    resize() {
        if (!this.canvas) return;
        
        const container = document.getElementById('visualizationContainer');
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        
        if (rect.width === 0 || rect.height === 0) {
            const fallbackWidth = Math.max(window.innerWidth, 800);
            const fallbackHeight = Math.max(window.innerHeight, 600);
            this.setCanvasDimensions(fallbackWidth, fallbackHeight);
            return;
        }
        
        this.setCanvasDimensions(rect.width, rect.height);
    }
    
    /**
     * Set canvas dimensions and update context
     */
    setCanvasDimensions(width, height) {
        if (!this.canvas) return;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Don't create 2D context here - let plugins decide what context they need
        // 2D context will be auto-created when this.ctx is accessed (lazy loading)
        // WebGL plugins can create their context in onInitialize() before accessing this.ctx
        
        // Call plugin-specific resize handler
        if (this.onResize) {
            this.onResize(width, height);
        }
    }
    
    /**
     * Update plugin state - called by MAL
     * Override this method in your plugin
     */
    update(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive || !this.isInitialized) return;
        
        this.sharedAudioData = sharedAudioData;
        
        // Call plugin-specific update
        if (this.onUpdate) {
            this.onUpdate(deltaTime, timestamp, sharedAudioData);
        }
    }
    
    /**
     * Render plugin visuals - called by MAL
     * Override this method in your plugin
     */
    render(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive || !this.isInitialized) return;
        
        const currentTime = timestamp;
        if (currentTime - this.lastFrameTime < this.frameInterval) {
            return; // Maintain target FPS
        }
        this.lastFrameTime = currentTime;
        
        // Check canvas dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            this.resize();
            if (this.canvas.width === 0 || this.canvas.height === 0) return;
        }
        
        try {
            // Clear canvas only if using 2D context and plugin wants it cleared
            // WebGL/Three.js plugins don't need this
            if (this.shouldClearCanvas() && this._ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            
            // Call plugin-specific render
            if (this.onRender) {
                this.onRender(deltaTime, timestamp, sharedAudioData);
            }
            
        } catch (error) {
            console.error(`Plugin ${this.pluginName}: Render error:`, error);
            this.handleError(error);
        }
    }
    
    /**
     * PLUGIN RENDERING API - Generic methods for composite rendering
     * Override these in your plugin to customize how the plugin is rendered
     * in recording, live display, and kaleidoscope outputs
     */
    
    /**
     * Should the plugin's canvas be cleared before rendering?
     * Override this for WebGL/Three.js plugins that handle their own clearing
     * @returns {boolean} True to clear canvas (default for 2D), false to skip (WebGL/Three.js)
     */
    shouldClearCanvas() {
        return true; // Default: clear for 2D canvas plugins
    }
    
    /**
     * Get plugin opacity for composite rendering
     * Override this to use custom opacity sources (e.g., from plugin settings)
     * @returns {number} Opacity value 0-1
     */
    getOpacity() {
        return this.opacity || 1.0;
    }
    
    /**
     * Get plugin blend mode for composite rendering
     * Override this to use custom blend modes (e.g., 'screen' for knockout backgrounds)
     * @returns {string|null} globalCompositeOperation value or null for default
     */
    getBlendMode() {
        return null; // Default: no special blend mode (source-over)
    }
    
    /**
     * Pre-render hook: Called before drawing plugin canvas to composite
     * Use this for custom context setup (transforms, filters, etc.)
     * @param {CanvasRenderingContext2D} ctx - Composite canvas context
     * @param {number} width - Target width
     * @param {number} height - Target height
     */
    beforeComposite(ctx, width, height) {
        // Override in plugin if needed
    }
    
    /**
     * Custom composite drawing: Override this to replace default drawImage
     * Use this for advanced rendering that needs more than drawImage
     * @param {CanvasRenderingContext2D} ctx - Composite canvas context
     * @param {number} width - Target width
     * @param {number} height - Target height
     * @returns {boolean} Return true if you handled drawing, false to use default drawImage
     */
    customComposite(ctx, width, height) {
        return false; // Default: use standard drawImage
    }
    
    /**
     * Post-render hook: Called after drawing plugin canvas to composite
     * Use this for cleanup or additional drawing on top of the composite
     * @param {CanvasRenderingContext2D} ctx - Composite canvas context
     */
    afterComposite(ctx) {
        // Override in plugin if needed
    }
    
    /**
     * Get complete rendering context (all properties)
     * Used by RecordManager and LiveDisplayManager for composite rendering
     * @returns {object} Object with rendering properties
     */
    getRenderingContext() {
        return {
            shouldClear: this.shouldClearCanvas(),
            opacity: this.getOpacity(),
            blendMode: this.getBlendMode()
        };
    }
    
    /**
     * Start plugin
     */
    start() {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        this.isActive = true;
        if (this.canvas) {
            this.canvas.style.display = 'block';
        }
        
        // Activate in MAL
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive(this.pluginName, true);
        }
        
        // Call plugin-specific start
        if (this.onStart) {
            this.onStart();
        }
    }
    
    /**
     * Stop plugin
     */
    stop() {
        this.isActive = false;
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
        
        // Deactivate in MAL
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive(this.pluginName, false);
        }
        
        // Call plugin-specific stop
        if (this.onStop) {
            this.onStop();
        }
    }
    
    /**
     * Toggle plugin on/off
     */
    toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    /**
     * Set plugin opacity
     */
    setOpacity(value) {
        this.opacity = Math.max(0, Math.min(1, value / 100));
        if (this.canvas) {
            this.canvas.style.opacity = this.opacity.toString();
        }
        
        // Call plugin-specific opacity handler
        if (this.onOpacityChange) {
            this.onOpacityChange(this.opacity);
        }
    }
    
    /**
     * Set plugin z-index
     */
    setZIndex(zIndex) {
        this.zIndex = zIndex;
        if (this.canvas) {
            this.canvas.style.zIndex = zIndex.toString();
        }
        
        // Update MAL priority
        if (window.masterAnimationController) {
            const system = window.masterAnimationController.systems.get(this.pluginName);
            if (system) {
                system.priority = zIndex;
                // Note: updatePriorityQueue method doesn't exist, priority is handled automatically
            }
        }
    }
    
    /**
     * Add UI control to plugin
     */
    addControl(controlId, controlConfig) {
        this.controls.set(controlId, controlConfig);
        
        // Don't immediately update UI - let registration process handle it
        // This prevents timing issues where controls are added before channel strip exists
    }
    
    /**
     * Add preset to plugin
     */
    addPreset(presetId, presetConfig) {
        // If we have saved presets from localStorage, merge saved values with hardcoded config
        if (this.savedPresetsCache && this.savedPresetsCache[presetId]) {
            const savedPreset = this.savedPresetsCache[presetId];
            
            // Merge: hardcoded config provides defaults, saved preset provides overrides
            const mergedPreset = {
                ...presetConfig, // Start with hardcoded defaults
                ...savedPreset,  // Override with saved values
                // Preserve functions from hardcoded config (can't be saved to localStorage)
                onClick: presetConfig.onClick || savedPreset.onClick,
                onChange: presetConfig.onChange || savedPreset.onChange,
                // Merge values: saved values override hardcoded defaults
                values: {
                    ...presetConfig.values,
                    ...savedPreset.values
                }
            };
            this.presets.set(presetId, mergedPreset);
        } else {
            // No saved preset, use hardcoded config
        this.presets.set(presetId, presetConfig);
        }
        
        // Don't save during initial setup - only save when presets are modified by user
        // Saving will happen when user applies a preset and modifies settings
        
        // Don't immediately update UI - let registration process handle it
        // This prevents timing issues where presets are added before channel strip exists
    }
    
    /**
     * Save all presets to localStorage
     * Called automatically after each addPreset() call
     */
    savePresetsToStorage() {
        try {
            const presetsData = {};
            this.presets.forEach((preset, presetId) => {
                presetsData[presetId] = {
                    name: preset.name,
                    values: preset.values,
                    label: preset.label,
                    onClick: null, // Don't save functions
                    onChange: null // Don't save functions
                };
            });
            
            const storageKey = `freque_plugin_${this.pluginName}_presets`;
            localStorage.setItem(storageKey, JSON.stringify(presetsData));
        } catch (error) {
            console.warn(`Plugin ${this.pluginName}: Failed to save presets to localStorage:`, error);
        }
    }
    
    /**
     * Load presets from localStorage
     * Called automatically before setupPresets() runs
     * Saved presets will be merged with hardcoded defaults when addPreset() is called
     */
    loadPresetsFromStorage() {
        if (this.presetsLoaded) return; // Only load once
        
        try {
            const storageKey = `freque_plugin_${this.pluginName}_presets`;
            const saved = localStorage.getItem(storageKey);
            
            if (saved) {
                const savedPresets = JSON.parse(saved);
                
                // Store saved presets temporarily (will be merged when addPreset() is called)
                // This allows hardcoded presets to provide defaults while saved presets override values
                this.savedPresetsCache = savedPresets;
            }
            
            this.presetsLoaded = true;
        } catch (error) {
            console.warn(`Plugin ${this.pluginName}: Failed to load presets from localStorage:`, error);
            this.presetsLoaded = true; // Mark as loaded even on error to prevent retries
        }
    }
    
    /**
     * Apply preset
     */
    applyPreset(presetId) {
        const preset = this.presets.get(presetId);
        if (!preset) return;
        
        // Apply preset values to controls
        if (preset.values) {
            Object.entries(preset.values).forEach(([controlId, value]) => {
                // First update plugin property (for internal state)
                if (this[controlId] !== undefined) {
                    this[controlId] = value;
                }
                
                // Then update UI control
                const control = this.controls.get(controlId);
                if (control && control.setValue) {
                    control.setValue(value);
                } else if (control && control.onChange) {
                    // Fallback: call onChange directly if setValue doesn't exist
                    control.onChange(value);
                }
            });
        }
        
        // Call plugin-specific preset handler
        if (this.onPresetApply) {
            this.onPresetApply(presetId, preset);
        }
    }
    
    /**
     * Save current settings as a preset
     * Useful for allowing users to save their current configuration
     */
    saveCurrentAsPreset(presetId, presetName = null) {
        if (!this.presets.has(presetId)) {
            console.warn(`Plugin ${this.pluginName}: Cannot save to non-existent preset ${presetId}`);
            return;
        }
        
        // Collect current values from all controls
        const currentValues = {};
        this.controls.forEach((control, controlId) => {
            // For buttons, prefer plugin property value (state) over button text
            // For other controls, try getValue() first, then fall back to plugin property
            if (control.type === 'button' && this[controlId] !== undefined) {
                currentValues[controlId] = this[controlId];
            } else if (control.getValue) {
                currentValues[controlId] = control.getValue();
            } else if (this[controlId] !== undefined) {
                currentValues[controlId] = this[controlId];
            }
        });
        
        // Update preset with current values
        const preset = this.presets.get(presetId);
        preset.values = currentValues;
        if (presetName) {
            preset.name = presetName;
        }
        
        // Save to localStorage
        this.savePresetsToStorage();
    }
    
    /**
     * Save current settings as a user preset
     * Prompts user for preset name and saves to userPresets array
     */
    saveCurrentAsUserPreset(presetName) {
        if (!presetName || presetName.trim() === '') {
            return;
        }
        
        // Collect current values from all controls
        const currentValues = {};
        this.controls.forEach((control, controlId) => {
            // For buttons, prefer plugin property value (state) over button text
            // For other controls, try getValue() first, then fall back to plugin property
            if (control.type === 'button' && this[controlId] !== undefined) {
                currentValues[controlId] = this[controlId];
            } else if (control.getValue) {
                currentValues[controlId] = control.getValue();
            } else if (this[controlId] !== undefined) {
                currentValues[controlId] = this[controlId];
            }
        });
        
        // Create user preset object
        const userPreset = {
            name: presetName.trim(),
            timestamp: Date.now(),
            values: currentValues
        };
        
        // Add to user presets array
        this.userPresets.push(userPreset);
        
        // Save to localStorage
        this.saveUserPresetsToStorage();
        
        // Update dropdown
        this.updateUserPresetSelector();
    }
    
    /**
     * Load a user preset by index
     */
    loadUserPreset(index) {
        if (index < 0 || index >= this.userPresets.length) {
            return;
        }
        
        const preset = this.userPresets[index];
        if (!preset || !preset.values) {
            return;
        }
        
        // Apply preset values to controls
        Object.entries(preset.values).forEach(([controlId, value]) => {
            // First update plugin property (for internal state)
            if (this[controlId] !== undefined) {
                this[controlId] = value;
            }
            
            // Then update UI control
            const control = this.controls.get(controlId);
            if (control && control.setValue) {
                control.setValue(value);
            } else if (control && control.onChange) {
                control.onChange(value);
            }
        });
        
        // Call plugin-specific preset handler
        if (this.onPresetApply) {
            this.onPresetApply(`user_${index}`, preset);
        }
    }
    
    /**
     * Export user presets to JSON file
     */
    exportUserPresets() {
        try {
            const dataStr = JSON.stringify(this.userPresets, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${this.pluginName}_presets_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`Plugin ${this.pluginName}: Failed to export user presets:`, error);
        }
    }
    
    /**
     * Import user presets from JSON file
     */
    importUserPresets(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedPresets = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedPresets)) {
                    console.error(`Plugin ${this.pluginName}: Imported file must contain an array of presets`);
                    return;
                }
                
                // Check for duplicate names
                const existingNames = new Set(this.userPresets.map(p => p.name.toLowerCase()));
                const duplicates = importedPresets.filter(p => existingNames.has(p.name.toLowerCase()));
                
                if (duplicates.length > 0) {
                    const duplicateNames = duplicates.map(p => p.name).join(', ');
                    if (!confirm(`The following preset names already exist: ${duplicateNames}\n\nWould you like to replace them?`)) {
                        return;
                    }
                    // Remove duplicates from existing presets
                    const duplicateNamesSet = new Set(duplicates.map(p => p.name.toLowerCase()));
                    this.userPresets = this.userPresets.filter(p => !duplicateNamesSet.has(p.name.toLowerCase()));
                }
                
                // Add imported presets
                importedPresets.forEach(preset => {
                    if (preset.name && preset.values) {
                        this.userPresets.push({
                            name: preset.name,
                            timestamp: preset.timestamp || Date.now(),
                            values: preset.values
                        });
                    }
                });
                
                // Save to localStorage
                this.saveUserPresetsToStorage();
                
                // Update dropdown
                this.updateUserPresetSelector();
            } catch (error) {
                console.error(`Plugin ${this.pluginName}: Failed to import user presets:`, error);
            }
        };
        reader.readAsText(file);
    }
    
    /**
     * Update user preset selector dropdown
     */
    updateUserPresetSelector() {
        const selector = document.getElementById(`${this.pluginName}PresetSelector`);
        if (!selector) return;
        
        // Clear existing options except default
        const defaultOption = selector.querySelector('option[value=""]');
        selector.innerHTML = '';
        if (defaultOption) {
            selector.appendChild(defaultOption);
        } else {
            const newDefaultOption = document.createElement('option');
            newDefaultOption.value = '';
            newDefaultOption.textContent = 'Load Preset...';
            selector.appendChild(newDefaultOption);
        }
        
        // Add user presets
        if (this.userPresets && this.userPresets.length > 0) {
            // Sort by name
            const sortedPresets = [...this.userPresets].sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
            
            sortedPresets.forEach((preset, sortedIndex) => {
                // Find original index for value
                const originalIndex = this.userPresets.findIndex(p => p === preset);
                
                const option = document.createElement('option');
                option.value = originalIndex.toString();
                option.textContent = preset.name || `Preset ${originalIndex + 1}`;
                selector.appendChild(option);
            });
        }
    }
    
    /**
     * Save user presets to localStorage
     */
    saveUserPresetsToStorage() {
        try {
            const storageKey = `freque_plugin_${this.pluginName}_userPresets`;
            localStorage.setItem(storageKey, JSON.stringify(this.userPresets));
        } catch (error) {
            console.warn(`Plugin ${this.pluginName}: Failed to save user presets to localStorage:`, error);
        }
    }
    
    /**
     * Load user presets from localStorage
     */
    loadUserPresetsFromStorage() {
        try {
            const storageKey = `freque_plugin_${this.pluginName}_userPresets`;
            const saved = localStorage.getItem(storageKey);
            
            if (saved) {
                this.userPresets = JSON.parse(saved);
            } else {
                this.userPresets = [];
            }
        } catch (error) {
            console.warn(`Plugin ${this.pluginName}: Failed to load user presets from localStorage:`, error);
            this.userPresets = [];
        }
    }
    
    /**
     * Get audio energy from shared data
     */
    getAudioEnergy() {
        if (!this.sharedAudioData || !this.sharedAudioData.frequencies) {
            return 0.5; // Default energy
        }
        
        const frequencies = this.sharedAudioData.frequencies;
        let sum = 0;
        for (let i = 0; i < frequencies.length; i++) {
            sum += frequencies[i];
        }
        
        return Math.max(0, Math.min(1, sum / frequencies.length));
    }
    
    /**
     * Get audio frequencies from shared data
     */
    getAudioFrequencies() {
        return this.sharedAudioData?.frequencies || [];
    }
    
    /**
     * Get audio waveform from shared data
     */
    getAudioWaveform() {
        return this.sharedAudioData?.waveform || [];
    }
    
    /**
     * Cleanup plugin resources
     */
    cleanup() {
        this.stop();
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Clear controls and presets
        this.controls.clear();
        this.presets.clear();
        
        // Call plugin-specific cleanup
        if (this.onCleanup) {
            this.onCleanup();
        }
    }
    
    /**
     * Handle plugin errors
     */
    handleError(error) {
        console.error(`Plugin ${this.pluginName}: Error occurred:`, error);
        
        // Call plugin-specific error handler
        if (this.onError) {
            this.onError(error);
        }
    }
    
    /**
     * Get plugin info
     */
    getInfo() {
        return {
            name: this.pluginName,
            metadata: this.metadata,
            isActive: this.isActive,
            isInitialized: this.isInitialized,
            zIndex: this.zIndex,
            opacity: this.opacity,
            controls: Array.from(this.controls.keys()),
            presets: Array.from(this.presets.keys())
        };
    }
}

// Make globally available
window.FrequePluginBase = FrequePluginBase;
