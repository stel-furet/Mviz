// ========================================
// WebGL Plugin Architecture
// ========================================

// Base class for all WebGL visualizations
class WebGLVisualization {
    constructor(manager) {
        this.manager = manager;
        this.gl = manager.gl;
        this.canvas = manager.canvas;
        this.isActive = false;
        this.pluginName = 'base';
        this.pluginVersion = '1.0.0';
        this.settings = {};
    }
    
    // Required methods - must be implemented by plugins
    initialize() { 
        throw new Error(`Plugin ${this.pluginName} must implement initialize()`); 
    }
    
    update(audioFeatures, beatInfo) { 
        throw new Error(`Plugin ${this.pluginName} must implement update()`); 
    }
    
    render() { 
        throw new Error(`Plugin ${this.pluginName} must implement render()`); 
    }
    
    setSettings(settings) { 
        throw new Error(`Plugin ${this.pluginName} must implement setSettings()`); 
    }
    
    start() { 
        this.isActive = true; 
        console.log(`🎮 WebGL Plugin ${this.pluginName} started`);
    }
    
    stop() { 
        this.isActive = false; 
        console.log(`🎮 WebGL Plugin ${this.pluginName} stopped`);
    }
    
    // Optional methods - can be overridden by plugins
    resize(width, height) { 
        // Default implementation - plugins can override
    }
    
    destroy() { 
        // Default cleanup - plugins can override
        this.stop();
    }
}

// Plugin Registry for managing WebGL visualizations
class WebGLPluginRegistry {
    constructor(manager) {
        this.manager = manager;
        this.plugins = new Map();
        this.currentPlugin = null;
        this.defaultPlugin = 'fluid'; // Set up for fluid as default
        this.currentPluginName = null;
    }
    
    // Register all plugins at initialization
    initialize() {
        console.log('🎮 WebGL Plugin Registry: Initializing...');
        
        // Register built-in plugins
        this.register('particle', WebGLParticleSystem);
        this.register('fluid', WebGLFluidSystem);
        
        // Load saved plugin or default
        const savedPlugin = localStorage.getItem('webglCurrentPlugin');
        const pluginToLoad = savedPlugin || this.defaultPlugin;
        
        console.log(`🌊 WebGL Plugin Registry: savedPlugin="${savedPlugin}", defaultPlugin="${this.defaultPlugin}", loading="${pluginToLoad}"`);
        
        this.switchPlugin(pluginToLoad);
        console.log(`🎮 WebGL Plugin Registry: Initialized with ${pluginToLoad}`);
    }
    
    register(name, pluginClass) {
        this.plugins.set(name, pluginClass);
        console.log(`🎮 WebGL Plugin registered: ${name}`);
    }
    
    loadPlugin(name) {
        const PluginClass = this.plugins.get(name);
        if (!PluginClass) {
            throw new Error(`WebGL Plugin '${name}' not found`);
        }
        return new PluginClass(this.manager);
    }
    
    switchPlugin(name) {
        console.log(`🌊 WebGL Plugin Registry: Attempting to switch to "${name}"`);
        
        if (this.currentPlugin) {
            console.log(`🌊 WebGL Plugin Registry: Stopping current plugin "${this.currentPluginName}"`);
            this.currentPlugin.stop();
            this.currentPlugin.destroy();
        }
        
        console.log(`🌊 WebGL Plugin Registry: Loading plugin "${name}"`);
        this.currentPlugin = this.loadPlugin(name);
        this.currentPluginName = name;
        
        console.log(`🌊 WebGL Plugin Registry: Plugin "${name}" loaded, class:`, this.currentPlugin.constructor.name);
        
        // Save to localStorage
        localStorage.setItem('webglCurrentPlugin', name);
        
        console.log(`🌊 WebGL Plugin Registry: Initializing plugin "${name}"`);
        const initResult = this.currentPlugin.initialize();
        
        if (initResult === false) {
            console.error(`🌊 WebGL Plugin Registry: Plugin "${name}" initialization FAILED! Falling back to particle system.`);
            this.currentPlugin = this.loadPlugin('particle');
            this.currentPluginName = 'particle';
            localStorage.setItem('webglCurrentPlugin', 'particle');
            this.currentPlugin.initialize();
        }
        
        this.currentPlugin.start();
        
        console.log(`🎮 WebGL Plugin switched to: ${this.currentPluginName} (requested: ${name})`);
    }
    
    getCurrentPlugin() {
        return this.currentPlugin;
    }
    
    getCurrentPluginName() {
        return this.currentPluginName;
    }
    
    getAvailablePlugins() {
        return Array.from(this.plugins.keys());
    }
}

// ========================================
// WebGL Beat Detection System - Independent and Improved
// ========================================
class WebGLBeatDetector {
    constructor() {
        // Beat detection parameters (improved from Kaleidoscope/AudioAnalyzer)
        this.beatThreshold = 1.05; // More sensitive than before (was 1.15)
        this.energySmoothing = 0.85; // Smoother than AudioAnalyzer (0.9)
        this.fluxThreshold = 0.05; // More sensitive than before (was 0.08)
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
        this.beatSizeBoost = 3.0; // Size multiplier on beat (increased from 1.5)
        this.beatSpeedBoost = 4.0; // Speed multiplier on beat (increased from 2.0)
        this.beatCountBoost = 8; // Extra particles on beat (increased from 3)
        
        console.log('🥁 WebGL Beat Detector initialized');
    }
    
    update(audioFeatures) {
        if (!audioFeatures) {
            console.log('🥁 WebGL Beat Detector: No audio features provided');
            return;
        }
        
        // Debug logging (minimal for performance)
        if (Math.random() < 0.0001) { // 0.01% chance to log (very rare)
            console.log('🥁 WebGL Beat Detector update - audioFeatures:', {
                frequencies: audioFeatures.frequencies ? audioFeatures.frequencies.length : 'none',
                waveform: audioFeatures.waveform ? audioFeatures.waveform.length : 'none',
                energy: audioFeatures.energy,
                beat: audioFeatures.beat,
                currentEnergy: this.currentEnergy,
                smoothedEnergy: this.smoothedEnergy,
                beatDetected: this.beatDetected,
                beatConfidence: this.beatConfidence
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
            
            // Log beat detection for debugging (reduced frequency for performance)
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

// ========================================
// Jos Stam Stable Fluids - Clean CPU Implementation
// Direct translation from original C code
// ========================================

class JosStamFluid {
    constructor(N) {
        this.N = N; // Grid size
        this.size = (N + 2) * (N + 2); // Total array size including boundaries
        this.dt = 0.1; // Time step
        this.diff = 0.0001; // Diffusion constant
        this.visc = 0.0001; // Viscosity constant
        
        // Velocity fields
        this.u = new Float32Array(this.size);
        this.v = new Float32Array(this.size);
        this.u_prev = new Float32Array(this.size);
        this.v_prev = new Float32Array(this.size);
        
        // Density field
        this.dens = new Float32Array(this.size);
        this.dens_prev = new Float32Array(this.size);
        
        console.log('🌊 Jos Stam Fluid initialized - Grid:', N, 'Total size:', this.size);
    }
    
    // Array index function (Jos Stam's IX macro)
    IX(i, j) {
        return i + (this.N + 2) * j;
    }
    
    // Jos Stam's add_source function (exact from paper)
    add_source(x, s, dt) {
        for (let i = 0; i < this.size; i++) {
            x[i] += dt * s[i];
        }
    }
    
    // Jos Stam's set_bnd function (exact from paper)
    set_bnd(b, x) {
        const N = this.N;
        
        // Set horizontal boundaries
        for (let i = 1; i <= N; i++) {
            x[this.IX(0, i)] = b === 1 ? -x[this.IX(1, i)] : x[this.IX(1, i)];
            x[this.IX(N + 1, i)] = b === 1 ? -x[this.IX(N, i)] : x[this.IX(N, i)];
            x[this.IX(i, 0)] = b === 2 ? -x[this.IX(i, 1)] : x[this.IX(i, 1)];
            x[this.IX(i, N + 1)] = b === 2 ? -x[this.IX(i, N)] : x[this.IX(i, N)];
        }
        
        // Set corner boundaries
        x[this.IX(0, 0)] = 0.5 * (x[this.IX(1, 0)] + x[this.IX(0, 1)]);
        x[this.IX(0, N + 1)] = 0.5 * (x[this.IX(1, N + 1)] + x[this.IX(0, N)]);
        x[this.IX(N + 1, 0)] = 0.5 * (x[this.IX(N, 0)] + x[this.IX(N + 1, 1)]);
        x[this.IX(N + 1, N + 1)] = 0.5 * (x[this.IX(N, N + 1)] + x[this.IX(N + 1, N)]);
    }
    
    // Jos Stam's diffuse function (exact from paper)
    diffuse(b, x, x0, diff, dt) {
        const N = this.N;
        const a = dt * diff * N * N;
        
        // Gauss-Seidel relaxation (20 iterations as per Jos Stam)
        for (let k = 0; k < 20; k++) {
            for (let i = 1; i <= N; i++) {
                for (let j = 1; j <= N; j++) {
                    x[this.IX(i, j)] = (x0[this.IX(i, j)] + a * (
                        x[this.IX(i - 1, j)] + x[this.IX(i + 1, j)] +
                        x[this.IX(i, j - 1)] + x[this.IX(i, j + 1)]
                    )) / (1 + 4 * a);
                }
            }
            this.set_bnd(b, x);
        }
    }
    
    // Jos Stam's advect function (exact from paper)
    advect(b, d, d0, u, v, dt) {
        const N = this.N;
        const dt0 = dt * N;
        
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= N; j++) {
                let x = i - dt0 * u[this.IX(i, j)];
                let y = j - dt0 * v[this.IX(i, j)];
                
                if (x < 0.5) x = 0.5;
                if (x > N + 0.5) x = N + 0.5;
                let i0 = Math.floor(x);
                let i1 = i0 + 1;
                
                if (y < 0.5) y = 0.5;
                if (y > N + 0.5) y = N + 0.5;
                let j0 = Math.floor(y);
                let j1 = j0 + 1;
                
                let s1 = x - i0;
                let s0 = 1 - s1;
                let t1 = y - j0;
                let t0 = 1 - t1;
                
                d[this.IX(i, j)] = s0 * (t0 * d0[this.IX(i0, j0)] + t1 * d0[this.IX(i0, j1)]) +
                                  s1 * (t0 * d0[this.IX(i1, j0)] + t1 * d0[this.IX(i1, j1)]);
            }
        }
        this.set_bnd(b, d);
    }
    
    // Jos Stam's project function (exact from paper)
    project(u, v, p, div) {
        const N = this.N;
        
        // Compute divergence
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= N; j++) {
                div[this.IX(i, j)] = -0.5 * (u[this.IX(i + 1, j)] - u[this.IX(i - 1, j)] +
                                             v[this.IX(i, j + 1)] - v[this.IX(i, j - 1)]) / N;
                p[this.IX(i, j)] = 0;
            }
        }
        this.set_bnd(0, div);
        this.set_bnd(0, p);
        
        // Solve pressure (20 iterations as per Jos Stam)
        for (let k = 0; k < 20; k++) {
            for (let i = 1; i <= N; i++) {
                for (let j = 1; j <= N; j++) {
                    p[this.IX(i, j)] = (div[this.IX(i, j)] +
                                       p[this.IX(i - 1, j)] + p[this.IX(i + 1, j)] +
                                       p[this.IX(i, j - 1)] + p[this.IX(i, j + 1)]) / 4;
                }
            }
            this.set_bnd(0, p);
        }
        
        // Subtract pressure gradient from velocity
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= N; j++) {
                u[this.IX(i, j)] -= 0.5 * N * (p[this.IX(i + 1, j)] - p[this.IX(i - 1, j)]);
                v[this.IX(i, j)] -= 0.5 * N * (p[this.IX(i, j + 1)] - p[this.IX(i, j - 1)]);
            }
        }
        this.set_bnd(1, u);
        this.set_bnd(2, v);
    }
    
    // Array swap utility (Jos Stam's SWAP macro)
    SWAP(x0, x) {
        for (let i = 0; i < this.size; i++) {
            const tmp = x0[i];
            x0[i] = x[i];
            x[i] = tmp;
        }
    }
    
    // Complete Jos Stam algorithm step
    step() {
        // Step 1: add_source(u, u_prev, dt)
        this.add_source(this.u, this.u_prev, this.dt);
        
        // Step 2: add_source(dens, dens_prev, dt)
        this.add_source(this.dens, this.dens_prev, this.dt);
        
        // Step 3: SWAP(u_prev, u); diffuse(1, u, u_prev, visc, dt)
        this.SWAP(this.u_prev, this.u);
        this.diffuse(1, this.u, this.u_prev, this.visc, this.dt);
        
        // Step 4: SWAP(v_prev, v); diffuse(2, v, v_prev, visc, dt)
        this.SWAP(this.v_prev, this.v);
        this.diffuse(2, this.v, this.v_prev, this.visc, this.dt);
        
        // Step 5: project(u, v, u_prev, v_prev)
        this.project(this.u, this.v, this.u_prev, this.v_prev);
        
        // Step 6: SWAP(u_prev, u); SWAP(v_prev, v)
        this.SWAP(this.u_prev, this.u);
        this.SWAP(this.v_prev, this.v);
        
        // Step 7: advect(1, u, u_prev, u_prev, v_prev, dt)
        this.advect(1, this.u, this.u_prev, this.u_prev, this.v_prev, this.dt);
        
        // Step 8: advect(2, v, v_prev, u_prev, v_prev, dt)
        this.advect(2, this.v, this.v_prev, this.u_prev, this.v_prev, this.dt);
        
        // Step 9: project(u, v, u_prev, v_prev)
        this.project(this.u, this.v, this.u_prev, this.v_prev);
        
        // Step 10: SWAP(dens_prev, dens); advect(0, dens, dens_prev, u, v, dt)
        this.SWAP(this.dens_prev, this.dens);
        this.advect(0, this.dens, this.dens_prev, this.u, this.v, this.dt);
    }
    
    // Add force at position
    addForce(x, y, fx, fy) {
        const idx = this.IX(x, y);
        if (idx >= 0 && idx < this.size) {
            this.u_prev[idx] += fx;
            this.v_prev[idx] += fy;
        }
    }
    
    // Add density at position
    addDensity(x, y, amount) {
        const idx = this.IX(x, y);
        if (idx >= 0 && idx < this.size) {
            this.dens_prev[idx] += amount;
        }
    }
    
    // Clear all fields
    clear() {
        this.u.fill(0);
        this.v.fill(0);
        this.u_prev.fill(0);
        this.v_prev.fill(0);
        this.dens.fill(0);
        this.dens_prev.fill(0);
    }
}

// Jos Stam Stable Fluids Implementation - Clean CPU Algorithm with Simple WebGL Visualization
class WebGLFluidSystem extends WebGLVisualization {
    constructor(manager) {
        super(manager);
        this.pluginName = 'fluid';
        this.pluginVersion = '1.0.0';
        
        // Create Jos Stam fluid simulation (CPU)
        this.N = 64;
        this.fluid = new JosStamFluid(this.N);
        
        // Simple WebGL resources for visualization only
        this.densityTexture = null;
        this.visualizationShader = null;
        this.quadBuffer = null;
        
        // Plugin settings
        this.settings = {
            viscosity: 0.0001,
            diffusion: 0.0001,
            timeStep: 0.1,
            gridSize: this.N,
            beatForceStrength: 1.0,
            beatDensityStrength: 1.0,
            audioReactivity: 0.5
        };
        
        console.log('🌊 Jos Stam Stable Fluids System initialized - Grid:', this.N, '(Clean CPU Implementation)');
    }
    
    initialize() {
        console.log('🌊 Initializing Jos Stam Stable Fluids (CPU + Simple WebGL visualization)...');
        
        if (!this.gl) {
            console.error('🌊 WebGL context not available');
            return false;
        }
        
        try {
            // Simple WebGL setup for visualization only
            this.setupVisualizationShader();
            this.setupDensityTexture();
            this.setupQuadBuffer();
            
            // Initialize velocity and density fields to zero (CPU arrays)
            this.clearFields();
            
            console.log('🌊 Jos Stam Stable Fluids initialization complete - Ready for CPU simulation!');
            return true;
            
        } catch (error) {
            console.error('🌊 Failed to initialize Jos Stam Stable Fluids:', error);
            console.error('🌊 Error details:', error.stack);
            return false;
        }
    }
    
    update(audioFeatures, beatInfo) {
        if (!this.gl || !this.visualizationShader) return;
        
        try {
            // Add audio forces and density to the fluid simulation
            this.addAudioInput(audioFeatures, beatInfo);
            
            // Run Jos Stam algorithm step (CPU)
            this.fluid.step();
            
            // Update WebGL texture with density data
            this.updateDensityTexture();
            
        } catch (error) {
            console.error('🌊 Error in Jos Stam algorithm update:', error);
        }
    }
    
    render() {
        if (!this.gl || !this.visualizationShader) return;
        
        try {
            // Simple WebGL rendering of density field
            this.renderDensityField();
        } catch (error) {
            console.error('🌊 Error in Jos Stam render:', error);
        }
    }
    
    setSettings(settings) {
        console.log('🌊 Jos Stam Fluid System: setSettings called with:', settings);
        
        // Update plugin settings
        Object.assign(this.settings, settings);
        
        if (settings.viscosity !== undefined) {
            this.visc = Math.max(0.0, Math.min(1.0, settings.viscosity));
        }
        
        if (settings.diffusion !== undefined) {
            this.diff = Math.max(0.0, Math.min(1.0, settings.diffusion));
        }
        
        if (settings.timeStep !== undefined) {
            this.dt = Math.max(0.001, Math.min(1.0, settings.timeStep));
        }
        
        if (settings.gridSize !== undefined && settings.gridSize !== this.N) {
            // Grid size change requires reinitialization
            this.N = Math.max(32, Math.min(256, settings.gridSize));
            this.size = (this.N + 2) * (this.N + 2);
            this.reinitialize();
        }
    }
    
    destroy() {
        console.log('🌊 Destroying Jos Stam Stable Fluids system...');
        super.destroy();
    }
    
    // ========================================
    // Jos Stam Stable Fluids Core Functions - CPU Implementation
    // Direct line-by-line translation from Jos Stam's original C code
    // ========================================
    
    // Simple WebGL setup for visualization
    setupVisualizationShader() {
        const gl = this.gl;
        const textureSize = this.N + 2;
        
        // Check for floating point texture support
        console.log('🌊 Checking WebGL extensions...');
        const isWebGL2 = gl instanceof WebGL2RenderingContext;
        const floatTextureExt = gl.getExtension('OES_texture_float') || gl.getExtension('WEBGL_color_buffer_float');
        const webgl2FloatExt = gl.getExtension('EXT_color_buffer_float');
        
        console.log('🌊 WebGL Extensions found:', {
            isWebGL2: isWebGL2,
            OES_texture_float: !!gl.getExtension('OES_texture_float'),
            WEBGL_color_buffer_float: !!gl.getExtension('WEBGL_color_buffer_float'),
            EXT_color_buffer_float: !!webgl2FloatExt,
            hasFloatSupport: !!(floatTextureExt || webgl2FloatExt || isWebGL2)
        });
        
        // WebGL2 has built-in float texture support, or check for extensions
        const hasFloatSupport = isWebGL2 || floatTextureExt || webgl2FloatExt;
        
        if (!hasFloatSupport) {
            console.error('🌊 Floating point textures not supported - falling back to particle system');
            throw new Error('Floating point textures not supported - required for Jos Stam algorithm');
        }
        
        console.log('🌊 Floating-point texture support confirmed!');
        
        // Create floating point textures for all fields
        const textureNames = ['u_current', 'u_previous', 'v_current', 'v_previous', 
                             'dens_current', 'dens_previous', 'pressure', 'divergence'];
        
        textureNames.forEach(name => {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            
            // Use appropriate format based on WebGL version
            if (isWebGL2) {
                // WebGL2 format
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureSize, textureSize, 0, gl.RGBA, gl.FLOAT, null);
            } else {
                // WebGL1 format
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.FLOAT, null);
            }
            
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            this.textures[name] = texture;
            
            console.log(`🌊 Created texture ${name} with format:`, isWebGL2 ? 'RGBA32F' : 'RGBA');
        });
        
        console.log('🌊 Jos Stam textures initialized:', textureSize + 'x' + textureSize);
    }
    
    // Initialize framebuffers for render-to-texture
    initializeFramebuffers() {
        const gl = this.gl;
        
        Object.keys(this.textures).forEach(name => {
            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[name], 0);
            
            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error(`Framebuffer ${name} not complete: ${status}`);
            }
            
            this.framebuffers[name] = framebuffer;
        });
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        console.log('🌊 Jos Stam framebuffers initialized');
    }
    
    // Initialize Jos Stam algorithm shaders
    initializeShaders() {
        const gl = this.gl;
        
        // Vertex shader (same for all passes)
        const vertexShaderSource = `
            attribute vec2 position;
            varying vec2 texCoord;
            void main() {
                texCoord = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        // Jos Stam add_source function as fragment shader
        const addSourceShaderSource = `
            precision highp float;
            uniform sampler2D currentField;
            uniform sampler2D sourceField;
            uniform float dt;
            varying vec2 texCoord;
            void main() {
                vec4 current = texture2D(currentField, texCoord);
                vec4 source = texture2D(sourceField, texCoord);
                gl_FragColor = current + dt * source;
            }
        `;
        
        // Jos Stam diffuse function as fragment shader (Gauss-Seidel relaxation)
        const diffuseShaderSource = `
            precision highp float;
            uniform sampler2D inputField;
            uniform sampler2D previousField;
            uniform float diff;
            uniform float dt;
            uniform vec2 gridSize;
            varying vec2 texCoord;
            
            void main() {
                vec2 texelSize = 1.0 / gridSize;
                float a = dt * diff * gridSize.x * gridSize.y;
                
                vec4 center = texture2D(previousField, texCoord);
                vec4 left = texture2D(inputField, texCoord - vec2(texelSize.x, 0.0));
                vec4 right = texture2D(inputField, texCoord + vec2(texelSize.x, 0.0));
                vec4 bottom = texture2D(inputField, texCoord - vec2(0.0, texelSize.y));
                vec4 top = texture2D(inputField, texCoord + vec2(0.0, texelSize.y));
                
                gl_FragColor = (center + a * (left + right + bottom + top)) / (1.0 + 4.0 * a);
            }
        `;
        
        // Jos Stam advect function as fragment shader (Semi-Lagrangian)
        const advectShaderSource = `
            precision highp float;
            uniform sampler2D velocityU;
            uniform sampler2D velocityV;
            uniform sampler2D densityField;
            uniform float dt;
            uniform vec2 gridSize;
            varying vec2 texCoord;
            
            void main() {
                vec2 texelSize = 1.0 / gridSize;
                
                // Get velocity at current position
                float u = texture2D(velocityU, texCoord).r;
                float v = texture2D(velocityV, texCoord).r;
                
                // Trace particle backward in time
                vec2 pos = texCoord - dt * vec2(u, v) * texelSize;
                
                // Clamp to grid boundaries
                pos = clamp(pos, texelSize, 1.0 - texelSize);
                
                // Bilinear interpolation
                gl_FragColor = texture2D(densityField, pos);
            }
        `;
        
        // Jos Stam project function - compute divergence
        const projectDivergenceShaderSource = `
            precision highp float;
            uniform sampler2D velocityU;
            uniform sampler2D velocityV;
            uniform vec2 gridSize;
            varying vec2 texCoord;
            
            void main() {
                vec2 texelSize = 1.0 / gridSize;
                
                float u_right = texture2D(velocityU, texCoord + vec2(texelSize.x, 0.0)).r;
                float u_left = texture2D(velocityU, texCoord - vec2(texelSize.x, 0.0)).r;
                float v_top = texture2D(velocityV, texCoord + vec2(0.0, texelSize.y)).r;
                float v_bottom = texture2D(velocityV, texCoord - vec2(0.0, texelSize.y)).r;
                
                float divergence = -0.5 * (u_right - u_left + v_top - v_bottom) / gridSize.x;
                gl_FragColor = vec4(divergence, 0.0, 0.0, 1.0);
            }
        `;
        
        // Jos Stam project function - solve pressure (Jacobi iteration)
        const projectPressureShaderSource = `
            precision highp float;
            uniform sampler2D pressureField;
            uniform sampler2D divergenceField;
            uniform vec2 gridSize;
            varying vec2 texCoord;
            
            void main() {
                vec2 texelSize = 1.0 / gridSize;
                
                float divergence = texture2D(divergenceField, texCoord).r;
                float left = texture2D(pressureField, texCoord - vec2(texelSize.x, 0.0)).r;
                float right = texture2D(pressureField, texCoord + vec2(texelSize.x, 0.0)).r;
                float bottom = texture2D(pressureField, texCoord - vec2(0.0, texelSize.y)).r;
                float top = texture2D(pressureField, texCoord + vec2(0.0, texelSize.y)).r;
                
                float pressure = (left + right + bottom + top + divergence) / 4.0;
                gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
            }
        `;
        
        // Jos Stam project function - subtract pressure gradient
        const projectSubtractShaderSource = `
            precision highp float;
            uniform sampler2D velocityField;
            uniform sampler2D pressureField;
            uniform vec2 gridSize;
            varying vec2 texCoord;
            
            void main() {
                vec2 texelSize = 1.0 / gridSize;
                
                float velocity = texture2D(velocityField, texCoord).r;
                float pressure_right = texture2D(pressureField, texCoord + vec2(texelSize.x, 0.0)).r;
                float pressure_left = texture2D(pressureField, texCoord - vec2(texelSize.x, 0.0)).r;
                float pressure_top = texture2D(pressureField, texCoord + vec2(0.0, texelSize.y)).r;
                float pressure_bottom = texture2D(pressureField, texCoord - vec2(0.0, texelSize.y)).r;
                
                // Subtract pressure gradient for u or v component
                float gradient = 0.5 * gridSize.x * (pressure_right - pressure_left);
                gl_FragColor = vec4(velocity - gradient, 0.0, 0.0, 1.0);
            }
        `;
        
        // Jos Stam set_bnd function as fragment shader
        const setBoundaryShaderSource = `
            precision highp float;
            uniform sampler2D inputField;
            uniform int boundaryType; // 1 for x-velocity, 2 for y-velocity, 0 for density
            uniform vec2 gridSize;
            varying vec2 texCoord;
            
            void main() {
                vec2 texelSize = 1.0 / gridSize;
                vec2 pos = texCoord * gridSize;
                
                float value = texture2D(inputField, texCoord).r;
                
                // Boundary conditions (exactly as in Jos Stam's code)
                if (pos.x < 1.5) {
                    // Left boundary
                    vec2 innerCoord = texCoord + vec2(texelSize.x, 0.0);
                    float innerValue = texture2D(inputField, innerCoord).r;
                    value = (boundaryType == 1) ? -innerValue : innerValue;
                } else if (pos.x > gridSize.x - 0.5) {
                    // Right boundary
                    vec2 innerCoord = texCoord - vec2(texelSize.x, 0.0);
                    float innerValue = texture2D(inputField, innerCoord).r;
                    value = (boundaryType == 1) ? -innerValue : innerValue;
                } else if (pos.y < 1.5) {
                    // Bottom boundary
                    vec2 innerCoord = texCoord + vec2(0.0, texelSize.y);
                    float innerValue = texture2D(inputField, innerCoord).r;
                    value = (boundaryType == 2) ? -innerValue : innerValue;
                } else if (pos.y > gridSize.y - 0.5) {
                    // Top boundary
                    vec2 innerCoord = texCoord - vec2(0.0, texelSize.y);
                    float innerValue = texture2D(inputField, innerCoord).r;
                    value = (boundaryType == 2) ? -innerValue : innerValue;
                }
                
                gl_FragColor = vec4(value, 0.0, 0.0, 1.0);
            }
        `;
        
        // Visualization shader for rendering density field
        const visualizeShaderSource = `
            precision highp float;
            uniform sampler2D densityField;
            varying vec2 texCoord;
            
            void main() {
                float density = texture2D(densityField, texCoord).r;
                // Simple density visualization - can be enhanced later
                vec3 color = vec3(density * 0.8, density * 0.6, density);
                gl_FragColor = vec4(color, min(density * 2.0, 1.0));
            }
        `;
        
        // Compile all shaders
        const shaderSources = {
            addSource: addSourceShaderSource,
            diffuse: diffuseShaderSource,
            advect: advectShaderSource,
            project_divergence: projectDivergenceShaderSource,
            project_pressure: projectPressureShaderSource,
            project_subtract: projectSubtractShaderSource,
            setBoundary: setBoundaryShaderSource,
            visualize: visualizeShaderSource
        };
        
        Object.keys(shaderSources).forEach(name => {
            this.shaders[name] = this.compileShaderProgram(vertexShaderSource, shaderSources[name]);
        });
        
        console.log('🌊 Jos Stam shaders compiled successfully');
    }
    
    // Compile shader program
    compileShaderProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Shader program linking failed: ' + gl.getProgramInfoLog(program));
        }
        
        return program;
    }
    
    // Compile individual shader
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Shader compilation failed: ' + gl.getShaderInfoLog(shader));
        }
        
        return shader;
    }
    
    // Clear all fields to zero
    clearFields() {
        this.u.fill(0);
        this.v.fill(0);
        this.u_prev.fill(0);
        this.v_prev.fill(0);
        this.dens.fill(0);
        this.dens_prev.fill(0);
        
        // Upload to GPU textures
        this.uploadArrayToTexture(this.u, 'u_current');
        this.uploadArrayToTexture(this.v, 'v_current');
        this.uploadArrayToTexture(this.u_prev, 'u_previous');
        this.uploadArrayToTexture(this.v_prev, 'v_previous');
        this.uploadArrayToTexture(this.dens, 'dens_current');
        this.uploadArrayToTexture(this.dens_prev, 'dens_previous');
    }
    
    // Upload Float32Array to texture
    uploadArrayToTexture(array, textureName) {
        const gl = this.gl;
        const textureSize = this.N + 2;
        
        // Convert to RGBA format for WebGL
        const rgbaData = new Float32Array(textureSize * textureSize * 4);
        for (let i = 0; i < array.length; i++) {
            rgbaData[i * 4] = array[i]; // R channel
            rgbaData[i * 4 + 1] = 0;    // G channel
            rgbaData[i * 4 + 2] = 0;    // B channel
            rgbaData[i * 4 + 3] = 1;    // A channel
        }
        
        gl.bindTexture(gl.TEXTURE_2D, this.textures[textureName]);
        try {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureSize, textureSize, gl.RGBA, gl.FLOAT, rgbaData);
        } catch (error) {
            console.error('🌊 Error uploading texture data:', error);
        }
    }
    
    // ========================================
    // Jos Stam Algorithm Function Implementation
    // Exact implementation of the algorithm steps
    // ========================================
    
    // Step 1 & 2: Add sources (Jos Stam add_source function)
    addSources(audioFeatures, beatInfo) {
        // Add audio-reactive forces to velocity field via add_source
        if (audioFeatures && beatInfo) {
            this.addAudioForces(audioFeatures, beatInfo);
        }
    }
    
    addDensitySources(audioFeatures, beatInfo) {
        // Add audio-reactive density sources via add_source
        if (audioFeatures && beatInfo) {
            this.addAudioDensity(audioFeatures, beatInfo);
        }
    }
    
    // Audio-reactive force injection
    addAudioForces(audioFeatures, beatInfo) {
        // Simple audio reactivity - inject forces based on audio features
        const centerX = Math.floor(this.N / 2);
        const centerY = Math.floor(this.N / 2);
        const idx = this.IX(centerX, centerY);
        
        if (beatInfo && beatInfo.beatDetected) {
            // Add radial forces on beat
            const force = beatInfo.beatConfidence * this.settings.beatForceStrength;
            this.u_prev[idx] += force * (Math.random() - 0.5);
            this.v_prev[idx] += force * (Math.random() - 0.5);
        }
        
        // Add continuous forces based on audio energy
        if (audioFeatures && audioFeatures.energy) {
            const energy = audioFeatures.energy * this.settings.audioReactivity;
            this.u_prev[idx] += energy * 0.1 * (Math.random() - 0.5);
            this.v_prev[idx] += energy * 0.1 * (Math.random() - 0.5);
        }
        
        // Upload modified arrays to GPU
        this.uploadArrayToTexture(this.u_prev, 'u_previous');
        this.uploadArrayToTexture(this.v_prev, 'v_previous');
    }
    
    // Audio-reactive density injection
    addAudioDensity(audioFeatures, beatInfo) {
        // Simple density injection based on audio
        const centerX = Math.floor(this.N / 2);
        const centerY = Math.floor(this.N / 2);
        const idx = this.IX(centerX, centerY);
        
        if (beatInfo && beatInfo.beatDetected) {
            this.dens_prev[idx] += beatInfo.beatConfidence * this.settings.beatDensityStrength;
        }
        
        if (audioFeatures && audioFeatures.energy) {
            this.dens_prev[idx] += audioFeatures.energy * this.settings.audioReactivity * 0.5;
        }
        
        // Upload to GPU
        this.uploadArrayToTexture(this.dens_prev, 'dens_previous');
    }
    
    // Array index function (Jos Stam's IX macro)
    IX(i, j) {
        return i + (this.N + 2) * j;
    }
    
    // Step 3 & 4: Jos Stam diffuse function implementation
    diffuse(field, x, x0, diff, dt) {
        const a = dt * diff * this.N * this.N;
        
        // Gauss-Seidel relaxation (exactly as in Jos Stam's code)
        for (let k = 0; k < this.diffusion_iterations; k++) {
            this.runDiffuseShader(field, x, x0, diff, dt);
            this.setBoundary(field === 'u' ? 1 : (field === 'v' ? 2 : 0), field);
        }
    }
    
    // Step 7, 8, 10: Jos Stam advect function implementation  
    advect(field, d, d0, u, v, dt) {
        this.runAdvectShader(field, d, d0, u, v, dt);
        this.setBoundary(field === 'u' ? 1 : (field === 'v' ? 2 : 0), field);
    }
    
    // Step 5 & 9: Jos Stam project function implementation
    project(u, v, p, div) {
        // Compute divergence
        this.runProjectDivergenceShader(u, v);
        this.setBoundary(0, 'divergence');
        
        // Clear pressure field
        this.clearPressureField();
        
        // Solve pressure via Jacobi iteration (exactly as in Jos Stam's code)
        for (let k = 0; k < this.projection_iterations; k++) {
            this.runProjectPressureShader();
            this.setBoundary(0, 'pressure');
        }
        
        // Subtract pressure gradient from velocity
        this.runProjectSubtractShader('u', u);
        this.runProjectSubtractShader('v', v);
        this.setBoundary(1, 'u');
        this.setBoundary(2, 'v');
    }
    
    // Jos Stam set_bnd function implementation
    setBoundary(b, field) {
        this.runBoundaryShader(b, field);
    }
    
    // Field swapping (Jos Stam SWAP macro)
    swapVelocityU() {
        [this.u, this.u_prev] = [this.u_prev, this.u];
        [this.textures.u_current, this.textures.u_previous] = [this.textures.u_previous, this.textures.u_current];
        [this.framebuffers.u_current, this.framebuffers.u_previous] = [this.framebuffers.u_previous, this.framebuffers.u_current];
    }
    
    swapVelocityV() {
        [this.v, this.v_prev] = [this.v_prev, this.v];
        [this.textures.v_current, this.textures.v_previous] = [this.textures.v_previous, this.textures.v_current];
        [this.framebuffers.v_current, this.framebuffers.v_previous] = [this.framebuffers.v_previous, this.framebuffers.v_current];
    }
    
    swapDensity() {
        [this.dens, this.dens_prev] = [this.dens_prev, this.dens];
        [this.textures.dens_current, this.textures.dens_previous] = [this.textures.dens_previous, this.textures.dens_current];
        [this.framebuffers.dens_current, this.framebuffers.dens_previous] = [this.framebuffers.dens_previous, this.framebuffers.dens_current];
    }
    
    // ========================================
    // WebGL Shader Execution Functions
    // ========================================
    
    // Run diffuse shader (Gauss-Seidel iteration)
    runDiffuseShader(field, x, x0, diff, dt) {
        const gl = this.gl;
        const program = this.shaders.diffuse;
        
        gl.useProgram(program);
        
        // Set up framebuffer for output
        const outputTexture = field === 'u' ? 'u_current' : (field === 'v' ? 'v_current' : 'dens_current');
        const inputTexture = field === 'u' ? 'u_current' : (field === 'v' ? 'v_current' : 'dens_current');
        const prevTexture = field === 'u' ? 'u_previous' : (field === 'v' ? 'v_previous' : 'dens_previous');
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[outputTexture]);
        gl.viewport(0, 0, this.N + 2, this.N + 2);
        
        // Set uniforms
        gl.uniform1i(gl.getUniformLocation(program, 'inputField'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'previousField'), 1);
        gl.uniform1f(gl.getUniformLocation(program, 'diff'), diff);
        gl.uniform1f(gl.getUniformLocation(program, 'dt'), dt);
        gl.uniform2f(gl.getUniformLocation(program, 'gridSize'), this.N + 2, this.N + 2);
        
        // Bind textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[inputTexture]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[prevTexture]);
        
        // Draw full-screen quad
        this.drawFullScreenQuad();
    }
    
    // Run advect shader (Semi-Lagrangian advection)
    runAdvectShader(field, d, d0, u, v, dt) {
        const gl = this.gl;
        const program = this.shaders.advect;
        
        gl.useProgram(program);
        
        // Set up output
        const outputTexture = field === 'u' ? 'u_current' : (field === 'v' ? 'v_current' : 'dens_current');
        const densityTexture = field === 'u' ? 'u_previous' : (field === 'v' ? 'v_previous' : 'dens_previous');
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[outputTexture]);
        gl.viewport(0, 0, this.N + 2, this.N + 2);
        
        // Set uniforms
        gl.uniform1i(gl.getUniformLocation(program, 'velocityU'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'velocityV'), 1);
        gl.uniform1i(gl.getUniformLocation(program, 'densityField'), 2);
        gl.uniform1f(gl.getUniformLocation(program, 'dt'), dt);
        gl.uniform2f(gl.getUniformLocation(program, 'gridSize'), this.N + 2, this.N + 2);
        
        // Bind textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.u_previous);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.v_previous);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[densityTexture]);
        
        this.drawFullScreenQuad();
    }
    
    // Run project divergence computation
    runProjectDivergenceShader(u, v) {
        const gl = this.gl;
        const program = this.shaders.project_divergence;
        
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.divergence);
        gl.viewport(0, 0, this.N + 2, this.N + 2);
        
        gl.uniform1i(gl.getUniformLocation(program, 'velocityU'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'velocityV'), 1);
        gl.uniform2f(gl.getUniformLocation(program, 'gridSize'), this.N + 2, this.N + 2);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.u_current);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.v_current);
        
        this.drawFullScreenQuad();
    }
    
    // Run project pressure solve (Jacobi iteration)
    runProjectPressureShader() {
        const gl = this.gl;
        const program = this.shaders.project_pressure;
        
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.pressure);
        gl.viewport(0, 0, this.N + 2, this.N + 2);
        
        gl.uniform1i(gl.getUniformLocation(program, 'pressureField'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'divergenceField'), 1);
        gl.uniform2f(gl.getUniformLocation(program, 'gridSize'), this.N + 2, this.N + 2);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.pressure);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.divergence);
        
        this.drawFullScreenQuad();
    }
    
    // Run project subtract pressure gradient
    runProjectSubtractShader(component, field) {
        const gl = this.gl;
        const program = this.shaders.project_subtract;
        
        gl.useProgram(program);
        
        const outputTexture = component === 'u' ? 'u_current' : 'v_current';
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[outputTexture]);
        gl.viewport(0, 0, this.N + 2, this.N + 2);
        
        gl.uniform1i(gl.getUniformLocation(program, 'velocityField'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'pressureField'), 1);
        gl.uniform2f(gl.getUniformLocation(program, 'gridSize'), this.N + 2, this.N + 2);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[outputTexture]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.pressure);
        
        this.drawFullScreenQuad();
    }
    
    // Run boundary condition shader
    runBoundaryShader(boundaryType, field) {
        const gl = this.gl;
        const program = this.shaders.setBoundary;
        
        gl.useProgram(program);
        
        const fieldTexture = field === 'u' ? 'u_current' : (field === 'v' ? 'v_current' : (field === 'divergence' ? 'divergence' : (field === 'pressure' ? 'pressure' : 'dens_current')));
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[fieldTexture]);
        gl.viewport(0, 0, this.N + 2, this.N + 2);
        
        gl.uniform1i(gl.getUniformLocation(program, 'inputField'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'boundaryType'), boundaryType);
        gl.uniform2f(gl.getUniformLocation(program, 'gridSize'), this.N + 2, this.N + 2);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[fieldTexture]);
        
        this.drawFullScreenQuad();
    }
    
    // Clear pressure field
    clearPressureField() {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.pressure);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    
    // Render density field for visualization
    renderDensityField() {
        const gl = this.gl;
        const program = this.shaders.visualize;
        
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Render to screen
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        gl.uniform1i(gl.getUniformLocation(program, 'densityField'), 0);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.dens_current);
        
        this.drawFullScreenQuad();
    }
    
    // Draw full-screen quad for shader passes
    drawFullScreenQuad() {
        const gl = this.gl;
        
        if (!this.quadBuffer) {
            this.quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1,  1, -1,  -1, 1,
                -1,  1,  1, -1,   1, 1
            ]), gl.STATIC_DRAW);
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        const positionLocation = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    // Reinitialize when parameters change
    reinitialize() {
        this.destroy();
        
        // Recreate arrays with new size
        this.u = new Float32Array(this.size);
        this.v = new Float32Array(this.size);
        this.u_prev = new Float32Array(this.size);
        this.v_prev = new Float32Array(this.size);
        this.dens = new Float32Array(this.size);
        this.dens_prev = new Float32Array(this.size);
        
        this.initialize();
    }
    
    // Cleanup functions
    cleanupTextures() {
        if (this.gl) {
            Object.values(this.textures).forEach(texture => {
                if (texture) this.gl.deleteTexture(texture);
            });
        }
        this.textures = {};
    }
    
    cleanupFramebuffers() {
        if (this.gl) {
            Object.values(this.framebuffers).forEach(framebuffer => {
                if (framebuffer) this.gl.deleteFramebuffer(framebuffer);
            });
        }
        this.framebuffers = {};
    }
    
    cleanupShaders() {
        if (this.gl) {
            Object.values(this.shaders).forEach(program => {
                if (program) this.gl.deleteProgram(program);
            });
        }
        this.shaders = {};
        
        if (this.quadBuffer) {
            this.gl.deleteBuffer(this.quadBuffer);
            this.quadBuffer = null;
        }
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
        
        // Plugin system
        this.pluginRegistry = new WebGLPluginRegistry(this);
        
        // Beat detection system
        this.beatDetector = new WebGLBeatDetector();
        
        console.log('🎮 WebGL Visualization Manager initialized with plugin system');
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
        this.canvas.style.zIndex = '5'; // Above Infinite Zoom (z-index: 4)
        
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
            
            // Initialize plugin registry
            this.pluginRegistry.initialize();
            
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
                
                // If we still don't have frequency/waveform data, try to get raw audio data
                if (audioData && (!audioData.frequencies || !audioData.waveform)) {
                    try {
                        const frequencies = this.visualizer.audioMotion.getFrequencies ? 
                            this.visualizer.audioMotion.getFrequencies() : 
                            (this.visualizer.audioMotion.frequencies || []);
                        const waveform = this.visualizer.audioMotion.getWaveform ? 
                            this.visualizer.audioMotion.getWaveform() : 
                            (this.visualizer.audioMotion.waveform || []);
                        
                        // Add raw audio data to the features
                        audioData.frequencies = frequencies;
                        audioData.waveform = waveform;
                        
                        console.log('🎮 WebGL: Added raw audio data - frequencies:', frequencies.length, 'waveform:', waveform.length);
                    } catch (error) {
                        console.warn('🎮 WebGL: Error getting raw audio data:', error);
                    }
                }
            } catch (error) {
                console.warn('🎮 WebGL: Error getting AudioMotion audio features:', error);
            }
        }
        
        // Final fallback: Generate test data (same as Infinite Zoom)
        if (!audioData) {
            audioData = this.generateTestAudioData();
        }
        
        // Update beat detector
        const beatInfo = this.beatDetector.update(audioData);
        
        // Update current plugin
        const currentPlugin = this.pluginRegistry.getCurrentPlugin();
        if (currentPlugin) {
            currentPlugin.update(audioData, beatInfo);
        }
        
        this.audioFeatures = audioData;
    }
    
    // Draw method - called from main animation loop (like Infinite Zoom)
    draw() {
        if (!this.isActive) return;
        
        // Render current plugin
        const currentPlugin = this.pluginRegistry.getCurrentPlugin();
        if (currentPlugin) {
            currentPlugin.render();
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
        // Settings will be handled by current plugin
        const currentPlugin = this.pluginRegistry.getCurrentPlugin();
        if (currentPlugin && currentPlugin.setSettings) {
            currentPlugin.setSettings(settings);
        }
        
        // Handle beat intensity setting
        if (settings.beatIntensity !== undefined) {
            this.beatDetector.setBeatIntensity(settings.beatIntensity / 100); // Convert percentage to 0-1
        }
    }
}

// WebGL Particle System Plugin
class WebGLParticleSystem extends WebGLVisualization {
    constructor(manager) {
        super(manager);
        this.pluginName = 'particle';
        this.pluginVersion = '1.0.0';
        
        // Particle system properties
        this.particles = [];
        this.maxParticles = 300; // Reduced from 500 for better performance
        this.particleCount = 150; // Reduced from 200 for better performance
        
        // Shader programs
        this.vertexShader = null;
        this.fragmentShader = null;
        this.program = null;
        
        // WebGL buffers
        this.vertexBuffer = null;
        this.positionBuffer = null;
        this.colorBuffer = null;
        
        // Uniforms
        this.uniforms = {};
        
        // Plugin settings
        this.settings = {
            particleCount: 150,
            particleSize: 5.0,
            speed: 1.0,
            gravity: 0.5,
            audioReactivity: 0.5,
            beatReact: false,
            beatSize: false,
            beatSpeed: false,
            beatCount: false,
            beatGeneration: false,
            energyReact: false,
            energySize: false,
            energySpeed: false,
            energyCount: false,
            frequencyReact: false,
            bassReact: false,
            midReact: false,
            trebleReact: false
        };
        
        // Legacy properties for compatibility
        this.particleSize = 5.0;
        this.speed = 1.0;
        this.gravity = 0.5;
        this.audioReactivity = 0.5;
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
        
        // Colors (plasma theme)
        this.colors = [
            [1.0, 0.0, 0.0], // Red
            [1.0, 0.5, 0.0], // Orange
            [1.0, 1.0, 0.0], // Yellow
            [0.0, 1.0, 0.0], // Green
            [0.0, 0.0, 1.0], // Blue
            [0.5, 0.0, 1.0]  // Purple
        ];
        
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
            
            uniform vec2 u_resolution;
            uniform float u_time;
            
            varying vec3 v_color;
            
            void main() {
                // Convert from pixels to clip space
                vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
                
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                gl_PointSize = a_size;
                
                v_color = a_color;
            }
        `;
        
        // Fragment shader source
        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec3 v_color;
            
            void main() {
                // Create circular particles
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                
                if (dist > 0.5) {
                    discard;
                }
                
                // Add some glow effect
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                
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
        
        this.attributes = {
            position: this.gl.getAttribLocation(this.program, 'a_position'),
            size: this.gl.getAttribLocation(this.program, 'a_size'),
            color: this.gl.getAttribLocation(this.program, 'a_color')
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
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            life: 1.0,
            decay: 0.0001 + Math.random() * 0.0002, // Much slower decay - particles live 10x longer
            // Initialize beat multipliers
            beatSizeMultiplier: 1.0,
            beatSpeedMultiplier: 1.0,
            targetBeatSizeMultiplier: undefined,
            targetBeatSpeedMultiplier: undefined,
            beatDecayTimer: undefined
        };
        
        this.particles.push(particle);
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
            
            // Debug: Log when beat effects are calculated (reduced frequency for performance)
            if (Math.random() < 0.01) { // 1% chance to log
                console.log('🥁 Beat effects calculated:', {
                    beatDetected: beatInfo.beat,
                    beatReact: this.beatReact,
                    extraParticles: extraParticles,
                    sizeMultiplier: beatEffects.sizeMultiplier,
                    speedMultiplier: beatEffects.speedMultiplier
                });
            }
            
            // Debug beat react status (reduced frequency for performance)
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
        
        // Add extra particles for beat effects
        for (let i = 0; i < beatExtraParticles; i++) {
            this.addParticle();
        }
        
        // Add particles to maintain base count
        while (this.particles.length < this.particleCount) {
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
        
        // Debug: Log render info very rarely for performance
        if (Math.random() < 0.001) { // 0.1% chance to log
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
        
        // Prepare particle data
        const positions = [];
        const colors = [];
        const sizes = [];
        
        this.particles.forEach(particle => {
            positions.push(particle.x, particle.y);
            colors.push(...particle.color);
            // Apply all size multipliers
            const beatSizeMultiplier = particle.beatSizeMultiplier || 1.0;
            const energySizeMultiplier = particle.energySizeMultiplier || 1.0;
            const bassSizeMultiplier = particle.bassSizeMultiplier || 1.0;
            const totalSizeMultiplier = beatSizeMultiplier * energySizeMultiplier * bassSizeMultiplier;
            sizes.push(particle.size * particle.life * totalSizeMultiplier);
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
    
    setSettings(settings) {
        // Only log occasionally to avoid spam
        if (Math.random() < 0.1) { // 10% chance to log
            console.log('🎮 WebGL Particle Plugin: setSettings called with:', settings);
        }
        
        // Update plugin settings
        Object.assign(this.settings, settings);
        
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
