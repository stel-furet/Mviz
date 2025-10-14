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
            bassResponse: 1.0,
            midResponse: 1.0,
            trebleResponse: 1.0
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
        // Clear existing filaments
        this.filaments.forEach(f => this.scene.remove(f));
        this.filaments = [];
        
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
            
            const baseParticles = 120;
            const variationAmount = Math.floor(Math.random() * 100 * this.settings.threadVariation);
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
                
                // Color gradient: blue/white → green → red/orange
                if (t < 0.25) {
                    const mix = t / 0.25;
                    colors.push(
                        0.7 + mix * 0.3,
                        0.8 + mix * 0.2,
                        1.0
                    );
                } else if (t < 0.6) {
                    const mix = (t - 0.25) / 0.35;
                    colors.push(
                        0.4 + mix * 0.4,
                        0.9,
                        0.5 - mix * 0.3
                    );
                } else {
                    const mix = (t - 0.6) / 0.4;
                    colors.push(
                        1.0,
                        0.5 - mix * 0.2,
                        0.2 - mix * 0.1
                    );
                }
                
                const baseThickness = 0.8 + Math.random() * 0.4 * this.settings.threadVariation;
                const thickness = Math.sin(t * Math.PI);
                sizes.push(baseThickness + thickness * 1.5);
                
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
            filament.userData.baseDir = baseDir.clone();
            this.filaments.push(filament);
            this.scene.add(filament);
        }
        
        console.log('🌌 Created', this.filaments.length, 'nebula filament threads');
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
        if (!this.enabled || !audioData) return;
        
        // Extract audio features for reactivity
        if (this.settings.audioReactive) {
            this.bassLevel = this.getAverageFrequency(audioData, 0, 4);
            this.midLevel = this.getAverageFrequency(audioData, 4, 12);
            this.trebleLevel = this.getAverageFrequency(audioData, 12, 24);
            
            // Apply audio reactivity
            this.animateToAudio();
        }
        
        this.time += 0.016;
    }
    
    getAverageFrequency(audioData, startBin, endBin) {
        if (!audioData || !audioData.length) return 0;
        
        let sum = 0;
        const count = Math.min(endBin, audioData.length) - startBin;
        
        for (let i = startBin; i < Math.min(endBin, audioData.length); i++) {
            sum += audioData[i] / 255.0;
        }
        
        return count > 0 ? sum / count : 0;
    }
    
    animateToAudio() {
        // Pulse rate responds to bass
        const audioPulseRate = this.settings.pulseRate + (this.bassLevel * 2.0 * this.settings.bassResponse);
        
        // Filament density responds to mid frequencies  
        const audioFilamentDensity = this.settings.filamentDensity + (this.midLevel * 1.5 * this.settings.midResponse);
        
        // Chaos responds to treble
        const audioChaos = this.settings.chaos + (this.trebleLevel * 3.0 * this.settings.trebleResponse);
        
        // Update pulsar
        if (this.pulsar && this.settings.showPulsar) {
            const pulseFast = Math.sin(this.time * audioPulseRate * Math.PI * 2);
            const intensity = 0.3 + (pulseFast + 1) * 0.35;
            
            this.pulsar.material.opacity = intensity * this.opacity;
            const scale = this.pulsar.userData.baseScale * (0.8 + intensity * 0.4);
            this.pulsar.scale.set(scale, scale, 1);
        }
        
        // Update filaments with audio chaos
        this.filaments.forEach((filament, i) => {
            if (filament.material.uniforms) {
                filament.material.uniforms.time.value = this.time;
            }
            
            const breathe = 1.0 + Math.sin(this.time * 0.3 + i * 0.1) * 0.02;
            const audioScale = 1.0 + (this.midLevel * 0.1);
            filament.scale.setScalar(breathe * audioScale);
            
            filament.rotation.y = this.time * 0.05 + i * 0.1;
            filament.rotation.x = Math.sin(this.time * 0.03 + i) * 0.1 * (1 + this.trebleLevel);
        });
        
        // Update inner core
        if (this.innerCore) {
            this.innerCore.material.uniforms.time.value = this.time;
            const pulse = 1.0 + Math.sin(this.time * 1.5) * 0.05;
            const audioPulse = 1.0 + (this.bassLevel * 0.2);
            this.innerCore.scale.setScalar(pulse * audioPulse);
        }
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
    
    // Auto-resize to container
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
