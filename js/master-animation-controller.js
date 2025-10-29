/**
 * Master Animation Controller
 * Consolidates all requestAnimationFrame loops into a single coordinated system
 * Plugin-ready architecture with priority-based execution
 */


class MasterAnimationController {
    constructor() {
        // Core state
        this.systems = new Map();
        this.priorityQueue = [];
        this.isRunning = false;
        this.frameCount = 0;
        this.lastTimestamp = 0;
        this.animationFrameId = null;
        
        // Performance tracking (minimal overhead)
        this.frameTime = 0;
        this.lastFrameTime = 0;
        
        // MAL is always active - no feature flags needed
        
        // System priorities (1 = highest, 7 = lowest)
        this.PRIORITIES = {
            AUDIOMOTION: 1,
            RECORDING: 2,
            FLUID: 3,
            NEBULA: 4,
            WEBGL: 5,
            BLOBS: 6,
            AI: 7
        };
        
        // Bind methods
        this.animate = this.animate.bind(this);
        
        // Initialize
        this.init();
    }
    
    init() {
        // Make globally available
        window.masterAnimationController = this;
        
        // Auto-start MAL (always active)
        this.start();
    }
    
    /**
     * Register a system with the master animation loop
     * Plugin-ready interface for third-party developers
     */
    registerSystem(name, config) {
        if (!name || !config) {
            console.error('MasterAnimationController: Invalid system registration', { name, config });
            return false;
        }
        
        // Validate required config
        const requiredFields = ['update', 'priority'];
        for (const field of requiredFields) {
            if (!config[field]) {
                console.error(`MasterAnimationController: Missing required field '${field}' for system '${name}'`);
                return false;
            }
        }
        
        // Create system entry
        const systemEntry = {
            name: name,
            priority: config.priority || 5,
            targetFPS: config.targetFPS || 60,
            lastUpdateTime: 0,
            frameInterval: 1000 / (config.targetFPS || 60),
            isActive: config.isActive !== false, // Default to active
            isPlugin: config.isPlugin || false,
            
            // Required callbacks
            update: config.update,
            render: config.render || null,
            cleanup: config.cleanup || null,
            errorHandler: config.errorHandler || this.defaultErrorHandler.bind(this),
            
            // Performance tracking
            frameCount: 0,
            totalTime: 0,
            avgFrameTime: 0,
            lastError: null,
            errorCount: 0
        };
        
        // Register system
        this.systems.set(name, systemEntry);
        
        // Rebuild priority queue
        this.rebuildPriorityQueue();
        
        
        return true;
    }
    
    /**
     * Unregister a system from the master animation loop
     */
    unregisterSystem(name) {
        const system = this.systems.get(name);
        if (!system) {
            console.warn(`MasterAnimationController: System '${name}' not found for unregistration`);
            return false;
        }
        
        // Call cleanup if available
        if (system.cleanup) {
            try {
                system.cleanup();
            } catch (error) {
                console.error(`MasterAnimationController: Error during cleanup for system '${name}'`, error);
            }
        }
        
        // Remove from systems
        this.systems.delete(name);
        
        // Rebuild priority queue
        this.rebuildPriorityQueue();
        
        
        return true;
    }
    
    /**
     * Rebuild priority queue based on current systems
     */
    rebuildPriorityQueue() {
        this.priorityQueue = Array.from(this.systems.values())
            .filter(system => system.isActive)
            .sort((a, b) => a.priority - b.priority);
    }
    
    /**
     * Start the master animation loop
     */
    start() {
        if (this.isRunning) {
            return; // Already running
        }
        
        this.isRunning = true;
        this.frameCount = 0;
        this.lastTimestamp = performance.now();
        
        // Start the animation loop
        this.animationFrameId = requestAnimationFrame(this.animate);
    }
    
    /**
     * Stop the master animation loop
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
    }
    
    /**
     * Master animation loop
     * Executes all registered systems in priority order
     */
    animate(timestamp) {
        if (!this.isRunning) {
            return;
        }
        
        // Calculate frame timing
        const deltaTime = timestamp - this.lastTimestamp;
        this.frameTime = deltaTime;
        this.lastTimestamp = timestamp;
        this.frameCount++;
        
        // Generate shared audio data once per frame (PERFORMANCE OPTIMIZATION)
        const sharedAudioData = this.generateSharedAudioData();
        
        // Execute systems in priority order
        for (const system of this.priorityQueue) {
            if (!system.isActive) {
                continue;
            }
            
            // Remove frame rate throttling - let systems run at native 60fps (PERFORMANCE FIX)
            // const timeSinceLastUpdate = timestamp - system.lastUpdateTime;
            // if (timeSinceLastUpdate < system.frameInterval) {
            //     continue;
            // }
            
            // Update system
            try {
                const systemStartTime = performance.now();
                
                // Debug logging removed for performance
                
                // Call system update with shared audio data
                system.update(deltaTime, timestamp, sharedAudioData);
                
                // Call system render if available
                if (system.render) {
                    system.render(deltaTime, timestamp, sharedAudioData);
                }
                
                // Update system performance tracking
                const systemEndTime = performance.now();
                const systemFrameTime = systemEndTime - systemStartTime;
                
                system.lastUpdateTime = timestamp;
                system.frameCount++;
                system.totalTime += systemFrameTime;
                system.avgFrameTime = system.totalTime / system.frameCount;
                
            } catch (error) {
                // Continue + log error handling strategy
                system.errorCount++;
                system.lastError = error;
                
                if (this.config.debugMode) {
                    console.error(`MasterAnimationController: Error in system '${system.name}'`, error);
                }
                
                // Call system error handler
                try {
                    system.errorHandler(error);
                } catch (handlerError) {
                    console.error(`MasterAnimationController: Error in error handler for system '${system.name}'`, handlerError);
                }
            }
        }
        
        // Continue animation loop
        this.animationFrameId = requestAnimationFrame(this.animate);
    }
    
    
    /**
     * Generate shared audio data once per frame (PERFORMANCE OPTIMIZATION)
     * Eliminates duplicate audio processing across 6+ systems
     */
    generateSharedAudioData() {
        // Get audio data from the main spectrum analyzer
        const spectrumAnalyzer = window.visualizer?.audioMotion;
        
        if (!spectrumAnalyzer || !spectrumAnalyzer.analyser || !spectrumAnalyzer.dataArray) {
            // Return empty audio data if no analyzer available
            return {
                energy: 0,
                bass: 0,
                mid: 0,
                treble: 0,
                peak: 0,
                rms: 0,
                zcr: 0,
                centroid: 0,
                rolloff: 0,
                flux: 0,
                rawData: null,
                dataArray: null,
                analyser: null
            };
        }
        
        // Generate audio features once using the main analyzer
        return spectrumAnalyzer.generateBasicAudioFeatures();
    }
    
    /**
     * Default error handler for systems
     */
    defaultErrorHandler(error) {
        // Continue + log strategy - do nothing, just log
        console.error('MasterAnimationController: System error (continuing)', error);
    }
    
    
    /**
     * Get system status
     */
    getSystemStatus(name) {
        const system = this.systems.get(name);
        if (!system) {
            return null;
        }
        
        return {
            name: system.name,
            priority: system.priority,
            targetFPS: system.targetFPS,
            isActive: system.isActive,
            isPlugin: system.isPlugin,
            frameCount: system.frameCount,
            avgFrameTime: system.avgFrameTime,
            errorCount: system.errorCount,
            lastError: system.lastError
        };
    }
    
    /**
     * Get overall performance stats
     */
    getPerformanceStats() {
        return {
            isRunning: this.isRunning,
            frameCount: this.frameCount,
            frameTime: this.frameTime,
            systemCount: this.systems.size,
            activeSystemCount: this.priorityQueue.length,
            config: { ...this.config }
        };
    }
    
    /**
     * Get all registered systems
     */
    getRegisteredSystems() {
        return Array.from(this.systems.keys());
    }
    
    /**
     * Activate/deactivate a system
     */
    setSystemActive(name, active) {
        const system = this.systems.get(name);
        if (!system) {
            console.warn(`MasterAnimationController: System '${name}' not found`);
            return false;
        }
        
        system.isActive = active;
        this.rebuildPriorityQueue();
        
        
        return true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MasterAnimationController;
}
