/**
 * Fraqtels - Audio-reactive fractal visualization with feedback effects
 * 
 * @version 1.0.1
 * @author Steve (CrashMonkeys)
 */

class FraqtelsPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('fraqtels', visualizer, {
            version: '1.0.1',
            author: 'Steve (CrashMonkeys)',
            description: 'Audio-reactive fractal visualization with feedback effects',
            targetFPS: 60,
            dialFillColor: '--accent-color'
        });
        
        // Initialize all control variables
        this.flashIntensity = 0.4;
        this.feedbackAmount = 0.3;
        this.blurIntensity = 0.01;
        this.blurFalloff = 1.3;
        this.rotationSpeed = 1.0;
        this.timeScale = 1.0;
        this.zoom = 1.0;
        this.movementRange = 0.15;
        this.fractalIterations = 7;
        this.colorScheme = 0;
        
        // Audio reactivity sensitivity
        this.bassFlashSensitivity = 0.8;
        this.midSpeedSensitivity = 0.8;
        this.trebleRotationSensitivity = 0.8;
        this.trebleDetailSensitivity = 0.5;
        
        // Audio smoothing - MUST initialize to 0
        this.bassLevel = 0;
        this.midLevel = 0;
        this.trebleLevel = 0;
        
        // WebGL state
        this.gl = null;
        this.bufferAProgram = null;
        this.imageProgram = null;
        this.frameCount = 0;
        this.startTime = Date.now();
        
        this.setupControls();
        this.setupPresets();
    }
    
    setupControls() {
        this.addControl('flashIntensity', {
            type: 'dial',
            label: 'Flash Intensity',
            min: 0,
            max: 100,
            step: 1,
            value: 40,
            onChange: (value) => { this.flashIntensity = value / 100; }
        });
        
        this.addControl('bassFlashSensitivity', {
            type: 'dial',
            label: 'Bass Flash Sens',
            min: 0,
            max: 200,
            step: 1,
            value: 80,
            onChange: (value) => { this.bassFlashSensitivity = value / 100; }
        });
        
        this.addControl('feedbackAmount', {
            type: 'dial',
            label: 'Feedback',
            min: 0,
            max: 100,
            step: 1,
            value: 30,
            onChange: (value) => { this.feedbackAmount = value / 100; }
        });
        
        this.addControl('blurIntensity', {
            type: 'dial',
            label: 'Blur Intensity',
            min: 0,
            max: 50,
            step: 1,
            value: 10,
            onChange: (value) => { this.blurIntensity = value / 1000; }
        });
        
        this.addControl('blurFalloff', {
            type: 'dial',
            label: 'Blur Falloff',
            min: 0,
            max: 300,
            step: 1,
            value: 130,
            onChange: (value) => { this.blurFalloff = value / 100; }
        });
        
        this.addControl('rotationSpeed', {
            type: 'dial',
            label: 'Rotation Speed',
            min: 0,
            max: 300,
            step: 1,
            value: 100,
            onChange: (value) => { this.rotationSpeed = value / 100; }
        });
        
        this.addControl('trebleRotationSensitivity', {
            type: 'dial',
            label: 'Treble Rot Sens',
            min: 0,
            max: 200,
            step: 1,
            value: 80,
            onChange: (value) => { this.trebleRotationSensitivity = value / 100; }
        });
        
        this.addControl('timeScale', {
            type: 'dial',
            label: 'Animation Speed',
            min: 0,
            max: 300,
            step: 1,
            value: 100,
            onChange: (value) => { this.timeScale = value / 100; }
        });
        
        this.addControl('midSpeedSensitivity', {
            type: 'dial',
            label: 'Mid Speed Sens',
            min: 0,
            max: 200,
            step: 1,
            value: 80,
            onChange: (value) => { this.midSpeedSensitivity = value / 100; }
        });
        
        this.addControl('zoom', {
            type: 'dial',
            label: 'Zoom',
            min: 10,
            max: 300,
            step: 1,
            value: 100,
            onChange: (value) => { this.zoom = value / 100; }
        });
        
        this.addControl('movementRange', {
            type: 'dial',
            label: 'Movement Range',
            min: 0,
            max: 100,
            step: 1,
            value: 15,
            onChange: (value) => { this.movementRange = value / 100; }
        });
        
        this.addControl('fractalIterations', {
            type: 'dial',
            label: 'Fractal Detail',
            min: 3,
            max: 12,
            step: 1,
            value: 7,
            onChange: (value) => { this.fractalIterations = value; }
        });
        
        this.addControl('trebleDetailSensitivity', {
            type: 'dial',
            label: 'Treble Detail Sens',
            min: 0,
            max: 200,
            step: 1,
            value: 50,
            onChange: (value) => { this.trebleDetailSensitivity = value / 100; }
        });
        
        this.addControl('colorScheme', {
            type: 'dropdown',
            label: 'Color Scheme',
            className: 'dropdown-selector-mixer',
            options: [
                { value: '0', label: 'Original' },
                { value: '1', label: 'Warm Glow' },
                { value: '2', label: 'Cool Blue' },
                { value: '3', label: 'Purple Haze' },
                { value: '4', label: 'Fire' },
                { value: '5', label: 'Ice' },
                { value: '6', label: 'Rainbow' }
            ],
            value: '0',
            onChange: (value) => { this.colorScheme = parseInt(value); }
        });
    }
    
    setupPresets() {
        this.addPreset('default', {
            name: 'Default',
            values: {
                flashIntensity: 40,
                feedbackAmount: 30,
                blurIntensity: 10,
                blurFalloff: 130,
                rotationSpeed: 100,
                timeScale: 100,
                zoom: 100,
                movementRange: 15,
                fractalIterations: 7,
                colorScheme: '0'
            }
        });
    }
    
    // Prevent base class from clearing our WebGL canvas
    shouldClearCanvas() {
        return false;
    }
    
    onInitialize() {
        console.log('Fraqtels v2: Initializing...');
        
        // Get WebGL context
        this.gl = this.canvas.getContext('webgl', {
            alpha: false,
            premultipliedAlpha: false,
            antialias: false
        });
        
        if (!this.gl) {
            console.error('Fraqtels: WebGL not supported');
            return;
        }
        
        console.log('Fraqtels: WebGL context created');
        
        // Create shader programs
        this.createShaderPrograms();
        
        if (!this.bufferAProgram || !this.imageProgram) {
            console.error('Fraqtels: Failed to create shader programs');
            return;
        }
        
        console.log('Fraqtels: Shader programs created');
        
        // Create framebuffers
        this.createFramebuffers();
        
        console.log('Fraqtels: Framebuffers created');
        
        // Setup geometry
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        console.log('Fraqtels: Geometry setup complete');
        
        // Clear initial frames (match working HTML exactly)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.bufferA_fbo1);
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.bufferA_fbo2);
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        
        console.log('Fraqtels v2: Initialized successfully');
    }
    
    createShaderPrograms() {
        const gl = this.gl;
        
        const vertexShader = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        // EXACT shader from working HTML - Buffer A
        const bufferAShader = `
            precision highp float;
            uniform float iTime;
            uniform vec2 iResolution;
            uniform sampler2D iChannel0;
            uniform float flashIntensity;
            uniform float feedbackAmount;
            uniform float rotationSpeed;
            uniform float timeScale;
            uniform float zoom;
            uniform float movementRange;
            uniform int fractalIterations;
            uniform int colorScheme;
            
            mat2 rot(float a) {
                a = radians(a);
                float s = sin(a), c = cos(a);
                return mat2(c, s, -s, c);
            }
            
            vec3 applyColorScheme(vec3 baseColor, int scheme) {
                if (scheme == 1) {
                    return baseColor * vec3(1.5, 1.0, 0.6);
                } else if (scheme == 2) {
                    return baseColor * vec3(0.6, 0.8, 1.5);
                } else if (scheme == 3) {
                    return baseColor * vec3(1.2, 0.6, 1.5);
                } else if (scheme == 4) {
                    return vec3(baseColor.r * 1.5, baseColor.g * 0.8, baseColor.b * 0.3);
                } else if (scheme == 5) {
                    return vec3(baseColor.r * 0.5, baseColor.g * 1.2, baseColor.b * 1.8);
                } else if (scheme == 6) {
                    float hue = length(baseColor) * 3.0 + iTime * timeScale * 0.5;
                    return vec3(
                        sin(hue) * 0.5 + 0.5,
                        sin(hue + 2.094) * 0.5 + 0.5,
                        sin(hue + 4.189) * 0.5 + 0.5
                    ) * length(baseColor);
                }
                return baseColor;
            }
            
            vec3 fractal(vec2 p, float k, float flashInt) {
                float t = iTime * timeScale;
                p += vec2(sin(t), cos(t)) * movementRange;
                p *= zoom;
                p /= dot(p, p); 
                float d = length(p) * 0.005 * k * flashInt;
                p *= rot(sin(t) * 45. * rotationSpeed);
                p *= sin(t * 0.2);
                p += t * 0.5;
                float ml = 100.0, m = 100.0;
                vec2 mc = vec2(100.0);
                
                for (int i = 0; i < 12; i++) {
                    if (i >= fractalIterations) break;
                    p = abs(5.0 - mod(p * 2.0, 10.0)) - 1.0;
                    p *= rot(t * 2.0 * rotationSpeed);
                    ml = min(ml, min(abs(p.x), abs(p.y)));
                    mc = min(mc, abs(p));
                    m = min(m, abs(p.x - 1.0));
                }
                
                float l = smoothstep(0.0, 0.5, abs(0.5 - fract(m * 2.0 + t)));
                ml = exp(-10.0 * ml);
                m = exp(-20.0 * m);
                mc = exp(-10.0 * mc);
                vec3 col = vec3(mc.x, ml * 0.6, mc.y * 1.5) * ml * l * l + m + d * (1.0 + k) * flashInt;
                
                return applyColorScheme(col, colorScheme);
            }
            
            void main() {
                float k = 0.5 + 0.3 * sin(iTime * timeScale * 2.0);
                k = smoothstep(0.3, 0.7, k) * 4.0;
                
                vec2 uv = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
                vec2 pix = 1.0 / iResolution.xy / float(3 * 2);
                vec3 col = vec3(0.0);
                
                const int aa = 3;
                for(int i = -aa; i <= aa; i++) {
                    for(int j = -aa; j <= aa; j++) {
                        vec2 d = vec2(float(i), float(j)) * pix;
                        col += fractal(uv + d, k, flashIntensity);
                    }
                }
                col /= float(aa * aa * 4);
                col = mix(vec3(length(col)), col, 0.7);
                
                col = mix(texture2D(iChannel0, gl_FragCoord.xy / iResolution.xy).rgb, col, feedbackAmount);
                
                gl_FragColor = vec4(col, k);
            }
        `;
        
        // EXACT shader from working HTML - Image
        const imageShader = `
            precision highp float;
            uniform vec2 iResolution;
            uniform sampler2D iChannel0;
            uniform float blurIntensity;
            uniform float blurFalloff;
            
            void main() {
                vec2 uv = gl_FragCoord.xy / iResolution.xy;
                vec4 col = texture2D(iChannel0, uv);
                vec2 pix = vec2(0.0, 1.0) * smoothstep(0.0, blurFalloff, length((uv - 0.5))) * col.a * blurIntensity;
                col += texture2D(iChannel0, uv + pix.xy);
                col += texture2D(iChannel0, uv - pix.xy);
                col += texture2D(iChannel0, uv + pix.yx);
                col += texture2D(iChannel0, uv - pix.yx);
                col *= vec4(1.2, 1.0, 0.8, 1.0) * 0.17;
                gl_FragColor = vec4(col);
            }
        `;
        
        this.bufferAProgram = this.compileProgram(vertexShader, bufferAShader);
        this.imageProgram = this.compileProgram(vertexShader, imageShader);
    }
    
    compileProgram(vertSrc, fragSrc) {
        const gl = this.gl;
        const vs = gl.createShader(gl.VERTEX_SHADER);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        
        gl.shaderSource(vs, vertSrc);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
            return null;
        }
        
        gl.shaderSource(fs, fragSrc);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
            return null;
        }
        
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
            return null;
        }
        
        return prog;
    }
    
    createFramebuffers() {
        const gl = this.gl;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        console.log(`Fraqtels: Creating framebuffers at ${w}x${h}`);
        
        this.bufferA_fbo1 = gl.createFramebuffer();
        this.bufferA_texture1 = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.bufferA_texture1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bufferA_fbo1);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.bufferA_texture1, 0);
        
        const status1 = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status1 !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Fraqtels: FBO1 incomplete:', status1);
        }
        
        this.bufferA_fbo2 = gl.createFramebuffer();
        this.bufferA_texture2 = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.bufferA_texture2);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bufferA_fbo2);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.bufferA_texture2, 0);
        
        const status2 = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status2 !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Fraqtels: FBO2 incomplete:', status2);
        }
        
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    onResize() {
        if (!this.gl) return;
        this.createFramebuffers();
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        const smoothing = 0.7;
        this.bassLevel = this.bassLevel * smoothing + (sharedAudioData.bass || 0) * (1 - smoothing);
        this.midLevel = this.midLevel * smoothing + (sharedAudioData.mid || 0) * (1 - smoothing);
        this.trebleLevel = this.trebleLevel * smoothing + (sharedAudioData.treble || 0) * (1 - smoothing);
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.gl) {
            console.warn('Fraqtels: Render called but gl context is null');
            return;
        }
        
        if (!this.bufferAProgram || !this.imageProgram) {
            console.warn('Fraqtels: Render called but shader programs are null');
            return;
        }
        
        const gl = this.gl;
        const time = (Date.now() - this.startTime) / 1000;
        
        // Debug: Log first render
        if (this.frameCount === 0) {
            console.log('Fraqtels: First render call', {
                canvasSize: { w: this.canvas.width, h: this.canvas.height },
                time,
                gl: !!gl,
                programs: { bufferA: !!this.bufferAProgram, image: !!this.imageProgram }
            });
        }
        
        // Audio-reactive parameters
        const audioFlash = this.flashIntensity * (1 + this.bassLevel * this.bassFlashSensitivity);
        const audioTimeScale = this.timeScale * (1 + this.midLevel * this.midSpeedSensitivity);
        const audioRotSpeed = this.rotationSpeed * (1 + this.trebleLevel * this.trebleRotationSensitivity);
        const audioIter = Math.min(12, Math.floor(this.fractalIterations + this.trebleLevel * this.trebleDetailSensitivity * 3));
        
        // DEBUG: Log uniforms on first frame
        if (this.frameCount === 0) {
            console.log('Fraqtels uniforms:', {
                flashIntensity: this.flashIntensity,
                audioFlash,
                timeScale: this.timeScale,
                audioTimeScale,
                zoom: this.zoom,
                rotationSpeed: this.rotationSpeed,
                audioRotSpeed,
                fractalIterations: this.fractalIterations,
                audioIter
            });
        }
        
        // Ping-pong
        const isEven = this.frameCount % 2 === 0;
        const readTex = isEven ? this.bufferA_texture1 : this.bufferA_texture2;
        const writeFbo = isEven ? this.bufferA_fbo2 : this.bufferA_fbo1;
        const writeTex = isEven ? this.bufferA_texture2 : this.bufferA_texture1;
        
        // PASS 1: Buffer A
        gl.useProgram(this.bufferAProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, writeFbo);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        const pos = gl.getAttribLocation(this.bufferAProgram, 'position');
        gl.enableVertexAttribArray(pos);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform1f(gl.getUniformLocation(this.bufferAProgram, 'iTime'), time);
        gl.uniform2f(gl.getUniformLocation(this.bufferAProgram, 'iResolution'), this.canvas.width, this.canvas.height);
        gl.uniform1f(gl.getUniformLocation(this.bufferAProgram, 'flashIntensity'), audioFlash);
        gl.uniform1f(gl.getUniformLocation(this.bufferAProgram, 'feedbackAmount'), this.feedbackAmount);
        gl.uniform1f(gl.getUniformLocation(this.bufferAProgram, 'rotationSpeed'), audioRotSpeed);
        gl.uniform1f(gl.getUniformLocation(this.bufferAProgram, 'timeScale'), audioTimeScale);
        gl.uniform1f(gl.getUniformLocation(this.bufferAProgram, 'zoom'), this.zoom);
        gl.uniform1f(gl.getUniformLocation(this.bufferAProgram, 'movementRange'), this.movementRange);
        gl.uniform1i(gl.getUniformLocation(this.bufferAProgram, 'fractalIterations'), audioIter);
        gl.uniform1i(gl.getUniformLocation(this.bufferAProgram, 'colorScheme'), this.colorScheme);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTex);
        gl.uniform1i(gl.getUniformLocation(this.bufferAProgram, 'iChannel0'), 0);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        // PASS 2: Image
        gl.useProgram(this.imageProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        const pos2 = gl.getAttribLocation(this.imageProgram, 'position');
        gl.enableVertexAttribArray(pos2);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(pos2, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform2f(gl.getUniformLocation(this.imageProgram, 'iResolution'), this.canvas.width, this.canvas.height);
        gl.uniform1f(gl.getUniformLocation(this.imageProgram, 'blurIntensity'), this.blurIntensity);
        gl.uniform1f(gl.getUniformLocation(this.imageProgram, 'blurFalloff'), this.blurFalloff);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, writeTex);
        gl.uniform1i(gl.getUniformLocation(this.imageProgram, 'iChannel0'), 0);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        // Check for GL errors on first few frames
        if (this.frameCount < 3) {
            const error = gl.getError();
            if (error !== gl.NO_ERROR) {
                console.error('Fraqtels: WebGL error during render:', error);
            }
        }
        
        this.frameCount++;
    }
    
    onCleanup() {
        if (!this.gl) return;
        const gl = this.gl;
        if (this.bufferAProgram) gl.deleteProgram(this.bufferAProgram);
        if (this.imageProgram) gl.deleteProgram(this.imageProgram);
        if (this.bufferA_fbo1) gl.deleteFramebuffer(this.bufferA_fbo1);
        if (this.bufferA_fbo2) gl.deleteFramebuffer(this.bufferA_fbo2);
        if (this.bufferA_texture1) gl.deleteTexture(this.bufferA_texture1);
        if (this.bufferA_texture2) gl.deleteTexture(this.bufferA_texture2);
        if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    }
}

setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new FraqtelsPlugin(window.visualizer);
        console.log('Fraqtels v2 plugin loaded');
    }
}, 500);
