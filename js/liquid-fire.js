// Blobs Visualization System - Cosmic Plasma Ball Effects
class BlobsVisualization {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;
        this.isInitialized = false;
        
        // Cosmic plasma fire system
        this.particles = [];
        this.maxParticles = 300;
        this.particleCount = 100;
        
        // Plasma physics
        this.gravity = 0.05;
        this.turbulence = 0.8;
        this.energyMultiplier = 1.0;
        this.boilingIntensity = 1.2;
        this.vortexStrength = 0.3;
        this.swirlSpeed = 0.02;
        
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
        
        // Control panel properties
        this.opacity = 1.0;
        this.saturation = 1.0;
        this.posterize = 16;
        this.contrast = 1.0;
        this.brightness = 1.0;
        this.beatReact = true;
        this.intensity = 1.0;
        
        // Heat distortion effect
        this.heatDistortion = [];
        this.distortionIntensity = 0.02;
        
        // Performance optimization
        this.lastFrameTime = 0;
        this.targetFPS = 30;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Audio energy tracking
        this.energyHistory = [];
        this.energySmoothing = 0.7;
        this.currentEnergy = 0;
        
        console.log('🔵 Blobs Visualization initialized');
    }
    
    initialize() {
        if (this.isInitialized) return;
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'blobs-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '9999'; // Very high z-index to ensure visibility
        this.canvas.style.display = 'none';
        
        // Add to visualization container
        const container = document.getElementById('visualizationContainer');
        if (container) {
            container.appendChild(this.canvas);
            this.resize();
            this.isInitialized = true;
            console.log('🔥 Liquid Fire canvas created and added to container');
        } else {
            console.error('🔥 Liquid Fire: visualizationContainer not found!');
        }
    }
    
    resize() {
        if (!this.canvas) return;
        
        const container = document.getElementById('visualizationContainer');
        if (!container) {
            console.error('🔵 Blobs: Container not found during resize!');
            return;
        }
        
        const rect = container.getBoundingClientRect();
        
        // Store old dimensions for particle scaling
        const oldWidth = this.canvas.width || rect.width;
        const oldHeight = this.canvas.height || rect.height;
        
        // Ensure minimum dimensions
        const newWidth = Math.max(rect.width, 800);
        const newHeight = Math.max(rect.height, 600);
        
        // Calculate scale factors for particle positions
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;
        
        // Update canvas dimensions
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.ctx = this.canvas.getContext('2d');
        
        // Scale existing particle positions to maintain their relative positions
        if (this.particles && this.particles.length > 0) {
            this.particles.forEach(particle => {
                particle.x *= scaleX;
                particle.y *= scaleY;
                // Update swirlRadius for new dimensions
                if (particle.swirlRadius) {
                    particle.swirlRadius *= Math.min(scaleX, scaleY);
                }
            });
            console.log(`🔵 Blobs: Scaled ${this.particles.length} particles for new canvas size`);
        }
        
        // Initialize heat distortion grid
        this.initHeatDistortion();
        
        console.log('🔵 Blobs canvas resized to:', newWidth, 'x', newHeight, `(scale: ${scaleX.toFixed(2)}x, ${scaleY.toFixed(2)}y)`);
    }
    
    initHeatDistortion() {
        this.heatDistortion = [];
        const gridSize = 20;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            for (let y = 0; y < this.canvas.height; y += gridSize) {
                this.heatDistortion.push({
                    x: x,
                    y: y,
                    offsetX: 0,
                    offsetY: 0,
                    intensity: 0
                });
            }
        }
    }
    
    start() {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        if (!this.canvas) {
            console.error('🔥 Liquid Fire: Canvas not initialized!');
            return;
        }
        
        this.isActive = true;
        this.canvas.style.display = 'block';
        this.generateInitialParticles();
        this.animate();
        
        // Debug: Check canvas visibility
        const rect = this.canvas.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(this.canvas);
        
        console.log('🔵 Blobs visualization started', {
            canvas: this.canvas,
            width: this.canvas.width,
            height: this.canvas.height,
            particles: this.particles.length,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            boundingRect: rect,
            parentElement: this.canvas.parentElement
        });
    }
    
    stop() {
        this.isActive = false;
        this.canvas.style.display = 'none';
        this.particles = [];
        
        console.log('🔵 Blobs visualization stopped');
    }
    
    generateInitialParticles() {
        this.particles = [];
        const initialCount = Math.max(this.particleCount, 20); // Ensure at least 20 particles
        for (let i = 0; i < initialCount; i++) {
            this.addParticle();
        }
        console.log('🔵 Blobs: Generated', this.particles.length, 'initial particles');
    }
    
    addParticle() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.min(this.canvas.width, this.canvas.height) * 0.3;
        
        const particle = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3 - 1,
            life: 1.0,
            decay: 0.003 + Math.random() * 0.005,
            size: 2 + Math.random() * 6,
            colorIndex: Math.floor(Math.random() * this.plasmaColors.length),
            turbulence: 0.3 + Math.random() * 0.4,
            heat: 0.6 + Math.random() * 0.4,
            flicker: Math.random() * Math.PI * 2,
            flickerSpeed: 0.05 + Math.random() * 0.1,
            swirlPhase: Math.random() * Math.PI * 2,
            swirlRadius: radius,
            originalAngle: angle,
            vortexInfluence: 0.5 + Math.random() * 0.5
        };
        
        this.particles.push(particle);
    }
    
    updateParticle(particle, energy) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Calculate distance from center for vortex effect
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Apply cosmic plasma vortex effect
        particle.swirlPhase += this.swirlSpeed * (1 + energy * 2);
        
        // Vortex force - particles spiral inward and upward
        const vortexForce = this.vortexStrength * (1 + energy * 1.5);
        const vortexAngle = Math.atan2(dy, dx) + this.swirlSpeed;
        const inwardForce = -vortexForce * 0.1; // Pull toward center
        const upwardForce = -vortexForce * 0.3; // Pull upward
        
        particle.vx += inwardForce * Math.cos(vortexAngle) + (Math.random() - 0.5) * 0.5;
        particle.vy += upwardForce + inwardForce * Math.sin(vortexAngle) + (Math.random() - 0.5) * 0.5;
        
        // Apply turbulence based on energy
        const turbulenceFactor = this.turbulence * (1 + energy * 3);
        particle.vx += (Math.random() - 0.5) * particle.turbulence * turbulenceFactor;
        particle.vy += (Math.random() - 0.5) * particle.turbulence * turbulenceFactor;
        
        // Apply energy-based upward force (boiling effect)
        const boilingForce = energy * this.boilingIntensity * this.intensity;
        particle.vy -= boilingForce;
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Apply gravity (much weaker for plasma effect)
        particle.vy += this.gravity;
        
        // Update flicker for plasma movement
        particle.flicker += particle.flickerSpeed;
        particle.vx += Math.sin(particle.flicker) * 0.2;
        particle.vy += Math.cos(particle.flicker) * 0.1;
        
        // Update life with energy-based decay
        particle.decay = 0.003 + Math.random() * 0.005 + energy * 0.002;
        particle.life -= particle.decay;
        
        // Update heat based on energy and distance from center
        const heatFromCenter = Math.max(0, 1 - distance / (Math.min(this.canvas.width, this.canvas.height) * 0.5));
        particle.heat = Math.min(1.0, 0.6 + energy * 0.4 + heatFromCenter * 0.3);
        
        // Remove dead particles
        if (particle.life <= 0 || particle.y < -100 || distance > Math.min(this.canvas.width, this.canvas.height)) {
            const index = this.particles.indexOf(particle);
            this.particles.splice(index, 1);
            return false;
        }
        
        return true;
    }
    
    calculateEnergy(audioData) {
        if (!audioData || !audioData.frequencies || !Array.isArray(audioData.frequencies)) {
            // Return a base energy for testing
            return 0.5;
        }
        
        const frequencies = audioData.frequencies;
        
        // Ensure we have valid frequency data
        if (frequencies.length === 0) {
            return 0.5;
        }
        
        // Focus on mid-range frequencies for energy (200Hz - 4kHz)
        const startFreq = Math.floor(frequencies.length * 0.1);
        const endFreq = Math.floor(frequencies.length * 0.4);
        const midRange = frequencies.slice(startFreq, endFreq);
        
        // Calculate average energy with proper validation
        let avgEnergy = 0;
        if (midRange.length > 0) {
            const validValues = midRange.filter(val => !isNaN(val) && isFinite(val));
            if (validValues.length > 0) {
                avgEnergy = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
            } else {
                avgEnergy = 0.5; // Default energy
            }
        } else {
            avgEnergy = 0.5; // Default energy
        }
        
        // Apply smoothing
        this.energyHistory.push(avgEnergy);
        if (this.energyHistory.length > 10) {
            this.energyHistory.shift();
        }
        
        const smoothedEnergy = this.energyHistory.reduce((sum, val) => sum + val, 0) / this.energyHistory.length;
        
        // Scale and clamp
        this.currentEnergy = Math.min(1.0, Math.max(0, smoothedEnergy * this.energySmoothing));
        
        return this.currentEnergy;
    }
    
    updateHeatDistortion(energy) {
        this.heatDistortion.forEach(point => {
            // Calculate distance from center of screen
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
            const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
            const normalizedDistance = distance / maxDistance;
            
            // Heat distortion is stronger near the center and with higher energy
            point.intensity = (1 - normalizedDistance) * energy * this.distortionIntensity;
            point.offsetX = (Math.random() - 0.5) * point.intensity * 2;
            point.offsetY = (Math.random() - 0.5) * point.intensity * 2;
        });
    }
    
    renderParticle(particle) {
        const alpha = particle.life * particle.heat * this.opacity;
        const size = particle.size * alpha * this.intensity;
        
        // Get color with heat-based variation and apply effects
        const colorIndex = Math.floor(particle.colorIndex * particle.heat);
        const color = this.plasmaColors[Math.min(colorIndex, this.plasmaColors.length - 1)];
        
        // Apply brightness and contrast
        let r = Math.min(255, Math.max(0, color.r * this.brightness));
        let g = Math.min(255, Math.max(0, color.g * this.brightness));
        let b = Math.min(255, Math.max(0, color.b * this.brightness));
        
        // Apply contrast
        r = Math.min(255, Math.max(0, (r - 128) * this.contrast + 128));
        g = Math.min(255, Math.max(0, (g - 128) * this.contrast + 128));
        b = Math.min(255, Math.max(0, (b - 128) * this.contrast + 128));
        
        // Apply saturation
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        r = Math.min(255, Math.max(0, gray + (r - gray) * this.saturation));
        g = Math.min(255, Math.max(0, gray + (g - gray) * this.saturation));
        b = Math.min(255, Math.max(0, gray + (b - gray) * this.saturation));
        
        // Apply posterize effect
        if (this.posterize < 16) {
            const levels = this.posterize;
            r = Math.floor(r / 255 * levels) * (255 / levels);
            g = Math.floor(g / 255 * levels) * (255 / levels);
            b = Math.floor(b / 255 * levels) * (255 / levels);
        }
        
        // Create cosmic plasma gradient - more intense and elongated
        const gradient = this.ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, size * 3
        );
        
        // Inner core (brightest white-hot)
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
        
        // Mid-core (bright color)
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
        
        // Outer glow (fading)
        const outerAlpha = alpha * 0.4;
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${outerAlpha})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add plasma sparkle effect
        if (Math.random() < 0.15 * particle.heat) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x + (Math.random() - 0.5) * size, 
                        particle.y + (Math.random() - 0.5) * size, 
                        size * 0.2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Add plasma streaks for cosmic effect
        if (Math.random() < 0.1 * particle.heat) {
            this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`;
            this.ctx.lineWidth = size * 0.3;
            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(
                particle.x + (Math.random() - 0.5) * size * 2,
                particle.y + (Math.random() - 0.5) * size * 2
            );
            this.ctx.stroke();
        }
    }
    
    renderHeatDistortion() {
        // Apply subtle heat shimmer effect
        this.ctx.globalCompositeOperation = 'overlay';
        this.ctx.fillStyle = `rgba(255, 255, 255, 0.02)`;
        
        this.heatDistortion.forEach(point => {
            if (point.intensity > 0.01) {
                this.ctx.fillRect(
                    point.x + point.offsetX, 
                    point.y + point.offsetY, 
                    2, 2
                );
            }
        });
        
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    render(audioData) {
        if (!this.isActive || !this.ctx) {
            console.log('🔥 Liquid Fire render skipped:', { isActive: this.isActive, hasCtx: !!this.ctx });
            return;
        }
        
        const currentTime = performance.now();
        if (currentTime - this.lastFrameTime < this.frameInterval) {
            return; // Maintain 30fps
        }
        this.lastFrameTime = currentTime;
        
        // Debug: Check canvas dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            console.warn('🔥 Liquid Fire: Canvas has zero dimensions!', {
                width: this.canvas.width,
                height: this.canvas.height
            });
            this.resize();
            return;
        }
        
        // Calculate energy from audio
        let energy = this.calculateEnergy(audioData);
        
        // Apply beat reaction if enabled
        if (this.beatReact) {
            energy = energy * this.intensity;
        } else {
            energy = 0.5; // Base energy when beat react is off
        }
        
        // Update particle count based on energy
        const targetParticles = Math.floor(50 + energy * 150);
        this.particleCount = Math.min(Math.max(targetParticles, 30), this.maxParticles); // Ensure minimum 30 particles
        
        // Add/remove particles to match target
        while (this.particles.length < this.particleCount) {
            this.addParticle();
        }
        while (this.particles.length > this.particleCount) {
            this.particles.pop();
        }
        
        // Clear canvas with fade effect for motion blur
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Debug: Only show test rectangles if no particles
        if (this.particles.length === 0) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.fillRect(50, 50, 100, 100);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('NO PARTICLES', 50, 30);
        }
        
        // Update heat distortion
        this.updateHeatDistortion(energy);
        
        // Update and render particles
        let renderedParticles = 0;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (this.updateParticle(particle, energy)) {
                this.renderParticle(particle);
                renderedParticles++;
            }
        }
        
        // Debug: Log rendering info occasionally
        if (Math.random() < 0.01) { // 1% chance to log
            console.log('🔥 Liquid Fire render:', {
                particles: this.particles.length,
                rendered: renderedParticles,
                energy: energy.toFixed(2),
                canvasSize: `${this.canvas.width}x${this.canvas.height}`
            });
        }
        
        // Render heat distortion
        this.renderHeatDistortion();
    }
    
    animate() {
        if (!this.isActive) return;
        
        // Get audio data from visualizer - use the correct method
        let audioData = null;
        if (this.visualizer.audioMotion) {
            try {
                // Try different possible method names
                const frequencies = this.visualizer.audioMotion.getFrequencies ? 
                    this.visualizer.audioMotion.getFrequencies() : 
                    (this.visualizer.audioMotion.frequencies || []);
                const waveform = this.visualizer.audioMotion.getWaveform ? 
                    this.visualizer.audioMotion.getWaveform() : 
                    (this.visualizer.audioMotion.waveform || []);
                
                audioData = { frequencies, waveform };
            } catch (error) {
                console.warn('🔥 Liquid Fire: Error getting audio data:', error);
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
        
        this.render(audioData);
        
        requestAnimationFrame(() => this.animate());
    }
    
    // Integration with kaleidoscope system
    getCanvas() {
        return this.canvas;
    }
    
    isEnabled() {
        return this.isActive;
    }
    
    // Control panel settings
    setOpacity(value) {
        this.opacity = Math.max(0, Math.min(1, value / 100));
    }
    
    setSaturation(value) {
        this.saturation = Math.max(0, Math.min(2, value / 100));
    }
    
    setPosterize(value) {
        this.posterize = Math.max(2, Math.min(16, value));
    }
    
    setContrast(value) {
        this.contrast = Math.max(0.1, Math.min(3, value / 100));
    }
    
    setBrightness(value) {
        this.brightness = Math.max(0.1, Math.min(3, value / 100));
    }
    
    setIntensity(value) {
        this.intensity = Math.max(0.1, Math.min(2, value / 100));
    }
    
    setBeatReact(enabled) {
        this.beatReact = enabled;
    }
    
    // Legacy settings for compatibility
    setParticleCount(count) {
        this.maxParticles = Math.max(20, Math.min(300, count));
    }
    
    setBoilingIntensity(intensity) {
        this.boilingIntensity = Math.max(0.1, Math.min(2.0, intensity));
    }
    
    setTurbulence(turbulence) {
        this.turbulence = Math.max(0.1, Math.min(1.0, turbulence));
    }
    
    setEnergySensitivity(sensitivity) {
        this.energySmoothing = Math.max(0.1, Math.min(1.0, sensitivity));
    }
}
