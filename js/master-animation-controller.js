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
        
        // Feature flags
        this.config = {
            useMasterLoop: false,        // Start disabled, enable when ready
            fallbackToLegacy: true,      // Keep legacy systems running initially
            debugMode: false             // Minimal overhead design
        };
        
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
        if (this.config.debugMode) {
            console.log('🎬 MasterAnimationController initialized');
        }
        
        // Make globally available
        window.masterAnimationController = this;
        
        // Add console commands for easy testing
        window.masterAnimation = {
            enable: () => this.enable(),
            disable: () => this.disable(),
            debug: () => {
                const stats = this.getPerformanceStats();
                console.log('🎬 Master Animation Controller Stats:', stats);
                this.setDebugMode(!stats.config.debugMode);
                console.log('🎬 Debug mode toggled to:', !stats.config.debugMode);
            },
            stats: () => this.getPerformanceStats(),
            systems: () => this.getRegisteredSystems(),
            status: () => ({
                isRunning: this.isRunning,
                systemCount: this.systems.size,
                activeSystemCount: this.priorityQueue.length,
                config: { ...this.config }
            })
        };
        
        console.log('🎬 Master Animation Controller initialized. Use window.masterAnimation.* for console commands');
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
        
        if (this.config.debugMode) {
            console.log(`🎬 System registered: ${name} (Priority: ${systemEntry.priority}, FPS: ${systemEntry.targetFPS})`);
        }
        
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
        
        if (this.config.debugMode) {
            console.log(`🎬 System unregistered: ${name}`);
        }
        
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
            console.warn('MasterAnimationController: Already running');
            return;
        }
        
        if (!this.config.useMasterLoop) {
            if (this.config.debugMode) {
                console.log('🎬 MasterAnimationController: Disabled by config, not starting');
            }
            return;
        }
        
        this.isRunning = true;
        this.frameCount = 0;
        this.lastTimestamp = performance.now();
        
        if (this.config.debugMode) {
            console.log('🎬 MasterAnimationController: Starting master loop');
        }
        
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
        
        if (this.config.debugMode) {
            console.log('🎬 MasterAnimationController: Stopped master loop');
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
        
        // Execute systems in priority order
        for (const system of this.priorityQueue) {
            if (!system.isActive) {
                if (this.frameCount % 60 === 0) { // Log every 60 frames (1 second at 60fps)
                    console.log(`🎬 System '${system.name}' is inactive, skipping`);
                }
                continue;
            }
            
            // Check if system should update based on target FPS
            const timeSinceLastUpdate = timestamp - system.lastUpdateTime;
            if (timeSinceLastUpdate < system.frameInterval) {
                continue;
            }
            
            // Update system
            try {
                const systemStartTime = performance.now();
                
                // Debug logging removed for performance
                
                // Call system update
                system.update(deltaTime, timestamp);
                
                // Call system render if available
                if (system.render) {
                    system.render(deltaTime, timestamp);
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
     * Default error handler for systems
     */
    defaultErrorHandler(error) {
        // Continue + log strategy - do nothing, just log
        console.error('MasterAnimationController: System error (continuing)', error);
    }
    
    /**
     * Enable master animation loop
     */
    enable() {
        
        this.config.useMasterLoop = true;
        this.config.fallbackToLegacy = false;
        
        console.log('🎬 ========================================');
        console.log('🎬 MASTER ANIMATION CONTROLLER ENABLED');
        console.log('🎬 Consolidating 16+ RAF loops into 1');
        console.log('🎬 ========================================');
        
        // Enable AudioMotion master control if available
        console.log('🎬 AudioMotion wrapper check:', {
            wrapperExists: !!window.audioMotionMasterWrapper,
            hasEnableMethod: !!(window.audioMotionMasterWrapper?.enableMasterControl)
        });
        
        if (window.audioMotionMasterWrapper) {
            console.log('🎬 Calling AudioMotion enableMasterControl...');
            window.audioMotionMasterWrapper.enableMasterControl();
            console.log('🎬 ✅ AudioMotion migrated to master loop');
            console.log('🎬 CRITICAL DEBUG - AudioMotion wrapper state:', {
                wrapperExists: !!window.audioMotionMasterWrapper,
                hasEnableMethod: !!(window.audioMotionMasterWrapper?.enableMasterControl),
                audioMotionExists: !!(window.visualizer?.officialAudioMotion),
                audioMotionIsOn: window.visualizer?.officialAudioMotion?.isOn
            });
        } else {
            console.log('🎬 ❌ AudioMotion wrapper not found');
        }
        
        // Enable Recording System master control if available
        if (window.recordingMasterWrapper) {
            window.recordingMasterWrapper.enableMasterControl();
            console.log('🎬 ✅ Recording System migrated to master loop');
        }
        
        // Enable Kaleidoscope master control if available
        if (window.kaleidoscopeMasterWrapper) {
            window.kaleidoscopeMasterWrapper.enableMasterControl();
            console.log('🎬 ✅ Kaleidoscope migrated to master loop');
        }
        
        // Enable SpectrumAnalyzer master control if available
        if (window.spectrumAnalyzerMasterWrapper) {
            window.spectrumAnalyzerMasterWrapper.enableMasterControl();
            console.log('🎬 ✅ SpectrumAnalyzer migrated to master loop');
        }
        
        // Enable Blobs master control if available
        if (window.blobsMasterWrapper) {
            window.blobsMasterWrapper.enableMasterControl();
            console.log('🎬 ✅ Blobs migrated to master loop');
        }
        
        this.start();
        
        console.log('🎬 ========================================');
        console.log('🎬 MASTER LOOP ACTIVE - Single RAF running');
        console.log('🎬 Legacy systems disabled');
        console.log('🎬 ========================================');
    }
    
    /**
     * Disable master animation loop (rollback to legacy)
     */
    disable() {
        this.stop();
        
        console.log('🎬 ========================================');
        console.log('🎬 MASTER ANIMATION CONTROLLER DISABLED');
        console.log('🎬 Rolling back to legacy RAF loops');
        console.log('🎬 ========================================');
        
        // Disable AudioMotion master control if available
        if (window.audioMotionMasterWrapper) {
            window.audioMotionMasterWrapper.disableMasterControl();
            console.log('🎬 ✅ AudioMotion reverted to legacy loop');
        }
        
        // Disable Recording System master control if available
        if (window.recordingMasterWrapper) {
            window.recordingMasterWrapper.disableMasterControl();
            console.log('🎬 ✅ Recording System reverted to legacy loop');
        }
        
        // Disable Kaleidoscope master control if available
        if (window.kaleidoscopeMasterWrapper) {
            window.kaleidoscopeMasterWrapper.disableMasterControl();
            console.log('🎬 ✅ Kaleidoscope reverted to legacy loop');
        }
        
        // Disable SpectrumAnalyzer master control if available
        if (window.spectrumAnalyzerMasterWrapper) {
            window.spectrumAnalyzerMasterWrapper.disableMasterControl();
            console.log('🎬 ✅ SpectrumAnalyzer reverted to legacy loop');
        }
        
        // Disable Blobs master control if available
        if (window.blobsMasterWrapper) {
            window.blobsMasterWrapper.disableMasterControl();
            console.log('🎬 ✅ Blobs reverted to legacy loop');
        }
        
        this.config.useMasterLoop = false;
        this.config.fallbackToLegacy = true;
        
        console.log('🎬 ========================================');
        console.log('🎬 LEGACY SYSTEMS RESTORED');
        console.log('🎬 Multiple RAF loops active again');
        console.log('🎬 ========================================');
    }
    
    /**
     * Toggle debug mode
     */
    setDebugMode(enabled) {
        this.config.debugMode = enabled;
        console.log(`🎬 MasterAnimationController: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
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
        
        if (this.config.debugMode) {
            console.log(`🎬 System '${name}' ${active ? 'activated' : 'deactivated'}`);
        }
        
        return true;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MasterAnimationController;
}
