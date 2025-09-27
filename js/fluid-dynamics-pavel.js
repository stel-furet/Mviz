/*
 * Fluid Dynamics Visualization - Pavel's Complete System Integration
 * Based on Pavel Dobryakov's WebGL Fluid Simulation
 * Integrated with Mviz audio-reactive visualization system
 */

class FluidDynamicsVisualization {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isActive = false;
        this.canvas = null;
        this.gl = null;
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        
        // Frame rate control (mirror Infinite Zoom)
        this.frameInterval = 1000 / 30; // 30fps target
        this.lastFrameTime = 0;
        
        // Pavel's complete fluid system configuration
        this.config = {
            SIM_RESOLUTION: 128,
            DYE_RESOLUTION: 1024,
            CAPTURE_RESOLUTION: 512,
            DENSITY_DISSIPATION: 1,
            VELOCITY_DISSIPATION: 0.2,
            PRESSURE: 0.8,
            PRESSURE_ITERATIONS: 20,
            CURL: 30,
            SPLAT_RADIUS: 0.25,
            SPLAT_FORCE: 6000,
            SHADING: true,
            COLORFUL: true,
            COLOR_UPDATE_SPEED: 10,
            PAUSED: false,
            BACK_COLOR: { r: 0, g: 0, b: 0 },
            TRANSPARENT: false,
            BLOOM: true,
            BLOOM_ITERATIONS: 8,
            BLOOM_RESOLUTION: 256,
            BLOOM_INTENSITY: 0.8,
            BLOOM_THRESHOLD: 0.6,
            BLOOM_SOFT_KNEE: 0.7,
            SUNRAYS: true,
            SUNRAYS_RESOLUTION: 196,
            SUNRAYS_WEIGHT: 1.0,
        };
        
        // Pavel's system variables
        this.pointers = [];
        this.splatStack = [];
        this.colorUpdateTimer = 0.0;
        this.bloomFramebuffers = [];
        this.sunraysFramebuffers = [];
        this.lastUpdateTime = Date.now();
        
        // WebGL extension support
        this.ext = null;
        
        // Framebuffers for fluid simulation
        this.dye = null;
        this.velocity = null;
        this.divergence = null;
        this.curl = null;
        this.pressure = null;
        this.bloom = null;
        this.sunrays = null;
        
        // Shader programs and materials
        this.programs = {};
        this.materials = {};
        this.shaders = {};
        
        console.log('🌊 Pavel Fluid Dynamics System initialized');
    }
    
    createCanvas() {
        // Create canvas element (mirroring Infinite Zoom)
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'fluidcanvas'; // Named for easy identification
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '10000'; // Above blobs (9999) for testing
        this.canvas.style.display = 'none';
        this.canvas.style.opacity = '1';
        this.canvas.style.visibility = 'visible';
        
        // Add to visualizer container
        const visualizerContainer = document.getElementById('visualizer');
        if (visualizerContainer) {
            visualizerContainer.appendChild(this.canvas);
            console.log('🌊 Fluid canvas created and added to container');
        } else {
            console.error('🌊 Visualizer container not found!');
        }
    }
    
    initializeWebGL() {
        if (!this.canvas) {
            this.createCanvas();
        }
        
        // Try WebGL2 first
        try {
            this.gl = this.canvas.getContext('webgl2', {
                alpha: true,
                antialias: true,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });
            
            if (this.gl) {
                console.log('🌊 WebGL2 context created for Pavel Fluid System');
            }
        } catch (error) {
            console.warn('🌊 WebGL2 not supported, trying WebGL1:', error);
        }
        
        // Fallback to WebGL1
        if (!this.gl) {
            try {
                this.gl = this.canvas.getContext('webgl', {
                    alpha: true,
                    antialias: true,
                    depth: false,
                    stencil: false,
                    preserveDrawingBuffer: false,
                    powerPreference: 'high-performance'
                });
                
                if (this.gl) {
                    console.log('🌊 WebGL1 context created for Pavel Fluid System');
                }
            } catch (error) {
                console.error('🌊 WebGL not supported:', error);
                return false;
            }
        }
        
        if (!this.gl) {
            console.error('🌊 Failed to get WebGL context');
            return false;
        }
        
        // Initialize WebGL extensions
        this.initializeExtensions();
        
        // Initialize Pavel's shader system
        this.initializeShaders();
        
        // Initialize framebuffers
        this.initializeFramebuffers();
        
        console.log('🌊 Pavel WebGL context ready for Fluid Dynamics');
        return true;
    }
    
    initializeExtensions() {
        const gl = this.gl;
        
        // Get required extensions
        const supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
        const supportRenderTextureFormat = gl.getExtension('WEBGL_color_buffer_float') || 
                                         gl.getExtension('EXT_color_buffer_float');
        
        this.ext = {
            formatRGBA: {
                internalFormat: gl.RGBA16F || gl.RGBA,
                format: gl.RGBA
            },
            formatRG: {
                internalFormat: gl.RG16F || gl.RGBA,
                format: gl.RG || gl.RGBA
            },
            formatR: {
                internalFormat: gl.R16F || gl.RGBA,
                format: gl.RED || gl.RGBA
            },
            halfFloatTexType: gl.HALF_FLOAT || gl.FLOAT,
            supportLinearFiltering: !!supportLinearFiltering,
            supportRenderTextureFormat: !!supportRenderTextureFormat
        };
        
        console.log('🌊 WebGL extensions initialized:', {
            linearFiltering: this.ext.supportLinearFiltering,
            renderTexture: this.ext.supportRenderTextureFormat
        });
    }
    
    // Pavel's shader compilation system
    compileShader(type, source, keywords) {
        const gl = this.gl;
        
        // Add keywords to shader source
        if (keywords) {
            source = keywords.reduce((src, keyword) => {
                return '#define ' + keyword + '\n' + src;
            }, source);
        }
        
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('🌊 Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexShader, fragmentShader) {
        const gl = this.gl;
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('🌊 Program linking error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }
    
    // Pavel's Program class for shader management
    createProgram(vertexShader, fragmentShader) {
        const gl = this.gl;
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('🌊 Program linking error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        
        const uniforms = {};
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniformName = gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
        
        return {
            program,
            uniforms,
            bind() {
                gl.useProgram(program);
            }
        };
    }
    
    initializeShaders() {
        const gl = this.gl;
        
        // Base vertex shader
        this.shaders.baseVertex = this.compileShader(gl.VERTEX_SHADER, `
            precision highp float;
            
            attribute vec2 aPosition;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform vec2 texelSize;
            
            void main () {
                vUv = aPosition * 0.5 + 0.5;
                vL = vUv - vec2(texelSize.x, 0.0);
                vR = vUv + vec2(texelSize.x, 0.0);
                vT = vUv + vec2(0.0, texelSize.y);
                vB = vUv - vec2(0.0, texelSize.y);
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `);
        
        // Create all shader programs
        this.programs.splat = this.createProgram(this.shaders.baseVertex, this.compileShader(gl.FRAGMENT_SHADER, `
            precision highp float;
            precision highp sampler2D;
            
            varying vec2 vUv;
            uniform sampler2D uTarget;
            uniform float aspectRatio;
            uniform vec3 color;
            uniform vec2 point;
            uniform float radius;
            
            void main () {
                vec2 p = vUv - point.xy;
                p.x *= aspectRatio;
                vec3 splat = exp(-dot(p, p) / radius) * color;
                vec3 base = texture2D(uTarget, vUv).xyz;
                gl_FragColor = vec4(base + splat, 1.0);
            }
        `));
        
        this.programs.advection = this.createProgram(this.shaders.baseVertex, this.compileShader(gl.FRAGMENT_SHADER, `
            precision highp float;
            precision highp sampler2D;
            
            varying vec2 vUv;
            uniform sampler2D uVelocity;
            uniform sampler2D uSource;
            uniform vec2 texelSize;
            uniform vec2 dyeTexelSize;
            uniform float dt;
            uniform float dissipation;
            
            vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
                vec2 st = uv / tsize - 0.5;
                vec2 iuv = floor(st);
                vec2 fuv = fract(st);
                
                vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
                vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
                vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
                vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
                
                return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
            }
            
            void main () {
            #ifdef MANUAL_FILTERING
                vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                vec4 result = bilerp(uSource, coord, dyeTexelSize);
            #else
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                vec4 result = texture2D(uSource, coord);
            #endif
                float decay = 1.0 + dissipation * dt;
                gl_FragColor = result / decay;
            }
        `, this.ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']));
        
        this.programs.divergence = this.createProgram(this.shaders.baseVertex, this.compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float;
            precision mediump sampler2D;
            
            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uVelocity;
            
            void main () {
                float L = texture2D(uVelocity, vL).x;
                float R = texture2D(uVelocity, vR).x;
                float T = texture2D(uVelocity, vT).y;
                float B = texture2D(uVelocity, vB).y;
                
                vec2 C = texture2D(uVelocity, vUv).xy;
                if (vL.x < 0.0) { L = -C.x; }
                if (vR.x > 1.0) { R = -C.x; }
                if (vT.y > 1.0) { T = -C.y; }
                if (vB.y < 0.0) { B = -C.y; }
                
                float div = 0.5 * (R - L + T - B);
                gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
            }
        `));
        
        this.programs.curl = this.createProgram(this.shaders.baseVertex, this.compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float;
            precision mediump sampler2D;
            
            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uVelocity;
            
            void main () {
                float L = texture2D(uVelocity, vL).y;
                float R = texture2D(uVelocity, vR).y;
                float T = texture2D(uVelocity, vT).x;
                float B = texture2D(uVelocity, vB).x;
                float vorticity = R - L - T + B;
                gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
            }
        `));
        
        this.programs.vorticity = this.createProgram(this.shaders.baseVertex, this.compileShader(gl.FRAGMENT_SHADER, `
            precision highp float;
            precision highp sampler2D;
            
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uVelocity;
            uniform sampler2D uCurl;
            uniform float curl;
            uniform float dt;
            
            void main () {
                float L = texture2D(uCurl, vL).x;
                float R = texture2D(uCurl, vR).x;
                float T = texture2D(uCurl, vT).x;
                float B = texture2D(uCurl, vB).x;
                float C = texture2D(uCurl, vUv).x;
                
                vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
                force /= length(force) + 0.0001;
                force *= curl * C;
                force.y *= -1.0;
                
                vec2 velocity = texture2D(uVelocity, vUv).xy;
                velocity += force * dt;
                velocity = min(max(velocity, -1000.0), 1000.0);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }
        `));
        
        this.programs.pressure = this.createProgram(this.shaders.baseVertex, this.compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float;
            precision mediump sampler2D;
            
            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uPressure;
            uniform sampler2D uDivergence;
            
            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                float C = texture2D(uPressure, vUv).x;
                float divergence = texture2D(uDivergence, vUv).x;
                float pressure = (L + R + B + T - divergence) * 0.25;
                gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
            }
        `));
        
        this.programs.gradientSubtract = this.createProgram(this.shaders.baseVertex, this.compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float;
            precision mediump sampler2D;
            
            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uPressure;
            uniform sampler2D uVelocity;
            
            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                vec2 velocity = texture2D(uVelocity, vUv).xy;
                velocity.xy -= vec2(R - L, T - B);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }
        `));
        
        this.programs.clear = this.createProgram(this.shaders.baseVertex, this.compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float;
            precision mediump sampler2D;
            
            varying highp vec2 vUv;
            uniform sampler2D uTexture;
            uniform float value;
            
            void main () {
                gl_FragColor = value * texture2D(uTexture, vUv);
            }
        `));
        
        this.programs.copy = this.createProgram(this.shaders.baseVertex, this.compileShader(gl.FRAGMENT_SHADER, `
            precision mediump float;
            precision mediump sampler2D;
            
            varying highp vec2 vUv;
            uniform sampler2D uTexture;
            
            void main () {
                gl_FragColor = texture2D(uTexture, vUv);
            }
        `));
        
        // Initialize blit system for rendering
        this.initializeBlit();
        
        console.log('🌊 Pavel shader programs initialized:', Object.keys(this.programs));
    }
    
    initializeBlit() {
        const gl = this.gl;
        
        // Create full-screen quad for rendering
        this.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        
        this.quadIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
        
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);
    }
    
    blit(target, clear = false) {
        const gl = this.gl;
        
        if (target == null) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        
        if (clear) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
    
    // Pavel's framebuffer creation system
    createFBO(w, h, internalFormat, format, type, param) {
        const gl = this.gl;
        
        gl.activeTexture(gl.TEXTURE0);
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
        
        let fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        let texelSizeX = 1.0 / w;
        let texelSizeY = 1.0 / h;
        
        return {
            texture,
            fbo,
            width: w,
            height: h,
            texelSizeX,
            texelSizeY,
            attach(id) {
                gl.activeTexture(gl.TEXTURE0 + id);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                return id;
            }
        };
    }
    
    createDoubleFBO(w, h, internalFormat, format, type, param) {
        let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
        let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);
        
        return {
            width: w,
            height: h,
            texelSizeX: fbo1.texelSizeX,
            texelSizeY: fbo1.texelSizeY,
            get read() {
                return fbo1;
            },
            set read(value) {
                fbo1 = value;
            },
            get write() {
                return fbo2;
            },
            set write(value) {
                fbo2 = value;
            },
            swap() {
                let temp = fbo1;
                fbo1 = fbo2;
                fbo2 = temp;
            }
        };
    }
    
    getResolution(resolution) {
        let aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
        if (aspectRatio < 1) {
            aspectRatio = 1.0 / aspectRatio;
        }
        
        let min = Math.round(resolution);
        let max = Math.round(resolution * aspectRatio);
        
        if (this.gl.drawingBufferWidth > this.gl.drawingBufferHeight) {
            return { width: max, height: min };
        } else {
            return { width: min, height: max };
        }
    }
    
    initializeFramebuffers() {
        const gl = this.gl;
        
        let simRes = this.getResolution(this.config.SIM_RESOLUTION);
        let dyeRes = this.getResolution(this.config.DYE_RESOLUTION);
        
        const texType = this.ext.halfFloatTexType;
        const rgba = this.ext.formatRGBA;
        const rg = this.ext.formatRG;
        const r = this.ext.formatR;
        const filtering = this.ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
        
        gl.disable(gl.BLEND);
        
        // Create fluid simulation framebuffers
        this.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
        this.velocity = this.createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
        this.divergence = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        this.curl = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        this.pressure = this.createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        
        // Initialize bloom framebuffers
        this.initBloomFramebuffers();
        
        // Initialize sunrays framebuffers
        this.initSunraysFramebuffers();
        
        console.log('🌊 Pavel framebuffer system initialized:', {
            simRes,
            dyeRes,
            texType: texType === gl.HALF_FLOAT ? 'HALF_FLOAT' : 'FLOAT'
        });
    }
    
    initBloomFramebuffers() {
        const gl = this.gl;
        let res = this.getResolution(this.config.BLOOM_RESOLUTION);
        
        const texType = this.ext.halfFloatTexType;
        const rgba = this.ext.formatRGBA;
        const filtering = this.ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
        
        this.bloom = this.createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);
        
        this.bloomFramebuffers.length = 0;
        for (let i = 0; i < this.config.BLOOM_ITERATIONS; i++) {
            let width = res.width >> (i + 1);
            let height = res.height >> (i + 1);
            
            if (width < 2 || height < 2) break;
            
            let fbo = this.createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
            this.bloomFramebuffers.push(fbo);
        }
    }
    
    initSunraysFramebuffers() {
        const gl = this.gl;
        let res = this.getResolution(this.config.SUNRAYS_RESOLUTION);
        
        const texType = this.ext.halfFloatTexType;
        const r = this.ext.formatR;
        const filtering = this.ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
        
        this.sunrays = this.createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
        this.sunraysTemp = this.createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    }
    
    initialize() {
        if (!this.canvas) {
            this.createCanvas();
        }
        
        if (!this.gl) {
            if (!this.initializeWebGL()) {
                console.error('🌊 Failed to initialize WebGL for Pavel Fluid System');
                return false;
            }
        }
        
        console.log('🌊 Pavel Fluid Dynamics initialization complete');
        return true;
    }
    
    start() {
        if (!this.initialize()) {
            console.error('🌊 Failed to start Pavel Fluid System');
            return;
        }
        
        this.isActive = true;
        this.canvas.style.display = 'block';
        
        // Remove red background - using fluid rendering now
        this.canvas.style.backgroundColor = 'transparent';
        
        // Initial resize and viewport setup
        setTimeout(() => {
            this.resize();
            if (this.gl) {
                this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
                // Initialize with transparent background
                this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
                this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            }
        }, 16);
        
        console.log('🌊 Pavel Fluid Dynamics started - SHOULD BE RED');
    }
    
    stop() {
        this.isActive = false;
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
        console.log('🌊 Pavel Fluid Dynamics stopped');
    }
    
    resize() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const newWidth = rect.width;
        const newHeight = rect.height;
        
        if (this.canvasWidth !== newWidth || this.canvasHeight !== newHeight) {
            this.canvasWidth = newWidth;
            this.canvasHeight = newHeight;
            
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            
            if (this.gl) {
                this.gl.viewport(0, 0, newWidth, newHeight);
            }
            
            console.log(`🌊 Pavel Fluid canvas resized to: ${newWidth} x ${newHeight}`);
        
        // Reinitialize framebuffers after resize
        if (this.gl && this.isActive) {
            this.gl.viewport(0, 0, newWidth, newHeight);
            this.initializeFramebuffers();
            console.log('🌊 Framebuffers reinitialized after resize');
        }
        }
    }
    
    // Audio-reactive splat injection (replaces mouse input)
    addAudioSplat(audioFeatures) {
        if (!this.isActive || !audioFeatures) return;
        
        // Generate audio-reactive splat parameters
        const energy = audioFeatures.energy || 0;
        const beat = audioFeatures.beat || false;
        
        if (beat && energy > 0.1) {
            // Random position for now (will be enhanced with audio analysis)
            const x = Math.random();
            const y = Math.random();
            
            // Audio-reactive force
            const force = energy * this.config.SPLAT_FORCE;
            const dx = (Math.random() - 0.5) * force;
            const dy = (Math.random() - 0.5) * force;
            
            // Audio-reactive color
            const dominantFreq = audioFeatures.dominantFrequency || 440;
            const color = this.frequencyToColor(dominantFreq);
            
            this.splat(x, y, dx, dy, color);
        }
    }
    
    frequencyToColor(frequency) {
        // Convert frequency to HSL color
        const hue = (frequency / 1000) * 360; // Map frequency to hue
        const saturation = 0.8;
        const lightness = 0.6;
        
        // Convert HSL to RGB
        const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
        const m = lightness - c / 2;
        
        let r, g, b;
        if (hue < 60) { r = c; g = x; b = 0; }
        else if (hue < 120) { r = x; g = c; b = 0; }
        else if (hue < 180) { r = 0; g = c; b = x; }
        else if (hue < 240) { r = 0; g = x; b = c; }
        else if (hue < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    }
    
    splat(x, y, dx, dy, color) {
        const gl = this.gl;
        
        // Splat velocity
        this.programs.splat.bind();
        gl.uniform1i(this.programs.splat.uniforms.uTarget, this.velocity.read.attach(0));
        gl.uniform1f(this.programs.splat.uniforms.aspectRatio, this.canvasWidth / this.canvasHeight);
        gl.uniform2f(this.programs.splat.uniforms.point, x, y);
        gl.uniform3f(this.programs.splat.uniforms.color, dx, dy, 0.0);
        gl.uniform1f(this.programs.splat.uniforms.radius, this.correctRadius(this.config.SPLAT_RADIUS / 100.0));
        this.blit(this.velocity.write);
        this.velocity.swap();
        
        // Splat dye
        gl.uniform1i(this.programs.splat.uniforms.uTarget, this.dye.read.attach(0));
        gl.uniform3f(this.programs.splat.uniforms.color, color[0] / 255, color[1] / 255, color[2] / 255);
        this.blit(this.dye.write);
        this.dye.swap();
        
        console.log(`🌊 Audio splat applied at ${x.toFixed(2)}, ${y.toFixed(2)} with color [${color.join(', ')}]`);
    }
    
    correctRadius(radius) {
        const aspectRatio = this.canvasWidth / this.canvasHeight;
        if (aspectRatio > 1) {
            radius *= aspectRatio;
        }
        return radius;
    }
    
    update(audioFeatures) {
        if (!this.isActive) return;
        
        // Add audio-reactive splats
        this.addAudioSplat(audioFeatures);
        
        // Pavel's fluid simulation step will go here
        const dt = this.calcDeltaTime();
        if (!this.config.PAUSED) {
            this.step(dt);
        }
    }
    
    calcDeltaTime() {
        const now = Date.now();
        let dt = (now - this.lastUpdateTime) / 1000;
        dt = Math.min(dt, 0.016); // Cap at 60fps
        this.lastUpdateTime = now;
        return dt;
    }
    
    step(dt) {
        const gl = this.gl;
        
        gl.disable(gl.BLEND);
        
        // Compute curl
        this.programs.curl.bind();
        gl.uniform1i(this.programs.curl.uniforms.uVelocity, this.velocity.read.attach(0));
        gl.uniform2f(this.programs.curl.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        this.blit(this.curl);
        
        // Apply vorticity
        this.programs.vorticity.bind();
        gl.uniform1i(this.programs.vorticity.uniforms.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(this.programs.vorticity.uniforms.uCurl, this.curl.attach(1));
        gl.uniform2f(this.programs.vorticity.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        gl.uniform1f(this.programs.vorticity.uniforms.curl, this.config.CURL);
        gl.uniform1f(this.programs.vorticity.uniforms.dt, dt);
        this.blit(this.velocity.write);
        this.velocity.swap();
        
        // Compute divergence
        this.programs.divergence.bind();
        gl.uniform1i(this.programs.divergence.uniforms.uVelocity, this.velocity.read.attach(0));
        gl.uniform2f(this.programs.divergence.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        this.blit(this.divergence);
        
        // Clear pressure
        this.programs.clear.bind();
        gl.uniform1i(this.programs.clear.uniforms.uTexture, this.pressure.read.attach(0));
        gl.uniform1f(this.programs.clear.uniforms.value, this.config.PRESSURE);
        this.blit(this.pressure.write);
        this.pressure.swap();
        
        // Solve pressure
        this.programs.pressure.bind();
        gl.uniform1i(this.programs.pressure.uniforms.uDivergence, this.divergence.attach(0));
        for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
            gl.uniform1i(this.programs.pressure.uniforms.uPressure, this.pressure.read.attach(1));
            gl.uniform2f(this.programs.pressure.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
            this.blit(this.pressure.write);
            this.pressure.swap();
        }
        
        // Subtract pressure gradient
        this.programs.gradientSubtract.bind();
        gl.uniform1i(this.programs.gradientSubtract.uniforms.uPressure, this.pressure.read.attach(0));
        gl.uniform1i(this.programs.gradientSubtract.uniforms.uVelocity, this.velocity.read.attach(1));
        gl.uniform2f(this.programs.gradientSubtract.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        this.blit(this.velocity.write);
        this.velocity.swap();
        
        // Advect velocity
        this.programs.advection.bind();
        gl.uniform1i(this.programs.advection.uniforms.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(this.programs.advection.uniforms.uSource, this.velocity.read.attach(0));
        gl.uniform2f(this.programs.advection.uniforms.texelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        gl.uniform2f(this.programs.advection.uniforms.dyeTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
        gl.uniform1f(this.programs.advection.uniforms.dt, dt);
        gl.uniform1f(this.programs.advection.uniforms.dissipation, this.config.VELOCITY_DISSIPATION);
        this.blit(this.velocity.write);
        this.velocity.swap();
        
        // Advect dye
        gl.uniform1i(this.programs.advection.uniforms.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(this.programs.advection.uniforms.uSource, this.dye.read.attach(1));
        gl.uniform2f(this.programs.advection.uniforms.dyeTexelSize, this.dye.texelSizeX, this.dye.texelSizeY);
        gl.uniform1f(this.programs.advection.uniforms.dissipation, this.config.DENSITY_DISSIPATION);
        this.blit(this.dye.write);
        this.dye.swap();
    }
    
    draw() {
        if (!this.isActive || !this.gl) return;
        
        // Frame rate limiting
        const now = performance.now();
        if (now - this.lastFrameTime < this.frameInterval) {
            return;
        }
        this.lastFrameTime = now;
        
        const gl = this.gl;
        gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Pavel's render system will go here
        this.render();
    }
    
    render() {
        const gl = this.gl;
        
        // Render dye to screen
        gl.disable(gl.BLEND);
        
        // Simple copy dye to screen for now
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Clear with transparent background
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Enable blending for fluid overlay
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Bind dye texture and render
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
        
        // Use a simple copy program to display dye
        if (this.programs.copy) {
            this.programs.copy.bind();
            gl.uniform1i(this.programs.copy.uniforms.uTexture, 0);
            this.blit(null);
        } else {
            // Fallback: just display the dye texture directly
            console.log('🌊 Rendering dye texture to screen');
        }
    }
    
    updateConfig(configChanges) {
        if (!configChanges || typeof configChanges !== 'object') return;
        
        // Apply config changes
        Object.assign(this.config, configChanges);
        
        // Force immediate redraw
        this.lastFrameTime = 0;
        
        console.log('🌊 Pavel config updated:', configChanges);
    }
}

// Export for use in main.js
window.FluidDynamicsVisualization = FluidDynamicsVisualization;
