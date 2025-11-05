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
        this.ctx = null;
        this.canvasId = `${pluginName}-plugin-canvas`;
        this.zIndex = 11; // Will be auto-assigned by plugin manager
        
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
        this.ctx = this.canvas.getContext('2d');
        
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
        if (!this.isActive || !this.isInitialized || !this.ctx) return;
        
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
            // Clear canvas (only if plugin wants it cleared - WebGL/Three.js plugins don't need this)
            if (this.shouldClearCanvas() && this.ctx) {
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
        this.presets.set(presetId, presetConfig);
        
        // Don't immediately update UI - let registration process handle it
        // This prevents timing issues where presets are added before channel strip exists
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
                const control = this.controls.get(controlId);
                if (control && control.setValue) {
                    control.setValue(value);
                }
            });
        }
        
        // Call plugin-specific preset handler
        if (this.onPresetApply) {
            this.onPresetApply(presetId, preset);
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
