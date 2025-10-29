/**
 * AudioMotion Master Animation Wrapper
 * Integrates AudioMotion with Master Animation Controller while preserving its internal timing
 */

class AudioMotionMasterWrapper {
    constructor(audioMotionInstance) {
        this.audioMotion = audioMotionInstance;
        this.isRegistered = false;
        this.isActive = false;
        this.lastUpdateTime = 0;
        
        // Store original methods for rollback (with null checks)
        this.originalToggleAnalyzer = null;
        this.originalDraw = null;
        
        if (this.audioMotion) {
            if (this.audioMotion.toggleAnalyzer) {
                this.originalToggleAnalyzer = this.audioMotion.toggleAnalyzer.bind(this.audioMotion);
            }
            if (this.audioMotion._draw) {
                this.originalDraw = this.audioMotion._draw.bind(this.audioMotion);
            }
        }
        
        // Wrapper state
        this.masterControlled = false;
        this.legacyMode = true;
        this.lastError = null;
        
        // Auto-register when Master Animation Controller is available
        this.checkAndRegister();
    }
    
    checkAndRegister() {
        if (window.masterAnimationController && !this.isRegistered) {
            this.register();
        } else {
            // Try again in 100ms
            setTimeout(() => this.checkAndRegister(), 100);
        }
    }
    
    register() {
        const success = window.masterAnimationController.registerSystem('audiomotion', {
            priority: window.masterAnimationController.PRIORITIES.AUDIOMOTION, // Priority 1
            targetFPS: 60, // AudioMotion runs at 60fps
            isActive: false, // Start inactive, will be activated when master loop is enabled
            isPlugin: false,
            update: this.update.bind(this),
            render: this.render.bind(this),
            cleanup: this.cleanup.bind(this),
            errorHandler: this.errorHandler.bind(this)
        });
        
        if (success) {
            this.isRegistered = true;
            if (window.masterAnimationController.config.debugMode) {
                console.log('🎬 AudioMotion registered with Master Animation Controller');
            }
        } else {
            console.error('🎬 Failed to register AudioMotion with Master Animation Controller');
        }
    }
    
    /**
     * Enable master animation control for AudioMotion
     */
    enableMasterControl() {
        if (this.masterControlled || !this.audioMotion) return;
        
        // Ensure we have the original methods before proceeding
        if (!this.originalToggleAnalyzer && this.audioMotion.toggleAnalyzer) {
            this.originalToggleAnalyzer = this.audioMotion.toggleAnalyzer.bind(this.audioMotion);
        }
        if (!this.originalDraw && this.audioMotion._draw) {
            this.originalDraw = this.audioMotion._draw.bind(this.audioMotion);
        }
        
        if (!this.originalToggleAnalyzer) {
            console.error('🎬 AudioMotion: Cannot enable master control - toggleAnalyzer method not found');
            return;
        }
        
        this.masterControlled = true;
        this.legacyMode = false;
        
        // Override AudioMotion's toggleAnalyzer to work with master controller
        this.audioMotion.toggleAnalyzer = this.masterToggleAnalyzer.bind(this);
        
        // Stop AudioMotion's internal animation loop if running
        if (this.audioMotion._runId) {
            cancelAnimationFrame(this.audioMotion._runId);
            this.audioMotion._runId = 0;
        }
        
        // Check if AudioMotion is actually running and set active state accordingly
        const shouldBeActive = this.audioMotion.isOn;
        console.log('🎬 AudioMotion enableMasterControl:', {
            audioMotionIsOn: this.audioMotion.isOn,
            audioMotionRunId: this.audioMotion._runId,
            audioMotionDestroyed: this.audioMotion._destroyed,
            settingActiveState: shouldBeActive
        });
        
        // Activate the system in master controller only if AudioMotion is actually running
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('audiomotion', shouldBeActive);
            this.isActive = shouldBeActive;
        }
        
        console.log('🎬 AudioMotion: Master control enabled, active:', this.isActive);
    }
    
    /**
     * Disable master animation control and revert to legacy mode
     */
    disableMasterControl() {
        if (!this.masterControlled || !this.audioMotion) return;
        
        this.masterControlled = false;
        this.legacyMode = true;
        
        // Restore original AudioMotion methods
        if (this.originalToggleAnalyzer) {
            this.audioMotion.toggleAnalyzer = this.originalToggleAnalyzer;
        }
        
        // Deactivate the system in master controller
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('audiomotion', false);
            this.isActive = false;
        }
        
        // Restart AudioMotion's internal animation loop if it should be running
        if (this.audioMotion.isOn && !this.audioMotion._runId) {
            this.audioMotion._frames = 0;
            this.audioMotion._time = performance.now();
            this.audioMotion._runId = requestAnimationFrame(timestamp => this.audioMotion._draw(timestamp));
        }
        
        if (window.masterAnimationController && window.masterAnimationController.config.debugMode) {
            console.log('🎬 AudioMotion: Master control disabled, reverted to legacy mode');
        }
    }
    
    /**
     * Master-controlled version of toggleAnalyzer
     */
    masterToggleAnalyzer(force) {
        if (!this.audioMotion || !this.originalToggleAnalyzer) return false;
        
        const hasStarted = this.audioMotion.isOn;
        if (force === undefined) force = !hasStarted;
        
        // Call the original toggleAnalyzer to actually start/stop AudioMotion
        const result = this.originalToggleAnalyzer(force);
        
        // Update Master Animation Controller state based on the result
        const isNowRunning = this.audioMotion.isOn;
        
        if (isNowRunning && !this.isActive) {
            // AudioMotion started: activate in master controller
            this.isActive = true;
            if (window.masterAnimationController) {
                window.masterAnimationController.setSystemActive('audiomotion', true);
            }
            console.log('🎬 AudioMotion started via masterToggleAnalyzer - activated in master controller');
        } else if (!isNowRunning && this.isActive) {
            // AudioMotion stopped: deactivate in master controller
            this.isActive = false;
            if (window.masterAnimationController) {
                window.masterAnimationController.setSystemActive('audiomotion', false);
            }
            console.log('🎬 AudioMotion stopped via masterToggleAnalyzer - deactivated in master controller');
        }
        
        return result;
    }
    
    /**
     * Update method called by Master Animation Controller
     */
    update(deltaTime, timestamp) {
        if (!this.isActive || !this.audioMotion.isOn) return;
        
        // AudioMotion handles its own frame rate limiting
        // We just need to call its internal draw method
        this.lastUpdateTime = timestamp;
    }
    
    /**
     * Render method called by Master Animation Controller
     */
    render(deltaTime, timestamp) {
        if (!this.isActive || !this.audioMotion.isOn) {
            return;
        }
        
        try {
            // Call AudioMotion's internal draw method directly
            // We bypass the requestAnimationFrame call and frame rate limiting
            // since the master controller handles timing
            this.renderAudioMotionFrame(timestamp);
        } catch (error) {
            console.error('🎬 AudioMotion render error:', error);
        }
    }
    
    /**
     * Render AudioMotion frame without requestAnimationFrame
     */
    renderAudioMotionFrame(timestamp) {
        // Replicate AudioMotion's _draw method logic without the RAF call
        const elapsed = timestamp - this.audioMotion._time;
        const frameTime = timestamp - this.audioMotion._last;
        const targetInterval = this.audioMotion._maxFPS ? 975 / this.audioMotion._maxFPS : 0;
        
        // Apply AudioMotion's frame rate limiting
        if (frameTime < targetInterval) return;
        
        this.audioMotion._last = timestamp - (targetInterval ? frameTime % targetInterval : 0);
        
        // Update FPS calculation
        this.audioMotion._frames++;
        if (elapsed >= 1000) {
            this.audioMotion._fps = this.audioMotion._frames / (elapsed / 1000);
            this.audioMotion._frames = 0;
            this.audioMotion._time = timestamp;
        }
        
        // Call AudioMotion's actual drawing logic
        this.executeAudioMotionDrawing();
    }
    
    /**
     * Execute AudioMotion's core drawing logic
     */
    executeAudioMotionDrawing() {
        // Call AudioMotion's original _draw method but intercept the requestAnimationFrame call
        const audioMotion = this.audioMotion;
        
        if (!this.originalDraw) {
            console.error('🎬 AudioMotion: No originalDraw method available!');
            return;
        }
        
        // Check if AudioMotion is in a valid state
        if (!audioMotion.isOn || audioMotion._destroyed) {
            return;
        }
        
        // Validate minDecibels/maxDecibels configuration before drawing
        if (audioMotion.minDecibels >= audioMotion.maxDecibels) {
            console.warn('🎬 AudioMotion: Invalid decibel range, skipping frame', {
                minDecibels: audioMotion.minDecibels,
                maxDecibels: audioMotion.maxDecibels
            });
            return;
        }
        
        // Temporarily override requestAnimationFrame to prevent recursive calls
        const originalRAF = window.requestAnimationFrame;
        
        window.requestAnimationFrame = (callback) => {
            // Don't actually schedule the frame - we're handling timing
            return 0;
        };
        
        try {
            // Call the original _draw method with current timestamp
            // This will execute all the AudioMotion drawing logic
            const currentTime = performance.now();
            
            // Temporarily set _runId to prevent the method from scheduling another frame
            const originalRunId = audioMotion._runId;
            audioMotion._runId = 1; // Non-zero to indicate it's "running"
            
            // Call the original draw method
            this.originalDraw(currentTime);
            
            // Restore _runId
            audioMotion._runId = originalRunId;
            
        } catch (error) {
            // Only log unique errors to avoid spam
            const errorKey = error.message + error.stack?.split('\n')[0];
            if (!this.lastError || this.lastError !== errorKey) {
                console.error('🎬 AudioMotion drawing error:', error.message);
                this.lastError = errorKey;
            }
            
            // If we get configuration errors, try to reset to safe defaults
            if (error.message.includes('minDecibels') || error.message.includes('color')) {
                this.resetToSafeDefaults();
            }
        } finally {
            // Restore original requestAnimationFrame
            window.requestAnimationFrame = originalRAF;
        }
    }
    
    /**
     * Reset AudioMotion to safe default configuration
     */
    resetToSafeDefaults() {
        if (!this.audioMotion) return;
        
        try {
            // Reset to safe decibel range
            this.audioMotion.maxDecibels = -25;
            this.audioMotion.minDecibels = -85;
            
            // Reset to safe gradient
            this.audioMotion.gradient = 'classic';
            
            console.log('🎬 AudioMotion: Reset to safe defaults');
        } catch (error) {
            console.error('🎬 AudioMotion: Failed to reset to safe defaults:', error);
        }
    }
    
    /**
     * Cleanup method called by Master Animation Controller
     */
    cleanup() {
        this.disableMasterControl();
        
        if (window.masterAnimationController && window.masterAnimationController.config.debugMode) {
            console.log('🎬 AudioMotion wrapper cleanup completed');
        }
    }
    
    /**
     * Error handler for Master Animation Controller
     */
    errorHandler(error) {
        console.error('🎬 AudioMotion wrapper error:', error);
        
        // On error, try to revert to legacy mode
        if (this.masterControlled) {
            console.log('🎬 AudioMotion: Error detected, reverting to legacy mode');
            this.disableMasterControl();
        }
    }
    
    /**
     * Check if AudioMotion is currently under master control
     */
    isMasterControlled() {
        return this.masterControlled;
    }
    
    /**
     * Get current status for debugging
     */
    getStatus() {
        return {
            isRegistered: this.isRegistered,
            isActive: this.isActive,
            masterControlled: this.masterControlled,
            legacyMode: this.legacyMode,
            audioMotionIsOn: this.audioMotion ? this.audioMotion.isOn : false,
            audioMotionRunId: this.audioMotion ? this.audioMotion._runId : null
        };
    }
}

// Auto-initialize when AudioMotion is available
document.addEventListener('DOMContentLoaded', () => {
    // Initialize wrapper immediately, even if AudioMotion isn't ready yet
    try {
        const audioMotionInstance = window.visualizer && window.visualizer.officialAudioMotion ? window.visualizer.officialAudioMotion : null;
        window.audioMotionMasterWrapper = new AudioMotionMasterWrapper(audioMotionInstance);
        
        // Add to global test interface
        if (window.testMasterAnimation) {
            window.testMasterAnimation.audioMotion = {
                enableMaster: () => window.audioMotionMasterWrapper.enableMasterControl(),
                disableMaster: () => window.audioMotionMasterWrapper.disableMasterControl(),
                getStatus: () => window.audioMotionMasterWrapper.getStatus(),
                isMasterControlled: () => window.audioMotionMasterWrapper.isMasterControlled()
            };
        }
        
        console.log('🎬 AudioMotion Master Wrapper initialized');
        
        // If AudioMotion isn't ready yet, wait for it
                if (!audioMotionInstance) {
                    const waitForAudioMotion = () => {
                        if (window.visualizer && window.visualizer.officialAudioMotion) {
                            window.audioMotionMasterWrapper.audioMotion = window.visualizer.officialAudioMotion;
                            console.log('🎬 AudioMotion Master Wrapper: AudioMotion instance connected');
                        } else {
                            setTimeout(waitForAudioMotion, 100);
                        }
                    };
                    waitForAudioMotion();
                }
        
    } catch (error) {
        console.error('🎬 AudioMotion Master Wrapper initialization failed:', error);
    }
});
