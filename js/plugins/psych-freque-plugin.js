/**
 * PSYCH - Professional Liquid Bubble Visualizer Plugin for Freque
 * Version: 1.0.0
 * Author: Freque Team
 * 
 * WebGL2-based shader visualization with smooth noise-driven animation morphing
 * and comprehensive audio reactivity.
 */

class PsychPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('psych', visualizer, {
            version: '1.0.0',
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
        this.baseDensity = 1.5;
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
        
        this.setupControls();
        this.setupPresets();
    }

    setupControls() {
        // Color Scheme Dropdown
        this.addControl('colorScheme', {
            type: 'dropdown',
            label: 'Color Scheme',
            options: this.colorSchemes.map(s => ({ value: s.id, label: s.name })),
            value: 0,
            onChange: (value) => {
                this.colorScheme = parseInt(value);
            }
        });
        
        // Color Morph Toggle
        this.colorMorph = false;
        this.addControl('colorMorph', {
            type: 'button',
            label: 'Color Morph: OFF',
            onChange: (value) => {
                this.colorMorph = value;
                const btn = document.querySelector(`[data-control="colorMorph"]`);
                if (btn) {
                    btn.textContent = value ? 'Color Morph: ON' : 'Color Morph: OFF';
                }
            }
        });
        
        // Color Morph Speed
        this.colorMorphSpeed = 1.0;
        this.addControl('colorMorphSpeed', {
            type: 'dropdown',
            label: 'Color Morph Speed',
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
            type: 'button',
            label: 'Animation Morph: OFF',
            onChange: (value) => {
                this.animationMorph = value;
                const btn = document.querySelector(`[data-control="animationMorph"]`);
                if (btn) {
                    btn.textContent = value ? 'Animation Morph: ON' : 'Animation Morph: OFF';
                }
            }
        });
        
        // Animation Morph Speed
        this.animationMorphSpeed = 1.0;
        this.addControl('animationMorphSpeed', {
            type: 'dropdown',
            label: 'Animation Morph Speed',
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
            type: 'slider',
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
            type: 'slider',
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
        this.density = 1.5;
        this.addControl('density', {
            type: 'slider',
            label: 'Bubble Density',
            min: 0.3,
            max: 2.5,
            step: 0.1,
            value: 1.5,
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
            type: 'slider',
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
            type: 'slider',
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
            type: 'slider',
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
            type: 'slider',
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
            type: 'slider',
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
        
        // Edge Brightness
        this.edge = 1.5;
        this.addControl('edge', {
            type: 'slider',
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
            type: 'slider',
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
            type: 'slider',
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
            type: 'button',
            label: 'Solid Interior: OFF',
            onChange: (value) => {
                this.solidFill = value;
                const btn = document.querySelector(`[data-control="solidFill"]`);
                if (btn) {
                    btn.textContent = value ? 'Solid Interior: ON' : 'Solid Interior: OFF';
                }
            }
        });
        
        // Depth Layers Toggle
        this.depthLayers = false;
        this.addControl('depthLayers', {
            type: 'button',
            label: 'Depth Layers: OFF',
            onChange: (value) => {
                this.depthLayers = value;
                const btn = document.querySelector(`[data-control="depthLayers"]`);
                if (btn) {
                    btn.textContent = value ? 'Depth Layers: ON' : 'Depth Layers: OFF';
                }
            }
        });
        
        // Audio Reactivity
        this.audioReactive = true;
        this.addControl('audioReactive', {
            type: 'button',
            label: 'Audio Reactive: ON',
            onChange: (value) => {
                this.audioReactive = value;
                const btn = document.querySelector(`[data-control="audioReactive"]`);
                if (btn) {
                    btn.textContent = value ? 'Audio Reactive: ON' : 'Audio Reactive: OFF';
                }
            }
        });
    }

    setupPresets() {
        this.addPreset('default', {
            name: 'Acid Orange/Cyan',
            values: {
                colorScheme: 0,
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
                zoom: 4.0
            }
        });
        
        this.addPreset('soap', {
            name: 'Blue Bubbles',
            values: {
                colorScheme: 1,
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
                zoom: 4.5
            }
        });
        
        this.addPreset('lava', {
            name: 'Red Lava',
            values: {
                colorScheme: 2,
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
                zoom: 4.8
            }
        });
        
        this.addPreset('dream', {
            name: 'Purple Dream',
            values: {
                colorScheme: 3,
                speed: 1.0,
                rotation: 0,
                density: 1.1,
                complexity: 1.5,
                separation: 2.5,
                roundness: 1.2,
                bgSpeed: 0.8,
                bgIntensity: 0.8,
                edge: 2.2,
                intensity: 2.5,
                zoom: 4.3
            }
        });
    }

    onInitialize() {
        console.log('PSYCH Plugin initializing...');
        
        // Initialize WebGL2
        this.gl = this.canvas.getContext('webgl2', {
            alpha: false,
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false
        });
        
        if (!this.gl) {
            console.error('WebGL2 not supported!');
            return;
        }
        
        this.initShaders();
        this.resizeCanvas();
        
        console.log('PSYCH Plugin initialized successfully');
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
                vec2 warpedUV = warp(uv * complexity, 0.3);
                
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
                        
                        // Depth scaling
                        float depthScale = 1.0;
                        if(depthLayers == 1) {
                            depthScale = 1.0 - layerDepth * 0.3;
                        }
                        float finalSize = size * depthScale;
                        
                        float dist = length(warpedUV - pos);
                        float bubble = finalSize * density * 0.6 * exp(-dist * separation * 1.2);
                        field += bubble;
                        
                        // Accumulate depth mask
                        if(depthLayers == 1) {
                            depthMask += bubble * (1.0 - layerDepth * 0.5);
                        }
                    }
                }
                
                // Smooth the field to eliminate banding
                field = smoothstep(0.0, 1.0, field);
                
                // Edge detection with smooth gradients (no banding)
                float edgeThreshold = 0.35;
                float edgeWidth = 0.12;
                
                // Smooth edge transition
                float edge1 = smoothstep(edgeThreshold - edgeWidth, edgeThreshold, field) - 
                             smoothstep(edgeThreshold, edgeThreshold + edgeWidth, field);
                
                // Secondary edge for depth
                float edge2 = smoothstep(edgeThreshold + 0.15, edgeThreshold + 0.2, field) - 
                             smoothstep(edgeThreshold + 0.2, edgeThreshold + 0.25, field);
                
                float edgeMask = edge1 * 1.5 + edge2 * 0.3;
                
                // Base color with variation
                float colorVal = field * 0.3 + fbm(warpedUV * 2.0 + tColor * 0.1, 3) * 0.2 + tColor * 0.03;
                
                // For solid fill: completely replace with solid color in interiors
                if(solidFill == 1) {
                    // Sharp cutoff - field > 0.35 gets solid color
                    float interiorMask = step(0.35, field); // Hard edge at 0.35
                    float solidColorVal = field * 0.5 + tColor * 0.03;
                    colorVal = mix(colorVal, solidColorVal, interiorMask);
                }
                
                vec3 baseColor = palette(colorVal, colorScheme);
                
                // Boost saturation smoothly
                float luminance = dot(baseColor, vec3(0.299, 0.587, 0.114));
                baseColor = mix(vec3(luminance), baseColor, intensity);
                
                // Create edge highlight color
                vec3 edgeColor = palette(colorVal + 0.15, colorScheme);
                edgeColor = mix(edgeColor, vec3(1.0), 0.4); // Bright white edges
                
                // Blend colors smoothly
                vec3 color = mix(baseColor, edgeColor, edgeMask * edge);
                
                // Interior effects
                if(solidFill == 0) {
                    // Smooth interior gradient (creates depth)
                    float interior = smoothstep(0.2, 0.6, field);
                    color = mix(color * 0.4, color, interior);
                    
                    // Add subtle iridescent shimmer
                    float shimmer = fbm(warpedUV * 8.0 + tColor * 0.08, 3) * 0.15;
                    color += shimmer * field;
                } else {
                    // Solid fill: keep gradient for depth
                    float interior = smoothstep(0.2, 0.6, field);
                    color = mix(color * 0.4, color, interior);
                    
                    // Hard cutoff - no shimmer where field > 0.35
                    float interiorMask = step(0.35, field);
                    float shimmer = fbm(warpedUV * 8.0 + tColor * 0.08, 3) * 0.15;
                    color += shimmer * field * (1.0 - interiorMask);
                }
                
                // Add background texture as visible flowing patterns
                float bgTexture1 = fbm(uv * 2.0 + vec2(tBg * 0.6, tBg * 0.5), 4);
                float bgTexture2 = fbm(uv * 3.5 - vec2(tBg * 0.4, tBg * 0.7), 3);
                
                // Combine textures and normalize to -1 to 1 range
                float bgPattern = (bgTexture1 + bgTexture2 * 0.5 - 0.75) * 2.0;
                
                // Create visible flowing patterns that don't change overall brightness
                vec3 bgEffect = vec3(bgPattern * 0.15);
                color += bgEffect * bgIntensity;
                
                // Apply depth darkening (bubbles behind others are darker)
                if(depthLayers == 1) {
                    float depthDarken = smoothstep(0.0, 0.5, depthMask) * 0.3;
                    color *= (1.0 - depthDarken);
                }
                
                fragColor = vec4(color, 1.0);
            }
        `;
        
        // Compile shaders
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexShader);
        gl.compileShader(vs);
        
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
            return;
        }
        
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentShader);
        gl.compileShader(fs);
        
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
            return;
        }
        
        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
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
            zoom: gl.getUniformLocation(this.program, 'zoom'),
            colorScheme: gl.getUniformLocation(this.program, 'colorScheme')
        };
    }

    resizeCanvas() {
        if (!this.gl) return;
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.canvas.clientWidth * dpr;
        this.canvas.height = this.canvas.clientHeight * dpr;
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
        
        // Audio reactivity
        if (this.audioReactive && sharedAudioData) {
            this.frequencyBands = this.getFrequencyBands(sharedAudioData.frequencies);
            this.currentEnergy = this.getAudioEnergy();
            
            // Smooth energy
            this.energyHistory.push(this.currentEnergy);
            if (this.energyHistory.length > 10) {
                this.energyHistory.shift();
            }
            this.smoothedEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
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
        
        // Audio-driven effects
        if (this.audioReactive && this.frequencyBands) {
            // Boost density with bass
            const audioDensity = this.animationMorph ? this.density : this.baseDensity;
            this.density = audioDensity * (1 + this.frequencyBands.bass * 0.5);
            
            // Boost edge brightness with treble
            const audioEdge = this.animationMorph ? this.edge : this.baseEdge;
            this.edge = audioEdge * (1 + this.frequencyBands.treble * 0.3);
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
    getAudioEnergy() {
        if (!this.analyser) return 0;
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] / 255;
        }
        
        return sum / dataArray.length;
    }

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
        console.log('Registering PSYCH Plugin...');
        new PsychPlugin(window.visualizer);
    } else {
        console.error('Freque visualizer not found. Make sure FrequePluginBase is loaded.');
    }
}, 500);
