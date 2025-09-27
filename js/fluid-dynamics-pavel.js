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
        
        // Initialize the advanced color system
        this.initializeColorSystem();
        
        // Initialize energy-based physics system
        this.initializeEnergyPhysics();
        
        // Initialize advanced beat detection system
        this.initializeBeatDetection();
        
        console.log('🌊 Pavel Fluid Dynamics System initialized with advanced spectrum colors, energy physics, and beat detection');
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
        this.canvas.style.zIndex = '5'; // Above WebGL (z-index: 4)
        this.canvas.style.display = 'none';
        this.canvas.style.opacity = this.opacity.toString();
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
    
    // Enhanced audio-reactive splat injection with spectrum colors
    addAudioSplat(audioFeatures) {
        if (!this.isActive || !audioFeatures) return;
        
        // Generate audio-reactive splat parameters
        const energy = audioFeatures.energy || 0;
        const beat = audioFeatures.beat || false;
        
        // Advanced beat detection and effects (only if enabled)
        if (this.beatReactEnabled) {
            this.processBeatDetection(audioFeatures);
        }
        
        // Multi-frequency zone splats (only if beat react is enabled for complex schemes)
        if (audioFeatures.frequencies && audioFeatures.frequencies !== 'none') {
            const currentScheme = this.getCurrentColorScheme();
            const pureSchemes = ['fire', 'jerry', 'waterCaustic'];
            
            // Pure schemes always get frequency zones, complex schemes only if beat react is on
            if (pureSchemes.includes(currentScheme) || this.beatReactEnabled) {
                this.addFrequencyZoneSplats(audioFeatures);
            }
        }
        
        // More frequent splats with lower energy threshold for richer visuals
        // Only use beat detection if beat react is enabled
        const useBeat = this.beatReactEnabled && beat;
        if ((useBeat && energy > 0.05) || (energy > 0.2)) {
            // Multiple splats for high energy
            const splatCount = useBeat ? Math.ceil(energy * 3) : 1;
            
            for (let i = 0; i < splatCount; i++) {
                // Enhanced positioning with some randomness
                const x = 0.3 + Math.random() * 0.4; // Center area with variation
                const y = 0.3 + Math.random() * 0.4;
                
                // Audio-reactive force with better scaling
                const baseForce = this.config.SPLAT_FORCE * (0.5 + energy * 1.5);
                const dx = (Math.random() - 0.5) * baseForce;
                const dy = (Math.random() - 0.5) * baseForce;
                
                // Use advanced spectrum color system with variety
                const color = this.getSpectrumColor(audioFeatures);
                
                this.splat(x, y, dx, dy, color);
                
                // Add slight delay between multiple splats for visual effect
                if (i > 0) {
                    setTimeout(() => {
                        const delayedX = 0.2 + Math.random() * 0.6;
                        const delayedY = 0.2 + Math.random() * 0.6;
                        // Generate a different color for delayed splat
                        const delayedColor = this.getSpectrumColor({
                            ...audioFeatures,
                            energy: audioFeatures.energy * (0.5 + Math.random() * 0.5)
                        });
                        this.splat(delayedX, delayedY, dx * 0.7, dy * 0.7, delayedColor);
                    }, i * 50);
                }
            }
        }
        
        // Continuous low-level fluid injection for ambient flow
        if (energy > 0.1 && Math.random() < 0.3) {
            const ambientX = 0.4 + Math.random() * 0.2;
            const ambientY = 0.4 + Math.random() * 0.2;
            const ambientForce = this.config.SPLAT_FORCE * 0.3;
            const ambientDx = (Math.random() - 0.5) * ambientForce;
            const ambientDy = (Math.random() - 0.5) * ambientForce;
            
            // Use ambient colors for original schemes, palette colors for pure schemes
            const currentScheme = this.getCurrentColorScheme();
            const pureSchemes = ['fire', 'jerry', 'waterCaustic'];
            
            let ambientColor;
            if (pureSchemes.includes(currentScheme)) {
                // Pure schemes use only palette colors
                ambientColor = this.getSpectrumColor({ energy: energy * 0.6 });
            } else {
                // Original schemes use hardcoded ambient colors
                const ambientColors = [[34, 139, 34], [107, 142, 35], [218, 165, 32], [205, 133, 63]];
                const baseColor = ambientColors[Math.floor(Math.random() * ambientColors.length)];
                ambientColor = this.applySaturation(baseColor);
            }
            
            this.splat(ambientX, ambientY, ambientDx, ambientDy, ambientColor);
        }
    }
    
    // Multi-frequency zone splat system
    addFrequencyZoneSplats(audioFeatures) {
        const frequencies = audioFeatures.frequencies;
        const energy = audioFeatures.energy || 0;
        
        // Define screen zones for different frequency ranges
        const frequencyZones = {
            // Bass frequencies - bottom area
            bass: {
                freqRange: { min: 60, max: 250 },
                screenZone: { x: [0.1, 0.9], y: [0.7, 0.95] },
                color: this.frequencyRanges.bass.color,
                forceMultiplier: 1.5
            },
            // Mid frequencies - middle area
            mids: {
                freqRange: { min: 250, max: 2000 },
                screenZone: { x: [0.2, 0.8], y: [0.3, 0.7] },
                color: this.frequencyRanges.mids.color,
                forceMultiplier: 1.0
            },
            // High frequencies - top area
            highs: {
                freqRange: { min: 2000, max: 8000 },
                screenZone: { x: [0.1, 0.9], y: [0.05, 0.3] },
                color: this.frequencyRanges.presence.color,
                forceMultiplier: 0.8
            },
            // Sub-bass - corners
            subBass: {
                freqRange: { min: 20, max: 60 },
                screenZone: { x: [0.05, 0.95], y: [0.05, 0.95] },
                color: this.frequencyRanges.subBass.color,
                forceMultiplier: 2.0
            }
        };
        
        // Process each frequency zone
        for (const [zoneName, zone] of Object.entries(frequencyZones)) {
            const zoneEnergy = this.getFrequencyRangeEnergy(frequencies, zone.freqRange.min, zone.freqRange.max);
            
            // Only create splats if zone has significant energy
            if (zoneEnergy > 0.1) {
                const splatCount = Math.ceil(zoneEnergy * 2); // 1-2 splats per zone
                
                for (let i = 0; i < splatCount; i++) {
                    // Position within the zone's screen area
                    const x = zone.screenZone.x[0] + Math.random() * (zone.screenZone.x[1] - zone.screenZone.x[0]);
                    const y = zone.screenZone.y[0] + Math.random() * (zone.screenZone.y[1] - zone.screenZone.y[0]);
                    
                    // Zone-specific force
                    const baseForce = this.config.SPLAT_FORCE * zone.forceMultiplier * zoneEnergy;
                    const dx = (Math.random() - 0.5) * baseForce;
                    const dy = (Math.random() - 0.5) * baseForce;
                    
                    // Use zone-specific colors for original schemes, palette colors for pure schemes
                    const currentScheme = this.getCurrentColorScheme();
                    const pureSchemes = ['fire', 'jerry', 'waterCaustic'];
                    
                    let color;
                    if (pureSchemes.includes(currentScheme)) {
                        // Pure schemes use only palette colors
                        color = this.getSpectrumColor({ energy: zoneEnergy });
                    } else {
                        // Original schemes use zone-specific colors with energy variation
                        const baseColor = [
                            Math.min(zone.color[0] * (0.7 + zoneEnergy * 0.6), 255),
                            Math.min(zone.color[1] * (0.7 + zoneEnergy * 0.6), 255),
                            Math.min(zone.color[2] * (0.7 + zoneEnergy * 0.6), 255)
                        ];
                        color = this.applySaturation(baseColor);
                    }
                    
                    this.splat(x, y, dx, dy, color);
                }
            }
        }
    }
    
    // Advanced beat detection and visual effects
    processBeatDetection(audioFeatures) {
        const energy = audioFeatures.energy || 0;
        const beat = audioFeatures.beat || false;
        const frequencies = audioFeatures.frequencies;
        
        // Update beat history
        this.beatDetection.beatHistory.push(beat);
        this.beatDetection.energyHistory.push(energy);
        
        // Maintain history length
        if (this.beatDetection.beatHistory.length > this.beatDetection.historyLength) {
            this.beatDetection.beatHistory.shift();
            this.beatDetection.energyHistory.shift();
        }
        
        // Analyze beat timing
        if (beat) {
            const now = Date.now();
            if (this.beatDetection.lastBeatTime > 0) {
                this.beatDetection.beatInterval = now - this.beatDetection.lastBeatTime;
                this.beatDetection.tempo = 60000 / this.beatDetection.beatInterval; // BPM
            }
            this.beatDetection.lastBeatTime = now;
        }
        
        // Detect specific beat types and apply effects
        if (frequencies && frequencies !== 'none') {
            this.detectAndApplyBeatEffects(audioFeatures);
        }
    }
    
    detectAndApplyBeatEffects(audioFeatures) {
        const energy = audioFeatures.energy || 0;
        const frequencies = audioFeatures.frequencies;
        
        // Check each beat type
        for (const [beatType, threshold] of Object.entries(this.beatDetection.thresholds)) {
            const freqEnergy = this.getFrequencyRangeEnergy(frequencies, threshold.freqRange[0], threshold.freqRange[1]);
            
            // Detect beat type based on frequency energy and overall energy
            if (freqEnergy > threshold.energy && energy > 0.3) {
                this.applyBeatEffect(beatType, freqEnergy, energy);
            }
        }
    }
    
    applyBeatEffect(beatType, freqEnergy, totalEnergy) {
        const effect = this.beatDetection.effects[beatType];
        if (!effect) return;
        
        // Create beat-specific splats
        for (let i = 0; i < effect.splatCount; i++) {
            // Position within beat-specific screen zone
            const x = effect.screenZone.x[0] + Math.random() * (effect.screenZone.x[1] - effect.screenZone.x[0]);
            const y = effect.screenZone.y[0] + Math.random() * (effect.screenZone.y[1] - effect.screenZone.y[0]);
            
            // Beat-specific force
            const baseForce = this.config.SPLAT_FORCE * effect.forceMultiplier * freqEnergy;
            const dx = (Math.random() - 0.5) * baseForce;
            const dy = (Math.random() - 0.5) * baseForce;
            
            // Use beat-specific colors for original schemes, palette colors for pure schemes
            const currentScheme = this.getCurrentColorScheme();
            const pureSchemes = ['fire', 'jerry', 'waterCaustic'];
            
            let color;
            if (pureSchemes.includes(currentScheme)) {
                // Pure schemes use only palette colors
                color = this.getSpectrumColor({ energy: freqEnergy });
            } else {
                // Original schemes use beat-specific colors with energy variation
                const baseColor = [
                    Math.min(effect.color[0] * (0.8 + freqEnergy * 0.4), 255),
                    Math.min(effect.color[1] * (0.8 + freqEnergy * 0.4), 255),
                    Math.min(effect.color[2] * (0.8 + freqEnergy * 0.4), 255)
                ];
                color = this.applySaturation(baseColor);
            }
            
            this.splat(x, y, dx, dy, color);
        }
        
        // Apply temporary physics boost
        this.applyBeatPhysicsBoost(beatType, freqEnergy);
    }
    
    applyBeatPhysicsBoost(beatType, intensity) {
        const effect = this.beatDetection.effects[beatType];
        if (!effect.physicsBoost) return;
        
        // Temporarily boost physics parameters
        const boostDuration = 200; // milliseconds
        const originalConfig = { ...this.config };
        
        // Apply boosts
        if (effect.physicsBoost.pressure) {
            this.config.PRESSURE = Math.min(originalConfig.PRESSURE * effect.physicsBoost.pressure * intensity, 1.1);
        }
        if (effect.physicsBoost.curl) {
            this.config.CURL = originalConfig.CURL * effect.physicsBoost.curl * intensity;
        }
        if (effect.physicsBoost.velocity) {
            this.config.VELOCITY_DISSIPATION = originalConfig.VELOCITY_DISSIPATION * effect.physicsBoost.velocity;
        }
        if (effect.physicsBoost.viscosity) {
            this.config.DENSITY_DISSIPATION = originalConfig.DENSITY_DISSIPATION * effect.physicsBoost.viscosity;
        }
        
        // Reset after duration
        setTimeout(() => {
            this.config.PRESSURE = originalConfig.PRESSURE;
            this.config.CURL = originalConfig.CURL;
            this.config.VELOCITY_DISSIPATION = originalConfig.VELOCITY_DISSIPATION;
            this.config.DENSITY_DISSIPATION = originalConfig.DENSITY_DISSIPATION;
        }, boostDuration);
    }
    
    updateEnergyPhysics(audioFeatures) {
        const energy = audioFeatures.energy || 0;
        
        // Smooth energy changes for more natural physics transitions
        this.smoothedEnergy += (energy - this.smoothedEnergy) * this.energyPhysics.energySmoothing;
        
        // Only apply energy-based changes if above threshold
        if (this.smoothedEnergy > this.energyPhysics.energyThreshold) {
            const energyFactor = Math.min(this.smoothedEnergy * this.energyPhysics.maxEnergyMultiplier, this.energyPhysics.maxEnergyMultiplier);
            
            // Update viscosity (density dissipation) - higher energy = lower viscosity (more fluid)
            this.config.DENSITY_DISSIPATION = this.energyPhysics.baseViscosity * (1 + energyFactor * this.energyPhysics.energySensitivity.viscosity);
            
            // Update pressure - higher energy = higher pressure (more dynamic)
            // Cap pressure at 1.1 maximum to prevent animation breakup
            const pressureMultiplier = 1 + (energyFactor * this.energyPhysics.energySensitivity.pressure * 0.1); // Much smaller multiplier
            this.config.PRESSURE = Math.min(this.energyPhysics.basePressure * pressureMultiplier, 1.1);
            
            // Update curl (vorticity) - higher energy = more swirling
            this.config.CURL = this.energyPhysics.baseCurl * (1 + energyFactor * this.energyPhysics.energySensitivity.curl);
            
            // Update velocity dissipation - higher energy = less dissipation (more persistent motion)
            this.config.VELOCITY_DISSIPATION = this.energyPhysics.baseVelocityDissipation * (1 - energyFactor * this.energyPhysics.energySensitivity.velocity * 0.5);
        } else {
            // Return to base values when energy is low
            this.config.DENSITY_DISSIPATION = this.energyPhysics.baseViscosity;
            this.config.PRESSURE = this.energyPhysics.basePressure;
            this.config.CURL = this.energyPhysics.baseCurl;
            this.config.VELOCITY_DISSIPATION = this.energyPhysics.baseVelocityDissipation;
        }
    }
    
    // Advanced Spectrum Color System
    initializeColorSystem() {
        // Define frequency ranges for different color zones
        this.frequencyRanges = {
            subBass: { min: 20, max: 60, color: [148, 0, 211] },      // Deep Purple
            bass: { min: 60, max: 250, color: [255, 0, 0] },          // Red
            lowMids: { min: 250, max: 500, color: [255, 165, 0] },    // Orange  
            mids: { min: 500, max: 2000, color: [255, 255, 0] },      // Yellow
            highMids: { min: 2000, max: 4000, color: [0, 255, 0] },   // Green
            presence: { min: 4000, max: 6000, color: [0, 255, 255] }, // Cyan
            brilliance: { min: 6000, max: 20000, color: [0, 0, 255] } // Blue
        };
        
        // Color palettes for different moods/energy levels
        this.colorPalettes = {
            warm: [
                [139, 69, 19],   // Saddle Brown (dark/low energy)
                [205, 92, 92],   // Indian Red
                [255, 69, 0],    // Red-Orange
                [255, 140, 0],   // Dark Orange
                [255, 215, 0],   // Gold
                [255, 255, 0],   // Yellow (bright/high energy)
                [255, 255, 224]  // Light Yellow
            ],
            cool: [
                [25, 25, 112],   // Midnight Blue (dark/low energy)
                [75, 0, 130],    // Indigo
                [138, 43, 226],  // Blue Violet
                [65, 105, 225],  // Royal Blue
                [0, 191, 255],   // Deep Sky Blue
                [0, 255, 255],   // Cyan (bright/high energy)
                [224, 255, 255]  // Light Cyan
            ],
            vibrant: [
                [128, 0, 128],   // Purple (dark/low energy)
                [255, 20, 147],  // Deep Pink
                [255, 0, 255],   // Magenta
                [138, 43, 226],  // Blue Violet
                [0, 255, 127],   // Spring Green
                [255, 215, 0],   // Gold
                [255, 255, 255]  // White (bright/high energy)
            ],
            natural: [
                [85, 107, 47],   // Dark Olive Green (dark/low energy)
                [107, 142, 35],  // Olive Drab
                [34, 139, 34],   // Forest Green
                [218, 165, 32],  // Goldenrod
                [205, 133, 63],  // Peru
                [244, 164, 96],  // Sandy Brown
                [255, 248, 220]  // Cornsilk (bright/high energy)
            ],
            fire: [
                [139, 0, 0],     // Dark Red (low energy)
                [178, 34, 34],   // Fire Brick Red (low energy)
                [220, 20, 60],   // Crimson Red (low energy)
                [255, 69, 0],    // Red-Orange (low-medium energy)
                [255, 140, 0],   // Dark Orange (medium energy)
                [255, 0, 0],     // Pure Red (medium-high energy)
                [255, 215, 0]    // Gold/Yellow (high energy)
            ],
            jerry: [
                [75, 0, 130],    // Indigo Purple (dark/low energy)
                [102, 51, 153],  // Dark Purple
                [128, 0, 128],   // Purple
                [138, 43, 226],  // Blue Violet Purple
                [147, 112, 219], // Medium Purple
                [186, 85, 211],  // Medium Orchid Purple
                [221, 160, 221]  // Plum Purple (bright/high energy)
            ],
            waterCaustic: [
                [0, 25, 51],     // Deep Ocean Blue (dark/low energy)
                [0, 51, 102],    // Dark Blue
                [0, 76, 153],    // Medium Dark Blue
                [0, 102, 204],   // Medium Blue
                [51, 127, 255],  // Light Blue
                [102, 153, 255], // Lighter Blue
                [153, 204, 255]  // Very Light Blue (bright/high energy)
            ]
        };
        
        this.currentPalette = this.colorPalettes.vibrant;
        this.colorUpdateTimer = 0;
        this.paletteTransitionSpeed = 0.02;
        
        // Set initial dropdown value
        setTimeout(() => {
            const dropdown = document.getElementById('headerFluidDynamicsColorScheme');
            if (dropdown) {
                dropdown.value = 'vibrant';
            }
        }, 100);
    }
    
    initializeEnergyPhysics() {
        // Energy-based physics configuration
        this.energyPhysics = {
            // Base values (when no audio energy)
            baseViscosity: this.config.DENSITY_DISSIPATION,
            basePressure: this.config.PRESSURE,
            baseCurl: this.config.CURL,
            baseVelocityDissipation: this.config.VELOCITY_DISSIPATION,
            
            // Energy sensitivity multipliers (user controllable)
            energySensitivity: {
                viscosity: 2.0,     // How much energy affects viscosity
                pressure: 0.5,      // How much energy affects pressure (reduced for stability)
                curl: 3.0,          // How much energy affects curl (vorticity)
                velocity: 1.2       // How much energy affects velocity dissipation
            },
            
            // Energy response curves
            energySmoothing: 0.1,   // Smoothing factor for energy changes
            energyThreshold: 0.05,  // Minimum energy to trigger physics changes
            maxEnergyMultiplier: 4.0 // Maximum multiplier for high energy
        };
        
        // Smoothed energy value for physics calculations
        this.smoothedEnergy = 0;
        
        // Visual controls
        this.opacity = 1.0;
        this.saturation = 1.0;
        this.beatReactEnabled = true;
        this.speed = 1.0;
        
        // Custom colors for random presets
        this.currentCustomColors = null;
        this.usingCustomColors = false;
        
        // Waiting animation system
        this.waitingAnimation = {
            timer: 0,
            isActive: false,
            originalPhysics: null, // Store original physics to restore later
            colors: [
                [15, 25, 45],    // Very dim deep blue
                [20, 15, 40],    // Very dim dark purple
                [18, 30, 50],    // Very dim medium blue
                [25, 12, 35],    // Very dim purple
                [12, 28, 42],    // Very dim ocean blue
                [22, 20, 48],    // Very dim blue-purple
                [16, 35, 55]     // Very dim lighter blue
            ]
        };
    }
    
    initializeBeatDetection() {
        // Advanced beat detection system
        this.beatDetection = {
            // Beat history for pattern analysis
            beatHistory: [],
            energyHistory: [],
            historyLength: 20,
            
            // Beat type thresholds
            thresholds: {
                kickDrum: { energy: 0.6, freqRange: [60, 120] },
                snare: { energy: 0.4, freqRange: [150, 300] },
                hihat: { energy: 0.3, freqRange: [8000, 16000] },
                bass: { energy: 0.5, freqRange: [20, 80] }
            },
            
            // Beat type visual effects
            effects: {
                kickDrum: {
                    splatCount: 3,
                    forceMultiplier: 2.0,
                    screenZone: { x: [0.3, 0.7], y: [0.6, 0.9] },
                    color: [255, 0, 0], // Red
                    physicsBoost: { pressure: 1.3, curl: 1.5 }
                },
                snare: {
                    splatCount: 2,
                    forceMultiplier: 1.5,
                    screenZone: { x: [0.2, 0.8], y: [0.4, 0.6] },
                    color: [255, 255, 0], // Yellow
                    physicsBoost: { curl: 2.0, velocity: 0.8 }
                },
                hihat: {
                    splatCount: 1,
                    forceMultiplier: 0.8,
                    screenZone: { x: [0.1, 0.9], y: [0.1, 0.3] },
                    color: [0, 255, 255], // Cyan
                    physicsBoost: { velocity: 0.5 }
                },
                bass: {
                    splatCount: 4,
                    forceMultiplier: 2.5,
                    screenZone: { x: [0.0, 1.0], y: [0.7, 1.0] },
                    color: [128, 0, 255], // Purple
                    physicsBoost: { pressure: 1.5, viscosity: 1.2 }
                }
            },
            
            // Timing analysis
            lastBeatTime: 0,
            beatInterval: 0,
            tempo: 0
        };
    }
    
    // Get color based on selected palette - pure for some schemes, complex for others
    getSpectrumColor(audioFeatures) {
        const energy = audioFeatures.energy || 0;
        const currentScheme = this.getCurrentColorScheme();
        
        const pureSchemes = ['fire', 'jerry', 'waterCaustic'];
        
        // If custom colors are active, use them
        if (this.usingCustomColors && this.currentCustomColors) {
            const paletteSize = this.currentCustomColors.length;
            let colorIndex;
            if (energy > 0.7) {
                colorIndex = Math.floor((0.7 + Math.random() * 0.3) * paletteSize);
            } else if (energy > 0.4) {
                colorIndex = Math.floor((0.3 + Math.random() * 0.4) * paletteSize);
            } else {
                colorIndex = Math.floor(Math.random() * 0.4 * paletteSize);
            }
            colorIndex = Math.min(colorIndex, paletteSize - 1);
            const baseColor = this.currentCustomColors[colorIndex];
            const energyMultiplier = 0.9 + (energy * 0.2); // Subtle brightness
            const color = [
                Math.min(Math.round(baseColor[0] * energyMultiplier), 255),
                Math.min(Math.round(baseColor[1] * energyMultiplier), 255),
                Math.min(Math.round(baseColor[2] * energyMultiplier), 255)
            ];
            return this.applySaturation(color); // Apply saturation
        }
        
        if (pureSchemes.includes(currentScheme)) {
            // Use ONLY the selected color palette - no other color injection
            const paletteSize = this.currentPalette.length;
            
            // Energy-based color selection within the chosen palette
            let colorIndex;
            if (energy > 0.7) {
                colorIndex = Math.floor((0.7 + Math.random() * 0.3) * paletteSize);
            } else if (energy > 0.4) {
                colorIndex = Math.floor((0.3 + Math.random() * 0.4) * paletteSize);
            } else {
                colorIndex = Math.floor(Math.random() * 0.4 * paletteSize);
            }
            
            colorIndex = Math.min(colorIndex, paletteSize - 1);
            const baseColor = this.currentPalette[colorIndex];
            
            // Very subtle energy-based brightness (keep colors pure)
            const energyMultiplier = 0.9 + (energy * 0.2);
            
            const color = [
                Math.min(Math.round(baseColor[0] * energyMultiplier), 255),
                Math.min(Math.round(baseColor[1] * energyMultiplier), 255),
                Math.min(Math.round(baseColor[2] * energyMultiplier), 255)
            ];
            
            return this.applySaturation(color);
        } else {
            // Original complex color system for vibrant, warm, cool, natural
            const paletteSize = this.currentPalette.length;
            
            let colorIndex;
            if (energy > 0.7) {
                colorIndex = Math.floor((0.7 + Math.random() * 0.3) * paletteSize);
            } else if (energy > 0.4) {
                colorIndex = Math.floor((0.3 + Math.random() * 0.4) * paletteSize);
            } else {
                colorIndex = Math.floor(Math.random() * 0.4 * paletteSize);
            }
            
            colorIndex = Math.min(colorIndex, paletteSize - 1);
            const baseColor = this.currentPalette[colorIndex];
            
            // Original energy-based brightness/saturation adjustment
            const energyMultiplier = 0.7 + (energy * 0.6); // 0.7 to 1.3 range
            
            const color = [
                Math.min(Math.round(baseColor[0] * energyMultiplier), 255),
                Math.min(Math.round(baseColor[1] * energyMultiplier), 255),
                Math.min(Math.round(baseColor[2] * energyMultiplier), 255)
            ];
            
            return this.applySaturation(color);
        }
    }
    
    analyzeFrequencySpectrum(frequencies) {
        const spectrum = {};
        
        // Analyze each frequency range
        Object.keys(this.frequencyRanges).forEach(rangeName => {
            const range = this.frequencyRanges[rangeName];
            spectrum[rangeName] = this.getFrequencyRangeEnergy(frequencies, range.min, range.max);
        });
        
        return spectrum;
    }
    
    getFrequencyRangeEnergy(frequencies, minFreq, maxFreq) {
        // Convert frequency range to array indices
        const sampleRate = 44100; // Assume standard sample rate
        const fftSize = frequencies.length * 2;
        const freqPerBin = sampleRate / fftSize;
        
        const minBin = Math.floor(minFreq / freqPerBin);
        const maxBin = Math.min(Math.floor(maxFreq / freqPerBin), frequencies.length - 1);
        
        let energy = 0;
        let count = 0;
        
        for (let i = minBin; i <= maxBin; i++) {
            energy += frequencies[i];
            count++;
        }
        
        return count > 0 ? energy / count : 0;
    }
    
    getDominantFrequencyRange(spectrum) {
        let maxEnergy = 0;
        let dominantRange = 'mids';
        
        Object.keys(spectrum).forEach(rangeName => {
            if (spectrum[rangeName] > maxEnergy) {
                maxEnergy = spectrum[rangeName];
                dominantRange = rangeName;
            }
        });
        
        return dominantRange;
    }
    
    generateSpectrumColor(spectrum, dominantRange, energy) {
        // Get base color from dominant frequency range
        const baseColor = this.frequencyRanges[dominantRange].color;
        
        // Apply energy-based modifications
        const energyMultiplier = Math.min(energy * 2, 1); // Cap at 1
        const saturationBoost = energyMultiplier * 0.3;
        const brightnessBoost = energyMultiplier * 0.2;
        
        // Convert to HSL for easier manipulation
        const hsl = this.rgbToHsl(baseColor[0], baseColor[1], baseColor[2]);
        
        // Enhance saturation and lightness based on energy
        hsl[1] = Math.min(hsl[1] + saturationBoost, 1);
        hsl[2] = Math.min(hsl[2] + brightnessBoost, 0.8);
        
        // Add harmonic colors from other frequency ranges
        const harmonicInfluence = this.calculateHarmonicInfluence(spectrum, dominantRange);
        
        // Convert back to RGB with harmonic influence
        const rgb = this.hslToRgb(hsl[0], hsl[1], hsl[2]);
        
        // Blend with harmonic colors
        return this.blendHarmonicColors(rgb, harmonicInfluence, energy);
    }
    
    calculateHarmonicInfluence(spectrum, dominantRange) {
        const influence = {};
        const dominantEnergy = spectrum[dominantRange];
        
        Object.keys(spectrum).forEach(rangeName => {
            if (rangeName !== dominantRange && spectrum[rangeName] > 0.1) {
                const ratio = spectrum[rangeName] / dominantEnergy;
                if (ratio > 0.3) { // Only include significant harmonics
                    influence[rangeName] = ratio;
                }
            }
        });
        
        return influence;
    }
    
    blendHarmonicColors(baseRgb, harmonicInfluence, energy) {
        let finalR = baseRgb[0];
        let finalG = baseRgb[1];
        let finalB = baseRgb[2];
        
        // Blend harmonic colors
        Object.keys(harmonicInfluence).forEach(rangeName => {
            const influence = harmonicInfluence[rangeName] * 0.3; // Limit harmonic influence
            const harmonicColor = this.frequencyRanges[rangeName].color;
            
            finalR = finalR * (1 - influence) + harmonicColor[0] * influence;
            finalG = finalG * (1 - influence) + harmonicColor[1] * influence;
            finalB = finalB * (1 - influence) + harmonicColor[2] * influence;
        });
        
        // Apply energy-based brightness
        const energyBoost = 1 + (energy * 0.5);
        finalR = Math.min(finalR * energyBoost, 255);
        finalG = Math.min(finalG * energyBoost, 255);
        finalB = Math.min(finalB * energyBoost, 255);
        
        return [Math.round(finalR), Math.round(finalG), Math.round(finalB)];
    }
    
    getEnergyBasedColor(energy) {
        // Fallback color system when frequency data is not available
        // Use time-based color cycling for variety
        const time = Date.now() * 0.001; // Convert to seconds
        const colorCycle = (Math.sin(time * 0.5) + 1) * 0.5; // 0-1 range
        
        const paletteIndex = Math.floor(colorCycle * this.currentPalette.length);
        const clampedIndex = Math.min(paletteIndex, this.currentPalette.length - 1);
        
        const baseColor = this.currentPalette[clampedIndex];
        const energyMultiplier = 1 + (energy * 0.8);
        
        return [
            Math.min(baseColor[0] * energyMultiplier, 255),
            Math.min(baseColor[1] * energyMultiplier, 255),
            Math.min(baseColor[2] * energyMultiplier, 255)
        ];
    }
    
    // Utility color conversion functions
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return [h, s, l];
    }
    
    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    
    // Legacy method for backward compatibility
    frequencyToColor(frequency) {
        // Use the new spectrum system with a single frequency
        const mockAudioFeatures = {
            frequencies: 'none',
            energy: 0.5,
            dominantFrequency: frequency
        };
        
        return this.getSpectrumColor(mockAudioFeatures);
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
        
        // Debug: Audio splat applied
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
        
        // Check energy level to determine if we should use waiting animation
        const energy = audioFeatures?.energy || 0;
        const useWaitingAnimation = energy < 0.02; // Very low energy threshold
        
        if (useWaitingAnimation) {
            // Very low/no energy - use waiting animation
            this.addWaitingAnimation();
        } else {
            // Sufficient energy - restore normal operation
            this.restoreFromWaitingMode();
            
            // Update energy-based physics
            this.updateEnergyPhysics(audioFeatures);
            
            // Add audio-reactive splats
            this.addAudioSplat(audioFeatures);
        }
        
        // Pavel's fluid simulation step
        const dt = this.calcDeltaTime();
        if (!this.config.PAUSED) {
            this.step(dt);
        }
    }
    
    calcDeltaTime() {
        const now = Date.now();
        let dt = (now - this.lastUpdateTime) / 1000;
        dt = Math.min(dt, 0.016); // Cap at 60fps
        
        // Apply speed multiplier
        dt *= this.speed;
        
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
        
        // Debug: Pavel config updated
    }
    
    // Set color scheme
    setColorScheme(schemeName) {
        if (this.colorPalettes[schemeName]) {
            this.currentPalette = this.colorPalettes[schemeName];
            console.log(`🎨 Color scheme changed to: ${schemeName}`, this.currentPalette);
            
            // Update the dropdown to reflect the current selection
            const dropdown = document.getElementById('headerFluidDynamicsColorScheme');
            if (dropdown) {
                dropdown.value = schemeName;
            }
        } else {
            console.warn(`🎨 Unknown color scheme: ${schemeName}`);
        }
    }
    
    // Get current color scheme name
    getCurrentColorScheme() {
        // Find which palette matches the current one
        for (const [name, palette] of Object.entries(this.colorPalettes)) {
            if (palette === this.currentPalette) {
                return name;
            }
        }
        return 'vibrant'; // default fallback
    }
    
    // Update energy physics configuration
    updateEnergyPhysicsConfig(changes) {
        if (!this.energyPhysics) return;
        
        // Handle different types of energy physics updates
        if (changes.energySensitivity !== undefined) {
            // Scale all sensitivity values by the master sensitivity
            const scale = changes.energySensitivity;
            this.energyPhysics.energySensitivity.viscosity = 2.0 * scale;
            this.energyPhysics.energySensitivity.pressure = 0.5 * scale; // Reduced base for pressure
            this.energyPhysics.energySensitivity.curl = 3.0 * scale;
            this.energyPhysics.energySensitivity.velocity = 1.2 * scale;
        }
        
        if (changes.viscosityResponse !== undefined) {
            this.energyPhysics.energySensitivity.viscosity = changes.viscosityResponse;
        }
        
        if (changes.curlResponse !== undefined) {
            this.energyPhysics.energySensitivity.curl = changes.curlResponse;
        }
        
        if (changes.pressureResponse !== undefined) {
            this.energyPhysics.energySensitivity.pressure = changes.pressureResponse;
        }
        
        console.log('🔧 Energy physics config updated:', this.energyPhysics.energySensitivity);
    }
    
    // Update opacity
    setOpacity(opacity) {
        this.opacity = Math.max(0.1, Math.min(1.0, opacity));
        if (this.canvas) {
            this.canvas.style.opacity = this.opacity.toString();
        }
        console.log(`🎨 Fluid opacity set to: ${this.opacity}`);
    }
    
    // Update saturation
    setSaturation(saturation) {
        this.saturation = Math.max(0.0, Math.min(2.0, saturation));
        console.log(`🎨 Fluid saturation set to: ${this.saturation}`);
    }
    
    // Apply saturation to color
    applySaturation(color) {
        if (this.saturation === 1.0) {
            return color; // No change needed
        }
        
        // Convert RGB to HSL
        const hsl = this.rgbToHsl(color[0], color[1], color[2]);
        
        // Apply saturation multiplier
        hsl[1] = Math.max(0, Math.min(1, hsl[1] * this.saturation));
        
        // Convert back to RGB
        const rgb = this.hslToRgb(hsl[0], hsl[1], hsl[2]);
        
        return [
            Math.round(rgb[0]),
            Math.round(rgb[1]),
            Math.round(rgb[2])
        ];
    }
    
    // Toggle beat react functionality
    setBeatReact(enabled) {
        this.beatReactEnabled = enabled;
        console.log(`🥁 Beat React ${enabled ? 'enabled' : 'disabled'}`);
    }

    setSpeed(speed) {
        this.speed = speed;
        console.log(`🌊 Animation speed set to: ${speed.toFixed(1)}x`);
    }
    
    // Set custom colors (for random presets)
    setCustomColors(colors) {
        this.currentCustomColors = colors;
        // Update the current palette to use custom colors
        this.currentPalette = colors;
        // Mark that we're using custom colors
        this.usingCustomColors = true;
        console.log(`🎨 Applied ${colors.length} custom colors:`, colors);
    }
    
    addWaitingAnimation() {
        if (!this.waitingAnimation.isActive) {
            this.enterWaitingMode();
        }
        
        // Slow timer increment
        this.waitingAnimation.timer += 0.008; // Gentle timing
        
        // Create multiple gentle swirls to fill screen - but inject slowly
        const time = this.waitingAnimation.timer;
        const numSwirls = 4; // 4 swirl centers
        
        // Only inject one swirl per frame to avoid bursts
        const activeSwirl = Math.floor(time * 2) % numSwirls; // Cycle through swirls slowly
        
        for (let i = 0; i < numSwirls; i++) {
            // Only inject for the active swirl this frame
            if (i !== activeSwirl) continue;
            
            // Distribute swirl centers evenly across screen
            const angle = (i / numSwirls) * Math.PI * 2;
            const baseRadius = 0.3; // Distance from center
            
            const centerX = 0.5 + Math.cos(angle) * baseRadius;
            const centerY = 0.5 + Math.sin(angle) * baseRadius;
            
            // Create gentle swirling motion
            const swirlTime = time * 0.3 + i; // Different timing per swirl
            const swirlRadius = 0.08; // Small radius for gentle swirls
            
            // Single injection point per swirl to avoid bursts
            const injectAngle = swirlTime;
            
            const x = centerX + Math.cos(injectAngle) * swirlRadius;
            const y = centerY + Math.sin(injectAngle) * swirlRadius;
            
            // Very gentle swirling velocity - tangential flow
            const dx = Math.cos(injectAngle + Math.PI/2) * 8; // Gentle tangential force
            const dy = Math.sin(injectAngle + Math.PI/2) * 8;
            
            // Pick dim color based on current scheme (not hardcoded blue/purple)
            let color;
            const currentScheme = this.getCurrentColorScheme();
            
            if (this.usingCustomColors && this.currentCustomColors) {
                // Use custom colors at very low intensity
                const colorIndex = i % this.currentCustomColors.length;
                const baseColor = this.currentCustomColors[colorIndex];
                color = [
                    Math.max(5, Math.round(baseColor[0] * 0.15)), // Very dim (15% of original)
                    Math.max(5, Math.round(baseColor[1] * 0.15)),
                    Math.max(5, Math.round(baseColor[2] * 0.15))
                ];
            } else {
                // Use current palette colors at very low intensity
                const colorIndex = i % this.currentPalette.length;
                const baseColor = this.currentPalette[colorIndex];
                color = [
                    Math.max(5, Math.round(baseColor[0] * 0.15)), // Very dim (15% of original)
                    Math.max(5, Math.round(baseColor[1] * 0.15)),
                    Math.max(5, Math.round(baseColor[2] * 0.15))
                ];
            }
            
            this.splat(x, y, dx, dy, color);
        }
    }
    
    enterWaitingMode() {
        this.waitingAnimation.isActive = true;
        
        // Store original physics settings
        this.waitingAnimation.originalPhysics = {
            viscosity: this.config.VELOCITY_DISSIPATION,
            pressure: this.config.PRESSURE,
            curl: this.config.CURL,
            density: this.config.DENSITY_DISSIPATION
        };
        
        // Apply very gentle, slow physics - like default sliders
        this.config.VELOCITY_DISSIPATION = 0.2; // Default viscosity - no fast movement
        this.config.PRESSURE = 0.8; // Default pressure - no bursts
        this.config.CURL = 5; // Very low curl - gentle mixing only
        this.config.DENSITY_DISSIPATION = 0.95; // Slower fade for gentle presence
        
        console.log('🌊 Entering waiting animation mode - very slow, dim colors matching current scheme');
    }
    
    restoreFromWaitingMode() {
        if (this.waitingAnimation.isActive) {
            this.waitingAnimation.isActive = false;
            
            // Restore original physics settings
            if (this.waitingAnimation.originalPhysics) {
                this.config.VELOCITY_DISSIPATION = this.waitingAnimation.originalPhysics.viscosity;
                this.config.PRESSURE = this.waitingAnimation.originalPhysics.pressure;
                this.config.CURL = this.waitingAnimation.originalPhysics.curl;
                this.config.DENSITY_DISSIPATION = this.waitingAnimation.originalPhysics.density;
            }
            
            console.log('🌊 Exiting waiting animation mode - restored audio-reactive operation');
        }
    }
}

// Export for use in main.js
window.FluidDynamicsVisualization = FluidDynamicsVisualization;
// Debug: FluidDynamicsVisualization class loaded successfully
