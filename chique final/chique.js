/**
 * Chique Plugin - Audio-Reactive Character Animation
 * Version: 1.0.0
 * Author: Steve
 * Description: MOHO character with skeletal animation driven by audio frequencies
 */

class ChiquePlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('chique', visualizer, {
            version: '1.0.0',
            author: 'Steve',
            description: 'Audio-reactive character animation with skeletal rigging',
            targetFPS: 60
        });

        // Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.character = null;
        this.skeleton = null;
        
        // Bone references (will be populated after loading)
        this.bones = {};
        
        // Audio tracking
        this.frequencyBands = {
            subBass: 0,
            bass: 0,
            lowMid: 0,
            mid: 0,
            highMid: 0,
            high: 0
        };
        
        // Smoothed values for natural motion
        this.smoothedBands = {
            subBass: 0,
            bass: 0,
            lowMid: 0,
            mid: 0,
            highMid: 0,
            high: 0
        };
        
        // Beat detection
        this.currentEnergy = 0;
        this.smoothedEnergy = 0;
        this.energyHistory = [];
        this.beatDetection = {
            lastBeatTime: 0,
            threshold: 1.3,
            minTimeBetweenBeats: 200
        };
        
        // Animation state
        this.time = 0;
        this.beatPulseScale = 1.0;
        
        this.setupControls();
        this.setupPresets();
    }

    setupControls() {
        // Master Controls
        this.addControl('intensity', {
            type: 'slider',
            label: 'Overall Intensity',
            min: 0,
            max: 2,
            value: 1.0,
            step: 0.1,
            onChange: (value) => {
                this.intensity = value;
            }
        });

        this.addControl('smoothing', {
            type: 'slider',
            label: 'Motion Smoothing',
            min: 0,
            max: 0.5,
            value: 0.15,
            step: 0.01,
            onChange: (value) => {
                this.smoothing = value;
            }
        });

        // Head Movement
        this.addControl('headBobIntensity', {
            type: 'slider',
            label: 'Head Bob',
            min: 0,
            max: 2,
            value: 1.0,
            step: 0.1,
            onChange: (value) => {
                this.headBobIntensity = value;
            }
        });

        // Body Movement
        this.addControl('bodySwayIntensity', {
            type: 'slider',
            label: 'Body Sway',
            min: 0,
            max: 2,
            value: 0.8,
            step: 0.1,
            onChange: (value) => {
                this.bodySwayIntensity = value;
            }
        });

        // Feather Movement
        this.addControl('featherFlutter', {
            type: 'slider',
            label: 'Feather Flutter',
            min: 0,
            max: 2,
            value: 1.2,
            step: 0.1,
            onChange: (value) => {
                this.featherFlutter = value;
            }
        });

        // Beat Response
        this.addControl('beatPulse', {
            type: 'checkbox',
            label: 'Beat Pulse',
            value: true,
            onChange: (value) => {
                this.beatPulse = value;
            }
        });

        // Camera Controls
        this.addControl('cameraDistance', {
            type: 'slider',
            label: 'Camera Distance',
            min: 5,
            max: 50,
            value: 8,
            step: 1,
            onChange: (value) => {
                this.cameraDistance = value;
                if (this.camera) {
                    this.camera.position.z = value;
                    this.camera.position.y = value * 0.25;
                }
            }
        });

        // Character Scale
        this.addControl('characterScale', {
            type: 'slider',
            label: 'Character Scale',
            min: 0.1,
            max: 10,
            value: 5.0,
            step: 0.1,
            onChange: (value) => {
                this.characterScale = value;
                if (this.character) {
                    this.character.scale.set(value, value, value);
                }
            }
        });
    }

    setupPresets() {
        this.addPreset('default', {
            name: 'Default Groove',
            values: {
                intensity: 1.0,
                smoothing: 0.15,
                headBobIntensity: 1.0,
                bodySwayIntensity: 0.8,
                featherFlutter: 1.2,
                beatPulse: true,
                cameraDistance: 8,
                characterScale: 5.0
            }
        });

        this.addPreset('subtle', {
            name: 'Subtle Movement',
            values: {
                intensity: 0.5,
                smoothing: 0.3,
                headBobIntensity: 0.5,
                bodySwayIntensity: 0.3,
                featherFlutter: 0.6,
                beatPulse: false,
                cameraDistance: 8,
                characterScale: 5.0
            }
        });

        this.addPreset('headbanger', {
            name: 'Headbanger',
            values: {
                intensity: 2.0,
                smoothing: 0.05,
                headBobIntensity: 2.0,
                bodySwayIntensity: 1.5,
                featherFlutter: 2.0,
                beatPulse: true,
                cameraDistance: 6,
                characterScale: 5.0
            }
        });

        this.addPreset('flow', {
            name: 'Smooth Flow',
            values: {
                intensity: 0.8,
                smoothing: 0.25,
                headBobIntensity: 0.6,
                bodySwayIntensity: 1.2,
                featherFlutter: 1.5,
                beatPulse: false,
                cameraDistance: 10,
                characterScale: 5.0
            }
        });
    }

    async onInitialize() {
        console.log('[Chique] Initializing...');

        // Get container dimensions
        const container = document.getElementById('visualizationContainer');
        const rect = container.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight;

        console.log(`[Chique] Container dimensions: ${width}x${height}`);

        // Create Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.1,
            1000
        );
        this.camera.position.z = this.cameraDistance || 8;
        this.camera.position.y = (this.cameraDistance || 8) * 0.25;
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);

        // Set color space
        if (this.renderer.outputEncoding !== undefined) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }

        // Setup canvas
        const threeCanvas = this.renderer.domElement;
        threeCanvas.id = this.canvasId;
        threeCanvas.className = this.canvas.className;

        // Set CSS properties individually
        threeCanvas.style.position = 'absolute';
        threeCanvas.style.top = '0';
        threeCanvas.style.left = '0';
        threeCanvas.style.width = '100%';
        threeCanvas.style.height = '100%';
        threeCanvas.style.pointerEvents = 'none';
        threeCanvas.style.zIndex = this.canvas.style.zIndex || this.zIndex.toString();
        threeCanvas.style.display = this.canvas.style.display || 'block';
        threeCanvas.style.opacity = this.canvas.style.opacity || '1';

        // Replace canvas
        if (this.canvas.parentNode) {
            this.canvas.parentNode.replaceChild(threeCanvas, this.canvas);
        }
        this.canvas = threeCanvas;

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const light1 = new THREE.DirectionalLight(0xffffff, 0.6);
        light1.position.set(10, 10, 10);
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xffffff, 0.4);
        light2.position.set(-10, -5, -10);
        this.scene.add(light2);

        // Load character
        await this.loadCharacter();

        console.log('[Chique] Initialization complete');
    }

    async loadCharacter() {
        return new Promise((resolve, reject) => {
            console.log('[Chique] Loading character...');

            const loader = new THREE.GLTFLoader();
            
            // Try multiple possible paths
            const possiblePaths = [
                './moho_char.gltf',                    // Same directory as plugin
                './plugins/chique/moho_char.gltf',      // From root
                '../chique/moho_char.gltf',             // From plugins dir
                'plugins/chique/moho_char.gltf',        // Without leading dot
                'moho_char.gltf'                        // Relative to current
            ];
            
            const tryLoadPath = (pathIndex = 0) => {
                if (pathIndex >= possiblePaths.length) {
                    console.error('[Chique] Failed to load GLTF from any path:', possiblePaths);
                    reject(new Error('Could not find moho_char.gltf'));
                    return;
                }
                
                const gltfPath = possiblePaths[pathIndex];
                console.log(`[Chique] Trying path: ${gltfPath}`);
                
                loader.load(
                    gltfPath,
                (gltf) => {
                    console.log('[Chique] GLTF loaded successfully');
                    this.character = gltf.scene;
                    
                    // Scale and position character
                    this.character.scale.set(
                        this.characterScale || 5.0,
                        this.characterScale || 5.0,
                        this.characterScale || 5.0
                    );
                    this.character.position.set(0, -5, 0);
                    
                    // Index bones
                    this.indexBones(this.character);
                    
                    // Add to scene
                    this.scene.add(this.character);
                    
                    console.log(`[Chique] Found ${Object.keys(this.bones).length} bones`);
                    resolve();
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total) * 100;
                    console.log(`[Chique] Loading: ${percent.toFixed(0)}%`);
                },
                (error) => {
                    console.warn(`[Chique] Failed to load from ${gltfPath}, trying next path...`);
                    tryLoadPath(pathIndex + 1);
                }
            );
        };
        
        tryLoadPath();
        });
    }

    indexBones(object) {
        // Recursively traverse and index all bones/transforms
        object.traverse((child) => {
            if (child.name && child.name.includes('L|')) {
                // Extract layer name (e.g., "L|cabeza copy__0012" -> "cabeza copy")
                const match = child.name.match(/L\|([^_]+)/);
                if (match) {
                    const boneName = match[1];
                    this.bones[boneName] = child;
                    console.log(`[Chique] Indexed bone: ${boneName}`);
                }
            }
        });
    }

    getFrequencyRange(startIdx, endIdx) {
        const frequencies = this.getAudioFrequencies();
        if (!frequencies || frequencies.length === 0) return 0;

        let sum = 0;
        let count = 0;
        for (let i = startIdx; i < endIdx && i < frequencies.length; i++) {
            sum += frequencies[i] / 255;
            count++;
        }
        return count > 0 ? sum / count : 0;
    }

    updateFrequencyBands() {
        // Extract frequency bands (assumes 256 frequency bins)
        this.frequencyBands.subBass = this.getFrequencyRange(0, 5);      // 20-60Hz
        this.frequencyBands.bass = this.getFrequencyRange(5, 15);         // 60-250Hz
        this.frequencyBands.lowMid = this.getFrequencyRange(15, 25);      // 250-500Hz
        this.frequencyBands.mid = this.getFrequencyRange(25, 60);         // 500-2kHz
        this.frequencyBands.highMid = this.getFrequencyRange(60, 120);    // 2k-6kHz
        this.frequencyBands.high = this.getFrequencyRange(120, 256);      // 6k-20kHz

        // Smooth the bands
        const smoothing = this.smoothing || 0.15;
        for (let band in this.frequencyBands) {
            this.smoothedBands[band] = this.lerp(
                this.smoothedBands[band],
                this.frequencyBands[band],
                1 - smoothing
            );
        }
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    onUpdate(deltaTime, timestamp, sharedAudioData) {
        if (!this.character) return;

        this.time += deltaTime;

        // Update frequency bands
        this.updateFrequencyBands();

        // Beat detection
        this.currentEnergy = this.getAudioEnergy();
        this.energyHistory.push(this.currentEnergy);
        if (this.energyHistory.length > 10) {
            this.energyHistory.shift();
        }
        this.smoothedEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

        const isBeat = this.detectBeat(timestamp);
        if (isBeat && this.beatPulse) {
            this.onBeat();
        }

        // Decay beat pulse
        this.beatPulseScale = this.lerp(this.beatPulseScale, 1.0, 0.1);

        // Animate bones
        this.animateBones();
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
        this.beatPulseScale = 1.15;
    }

    animateBones() {
        const intensity = this.intensity || 1.0;
        const bands = this.smoothedBands;

        // HEAD MOVEMENT
        if (this.bones['cabeza copy']) {
            const headBob = this.headBobIntensity || 1.0;
            this.bones['cabeza copy'].rotation.z = Math.sin(this.time * 2) * bands.mid * 0.3 * intensity * headBob;
            this.bones['cabeza copy'].rotation.y = Math.sin(this.time * 1.5) * bands.mid * 0.2 * intensity * headBob;
        }

        // TORSO MOVEMENT
        if (this.bones['torso']) {
            const bodySway = this.bodySwayIntensity || 0.8;
            this.bones['torso'].rotation.x = bands.bass * 0.2 * intensity * bodySway;
            this.bones['torso'].rotation.z = Math.sin(this.time) * bands.bass * 0.15 * intensity * bodySway;
        }

        // LEGS - Alternating bounce
        if (this.bones['pierna extendida 1']) {
            this.bones['pierna extendida 1'].rotation.x = bands.subBass * 0.4 * intensity;
        }
        if (this.bones['pierna extendida 2']) {
            this.bones['pierna extendida 2'].rotation.x = bands.subBass * 0.4 * intensity * -1;
        }

        // ARMS/HANDS
        if (this.bones['puno']) {
            this.bones['puno'].position.y = bands.mid * 0.5 * intensity;
        }
        if (this.bones['MANO ABAJO']) {
            this.bones['MANO ABAJO'].position.y = bands.mid * 0.3 * intensity;
        }

        // FEATHERS - Individual flutter with phase offset
        const featherIntensity = this.featherFlutter || 1.2;
        const featherNames = [
            'plumas 1 1', 'plumas 1 2', 'plumas 1 3', 'plumas 1 4',
            'plumas 1 5', 'plumas 1 6', 'plumas 1 7', 'plumas 1 8',
            'plumas 2 1', 'plumas 2 2', 'plumas 2 3'
        ];

        featherNames.forEach((name, index) => {
            if (this.bones[name]) {
                const phase = index * 0.3;
                this.bones[name].rotation.z = Math.sin(this.time * 3 + phase) * bands.high * 0.4 * intensity * featherIntensity;
            }
        });

        // CAPE - Flowing motion
        if (this.bones['capa']) {
            this.bones['capa'].rotation.x = Math.sin(this.time * 1.5) * bands.bass * 0.25 * intensity;
        }

        // STAFF/STICK
        if (this.bones['palito']) {
            this.bones['palito'].rotation.z = Math.sin(this.time * 2) * bands.mid * 0.3 * intensity;
        }

        // HAIR - Secondary motion with delay
        if (this.bones['pelo etremedio']) {
            this.bones['pelo etremedio'].rotation.z = Math.sin(this.time * 1.8 + 0.5) * bands.highMid * 0.25 * intensity;
        }

        // Apply beat pulse to whole character
        if (this.character && this.beatPulse) {
            const pulseScale = this.beatPulseScale * (this.characterScale || 1.0);
            this.character.scale.set(pulseScale, pulseScale, pulseScale);
        }
    }

    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        this.renderer.render(this.scene, this.camera);
    }

    onResize(width, height) {
        if (!this.camera || !this.renderer) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    onCleanup() {
        console.log('[Chique] Cleaning up...');

        if (this.character) {
            this.scene.remove(this.character);
        }

        if (this.renderer) {
            this.renderer.dispose();
        }

        this.bones = {};
    }
}

// Auto-register plugin
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        console.log('[Chique] Registering plugin...');
        new ChiquePlugin(window.visualizer);
    } else {
        console.error('[Chique] FrequePluginBase or visualizer not found');
    }
}, 500);
