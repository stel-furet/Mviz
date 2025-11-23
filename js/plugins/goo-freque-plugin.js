/**
 * Goo - Mandelbulb raymarching with refraction and reflection
 * 
 * Specifc Shader Code only: 
 * License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
 * License: MIT, author: Inigo Quilez, found: https://iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
 * All other code is original and sole property of Rapid PM. No license for use outside of the Frequezoid Application is agranted. 
 * 
 * @version 1.0.0
 * @author Frequezoid Team Some shader specific code MIT, WTFPL licence
 */

class GooPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('goo', visualizer, {
            version: '1.0.2',
            author: 'Frequezoid Team',
            description: 'Mandelbulb raymarching with refraction and reflection effects',
            targetFPS: 60,
            dialFillColor: '--accent-color',
            credits: 'Frequezoid Team - Some shader specific code MIT, WTFPL licences. All other code copyright Frequezoid'
        });
        
        // Shader parameters
        this.loops = 2;
        this.power = 8.0;
        this.animate = true;
        this.rotationSpeedX = 0.2;
        this.rotationSpeedY = 0.3;
        this.animationSpeed = 0.2;
        this.cameraDistance = 0.0; // 0 = current position, -100 = zoom in, 100 = zoom out
        this.cameraHeight = 3.24; // 324 / 100
        this.cameraDepth = 4.65;  // 465 / 100 (base depth, will be scaled by cameraDistance)
        
        // Audio reactivity
        this.audioRotationSens = 0.0;
        this.audioPowerSens = 0.82; // 82 / 100
        this.audioAnimationSens = 0.0;
        
        // Background opacity
        this.backgroundOpacity = 1.0; // 0-1.0
        
        // Color controls
        this.hueOffset = 0.0; // 0-1.0 (maps to 0-360 degrees)
        this.saturation = 0.86; // 0-1.0
        this.brightness = 1.0; // 0-1.0
        
        // Audio smoothing
        this.bassLevel = 0;
        this.midLevel = 0;
        this.trebleLevel = 0;
        this.energyLevel = 0;
        this.smoothedAnimationEnergy = 0.5; // Start at middle value for smooth startup
        this.smoothedAnimationSpeed = 0.2; // Smooth the actual animation speed value
        
        // WebGL state
        this.gl = null;
        this.shaderProgram = null;
        this.vertexBuffer = null;
        this.startTime = null; // Will be set on first update
        this.time = 0;
        
        // Smoothed rotation speeds to prevent jumps when controls change
        this.smoothedRotationSpeedX = 0.2;
        this.smoothedRotationSpeedY = 0.3;
        
        // Uniform locations cache
        this.uniforms = {};
        
        this.setupControls();
        this.setupPresets();
    }
    
    onInitialize() {
        this.initializeWebGL();
    }
    
    initializeWebGL() {
        // Create WebGL2 context BEFORE accessing this.ctx
        // Enable alpha for background opacity support
        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false
        });
        
        if (!this.gl) {
            console.error('Goo: WebGL2 not supported');
            return;
        }
        
        console.log('Goo: WebGL2 context created successfully');
        
        // Initialize shaders and buffers
        this.compileShaderProgram();
        this.initBuffers();
        
        // Handle resize
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }
    
    initBuffers() {
        const gl = this.gl;
        
        // Fullscreen quad
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);
        
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    }
    
    compileShaderProgram() {
        const gl = this.gl;
        
        const vertexShaderSource = `#version 300 es
            in vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        const fragmentShaderSource = `#version 300 es
            precision highp float;
            
            #define PI              3.141592654
            #define TAU             (2.0*PI)
            #define PHI             (sqrt(5.0)*0.5 + 0.5)
            
            uniform vec2 resolution;
            uniform float time;
            
            #define TOLERANCE       0.00008  // Slightly tighter tolerance for better edge definition
            #define MAX_RAY_LENGTH  20.0
            #define MAX_RAY_MARCHES 60
            #define NORM_OFF        0.0008   // Smaller epsilon for more accurate normals
            #define MAX_BOUNCES     5
            
            uniform int LOOPS;
            uniform float POWER;
            uniform bool ANIMATE;
            uniform float ROTATION_SPEED_X;
            uniform float ROTATION_SPEED_Y;
            uniform float ANIMATION_SPEED;
            uniform vec3 CAMERA_POS;
            uniform float HUE_OFFSET;
            uniform float SATURATION;
            uniform float BRIGHTNESS;
            uniform float BACKGROUND_OPACITY;
            
            out vec4 fragColor;
            
            mat3 g_rot  = mat3(1.0); 
            vec3 g_mat  = vec3(0.0);
            vec3 g_beer = vec3(0.0);
            bool g_hitGoo = false;
            
            // License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
            const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 hsv2rgb(vec3 c) {
              vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
              return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
            }
            
            #define HSV2RGB(c)  (c.z * mix(hsv2rgb_K.xxx, clamp(abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www) - hsv2rgb_K.xxx, 0.0, 1.0), c.y))
            
            // Color calculation using uniforms - calculate colors as needed
            vec3 getSkyCol() {
              float h = HUE_OFFSET + 0.6;
              return HSV2RGB(vec3(h, SATURATION, BRIGHTNESS));
            }
            
            vec3 getGlowCol() {
              float h = HUE_OFFSET + 0.065;
              return HSV2RGB(vec3(h, SATURATION * 0.93, BRIGHTNESS * 6.0));
            }
            
            vec3 getDiffuseCol() {
              float h = HUE_OFFSET + 0.6;
              return HSV2RGB(vec3(h, SATURATION * 0.99, BRIGHTNESS));
            }
            
            const vec3 lightPos   = vec3(0.0, 10.0, 0.0);
            
            const float initt       = 0.1; 
            
            // License: Unknown, author: nmz (twitter: @stormoid), found: https://www.shadertoy.com/view/NdfyRM
            vec3 sRGB(vec3 t) {
              return mix(1.055*pow(t, vec3(1./2.4)) - 0.055, 12.92*t, step(t, vec3(0.0031308)));
            }
            
            // License: Unknown, author: Matt Taylor (https://github.com/64), found: https://64.github.io/tonemapping/
            vec3 aces_approx(vec3 v) {
              v = max(v, 0.0);
              v *= 0.6;
              float a = 2.51;
              float b = 0.03;
              float c = 2.43;
              float d = 0.59;
              float e = 0.14;
              return clamp((v*(a*v+b))/(v*(c*v+d)+e), 0.0, 1.0);
            }
            
            // License: MIT, author: Inigo Quilez, found: https://iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
            float box(vec2 p, vec2 b) {
              vec2 d = abs(p)-b;
              return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
            }
            
            // License: MIT, author: Inigo Quilez, found: https://iquilezles.org/www/articles/intersectors/intersectors.htm
            float rayPlane(vec3 ro, vec3 rd, vec4 p) {
              return -(dot(ro,p.xyz)+p.w)/dot(rd,p.xyz);
            }
            
            // License: Unknown, author: EvilRyu, found: https://www.shadertoy.com/view/MdXSWn
            float mandelBulb(vec3 p) {
              float power = POWER;
              vec3 z  = p;
              vec3 dz = vec3(0.0);
              float r, theta, phi;
              float dr = 1.0;
              
              for(int i = 0; i < 16; ++i) {
                if(i >= LOOPS) break;
                r = length(z);
                if(r > 2.0) continue;
                theta = atan(z.y, z.x);
                if(ANIMATE) {
                  phi = asin(z.z / r) + time * ANIMATION_SPEED;
                } else {
                  phi = asin(z.z / r);
                }
                
                dr = pow(r, power - 1.0) * dr * power + 1.0;
              
                r = pow(r, power);
                theta = theta * power;
                phi = phi * power;
                
                z = r * vec3(cos(theta)*cos(phi), sin(theta)*cos(phi), sin(phi)) + p;
              }
              return 0.5 * log(r) * r / dr;
            }
            
            mat3 rot_z(float a) {
              float c = cos(a);
              float s = sin(a);
              return mat3(
                  c,s,0
                ,-s,c,0
                , 0,0,1
                );
            }
            
            mat3 rot_y(float a) {
              float c = cos(a);
              float s = sin(a);
              return mat3(
                  c,0,s
                , 0,1,0
                ,-s,0,c
                );
            }
            
            mat3 rot_x(float a) {
              float c = cos(a);
              float s = sin(a);
              return mat3(
                  1, 0,0
                , 0, c,s
                , 0,-s,c
                );
            }
            
            vec3 skyColor(vec3 ro, vec3 rd) {
              // Return solid black background with opacity control
              // Opacity is applied in main() to the final color
              return vec3(0.0);
            }
            
            float df(vec3 p) {
              p *= g_rot;
              vec3 p1 = p;
              const float z1 = 2.0;
              float d1 = mandelBulb(p1/z1)*z1;
            
              vec3 mat = vec3(0.8, 0.5, (1.-0.025));
              const vec3 gcol = HSV2RGB(vec3(0.05, 0.95, 2.0)); 
              vec3 beer = -gcol;
            
              float d = d1;
              
              g_mat = mat;
              g_beer = beer;
              return d;
            }
            
            vec3 normal(vec3 pos) {
              // Improved normal calculation with adaptive epsilon for better edge quality
              float dist = df(pos);
              float eps = max(NORM_OFF, abs(dist) * 0.001); // Adaptive epsilon based on distance
              
              vec3 nor;
              nor.x = df(pos+vec3(eps,0.0,0.0)) - df(pos-vec3(eps,0.0,0.0));
              nor.y = df(pos+vec3(0.0,eps,0.0)) - df(pos-vec3(0.0,eps,0.0));
              nor.z = df(pos+vec3(0.0,0.0,eps)) - df(pos-vec3(0.0,0.0,eps));
              return normalize(nor);
            }
            
            float rayMarch(vec3 ro, vec3 rd, float dfactor, out int ii) {
              float t = 0.0;
              float tol = dfactor*TOLERANCE;
              ii = MAX_RAY_MARCHES;
              for (int i = 0; i < MAX_RAY_MARCHES; ++i) {
                if (t > MAX_RAY_LENGTH) {
                  t = MAX_RAY_LENGTH;    
                  break;
                }
                float d = dfactor*df(ro + rd*t);
                if (d < TOLERANCE) {
                  ii = i;
                  break;
                }
                t += d;
              }
              return t;
            }
            
            vec3 render(vec3 ro, vec3 rd) {
              vec3 agg = vec3(0.0, 0.0, 0.0);
              vec3 ragg = vec3(1.0);
              g_hitGoo = false;
            
              bool isInside = df(ro) < 0.0;
            
              for (int bounce = 0; bounce < MAX_BOUNCES; ++bounce) {
                float dfactor = isInside ? -1.0 : 1.0;
                float mragg = min(min(ragg.x, ragg.y), ragg.z);
                if (mragg < 0.025) break;
                int iter;
                float st = rayMarch(ro, rd, dfactor, iter);
                const float mrm = 1.0/float(MAX_RAY_MARCHES);
                float ii = float(iter)*mrm;
                vec3 mat = g_mat;
                if (st >= MAX_RAY_LENGTH) {
                  // Background: black (opacity handled in main via alpha)
                  vec3 bgCol = skyColor(ro, rd);
                  agg += ragg * bgCol;
                  g_hitGoo = false;
                  break; 
                }
            
                g_hitGoo = true;
                vec3 sp = ro+rd*st;
            
                vec3 sn = dfactor*normal(sp);
                float fre = 1.0+dot(rd, sn);
                fre *= fre;
                fre = mix(0.1, 1.0, fre);
                
                // Edge smoothing: improve edge quality by smoothing based on distance field
                // This helps compensate for lack of DPR scaling
                float distAtSurface = abs(df(sp));
                float edgeSmoothFactor = smoothstep(TOLERANCE * 3.0, TOLERANCE, distAtSurface);
                fre = mix(fre, 1.0, edgeSmoothFactor * 0.2); // Subtle edge smoothing
            
                vec3 ld     = normalize(lightPos - sp);
            
                float dif   = max(dot(ld, sn), 0.0); 
                vec3 ref    = reflect(rd, sn);
                float re    = mat.z;
                float ire   = 1.0/re;
                vec3 refr   = refract(rd, sn, !isInside ? re : ire);
                vec3 rsky   = skyColor(sp, ref);
                vec3 diffuseCol = getDiffuseCol();
                vec3 col = vec3(0.0);    
                col += diffuseCol*dif*dif*(1.0-mat.x);
                float edge = smoothstep(1.0, 0.9, fre);
                col += rsky*mat.y*fre*vec3(1.0)*edge;
                if (isInside) {
                  ragg *= exp(-st*g_beer);
                }
                agg += ragg*col;
            
                if (refr == vec3(0.0)) {
                  rd = ref;
                } else {
                  ragg *= mat.x;
                  isInside = !isInside;
                  rd = refr;
                }
            
                ro = sp+initt*rd;
              }
            
              return agg;
            }
            
            void main() {
              g_rot = rot_x(ROTATION_SPEED_X*time)*rot_y(ROTATION_SPEED_Y*time);
              vec3 ro = CAMERA_POS;
              const vec3 la = vec3(0.0, 0.0, 0.0);
              const vec3 up = vec3(0.0, 1.0, 0.0);
            
              vec2 q = gl_FragCoord.xy/resolution.xy;
              vec2 p = -1. + 2. * q;
              p.x *= resolution.x/resolution.y;
            
              vec3 ww = normalize(la - ro);
              vec3 uu = normalize(cross(up, ww ));
              vec3 vv = normalize(cross(ww,uu));
              const float fov = tan(TAU/6.);
              vec3 rd = normalize(-p.x*uu + p.y*vv + fov*ww);
            
              vec3 col = render(ro, rd);
              
              col = aces_approx(col); 
              col = sRGB(col);
              
              // Output with alpha: goo is always opaque, background uses BACKGROUND_OPACITY
              float alpha = g_hitGoo ? 1.0 : BACKGROUND_OPACITY;
              fragColor = vec4(col, alpha);
            }
        `;
        
        const vs = gl.createShader(gl.VERTEX_SHADER);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        
        gl.shaderSource(vs, vertexShaderSource);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('Goo vertex shader error:', gl.getShaderInfoLog(vs));
            return null;
        }
        
        gl.shaderSource(fs, fragmentShaderSource);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('Goo fragment shader error:', gl.getShaderInfoLog(fs));
            return null;
        }
        
        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, vs);
        gl.attachShader(this.shaderProgram, fs);
        gl.linkProgram(this.shaderProgram);
        
        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            console.error('Goo program link error:', gl.getProgramInfoLog(this.shaderProgram));
            return null;
        }
        
        // Cache uniform locations
        this.uniforms = {
            resolution: gl.getUniformLocation(this.shaderProgram, 'resolution'),
            time: gl.getUniformLocation(this.shaderProgram, 'time'),
            loops: gl.getUniformLocation(this.shaderProgram, 'LOOPS'),
            power: gl.getUniformLocation(this.shaderProgram, 'POWER'),
            animate: gl.getUniformLocation(this.shaderProgram, 'ANIMATE'),
            rotationSpeedX: gl.getUniformLocation(this.shaderProgram, 'ROTATION_SPEED_X'),
            rotationSpeedY: gl.getUniformLocation(this.shaderProgram, 'ROTATION_SPEED_Y'),
            animationSpeed: gl.getUniformLocation(this.shaderProgram, 'ANIMATION_SPEED'),
            cameraPos: gl.getUniformLocation(this.shaderProgram, 'CAMERA_POS'),
            hueOffset: gl.getUniformLocation(this.shaderProgram, 'HUE_OFFSET'),
            saturation: gl.getUniformLocation(this.shaderProgram, 'SATURATION'),
            brightness: gl.getUniformLocation(this.shaderProgram, 'BRIGHTNESS'),
            backgroundOpacity: gl.getUniformLocation(this.shaderProgram, 'BACKGROUND_OPACITY')
        };
        
        console.log('Goo: Shader program compiled successfully');
    }
    
    resize() {
        if (!this.gl) return;
        
        // Get dimensions from container
        const container = document.getElementById('visualizationContainer');
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight;
        
        // Set CSS size
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Set buffer size (1:1 pixel ratio, no DPR scaling for performance)
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Update viewport
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    
    setupControls() {
        // Background opacity (at the top)
        this.addControl('backgroundOpacity', {
            type: 'dial',
            label: 'Background Opacity',
            min: 0,
            max: 100,
            step: 1,
            value: 100,
            unit: '%',
            onChange: (value) => { this.backgroundOpacity = value / 100; }
        });
        
        // Mandelbulb parameters
        this.addControl('loops', {
            type: 'dial',
            label: 'Iterations',
            min: 1,
            max: 8,
            step: 1,
            value: 2,
            onChange: (value) => { this.loops = value; }
        });
        
        this.addControl('power', {
            type: 'dial',
            label: 'Power',
            min: 20,
            max: 200,
            step: 1,
            value: 80,
            onChange: (value) => { this.power = value / 10; }
        });
        
        this.addControl('animate', {
            type: 'checkbox',
            label: 'Animate',
            className: 'btn-primary-mixer',
            value: true,
            onChange: (value) => { this.animate = value; }
        });
        
        // Rotation controls
        this.addControl('rotationSpeedX', {
            type: 'dial',
            label: 'Rotation X',
            min: -100,
            max: 100,
            step: 1,
            value: 20,
            onChange: (value) => { 
                // Store target value, will be smoothed in onUpdate
                this.rotationSpeedX = value / 100; 
            }
        });
        
        this.addControl('rotationSpeedY', {
            type: 'dial',
            label: 'Rotation Y',
            min: -100,
            max: 100,
            step: 1,
            value: 30,
            onChange: (value) => { 
                // Store target value, will be smoothed in onUpdate
                this.rotationSpeedY = value / 100; 
            }
        });
        
        this.addControl('animationSpeed', {
            type: 'dial',
            label: 'Animation Speed',
            min: 0,
            max: 200,
            step: 1,
            value: 20,
            onChange: (value) => { 
                // Store target value, will be smoothed in onUpdate
                this.animationSpeed = value / 100; 
            }
        });
        
        // Camera controls
        this.addControl('cameraDistance', {
            type: 'dial',
            label: 'Camera Distance',
            min: -100,
            max: 100,
            step: 1,
            value: 0, // 0 = current position, -100 = zoom in, 100 = zoom out
            onChange: (value) => { this.cameraDistance = value; } // Store as -100 to 100
        });
        
        this.addControl('cameraHeight', {
            type: 'dial',
            label: 'Camera Height',
            min: 0,
            max: 500,
            step: 1,
            value: 324,
            onChange: (value) => { this.cameraHeight = value / 100; }
        });
        
        this.addControl('cameraDepth', {
            type: 'dial',
            label: 'Camera Depth',
            min: 0,
            max: 1000,
            step: 1,
            value: 465,
            onChange: (value) => { this.cameraDepth = value / 100; }
        });
        
        // Audio reactivity
        this.addControl('audioRotationSens', {
            type: 'dial',
            label: 'Audio Rotation',
            min: 0,
            max: 100,
            step: 1,
            value: 0,
            onChange: (value) => { this.audioRotationSens = value / 100; }
        });
        
        this.addControl('audioPowerSens', {
            type: 'dial',
            label: 'Audio Power',
            min: 0,
            max: 100,
            step: 1,
            value: 82,
            onChange: (value) => { this.audioPowerSens = value / 100; }
        });
        
        this.addControl('audioAnimationSens', {
            type: 'dial',
            label: 'Audio Animation',
            min: 0,
            max: 100,
            step: 1,
            value: 0,
            onChange: (value) => { this.audioAnimationSens = value / 100; }
        });
        
        // Color controls
        this.addControl('hueOffset', {
            type: 'dial',
            label: 'Hue Shift',
            min: 0,
            max: 360,
            step: 5,
            value: 0,
            unit: '°',
            onChange: (value) => { this.hueOffset = value / 360; } // Convert to 0-1 range
        });
        
        this.addControl('saturation', {
            type: 'dial',
            label: 'Saturation',
            min: 0,
            max: 100,
            step: 1,
            value: 86,
            unit: '%',
            onChange: (value) => { this.saturation = value / 100; } // Convert to 0-1 range
        });
        
        this.addControl('brightness', {
            type: 'dial',
            label: 'Brightness',
            min: 0,
            max: 100,
            step: 1,
            value: 100,
            unit: '%',
            onChange: (value) => { this.brightness = value / 100; } // Convert to 0-1 range
        });
    }
    
    setupPresets() {
        // Cyan/Blue - Cool tech vibe
        this.addPreset('Cyan Flow', {
            values: {
                loops: 2,
                power: 80, // Control expects 20-200, value 80 = 8.0
                animate: true,
                rotationSpeedX: 20, // Control expects -100 to 100, value 20 = 0.2
                rotationSpeedY: 30, // Control expects -100 to 100, value 30 = 0.3
                animationSpeed: 20, // Control expects 0-200, value 20 = 0.2
                cameraDistance: 0, // Control expects -100 to 100, value 0 = current position
                cameraHeight: 324, // Control expects 0-500, value 324 = 3.24
                cameraDepth: 465, // Control expects 0-1000, value 465 = 4.65
                audioRotationSens: 0, // Control expects 0-100, value 0 = 0.0
                audioPowerSens: 82, // Control expects 0-100, value 82 = 0.82
                audioAnimationSens: 0, // Control expects 0-100, value 0 = 0.0
                hueOffset: 180, // Control expects 0-360, value 180 = 0.5 (cyan/blue)
                saturation: 90, // Control expects 0-100, value 90 = 0.9
                brightness: 100, // Control expects 0-100, value 100 = 1.0
                backgroundOpacity: 100 // Control expects 0-100, value 100 = 1.0
            }
        });
        
        // Orange/Red - Warm fire vibe
        this.addPreset('Fire Glow', {
            values: {
                loops: 2,
                power: 80,
                animate: true,
                rotationSpeedX: 25,
                rotationSpeedY: 35,
                animationSpeed: 25,
                cameraDistance: 0,
                cameraHeight: 324,
                cameraDepth: 465,
                audioRotationSens: 30,
                audioPowerSens: 50,
                audioAnimationSens: 20,
                hueOffset: 0, // Orange/Red (0 degrees)
                saturation: 95,
                brightness: 100,
                backgroundOpacity: 100
            }
        });
        
        // Purple/Magenta - Deep space vibe
        this.addPreset('Purple Dream', {
            values: {
                loops: 3,
                power: 80,
                animate: true,
                rotationSpeedX: 15,
                rotationSpeedY: 20,
                animationSpeed: 15,
                cameraDistance: 0,
                cameraHeight: 324,
                cameraDepth: 465,
                audioRotationSens: 20,
                audioPowerSens: 40,
                audioAnimationSens: 30,
                hueOffset: 300, // Purple/Magenta (300 degrees)
                saturation: 85,
                brightness: 95,
                backgroundOpacity: 100
            }
        });
        
        // Green - Toxic/neon vibe
        this.addPreset('Neon Toxic', {
            values: {
                loops: 2,
                power: 80,
                animate: true,
                rotationSpeedX: 30,
                rotationSpeedY: 40,
                animationSpeed: 30,
                cameraDistance: 0,
                cameraHeight: 324,
                cameraDepth: 465,
                audioRotationSens: 40,
                audioPowerSens: 60,
                audioAnimationSens: 40,
                hueOffset: 120, // Green (120 degrees)
                saturation: 100,
                brightness: 100,
                backgroundOpacity: 100
            }
        });
        
        // Yellow/Gold - Bright energy vibe
        this.addPreset('Golden Energy', {
            values: {
                loops: 2,
                power: 80,
                animate: true,
                rotationSpeedX: 20,
                rotationSpeedY: 30,
                animationSpeed: 20,
                cameraDistance: 0,
                cameraHeight: 324,
                cameraDepth: 465,
                audioRotationSens: 0,
                audioPowerSens: 82,
                audioAnimationSens: 0,
                hueOffset: 60, // Yellow/Gold (60 degrees)
                saturation: 90,
                brightness: 100,
                backgroundOpacity: 100
            }
        });
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        // Initialize start time on first update to prevent wild spinning
        if (this.startTime === null) {
            this.startTime = timestamp;
        }
        
        const smoothing = 0.7;
        this.bassLevel = this.bassLevel * smoothing + (sharedAudioData.bass || 0) * (1 - smoothing);
        this.midLevel = this.midLevel * smoothing + (sharedAudioData.mid || 0) * (1 - smoothing);
        this.trebleLevel = this.trebleLevel * smoothing + (sharedAudioData.treble || 0) * (1 - smoothing);
        this.energyLevel = this.energyLevel * smoothing + (sharedAudioData.energy || 0) * (1 - smoothing);
        
        // Smooth rotation speeds to prevent jumps when controls change
        const rotationSmoothing = 0.9; // Strong smoothing for smooth transitions
        this.smoothedRotationSpeedX = this.smoothedRotationSpeedX * rotationSmoothing + Math.abs(this.rotationSpeedX) * (1 - rotationSmoothing);
        this.smoothedRotationSpeedY = this.smoothedRotationSpeedY * rotationSmoothing + Math.abs(this.rotationSpeedY) * (1 - rotationSmoothing);
        
        // Extra smoothing for animation speed to prevent jumpiness
        // Use stronger smoothing (0.85) for very smooth transitions
        const animationSmoothing = 0.85;
        const rawEnergy = sharedAudioData.energy || 0;
        this.smoothedAnimationEnergy = this.smoothedAnimationEnergy * animationSmoothing + rawEnergy * (1 - animationSmoothing);
        
        // Calculate target animation speed based on energy (like a car accelerating)
        // Low energy (ambient) = slower, high energy (rock) = faster
        const tempoModifier = 0.5 + this.smoothedAnimationEnergy * 1.5; // Low energy = 0.5x, high energy = 2.0x
        const targetAnimationSpeed = Math.abs(this.animationSpeed) * tempoModifier * (1 + this.smoothedAnimationEnergy * this.audioAnimationSens);
        
        // Smooth the animation speed itself (very strong smoothing to prevent any bounce)
        // This ensures speed changes are gradual, like a car accelerating smoothly
        const speedSmoothing = 0.95; // Very strong smoothing for ultra-smooth transitions
        this.smoothedAnimationSpeed = this.smoothedAnimationSpeed * speedSmoothing + targetAnimationSpeed * (1 - speedSmoothing);
        
        // Ensure minimum speed to prevent stuttering (always > 0)
        this.smoothedAnimationSpeed = Math.max(0.01, this.smoothedAnimationSpeed);
        
        // Update time relative to start time (prevents wild spinning on load)
        this.time = (timestamp - this.startTime) * 0.001;
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.gl || !this.shaderProgram) {
            return;
        }
        
        const gl = this.gl;
        
        // Audio-reactive modulation
        // Use smoothed rotation speeds to prevent jumps when controls change
        const audioRotationX = this.smoothedRotationSpeedX * (1 + this.energyLevel * this.audioRotationSens);
        const audioRotationY = this.smoothedRotationSpeedY * (1 + this.energyLevel * this.audioRotationSens);
        const audioPower = this.power * (1 + this.bassLevel * this.audioPowerSens);
        
        // Use pre-smoothed animation speed (calculated in onUpdate for consistency)
        // This ensures the animation always moves forward smoothly, like a car accelerating
        const audioAnimationSpeed = this.smoothedAnimationSpeed;
        
        // Calculate camera position with distance zoom control
        // cameraDistance: 0 = current position, -100 = zoom in (closer), 100 = zoom out (farther)
        // Convert -100 to 100 range to a multiplier: 0 = 1.0, -100 = 0.2 (5x zoom in), 100 = 3.0 (3x zoom out)
        // Use piecewise linear: -100→0.2, 0→1.0, 100→3.0
        let distanceMultiplier;
        if (this.cameraDistance <= 0) {
            // Zoom in: -100 to 0 maps to 0.2 to 1.0
            distanceMultiplier = 1.0 + (this.cameraDistance / 100) * 0.8; // -100→0.2, 0→1.0
        } else {
            // Zoom out: 0 to 100 maps to 1.0 to 3.0
            distanceMultiplier = 1.0 + (this.cameraDistance / 100) * 2.0; // 0→1.0, 100→3.0
        }
        
        const cameraPosX = 0.0;
        const cameraPosY = this.cameraHeight;
        const cameraPosZ = this.cameraDepth * distanceMultiplier; // Scale depth based on distance control
        
        // Render
        gl.useProgram(this.shaderProgram);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Clear
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Bind vertex buffer
        const pos = gl.getAttribLocation(this.shaderProgram, 'position');
        gl.enableVertexAttribArray(pos);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        
        // Set uniforms
        gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.time, this.time);
        gl.uniform1i(this.uniforms.loops, this.loops);
        gl.uniform1f(this.uniforms.power, audioPower);
        gl.uniform1i(this.uniforms.animate, this.animate ? 1 : 0);
        gl.uniform1f(this.uniforms.rotationSpeedX, audioRotationX);
        gl.uniform1f(this.uniforms.rotationSpeedY, audioRotationY);
        gl.uniform1f(this.uniforms.animationSpeed, audioAnimationSpeed);
        gl.uniform3f(this.uniforms.cameraPos, 
            cameraPosX, 
            cameraPosY, 
            cameraPosZ
        );
        
        // Set color uniforms
        gl.uniform1f(this.uniforms.hueOffset, this.hueOffset);
        gl.uniform1f(this.uniforms.saturation, this.saturation);
        gl.uniform1f(this.uniforms.brightness, this.brightness);
        gl.uniform1f(this.uniforms.backgroundOpacity, this.backgroundOpacity);
        
        // Enable alpha blending for transparency support
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        gl.flush();
    }
    
    shouldClearCanvas() {
        // WebGL handles its own clearing
        return false;
    }
    
    onCleanup() {
        if (!this.gl) return;
        const gl = this.gl;
        if (this.shaderProgram) gl.deleteProgram(this.shaderProgram);
        if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    }
}

// Auto-register
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new GooPlugin(window.visualizer);
    }
}, 500);

