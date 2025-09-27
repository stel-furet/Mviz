/*
Fluid Dynamics Visualization System
Based on Pavel Dobryakov's WebGL Fluid Simulation
Integrated following Infinite Zoom pattern exactly
*/

class FluidDynamicsVisualization {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.canvas = null;
        this.gl = null;
        this.isActive = false;
        this.animationRunning = false;
        
        // Canvas properties (mirror Infinite Zoom)
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        
        // Performance monitoring (mirror Infinite Zoom)
        this.lastFrameTime = 0;
        this.targetFPS = 30;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Audio integration
        this.audioFeatures = null;
        this.energyHistory = [];
        this.energySmoothing = 0.7;
        this.currentEnergy = 0;
        
        // Independent animation loop
        this.independentAnimationFrame = null;
        
        // Pavel's fluid system will be initialized here
        this.fluidSystem = null;
        
        // Fluid simulation configuration (from Pavel's script)
        this.config = {
            SIM_RESOLUTION: 128,
            DYE_RESOLUTION: 1024,
            DENSITY_DISSIPATION: 1,
            VELOCITY_DISSIPATION: 0.2,
            PRESSURE: 0.8,
            PRESSURE_ITERATIONS: 20,
            CURL: 30,
            SPLAT_RADIUS: 0.25,
            SPLAT_FORCE: 6000,
            SHADING: true,
            COLORFUL: true,
            COLOR_UPDATE_SPEED: 10,
            PAUSED: false,
            BACK_COLOR: { r: 0, g: 0, b: 0 },
            TRANSPARENT: false,
            BLOOM: true,
            BLOOM_ITERATIONS: 8,
            BLOOM_RESOLUTION: 256,
            BLOOM_INTENSITY: 0.8,
            BLOOM_THRESHOLD: 0.6,
            BLOOM_SOFT_KNEE: 0.7,
            SUNRAYS: true,
            SUNRAYS_RESOLUTION: 196,
            SUNRAYS_WEIGHT: 1.0,
        };
        
        console.log('🌊 Fluid Dynamics Visualization initialized (mirroring Infinite Zoom)');
    }
    
    initialize() {
        if (!this.canvas) {
            this.createCanvas();
        }
        
        if (!this.gl) {
            this.initializeWebGL();
        }
        
        if (this.gl) {
            this.initializeFluidSystem();
            console.log('🌊 Fluid Dynamics initialization complete');
            return true;
        }
        
        console.error('🌊 Failed to initialize Fluid Dynamics - WebGL not available');
        return false;
    }
    
    createCanvas() {
        // Create canvas element (mirror Infinite Zoom exactly)
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'fluidCanvas';
        this.canvas.className = 'fluid-canvas';
        
        // Set canvas style (mirror Infinite Zoom exactly)
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '6'; // Above WebGL particles (5), below Kaleidoscope
        
        // Initially hidden (mirror Infinite Zoom)
        this.canvas.style.display = 'none';
        this.canvas.style.visibility = 'hidden';
        this.canvas.style.opacity = '0';
        
        // Add to visualization container (same as Infinite Zoom)
        const container = document.getElementById('visualizationContainer');
        if (container) {
            container.appendChild(this.canvas);
            
            // Resize canvas to fill container (mirror Infinite Zoom)
            this.resize();
            
            console.log('🌊 Fluid canvas created and added to container');
        } else {
            console.error('🌊 visualizationContainer not found!');
        }
    }
    
    initializeWebGL() {
        if (!this.canvas) {
            console.error('🌊 Canvas not available for WebGL initialization!');
            return;
        }
        
        // Try WebGL2 first, fallback to WebGL (mirror WebGL particles pattern)
        try {
            this.gl = this.canvas.getContext('webgl2', {
                alpha: true,
                antialias: true,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });
            
            if (this.gl) {
                console.log('🌊 WebGL2 context created for Fluid Dynamics');
            }
        } catch (error) {
            console.warn('🌊 WebGL2 not supported, trying WebGL1:', error);
        }
        
        // Fallback to WebGL1
        if (!this.gl) {
            try {
                this.gl = this.canvas.getContext('webgl', {
                    alpha: true,
                    antialias: true,
                    depth: false,
                    stencil: false,
                    preserveDrawingBuffer: false,
                    powerPreference: 'high-performance'
                });
                
                if (this.gl) {
                    console.log('🌊 WebGL1 context created for Fluid Dynamics');
                }
            } catch (error) {
                console.error('🌊 WebGL not supported for Fluid Dynamics:', error);
            }
        }
        
        if (!this.gl) {
            console.error('🌊 Failed to create WebGL context for Fluid Dynamics');
            return;
        }
        
        console.log('🌊 WebGL context ready for Fluid Dynamics');
    }
    
    initializeFluidSystem() {
        // This will be filled with Pavel's complete system in Phase 2
        console.log('🌊 Initializing Pavel\'s complete fluid system...');
        
        if (!this.gl) {
            console.error('🌊 No WebGL context for fluid system initialization');
            return;
        }
        
        // Create test shader program for verification
        this.createTestShaderProgram();
        
        // Initialize test animation
        this.fluidSystem = {
            initialized: true,
            testMode: true,
            startTime: Date.now()
        };
        
        console.log('🌊 Fluid test system initialized');
    }
    
    createTestShaderProgram() {
        const gl = this.gl;
        
        // Vertex shader
        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        
        // Fragment shader with animated pattern that responds to config
        const fragmentShaderSource = `
            precision mediump float;
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform float u_pressure;
            uniform float u_curl;
            uniform float u_viscosity;
            uniform float u_colorful;
            varying vec2 v_uv;
            
            void main() {
                vec2 uv = v_uv;
                float time = u_time * 0.001 * u_pressure; // Pressure affects speed
                
                // Viscosity affects wave frequency
                float freq = 5.0 / (u_viscosity + 0.1);
                
                // Curl affects rotation
                float rotation = u_curl * 0.1;
                vec2 rotUV = vec2(
                    uv.x * cos(rotation) - uv.y * sin(rotation),
                    uv.x * sin(rotation) + uv.y * cos(rotation)
                );
                
                // Animated pattern with config influence
                float r = sin(rotUV.x * freq + time) * 0.3 + 0.5;
                float g = sin(rotUV.y * freq * 1.4 + time * 1.2) * 0.3 + 0.7;
                float b = sin((rotUV.x + rotUV.y) * freq * 0.8 + time * 0.8) * 0.3 + 0.9;
                
                // Apply colorful setting
                if (u_colorful < 0.5) {
                    // Monochrome mode
                    float gray = (r + g + b) / 3.0;
                    r = g = b = gray;
                }
                
                gl_FragColor = vec4(r, g, b, 1.0);
            }
        `;
        
        try {
            const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            
            if (vertexShader && fragmentShader) {
                this.testProgram = gl.createProgram();
                gl.attachShader(this.testProgram, vertexShader);
                gl.attachShader(this.testProgram, fragmentShader);
                gl.linkProgram(this.testProgram);
                
                if (gl.getProgramParameter(this.testProgram, gl.LINK_STATUS)) {
                    // Create vertex buffer for full-screen quad
                    this.testVertexBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.testVertexBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                        -1, -1,  1, -1,  -1, 1,
                        -1, 1,   1, -1,   1, 1
                    ]), gl.STATIC_DRAW);
                    
                    console.log('🌊 Test shader program created successfully');
                } else {
                    console.error('🌊 Failed to link test program:', gl.getProgramInfoLog(this.testProgram));
                }
            }
        } catch (error) {
            console.error('🌊 Error creating test shader program:', error);
        }
    }
    
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('🌊 Shader compilation error:', gl.getShaderInfoLog(shader));
            return null;
        }
        
        return shader;
    }
    
    // Method to update config and trigger visual changes
    updateConfig(configChanges) {
        console.log('🌊 updateConfig called with:', configChanges, 'config exists:', !!this.config);
        
        if (!this.config) {
            console.warn('🌊 Config not initialized, cannot update');
            return;
        }
        
        // Apply config changes
        Object.assign(this.config, configChanges);
        
        console.log('🌊 Fluid config updated:', configChanges, 'new config:', this.config);
        
        // Force a redraw on next frame to show changes immediately
        if (this.isActive) {
            this.lastFrameTime = 0; // Reset frame timer to force immediate redraw
            console.log('🌊 Forced redraw trigger');
        }
    }
    
    start() {
        if (!this.canvas || !this.gl) {
            console.warn('🌊 Cannot start Fluid Dynamics - not properly initialized');
            return;
        }
        
        this.isActive = true;
        this.animationRunning = true;
        
        // Show canvas
        this.canvas.style.display = 'block';
        this.canvas.style.visibility = 'visible';
        this.canvas.style.opacity = '1';
        
        // Start independent animation loop
        this.startIndependentAnimationLoop();
        
        console.log('🌊 Fluid Dynamics started with independent animation loop');
    }
    
    forceInitialRender() {
        // Ensure proper initialization with multiple fallback strategies
        const attemptRender = (attempts = 0) => {
            if (attempts > 10) {
                console.warn('🌊 Failed to initialize rendering after 10 attempts');
                return;
            }
            
            // Check if everything is ready
            if (!this.canvas || !this.gl || !this.testProgram || !this.isActive) {
                console.log(`🌊 Render attempt ${attempts + 1}: Not ready yet, retrying...`);
                setTimeout(() => attemptRender(attempts + 1), 50);
                return;
            }
            
            // Force resize
            this.resize();
            
            // Set viewport
            if (this.gl) {
                this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
            }
            
            // Force immediate draw
            this.lastFrameTime = 0; // Reset to force immediate render
            this.draw();
            
            console.log('🌊 Initial render forced successfully');
        };
        
        // Start attempting
        attemptRender();
    }
    
    stop() {
        console.log('🌊 STOP CALLED - isActive going from', this.isActive, 'to false');
        this.isActive = false;
        this.animationRunning = false;
        
        // Stop independent animation loop
        this.stopIndependentAnimationLoop();
        
        // Hide canvas
        if (this.canvas) {
            this.canvas.style.display = 'none';
            this.canvas.style.visibility = 'hidden';
            this.canvas.style.opacity = '0';
        }
        
        console.log('🌊 Fluid Dynamics stopped with independent animation loop');
    }
    
    startIndependentAnimationLoop() {
        if (this.independentAnimationFrame) {
            cancelAnimationFrame(this.independentAnimationFrame);
        }
        
        const animate = () => {
            if (!this.isActive) return; // Stop loop if deactivated
            
            // Get audio features independently
            this.updateIndependentAudioFeatures();
            
            // Update and draw
            this.update(this.audioFeatures);
            this.draw();
            
            // Continue loop
            this.independentAnimationFrame = requestAnimationFrame(animate);
        };
        
        animate();
        console.log('🌊 Independent animation loop started');
    }
    
    stopIndependentAnimationLoop() {
        if (this.independentAnimationFrame) {
            cancelAnimationFrame(this.independentAnimationFrame);
            this.independentAnimationFrame = null;
        }
        console.log('🌊 Independent animation loop stopped');
    }
    
    updateIndependentAudioFeatures() {
        // Get audio features completely independently from any other system
        let audioFeatures = null;
        
        // Try AI Autopilot first
        if (this.visualizer.aiAutopilot && this.visualizer.aiAutopilot.audioAnalyzer) {
            try {
                audioFeatures = this.visualizer.aiAutopilot.audioAnalyzer.getCurrentFeatures();
            } catch (error) {
                // Ignore errors, use fallback
            }
        }
        
        // Try AudioMotion fallback
        if (!audioFeatures && this.visualizer.audioMotion && this.visualizer.audioMotion.analyser) {
            try {
                // Generate basic audio features from AudioMotion data
                const dataArray = new Uint8Array(this.visualizer.audioMotion.analyser.frequencyBinCount);
                this.visualizer.audioMotion.analyser.getByteFrequencyData(dataArray);
                
                // Calculate energy
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const energy = sum / (dataArray.length * 255);
                
                audioFeatures = {
                    energy: energy,
                    beat: false, // Simple implementation
                    tempo: 120,
                    dominantFrequency: 1000
                };
            } catch (error) {
                // Ignore errors, use test data
            }
        }
        
        // Final fallback: Generate test data
        if (!audioFeatures) {
            audioFeatures = {
                energy: 0.5 + Math.sin(Date.now() / 1000) * 0.3,
                beat: Math.random() > 0.95,
                tempo: 120,
                dominantFrequency: 1000
            };
        }
        
        this.audioFeatures = audioFeatures;
    }
    
    update(audioFeatures) {
        if (!this.isActive || !this.fluidSystem) return;
        
        // Store audio features for processing
        this.audioFeatures = audioFeatures;
        
        // Update energy history (mirror Infinite Zoom)
        if (audioFeatures && audioFeatures.energy !== undefined) {
            this.energyHistory.push(audioFeatures.energy);
            if (this.energyHistory.length > 30) { // Keep last 30 frames
                this.energyHistory.shift();
            }
            
            // Smooth energy
            this.currentEnergy = this.currentEnergy * this.energySmoothing + 
                               audioFeatures.energy * (1 - this.energySmoothing);
        }
        
        // Pavel's fluid update logic will go here
        if (Math.random() < 0.001) { // Occasional debug
            console.log('🌊 Fluid update - energy:', this.currentEnergy.toFixed(3));
        }
    }
    
    draw() {
        // Only render if explicitly active (independent of all other components)
        if (!this.isActive) return;
        
        if (!this.gl || !this.fluidSystem) return;
        
        // Frame rate limiting (mirror Infinite Zoom)
        const now = performance.now();
        if (now - this.lastFrameTime < this.frameInterval) {
            return;
        }
        this.lastFrameTime = now;
        
        const gl = this.gl;
        
        // Clear viewport
        gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Render test pattern if available
        if (this.testProgram && this.testVertexBuffer) {
            try {
                gl.useProgram(this.testProgram);
                
                // Set uniforms
                const timeLocation = gl.getUniformLocation(this.testProgram, 'u_time');
                const resolutionLocation = gl.getUniformLocation(this.testProgram, 'u_resolution');
                const pressureLocation = gl.getUniformLocation(this.testProgram, 'u_pressure');
                const curlLocation = gl.getUniformLocation(this.testProgram, 'u_curl');
                const viscosityLocation = gl.getUniformLocation(this.testProgram, 'u_viscosity');
                const colorfulLocation = gl.getUniformLocation(this.testProgram, 'u_colorful');
                
                if (timeLocation) {
                    gl.uniform1f(timeLocation, Date.now() - this.fluidSystem.startTime);
                }
                
                if (resolutionLocation) {
                    gl.uniform2f(resolutionLocation, this.canvasWidth, this.canvasHeight);
                }
                
                // Pass config values to shader (with safety checks)
                if (pressureLocation) {
                    gl.uniform1f(pressureLocation, this.config?.PRESSURE || 0.8);
                }
                
                if (curlLocation) {
                    gl.uniform1f(curlLocation, (this.config?.CURL || 30) * 0.01); // Scale down for shader
                }
                
                if (viscosityLocation) {
                    gl.uniform1f(viscosityLocation, this.config?.VELOCITY_DISSIPATION || 0.2);
                }
                
                if (colorfulLocation) {
                    gl.uniform1f(colorfulLocation, (this.config?.COLORFUL !== false) ? 1.0 : 0.0);
                }
                
                // Bind vertex buffer and draw
                gl.bindBuffer(gl.ARRAY_BUFFER, this.testVertexBuffer);
                const positionLocation = gl.getAttribLocation(this.testProgram, 'a_position');
                if (positionLocation >= 0) {
                    gl.enableVertexAttribArray(positionLocation);
                    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                    gl.disableVertexAttribArray(positionLocation);
                }
                
        if (Math.random() < 0.01) { // Reduced debug frequency
            console.log('🌊 Fluid test pattern rendered successfully - canvas visible:', 
                this.canvas.style.display, 'opacity:', this.canvas.style.opacity, 'visibility:', this.canvas.style.visibility);
        }
                
            } catch (error) {
                console.error('🌊 Error rendering test pattern:', error);
            }
        } else {
            // Fallback: simple color clear
            const time = (Date.now() - this.fluidSystem.startTime) * 0.001;
            const r = Math.sin(time * 0.5) * 0.3 + 0.5;
            const g = Math.sin(time * 0.7) * 0.3 + 0.7;
            const b = Math.sin(time * 0.9) * 0.3 + 0.9;
            
            gl.clearColor(r, g, b, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            if (Math.random() < 0.01) { // Occasional debug
                console.log('🌊 Fluid fallback color rendered:', r.toFixed(2), g.toFixed(2), b.toFixed(2));
            }
        }
    }
    
    resize() {
        if (!this.canvas) {
            console.error('🌊 Canvas not available for resize!');
            return;
        }
        
        // Get container dimensions (mirror Infinite Zoom exactly)
        const container = document.getElementById('visualizationContainer');
        if (!container) {
            console.error('🌊 Container not found during resize!');
            return;
        }
        
        const rect = container.getBoundingClientRect();
        
        // Ensure we have valid container dimensions
        if (rect.width === 0 || rect.height === 0) {
            console.warn('🌊 Container has zero dimensions, using defaults');
            this.canvasWidth = 800;
            this.canvasHeight = 600;
        } else {
            this.canvasWidth = rect.width;
            this.canvasHeight = rect.height;
        }
        
        // Set canvas dimensions
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        // Update WebGL viewport
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        // Notify current visualization of size change
        if (this.fluidSystem && this.fluidSystem.onResize) {
            this.fluidSystem.onResize(this.canvasWidth, this.canvasHeight);
        }
        
        console.log('🌊 Fluid canvas resized to:', this.canvasWidth, 'x', this.canvasHeight);
    }
    
    onResize(width, height, oldWidth, oldHeight) {
        // External resize notification (mirror Infinite Zoom)
        this.resize();
        
        if (Math.abs(width - oldWidth) > 1 || Math.abs(height - oldHeight) > 1) {
            console.log('🌊 Fluid resize detected:', oldWidth + 'x' + oldHeight, '→', width + 'x' + height);
        }
    }
    
    // Utility methods (mirror Infinite Zoom)
    getCanvasDataURL() {
        if (!this.canvas) return null;
        try {
            return this.canvas.toDataURL();
        } catch (error) {
            console.error('🌊 Error getting canvas data URL:', error);
            return null;
        }
    }
    
    getDebugInfo() {
        return {
            isActive: this.isActive,
            animationRunning: this.animationRunning,
            canvasSize: `${this.canvasWidth}x${this.canvasHeight}`,
            hasWebGL: !!this.gl,
            fluidSystemReady: !!(this.fluidSystem && this.fluidSystem.initialized),
            currentEnergy: this.currentEnergy.toFixed(3)
        };
    }
}

// Export for global access (mirror other visualization patterns)
if (typeof window !== 'undefined') {
    window.FluidDynamicsVisualization = FluidDynamicsVisualization;
}
