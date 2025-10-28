/**
 * Nebula Visualization Module
 * Based on Supernova Remnant Renderer with Three.js r128
 * Integrated for audio reactivity and app compatibility
 */

class NebulaVisualization {
    constructor(parentCanvas, audioData) {
        this.parentCanvas = parentCanvas;
        this.audioData = audioData;
        
        // Create dedicated canvas for nebula
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1920;  // Set reasonable initial dimensions
        this.canvas.height = 1080;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'auto';  // Enable mouse interaction (was 'none')
        this.canvas.style.zIndex = '20';  // Much higher z-index to ensure visibility
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.filaments = [];
        this.innerCore = null;
        this.pulsar = null;
        this.stars = null;
        
        // State
        this.enabled = false;
        this.opacity = 1.0;
        this.time = 0;
        
        // Audio reactivity
        this.bassLevel = 0;
        this.midLevel = 0;
        this.trebleLevel = 0;
        
        // Settings - base supernova configuration
        this.settings = {
            // Camera
            cameraDistance: 80,
            cameraOrbit: false,  // OFF by default
            orbitSpeed: 3.0,    // Orbit speed multiplier (default to 5)
            flyThrough: false,  // Fly-through animation mode
            flySpeed: 0.25,     // Fly-through speed multiplier (default to 0.25)
            
            // Filament structure
            filamentDensity: 1.4,
            expansion: 36,
            chaos: 2.8,
            asymmetry: 1.1,
            threadVariation: 1.1,
            particlesPerFilament: 120,  // Base particles per filament (was hardcoded)
            particleSize: 1.0,          // Particle size multiplier
            
            // Central pulsar
            showPulsar: true,
            pulsarSize: 5,
            pulseRate: 2.0,
            
            // Stars
            starCount: 1000,
            
            // Effects
            bloom: true,
            bloomStrength: 1.0,
            renderQuality: 1.0,
            
            // Color controls
            hueShift: 0,        // 0-360 degrees
            saturation: 100,    // 0-200 percent
            brightness: 100,    // 20-200 percent
            
            // Audio reactivity settings
            audioReactive: true,
            audioSensitivity: 1.0,
            overallOpacity: 1.0,   // Master opacity control (0.0 to 1.0)
            knockoutBackground: false,  // Black background knockout using blend modes
            beatReactive: true,
            bassResponse: 1.0,
            midResponse: 1.0,
            trebleResponse: 1.0,
            
            // Morphing mode - allows filaments to evolve and transform over time
            morphingMode: false,
            morphingSpeed: 1.0,     // Speed of morphing changes (0.1 = very slow, 2.0 = fast)
            
            // Audio reactive presets (toggleable)
            audioPresets: {
                color: false,          // Pulsar color reactivity (OFF by default)
                rotation: false,       // Camera rotation reactivity (OFF by default)
                distance: false,       // Camera distance reactivity (OFF by default)
                pulsar: true,          // Pulsar size/pulse reactivity
                filamentDensity: true, // Filament density/thickness reactivity
                chaos: true,           // Chaos/randomness reactivity
                expansion: true        // Expansion/contraction reactivity (NEW)
            }
        };
        
        // Performance
        this.performanceMode = false;
        this.frameSkip = 0;
        
        // Audio reactivity smoothing
        this.smoothedEnergy = 0;
        this.smoothedRotationSpeed = 0;
        this.smoothedBassEnergy = 0;
        this.smoothedMidEnergy = 0;
        this.smoothedHighEnergy = 0;
        this.energySmoothingFactor = 0.05; // Much slower smoothing (was 0.1)
        this.rotationSmoothingFactor = 0.02; // Extra slow for rotation (new)
        
        // Beat-based color flash system
        this.beatFlash = {
            isActive: false,
            startTime: 0,
            duration: 200, // Flash duration in ms
            intensity: 0,  // Current flash intensity (0-1)
            lastBeatTime: 0,
            minBeatInterval: 100 // Minimum time between beats (ms)
        };
        
        // Mouse interaction
        this.mouseInteraction = {
            enabled: true,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0,
            manualRotationX: 0,  // Manual rotation overrides
            manualRotationY: 0,
            manualZoom: 0,       // Manual zoom offset
            sensitivity: 0.01    // Mouse sensitivity
        };
        
        // Orbit tracking for smooth speed transitions
        this.orbitAngle = 0;                    // Persistent orbit angle
        this.lastOrbitSpeed = this.settings.orbitSpeed;  // Track speed changes
        
        // Fly-through animation state
        this.flyThrough = {
            startTime: 0,           // When fly-through started
            startPosition: null,    // Camera position when fly-through began
            startLookAt: null,      // What camera was looking at when fly-through began
            isActive: false,        // Whether fly-through is currently running
            pathRadius: 200,        // Radius of the figure-8
            pathHeight: 100,        // Height variation of the figure-8
            approachDuration: 3.0,  // Time to approach the figure-8 path (Stage 1)
            pathEntryPoint: null    // Where camera enters the figure-8 path
        };
        
        // console.log('🌌 Nebula Visualization created');
        this.init();
        this.setupMouseInteraction();
        
        // Initialize preset system
        this.initializePresetSystem();
    }
    
    // Preset System Methods
    initializePresetSystem() {
        // Load saved presets from localStorage
        this.savedPresets = this.loadPresets();
        // console.log('🌌 Loaded nebula presets:', this.savedPresets.length);
    }
    
    loadPresets() {
        try {
            const saved = localStorage.getItem('MVpro_nebula_presets');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading nebula presets:', e);
            return [];
        }
    }
    
    savePresets() {
        try {
            localStorage.setItem('MVpro_nebula_presets', JSON.stringify(this.savedPresets));
            console.log('💾 Nebula presets saved to localStorage');
        } catch (e) {
            console.error('Error saving nebula presets:', e);
        }
    }
    
    getCurrentConfig() {
        // Capture all 15 settings for comprehensive preset
        return {
            // Color controls
            hueShift: this.settings.hueShift,
            saturation: this.settings.saturation,
            brightness: this.settings.brightness,
            
            // Camera controls
            cameraDistance: this.settings.cameraDistance,
            cameraOrbit: this.settings.cameraOrbit,
            orbitSpeed: this.settings.orbitSpeed,
            flyThrough: this.settings.flyThrough,
            flySpeed: this.settings.flySpeed,
            
            // Filament controls
            filamentDensity: this.settings.filamentDensity,
            particlesPerFilament: this.settings.particlesPerFilament,
            particleSize: this.settings.particleSize,
            expansion: this.settings.expansion,
            chaos: this.settings.chaos,
            asymmetry: this.settings.asymmetry,
            
            // Pulsar controls
            showPulsar: this.settings.showPulsar,
            pulsarSize: this.settings.pulsarSize,
            pulseRate: this.settings.pulseRate,
            
            // Star controls
            starCount: this.settings.starCount,
            
            // Effects
            bloom: this.settings.bloom,
            
            // Audio reactivity
            audioReactive: this.settings.audioReactive,
            audioSensitivity: this.settings.audioSensitivity,
            overallOpacity: this.settings.overallOpacity,
            knockoutBackground: this.settings.knockoutBackground,
            morphingMode: this.settings.morphingMode,
            morphingSpeed: this.settings.morphingSpeed,
            
            // Audio presets
            audioPresets: { ...this.settings.audioPresets }
        };
    }
    
    saveCurrentAsPreset(name) {
        if (!name || name.trim() === '') return;
        
        const preset = {
            name: name.trim(),
            timestamp: Date.now(),
            config: this.getCurrentConfig()
        };
        
        this.savedPresets.push(preset);
        
        this.savePresets();
        console.log('💾 Nebula preset saved:', name);
        return preset;
    }
    
    loadPreset(index) {
        if (index < 0 || index >= this.savedPresets.length) return false;
        
        const preset = this.savedPresets[index];
        if (!preset || !preset.config) return false;
        
        const config = preset.config;
        
        // Apply all settings from preset
        Object.keys(config).forEach(key => {
            if (key === 'audioPresets') {
                // Deep copy audio presets
                this.settings.audioPresets = { ...config.audioPresets };
            } else if (this.settings.hasOwnProperty(key)) {
                this.settings[key] = config[key];
            }
        });
        
        // Update visual elements that need recreation
        this.createFilaments();
        this.updateStarField();
        this.applyColorAdjustments();
        
        console.log('📂 Nebula preset loaded:', preset.name);
        return true;
    }
    
    exportPresets() {
        const data = {
            version: '1.0',
            timestamp: Date.now(),
            presets: this.savedPresets
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `nebula_presets_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📤 Nebula presets exported');
    }
    
    importPresets(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.presets && Array.isArray(data.presets)) {
                        // Merge with existing presets
                        this.savedPresets = [...this.savedPresets, ...data.presets];
                        
                        this.savePresets();
                        console.log('📥 Nebula presets imported:', data.presets.length);
                        resolve(data.presets.length);
                    } else {
                        reject('Invalid preset file format');
                    }
                } catch (error) {
                    reject('Error parsing preset file: ' + error.message);
                }
            };
            reader.onerror = () => reject('Error reading file');
            reader.readAsText(file);
        });
    }
    
    setupMouseInteraction() {
        if (!this.canvas) return;
        
        // Mouse down - start dragging
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.mouseInteraction.enabled) return;
            this.mouseInteraction.isDragging = true;
            this.mouseInteraction.lastMouseX = e.clientX;
            this.mouseInteraction.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        });
        
        // Mouse move - handle rotation
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.mouseInteraction.enabled || !this.mouseInteraction.isDragging) return;
            
            const deltaX = e.clientX - this.mouseInteraction.lastMouseX;
            const deltaY = e.clientY - this.mouseInteraction.lastMouseY;
            
            // Apply mouse movement to manual rotation
            this.mouseInteraction.manualRotationY += deltaX * this.mouseInteraction.sensitivity;
            this.mouseInteraction.manualRotationX += deltaY * this.mouseInteraction.sensitivity;
            
            // Clamp vertical rotation to avoid flipping
            this.mouseInteraction.manualRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouseInteraction.manualRotationX));
            
            this.mouseInteraction.lastMouseX = e.clientX;
            this.mouseInteraction.lastMouseY = e.clientY;
        });
        
        // Mouse up - stop dragging
        this.canvas.addEventListener('mouseup', () => {
            this.mouseInteraction.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });
        
        // Mouse leave - stop dragging
        this.canvas.addEventListener('mouseleave', () => {
            this.mouseInteraction.isDragging = false;
            this.canvas.style.cursor = 'default';
        });
        
        // Mouse wheel - zoom
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.mouseInteraction.enabled) return;
            e.preventDefault();
            
            const zoomDelta = e.deltaY * 0.1;
            this.mouseInteraction.manualZoom += zoomDelta;
            
            // Clamp zoom to reasonable limits
            this.mouseInteraction.manualZoom = Math.max(-200, Math.min(300, this.mouseInteraction.manualZoom));
        }, { passive: false });
        
        // Set initial cursor
        this.canvas.style.cursor = 'grab';
    }
    
    init() {
        if (!window.THREE) {
            console.error('🌌 Three.js not loaded - cannot initialize nebula');
            return;
        }
        
        try {
            // Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000);
            
            // Camera
            this.camera = new THREE.PerspectiveCamera(
                50,
                this.canvas.width / this.canvas.height,
                0.1,
                500
            );
            this.camera.position.z = this.settings.cameraDistance;
            
            // Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: true,
                premultipliedAlpha: false
            });
            this.renderer.setSize(this.canvas.width, this.canvas.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * this.settings.renderQuality, 2));
            this.renderer.setClearColor(0x000000, 0);
            
            // Create nebula elements
            this.createStarField();
            this.createFilaments();
            this.createInnerCore();
            this.createPulsar();
            
            // Auto-resize after initialization
            setTimeout(() => this.autoResize(), 100);
            
            // Apply initial bloom effect
            setTimeout(() => this.updateBloomEffect(this.settings.bloom), 150);
            
            // Apply initial color adjustments
            setTimeout(() => this.applyColorAdjustments(), 200);
            
            // console.log('🌌 Nebula Three.js scene initialized successfully');
        } catch (error) {
            console.error('🌌 Error initializing nebula:', error);
        }
    }
    
    createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        const centerX = 32, centerY = 32;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createStarField() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const sizes = [];
        
        // Make starfield size dynamic based on camera distance
        // Always make it at least 3x larger than the max camera distance to avoid visible edges
        const maxCameraDistance = 300; // Max camera distance from slider
        const starFieldSize = Math.max(maxCameraDistance * 3, this.settings.cameraDistance * 4);
        
        // Scale star count based on starfield volume to maintain density
        const baseSize = 200; // Original starfield size
        const volumeRatio = Math.pow(starFieldSize / baseSize, 3); // Volume scales with cube of size
        const adjustedStarCount = Math.floor(this.settings.starCount * volumeRatio);
        
        for (let i = 0; i < adjustedStarCount; i++) {
            const x = (Math.random() - 0.5) * starFieldSize;
            const y = (Math.random() - 0.5) * starFieldSize;
            const z = (Math.random() - 0.5) * starFieldSize;
            
            vertices.push(x, y, z);
            
            const temp = Math.random();
            if (temp < 0.6) {
                colors.push(0.9, 0.95, 1.0);
            } else if (temp < 0.9) {
                colors.push(1.0, 0.95, 0.8);
            } else {
                colors.push(1.0, 0.7, 0.5);
            }
            
            const size = Math.random() > 0.95 ? 2 + Math.random() * 2 : 0.3 + Math.random() * 1.5;
            sizes.push(size);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 2,
            map: this.createStarTexture(),
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }
    
    createFilaments() {
        // Clear existing filaments
        this.filaments.forEach(f => this.scene.remove(f));
        this.filaments = [];
        
        // Reset original positions and chaos amounts for audio reactivity
        this.originalFilamentPositions = null;
        this.originalChaosAmounts = null;
        
        const filamentCount = Math.floor(200 * this.settings.filamentDensity);
        
        for (let i = 0; i < filamentCount; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];
            const alphas = [];
            
            // Random starting direction with asymmetry
            const baseTheta = Math.random() * Math.PI * 2;
            const basePhi = Math.acos(2 * Math.random() - 1);
            
            const asymmetryFactor = this.settings.asymmetry;
            const favoredTheta = baseTheta + Math.sin(baseTheta * 3) * asymmetryFactor;
            const favoredPhi = basePhi + Math.cos(basePhi * 2) * asymmetryFactor * 0.5;
            
            const baseDir = new THREE.Vector3(
                Math.sin(favoredPhi) * Math.cos(favoredTheta),
                Math.sin(favoredPhi) * Math.sin(favoredTheta),
                Math.cos(favoredPhi)
            );
            
            const baseParticles = this.settings.particlesPerFilament;
            const variationAmount = Math.floor(Math.random() * (baseParticles * 0.8) * this.settings.threadVariation);
            const particleCount = baseParticles + variationAmount;
            
            const startRadius = 1.5 + (Math.random() - 0.5) * this.settings.threadVariation;
            let currentPos = baseDir.clone().multiplyScalar(startRadius);
            
            for (let j = 0; j < particleCount; j++) {
                const t = j / particleCount;
                
                const threadLengthVariation = 0.8 + Math.random() * 0.4 * this.settings.threadVariation;
                const stepSize = (this.settings.expansion / particleCount) * threadLengthVariation;
                
                const chaosAmount = this.settings.chaos * (0.7 + Math.random() * 0.6 * this.settings.threadVariation);
                const randomOffset = new THREE.Vector3(
                    (Math.random() - 0.5) * chaosAmount * 0.5,
                    (Math.random() - 0.5) * chaosAmount * 0.5,
                    (Math.random() - 0.5) * chaosAmount * 0.5
                );
                
                const moveDir = baseDir.clone()
                    .multiplyScalar(stepSize)
                    .add(randomOffset);
                
                currentPos.add(moveDir);
                positions.push(currentPos.x, currentPos.y, currentPos.z);
                
                // Color gradient: blue/white → green → red/orange with color adjustments
                let r, g, b;
                if (t < 0.25) {
                    const mix = t / 0.25;
                    r = 0.7 + mix * 0.3;
                    g = 0.8 + mix * 0.2;
                    b = 1.0;
                } else if (t < 0.6) {
                    const mix = (t - 0.25) / 0.35;
                    r = 0.4 + mix * 0.4;
                    g = 0.9;
                    b = 0.5 - mix * 0.3;
                } else {
                    const mix = (t - 0.6) / 0.4;
                    r = 1.0;
                    g = 0.5 - mix * 0.2;
                    b = 0.2 - mix * 0.1;
                }
                
                // Apply color adjustments if any
                if (this.settings.hueShift !== 0 || this.settings.saturation !== 100 || this.settings.brightness !== 100) {
                    const hueShift = this.settings.hueShift / 360;
                    const saturationMult = this.settings.saturation / 100;
                    const brightnessMult = this.settings.brightness / 100;
                    const adjustedColor = this.adjustColor({ r, g, b }, hueShift, saturationMult, brightnessMult);
                    r = adjustedColor.r;
                    g = adjustedColor.g;
                    b = adjustedColor.b;
                }
                
                colors.push(r, g, b);
                
                const baseThickness = 0.8 + Math.random() * 0.4 * this.settings.threadVariation;
                const thickness = Math.sin(t * Math.PI);
                const finalSize = (baseThickness + thickness * 1.5) * this.settings.particleSize;
                sizes.push(finalSize);
                
                const fadeFactor = 1.0 - Math.pow(t, 1.5);
                alphas.push(fadeFactor * (0.7 + Math.random() * 0.3));
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
            geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
            
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    pointTexture: { value: this.createStarTexture() }
                },
                vertexShader: `
                    attribute float size;
                    attribute float alpha;
                    attribute vec3 color;
                    
                    varying vec3 vColor;
                    varying float vAlpha;
                    
                    void main() {
                        vColor = color;
                        vAlpha = alpha;
                        
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * 200.0 / -mvPosition.z;
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    uniform sampler2D pointTexture;
                    
                    varying vec3 vColor;
                    varying float vAlpha;
                    
                    void main() {
                        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                        vec3 finalColor = vColor;
                        float finalAlpha = texColor.a * vAlpha;
                        
                        gl_FragColor = vec4(finalColor, finalAlpha);
                    }
                `,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            
            const filament = new THREE.Points(geometry, material);
            // Initialize userData for storing original colors and other data
            filament.userData = {
                baseDir: baseDir.clone()
            };
            
            this.filaments.push(filament);
            this.scene.add(filament);
        }
        
        // console.log('🌌 Created', this.filaments.length, 'nebula filament threads');
    }
    
    createInnerCore() {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    float dist = length(vPosition) / 3.0;
                    float intensity = 1.0 - smoothstep(0.0, 1.0, dist);
                    intensity = pow(intensity, 2.0);
                    
                    float pulse = 0.8 + sin(time * 2.0) * 0.2;
                    
                    vec3 color = vec3(0.7, 0.9, 1.0) * pulse;
                    float alpha = intensity * 0.6;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.innerCore = new THREE.Mesh(geometry, material);
        this.scene.add(this.innerCore);
    }
    
    createPulsar() {
        // Create glow texture
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        const centerX = 64, centerY = 64;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.2, 'rgba(220, 230, 255, 0.9)');
        gradient.addColorStop(0.4, 'rgba(180, 200, 255, 0.6)');
        gradient.addColorStop(0.6, 'rgba(140, 170, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.pulsar = new THREE.Sprite(material);
        this.pulsar.scale.set(this.settings.pulsarSize, this.settings.pulsarSize, 1);
        this.pulsar.userData.baseScale = this.settings.pulsarSize;
        
        this.scene.add(this.pulsar);
    }
    
    // Audio reactivity methods
    update(audioData) {
        if (!this.enabled) return;
        
        // Direct AudioMotion audio reactivity (simple & effective)
        if (this.settings.audioReactive && window.visualizer?.audioMotion?.dataArray) {
            this.updateDirectAudioReactivity();
        }
        
        // Beat-based color flash system
        if (this.settings.audioReactive && this.settings.audioPresets.color && audioData?.beat) {
            this.triggerBeatFlash();
        }
        
        // Update beat flash intensity
        this.updateBeatFlash();
        
        // Apply morphing mode changes
        if (this.settings.morphingMode) {
            this.applyMorphingMode();
        }
        
        this.time += 0.016;
    }
    
    updateDirectAudioReactivity() {
        const dataArray = window.visualizer.audioMotion.dataArray;
        if (!dataArray) return;
        
        // Calculate total energy (like Kaleidoscope does - simple & effective)
        let energy = 0;
        const sampleEnd = Math.min(Math.floor(dataArray.length * 0.4), dataArray.length);
        
        for (let i = 0; i < sampleEnd; i++) {
            energy += dataArray[i];
        }
        energy = energy / sampleEnd / 255; // 0-1 range
        
        // Calculate frequency bands for different effects
        const bassEnergy = this.getFrequencyBandEnergy(dataArray, 0, 0.1);     // Bass (0-10%)
        const midEnergy = this.getFrequencyBandEnergy(dataArray, 0.1, 0.4);    // Mids (10-40%)  
        const highEnergy = this.getFrequencyBandEnergy(dataArray, 0.4, 1.0);   // Highs (40-100%)
        
        // Smooth all energy transitions to prevent jarring changes
        this.smoothedEnergy += (energy - this.smoothedEnergy) * this.energySmoothingFactor;
        this.smoothedBassEnergy += (bassEnergy - this.smoothedBassEnergy) * this.energySmoothingFactor;
        this.smoothedMidEnergy += (midEnergy - this.smoothedMidEnergy) * this.energySmoothingFactor;
        this.smoothedHighEnergy += (highEnergy - this.smoothedHighEnergy) * this.energySmoothingFactor;
        
        // Apply audio effects with smoothed energy
        this.applyPulsarReactivity(this.smoothedBassEnergy, this.smoothedMidEnergy, this.smoothedHighEnergy, this.smoothedEnergy);
        this.applyNebulaColorReactivity(this.smoothedBassEnergy, this.smoothedMidEnergy, this.smoothedHighEnergy, this.smoothedEnergy);
        
        // Apply audio effects with smoothed energy values
        this.applyRotationReactivity(this.smoothedEnergy);
        this.applyDistanceReactivity(this.smoothedBassEnergy);
        this.applyFilamentDensityReactivity(this.smoothedBassEnergy, this.smoothedMidEnergy, this.smoothedHighEnergy, this.smoothedEnergy);
        this.applyChaosReactivity(this.smoothedBassEnergy, this.smoothedMidEnergy, this.smoothedHighEnergy, this.smoothedEnergy);
        this.applyExpansionReactivity(this.smoothedBassEnergy, this.smoothedMidEnergy, this.smoothedHighEnergy, this.smoothedEnergy);
        this.applyElementReactivity(this.smoothedEnergy, this.smoothedBassEnergy);
    }
    
    triggerBeatFlash() {
        const now = Date.now();
        
        // Prevent too frequent beat flashes
        if (now - this.beatFlash.lastBeatTime < this.beatFlash.minBeatInterval) {
            return;
        }
        
        // Trigger new beat flash
        this.beatFlash.isActive = true;
        this.beatFlash.startTime = now;
        this.beatFlash.lastBeatTime = now;
        this.beatFlash.intensity = 1.0; // Start at full intensity
        
        // Beat flash triggered - will create dramatic color flash
    }
    
    updateBeatFlash() {
        if (!this.beatFlash.isActive) {
            this.beatFlash.intensity = 0;
            return;
        }
        
        const now = Date.now();
        const elapsed = now - this.beatFlash.startTime;
        
        if (elapsed >= this.beatFlash.duration) {
            // Flash finished
            this.beatFlash.isActive = false;
            this.beatFlash.intensity = 0;
        } else {
            // Calculate fade-out intensity (1.0 to 0.0)
            const progress = elapsed / this.beatFlash.duration;
            this.beatFlash.intensity = 1.0 - progress;
        }
    }
    
    getFrequencyBandEnergy(dataArray, startPercent, endPercent) {
        const startIndex = Math.floor(dataArray.length * startPercent);
        const endIndex = Math.floor(dataArray.length * endPercent);
        
        let sum = 0;
        for (let i = startIndex; i < endIndex; i++) {
            sum += dataArray[i];
        }
        
        return sum / (endIndex - startIndex) / 255; // Normalize to 0-1
    }
    
    applyPulsarReactivity(bassEnergy, midEnergy, highEnergy, totalEnergy) {
        if (!this.pulsar || !this.settings.showPulsar) return;
        
        // 1. Pulsar Color Reactivity - smooth energy-based HSV transitions
        if (this.settings.audioReactive && this.settings.audioPresets.color) {
            // Create smooth color transitions based on energy levels
            // Use HSV color space for smooth transitions
            let hue = 0.6; // Default blue
            let saturation = 0.8;
            let brightness = 0.9;
            
            // Calculate hue based on dominant frequency (smooth transitions)
            const totalFreqEnergy = bassEnergy + midEnergy + highEnergy;
            if (totalFreqEnergy > 0.1) {
                // Weighted average for smooth color transitions
                const bassWeight = bassEnergy / totalFreqEnergy;
                const midWeight = midEnergy / totalFreqEnergy;
                const highWeight = highEnergy / totalFreqEnergy;
                
                // Map frequencies to hue values (0-1)
                // Bass: Red (0.0), Mid: Yellow/Green (0.3), High: Blue/Purple (0.6-0.8)
                hue = (bassWeight * 0.0) + (midWeight * 0.3) + (highWeight * 0.7);
                
                // Adjust saturation and brightness based on total energy
                saturation = 0.6 + (totalEnergy * this.settings.audioSensitivity * 0.4);
                brightness = 0.7 + (totalEnergy * this.settings.audioSensitivity * 0.3);
            }
            
            // Convert HSV to RGB
            const rgb = this.hsvToRgb(hue, saturation, brightness);
            
            // Apply color to pulsar material
            if (this.pulsar.material && this.pulsar.material.color) {
                this.pulsar.material.color.setRGB(rgb.r, rgb.g, rgb.b);
            }
        }
        
        // 2. Pulsar Size & Pulse Rate Reactivity - only if pulsar preset is enabled
        let audioSize = this.pulsar.userData.baseScale;
        let audioPulseRate = this.settings.pulseRate;
        
        if (this.settings.audioReactive && this.settings.audioPresets.pulsar) {
            // Size reactivity based on bass energy
            const baseSizeMultiplier = 1.0 + (bassEnergy * this.settings.audioSensitivity * 1.5);
            audioSize = this.pulsar.userData.baseScale * baseSizeMultiplier;
            
            // Pulse rate reactivity based on total energy
            audioPulseRate = this.settings.pulseRate + (totalEnergy * this.settings.audioSensitivity * 3.0);
        }
        
        // 3. ALWAYS apply pulse animation (even when audio reactive is off)
        const pulseFast = Math.sin(this.time * audioPulseRate * Math.PI * 2);
        const intensity = 0.3 + (pulseFast + 1) * 0.35;
        
        // Combine manual size with audio size and pulse animation
        const finalScale = audioSize * (0.8 + intensity * 0.4);
        this.pulsar.scale.set(finalScale, finalScale, 1);
        
        // Apply opacity with audio boost (if pulsar preset enabled)
        let audioOpacity = intensity;
        if (this.settings.audioReactive && this.settings.audioPresets.pulsar) {
            audioOpacity = intensity + (totalEnergy * this.settings.audioSensitivity * 0.3);
        }
        this.pulsar.material.opacity = Math.min(1.0, audioOpacity * this.opacity);
    }
    
    // HSV to RGB conversion for smooth color transitions
    hsvToRgb(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        
        return { r: r, g: g, b: b };
    }
    
    // New method for nebula filament color reactivity
    applyNebulaColorReactivity(bassEnergy, midEnergy, highEnergy, totalEnergy) {
        if (!this.settings.audioPresets.color) return;
        
        // Simple and effective: adjust Hue Shift based on audio energy
        // Store original hue shift if not already stored
        if (this.originalHueShift === undefined) {
            this.originalHueShift = this.settings.hueShift;
        }
        
        // Calculate hue shift based on energy and beats
        let energyHueShift = 0;
        
        // Energy-based smooth hue shifting (0-60 degrees)
        energyHueShift += totalEnergy * this.settings.audioSensitivity * 60;
        
        // Beat-based dramatic hue shifts
        if (this.beatFlash.intensity > 0) {
            const flashHueShift = this.beatFlash.intensity * 120; // Up to 120 degrees on beats
            energyHueShift += flashHueShift;
        }
        
        // Apply the dynamic hue shift
        const newHueShift = this.originalHueShift + energyHueShift;
        
        // Update the hue shift setting (this will trigger color updates)
        if (Math.abs(this.settings.hueShift - newHueShift) > 1) {
            this.settings.hueShift = newHueShift % 360; // Keep within 0-360 range
            this.applyColorAdjustments();
        }
    }
    
    applyMorphingMode() {
        // Gradually morph various settings over time for organic evolution
        // Each setting morphs at different rates and ranges for variety
        
        const morphSpeed = this.settings.morphingSpeed;
        const time = this.time;
        
        // Store original values if not already stored
        if (!this.morphingBaselines) {
            this.morphingBaselines = {
                hueShift: this.settings.hueShift,
                particleSize: this.settings.particleSize,
                chaos: this.settings.chaos,
                expansion: this.settings.expansion,
                saturation: this.settings.saturation,
                filamentDensity: this.settings.filamentDensity,
                pulsarSize: this.settings.pulsarSize,
                pulseRate: this.settings.pulseRate
            };
        }
        
        const baselines = this.morphingBaselines;
        let needsFilamentRecreation = false;
        let needsColorUpdate = false;
        
        // Smooth interpolation factor - higher speeds get more smoothing
        const smoothingFactor = Math.min(0.1, 0.02 + (morphSpeed * 0.02));
        
        // Hue Shift - smooth color cycling (±60 degrees over time) - More visible
        const targetHueShift = baselines.hueShift + Math.sin(time * morphSpeed * 0.2) * 60;
        const newHueShift = this.settings.hueShift + (targetHueShift - this.settings.hueShift) * smoothingFactor;
        if (Math.abs(this.settings.hueShift - newHueShift) > 0.5) {
            this.settings.hueShift = (newHueShift + 360) % 360; // Ensure positive
            needsColorUpdate = true;
        }
        
        // Saturation - breathing saturation effect (±20%) - More visible
        const targetSaturation = baselines.saturation + Math.sin(time * morphSpeed * 0.15) * 20;
        const newSaturation = this.settings.saturation + (targetSaturation - this.settings.saturation) * smoothingFactor;
        if (Math.abs(this.settings.saturation - newSaturation) > 0.5) {
            this.settings.saturation = Math.max(20, Math.min(200, newSaturation));
            needsColorUpdate = true;
        }
        
        // Particle Size - pulsing size effect (±0.2x) - Smooth interpolation
        const targetParticleSize = baselines.particleSize + Math.sin(time * morphSpeed * 0.1) * 0.2;
        const newParticleSize = this.settings.particleSize + (targetParticleSize - this.settings.particleSize) * smoothingFactor;
        if (Math.abs(this.settings.particleSize - newParticleSize) > 0.01) {
            this.settings.particleSize = Math.max(0.3, Math.min(3.0, newParticleSize));
            needsFilamentRecreation = true;
        }
        
        // Chaos - evolving randomness (±0.3) - Smooth interpolation
        const targetChaos = baselines.chaos + Math.sin(time * morphSpeed * 0.08) * 0.3;
        const newChaos = this.settings.chaos + (targetChaos - this.settings.chaos) * smoothingFactor;
        if (Math.abs(this.settings.chaos - newChaos) > 0.02) {
            this.settings.chaos = Math.max(1.0, Math.min(5.0, newChaos));
            needsFilamentRecreation = true;
        }
        
        // Expansion - breathing nebula effect (±5) - Smooth interpolation
        const targetExpansion = baselines.expansion + Math.sin(time * morphSpeed * 0.05) * 5;
        const newExpansion = this.settings.expansion + (targetExpansion - this.settings.expansion) * smoothingFactor;
        if (Math.abs(this.settings.expansion - newExpansion) > 0.2) {
            this.settings.expansion = Math.max(10, Math.min(80, newExpansion));
            needsFilamentRecreation = true;
        }
        
        // Filament Density - evolving complexity (±0.1) - Smooth interpolation
        const targetFilamentDensity = baselines.filamentDensity + Math.sin(time * morphSpeed * 0.03) * 0.1;
        const newFilamentDensity = this.settings.filamentDensity + (targetFilamentDensity - this.settings.filamentDensity) * smoothingFactor;
        if (Math.abs(this.settings.filamentDensity - newFilamentDensity) > 0.01) {
            this.settings.filamentDensity = Math.max(0.5, Math.min(3.0, newFilamentDensity));
            needsFilamentRecreation = true;
        }
        
        // Pulsar Size - pulsing central core (±0.5) - Smooth interpolation
        const targetPulsarSize = baselines.pulsarSize + Math.sin(time * morphSpeed * 0.12) * 0.5;
        const newPulsarSize = this.settings.pulsarSize + (targetPulsarSize - this.settings.pulsarSize) * smoothingFactor;
        if (Math.abs(this.settings.pulsarSize - newPulsarSize) > 0.05) {
            this.settings.pulsarSize = Math.max(1, Math.min(15, newPulsarSize));
            if (this.pulsar) {
                this.pulsar.userData.baseScale = this.settings.pulsarSize;
            }
        }
        
        // Pulse Rate - evolving rhythm (±0.3) - Smooth interpolation
        const targetPulseRate = baselines.pulseRate + Math.sin(time * morphSpeed * 0.09) * 0.3;
        const newPulseRate = this.settings.pulseRate + (targetPulseRate - this.settings.pulseRate) * smoothingFactor;
        if (Math.abs(this.settings.pulseRate - newPulseRate) > 0.02) {
            this.settings.pulseRate = Math.max(0.25, Math.min(5.0, newPulseRate));
        }
        
        // Apply updates efficiently
        if (needsColorUpdate) {
            this.applyColorAdjustments();
            // Debug: Log color changes occasionally
            if (Math.floor(time * 10) % 30 === 0) {
                console.log('🎨 Morphing color update:', {
                    hue: Math.round(this.settings.hueShift),
                    saturation: Math.round(this.settings.saturation),
                    speed: morphSpeed
                });
            }
        }
        
        if (needsFilamentRecreation) {
            // Throttle filament recreation to prevent performance issues and abrupt changes
            if (!this.lastMorphingRecreation || (time - this.lastMorphingRecreation) > 2.0) {
                this.updateFilaments();
                this.lastMorphingRecreation = time;
            }
        }
    }
    
    resetMorphingBaselines() {
        // Reset all morphed settings to their baseline values
        if (!this.morphingBaselines) return;
        
        const baselines = this.morphingBaselines;
        let needsFilamentRecreation = false;
        let needsColorUpdate = false;
        
        // Reset all morphed settings
        if (this.settings.hueShift !== baselines.hueShift) {
            this.settings.hueShift = baselines.hueShift;
            needsColorUpdate = true;
        }
        
        if (this.settings.saturation !== baselines.saturation) {
            this.settings.saturation = baselines.saturation;
            needsColorUpdate = true;
        }
        
        if (this.settings.particleSize !== baselines.particleSize) {
            this.settings.particleSize = baselines.particleSize;
            needsFilamentRecreation = true;
        }
        
        if (this.settings.chaos !== baselines.chaos) {
            this.settings.chaos = baselines.chaos;
            needsFilamentRecreation = true;
        }
        
        if (this.settings.expansion !== baselines.expansion) {
            this.settings.expansion = baselines.expansion;
            needsFilamentRecreation = true;
        }
        
        if (this.settings.filamentDensity !== baselines.filamentDensity) {
            this.settings.filamentDensity = baselines.filamentDensity;
            needsFilamentRecreation = true;
        }
        
        if (this.settings.pulsarSize !== baselines.pulsarSize) {
            this.settings.pulsarSize = baselines.pulsarSize;
            if (this.pulsar) {
                this.pulsar.userData.baseScale = this.settings.pulsarSize;
            }
        }
        
        if (this.settings.pulseRate !== baselines.pulseRate) {
            this.settings.pulseRate = baselines.pulseRate;
        }
        
        // Apply updates
        if (needsColorUpdate) {
            this.applyColorAdjustments();
        }
        
        if (needsFilamentRecreation) {
            this.updateFilaments();
        }
        
        // Clear the baselines
        this.morphingBaselines = null;
        this.lastMorphingRecreation = null;
        
        console.log('🔄 Morphing baselines reset');
    }
    
    refreshOriginalColors() {
        // Update the stored original colors to current colors
        // This should be called when color presets change while color reactivity is ON
        this.filaments.forEach((filament) => {
            if (filament.geometry && filament.geometry.attributes.color && filament.userData) {
                filament.userData.originalColors = new Float32Array(filament.geometry.attributes.color.array);
            }
        });
    }
    
    applyRotationReactivity(smoothedEnergy) {
        if (this.settings.cameraOrbit && this.settings.audioPresets.rotation) {
            // Much slower and smoother rotation boost calculation
            const targetRotationBoost = smoothedEnergy * this.settings.audioSensitivity * 0.5; // Reduced from 2.0 to 0.5
            
            // Use separate, much slower smoothing for rotation (prevents jumpiness)
            this.smoothedRotationSpeed += (targetRotationBoost - this.smoothedRotationSpeed) * this.rotationSmoothingFactor;
            
            // Use smoothed rotation speed instead of direct energy
            this.audioRotationBoost = this.smoothedRotationSpeed;
        } else {
            // Very gradually decay rotation boost when orbit is off or rotation preset disabled
            this.smoothedRotationSpeed *= 0.95; // Slower decay (was 0.9)
            this.audioRotationBoost = 0;
        }
    }
    
    applyDistanceReactivity(bassEnergy) {
        if (this.settings.audioPresets.distance) {
            // Pulse camera distance with bass (breathing effect) - only if distance preset enabled
            const bassPulse = bassEnergy * this.settings.audioSensitivity * 20; // 0-20 unit pulse
            this.audioCameraOffset = bassPulse;
        } else {
            this.audioCameraOffset = 0;
        }
    }
    
    applyFilamentDensityReactivity(bassEnergy, midEnergy, highEnergy, totalEnergy) {
        if (!this.settings.audioPresets.filamentDensity) {
            // If filament density is OFF and we're not in morphing mode, 
            // reset to original positions to prevent cumulative effects
            if (!this.settings.morphingMode && this.originalFilamentPositions) {
                this.resetToOriginalPositions();
            }
            return;
        }
        
        // Store original positions if not already stored
        if (!this.originalFilamentPositions) {
            this.originalFilamentPositions = this.filaments.map(filament => {
                if (filament.geometry && filament.geometry.attributes.position) {
                    // Clone the original position array
                    return new Float32Array(filament.geometry.attributes.position.array);
                }
                return null;
            });
        }
        
        // Apply position wiggling to filaments based on audio energy
        // Keep original filament structure intact - only add small position offsets
        this.filaments.forEach((filament, index) => {
            if (!filament.geometry || !filament.geometry.attributes.position || 
                !this.originalFilamentPositions || !this.originalFilamentPositions[index]) return;
            
            const positions = filament.geometry.attributes.position.array;
            const originalPositions = this.originalFilamentPositions[index];
            const particleCount = positions.length / 3;
            
            // Calculate wiggle intensity based on energy
            // Use different frequency bands for different filaments to create variety
            const filamentZone = index / this.filaments.length; // 0-1 range
            let energySource;
            
            if (filamentZone < 0.33) {
                // Inner filaments respond to bass
                energySource = bassEnergy;
            } else if (filamentZone < 0.66) {
                // Middle filaments respond to mids
                energySource = midEnergy;
            } else {
                // Outer filaments respond to highs
                energySource = highEnergy;
            }
            
            // Calculate wiggle intensity (0.0 to 2.6 based on energy) - increased by 30%
            const wiggleIntensity = energySource * this.settings.audioSensitivity * 2.6;
            
            // Apply wiggling motion to each particle
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const t = i / particleCount; // Position along filament (0-1)
                
                // Create wave-like motion along the filament
                const timeOffset = this.time * 2.0; // Animation speed
                const positionOffset = index * 0.5 + t * 3.0; // Unique offset per filament and position
                
                // Generate smooth wiggle offsets using sine waves
                const wiggleX = Math.sin(timeOffset + positionOffset) * wiggleIntensity * 0.5;
                const wiggleY = Math.cos(timeOffset * 1.3 + positionOffset * 1.2) * wiggleIntensity * 0.5;
                const wiggleZ = Math.sin(timeOffset * 0.8 + positionOffset * 0.9) * wiggleIntensity * 0.3;
                
                // Apply wiggle - morphing mode affects how positions are applied
                if (this.settings.morphingMode) {
                    // Morphing mode: add to current positions (cumulative effect)
                    positions[i3] += wiggleX * 0.1; // Smaller increments for gradual morphing
                    positions[i3 + 1] += wiggleY * 0.1;
                    positions[i3 + 2] += wiggleZ * 0.1;
                } else {
                    // Normal mode: apply to original positions (preserve structure)
                    positions[i3] = originalPositions[i3] + wiggleX;
                    positions[i3 + 1] = originalPositions[i3 + 1] + wiggleY;
                    positions[i3 + 2] = originalPositions[i3 + 2] + wiggleZ;
                }
            }
            
            // Mark positions as needing update
            filament.geometry.attributes.position.needsUpdate = true;
        });
    }
    
    applyChaosReactivity(bassEnergy, midEnergy, highEnergy, totalEnergy) {
        if (!this.settings.audioPresets.chaos) return;
        
        // If filament density is OFF and we're not in morphing mode,
        // don't apply chaos to prevent the cumulative swirling bug
        if (!this.settings.audioPresets.filamentDensity && !this.settings.morphingMode) {
            return;
        }
        
        // Store original chaos amounts if not already stored
        if (!this.originalChaosAmounts) {
            this.originalChaosAmounts = this.filaments.map((filament, index) => {
                // Store the base chaos amount for each filament
                return this.settings.chaos * (0.7 + (index / this.filaments.length) * 0.6 * this.settings.threadVariation);
            });
        }
        
        // Apply chaos scaling to filaments based on audio energy
        // This affects the randomness/wildness of filament paths
        this.filaments.forEach((filament, index) => {
            if (!filament.geometry || !filament.geometry.attributes.position || 
                !this.originalFilamentPositions || !this.originalFilamentPositions[index]) return;
            
            const positions = filament.geometry.attributes.position.array;
            const originalPositions = this.originalFilamentPositions[index];
            const particleCount = positions.length / 3;
            
            // Calculate chaos multiplier based on energy
            // Use different frequency bands for different chaos types
            const filamentZone = index / this.filaments.length; // 0-1 range
            let energySource;
            
            if (filamentZone < 0.33) {
                // Inner filaments: bass creates deep, slow chaos
                energySource = bassEnergy;
            } else if (filamentZone < 0.66) {
                // Middle filaments: mids create moderate chaos
                energySource = midEnergy;
            } else {
                // Outer filaments: highs create fast, sharp chaos
                energySource = highEnergy;
            }
            
            // Calculate chaos intensity (0.5x to 2.5x based on energy)
            const baseChaos = this.originalChaosAmounts[index] || this.settings.chaos;
            const chaosMultiplier = 0.5 + (energySource * this.settings.audioSensitivity * 2.0);
            const currentChaosAmount = baseChaos * Math.min(2.5, Math.max(0.5, chaosMultiplier));
            
            // Apply additional chaos offsets to create more randomness
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const t = i / particleCount; // Position along filament (0-1)
                
                // Create chaos-based random offsets
                const timeOffset = this.time * 1.5; // Slower than wiggle for different feel
                const chaosOffset = index * 0.7 + t * 2.0; // Unique chaos seed per filament and position
                
                // Generate chaotic offsets using different noise patterns
                const chaosX = (Math.sin(timeOffset * 0.6 + chaosOffset * 1.3) + Math.cos(timeOffset * 1.1 + chaosOffset * 0.8)) * currentChaosAmount * 0.3;
                const chaosY = (Math.cos(timeOffset * 0.8 + chaosOffset * 1.1) + Math.sin(timeOffset * 1.3 + chaosOffset * 0.9)) * currentChaosAmount * 0.3;
                const chaosZ = (Math.sin(timeOffset * 0.9 + chaosOffset * 0.7) + Math.cos(timeOffset * 0.7 + chaosOffset * 1.2)) * currentChaosAmount * 0.2;
                
                // Apply chaos - morphing mode affects how chaos is applied
                if (this.settings.morphingMode) {
                    // Morphing mode: add to current positions (cumulative morphing effect)
                    positions[i3] += chaosX * 0.05; // Even smaller increments for chaos in morphing mode
                    positions[i3 + 1] += chaosY * 0.05;
                    positions[i3 + 2] += chaosZ * 0.05;
                } else {
                    // Normal mode: add to wiggle effect (temporary additive effect)
                    positions[i3] += chaosX;
                    positions[i3 + 1] += chaosY;
                    positions[i3 + 2] += chaosZ;
                }
            }
            
            // Mark positions as needing update
            filament.geometry.attributes.position.needsUpdate = true;
        });
    }
    
    applyExpansionReactivity(bassEnergy, midEnergy, highEnergy, totalEnergy) {
        if (!this.settings.audioPresets.expansion) return;
        
        // Store original expansion if not already stored
        if (!this.originalExpansion) {
            this.originalExpansion = this.settings.expansion;
        }
        
        // Apply expansion scaling based on audio energy
        // Use total energy for overall expansion, with frequency-specific modulation
        const baseExpansionMultiplier = 0.8 + (totalEnergy * this.settings.audioSensitivity * 0.6); // 0.8x to 1.4x
        
        // Add frequency-specific modulation for more dynamic expansion
        const bassModulation = bassEnergy * 0.3;      // Bass adds expansion
        const midModulation = midEnergy * 0.2;        // Mids add moderate expansion  
        const highModulation = highEnergy * 0.1;      // Highs add subtle expansion
        
        const finalExpansionMultiplier = baseExpansionMultiplier + bassModulation + midModulation + highModulation;
        
        // Apply the expansion scaling (clamped to reasonable range)
        const newExpansion = this.originalExpansion * Math.min(2.0, Math.max(0.5, finalExpansionMultiplier));
        
        // Only update if the change is significant (prevents constant recreation)
        if (Math.abs(this.settings.expansion - newExpansion) > 1.0) {
            this.settings.expansion = newExpansion;
            
            // Recreate filaments with new expansion
            this.createFilaments();
        }
    }
    
    resetToOriginalPositions() {
        // Reset all filaments to their original positions
        if (!this.originalFilamentPositions) return;
        
        this.filaments.forEach((filament, index) => {
            if (!filament.geometry || !filament.geometry.attributes.position || 
                !this.originalFilamentPositions[index]) return;
            
            const positions = filament.geometry.attributes.position.array;
            const originalPositions = this.originalFilamentPositions[index];
            
            // Copy original positions back
            for (let i = 0; i < positions.length; i++) {
                positions[i] = originalPositions[i];
            }
            
            // Mark positions as needing update
            filament.geometry.attributes.position.needsUpdate = true;
        });
    }
    
    applyElementReactivity(energy, bassEnergy) {
        // Inner core glow reactivity
        if (this.innerCore) {
            const coreGlow = 1.0 + (bassEnergy * this.settings.audioSensitivity * 0.5);
            this.innerCore.scale.setScalar(coreGlow);
        }
        
        // Star twinkle reactivity
        if (this.stars && this.stars.material) {
            const twinkle = 0.7 + (energy * this.settings.audioSensitivity * 0.3);
            this.stars.material.opacity = twinkle;
        }
        
        // Filament brightness reactivity
        this.filaments.forEach((filament, index) => {
            if (filament.material) {
                const breathe = 1.0 + Math.sin(this.time * 0.3 + index * 0.1) * 0.02;
                const audioScale = 1.0 + (energy * this.settings.audioSensitivity * 0.1);
                filament.scale.setScalar(breathe * audioScale);
                
                // Subtle rotation based on energy
                filament.rotation.y = this.time * 0.05 + index * 0.1;
                filament.rotation.x = Math.sin(this.time * 0.03 + index) * 0.1 * (1 + energy * this.settings.audioSensitivity);
            }
        });
    }
    
    onBeatDetected(beatStrength) {
        if (!this.enabled || !this.settings.beatReactive) return;
        
        // Flash pulsar on beats
        if (this.pulsar) {
            this.pulsar.material.opacity = Math.min(1.0, 0.5 + beatStrength);
        }
        
        // Expand filaments on strong beats
        if (beatStrength > 0.7) {
            this.filaments.forEach(filament => {
                const expansionScale = 1.0 + (beatStrength * 0.3);
                filament.scale.multiplyScalar(expansionScale);
            });
        }
    }
    
    render() {
        if (!this.enabled || !this.renderer) {
            return;
        }
        
        // Performance optimization
        if (this.performanceMode && this.frameSkip++ < 2) return;
        this.frameSkip = 0;
        
        // Camera animation logic with priority: Fly-through > Mouse > Orbit > Static
        if (this.settings.flyThrough && this.flyThrough.isActive) {
            // Fly-through animation takes highest priority
            this.updateFlyThroughCamera();
        } else if (this.settings.cameraOrbit && !this.mouseInteraction.isDragging) {
            // Only use automatic orbit when not manually dragging and fly-through is off
            
            // Detect speed changes and maintain smooth transitions
            if (Math.abs(this.settings.orbitSpeed - this.lastOrbitSpeed) > 0.1) {
                // Speed changed - maintain current angle to prevent jumps
                this.lastOrbitSpeed = this.settings.orbitSpeed;
            }
            
            // Map 0-10 slider range to 0-0.8 speed (four times the old max of 0.2)
            const baseSpeed = (this.settings.orbitSpeed / 10) * 2.0;
            const effectiveSpeed = baseSpeed + (this.audioRotationBoost || 0);
            
            // Use persistent angle with frame-rate independent increment
            this.orbitAngle += effectiveSpeed * 0.016; // Assume 60fps (1/60 = 0.016)
            const angle = this.orbitAngle;
            const baseDist = this.settings.cameraDistance;
            const effectiveDist = baseDist + (this.audioCameraOffset || 0) + this.mouseInteraction.manualZoom;
            
            this.camera.position.x = Math.sin(angle) * effectiveDist;
            this.camera.position.z = Math.cos(angle) * effectiveDist;
            this.camera.position.y = Math.sin(angle * 0.5) * 10;
            this.camera.lookAt(0, 0, 0);
        } else {
            // Manual camera control (mouse interaction) or orbit off
            const baseDist = this.settings.cameraDistance;
            const effectiveDist = baseDist + (this.audioCameraOffset || 0) + this.mouseInteraction.manualZoom;
            
            // Apply manual rotation from mouse
            const rotY = this.mouseInteraction.manualRotationY;
            const rotX = this.mouseInteraction.manualRotationX;
            
            // Calculate camera position based on manual rotation
            this.camera.position.x = Math.sin(rotY) * Math.cos(rotX) * effectiveDist;
            this.camera.position.y = Math.sin(rotX) * effectiveDist;
            this.camera.position.z = Math.cos(rotY) * Math.cos(rotX) * effectiveDist;
            
            // Always look at center
            this.camera.lookAt(0, 0, 0);
        }
        
        // Render the scene
        try {
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('🌌 Render error:', error);
        }
    }
    
    toggle(enabled) {
        this.enabled = enabled;
        if (this.canvas) {
            this.canvas.style.display = enabled ? 'block' : 'none';
            if (enabled) {
                // Ensure proper sizing when shown
                this.autoResize();
            }
        }
    }
    
    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
        if (this.canvas) {
            // Apply both the passed opacity and the overall opacity setting
            const finalOpacity = this.opacity * this.settings.overallOpacity;
            this.canvas.style.opacity = finalOpacity;
        }
    }
    
    applyBackgroundKnockout() {
        if (!this.canvas) return;
        
        if (this.settings.knockoutBackground) {
            // Apply blend mode to make dark areas transparent
            this.canvas.style.mixBlendMode = 'screen';
            // console.log('🌌 Nebula background knockout enabled (screen blend mode)');
        } else {
            // Reset to normal blending
            this.canvas.style.mixBlendMode = 'normal';
            console.log('🌌 Nebula background knockout disabled (normal blend mode)');
        }
    }
    
    setQuality(level) {
        switch(level) {
            case 'low':
                this.settings.starCount = 2000;
                this.performanceMode = true;
                break;
            case 'medium':
                this.settings.starCount = 5000;
                this.performanceMode = false;
                break;
            case 'high':
                this.settings.starCount = 8000;
                this.performanceMode = false;
                break;
        }
        
        // Recreate stars with new count
        if (this.stars) {
            this.scene.remove(this.stars);
            this.createStarField();
        }
    }
    
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        
        // Recreate filaments if structure changed
        if (newSettings.filamentDensity !== undefined || 
            newSettings.expansion !== undefined || 
            newSettings.chaos !== undefined) {
            this.createFilaments();
        }
        
        // Update pulsar size
        if (newSettings.pulsarSize !== undefined && this.pulsar) {
            this.pulsar.userData.baseScale = newSettings.pulsarSize;
        }
        
        // Update star count
        if (newSettings.starCount !== undefined) {
            this.scene.remove(this.stars);
            this.createStarField();
        }
    }
    
    updateSetting(property, value) {
        if (this.settings.hasOwnProperty(property)) {
            this.settings[property] = value;
            
            // Apply specific updates based on the property
            switch(property) {
                case 'cameraDistance':
                    if (this.camera) {
                        this.camera.position.z = value;
                        // Regenerate starfield to ensure it's large enough for new camera distance
                        this.updateStarField();
                    }
                    break;
                case 'cameraOrbit':
                    // When orbit setting changes, immediately position camera correctly
                    if (this.camera) {
                        if (!value) {
                            // Orbit turned OFF - position camera at straight distance
                            this.camera.position.x = 0;
                            this.camera.position.y = 0;
                            this.camera.position.z = this.settings.cameraDistance;
                            this.camera.lookAt(0, 0, 0);
                        }
                        // If orbit turned ON, the render loop will handle the animation
                    }
                    break;
                case 'filamentDensity':
                case 'particlesPerFilament':
                case 'particleSize':
                case 'expansion':
                case 'chaos':
                case 'asymmetry':
                    // Regenerate filaments with new settings
                    this.updateFilaments();
                    break;
                case 'pulsarSize':
                    if (this.pulsar) {
                        this.pulsar.userData.baseScale = value;
                        this.pulsar.scale.set(value, value, 1);
                    }
                    break;
                case 'starCount':
                    this.updateStarField();
                    break;
                case 'showPulsar':
                    if (this.pulsar) {
                        this.pulsar.visible = value;
                    }
                    break;
                case 'bloom':
                    this.updateBloomEffect(value);
                    break;
                case 'morphingMode':
                    // When morphing mode is turned off, reset to baseline values
                    if (!value) {
                        this.resetToOriginalPositions();
                        this.resetMorphingBaselines();
                    }
                    break;
                case 'hueShift':
                case 'saturation':
                case 'brightness':
                    // Apply color adjustments to all nebula elements
                    this.applyColorAdjustments();
                    break;
                case 'overallOpacity':
                    // Update the canvas opacity immediately
                    this.setOpacity(this.opacity);
                    break;
                case 'knockoutBackground':
                    // Apply or remove blend mode for background knockout
                    this.applyBackgroundKnockout();
                    break;
                case 'flyThrough':
                    // Initialize or stop fly-through
                    if (value) {
                        this.startFlyThrough();
                    } else {
                        this.stopFlyThrough();
                    }
                    break;
            }
        }
    }
    
    updateBloomEffect(enabled) {
        const bloomIntensity = enabled ? this.settings.bloomStrength : 0.5;
        const bloomOpacity = enabled ? 1.0 : 0.7;
        
        // Update pulsar bloom
        if (this.pulsar && this.pulsar.material) {
            this.pulsar.material.opacity = bloomOpacity;
            // Increase glow effect when bloom is enabled
            if (enabled) {
                this.pulsar.material.blending = THREE.AdditiveBlending;
            } else {
                this.pulsar.material.blending = THREE.NormalBlending;
            }
        }
        
        // Update filament bloom
        this.filaments.forEach(filament => {
            if (filament.material) {
                filament.material.opacity = bloomOpacity * 0.8;
                if (enabled) {
                    filament.material.blending = THREE.AdditiveBlending;
                } else {
                    filament.material.blending = THREE.NormalBlending;
                }
            }
        });
        
        // Update inner core bloom
        if (this.innerCore && this.innerCore.material) {
            this.innerCore.material.opacity = bloomOpacity * 0.6;
            if (enabled) {
                this.innerCore.material.blending = THREE.AdditiveBlending;
            } else {
                this.innerCore.material.blending = THREE.NormalBlending;
            }
        }
        
        // Update star bloom
        if (this.stars && this.stars.material) {
            this.stars.material.opacity = enabled ? 0.9 : 0.7;
            if (enabled) {
                this.stars.material.blending = THREE.AdditiveBlending;
            } else {
                this.stars.material.blending = THREE.AdditiveBlending; // Keep stars additive
            }
        }
    }
    
    applyColorAdjustments() {
        const hueShift = this.settings.hueShift / 360; // Convert to 0-1
        const saturationMult = this.settings.saturation / 100; // Convert to multiplier
        const brightnessMult = this.settings.brightness / 100; // Convert to multiplier
        
        // Apply to pulsar (Sprite material - this works)
        if (this.pulsar && this.pulsar.material) {
            // Store base color if not already stored
            if (!this.pulsar.userData.baseColor) {
                this.pulsar.userData.baseColor = { r: 0.7, g: 0.8, b: 1.0 }; // Light blue default
            }
            
            const baseColor = this.pulsar.userData.baseColor;
            const adjustedColor = this.adjustColor(baseColor, hueShift, saturationMult, brightnessMult);
            
            // SpriteMaterial uses color property
            if (this.pulsar.material.color) {
                this.pulsar.material.color.setRGB(adjustedColor.r, adjustedColor.g, adjustedColor.b);
            }
        }
        
        // Apply to filaments - UPDATE COLORS IN PLACE (don't recreate)
        this.filaments.forEach((filament, filamentIndex) => {
            if (filament.geometry && filament.geometry.attributes.color) {
                const colorArray = filament.geometry.attributes.color.array;
                const particleCount = colorArray.length / 3;
                
                for (let i = 0; i < particleCount; i++) {
                    const t = i / particleCount;
                    
                    // Recreate the same base color logic as in createFilaments
                    let r, g, b;
                    if (t < 0.25) {
                        const mix = t / 0.25;
                        r = 0.7 + mix * 0.3;
                        g = 0.8 + mix * 0.2;
                        b = 1.0;
                    } else if (t < 0.6) {
                        const mix = (t - 0.25) / 0.35;
                        r = 0.4 + mix * 0.4;
                        g = 0.9;
                        b = 0.5 - mix * 0.3;
                    } else {
                        const mix = (t - 0.6) / 0.4;
                        r = 1.0;
                        g = 0.5 - mix * 0.2;
                        b = 0.2 - mix * 0.1;
                    }
                    
                    // Apply color adjustments
                    const adjustedColor = this.adjustColor({ r, g, b }, hueShift, saturationMult, brightnessMult);
                    
                    // Update the color array directly
                    const index = i * 3;
                    colorArray[index] = adjustedColor.r;
                    colorArray[index + 1] = adjustedColor.g;
                    colorArray[index + 2] = adjustedColor.b;
                }
                
                // Mark the color attribute as needing update
                filament.geometry.attributes.color.needsUpdate = true;
            }
        });
        
        // Apply to inner core - UPDATE SHADER UNIFORMS (don't recreate)
        if (this.innerCore && this.innerCore.material && this.innerCore.material.uniforms) {
            // Store base color if not already stored
            if (!this.innerCore.userData) {
                this.innerCore.userData = {};
            }
            if (!this.innerCore.userData.baseColor) {
                this.innerCore.userData.baseColor = { r: 1.0, g: 0.8, b: 0.4 }; // Warm core color
            }
            
            const baseColor = this.innerCore.userData.baseColor;
            const adjustedColor = this.adjustColor(baseColor, hueShift, saturationMult, brightnessMult);
            
            // Add color uniform to shader if it doesn't exist
            if (!this.innerCore.material.uniforms.colorTint) {
                this.innerCore.material.uniforms.colorTint = { value: new THREE.Color(adjustedColor.r, adjustedColor.g, adjustedColor.b) };
                // Update the shader to use the color tint
                this.updateInnerCoreShader();
            } else {
                this.innerCore.material.uniforms.colorTint.value.setRGB(adjustedColor.r, adjustedColor.g, adjustedColor.b);
            }
        }
        
        // Apply to stars (PointsMaterial - this should work)
        if (this.stars && this.stars.material) {
            // Store base color if not already stored
            if (!this.stars.userData) {
                this.stars.userData = {};
            }
            if (!this.stars.userData.baseColor) {
                this.stars.userData.baseColor = { r: 1.0, g: 1.0, b: 1.0 }; // White stars
            }
            
            const baseColor = this.stars.userData.baseColor;
            const adjustedColor = this.adjustColor(baseColor, hueShift * 0.3, saturationMult * 0.5, brightnessMult);
            
            // PointsMaterial should have color property
            if (this.stars.material.color) {
                this.stars.material.color.setRGB(adjustedColor.r, adjustedColor.g, adjustedColor.b);
            }
        }
        
        // If color reactivity is ON, refresh the stored original colors
        // so that audio reactivity works from the new preset colors
        if (this.settings.audioPresets.color) {
            this.refreshOriginalColors();
        }
    }
    
    adjustColor(baseColor, hueShift, saturationMult, brightnessMult) {
        // Convert RGB to HSV
        const hsv = this.rgbToHsv(baseColor.r, baseColor.g, baseColor.b);
        
        // Apply adjustments
        let newHue = (hsv.h + hueShift) % 1.0;
        if (newHue < 0) newHue += 1.0;
        
        let newSaturation = Math.max(0, Math.min(1, hsv.s * saturationMult));
        let newValue = Math.max(0.1, Math.min(1, hsv.v * brightnessMult));
        
        // Convert back to RGB
        return this.hsvToRgb(newHue, newSaturation, newValue);
    }
    
    rgbToHsv(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        if (diff !== 0) {
            if (max === r) {
                h = ((g - b) / diff) % 6;
            } else if (max === g) {
                h = (b - r) / diff + 2;
            } else {
                h = (r - g) / diff + 4;
            }
            h /= 6;
            if (h < 0) h += 1;
        }
        
        const s = max === 0 ? 0 : diff / max;
        const v = max;
        
        return { h, s, v };
    }
    
    updateInnerCoreShader() {
        if (!this.innerCore || !this.innerCore.material) return;
        
        // Update the fragment shader to include color tinting
        this.innerCore.material.fragmentShader = `
            uniform float time;
            uniform vec3 colorTint;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                float dist = length(vPosition) / 3.0;
                float pulse = sin(time * 3.0) * 0.5 + 0.5;
                
                vec3 baseColor = vec3(1.0, 0.6, 0.2);
                vec3 finalColor = baseColor * colorTint;
                
                float alpha = (1.0 - dist) * (0.6 + pulse * 0.4);
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;
        
        this.innerCore.material.needsUpdate = true;
    }
    
    startFlyThrough() {
        // Store current camera state for smooth transition
        this.flyThrough.startPosition = this.camera.position.clone();
        this.flyThrough.startTime = this.time;
        this.flyThrough.isActive = true;
        
        // Find the best entry point on figure-8 where camera faces nebula center
        this.flyThrough.entryPoint = this.findNebulaFacingEntryPoint();
        
        console.log('🚁 Fly-through started - transitioning to nebula-facing entry point');
    }
    
    
    findNebulaFacingEntryPoint() {
        const radius = this.flyThrough.pathRadius;
        const height = this.flyThrough.pathHeight;
        
        // Sample points on the figure-8 path to find where camera would face nebula center
        let bestT = 0;
        let bestScore = -Infinity;
        let bestPosition = null;
        let bestLookDirection = null;
        
        // Test multiple points around the figure-8 path
        for (let i = 0; i < 100; i++) {
            const t = (i / 100) * Math.PI * 4; // Full figure-8 cycle
            
            // Calculate position on figure-8
            const sinT = Math.sin(t);
            const cosT = Math.cos(t);
            const denominator = 1 + sinT * sinT;
            
            const pathX = radius * cosT / denominator;
            const pathZ = radius * sinT * cosT / denominator;
            const pathY = height * Math.sin(2 * t);
            
            // Calculate forward direction at this point (velocity vector)
            const dt = 0.01;
            const tNext = t + dt;
            const sinTNext = Math.sin(tNext);
            const cosTNext = Math.cos(tNext);
            const denominatorNext = 1 + sinTNext * sinTNext;
            
            const nextX = radius * cosTNext / denominatorNext;
            const nextZ = radius * sinTNext * cosTNext / denominatorNext;
            const nextY = height * Math.sin(2 * tNext);
            
            // Velocity vector (forward direction)
            const velocityX = (nextX - pathX) / dt;
            const velocityY = (nextY - pathY) / dt;
            const velocityZ = (nextZ - pathZ) / dt;
            
            // Normalize velocity
            const velocityLength = Math.sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ);
            if (velocityLength < 0.001) continue;
            
            const forwardX = velocityX / velocityLength;
            const forwardY = velocityY / velocityLength;
            const forwardZ = velocityZ / velocityLength;
            
            // Calculate direction from this position to nebula center
            const toNebulaX = 0 - pathX;
            const toNebulaY = 0 - pathY;
            const toNebulaZ = 0 - pathZ;
            const toNebulaLength = Math.sqrt(toNebulaX * toNebulaX + toNebulaY * toNebulaY + toNebulaZ * toNebulaZ);
            
            if (toNebulaLength < 0.001) continue;
            
            const toNebulaNormX = toNebulaX / toNebulaLength;
            const toNebulaNormY = toNebulaY / toNebulaLength;
            const toNebulaNormZ = toNebulaZ / toNebulaLength;
            
            // Calculate how well the forward direction aligns with direction to nebula
            // Dot product: 1 = perfect alignment, -1 = opposite direction
            const alignment = forwardX * toNebulaNormX + forwardY * toNebulaNormY + forwardZ * toNebulaNormZ;
            
            // Also consider distance from current camera position (prefer closer points)
            const distanceFromCurrent = Math.sqrt(
                Math.pow(pathX - this.flyThrough.startPosition.x, 2) +
                Math.pow(pathY - this.flyThrough.startPosition.y, 2) +
                Math.pow(pathZ - this.flyThrough.startPosition.z, 2)
            );
            
            // Score: prioritize alignment with nebula direction, with distance as tiebreaker
            const score = alignment * 10 - (distanceFromCurrent / 100);
            
            if (score > bestScore) {
                bestScore = score;
                bestT = t;
                bestPosition = { x: pathX, y: pathY, z: pathZ };
                bestLookDirection = { x: forwardX, y: forwardY, z: forwardZ };
            }
        }
        
        return {
            t: bestT,
            position: bestPosition,
            lookDirection: bestLookDirection
        };
    }
    
    stopFlyThrough() {
        this.flyThrough.isActive = false;
        this.flyThrough.startPosition = null;
        this.flyThrough.startLookAt = null;
        this.flyThrough.pathEntryPoint = null;
        this.flyThrough.entryPoint = null;
        this.flyThrough.smoothCamera = null; // Clean up smooth camera tracking
    }
    
    updateFlyThroughCamera() {
        if (!this.flyThrough.isActive || !this.flyThrough.startPosition || !this.flyThrough.entryPoint) return;
        
        // Initialize smooth camera tracking if not exists
        if (!this.flyThrough.smoothCamera) {
            this.flyThrough.smoothCamera = {
                position: this.camera.position.clone(),
                lookAt: new THREE.Vector3(0, 0, 0)
            };
        }
        
        // Calculate time elapsed since fly-through started (using current speed setting)
        const elapsedTime = (this.time - this.flyThrough.startTime) * this.settings.flySpeed;
        const transitionDuration = 2.0; // 2 seconds to smoothly transition to entry point
        
        // Smooth interpolation factor for camera movement
        const cameraSmoothing = 0.08; // Adjust for smoothness vs responsiveness
        
        const radius = this.flyThrough.pathRadius;
        const height = this.flyThrough.pathHeight;
        
        let targetPosition = new THREE.Vector3();
        let targetLookAt = new THREE.Vector3();
        
        if (elapsedTime < transitionDuration) {
            // SMOOTH TRANSITION PHASE: Move to nebula-facing entry point
            const transitionProgress = elapsedTime / transitionDuration;
            const smoothProgress = transitionProgress * transitionProgress * (3.0 - 2.0 * transitionProgress); // Ease-in-out
            
            // Calculate target position (interpolated from start to entry point)
            const entryPos = this.flyThrough.entryPoint.position;
            targetPosition.x = this.flyThrough.startPosition.x + (entryPos.x - this.flyThrough.startPosition.x) * smoothProgress;
            targetPosition.y = this.flyThrough.startPosition.y + (entryPos.y - this.flyThrough.startPosition.y) * smoothProgress;
            targetPosition.z = this.flyThrough.startPosition.z + (entryPos.z - this.flyThrough.startPosition.z) * smoothProgress;
            
            // Calculate target look direction
            const entryLookDir = this.flyThrough.entryPoint.lookDirection;
            
            // Direction to nebula center from target position
            const toNebulaX = 0 - targetPosition.x;
            const toNebulaY = 0 - targetPosition.y;
            const toNebulaZ = 0 - targetPosition.z;
            const toNebulaLength = Math.sqrt(toNebulaX * toNebulaX + toNebulaY * toNebulaY + toNebulaZ * toNebulaZ);
            
            let lookDirX = toNebulaX / toNebulaLength;
            let lookDirY = toNebulaY / toNebulaLength;
            let lookDirZ = toNebulaZ / toNebulaLength;
            
            // Gradually blend from nebula-facing to forward-facing
            if (smoothProgress > 0.5) {
                const orientationProgress = (smoothProgress - 0.5) * 2; // 0 to 1 in second half
                lookDirX = lookDirX + (entryLookDir.x - lookDirX) * orientationProgress;
                lookDirY = lookDirY + (entryLookDir.y - lookDirY) * orientationProgress;
                lookDirZ = lookDirZ + (entryLookDir.z - lookDirZ) * orientationProgress;
            }
            
            // Set target look at point
            const lookAtDistance = 50;
            targetLookAt.x = targetPosition.x + lookDirX * lookAtDistance;
            targetLookAt.y = targetPosition.y + lookDirY * lookAtDistance;
            targetLookAt.z = targetPosition.z + lookDirZ * lookAtDistance;
            
        } else {
            // FIGURE-8 PATH PHASE: Continue from entry point with normal flight behavior
            const pathTime = elapsedTime - transitionDuration;
            const t = this.flyThrough.entryPoint.t + pathTime * 0.5; // Continue from entry point
            
            // Calculate target figure-8 position
            const sinT = Math.sin(t);
            const cosT = Math.cos(t);
            const denominator = 1 + sinT * sinT;
            
            targetPosition.x = radius * cosT / denominator;
            targetPosition.z = radius * sinT * cosT / denominator;
            targetPosition.y = height * Math.sin(2 * t);
            
            // Calculate forward direction from velocity (for smooth look direction)
            const dt = 0.01;
            const tNext = t + dt;
            const sinTNext = Math.sin(tNext);
            const cosTNext = Math.cos(tNext);
            const denominatorNext = 1 + sinTNext * sinTNext;
            
            const nextX = radius * cosTNext / denominatorNext;
            const nextZ = radius * sinTNext * cosTNext / denominatorNext;
            const nextY = height * Math.sin(2 * tNext);
            
            // Calculate velocity vector (direction of movement)
            const velocityX = (nextX - targetPosition.x) / dt;
            const velocityY = (nextY - targetPosition.y) / dt;
            const velocityZ = (nextZ - targetPosition.z) / dt;
            
            // Normalize velocity to get forward direction
            const velocityLength = Math.sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ);
            let forwardX = 0, forwardY = 0, forwardZ = 1;
            
            if (velocityLength > 0.001) {
                forwardX = velocityX / velocityLength;
                forwardY = velocityY / velocityLength;
                forwardZ = velocityZ / velocityLength;
            }
            
            // Set target look at point
            const lookAtDistance = 50;
            targetLookAt.x = targetPosition.x + forwardX * lookAtDistance;
            targetLookAt.y = targetPosition.y + forwardY * lookAtDistance;
            targetLookAt.z = targetPosition.z + forwardZ * lookAtDistance;
        }
        
        // Apply smooth interpolation to actual camera position and look direction
        this.flyThrough.smoothCamera.position.lerp(targetPosition, cameraSmoothing);
        this.flyThrough.smoothCamera.lookAt.lerp(targetLookAt, cameraSmoothing);
        
        // Update actual camera
        this.camera.position.copy(this.flyThrough.smoothCamera.position);
        this.camera.lookAt(this.flyThrough.smoothCamera.lookAt);
    }

    updateFilaments() {
        // Remove existing filaments
        this.filaments.forEach(filament => {
            this.scene.remove(filament);
        });
        this.filaments = [];
        
        // Recreate with new settings
        this.createFilaments();
    }
    
    updateStarField() {
        // Remove existing stars
        if (this.stars) {
            this.scene.remove(this.stars);
        }
        
        // Recreate with new count
        this.createStarField();
    }

    resize(width, height) {
        if (!this.camera || !this.renderer) {
            console.warn('🌌 Nebula resize: Camera or renderer not initialized');
            return;
        }
        
        // Ensure minimum dimensions and fallback to defaults
        const newWidth = Math.max(width || 1920, 100);
        const newHeight = Math.max(height || 1080, 100);
        
        // Update canvas dimensions
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        // Update camera aspect ratio
        this.camera.aspect = this.canvas.width / this.canvas.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        
        // console.log(`🌌 Nebula canvas resized to: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    // Auto-resize to container
    autoResize() {
        const container = document.getElementById('visualizationContainer') || document.getElementById('visualizer');
        if (container) {
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.resize(rect.width, rect.height);
                // console.log(`🌌 Nebula auto-resized to container: ${rect.width}x${rect.height}`);
            } else {
                console.warn('🌌 Nebula autoResize: Container has zero dimensions');
            }
        } else {
            console.warn('🌌 Nebula autoResize: Container not found');
        }
    }
    
    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Dispose of geometries and materials
        this.filaments.forEach(filament => {
            if (filament.geometry) filament.geometry.dispose();
            if (filament.material) filament.material.dispose();
        });
        
        if (this.stars) {
            if (this.stars.geometry) this.stars.geometry.dispose();
            if (this.stars.material) this.stars.material.dispose();
        }
        
        console.log('🌌 Nebula visualization destroyed');
    }
}

// Export for use in main app
window.NebulaVisualization = NebulaVisualization;
