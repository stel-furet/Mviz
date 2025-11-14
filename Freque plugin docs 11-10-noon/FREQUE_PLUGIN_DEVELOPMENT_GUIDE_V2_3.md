# Freque Plugin Development Guide v2.2

**Complete guide for creating audio-reactive visualizations with advanced Three.js and WebGL techniques**

---

## What's New in v2.2

- **WebGL/WebGL2 Plugin Architecture** - Raw WebGL and WebGL2 shader plugins now supported âœ…
- **Context Type Flexibility** - Plugins can choose 2D, WebGL, or WebGL2 contexts
- **Lazy Context Loading** - Base class no longer forces 2D context creation
- **Backwards Compatible** - Existing 2D and Three.js plugins work unchanged

## What's in v2.1

- **Float Speed Non-Linear Scaling** - Two-part curve for better UX
- **Video Intensity Auto-Adjustment** - Automatic brightness compensation
- **Control Update Behavior** - Documentation of immediate vs deferred updates

## What's in v2.0

- **Cube Camera Video Reflection System** - Complete implementation guide
- **Layer Management** - Selective visibility for complex scenes  
- **Color Space Management** - sRGB encoding best practices
- **Dynamic Environment Mapping** - Position-based reflections
- **Performance Optimization** - Strategies for complex 3D scenes

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Canvas Context Types](#canvas-context-types) â­ NEW
3. [2D Canvas Plugins](#2d-canvas-plugins)
4. [WebGL/WebGL2 Plugins](#webglwebgl2-plugins) â­ NEW
5. [Three.js Integration](#threejs-integration)
6. [Advanced Three.js Techniques](#advanced-threejs-techniques)
7. [Audio Integration](#audio-integration)
8. [UI Controls](#ui-controls)
9. [Performance Optimization](#performance-optimization)
10. [Best Practices](#best-practices)

---

# Quick Start

## Basic Plugin Template

```javascript
class MyPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('myplugin', visualizer, {
            version: '1.0.0',
            author: 'Your Name',
            description: 'My Awesome Plugin',
            targetFPS: 60
        });
        
        this.setupControls();
        this.setupPresets();
    }
    
    setupControls() {
        this.addControl('size', {
            type: 'dial',
            label: 'Size',
            min: 1,
            max: 100,
            step: 1,
            value: 50,
            onChange: (value) => {
                this.size = value;
            }
        });
    }
    
    setupPresets() {
        this.addPreset('default', {
            name: 'Default',
            values: { size: 50 }
        });
    }
    
    onInitialize() {
        // Setup your visualization
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        // Update logic
        const energy = this.getAudioEnergy();
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        // Draw to canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Auto-register
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new MyPlugin(window.visualizer);
    }
}, 500);
```

---

# Canvas Context Types

## Understanding Canvas Context Architecture

**CRITICAL CONCEPT:** A canvas element can only have ONE context type at a time. Once you call `canvas.getContext('2d')`, you cannot get a WebGL or WebGL2 context from that same canvas. This is a fundamental browser limitation.

### Previous Architecture (Before v2.2)

```javascript
// In FrequePluginBase resize/setCanvasDimensions:
this.canvas.width = width;
this.canvas.height = height;
this.ctx = this.canvas.getContext('2d'); // âŒ FORCED 2D context creation
```

**Problem:** This forced EVERY plugin to use a 2D context, making WebGL/WebGL2 plugins impossible.

### New Architecture (v2.2+)

```javascript
// 1. In constructor - Lazy-loaded 2D context
this._ctx = null; // Private storage

Object.defineProperty(this, 'ctx', {
    get: function() {
        if (!this._ctx && this.canvas) {
            this._ctx = this.canvas.getContext('2d'); // Only created when accessed
        }
        return this._ctx;
    }
});

// 2. In setCanvasDimensions - NO context creation
this.canvas.width = width;
this.canvas.height = height;
// Context is NOT created - plugin decides what it needs

// 3. In render() - Smart clearing
if (this.shouldClearCanvas() && this._ctx) { // Only clears if 2D context exists
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
}
```

**Solution:** The base class no longer creates a context automatically. Plugins explicitly create the context type they need.

---

## Plugin Type Decision Guide

### Use 2D Canvas When:
- Drawing shapes, text, images, gradients
- Using canvas drawing API (fillRect, drawImage, etc.)
- Simple 2D visualizations
- Particle systems in 2D space

**Example Plugins:** Waveform displays, 2D particle effects, spectrum analyzers

---

### Use WebGL When:
- Need GPU-accelerated 2D effects
- Custom shaders for post-processing
- Large numbers of simple objects (thousands+)
- Compatibility with older browsers/devices

**Example Plugins:** GPU particle systems, shader-based effects

---

### Use WebGL2 When:
- Advanced shader features (texture arrays, transform feedback)
- Modern GPU capabilities required
- Complex fragment shader calculations
- Better performance on modern hardware

**Example Plugins:** Advanced liquid simulations, complex procedural effects, PSYCH visualizer

---

### Use Three.js When:
- 3D scenes with meshes, lights, cameras
- Video reflections (cube cameras)
- Complex 3D geometry
- Environment mapping

**Example Plugins:** Chrome Spheres, 3D objects, particle clouds in 3D space

---

## Context Type Compatibility Matrix

| Feature | 2D Canvas | WebGL | WebGL2 | Three.js |
|---------|-----------|-------|--------|----------|
| Browser Support | âœ… Universal | âœ… ~97% | âœ… ~95% | âœ… ~97% |
| GPU Acceleration | âŒ CPU Only | âœ… Yes | âœ… Yes | âœ… Yes |
| Custom Shaders | âŒ No | âœ… GLSL 1.0 | âœ… GLSL 3.0 | âœ… GLSL 1.0/3.0 |
| 3D Rendering | âŒ No | âš ï¸ Manual | âš ï¸ Manual | âœ… Built-in |
| Learning Curve | âœ… Easy | âš ï¸ Moderate | âš ï¸ Hard | âœ… Moderate |
| Performance | âš ï¸ Limited | âœ… Good | âœ… Excellent | âœ… Good |
| File Size | âœ… Minimal | âœ… Small | âœ… Small | âš ï¸ ~700KB |

---

# 2D Canvas Plugins

## Basic 2D Plugin Template

**No changes required from previous versions - works exactly as before:**

```javascript
class My2DPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('my2dplugin', visualizer, {
            version: '1.0.0',
            author: 'Your Name',
            description: '2D Visualization',
            targetFPS: 60
        });
        
        this.setupControls();
    }
    
    onInitialize() {
        // Nothing special needed - just use this.ctx
        console.log('2D plugin initialized');
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        // this.ctx auto-creates 2D context on first access
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw visualization
        const energy = this.getAudioEnergy();
        this.ctx.fillStyle = `hsl(${energy * 360}, 100%, 50%)`;
        this.ctx.fillRect(
            this.canvas.width / 2 - 50,
            this.canvas.height / 2 - 50,
            100,
            100
        );
    }
}
```

**Key Point:** Accessing `this.ctx` automatically creates the 2D context on first use. This is completely backwards compatible with all existing plugins.

---

# WebGL/WebGL2 Plugins

## WebGL2 Plugin Template

**NEW in v2.2 - Now fully supported:**

```javascript
class MyWebGL2Plugin extends FrequePluginBase {
    constructor(visualizer) {
        super('mywebgl2plugin', visualizer, {
            version: '1.0.0',
            author: 'Your Name',
            description: 'WebGL2 Shader Visualization',
            targetFPS: 60
        });
        
        this.setupControls();
    }
    
    onInitialize() {
        // Create WebGL2 context BEFORE accessing this.ctx
        this.gl = this.canvas.getContext('webgl2', {
            alpha: false,
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false
        });
        
        if (!this.gl) {
            console.error('WebGL2 not supported');
            return;
        }
        
        console.log('WebGL2 context created successfully');
        
        // Initialize shaders, buffers, uniforms
        this.initShaders();
        this.initBuffers();
        
        // Handle resize
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }
    
    initShaders() {
        const gl = this.gl;
        
        // Vertex shader
        const vertexShaderSource = `#version 300 es
            in vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        // Fragment shader  
        const fragmentShaderSource = `#version 300 es
            precision highp float;
            
            uniform vec2 resolution;
            uniform float time;
            
            out vec4 fragColor;
            
            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;
                vec3 color = vec3(uv.x, uv.y, abs(sin(time)));
                fragColor = vec4(color, 1.0);
            }
        `;
        
        // Compile and link shaders
        const vs = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
            return;
        }
        
        // Get uniform locations
        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'resolution'),
            time: gl.getUniformLocation(this.program, 'time')
        };
    }
    
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
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
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const positionLoc = gl.getAttribLocation(this.program, 'position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    }
    
    resize() {
        if (!this.gl) return;

        // Get dimensions from container, NOT canvas.clientWidth
        const container = document.getElementById('visualizationContainer');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight;

        // Set CSS size
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        // Set buffer size with DPI
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        // Update viewport
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        // Update time for shader animation
        this.time = timestamp * 0.001;
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        const gl = this.gl;
        
        if (!gl || !this.program) return;
        
        gl.useProgram(this.program);
        
        // Set uniforms
        gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.time, this.time || 0);
        
        // Draw fullscreen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    shouldClearCanvas() {
        // WebGL handles its own clearing
        return false;
    }
}

// Auto-register
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new MyWebGL2Plugin(window.visualizer);
    }
}, 500);
```

---

## WebGL Plugin Template

**For WebGL 1.0 (better compatibility):**

```javascript
class MyWebGLPlugin extends FrequePluginBase {
    onInitialize() {
        // Create WebGL context (not WebGL2)
        this.gl = this.canvas.getContext('webgl', {
            alpha: true,
            antialias: true,
            premultipliedAlpha: false
        });
        
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }
        
        // Use GLSL 1.0 shaders
        const vertexShader = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        const fragmentShader = `
            precision mediump float;
            uniform vec2 resolution;
            uniform float time;
            
            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;
                gl_FragColor = vec4(uv.x, uv.y, abs(sin(time)), 1.0);
            }
        `;
        
        // Setup shaders and buffers...
    }
    
    shouldClearCanvas() {
        return false;
    }
}
```

---

## Key Rules for WebGL/WebGL2 Plugins

### âœ… DO:

1. **Create context in `onInitialize()`**
   ```javascript
   this.gl = this.canvas.getContext('webgl2', {...});
   ```

2. **Create context BEFORE accessing `this.ctx`**
   - Once you access `this.ctx`, a 2D context is created
   - You cannot get WebGL context after that

3. **Check for context support**
   ```javascript
   if (!this.gl) {
       console.error('WebGL2 not supported');
       return;
   }
   ```

4. **Override `shouldClearCanvas()`**
   ```javascript
   shouldClearCanvas() {
       return false; // WebGL handles its own clearing
   }
   ```

5. **Handle resize manually with container dimensions**
   ```javascript
   resize() {
       if (!this.gl) return;

       // CRITICAL: Get dimensions from container, NOT canvas.clientWidth
       // canvas.clientWidth may return wrong/0 values
       const container = document.getElementById('visualizationContainer');
       if (!container) return;

       const rect = container.getBoundingClientRect();
       const width = rect.width || window.innerWidth;
       const height = rect.height || window.innerHeight;

       // Set CSS display size
       this.canvas.style.width = width + 'px';
       this.canvas.style.height = height + 'px';

       // Set actual buffer size (accounts for DPI)
       const dpr = window.devicePixelRatio || 1;
       this.canvas.width = width * dpr;
       this.canvas.height = height * dpr;

       // Update WebGL viewport
       this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
   }
   ```

   **Why not `canvas.clientWidth`?**
   - `canvas.clientWidth` returns CSS dimensions which may be 0 or incorrect
   - Multiplying by `devicePixelRatio` can result in 4x oversized canvas
   - Always get dimensions from `visualizationContainer` instead

### âŒ DON'T:

1. **Don't access `this.ctx` in WebGL plugins**
   - Creates a 2D context, breaking WebGL

2. **Don't rely on base class clearing**
   - WebGL needs `gl.clear()`, not `clearRect()`

3. **Don't use `canvas.clientWidth` for sizing**
   - Returns CSS dimensions which may be wrong/0
   - Causes 4x oversized canvas bug when multiplied by devicePixelRatio
   - **Always** use `visualizationContainer` dimensions instead

4. **Don't forget DPI scaling**
   - WebGL canvas needs proper resolution setup

5. **Don't forget to check browser support**
   - WebGL2 is ~95% supported, but not universal

---

## WebGL vs WebGL2 Comparison

| Feature | WebGL 1.0 | WebGL2 |
|---------|-----------|--------|
| Browser Support | ~97% | ~95% |
| GLSL Version | 1.0 | 3.0 ES |
| Texture Arrays | âŒ No | âœ… Yes |
| 3D Textures | âŒ No | âœ… Yes |
| Transform Feedback | âŒ No | âœ… Yes |
| Multiple Render Targets | âŒ Extension | âœ… Built-in |
| Integer Textures | âŒ No | âœ… Yes |
| Sampler Objects | âŒ No | âœ… Yes |

**Recommendation:**
- Use **WebGL2** for new advanced shader plugins
- Use **WebGL 1.0** for maximum compatibility
- Use **Three.js** for 3D scenes (handles both automatically)

---

# Quick Start

## Three.js Plugins and Context Handling

**IMPORTANT:** Three.js plugins work differently from raw WebGL plugins regarding canvas context:

### Three.js Handles Context Automatically

```javascript
class MyThreePlugin extends FrequePluginBase {
    onInitialize() {
        // Three.js creates its own WebGL context internally
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas, // Pass this.canvas directly
            alpha: true,
            antialias: true
        });
        
        // DO NOT call this.canvas.getContext()
        // DO NOT access this.ctx
        // Three.js manages everything
    }
}
```

**Why Three.js is Different:**
- Three.js's `WebGLRenderer` handles context creation internally
- You pass `this.canvas` to the renderer, and it does the rest
- No need to manually call `getContext()`
- Works seamlessly with the new v2.2 architecture

**Key Point:** Three.js plugins are **unchanged** from previous versions. The new WebGL/WebGL2 architecture only affects plugins that manually create WebGL contexts.

---

## Standard Three.js Setup

### Step 1: Get Container Dimensions

**CRITICAL:** Always get size from `visualizationContainer`, NOT canvas buffer.

```javascript
onInitialize() {
    // Get dimensions from container
    const container = document.getElementById('visualizationContainer');
    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;
    
    console.log(`Container dimensions: ${width}x${height}`);
}
```

### Step 2: Create Scene and Camera

```javascript
// Create scene
this.scene = new THREE.Scene();

// Create camera with container aspect ratio
this.camera = new THREE.PerspectiveCamera(
    75,
    width / height,
    0.1,
    1000
);
this.camera.position.z = 20;
this.camera.position.y = 20 * 0.2;  // Vertical offset for better viewing angle
this.camera.lookAt(0, 0, 0);
```

**Camera Positioning Note:**
The Y position is set to 20% of the camera distance (`distance * 0.2`). This provides a slight downward viewing angle that improves depth perception and overall visual quality.

### Step 3: Create Renderer

```javascript
this.renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true
});

// Set pixel ratio for high-DPI displays
this.renderer.setPixelRatio(window.devicePixelRatio);

// Use container dimensions
this.renderer.setSize(width, height);

// Set color space (important for matching Freque's visuals)
if (this.renderer.outputEncoding !== undefined) {
    this.renderer.outputEncoding = THREE.sRGBEncoding;
}
```

### Step 4: Setup Canvas CSS

**CRITICAL:** Set CSS properties individually, NOT with cssText.

```javascript
const threeCanvas = this.renderer.domElement;
threeCanvas.id = this.canvasId;
threeCanvas.className = this.canvas.className;

// Set each CSS property individually
threeCanvas.style.position = 'absolute';
threeCanvas.style.top = '0';
threeCanvas.style.left = '0';
threeCanvas.style.width = '100%';    // Percentage, not pixels
threeCanvas.style.height = '100%';   // Percentage, not pixels
threeCanvas.style.pointerEvents = 'none';
threeCanvas.style.zIndex = this.canvas.style.zIndex || this.zIndex.toString();
threeCanvas.style.display = this.canvas.style.display || 'block';
threeCanvas.style.opacity = this.canvas.style.opacity || '1';
```

### Step 5: Replace Canvas in DOM

```javascript
if (this.canvas.parentNode) {
    this.canvas.parentNode.replaceChild(threeCanvas, this.canvas);
}
this.canvas = threeCanvas;
```

### Step 6: Add Lighting

```javascript
// Ambient light for overall illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
this.scene.add(ambientLight);

// Directional lights for reflections
const light1 = new THREE.DirectionalLight(0xffffff, 1.0);
light1.position.set(10, 10, 10);
this.scene.add(light1);

const light2 = new THREE.DirectionalLight(0xffffff, 0.6);
light2.position.set(-10, -10, -10);
this.scene.add(light2);
```

---

# Advanced Three.js Techniques

## Video/Background Textures

### Finding Video Element

```javascript
// Try multiple selectors
const videoElement = document.querySelector('#bgVideo') || 
                     document.querySelector('#bgVideoPlaceholder') ||
                     document.querySelector('video');

if (!videoElement) {
    console.warn('No video element found');
    return;
}

this.videoElement = videoElement;
```

### Finding Background Image

```javascript
const bgImageDiv = document.querySelector('#bgImage');

if (!bgImageDiv) {
    console.warn('No background image div found');
    return;
}

const computedStyle = window.getComputedStyle(bgImageDiv);
const backgroundImage = computedStyle.backgroundImage;

if (!backgroundImage || backgroundImage === 'none') {
    return;
}

// Extract URL from CSS
const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
if (urlMatch) {
    const imageUrl = urlMatch[1];
    
    // Load image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
        this.createBackgroundTexture(img);
    };
}
```

### Creating Video Texture (Direct Mode)

For mapping video directly onto surfaces:

```javascript
this.videoTexture = new THREE.VideoTexture(videoElement);
this.videoTexture.minFilter = THREE.LinearFilter;
this.videoTexture.magFilter = THREE.LinearFilter;
this.videoTexture.mapping = THREE.UVMapping;  // Standard UV mapping
this.videoTexture.format = THREE.RGBFormat;
this.videoTexture.flipY = true;  // Correct orientation

// Apply to material
material.map = this.videoTexture;
```

### Creating Background Image Texture (Direct Mode)

```javascript
this.bgImageTexture = new THREE.Texture(imageElement);
this.bgImageTexture.needsUpdate = true;
this.bgImageTexture.mapping = THREE.UVMapping;
this.bgImageTexture.flipY = true;  // Correct orientation

// Apply to material
material.map = this.bgImageTexture;
```

---

## Cube Camera System for Video Reflections

**Why Cube Cameras?**

Three.js r120+ doesn't support video textures with EquirectangularReflectionMapping for environment maps. To get video reflections on chrome/metallic surfaces, you must use a cube camera system.

### When to Use Cube Cameras

✅ **Use Cube Cameras For:**
- Video reflections on metallic/chrome materials
- Dynamic environment mapping
- Real-time reflections that change based on object position
- Complex reflective surfaces with videos

❌ **Don't Need Cube Cameras For:**
- Static background image reflections (use EquirectangularReflectionMapping)
- Direct video textures on surfaces (use UVMapping)
- Non-reflective materials

### Complete Cube Camera Implementation

#### Step 1: Create Cube Render Target

```javascript
// High resolution for quality (4096 = 4k per cube face)
// Can reduce to 2048 or 1024 for better performance
this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(4096, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter
});

// Set color space to match renderer
if (this.cubeRenderTarget.texture.encoding !== undefined) {
    this.cubeRenderTarget.texture.encoding = THREE.sRGBEncoding;
}
```

#### Step 2: Create Cube Camera

```javascript
// Cube camera positioned at origin
this.cubeCamera = new THREE.CubeCamera(
    0.1,   // near
    1000,  // far
    this.cubeRenderTarget
);

this.cubeCamera.position.set(0, 0, 0);

// Enable layer 1 so it can see the video sphere
this.cubeCamera.layers.enable(1);

this.scene.add(this.cubeCamera);

// Store the generated cube map texture
this.cubeMapTexture = this.cubeRenderTarget.texture;
```

#### Step 3: Create Large Video Sphere

The cube camera needs something to capture. Create a large inverted sphere textured with video:

```javascript
// Large sphere geometry (500 units radius)
const sphereGeometry = new THREE.SphereGeometry(500, 120, 80);
// Invert sphere to face inward
sphereGeometry.scale(-1, 1, 1);

// Create video texture for sphere
const videoTextureForSphere = new THREE.VideoTexture(videoElement);
videoTextureForSphere.minFilter = THREE.LinearFilter;
videoTextureForSphere.magFilter = THREE.LinearFilter;
videoTextureForSphere.mapping = THREE.EquirectangularReflectionMapping;
videoTextureForSphere.format = THREE.RGBAFormat;

// Set color space
if (videoTextureForSphere.encoding !== undefined) {
    videoTextureForSphere.encoding = THREE.sRGBEncoding;
}

// Create material
const sphereMaterial = new THREE.MeshBasicMaterial({
    map: videoTextureForSphere
});

// Create mesh
this.videoSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

// Base rotations for correct orientation
this.videoSphere.rotation.y = Math.PI / 2;        // 90 degrees
this.videoSphere.rotation.x = -35 * (Math.PI / 180);  // -35 degrees

// Set to layer 1 (hidden from main camera, visible to cube camera)
this.videoSphere.layers.set(1);
this.videoSphere.visible = true;

this.scene.add(this.videoSphere);
```

#### Step 4: Apply Cube Map to Materials

```javascript
// For chrome/metallic materials
material.map = null;  // Remove direct texture
material.envMap = this.cubeMapTexture;  // Apply cube map
material.metalness = 1.0;
material.roughness = 0.0;
material.envMapIntensity = 0.5;  // Adjust for desired reflection strength
material.needsUpdate = true;
```

#### Step 5: Update Cube Camera Every Frame

In your `onRender()` method:

```javascript
onRender(deltaTime, timestamp, sharedAudioData) {
    // Update video texture
    if (this.videoElement && !this.videoElement.paused && 
        this.videoElement.readyState >= 2) {
        
        // Update video texture on sphere
        if (this.videoSphere.material && this.videoSphere.material.map) {
            this.videoSphere.material.map.needsUpdate = true;
        }
        
        // Update cube camera (required for video reflections)
        // Hide reflective objects temporarily
        this.spheres.forEach(sphere => {
            sphere.mesh.visible = false;
        });
        
        // Make sure video sphere is visible
        this.videoSphere.visible = true;
        
        // Update cube camera from origin
        this.cubeCamera.update(this.renderer, this.scene);
        
        // Restore visibility
        this.spheres.forEach(sphere => {
            sphere.mesh.visible = true;
        });
    }
    
    // Render main scene
    this.renderer.render(this.scene, this.camera);
}
```

### Advanced: Dynamic Cube Camera Positioning

For more realistic reflections that change based on object position:

```javascript
// Calculate average position of all reflective objects
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
    
    // Move cube camera to average position
    this.cubeCamera.position.set(avgX, avgY, avgZ);
}

// Update cube camera from new position
this.cubeCamera.update(this.renderer, this.scene);
```

### Performance Optimization: Higher Quality Captures

```javascript
// Temporarily increase renderer pixel ratio for cube camera
const originalPixelRatio = this.renderer.getPixelRatio();
this.renderer.setPixelRatio(Math.min(originalPixelRatio * 2.0, 2.0));

// Update cube camera
this.cubeCamera.update(this.renderer, this.scene);

// Restore original pixel ratio
this.renderer.setPixelRatio(originalPixelRatio);
```

### Anisotropic Filtering for Quality

```javascript
// Add anisotropic filtering to cube map
const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
if (maxAnisotropy > 0) {
    this.cubeMapTexture.anisotropy = maxAnisotropy;
}
```

### Automatic Intensity Adjustment for Video Cube Maps

Video cube maps tend to appear brighter than background image reflections due to the rendering pipeline. Chrome Spheres automatically compensates:

```javascript
// Automatic brightness adjustment in updateSphereMaterials()
if (this.mappingMode === 'reflection' && this.envMapSource === 'video') {
    material.envMapIntensity = this.envMapIntensity * 0.8;  // 80% for video
} else {
    material.envMapIntensity = this.envMapIntensity;  // 100% for images
}
```

**Why This Matters:**
- Maintains consistent appearance between video and image sources
- User sets one intensity value, system adjusts automatically
- Prevents video reflections from being overly bright/washed out
- Transparent to users (no extra controls needed)
- Improves perceived quality of reflections

**Implementation Note:**
This adjustment happens in `updateSphereMaterials()` and applies every time materials are updated. The 0.8 multiplier was determined through testing to match the visual brightness of background image reflections.

**When to Use:**
Apply source-dependent adjustments when different texture types render with different characteristics:

```javascript
// Generic pattern for source-dependent adjustments
updateMaterials() {
    this.objects.forEach(obj => {
        if (this.sourceType === 'typeA') {
            obj.material.property = this.value * adjustmentFactor;
        } else {
            obj.material.property = this.value;
        }
    });
}
```

---

## Layer Management

Use Three.js layers to control which objects are visible to different cameras.

### Layer Setup

```javascript
// Layer 0: Default layer (main camera sees this)
// Layer 1: Hidden from main camera (cube camera sees this)

// Set object to layer 1 (hidden from main camera)
this.videoSphere.layers.set(1);

// Enable cube camera to see layer 1 (while keeping layer 0)
this.cubeCamera.layers.enable(1);
```

### Toggling Visibility

```javascript
toggleBackgroundSphere() {
    this.bgSphereVisible = !this.bgSphereVisible;
    
    // Change layer based on visibility
    this.videoSphere.layers.set(this.bgSphereVisible ? 0 : 1);
    
    // Additional rotation when visible to user
    if (this.bgSphereVisible) {
        // Add 180° so video appears correct orientation to viewer
        this.videoSphere.rotation.y = this.videoSphereBaseRotationY + Math.PI;
    } else {
        // Use base rotation for cube camera capture
        this.videoSphere.rotation.y = this.videoSphereBaseRotationY;
    }
}
```

---

## Color Space Management

### Why sRGB Encoding Matters

To ensure video reflections match the brightness and color of background image reflections:

```javascript
// 1. Set renderer output encoding
this.renderer.outputEncoding = THREE.sRGBEncoding;

// 2. Set cube render target encoding
this.cubeRenderTarget.texture.encoding = THREE.sRGBEncoding;

// 3. Set video texture encoding
videoTexture.encoding = THREE.sRGBEncoding;
```

**Result:** Consistent color and brightness across all reflection sources.

---

## Dual Mapping Modes

Support both direct texture and reflection modes:

### Direct Mode

```javascript
if (this.mappingMode === 'direct') {
    material.map = this.videoTexture;      // Show video directly
    material.envMap = null;                // No environment map
    material.metalness = Math.min(this.metalness, 0.5);
    material.roughness = Math.max(this.roughness, 0.3);
}
```

### Reflection Mode

```javascript
if (this.mappingMode === 'reflection') {
    material.map = null;                   // No direct texture
    material.envMap = this.cubeMapTexture; // Use cube map for reflections
    material.metalness = this.metalness;
    material.roughness = this.roughness;
    material.envMapIntensity = this.envMapIntensity;
}
```

---

# Audio Integration

## Getting Audio Data

```javascript
onUpdate(deltaTime, timestamp, sharedAudioData) {
    // Get overall energy (0-1)
    const energy = this.getAudioEnergy();
    
    // Get frequency data
    const frequencies = this.getAudioFrequencies();
    
    // Get frequency bands
    this.frequencyBands = this.getFrequencyBands();
    
    // Detect beats
    const isBeat = this.detectBeat(timestamp);
    if (isBeat) {
        this.onBeat();
    }
}
```

## Frequency Bands

```javascript
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
        sum += arr[i] / 255;  // Normalize to 0-1
        count++;
    }
    
    return count > 0 ? sum / count : 0;
}
```

## Beat Detection

```javascript
// In constructor
this.currentEnergy = 0;
this.smoothedEnergy = 0;
this.energyHistory = [];
this.beatDetection = {
    lastBeatTime: 0,
    threshold: 1.3,
    minTimeBetweenBeats: 200
};

// In onUpdate
onUpdate(deltaTime, timestamp, sharedAudioData) {
    this.currentEnergy = this.getAudioEnergy();
    
    // Smooth energy
    this.energyHistory.push(this.currentEnergy);
    if (this.energyHistory.length > 30) {
        this.energyHistory.shift();
    }
    
    this.smoothedEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    
    // Detect beat
    const isBeat = this.detectBeat(timestamp);
    if (isBeat && this.beatPulse) {
        this.onBeat();
    }
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
```

**Energy Smoothing Configuration:**
The energy history uses a **10-sample rolling average** for responsive but smooth beat detection:

```javascript
// In onUpdate()
this.energyHistory.push(this.currentEnergy);
if (this.energyHistory.length > 10) {  // Buffer size: 10 samples
    this.energyHistory.shift();
}
this.smoothedEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
```

**Why 10 Samples?**
- Too few (3-5): Overly sensitive, false positives
- Just right (10): Smooth but responsive
- Too many (20+): Sluggish response, missed beats

**Tuning Beat Detection:**
- `threshold`: 1.3 = energy must be 30% above average
- `minTimeBetweenBeats`: 200ms prevents double-triggers
- Lower threshold = more sensitive
- Higher threshold = only strong beats

onBeat() {
    // React to beat - e.g., pulse spheres
    this.spheres.forEach(sphere => {
        const currentScale = sphere.mesh.scale.x;
        sphere.mesh.scale.set(currentScale * 1.2, currentScale * 1.2, currentScale * 1.2);
        
        setTimeout(() => {
            sphere.mesh.scale.set(1, 1, 1);
        }, 100);
    });
}
```

## Audio-Reactive Effects

### Scale with Bass

```javascript
if (this.audioReactive && this.bassScale) {
    const bassScale = 1 + this.frequencyBands.bass * 0.5;
    sphere.mesh.scale.set(bassScale, bassScale, bassScale);
}
```

### Movement with Mids

```javascript
if (this.audioReactive && this.midMovement) {
    const movementBoost = 1 + this.frequencyBands.mid * 3;
    sphere.mesh.position.x = sphere.basePosition.x + floatX * movementBoost;
    sphere.mesh.position.y = sphere.basePosition.y + floatY * movementBoost;
}
```

### Roughness with Treble

```javascript
if (this.audioReactive && this.trebleShine) {
    const dynamicRoughness = this.roughness * (1 - this.frequencyBands.treble * 0.5);
    sphere.mesh.material.roughness = Math.max(0.01, dynamicRoughness);
}
```

### Float Speed with Non-Linear Scaling

For controls that need finer precision in certain ranges, use two-part scaling:

```javascript
// Float Speed: 0-10 with custom scaling curve
// Center point at 3 = normal speed (1.0x)
const speedFactor = this.floatSpeed <= 3 
    ? this.floatSpeed / 3.0          // 0-3 → 0-1.0x (slow motion to normal)
    : 1.0 + ((this.floatSpeed - 3) / 7.0);  // 3-10 → 1.0-2.0x (normal to fast)

this.time += deltaTime * 0.001 * speedFactor;
```

**Why Use Two-Part Scaling?**
- Provides finer control in the slow-motion range (0-3)
- Normal speed at center point (3) for easy reset
- Acceleration range (3-10) for dramatic effects
- More intuitive than linear 0-2x scaling

**User Experience:**
- Slider starts at 3 (normal speed)
- Going below 3 slows down (useful for detailed viewing)
- Going above 3 speeds up (useful for energetic music)
- 0 = completely frozen
- 10 = double speed

**Implementation Pattern:**
```javascript
// Generic non-linear scaling
const centerValue = 3;
const scaledOutput = controlValue <= centerValue
    ? (controlValue / centerValue)
    : 1.0 + ((controlValue - centerValue) / (maxValue - centerValue));
```

---

# UI Controls

## Dropdowns

### Basic Dropdown

**CRITICAL:** Always specify `className` for proper styling:

```javascript
this.addControl('colorScheme', {
    type: 'dropdown',
    label: 'Color Scheme',
    className: 'dropdown-selector-mixer',  // ✅ REQUIRED for proper styling
    options: [
        { value: 0, label: 'Acid Orange/Cyan' },
        { value: 1, label: 'Blue Soap Bubbles' },
        { value: 2, label: 'Red Lava' },
        { value: 3, label: 'Purple Dream' },
        { value: 4, label: 'Rainbow' }
    ],
    value: 0,
    onChange: (value) => {
        this.colorScheme = parseInt(value);
    }
});
```

### Dropdown with Object Options

```javascript
// Store schemes as objects
this.colorSchemes = [
    { name: 'Acid Orange/Cyan', id: 0 },
    { name: 'Blue Soap Bubbles', id: 1 },
    { name: 'Red Lava', id: 2 }
];

// Map to options format
this.addControl('colorScheme', {
    type: 'dropdown',
    label: 'Color Scheme',
    className: 'dropdown-selector-mixer',
    options: this.colorSchemes.map(s => ({ value: s.id, label: s.name })),
    value: 0,
    onChange: (value) => {
        this.colorScheme = parseInt(value);
    }
});
```

### Speed Control Dropdowns

```javascript
this.addControl('morphSpeed', {
    type: 'dropdown',
    label: 'Morph Speed',
    className: 'dropdown-selector-mixer',
    options: [
        { value: 0.5, label: 'Slow' },
        { value: 1.0, label: 'Medium' },
        { value: 4.0, label: 'Fast' },
        { value: 12.0, label: 'Ultra' }
    ],
    value: 1.0,
    onChange: (value) => {
        this.morphSpeed = parseFloat(value);
    }
});
```

### Why className is Required

**Before v2.2 Fix:**
```javascript
// ❌ WRONG - dropdown won't display properly
this.addControl('myDropdown', {
    type: 'dropdown',
    options: [...],
    // Missing className!
});
```

**After v2.2 Fix:**
```javascript
// ✅ CORRECT - respects plugin's className
this.addControl('myDropdown', {
    type: 'dropdown',
    className: 'dropdown-selector-mixer',  // Styled correctly
    options: [...]
});
```

**What Changed:** The `plugin-mixer-integration.js` now respects the plugin's `className` instead of hardcoding `dropdown-mini`. This allows plugins to use the properly-styled `dropdown-selector-mixer` class.

---

## Toggle Controls (Checkboxes)

### CRITICAL: Use type: 'checkbox' with className: 'btn-primary-mixer'

**Toggle controls must use `type: 'checkbox'` with `className: 'btn-primary-mixer'`, `checked`, and `onChange`:**

```javascript
// ✅ CORRECT - Use checkbox type with proper className for toggles
this.colorMorph = false;
this.addControl('colorMorph', {
    type: 'checkbox',
    label: 'Color Morph',
    checked: false,
    className: 'btn-primary-mixer',  // REQUIRED for consistent styling
    onChange: (value) => {
        this.colorMorph = value;
        console.log('Color Morph:', value);
    }
});
```

### Toggle That Starts ON

```javascript
// ✅ CORRECT - Starts enabled
this.audioReactive = true;
this.addControl('audioReactive', {
    type: 'checkbox',
    label: 'Audio Reactive',
    checked: true,  // Starts ON
    className: 'btn-primary-mixer',
    onChange: (value) => {
        this.audioReactive = value;
        console.log('Audio Reactive:', value);
    }
});
```

### Complete Toggle Example

```javascript
// In constructor:
this.animationMorph = false;

// In setupControls():
this.addControl('animationMorph', {
    type: 'checkbox',
    label: 'Animation Morph',
    checked: false,
    className: 'btn-primary-mixer',
    onChange: (value) => {
        this.animationMorph = value;
        // Value updates automatically - no manual DOM manipulation needed!
    }
});

// In onUpdate() or onRender():
if (this.animationMorph) {
    // Apply animation morph effect
}
```

### Why Checkbox Instead of Button?

The Freque control system has two different types:

1. **`type: 'checkbox'`** - For toggles with ON/OFF states
   - Manages state internally
   - Updates automatically
   - Visual toggle styling
   - Use for: Enable/disable features

2. **`type: 'button'`** - For one-time actions
   - Triggers onClick callback
   - No state management
   - Button styling
   - Use for: Mode switching, actions

### ❌ WRONG Pattern (Don't Use Button for Toggles)

```javascript
// ❌ BROKEN - Don't use button type for toggles
this.addControl('myToggle', {
    type: 'button',
    label: 'Toggle: OFF',
    onClick: () => {
        this.toggleMyToggle();  // Manual state management required
    }
});

// ❌ BROKEN - Requires manual DOM manipulation
toggleMyToggle() {
    this.myToggle = !this.myToggle;
    const btn = document.querySelector('[data-control="myToggle"]');
    // Manual text updates, class toggling, etc.
}
```

### ✅ CORRECT Pattern (Use Checkbox)

```javascript
// ✅ WORKS - Checkbox handles everything automatically
this.addControl('myToggle', {
    type: 'checkbox',
    label: 'My Toggle',
    checked: false,
    onChange: (value) => {
        this.myToggle = value;  // That's it!
    }
});
```

---

## Mode Toggle Buttons (Two-State Switching)

**Use `type: 'button'` with `onClick` for switching between two modes (not ON/OFF):**

For buttons that toggle between two modes like "Direct" ↔ "Reflection":

```javascript
this.mappingMode = 'reflection';  // Initial mode

this.addControl('mappingMode', {
    type: 'button',
    label: 'Reflection',
    className: 'btn-toggle active',
    onClick: () => {
        this.toggleMappingMode();
    }
});
```

### Updating Mode Button Labels

```javascript
toggleMappingMode() {
    // Switch between two modes
    this.mappingMode = this.mappingMode === 'direct' ? 'reflection' : 'direct';
    
    // Query DOM directly
    const buttonElement = document.querySelector('[data-control="mappingMode"]');
    
    if (buttonElement) {
        // Update label to show current mode
        const newLabel = this.mappingMode === 'direct' ? 'Direct Texture' : 'Reflection';
        buttonElement.textContent = newLabel;
        
        // Toggle active class
        if (this.mappingMode === 'reflection') {
            buttonElement.classList.add('active');
        } else {
            buttonElement.classList.remove('active');
        }
    }
    
    // Apply the mode change
    this.applyTextureToSpheres();
}
```

### When to Use Each Type

| Control Type | Use For | Example |
|--------------|---------|---------|
| **`type: 'checkbox'`** | ON/OFF toggles | Audio Reactive, Color Morph, Solid Fill |
| **`type: 'button'`** | Mode switching | Direct ↔ Reflection, Video ↔ Image |
| **`type: 'button'`** | One-time actions | Randomize, Reset, Trigger |

---

## Dials (Rotary Controls)

### Basic Dial

```javascript
this.addControl('size', {
    type: 'dial',
    label: 'Size',
    min: 5.0,
    max: 10.0,
    step: 0.1,
    value: this.maxSize,
    onChange: (value) => {
        this.maxSize = value;
        this.updateSphereSizes();
    }
});
```

### Dial with Units

```javascript
this.addControl('floatSpeed', {
    type: 'dial',
    label: 'Float Speed',
    min: 0,
    max: 10,
    step: 0.1,
    value: this.floatSpeed,
    unit: 'x',  // Shows "5.0x" instead of just "5.0"
    onChange: (value) => {
        this.floatSpeed = value;
    }
});
```

**Note:** Dials (rotary controls) have replaced sliders in v2.3 for better visual consistency with professional audio/video software.

---

## Additional Checkbox Examples

For more checkbox/toggle examples, see the [Toggle Controls](#toggle-controls-checkboxes) section above.

Basic checkbox (same as toggle):

```javascript
this.addControl('showGrid', {
    type: 'checkbox',
    label: 'Show Grid',
    checked: false,
    className: 'btn-primary-mixer',
    onChange: (checked) => {
        this.showGrid = checked;
    }
});
```

---

## Control Update Behavior

Understanding when controls take effect is important for user experience:

### Immediate Updates

These controls update **instantly** when changed (may cause visual "pop"):

**Geometry Changes:**
- **Sphere Count** → `recreateSpheres()` - Creates/removes spheres immediately
- **Max Size** → `updateSphereSizes()` - Updates geometry instantly
- **Spread** → `updateSpherePositions()` - Repositions spheres immediately

```javascript
updateSpherePositions() {
    this.spheres.forEach((sphere) => {
        // Calculate new position
        sphere.basePosition.set(newX, newY, newZ);
        
        // Update mesh position immediately (not deferred)
        sphere.mesh.position.copy(sphere.basePosition);
    });
}
```

**Material Changes:**
- **Metalness** → `updateSphereMaterials()` - Updates material immediately
- **Roughness** → `updateSphereMaterials()` - Updates material immediately
- **Reflection Intensity** → `updateSphereMaterials()` - Updates immediately

### Deferred Updates

These controls affect behavior in next frame (smooth transition):

**Animation Properties:**
- **Float Speed** → Affects `deltaTime` scaling in next `onUpdate()`
- **Camera Distance** → Updates camera position next frame
- **Camera Auto-Rotate** → Affects rotation in next frame

**Audio Toggles:**
- **Audio Reactive** → Affects processing in next `onUpdate()`
- **Bass/Mid/Treble Toggles** → Apply in next audio analysis

### Why It Matters

**Immediate updates:**
- ✅ Instant visual feedback
- ✅ User knows change happened
- ⚠️ May cause brief visual discontinuity

**Deferred updates:**
- ✅ Smooth transitions
- ✅ No visual "pop"
- ⚠️ Effect not instantly apparent

**Best Practice:**
Use immediate updates for properties where users expect instant feedback (geometry, materials). Use deferred updates for properties affecting motion or animation flow.

---

# Performance Optimization

## Cube Camera Performance

### Resolution Trade-offs

```javascript
// Ultra quality (expensive)
this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(4096, {...});

// High quality (balanced)
this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(2048, {...});

// Good quality (performance)
this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, {...});
```

**GPU Memory Usage:**
- 4096: ~402 MB per cube camera
- 2048: ~100 MB per cube camera  
- 1024: ~25 MB per cube camera

### Update Frequency

```javascript
// Update every frame (best quality, expensive)
this.cubeCamera.update(this.renderer, this.scene);

// Update every N frames (good balance)
if (this.frameCount % 2 === 0) {  // Every other frame
    this.cubeCamera.update(this.renderer, this.scene);
}
this.frameCount++;
```

### Shared vs Per-Object Cube Cameras

```javascript
// ✅ RECOMMENDED: Shared cube camera with dynamic positioning
// Cost: 1 cube camera update per frame × 6 render passes = 6 renders/frame
this.cubeCamera.position.set(avgX, avgY, avgZ);
this.cubeCamera.update(this.renderer, this.scene);

// ❌ EXPENSIVE: Per-object cube cameras
// Cost: N cube cameras × 6 render passes = 6N renders/frame
this.spheres.forEach(sphere => {
    sphere.cubeCamera.position.copy(sphere.mesh.position);
    sphere.cubeCamera.update(this.renderer, this.scene);
});
```

## Geometry Optimization

### Sphere Detail Levels

```javascript
// Ultra quality (heavy)
const geometry = new THREE.SphereGeometry(size, 64, 64);  // 4096 faces

// High quality (balanced)
const geometry = new THREE.SphereGeometry(size, 32, 32);  // 1024 faces

// Good quality (performance)
const geometry = new THREE.SphereGeometry(size, 16, 16);  // 256 faces
```

### Geometry Instancing

For many similar objects:

```javascript
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshStandardMaterial({...});

const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

// Set positions
for (let i = 0; i < count; i++) {
    const matrix = new THREE.Matrix4();
    matrix.setPosition(x, y, z);
    instancedMesh.setMatrixAt(i, matrix);
}

instancedMesh.instanceMatrix.needsUpdate = true;
this.scene.add(instancedMesh);
```

## General Performance Tips

### Minimize State Changes

```javascript
// ❌ BAD: Change material every frame
this.spheres.forEach(sphere => {
    sphere.mesh.material.roughness = newValue;
    sphere.mesh.material.needsUpdate = true;
});

// ✅ GOOD: Only update when value actually changes
if (this.roughness !== newRoughness) {
    this.roughness = newRoughness;
    this.updateSphereMaterials();
}
```

### Conditional Updates

```javascript
// Only update when necessary
if (this.mappingMode === 'reflection' && 
    this.envMapSource === 'video' && 
    this.videoElement && 
    !this.videoElement.paused) {
    this.cubeCamera.update(this.renderer, this.scene);
}
```

### Disposal

```javascript
onCleanup() {
    // Dispose geometries
    this.spheres.forEach(sphere => {
        sphere.mesh.geometry.dispose();
        sphere.mesh.material.dispose();
    });
    
    // Dispose textures
    if (this.videoTexture) this.videoTexture.dispose();
    if (this.cubeMapTexture) this.cubeMapTexture.dispose();
    if (this.cubeRenderTarget) this.cubeRenderTarget.dispose();
    
    // Dispose renderer
    if (this.renderer) {
        this.renderer.dispose();
    }
}
```

---

# Best Practices

## Do's

✅ Get dimensions from `visualizationContainer`
✅ Use individual CSS property assignment (not cssText)
✅ Set `width: 100%` and `height: 100%` for responsive sizing
✅ Use `devicePixelRatio` for high-DPI displays
✅ Use sRGB color space throughout
✅ Dispose resources in `onCleanup()`
✅ Use direct DOM queries for control updates
✅ Add comprehensive comments
✅ Test on different devices and browsers

## Don'ts

❌ Use canvas buffer dimensions for renderer size
❌ Copy cssText from base canvas
❌ Use fixed pixel dimensions in CSS
❌ Forget to update video textures every frame
❌ Create per-object cube cameras without considering performance
❌ Forget to hide objects during cube camera capture
❌ Mix color spaces (LinearEncoding vs sRGBEncoding)
❌ Update cube cameras when not in reflection mode

## Common Pitfalls

### 1. Canvas Sizing
**Problem:** Three.js canvas appears at wrong size

**Solution:** Get size from container, use percentage CSS

### 2. Video Reflections Not Working
**Problem:** Video doesn't appear in chrome reflections

**Solution:** Implement cube camera system (required for Three.js r120+)

### 3. Upside-Down Textures
**Problem:** Video or images appear inverted

**Solution:** Use `flipY = true` instead of rotation

### 4. Color Mismatch
**Problem:** Video reflections look different from image reflections

**Solution:** Use consistent sRGB encoding throughout

### 5. Performance Issues
**Problem:** Frame rate drops with video reflections

**Solution:** Reduce cube map resolution, update less frequently, or use shared cube camera

---

# Complete Example: Chrome Spheres with Video Reflections

See the Chrome Spheres plugin for a complete working implementation of:
- Cube camera system
- Dynamic positioning
- Layer management
- Dual mapping modes
- Audio reactivity
- Button toggle updates
- Performance optimization

Study that plugin as the reference implementation for advanced Three.js techniques in Freque.

---

# Additional Resources

## Three.js Documentation
- [Three.js Docs](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [CubeCamera](https://threejs.org/docs/#api/en/cameras/CubeCamera)
- [WebGLCubeRenderTarget](https://threejs.org/docs/#api/en/renderers/WebGLCubeRenderTarget)

## Freque Resources
- Creating Plugins with Claude Guide
- Example Plugins in `js/plugins/`
- Freque Discord Community

---

**Happy plugin development! 🚀🎨🎵**

*Guide Version 2.0 - Updated with cube camera system documentation*
