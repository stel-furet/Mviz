/**
 * Chrome Spheres Plugin
 * Reflective metallic spheres with environment mapping from video or background image
 * Audio-reactive floating spheres with realistic reflections
 * 
 * @version 1.0.0
 * @author Freque Team
 */

class ChromeSpheresPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('chromespheres', visualizer, {
            version: '1.0.0',
            author: 'Freque Team',
            description: 'Reflective Chrome Spheres with Environment Mapping',
            displayName: 'Chrome Spheres',
            targetFPS: 60
        });
        
        // Three.js objects
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.spheres = [];
        
        // Environment mapping
        this.envMapSource = 'video'; // 'video' or 'bgimg'
        this.envMapTexture = null;
        this.videoTexture = null;
        this.bgImageTexture = null;
        this.updateEnvMapNeeded = true;
        
        // Plugin settings
        this.sphereCount = 15;
        this.minSphereSize = 0.5;
        this.maxSphereSize = 3.0;
        this.spreadRadius = 10;
        this.floatSpeed = 1.0;
        this.metalness = 1.0;
        this.roughness = 0.1;
        
        // Audio reactivity
        this.audioReactive = true;
        this.bassScale = true;
        this.midMovement = true;
        this.trebleShine = true;
        this.beatPulse = true;
        
        // Animation
        this.time = 0;
        this.cameraDistance = 20;
        this.cameraAutoRotate = true;
        this.cameraRotationSpeed = 0.05;
        
        // Audio analysis
        this.currentEnergy = 0;
        this.smoothedEnergy = 0;
        this.energyHistory = [];
        this.frequencyBands = { bass: 0, mid: 0, treble: 0 };
        this.beatDetection = {
            lastBeatTime: 0,
            threshold: 1.3,
            minTimeBetweenBeats: 200
        };
        
        // Setup
        this.setupControls();
        this.setupPresets();
    }
    
    setupControls() {
        // Environment source toggle
        this.addControl('envSource', {
            type: 'button',
            label: 'Video',
            className: 'btn-toggle active',
            onClick: () => {
                this.toggleEnvSource();
            }
        });
        
        // Sphere count
        this.addControl('sphereCount', {
            type: 'slider',
            label: 'Sphere Count',
            min: 5,
            max: 30,
            value: this.sphereCount,
            onChange: (value) => {
                this.sphereCount = value;
                this.recreateSpheres();
            }
        });
        
        // Size range
        this.addControl('maxSize', {
            type: 'slider',
            label: 'Max Size',
            min: 1.0,
            max: 5.0,
            value: this.maxSphereSize,
            onChange: (value) => {
                this.maxSphereSize = value;
                this.updateSphereSizes();
            }
        });
        
        // Spread
        this.addControl('spreadRadius', {
            type: 'slider',
            label: 'Spread',
            min: 5,
            max: 30,
            value: this.spreadRadius,
            onChange: (value) => {
                this.spreadRadius = value;
            }
        });
        
        // Float speed
        this.addControl('floatSpeed', {
            type: 'slider',
            label: 'Float Speed',
            min: 0.1,
            max: 3.0,
            value: this.floatSpeed,
            unit: 'x',
            onChange: (value) => {
                this.floatSpeed = value;
            }
        });
        
        // Metalness
        this.addControl('metalness', {
            type: 'slider',
            label: 'Metalness',
            min: 0.0,
            max: 1.0,
            value: this.metalness,
            onChange: (value) => {
                this.metalness = value;
                this.updateSphereMaterials();
            }
        });
        
        // Roughness
        this.addControl('roughness', {
            type: 'slider',
            label: 'Roughness',
            min: 0.0,
            max: 1.0,
            value: this.roughness,
            onChange: (value) => {
                this.roughness = value;
                this.updateSphereMaterials();
            }
        });
        
        // Camera distance
        this.addControl('cameraDistance', {
            type: 'slider',
            label: 'Camera Distance',
            min: 10,
            max: 40,
            value: this.cameraDistance,
            onChange: (value) => {
                this.cameraDistance = value;
                this.updateCamera();
            }
        });
        
        // Audio reactive
        this.addControl('audioReactive', {
            type: 'checkbox',
            label: 'Audio Reactive',
            checked: this.audioReactive,
            onChange: (checked) => {
                this.audioReactive = checked;
            }
        });
        
        // Bass scale
        this.addControl('bassScale', {
            type: 'checkbox',
            label: 'Bass → Scale',
            checked: this.bassScale,
            onChange: (checked) => {
                this.bassScale = checked;
            }
        });
        
        // Mid movement
        this.addControl('midMovement', {
            type: 'checkbox',
            label: 'Mid → Movement',
            checked: this.midMovement,
            onChange: (checked) => {
                this.midMovement = checked;
            }
        });
        
        // Treble shine
        this.addControl('trebleShine', {
            type: 'checkbox',
            label: 'Treble → Shine',
            checked: this.trebleShine,
            onChange: (checked) => {
                this.trebleShine = checked;
            }
        });
        
        // Beat pulse
        this.addControl('beatPulse', {
            type: 'checkbox',
            label: 'Beat Pulse',
            checked: this.beatPulse,
            onChange: (checked) => {
                this.beatPulse = checked;
            }
        });
        
        // Camera auto-rotate
        this.addControl('cameraAutoRotate', {
            type: 'checkbox',
            label: 'Auto-Rotate Camera',
            checked: this.cameraAutoRotate,
            onChange: (checked) => {
                this.cameraAutoRotate = checked;
            }
        });
    }
    
    setupPresets() {
        this.addPreset('gentle', {
            name: 'Gentle Float',
            values: {
                sphereCount: 10,
                maxSize: 2.0,
                spreadRadius: 15,
                floatSpeed: 0.5,
                metalness: 1.0,
                roughness: 0.2,
                audioReactive: true,
                bassScale: true,
                midMovement: false,
                beatPulse: false
            }
        });
        
        this.addPreset('energetic', {
            name: 'Energetic',
            values: {
                sphereCount: 20,
                maxSize: 3.0,
                spreadRadius: 20,
                floatSpeed: 1.5,
                metalness: 1.0,
                roughness: 0.1,
                audioReactive: true,
                bassScale: true,
                midMovement: true,
                beatPulse: true
            }
        });
        
        this.addPreset('minimal', {
            name: 'Minimal',
            values: {
                sphereCount: 5,
                maxSize: 4.0,
                spreadRadius: 10,
                floatSpeed: 0.3,
                metalness: 1.0,
                roughness: 0.05,
                audioReactive: true,
                bassScale: false,
                midMovement: false,
                beatPulse: false
            }
        });
    }
    
    toggleEnvSource() {
        // Toggle between video and background image
        this.envMapSource = this.envMapSource === 'video' ? 'bgimg' : 'video';
        
        // Update button label and state
        const btn = document.querySelector('[data-plugin="chromespheres"] .btn-toggle');
        if (btn) {
            btn.textContent = this.envMapSource === 'video' ? 'Video' : 'Bg Img';
        }
        
        this.updateEnvMapNeeded = true;
    }
    
    shouldClearCanvas() {
        return false; // WebGL handles clearing
    }
    
    onInitialize() {
        if (typeof THREE === 'undefined') {
            console.error('Chrome Spheres: Three.js not loaded!');
            return;
        }
        
        try {
            this.setupThreeJS();
            this.createLighting();
            this.createSpheres();
            this.setupEnvironmentMapping();
        } catch (error) {
            console.error('Chrome Spheres: Initialization failed:', error);
        }
    }
    
    setupThreeJS() {
        // Create renderer (let Three.js create its own canvas)
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Replace canvas
        const threeCanvas = this.renderer.domElement;
        threeCanvas.id = this.canvasId;
        threeCanvas.className = this.canvas.className;
        threeCanvas.style.cssText = this.canvas.style.cssText;
        
        if (this.canvas.parentNode) {
            this.canvas.parentNode.replaceChild(threeCanvas, this.canvas);
        }
        
        this.canvas = threeCanvas;
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.canvas.width / this.canvas.height,
            0.1,
            1000
        );
        this.updateCamera();
    }
    
    createLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Directional lights for better reflections
        const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
        light1.position.set(5, 5, 5);
        this.scene.add(light1);
        
        const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
        light2.position.set(-5, -5, -5);
        this.scene.add(light2);
    }
    
    createSpheres() {
        this.spheres = [];
        
        for (let i = 0; i < this.sphereCount; i++) {
            const sphere = this.createSphere(i);
            this.spheres.push(sphere);
            this.scene.add(sphere.mesh);
        }
    }
    
    createSphere(index) {
        // Random size within range
        const size = this.minSphereSize + Math.random() * (this.maxSphereSize - this.minSphereSize);
        
        // Random position within spread radius
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.spreadRadius;
        const height = (Math.random() - 0.5) * 10;
        
        // Create geometry
        const geometry = new THREE.SphereGeometry(size, 64, 64);
        
        // Create material with environment mapping
        const material = new THREE.MeshStandardMaterial({
            metalness: this.metalness,
            roughness: this.roughness,
            envMapIntensity: 1.0
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        
        // Store sphere data
        return {
            mesh,
            baseSize: size,
            basePosition: mesh.position.clone(),
            floatOffset: Math.random() * Math.PI * 2,
            floatSpeed: 0.5 + Math.random() * 1.0,
            rotationSpeed: (Math.random() - 0.5) * 0.5
        };
    }
    
    setupEnvironmentMapping() {
        this.updateEnvironmentMap();
    }
    
    updateEnvironmentMap() {
        let sourceElement = null;
        
        if (this.envMapSource === 'video') {
            // Get video element from Freque
            sourceElement = document.querySelector('#videoInput') || 
                           document.querySelector('video');
        } else {
            // Get background image from Freque
            const bgImageContainer = document.querySelector('#backgroundImageContainer');
            if (bgImageContainer) {
                sourceElement = bgImageContainer.querySelector('img');
            }
        }
        
        if (!sourceElement) {
            console.warn(`Chrome Spheres: ${this.envMapSource} source not found`);
            return;
        }
        
        // Create or update texture
        let texture;
        
        if (this.envMapSource === 'video') {
            if (!this.videoTexture) {
                this.videoTexture = new THREE.VideoTexture(sourceElement);
                this.videoTexture.minFilter = THREE.LinearFilter;
                this.videoTexture.magFilter = THREE.LinearFilter;
                this.videoTexture.mapping = THREE.EquirectangularReflectionMapping;
            }
            texture = this.videoTexture;
        } else {
            if (!this.bgImageTexture || this.updateEnvMapNeeded) {
                this.bgImageTexture = new THREE.Texture(sourceElement);
                this.bgImageTexture.needsUpdate = true;
                this.bgImageTexture.mapping = THREE.EquirectangularReflectionMapping;
            }
            texture = this.bgImageTexture;
        }
        
        // Apply to all spheres
        this.spheres.forEach(sphere => {
            sphere.mesh.material.envMap = texture;
            sphere.mesh.material.needsUpdate = true;
        });
        
        this.envMapTexture = texture;
        this.updateEnvMapNeeded = false;
    }
    
    recreateSpheres() {
        // Remove old spheres
        this.spheres.forEach(sphere => {
            this.scene.remove(sphere.mesh);
            sphere.mesh.geometry.dispose();
            sphere.mesh.material.dispose();
        });
        
        // Create new spheres
        this.createSpheres();
        
        // Reapply environment map
        if (this.envMapTexture) {
            this.spheres.forEach(sphere => {
                sphere.mesh.material.envMap = this.envMapTexture;
                sphere.mesh.material.needsUpdate = true;
            });
        }
    }
    
    updateSphereSizes() {
        this.spheres.forEach((sphere, index) => {
            const newSize = this.minSphereSize + Math.random() * (this.maxSphereSize - this.minSphereSize);
            sphere.baseSize = newSize;
            sphere.mesh.scale.set(1, 1, 1);
        });
    }
    
    updateSphereMaterials() {
        this.spheres.forEach(sphere => {
            sphere.mesh.material.metalness = this.metalness;
            sphere.mesh.material.roughness = this.roughness;
            sphere.mesh.material.needsUpdate = true;
        });
    }
    
    updateCamera() {
        if (!this.camera) return;
        
        this.camera.position.z = this.cameraDistance;
        this.camera.position.y = this.cameraDistance * 0.2;
        this.camera.lookAt(0, 0, 0);
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive) return;
        
        // Update time
        this.time += deltaTime * 0.001 * this.floatSpeed;
        
        // Get audio data
        this.currentEnergy = this.getAudioEnergy();
        
        // Smooth energy
        this.energyHistory.push(this.currentEnergy);
        if (this.energyHistory.length > 10) {
            this.energyHistory.shift();
        }
        this.smoothedEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
        
        // Get frequency bands
        this.frequencyBands = this.getFrequencyBands();
        
        // Beat detection
        if (this.beatPulse && this.detectBeat(timestamp)) {
            this.onBeat();
        }
        
        // Update spheres
        this.updateSpheres(deltaTime);
        
        // Camera auto-rotation
        if (this.cameraAutoRotate && this.camera) {
            const rotationAmount = this.cameraRotationSpeed * deltaTime * 0.001;
            const radius = this.cameraDistance;
            const currentAngle = Math.atan2(this.camera.position.x, this.camera.position.z);
            const newAngle = currentAngle + rotationAmount;
            
            this.camera.position.x = Math.sin(newAngle) * radius;
            this.camera.position.z = Math.cos(newAngle) * radius;
            this.camera.lookAt(0, 0, 0);
        }
        
        // Update environment map if source changed
        if (this.updateEnvMapNeeded) {
            this.updateEnvironmentMap();
        }
    }
    
    updateSpheres(deltaTime) {
        const energy = this.audioReactive ? this.smoothedEnergy : 0.5;
        const bass = this.audioReactive && this.bassScale ? this.frequencyBands.bass : 0;
        const mid = this.audioReactive && this.midMovement ? this.frequencyBands.mid : 0;
        const treble = this.audioReactive && this.trebleShine ? this.frequencyBands.treble : 0;
        
        this.spheres.forEach((sphere, index) => {
            // Float animation
            const floatTime = this.time + sphere.floatOffset;
            const floatY = Math.sin(floatTime * sphere.floatSpeed) * 3;
            const floatX = Math.cos(floatTime * sphere.floatSpeed * 0.7) * 2;
            
            // Apply position with mid frequency movement boost
            const movementBoost = 1 + mid * 2;
            sphere.mesh.position.x = sphere.basePosition.x + floatX * movementBoost;
            sphere.mesh.position.y = sphere.basePosition.y + floatY * movementBoost;
            sphere.mesh.position.z = sphere.basePosition.z + Math.sin(floatTime * 0.5) * 1.5 * movementBoost;
            
            // Scale based on bass
            const baseScale = 1.0;
            const bassScale = this.bassScale ? (1 + bass * 0.3) : 1.0;
            sphere.mesh.scale.set(baseScale * bassScale, baseScale * bassScale, baseScale * bassScale);
            
            // Rotation
            sphere.mesh.rotation.y += sphere.rotationSpeed * deltaTime * 0.001;
            sphere.mesh.rotation.x += sphere.rotationSpeed * 0.5 * deltaTime * 0.001;
            
            // Adjust roughness based on treble
            if (this.trebleShine) {
                const dynamicRoughness = this.roughness * (1 - treble * 0.5);
                sphere.mesh.material.roughness = Math.max(0.01, dynamicRoughness);
            }
        });
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive || !this.renderer || !this.scene || !this.camera) return;
        
        // Update video texture if using video
        if (this.envMapSource === 'video' && this.videoTexture) {
            this.videoTexture.needsUpdate = true;
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize(width, height) {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    getFrequencyBands() {
        const frequencies = this.getAudioFrequencies();
        
        if (!frequencies || frequencies.length === 0) {
            return { bass: 0, mid: 0, treble: 0 };
        }
        
        const length = frequencies.length;
        
        return {
            bass: this.avgRange(frequencies, 0, Math.floor(length * 0.1)),
            mid: this.avgRange(frequencies, Math.floor(length * 0.1), Math.floor(length * 0.5)),
            treble: this.avgRange(frequencies, Math.floor(length * 0.5), length)
        };
    }
    
    avgRange(arr, start, end) {
        if (!arr || arr.length === 0) return 0;
        
        let sum = 0;
        let count = 0;
        
        for (let i = start; i < end && i < arr.length; i++) {
            sum += arr[i] / 255;
            count++;
        }
        
        return count > 0 ? sum / count : 0;
    }
    
    detectBeat(timestamp) {
        const energy = this.currentEnergy;
        const bd = this.beatDetection;
        const avg = this.smoothedEnergy;
        
        const timeSinceBeat = timestamp - bd.lastBeatTime;
        if (energy > avg * bd.threshold && timeSinceBeat > bd.minTimeBetweenBeats) {
            bd.lastBeatTime = timestamp;
            return true;
        }
        
        return false;
    }
    
    onBeat() {
        // Pulse all spheres on beat
        this.spheres.forEach(sphere => {
            const currentScale = sphere.mesh.scale.x;
            sphere.mesh.scale.set(currentScale * 1.2, currentScale * 1.2, currentScale * 1.2);
            
            setTimeout(() => {
                sphere.mesh.scale.set(1, 1, 1);
            }, 100);
        });
    }
    
    onCleanup() {
        // Dispose Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.videoTexture) {
            this.videoTexture.dispose();
        }
        
        if (this.bgImageTexture) {
            this.bgImageTexture.dispose();
        }
        
        this.spheres.forEach(sphere => {
            sphere.mesh.geometry.dispose();
            sphere.mesh.material.dispose();
            this.scene.remove(sphere.mesh);
        });
        
        this.spheres = [];
    }
}

// Make globally available
window.ChromeSpheresPlugin = ChromeSpheresPlugin;

// Auto-register
setTimeout(() => {
    if (!window.visualizer) {
        console.warn('Chrome Spheres: Visualizer not ready');
        return;
    }
    
    if (!window.FrequePluginBase) {
        console.warn('Chrome Spheres: FrequePluginBase not loaded');
        return;
    }
    
    if (typeof THREE === 'undefined') {
        console.error('Chrome Spheres: Three.js is not loaded!');
        console.error('Add: <script src="https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js"></script>');
        return;
    }
    
    const existingPlugin = window.pluginManager?.getPlugin('chromespheres');
    
    if (existingPlugin) {
        console.log('Chrome Spheres plugin already loaded');
        return;
    }
    
    try {
        new ChromeSpheresPlugin(window.visualizer);
        console.log('✨ Chrome Spheres plugin loaded successfully');
    } catch (error) {
        console.error('Failed to load Chrome Spheres plugin:', error);
    }
}, 500);
