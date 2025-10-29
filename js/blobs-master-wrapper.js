/**
 * Blobs Master Wrapper
 * Integrates the BlobsVisualization (liquid-fire.js) animation loop with the Master Animation Controller
 * Disables the legacy requestAnimationFrame loop when master control is enabled
 */

class BlobsMasterWrapper {
    constructor(blobsVisualization) {
        this.blobsVisualization = blobsVisualization;
        this.isRegistered = false;
        this.isActive = false;
        this.lastUpdateTime = 0;
        
        // Store original methods for rollback
        this.originalAnimate = null;
        
        // Master control state
        this.masterControlled = false;
        this.legacyMode = true;
        
        // Initialize if blobs visualization is available
        if (this.blobsVisualization) {
            this.init();
        }
        
        console.log('🎬 Blobs Master Wrapper initialized');
    }
    
    init() {
        if (!this.blobsVisualization) return;
        
        // Store original animate method
        if (this.blobsVisualization.animate) {
            this.originalAnimate = this.blobsVisualization.animate.bind(this.blobsVisualization);
        }
        
        // Register with Master Animation Controller
        this.registerWithMasterController();
    }
    
    registerWithMasterController() {
        if (window.masterAnimationController && !this.isRegistered) {
            window.masterAnimationController.registerSystem('blobs', {
                priority: window.masterAnimationController.PRIORITIES.BLOBS, // Priority 6
                targetFPS: 60,
                update: (timestamp, deltaTime) => this.update(timestamp, deltaTime),
                render: (timestamp, deltaTime) => this.render(timestamp, deltaTime),
                cleanup: () => this.cleanup(),
                errorHandler: (error) => this.defaultErrorHandler(error)
            });
            
            this.isRegistered = true;
            console.log('🎬 Blobs: Registered with Master Animation Controller');
        }
    }
    
    /**
     * Enable master animation control and disable legacy RAF loop
     */
    enableMasterControl() {
        if (this.masterControlled || !this.blobsVisualization) return;
        
        this.masterControlled = true;
        this.legacyMode = false;
        
        // Override the animate method to prevent RAF scheduling
        if (this.blobsVisualization.animate) {
            this.blobsVisualization.animate = this.masterAnimate.bind(this);
        }
        
        // Cancel any existing animation frame
        if (this.blobsVisualization.animationFrameId) {
            cancelAnimationFrame(this.blobsVisualization.animationFrameId);
            this.blobsVisualization.animationFrameId = null;
        }
        
        // Always register with master controller, but only activate if blobs are active
        if (window.masterAnimationController) {
            const shouldBeActive = this.blobsVisualization.isActive;
            window.masterAnimationController.setSystemActive('blobs', shouldBeActive);
            this.isActive = shouldBeActive;
        }
        
        console.log('🎬 Blobs: Master control enabled');
    }
    
    /**
     * Disable master animation control and revert to legacy mode
     */
    disableMasterControl() {
        if (!this.masterControlled || !this.blobsVisualization) return;
        
        this.masterControlled = false;
        this.legacyMode = true;
        
        // Restore original animate method
        if (this.originalAnimate) {
            this.blobsVisualization.animate = this.originalAnimate;
        }
        
        // Deactivate the system in master controller
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('blobs', false);
            this.isActive = false;
        }
        
        // Restart legacy animation loop
        if (this.blobsVisualization && !this.blobsVisualization.animationFrameId) {
            this.blobsVisualization.animationFrameId = requestAnimationFrame(() => this.originalAnimate());
        }
        
        console.log('🎬 Blobs: Master control disabled, reverted to legacy mode');
    }
    
    /**
     * Master-controlled version of animate (prevents RAF scheduling)
     */
    masterAnimate() {
        // Do nothing - the Master Animation Controller will call our update/render methods
        // This prevents the legacy RAF loop from starting
        return;
    }
    
    /**
     * Update method called by Master Animation Controller
     */
    update(timestamp, deltaTime) {
        if (!this.blobsVisualization || !this.isActive) return;
        
        this.lastUpdateTime = timestamp;
        
        // Update blobs state (particle management, physics, etc.)
        // This is non-rendering logic that was in the original animate loop
        if (this.blobsVisualization.isActive) {
            // Update particle lifecycle
            if (this.blobsVisualization.updateParticles) {
                this.blobsVisualization.updateParticles();
            }
            
            // Update physics
            if (this.blobsVisualization.updatePhysics) {
                this.blobsVisualization.updatePhysics();
            }
        }
    }
    
    /**
     * Render method called by Master Animation Controller
     */
    render(timestamp, deltaTime) {
        if (!this.blobsVisualization || !this.isActive) return;
        
        try {
            // Only render if blobs are active
            if (this.blobsVisualization.isActive) {
                // Get audio data from visualizer
                let audioData = this.getAudioData();
                
                // Call the main render method
                if (this.blobsVisualization.render) {
                    this.blobsVisualization.render(audioData);
                }
            }
            
        } catch (error) {
            console.error('🎬 Blobs render error:', error);
        }
    }
    
    /**
     * Get audio data for blobs rendering (from original animate method)
     */
    getAudioData() {
        let audioData = null;
        
        if (this.blobsVisualization.visualizer && this.blobsVisualization.visualizer.audioMotion) {
            try {
                // Try different possible method names
                const frequencies = this.blobsVisualization.visualizer.audioMotion.getFrequencies ? 
                    this.blobsVisualization.visualizer.audioMotion.getFrequencies() : 
                    (this.blobsVisualization.visualizer.audioMotion.frequencies || []);
                const waveform = this.blobsVisualization.visualizer.audioMotion.getWaveform ? 
                    this.blobsVisualization.visualizer.audioMotion.getWaveform() : 
                    (this.blobsVisualization.visualizer.audioMotion.waveform || []);
                
                audioData = { frequencies, waveform };
            } catch (error) {
                // Use dummy data for testing
                audioData = {
                    frequencies: new Array(64).fill(0.5),
                    waveform: new Array(64).fill(0.3)
                };
            }
        } else {
            // Use dummy data for testing
            audioData = {
                frequencies: new Array(64).fill(0.5),
                waveform: new Array(64).fill(0.3)
            };
        }
        
        return audioData;
    }
    
    /**
     * Handle blobs activation/deactivation
     */
    setActive(isActive) {
        if (!this.masterControlled) return;
        
        this.isActive = isActive;
        
        // Update master controller system state
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('blobs', isActive);
        }
    }
    
    /**
     * Sync blobs state with master controller (called when blobs start/stop)
     */
    syncBlobsState() {
        if (!this.masterControlled || !this.blobsVisualization) return;
        
        const shouldBeActive = this.blobsVisualization.isActive;
        if (this.isActive !== shouldBeActive) {
            this.setActive(shouldBeActive);
        }
    }
    
    /**
     * Default error handler
     */
    defaultErrorHandler(error) {
        console.error('🎬 Blobs Master Wrapper error:', error);
    }
    
    /**
     * Cleanup method called by Master Animation Controller
     */
    cleanup() {
        this.disableMasterControl();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Wait for blobs visualization to be available
        const waitForBlobsVisualization = () => {
            if (window.visualizer && window.visualizer.blobsVisualization) {
                window.blobsMasterWrapper = new BlobsMasterWrapper(window.visualizer.blobsVisualization);
                console.log('🎬 Blobs Master Wrapper: Connected to blobs visualization');
            } else {
                setTimeout(waitForBlobsVisualization, 100);
            }
        };
        
        waitForBlobsVisualization();
        
    } catch (error) {
        console.error('🎬 Blobs Master Wrapper initialization failed:', error);
    }
});
