/**
 * SpectrumAnalyzer Master Wrapper
 * Integrates the main SpectrumAnalyzer animation loop with the Master Animation Controller
 * Disables the legacy requestAnimationFrame loop when master control is enabled
 */

class SpectrumAnalyzerMasterWrapper {
    constructor(spectrumAnalyzer) {
        this.spectrumAnalyzer = spectrumAnalyzer;
        this.isRegistered = false;
        this.isActive = false;
        this.lastUpdateTime = 0;
        
        // Store original methods for rollback
        this.originalAnimate = null;
        
        // Master control state
        this.masterControlled = false;
        this.legacyMode = true;
        
        // Initialize if spectrum analyzer is available
        if (this.spectrumAnalyzer) {
            this.init();
        }
        
    }
    
    init() {
        if (!this.spectrumAnalyzer) return;
        
        // Store original animate method
        if (this.spectrumAnalyzer.animate) {
            this.originalAnimate = this.spectrumAnalyzer.animate.bind(this.spectrumAnalyzer);
        }
        
        // Register with Master Animation Controller
        this.registerWithMasterController();
    }
    
    registerWithMasterController() {
        if (window.masterAnimationController && !this.isRegistered) {
            window.masterAnimationController.registerSystem('spectrum-analyzer', {
                priority: window.masterAnimationController.PRIORITIES.WEBGL, // Priority 5
                targetFPS: 60,
                update: (deltaTime, timestamp, sharedAudioData) => this.update(deltaTime, timestamp, sharedAudioData),
                render: (deltaTime, timestamp, sharedAudioData) => this.render(deltaTime, timestamp, sharedAudioData),
                cleanup: () => this.cleanup(),
                errorHandler: (error) => this.defaultErrorHandler(error)
            });
            
            this.isRegistered = true;
        }
    }
    
    /**
     * Enable master animation control and disable legacy RAF loop
     */
    enableMasterControl() {
        if (this.masterControlled || !this.spectrumAnalyzer) return;
        
        this.masterControlled = true;
        this.legacyMode = false;
        
        // Override the animate method to prevent RAF scheduling
        if (this.spectrumAnalyzer.animate) {
            this.spectrumAnalyzer.animate = this.masterAnimate.bind(this);
        }
        
        // Cancel any existing animation frame
        if (this.spectrumAnalyzer.animationFrame) {
            cancelAnimationFrame(this.spectrumAnalyzer.animationFrame);
            this.spectrumAnalyzer.animationFrame = null;
        }
        
        // Activate the system in master controller
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('spectrum-analyzer', true);
            this.isActive = true;
        }
        
    }
    
    /**
     * Disable master animation control and revert to legacy mode
     */
    disableMasterControl() {
        if (!this.masterControlled || !this.spectrumAnalyzer) return;
        
        this.masterControlled = false;
        this.legacyMode = true;
        
        // Restore original animate method
        if (this.originalAnimate) {
            this.spectrumAnalyzer.animate = this.originalAnimate;
        }
        
        // Deactivate the system in master controller
        if (window.masterAnimationController) {
            window.masterAnimationController.setSystemActive('spectrum-analyzer', false);
            this.isActive = false;
        }
        
        // Restart legacy animation loop if needed
        if (this.spectrumAnalyzer && !this.spectrumAnalyzer.animationFrame) {
            this.spectrumAnalyzer.animationFrame = requestAnimationFrame(() => this.originalAnimate());
        }
        
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
    update(deltaTime, timestamp, sharedAudioData) {
        if (!this.spectrumAnalyzer || !this.isActive) return;
        
        this.lastUpdateTime = timestamp;
        
        // Store shared audio data for use by render method (PERFORMANCE OPTIMIZATION)
        this.sharedAudioData = sharedAudioData;
        
        // Update audio data and peaks (non-rendering logic)
        if (this.spectrumAnalyzer.getAudioData) {
            this.spectrumAnalyzer.getAudioData();
        }
        if (this.spectrumAnalyzer.updatePeaks) {
            this.spectrumAnalyzer.updatePeaks();
        }
    }
    
    /**
     * Render method called by Master Animation Controller
     */
    render(deltaTime, timestamp, sharedAudioData) {
        if (!this.spectrumAnalyzer || !this.isActive) {
            return;
        }
        
        // Get visualizer reference from global window object
        const visualizer = window.visualizer;
        if (!visualizer) {
            return;
        }
        
        try {
            // Execute the main visualization rendering logic
            // This is the core of what the original animate() method did
            
            
            // Check if visualizations are disabled
            if (visualizer.visualizationsDisabled) {
                // Handle disabled state (update Nebula if needed)
                this.handleDisabledVisualizationsState();
                return;
            }
            
            // Execute main drawing logic
            if (this.spectrumAnalyzer.draw) {
                this.spectrumAnalyzer.draw();
            }
            
            // Handle other visualization systems that were in the original animate loop
            this.handleAdditionalVisualizations();
            
        } catch (error) {
            console.error('SpectrumAnalyzer render error:', error);
        }
    }
    
    /**
     * Handle visualizations when main visualization is disabled
     */
    handleDisabledVisualizationsState() {
        const visualizer = window.visualizer;
        if (!visualizer) return;
        
        // Update WebGL if active
        if (visualizer.webglVisualization && visualizer.webglEnabled) {
            visualizer.webglVisualization.draw();
        }
        
        // Update Nebula if active
        if (visualizer.nebulaVisualization && visualizer.nebulaEnabled) {
            let nebulaAudioFeatures = null;
            
            // Try to get audio features from AI Autopilot first
            if (visualizer.aiAutopilot && visualizer.aiAutopilot.audioAnalyzer) {
                nebulaAudioFeatures = visualizer.aiAutopilot.audioAnalyzer.getCurrentFeatures();
            }
            
            // Fallback: generate basic audio features
            if (!nebulaAudioFeatures && this.spectrumAnalyzer.analyser && this.spectrumAnalyzer.dataArray) {
                nebulaAudioFeatures = this.spectrumAnalyzer.generateBasicAudioFeatures();
            } else if (nebulaAudioFeatures && nebulaAudioFeatures.energy === 0) {
                const basicFeatures = this.spectrumAnalyzer.generateBasicAudioFeatures();
                if (basicFeatures.energy > 0) {
                    nebulaAudioFeatures = basicFeatures;
                }
            }
            
            visualizer.nebulaVisualization.update(nebulaAudioFeatures);
            visualizer.nebulaVisualization.render();
        }
    }
    
    /**
     * Handle additional visualizations from the original animate loop
     */
    handleAdditionalVisualizations() {
        const visualizer = window.visualizer;
        if (!visualizer) {
            return;
        }
        
        
        // Update and draw Infinite Zoom if active and not captured via kaleidoscope
        if (visualizer.infiniteZoom && visualizer.infiniteZoom.isActive) {
            // Check if Infinite Zoom is being captured via kaleidoscope
            const isCapturedViaKaleidoscope = visualizer.kaleidoscopeEnabled && 
                (visualizer.kaleidoscopeApplyToViz || visualizer.kaleidoscopeApplyToInfiniteZoom);
            
            let audioFeatures = this.getAudioFeatures();
            
            // Update Infinite Zoom (always needed for kaleidoscope to capture)
            visualizer.infiniteZoom.update(audioFeatures);
            
            // Always draw Infinite Zoom (needed for kaleidoscope to capture)
            visualizer.infiniteZoom.draw();
            
            // Hide canvas when captured via kaleidoscope to prevent background layer
            if (isCapturedViaKaleidoscope) {
                visualizer.infiniteZoom.canvas.style.display = 'none';
            } else {
                visualizer.infiniteZoom.canvas.style.display = 'block';
            }
        }
        
        // Update and draw Fluid Dynamics if active (independent of Infinite Zoom)
        if (visualizer.fluidDynamics && visualizer.fluidDynamics.isActive) {
            // Check if Fluid Dynamics is being captured via kaleidoscope
            const isFluidCapturedViaKaleidoscope = visualizer.kaleidoscopeEnabled && 
                (visualizer.kaleidoscopeApplyToViz || visualizer.kaleidoscopeApplyToFluidDynamics);
            
            let audioFeatures = this.getAudioFeatures();
            
            // Update Fluid Dynamics (always needed for kaleidoscope to capture)
            visualizer.fluidDynamics.update(audioFeatures);
            
            // Always draw Fluid Dynamics (needed for kaleidoscope to capture)
            visualizer.fluidDynamics.draw();
            
            // Hide canvas when captured via kaleidoscope to prevent background layer
            if (isFluidCapturedViaKaleidoscope) {
                visualizer.fluidDynamics.canvas.style.display = 'none';
            } else {
                visualizer.fluidDynamics.canvas.style.display = 'block';
            }
        }
        
        // Update and draw WebGL if active
        if (visualizer.webglVisualization && visualizer.webglVisualization.isActive) {
            let audioFeatures = this.getAudioFeatures();
            
            visualizer.webglVisualization.update(audioFeatures);
            visualizer.webglVisualization.draw();
        }
        
        // Update and draw Nebula if active
        if (visualizer.nebulaVisualization && visualizer.nebulaEnabled) {
            let nebulaAudioFeatures = this.getAudioFeatures();
            
            visualizer.nebulaVisualization.update(nebulaAudioFeatures);
            visualizer.nebulaVisualization.render();
        }
        
        // Update and draw Blobs if active (handled by separate wrapper, but ensure it's called)
        if (visualizer.blobsVisualization && visualizer.blobsVisualization.isActive) {
            // The Blobs wrapper should handle this, but ensure it's synced
            if (window.blobsMasterWrapper) {
                window.blobsMasterWrapper.syncBlobsState();
            }
        }
        
    }
    
    /**
     * Get audio features for visualizations
     */
    getAudioFeatures() {
        // Use shared audio data from Master Animation Controller (PERFORMANCE OPTIMIZATION)
        if (this.sharedAudioData) {
            return this.sharedAudioData;
        }
        
        // Fallback for legacy mode or if shared data not available
        let audioFeatures = null;
        const visualizer = window.visualizer;
        
        // Try to get audio features from AI Autopilot first
        if (visualizer && visualizer.aiAutopilot && visualizer.aiAutopilot.audioAnalyzer) {
            audioFeatures = visualizer.aiAutopilot.audioAnalyzer.getCurrentFeatures();
        }
        
        // Fallback: generate basic audio features from main audio analyzer
        if (!audioFeatures && this.spectrumAnalyzer.analyser && this.spectrumAnalyzer.dataArray) {
            audioFeatures = this.spectrumAnalyzer.generateBasicAudioFeatures();
        } else if (audioFeatures && audioFeatures.energy === 0) {
            // Try to generate basic audio features if AI features have no energy
            const basicFeatures = this.spectrumAnalyzer.generateBasicAudioFeatures();
            if (basicFeatures.energy > 0) {
                audioFeatures = basicFeatures;
            }
        }
        
        return audioFeatures;
    }
    
    /**
     * Default error handler
     */
    defaultErrorHandler(error) {
        console.error('SpectrumAnalyzer Master Wrapper error:', error);
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
        // Wait for spectrum analyzer to be available
        const waitForSpectrumAnalyzer = () => {
            if (window.visualizer && window.visualizer.audioMotion) {
                window.spectrumAnalyzerMasterWrapper = new SpectrumAnalyzerMasterWrapper(window.visualizer.audioMotion);
            } else {
                setTimeout(waitForSpectrumAnalyzer, 100);
            }
        };
        
        waitForSpectrumAnalyzer();
        
    } catch (error) {
        console.error('SpectrumAnalyzer Master Wrapper initialization failed:', error);
    }
});
