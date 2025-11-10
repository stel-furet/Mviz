/**
 * ChromoSpheres Plugin - VIDEO TEXTURE FIX
 * Reflective metallic spheres with video/image mapping
 * 
 * @version 1.3.0
 * @author Freque Team
 * 
 * FIXES v1.3.0:
 * - Fixed video reflection mapping using CubeCamera (required for Three.js r120+)
 * - Video textures now work correctly in reflection mode via dynamic cube map
 * - Background images continue to work with direct EquirectangularReflectionMapping
 * 
 * FIXES v1.2.0:
 * - Fixed video texture mapping (was using wrong mapping type)
 * - Changed from EquirectangularReflectionMapping to UVMapping for regular videos
 * - Added option to use video as direct texture OR environment reflection
 * - Ensured video element is playing before creating texture
 * - Added visual feedback mode for debugging
 */

class ChromoSpheresPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('chromospheres', visualizer, {
            version: '1.3.0',
            author: 'Freque Team',
            description: 'Chrome Spheres with Video Mapping',
            displayName: 'Chrome Spheres',
            targetFPS: 60
        });
        
        // Three.js objects
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.spheres = [];
        
        // Video/Image mapping
        this.envMapSource = 'video'; // 'video' or 'bgimg'
        this.mappingMode = 'reflection'; // 'direct' (video on surface) or 'reflection' (chrome reflection)
        this.videoTexture = null;  // UVMapping for direct mode
        this.videoTextureReflection = null;  // EquirectangularReflectionMapping for chrome mode
        this.bgImageTexture = null;  // UVMapping for direct mode
        this.bgImageTextureReflection = null;  // EquirectangularReflectionMapping for chrome mode
        this.currentTexture = null;  // Current direct texture
        this.currentReflectionTexture = null;  // Current reflection texture
        this.updateTextureNeeded = true;
        this.videoElement = null;
        
        // Cube camera setup for video reflection (required for Three.js r120+)
        this.cubeCamera = null;
        this.cubeRenderTarget = null;
        this.videoSphere = null;  // Large sphere with video texture for cube camera
        this.cubeMapTexture = null;
        this.bgSphereVisible = false;  // Toggle for showing video sphere in background
        this.videoSphereBaseRotationY = Math.PI / 2;  // Base Y rotation for cube camera (90 degrees)
        this.videoSphereBaseRotationX = -35 * (Math.PI / 180);  // Base X rotation (-35 degrees)
        // Per-sphere cube cameras for dynamic reflections based on position
        this.sphereCubeCameras = new Map();  // Map of sphere index to cube camera
        this.usePerSphereCubeCameras = false;  // Disabled by default - too expensive. Use shared camera with dynamic position instead
        
        // Plugin settings
        this.sphereCount = 18;
        this.minSphereSize = 0.5;
        this.maxSphereSize = 7.0;
        this.spreadRadius = 25;
        this.floatSpeed = 0.3;
        this.metalness = 1.0;  // High for chrome effect
        this.roughness = 0.0;   // Perfect mirror reflection
        this.envMapIntensity = 0.5;  // Lower intensity for realistic chrome reflections
        
        // Audio reactivity
        this.audioReactive = true;
        this.bassScale = true;
        this.midMovement = true;
        this.trebleShine = true;
        this.beatPulse = true;
        
        // Animation
        this.time = 0;
        this.cameraDistance = 20;
        this.cameraAutoRotate = false;
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
        // Mapping mode toggle
        this.addControl('mappingMode', {
            type: 'checkbox',
            label: 'Reflection',
            checked: true,  // Default is 'reflection' mode
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.mappingMode = value ? 'reflection' : 'direct';
                console.log('🔮 ChromeSphere Mapping:', this.mappingMode);
                
                this.applyTextureToSpheres();
                
                // If switching to reflection mode with video, force cube camera update
                if (this.mappingMode === 'reflection' && this.envMapSource === 'video' && this.cubeCamera && this.videoSphere) {
                    // Temporarily restore base rotation for cube camera capture
                    const originalRotationY = this.videoSphere.rotation.y;
                    if (this.bgSphereVisible) {
                        this.videoSphere.rotation.y = this.videoSphereBaseRotationY;
                    }
                    
                    // Update cube camera immediately to populate cube map
                    this.spheres.forEach(sphere => {
                        sphere.mesh.visible = false;
                    });
                    this.videoSphere.visible = true;
                    this.cubeCamera.update(this.renderer, this.scene);
                    this.spheres.forEach(sphere => {
                        sphere.mesh.visible = true;
                    });
                    
                    // Restore rotation for viewing if BG Sphere is visible
                    if (this.bgSphereVisible) {
                        this.videoSphere.rotation.y = originalRotationY;
                    }
                }
            }
        });
        
        // Environment source toggle
        this.addControl('envSource', {
            type: 'checkbox',
            label: 'Video',
            checked: true,  // Default is 'video'
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.envMapSource = value ? 'video' : 'bgimg';
                console.log('🎬 ChromeSphere Source:', this.envMapSource);
                
                this.updateTextureNeeded = true;
                // Force immediate update instead of waiting for next frame
                this.updateTexture();
            }
        });
        
        // Background sphere toggle (show/hide video sphere)
        this.addControl('bgSphere', {
            type: 'checkbox',
            label: 'Bg Sphere',
            checked: false,  // Default is hidden
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.bgSphereVisible = value;
                console.log('🌍 ChromeSphere Bg Sphere:', value);
                
                // Toggle video sphere visibility by changing its layer and rotation
                if (this.videoSphere) {
                    if (this.bgSphereVisible) {
                        // Show video sphere in background - move to layer 0 so main camera can see it
                        this.videoSphere.layers.set(0);
                        // Rotate 180 degrees so center of video is visible (not the seam)
                        this.videoSphere.rotation.y = this.videoSphereBaseRotationY + Math.PI;
                    } else {
                        // Hide from main camera but keep visible to cube camera - move to layer 1
                        this.videoSphere.layers.set(1);
                        // Reset to base rotation for cube camera
                        this.videoSphere.rotation.y = this.videoSphereBaseRotationY;
                    }
                }
            }
        });
        
        // Sphere count
        this.addControl('sphereCount', {
            type: 'slider',
            label: 'Sphere Count',
            min: 1,
            max: 50,
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
            min: 5.0,
            max: 10.0,
            step: 0.1,
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
                this.updateSpherePositions();
            }
        });
        
        // Float speed
        this.addControl('floatSpeed', {
            type: 'slider',
            label: 'Float Speed',
            min: 0,
            max: 10,
            step: 0.1,
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
            step: 0.01,
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
            step: 0.01,
            value: this.roughness,
            onChange: (value) => {
                this.roughness = value;
                this.updateSphereMaterials();
            }
        });
        
        // Environment map intensity (for reflection mode)
        this.addControl('envMapIntensity', {
            type: 'slider',
            label: 'Reflection Intensity',
            min: 0.0,
            max: 3.0,
            step: 0.1,
            value: this.envMapIntensity,
            onChange: (value) => {
                this.envMapIntensity = value;
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
            className: 'btn-primary-mixer',
            onChange: (checked) => {
                this.audioReactive = checked;
            }
        });
        
        // Bass scale
        this.addControl('bassScale', {
            type: 'checkbox',
            label: 'Bass → Scale',
            checked: this.bassScale,
            className: 'btn-primary-mixer',
            onChange: (checked) => {
                this.bassScale = checked;
            }
        });
        
        // Mid movement
        this.addControl('midMovement', {
            type: 'checkbox',
            label: 'Mid → Movement',
            checked: this.midMovement,
            className: 'btn-primary-mixer',
            onChange: (checked) => {
                this.midMovement = checked;
            }
        });
        
        // Treble shine
        this.addControl('trebleShine', {
            type: 'checkbox',
            label: 'Treble → Shine',
            checked: this.trebleShine,
            className: 'btn-primary-mixer',
            onChange: (checked) => {
                this.trebleShine = checked;
            }
        });
        
        // Beat pulse
        this.addControl('beatPulse', {
            type: 'checkbox',
            label: 'Beat Pulse',
            checked: this.beatPulse,
            className: 'btn-primary-mixer',
            onChange: (checked) => {
                this.beatPulse = checked;
            }
        });
        
        // Camera auto-rotate
        this.addControl('cameraAutoRotate', {
            type: 'checkbox',
            label: 'Auto-Rotate Camera',
            checked: this.cameraAutoRotate,
            className: 'btn-primary-mixer',
            onChange: (checked) => {
                this.cameraAutoRotate = checked;
            }
        });
    }
    
    setupPresets() {
        this.addPreset('video-direct', {
            name: 'Video Direct',
            values: {
                mappingMode: 'direct',
                sphereCount: 15,
                maxSize: 6.0,
                spreadRadius: 15,
                floatSpeed: 3.0,
                metalness: 0.3,
                roughness: 0.7,
                audioReactive: true,
                bassScale: true
            }
        });
        
        this.addPreset('chrome-reflection', {
            name: 'Chrome Reflection',
            values: {
                mappingMode: 'reflection',
                sphereCount: 20,
                maxSize: 5.5,
                spreadRadius: 12,
                floatSpeed: 2.0,
                metalness: 1.0,
                roughness: 0.1,
                audioReactive: true,
                bassScale: true,
                midMovement: false
            }
        });
        
        this.addPreset('energetic', {
            name: 'Energetic',
            values: {
                mappingMode: 'direct',
                sphereCount: 30,
                maxSize: 7.0,
                spreadRadius: 20,
                floatSpeed: 6.0,
                metalness: 0.5,
                roughness: 0.3,
                audioReactive: true,
                bassScale: true,
                midMovement: true,
                beatPulse: true
            }
        });
        
        this.addPreset('minimal', {
            name: 'Minimal',
            values: {
                mappingMode: 'reflection',
                sphereCount: 8,
                maxSize: 6.0,
                spreadRadius: 12,
                floatSpeed: 1.0,
                metalness: 0.9,
                roughness: 0.2,
                audioReactive: true,
                bassScale: false,
                midMovement: false,
                beatPulse: false
            }
        });
    }
    
    onInitialize() {
        // Get dimensions from container
        const container = document.getElementById('visualizationContainer');
        const rect = container.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight;
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Setup camera
        // Reduced FOV from 75 to 50 to eliminate fisheye distortion
        this.camera = new THREE.PerspectiveCamera(
            50,
            width / height,
            0.1,
            1000
        );
        this.camera.position.set(0, this.cameraDistance * 0.2, this.cameraDistance);
        this.camera.lookAt(0, 0, 0);
        // Main camera stays on layer 0 (default) - won't see video sphere on layer 1
        this.camera.layers.set(0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        // Set output encoding to sRGB for proper color space (matches background image reflections)
        if (this.renderer.outputEncoding !== undefined) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }
        
        // Get Three.js canvas
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
        
        // Replace canvas in DOM
        if (this.canvas.parentNode) {
            this.canvas.parentNode.replaceChild(threeCanvas, this.canvas);
        }
        this.canvas = threeCanvas;
        
        // Setup lighting (important for reflections!)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight2.position.set(-10, -10, -10);
        this.scene.add(directionalLight2);
        
        // Create spheres
        this.createSpheres();
        
        // Setup video/image texture
        this.setupTexture();
    }
    
    createSpheres() {
        for (let i = 0; i < this.sphereCount; i++) {
            const sphere = this.createSphere();
            this.spheres.push(sphere);
            this.scene.add(sphere.mesh);
        }
    }
    
    createSphere() {
        const size = this.minSphereSize + Math.random() * (this.maxSphereSize - this.minSphereSize);
        
        // Random position within spread radius
        const angle = Math.random() * Math.PI * 2;
        // Use square root for uniform area distribution (prevents bunching in center)
        const radius = Math.sqrt(Math.random()) * this.spreadRadius;
        // Scale vertical range with spread radius for better 3D distribution
        // Increased multiplier to 1.5 so spheres reach top of screen
        const height = (Math.random() - 0.5) * this.spreadRadius * 1.5;
        
        // Create geometry
        const geometry = new THREE.SphereGeometry(size, 64, 64);
        
        // Create material with optimal settings for reflections
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,  // White base color so textures show correctly
            metalness: this.metalness,
            roughness: this.roughness,
            envMapIntensity: this.envMapIntensity,
            // Ensure proper rendering for reflections
            side: THREE.FrontSide
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        
        // Per-sphere cube cameras will be created when needed (after video sphere setup)
        return {
            mesh,
            baseSize: size,
            basePosition: mesh.position.clone(),
            floatOffset: Math.random() * Math.PI * 2,
            floatSpeed: 0.5 + Math.random() * 1.0,
            rotationSpeed: (Math.random() - 0.5) * 0.5,
            cubeCamera: null,
            cubeRenderTarget: null,
            cubeMapTexture: null
        };
    }
    
    createPerSphereCubeCameras() {
        // Create cube cameras for each sphere for dynamic position-based reflections
        if (!this.usePerSphereCubeCameras || !this.videoSphere || this.mappingMode !== 'reflection' || this.envMapSource !== 'video') {
            return;
        }
        
        this.spheres.forEach((sphere, index) => {
            if (!sphere.cubeCamera && !sphere.cubeRenderTarget) {
                // Create cube render target for this sphere
                sphere.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, {
                    format: THREE.RGBAFormat,
                    generateMipmaps: true,
                    minFilter: THREE.LinearMipmapLinearFilter,
                    magFilter: THREE.LinearFilter
                });
                
                if (sphere.cubeRenderTarget.texture.encoding !== undefined) {
                    sphere.cubeRenderTarget.texture.encoding = THREE.sRGBEncoding;
                }
                
                // Create cube camera positioned at this sphere's location
                sphere.cubeCamera = new THREE.CubeCamera(0.1, 1000, sphere.cubeRenderTarget);
                sphere.cubeCamera.position.copy(sphere.mesh.position);
                sphere.cubeCamera.layers.enable(1);  // See video sphere layer
                this.scene.add(sphere.cubeCamera);
                
                sphere.cubeMapTexture = sphere.cubeRenderTarget.texture;
            }
        });
    }
    
    setupTexture() {
        this.updateTexture();
    }
    
    // FIXED: Proper video texture setup
    updateTexture() {
        let sourceElement = null;
        
        if (this.envMapSource === 'video') {
            // Find video element
            sourceElement = document.querySelector('#bgVideo') || 
                           document.querySelector('#bgVideoPlaceholder') ||
                           document.querySelector('video');
            
            if (!sourceElement) {
                return;
            }
            
            // Store video element reference
            this.videoElement = sourceElement;
            
            // Create video texture for DIRECT mode (UVMapping)
            if (!this.videoTexture) {
                this.videoTexture = new THREE.VideoTexture(sourceElement);
                this.videoTexture.minFilter = THREE.LinearFilter;
                this.videoTexture.magFilter = THREE.LinearFilter;
                this.videoTexture.mapping = THREE.UVMapping;  // For direct texture on surface
                this.videoTexture.format = THREE.RGBFormat;
                // Flip texture vertically to correct orientation (removed Math.PI rotation)
                this.videoTexture.flipY = true;
            }
            
            // Create cube camera setup for REFLECTION mode (required for video textures in Three.js r120+)
            if (!this.cubeRenderTarget) {
                // Create cube render target with maximum resolution for best quality
                // Using RGBAFormat for better color depth and quality
                this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(4096, {
                    format: THREE.RGBAFormat,
                    generateMipmaps: true,
                    minFilter: THREE.LinearMipmapLinearFilter,
                    magFilter: THREE.LinearFilter
                });
                
                // Use sRGBEncoding to match background image reflection behavior
                // This ensures video reflections have same brightness and color as background image reflections
                if (this.cubeRenderTarget.texture.encoding !== undefined) {
                    this.cubeRenderTarget.texture.encoding = THREE.sRGBEncoding;
                }
                
                // Create cube camera
                this.cubeCamera = new THREE.CubeCamera(0.1, 1000, this.cubeRenderTarget);
                // Position cube camera at origin - stays fixed (never changes)
                this.cubeCamera.position.set(0, 0, 0);
                // Cube camera needs to see layer 1 (where video sphere will be) to capture it
                // enable(1) adds layer 1 while keeping default layer 0, so it sees both
                this.cubeCamera.layers.enable(1);
                this.scene.add(this.cubeCamera);
                
                // Create large sphere with video texture (inverted to face inward)
                // Maximum segments for highest quality reflections (120, 80 for very smooth surface)
                const sphereGeometry = new THREE.SphereGeometry(500, 120, 80);
                sphereGeometry.scale(-1, 1, 1); // Invert sphere to face inward
                
                const videoTextureForSphere = new THREE.VideoTexture(sourceElement);
                // Use better filtering for higher quality reflections
                videoTextureForSphere.minFilter = THREE.LinearFilter;
                videoTextureForSphere.magFilter = THREE.LinearFilter;
                videoTextureForSphere.mapping = THREE.EquirectangularReflectionMapping;
                videoTextureForSphere.format = THREE.RGBAFormat;  // Use RGBA for better quality
                // Use sRGBEncoding for video texture - video content is in sRGB color space
                // This matches the cube map encoding for consistent color and brightness
                if (videoTextureForSphere.encoding !== undefined) {
                    videoTextureForSphere.encoding = THREE.sRGBEncoding;
                }
                
                const sphereMaterial = new THREE.MeshBasicMaterial({
                    map: videoTextureForSphere
                });
                
                this.videoSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                // Set base rotations for cube camera (correct reflection orientation)
                this.videoSphere.rotation.y = this.videoSphereBaseRotationY;
                this.videoSphere.rotation.x = this.videoSphereBaseRotationX;
                // Keep always visible - cube camera needs to see it
                this.videoSphere.visible = true;
                // Set initial layer based on bgSphereVisible state
                // Layer 0 = visible to main camera, Layer 1 = hidden from main camera
                this.videoSphere.layers.set(this.bgSphereVisible ? 0 : 1);
                // Apply 180 degree rotation for viewing if BG Sphere is visible
                if (this.bgSphereVisible) {
                    this.videoSphere.rotation.y = this.videoSphereBaseRotationY + Math.PI;
                }
                this.scene.add(this.videoSphere);
                
                // Store the cube map texture
                // Note: Filtering is set on the render target, not the texture itself
                this.cubeMapTexture = this.cubeRenderTarget.texture;
                
                // Add anisotropic filtering for better quality at oblique angles
                if (this.renderer && this.renderer.capabilities) {
                    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
                    if (maxAnisotropy > 0) {
                        this.cubeMapTexture.anisotropy = maxAnisotropy;
                    }
                }
                
                // Create per-sphere cube cameras for dynamic reflections
                this.createPerSphereCubeCameras();
                
                // Force initial cube camera update to populate the cube map
                if (this.mappingMode === 'reflection' && this.renderer) {
                    // Temporarily restore base rotation for cube camera capture
                    const originalRotationY = this.videoSphere.rotation.y;
                    if (this.bgSphereVisible) {
                        this.videoSphere.rotation.y = this.videoSphereBaseRotationY;
                    }
                    
                    this.spheres.forEach(sphere => {
                        sphere.mesh.visible = false;
                    });
                    this.videoSphere.visible = true;
                    this.cubeCamera.position.set(0, 0, 0);
                    this.cubeCamera.update(this.renderer, this.scene);
                    this.spheres.forEach(sphere => {
                        sphere.mesh.visible = true;
                    });
                    
                    // Restore rotation for viewing if BG Sphere is visible
                    if (this.bgSphereVisible) {
                        this.videoSphere.rotation.y = originalRotationY;
                    }
                }
            }
            
            this.currentTexture = this.videoTexture;
            // For video, reflection texture is the cube map (created separately)
            // For bgimg, reflection texture is set in createBackgroundTexture()
            this.currentReflectionTexture = this.cubeMapTexture;
            this.applyTextureToSpheres();
            
        } else {
            // Handle background image
            const bgImageDiv = document.querySelector('#bgImage');
            
            if (!bgImageDiv) {
                return;
            }
            
            const computedStyle = window.getComputedStyle(bgImageDiv);
            const backgroundImage = computedStyle.backgroundImage;
            
            if (!backgroundImage || backgroundImage === 'none') {
                return;
            }
            
            const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (!urlMatch) {
                return;
            }
            
            const imageUrl = urlMatch[1];
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = imageUrl;
            
            img.onload = () => {
                this.createBackgroundTexture(img);
            };
            
            return;
        }
        
        this.updateTextureNeeded = false;
    }
    
    createBackgroundTexture(imageElement) {
        // Dispose old textures
        if (this.bgImageTexture) {
            this.bgImageTexture.dispose();
        }
        if (this.bgImageTextureReflection) {
            this.bgImageTextureReflection.dispose();
        }
        
        // Create texture for DIRECT mode (UVMapping)
        this.bgImageTexture = new THREE.Texture(imageElement);
        this.bgImageTexture.needsUpdate = true;
        this.bgImageTexture.mapping = THREE.UVMapping;  // For direct texture
        // Flip texture vertically to correct orientation (removed Math.PI rotation)
        this.bgImageTexture.flipY = true;
        
        // Create texture for REFLECTION mode (EquirectangularReflectionMapping)
        this.bgImageTextureReflection = new THREE.Texture(imageElement);
        this.bgImageTextureReflection.needsUpdate = true;
        this.bgImageTextureReflection.mapping = THREE.EquirectangularReflectionMapping;  // For envMap
        
        this.currentTexture = this.bgImageTexture;
        this.currentReflectionTexture = this.bgImageTextureReflection;
        this.applyTextureToSpheres();
        this.updateTextureNeeded = false;
    }
    
    applyTextureToSpheres() {
        if (!this.currentTexture && !this.currentReflectionTexture) {
            return;
        }
        
        this.spheres.forEach(sphere => {
            const material = sphere.mesh.material;
            
            // Ensure material has proper base color
            material.color.setHex(0xffffff);
            
            if (this.mappingMode === 'direct') {
                // Direct texture on surface - use UVMapping texture
                material.map = this.currentTexture;
                material.envMap = null;
                material.metalness = Math.min(this.metalness, 0.5);
                material.roughness = Math.max(this.roughness, 0.3);
            } else {
                // Chrome reflection mode - use cube map for video, direct texture for bgimg
                material.map = null;
                
                if (this.envMapSource === 'video' && this.cubeMapTexture) {
                    // For video: use shared cube map (position updates dynamically to average sphere position)
                    material.envMap = this.cubeMapTexture;
                    // Use full intensity - LinearEncoding prevents color shifts, so full intensity is safe
                    material.envMapIntensity = this.envMapIntensity;
                } else if (this.envMapSource === 'bgimg' && this.currentReflectionTexture) {
                    // For background image: use direct EquirectangularReflectionMapping (works for static images)
                    material.envMap = this.currentReflectionTexture;
                    material.envMapIntensity = this.envMapIntensity;
                }
                
                // Set material properties for optimal reflections
                material.metalness = this.metalness;
                material.roughness = this.roughness;
                material.needsUpdate = true;
            }
        });
    }
    
    toggleMappingMode() {
        this.mappingMode = this.mappingMode === 'direct' ? 'reflection' : 'direct';
        
        // Query DOM directly using data-control attribute
        const buttonElement = document.querySelector('[data-control="mappingMode"]');
        
        if (buttonElement) {
            const newLabel = this.mappingMode === 'direct' ? 'Direct Texture' : 'Reflection';
            buttonElement.textContent = newLabel;
            
            // Toggle active class
            if (this.mappingMode === 'direct') {
                buttonElement.classList.add('active');
            } else {
                buttonElement.classList.remove('active');
            }
        }
        
        this.applyTextureToSpheres();
        
        // If switching to reflection mode with video, force cube camera update
        if (this.mappingMode === 'reflection' && this.envMapSource === 'video' && this.cubeCamera && this.videoSphere) {
            // Temporarily restore base rotation for cube camera capture
            const originalRotationY = this.videoSphere.rotation.y;
            if (this.bgSphereVisible) {
                this.videoSphere.rotation.y = this.videoSphereBaseRotationY;
            }
            
            // Update cube camera immediately to populate cube map
            this.spheres.forEach(sphere => {
                sphere.mesh.visible = false;
            });
            this.videoSphere.visible = true;
            // Cube camera position is fixed at origin (set during initialization)
            this.cubeCamera.update(this.renderer, this.scene);
            this.spheres.forEach(sphere => {
                sphere.mesh.visible = true;
            });
            
            // Restore rotation for viewing if BG Sphere is visible
            if (this.bgSphereVisible) {
                this.videoSphere.rotation.y = originalRotationY;
            }
        }
    }
    
    toggleEnvSource() {
        this.envMapSource = this.envMapSource === 'video' ? 'bgimg' : 'video';
        
        // Query DOM directly using data-control attribute
        const buttonElement = document.querySelector('[data-control="envSource"]');
        
        if (buttonElement) {
            if (this.envMapSource === 'video') {
                buttonElement.textContent = 'Video';
                buttonElement.classList.add('active');
            } else {
                buttonElement.textContent = 'BgImg';
                buttonElement.classList.remove('active');
            }
        }
        
        this.updateTextureNeeded = true;
        
        // Force immediate update instead of waiting for next frame
        this.updateTexture();
    }
    
    toggleBgSphere() {
        this.bgSphereVisible = !this.bgSphereVisible;
        
        // Query DOM directly using data-control attribute
        const buttonElement = document.querySelector('[data-control="bgSphere"]');
        
        if (buttonElement) {
            if (this.bgSphereVisible) {
                buttonElement.textContent = 'Bg Sphere: ON';
                buttonElement.classList.add('active');
            } else {
                buttonElement.textContent = 'Bg Sphere: OFF';
                buttonElement.classList.remove('active');
            }
        }
        
        // Toggle video sphere visibility by changing its layer and rotation
        if (this.videoSphere) {
            if (this.bgSphereVisible) {
                // Show video sphere in background - move to layer 0 so main camera can see it
                this.videoSphere.layers.set(0);
                // Rotate 180 degrees so center of video is visible (not the seam)
                this.videoSphere.rotation.y = this.videoSphereBaseRotationY + Math.PI;
            } else {
                // Hide video sphere from background - move to layer 1 (only cube camera sees it)
                this.videoSphere.layers.set(1);
                // Restore base rotation for cube camera (correct reflection orientation)
                this.videoSphere.rotation.y = this.videoSphereBaseRotationY;
            }
        }
    }
    
    recreateSpheres() {
        this.spheres.forEach(sphere => {
            this.scene.remove(sphere.mesh);
            sphere.mesh.geometry.dispose();
            sphere.mesh.material.dispose();
        });
        
        this.spheres = [];
        this.createSpheres();
        
        if (this.currentTexture) {
            this.applyTextureToSpheres();
        }
    }
    
    updateSphereSizes() {
        this.spheres.forEach((sphere) => {
            const newSize = this.minSphereSize + Math.random() * (this.maxSphereSize - this.minSphereSize);
            
            // Dispose old geometry
            sphere.mesh.geometry.dispose();
            
            // Create new geometry with new size
            sphere.mesh.geometry = new THREE.SphereGeometry(newSize, 64, 64);
            
            // Update stored base size
            sphere.baseSize = newSize;
            
            // Reset scale
            sphere.mesh.scale.set(1, 1, 1);
        });
    }
    
    updateSpherePositions() {
        this.spheres.forEach((sphere) => {
            // Generate new random position within current spread radius
            const angle = Math.random() * Math.PI * 2;
            // Use square root for uniform area distribution (prevents bunching in center)
            const radius = Math.sqrt(Math.random()) * this.spreadRadius;
            // Scale vertical range with spread radius for better 3D distribution
            // Increased multiplier to 1.5 so spheres reach top of screen
            const height = (Math.random() - 0.5) * this.spreadRadius * 1.5;
            
            // Update base position
            sphere.basePosition.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            // Update mesh position immediately
            sphere.mesh.position.copy(sphere.basePosition);
        });
    }
    
    updateSphereMaterials() {
        this.spheres.forEach(sphere => {
            sphere.mesh.material.metalness = this.metalness;
            sphere.mesh.material.roughness = this.roughness;
            
            // Apply intensity with reduction for video cube maps (they can be brighter)
            if (this.mappingMode === 'reflection' && this.envMapSource === 'video') {
                sphere.mesh.material.envMapIntensity = this.envMapIntensity * 0.8;
            } else {
                sphere.mesh.material.envMapIntensity = this.envMapIntensity;
            }
            
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
        
        // Store shared audio data for base class methods
        this.sharedAudioData = sharedAudioData;
        
        // Update time with float speed scaling
        // 0 → frozen (0x), 3 → normal speed (1.0x), 10 → double speed (2.0x)
        const speedFactor = this.floatSpeed <= 3 
            ? this.floatSpeed / 3.0  // 0-3 maps to 0-1.0
            : 1.0 + ((this.floatSpeed - 3) / 7.0); // 3-10 maps to 1.0-2.0
        
        this.time += deltaTime * 0.001 * speedFactor;
        
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
            
            // Update camera position while preserving Y offset
            this.camera.position.x = Math.sin(newAngle) * radius;
            this.camera.position.y = this.cameraDistance * 0.2; // Preserve Y offset
            this.camera.position.z = Math.cos(newAngle) * radius;
            this.camera.lookAt(0, 0, 0);
        }
        
        // Update texture if source changed
        if (this.updateTextureNeeded) {
            this.updateTexture();
        }
    }
    
    updateSpheres(deltaTime) {
        const energy = this.audioReactive ? this.smoothedEnergy : 0.5;
        const bass = this.audioReactive && this.bassScale ? this.frequencyBands.bass : 0;
        const mid = this.audioReactive && this.midMovement ? this.frequencyBands.mid : 0;
        const treble = this.audioReactive && this.trebleShine ? this.frequencyBands.treble : 0;
        
        this.spheres.forEach((sphere) => {
            // Float animation
            const floatTime = this.time + sphere.floatOffset;
            const floatY = Math.sin(floatTime * sphere.floatSpeed) * 3;
            const floatX = Math.cos(floatTime * sphere.floatSpeed * 0.7) * 2;
            
            // Apply position with mid frequency movement boost
            const movementBoost = 1 + mid * 3;  // Increased from 2 to 3 for more visible effect
            sphere.mesh.position.x = sphere.basePosition.x + floatX * movementBoost;
            sphere.mesh.position.y = sphere.basePosition.y + floatY * movementBoost;
            sphere.mesh.position.z = sphere.basePosition.z + Math.sin(floatTime * 0.5) * 1.5 * movementBoost;
            
            // Scale based on bass (only if audio reactive and bass scale enabled)
            const baseScale = 1.0;
            const bassScale = (this.audioReactive && this.bassScale) ? (1 + bass * 0.5) : 1.0;  // Increased from 0.3 to 0.5 for more visible effect
            sphere.mesh.scale.set(baseScale * bassScale, baseScale * bassScale, baseScale * bassScale);
            
            // Rotation
            sphere.mesh.rotation.y += sphere.rotationSpeed * deltaTime * 0.001;
            sphere.mesh.rotation.x += sphere.rotationSpeed * 0.5 * deltaTime * 0.001;
            
            // Adjust roughness based on treble (only if audio reactive and treble shine enabled)
            if (this.audioReactive && this.trebleShine) {
                const dynamicRoughness = this.roughness * (1 - treble * 0.5);
                sphere.mesh.material.roughness = Math.max(0.01, dynamicRoughness);
            } else {
                // Reset to base roughness if not audio reactive
                sphere.mesh.material.roughness = this.roughness;
            }
        });
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.isActive || !this.renderer || !this.scene || !this.camera) return;
        
        // CRITICAL: Update video textures every frame
        if (this.envMapSource === 'video' && this.videoElement) {
            // Check if video is actually playing
            if (!this.videoElement.paused && this.videoElement.readyState >= 2) {
                // Update direct video texture
                if (this.videoTexture) {
                    this.videoTexture.needsUpdate = true;
                }
                
                // Update cube cameras for reflection mode (if in reflection mode)
                if (this.mappingMode === 'reflection' && this.videoSphere) {
                    // Update video texture on sphere
                    if (this.videoSphere.material && this.videoSphere.material.map) {
                        this.videoSphere.material.map.needsUpdate = true;
                    }
                    
                    // Ensure video sphere is visible for cube cameras
                    this.videoSphere.visible = true;
                    
                    // Temporarily restore base rotation for cube camera capture (correct reflection orientation)
                    const originalRotationY = this.videoSphere.rotation.y;
                    if (this.bgSphereVisible) {
                        this.videoSphere.rotation.y = this.videoSphereBaseRotationY;
                    }
                    
                    // Temporarily increase renderer pixel ratio for cube camera capture
                    const originalPixelRatio = this.renderer.getPixelRatio();
                    // Use higher pixel ratio for better quality (capped at 2.0 for performance)
                    this.renderer.setPixelRatio(Math.min(originalPixelRatio * 2.0, 2.0));
                    
                    if (this.cubeCamera) {
                        // Use shared cube camera with dynamic position (average of all sphere positions)
                        // Calculate average position of all spheres for dynamic reflections
                        let avgX = 0, avgY = 0, avgZ = 0;
                        let count = 0;
                        this.spheres.forEach(sphere => {
                            avgX += sphere.mesh.position.x;
                            avgY += sphere.mesh.position.y;
                            avgZ += sphere.mesh.position.z;
                            count++;
                        });
                        
                        if (count > 0) {
                            avgX /= count;
                            avgY /= count;
                            avgZ /= count;
                            // Update cube camera position to average sphere position for dynamic reflections
                            this.cubeCamera.position.set(avgX, avgY, avgZ);
                        }
                        
                        // Hide spheres temporarily so they don't appear in cube map
                        this.spheres.forEach(sphere => {
                            sphere.mesh.visible = false;
                        });
                        
                        // Update shared cube camera
                        this.cubeCamera.update(this.renderer, this.scene);
                        
                        // Restore sphere visibility
                        this.spheres.forEach(sphere => {
                            sphere.mesh.visible = true;
                        });
                    }
                    
                    // Restore original pixel ratio
                    this.renderer.setPixelRatio(originalPixelRatio);
                    
                    // Restore rotation for viewing if BG Sphere is visible
                    if (this.bgSphereVisible) {
                        this.videoSphere.rotation.y = originalRotationY;
                    }
                }
            }
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
        this.spheres.forEach(sphere => {
            const currentScale = sphere.mesh.scale.x;
            sphere.mesh.scale.set(currentScale * 1.2, currentScale * 1.2, currentScale * 1.2);
            
            setTimeout(() => {
                sphere.mesh.scale.set(1, 1, 1);
            }, 100);
        });
    }
    
    onCleanup() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.videoTexture) {
            this.videoTexture.dispose();
        }
        
        if (this.videoTextureReflection) {
            this.videoTextureReflection.dispose();
        }
        
        if (this.bgImageTexture) {
            this.bgImageTexture.dispose();
        }
        
        if (this.bgImageTextureReflection) {
            this.bgImageTextureReflection.dispose();
        }
        
        // Cleanup cube camera resources
        // Cleanup per-sphere cube cameras
        this.spheres.forEach(sphere => {
            if (sphere.cubeCamera) {
                this.scene.remove(sphere.cubeCamera);
                sphere.cubeCamera = null;
            }
            if (sphere.cubeRenderTarget) {
                sphere.cubeRenderTarget.dispose();
                sphere.cubeRenderTarget = null;
            }
            sphere.cubeMapTexture = null;
        });
        
        if (this.cubeRenderTarget) {
            this.cubeRenderTarget.dispose();
            this.cubeRenderTarget = null;
        }
        
        if (this.cubeCamera) {
            this.scene.remove(this.cubeCamera);
            this.cubeCamera = null;
        }
        
        if (this.videoSphere) {
            if (this.videoSphere.material && this.videoSphere.material.map) {
                this.videoSphere.material.map.dispose();
            }
            this.videoSphere.geometry.dispose();
            this.videoSphere.material.dispose();
            this.scene.remove(this.videoSphere);
            this.videoSphere = null;
        }
        
        if (this.cubeMapTexture) {
            this.cubeMapTexture.dispose();
            this.cubeMapTexture = null;
        }
        
        this.spheres.forEach(sphere => {
            sphere.mesh.geometry.dispose();
            sphere.mesh.material.dispose();
            this.scene.remove(sphere.mesh);
        });
        
        this.spheres = [];
        this.videoElement = null;
    }
}

// Make globally available
window.ChromoSpheresPlugin = ChromoSpheresPlugin;

// Auto-register
setTimeout(() => {
    if (!window.visualizer || !window.FrequePluginBase) {
        return;
    }
    
    if (typeof THREE === 'undefined') {
        console.error('Chrome Spheres: Three.js not loaded!');
        return;
    }
    
    const existingPlugin = window.pluginManager?.getPlugin('chrom0spheres');
    
    if (existingPlugin) {
        return;
    }
    
    try {
        new ChromoSpheresPlugin(window.visualizer);
    } catch (error) {
        console.error('Failed to load Chrome Spheres:', error);
    }
}, 500);
