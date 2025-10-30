/**
 * Storm Particle Plugin Template
 * Reference implementation showing all UI element types and plugin features
 * Developers can copy and modify this template for their own plugins
 */

class StormPlugin extends FrequePluginBase {
    constructor(visualizer) {
        // Initialize base plugin with metadata
        super('storm', visualizer, {
            version: '1.0.0',
            author: 'Freque Team',
            description: 'Storm Particle System - Plugin Template',
            targetFPS: 60
        });
        
        // Storm-specific properties
        this.particles = [];
        this.maxParticles = 300;
        this.particleCount = 150;
        
        // Particle physics
        this.gravity = 0.02;
        this.wind = 0.01;
        this.turbulence = 0.5;
        this.energyMultiplier = 1.0;
        
        // Visual properties
        this.particleSize = 3;
        this.particleSpeed = 2;
        this.colorScheme = 'blue'; // blue, red, green, rainbow
        this.showTrails = true;
        this.beatReactive = true;
        
        // Color schemes
        this.colorSchemes = {
            blue: [
                { r: 100, g: 150, b: 255 },
                { r: 50, g: 100, b: 200 },
                { r: 0, g: 50, b: 150 }
            ],
            red: [
                { r: 255, g: 100, b: 100 },
                { r: 200, g: 50, b: 50 },
                { r: 150, g: 0, b: 0 }
            ],
            green: [
                { r: 100, g: 255, b: 100 },
                { r: 50, g: 200, b: 50 },
                { r: 0, g: 150, b: 0 }
            ],
            rainbow: [
                { r: 255, g: 0, b: 0 },
                { r: 255, g: 127, b: 0 },
                { r: 255, g: 255, b: 0 },
                { r: 0, g: 255, b: 0 },
                { r: 0, g: 0, b: 255 },
                { r: 75, g: 0, b: 130 },
                { r: 148, g: 0, b: 211 }
            ]
        };
        
        // Performance tracking
        this.lastParticleTime = 0;
        this.particleGenerationRate = 50; // ms
        
        // Audio analysis
        this.energyHistory = [];
        this.currentEnergy = 0;
        
        // Setup plugin controls and presets
        this.setupStormControls();
        this.setupStormPresets();
    }
    
    /**
     * Setup all UI controls - demonstrates every control type
     */
    setupStormControls() {
        // Slider control example
        this.addControl('particleCount', {
            type: 'slider',
            label: 'Particle Count',
            min: 50,
            max: 500,
            value: this.particleCount,
            onChange: (value) => {
                this.particleCount = value;
                this.maxParticles = Math.max(value, this.maxParticles);
            }
        });
        
        // Another slider with different unit
        this.addControl('particleSize', {
            type: 'slider',
            label: 'Particle Size',
            min: 1,
            max: 10,
            value: this.particleSize,
            unit: 'px',
            onChange: (value) => {
                this.particleSize = value;
            }
        });
        
        // Speed slider
        this.addControl('particleSpeed', {
            type: 'slider',
            label: 'Speed',
            min: 0.1,
            max: 5.0,
            value: this.particleSpeed,
            unit: 'x',
            onChange: (value) => {
                this.particleSpeed = value;
            }
        });
        
        // Dropdown control example
        this.addControl('colorScheme', {
            type: 'dropdown',
            label: 'Color Scheme',
            options: [
                { value: 'blue', label: 'Blue Storm' },
                { value: 'red', label: 'Fire Storm' },
                { value: 'green', label: 'Nature Storm' },
                { value: 'rainbow', label: 'Rainbow Storm' }
            ],
            onChange: (value) => {
                this.colorScheme = value;
            }
        });
        
        // Checkbox control examples
        this.addControl('showTrails', {
            type: 'checkbox',
            label: 'Show Trails',
            checked: this.showTrails,
            onChange: (checked) => {
                this.showTrails = checked;
            }
        });
        
        this.addControl('beatReactive', {
            type: 'checkbox',
            label: 'Beat Reactive',
            checked: this.beatReactive,
            onChange: (checked) => {
                this.beatReactive = checked;
            }
        });
        
        // Button control example
        this.addControl('resetParticles', {
            type: 'button',
            label: 'Reset Particles',
            className: 'btn-control',
            onClick: () => {
                this.resetAllParticles();
            }
        });
        
        // Another button with different style
        this.addControl('explode', {
            type: 'button',
            label: 'Explode!',
            className: 'btn-danger',
            onClick: () => {
                this.explodeParticles();
            }
        });
    }
    
    /**
     * Setup preset configurations
     */
    setupStormPresets() {
        // Gentle preset
        this.addPreset('gentle', {
            name: 'Gentle Breeze',
            values: {
                particleCount: 100,
                particleSize: 2,
                particleSpeed: 1.0,
                colorScheme: 'blue',
                showTrails: true,
                beatReactive: false
            }
        });
        
        // Intense preset
        this.addPreset('intense', {
            name: 'Lightning Storm',
            values: {
                particleCount: 400,
                particleSize: 5,
                particleSpeed: 4.0,
                colorScheme: 'rainbow',
                showTrails: true,
                beatReactive: true
            }
        });
        
        // Fire preset
        this.addPreset('fire', {
            name: 'Fire Storm',
            values: {
                particleCount: 250,
                particleSize: 4,
                particleSpeed: 2.5,
                colorScheme: 'red',
                showTrails: false,
                beatReactive: true
            }
        });
        
        // Minimal preset
        this.addPreset('minimal', {
            name: 'Minimal',
            values: {
                particleCount: 50,
                particleSize: 1,
                particleSpeed: 0.5,
                colorScheme: 'blue',
                showTrails: false,
                beatReactive: false
            }
        });
    }
    
    /**
     * Plugin initialization - called by base class
     */
    onInitialize() {
        // Initialize particle system
        this.initializeParticles();
    }
    
    /**
     * Handle canvas resize - called by base class
     */
    onResize(width, height) {
        // Reposition particles proportionally
        this.particles.forEach(particle => {
            particle.x = (particle.x / this.canvas.width) * width;
            particle.y = (particle.y / this.canvas.height) * height;
        });
    }
    
    /**
     * Update particle system - called by MAL via base class
     */
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        // Calculate audio energy
        const energy = this.calculateAudioEnergy(sharedAudioData);
        
        // Apply beat reactivity
        const effectiveEnergy = this.beatReactive ? energy * this.energyMultiplier : 0.5;
        
        // Update particle generation
        this.updateParticleGeneration(timestamp, effectiveEnergy);
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (!this.updateParticle(particle, effectiveEnergy, deltaTime)) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Render particle system - called by MAL via base class
     */
    onRender(deltaTime, timestamp, sharedAudioData) {
        // Clear canvas with trail effect if enabled
        if (this.showTrails) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Render all particles
        this.particles.forEach(particle => {
            this.renderParticle(particle);
        });
    }
    
    /**
     * Initialize particle system
     */
    initializeParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.addParticle();
        }
    }
    
    /**
     * Add a new particle
     */
    addParticle() {
        if (!this.canvas) return;
        
        const particle = {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * this.particleSpeed,
            vy: (Math.random() - 0.5) * this.particleSpeed,
            life: 1.0,
            decay: 0.005 + Math.random() * 0.01,
            size: this.particleSize * (0.5 + Math.random() * 0.5),
            colorIndex: Math.floor(Math.random() * this.getCurrentColors().length),
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.1
        };
        
        this.particles.push(particle);
    }
    
    /**
     * Update particle generation based on energy
     */
    updateParticleGeneration(timestamp, energy) {
        const timeSinceLastGeneration = timestamp - this.lastParticleTime;
        const generationRate = this.particleGenerationRate * (1 / (1 + energy));
        
        if (timeSinceLastGeneration > generationRate && this.particles.length < this.maxParticles) {
            this.addParticle();
            this.lastParticleTime = timestamp;
        }
        
        // Ensure minimum particle count
        while (this.particles.length < Math.min(this.particleCount, this.maxParticles)) {
            this.addParticle();
        }
    }
    
    /**
     * Update individual particle
     */
    updateParticle(particle, energy, deltaTime) {
        // Update life
        particle.life -= particle.decay;
        if (particle.life <= 0) return false;
        
        // Apply physics
        particle.vx += this.wind * energy;
        particle.vy += this.gravity;
        
        // Add turbulence
        particle.vx += (Math.random() - 0.5) * this.turbulence * energy * 0.1;
        particle.vy += (Math.random() - 0.5) * this.turbulence * energy * 0.1;
        
        // Update position
        particle.x += particle.vx * this.particleSpeed;
        particle.y += particle.vy * this.particleSpeed;
        
        // Update rotation
        particle.angle += particle.spin;
        
        // Wrap around screen edges
        if (particle.x < 0) particle.x = this.canvas.width;
        if (particle.x > this.canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = this.canvas.height;
        if (particle.y > this.canvas.height) particle.y = 0;
        
        return true;
    }
    
    /**
     * Render individual particle
     */
    renderParticle(particle) {
        const colors = this.getCurrentColors();
        const color = colors[particle.colorIndex % colors.length];
        const alpha = particle.life * this.opacity;
        
        this.ctx.save();
        
        // Set particle color and alpha
        this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        this.ctx.globalCompositeOperation = 'screen';
        
        // Draw particle
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.angle);
        
        const size = particle.size * (0.5 + particle.life * 0.5);
        
        // Draw particle as a star shape
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add glow effect
        this.ctx.shadowBlur = size * 2;
        this.ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`;
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    /**
     * Get current color scheme
     */
    getCurrentColors() {
        return this.colorSchemes[this.colorScheme] || this.colorSchemes.blue;
    }
    
    /**
     * Calculate audio energy from shared data
     */
    calculateAudioEnergy(sharedAudioData) {
        if (!sharedAudioData || !sharedAudioData.frequencies) {
            return 0.5;
        }
        
        const frequencies = sharedAudioData.frequencies;
        let sum = 0;
        for (let i = 0; i < frequencies.length; i++) {
            sum += frequencies[i];
        }
        
        const rawEnergy = sum / frequencies.length;
        
        // Smooth energy changes
        this.energyHistory.push(rawEnergy);
        if (this.energyHistory.length > 5) {
            this.energyHistory.shift();
        }
        
        const smoothedEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
        this.currentEnergy = this.currentEnergy * 0.8 + smoothedEnergy * 0.2;
        
        return Math.max(0, Math.min(1, this.currentEnergy));
    }
    
    /**
     * Reset all particles (button action)
     */
    resetAllParticles() {
        this.particles = [];
        this.initializeParticles();
    }
    
    /**
     * Explode particles (button action)
     */
    explodeParticles() {
        this.particles.forEach(particle => {
            const angle = Math.random() * Math.PI * 2;
            const force = 5 + Math.random() * 10;
            particle.vx = Math.cos(angle) * force;
            particle.vy = Math.sin(angle) * force;
        });
    }
    
    /**
     * Handle preset application
     */
    onPresetApply(presetId, preset) {
        // Reinitialize particles with new settings
        this.initializeParticles();
        
        // Update mixer controls if available
        if (window.pluginMixerIntegration) {
            window.pluginMixerIntegration.addPluginControls(this.pluginName, this.controls);
            window.pluginMixerIntegration.addPluginPresets(this.pluginName, this.presets);
        }
    }
    
    /**
     * Override base class method to integrate with mixer
     */
    registerWithPluginManager() {
        super.registerWithPluginManager();
        
        // Add controls and presets to mixer integration
        setTimeout(() => {
            if (window.pluginMixerIntegration) {
                window.pluginMixerIntegration.addPluginControls(this.pluginName, this.controls);
                window.pluginMixerIntegration.addPluginPresets(this.pluginName, this.presets);
            }
        }, 1500);
    }
    
    /**
     * Plugin cleanup
     */
    onCleanup() {
        this.particles = [];
        this.energyHistory = [];
    }
    
    /**
     * Plugin start
     */
    onStart() {
        // Ensure we have particles when starting
        if (this.particles.length === 0) {
            this.initializeParticles();
        }
    }
    
    /**
     * Plugin stop
     */
    onStop() {
        // Plugin-specific stop logic if needed
    }
}

// Make globally available for loading
window.StormPlugin = StormPlugin;

// Auto-register if visualizer is available (with delay to ensure plugin manager is ready)
// Only register if not already registered
setTimeout(() => {
    console.log('🔌 STORM TEMPLATE AUTO-REGISTER DEBUG: Timeout triggered');
    console.log('🔌 STORM TEMPLATE AUTO-REGISTER DEBUG: Dependencies check:', {
        visualizer: !!window.visualizer,
        pluginManager: !!window.pluginManager,
        FrequePluginBase: !!window.FrequePluginBase
    });
    
    if (window.visualizer && window.pluginManager && window.FrequePluginBase) {
        // Check if Storm plugin is already registered
        const existingPlugin = window.pluginManager.getPlugin('storm');
        console.log('🔌 STORM TEMPLATE AUTO-REGISTER DEBUG: Existing plugin check:', !!existingPlugin);
        
        if (existingPlugin) {
            console.log('🔌 STORM TEMPLATE AUTO-REGISTER DEBUG: Storm plugin already registered, skipping auto-registration');
            return;
        }
        
        try {
            console.log('🔌 STORM TEMPLATE AUTO-REGISTER DEBUG: Creating new StormPlugin instance');
            new StormPlugin(window.visualizer);
            console.log('🔌 STORM TEMPLATE AUTO-REGISTER DEBUG: Storm plugin auto-registered successfully');
        } catch (error) {
            console.error('🔌 STORM TEMPLATE AUTO-REGISTER DEBUG: Failed to auto-register Storm plugin:', error);
        }
    } else {
        console.log('🔌 STORM TEMPLATE AUTO-REGISTER DEBUG: Storm plugin waiting for dependencies:', {
            visualizer: !!window.visualizer,
            pluginManager: !!window.pluginManager,
            FrequePluginBase: !!window.FrequePluginBase
        });
    }
}, 500); // Increased delay to ensure all dependencies load
