/**
 * Audio Particles Three.js Plugin
 * 
 * Description: Advanced 3D particle system that reacts to audio frequencies
 * 
 * Author: Freque Team
 * Version: 1.0.0
 * Date: 2025-11-06
 * 
 * Features:
 * - 3D particle system using Three.js
 * - Audio-reactive particle behavior (size, position, color)
 * - Frequency-based particle clusters (bass/mid/treble)
 * - Beat detection with particle burst effect
 * - Multiple color schemes and visual modes
 * 
 * Controls:
 * - Particle Count: Number of particles (100-5000)
 * - Particle Size: Base particle size
 * - Speed: Particle movement speed
 * - Audio Sensitivity: How much audio affects particles
 * - Color Scheme: Visual color theme
 * - Camera Mode: Orbit, static, or auto-rotate
 * - Beat Reactivity: Enable/disable beat detection
 * 
 * Audio Reactivity:
 * - Bass: Controls particle size and Z-position
 * - Mid: Controls particle Y-position and rotation speed
 * - Treble: Controls particle color and glow intensity
 * - Beat: Triggers particle burst/explosion effect
 * 
 * Dependencies:
 * - Three.js r128+ (included in main application)
 * 
 * Known Issues:
 * - None
 */

class AudioParticlesPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('audioparticles', visualizer, {
            version: '1.0.0',
            author: 'Freque Team',
            description: 'Three.js Audio-Reactive Particle System',
            displayName: 'Audio Particles 3D',
            targetFPS: 60
        });
        
        // Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particleSystem = null;
        this.particles = null;
        
        // Particle properties
        this.particleCount = 1000;
        this.particleSize = 0.05;
        this.particleSpeed = 0.5;
        this.audioSensitivity = 1.0;
        
        // Visual properties
        this.colorScheme = 'rainbow';
        this.cameraMode = 'orbit';
        this.beatReactive = true;
        
        // Color schemes
        this.colorSchemes = {
            rainbow: { h: 0, s: 1, l: 0.5, spread: 1.0 },
            blue: { h: 0.6, s: 1, l: 0.5, spread: 0.1 },
            red: { h: 0, s: 1, l: 0.5, spread: 0.1 },
            purple: { h: 0.8, s: 1, l: 0.5, spread: 0.2 },
            gold: { h: 0.12, s: 1, l: 0.5, spread: 0.05 }
        };
        
        // Audio analysis
        this.beatThreshold = 0.75;
        this.lastBeatTime = 0;
        this.beatCooldown = 300; // ms
        
        // Camera animation
        this.cameraAngle = 0;
        this.cameraDistance = 5;
        this.cameraHeight = 0;
        
        // Particle geometry data
        this.positions = null;
        this.colors = null;
        this.sizes = null;
        this.velocities = null;
        this.originalPositions = null;
        
        // Setup
        this.setupControls();
        this.setupPresets();
    }
    
    // CRITICAL: Override for Three.js
    shouldClearCanvas() {
        return false; // Three.js handles its own clearing
    }
    
    setupControls() {
        this.addControl('particleCount', {
            type: 'slider',
            label: 'Particle Count',
            min: 100,
            max: 5000,
            value: this.particleCount,
            onChange: (value) => {
                this.particleCount = value;
                if (this.isInitialized) {
                    this.recreateParticles();
                }
            }
        });
        
        this.addControl('particleSize', {
            type: 'slider',
            label: 'Particle Size',
            min: 0.01,
            max: 0.2,
            value: this.particleSize,
            onChange: (value) => {
                this.particleSize = value;
            }
        });
        
        this.addControl('particleSpeed', {
            type: 'slider',
            label: 'Movement Speed',
            min: 0.1,
            max: 2.0,
            value: this.particleSpeed,
            unit: 'x',
            onChange: (value) => {
                this.particleSpeed = value;
            }
        });
        
        this.addControl('audioSensitivity', {
            type: 'slider',
            label: 'Audio Sensitivity',
            min: 0.1,
            max: 3.0,
            value: this.audioSensitivity,
            unit: 'x',
            onChange: (value) => {
                this.audioSensitivity = value;
            }
        });
        
        this.addControl('colorScheme', {
            type: 'dropdown',
            label: 'Color Scheme',
            options: [
                { value: 'rainbow', label: 'Rainbow' },
                { value: 'blue', label: 'Ocean Blue' },
                { value: 'red', label: 'Fire Red' },
                { value: 'purple', label: 'Purple Haze' },
                { value: 'gold', label: 'Golden' }
            ],
            value: this.colorScheme,
            onChange: (value) => {
                this.colorScheme = value;
            }
        });
        
        this.addControl('cameraMode', {
            type: 'dropdown',
            label: 'Camera Mode',
            options: [
                { value: 'orbit', label: 'Orbit' },
                { value: 'static', label: 'Static' },
                { value: 'flow', label: 'Flow' }
            ],
            value: this.cameraMode,
            onChange: (value) => {
                this.cameraMode = value;
                if (value === 'static') {
                    this.camera.position.set(0, 0, 5);
                    this.camera.lookAt(0, 0, 0);
                }
            }
        });
        
        this.addControl('beatReactive', {
            type: 'checkbox',
            label: 'Beat Reactivity',
            checked: this.beatReactive,
            onChange: (checked) => {
                this.beatReactive = checked;
            }
        });
        
        this.addControl('reset', {
            type: 'button',
            label: 'Reset Particles',
            className: 'btn-primary',
            onClick: () => {
                this.recreateParticles();
            }
        });
    }
    
    setupPresets() {
        this.addPreset('ambient', {
            name: 'Ambient Space',
            values: {
                particleCount: 500,
                particleSize: 0.03,
                particleSpeed: 0.2,
                audioSensitivity: 0.5,
                colorScheme: 'blue',
                cameraMode: 'orbit',
                beatReactive: false
            }
        });
        
        this.addPreset('energetic', {
            name: 'Energetic Dance',
            values: {
                particleCount: 2000,
                particleSize: 0.08,
                particleSpeed: 1.2,
                audioSensitivity: 2.0,
                colorScheme: 'rainbow',
                cameraMode: 'flow',
                beatReactive: true
            }
        });
        
        this.addPreset('intense', {
            name: 'Intense Storm',
            values: {
                particleCount: 3500,
                particleSize: 0.1,
                particleSpeed: 1.8,
                audioSensitivity: 2.5,
                colorScheme: 'red',
                cameraMode: 'orbit',
                beatReactive: true
            }
        });
        
        this.addPreset('minimal', {
            name: 'Minimal Flow',
            values: {
                particleCount: 300,
                particleSize: 0.02,
                particleSpeed: 0.3,
                audioSensitivity: 0.8,
                colorScheme: 'gold',
                cameraMode: 'static',
                beatReactive: false
            }
        });
    }
    
    onInitialize() {
        this.setupThreeJS();
        this.createParticles();
    }
    
    setupThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.width / this.canvas.height,
            0.1,
            1000
        );
        this.camera.position.z = 5;
        
        // Create renderer using plugin canvas
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        
        // Add ambient light for visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
    }
    
    createParticles() {
        // Remove existing particles if any
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }
        
        // Create geometry
        const geometry = new THREE.BufferGeometry();
        
        // Initialize arrays
        this.positions = new Float32Array(this.particleCount * 3);
        this.colors = new Float32Array(this.particleCount * 3);
        this.sizes = new Float32Array(this.particleCount);
        this.velocities = [];
        this.originalPositions = new Float32Array(this.particleCount * 3);
        
        // Create particles in a sphere
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Random position in sphere
            const radius = 2 * Math.random();
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            this.positions[i3] = x;
            this.positions[i3 + 1] = y;
            this.positions[i3 + 2] = z;
            
            // Store original positions
            this.originalPositions[i3] = x;
            this.originalPositions[i3 + 1] = y;
            this.originalPositions[i3 + 2] = z;
            
            // Initial colors (will be updated)
            this.colors[i3] = 1;
            this.colors[i3 + 1] = 1;
            this.colors[i3 + 2] = 1;
            
            // Initial sizes
            this.sizes[i] = this.particleSize * (0.5 + Math.random() * 0.5);
            
            // Random velocity
            this.velocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            });
        }
        
        // Set attributes
        geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 3));
        
        // Create material
        const material = new THREE.PointsMaterial({
            size: this.particleSize,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create particle system
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
        
        this.particles = geometry;
    }
    
    recreateParticles() {
        this.createParticles();
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        if (!this.particleSystem || !this.particles) return;
        
        // Get audio data
        const energy = this.getAudioEnergy();
        const frequencies = this.getAudioFrequencies();
        
        // Calculate frequency bands
        const bass = this.calculateBandEnergy(frequencies, 0, 50);
        const mid = this.calculateBandEnergy(frequencies, 50, 150);
        const treble = this.calculateBandEnergy(frequencies, 150, 255);
        
        // Beat detection
        if (this.beatReactive) {
            this.detectBeat(energy, timestamp);
        }
        
        // Update camera
        this.updateCamera(deltaTime, timestamp, energy);
        
        // Update particles
        this.updateParticles(bass, mid, treble, energy, deltaTime);
        
        // Rotate particle system slightly
        this.particleSystem.rotation.y += 0.001 * this.particleSpeed * (1 + energy * 0.5);
    }
    
    calculateBandEnergy(frequencies, startIndex, endIndex) {
        if (!frequencies || frequencies.length === 0) return 0;
        
        const band = frequencies.slice(startIndex, endIndex);
        const sum = band.reduce((a, b) => a + b, 0);
        return (sum / band.length / 255) * this.audioSensitivity;
    }
    
    detectBeat(energy, timestamp) {
        if (energy > this.beatThreshold && timestamp - this.lastBeatTime > this.beatCooldown) {
            this.onBeat();
            this.lastBeatTime = timestamp;
        }
    }
    
    onBeat() {
        // Particle burst effect
        if (!this.particles) return;
        
        const positions = this.particles.attributes.position.array;
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Push particles outward
            const dx = positions[i3] - 0;
            const dy = positions[i3 + 1] - 0;
            const dz = positions[i3 + 2] - 0;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance > 0) {
                this.velocities[i].x += (dx / distance) * 0.1;
                this.velocities[i].y += (dy / distance) * 0.1;
                this.velocities[i].z += (dz / distance) * 0.1;
            }
        }
    }
    
    updateCamera(deltaTime, timestamp, energy) {
        if (this.cameraMode === 'orbit') {
            this.cameraAngle += 0.0005 * this.particleSpeed;
            this.cameraDistance = 5 + energy * 2;
            
            this.camera.position.x = Math.cos(this.cameraAngle) * this.cameraDistance;
            this.camera.position.z = Math.sin(this.cameraAngle) * this.cameraDistance;
            this.camera.position.y = Math.sin(this.cameraAngle * 0.5) * 2;
            this.camera.lookAt(0, 0, 0);
            
        } else if (this.cameraMode === 'flow') {
            this.cameraHeight = Math.sin(timestamp * 0.0005) * 3;
            this.camera.position.y = this.cameraHeight + energy * 2;
            this.camera.position.z = 5 + energy * 3;
            this.camera.lookAt(0, 0, 0);
        }
        // Static mode: camera doesn't move
    }
    
    updateParticles(bass, mid, treble, energy, deltaTime) {
        if (!this.particles) return;
        
        const positions = this.particles.attributes.position.array;
        const colors = this.particles.attributes.color.array;
        const sizes = this.particles.attributes.size.array;
        const colorScheme = this.colorSchemes[this.colorScheme];
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Update position with velocity
            positions[i3] += this.velocities[i].x * this.particleSpeed;
            positions[i3 + 1] += this.velocities[i].y * this.particleSpeed;
            positions[i3 + 2] += this.velocities[i].z * this.particleSpeed;
            
            // Audio-reactive position adjustments
            positions[i3 + 2] += bass * 0.05; // Bass affects Z
            positions[i3 + 1] += mid * 0.03;  // Mid affects Y
            
            // Pull back towards original position (spring force)
            const dx = this.originalPositions[i3] - positions[i3];
            const dy = this.originalPositions[i3 + 1] - positions[i3 + 1];
            const dz = this.originalPositions[i3 + 2] - positions[i3 + 2];
            
            positions[i3] += dx * 0.01;
            positions[i3 + 1] += dy * 0.01;
            positions[i3 + 2] += dz * 0.01;
            
            // Damping
            this.velocities[i].x *= 0.98;
            this.velocities[i].y *= 0.98;
            this.velocities[i].z *= 0.98;
            
            // Update size based on bass
            sizes[i] = this.particleSize * (1 + bass * 2);
            
            // Update color based on treble and color scheme
            const hue = colorScheme.h + (i / this.particleCount) * colorScheme.spread + treble * 0.2;
            const rgb = this.hslToRgb(hue % 1, colorScheme.s, colorScheme.l);
            
            colors[i3] = rgb.r;
            colors[i3 + 1] = rgb.g;
            colors[i3 + 2] = rgb.b;
        }
        
        // Mark attributes as needing update
        this.particles.attributes.position.needsUpdate = true;
        this.particles.attributes.color.needsUpdate = true;
        this.particles.attributes.size.needsUpdate = true;
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
        
        return { r, g, b };
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    onResize(width, height) {
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        
        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }
    
    onPresetApply(presetId, preset) {
        // Recreate particles with new count if it changed
        if (preset.values.particleCount !== this.particleCount) {
            setTimeout(() => {
                this.recreateParticles();
            }, 100);
        }
    }
    
    onCleanup() {
        // Clean up Three.js resources
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clear references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particleSystem = null;
        this.particles = null;
        this.positions = null;
        this.colors = null;
        this.sizes = null;
        this.velocities = null;
        this.originalPositions = null;
    }
}

// Make globally available
window.AudioParticlesPlugin = AudioParticlesPlugin;

// Auto-register plugin
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase && typeof THREE !== 'undefined') {
        const existingPlugin = window.pluginManager?.getPlugin('audioparticles');
        if (!existingPlugin) {
            new AudioParticlesPlugin(window.visualizer);
        }
    } else {
        console.warn('Audio Particles Plugin: Waiting for dependencies (visualizer, FrequePluginBase, Three.js)');
    }
}, 500);
