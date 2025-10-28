// Blobs Visualization System - Cosmic Plasma Ball Effects
class BlobsVisualization {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.canvas = null;
        this.ctx = null;
        this.trailCanvas = null;
        this.trailCtx = null;
        this.isActive = false;
        this.isInitialized = false;
        this.animationRunning = false;
        
        // Cosmic plasma fire system
        this.particles = [];
        this.maxParticles = 500; // Increased to match density max
        this.particleCount = 200; // Default particle count (will be updated by density)
        
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
        
        // Control panel properties
        this.opacity = 1.0;
        this.saturation = 1.0;
        this.posterize = 16;
        this.contrast = 1.0;
        this.brightness = 1.0;
        this.beatReact = true;
        this.intensity = 1.0;
        this.minSize = 2;
        this.maxSize = 8; // Default 8px, range 8-248px (slider 1-10)
        this.decayMultiplier = 10.0; // 1.0 = normal lifespan, 10.0 = 10x longer (default 10x)
        this.agitate = 1.0; // Speed multiplier: 1.0 = current slow speed, 5.0 = 5x faster
        this.density = 200; // Default 200 particles, range 100-500
        
        // Heat distortion effect
        this.heatDistortion = [];
        this.distortionIntensity = 0.02;
        
        // Performance optimization
        this.lastFrameTime = 0;
        this.targetFPS = 30;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Continuous generation
        this.lastParticleTime = 0;
        this.particleGenerationRate = 100; // Base rate in ms
        
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
        
        // console.log('🔵 Blobs Visualization initialized');
    }
    
    initialize() {
        if (this.isInitialized) return;
        
        // Create main canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'blobs-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '6'; // Above Fluid Dynamics (z-index: 5)
        this.canvas.style.display = 'none';
        
        // CANVAS OWNERSHIP TRACKING - Add unique identifier to canvas
        this.canvas.setAttribute('data-owner', 'BlobsVisualization');
        this.canvas.setAttribute('data-created', new Date().toISOString());
        
        // Create trail canvas (off-screen) for motion blur effect
        this.trailCanvas = document.createElement('canvas');
        this.trailCtx = this.trailCanvas.getContext('2d');
        
        // Add to visualization container
        const container = document.getElementById('visualizationContainer');
        if (container) {
            container.appendChild(this.canvas);
            this.resize();
            this.isInitialized = true;
            // console.log('🔥 Liquid Fire canvas created and added to container');
        } else {
            console.error('🔥 Liquid Fire: visualizationContainer not found!');
        }
    }
    
    resize() {
        if (!this.canvas) {
            // console.error('🔵 Blobs: Canvas not available for resize!');
            return;
        }
        
        const container = document.getElementById('visualizationContainer');
        if (!container) {
            console.error('🔵 Blobs: Container not found during resize!');
            return;
        }
        
        const rect = container.getBoundingClientRect();
        
        // Ensure we have valid container dimensions
        if (rect.width === 0 || rect.height === 0) {
            console.warn('🔵 Blobs: Container has zero dimensions, using fallback:', rect);
            // Use window dimensions as fallback
            const fallbackWidth = Math.max(window.innerWidth, 800);
            const fallbackHeight = Math.max(window.innerHeight, 600);
            this.setCanvasDimensions(fallbackWidth, fallbackHeight);
            return;
        }
        
        // Store old dimensions for particle scaling
        const oldWidth = this.canvas.width || rect.width;
        const oldHeight = this.canvas.height || rect.height;
        
        // Ensure minimum dimensions - use container size directly
        const newWidth = Math.max(rect.width, 400); // Reduced minimum
        const newHeight = Math.max(rect.height, 300); // Reduced minimum
        
        this.setCanvasDimensions(newWidth, newHeight, oldWidth, oldHeight);
        
        // console.log('🔵 Blobs canvas resized to:', newWidth, 'x', newHeight);
    }
    
    setCanvasDimensions(width, height, oldWidth = null, oldHeight = null) {
        if (!this.canvas) {
            console.error('🔵 Blobs: Canvas not available for dimension setting!');
            return;
        }
        
        // Validate dimensions
        if (width <= 0 || height <= 0) {
            console.error('🔵 Blobs: Invalid dimensions:', width, 'x', height);
            return;
        }
        
        // Update canvas dimensions
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Recreate context to ensure it's valid
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('🔵 Blobs: Failed to get canvas context!');
            return;
        }
        
        // CANVAS CONTEXT INTERCEPTOR - Track external drawing operations
        this.interceptCanvasContext();
        
        // Update trail canvas dimensions
        this.trailCanvas.width = width;
        this.trailCanvas.height = height;
        this.trailCtx = this.trailCanvas.getContext('2d');
        
        // Scale existing particle positions if we have old dimensions
        if (oldWidth && oldHeight && this.particles && this.particles.length > 0) {
            const scaleX = width / oldWidth;
            const scaleY = height / oldHeight;
            
            this.particles.forEach(particle => {
                particle.x *= scaleX;
                particle.y *= scaleY;
                // Update swirlRadius for new dimensions
                if (particle.swirlRadius) {
                    particle.swirlRadius *= Math.min(scaleX, scaleY);
                }
            });
            // console.log(`🔵 Blobs: Scaled ${this.particles.length} particles for new canvas size`);
        }
        
        // Initialize heat distortion grid
        this.initHeatDistortion();
        
        // console.log('🔵 Blobs canvas dimensions set:', width, 'x', height, 'Context valid:', !!this.ctx);
    }
    
    interceptCanvasContext() {
        if (!this.ctx) return;
        
        // Intercept rectangle drawing methods to track external usage
        const originalFillRect = this.ctx.fillRect;
        const originalStrokeRect = this.ctx.strokeRect;
        const originalRect = this.ctx.rect;
        
        this.ctx.fillRect = (...args) => {
            console.warn('🔵 Blobs: EXTERNAL fillRect detected on Blobs canvas:', {
                args: args,
                stack: new Error().stack,
                timestamp: new Date().toISOString()
            });
            return originalFillRect.apply(this.ctx, args);
        };
        
        this.ctx.strokeRect = (...args) => {
            console.warn('🔵 Blobs: EXTERNAL strokeRect detected on Blobs canvas:', {
                args: args,
                stack: new Error().stack,
                timestamp: new Date().toISOString()
            });
            return originalStrokeRect.apply(this.ctx, args);
        };
        
        this.ctx.rect = (...args) => {
            console.warn('🔵 Blobs: EXTERNAL rect detected on Blobs canvas:', {
                args: args,
                stack: new Error().stack,
                timestamp: new Date().toISOString()
            });
            return originalRect.apply(this.ctx, args);
        };
        
        // console.log('🔵 Blobs: Canvas context interceptor installed');
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
        
        // Ensure canvas has valid dimensions and context
        this.ensureCanvasValid();
        
        this.isActive = true;
        
        // Force canvas visibility with comprehensive validation
        this.ensureCanvasVisible();
        
        // Validate parameters before generating particles
        this.validateParameters();
        
        this.generateInitialParticles();
        
        // Start animation loop if not already running
        if (!this.animationRunning) {
            this.animationRunning = true;
            this.animate();
            // console.log('🔵 Blobs animation loop started');
        }
        
        // Debug: Check canvas visibility
        this.debugCanvasVisibility();
    }
    
    ensureCanvasVisible() {
        if (!this.canvas) {
            console.error('🔵 Blobs: Canvas not available for visibility check!');
            return false;
        }
        
        try {
            // Force display to block
            this.canvas.style.display = 'block';
            this.canvas.style.visibility = 'visible';
            this.canvas.style.opacity = '1';
            
            // Ensure canvas is in the DOM
            if (!document.body.contains(this.canvas)) {
                console.warn('🔵 Blobs: Canvas not in DOM, attempting to re-add...');
                const container = document.getElementById('visualizationContainer');
                if (container) {
                    container.appendChild(this.canvas);
                } else {
                    console.error('🔵 Blobs: visualizationContainer not found!');
                    return false;
                }
            }
            
            // Force canvas to be visible
            this.canvas.style.position = 'absolute';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.zIndex = '10';
            this.canvas.style.pointerEvents = 'none';
            
            // console.log('🔵 Blobs: Canvas visibility forced');
            return true;
            
        } catch (error) {
            console.error('🔵 Blobs: Canvas visibility setup error:', error);
            return false;
        }
    }
    
    debugCanvasVisibility() {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(this.canvas);
        const parentStyle = this.canvas.parentElement ? window.getComputedStyle(this.canvas.parentElement) : null;
        
        const visibilityInfo = {
            canvas: this.canvas,
            width: this.canvas.width,
            height: this.canvas.height,
            particles: this.particles.length,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            top: computedStyle.top,
            left: computedStyle.left,
            boundingRect: rect,
            parentElement: this.canvas.parentElement,
            parentDisplay: parentStyle ? parentStyle.display : 'unknown',
            parentVisibility: parentStyle ? parentStyle.visibility : 'unknown',
            parentOpacity: parentStyle ? parentStyle.opacity : 'unknown',
            animationRunning: this.animationRunning,
            contextValid: !!this.ctx,
            isInDOM: document.body.contains(this.canvas),
            canvasOffsetWidth: this.canvas.offsetWidth,
            canvasOffsetHeight: this.canvas.offsetHeight,
            canvasClientWidth: this.canvas.clientWidth,
            canvasClientHeight: this.canvas.clientHeight
        };
        
        // console.log('🔵 Blobs visualization started - FULL VISIBILITY DEBUG:', visibilityInfo);
        
        // Check for common visibility issues
        if (computedStyle.display === 'none') {
            console.error('🔵 Blobs: Canvas display is NONE!');
        }
        if (computedStyle.visibility === 'hidden') {
            console.error('🔵 Blobs: Canvas visibility is HIDDEN!');
        }
        if (parseFloat(computedStyle.opacity) === 0) {
            console.error('🔵 Blobs: Canvas opacity is 0!');
        }
        if (rect.width === 0 || rect.height === 0) {
            console.error('🔵 Blobs: Canvas bounding rect is 0x0!');
        }
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            console.error('🔵 Blobs: Canvas dimensions are 0x0!');
        }
        if (!document.body.contains(this.canvas)) {
            console.error('🔵 Blobs: Canvas not in DOM!');
        }
        if (parentStyle && parentStyle.display === 'none') {
            console.error('🔵 Blobs: Parent container display is NONE!');
        }
        if (parentStyle && parentStyle.visibility === 'hidden') {
            console.error('🔵 Blobs: Parent container visibility is HIDDEN!');
        }
        if (parentStyle && parseFloat(parentStyle.opacity) === 0) {
            console.error('🔵 Blobs: Parent container opacity is 0!');
        }
    }
    
    checkCanvasVisibility() {
        if (!this.canvas) return false;
        
        const rect = this.canvas.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(this.canvas);
        const parentStyle = this.canvas.parentElement ? window.getComputedStyle(this.canvas.parentElement) : null;
        
        // Check for visibility issues
        const issues = [];
        
        if (computedStyle.display === 'none') issues.push('display:none');
        if (computedStyle.visibility === 'hidden') issues.push('visibility:hidden');
        if (parseFloat(computedStyle.opacity) === 0) issues.push('opacity:0');
        if (rect.width === 0 || rect.height === 0) issues.push('boundingRect:0x0');
        if (this.canvas.width === 0 || this.canvas.height === 0) issues.push('canvasSize:0x0');
        if (!document.body.contains(this.canvas)) issues.push('notInDOM');
        if (parentStyle && parentStyle.display === 'none') issues.push('parentDisplay:none');
        if (parentStyle && parentStyle.visibility === 'hidden') issues.push('parentVisibility:hidden');
        if (parentStyle && parseFloat(parentStyle.opacity) === 0) issues.push('parentOpacity:0');
        
        if (issues.length > 0) {
            console.warn('🔵 Blobs: Canvas visibility issues detected:', issues);
                // console.log('🔵 Blobs: Attempting to fix visibility...');
            this.ensureCanvasVisible();
            return false;
        }
        
        return true;
    }
    
    isCanvasActuallyVisible() {
        if (!this.canvas) return false;
        
        const rect = this.canvas.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(this.canvas);
        
        // Check if canvas is actually visible to user
        const isVisible = (
            computedStyle.display !== 'none' &&
            computedStyle.visibility !== 'hidden' &&
            parseFloat(computedStyle.opacity) > 0 &&
            rect.width > 0 &&
            rect.height > 0 &&
            this.canvas.width > 0 &&
            this.canvas.height > 0 &&
            document.body.contains(this.canvas)
        );
        
        // Check parent visibility
        let parentVisible = true;
        let currentElement = this.canvas.parentElement;
        while (currentElement && currentElement !== document.body) {
            const parentStyle = window.getComputedStyle(currentElement);
            if (parentStyle.display === 'none' || 
                parentStyle.visibility === 'hidden' || 
                parseFloat(parentStyle.opacity) === 0) {
                parentVisible = false;
                break;
            }
            currentElement = currentElement.parentElement;
        }
        
        return isVisible && parentVisible;
    }
    
    ensureCanvasValid() {
        if (!this.canvas) {
            console.error('🔵 Blobs: Canvas not available for validation!');
            return false;
        }
        
        // Check if canvas has valid dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            console.warn('🔵 Blobs: Canvas has invalid dimensions, forcing resize...');
            this.resize();
        }
        
        // Check if context is valid
        if (!this.ctx) {
            console.warn('🔵 Blobs: Canvas context invalid, recreating...');
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                console.error('🔵 Blobs: Failed to recreate canvas context!');
                return false;
            }
        }
        
        // Final validation
        const isValid = this.canvas.width > 0 && this.canvas.height > 0 && !!this.ctx;
        // console.log('🔵 Blobs canvas validation:', {
        //     width: this.canvas.width,
        //     height: this.canvas.height,
        //     contextValid: !!this.ctx,
        //     overallValid: isValid
        // });
        
        return isValid;
    }
    
    recoverCanvasContexts() {
        console.warn('🔵 Blobs: Attempting canvas context recovery...');
        
        try {
            // Recreate main canvas context
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
                if (!this.ctx) {
                    console.error('🔵 Blobs: Failed to recreate main canvas context!');
                    return false;
                }
            }
            
            // Recreate trail canvas context
            if (this.trailCanvas) {
                this.trailCtx = this.trailCanvas.getContext('2d');
                if (!this.trailCtx) {
                    console.error('🔵 Blobs: Failed to recreate trail canvas context!');
                    return false;
                }
            }
            
            // Validate canvas dimensions
            if (this.canvas && (this.canvas.width === 0 || this.canvas.height === 0)) {
                console.warn('🔵 Blobs: Canvas has invalid dimensions during recovery, forcing resize...');
                this.resize();
            }
            
            // console.log('🔵 Blobs: Canvas context recovery successful');
            return true;
            
        } catch (error) {
            console.error('🔵 Blobs: Canvas context recovery failed:', error);
            return false;
        }
    }
    
    stop() {
        this.isActive = false;
        
        // Properly hide canvas
        if (this.canvas) {
            this.canvas.style.display = 'none';
            this.canvas.style.visibility = 'hidden';
            this.canvas.style.opacity = '0';
        }
        
        this.particles = [];
        
        // Don't stop the animation loop - just mark as inactive
        // The animation loop will continue but skip rendering
        // console.log('🔵 Blobs visualization stopped (animation loop continues)');
    }
    
    generateInitialParticles() {
        this.particles = [];
        const initialCount = Math.max(this.particleCount, 20); // Ensure at least 20 particles
        for (let i = 0; i < initialCount; i++) {
            this.addParticle();
        }
        // console.log('🔵 Blobs: Generated', this.particles.length, 'initial particles');
        
        // Debug: Log first particle details
        if (this.particles.length > 0) {
            const firstParticle = this.particles[0];
            // console.log('🔵 Blobs: First particle details:', {
            //     x: firstParticle.x.toFixed(1),
            //     y: firstParticle.y.toFixed(1),
            //     life: firstParticle.life.toFixed(3),
            //     decay: firstParticle.decay.toFixed(6),
            //     size: firstParticle.size.toFixed(1),
            //     canvasWidth: this.canvas.width,
            //     canvasHeight: this.canvas.height
            // });
        }
    }
    
    validateParameters() {
        // Ensure size parameters are valid
        if (this.minSize <= 0) {
            console.warn('🔵 Blobs: Invalid minSize, setting to 1');
            this.minSize = 1;
        }
        
        if (this.maxSize <= 0) {
            console.warn('🔵 Blobs: Invalid maxSize, setting to 8px');
            this.maxSize = 8;
        }
        
        if (this.maxSize < this.minSize) {
            console.warn('🔵 Blobs: maxSize < minSize, adjusting maxSize');
            this.maxSize = this.minSize + 1;
        }
        
        // Ensure density is valid
        if (this.density < 100 || this.density > 500) {
            console.warn('🔵 Blobs: Invalid density, setting to 200');
            this.density = 200;
            this.particleCount = 200;
        }
        
        // Parameters validated successfully
    }
    
    addParticle() {
        // Validate parameters before creating particle
        if (!this.canvas || this.canvas.width <= 0 || this.canvas.height <= 0) {
            console.warn('🔵 Blobs: Cannot add particle - invalid canvas dimensions');
            return;
        }
        
        if (this.maxSize <= 0 || this.minSize <= 0 || this.maxSize < this.minSize) {
            console.warn('🔵 Blobs: Cannot add particle - invalid size parameters:', {
                minSize: this.minSize,
                maxSize: this.maxSize
            });
            return;
        }
        
        // Spawn randomly anywhere on canvas
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        
        // Random direction and speed - REDUCED
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.6; // Speed between 0.2-0.8 (reduced from 1-4)
        
        const particle = {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0, // Start at full life
            decay: (0.002 + Math.random() * 0.004) / this.decayMultiplier, // Decay rate affected by multiplier
            size: Math.max(this.minSize, Math.min(this.maxSize, this.minSize + Math.random() * (this.maxSize - this.minSize))),
            colorIndex: Math.floor(Math.random() * this.plasmaColors.length),
            turbulence: 0.3 + Math.random() * 0.4,
            heat: 0.6 + Math.random() * 0.4,
            flicker: Math.random() * Math.PI * 2,
            flickerSpeed: 0.05 + Math.random() * 0.1,
            direction: angle, // Store original direction for reference
            baseSpeed: speed, // Store base speed
            curvePhase: Math.random() * Math.PI * 2, // For curved paths
            curveStrength: 1.0 + Math.random() * 2.0, // How much the path curves
            curveFrequency: 0.02 + Math.random() * 0.04 // How fast the curve oscillates
        };
        
        this.particles.push(particle);
    }
    
    updateParticle(particle, energy) {
        // Apply random movement with energy influence - FIXED SPEED LIMITS
        const energyInfluence = energy * this.intensity;
        
        // Apply turbulence based on energy for random movement - REDUCED
        const turbulenceFactor = this.turbulence * (1 + energy * 0.2); // Reduced from * 2
        particle.vx += (Math.random() - 0.5) * particle.turbulence * turbulenceFactor * 0.05; // Reduced by 20x
        particle.vy += (Math.random() - 0.5) * particle.turbulence * turbulenceFactor * 0.05; // Reduced by 20x
        
        // Apply energy-based speed boost - REDUCED
        const energyBoost = energyInfluence * 0.05; // Reduced from 0.5
        particle.vx *= (1 + energyBoost);
        particle.vy *= (1 + energyBoost);
        
        // SPEED LIMITING - Prevent runaway acceleration (scaled by agitate)
        const maxSpeed = 2.0 * this.agitate; // Maximum speed per frame (scaled by agitate)
        const currentSpeed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (currentSpeed > maxSpeed) {
            const scale = maxSpeed / currentSpeed;
            particle.vx *= scale;
            particle.vy *= scale;
        }
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Light gravity effect - REDUCED
        particle.vy += this.gravity * 0.05; // Reduced from 0.3
        
        // Update flicker for natural movement variation - REDUCED
        particle.flicker += particle.flickerSpeed;
        particle.vx += Math.sin(particle.flicker) * 0.005; // Reduced from 0.1
        particle.vy += Math.cos(particle.flicker) * 0.005; // Reduced from 0.1
        
        // Add curved path motion - REDUCED
        particle.curvePhase += particle.curveFrequency;
        const curveForce = Math.sin(particle.curvePhase) * particle.curveStrength;
        
        // Apply curve perpendicular to current direction - REDUCED
        const perpAngle = Math.atan2(particle.vy, particle.vx) + Math.PI / 2;
        particle.vx += Math.cos(perpAngle) * curveForce * 0.01; // Reduced from 0.3
        particle.vy += Math.sin(perpAngle) * curveForce * 0.01; // Reduced from 0.3
        
        // Apply decay to life
        particle.life -= particle.decay;
        
        // Update heat based on energy
        particle.heat = Math.min(1.0, 0.6 + energy * 0.4);
        
        // Remove particles when they die or go off screen
        if (particle.life <= 0 || 
            particle.x < -50 || particle.x > this.canvas.width + 50 ||
            particle.y < -50 || particle.y > this.canvas.height + 50) {
            
            // Debug: Log why particle was removed
            if (Math.random() < 0.01) { // 1% chance to log
                // console.log('🔵 Blobs: Particle removed:', {
                //     life: particle.life.toFixed(3),
                //     x: particle.x.toFixed(1),
                //     y: particle.y.toFixed(1),
                //     canvasWidth: this.canvas.width,
                //     canvasHeight: this.canvas.height,
                //     reason: particle.life <= 0 ? 'life_expired' : 'off_screen'
                // });
            }
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
        try {
            const alpha = particle.life * particle.heat * this.opacity;
            const size = particle.size * alpha * this.intensity;
            
            // COMPREHENSIVE PARTICLE DATA VALIDATION
            if (!particle || typeof particle.x !== 'number' || typeof particle.y !== 'number' || 
                isNaN(particle.x) || isNaN(particle.y) || !isFinite(particle.x) || !isFinite(particle.y)) {
                console.warn('🔵 Blobs: Invalid particle data:', particle);
                return;
            }
            
            // Additional validation for size and alpha
            if (isNaN(size) || !isFinite(size) || size <= 0 || size > 1000) {
                console.warn('🔵 Blobs: Invalid particle size:', { size, alpha, particleSize: particle.size, intensity: this.intensity });
                return;
            }
            
            if (isNaN(alpha) || !isFinite(alpha) || alpha < 0 || alpha > 1) {
                console.warn('🔵 Blobs: Invalid particle alpha:', { alpha, life: particle.life, heat: particle.heat, opacity: this.opacity });
                return;
            }
            
            // Validate particle position bounds
            if (particle.x < -1000 || particle.x > this.canvas.width + 1000 || 
                particle.y < -1000 || particle.y > this.canvas.height + 1000) {
                console.warn('🔵 Blobs: Particle out of bounds:', { x: particle.x, y: particle.y, canvasSize: `${this.canvas.width}x${this.canvas.height}` });
                return;
            }
            
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
            
            // CONTEXT STATE ISOLATION - Save context before main particle rendering
            this.ctx.save();
            
            // ENHANCED CANVAS CONTEXT STATE MONITORING
            const contextStateBefore = {
                globalAlpha: this.ctx.globalAlpha,
                globalCompositeOperation: this.ctx.globalCompositeOperation,
                fillStyle: this.ctx.fillStyle,
                strokeStyle: this.ctx.strokeStyle,
                lineWidth: this.ctx.lineWidth,
                lineCap: this.ctx.lineCap,
                lineJoin: this.ctx.lineJoin,
                miterLimit: this.ctx.miterLimit,
                shadowBlur: this.ctx.shadowBlur,
                shadowColor: this.ctx.shadowColor,
                shadowOffsetX: this.ctx.shadowOffsetX,
                shadowOffsetY: this.ctx.shadowOffsetY,
                transform: this.ctx.getTransform ? this.ctx.getTransform() : 'not_supported'
            };
            
            // TESTING: Use solid color instead of gradient to isolate the issue
            // Create cosmic plasma gradient - more intense and elongated
            // TEMPORARILY DISABLED - testing if gradient creation causes rectangles
            if (false) {
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
            } else {
                // Use solid color instead of gradient - TESTING
                this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // RESTORE CONTEXT AFTER MAIN PARTICLE RENDERING
            this.ctx.restore();
            
            // Check if context state was corrupted
            const contextStateAfter = {
                globalAlpha: this.ctx.globalAlpha,
                globalCompositeOperation: this.ctx.globalCompositeOperation,
                fillStyle: this.ctx.fillStyle,
                strokeStyle: this.ctx.strokeStyle,
                lineWidth: this.ctx.lineWidth,
                lineCap: this.ctx.lineCap,
                lineJoin: this.ctx.lineJoin,
                miterLimit: this.ctx.miterLimit,
                shadowBlur: this.ctx.shadowBlur,
                shadowColor: this.ctx.shadowColor,
                shadowOffsetX: this.ctx.shadowOffsetX,
                shadowOffsetY: this.ctx.shadowOffsetY,
                transform: this.ctx.getTransform ? this.ctx.getTransform() : 'not_supported'
            };
            
            // ENHANCED CORRUPTION DETECTION - Show exactly what changed
            const corruptedProperties = [];
            for (const [key, beforeValue] of Object.entries(contextStateBefore)) {
                const afterValue = contextStateAfter[key];
                if (beforeValue !== afterValue) {
                    corruptedProperties.push({
                        property: key,
                        before: beforeValue,
                        after: afterValue
                    });
                }
            }
            
            if (corruptedProperties.length > 0) {
                this.corruptionCounts.mainParticle++;
                
                // Log corruption summary every 5 seconds instead of every occurrence
                const now = Date.now();
                if (now - this.lastCorruptionLog > 5000) { // 5 seconds
                    // console.warn('🔵 Blobs: Context corruption summary (last 5s):', {
                    //     mainParticle: this.corruptionCounts.mainParticle,
                    //     sparkle: this.corruptionCounts.sparkle,
                    //     streak: this.corruptionCounts.streak,
                    //     latestCorruption: {
                    //         operation: 'MAIN_PARTICLE',
                    //         particle: { x: particle.x.toFixed(2), y: particle.y.toFixed(2), size: size.toFixed(2), alpha: alpha.toFixed(3) },
                    //         corruptedProperties: corruptedProperties
                    //     }
                    // });
                    
                    // EXPANDED CORRUPTION DETAILS - Show exactly what's corrupted
                    if (corruptedProperties.length > 0) {
                        // console.warn('🔵 Blobs: DETAILED corruption analysis:', {
                        //     operation: 'MAIN_PARTICLE',
                        //     corruptedProperties: corruptedProperties.map(cp => ({
                        //         property: cp.property,
                        //         before: cp.before,
                        //         after: cp.after,
                        //         changed: cp.before !== cp.after
                        //     }))
                        // });
                        
                        // INDIVIDUAL PROPERTY ANALYSIS - Show each corrupted property separately
                        corruptedProperties.forEach((cp, index) => {
                            // console.warn(`🔵 Blobs: CORRUPTED PROPERTY ${index + 1}:`, {
                            //     property: cp.property,
                            //     before: cp.before,
                            //     after: cp.after,
                            //     type: typeof cp.before,
                            //     changed: cp.before !== cp.after
                            // });
                        });
                    }
                    
                    // Reset counters
                    this.corruptionCounts.mainParticle = 0;
                    this.corruptionCounts.sparkle = 0;
                    this.corruptionCounts.streak = 0;
                    this.lastCorruptionLog = now;
                }
            }
            
            // Particle rendered successfully
            
            // Particle rendering complete
            
            // Add plasma sparkle effect with context isolation
            if (Math.random() < 0.15 * particle.heat) {
                // ISOLATE SPARKLE RENDERING
                this.ctx.save();
                
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x + (Math.random() - 0.5) * size, 
                            particle.y + (Math.random() - 0.5) * size, 
                            size * 0.2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // RESTORE CONTEXT AFTER SPARKLE
                this.ctx.restore();
            }
            
            // DEBUG: Add particle ID for tracking
            if (Math.random() < 0.01) { // Log 1% of particles for debugging
                // console.log('🔵 Blobs: Particle rendered:', {
                //     id: particle.id || 'unknown',
                //     x: particle.x.toFixed(2),
                //     y: particle.y.toFixed(2),
                //     size: size.toFixed(2),
                //     alpha: alpha.toFixed(3),
                //     life: particle.life.toFixed(3),
                //     heat: particle.heat.toFixed(3)
                // });
            }
            
            // Add plasma streaks for cosmic effect with context isolation
            if (Math.random() < 0.1 * particle.heat) {
                // ISOLATE STREAK RENDERING
                this.ctx.save();
                
                this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`;
                this.ctx.lineWidth = size * 0.3;
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y);
                this.ctx.lineTo(
                    particle.x + (Math.random() - 0.5) * size * 2,
                    particle.y + (Math.random() - 0.5) * size * 2
                );
                this.ctx.stroke();
                
                // RESTORE CONTEXT AFTER STREAK
                this.ctx.restore();
            }
            
        } catch (error) {
            console.error('🔵 Blobs: Particle render error:', error, 'Particle:', particle);
            // Don't throw - just skip this particle
        }
    }
    
    renderHeatDistortion() {
        // Heat distortion rectangles disabled - was causing visual artifacts
        // This method kept for potential future use but no longer renders rectangles
    }
    
    render(audioData) {
        if (!this.isActive) {
            return; // Skip rendering but don't log every frame
        }
        
        // Check canvas visibility on every render (but only log occasionally)
        if (Math.random() < 0.001) { // 0.1% chance to check visibility
            const isVisible = this.isCanvasActuallyVisible();
            if (!isVisible) {
                console.warn('🔵 Blobs: Canvas not actually visible to user!');
                this.checkCanvasVisibility();
            }
        }
        
        // Check and fix canvas context issues
        if (!this.ctx) {
            console.warn('🔵 Blobs: Canvas context lost, attempting to recreate...');
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
                if (!this.ctx) {
                    console.error('🔵 Blobs: Failed to recreate canvas context!');
                    return;
                }
                // console.log('🔵 Blobs: Canvas context recreated successfully');
            } else {
                console.error('🔵 Blobs: Canvas not available for context recreation!');
                return;
            }
        }
        
        const currentTime = performance.now();
        if (currentTime - this.lastFrameTime < this.frameInterval) {
            return; // Maintain 30fps
        }
        this.lastFrameTime = currentTime;
        
        // Check and fix canvas dimension issues
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            console.warn('🔵 Blobs: Canvas has zero dimensions, attempting resize...', {
                width: this.canvas.width,
                height: this.canvas.height
            });
            this.resize();
            
            // Check again after resize
            if (this.canvas.width === 0 || this.canvas.height === 0) {
                console.error('🔵 Blobs: Resize failed, canvas still has zero dimensions!');
                return;
            }
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
        
        // Debug: Log particle count info occasionally
        if (Math.random() < 0.01) { // 1% chance to log
            // console.log('🔵 Blobs: Particle count info:', {
            //     current: this.particles.length,
            //     target: this.particleCount,
            //     energy: energy.toFixed(2),
            //     maxParticles: this.maxParticles,
            //     timeSinceLastGeneration: currentTime - this.lastParticleTime,
            //     generationRate: this.particleGenerationRate
            // });
        }
        
        // Smooth particle generation - add/remove gradually instead of in batches
        const particleDiff = this.particleCount - this.particles.length;
        
        if (particleDiff > 0) {
            // Add particles gradually (1-3 per frame based on difference)
            const particlesToAdd = Math.min(Math.ceil(particleDiff * 0.1), 3);
            for (let i = 0; i < particlesToAdd; i++) {
                this.addParticle();
            }
        }
        // REMOVED: Don't remove particles based on target count - let them die naturally
        
        // Continuous particle generation for smoother flow - ALWAYS generate particles
        const timeThreshold = this.particleGenerationRate * (1 / (1 + energy));
        const timeSinceLastGeneration = currentTime - this.lastParticleTime;
        
        if (timeSinceLastGeneration > timeThreshold) {
            // ALWAYS ADD PARTICLES - ignore target count, just keep generating
            this.addParticle();
            this.lastParticleTime = currentTime;
            
            // Debug: Log particle addition
            if (Math.random() < 0.1) { // 10% chance to log
                // console.log('🔵 Blobs: Added new particle, total:', this.particles.length, 'target:', this.particleCount);
            }
        } else {
            // Debug: Why isn't the time condition met?
            if (Math.random() < 0.01) { // 1% chance to log
                // console.log('🔵 Blobs: Time condition not met:', {
                //     timeSinceLastGeneration: timeSinceLastGeneration.toFixed(1),
                //     timeThreshold: timeThreshold.toFixed(1),
                //     energy: energy.toFixed(2),
                //     generationRate: this.particleGenerationRate
                // });
            }
        }
        
        // EMERGENCY PARTICLE GENERATION - Ensure we always have some particles
        if (this.particles.length < 10) { // If we have very few particles, add more aggressively
            const emergencyParticles = Math.min(5, this.particleCount - this.particles.length);
            for (let i = 0; i < emergencyParticles; i++) {
                this.addParticle();
            }
            // console.log('🔵 Blobs: Emergency particle generation, added', emergencyParticles, 'particles, total:', this.particles.length);
        }
        
        // FORCE CONTINUOUS GENERATION - Always ensure we have particles
        if (this.particles.length === 0) {
            // If we have NO particles, immediately add some
            const initialParticles = Math.min(20, this.particleCount);
            for (let i = 0; i < initialParticles; i++) {
                this.addParticle();
            }
            // console.log('🔵 Blobs: FORCED particle generation - no particles found, added', initialParticles, 'particles');
        }
        
        // SIMPLE FALLBACK GENERATION - Add particles every 200ms regardless of other conditions
        if (currentTime - this.lastParticleTime > 200) {
            // ALWAYS ADD PARTICLES - ignore target count
            this.addParticle();
            this.lastParticleTime = currentTime;
            // console.log('🔵 Blobs: Fallback generation - added particle, total:', this.particles.length);
        }
        
        // Clear canvas to transparent for proper compositing - with error handling
        try {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } catch (error) {
            console.error('🔵 Blobs: Canvas clear error:', error);
            this.recoverCanvasContexts();
            return; // Skip this frame
        }
        
        // Create trails effect by drawing previous frame with reduced opacity
        if (this.trailCanvas) {
            try {
                this.ctx.globalAlpha = 0.85; // Trail fade amount
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.drawImage(this.trailCanvas, 0, 0);
                this.ctx.globalAlpha = 1.0;
            } catch (error) {
                console.error('🔵 Blobs: Trail canvas draw error:', error);
                this.recoverCanvasContexts();
                return; // Skip this frame
            }
        }
        
        // Debug rectangle removed - was causing visual artifacts
        
        // Canvas rendering ready
        
        // Update heat distortion
        this.updateHeatDistortion(energy);
        
        // Update and render particles - with error handling
        let renderedParticles = 0;
        let removedParticles = 0;
        try {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const particle = this.particles[i];
                if (this.updateParticle(particle, energy)) {
                    this.renderParticle(particle);
                    renderedParticles++;
                } else {
                    removedParticles++;
                }
            }
            
            // Debug: Log particle removal info occasionally
            if (removedParticles > 0 && Math.random() < 0.1) { // 10% chance to log when particles are removed
                // console.log('🔵 Blobs: Particles removed this frame:', {
                //     removed: removedParticles,
                //     rendered: renderedParticles,
                //     totalBefore: this.particles.length + removedParticles,
                //     totalAfter: this.particles.length
                // });
            }
        } catch (error) {
            console.error('🔵 Blobs: Particle rendering error:', error);
            this.recoverCanvasContexts();
            return; // Skip this frame
        }
        
        // Debug: Log rendering info occasionally
        if (Math.random() < 0.01) { // 1% chance to log
            // console.log('🔥 Liquid Fire render:', {
            //     particles: this.particles.length,
            //     rendered: renderedParticles,
            //     energy: energy.toFixed(2),
            //     canvasSize: `${this.canvas.width}x${this.canvas.height}`
            // });
        }
        
        // Render heat distortion
        this.renderHeatDistortion();
        
        // Update trail canvas with current frame for next frame's trails - with error handling
        try {
            this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
            this.trailCtx.drawImage(this.canvas, 0, 0);
        } catch (error) {
            console.error('🔵 Blobs: Trail canvas update error:', error);
            this.recoverCanvasContexts();
            return; // Skip this frame
        }
    }
    
    animate() {
        // Always continue the animation loop - don't let it terminate
        // Only skip rendering if not active, but keep the loop running
        if (this.isActive) {
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
        } else {
            // Debug: Log when animation loop continues but blobs are inactive
            if (Math.random() < 0.01) { // 1% chance to log
                // console.log('🔵 Blobs animation loop running but inactive - waiting for activation');
            }
        }
        
        // Always continue the animation loop regardless of active state
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
    
    setMinSize(size) {
        this.minSize = Math.max(0.5, Math.min(20, size));
        // Ensure min is not greater than max
        if (this.minSize > this.maxSize) {
            this.maxSize = this.minSize + 1;
        }
    }
    
    setMaxSize(sliderValue) {
        // Convert slider value (1-10) to pixel value (8-248px)
        // Linear interpolation: slider 1 = 8px, slider 10 = 248px
        const clampedValue = Math.max(1, Math.min(10, sliderValue));
        this.maxSize = 8 + (clampedValue - 1) * (248 - 8) / (10 - 1);
        
        // Max size updated successfully
        
        // Ensure max is not less than min
        if (this.maxSize < this.minSize) {
            this.minSize = this.maxSize - 1;
        }
        
        // Update existing particles to new size range
        this.particles.forEach(particle => {
            // Resize existing particles proportionally
            const currentSizeRatio = (particle.size - this.minSize) / (this.maxSize - this.minSize);
            particle.size = this.minSize + currentSizeRatio * (this.maxSize - this.minSize);
            particle.size = Math.max(this.minSize, Math.min(this.maxSize, particle.size));
        });
        
        // console.log('🔵 Blobs max size set to:', this.maxSize.toFixed(1), 'px (slider:', clampedValue, ') updated', this.particles.length, 'existing particles');
    }
    
    setDecayMultiplier(multiplier) {
        this.decayMultiplier = Math.max(0.1, Math.min(10, multiplier));
        // console.log('🔵 Blobs decay multiplier set to:', this.decayMultiplier);
    }
    
    setAgitate(value) {
        this.agitate = Math.max(0.1, Math.min(5.0, value));
        // console.log('🔵 Blobs agitate set to:', this.agitate);
    }
    
    setDensity(count) {
        this.density = Math.max(100, Math.min(500, count));
        this.particleCount = this.density; // Update target particle count
        
        // If we need more particles, add them immediately
        if (this.particles.length < this.particleCount) {
            const particlesToAdd = this.particleCount - this.particles.length;
            for (let i = 0; i < particlesToAdd; i++) {
                this.addParticle();
            }
        }
        // If we have too many particles, remove excess (oldest first)
        else if (this.particles.length > this.particleCount) {
            const particlesToRemove = this.particles.length - this.particleCount;
            this.particles.splice(0, particlesToRemove);
        }
        
        // console.log('🔵 Blobs density set to:', this.density, 'particles, current count:', this.particles.length);
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
