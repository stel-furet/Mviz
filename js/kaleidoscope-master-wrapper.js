/**
 * Kaleidoscope Master Animation Wrapper
 * Integrates Kaleidoscope video effects with Master Animation Controller
 * Maintains precise timing for smooth video effects and transitions
 */

class KaleidoscopeMasterWrapper {
    constructor() {
        this.isRegistered = false;
        this.isActive = false;
        this.lastUpdateTime = 0;
        
        // Kaleidoscope system reference
        this.visualizer = null;
        
        // Wrapper state
        this.masterControlled = false;
        this.legacyMode = true;
        
        // Store original methods for rollback
        this.originalStartKaleidoscopeAnimation = null;
        this.originalStopKaleidoscopeAnimation = null;
        
        // Animation state
        this.isAnimating = false;
        
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
        // Add Kaleidoscope to priority system (between Recording and Fluid)
        const KALEIDOSCOPE_PRIORITY = 2.5; // Between Recording (2) and Fluid (3)
        
        const success = window.masterAnimationController.registerSystem('kaleidoscope', {
            priority: KALEIDOSCOPE_PRIORITY,
            targetFPS: 60, // Kaleidoscope runs at 60fps for smooth effects
            isActive: false, // Start inactive, will be activated when kaleidoscope is enabled
            isPlugin: false,
            update: this.update.bind(this),
            render: this.render.bind(this),
            cleanup: this.cleanup.bind(this),
            errorHandler: this.errorHandler.bind(this)
        });
        
        if (success) {
            this.isRegistered = true;
        } else {
            console.error('Failed to register Kaleidoscope with Master Animation Controller');
        }
    }
    
    /**
     * Enable master animation control for Kaleidoscope
     */
    enableMasterControl() {
        if (this.masterControlled) return;
        
        this.masterControlled = true;
        this.legacyMode = false;
        
        // Get reference to visualizer
        this.visualizer = window.visualizer;
        
        if (!this.visualizer) {
            console.error('Kaleidoscope: Visualizer not found');
            return;
        }
        
        // Store original methods
        this.originalStartKaleidoscopeAnimation = this.visualizer.startKaleidoscopeAnimation.bind(this.visualizer);
        this.originalStopKaleidoscopeAnimation = this.visualizer.stopKaleidoscopeAnimation.bind(this.visualizer);
        
        // Override Kaleidoscope methods
        this.visualizer.startKaleidoscopeAnimation = this.masterStartKaleidoscopeAnimation.bind(this);
        this.visualizer.stopKaleidoscopeAnimation = this.masterStopKaleidoscopeAnimation.bind(this);
        
        // If kaleidoscope is currently running, stop the legacy animation and start master control
        if (this.visualizer.kaleidoscopeAnimationFrame) {
            cancelAnimationFrame(this.visualizer.kaleidoscopeAnimationFrame);
            this.visualizer.kaleidoscopeAnimationFrame = null;
            
            // Activate in master controller if kaleidoscope is enabled
            if (this.visualizer.kaleidoscopeEnabled) {
                this.isActive = true;
                this.isAnimating = true;
                if (window.masterAnimationController) {
                    window.masterAnimationController.setSystemActive('kaleidoscope', true);
                }
            }
        }
        
    }
    
    /**
     * Disable master animation control and revert to legacy mode
     */
    disableMasterControl() {
        if (!this.masterControlled) return;
        
        this.masterControlled = false;
        this.legacyMode = true;
        
        // Restore original methods
        if (this.visualizer && this.originalStartKaleidoscopeAnimation) {
            this.visualizer.startKaleidoscopeAnimation = this.originalStartKaleidoscopeAnimation;
            this.visualizer.stopKaleidoscopeAnimation = this.originalStopKaleidoscopeAnimation;
        }
        
        // Deactivate the system in master controller
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('kaleidoscope', false);
            this.isActive = false;
        }
        
        // Restart legacy animation if kaleidoscope is enabled
        if (this.visualizer && this.visualizer.kaleidoscopeEnabled && this.isAnimating) {
            this.originalStartKaleidoscopeAnimation();
        }
        
        this.isAnimating = false;
        
    }
    
    /**
     * Master-controlled version of startKaleidoscopeAnimation
     */
    masterStartKaleidoscopeAnimation() {
        if (!this.visualizer) return;
        
        // Activate the system in master controller
        this.isActive = true;
        this.isAnimating = true;
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('kaleidoscope', true);
        }
        
    }
    
    /**
     * Master-controlled version of stopKaleidoscopeAnimation
     */
    masterStopKaleidoscopeAnimation() {
        if (!this.visualizer) return;
        
        // Deactivate the system in master controller
        this.isActive = false;
        this.isAnimating = false;
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('kaleidoscope', false);
        }
        
        // Clear kaleidoscope canvases (same as original method)
        if (this.visualizer.kaleidoscopeVideoCtx) {
            this.visualizer.kaleidoscopeVideoCtx.clearRect(0, 0, 
                this.visualizer.kaleidoscopeVideoCanvas.width, 
                this.visualizer.kaleidoscopeVideoCanvas.height);
        }
        if (this.visualizer.kaleidoscopeVizCtx) {
            this.visualizer.kaleidoscopeVizCtx.clearRect(0, 0, 
                this.visualizer.kaleidoscopeVizCanvas.width, 
                this.visualizer.kaleidoscopeVizCanvas.height);
        }
        
        // Hide kaleidoscope canvases
        if (this.visualizer.kaleidoscopeVideoCanvas) {
            this.visualizer.kaleidoscopeVideoCanvas.style.display = 'none';
        }
        if (this.visualizer.kaleidoscopeVizCanvas) {
            this.visualizer.kaleidoscopeVizCanvas.style.display = 'none';
        }
        
    }
    
    /**
     * Update method called by Master Animation Controller
     */
    update(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive || !this.isAnimating || !this.visualizer) return;
        
        // Store shared audio data (PERFORMANCE OPTIMIZATION)
        this.sharedAudioData = sharedAudioData;
        
        // Check if kaleidoscope is still enabled
        if (!this.visualizer.kaleidoscopeEnabled) {
            this.masterStopKaleidoscopeAnimation();
            return;
        }
        
        this.lastUpdateTime = timestamp;
    }
    
    /**
     * Render method called by Master Animation Controller
     */
    render(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive || !this.isAnimating || !this.visualizer) return;
        
        try {
            // Execute kaleidoscope animation frame
            this.executeKaleidoscopeFrame();
            
        } catch (error) {
            console.error('Kaleidoscope render error:', error);
        }
    }
    
    /**
     * Execute kaleidoscope animation frame
     */
    executeKaleidoscopeFrame() {
        const visualizer = this.visualizer;
        
        if (!visualizer.kaleidoscopeEnabled) return;
        
        // Update beat reaction
        if (visualizer.updateKaleidoscopeBeatReaction) {
            visualizer.updateKaleidoscopeBeatReaction();
        }
        
        // Update center animation
        if (visualizer.updateKaleidoscopeCenterAnimation) {
            visualizer.updateKaleidoscopeCenterAnimation();
        }
        
        // Calculate rotation with curve (exponential easing)
        let effectiveSpeed = visualizer.kaleidoscopeSpeed || 0;
        if (effectiveSpeed > 0) {
            // Apply exponential curve for smoother acceleration
            effectiveSpeed = Math.pow(effectiveSpeed / 6, 1.5) * 6;
        }
        
        // Add beat boost if enabled
        if (visualizer.kaleidoscopeTempSpeedBoost) {
            effectiveSpeed += visualizer.kaleidoscopeTempSpeedBoost;
        }
        
        // Update base rotation (reduced from 0.01 to 0.006 for 60% speed)
        if (effectiveSpeed > 0) {
            visualizer.kaleidoscopeRotation = (visualizer.kaleidoscopeRotation || 0) + effectiveSpeed * 0.006;
        }
        
        // Update individual ring rotations
        if (visualizer.kaleidoscopeRingRotations && visualizer.kaleidoscopeRingSpeedMultiplier) {
            for (let i = 0; i < visualizer.kaleidoscopeRingRotations.length; i++) {
                const speedMultiplier = 1 + (i * visualizer.kaleidoscopeRingSpeedMultiplier);
                visualizer.kaleidoscopeRingRotations[i] += effectiveSpeed * 0.006 * speedMultiplier;
            }
        }
        
        // Apply kaleidoscope effect
        if (visualizer.applyKaleidoscopeEffect) {
            visualizer.applyKaleidoscopeEffect();
        }
    }
    
    /**
     * Cleanup method called by Master Animation Controller
     */
    cleanup() {
        this.disableMasterControl();
        
    }
    
    /**
     * Error handler for Master Animation Controller
     */
    errorHandler(error) {
        console.error('Kaleidoscope wrapper error:', error);
        
        // On error, try to revert to legacy mode
        if (this.masterControlled) {
            this.disableMasterControl();
        }
    }
    
    /**
     * Check if Kaleidoscope is currently under master control
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
            isAnimating: this.isAnimating,
            masterControlled: this.masterControlled,
            legacyMode: this.legacyMode,
            kaleidoscopeEnabled: this.visualizer ? this.visualizer.kaleidoscopeEnabled : false,
            kaleidoscopeSpeed: this.visualizer ? this.visualizer.kaleidoscopeSpeed : 0
        };
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize kaleidoscope wrapper
    window.kaleidoscopeMasterWrapper = new KaleidoscopeMasterWrapper();
    
    // Add to global test interface
    if (window.testMasterAnimation) {
        window.testMasterAnimation.kaleidoscope = {
            enableMaster: () => window.kaleidoscopeMasterWrapper.enableMasterControl(),
            disableMaster: () => window.kaleidoscopeMasterWrapper.disableMasterControl(),
            getStatus: () => window.kaleidoscopeMasterWrapper.getStatus(),
            isMasterControlled: () => window.kaleidoscopeMasterWrapper.isMasterControlled()
        };
    }
    
});
