/**
 * VidTrip - Video feedback effects with scrolling textures and echoes
 * 
 * @version 1.0.0
 * @author Crash (Monkey) */

class VidTripPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('vidtrip', visualizer, {
            version: '1.0.0',
            author: 'Crash (Monkey)',
            description: 'Video feedback effects with scrolling textures and echoes',
            targetFPS: 60,
            dialFillColor: '--accent-color',
            credits: 'Video feedback FX by Crash Monkey. Trippy scrolling echoes for live video.'
        });
        
        // Initialize all control variables
        this.useOriginalTexture = false;
        this.scrollingSpeedX = -1.0;
        this.scrollingSpeedY = -1.0;
        this.timeScale = 0.1;
        this.textureScale = 1.0;
        
        this.bobbingHeight = 8.0;
        this.bobbingCycles = 0.4;
        this.bobbingOffset = 0.0;
        
        this.echoDistance = 35.0;
        this.echoCount = 2;
        this.echoFade = 0.25;
        this.echoStartAlpha = 0.8;
        this.echoTintAmount = 0.5;
        this.echoTintR = 1.0;
        this.echoTintG = 1.0;
        this.echoTintB = 1.0;
        this.echoTintA = 1.0;
        this.echoPulseBoth = false;
        this.echoDiagonalAngle = 45.0;
        this.echoBlendMode = 0; // 0 = Mix, 1 = Additive
        
        this.backLayerAlpha = 0.5;
        
        // Audio reactivity
        this.audioEchoDistanceSens = 0.0;
        this.audioBobbingSens = 0.0;
        this.audioScrollSpeedSens = 0.0;
        
        // Audio smoothing
        this.bassLevel = 0;
        this.midLevel = 0;
        this.trebleLevel = 0;
        this.energyLevel = 0;
        this.beatDetected = false;
        
        // WebGL state
        this.gl = null;
        this.shaderProgram = null;
        this.frameCount = 0;
        this.startTime = Date.now();
        this.noiseTexture = null;
        this.videoTexture = null;
        
        // Video feed reference
        this.videoElement = null;
        this.videoWidth = 1;
        this.videoHeight = 1;
        
        // Video scaling mode
        this.videoScaleMode = 'fit'; // 'fit' (letterbox) or 'fill' (crop)
        
        this.setupControls();
        this.setupPresets();
    }
    
    // Override onInit to set up WebGL
    onInit() {
        this.initializeWebGL();
    }
    
    setupControls() {
        // Texture selection
        this.addControl('useOriginalTexture', {
            type: 'checkbox',
            label: 'Use Original Video',
            className: 'btn-primary-mixer',
            value: false,
            onChange: (value) => { this.useOriginalTexture = value; }
        });
        
        // Video scale mode
        this.addControl('videoScaleMode', {
            type: 'dropdown',
            label: 'Video Scale',
            className: 'dropdown-selector-mixer',
            options: [
                { value: 'fit', label: 'Fit (Letterbox)' },
                { value: 'fill', label: 'Fill (Crop)' }
            ],
            value: 'fit',
            onChange: (value) => { this.videoScaleMode = value; }
        });
        
        // Scrolling controls
        this.addControl('scrollingSpeedX', {
            type: 'dial',
            label: 'Scroll Speed X',
            min: -300,
            max: 300,
            step: 1,
            value: -100,
            onChange: (value) => { this.scrollingSpeedX = value / 100; }
        });
        
        this.addControl('scrollingSpeedY', {
            type: 'dial',
            label: 'Scroll Speed Y',
            min: -300,
            max: 300,
            step: 1,
            value: -100,
            onChange: (value) => { this.scrollingSpeedY = value / 100; }
        });
        
        this.addControl('timeScale', {
            type: 'dial',
            label: 'Time Scale',
            min: 0,
            max: 200,
            step: 1,
            value: 10,
            onChange: (value) => { this.timeScale = value / 100; }
        });
        
        this.addControl('textureScale', {
            type: 'dial',
            label: 'Texture Scale',
            min: 10,
            max: 500,
            step: 1,
            value: 100,
            onChange: (value) => { this.textureScale = value / 100; }
        });
        
        // Bobbing controls
        this.addControl('bobbingHeight', {
            type: 'dial',
            label: 'Bobbing Height',
            min: 0,
            max: 20,
            step: 1,
            value: 8,
            onChange: (value) => { this.bobbingHeight = value; }
        });
        
        this.addControl('bobbingCycles', {
            type: 'dial',
            label: 'Bobbing Cycles',
            min: 0,
            max: 200,
            step: 1,
            value: 40,
            onChange: (value) => { this.bobbingCycles = value / 100; }
        });
        
        this.addControl('bobbingOffset', {
            type: 'dial',
            label: 'Bobbing Offset',
            min: 0,
            max: 628,
            step: 1,
            value: 0,
            onChange: (value) => { this.bobbingOffset = value / 100; }
        });
        
        // Echo controls
        this.addControl('echoDistance', {
            type: 'dial',
            label: 'Echo Distance',
            min: 0,
            max: 100,
            step: 1,
            value: 35,
            onChange: (value) => { this.echoDistance = value; }
        });
        
        this.addControl('echoCount', {
            type: 'dial',
            label: 'Echo Count',
            min: 1,
            max: 16,
            step: 1,
            value: 2,
            onChange: (value) => { this.echoCount = value; }
        });
        
        this.addControl('echoFade', {
            type: 'dial',
            label: 'Echo Fade',
            min: 0,
            max: 100,
            step: 1,
            value: 25,
            onChange: (value) => { this.echoFade = value / 100; }
        });
        
        this.addControl('echoStartAlpha', {
            type: 'dial',
            label: 'Echo Alpha',
            min: 0,
            max: 100,
            step: 1,
            value: 80,
            onChange: (value) => { this.echoStartAlpha = value / 100; }
        });
        
        this.addControl('echoTintAmount', {
            type: 'dial',
            label: 'Echo Tint Amount',
            min: 0,
            max: 100,
            step: 1,
            value: 50,
            onChange: (value) => { this.echoTintAmount = value / 100; }
        });
        
        this.addControl('echoTintR', {
            type: 'dial',
            label: 'Echo Tint R',
            min: 0,
            max: 100,
            step: 1,
            value: 100,
            onChange: (value) => { this.echoTintR = value / 100; }
        });
        
        this.addControl('echoTintG', {
            type: 'dial',
            label: 'Echo Tint G',
            min: 0,
            max: 100,
            step: 1,
            value: 100,
            onChange: (value) => { this.echoTintG = value / 100; }
        });
        
        this.addControl('echoTintB', {
            type: 'dial',
            label: 'Echo Tint B',
            min: 0,
            max: 100,
            step: 1,
            value: 100,
            onChange: (value) => { this.echoTintB = value / 100; }
        });
        
        this.addControl('echoTintA', {
            type: 'dial',
            label: 'Echo Tint A',
            min: 0,
            max: 100,
            step: 1,
            value: 100,
            onChange: (value) => { this.echoTintA = value / 100; }
        });
        
        this.addControl('echoPulseBoth', {
            type: 'checkbox',
            label: 'Pulse Both Ways',
            className: 'btn-primary-mixer',
            value: false,
            onChange: (value) => { this.echoPulseBoth = value; }
        });
        
        this.addControl('echoDiagonalAngle', {
            type: 'dial',
            label: 'Echo Angle',
            min: 0,
            max: 360,
            step: 1,
            value: 45,
            onChange: (value) => { this.echoDiagonalAngle = value; }
        });
        
        this.addControl('echoBlendMode', {
            type: 'dropdown',
            label: 'Echo Blend Mode',
            className: 'dropdown-selector-mixer',
            options: [
                { value: '0', label: 'Mix' },
                { value: '1', label: 'Additive' }
            ],
            value: '0',
            onChange: (value) => { this.echoBlendMode = parseInt(value); }
        });
        
        // Back layer
        this.addControl('backLayerAlpha', {
            type: 'dial',
            label: 'Back Layer Alpha',
            min: 0,
            max: 100,
            step: 1,
            value: 50,
            onChange: (value) => { this.backLayerAlpha = value / 100; }
        });
        
        // Audio reactivity
        this.addControl('audioEchoDistanceSens', {
            type: 'dial',
            label: 'Audio Echo Sens',
            min: 0,
            max: 100,
            step: 1,
            value: 0,
            onChange: (value) => { this.audioEchoDistanceSens = value / 100; }
        });
        
        this.addControl('audioBobbingSens', {
            type: 'dial',
            label: 'Audio Bobbing Sens',
            min: 0,
            max: 100,
            step: 1,
            value: 0,
            onChange: (value) => { this.audioBobbingSens = value / 100; }
        });
        
        this.addControl('audioScrollSpeedSens', {
            type: 'dial',
            label: 'Audio Scroll Sens',
            min: 0,
            max: 100,
            step: 1,
            value: 0,
            onChange: (value) => { this.audioScrollSpeedSens = value / 100; }
        });
    }
    
    setupPresets() {
        this.addPreset('Default', {
            scrollingSpeedX: -100,
            scrollingSpeedY: -100,
            timeScale: 10,
            bobbingHeight: 8,
            echoDistance: 35,
            echoCount: 2
        });
        
        this.addPreset('Intense Trip', {
            scrollingSpeedX: -200,
            scrollingSpeedY: -200,
            timeScale: 20,
            bobbingHeight: 15,
            echoDistance: 50,
            echoCount: 8,
            echoFade: 15,
            audioEchoDistanceSens: 50
        });
        
        this.addPreset('Slow Float', {
            scrollingSpeedX: -30,
            scrollingSpeedY: -30,
            timeScale: 5,
            bobbingHeight: 4,
            bobbingCycles: 20,
            echoDistance: 20,
            echoCount: 4,
            echoFade: 40
        });
        
        this.addPreset('Diagonal Rush', {
            scrollingSpeedX: 150,
            scrollingSpeedY: -150,
            timeScale: 30,
            echoDiagonalAngle: 135,
            echoDistance: 60,
            echoCount: 6,
            echoPulseBoth: true
        });
        
        this.addPreset('Audio Reactive', {
            audioEchoDistanceSens: 80,
            audioBobbingSens: 60,
            audioScrollSpeedSens: 50,
            echoCount: 10,
            echoDistance: 40
        });
    }
    
    // Prevent base class from clearing our WebGL canvas
    shouldClearCanvas() {
        return false;
    }
    
    // Override onInitialize - called by base class when plugin is ready
    onInitialize() {
        this.initializeWebGL();
    }
    
    initializeWebGL() {
        if (this.gl) return; // Already initialized
        
        // Get WebGL2 context
        this.gl = this.canvas.getContext('webgl2', {
            alpha: false,  // Make canvas opaque, no transparency
            premultipliedAlpha: false,
            preserveDrawingBuffer: true
        });
        
        if (!this.gl) {
            console.error('VidTrip: WebGL2 not supported');
            return;
        }
        
        const gl = this.gl;
        
        // Get reference to video element
        try {
            if (this.visualizer && typeof this.visualizer.getVideoElement === 'function') {
                this.videoElement = this.visualizer.getVideoElement();
            }
        } catch (e) {
            console.warn('VidTrip: Could not get video element:', e.message);
        }
        
        if (!this.videoElement) {
            // Try alternative methods to get video
            const videoEl = document.querySelector('video');
            if (videoEl) {
                this.videoElement = videoEl;
                console.log('VidTrip: Found video element via querySelector');
            } else {
                console.warn('VidTrip: No video element found, plugin will use noise textures only');
            }
        }
        
        // Load noise texture
        this.loadNoiseTexture();
        
        // Create video texture (iChannel0)
        // Shadertoy settings: Linear, Clamp, VFlip ON
        this.videoTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // Initialize with empty data
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
        
        // Create vertex buffer
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        const verts = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
        
        // Compile shader
        this.shaderProgram = this.compileShaderProgram();
        
        if (!this.shaderProgram) {
            console.error('VidTrip: Failed to compile shader program');
        }
    }
    
    loadNoiseTexture() {
        const gl = this.gl;
        this.noiseTexture = gl.createTexture();
        
        // Create smooth, low-contrast noise to match the uploaded texture
        // Shadertoy settings: MipMap, Repeat, VFlip ON
        const size = 512;
        const data = new Uint8Array(size * size * 4);
        
        // Generate smoother Perlin-like noise with lower contrast
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = (y * size + x) * 4;
                
                // Create smoother noise by averaging nearby random values
                let sum = 0;
                let count = 0;
                const radius = 2;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        sum += Math.random();
                        count++;
                    }
                }
                
                // Low contrast: map to 100-155 range instead of 0-255
                const value = 100 + (sum / count) * 55;
                
                data[i + 0] = value;
                data[i + 1] = value;
                data[i + 2] = value;
                data[i + 3] = 255;
            }
        }
        
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // VFlip ON - flip texture vertically like Shadertoy
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }
    
    compileShaderProgram() {
        const gl = this.gl;
        
        const vertSrc = `#version 300 es
            in vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        const fragSrc = `#version 300 es
            precision highp float;
            
            #define PI 3.14159265359
            
            uniform float iTime;
            uniform vec2 iResolution;
            uniform vec2 iVideoResolution; // Video native dimensions
            uniform int iVideoScaleMode; // 0 = fit (letterbox), 1 = fill (crop)
            uniform sampler2D iChannel0; // Video input
            uniform sampler2D iChannel1; // Noise texture (scrolling)
            uniform sampler2D iChannel2; // Noise texture (back layer)
            
            // Shader parameters
            uniform int USE_ORIGINAL_TEXTURE;
            uniform vec2 SCROLLING_SPEED;
            uniform float TIME_SCALE;
            uniform float TEXTURE_SCALE;
            uniform float HEIGHT;
            uniform float CYCLES;
            uniform float OFFSET;
            uniform float DISTANCE;
            uniform int COUNT;
            uniform float FADE;
            uniform float START_ALPHA;
            uniform float TINT_AMOUNT;
            uniform vec4 TINT;
            uniform bool PULSE_BOTH;
            uniform float DIAGONAL_ANGLE;
            uniform int BLEND_MODE;
            uniform float BACK_LAYER_ALPHA;
            
            out vec4 fragColor;
            
            // ASPECT RATIO CORRECTION
            vec2 correctAspectRatio(vec2 uv) {
                float canvasAspect = iResolution.x / iResolution.y;
                float videoAspect = iVideoResolution.x / iVideoResolution.y;
                
                if (iVideoScaleMode == 0) {
                    // Fit mode (letterbox) - ensure entire video is visible
                    if (canvasAspect > videoAspect) {
                        // Canvas is wider than video
                        float scale = canvasAspect / videoAspect;
                        uv.x = (uv.x - 0.5) * scale + 0.5;
                    } else {
                        // Canvas is taller than video
                        float scale = videoAspect / canvasAspect;
                        uv.y = (uv.y - 0.5) * scale + 0.5;
                    }
                } else {
                    // Fill mode (crop) - fill canvas, may crop video
                    if (canvasAspect > videoAspect) {
                        // Canvas is wider than video
                        float scale = videoAspect / canvasAspect;
                        uv.y = (uv.y - 0.5) * scale + 0.5;
                    } else {
                        // Canvas is taller than video
                        float scale = canvasAspect / videoAspect;
                        uv.x = (uv.x - 0.5) * scale + 0.5;
                    }
                }
                
                return uv;
            }
            
            // MONOCHROME + THRESHOLD
            vec4 toMonoAndAlpha(vec4 c) {
                float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                float a = lum >= 0.5 ? 1.0 : 0.0;
                return vec4(vec3(lum), a);
            }
            
            // SCROLLING UV
            vec2 scrollingUV(vec2 uv, vec2 pixel, float t, float speedFactor) {
                vec2 T = SCROLLING_SPEED * t * TIME_SCALE * speedFactor;
                vec2 texSize = vec2(textureSize(iChannel1, 0));
                vec2 repeats = (1.0 / pixel) / texSize;
                return (uv * repeats + T) / TEXTURE_SCALE;
            }
            
            // FRONT LAYER ECHOES
            vec4 renderEchoes(vec2 baseUV, vec2 scrollUV, vec2 pixelSize, float bob) {
                vec4 accum = vec4(0.0);
                
                float rad = radians(DIAGONAL_ANGLE);
                vec2 dir = vec2(cos(rad), sin(rad));
                
                float decay = 1.0 - FADE;
                float invCount = 1.0 / max(1.0, float(COUNT));
                
                vec3 premixScroll = texture(iChannel1, scrollUV).rgb;
                
                for (int i = 1; i <= 16; i++) {
                    if (i > COUNT) break;
                    
                    float alpha = (i == 1)
                        ? START_ALPHA
                        : START_ALPHA * pow(decay, float(i - 1));
                    
                    if (alpha <= 0.0) break;
                    
                    float f = float(i) * invCount;
                    vec3 tintColor = mix(vec3(1.0), TINT.rgb, f * TINT_AMOUNT);
                    
                    float offsetPx = bob * DISTANCE * float(i) * pixelSize.x;
                    
                    int loops = (PULSE_BOTH ? 2 : 1);
                    
                    for (int j = 0; j < loops; j++) {
                        vec2 disp = dir * (j == 0 ? offsetPx : -offsetPx);
                        vec2 duv = baseUV - disp;
                        
                        vec4 src = texture(iChannel0, duv);
                        src = toMonoAndAlpha(src);
                        
                        vec4 col;
                        if (USE_ORIGINAL_TEXTURE == 1) {
                            col = src;
                        } else {
                            col = vec4(premixScroll * src.a, src.a);
                        }
                        
                        col.rgb *= tintColor;
                        col.a *= (TINT.a * alpha);
                        
                        if (BLEND_MODE == 0) {
                            accum = mix(accum, col, col.a);
                        } else {
                            accum.rgb += col.rgb * col.a;
                            accum.a = min(1.0, accum.a + col.a);
                        }
                    }
                }
                
                return accum;
            }
            
            // BACK LAYER WITH TILING + SMOOTH CORNER GRADIENT
            vec4 renderBackLayer(vec2 uv, vec2 pixel, float t) {
                vec2 texSize = vec2(textureSize(iChannel2, 0));
                vec2 repeats = (1.0 / pixel) / texSize;
                vec2 scrollUV = uv * repeats + SCROLLING_SPEED * 0.2 * t * TIME_SCALE;
                
                vec4 tex = texture(iChannel2, scrollUV);
                
                float wGrad = 1.0 / 20.0;
                float gradX = smoothstep(0.0, wGrad, uv.x) * smoothstep(0.0, wGrad, 1.0 - uv.x);
                float gradY = smoothstep(0.0, wGrad, uv.y) * smoothstep(0.0, wGrad, 1.0 - uv.y);
                float cornerGrad = gradX * gradY;
                
                float alpha = BACK_LAYER_ALPHA * cornerGrad;
                
                return vec4(tex.rgb, alpha);
            }
            
            // MAIN SHADER
            void main() {
                vec2 res = iResolution.xy;
                vec2 uv = gl_FragCoord.xy / res;
                vec2 pixel = 1.0 / res;
                float t = iTime;
                
                // Apply aspect ratio correction for video sampling
                vec2 videoUV = correctAspectRatio(uv);
                
                float bob = sin(2.0 * PI * CYCLES * t + OFFSET);
                
                vec2 scUV = scrollingUV(uv, pixel, t, 1.0);
                
                // Use corrected UV for video sampling
                vec4 mainCol = toMonoAndAlpha(texture(iChannel0, videoUV));
                vec3 scrollRGB = texture(iChannel1, scUV).rgb;
                vec4 mixedMain = (USE_ORIGINAL_TEXTURE == 1)
                    ? mainCol
                    : vec4(scrollRGB * mainCol.a, mainCol.a);
                
                // Use corrected UV for echoes
                vec4 echoCol = renderEchoes(videoUV, scUV, pixel, bob);
                vec4 frontCol = mix(echoCol, mixedMain, mixedMain.a);
                
                vec4 backCol = renderBackLayer(uv, pixel, t);
                vec4 testCol = vec4(0.0, 0.0, 0.0, 0.0);
                vec4 temp = mix(testCol, backCol, backCol.a);
                
                fragColor = mix(temp, frontCol, frontCol.a);
            }
        `;
        
        const vs = gl.createShader(gl.VERTEX_SHADER);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        
        gl.shaderSource(vs, vertSrc);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('VidTrip vertex shader error:', gl.getShaderInfoLog(vs));
            return null;
        }
        
        gl.shaderSource(fs, fragSrc);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('VidTrip fragment shader error:', gl.getShaderInfoLog(fs));
            return null;
        }
        
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('VidTrip program link error:', gl.getProgramInfoLog(prog));
            return null;
        }
        
        return prog;
    }
    
    onResize() {
        // Canvas is automatically resized by the base class
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        const smoothing = 0.7;
        this.bassLevel = this.bassLevel * smoothing + (sharedAudioData.bass || 0) * (1 - smoothing);
        this.midLevel = this.midLevel * smoothing + (sharedAudioData.mid || 0) * (1 - smoothing);
        this.trebleLevel = this.trebleLevel * smoothing + (sharedAudioData.treble || 0) * (1 - smoothing);
        this.energyLevel = this.energyLevel * smoothing + (sharedAudioData.energy || 0) * (1 - smoothing);
        this.beatDetected = sharedAudioData.beat || false;
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.gl || !this.shaderProgram) {
            console.warn('VidTrip: Render called but gl context or shader is null');
            return;
        }
        
        // Try to get video element if we don't have it yet
        if (!this.videoElement) {
            try {
                if (this.visualizer && typeof this.visualizer.getVideoElement === 'function') {
                    this.videoElement = this.visualizer.getVideoElement();
                }
            } catch (e) {
                // Silently fail - already logged in init
            }
            
            // Try querySelector as fallback
            if (!this.videoElement) {
                const videoEl = document.querySelector('video');
                if (videoEl) {
                    this.videoElement = videoEl;
                }
            }
        }
        
        const gl = this.gl;
        const time = (Date.now() - this.startTime) / 1000;
        
        // Update video texture and track dimensions
        if (this.videoElement && this.videoElement.readyState >= this.videoElement.HAVE_CURRENT_DATA) {
            try {
                // Update video dimensions if they've changed
                if (this.videoElement.videoWidth > 0 && this.videoElement.videoHeight > 0) {
                    this.videoWidth = this.videoElement.videoWidth;
                    this.videoHeight = this.videoElement.videoHeight;
                }
                
                gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
                // VFlip ON - flip texture vertically like Shadertoy
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.videoElement);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            } catch (e) {
                console.warn('VidTrip: Failed to update video texture:', e.message);
            }
        }
        
        // Audio-reactive modulation
        const audioEchoDistance = this.echoDistance * (1 + this.energyLevel * this.audioEchoDistanceSens);
        const audioBobbingHeight = this.bobbingHeight * (1 + this.bassLevel * this.audioBobbingSens);
        const audioTimeScale = this.timeScale * (1 + this.energyLevel * this.audioScrollSpeedSens);
        
        // Render
        gl.useProgram(this.shaderProgram);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Clear with solid black background (opaque)
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        const pos = gl.getAttribLocation(this.shaderProgram, 'position');
        gl.enableVertexAttribArray(pos);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        
        // Set uniforms
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'iTime'), time);
        gl.uniform2f(gl.getUniformLocation(this.shaderProgram, 'iResolution'), this.canvas.width, this.canvas.height);
        
        // Video aspect ratio correction uniforms
        gl.uniform2f(gl.getUniformLocation(this.shaderProgram, 'iVideoResolution'), this.videoWidth, this.videoHeight);
        gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'iVideoScaleMode'), this.videoScaleMode === 'fill' ? 1 : 0);
        
        gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'USE_ORIGINAL_TEXTURE'), this.useOriginalTexture ? 1 : 0);
        gl.uniform2f(gl.getUniformLocation(this.shaderProgram, 'SCROLLING_SPEED'), this.scrollingSpeedX, this.scrollingSpeedY);
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'TIME_SCALE'), audioTimeScale);
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'TEXTURE_SCALE'), this.textureScale);
        
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'HEIGHT'), audioBobbingHeight);
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'CYCLES'), this.bobbingCycles);
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'OFFSET'), this.bobbingOffset);
        
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'DISTANCE'), audioEchoDistance);
        gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'COUNT'), this.echoCount);
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'FADE'), this.echoFade);
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'START_ALPHA'), this.echoStartAlpha);
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'TINT_AMOUNT'), this.echoTintAmount);
        gl.uniform4f(gl.getUniformLocation(this.shaderProgram, 'TINT'), 
            this.echoTintR, this.echoTintG, this.echoTintB, this.echoTintA);
        gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'PULSE_BOTH'), this.echoPulseBoth ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'DIAGONAL_ANGLE'), this.echoDiagonalAngle);
        gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'BLEND_MODE'), this.echoBlendMode);
        
        gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'BACK_LAYER_ALPHA'), this.backLayerAlpha);
        
        // Bind textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
        gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'iChannel0'), 0);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
        gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'iChannel1'), 1);
        
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
        gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'iChannel2'), 2);
        
        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        gl.flush();
        
        this.frameCount++;
    }
    
    onCleanup() {
        if (!this.gl) return;
        const gl = this.gl;
        if (this.shaderProgram) gl.deleteProgram(this.shaderProgram);
        if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
        if (this.videoTexture) gl.deleteTexture(this.videoTexture);
        if (this.noiseTexture) gl.deleteTexture(this.noiseTexture);
    }
}

setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new VidTripPlugin(window.visualizer);
    }
}, 500);
