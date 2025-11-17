/**
 * Native Blobs Plugin for Master Animation Loop
 * Cosmic Plasma Ball Effects - Pure MAL Integration
 * No legacy requestAnimationFrame loops - uses shared audio data
 */

class BlobsPlugin extends FrequePluginBase {
    constructor(visualizer) {
        // Initialize base plugin
        super('blobs', visualizer, {
            version: '1.0.0',
            author: 'Freque Team',
            description: 'Cosmic Plasma Ball Effects',
            targetFPS: 60
        });
        
        // Blobs-specific canvas for trails
        this.trailCanvas = null;
        this.trailCtx = null;
        
        // Cosmic plasma fire system
        this.particles = [];
        this.maxParticles = 500;
        this.particleCount = 200;
        
        // Particle object pool to reduce GC pressure
        this.particlePool = [];
        this.poolSize = 500;
        
        // Plasma physics
        this.gravity = 0.05;
        this.turbulence = 0.8;
        this.energyMultiplier = 1.0;
        this.boilingIntensity = 1.2;
        
        // Cosmic plasma color palette - deep reds to bright yellows
        this.plasmaColors = [
            { r: 20, g: 0, b: 0 },       // Deep crimson
            { r: 60, g: 0, b: 0 },       // Dark red
            { r: 120, g: 0, b: 0 },      // Crimson
            { r: 180, g: 20, b: 0 },     // Red-orange
            { r: 220, g: 40, b: 0 },     // Bright red
            { r: 255, g: 60, b: 0 },     // Orange-red
            { r: 255, g: 100, b: 0 },    // Orange
            { r: 255, g: 140, b: 0 },    // Bright orange
            { r: 255, g: 180, b: 0 },    // Gold
            { r: 255, g: 220, b: 0 },    // Bright gold
            { r: 255, g: 255, b: 100 },  // Yellow-white
            { r: 255, g: 255, b: 200 }   // Hot white
        ];
        
        // Control panel properties (opacity handled by base class)
        this.saturation = 1.0;
        this.posterize = 16;
        this.contrast = 1.0;
        this.brightness = 1.0;
        this.beatReact = true;
        this.intensity = 1.0;
        this.minSize = 2;
        this.maxSize = 8;
        this.decayMultiplier = 10.0;
        this.agitate = 1.0;
        this.density = 200;
        
        // Heat distortion effect
        this.heatDistortion = [];
        this.distortionIntensity = 0.02;
        
        // Performance optimization
        this.lastFrameTime = 0;
        this.targetFPS = 30;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Continuous generation
        this.lastParticleTime = 0;
        this.particleGenerationRate = 100;
        
        // Audio energy tracking
        this.energyHistory = [];
        this.energySmoothing = 0.7;
        this.currentEnergy = 0;
        
        // Context corruption tracking
        this.corruptionCounts = {
            mainParticle: 0,
            sparkle: 0,
            streak: 0
        };
        this.lastCorruptionLog = 0;
        
        // Initialize particle pool
        this.initializeParticlePool();
        
        // Add blobs-specific controls
        this.setupBlobsControls();
    }
    
    setupBlobsControls() {
        // All controls to match native Blobs system exactly
        
        // 1. Saturation (0-200%)
        this.addControl('saturation', {
            type: 'dial',
            label: 'Saturation',
            min: 0,
            max: 200,
            value: 100,
            unit: '%',
            onChange: (value) => this.setSaturation(value)
        });
        
        // 2. Posterize (2-16)
        this.addControl('posterize', {
            type: 'dial',
            label: 'Posterize',
            min: 2,
            max: 16,
            value: 16,
            onChange: (value) => this.setPosterize(value)
        });
        
        // 3. Contrast (10-300%)
        this.addControl('contrast', {
            type: 'dial',
            label: 'Contrast',
            min: 10,
            max: 300,
            value: 100,
            unit: '%',
            onChange: (value) => this.setContrast(value)
        });
        
        // 4. Brightness (10-300%)
        this.addControl('brightness', {
            type: 'dial',
            label: 'Brightness',
            min: 10,
            max: 300,
            value: 100,
            unit: '%',
            onChange: (value) => this.setBrightness(value)
        });
        
        // 5. Intensity (10-200%)
        this.addControl('intensity', {
            type: 'dial',
            label: 'Intensity',
            min: 10,
            max: 200,
            value: 100,
            unit: '%',
            onChange: (value) => this.setIntensity(value)
        });
        
        // 6. Min Size (0.5-10.0)
        this.addControl('minSize', {
            type: 'dial',
            label: 'Min Size',
            min: 0.5,
            max: 10,
            value: 2,
            step: 0.1,
            onChange: (value) => this.setMinSize(value)
        });
        
        // 7. Max Size (1-10, with pixel conversion)
        this.addControl('maxSize', {
            type: 'dial',
            label: 'Max Size',
            min: 1,
            max: 10,
            value: 1,
            step: 0.1,
            unit: 'px',
            onChange: (value) => this.setMaxSize(value)
        });
        
        // 8. Agitate (10-500%)
        this.addControl('agitate', {
            type: 'dial',
            label: 'Agitate',
            min: 10,
            max: 500,
            value: 100,
            unit: '%',
            onChange: (value) => this.setAgitate(value / 100)
        });
        
        // 9. Density (100-500)
        this.addControl('density', {
            type: 'dial',
            label: 'Density',
            min: 100,
            max: 500,
            value: 200,
            onChange: (value) => this.setDensity(value)
        });
        
        // 10. Lifespan/Decay (1-10x)
        this.addControl('decay', {
            type: 'dial',
            label: 'Lifespan',
            min: 1,
            max: 10,
            value: 10,
            step: 0.1,
            unit: 'x',
            onChange: (value) => this.setDecayMultiplier(value)
        });
        
        // 11. Beat React Button (On/Off toggle)
        this.addControl('beatReact', {
            type: 'button',
            label: 'Beat React: On',
            className: 'btn-primary-mixer',
            wrapperClass: 'button-mini-wrapper',
            onClick: () => {
                const newState = this.toggleBeatReact();
                // Update button text
                const button = document.querySelector(`[data-plugin="blobs"] [data-control="beatReact"]`);
                if (button) {
                    button.textContent = `Beat React: ${newState ? 'On' : 'Off'}`;
                }
            }
        });
    }
    
    initializeParticlePool() {
        this.particlePool = [];
        for (let i = 0; i < this.poolSize; i++) {
            this.particlePool.push(this.createEmptyParticle());
        }
    }
    
    createEmptyParticle() {
        return {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            life: 1.0,
            decay: 0.002,
            size: 1,
            colorIndex: 0,
            turbulence: 0.3,
            heat: 0.6,
            flicker: 0,
            flickerSpeed: 0.05,
            direction: 0,
            baseSpeed: 0,
            curvePhase: 0,
            curveStrength: 1.0,
            curveFrequency: 0.02,
            inUse: false
        };
    }
    
    getParticleFromPool() {
        for (let i = 0; i < this.particlePool.length; i++) {
            if (!this.particlePool[i].inUse) {
                this.particlePool[i].inUse = true;
                return this.particlePool[i];
            }
        }
        
        const newParticle = this.createEmptyParticle();
        newParticle.inUse = true;
        this.particlePool.push(newParticle);
        return newParticle;
    }
    
    returnParticleToPool(particle) {
        particle.inUse = false;
    }
    
    onInitialize() {
        // Create trail canvas (main canvas handled by base class)
        this.trailCanvas = document.createElement('canvas');
        this.trailCtx = this.trailCanvas.getContext('2d');
    }
    
    onResize(width, height) {
        // Update trail canvas dimensions
        if (this.trailCanvas) {
            this.trailCanvas.width = width;
            this.trailCanvas.height = height;
        }
        
        // Scale existing particles based on dimension changes
        if (this.particles.length > 0) {
            const oldWidth = this.canvas.width || width;
            const oldHeight = this.canvas.height || height;
            const scaleX = width / oldWidth;
            const scaleY = height / oldHeight;
            
            this.particles.forEach(particle => {
                particle.x *= scaleX;
                particle.y *= scaleY;
            });
        }
    }
    
    // MAL Plugin Interface Methods
    
    /**
     * Update particle physics and lifecycle - called by MAL
     */
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive || !this.isInitialized) return;
        
        // Use shared audio data instead of duplicate processing
        const energy = this.calculateEnergyFromSharedData(sharedAudioData);
        
        // Apply beat reaction
        const effectiveEnergy = this.beatReact ? energy * this.intensity : 0.5;
        
        // Update particle count based on energy
        const targetParticles = Math.floor(50 + effectiveEnergy * 150);
        this.particleCount = Math.min(Math.max(targetParticles, 30), this.maxParticles);
        
        // Particle generation logic
        this.updateParticleGeneration(timestamp, effectiveEnergy);
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (!this.updateParticle(particle, effectiveEnergy)) {
                this.returnParticleToPool(particle);
                this.particles.splice(i, 1);
            }
        }
        
        // Update heat distortion
        this.updateHeatDistortion(effectiveEnergy);
    }
    
    /**
     * Render particles to canvas - called by MAL
     */
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive || !this.isInitialized || !this.ctx) {
            return;
        }
        
        const currentTime = timestamp;
        const timeSinceLastFrame = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Check canvas dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            this.resize();
            if (this.canvas.width === 0 || this.canvas.height === 0) return;
        }
        
        try {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Create trails effect
            if (this.trailCanvas) {
                this.ctx.globalAlpha = 0.85;
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.drawImage(this.trailCanvas, 0, 0);
                this.ctx.globalAlpha = 1.0;
            }
            
            // Render all particles
            this.particles.forEach(particle => {
                this.renderParticle(particle);
            });
            
            // Render heat distortion
            this.renderHeatDistortion();
            
            // Update trail canvas
            if (this.trailCtx) {
                this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
                this.trailCtx.drawImage(this.canvas, 0, 0);
            }
            
        } catch (error) {
            console.error('BlobsPlugin: Render error:', error);
            this.recoverCanvasContexts();
        }
    }
    
    calculateEnergyFromSharedData(sharedAudioData) {
        if (!sharedAudioData || !sharedAudioData.frequencies) {
            return 0.5; // Default energy
        }
        
        const frequencies = sharedAudioData.frequencies;
        let sum = 0;
        for (let i = 0; i < frequencies.length; i++) {
            sum += frequencies[i];
        }
        
        const rawEnergy = sum / frequencies.length;
        
        // Smooth energy changes
        this.energyHistory.push(rawEnergy);
        if (this.energyHistory.length > 10) {
            this.energyHistory.shift();
        }
        
        const smoothedEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
        this.currentEnergy = this.currentEnergy * this.energySmoothing + smoothedEnergy * (1 - this.energySmoothing);
        
        return Math.max(0, Math.min(1, this.currentEnergy));
    }
    
    updateParticleGeneration(timestamp, energy) {
        const particleDiff = this.particleCount - this.particles.length;
        
        if (particleDiff > 0) {
            const particlesToAdd = Math.min(Math.ceil(particleDiff * 0.1), 3);
            for (let i = 0; i < particlesToAdd; i++) {
                this.addParticle();
            }
        }
        
        // Continuous generation
        const timeThreshold = this.particleGenerationRate * (1 / (1 + energy));
        const timeSinceLastGeneration = timestamp - this.lastParticleTime;
        
        if (timeSinceLastGeneration > timeThreshold) {
            this.addParticle();
            this.lastParticleTime = timestamp;
        }
        
        // Emergency generation
        if (this.particles.length < 10) {
            const emergencyParticles = Math.min(5, this.particleCount - this.particles.length);
            for (let i = 0; i < emergencyParticles; i++) {
                this.addParticle();
            }
        }
        
        // Force generation if no particles
        if (this.particles.length === 0) {
            const initialParticles = Math.min(20, this.particleCount);
            for (let i = 0; i < initialParticles; i++) {
                this.addParticle();
            }
        }
        
        // Fallback generation
        if (timestamp - this.lastParticleTime > 200) {
            this.addParticle();
            this.lastParticleTime = timestamp;
        }
    }
    
    addParticle() {
        if (!this.canvas) return;
        
        const particle = this.getParticleFromPool();
        
        // Initialize particle properties
        particle.x = Math.random() * this.canvas.width;
        particle.y = this.canvas.height + Math.random() * 50;
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = -Math.random() * 3 - 1;
        particle.life = 1.0;
        particle.decay = 0.002 / this.decayMultiplier;
        particle.size = this.minSize + Math.random() * (this.maxSize - this.minSize);
        particle.colorIndex = Math.floor(Math.random() * this.plasmaColors.length);
        particle.turbulence = 0.3 + Math.random() * 0.5;
        particle.heat = 0.6 + Math.random() * 0.4;
        particle.flicker = Math.random();
        particle.flickerSpeed = 0.02 + Math.random() * 0.08;
        particle.direction = Math.random() * Math.PI * 2;
        particle.baseSpeed = 0.5 + Math.random() * 1.5;
        particle.curvePhase = Math.random() * Math.PI * 2;
        particle.curveStrength = 0.5 + Math.random() * 1.5;
        particle.curveFrequency = 0.01 + Math.random() * 0.03;
        
        this.particles.push(particle);
    }
    
    updateParticle(particle, energy) {
        // Update particle physics
        particle.life -= particle.decay;
        if (particle.life <= 0) return false;
        
        // Apply gravity and turbulence
        particle.vy += this.gravity;
        particle.vx += (Math.random() - 0.5) * this.turbulence * energy;
        particle.vy += (Math.random() - 0.5) * this.turbulence * energy;
        
        // Apply agitation (speed multiplier)
        const speedMultiplier = this.agitate;
        particle.x += particle.vx * speedMultiplier;
        particle.y += particle.vy * speedMultiplier;
        
        // Update curve motion
        particle.curvePhase += particle.curveFrequency;
        particle.x += Math.sin(particle.curvePhase) * particle.curveStrength;
        
        // Update flicker
        particle.flicker += particle.flickerSpeed;
        if (particle.flicker > 1) particle.flicker = 0;
        
        // Update heat based on energy
        particle.heat = Math.min(1, particle.heat + energy * 0.1);
        
        // Remove particles that are off-screen
        if (particle.x < -50 || particle.x > this.canvas.width + 50 || 
            particle.y < -50 || particle.y > this.canvas.height + 50) {
            return false;
        }
        
        return true;
    }
    
    renderParticle(particle) {
        if (!this.ctx) return;
        
        try {
            const color = this.plasmaColors[particle.colorIndex];
            const alpha = particle.life * this.opacity;
            const flickerAlpha = alpha * (0.7 + 0.3 * Math.sin(particle.flicker * Math.PI * 2));
            
            // Apply heat-based color shifting
            const heatFactor = particle.heat;
            const r = Math.min(255, color.r + heatFactor * 50);
            const g = Math.min(255, color.g + heatFactor * 100);
            const b = Math.min(255, color.b + heatFactor * 150);
            
            // Apply saturation
            const gray = (r + g + b) / 3;
            const finalR = gray + (r - gray) * this.saturation;
            const finalG = gray + (g - gray) * this.saturation;
            const finalB = gray + (b - gray) * this.saturation;
            
            // Apply brightness and contrast
            const adjustedR = Math.max(0, Math.min(255, (finalR - 128) * this.contrast + 128 + this.brightness * 50));
            const adjustedG = Math.max(0, Math.min(255, (finalG - 128) * this.contrast + 128 + this.brightness * 50));
            const adjustedB = Math.max(0, Math.min(255, (finalB - 128) * this.contrast + 128 + this.brightness * 50));
            
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(${Math.floor(adjustedR)}, ${Math.floor(adjustedG)}, ${Math.floor(adjustedB)}, ${flickerAlpha})`;
            
            // Draw particle with glow effect
            const size = particle.size * (0.5 + particle.life * 0.5);
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add sparkle effect
            if (particle.flicker > 0.8) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${flickerAlpha * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, size * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
            
        } catch (error) {
            console.error('BlobsPlugin: Particle render error:', error);
        }
    }
    
    updateHeatDistortion(energy) {
        // Update heat distortion effects based on energy
        this.heatDistortion = [];
        const distortionCount = Math.floor(energy * 10);
        
        for (let i = 0; i < distortionCount; i++) {
            this.heatDistortion.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                intensity: energy * this.distortionIntensity,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
    
    renderHeatDistortion() {
        // Heat distortion rendering (simplified for performance)
        // This method is kept for potential future use
    }
    
    recoverCanvasContexts() {
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
        if (this.trailCanvas) {
            this.trailCtx = this.trailCanvas.getContext('2d');
        }
    }
    
    // Blobs-specific API Methods
    
    // Control panel settings
    
    setSaturation(value) {
        this.saturation = Math.max(0, Math.min(2, value / 100));
    }
    
    setPosterize(value) {
        this.posterize = Math.max(2, Math.min(16, value));
    }
    
    setContrast(value) {
        this.contrast = Math.max(0, Math.min(2, value / 100));
    }
    
    setBrightness(value) {
        this.brightness = Math.max(0, Math.min(2, value / 100));
    }
    
    setBeatReact(enabled) {
        this.beatReact = enabled;
    }
    
    setIntensity(value) {
        this.intensity = Math.max(0, Math.min(2, value / 100));
    }
    
    setMinSize(value) {
        this.minSize = Math.max(1, Math.min(50, value));
    }
    
    setMaxSize(value) {
        this.maxSize = Math.max(this.minSize, Math.min(250, value));
    }
    
    setDecayMultiplier(value) {
        this.decayMultiplier = Math.max(0.1, Math.min(20, value));
    }
    
    setAgitate(value) {
        this.agitate = Math.max(0.1, Math.min(5, value));
    }
    
    setDensity(value) {
        this.density = Math.max(50, Math.min(500, value));
        this.particleCount = this.density;
    }
    
    setBeatReact(enabled) {
        this.beatReact = enabled;
    }
    
    toggleBeatReact() {
        this.beatReact = !this.beatReact;
        return this.beatReact;
    }
    
    // Integration methods (base class handles getCanvas, isEnabled, cleanup, handleError)
    
    onCleanup() {
        // Blobs-specific cleanup
        this.particles = [];
        this.particlePool = [];
    }
}

// Make globally available
window.BlobsPlugin = BlobsPlugin;
