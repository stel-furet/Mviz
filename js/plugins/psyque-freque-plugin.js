/**
 * PSYQUE - Professional Liquid Bubble Visualizer Plugin for Freque
 * Version: 1.1.0
 * Author: Freque Team
 * 
 * WebGL2-based shader visualization with smooth noise-driven animation morphing
 * and comprehensive beat reactivity.
 */

class PsyquePlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('psyque', visualizer, {
            version: '1.1.0',
            author: 'Freque Team',
            description: 'Professional liquid bubble visualizer with WebGL2 shaders',
            targetFPS: 60
        });

        // WebGL resources
        this.gl = null;
        this.program = null;
        this.uniforms = {};
        
        // Time tracking
        this.time = 0;
        this.colorTime = 0;
        this.bgTime = 0;
        this.rotationTime = 0;
        this.animationMorphTime = 0;
        
        // Base values for animation morph
        this.baseSpeed = 1.0;
        this.baseDensity = 1.0;
        this.baseRoundness = 0.5;
        this.baseSeparation = 3.5;
        this.baseBgSpeed = 1.0;
        this.baseBgIntensity = 0.5;
        this.baseEdge = 1.5;
        this.baseIntensity = 1.5;
        
        // Color schemes
        this.colorSchemes = [
            { name: 'Acid Orange/Cyan', id: 0 },
            { name: 'Blue Soap Bubbles', id: 1 },
            { name: 'Red Lava', id: 2 },
            { name: 'Purple Dream', id: 3 },
            { name: 'Rainbow', id: 4 }
        ];
        
        // Audio reactivity
        this.frequencyBands = { bass: 0, mid: 0, treble: 0 };
        this.currentEnergy = 0;
        this.smoothedEnergy = 0;
        this.energyHistory = [];
        
        // Beat detection
        this.lastBeatTime = 0;
        this.beatDecay = 0;
        this.beatThreshold = 1.3;
        
        this.setupControls();
        this.setupPresets();
    }

    setupControls() {
        // Color Scheme Dropdown
        this.addControl('colorScheme', {
            type: 'dropdown',
            label: 'Color Scheme',
            className: 'dropdown-selector-mixer',
            options: this.colorSchemes.map(s => ({ value: s.id, label: s.name })),
            value: 0,
            onChange: (value) => {
                this.colorScheme = parseInt(value);
                // CRITICAL: Reset colorTime when changing schemes (unless morphing)
                // This ensures each scheme starts from its base colors
                if (!this.colorMorph) {
                    this.colorTime = 0;
                }
            }
        });
        
        // Color Morph Toggle
        this.colorMorph = false;
        this.addControl('colorMorph', {
            type: 'checkbox',
            label: 'Color Morph',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.colorMorph = value;
                // CRITICAL: Reset colorTime when turning OFF to ensure consistent base colors
                if (!value) {
                    this.colorTime = 0;
                } else {
                }
            }
        });
        
        // Color Morph Speed
        this.colorMorphSpeed = 1.0;
        this.addControl('colorMorphSpeed', {
            type: 'dropdown',
            label: 'Color Morph Speed',
            className: 'dropdown-selector-mixer',
            options: [
                { value: 0.5, label: 'Slow' },
                { value: 1.0, label: 'Medium' },
                { value: 4.0, label: 'Fast' },
                { value: 12.0, label: 'Ultra' }
            ],
            value: 1.0,
            onChange: (value) => {
                this.colorMorphSpeed = parseFloat(value);
            }
        });
        
        // Animation Morph Toggle
        this.animationMorph = false;
        this.addControl('animationMorph', {
            type: 'checkbox',
            label: 'Animation Morph',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.animationMorph = value;
                // CRITICAL: Reset animationMorphTime when turning OFF for consistent base state
                if (!value) {
                    this.animationMorphTime = 0;
                } else {
                }
            }
        });
        
        // Animation Morph Speed
        this.animationMorphSpeed = 1.0;
        this.addControl('animationMorphSpeed', {
            type: 'dropdown',
            label: 'Animation Morph Speed',
            className: 'dropdown-selector-mixer',
            options: [
                { value: 0.5, label: 'Slow' },
                { value: 1.0, label: 'Medium' },
                { value: 4.0, label: 'Fast' },
                { value: 12.0, label: 'Ultra' }
            ],
            value: 1.0,
            onChange: (value) => {
                this.animationMorphSpeed = parseFloat(value);
            }
        });
        
        // Animation Speed Slider
        this.speed = 1.0;
        this.addControl('speed', {
            type: 'dial',
            label: 'Animation Speed',
            min: 0,
            max: 3,
            step: 0.1,
            value: 1.0,
            onChange: (value) => {
                if (!this.animationMorph) {
                    this.baseSpeed = value;
                }
                this.speed = value;
            }
        });
        
        // Rotation Speed Slider
        this.rotation = 0;
        this.addControl('rotation', {
            type: 'dial',
            label: 'Rotation Speed',
            min: -20,
            max: 20,
            step: 0.5,
            value: 0,
            onChange: (value) => {
                this.rotation = value;
            }
        });
        
        // Bubble Density
        this.density = 1.0;
        this.addControl('density', {
            type: 'dial',
            label: 'Bubble Density',
            min: 0.3,
            max: 1.5,
            step: 0.1,
            value: 1.0,
            onChange: (value) => {
                if (!this.animationMorph) {
                    this.baseDensity = value;
                }
                this.density = value;
            }
        });
        
        // Flow Complexity
        this.complexity = 1.0;
        this.addControl('complexity', {
            type: 'dial',
            label: 'Flow Complexity',
            min: 0.2,
            max: 2.0,
            step: 0.1,
            value: 1.0,
            onChange: (value) => {
                this.complexity = value;
            }
        });
        
        // Bubble Separation
        this.separation = 3.5;
        this.addControl('separation', {
            type: 'dial',
            label: 'Bubble Separation',
            min: 1.5,
            max: 8.0,
            step: 0.5,
            value: 3.5,
            onChange: (value) => {
                if (!this.animationMorph) {
                    this.baseSeparation = value;
                }
                this.separation = value;
            }
        });
        
        // Bubble Roundness
        this.roundness = 0.5;
        this.addControl('roundness', {
            type: 'dial',
            label: 'Bubble Roundness',
            min: 0.0,
            max: 2.0,
            step: 0.1,
            value: 0.5,
            onChange: (value) => {
                if (!this.animationMorph) {
                    this.baseRoundness = value;
                }
                this.roundness = value;
            }
        });
        
        // Background Speed
        this.bgSpeed = 1.0;
        this.addControl('bgSpeed', {
            type: 'dial',
            label: 'Background Speed',
            min: 0.0,
            max: 3.0,
            step: 0.1,
            value: 1.0,
            onChange: (value) => {
                if (!this.animationMorph) {
                    this.baseBgSpeed = value;
                }
                this.bgSpeed = value;
            }
        });
        
        // Background Intensity
        this.bgIntensity = 0.5;
        this.addControl('bgIntensity', {
            type: 'dial',
            label: 'Background Intensity',
            min: 0.0,
            max: 2.0,
            step: 0.1,
            value: 0.5,
            onChange: (value) => {
                if (!this.animationMorph) {
                    this.baseBgIntensity = value;
                }
                this.bgIntensity = value;
            }
        });
        
        // Background Toggle
        this.showBackground = true;
        this.addControl('showBackground', {
            type: 'checkbox',
            label: 'Background',
            checked: true,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.showBackground = value;
            }
        });
        
        // Edge Brightness
        this.edge = 1.5;
        this.addControl('edge', {
            type: 'dial',
            label: 'Edge Brightness',
            min: 0,
            max: 5,
            step: 0.1,
            value: 1.5,
            onChange: (value) => {
                if (!this.animationMorph) {
                    this.baseEdge = value;
                }
                this.edge = value;
            }
        });
        
        // Color Intensity
        this.intensity = 1.5;
        this.addControl('intensity', {
            type: 'dial',
            label: 'Color Intensity',
            min: 0.5,
            max: 3,
            step: 0.1,
            value: 1.5,
            onChange: (value) => {
                if (!this.animationMorph) {
                    this.baseIntensity = value;
                }
                this.intensity = value;
            }
        });
        
        // Zoom
        this.zoom = 4.0;
        this.addControl('zoom', {
            type: 'dial',
            label: 'Zoom',
            min: 1.0,
            max: 10.0,
            step: 0.1,
            value: 4.0,
            onChange: (value) => {
                this.zoom = value;
            }
        });
        
        // Solid Fill Toggle
        this.solidFill = false;
        this.addControl('solidFill', {
            type: 'checkbox',
            label: 'Solid Interior',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.solidFill = value;
            }
        });
        
        // Depth Layers Toggle
        this.depthLayers = false;
        this.addControl('depthLayers', {
            type: 'checkbox',
            label: 'Depth Layers',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.depthLayers = value;
            }
        });
        
        // Sharp Edges Toggle
        this.sharpEdges = false;
        this.addControl('sharpEdges', {
            type: 'checkbox',
            label: 'Sharp Edges',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.sharpEdges = value;
            }
        });
        
        // Beat Reactivity Master Toggle
        this.beatReactive = false;
        this.addControl('beatReactive', {
            type: 'checkbox',
            label: 'Beat React',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.beatReactive = value;
            }
        });
        
        // Edge Boost Toggle (energy-based)
        this.edgesBoost = false;
        this.addControl('edgesBoost', {
            type: 'checkbox',
            label: 'Edges',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.edgesBoost = value;
            }
        });
        
        // Background Boost Toggle (energy-based)
        this.bgBoost = false;
        this.addControl('bgBoost', {
            type: 'checkbox',
            label: 'BG Boost',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.bgBoost = value;
            }
        });
        
        // Animation Speed Boost Toggle (energy-based)
        this.animSpeedBoost = false;
        this.addControl('animSpeedBoost', {
            type: 'checkbox',
            label: 'Anim Speed',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.animSpeedBoost = value;
            }
        });
        
        // Rotation Boost Toggle (energy-based)
        this.rotationBoost = false;
        this.addControl('rotationBoost', {
            type: 'checkbox',
            label: 'Rotation',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.rotationBoost = value;
            }
        });
    }

    setupPresets() {
        this.addPreset('default', {
            name: 'Acid Orange/Cyan',
            values: {
                colorScheme: 0,
                colorMorph: false,
                colorMorphSpeed: 1.0,
                animationMorph: false,
                animationMorphSpeed: 1.0,
                speed: 1.0,
                rotation: 0,
                density: 1.5,
                complexity: 1.0,
                separation: 3.5,
                roundness: 0.5,
                bgSpeed: 1.0,
                bgIntensity: 0.5,
                edge: 1.5,
                intensity: 1.5,
                zoom: 4.0,
                solidFill: false,
                depthLayers: false,
                showBackground: true,
                beatReactive: false,
                edgesBoost: false,
                bgBoost: false,
                animSpeedBoost: false,
                rotationBoost: false
            }
        });
        
        this.addPreset('soap', {
            name: 'Blue Soap Bubbles',
            values: {
                colorScheme: 1,
                colorMorph: false,
                colorMorphSpeed: 1.0,
                animationMorph: false,
                animationMorphSpeed: 1.0,
                speed: 1.2,
                rotation: 0,
                density: 1.2,
                complexity: 0.8,
                separation: 4.0,
                roundness: 0.3,
                bgSpeed: 1.0,
                bgIntensity: 0.5,
                edge: 2.5,
                intensity: 1.8,
                zoom: 4.5,
                solidFill: false,
                depthLayers: false,
                showBackground: true,
                beatReactive: false,
                edgesBoost: false,
                bgBoost: false,
                animSpeedBoost: false,
                rotationBoost: false
            }
        });
        
        this.addPreset('lava', {
            name: 'Red Lava',
            values: {
                colorScheme: 2,
                colorMorph: false,
                colorMorphSpeed: 1.0,
                animationMorph: false,
                animationMorphSpeed: 1.0,
                speed: 0.8,
                rotation: 0,
                density: 1.8,
                complexity: 1.5,
                separation: 2.5,
                roundness: 1.0,
                bgSpeed: 1.8,
                bgIntensity: 1.0,
                edge: 2.0,
                intensity: 2.2,
                zoom: 4.8,
                solidFill: false,
                depthLayers: false,
                showBackground: true,
                beatReactive: false,
                edgesBoost: false,
                bgBoost: false,
                animSpeedBoost: false,
                rotationBoost: false
            }
        });
        
        this.addPreset('dream', {
            name: 'Purple Dream',
            values: {
                colorScheme: 3,
                colorMorph: false,
                colorMorphSpeed: 1.0,
                animationMorph: false,
                animationMorphSpeed: 1.0,
                speed: 1.0,
                rotation: 0,
                density: 1.1,
                complexity: 1.2,
                separation: 3.0,
                roundness: 0.8,
                bgSpeed: 0.8,
                bgIntensity: 0.8,
                edge: 2.2,
                intensity: 2.5,
                zoom: 4.3,
                solidFill: false,
                depthLayers: false,
                showBackground: true,
                beatReactive: false,
                edgesBoost: false,
                bgBoost: false,
                animSpeedBoost: false,
                rotationBoost: false
            }
        });
        
        this.addPreset('rainbow', {
            name: 'Rainbow',
            values: {
                colorScheme: 4,
                colorMorph: true,
                colorMorphSpeed: 1.0,
                animationMorph: false,
                animationMorphSpeed: 1.0,
                speed: 1.0,
                rotation: 0,
                density: 1.5,
                complexity: 1.0,
                separation: 3.5,
                roundness: 0.5,
                bgSpeed: 1.2,
                bgIntensity: 0.6,
                edge: 1.8,
                intensity: 1.8,
                zoom: 4.0,
                solidFill: false,
                depthLayers: false,
                showBackground: true,
                beatReactive: false,
                edgesBoost: false,
                bgBoost: false,
                animSpeedBoost: false,
                rotationBoost: false
            }
        });
    }

    // Lifecycle method called after preset is loaded
    onPresetLoad(presetName, presetValues) {
        
        // CRITICAL: Reset all time accumulators to ensure consistent preset appearance
        // Without this, colors/animations vary based on when the preset is loaded
        this.time = 0;
        this.colorTime = 0;
        this.bgTime = 0;
        this.rotationTime = 0;
        this.animationMorphTime = 0;
        
        // CRITICAL FIX: Apply colorScheme to actually change colors between presets!
        this.colorScheme = presetValues.colorScheme !== undefined ? presetValues.colorScheme : this.colorScheme;
        
        // Reset base values to match the preset
        this.baseSpeed = presetValues.speed || this.speed;
        this.baseDensity = presetValues.density || this.density;
        this.baseRoundness = presetValues.roundness || this.roundness;
        this.baseSeparation = presetValues.separation || this.separation;
        this.baseBgSpeed = presetValues.bgSpeed || this.bgSpeed;
        this.baseBgIntensity = presetValues.bgIntensity || this.bgIntensity;
        this.baseEdge = presetValues.edge || this.edge;
        this.baseIntensity = presetValues.intensity || this.intensity;
        
    }

    // Toggle Methods - REMOVED (now using checkbox controls with onChange)

    onInitialize() {
        
        // Initialize WebGL2
        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,              // ✅ Enable alpha for transparency
            premultipliedAlpha: false,
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false
        });
        
        if (!this.gl) {
            return;
        }
        
        this.initShaders();
        
        // Enable blending for transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        this.resizeCanvas();
        
    }

    initShaders() {
        const gl = this.gl;
        
        const vertexShader = `#version 300 es
            in vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        const fragmentShader = `#version 300 es
            precision highp float;
            
            uniform vec2 resolution;
            uniform float time;
            uniform float colorTime;
            uniform float bgTime;
            uniform float rotationTime;
            uniform float speed;
            uniform float rotation;
            uniform float bgSpeed;
            uniform float bgIntensity;
            uniform float density;
            uniform float complexity;
            uniform float separation;
            uniform float roundness;
            uniform float edge;
            uniform float intensity;
            uniform int solidFill;
            uniform int depthLayers;
            uniform int sharpEdges;
            uniform int showBackground;
            uniform float zoom;
            uniform int colorScheme;
            
            out vec4 fragColor;
            
            #define PI 3.14159265359
            #define TAU 6.28318530718
            
            // Better hash functions
            float hash12(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }
            
            vec2 hash22(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.xx + p3.yz) * p3.zy);
            }
            
            // Smooth noise
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                
                // Quintic interpolation
                f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
                
                float a = hash12(i);
                float b = hash12(i + vec2(1.0, 0.0));
                float c = hash12(i + vec2(0.0, 1.0));
                float d = hash12(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            // Fractal Brownian Motion
            float fbm(vec2 p, int octaves) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for(int i = 0; i < 6; i++) {
                    if(i >= octaves) break;
                    value += amplitude * noise(p * frequency);
                    frequency *= 2.0;
                    amplitude *= 0.5;
                }
                
                return value;
            }
            
            // Domain warping
            vec2 warp(vec2 p, float amount) {
                vec2 q = vec2(
                    fbm(p + vec2(0.0, 0.0), 4),
                    fbm(p + vec2(5.2, 1.3), 4)
                );
                
                // Center the noise around 0 to prevent position shift
                q = (q - 0.5) * 2.0;
                
                return p + amount * q;
            }
            
            // Color palettes with proper gradients
            vec3 palette(float t, int scheme) {
                vec3 a, b, c, d;
                
                if(scheme == 0) {
                    // Acid Orange/Cyan
                    a = vec3(0.5, 0.5, 0.5);
                    b = vec3(0.5, 0.5, 0.5);
                    c = vec3(1.0, 1.0, 1.0);
                    d = vec3(0.0, 0.33, 0.67);
                } else if(scheme == 1) {
                    // Blue Soap Bubbles
                    a = vec3(0.5, 0.5, 0.5);
                    b = vec3(0.5, 0.5, 0.5);
                    c = vec3(1.0, 1.0, 0.5);
                    d = vec3(0.8, 0.9, 0.3);
                } else if(scheme == 2) {
                    // Red Lava
                    a = vec3(0.5, 0.5, 0.5);
                    b = vec3(0.5, 0.5, 0.5);
                    c = vec3(1.0, 0.7, 0.4);
                    d = vec3(0.0, 0.15, 0.20);
                } else if(scheme == 3) {
                    // Purple Dream
                    a = vec3(0.5, 0.5, 0.5);
                    b = vec3(0.5, 0.5, 0.5);
                    c = vec3(2.0, 1.0, 0.0);
                    d = vec3(0.5, 0.20, 0.25);
                } else {
                    // Rainbow
                    a = vec3(0.5, 0.5, 0.5);
                    b = vec3(0.5, 0.5, 0.5);
                    c = vec3(1.0, 1.0, 1.0);
                    d = vec3(0.0, 0.10, 0.20);
                }
                
                return a + b * cos(TAU * (c * t + d));
            }
            
            void main() {
                vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
                
                // Apply rotation
                if (rotationTime != 0.0) {
                    float angle = rotationTime * 0.1;
                    float s = sin(angle);
                    float c = cos(angle);
                    mat2 rot = mat2(c, -s, s, c);
                    uv = rot * uv;
                }
                
                uv *= zoom;
                
                // Separate time for different elements
                float t = time;
                float tColor = colorTime;
                float tBg = bgTime;
                
                // Domain warping for organic flow
                // Use complexity to control warp intensity, not UV scaling (fixes zoom bug)
                vec2 warpedUV = warp(uv, 0.3 * complexity);
                
                // Create metaball field with depth layering
                float field = 0.0;
                float depthMask = 0.0;
                
                // Multiple bubble layers with different sizes
                for(int layer = 0; layer < 3; layer++) {
                    float layerDepth = float(layer) / 3.0;
                    float layerOffset = float(layer) * 5.0;
                    
                    int bubblesInLayer = layer == 0 ? 40 : (layer == 1 ? 30 : 20);
                    
                    for(int i = 0; i < 40; i++) {
                        if(i >= bubblesInLayer) break;
                        
                        float fi = float(i);
                        float seed = fi + layerOffset;
                        
                        // Position based on time
                        float angle1 = t * 0.3 + seed * 2.0;
                        float angle2 = t * 0.25 + seed * 1.5 + 10.0;
                        float radius = 1.5;
                        
                        vec2 pos = vec2(
                            sin(angle1) * radius,
                            cos(angle2) * radius
                        );
                        
                        // Size variation
                        float size = 0.5 + 0.5 * sin(seed * 3.0 + t * 0.2);
                        
                        // Enhanced depth scaling for more pronounced 3D effect
                        float depthScale = 1.0;
                        if(depthLayers == 1) {
                            // More dramatic size difference between layers
                            depthScale = 1.0 - layerDepth * 0.6;
                        }
                        float finalSize = size * depthScale;
                        
                        float dist = length(warpedUV - pos);
                        float bubble = finalSize * density * 0.6 * exp(-dist * separation * 1.2);
                        field += bubble;
                        
                        // Accumulate depth mask with stronger weighting
                        if(depthLayers == 1) {
                            depthMask += bubble * (1.0 - layerDepth * 0.8);
                        }
                    }
                }
                
                // Smooth the field to eliminate banding
                field = smoothstep(0.0, 1.0, field);
                
                // Edge detection - support both smooth gradients and sharp edges
                float edgeThreshold = 0.35;
                float edgeWidth = (sharpEdges == 1) ? 0.02 : 0.12;
                
                // Edge transition (sharp or smooth based on toggle)
                float edge1 = smoothstep(edgeThreshold - edgeWidth, edgeThreshold, field) - 
                             smoothstep(edgeThreshold, edgeThreshold + edgeWidth, field);
                
                // Secondary edge for depth (also affected by sharp edges mode)
                float depthEdgeWidth = (sharpEdges == 1) ? 0.01 : 0.05;
                float edge2 = smoothstep(edgeThreshold + 0.15, edgeThreshold + 0.15 + depthEdgeWidth, field) - 
                             smoothstep(edgeThreshold + 0.15 + depthEdgeWidth, edgeThreshold + 0.15 + depthEdgeWidth * 2.0, field);
                
                float edgeMask = edge1 * 1.5 + edge2 * 0.3;
                
                // Base color with less noise variation (reduces cloudiness)
                float colorVal = field * 0.5 + fbm(warpedUV * 2.0 + tColor * 0.1, 3) * 0.08 + tColor * 0.03;
                
                // For solid fill: completely replace with solid color in interiors
                if(solidFill == 1) {
                    // Sharp cutoff - field > 0.35 gets solid color
                    float interiorMask = step(0.35, field); // Hard edge at 0.35
                    float solidColorVal = field * 0.6 + tColor * 0.03;
                    colorVal = mix(colorVal, solidColorVal, interiorMask);
                }
                
                vec3 baseColor = palette(colorVal, colorScheme);
                
                // Boost saturation smoothly for more solid colors
                float luminance = dot(baseColor, vec3(0.299, 0.587, 0.114));
                baseColor = mix(vec3(luminance), baseColor, intensity);
                
                // Create edge highlight color
                vec3 edgeColor = palette(colorVal + 0.15, colorScheme);
                edgeColor = mix(edgeColor, vec3(1.0), 0.4); // Bright white edges
                
                // Blend colors smoothly
                vec3 color = mix(baseColor, edgeColor, edgeMask * edge);
                
                // Interior effects (reduced for more solid appearance)
                if(solidFill == 0) {
                    // Lighter interior darkening for less smokey look
                    float interior = smoothstep(0.2, 0.6, field);
                    color = mix(color * 0.6, color, interior);
                    
                    // Reduced shimmer effect
                    float shimmer = fbm(warpedUV * 8.0 + tColor * 0.08, 2) * 0.08;
                    color += shimmer * field;
                } else {
                    // Solid fill: keep gradient for depth but cleaner
                    float interior = smoothstep(0.2, 0.6, field);
                    color = mix(color * 0.6, color, interior);
                    
                    // Minimal shimmer outside solid areas
                    float interiorMask = step(0.35, field);
                    float shimmer = fbm(warpedUV * 8.0 + tColor * 0.08, 2) * 0.06;
                    color += shimmer * field * (1.0 - interiorMask);
                }
                
                // Add background texture as subtle flowing patterns (if enabled)
                if (showBackground == 1) {
                    float bgTexture1 = fbm(uv * 2.0 + vec2(tBg * 0.6, tBg * 0.5), 3);
                    float bgTexture2 = fbm(uv * 3.5 - vec2(tBg * 0.4, tBg * 0.7), 2);
                    
                    // Combine textures with reduced intensity
                    float bgPattern = (bgTexture1 + bgTexture2 * 0.3 - 0.65) * 1.5;
                    
                    // Subtle flowing patterns
                    vec3 bgEffect = vec3(bgPattern * 0.08);
                    color += bgEffect * bgIntensity;
                }
                
                // Calculate alpha based on bubble presence
                float bubbleMask = smoothstep(0.0, 0.05, field);
                float alpha = 1.0;
                
                if (showBackground == 0) {
                    // Background OFF: Make non-bubble areas transparent
                    alpha = bubbleMask;
                }
                
                // Apply enhanced depth effect (bubbles behind others are darker with subtle highlights)
                if(depthLayers == 1) {
                    // Stronger darkening for back layers
                    float depthDarken = smoothstep(0.0, 0.5, depthMask) * 0.5;
                    color *= (1.0 - depthDarken);
                    
                    // Add subtle rim lighting on front layers for pop
                    float rimLight = (1.0 - depthMask) * 0.15 * field;
                    color += vec3(rimLight);
                }
                
                fragColor = vec4(color, alpha);
            }
        `;
        
        // Compile shaders
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexShader);
        gl.compileShader(vs);
        
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            return;
        }
        
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentShader);
        gl.compileShader(fs);
        
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            return;
        }
        
        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            return;
        }
        
        gl.useProgram(this.program);
        
        // Create geometry (fullscreen quad)
        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        
        const positionLoc = gl.getAttribLocation(this.program, 'position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        
        // Get uniform locations
        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'resolution'),
            time: gl.getUniformLocation(this.program, 'time'),
            colorTime: gl.getUniformLocation(this.program, 'colorTime'),
            bgTime: gl.getUniformLocation(this.program, 'bgTime'),
            rotationTime: gl.getUniformLocation(this.program, 'rotationTime'),
            speed: gl.getUniformLocation(this.program, 'speed'),
            rotation: gl.getUniformLocation(this.program, 'rotation'),
            bgSpeed: gl.getUniformLocation(this.program, 'bgSpeed'),
            bgIntensity: gl.getUniformLocation(this.program, 'bgIntensity'),
            density: gl.getUniformLocation(this.program, 'density'),
            complexity: gl.getUniformLocation(this.program, 'complexity'),
            separation: gl.getUniformLocation(this.program, 'separation'),
            roundness: gl.getUniformLocation(this.program, 'roundness'),
            edge: gl.getUniformLocation(this.program, 'edge'),
            intensity: gl.getUniformLocation(this.program, 'intensity'),
            solidFill: gl.getUniformLocation(this.program, 'solidFill'),
            depthLayers: gl.getUniformLocation(this.program, 'depthLayers'),
            sharpEdges: gl.getUniformLocation(this.program, 'sharpEdges'),
            showBackground: gl.getUniformLocation(this.program, 'showBackground'),
            zoom: gl.getUniformLocation(this.program, 'zoom'),
            colorScheme: gl.getUniformLocation(this.program, 'colorScheme')
        };
    }

    resizeCanvas() {
        if (!this.gl) return;

        // CRITICAL: Get dimensions from container, NOT from canvas.clientWidth
        // canvas.clientWidth returns CSS dimensions which may be wrong/0
        const container = document.getElementById('visualizationContainer');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight;

        // Set CSS size (what the browser displays)
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        // Set actual canvas buffer size (accounts for pixel ratio)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        // Update WebGL viewport
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    }

    onUpdate(deltaTime, timestamp, sharedAudioData) {
        // Update time based on speed
        this.time += deltaTime * 0.001 * this.speed;
        
        // Update bgTime based on bgSpeed
        this.bgTime += deltaTime * 0.001 * this.bgSpeed;
        
        // Update rotationTime based on rotation speed
        this.rotationTime += deltaTime * 0.001 * this.rotation;
        
        // Update colorTime if colorMorph is enabled
        if (this.colorMorph) {
            this.colorTime += deltaTime * 0.001 * this.colorMorphSpeed;
        }
        
        // Beat Reactivity - use MAL's sharedAudioData
        if (this.beatReactive && sharedAudioData && sharedAudioData.frequencies) {
            
            // Get frequency bands from MAL data
            this.frequencyBands = this.getFrequencyBands(sharedAudioData.frequencies);
            
            // Use MAL's energy data
            this.currentEnergy = sharedAudioData.energy || 0;
            
            // Smooth energy
            this.energyHistory.push(this.currentEnergy);
            if (this.energyHistory.length > 10) {
                this.energyHistory.shift();
            }
            this.smoothedEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
            
            // Beat detection - check if current energy significantly exceeds smoothed energy
            const currentTime = timestamp;
            const timeSinceLastBeat = currentTime - this.lastBeatTime;
            
            if (this.currentEnergy > this.smoothedEnergy * this.beatThreshold && timeSinceLastBeat > 100) {
                this.lastBeatTime = currentTime;
                this.beatDecay = 1.0; // Full intensity on beat
            }
            
            // Decay beat effect over time (fast decay for punchy feel)
            this.beatDecay *= 0.92; // Decays to near zero in about 300ms
            if (this.beatDecay < 0.01) this.beatDecay = 0;
        } else {
            // No beat reactive, decay to zero
            this.beatDecay *= 0.85;
            if (this.beatDecay < 0.01) this.beatDecay = 0;
        }
        
        // Animation Morph - use noise-based smooth random values
        if (this.animationMorph) {
            this.animationMorphTime += deltaTime * 0.001 * this.animationMorphSpeed;
            
            // Helper function for smooth noise (Perlin-like)
            const smoothNoise = (t, seed) => {
                const t0 = Math.floor(t);
                const t1 = t0 + 1;
                const frac = t - t0;
                
                // Smooth interpolation curve
                const curve = frac * frac * (3 - 2 * frac);
                
                // Pseudo-random values at integer points
                const hash = (n) => {
                    n = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453;
                    return n - Math.floor(n);
                };
                
                const val0 = hash(t0) * 2 - 1;
                const val1 = hash(t1) * 2 - 1;
                
                return val0 + (val1 - val0) * curve;
            };
            
            // Multi-octave noise for each parameter
            const t = this.animationMorphTime * 0.15;
            
            // Animation Speed: 0.5 to 7.5 range
            const speedNoise = smoothNoise(t * 1.3, 1.0) * 0.4 + 
                              smoothNoise(t * 2.7, 1.1) * 0.25 + 
                              smoothNoise(t * 5.1, 1.2) * 0.15;
            this.speed = Math.max(0.5, Math.min(7.5, this.baseSpeed + speedNoise * 3.5));
            
            // Density
            const densityNoise = smoothNoise(t * 1.1, 2.0) * 0.35 + 
                                smoothNoise(t * 2.3, 2.1) * 0.25 + 
                                smoothNoise(t * 4.7, 2.2) * 0.15;
            this.density = Math.max(0.5, Math.min(2.3, this.baseDensity + densityNoise));
            
            // Roundness
            const roundnessNoise = smoothNoise(t * 0.9, 3.0) * 0.3 + 
                                  smoothNoise(t * 2.1, 3.1) * 0.2 + 
                                  smoothNoise(t * 4.3, 3.2) * 0.15;
            this.roundness = Math.max(0.1, Math.min(1.8, this.baseRoundness + roundnessNoise));
            
            // Separation: VERY subtle to avoid pulsating
            const separationNoise = smoothNoise(t * 0.7, 4.0) * 0.4 + 
                                   smoothNoise(t * 1.9, 4.1) * 0.3 + 
                                   smoothNoise(t * 3.7, 4.2) * 0.2;
            this.separation = Math.max(2.5, Math.min(5.0, this.baseSeparation + separationNoise));
            
            // Background Speed
            const bgSpeedNoise = smoothNoise(t * 1.5, 5.0) * 0.4 + 
                                smoothNoise(t * 2.9, 5.1) * 0.3 + 
                                smoothNoise(t * 5.3, 5.2) * 0.2;
            this.bgSpeed = Math.max(0.3, Math.min(2.5, this.baseBgSpeed + bgSpeedNoise));
            
            // Background Intensity
            const bgIntensityNoise = smoothNoise(t * 1.2, 6.0) * 0.25 + 
                                    smoothNoise(t * 2.5, 6.1) * 0.2 + 
                                    smoothNoise(t * 4.9, 6.2) * 0.15;
            this.bgIntensity = Math.max(0.2, Math.min(1.5, this.baseBgIntensity + bgIntensityNoise));
            
            // Edge Brightness
            const edgeNoise = smoothNoise(t * 0.8, 7.0) * 0.5 + 
                             smoothNoise(t * 2.2, 7.1) * 0.4 + 
                             smoothNoise(t * 4.5, 7.2) * 0.3;
            this.edge = Math.max(0.8, Math.min(3.5, this.baseEdge + edgeNoise));
            
            // Color Intensity
            const intensityNoise = smoothNoise(t * 1.0, 8.0) * 0.35 + 
                                  smoothNoise(t * 2.4, 8.1) * 0.25 + 
                                  smoothNoise(t * 4.8, 8.2) * 0.2;
            this.intensity = Math.max(0.8, Math.min(2.5, this.baseIntensity + intensityNoise));
        }
        
        // Apply individual boost effects when Beat React is ON
        if (this.beatReactive) {
            // Normalized energy value (0-1 range) for smooth scaling
            const energyScale = Math.min(this.smoothedEnergy / 128, 1.0);
            
            // Edge Boost - more apparent effect based on energy
            if (this.edgesBoost) {
                const baseEdge = this.animationMorph ? this.edge : this.baseEdge;
                // Combine beat punch with sustained energy boost
                const edgeBoost = (this.beatDecay * 2.0) + (energyScale * 1.5);
                this.edge = baseEdge * (1 + edgeBoost);
            }
            
            // Background Speed/Intensity Boost
            if (this.bgBoost) {
                const baseBgSpeed = this.animationMorph ? this.bgSpeed : this.baseBgSpeed;
                const baseBgIntensity = this.animationMorph ? this.bgIntensity : this.baseBgIntensity;
                
                // Speed boost with beat reaction
                const bgSpeedBoost = (this.beatDecay * 1.5) + (energyScale * 1.2);
                this.bgSpeed = baseBgSpeed * (1 + bgSpeedBoost);
                
                // Intensity boost
                const bgIntensityBoost = (this.beatDecay * 0.8) + (energyScale * 0.6);
                this.bgIntensity = baseBgIntensity * (1 + bgIntensityBoost);
            }
            
            // Animation Speed Boost
            if (this.animSpeedBoost) {
                const baseSpeed = this.animationMorph ? this.speed : this.baseSpeed;
                // Strong beat reaction + sustained energy boost
                const speedBoost = (this.beatDecay * 3.0) + (energyScale * 1.5);
                this.speed = baseSpeed * (1 + speedBoost);
            }
            
            // Rotation Speed Boost
            if (this.rotationBoost) {
                const baseRotation = this.rotation;
                // Apply boost to rotation (can be positive or negative rotation)
                const rotationBoost = (this.beatDecay * 15.0) + (energyScale * 8.0);
                if (baseRotation !== 0) {
                    // Boost existing rotation in same direction
                    this.rotation = baseRotation > 0 ? 
                        baseRotation + rotationBoost : 
                        baseRotation - rotationBoost;
                } else {
                    // If no base rotation, create subtle energy-driven rotation
                    this.rotation = energyScale * 5.0;
                }
            }
        }
    }

    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.gl || !this.program) return;
        
        const gl = this.gl;
        
        // Set uniforms
        gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.time, this.time);
        gl.uniform1f(this.uniforms.colorTime, this.colorTime);
        gl.uniform1f(this.uniforms.bgTime, this.bgTime);
        gl.uniform1f(this.uniforms.rotationTime, this.rotationTime);
        gl.uniform1f(this.uniforms.speed, this.speed);
        gl.uniform1f(this.uniforms.rotation, this.rotation);
        gl.uniform1f(this.uniforms.bgSpeed, this.bgSpeed);
        gl.uniform1f(this.uniforms.bgIntensity, this.bgIntensity);
        gl.uniform1f(this.uniforms.density, this.density);
        gl.uniform1f(this.uniforms.complexity, this.complexity);
        gl.uniform1f(this.uniforms.separation, this.separation);
        gl.uniform1f(this.uniforms.roundness, this.roundness);
        gl.uniform1f(this.uniforms.edge, this.edge);
        gl.uniform1f(this.uniforms.intensity, this.intensity);
        gl.uniform1i(this.uniforms.solidFill, this.solidFill ? 1 : 0);
        gl.uniform1i(this.uniforms.depthLayers, this.depthLayers ? 1 : 0);
        gl.uniform1i(this.uniforms.sharpEdges, this.sharpEdges ? 1 : 0);
        gl.uniform1i(this.uniforms.showBackground, this.showBackground ? 1 : 0);
        gl.uniform1f(this.uniforms.zoom, this.zoom);
        gl.uniform1i(this.uniforms.colorScheme, this.colorScheme);
        
        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    onResize() {
        this.resizeCanvas();
    }

    onDestroy() {
        if (this.gl && this.program) {
            this.gl.deleteProgram(this.program);
        }
    }

    // Audio utility methods
    getFrequencyBands(frequencies) {
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
}

// Auto-register plugin
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new PsyquePlugin(window.visualizer);
    } else {
    }
}, 500);
