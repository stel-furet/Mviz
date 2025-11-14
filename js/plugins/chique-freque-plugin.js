/**
 * Chique - Animated Character Visualizer
 * Audio-reactive skeletal animation for GLB/GLTF characters
 * 
 * Version: 1.1.0
 * Author: Steve
 * Updated: 2025-11-14 - Added procedural Dance Mode with slow groove animation
 */

console.log('🚨🚨🚨 CHIQUE PLUGIN v1.1.0 LOADING - DANCE MODE ADDED 2025-11-14 🚨🚨🚨');
console.log('🚨 If you do NOT see this message, browser is loading OLD cached version! 🚨');
console.log('💃💃💃 UPPER BODY SWAY, FEET PLANTED - TIMESTAMP:', Date.now(), '💃💃💃');

class ChiquePlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('chique', visualizer, {
            version: '1.0.0',
            author: 'Steve',
            description: 'Audio-reactive animated character visualizer',
            targetFPS: 60
        });
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.character = null;
        this.mixer = null;
        this.bones = {};
        
        // Animation state
        this.currentMode = 'groove';
        this.modeBlend = 0;
        this.headbangPhase = 0;
        this.beatCooldown = 0;
        
        // Character management
        this.availableCharacters = ['spacewoman']; // Hardcoded for now
        this.currentCharacter = 'spacewoman';
        this.characterPath = '/js/plugins/chique_characters/';
        
        // Camera settings
        this.cameraDistance = 0;
        this.cameraAngle = 0;
        this.autoRotate = false;
        this.autoRotateSpeed = 0.2; // Slower rotation (was Math.PI * 2 / 30)
        this.currentPreset = null; // Track active preset for UI state
        
        // Character positioning
        this.characterX = 0;
        this.characterY = 0.4; // Default to half body height up
        
        // Audio settings
        this.audioSensitivity = 1.0; // Default sensitivity multiplier
        
        // Animation parameters
        this.animTime = 0; // For procedural animation timing
        this.grooveSpeed = 1.0;
        this.danceSpeed = 1.5;
        this.moshIntensity = 2.0;
        this.headbangIntensity = 1.0;
        
        // Energy thresholds
        this.grooveThreshold = 0.3;
        this.danceThreshold = 0.6;
        
        // Dance mode
        this.danceMode = true; // Enable dance by default
        this.danceTime = 0; // Track time for dance animation
        this.skeleton = null; // Store skeleton reference
        this.danceBones = {}; // Store bone references for dancing
        
        // Debug
        this.renderFrameCount = 0;
        
        // Initialize
        this.setupControls();
        this.setupPresets();
    }
    
    setupControls() {
        // Character selection
        this.addControl('character', {
            type: 'dropdown',
            label: 'Character',
            options: this.availableCharacters,
            value: this.currentCharacter,
            className: 'dropdown-selector-mixer',
            onChange: (value) => {
                this.currentCharacter = value;
                this.loadCharacter();
            }
        });
        
        // Audio sensitivity
        this.addControl('audioSensitivity', {
            type: 'slider',
            label: 'Audio Sensitivity',
            min: 0.1,
            max: 3.0,
            step: 0.1,
            value: 1.0,
            onChange: (value) => {
                this.audioSensitivity = value;
            }
        });
        
        // Camera distance (adjusted so 0 = character fills ~70% of screen)
        this.addControl('cameraDistance', {
            type: 'slider',
            label: 'Camera Distance',
            min: -10,
            max: 10,
            step: 0.5,
            value: 0,
            onChange: (value) => {
                this.cameraDistance = value;
                this.updateCameraPosition();
            }
        });
        
        // Character X position
        this.addControl('characterX', {
            type: 'slider',
            label: 'Position X',
            min: -2,
            max: 2,
            step: 0.1,
            value: 0,
            onChange: (value) => {
                this.characterX = value;
                if (this.character) {
                    this.character.position.x = value;
                }
            }
        });
        
        // Character Y position
        this.addControl('characterY', {
            type: 'slider',
            label: 'Position Y',
            min: -1,
            max: 1,
            step: 0.1,
            value: 0.4, // Default to centered (half body height)
            onChange: (value) => {
                this.characterY = value;
                if (this.character) {
                    this.character.position.y = value;
                }
                // Don't update camera - let character move independently
            }
        });
        
        // Dance Mode toggle
        this.addControl('danceMode', {
            type: 'dropdown',
            label: 'Dance Mode',
            options: [
                { value: 'off', label: 'Off' },
                { value: 'on', label: 'On' }
            ],
            value: 'on',
            className: 'dropdown-selector-mixer',
            onChange: (value) => {
                this.danceMode = (value === 'on');
                // Clear base rotations when mode changes so they can be recaptured
                this.baseRotations = null;
                console.log('💃 Dance mode:', this.danceMode ? 'ON' : 'OFF');
            }
        });
        
        // Auto-rotate toggle
        this.addControl('autoRotate', {
            type: 'dropdown',
            label: 'Auto Rotate',
            options: [
                { value: 'off', label: 'Off' },
                { value: 'on', label: 'On' }
            ],
            value: 'off',
            className: 'dropdown-selector-mixer',
            onChange: (value) => {
                this.autoRotate = (value === 'on');
            }
        });
    }
    
    setupPresets() {
        this.addPreset('chillVibes', {
            name: 'Chill Vibes',
            values: {
                cameraDistance: -2,
                autoRotate: 'off'
            },
            customData: {
                grooveThreshold: 0.4,
                danceThreshold: 0.7
            }
        });
        
        this.addPreset('partyMode', {
            name: 'Party Mode',
            values: {
                cameraDistance: 0,
                autoRotate: 'on'
            },
            customData: {
                grooveThreshold: 0.3,
                danceThreshold: 0.6
            }
        });
        
        this.addPreset('metalMadness', {
            name: 'Metal Madness',
            values: {
                cameraDistance: 3,
                autoRotate: 'on'
            },
            customData: {
                grooveThreshold: 0.2,
                danceThreshold: 0.5,
                headbangIntensity: 1.5
            }
        });
        
        this.addPreset('beatSync', {
            name: 'Beat Sync',
            values: {
                cameraDistance: -3,
                autoRotate: 'off'
            },
            customData: {
                headbangIntensity: 2.0
            }
        });
    }
    
    /**
     * Override applyPreset to track active preset and update UI
     */
    applyPreset(presetId) {
        // console.log('Chique: applyPreset called with:', presetId);
        
        // Call parent implementation
        super.applyPreset(presetId);
        
        // Update active preset tracking
        this.currentPreset = presetId;
        
        // Update button states
        this.updatePresetButtonStates();
        
        // Apply any custom preset data
        const preset = this.presets.get(presetId);
        if (preset && preset.customData) {
            Object.assign(this, preset.customData);
        }
        
        // console.log('Chique: Applied preset:', presetId, 'customData:', preset?.customData);
        // console.log('Chique: Current state - autoRotate:', this.autoRotate, 'headbangIntensity:', this.headbangIntensity);
    }
    
    /**
     * Update preset button visual states
     */
    updatePresetButtonStates() {
        // Find all preset buttons for this plugin
        const presetButtons = document.querySelectorAll(`[data-plugin="${this.pluginName}"] .btn-preset`);
        
        // console.log('Chique: Updating button states, found', presetButtons.length, 'buttons, active preset:', this.currentPreset);
        
        presetButtons.forEach(button => {
            const buttonPresetId = button.getAttribute('data-control');
            if (buttonPresetId === this.currentPreset) {
                button.classList.add('active');
                // console.log('Chique: Set active:', buttonPresetId);
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    onInitialize() {
        console.log('🎵 Chique Plugin Initialized');
        // console.log('Chique: Plugin name:', this.pluginName);
        // console.log('Chique: Presets:', Array.from(this.presets.keys()));
        
        this.setupThreeJS();
        this.loadCharacter();
        
        // Debug: Check if preset buttons exist after a short delay
        setTimeout(() => {
            const buttons = document.querySelectorAll(`[data-plugin="${this.pluginName}"] .btn-preset`);
            // console.log('Chique: Found preset buttons:', buttons.length);
            // buttons.forEach(btn => {
            //     console.log('  - Button:', btn.textContent, 'data-control:', btn.getAttribute('data-control'));
            // });
        }, 1000);
    }
    
    setupThreeJS() {
        // Ensure canvas is visible and properly layered
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        // Show canvas if plugin is active
        if (this.isActive) {
            this.canvas.style.display = 'block';
        }
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent
        
        // Camera - will be positioned after character loads
        this.camera = new THREE.PerspectiveCamera(
            50,
            this.canvas.width / this.canvas.height,
            0.1,
            100000  // Increased far plane for large characters
        );
        this.camera.position.set(0, 1, 10); // Temporary position
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            premultipliedAlpha: false
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        this.scene.add(directionalLight);
        
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 0, -5);
        this.scene.add(fillLight);
        
        // console.log('Chique: Three.js setup complete');
    }
    
    loadCharacter() {
        // Remove existing character
        if (this.character) {
            this.scene.remove(this.character);
            this.character = null;
            this.bones = {};
        }
        
        // Load GLB with correct path
        const loader = new THREE.GLTFLoader();
        const modelPath = `/js/plugins/chique_characters/${this.currentCharacter}.glb`;
        
        console.log('🎨 Chique: Loading character...');
        
        loader.load(
            modelPath,
            (gltf) => {
                this.character = gltf.scene;
                
                // console.log('Chique: GLTF loaded, inspecting contents...');
                // console.log('Chique: Scene:', gltf.scene);
                // console.log('Chique: Animations:', gltf.animations.length);
                
                // Log animation names
                if (gltf.animations && gltf.animations.length > 0) {
                    // console.log('Chique: Available animations:', gltf.animations.map(a => a.name));
                    // Store animations for later use
                    this.availableAnimations = gltf.animations;
                    
                    // Check if Walk/Run animations move the character root
                    gltf.animations.forEach(anim => {
                        if (anim.name === 'Walk' || anim.name === 'Run') {
                            const rootTracks = anim.tracks.filter(t => 
                                t.name.includes('Spacewoman__0001.position') || 
                                t.name.includes('Scene.position')
                            );
                            if (rootTracks.length > 0) {
                                console.warn(`⚠️ ${anim.name} animation moves character root! Removing position tracks.`);
                                // Remove root position tracks to make character walk in place
                                anim.tracks = anim.tracks.filter(t => 
                                    !t.name.includes('Spacewoman__0001.position') && 
                                    !t.name.includes('Scene.position')
                                );
                            }
                        }
                    });
                }
                
                // Inspect all meshes (DISABLED)
                // let meshCount = 0;
                // let materialCount = 0;
                // this.character.traverse((node) => {
                //     if (node.isMesh) {
                //         meshCount++;
                //         materialCount++;
                //     }
                // });
                
                // console.log(`Chique: Found ${meshCount} meshes, ${materialCount} materials`);
                
                // DON'T center/reposition - just add to scene as-is
                // console.log('Chique: Character root transform:', {
                //     position: this.character.position.toArray(),
                //     rotation: this.character.rotation.toArray(),
                //     quaternion: this.character.quaternion.toArray(),
                //     scale: this.character.scale.toArray(),
                //     matrixAutoUpdate: this.character.matrixAutoUpdate
                // });
                
                // console.log('Chique: Skipping centerCharacter() - using original position');
                
                // Store approximate character height for camera (assume standard humanoid ~1.7 units)
                this.characterHeight = 0.8; // Approximate from previous logs
                
                // DON'T remove IK targets - they're part of the animation system
                // console.log('Chique: Leaving IK targets in place - they are animated by the GLB');
                
                // Setup animation mixer
                if (this.mixer) {
                    console.warn('⚠️ Chique: Mixer already exists! Disposing old one.');
                    this.mixer.stopAllAction();
                }
                this.mixer = new THREE.AnimationMixer(this.character);
                
                // Add to scene
                this.scene.add(this.character);
                
                // Set initial character position
                this.character.position.x = this.characterX;
                this.character.position.y = this.characterY;
                
                // DON'T play any baked animations by default
                // Store the Idle animation for later use (button control)
                if (this.availableAnimations && this.availableAnimations.length > 0) {
                    const idleAnim = this.availableAnimations.find(a => a.name === 'Idle');
                    if (idleAnim) {
                        this.currentAction = this.mixer.clipAction(idleAnim);
                        // Start playing Idle immediately with loop enabled
                        this.currentAction.reset()
                            .setLoop(THREE.LoopRepeat, Infinity)
                            .setEffectiveTimeScale(1.0)
                            .setEffectiveWeight(1.0)
                            .play();
                        console.log('✨ Chique: Character loaded and Idle animation started');
                    } else {
                        console.warn('Chique: No Idle animation found!');
                    }
                }
                
                // console.log('Chique: Character ready - will use audio-reactive animation');
                
                // Find and store bone references for audio-reactive animation
                this.extractBones();
                
                // NOW position camera with correct character height
                this.updateCameraPosition();
                
                // console.log('Chique: Loaded character', this.currentCharacter);
                // console.log('Chique: Character in scene, children:', this.scene.children.length);
                // console.log('Chique: Scene children:', this.scene.children.map(c => c.type));
            },
            (progress) => {
                // Loading progress
            },
            (error) => {
                console.error('Chique: Error loading character', error);
            }
        );
    }
    
    centerCharacter() {
        if (!this.character) return;
        
        // Calculate bounding box BEFORE any transforms
        const box = new THREE.Box3().setFromObject(this.character);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('Chique: Character bounds (original):', {
            center: center,
            size: size,
            min: box.min,
            max: box.max
        });
        
        // Don't scale the character directly - this can break skeletons!
        // Instead, just center it and use camera distance to control viewing size
        this.character.position.x = -center.x;
        this.character.position.y = -box.min.y; // Ground level
        this.character.position.z = -center.z;
        
        // Store the ORIGINAL character height for camera calculations
        this.characterHeight = size.y;
        
        console.log('Chique: Character positioned at', this.character.position);
        console.log('Chique: Original character height:', this.characterHeight);
        console.log('Chique: NO SCALING APPLIED - character at original size');
    }
    
    extractBones() {
        if (!this.character) return;
        
        this.bones = {};
        let allBones = [];
        let skeleton = null;
        
        // Find the skeleton from SkinnedMesh
        this.character.traverse((node) => {
            if (node.isSkinnedMesh && node.skeleton) {
                skeleton = node.skeleton;
                allBones = node.skeleton.bones;
                this.skeleton = skeleton; // Store skeleton reference for updates
                // console.log('Chique: Found skeleton with', allBones.length, 'bones');
            }
        });
        
        if (!skeleton || allBones.length === 0) {
            console.warn('Chique: No skeleton found!');
            return;
        }
        
        // console.log('Chique: All bone names:', allBones.map(b => b.name));
        
        // INSPECT HIERARCHY - log parent-child relationships (DISABLED)
        // console.log('Chique: Bone hierarchy:');
        // allBones.forEach((bone, index) => {
        //     const parentName = bone.parent ? bone.parent.name : 'ROOT';
        //     const childrenNames = bone.children.map(c => c.name).join(', ');
        //     console.log(`  [${index}] ${bone.name} -> parent: ${parentName}, children: [${childrenNames}]`);
        // });
        
        // Find root bone (bone with no parent that is also a bone, or first bone in hierarchy)
        const rootBone = allBones.find(bone => {
            const parent = bone.parent;
            return !parent || !allBones.includes(parent);
        }) || allBones[0];
        
        // console.log('Chique: Root bone identified:', rootBone.name);
        
        // For this specific GLB structure:
        // B|B1 = Hips/Root
        // B|B2 = Torso (hub with multiple children)
        //   - B|B3 -> B|B4 = Spine chain to head
        //   - B|B5 -> B|B6 -> B|B7 = Right arm
        //   - B|B8 -> B|B9 -> B|B10 = Left arm
        //   - B|B11, B|B14 = Legs
        
        this.bones.hips = allBones[0]; // B|B1
        
        // Torso/Chest is B|B2 (first child of hips)
        const torso = allBones[1]; // B|B2
        
        // Spine chain: B|B2 (torso), B|B3 (mid), B|B4 (upper/neck)
        this.bones.spine = [
            allBones[1], // B|B2 - Lower spine/torso
            allBones[2], // B|B3 - Mid spine
        ];
        this.bones.neck = allBones[3]; // B|B4 - Upper spine/neck area
        this.bones.head = allBones[3]; // B|B4 - Also use as head (head meshes are attached here)
        
        // Arms: These are children of B|B2 (torso)
        // B|B5 -> B|B6 -> B|B7 = Right arm chain
        // B|B8 -> B|B9 -> B|B10 = Left arm chain
        this.bones.rightArm = allBones[4]; // B|B5 - Right shoulder
        this.bones.rightForearm = allBones[5]; // B|B6 - Right upper arm
        this.bones.rightHand = allBones[6]; // B|B7 - Right forearm/hand
        
        this.bones.leftArm = allBones[7]; // B|B8 - Left shoulder
        this.bones.leftForearm = allBones[8]; // B|B9 - Left upper arm
        this.bones.leftHand = allBones[9]; // B|B10 - Left forearm/hand
        
        // Legs (optional, for future use)
        this.bones.rightLeg = allBones[10]; // B|B11
        this.bones.leftLeg = allBones[13]; // B|B14
        
        // console.log('Chique: Mapped bones by hierarchy:', {
        //     hips: this.bones.hips?.name,
        //     spine: this.bones.spine?.map(b => b.name),
        //     neck: this.bones.neck?.name,
        //     head: this.bones.head?.name,
        //     rightArm: this.bones.rightArm?.name,
        //     leftArm: this.bones.leftArm?.name
        // });
        
        // DON'T reset bone pose - let it stay in its original bind pose from the GLB!
        // console.log('Chique: Leaving bones in original bind pose');
    }
    
    updateCameraPosition() {
        if (!this.camera) return;
        
        // Calculate camera distance so that at slider=0, character fills ~70% of screen
        const characterHeight = this.characterHeight || 1;
        
        // Camera FOV is 75 degrees
        const fovRadians = (75 * Math.PI) / 180;
        
        // Calculate distance for 70% screen fill at slider = 0
        // distance = (height / screenFill) / (2 * tan(fov/2))
        const targetScreenFill = 0.7;
        const baseDistance = (characterHeight / targetScreenFill) / (2 * Math.tan(fovRadians / 2));
        
        // Apply slider adjustment: each step = ~10% size change
        const distanceMultiplier = 1 + (this.cameraDistance * 0.1);
        const distance = baseDistance * distanceMultiplier;
        
        // Camera height is fixed at character center height (0.4, half body height)
        const cameraHeight = characterHeight * 0.5;
        
        // Position camera in circular orbit around character
        const angle = this.cameraAngle;
        this.camera.position.x = this.characterX + (Math.sin(angle) * distance);
        this.camera.position.y = cameraHeight; // Fixed height, doesn't follow character Y
        this.camera.position.z = Math.cos(angle) * distance;
        
        // Look at fixed point in space where character center would be
        this.camera.lookAt(this.characterX, cameraHeight, 0);
        
        // console.log('Chique: Camera positioned at', this.camera.position);
        // console.log('Chique: Camera distance from character:', distance, 'units');
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        if (!this.character || !this.mixer) return;
        
        // Prevent double-updates in same frame
        if (this.lastUpdateTimestamp === timestamp) {
            console.warn('⚠️ Double update detected in same frame!');
            return;
        }
        this.lastUpdateTimestamp = timestamp;
        
        // Debug animation state every 60 frames (DISABLED - enable for debugging)
        // if (!this.debugFrameCount) this.debugFrameCount = 0;
        // this.debugFrameCount++;
        // if (this.debugFrameCount % 60 === 0 && this.currentAction) {
        //     console.log('🎭 Animation State:', {
        //         clip: this.currentAction.getClip().name,
        //         time: this.currentAction.time.toFixed(3),
        //         duration: this.currentAction.getClip().duration.toFixed(3),
        //         timeScale: this.currentAction.getEffectiveTimeScale().toFixed(3),
        //         weight: this.currentAction.getEffectiveWeight().toFixed(3),
        //         paused: this.currentAction.paused,
        //         enabled: this.currentAction.enabled,
        //         loop: this.currentAction.loop,
        //         deltaTime: deltaTime.toFixed(4)
        //     });
        // }
        
        // CRITICAL FIX: Clamp deltaTime to prevent animation jumps
        // Large deltaTime values (from tab switching, etc.) cause animation to skip frames
        // Also ensure minimum deltaTime to prevent division by zero
        const clampedDelta = Math.max(0.001, Math.min(deltaTime, 0.05)); // 1ms to 50ms (20-1000 fps)
        
        // Always update the mixer (needed for animation playback)
        this.mixer.update(clampedDelta);
        
        // Audio-reactive animation using pre-built animation clips
        // NOTE: sharedAudioData uses 'dataArray' not 'frequencyData'
        if (sharedAudioData && sharedAudioData.dataArray) {
            const bassEnergy = this.getEnergyInRange(sharedAudioData.dataArray, 0, 150);
            const midEnergy = this.getEnergyInRange(sharedAudioData.dataArray, 150, 500);
            const highEnergy = this.getEnergyInRange(sharedAudioData.dataArray, 500, 2000);
            
            // Normalize energies (0-1 range)
            const bassNorm = bassEnergy / 255;
            const midNorm = midEnergy / 255;
            const highNorm = highEnergy / 255;
            
            // Calculate overall energy and apply sensitivity multiplier
            const totalEnergy = ((bassNorm + midNorm + highNorm) / 3) * this.audioSensitivity;
            
            // DANCE MODE: Apply procedural dance animation when enabled
            // Dance triggers at medium energy levels (between Idle and Walk)
            const DANCE_MIN_ENERGY = 0.05;
            const DANCE_MAX_ENERGY = 0.25;
            
            if (this.danceMode && totalEnergy >= DANCE_MIN_ENERGY) {
                // DANCE MODE IS ON - ONLY dance, regardless of energy level
                // Apply procedural dance animation to bones
                this.applyDanceAnimation(clampedDelta, bassNorm, midNorm, highNorm);
                
                // Keep Idle animation playing in background (for natural base pose)
                const currentAnimName = this.currentAction?.getClip().name;
                if (currentAnimName !== 'Idle') {
                    const idleAnim = this.availableAnimations.find(a => a.name === 'Idle');
                    if (idleAnim) {
                        const idleAction = this.mixer.clipAction(idleAnim);
                        
                        if (this.currentAction) {
                            this.currentAction.fadeOut(0.5);
                        }
                        
                        idleAction
                            .reset()
                            .setLoop(THREE.LoopRepeat, Infinity)
                            .setEffectiveTimeScale(1.0)
                            .setEffectiveWeight(1.0)
                            .fadeIn(0.5)
                            .play();
                        
                        idleAction.enabled = true;
                        idleAction.paused = false;
                        
                        this.currentAction = idleAction;
                        console.log('💃 Dance mode activated - grooving to the beat!');
                    }
                }
            } else if (!this.danceMode && totalEnergy > DANCE_MIN_ENERGY) {
                // Dance mode is OFF - use Walk/Run animations based on energy
                this.updateAnimationBasedOnEnergy(totalEnergy, bassNorm, midNorm, highNorm);
            } else {
                // Audio stopped or very low - return to Idle
                const currentAnimName = this.currentAction?.getClip().name;
                if (currentAnimName !== 'Idle') {
                    const idleAnim = this.availableAnimations.find(a => a.name === 'Idle');
                    if (idleAnim) {
                        const idleAction = this.mixer.clipAction(idleAnim);
                        
                        if (this.currentAction) {
                            this.currentAction.fadeOut(0.5);
                        }
                        
                        idleAction
                            .reset()
                            .setLoop(THREE.LoopRepeat, Infinity)
                            .setEffectiveTimeScale(1.0)
                            .setEffectiveWeight(1.0)
                            .fadeIn(0.5)
                            .play();
                        
                        idleAction.enabled = true;
                        idleAction.paused = false;
                        
                        this.currentAction = idleAction;
                        console.log('🎵 Audio stopped - returning to Idle');
                    }
                }
            }
        }
        
        // Auto-rotate camera in party mode
        if (this.autoRotate) {
            this.cameraAngle += this.autoRotateSpeed * deltaTime;
            this.updateCameraPosition();
        }
    }
    
    /**
     * Update which animation plays based on audio energy
     */
    updateAnimationBasedOnEnergy(totalEnergy, bass, mid, high) {
        if (!this.availableAnimations || this.availableAnimations.length === 0) return;
        
        // Energy thresholds with hysteresis to prevent oscillation
        const IDLE_THRESHOLD = 0.08;  // Must exceed this to start walking
        const WALK_THRESHOLD = 0.20;  // Transition to faster walk
        const RUN_THRESHOLD = 0.40;   // High energy running
        
        // Hysteresis buffer - only switch back down if energy drops significantly
        const HYSTERESIS = 0.03;
        
        // COOLDOWN: Prevent rapid animation switching (minimum 1 second between switches)
        const SWITCH_COOLDOWN = 1000; // milliseconds
        const now = Date.now();
        if (this.lastAnimSwitch && (now - this.lastAnimSwitch) < SWITCH_COOLDOWN) {
            // Still in cooldown, just update speed of current animation
            if (this.currentAction) {
                const currentAnimName = this.currentAction.getClip().name;
                let targetSpeed = 1.0;
                
                if (currentAnimName === 'Walk') {
                    if (totalEnergy < WALK_THRESHOLD) {
                        targetSpeed = 0.8 + (totalEnergy / WALK_THRESHOLD) * 0.4;
                    } else {
                        targetSpeed = 1.2 + ((totalEnergy - WALK_THRESHOLD) / (RUN_THRESHOLD - WALK_THRESHOLD)) * 0.4;
                    }
                } else if (currentAnimName === 'Run') {
                    targetSpeed = 1.0 + (bass * 0.5);
                }
                
                // Smoothly update speed
                const currentSpeed = this.currentAction.getEffectiveTimeScale();
                const smoothSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.1;
                this.currentAction.setEffectiveTimeScale(smoothSpeed);
            }
            return; // Skip animation switching
        }
        
        let targetAnimName = 'Idle';
        let targetSpeed = 1.0;
        
        // Get current state to apply hysteresis
        const currentAnimName = this.currentAction?.getClip().name;
        
        // Choose animation based on energy with hysteresis
        if (totalEnergy < IDLE_THRESHOLD - (currentAnimName === 'Walk' ? HYSTERESIS : 0)) {
            targetAnimName = 'Idle';
            targetSpeed = 1.0;
        } else if (totalEnergy < WALK_THRESHOLD - (currentAnimName === 'Walk' && totalEnergy > WALK_THRESHOLD ? HYSTERESIS : 0)) {
            targetAnimName = 'Walk';
            // Speed scales from 0.8x to 1.2x based on energy
            targetSpeed = 0.8 + (totalEnergy / WALK_THRESHOLD) * 0.4;
        } else if (totalEnergy < RUN_THRESHOLD - (currentAnimName === 'Run' ? HYSTERESIS : 0)) {
            targetAnimName = 'Walk';
            // Speed scales from 1.2x to 1.6x for higher energy
            targetSpeed = 1.2 + ((totalEnergy - WALK_THRESHOLD) / (RUN_THRESHOLD - WALK_THRESHOLD)) * 0.4;
        } else {
            targetAnimName = 'Run';
            // Speed scales from 1.0x to 1.5x based on bass energy
            targetSpeed = 1.0 + (bass * 0.5);
        }
        
        // Find the animation clip
        const targetAnim = this.availableAnimations.find(a => a.name === targetAnimName);
        if (!targetAnim) {
            console.warn('Chique: Animation not found:', targetAnimName);
            return;
        }
        
        // Switch animation if different from current
        if (currentAnimName !== targetAnimName) {
            const newAction = this.mixer.clipAction(targetAnim);
            
            if (this.currentAction) {
                // Smooth transition between animations
                this.currentAction.fadeOut(0.5);
            }
            
            // Always reset and configure the animation fresh
            // This ensures it starts correctly and loops properly
            newAction
                .reset()
                .setLoop(THREE.LoopRepeat, Infinity)
                .setEffectiveTimeScale(targetSpeed)
                .setEffectiveWeight(1.0)
                .fadeIn(0.5)
                .play();
            
            // Ensure action is enabled (sometimes actions get disabled)
            newAction.enabled = true;
            newAction.paused = false;
            
            this.currentAction = newAction;
            this.lastAnimSwitch = now; // Record switch time
            
            console.log(`Chique: Switching to ${targetAnimName} at ${targetSpeed.toFixed(2)}x speed (energy: ${totalEnergy.toFixed(3)})`);
        } else if (this.currentAction) {
            // Check if current animation stopped playing (shouldn't happen but let's catch it)
            if (!this.currentAction.isRunning() || this.currentAction.paused) {
                console.warn('⚠️ Animation stopped unexpectedly! Restarting...');
                this.currentAction.enabled = true;
                this.currentAction.paused = false;
                this.currentAction.play();
            }
            
            // Update speed of current animation smoothly
            const currentSpeed = this.currentAction.getEffectiveTimeScale();
            const smoothSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.1;
            this.currentAction.setEffectiveTimeScale(smoothSpeed);
        }
    }
    
    /**
     * Get energy in a specific frequency range
     */
    getEnergyInRange(frequencyData, startFreq, endFreq) {
        const nyquist = 22050; // Assuming 44100 sample rate
        const binCount = frequencyData.length;
        
        const startBin = Math.floor(startFreq / nyquist * binCount);
        const endBin = Math.floor(endFreq / nyquist * binCount);
        
        let sum = 0;
        for (let i = startBin; i < endBin && i < frequencyData.length; i++) {
            sum += frequencyData[i];
        }
        
        return sum / (endBin - startBin);
    }
    
    /**
     * Apply procedural dance animation to character bones
     * Creates a slow groove with hip sway, shoulder movement, and head bob
     */
    applyDanceAnimation(deltaTime, bassEnergy, midEnergy, highEnergy) {
        if (!this.bones || !this.bones.hips || !this.danceMode) return;
        
        // Store base rotations on first dance frame
        if (!this.baseRotations) {
            this.baseRotations = {};
            if (this.bones.hips) {
                this.baseRotations.hips = {
                    x: this.bones.hips.rotation.x,
                    y: this.bones.hips.rotation.y,
                    z: this.bones.hips.rotation.z
                };
            }
            if (this.bones.spine && this.bones.spine.length > 0) {
                this.baseRotations.spine = this.bones.spine.map(bone => ({
                    x: bone.rotation.x,
                    y: bone.rotation.y,
                    z: bone.rotation.z
                }));
            }
            if (this.bones.head) {
                this.baseRotations.head = {
                    x: this.bones.head.rotation.x,
                    y: this.bones.head.rotation.y,
                    z: this.bones.head.rotation.z
                };
            }
            if (this.bones.rightArm) {
                this.baseRotations.rightArm = {
                    x: this.bones.rightArm.rotation.x,
                    y: this.bones.rightArm.rotation.y,
                    z: this.bones.rightArm.rotation.z
                };
            }
            if (this.bones.leftArm) {
                this.baseRotations.leftArm = {
                    x: this.bones.leftArm.rotation.x,
                    y: this.bones.leftArm.rotation.y,
                    z: this.bones.leftArm.rotation.z
                };
            }
            if (this.bones.rightForearm) {
                this.baseRotations.rightForearm = {
                    x: this.bones.rightForearm.rotation.x,
                    y: this.bones.rightForearm.rotation.y,
                    z: this.bones.rightForearm.rotation.z
                };
            }
            if (this.bones.leftForearm) {
                this.baseRotations.leftForearm = {
                    x: this.bones.leftForearm.rotation.x,
                    y: this.bones.leftForearm.rotation.y,
                    z: this.bones.leftForearm.rotation.z
                };
            }
        }
        
        // Update dance time
        this.danceTime += deltaTime;
        
        // Beat detection - use bass energy for rhythm
        const beatIntensity = Math.min(bassEnergy * 2, 1.0); // 0-1 range
        
        // SLOWER rhythm for more relaxed groove
        const grooveSpeed = 0.6; // Slowed from 1.0 to 0.6 (36 BPM instead of 60 BPM)
        const beatPhase = this.danceTime * grooveSpeed * Math.PI * 2;
        
        // Half-time for even smoother movements
        const slowPhase = beatPhase * 0.5;
        
        // Additional longer cycles for variation (avoid repetition)
        const longCycle = this.danceTime * 0.2 * Math.PI * 2; // 30 second cycle (slowed from 18s)
        const mediumCycle = this.danceTime * 0.5 * Math.PI * 2; // 12 second cycle (slowed from 9s)
        const shortCycle = this.danceTime * 0.9 * Math.PI * 2; // 7 second cycle (slowed from 5s)
        
        // Perlin-noise-like variation by combining sine waves
        const variation1 = Math.sin(longCycle) * 0.5 + 0.5; // 0-1 range
        const variation2 = Math.sin(mediumCycle) * 0.5 + 0.5; // 0-1 range
        const variation3 = Math.sin(shortCycle) * 0.5 + 0.5; // 0-1 range
        
        // === HIP SWAY (side to side) ===
        if (this.bones.hips && this.baseRotations.hips) {
            // MINIMAL hip movement to keep feet planted - even less than before
            // Very gentle rotation on Z axis (side-to-side sway)
            const hipSwayAmount = (0.01 + (beatIntensity * 0.005)) * (0.7 + variation1 * 0.6); // Reduced to 0.01
            const hipSway = Math.sin(slowPhase + longCycle * 0.3) * hipSwayAmount;
            this.bones.hips.rotation.z = this.baseRotations.hips.z + hipSway;
            
            // Minimal forward/back rotation on X axis
            const hipRockAmount = (0.005 + (beatIntensity * 0.003)) * (0.8 + variation2 * 0.4); // Minimal
            const hipRock = Math.sin(beatPhase + mediumCycle * 0.2) * hipRockAmount;
            this.bones.hips.rotation.x = this.baseRotations.hips.x + hipRock;
        }
        
        // === SPINE/TORSO (twist) ===
        if (this.bones.spine && this.bones.spine.length > 0 && this.baseRotations.spine) {
            // MUCH MORE spine twist to create the sway effect without moving feet
            const spineTwist = Math.sin(slowPhase + Math.PI) * 0.25 * (1 + beatIntensity * 0.5) * (0.6 + variation1 * 0.8); // Increased from 0.15 to 0.25
            // Add stronger secondary motion on a different cycle
            const spineSecondary = Math.sin(mediumCycle) * 0.08; // Increased from 0.05
            this.bones.spine[0].rotation.y = this.baseRotations.spine[0].y + spineTwist + spineSecondary;
            
            if (this.bones.spine[1]) {
                // Upper spine moves even more for visible sway
                const upperTwist = (spineTwist * 0.9) * (0.7 + variation2 * 0.6); // Increased from 0.7
                this.bones.spine[1].rotation.y = this.baseRotations.spine[1].y + upperTwist;
            }
        }
        
        // === HEAD BOB ===
        if (this.bones.head && this.baseRotations.head) {
            // Head bob with triple-layered movement for natural variation
            const headBobAmount = (0.08 + (beatIntensity * 0.05)) * (0.5 + variation3 * 1.0); // Big variation range
            const headBob = Math.sin(beatPhase) * headBobAmount;
            // Add subtle nod on longer cycle
            const headNod = Math.sin(longCycle * 0.5) * 0.03;
            this.bones.head.rotation.x = this.baseRotations.head.x + headBob + headNod;
            
            // Head sway with combined cycles
            const headSwayAmount = (0.06 + (beatIntensity * 0.03)) * (0.6 + variation1 * 0.8);
            const headSway = Math.sin(slowPhase + shortCycle * 0.3) * headSwayAmount;
            this.bones.head.rotation.z = this.baseRotations.head.z + headSway;
        }
        
        // === SHOULDERS (alternating) ===
        // Right shoulder with variation - sometimes lifts more, sometimes less
        if (this.bones.rightArm && this.baseRotations.rightArm) {
            const rightShoulderLift = Math.sin(beatPhase) * (0.15 + beatIntensity * 0.08) * (0.5 + variation2 * 1.0);
            // Add slower roll on medium cycle
            const rightShoulderRoll = Math.sin(mediumCycle) * 0.05;
            this.bones.rightArm.rotation.z = this.baseRotations.rightArm.z + rightShoulderLift + rightShoulderRoll;
        }
        
        // Left shoulder with different variation timing
        if (this.bones.leftArm && this.baseRotations.leftArm) {
            const leftShoulderLift = Math.sin(beatPhase + Math.PI) * (0.15 + beatIntensity * 0.08) * (0.5 + variation3 * 1.0);
            // Add slower roll offset from right
            const leftShoulderRoll = Math.sin(mediumCycle + Math.PI) * 0.05;
            this.bones.leftArm.rotation.z = this.baseRotations.leftArm.z + leftShoulderLift + leftShoulderRoll;
        }
        
        // === ARMS (dynamic swing) ===
        if (this.bones.rightForearm && this.baseRotations.rightForearm) {
            // Right arm with compound movement
            const rightArmSwing = Math.sin(slowPhase) * (0.2 + beatIntensity * 0.15) * (0.6 + variation1 * 0.8);
            // Add accent on short cycle
            const rightArmAccent = Math.sin(shortCycle) * 0.08;
            this.bones.rightForearm.rotation.x = this.baseRotations.rightForearm.x + rightArmSwing + rightArmAccent;
        }
        
        if (this.bones.leftForearm && this.baseRotations.leftForearm) {
            // Left arm with different timing
            const leftArmSwing = Math.sin(slowPhase + Math.PI) * (0.2 + beatIntensity * 0.15) * (0.6 + variation2 * 0.8);
            // Add accent on short cycle with offset
            const leftArmAccent = Math.sin(shortCycle + Math.PI * 0.7) * 0.08;
            this.bones.leftForearm.rotation.x = this.baseRotations.leftForearm.x + leftArmSwing + leftArmAccent;
        }
        
        // Update skeleton if it exists (needed for skinned mesh updates)
        if (this.skeleton) {
            this.skeleton.update();
        }
    }
    
    /**
     * Animate bones based on audio data
     */
    animateBonesWithAudio(bass, mid, high, deltaTime) {
        if (!this.bones || Object.keys(this.bones).length === 0) {
            console.warn('Chique: No bones found for animation!');
            return;
        }

        // Debug log once to confirm this is being called
        if (!this.boneAnimDebugLogged) {
            console.log('Chique: ✅ Bone animation active! Bones:', Object.keys(this.bones));
            this.boneAnimDebugLogged = true;
        }

        const intensity = this.headbangIntensity || 1.0;
        const time = this.animTime;

        // HIPS: Bounce with bass (up/down bob)
        if (this.bones.hips) {
            const bobAmount = bass * 0.08 * intensity;
            const bobSpeed = 3.0 + (bass * 3.0);
            const yOffset = Math.sin(time * bobSpeed) * bobAmount;
            const idleBob = Math.sin(time * 2.0) * 0.01;
            this.bones.hips.position.y = yOffset + idleBob;
            
            // Debug hip position once per second
            if (!this.lastHipDebug || Date.now() - this.lastHipDebug > 1000) {
                console.log('Chique: Hip Y position:', this.bones.hips.position.y.toFixed(4), 'Bass:', bass.toFixed(3));
                this.lastHipDebug = Date.now();
            }
        }

        // SPINE: Sway side-to-side with mid, lean forward/back with bass
        if (this.bones.spine && Array.isArray(this.bones.spine)) {
            this.bones.spine.forEach((spineBone, index) => {
                if (spineBone) {
                    // Side sway
                    const swayAmount = mid * 0.15 * intensity;
                    const swaySpeed = 1.5 + (high * 2.0);
                    spineBone.rotation.z = Math.sin(time * swaySpeed + index * 0.3) * swayAmount;
                    
                    // Forward/back lean
                    const leanAmount = bass * 0.1 * intensity;
                    spineBone.rotation.x = Math.sin(time * 2.0) * leanAmount;
                }
            });
        }

        // HEAD: Nod with bass beats, turn with mid frequencies
        if (this.bones.head) {
            // Nod (pitch)
            const nodAmount = bass * 0.2 * intensity;
            const nodSpeed = 3.0 + (bass * 2.0);
            this.bones.head.rotation.x = Math.sin(time * nodSpeed) * nodAmount;
            
            // Turn (yaw)
            const turnAmount = mid * 0.15 * intensity;
            const turnSpeed = 1.2 + (mid * 1.5);
            this.bones.head.rotation.y = Math.sin(time * turnSpeed) * turnAmount;
        }

        // ARMS: Wave with high frequencies (left and right alternate)
        if (this.bones.rightArm && this.bones.rightForearm && this.bones.rightHand) {
            const armWaveAmount = high * 0.3 * intensity;
            const armWaveSpeed = 2.0 + (high * 3.0);
            
            this.bones.rightArm.rotation.z = Math.sin(time * armWaveSpeed) * armWaveAmount;
            this.bones.rightForearm.rotation.y = Math.sin(time * armWaveSpeed * 1.5) * (armWaveAmount * 0.5);
            this.bones.rightHand.rotation.z = Math.sin(time * armWaveSpeed * 2.0) * (armWaveAmount * 0.3);
        }

        if (this.bones.leftArm && this.bones.leftForearm && this.bones.leftHand) {
            const armWaveAmount = high * 0.3 * intensity;
            const armWaveSpeed = 2.0 + (high * 3.0);
            
            // Opposite phase for left arm
            this.bones.leftArm.rotation.z = -Math.sin(time * armWaveSpeed + Math.PI) * armWaveAmount;
            this.bones.leftForearm.rotation.y = Math.sin(time * armWaveSpeed * 1.5 + Math.PI) * (armWaveAmount * 0.5);
            this.bones.leftHand.rotation.z = -Math.sin(time * armWaveSpeed * 2.0 + Math.PI) * (armWaveAmount * 0.3);
        }

        // LEGS: Step/walk motion with bass (left and right alternate)
        if (this.bones.rightLeg) {
            const legStepAmount = bass * 0.2 * intensity;
            const legStepSpeed = 2.5 + (bass * 2.0);
            this.bones.rightLeg.rotation.x = Math.sin(time * legStepSpeed) * legStepAmount;
        }

        if (this.bones.leftLeg) {
            const legStepAmount = bass * 0.2 * intensity;
            const legStepSpeed = 2.5 + (bass * 2.0);
            // Opposite phase for left leg
            this.bones.leftLeg.rotation.x = -Math.sin(time * legStepSpeed + Math.PI) * legStepAmount;
        }
        
        // CRITICAL: Update the skeleton matrices after modifying bones
        // Without this, the visual changes won't be reflected
        if (this.skeleton) {
            this.skeleton.update();
        }
    }
    
    updateAnimationMode(energy) {
        let targetMode = 'groove';
        
        if (energy > this.danceThreshold) {
            targetMode = 'mosh';
        } else if (energy > this.grooveThreshold) {
            targetMode = 'dance';
        }
        
        // Smooth transition
        if (targetMode !== this.currentMode) {
            this.currentMode = targetMode;
            this.modeBlend = 0;
        } else {
            this.modeBlend = Math.min(1, this.modeBlend + 0.02); // 0.5s blend
        }
    }
    
    animateGroove(deltaTime, energy) {
        if (!this.bones.spine || !this.bones.hips) {
            console.warn('Chique: Cannot animate groove - missing bones', {
                hasSpine: !!this.bones.spine,
                hasHips: !!this.bones.hips
            });
            return;
        }
        
        const time = performance.now() * 0.001 * this.grooveSpeed;
        const blend = this.modeBlend;
        
        // Debug: Log every 120 frames
        if (Math.floor(time) % 2 === 0 && Math.abs(time - Math.floor(time)) < 0.016) {
            console.log('Chique: Animating groove', {
                time,
                blend,
                energy,
                hipRotation: Math.sin(time) * 0.1 * blend * (1 + energy * 0.5)
            });
        }
        
        // Gentle sway
        if (this.bones.hips) {
            this.bones.hips.rotation.z = Math.sin(time) * 0.1 * blend * (1 + energy * 0.5);
            this.bones.hips.rotation.y = Math.sin(time * 0.7) * 0.05 * blend;
        }
        
        // Spine sway
        if (Array.isArray(this.bones.spine)) {
            this.bones.spine.forEach((bone, i) => {
                const offset = i * 0.2;
                bone.rotation.z = Math.sin(time + offset) * 0.08 * blend * (1 + energy * 0.3);
            });
        }
    }
    
    animateDance(deltaTime, energy) {
        if (!this.bones.hips) return;
        
        const time = performance.now() * 0.001 * this.danceSpeed;
        const blend = this.modeBlend;
        
        // Hip movement
        if (this.bones.hips) {
            this.bones.hips.rotation.z = Math.sin(time * 2) * 0.2 * blend * (1 + energy * 0.5);
            this.bones.hips.rotation.y = Math.sin(time * 1.5) * 0.15 * blend;
            this.bones.hips.position.y = Math.abs(Math.sin(time * 3)) * 0.1 * blend;
        }
        
        // Spine rotation
        if (Array.isArray(this.bones.spine)) {
            this.bones.spine.forEach((bone, i) => {
                const offset = i * 0.3;
                bone.rotation.z = Math.sin(time * 2 + offset) * 0.15 * blend;
                bone.rotation.y = Math.sin(time * 1.8 + offset) * 0.1 * blend;
            });
        }
        
        // Arm movement
        if (this.bones.leftArm) {
            this.bones.leftArm.rotation.z = Math.sin(time * 2.5) * 0.3 * blend;
        }
        if (this.bones.rightArm) {
            this.bones.rightArm.rotation.z = -Math.sin(time * 2.5 + Math.PI) * 0.3 * blend;
        }
    }
    
    animateMosh(deltaTime, energy) {
        if (!this.character) return;
        
        const time = performance.now() * 0.001 * this.moshIntensity;
        const blend = this.modeBlend;
        
        // Aggressive jumping
        if (this.bones.hips) {
            this.bones.hips.position.y = Math.abs(Math.sin(time * 4)) * 0.3 * blend * (1 + energy);
            this.bones.hips.rotation.z = Math.sin(time * 5) * 0.3 * blend;
            this.bones.hips.rotation.x = Math.sin(time * 4.5) * 0.2 * blend;
        }
        
        // Wild spine movement
        if (Array.isArray(this.bones.spine)) {
            this.bones.spine.forEach((bone, i) => {
                const offset = i * 0.5;
                bone.rotation.z = Math.sin(time * 6 + offset) * 0.25 * blend;
                bone.rotation.x = Math.sin(time * 5 + offset) * 0.2 * blend;
                bone.rotation.y = Math.sin(time * 4 + offset) * 0.15 * blend;
            });
        }
        
        // Flailing arms
        if (this.bones.leftArm) {
            this.bones.leftArm.rotation.x = Math.sin(time * 7) * 0.5 * blend;
            this.bones.leftArm.rotation.z = Math.sin(time * 6.5) * 0.4 * blend;
        }
        if (this.bones.rightArm) {
            this.bones.rightArm.rotation.x = Math.sin(time * 7 + Math.PI) * 0.5 * blend;
            this.bones.rightArm.rotation.z = -Math.sin(time * 6.5 + Math.PI) * 0.4 * blend;
        }
    }
    
    triggerHeadbang(beatStrength) {
        this.headbangPhase = beatStrength * this.headbangIntensity;
    }
    
    updateHeadbang(deltaTime) {
        if (!this.bones.head && !this.bones.neck) return;
        
        // Decay headbang
        if (this.headbangPhase > 0) {
            const headbangAmount = this.headbangPhase * 0.4; // Forward tilt
            
            if (this.bones.head) {
                this.bones.head.rotation.x = -headbangAmount;
            }
            if (this.bones.neck) {
                this.bones.neck.rotation.x = -headbangAmount * 0.6;
            }
            
            // Decay
            this.headbangPhase *= 0.85; // Fast decay
            
            if (this.headbangPhase < 0.01) {
                this.headbangPhase = 0;
            }
        }
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.renderer || !this.scene || !this.camera) {
            return;
        }
        
        // CRITICAL: Force canvas to be visible (FrequePluginBase sets display:none)
        if (this.canvas.style.display === 'none') {
            this.canvas.style.display = 'block';
        }
        
        // Set canvas opacity (handle both 0-1 and 0-100 range)
        const opacity = this.opacity > 1 ? this.opacity / 100 : this.opacity;
        this.canvas.style.opacity = opacity;
        
        // Check if character is in scene
        if (!this.character || !this.scene.children.includes(this.character)) {
            // Character not yet loaded
            return;
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
        
        // Debug logging disabled
        // this.renderFrameCount++;
        // if (this.renderFrameCount % 60 === 0) {
        //     console.log('Chique: Rendering frame', this.renderFrameCount, {
        //         characterInScene: !!this.character,
        //         sceneChildren: this.scene.children.length,
        //         cameraPosition: this.camera.position,
        //         characterPosition: this.character.position,
        //         characterScale: this.character.scale.x,
        //         canvasDisplay: this.canvas.style.display
        //     });
        // }
    }
    
    onResize(width, height) {
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        
        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
        
        // Recenter character
        if (this.character) {
            this.centerCharacter();
            this.updateCameraPosition();
        }
    }
    
    applyPreset(preset) {
        super.applyPreset(preset);
        
        // Apply custom data
        if (preset.customData) {
            Object.assign(this, preset.customData);
        }
    }
    
    onCleanup() {
        // Dispose Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        if (this.character) {
            this.scene.remove(this.character);
            this.character = null;
        }
        
        this.scene = null;
        this.camera = null;
        this.mixer = null;
        this.bones = {};
    }
}

// Auto-register
window.ChiquePlugin = ChiquePlugin;
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new ChiquePlugin(window.visualizer);
    }
}, 500);
