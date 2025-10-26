// WebGL Beat Detection System - Independent and Improved
class WebGLBeatDetector {
    constructor() {
        // Beat detection parameters (improved from Kaleidoscope/AudioAnalyzer)
        this.beatThreshold = 1.15; // More sensitive than AudioAnalyzer (1.05)
        this.energySmoothing = 0.85; // Smoother than AudioAnalyzer (0.9)
        this.fluxThreshold = 0.08; // More sensitive than AudioAnalyzer (0.05)
        this.minBeatInterval = 80; // Faster than AudioAnalyzer (100ms)
        
        // Current analysis data
        this.currentEnergy = 0;
        this.smoothedEnergy = 0;
        this.spectralFlux = 0;
        this.beatDetected = false;
        this.beatConfidence = 0;
        
        // History for analysis
        this.energyHistory = new Array(30).fill(0); // 0.5 seconds at 60fps
        this.fluxHistory = new Array(30).fill(0);
        this.beatHistory = [];
        this.lastBeatTime = 0;
        
        // Beat effects parameters
        this.beatIntensity = 0.5; // User configurable (0-1)
        this.beatSizeBoost = 1.5; // Size multiplier on beat
        this.beatSpeedBoost = 2.0; // Speed multiplier on beat
        this.beatCountBoost = 3; // Extra particles on beat
        
        console.log('🥁 WebGL Beat Detector initialized');
    }
    
    update(audioFeatures) {
        if (!audioFeatures) {
            console.log('🥁 WebGL Beat Detector: No audio features provided');
            return;
        }
        
        // Debug logging (very rare to avoid spam)
        if (Math.random() < 0.001) { // 0.1% chance to log
            console.log('🥁 WebGL Beat Detector update - audioFeatures:', {
                frequencies: audioFeatures.frequencies ? audioFeatures.frequencies.length : 'none',
                waveform: audioFeatures.waveform ? audioFeatures.waveform.length : 'none',
                energy: audioFeatures.energy,
                beat: audioFeatures.beat
            });
        }
        
        // Calculate energy from frequencies or waveform
        let energy = 0;
        if (audioFeatures.frequencies && audioFeatures.frequencies.length > 0) {
            // Calculate RMS energy from frequencies
            const sum = audioFeatures.frequencies.reduce((acc, val) => acc + val * val, 0);
            energy = Math.sqrt(sum / audioFeatures.frequencies.length);
        } else if (audioFeatures.waveform && audioFeatures.waveform.length > 0) {
            // Calculate RMS energy from waveform
            const sum = audioFeatures.waveform.reduce((acc, val) => acc + val * val, 0);
            energy = Math.sqrt(sum / audioFeatures.waveform.length);
        }
        
        // Update energy history and smoothing
        this.energyHistory.shift();
        this.energyHistory.push(energy);
        this.currentEnergy = energy;
        this.smoothedEnergy = this.smoothedEnergy * this.energySmoothing + energy * (1 - this.energySmoothing);
        
        // Calculate spectral flux (change in frequency spectrum)
        this.calculateSpectralFlux(audioFeatures.frequencies || []);
        
        // Detect beats
        this.detectBeats();
        
        return {
            beat: this.beatDetected,
            confidence: this.beatConfidence,
            energy: this.currentEnergy,
            smoothedEnergy: this.smoothedEnergy,
            flux: this.spectralFlux
        };
    }
    
    calculateSpectralFlux(frequencies) {
        if (!frequencies || frequencies.length === 0) {
            this.spectralFlux = 0;
            return;
        }
        
        // Calculate spectral flux (change in frequency spectrum)
        let flux = 0;
        for (let i = 0; i < frequencies.length; i++) {
            const diff = frequencies[i] - (this.fluxHistory[i] || 0);
            flux += Math.max(0, diff); // Only positive changes
        }
        
        // Update flux history
        this.fluxHistory.shift();
        this.fluxHistory.push(frequencies[0] || 0);
        
        this.spectralFlux = flux / frequencies.length;
    }
    
    detectBeats() {
        const now = Date.now();
        const timeSinceLastBeat = now - this.lastBeatTime;
        
        // Enhanced beat detection using both energy and spectral flux
        const energyIncrease = this.currentEnergy / (this.smoothedEnergy + 0.001);
        
        // Beat detected if energy spike OR significant spectral change
        this.beatDetected = (energyIncrease > this.beatThreshold) || 
                           (this.spectralFlux > this.fluxThreshold);
        
        // Calculate beat confidence (0-1)
        this.beatConfidence = Math.min(1, 
            (energyIncrease / this.beatThreshold) * 0.7 + 
            (this.spectralFlux / this.fluxThreshold) * 0.3
        );
        
        if (this.beatDetected && timeSinceLastBeat > this.minBeatInterval) {
            this.beatHistory.push(now);
            this.lastBeatTime = now;
            
            // Keep only recent beats (last 5 seconds)
            this.beatHistory = this.beatHistory.filter(time => now - time < 5000);
            
            // Log beat detection for debugging (very rarely)
            if (Math.random() < 0.01) { // 1% chance to log
                console.log(`🥁 WebGL Beat detected - Energy: ${energyIncrease.toFixed(2)}, Flux: ${this.spectralFlux.toFixed(3)}, Confidence: ${this.beatConfidence.toFixed(2)}`);
            }
        } else {
            this.beatDetected = false;
        }
    }
    
    setBeatIntensity(intensity) {
        this.beatIntensity = Math.max(0, Math.min(1, intensity));
        console.log('🥁 WebGL Beat intensity set to:', this.beatIntensity);
    }
    
    getBeatEffects(beatReactEnabled = false) {
        // Return no effects if beat not detected OR beat react is disabled
        if (!this.beatDetected || !beatReactEnabled) {
            return {
                sizeMultiplier: 1.0,
                speedMultiplier: 1.0,
                extraParticles: 0
            };
        }
        
        const intensity = this.beatIntensity * this.beatConfidence;
        
        return {
            sizeMultiplier: 1.0 + (this.beatSizeBoost - 1.0) * intensity,
            speedMultiplier: 1.0 + (this.beatSpeedBoost - 1.0) * intensity,
            extraParticles: Math.floor(this.beatCountBoost * intensity)
        };
    }
    
    getBeatHistory() {
        return this.beatHistory.slice(); // Return copy
    }
    
    getCurrentBPM() {
        if (this.beatHistory.length < 2) return 0;
        
        const now = Date.now();
        const recentBeats = this.beatHistory.filter(time => now - time < 10000); // Last 10 seconds
        
        if (recentBeats.length < 2) return 0;
        
        // Calculate average interval between beats
        let totalInterval = 0;
        for (let i = 1; i < recentBeats.length; i++) {
            totalInterval += recentBeats[i] - recentBeats[i - 1];
        }
        
        const avgInterval = totalInterval / (recentBeats.length - 1);
        return Math.round(60000 / avgInterval); // Convert to BPM
    }
}

// WebGL Visualization System - Photorealistic Fluid Rendering
class WebGLVisualizationManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.canvas = null;
        this.gl = null;
        this.isActive = false;
        this.isInitialized = false;
        this.animationRunning = false;
        
        // WebGL context properties
        this.webglSupported = false;
        this.webgl2Supported = false;
        
        // Canvas properties (mirror Infinite Zoom)
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        
        // Performance monitoring
        this.lastFrameTime = 0;
        this.targetFPS = 30;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Audio integration
        this.audioFeatures = null;
        this.energyHistory = [];
        this.energySmoothing = 0.7;
        this.currentEnergy = 0;
        
        // Default visualization (will be set to particle system)
        this.currentVisualization = null;
        
        // Beat detection system
        this.beatDetector = new WebGLBeatDetector();
        
        console.log('🎮 WebGL Visualization Manager initialized');
    }
    
    initialize() {
        if (this.isInitialized) return;
        
        // Create canvas (mirror Infinite Zoom approach)
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        // Set canvas style (mirror Infinite Zoom exactly)
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '4'; // Above Infinite Zoom (z-index: 3)
        
        // Initially hidden
        this.canvas.style.display = 'none';
        this.canvas.style.visibility = 'hidden';
        this.canvas.style.opacity = '0';
        
        // Add to visualization container
        const container = document.getElementById('visualizationContainer');
        if (container) {
            container.appendChild(this.canvas);
            
            // Resize canvas to fill container (mirror Infinite Zoom)
            this.resize();
            
            // Initialize WebGL context
            this.initializeWebGL();
            
            this.isInitialized = true;
            console.log('🎮 WebGL canvas created and added to container');
        } else {
            console.error('🎮 WebGL: visualizationContainer not found!');
        }
    }
    
    initializeWebGL() {
        if (!this.canvas) {
            console.error('🎮 WebGL: Canvas not available for WebGL initialization!');
            return;
        }
        
        // Try WebGL2 first, fallback to WebGL
        try {
            this.gl = this.canvas.getContext('webgl2', {
                alpha: true,
                antialias: true,
                depth: true,
                stencil: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });
            
            if (this.gl) {
                this.webgl2Supported = true;
                this.webglSupported = true;
                console.log('🎮 WebGL2 context created successfully');
            }
        } catch (error) {
            console.warn('🎮 WebGL2 not supported, trying WebGL:', error);
        }
        
        // Fallback to WebGL1
        if (!this.gl) {
            try {
                this.gl = this.canvas.getContext('webgl', {
                    alpha: true,
                    antialias: true,
                    depth: true,
                    stencil: false,
                    preserveDrawingBuffer: false,
                    powerPreference: 'high-performance'
                });
                
                if (this.gl) {
                    this.webglSupported = true;
                    this.webgl2Supported = false;
                    console.log('🎮 WebGL context created successfully');
                }
            } catch (error) {
                console.error('🎮 WebGL not supported:', error);
            }
        }
        
        // Check WebGL support
        if (!this.webglSupported) {
            console.error('🎮 WebGL not supported. Check Browser settings.');
            this.showWebGLError();
            return;
        }
        
        // Initialize default visualization (particle system)
        this.initializeDefaultVisualization();
        
        console.log('🎮 WebGL initialization complete:', {
            webglSupported: this.webglSupported,
            webgl2Supported: this.webgl2Supported,
            canvasSize: `${this.canvas.width}x${this.canvas.height}`
        });
    }
    
    initializeDefaultVisualization() {
        // Initialize particle system as default visualization
        this.currentVisualization = new WebGLParticleSystem(this);
        console.log('🎮 Default WebGL visualization (Particle System) initialized');
    }
    
    showWebGLError() {
        // Disable WebGL button and show error state
        this.disableWebGLUI();
        
        // Create error message overlay
        const errorDiv = document.createElement('div');
        errorDiv.id = 'webgl-error-message';
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.fontSize = '18px';
        errorDiv.style.fontWeight = 'bold';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.zIndex = '1000';
        errorDiv.style.pointerEvents = 'none';
        errorDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.border = '2px solid #ff6b6b';
        errorDiv.innerHTML = `
            <div style="margin-bottom: 10px;">⚠️ WebGL Not Supported</div>
            <div style="font-size: 14px; font-weight: normal;">Check Browser settings.</div>
            <div style="font-size: 12px; font-weight: normal; margin-top: 10px; opacity: 0.8;">
                WebGL is required for this visualization.
            </div>
        `;
        
        // Add to canvas
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.parentElement.appendChild(errorDiv);
        }
        
        console.error('🎮 WebGL Error: WebGL not supported. Check Browser settings.');
    }
    
    disableWebGLUI() {
        // Disable WebGL button
        const webglBtn = document.getElementById('headerWebGLBtn');
        if (webglBtn) {
            webglBtn.disabled = true;
            webglBtn.style.opacity = '0.5';
            webglBtn.style.cursor = 'not-allowed';
            webglBtn.title = 'WebGL not supported';
        }
        
        // Disable WebGL toggle button
        const webglToggleBtn = document.getElementById('headerWebGLToggleBtn');
        if (webglToggleBtn) {
            webglToggleBtn.disabled = true;
            webglToggleBtn.style.opacity = '0.5';
            webglToggleBtn.style.cursor = 'not-allowed';
            webglToggleBtn.title = 'WebGL not supported';
        }
        
        // Hide WebGL panel if open
        const webglPanel = document.getElementById('headerWebGLPanel');
        if (webglPanel) {
            webglPanel.style.display = 'none';
        }
        
        console.log('🎮 WebGL UI disabled due to lack of WebGL support');
    }
    
    // Test method to simulate WebGL not supported (for testing error handling)
    testWebGLNotSupported() {
        console.log('🎮 WebGL: Testing error handling - simulating WebGL not supported');
        this.webglSupported = false;
        this.webgl2Supported = false;
        this.gl = null;
        this.showWebGLError();
    }
    
    // Test method to restore WebGL support (for testing error handling)
    testWebGLSupported() {
        console.log('🎮 WebGL: Testing error handling - restoring WebGL support');
        this.initializeWebGL();
    }
    
    resize() {
        if (!this.canvas) {
            console.error('🎮 WebGL: Canvas not available for resize!');
            return;
        }
        
        const container = document.getElementById('visualizationContainer');
        if (!container) {
            console.error('🎮 WebGL: Container not found during resize!');
            return;
        }
        
        const rect = container.getBoundingClientRect();
        
        // Ensure we have valid container dimensions
        if (rect.width === 0 || rect.height === 0) {
            console.warn('🎮 WebGL: Container has zero dimensions, using fallback:', rect);
            // Use window dimensions as fallback
            const fallbackWidth = Math.max(window.innerWidth, 800);
            const fallbackHeight = Math.max(window.innerHeight, 600);
            this.setCanvasDimensions(fallbackWidth, fallbackHeight);
            return;
        }
        
        // Store old dimensions for scaling
        const oldWidth = this.canvas.width || rect.width;
        const oldHeight = this.canvas.height || rect.height;
        
        // Ensure minimum dimensions - use container size directly (mirror Infinite Zoom)
        const newWidth = Math.max(rect.width, 400);
        const newHeight = Math.max(rect.height, 300);
        
        this.setCanvasDimensions(newWidth, newHeight, oldWidth, oldHeight);
        
        console.log('🎮 WebGL canvas resized to:', newWidth, 'x', newHeight);
    }
    
    setCanvasDimensions(width, height, oldWidth = null, oldHeight = null) {
        if (!this.canvas) {
            console.error('🎮 WebGL: Canvas not available for dimension setting!');
            return;
        }
        
        // Validate dimensions
        if (width <= 0 || height <= 0) {
            console.error('🎮 WebGL: Invalid dimensions:', width, 'x', height);
            return;
        }
        
        // Update canvas dimensions
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Update WebGL viewport
        if (this.gl) {
            this.gl.viewport(0, 0, width, height);
        }
        
        // Notify current visualization of size change
        if (this.currentVisualization && this.currentVisualization.onResize) {
            this.currentVisualization.onResize(width, height, oldWidth, oldHeight);
        }
        
        console.log('🎮 WebGL canvas dimensions set:', width, 'x', height, 'WebGL context valid:', !!this.gl);
    }
    
    start() {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        if (!this.canvas || !this.webglSupported) {
            console.error('🎮 WebGL: Canvas or WebGL not available!');
            return;
        }
        
        this.isActive = true;
        
        // Show canvas
        if (this.canvas) {
            this.canvas.style.display = 'block';
            this.canvas.style.visibility = 'visible';
            this.canvas.style.opacity = '1';
        }
        
        // Start current visualization
        if (this.currentVisualization && this.currentVisualization.start) {
            this.currentVisualization.start();
        }
        
        console.log('🎮 WebGL visualization started (no independent animation loop)');
    }
    
    stop() {
        this.isActive = false;
        
        // Stop current visualization
        if (this.currentVisualization && this.currentVisualization.stop) {
            this.currentVisualization.stop();
        }
        
        // Properly hide canvas
        if (this.canvas) {
            this.canvas.style.display = 'none';
            this.canvas.style.visibility = 'hidden';
            this.canvas.style.opacity = '0';
        }
        
        console.log('🎮 WebGL visualization stopped (animation loop continues)');
    }
    
    update(audioFeatures = null) {
        if (!this.isActive) return;
        
        // Get audio data with fallback mechanism (same as Infinite Zoom)
        let audioData = audioFeatures;
        
        // Try AI Autopilot first (same as Infinite Zoom)
        if (!audioData && this.visualizer.aiAutopilot && this.visualizer.aiAutopilot.audioAnalyzer) {
            try {
                const audioFeatures = this.visualizer.aiAutopilot.audioAnalyzer.getCurrentFeatures();
                if (audioFeatures && audioFeatures.energy > 0) {
                    audioData = audioFeatures;
                }
            } catch (error) {
                console.warn('🎮 WebGL: Error getting AI Autopilot audio features:', error);
            }
        }
        
        // Fallback: AudioMotion (same as Infinite Zoom)
        if (!audioData && this.visualizer.audioMotion && this.visualizer.audioMotion.analyser) {
            try {
                const audioMotionFeatures = this.visualizer.audioMotion.getCurrentAudioFeatures();
                if (audioMotionFeatures && audioMotionFeatures.energy > 0) {
                    audioData = audioMotionFeatures;
                }
            } catch (error) {
                console.warn('🎮 WebGL: Error getting AudioMotion audio features:', error);
            }
        }
        
        // Final fallback: Generate test data (same as Infinite Zoom)
        if (!audioData) {
            audioData = this.generateTestAudioData();
        }
        
        // Store audio features
        this.audioFeatures = audioData;
        
        // Update beat detector and get beat information
        const beatInfo = this.beatDetector.update(audioData);
        
        // Update current visualization with beat information
        if (this.currentVisualization && this.currentVisualization.update) {
            this.currentVisualization.update(audioData, beatInfo);
        }
    }
    
    // Draw method - called from main animation loop (like Infinite Zoom)
    draw() {
        if (!this.isActive) return;
        
        // Render current visualization
        if (this.currentVisualization && this.currentVisualization.render) {
            this.currentVisualization.render();
        }
    }
    
    // Generate test audio data (same as Infinite Zoom)
    generateTestAudioData() {
        const testEnergy = 0.5 + Math.sin(Date.now() / 1000) * 0.3; // Oscillating energy
        return {
            frequencies: new Array(64).fill(testEnergy),
            waveform: new Array(64).fill(testEnergy * 0.7),
            energy: testEnergy,
            beat: Math.random() > 0.95 // Random beats
        };
    }
    
    // Integration with kaleidoscope system (future)
    getCanvas() {
        return this.canvas;
    }
    
    isEnabled() {
        return this.isActive;
    }
    
    // Settings management
    getSettings() {
        return {
            isActive: this.isActive,
            webglSupported: this.webglSupported,
            webgl2Supported: this.webgl2Supported,
            canvasSize: `${this.canvas.width}x${this.canvas.height}`,
            currentVisualization: this.currentVisualization ? this.currentVisualization.constructor.name : 'none'
        };
    }
    
    setSettings(settings) {
        // Settings will be handled by individual visualizations
        if (this.currentVisualization && this.currentVisualization.setSettings) {
            this.currentVisualization.setSettings(settings);
        }
        
        // Handle beat intensity setting
        if (settings.beatIntensity !== undefined) {
            this.beatDetector.setBeatIntensity(settings.beatIntensity / 100); // Convert percentage to 0-1
        }
    }
    
}

// WebGL Particle System - Default Visualization
class WebGLParticleSystem {
    constructor(manager) {
        this.manager = manager;
        this.gl = manager.gl;
        this.canvas = manager.canvas;
        
        // Particle system properties
        this.particles = [];
        this.maxParticles = 500;
        this.particleCount = 200;
        
        // Shader programs
        this.vertexShader = null;
        this.fragmentShader = null;
        this.program = null;
        
        // WebGL buffers
        this.vertexBuffer = null;
        this.positionBuffer = null;
        this.colorBuffer = null;
        this.sizeBuffer = null;
        this.starShapeBuffer = null;
        
        // Uniforms
        this.uniforms = {};
        
        // Particle properties
        this.particleSize = 10.0; // Changed from 5.0 to 10.0
        this.speed = 1.0; // Reverted back to 1.0 - speed 0 caused particles to disappear
        this.gravity = 0.5;
        this.saturation = 0.0; // Default to 0 (white particles), 1.0 = full color
        this.audioReactivity = 0.5;
        this.opacity = 1.0; // Overall visualization opacity (0.0 = invisible, 1.0 = fully visible)
        
        // Twinkle effect properties
        this.twinkleIntensity = 0.3; // 0.0 = no twinkle, 1.0 = maximum twinkle
        this.twinkleSpeed = 0.05; // Base twinkle speed multiplier
        
        // Star shape properties
        this.starPercentage = 0.0; // 0.0 = all circles, 1.0 = all stars
        this.beatReact = false;
        this.beatSize = false;
        this.beatSpeed = false;
        this.beatCount = false;
        this.beatGeneration = false;
        
        // Energy reaction settings
        this.energyReact = false;
        this.energySize = false;
        this.energySpeed = false;
        this.energyCount = false;
        
        // Frequency reaction settings
        this.frequencyReact = false;
        this.bassReact = false;
        this.midReact = false;
        this.trebleReact = false;
        
        // Color schemes
        this.currentColorScheme = 'plasma';
        this.colorSchemes = {
            'plasma': [
                [1.0, 0.0, 0.0], // Red
                [1.0, 0.5, 0.0], // Orange
                [1.0, 1.0, 0.0], // Yellow
                [0.0, 1.0, 0.0], // Green
                [0.0, 0.0, 1.0], // Blue
                [0.5, 0.0, 1.0]  // Purple
            ],
            'fire': [
                [1.0, 0.0, 0.0], // Red
                [1.0, 0.3, 0.0], // Red-Orange
                [1.0, 0.6, 0.0], // Orange
                [1.0, 1.0, 0.0], // Yellow
                [1.0, 1.0, 0.5], // Light Yellow
                [1.0, 0.8, 0.2]  // Golden
            ],
            'ocean': [
                [0.0, 0.2, 0.4], // Deep Blue
                [0.0, 0.4, 0.6], // Ocean Blue
                [0.0, 0.6, 0.8], // Sky Blue
                [0.2, 0.8, 1.0], // Light Blue
                [0.4, 0.9, 1.0], // Cyan
                [0.6, 1.0, 1.0]  // Light Cyan
            ],
            'aurora': [
                [0.0, 1.0, 0.5], // Green-Cyan
                [0.2, 1.0, 0.8], // Light Green-Cyan
                [0.5, 0.8, 1.0], // Light Blue
                [0.8, 0.5, 1.0], // Purple-Blue
                [1.0, 0.2, 0.8], // Magenta
                [1.0, 0.0, 0.5]  // Pink
            ],
            'sunset': [
                [1.0, 0.4, 0.1], // Orange-Red
                [1.0, 0.6, 0.2], // Orange
                [1.0, 0.8, 0.4], // Golden
                [0.9, 0.5, 0.8], // Pink
                [0.7, 0.3, 0.9], // Purple
                [0.5, 0.2, 0.6]  // Deep Purple
            ],
            'neon': [
                [1.0, 0.0, 1.0], // Magenta
                [0.0, 1.0, 1.0], // Cyan
                [1.0, 1.0, 0.0], // Yellow
                [0.0, 1.0, 0.0], // Green
                [1.0, 0.0, 0.0], // Red
                [0.0, 0.0, 1.0]  // Blue
            ]
        };
        this.colors = this.colorSchemes[this.currentColorScheme];
        
        console.log('🎮 WebGL Particle System initialized');
    }
    
    initialize() {
        if (!this.gl) {
            console.error('🎮 Particle System: WebGL context not available!');
            return false;
        }
        
        // Initialize shaders
        if (!this.initializeShaders()) {
            console.error('🎮 Particle System: Failed to initialize shaders!');
            return false;
        }
        
        // Initialize buffers
        if (!this.initializeBuffers()) {
            console.error('🎮 Particle System: Failed to initialize buffers!');
            return false;
        }
        
        // Generate initial particles
        this.generateInitialParticles();
        
        console.log('🎮 Particle System: Initialization complete');
        return true;
    }
    
    initializeShaders() {
        // Vertex shader source
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute float a_size;
            attribute vec3 a_color;
            attribute float a_starShape; // 0.0 = circle, 1.0 = star
            
            uniform vec2 u_resolution;
            uniform float u_time;
            
            varying vec3 v_color;
            varying float v_starShape;
            
            void main() {
                // Convert from pixels to clip space
                vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
                
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                gl_PointSize = a_size;
                
                v_color = a_color;
                v_starShape = a_starShape;
            }
        `;
        
        // Fragment shader source
        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec3 v_color;
            varying float v_starShape;
            uniform float u_opacity; // Overall visualization opacity
            
            // Function to create 4-point star shape
            float starShape(vec2 coord) {
                vec2 center = coord - vec2(0.5);
                float angle = atan(center.y, center.x);
                float radius = length(center);
                
                // Create 4-point star using sine waves
                float starRadius = 0.5 * (1.0 + 0.4 * sin(4.0 * angle));
                
                return radius / starRadius;
            }
            
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist;
                
                // Choose shape based on v_starShape
                if (v_starShape > 0.5) {
                    // Star shape
                    dist = starShape(gl_PointCoord);
                } else {
                    // Circle shape
                    dist = length(center) / 0.5;
                }
                
                if (dist > 1.0) {
                    discard;
                }
                
                // Add glow effect
                float alpha = 1.0 - smoothstep(0.0, 1.0, dist);
                
                // Apply overall opacity
                alpha *= u_opacity;
                
                gl_FragColor = vec4(v_color, alpha);
            }
        `;
        
        // Compile shaders
        this.vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        this.fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        if (!this.vertexShader || !this.fragmentShader) {
            return false;
        }
        
        // Create program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, this.vertexShader);
        this.gl.attachShader(this.program, this.fragmentShader);
        this.gl.linkProgram(this.program);
        
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('🎮 Particle System: Program linking failed:', this.gl.getProgramInfoLog(this.program));
            return false;
        }
        
        // Get attribute and uniform locations
        this.uniforms.resolution = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.uniforms.time = this.gl.getUniformLocation(this.program, 'u_time');
        this.uniforms.opacity = this.gl.getUniformLocation(this.program, 'u_opacity');
        
        this.attributes = {
            position: this.gl.getAttribLocation(this.program, 'a_position'),
            size: this.gl.getAttribLocation(this.program, 'a_size'),
            color: this.gl.getAttribLocation(this.program, 'a_color'),
            starShape: this.gl.getAttribLocation(this.program, 'a_starShape')
        };
        
        console.log('🎮 Particle System: Shaders compiled successfully');
        return true;
    }
    
    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('🎮 Particle System: Shader compilation failed:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    initializeBuffers() {
        // Create vertex buffer for particle positions
        this.positionBuffer = this.gl.createBuffer();
        
        // Create color buffer for particle colors
        this.colorBuffer = this.gl.createBuffer();
        
        // Create size buffer for particle sizes
        this.sizeBuffer = this.gl.createBuffer();
        
        // Create star shape buffer for particle shapes (0.0 = circle, 1.0 = star)
        this.starShapeBuffer = this.gl.createBuffer();
        
        console.log('🎮 Particle System: Buffers created successfully');
        return true;
    }
    
    generateInitialParticles() {
        this.particles = [];
        
        for (let i = 0; i < this.particleCount; i++) {
            this.addParticle();
        }
        
        console.log('🎮 Particle System: Generated', this.particles.length, 'initial particles');
    }
    
    addParticle() {
        const particle = {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 2.0 * this.speed,
            vy: (Math.random() - 0.5) * 2.0 * this.speed,
            size: this.particleSize * (0.5 + Math.random() * 0.5),
            color: this.getSaturatedColor(),
            life: 1.0,
            decay: 0.0001 + Math.random() * 0.0002, // Much slower decay - particles live 10x longer
            // Initialize beat multipliers
            beatSizeMultiplier: 1.0,
            beatSpeedMultiplier: 1.0,
            targetBeatSizeMultiplier: undefined,
            targetBeatSpeedMultiplier: undefined,
            beatDecayTimer: undefined,
            // Twinkle properties
            twinkle: Math.random() < this.twinkleIntensity, // Random chance based on intensity
            twinklePhase: Math.random() * Math.PI * 2, // Random starting phase
            twinkleSpeed: this.twinkleSpeed * (0.5 + Math.random() * 1.5), // Varied speed (0.5x to 2x base)
            twinkleMultiplier: 1.0, // Current brightness multiplier
            // Star shape properties
            starShape: Math.random() < this.starPercentage // Random chance based on star percentage
        };
        
        this.particles.push(particle);
    }
    
    getSaturatedColor() {
        // Get a random base color
        const baseColor = this.colors[Math.floor(Math.random() * this.colors.length)];
        
        // Apply saturation: 0.0 = white, 1.0 = full color
        const r = baseColor[0] * this.saturation + (1.0 - this.saturation);
        const g = baseColor[1] * this.saturation + (1.0 - this.saturation);
        const b = baseColor[2] * this.saturation + (1.0 - this.saturation);
        
        return [r, g, b];
    }
    
    update(audioFeatures = null, beatInfo = null) {
        if (!this.gl || !this.program) return;
        
        // Update particles with beat information
        this.updateParticles(audioFeatures, beatInfo);
        
        // Render particles
        this.render();
    }
    
    updateParticles(audioFeatures, beatInfo = null) {
        // Remove dead particles and add new ones
        this.particles = this.particles.filter(particle => {
            particle.life -= particle.decay;
            return particle.life > 0;
        });
        
        // Handle beat effects
        let extraParticles = 0;
        if (beatInfo && beatInfo.beat) {
            // Pass beatReact state to getBeatEffects to determine if effects should be applied
            const beatEffects = this.manager.beatDetector.getBeatEffects(this.beatReact);
            extraParticles = beatEffects.extraParticles;
            
            // Debug beat react status (very rarely)
            if (beatInfo.beat && this.beatReact && beatEffects.sizeMultiplier > 1.0 && Math.random() < 0.01) {
                console.log('🥁 Beat React ACTIVE:', { 
                    beatDetected: beatInfo.beat,
                    beatReactEnabled: this.beatReact,
                    sizeMultiplier: beatEffects.sizeMultiplier,
                    speedMultiplier: beatEffects.speedMultiplier,
                    extraParticles: beatEffects.extraParticles
                });
            }
            
            // Apply beat effects to existing particles (only if individual controls are enabled)
            this.particles.forEach(particle => {
                // Store the target beat multipliers for smooth decay
                particle.targetBeatSizeMultiplier = this.beatSize ? beatEffects.sizeMultiplier : 1.0;
                particle.targetBeatSpeedMultiplier = this.beatSpeed ? beatEffects.speedMultiplier : 1.0;
                
                // Set current multipliers to target (instant beat response)
                particle.beatSizeMultiplier = particle.targetBeatSizeMultiplier;
                particle.beatSpeedMultiplier = particle.targetBeatSpeedMultiplier;
                
                // Reset decay timer
                particle.beatDecayTimer = 0.3; // 300ms beat effect duration
            });
        }
        
        // Add new particles to maintain count + beat effects (only if Beat Count/Generation is enabled)
        const beatExtraParticles = (this.beatCount || this.beatGeneration) ? extraParticles : 0;
        const targetCount = this.particleCount + beatExtraParticles;
        while (this.particles.length < targetCount) {
            this.addParticle();
        }
        
        // Update particle positions
        this.particles.forEach(particle => {
            // Decay beat effects smoothly (matching AM visualization behavior)
            if (particle.beatDecayTimer !== undefined) {
                particle.beatDecayTimer -= 0.016; // ~60fps
                if (particle.beatDecayTimer <= 0) {
                    particle.beatSizeMultiplier = 1.0;
                    particle.beatSpeedMultiplier = 1.0;
                    particle.beatDecayTimer = undefined;
                    particle.targetBeatSizeMultiplier = undefined;
                    particle.targetBeatSpeedMultiplier = undefined;
                } else {
                    // Smooth decay from beat multiplier to 1.0
                    // Use exponential decay for smooth transition
                    const decayProgress = particle.beatDecayTimer / 0.3; // 0.3s duration
                    const decayFactor = Math.pow(decayProgress, 2); // Quadratic decay for smooth curve
                    
                    // Interpolate between target beat multiplier and 1.0
                    const targetBeatSize = particle.targetBeatSizeMultiplier || 1.0;
                    const targetBeatSpeed = particle.targetBeatSpeedMultiplier || 1.0;
                    
                    particle.beatSizeMultiplier = 1.0 + (targetBeatSize - 1.0) * decayFactor;
                    particle.beatSpeedMultiplier = 1.0 + (targetBeatSpeed - 1.0) * decayFactor;
                }
            }
            
            // Update twinkle effect
            if (particle.twinkle) {
                particle.twinklePhase += particle.twinkleSpeed;
                // Calculate brightness multiplier using sine wave (0.3 to 1.7 range for good effect)
                particle.twinkleMultiplier = 1.0 + Math.sin(particle.twinklePhase) * 0.7;
            } else {
                particle.twinkleMultiplier = 1.0;
            }
            
            // Apply velocity with all speed multipliers
            const beatSpeedMultiplier = particle.beatSpeedMultiplier || 1.0;
            const energySpeedMultiplier = particle.energySpeedMultiplier || 1.0;
            const midSpeedMultiplier = particle.midSpeedMultiplier || 1.0;
            const totalSpeedMultiplier = beatSpeedMultiplier * energySpeedMultiplier * midSpeedMultiplier;
            particle.x += particle.vx * totalSpeedMultiplier;
            particle.y += particle.vy * totalSpeedMultiplier;
            
            // Apply gravity with bass multiplier
            const bassGravityMultiplier = particle.bassGravityMultiplier || 1.0;
            particle.vy += this.gravity * 0.1 * bassGravityMultiplier;
            
            // Audio reactivity
            if (audioFeatures && this.audioReactivity > 0) {
                // Calculate energy from frequencies or waveform
                let energy = 0;
                if (audioFeatures.frequencies && audioFeatures.frequencies.length > 0) {
                    // Calculate RMS energy from frequencies
                    const sum = audioFeatures.frequencies.reduce((acc, val) => acc + val * val, 0);
                    energy = Math.sqrt(sum / audioFeatures.frequencies.length);
                } else if (audioFeatures.waveform && audioFeatures.waveform.length > 0) {
                    // Calculate RMS energy from waveform
                    const sum = audioFeatures.waveform.reduce((acc, val) => acc + val * val, 0);
                    energy = Math.sqrt(sum / audioFeatures.waveform.length);
                }
                
                particle.vx += (Math.random() - 0.5) * energy * this.audioReactivity * 0.1;
                particle.vy += (Math.random() - 0.5) * energy * this.audioReactivity * 0.1;
            }
            
            // Energy React - continuous response to energy levels
            if (audioFeatures && this.energyReact && audioFeatures.energy !== undefined) {
                const energyLevel = audioFeatures.energy;
                
                // Energy Size - particles grow/shrink based on energy
                if (this.energySize) {
                    const energySizeMultiplier = 1.0 + (energyLevel * 0.5); // 1.0 to 1.5
                    particle.energySizeMultiplier = energySizeMultiplier;
                }
                
                // Energy Speed - particles move faster with higher energy
                if (this.energySpeed) {
                    const energySpeedMultiplier = 1.0 + (energyLevel * 0.3); // 1.0 to 1.3
                    particle.energySpeedMultiplier = energySpeedMultiplier;
                }
                
                // Energy Count - more particles with higher energy (handled in particle generation)
                if (this.energyCount) {
                    particle.energyCountMultiplier = 1.0 + (energyLevel * 0.2); // 1.0 to 1.2
                }
            }
            
            // Frequency React - response to frequency bands
            if (audioFeatures && this.frequencyReact && audioFeatures.frequencyBands) {
                const { bass, mid, treble } = audioFeatures.frequencyBands;
                
                // Bass React - affects particle size and gravity
                if (this.bassReact && bass !== undefined) {
                    particle.bassSizeMultiplier = 1.0 + (bass * 0.4); // 1.0 to 1.4
                    particle.bassGravityMultiplier = 1.0 + (bass * 0.2); // 1.0 to 1.2
                }
                
                // Mid React - affects particle speed and direction
                if (this.midReact && mid !== undefined) {
                    particle.midSpeedMultiplier = 1.0 + (mid * 0.3); // 1.0 to 1.3
                    particle.midDirectionMultiplier = 1.0 + (mid * 0.1); // 1.0 to 1.1
                }
                
                // Treble React - affects particle count and sparkle effects
                if (this.trebleReact && treble !== undefined) {
                    particle.trebleCountMultiplier = 1.0 + (treble * 0.2); // 1.0 to 1.2
                    particle.trebleSparkleMultiplier = 1.0 + (treble * 0.5); // 1.0 to 1.5
                }
            }
            
            // SPEED LIMITING - Prevent runaway acceleration (applied after all velocity modifications)
            const maxSpeed = 5.0 * this.speed; // Maximum speed per frame (scaled by speed setting)
            const currentSpeed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (currentSpeed > maxSpeed) {
                const scale = maxSpeed / currentSpeed;
                particle.vx *= scale;
                particle.vy *= scale;
            }
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
        });
    }
    
    render() {
        if (!this.gl || !this.program || this.particles.length === 0) {
            // Debug: Log why rendering is skipped
            if (!this.gl) console.log('🎮 WebGL: Render skipped - no GL context');
            if (!this.program) console.log('🎮 WebGL: Render skipped - no shader program');
            if (this.particles.length === 0) console.log('🎮 WebGL: Render skipped - no particles');
            return;
        }
        
        // Debug: Log render info occasionally
        if (Math.random() < 0.01) { // 1% chance to log
            const sampleParticle = this.particles[0];
            if (sampleParticle) {
                const beatSizeMultiplier = sampleParticle.beatSizeMultiplier || 1.0;
                const energySizeMultiplier = sampleParticle.energySizeMultiplier || 1.0;
                const bassSizeMultiplier = sampleParticle.bassSizeMultiplier || 1.0;
                const totalSizeMultiplier = beatSizeMultiplier * energySizeMultiplier * bassSizeMultiplier;
                const finalSize = sampleParticle.size * sampleParticle.life * totalSizeMultiplier;
                
                console.log('🎮 WebGL: Rendering', this.particles.length, 'particles. Sample particle:', {
                    baseSize: sampleParticle.size,
                    life: sampleParticle.life,
                    beatSizeMultiplier: beatSizeMultiplier,
                    energySizeMultiplier: energySizeMultiplier,
                    bassSizeMultiplier: bassSizeMultiplier,
                    totalSizeMultiplier: totalSizeMultiplier,
                    finalSize: finalSize
                });
            }
        }
        
        // Clear canvas
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // Transparent background
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        // Use shader program
        this.gl.useProgram(this.program);
        
        // Set uniforms
        this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.uniforms.time, performance.now() * 0.001);
        this.gl.uniform1f(this.uniforms.opacity, this.opacity);
        
        // Prepare particle data
        const positions = [];
        const colors = [];
        const sizes = [];
        const starShapes = [];
        
        this.particles.forEach(particle => {
            positions.push(particle.x, particle.y);
            
            // Apply twinkle effect to color brightness
            const twinkleMultiplier = particle.twinkleMultiplier || 1.0;
            const twinkledColor = [
                Math.min(1.0, particle.color[0] * twinkleMultiplier),
                Math.min(1.0, particle.color[1] * twinkleMultiplier),
                Math.min(1.0, particle.color[2] * twinkleMultiplier)
            ];
            colors.push(...twinkledColor);
            
            // Apply all size multipliers
            const beatSizeMultiplier = particle.beatSizeMultiplier || 1.0;
            const energySizeMultiplier = particle.energySizeMultiplier || 1.0;
            const bassSizeMultiplier = particle.bassSizeMultiplier || 1.0;
            const totalSizeMultiplier = beatSizeMultiplier * energySizeMultiplier * bassSizeMultiplier;
            sizes.push(particle.size * particle.life * totalSizeMultiplier);
            
            // Add star shape data (0.0 = circle, 1.0 = star)
            starShapes.push(particle.starShape ? 1.0 : 0.0);
        });
        
        // Upload position data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.attributes.position);
        this.gl.vertexAttribPointer(this.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
        
        // Upload color data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.attributes.color);
        this.gl.vertexAttribPointer(this.attributes.color, 3, this.gl.FLOAT, false, 0, 0);
        
        // Upload size data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(sizes), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.attributes.size);
        this.gl.vertexAttribPointer(this.attributes.size, 1, this.gl.FLOAT, false, 0, 0);
        
        // Upload star shape data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.starShapeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(starShapes), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.attributes.starShape);
        this.gl.vertexAttribPointer(this.attributes.starShape, 1, this.gl.FLOAT, false, 0, 0);
        
        // Enable blending for transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Draw particles
        this.gl.drawArrays(this.gl.POINTS, 0, this.particles.length);
        
        // Disable blending
        this.gl.disable(this.gl.BLEND);
    }
    
    start() {
        if (!this.isInitialized) {
            this.initialize();
        }
        console.log('🎮 Particle System: Started');
    }
    
    stop() {
        console.log('🎮 Particle System: Stopped');
    }
    
    onResize(width, height, oldWidth, oldHeight) {
        // Scale existing particles if needed
        if (oldWidth && oldHeight) {
            const scaleX = width / oldWidth;
            const scaleY = height / oldHeight;
            
            this.particles.forEach(particle => {
                particle.x *= scaleX;
                particle.y *= scaleY;
            });
        }
        
        console.log('🎮 Particle System: Resized to', width, 'x', height);
    }
    
    setColorScheme(schemeName) {
        if (this.colorSchemes[schemeName]) {
            this.currentColorScheme = schemeName;
            this.colors = this.colorSchemes[schemeName];
            
            // Update existing particles with new colors
            this.particles.forEach(particle => {
                particle.color = this.getSaturatedColor();
            });
            
            console.log('🎮 WebGL: Color scheme changed to:', schemeName);
        } else {
            console.warn('🎮 WebGL: Unknown color scheme:', schemeName);
        }
    }

    setSettings(settings) {
        // Only log occasionally to avoid spam
        if (Math.random() < 0.1) { // 10% chance to log
            console.log('🎮 WebGL: setSettings called with:', settings);
        }
        
        if (settings.particleCount !== undefined) {
            const oldCount = this.particleCount;
            this.particleCount = Math.max(100, Math.min(2000, settings.particleCount));
            
            // Adjust particle count in real-time
            if (this.particleCount > oldCount) {
                // Add more particles
                for (let i = 0; i < this.particleCount - oldCount; i++) {
                    this.addParticle();
                }
                console.log('🎮 WebGL: Added', this.particleCount - oldCount, 'new particles');
            } else if (this.particleCount < oldCount) {
                // Remove excess particles (remove oldest ones)
                this.particles = this.particles.slice(0, this.particleCount);
                console.log('🎮 WebGL: Removed', oldCount - this.particleCount, 'particles');
            }
        }
        
        if (settings.particleSize !== undefined) {
            const oldSize = this.particleSize;
            this.particleSize = Math.max(1, Math.min(20, settings.particleSize));
            
            // Update existing particle sizes proportionally
            const sizeRatio = this.particleSize / oldSize;
            this.particles.forEach(particle => {
                particle.size *= sizeRatio;
            });
            console.log('🎮 WebGL: Particle size changed from', oldSize, 'to', this.particleSize);
        }
        
        if (settings.speed !== undefined) {
            const oldSpeed = this.speed;
            this.speed = Math.max(0.1, Math.min(5, settings.speed));
            
            // Update existing particle velocities proportionally
            const speedRatio = this.speed / oldSpeed;
            this.particles.forEach(particle => {
                particle.vx *= speedRatio;
                particle.vy *= speedRatio;
            });
            console.log('🎮 WebGL: Speed changed from', oldSpeed, 'to', this.speed);
        }
        
        if (settings.gravity !== undefined) {
            const oldGravity = this.gravity;
            this.gravity = Math.max(0, Math.min(2, settings.gravity));
            console.log('🎮 WebGL: Gravity changed from', oldGravity, 'to', this.gravity);
            // Gravity affects all particles in real-time during updateParticles
        }
        
        if (settings.saturation !== undefined) {
            const oldSaturation = this.saturation;
            this.saturation = Math.max(0, Math.min(1, settings.saturation / 100)); // Convert 0-100 to 0.0-1.0
            console.log('🎮 WebGL: Saturation changed from', oldSaturation, 'to', this.saturation);
            
            // Update existing particle colors
            this.particles.forEach(particle => {
                particle.color = this.getSaturatedColor();
            });
        }
        
        if (settings.colorScheme !== undefined) {
            this.setColorScheme(settings.colorScheme);
        }
        
        if (settings.twinkleIntensity !== undefined) {
            const oldIntensity = this.twinkleIntensity;
            this.twinkleIntensity = Math.max(0, Math.min(1, settings.twinkleIntensity / 100)); // Convert 0-100 to 0.0-1.0
            console.log('🎮 WebGL: Twinkle intensity changed from', oldIntensity, 'to', this.twinkleIntensity);
            
            // Update existing particles - reassign twinkle status based on new intensity
            this.particles.forEach(particle => {
                particle.twinkle = Math.random() < this.twinkleIntensity;
                if (!particle.twinkle) {
                    particle.twinkleMultiplier = 1.0; // Reset non-twinkling particles
                }
            });
        }
        
        if (settings.starPercentage !== undefined) {
            const oldPercentage = this.starPercentage;
            this.starPercentage = Math.max(0, Math.min(1, settings.starPercentage / 100)); // Convert 0-100 to 0.0-1.0
            console.log('🎮 WebGL: Star percentage changed from', oldPercentage, 'to', this.starPercentage);
            
            // Update existing particles - reassign star shape based on new percentage
            this.particles.forEach(particle => {
                particle.starShape = Math.random() < this.starPercentage;
            });
        }
        
        if (settings.opacity !== undefined) {
            const oldOpacity = this.opacity;
            this.opacity = Math.max(0, Math.min(1, settings.opacity / 100)); // Convert 0-100 to 0.0-1.0
            console.log('🎮 WebGL: Opacity changed from', oldOpacity, 'to', this.opacity);
            // Opacity is applied in real-time during rendering via uniform
        }
        
        if (settings.audioReactivity !== undefined) {
            this.audioReactivity = Math.max(0, Math.min(1, settings.audioReactivity / 100));
            // Audio reactivity affects all particles in real-time during updateParticles
        }
        
        if (settings.beatReact !== undefined) {
            this.beatReact = settings.beatReact;
            // Beat react affects all particles in real-time during updateParticles
        }
        
        if (settings.beatSize !== undefined) {
            this.beatSize = settings.beatSize;
        }
        
        if (settings.beatSpeed !== undefined) {
            this.beatSpeed = settings.beatSpeed;
        }
        
        if (settings.beatCount !== undefined) {
            this.beatCount = settings.beatCount;
        }
        
        if (settings.beatGeneration !== undefined) {
            this.beatGeneration = settings.beatGeneration;
        }
        
        if (settings.energyReact !== undefined) {
            this.energyReact = settings.energyReact;
        }
        
        if (settings.energySize !== undefined) {
            this.energySize = settings.energySize;
        }
        
        if (settings.energySpeed !== undefined) {
            this.energySpeed = settings.energySpeed;
        }
        
        if (settings.energyCount !== undefined) {
            this.energyCount = settings.energyCount;
        }
        
        if (settings.frequencyReact !== undefined) {
            this.frequencyReact = settings.frequencyReact;
        }
        
        if (settings.bassReact !== undefined) {
            this.bassReact = settings.bassReact;
        }
        
        if (settings.midReact !== undefined) {
            this.midReact = settings.midReact;
        }
        
        if (settings.trebleReact !== undefined) {
            this.trebleReact = settings.trebleReact;
        }
        
        console.log('🎮 Particle System: Settings updated and applied to existing particles', settings);
    }
    
    getSettings() {
        return {
            particleCount: this.particleCount,
            particleSize: this.particleSize,
            speed: this.speed,
            gravity: this.gravity,
            audioReactivity: this.audioReactivity * 100,
            beatReact: this.beatReact,
            beatSize: this.beatSize,
            beatSpeed: this.beatSpeed,
            beatCount: this.beatCount,
            beatGeneration: this.beatGeneration,
            energyReact: this.energyReact,
            energySize: this.energySize,
            energySpeed: this.energySpeed,
            energyCount: this.energyCount,
            frequencyReact: this.frequencyReact,
            bassReact: this.bassReact,
            midReact: this.midReact,
            trebleReact: this.trebleReact
        };
    }
}
