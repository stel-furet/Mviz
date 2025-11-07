/**
 * Nebula Visualization Class
 * Adapted from supernova-remnant-renderer.html for integration into the main app
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
        this.canvas.style.pointerEvents = 'none';
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
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        // Audio reactivity
        this.bassLevel = 0;
        this.midLevel = 0;
        this.trebleLevel = 0;
        
        // Settings - base supernova configuration
        this.settings = {
            // Camera
            cameraDistance: 180,
            cameraOrbit: true,
            
            // Filament structure
            filamentDensity: 1.4,
            expansion: 36,
            chaos: 2.8,
            asymmetry: 1.1,
            threadVariation: 1.1,
            
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
            
            // Audio reactivity settings
            audioReactive: true,
            beatReactive: true,
            bassReactivity: 0.5,
            midReactivity: 0.3,
            trebleReactivity: 0.4
        };
        
        // Performance
        this.performanceMode = false;
        this.frameSkip = 0;

        console.log('🌌 Nebula Visualization created');
        this.init();
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
            
            console.log('🌌 Nebula Three.js scene initialized successfully');
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
        const filamentCount = Math.floor(this.settings.filamentDensity * 50);
        
        for (let i = 0; i < filamentCount; i++) {
            const points = [];
            const baseRadius = this.settings.expansion;
            
            // Create random filament path
            const segments = 20 + Math.floor(Math.random() * 30);
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
            
            for (let j = 0; j < segments; j++) {
                const t = j / (segments - 1);
                const radius = baseRadius * (0.3 + t * 0.7);
                
                // Add chaos and asymmetry
                const chaosX = (Math.random() - 0.5) * this.settings.chaos * t;
                const chaosY = (Math.random() - 0.5) * this.settings.chaos * t;
                const chaosZ = (Math.random() - 0.5) * this.settings.chaos * t;
                
                const x = Math.cos(angle) * radius * this.settings.asymmetry + chaosX;
                const y = Math.sin(elevation) * radius + chaosY;
                const z = Math.sin(angle) * radius + chaosZ;
                
                points.push(new THREE.Vector3(x, y, z));
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: new THREE.Color().setHSL(0.15 + Math.random() * 0.1, 0.8, 0.6),
                transparent: true,
                opacity: 0.4 + Math.random() * 0.3,
                blending: THREE.AdditiveBlending
            });
            
            const filament = new THREE.Line(geometry, material);
            this.filaments.push(filament);
            this.scene.add(filament);
        }
    }
    
    createInnerCore() {
        const geometry = new THREE.SphereGeometry(8, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.3,
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
        if (!this.enabled || !audioData) return;
        
        // Extract audio features for reactivity
        if (this.settings.audioReactive) {
            this.bassLevel = audioData.bass || 0;
            this.midLevel = audioData.mid || 0;
            this.trebleLevel = audioData.treble || 0;
        }
        
        // Update time for animations
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.time += deltaTime;
        this.lastTime = currentTime;
        this.frameCount++;
        
        // Update pulsar animation
        if (this.pulsar && this.settings.showPulsar) {
            const pulseBase = Math.sin(this.time * this.settings.pulseRate) * 0.5 + 0.5;
            const pulseFast = Math.sin(this.time * this.settings.pulseRate * 4) * 0.2;
            
            // Add audio reactivity to pulse
            let audioBoost = 0;
            if (this.settings.audioReactive && this.settings.beatReactive) {
                audioBoost = (this.bassLevel * this.settings.bassReactivity + 
                            this.midLevel * this.settings.midReactivity) * 0.5;
            }
            
            const intensity = 0.3 + (pulseBase + pulseFast + audioBoost) * 0.35;
            
            this.pulsar.material.opacity = intensity * this.opacity;
            const scale = this.pulsar.userData.baseScale * (0.8 + intensity * 0.4);
            this.pulsar.scale.set(scale, scale, 1);
        }
        
        // Update filament animation
        if (this.settings.audioReactive) {
            this.filaments.forEach((filament, index) => {
                if (filament.material) {
                    const baseOpacity = 0.4 + Math.random() * 0.3;
                    let audioInfluence = 0;
                    
                    if (this.settings.beatReactive) {
                        audioInfluence = (this.trebleLevel * this.settings.trebleReactivity + 
                                        this.midLevel * this.settings.midReactivity) * 0.3;
                    }
                    
                    filament.material.opacity = Math.min(1.0, baseOpacity + audioInfluence) * this.opacity;
                }
            });
        }
        
        // Update inner core
        if (this.innerCore) {
            const coreIntensity = 0.3 + Math.sin(this.time * 2) * 0.1;
            let audioCore = 0;
            
            if (this.settings.audioReactive) {
                audioCore = this.bassLevel * this.settings.bassReactivity * 0.2;
            }
            
            this.innerCore.material.opacity = (coreIntensity + audioCore) * this.opacity;
        }
    }
    
    render() {
        if (!this.enabled || !this.renderer) {
            return;
        }
        
        // Performance optimization
        if (this.performanceMode && this.frameSkip++ < 2) return;
        this.frameSkip = 0;
        
        // Camera orbit animation
        if (this.settings.cameraOrbit) {
            const angle = this.time * 0.1;
            const dist = this.settings.cameraDistance;
            this.camera.position.x = Math.sin(angle) * dist;
            this.camera.position.z = Math.cos(angle) * dist;
            this.camera.position.y = Math.sin(angle * 0.5) * 10;
            this.camera.lookAt(0, 0, 0);
        } else {
            // When orbit is off, ensure camera is positioned correctly at the set distance
            this.camera.position.x = 0;
            this.camera.position.y = 0;
            this.camera.position.z = this.settings.cameraDistance;
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
            this.canvas.style.opacity = this.opacity;
        }
    }
    
    setQuality(quality) {
        switch(quality) {
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
            this.updateFilaments();
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
        if (!this.camera || !this.renderer) return;
        
        // Update canvas dimensions
        this.canvas.width = width || 1920;
        this.canvas.height = height || 1080;
        
        this.camera.aspect = this.canvas.width / this.canvas.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        
        console.log(`🌌 Nebula canvas resized to: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    autoResize() {
        const container = document.getElementById('visualizationContainer') || document.getElementById('visualizer');
        if (container) {
            const rect = container.getBoundingClientRect();
            this.resize(rect.width, rect.height);
        }
    }
    
    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Clean up Three.js objects
        if (this.scene) {
            this.scene.clear();
        }
    }
}

// Make available globally
window.NebulaVisualization = NebulaVisualization;