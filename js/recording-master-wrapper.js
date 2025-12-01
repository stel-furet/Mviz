/**
 * Recording System Master Animation Wrapper
 * Integrates recording compositing with Master Animation Controller
 * Maintains frame-perfect timing for 30fps/60fps recording modes
 */

class RecordingMasterWrapper {
    constructor() {
        this.isRegistered = false;
        this.isActive = false;
        this.lastUpdateTime = 0;
        
        // Recording system references
        this.recordManager = null;
        this.liveDisplayManager = null;
        
        // Wrapper state
        this.masterControlled = false;
        this.legacyMode = true;
        
        // Store original methods for rollback
        this.originalRecordStartCompositing = null;
        this.originalLiveStartCompositing = null;
        
        // Frame rate tracking
        this.targetFrameRate = 30; // Default to 30fps
        this.lastCompositeTime = 0;
        
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
        const success = window.masterAnimationController.registerSystem('recording', {
            priority: 12, // Render after all visualizations (plugins at 11+) to ensure everything is ready
            targetFPS: 60, // Run at 60fps to handle both 30fps and 60fps recording
            isActive: false, // Start inactive, will be activated when recording starts
            isPlugin: false,
            update: this.update.bind(this),
            render: this.render.bind(this),
            cleanup: this.cleanup.bind(this),
            errorHandler: this.errorHandler.bind(this)
        });
        
        if (success) {
            this.isRegistered = true;
        } else {
            console.error('Failed to register Recording System with Master Animation Controller');
        }
    }
    
    /**
     * Enable master animation control for recording system
     */
    enableMasterControl() {
        if (this.masterControlled) return;
        
        this.masterControlled = true;
        this.legacyMode = false;
        
        // Get references to recording systems
        this.recordManager = window.visualizer?.recordManager;
        this.liveDisplayManager = window.multiDisplayManager;
        
        // Store original methods
        if (this.recordManager && this.recordManager.startCompositing) {
            this.originalRecordStartCompositing = this.recordManager.startCompositing.bind(this.recordManager);
            this.recordManager.startCompositing = this.masterStartCompositing.bind(this);
        }
        
        // Override startCompositing on all existing LiveDisplayManager instances
        // multiDisplayManager.displayManagers contains the actual LiveDisplayManager instances
        this.overrideLiveDisplayManagers();
        
    }
    
    /**
     * Override startCompositing on all LiveDisplayManager instances
     * Called when master control is enabled and when new displays are created
     */
    overrideLiveDisplayManagers() {
        if (!this.liveDisplayManager || !this.liveDisplayManager.displayManagers) return;
        
        for (const [displayId, displayManager] of this.liveDisplayManager.displayManagers) {
            if (displayManager && displayManager.startCompositing) {
                // Store original if not already stored
                if (!this.originalLiveStartCompositing) {
                    this.originalLiveStartCompositing = displayManager.startCompositing.bind(displayManager);
                }
                // Override to activate system when streaming starts
                displayManager.startCompositing = this.masterStartCompositing.bind(this);
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
        if (this.recordManager && this.originalRecordStartCompositing) {
            this.recordManager.startCompositing = this.originalRecordStartCompositing;
        }
        
        if (this.liveDisplayManager && this.originalLiveStartCompositing) {
            this.liveDisplayManager.startCompositing = this.originalLiveStartCompositing;
        }
        
        // Deactivate the system in master controller
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('recording', false);
            this.isActive = false;
        }
        
    }
    
    /**
     * Master-controlled version of startCompositing
     */
    masterStartCompositing() {
        // Activate the system in master controller instead of starting RAF loop
        this.isActive = true;
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('recording', true);
        }
        
        // Update target frame rate - use highest needed (recording or live displays)
        let maxFrameRate = 30; // Default minimum
        
        // Check recording frame rate
        if (this.recordManager && this.recordManager.frameRate) {
            maxFrameRate = Math.max(maxFrameRate, this.recordManager.frameRate);
        }
        
        // Check live display frame rates (use highest)
        if (this.liveDisplayManager && this.liveDisplayManager.displayManagers) {
            for (const [displayId, displayManager] of this.liveDisplayManager.displayManagers) {
                if (displayManager && displayManager.isStreaming && displayManager.displaySettings) {
                    const displayFrameRate = displayManager.displaySettings.frameRate || 60;
                    maxFrameRate = Math.max(maxFrameRate, displayFrameRate);
                }
            }
        }
        
        this.targetFrameRate = maxFrameRate;
    }
    
    /**
     * Update method called by Master Animation Controller
     */
    update(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive) return;
        
        // Store shared audio data (PERFORMANCE OPTIMIZATION)
        this.sharedAudioData = sharedAudioData;
        
        // Frame rate control ONLY for recording (not for live displays)
        // Live displays composite every frame - MAL already runs at 60fps which is perfect for smooth 4K
        const isRecording = this.recordManager && this.recordManager.isRecording;
        
        // Only throttle if recording is active (live displays composite every frame for maximum smoothness)
        if (isRecording) {
            const targetInterval = 1000 / this.targetFrameRate;
            const timeSinceLastComposite = timestamp - this.lastCompositeTime;
            
            if (timeSinceLastComposite < targetInterval) {
                return; // Skip this frame for recording
            }
            
            this.lastCompositeTime = timestamp;
        }
        
        this.lastUpdateTime = timestamp;
    }
    
    /**
     * Render method called by Master Animation Controller
     */
    render(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive) return;
        
        try {
            // Composite recording frame
            this.compositeRecordingFrame();
            
            // Composite live display frames if needed
            this.compositeLiveDisplayFrames();
            
        } catch (error) {
            console.error('Recording System render error:', error);
        }
    }
    
    /**
     * Composite recording frame
     */
    compositeRecordingFrame() {
        if (!this.recordManager || !this.recordManager.isRecording) return;
        
        // Call the original compositeFrame method
        // This already handles crop canvas via updateCropCanvas() at the end
        if (this.recordManager.compositeFrame) {
            this.recordManager.compositeFrame();
        }
        
        // Note: updateCropCanvas() is called by compositeFrame(), so no need for separate crop handling
    }
    
    /**
     * Composite live display frames
     * NOTE: No frame rate throttling here - MAL already runs at 60fps (targetFPS: 60)
     * Live displays should composite every frame for maximum smoothness at 4K
     */
    compositeLiveDisplayFrames() {
        if (!this.liveDisplayManager) return;
        
        // Get all active display managers (not DisplayInstance objects)
        // multiDisplayManager has both:
        // - displays: Map of DisplayInstance objects
        // - displayManagers: Map of LiveDisplayManager objects
        const displayManagers = this.liveDisplayManager.displayManagers;
        if (!displayManagers) return;
        
        // Composite each active display - no throttling, let MAL handle frame rate
        // MAL runs at 60fps which is perfect for smooth 4K live displays
        for (const [displayId, displayManager] of displayManagers) {
            if (!displayManager || !displayManager.isStreaming || !displayManager.compositeFrame) {
                continue;
            }
            
            try {
                displayManager.compositeFrame();
            } catch (error) {
                console.error(`Live Display ${displayId} composite error:`, error);
            }
        }
    }
    
    /**
     * Stop recording compositing
     */
    stopCompositing() {
        this.isActive = false;
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('recording', false);
        }
    }
    
    /**
     * Update frame rate for recording
     */
    setFrameRate(frameRate) {
        this.targetFrameRate = frameRate;
        
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
        console.error('Recording System wrapper error:', error);
        
        // On error, try to revert to legacy mode
        if (this.masterControlled) {
            this.disableMasterControl();
        }
    }
    
    /**
     * Check if recording system is currently under master control
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
            targetFrameRate: this.targetFrameRate,
            isRecording: this.recordManager ? this.recordManager.isRecording : false,
            hasLiveDisplays: this.liveDisplayManager ? this.liveDisplayManager.displays.size > 0 : false
        };
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize recording wrapper
    window.recordingMasterWrapper = new RecordingMasterWrapper();
    
    // Add to global test interface
    if (window.testMasterAnimation) {
        window.testMasterAnimation.recording = {
            enableMaster: () => window.recordingMasterWrapper.enableMasterControl(),
            disableMaster: () => window.recordingMasterWrapper.disableMasterControl(),
            getStatus: () => window.recordingMasterWrapper.getStatus(),
            isMasterControlled: () => window.recordingMasterWrapper.isMasterControlled(),
            setFrameRate: (fps) => window.recordingMasterWrapper.setFrameRate(fps)
        };
    }
    
});
