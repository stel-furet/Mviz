# Supernova Remnant Enhancement Plan

## Overview
This document outlines the implementation plan for adding three major features to the Supernova Remnant visualization:
1. **Planets System** - Orbiting celestial bodies with rings and variety
2. **UnrealBloomPass** - Professional HDR post-processing
3. **Enhanced Controls** - OrbitControls and improved camera handling

Each phase includes implementation steps, testing checkpoints, and rollback procedures.

---

## Phase 1: Planets System

### Objectives
- Add 3-5 customizable planets orbiting within the supernova remnant
- Include planet variety (rocky vs gas giants)
- Optional ring systems (Saturn-style)
- Orbital path visualization
- Size and color controls
- Adjustable orbital speeds

### Prerequisites
- Current supernova remnant code must be working
- Three.js r128 loaded and functional
- No existing errors in console

### Implementation Steps

#### Step 1.1: Add Planet Settings (5 min)
**File:** Supernova HTML file  
**Location:** Inside `this.settings = {` object in constructor

**Add these new properties:**
```javascript
// After existing settings
showPlanets: true,
planetCount: 5,
planetMinSize: 0.3,
planetMaxSize: 2.0,
showOrbits: true,
orbitSpeed: 0.5
```

**Test Checkpoint:**
- Reload page
- Check console for errors
- Verify page still loads correctly

---

#### Step 1.2: Add Planet HTML Controls (10 min)
**File:** Supernova HTML file  
**Location:** In the `#controls` div, create new section after "Central Pulsar"

**Add this HTML:**
```html
<h3>🪐 Planets</h3>
<div class="control-group">
    <div class="checkbox-label">
        <input type="checkbox" id="showPlanets" checked>
        <span>Show Planets</span>
    </div>
</div>
<div class="control-group">
    <label>Planet Count <span class="value-display" id="planetCountValue">5</span></label>
    <input type="range" id="planetCount" min="0" max="10" step="1" value="5">
</div>
<div class="control-group">
    <label>Planet Size <span class="value-display" id="planetSizeValue">1.0</span></label>
    <input type="range" id="planetSize" min="0.3" max="3" step="0.1" value="1.0">
</div>
<div class="control-group">
    <label>Orbit Speed <span class="value-display" id="orbitSpeedValue">0.5</span></label>
    <input type="range" id="orbitSpeed" min="0.1" max="2" step="0.1" value="0.5">
</div>
<div class="control-group">
    <div class="checkbox-label">
        <input type="checkbox" id="showOrbits" checked>
        <span>Show Orbital Paths</span>
    </div>
</div>
```

**Test Checkpoint:**
- Reload page
- Verify sliders appear in UI
- Check that sliders move and update values
- No console errors

---

#### Step 1.3: Create Planet Texture Generator (15 min)
**File:** Supernova HTML file  
**Location:** Add new method in class, after `createStarTexture()`

**Add this method:**
```javascript
createPlanetTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    const centerX = 128, centerY = 128;
    
    // Different planet types
    if (type === 'rocky') {
        // Rocky planet - browns and grays
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 128);
        gradient.addColorStop(0, '#8B7355');
        gradient.addColorStop(0.5, '#6B5344');
        gradient.addColorStop(1, '#3D2817');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // Add some texture
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${80 + Math.random() * 40}, ${60 + Math.random() * 30}, 0.3)`;
            ctx.beginPath();
            ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 20, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (type === 'gas') {
        // Gas giant - bands of color
        for (let y = 0; y < 256; y++) {
            const wave = Math.sin(y * 0.05) * 20;
            const hue = 20 + wave;
            const sat = 60 + Math.sin(y * 0.1) * 20;
            const light = 40 + Math.sin(y * 0.08) * 15;
            ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
            ctx.fillRect(0, y, 256, 1);
        }
    } else if (type === 'ice') {
        // Ice planet - blues and whites
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 128);
        gradient.addColorStop(0, '#E0F7FF');
        gradient.addColorStop(0.5, '#7EC8E3');
        gradient.addColorStop(1, '#1E5F74');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
    } else {
        // Lava planet - reds and oranges
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 128);
        gradient.addColorStop(0, '#FFA500');
        gradient.addColorStop(0.5, '#FF4500');
        gradient.addColorStop(1, '#8B0000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
    }
    
    return new THREE.CanvasTexture(canvas);
}
```

**Test Checkpoint:**
- Open browser console
- Type: `renderer.createPlanetTexture('rocky')`
- Should return a texture object
- No errors

---

#### Step 1.4: Create Planets Method (20 min)
**File:** Supernova HTML file  
**Location:** Add new method after `createPulsar()`

**Add this method:**
```javascript
createPlanets() {
    // Clear existing planets
    if (this.planets) {
        this.planets.forEach(planet => {
            this.scene.remove(planet);
            if (planet.userData.orbitLine) {
                this.scene.remove(planet.userData.orbitLine);
            }
        });
    }
    this.planets = [];
    
    const planetTypes = ['rocky', 'gas', 'ice', 'lava'];
    const count = this.settings.planetCount;
    
    for (let i = 0; i < count; i++) {
        // Random planet properties
        const type = planetTypes[Math.floor(Math.random() * planetTypes.length)];
        const size = this.settings.planetMinSize + Math.random() * (this.settings.planetMaxSize - this.settings.planetMinSize);
        const orbitRadius = 20 + Math.random() * 15;
        const orbitSpeed = (0.5 + Math.random() * 0.5) * this.settings.orbitSpeed;
        const orbitAngle = Math.random() * Math.PI * 2;
        const orbitTilt = (Math.random() - 0.5) * Math.PI * 0.3;
        
        // Create planet sphere
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            map: this.createPlanetTexture(type),
            roughness: type === 'ice' ? 0.3 : 0.8,
            metalness: 0.1
        });
        
        const planet = new THREE.Mesh(geometry, material);
        
        // Store orbital parameters
        planet.userData = {
            orbitRadius: orbitRadius,
            orbitSpeed: orbitSpeed,
            orbitAngle: orbitAngle,
            orbitTilt: orbitTilt,
            type: type,
            size: size
        };
        
        // Add rings for gas giants (30% chance)
        if (type === 'gas' && Math.random() > 0.7) {
            const ringGeometry = new THREE.RingGeometry(size * 1.5, size * 2.5, 64);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xccaa88,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            planet.add(ring);
            planet.userData.hasRings = true;
        }
        
        // Create orbit path visualization
        if (this.settings.showOrbits) {
            const orbitPoints = [];
            for (let j = 0; j <= 64; j++) {
                const angle = (j / 64) * Math.PI * 2;
                orbitPoints.push(new THREE.Vector3(
                    Math.cos(angle) * orbitRadius,
                    Math.sin(angle) * orbitRadius * Math.sin(orbitTilt),
                    Math.sin(angle) * orbitRadius * Math.cos(orbitTilt)
                ));
            }
            
            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: 0x444444,
                transparent: true,
                opacity: 0.3
            });
            const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            this.scene.add(orbitLine);
            planet.userData.orbitLine = orbitLine;
        }
        
        this.planets.push(planet);
        this.scene.add(planet);
    }
    
    console.log('Created', this.planets.length, 'planets');
}
```

**Test Checkpoint:**
- Save file and reload
- Open console
- Type: `renderer.createPlanets()`
- Should see "Created X planets" message
- Look for spheres orbiting the nebula
- No errors

---

#### Step 1.5: Add Planet Control Handlers (10 min)
**File:** Supernova HTML file  
**Location:** In `setupControls()` method

**Add these event listeners:**
```javascript
// In setupControls() method, add:

document.getElementById('showPlanets').addEventListener('change', (e) => {
    this.settings.showPlanets = e.target.checked;
    if (this.planets) {
        this.planets.forEach(planet => {
            planet.visible = e.target.checked;
            if (planet.userData.orbitLine) {
                planet.userData.orbitLine.visible = e.target.checked && this.settings.showOrbits;
            }
        });
    }
});

document.getElementById('planetCount').addEventListener('input', (e) => {
    this.settings.planetCount = parseInt(e.target.value);
    document.getElementById('planetCountValue').textContent = e.target.value;
    this.createPlanets();
});

document.getElementById('planetSize').addEventListener('input', (e) => {
    const scale = parseFloat(e.target.value);
    this.settings.planetMaxSize = scale * 2.0;
    document.getElementById('planetSizeValue').textContent = e.target.value;
    this.createPlanets();
});

document.getElementById('orbitSpeed').addEventListener('input', (e) => {
    this.settings.orbitSpeed = parseFloat(e.target.value);
    document.getElementById('orbitSpeedValue').textContent = e.target.value;
});

document.getElementById('showOrbits').addEventListener('change', (e) => {
    this.settings.showOrbits = e.target.checked;
    if (this.planets) {
        this.planets.forEach(planet => {
            if (planet.userData.orbitLine) {
                planet.userData.orbitLine.visible = e.target.checked;
            }
        });
    }
});
```

**Test Checkpoint:**
- Reload page
- Toggle "Show Planets" checkbox - planets should appear/disappear
- Change "Planet Count" slider - planets should recreate
- Change "Orbit Speed" - rotation should speed up/slow down
- Toggle "Show Orbital Paths" - orbit lines should appear/disappear
- No console errors

---

#### Step 1.6: Add Planets to Init and Animate (15 min)
**File:** Supernova HTML file  
**Locations:** `init()` method and `animate()` method

**In `init()` method, add after `this.createPulsar():`**
```javascript
this.createPlanets();
```

**In `animate()` method, add this section:**
```javascript
// Animate planets
if (this.settings.showPlanets && this.planets) {
    this.planets.forEach((planet, i) => {
        // Update orbital position
        planet.userData.orbitAngle += planet.userData.orbitSpeed * 0.001;
        
        const x = Math.cos(planet.userData.orbitAngle) * planet.userData.orbitRadius;
        const y = Math.sin(planet.userData.orbitAngle) * planet.userData.orbitRadius * Math.sin(planet.userData.orbitTilt);
        const z = Math.sin(planet.userData.orbitAngle) * planet.userData.orbitRadius * Math.cos(planet.userData.orbitTilt);
        
        planet.position.set(x, y, z);
        
        // Rotate planet on its axis
        planet.rotation.y += 0.01;
        
        // If has rings, tilt them
        if (planet.userData.hasRings) {
            planet.children[0].rotation.z = this.time * 0.1;
        }
    });
}
```

**Test Checkpoint:**
- Reload page
- Planets should be visible and orbiting
- Planets should rotate on their axis
- Some planets should have rings
- Orbit paths should be visible (if enabled)
- Adjust sliders to verify all controls work
- No console errors
- **FULL PHASE 1 COMPLETE**

---

#### Step 1.7: Add to Reset Function (5 min)
**File:** Supernova HTML file  
**Location:** `resetSettings()` method

**Add to settings reset:**
```javascript
showPlanets: true,
planetCount: 5,
planetMinSize: 0.3,
planetMaxSize: 2.0,
showOrbits: true,
orbitSpeed: 0.5
```

**Add to UI reset:**
```javascript
document.getElementById('showPlanets').checked = true;
document.getElementById('planetCount').value = 5;
document.getElementById('planetCountValue').textContent = '5';
document.getElementById('planetSize').value = 1.0;
document.getElementById('planetSizeValue').textContent = '1.0';
document.getElementById('orbitSpeed').value = 0.5;
document.getElementById('orbitSpeedValue').textContent = '0.5';
document.getElementById('showOrbits').checked = true;

this.createPlanets();
```

**Final Phase 1 Test:**
- Click "Reset All" button
- Verify all planet settings return to defaults
- Verify planets recreate properly
- **Phase 1 Complete! ✅**

---

## Phase 2: UnrealBloomPass (Professional HDR Bloom)

### Objectives
- Replace simple canvas bloom with Three.js UnrealBloomPass
- Add professional HDR glow effects
- Adjustable bloom threshold, strength, and radius
- Selective bloom (only affect bright objects)

### Prerequisites
- Phase 1 must be complete and tested
- No existing errors
- Current bloom effect should be working (even if simple)

### Implementation Steps

#### Step 2.1: Load Required Libraries (5 min)
**File:** Supernova HTML file  
**Location:** In `<head>` section, after the main Three.js script

**Add these script tags:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<!-- ADD THESE THREE LINES: -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
```

**Test Checkpoint:**
- Reload page
- Open console
- Type: `THREE.EffectComposer`
- Should return a function (not undefined)
- Type: `THREE.UnrealBloomPass`
- Should return a function (not undefined)
- Page should still work normally

---

#### Step 2.2: Add Bloom Settings (5 min)
**File:** Supernova HTML file  
**Location:** In `this.settings` object

**Update existing bloom settings:**
```javascript
// FIND:
bloom: true,
bloomStrength: 1.0,

// REPLACE WITH:
bloom: true,
bloomStrength: 1.5,
bloomRadius: 0.4,
bloomThreshold: 0.3,
```

**Test Checkpoint:**
- Reload page
- Check console for errors
- Page should load normally

---

#### Step 2.3: Update Bloom HTML Controls (10 min)
**File:** Supernova HTML file  
**Location:** In the "Effects" section of controls

**FIND the existing bloom controls and REPLACE with:**
```html
<h3>✨ Effects</h3>
<div class="control-group">
    <div class="checkbox-label">
        <input type="checkbox" id="bloom" checked>
        <span>HDR Bloom</span>
    </div>
</div>
<div class="control-group">
    <label>Bloom Strength <span class="value-display" id="bloomStrengthValue">1.5</span></label>
    <input type="range" id="bloomStrength" min="0" max="3" step="0.1" value="1.5">
</div>
<div class="control-group">
    <label>Bloom Radius <span class="value-display" id="bloomRadiusValue">0.4</span></label>
    <input type="range" id="bloomRadius" min="0" max="1" step="0.05" value="0.4">
</div>
<div class="control-group">
    <label>Bloom Threshold <span class="value-display" id="bloomThresholdValue">0.3</span></label>
    <input type="range" id="bloomThreshold" min="0" max="1" step="0.05" value="0.3">
</div>
```

**Test Checkpoint:**
- Reload page
- Verify three bloom sliders appear
- Move sliders - values should update
- No console errors

---

#### Step 2.4: Initialize Composer and Bloom Pass (20 min)
**File:** Supernova HTML file  
**Location:** In `init()` method, after renderer setup

**FIND this section in init():**
```javascript
this.renderer.setSize(window.innerWidth, window.innerHeight);
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * this.settings.renderQuality, 2));
```

**ADD this code IMMEDIATELY AFTER:**
```javascript
// Setup post-processing composer
this.composer = new THREE.EffectComposer(this.renderer);

// Render pass - renders the scene
this.renderPass = new THREE.RenderPass(this.scene, this.camera);
this.composer.addPass(this.renderPass);

// Bloom pass - adds glow
this.bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    this.settings.bloomStrength,  // strength
    this.settings.bloomRadius,     // radius
    this.settings.bloomThreshold   // threshold
);
this.composer.addPass(this.bloomPass);
```

**Test Checkpoint:**
- Reload page
- Open console
- Type: `renderer.composer`
- Should return an EffectComposer object
- Type: `renderer.bloomPass`
- Should return an UnrealBloomPass object
- No errors

---

#### Step 2.5: Update Render Call (10 min)
**File:** Supernova HTML file  
**Location:** In `animate()` method

**FIND this line at the end of animate():**
```javascript
// Render
this.renderer.render(this.scene, this.camera);
```

**REPLACE with:**
```javascript
// Render with bloom post-processing
if (this.settings.bloom && this.composer) {
    this.composer.render();
} else {
    this.renderer.render(this.scene, this.camera);
}
```

**Test Checkpoint:**
- Reload page
- **You should now see beautiful HDR bloom!**
- Bright objects (pulsar, filaments) should have glow
- Toggle bloom checkbox - effect should turn on/off
- Compare to old bloom - this should look much better

---

#### Step 2.6: Add Bloom Control Handlers (15 min)
**File:** Supernova HTML file  
**Location:** In `setupControls()` method

**FIND the existing bloom control handler and REPLACE:**
```javascript
document.getElementById('bloom').addEventListener('change', (e) => {
    this.settings.bloom = e.target.checked;
});

document.getElementById('bloomStrength').addEventListener('input', (e) => {
    this.settings.bloomStrength = parseFloat(e.target.value);
    document.getElementById('bloomStrengthValue').textContent = e.target.value;
    if (this.bloomPass) {
        this.bloomPass.strength = this.settings.bloomStrength;
    }
});

document.getElementById('bloomRadius').addEventListener('input', (e) => {
    this.settings.bloomRadius = parseFloat(e.target.value);
    document.getElementById('bloomRadiusValue').textContent = e.target.value;
    if (this.bloomPass) {
        this.bloomPass.radius = this.settings.bloomRadius;
    }
});

document.getElementById('bloomThreshold').addEventListener('input', (e) => {
    this.settings.bloomThreshold = parseFloat(e.target.value);
    document.getElementById('bloomThresholdValue').textContent = e.target.value;
    if (this.bloomPass) {
        this.bloomPass.threshold = this.settings.bloomThreshold;
    }
});
```

**Test Checkpoint:**
- Reload page
- Adjust "Bloom Strength" slider - glow intensity should change in real-time
- Adjust "Bloom Radius" - glow spread should change
- Adjust "Bloom Threshold" - which objects glow should change
- Toggle bloom on/off - effect should enable/disable
- No console errors
- **FULL PHASE 2 COMPLETE**

---

#### Step 2.7: Update Window Resize Handler (10 min)
**File:** Supernova HTML file  
**Location:** In `setupEventListeners()` resize handler

**FIND the resize event listener:**
```javascript
window.addEventListener('resize', () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
});
```

**REPLACE with:**
```javascript
window.addEventListener('resize', () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update composer size
    if (this.composer) {
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
});
```

**Test Checkpoint:**
- Reload page
- Resize browser window
- Bloom should scale properly with window
- No distortion or errors

---

#### Step 2.8: Update Reset Function (5 min)
**File:** Supernova HTML file  
**Location:** `resetSettings()` method

**Add to settings reset:**
```javascript
bloom: true,
bloomStrength: 1.5,
bloomRadius: 0.4,
bloomThreshold: 0.3,
```

**Add to UI reset:**
```javascript
document.getElementById('bloom').checked = true;
document.getElementById('bloomStrength').value = 1.5;
document.getElementById('bloomStrengthValue').textContent = '1.5';
document.getElementById('bloomRadius').value = 0.4;
document.getElementById('bloomRadiusValue').textContent = '0.4';
document.getElementById('bloomThreshold').value = 0.3;
document.getElementById('bloomThresholdValue').textContent = '0.3';

if (this.bloomPass) {
    this.bloomPass.strength = 1.5;
    this.bloomPass.radius = 0.4;
    this.bloomPass.threshold = 0.3;
}
```

**Final Phase 2 Test:**
- Click "Reset All" button
- Verify bloom settings return to defaults
- Verify bloom effect resets properly
- **Phase 2 Complete! ✅**

---

## Phase 3: Enhanced Controls (OrbitControls)

### Objectives
- Add Three.js OrbitControls for professional camera handling
- Mouse drag to rotate view
- Right-click drag to pan
- Scroll wheel to zoom
- Smooth damping/inertia
- Auto-rotate option
- Focus targets (pulsar, planets, etc.)
- Min/max zoom limits

### Prerequisites
- Phases 1 and 2 must be complete
- No existing errors
- Current camera controls should be working

### Implementation Steps

#### Step 3.1: Load OrbitControls Library (5 min)
**File:** Supernova HTML file  
**Location:** In `<head>` section with other scripts

**ADD this script tag:**
```html
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
```

**Test Checkpoint:**
- Reload page
- Open console
- Type: `THREE.OrbitControls`
- Should return a function (not undefined)
- Page should work normally

---

#### Step 3.2: Add Controls Settings (5 min)
**File:** Supernova HTML file  
**Location:** In `this.settings` object

**Add these new properties:**
```javascript
// After cameraOrbit
enableOrbitControls: true,
autoRotate: false,
autoRotateSpeed: 0.5,
dampingEnabled: true,
zoomSpeed: 1.0,
```

**Test Checkpoint:**
- Reload page
- Check console for errors
- Page should load normally

---

#### Step 3.3: Add OrbitControls HTML UI (15 min)
**File:** Supernova HTML file  
**Location:** Update the Camera section

**REPLACE the existing Camera section with:**
```html
<h3>🎬 Camera Controls</h3>
<div class="control-group">
    <label>Distance <span class="value-display" id="distanceValue">40</span></label>
    <input type="range" id="cameraDistance" min="20" max="80" step="1" value="40">
</div>
<div class="control-group">
    <div class="checkbox-label">
        <input type="checkbox" id="enableOrbitControls" checked>
        <span>Enable Orbit Controls</span>
    </div>
</div>
<div class="control-group">
    <div class="checkbox-label">
        <input type="checkbox" id="autoRotate">
        <span>Auto Rotate</span>
    </div>
</div>
<div class="control-group">
    <label>Auto Rotate Speed <span class="value-display" id="autoRotateSpeedValue">0.5</span></label>
    <input type="range" id="autoRotateSpeed" min="0.1" max="2" step="0.1" value="0.5">
</div>
<div class="control-group">
    <div class="checkbox-label">
        <input type="checkbox" id="dampingEnabled" checked>
        <span>Smooth Damping</span>
    </div>
</div>
<div class="control-group">
    <label>Zoom Speed <span class="value-display" id="zoomSpeedValue">1.0</span></label>
    <input type="range" id="zoomSpeed" min="0.5" max="3" step="0.1" value="1.0">
</div>
```

**Test Checkpoint:**
- Reload page
- Verify new controls appear in UI
- All sliders and checkboxes should be functional
- No console errors

---

#### Step 3.4: Initialize OrbitControls (20 min)
**File:** Supernova HTML file  
**Location:** In `init()` method, after camera setup

**FIND:**
```javascript
this.camera.position.z = this.settings.cameraDistance;
```

**ADD IMMEDIATELY AFTER:**
```javascript
// Setup OrbitControls
this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

// Configure controls
this.controls.enableDamping = this.settings.dampingEnabled;
this.controls.dampingFactor = 0.05;
this.controls.screenSpacePanning = false;
this.controls.minDistance = 15;
this.controls.maxDistance = 100;
this.controls.maxPolarAngle = Math.PI; // Allow full rotation
this.controls.autoRotate = this.settings.autoRotate;
this.controls.autoRotateSpeed = this.settings.autoRotateSpeed;
this.controls.zoomSpeed = this.settings.zoomSpeed;

// Set initial camera position
this.camera.position.set(0, 10, this.settings.cameraDistance);
this.controls.update();
```

**Test Checkpoint:**
- Reload page
- **Try dragging with mouse** - camera should orbit around center
- **Try right-click drag** - camera should pan
- **Try scroll wheel** - camera should zoom in/out
- Movement should feel smooth
- Console check for errors

---

#### Step 3.5: Remove Old Camera Code (10 min)
**File:** Supernova HTML file  
**Location:** Multiple locations

**In `setupEventListeners()`, REMOVE or COMMENT OUT:**
- Mouse drag handlers (mousedown, mouseup, mousemove for rotation)
- Wheel handler for zoom

**FIND and REMOVE/COMMENT these sections:**
```javascript
// REMOVE THIS ENTIRE SECTION:
this.canvas.addEventListener('mousedown', (e) => {
    this.mouse.down = true;
    // ... etc
});

window.addEventListener('mouseup', () => {
    this.mouse.down = false;
});

window.addEventListener('mousemove', (e) => {
    if (