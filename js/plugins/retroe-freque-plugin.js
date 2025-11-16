/**
 * RETROE - Retro 80s/90s Arcade Visualizer
 * 
 * A neon wireframe tunnel visualization with authentic retro arcade aesthetics
 * Features glitchy VHS/CRT effects for that classic 90s video game look
 * 
 * @version 1.0.0
 * @author Steve - CrashMonkeys
 */

class RetroePlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('retroe', visualizer, {
            version: '1.0.0',
            author: 'Steve - CrashMonkeys',
            description: 'Retro 80s/90s arcade tunnel with glitchy VHS effects',
            targetFPS: 60,
            dialFillColor: '--accent-color' // Custom dial fill color using theme variable
        });
        
        // Animation state
        this.time = 0;
        this.rotation = 0;
        
        // Ring spawning system
        this.rings = []; // Array of { age: 0-1, rotation: angle }
        this.ringSpawnInterval = 0.3; // Spawn new ring every 0.3 seconds (slower)
        this.timeSinceLastRing = 0;
        this.ringLifetime = 3.0; // Each ring lives for 3 seconds (longer life)
        
        // Audio smoothing (exponential smoothing to prevent jumpy movement)
        this.smoothedBass = 0;
        this.smoothedMid = 0;
        this.smoothedTreble = 0;
        this.smoothedEnergy = 0;
        this.audioSmoothingFactor = 0.15; // Lower = smoother, higher = more responsive
        
        // Audio reactivity controls (Option C - Hybrid)
        this.audioSensitivity = 1.0; // Global multiplier (0-2.0 = 0-200%)
        this.audioSmoothing = 0.15; // Smoothing factor (0-1)
        this.colorIntensity = 1.0; // Color reactivity intensity (0-2.0 = 0-200%)
        this.speedIntensity = 1.0; // Speed reactivity intensity (0-2.0 = 0-200%)
        this.segmentIntensity = 1.0; // Segment reactivity intensity (0-2.0 = 0-200%)
        this.bassRotation = false; // Bass → Rotation toggle
        this.bassSpawn = false; // Bass → Spawn toggle
        this.midGlow = false; // Mid → Glow toggle
        this.trebleThickness = false; // Treble → Thickness toggle
        
        // VHS glitch state
        this.glitchTime = 0;
        this.glitchActive = false;
        this.glitchIntensity = 0;
        this.rgbShiftAmount = 0;
        
        // Settings
        this.tunnelSpeed = 1.1;
        this.rotationSpeed = 2;
        this.segmentCount = 24;
        this.tunnelDepth = 30;
        this.ringThickness = 12;
        this.glowIntensity = 1.5;
        this.showScanlines = true;
        this.showGrid = true;
        this.gridPattern = 'octagon';
        this.backgroundOpacity = 0.25;
        this.beatReact = true;
        this.audioColor = true;      // ON by default
        this.audioSpeed = false;     // OFF by default
        this.audioSegments = false;  // OFF by default
        this.scale = 1.0;
        this.vhsIntensity = 0.5;
        this.rgbShift = 0.3;
        this.staticAmount = 0.2;
        this.curvature = 0.3;
        this.pixelation = 0; // 0 = full resolution, 100 = maximum pixelation
        this.colorBanding = 0; // 0 = full color, 100 = maximum banding (8-bit style)
        
        // Pixelation buffer (created lazily when needed)
        this.pixelCanvas = null;
        this.pixelCtx = null;
        
        // Color schemes
        this.colorSchemes = {
            classic: {
                primary: '#00ffff',
                secondary: '#ff00ff',
                tertiary: '#ffff00',
                background: '#000033'
            },
            outrun: {
                primary: '#ff006e',
                secondary: '#8338ec',
                tertiary: '#fb5607',
                background: '#1a0033'
            },
            matrix: {
                primary: '#00ff00',
                secondary: '#00aa00',
                tertiary: '#00ff88',
                background: '#001100'
            },
            tron: {
                primary: '#00d9ff',
                secondary: '#0077ff',
                tertiary: '#ffffff',
                background: '#000a1a'
            },
            cyberpunk: {
                primary: '#ff0080',
                secondary: '#00ffff',
                tertiary: '#ffff00',
                background: '#1a0033'
            },
            arcade: {
                primary: '#ff0000',
                secondary: '#ffff00',
                tertiary: '#00ff00',
                background: '#000000'
            },
            vhs: {
                primary: '#ff9999',
                secondary: '#cc88ff',
                tertiary: '#ffcc88',
                background: '#1a0f0f'
            },
            crt: {
                primary: '#88ddff',
                secondary: '#aaaaaa',
                tertiary: '#cccccc',
                background: '#001a33'
            },
            c64: {
                primary: '#8888ff',
                secondary: '#ff88ff',
                tertiary: '#88ffff',
                background: '#0000aa'
            },
            gameboy: {
                primary: '#9bbc0f',
                secondary: '#8bac0f',
                tertiary: '#306230',
                background: '#0f380f'
            }
        };
        
        this.currentColorScheme = 'classic';
        
        this.setupControls();
        this.setupPresets();
    }
    
    setupControls() {
        // Color scheme dropdown (TOP)
        this.addControl('colorScheme', {
            type: 'dropdown',
            label: 'Color Scheme',
            options: [
                { value: 'classic', label: 'Classic Arcade' },
                { value: 'outrun', label: 'Outrun Sunset' },
                { value: 'matrix', label: 'Matrix Green' },
                { value: 'tron', label: 'Tron Blue' },
                { value: 'cyberpunk', label: 'Cyberpunk' },
                { value: 'arcade', label: 'Arcade Cabinet' },
                { value: 'vhs', label: 'VHS Tape' },
                { value: 'crt', label: 'CRT Monitor' },
                { value: 'c64', label: 'Commodore 64' },
                { value: 'gameboy', label: 'Game Boy' }
            ],
            value: 'classic',
            className: 'dropdown-selector-mixer',
            onChange: (value) => {
                this.currentColorScheme = value;
            }
        });
        
        // Grid pattern dropdown
        this.addControl('gridPattern', {
            type: 'dropdown',
            label: 'Grid Pattern',
            options: [
                { value: 'octagon', label: 'Octagon' },
                { value: 'hexagon', label: 'Hexagon' },
                { value: 'square', label: 'Square' },
                { value: 'star', label: 'Star' }
            ],
            value: 'octagon',
            className: 'dropdown-selector-mixer',
            onChange: (value) => {
                this.gridPattern = value;
                // Update segment count based on pattern
                if (value === 'hexagon') {
                    this.segmentCount = 6;
                } else if (value === 'square') {
                    this.segmentCount = 4;
                } else if (value === 'star') {
                    this.segmentCount = 5;
                } else {
                    this.segmentCount = 8;
                }
            }
        });
        
        // Background Opacity (above tunnel speed)
        this.addControl('backgroundOpacity', {
            type: 'dial',
            label: 'Background Opacity',
            min: 0,
            max: 1,
            step: 0.05,
            value: 0.25,
            onChange: (value) => {
                this.backgroundOpacity = value;
            }
        });
        
        // Tunnel controls
        this.addControl('tunnelSpeed', {
            type: 'dial',
            label: 'Tunnel Speed',
            min: 0,
            max: 10,
            step: 0.1,
            value: 1.1,
            onChange: (value) => {
                this.tunnelSpeed = value;
            }
        });
        
        this.addControl('rotationSpeed', {
            type: 'dial',
            label: 'Rotation Speed',
            min: 0,
            max: 10,
            step: 0.1,
            value: 2,
            onChange: (value) => {
                this.rotationSpeed = value;
            }
        });
        
        // Scale control (below rotation speed)
        this.addControl('scale', {
            type: 'dial',
            label: 'Scale',
            min: 0.5,
            max: 3,
            step: 0.1,
            value: 1.0,
            onChange: (value) => {
                this.scale = value;
            }
        });
        
        this.addControl('segmentCount', {
            type: 'dial',
            label: 'Segment Count',
            min: 8,
            max: 48,
            step: 4,
            value: 24,
            onChange: (value) => {
                this.segmentCount = value;
            }
        });
        
        this.addControl('ringThickness', {
            type: 'dial',
            label: 'Ring Thickness',
            min: 1,
            max: 48,
            step: 1,
            value: 12,
            onChange: (value) => {
                this.ringThickness = value;
            }
        });
        
        this.addControl('glowIntensity', {
            type: 'dial',
            label: 'Glow Intensity',
            min: 0,
            max: 3,
            step: 0.1,
            value: 1.5,
            onChange: (value) => {
                this.glowIntensity = value;
            }
        });
        
        // Retro effect controls
        this.addControl('vhsIntensity', {
            type: 'dial',
            label: 'VHS Glitch',
            min: 0,
            max: 1,
            step: 0.1,
            value: 0.5,
            onChange: (value) => {
                this.vhsIntensity = value;
            }
        });
        
        this.addControl('rgbShift', {
            type: 'dial',
            label: 'RGB Shift',
            min: 0,
            max: 1,
            step: 0.1,
            value: 0.3,
            onChange: (value) => {
                this.rgbShift = value;
            }
        });
        
        this.addControl('staticAmount', {
            type: 'dial',
            label: 'Static/Noise',
            min: 0,
            max: 1,
            step: 0.1,
            value: 0.2,
            onChange: (value) => {
                this.staticAmount = value;
            }
        });
        
        this.addControl('curvature', {
            type: 'dial',
            label: 'Screen Curve',
            min: 0,
            max: 1,
            step: 0.1,
            value: 0.3,
            onChange: (value) => {
                this.curvature = value;
            }
        });
        
        this.addControl('pixelation', {
            type: 'dial',
            label: 'Pixelation',
            min: 0,
            max: 100,
            step: 5,
            value: 0,
            onChange: (value) => {
                this.pixelation = value;
                // Create/destroy pixel buffer as needed
                if (value > 0 && !this.pixelCanvas) {
                    this.pixelCanvas = document.createElement('canvas');
                    this.pixelCtx = this.pixelCanvas.getContext('2d', { willReadFrequently: true });
                } else if (value === 0 && this.pixelCanvas) {
                    this.pixelCanvas = null;
                    this.pixelCtx = null;
                }
            }
        });
        
        this.addControl('colorBanding', {
            type: 'dial',
            label: 'Color Banding',
            min: 0,
            max: 100,
            step: 5,
            value: 0,
            onChange: (value) => {
                this.colorBanding = value;
            }
        });
        
        // Audio reactivity toggles
        this.addControl('beatReact', {
            type: 'checkbox',
            label: 'Beat React (Master)',
            checked: true,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.beatReact = value;
            }
        });
        
        this.addControl('audioColor', {
            type: 'checkbox',
            label: 'Audio → Color',
            checked: true,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.audioColor = value;
            }
        });
        
        this.addControl('audioSpeed', {
            type: 'checkbox',
            label: 'Audio → Speed',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.audioSpeed = value;
            }
        });
        
        this.addControl('audioSegments', {
            type: 'checkbox',
            label: 'Audio → Segments',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.audioSegments = value;
            }
        });
        
        // Audio reactivity global controls
        this.addControl('audioSensitivity', {
            type: 'dial',
            label: 'Audio Sensitivity',
            min: 0,
            max: 200,
            step: 5,
            value: 100,
            onChange: (value) => {
                this.audioSensitivity = value / 100; // Convert 0-200% to 0-2.0
            }
        });
        
        this.addControl('audioSmoothing', {
            type: 'dial',
            label: 'Audio Smoothing',
            min: 0,
            max: 100,
            step: 5,
            value: 15,
            onChange: (value) => {
                this.audioSmoothing = value / 100; // Convert 0-100% to 0-1.0
                this.audioSmoothingFactor = this.audioSmoothing; // Update smoothing factor
            }
        });
        
        // Intensity dials for existing reactivity options
        this.addControl('colorIntensity', {
            type: 'dial',
            label: 'Color Intensity',
            min: 0,
            max: 200,
            step: 5,
            value: 100,
            onChange: (value) => {
                this.colorIntensity = value / 100; // Convert 0-200% to 0-2.0
            }
        });
        
        this.addControl('speedIntensity', {
            type: 'dial',
            label: 'Speed Intensity',
            min: 0,
            max: 200,
            step: 5,
            value: 100,
            onChange: (value) => {
                this.speedIntensity = value / 100; // Convert 0-200% to 0-2.0
            }
        });
        
        this.addControl('segmentIntensity', {
            type: 'dial',
            label: 'Segment Intensity',
            min: 0,
            max: 200,
            step: 5,
            value: 100,
            onChange: (value) => {
                this.segmentIntensity = value / 100; // Convert 0-200% to 0-2.0
            }
        });
        
        // Frequency-specific reactivity toggles
        this.addControl('bassRotation', {
            type: 'checkbox',
            label: 'Bass → Rotation',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.bassRotation = value;
            }
        });
        
        this.addControl('bassSpawn', {
            type: 'checkbox',
            label: 'Bass → Spawn',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.bassSpawn = value;
            }
        });
        
        this.addControl('midGlow', {
            type: 'checkbox',
            label: 'Mid → Glow',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.midGlow = value;
            }
        });
        
        this.addControl('trebleThickness', {
            type: 'checkbox',
            label: 'Treble → Thickness',
            checked: false,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.trebleThickness = value;
            }
        });
        
        this.addControl('showScanlines', {
            type: 'checkbox',
            label: 'Scanlines',
            checked: true,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.showScanlines = value;
            }
        });
        
        this.addControl('showGrid', {
            type: 'checkbox',
            label: 'Grid Lines',
            checked: true,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.showGrid = value;
            }
        });
    }
    
    setupPresets() {
        // User's presets
        this.addPreset('candySquares', {
            name: 'Candy Squares',
            values: {
                tunnelSpeed: 2.5,
                rotationSpeed: 2.8,
                segmentCount: 24,
                ringThickness: 47,
                glowIntensity: 3,
                vhsIntensity: 1,
                rgbShift: 0.4,
                staticAmount: 1,
                curvature: 1,
                pixelation: 0,
                colorBanding: 100,
                backgroundOpacity: 0.05,
                colorScheme: 'cyberpunk',
                gridPattern: 'square',
                beatReact: true,
                audioColor: true,
                audioSpeed: false,
                audioSegments: false,
                showScanlines: true,
                showGrid: true,
                scale: 1.9
            }
        });
        
        this.addPreset('speedRacer', {
            name: 'Speed Racer',
            values: {
                tunnelSpeed: 3.1,
                rotationSpeed: 5.1,
                segmentCount: 8,
                ringThickness: 47,
                glowIntensity: 3,
                vhsIntensity: 1,
                rgbShift: 0.8,
                staticAmount: 1,
                curvature: 0,
                pixelation: 0,
                colorBanding: 0,
                backgroundOpacity: 0.9,
                colorScheme: 'crt',
                gridPattern: 'hexagon',
                beatReact: true,
                audioColor: true,
                audioSpeed: false,
                audioSegments: false,
                showScanlines: true,
                showGrid: true,
                scale: 1.9
            }
        });
        
        this.addPreset('artRings', {
            name: '80s Art Rings',
            values: {
                tunnelSpeed: 2,
                rotationSpeed: 2,
                segmentCount: 24,
                ringThickness: 36,
                glowIntensity: 1.5,
                vhsIntensity: 0.9,
                rgbShift: 1,
                staticAmount: 0.2,
                curvature: 0,
                pixelation: 85,
                colorBanding: 100,
                backgroundOpacity: 0.95,
                colorScheme: 'classic',
                gridPattern: 'octagon',
                beatReact: true,
                audioColor: true,
                audioSpeed: false,
                audioSegments: false,
                showScanlines: true,
                showGrid: true,
                scale: 1
            }
        });
        
        // New presets
        this.addPreset('vhsTape', {
            name: 'VHS Tape',
            values: {
                tunnelSpeed: 1.5,
                rotationSpeed: 1.2,
                segmentCount: 16,
                ringThickness: 24,
                glowIntensity: 2,
                vhsIntensity: 0.8,
                rgbShift: 0.6,
                staticAmount: 0.4,
                curvature: 0.5,
                pixelation: 35,
                colorBanding: 50,
                backgroundOpacity: 0.3,
                colorScheme: 'vhs',
                gridPattern: 'octagon',
                beatReact: true,
                audioColor: true,
                audioSpeed: false,
                audioSegments: false,
                showScanlines: true,
                showGrid: true,
                scale: 1.2
            }
        });
        
        this.addPreset('gameBoy', {
            name: 'Game Boy',
            values: {
                tunnelSpeed: 1.8,
                rotationSpeed: 3,
                segmentCount: 8,
                ringThickness: 18,
                glowIntensity: 0.5,
                vhsIntensity: 0,
                rgbShift: 0,
                staticAmount: 0,
                curvature: 0,
                pixelation: 75,
                colorBanding: 100,
                backgroundOpacity: 0.8,
                colorScheme: 'gameboy',
                gridPattern: 'square',
                beatReact: true,
                audioColor: false,
                audioSpeed: false,
                audioSegments: false,
                showScanlines: true,
                showGrid: false,
                scale: 1
            }
        });
        
        this.addPreset('outrunSunset', {
            name: 'Outrun Sunset',
            values: {
                tunnelSpeed: 2.8,
                rotationSpeed: 4,
                segmentCount: 32,
                ringThickness: 28,
                glowIntensity: 2.5,
                vhsIntensity: 0.4,
                rgbShift: 0.5,
                staticAmount: 0.1,
                curvature: 0.3,
                pixelation: 20,
                colorBanding: 30,
                backgroundOpacity: 0.4,
                colorScheme: 'outrun',
                gridPattern: 'octagon',
                beatReact: true,
                audioColor: true,
                audioSpeed: true,
                audioSegments: false,
                showScanlines: true,
                showGrid: true,
                scale: 1.5
            }
        });
        
        this.addPreset('matrixCode', {
            name: 'Matrix Code',
            values: {
                tunnelSpeed: 1.2,
                rotationSpeed: 0.5,
                segmentCount: 16,
                ringThickness: 14,
                glowIntensity: 3,
                vhsIntensity: 0.2,
                rgbShift: 0.1,
                staticAmount: 0.3,
                curvature: 0.2,
                pixelation: 40,
                colorBanding: 75,
                backgroundOpacity: 0.95,
                colorScheme: 'matrix',
                gridPattern: 'hexagon',
                beatReact: true,
                audioColor: false,
                audioSpeed: false,
                audioSegments: true,
                showScanlines: true,
                showGrid: false,
                scale: 1
            }
        });
        
        this.addPreset('arcadeCabinet', {
            name: 'Arcade Cabinet',
            values: {
                tunnelSpeed: 3.5,
                rotationSpeed: 6,
                segmentCount: 12,
                ringThickness: 32,
                glowIntensity: 2,
                vhsIntensity: 0.3,
                rgbShift: 0.2,
                staticAmount: 0.15,
                curvature: 0.6,
                pixelation: 60,
                colorBanding: 85,
                backgroundOpacity: 0.2,
                colorScheme: 'arcade',
                gridPattern: 'square',
                beatReact: true,
                audioColor: true,
                audioSpeed: true,
                audioSegments: true,
                showScanlines: true,
                showGrid: true,
                scale: 1.8
            }
        });
    }
    
    onInitialize() {
        console.log('RETROE plugin initialized');
        // Spawn initial ring so something appears immediately
        this.rings.push({
            age: 0,
            rotation: 0
        });
    }
    
    getColors() {
        return this.colorSchemes[this.currentColorScheme] || this.colorSchemes.classic;
    }
    
    addAlpha(hexColor, alpha) {
        // Add alpha channel to hex color
        const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
        return hexColor + alphaHex;
    }
    
    drawGridLines(colors, audioData) {
        // Draw radial lines connecting consecutive rings
        // OPTIMIZED: Only draw every 2nd vertex to reduce draw calls
        
        // Color shift if audio reactive (with intensity multiplier)
        let gridColor = colors.primary;
        if (this.beatReact && this.audioColor) {
            const hueShift = audioData.energy * 120 * this.colorIntensity;
            gridColor = this.shiftHue(colors.primary, hueShift);
        }
        
        this.ctx.save();
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3; // Subtle lines
        
        // Draw lines between consecutive rings
        for (let i = 0; i < this.rings.length - 1; i++) {
            const ring1 = this.rings[i];
            const ring2 = this.rings[i + 1];
            
            // Calculate ring properties
            const radius1 = this.getRingRadius(ring1.age, audioData);
            const radius2 = this.getRingRadius(ring2.age, audioData);
            
            // Get segment count for this ring (with intensity multiplier)
            let sides = this.segmentCount;
            if (this.beatReact && this.audioSegments) {
                sides = Math.max(this.segmentCount + Math.floor(audioData.energy * 24 * this.segmentIntensity), 3);
            }
            
            // Draw lines every 2 vertices (every other one) for performance
            const step = 2;
            for (let v = 0; v < sides; v += step) {
                const angle = (v / sides) * Math.PI * 2;
                
                // Calculate position for ring1 vertex
                const rot1 = ring1.rotation + (this.rotation * 0.2);
                const x1 = this.canvas.width / 2 + Math.cos(angle + rot1) * radius1;
                const y1 = this.canvas.height / 2 + Math.sin(angle + rot1) * radius1;
                
                // Calculate position for ring2 vertex
                const rot2 = ring2.rotation + (this.rotation * 0.2);
                const x2 = this.canvas.width / 2 + Math.cos(angle + rot2) * radius2;
                const y2 = this.canvas.height / 2 + Math.sin(angle + rot2) * radius2;
                
                // Draw connecting line
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }
        
        this.ctx.restore();
    }
    
    getRingRadius(age, audioData) {
        // Calculate ring radius (same logic as drawRing)
        const growthFactor = Math.pow(age, 1.8);
        const minRadius = 5;
        const maxRadius = Math.max(this.canvas.width, this.canvas.height) * 1.2;
        const radius = minRadius + (maxRadius - minRadius) * growthFactor * this.scale;
        
        // Audio speed multiplier (with intensity multiplier)
        let speedMultiplier = 1.0;
        if (this.beatReact && this.audioSpeed) {
            speedMultiplier = 1.0 + (audioData.energy * 0.5 * this.speedIntensity);
        }
        
        return radius * speedMultiplier;
    }
    
    drawRing(age, rotation, colors, audioData) {
        // age is 0 to 1 (0 = just spawned at center, 1 = about to die off-screen)
        
        // Smoother exponential growth curve - less chunky
        const growthFactor = Math.pow(age, 1.8); // Reduced from 2.2 to 1.8 for smoother acceleration
        
        // Start tiny at center, grow to fill screen and beyond
        const minRadius = 5; // Even smaller starting size
        const maxRadius = Math.max(this.canvas.width, this.canvas.height) * 1.2;
        const radius = minRadius + (maxRadius - minRadius) * growthFactor * this.scale;
        
        // AUDIO SPEED: Only affects ring scale if enabled (with intensity multiplier)
        let speedMultiplier = 1.0;
        if (this.beatReact && this.audioSpeed) {
            speedMultiplier = 1.0 + (audioData.energy * 0.5 * this.speedIntensity);
        }
        const finalRadius = radius * speedMultiplier;
        
        // AUDIO SEGMENTS: Dynamic segment count if enabled (with intensity multiplier)
        let sides = this.segmentCount;
        if (this.beatReact && this.audioSegments) {
            const extraSegments = Math.floor(audioData.energy * 24 * this.segmentIntensity);
            sides = Math.max(this.segmentCount + extraSegments, 3);
        }
        
        // AUDIO COLOR: Color shifting if enabled (with intensity multiplier)
        let primaryColor = colors.primary;
        let secondaryColor = colors.secondary;
        let tertiaryColor = colors.tertiary;
        
        if (this.beatReact && this.audioColor) {
            const hueShift = audioData.energy * 120 * this.colorIntensity;
            primaryColor = this.shiftHue(colors.primary, hueShift);
            secondaryColor = this.shiftHue(colors.secondary, hueShift);
            tertiaryColor = this.shiftHue(colors.tertiary, hueShift);
        }
        
        // TREBLE → THICKNESS: Dynamic ring thickness if enabled
        let ringThickness = this.ringThickness;
        if (this.beatReact && this.trebleThickness) {
            const thicknessBoost = 1.0 + (audioData.treble * 0.5);
            ringThickness = this.ringThickness * thicknessBoost;
        }
        
        // MID → GLOW: Dynamic glow intensity if enabled
        let glowIntensity = this.glowIntensity;
        if (this.beatReact && this.midGlow) {
            const glowBoost = 1.0 + (audioData.mid * 0.5);
            glowIntensity = this.glowIntensity * glowBoost;
        }
        
        // Smooth fade in at birth, fade out at death
        const fadeInDuration = 0.15; // Slightly longer fade in
        const fadeOutStart = 0.85; // Start fading out later
        let alpha = 1.0;
        if (age < fadeInDuration) {
            alpha = age / fadeInDuration;
        } else if (age > fadeOutStart) {
            alpha = 1.0 - ((age - fadeOutStart) / (1.0 - fadeOutStart));
        }
        
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.rotate(rotation + (this.rotation * 0.2)); // Add global rotation influence
        
        // Helper to draw shape path
        const drawPath = () => {
            this.ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const x = Math.cos(angle) * finalRadius;
            const y = Math.sin(angle) * finalRadius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
            this.ctx.closePath(); // Close the path to connect last point to first
        };
        
        // SMOOTH GRADIENT GLOW: Multiple passes with decreasing width and increasing opacity
        // Each pass needs its own path for proper blending
        if (glowIntensity > 0) {
            const glowPasses = 6; // More passes = smoother glow
            for (let pass = glowPasses; pass > 0; pass--) {
                const normalizedPass = pass / glowPasses; // 1.0 to 0.166...
                const glowWidth = ringThickness + (normalizedPass * 16 * glowIntensity);
                const glowAlpha = (1 - normalizedPass) * 0.3 * glowIntensity * alpha; // Outer layers fainter
                
                // Cycle through gradient colors for smooth color blending
                const glowColor = pass > 4 ? primaryColor : (pass > 2 ? secondaryColor : tertiaryColor);
                
                drawPath();
                this.ctx.strokeStyle = this.addAlpha(glowColor, glowAlpha);
                this.ctx.lineWidth = glowWidth;
                this.ctx.stroke();
            }
        }
        
        // Main ring with full gradient on top
        drawPath();
        const gradient = this.ctx.createLinearGradient(-finalRadius, -finalRadius, finalRadius, finalRadius);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.5, secondaryColor);
        gradient.addColorStop(1, tertiaryColor);
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = ringThickness;
        this.ctx.globalAlpha = alpha;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawScanlines() {
        if (!this.showScanlines) return;
        
        const audioData = this.getAudioData();
        const colors = this.getColors();
        
        // Enhanced scanlines with subtle color tint based on color scheme
        // Extract RGB from primary color for tint
        const primaryColor = colors.primary;
        const r = parseInt(primaryColor.slice(1, 3), 16);
        const g = parseInt(primaryColor.slice(3, 5), 16);
        const b = parseInt(primaryColor.slice(5, 7), 16);
        
        // Scanline thickness varies slightly with audio
        const baseAlpha = 0.3;
        const audioAlpha = audioData.energy * 0.1; // Subtle audio reaction
        const alpha = baseAlpha + audioAlpha;
        
        // Horizontal scanlines (every 2 pixels, thicker lines)
        this.ctx.globalAlpha = alpha;
        
        for (let y = 0; y < this.canvas.height; y += 2) {
            // Alternate between pure black and tinted scanlines for more texture
            if (y % 4 === 0) {
                this.ctx.fillStyle = '#000000';
            } else {
                // Add subtle color tint (very faint)
                this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
            }
            this.ctx.fillRect(0, y, this.canvas.width, 1);
        }
        
        // Optional: Add subtle vertical grid lines (CRT mask effect)
        // Much fainter than horizontal lines
        this.ctx.globalAlpha = alpha * 0.3;
        for (let x = 0; x < this.canvas.width; x += 3) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.fillRect(x, 0, 1, this.canvas.height);
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    drawVHSGlitch() {
        if (this.vhsIntensity === 0) return;
        
        const audioData = this.getAudioData();
        
        // Random glitch triggers (more frequent with treble)
        // audioData.treble is already 0 if beatReact is OFF
        if (Math.random() < 0.02 + (audioData.treble * 0.05 * this.vhsIntensity)) {
            this.glitchActive = true;
            this.glitchIntensity = 0.3 + Math.random() * 0.7;
            this.glitchTime = 0;
        }
        
        // Update glitch
        if (this.glitchActive) {
            this.glitchTime += 0.1;
            if (this.glitchTime > 1) {
                this.glitchActive = false;
            }
            
            // HORIZONTAL SHIFT GLITCHES (original effect - optimized)
            const numGlitches = Math.floor(1 + Math.random() * 2);
            for (let i = 0; i < numGlitches; i++) {
                const y = Math.random() * this.canvas.height;
                const height = 5 + Math.random() * 20;
                const offset = (Math.random() - 0.5) * 50 * this.glitchIntensity * this.vhsIntensity;
                
                // Get image data - EXPENSIVE OPERATION
                const imageData = this.ctx.getImageData(0, y, this.canvas.width, height);
                
                // Shift it
                this.ctx.putImageData(imageData, offset, y);
            }
            
            // DIAGONAL TRACKING ERRORS (NEW)
            // Simulate tape tracking errors with diagonal distortion
            if (Math.random() < 0.3) {
                const startY = Math.random() * this.canvas.height * 0.5;
                const height = 30 + Math.random() * 50;
                const skew = (Math.random() - 0.5) * 20 * this.glitchIntensity * this.vhsIntensity;
                
                // Draw diagonal distortion in segments
                for (let segment = 0; segment < 5; segment++) {
                    const segY = startY + (segment * height / 5);
                    const segH = height / 5;
                    const segOffset = skew * (segment / 5);
                    
                    try {
                        const imageData = this.ctx.getImageData(0, segY, this.canvas.width, segH);
                        this.ctx.putImageData(imageData, segOffset, segY);
                    } catch (e) {
                        // Silently ignore out-of-bounds errors
                    }
                }
            }
            
            // RANDOM DROPOUT (NEW)
            // Black spots/rectangles simulating tape dropout
            if (Math.random() < 0.4) {
                const numDropouts = Math.floor(1 + Math.random() * 3);
                this.ctx.fillStyle = '#000000';
                for (let i = 0; i < numDropouts; i++) {
                    const x = Math.random() * this.canvas.width;
                    const y = Math.random() * this.canvas.height;
                    const w = 5 + Math.random() * 30;
                    const h = 2 + Math.random() * 10;
                    this.ctx.fillRect(x, y, w, h);
                }
            }
        }
        
        // HEAD SWITCHING NOISE (NEW)
        // Horizontal bar at top of screen (VHS head switching artifact)
        if (Math.random() < 0.05 * this.vhsIntensity) {
            const barHeight = 2 + Math.random() * 4;
            const barY = Math.random() * 40; // Near top of screen
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * this.vhsIntensity})`;
            this.ctx.fillRect(0, barY, this.canvas.width, barHeight);
            
            // Add noise pattern to the bar
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * this.canvas.width;
                const brightness = Math.random();
                this.ctx.fillStyle = `rgba(${brightness * 255}, ${brightness * 255}, ${brightness * 255}, 0.5)`;
                this.ctx.fillRect(x, barY, 2, barHeight);
            }
        }
        
        // TRACKING ERROR LINES (enhanced original effect)
        if (Math.random() < 0.1 * this.vhsIntensity) {
            const y = Math.random() * this.canvas.height;
            const thickness = 1 + Math.random() * 2;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, y, this.canvas.width, thickness);
        }
    }
    
    drawRGBShift() {
        if (this.rgbShift === 0) return;
        
        const audioData = this.getAudioData();
        // audioData.treble is already 0 if beatReact is OFF
        
        // Enhanced: More pronounced shift, audio-reactive, with vertical component
        const baseShift = this.rgbShift * 8; // Increased from 5 to 8
        const audioBoost = 1 + (audioData.treble * 1.5); // Increased from 0.5 to 1.5
        const shiftAmountH = baseShift * audioBoost; // Horizontal shift
        const shiftAmountV = (baseShift * 0.5) * audioBoost; // Vertical shift (half of horizontal)
        
        // Enhanced chromatic aberration with proper image data manipulation
        // This creates a more pronounced, realistic RGB separation
        const colors = this.getColors();
        
        // Method 1: Overlay method (more pronounced, better performance)
        const alpha = 0.15 * this.rgbShift; // Increased from 0.1
        this.ctx.globalAlpha = alpha;
        this.ctx.globalCompositeOperation = 'screen';
        
        // Red channel shift (left and up)
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(-shiftAmountH, -shiftAmountV, this.canvas.width, this.canvas.height);
        
        // Blue channel shift (right and down)
        this.ctx.fillStyle = '#0000ff';
        this.ctx.fillRect(shiftAmountH, shiftAmountV, this.canvas.width, this.canvas.height);
        
        // Green channel shift (vertical only, opposite direction)
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(0, shiftAmountV * 0.5, this.canvas.width, this.canvas.height);
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;
        
        // Add edge fringing (color bleeding at high-contrast edges)
        // More pronounced with higher RGB shift and audio
        if (this.rgbShift > 0.3 && audioData.treble > 0.5) {
            this.ctx.globalAlpha = 0.1 * this.rgbShift * audioData.treble;
            this.ctx.globalCompositeOperation = 'screen';
            
            // Magenta fringe (Red + Blue)
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.fillRect(shiftAmountH * 0.5, 0, this.canvas.width, this.canvas.height);
            
            // Cyan fringe (Green + Blue)
            this.ctx.fillStyle = '#00ffff';
            this.ctx.fillRect(-shiftAmountH * 0.5, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 1;
        }
    }
    
    drawStatic() {
        if (this.staticAmount === 0) return;
        
        const audioData = this.getAudioData();
        // audioData.treble is already 0 if beatReact is OFF
        const audioInfluence = 0.5 + (audioData.treble * 0.5);
        const intensity = this.staticAmount * audioInfluence;
        
        // Enhanced: Film grain-like static with clustering and color noise
        const pixelCount = Math.floor(intensity * 500); // Base count
        
        // Use Perlin-like clustering for more film grain appearance
        const clusterSeed = Math.random() * 1000;
        
        for (let i = 0; i < pixelCount; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            
            // Create clustering by checking neighboring positions
            // Pixels near each other are more likely to have similar brightness
            const clusterFactor = Math.sin(x * 0.1 + clusterSeed) * Math.cos(y * 0.1 + clusterSeed);
            const shouldDraw = Math.random() < 0.5 + (clusterFactor * 0.3);
            
            if (shouldDraw) {
                const brightness = Math.random();
                
                // Add colored noise (not just white/gray)
                // 70% grayscale, 30% colored noise for authenticity
                if (Math.random() < 0.7) {
                    // Grayscale static (traditional)
                    this.ctx.fillStyle = `rgba(${brightness * 255}, ${brightness * 255}, ${brightness * 255}, ${intensity})`;
                } else {
                    // Colored noise (VHS artifact)
                    const r = brightness * 255 * (0.5 + Math.random() * 0.5);
                    const g = brightness * 255 * (0.5 + Math.random() * 0.5);
                    const b = brightness * 255 * (0.5 + Math.random() * 0.5);
                    this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${intensity * 0.7})`;
                }
                
                // Vary pixel size slightly (1-2px) for more organic look
                const size = Math.random() < 0.8 ? 1 : 2;
                this.ctx.fillRect(x, y, size, size);
            }
        }
        
        // Add occasional larger grain clusters (film grain characteristic)
        if (intensity > 0.3) {
            const clusterCount = Math.floor(intensity * 20);
            for (let i = 0; i < clusterCount; i++) {
                const cx = Math.random() * this.canvas.width;
                const cy = Math.random() * this.canvas.height;
                const clusterSize = 2 + Math.random() * 4;
                const clusterBrightness = Math.random();
                
                this.ctx.fillStyle = `rgba(${clusterBrightness * 255}, ${clusterBrightness * 255}, ${clusterBrightness * 255}, ${intensity * 0.5})`;
                this.ctx.fillRect(cx, cy, clusterSize, clusterSize);
            }
        }
    }
    
    drawVignette() {
        // Dark edges for CRT effect
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.canvas.height * 0.3,
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.canvas.height * 0.8
        );
        
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawScreenCurvature() {
        if (this.curvature === 0) return;
        
        // Create curved CRT glass effect with radial gradient from edges
        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerX = w / 2;
        const centerY = h / 2;
        
        // Calculate the "radius" for the curvature effect
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        const curvatureStrength = this.curvature * 0.5;
        
        // Create gradient from center (clear) to edges (dark)
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, maxDist * (1 - curvatureStrength),
            centerX, centerY, maxDist
        );
        
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${curvatureStrength})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, w, h);
    }
    
    
    shiftHue(hexColor, degrees) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        
        // Convert RGB to HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        
        // Shift hue
        h = (h * 360 + degrees) % 360;
        
        // Convert back to RGB
        let r2, g2, b2;
        if (s === 0) {
            r2 = g2 = b2 = l;
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
            r2 = hue2rgb(p, q, h / 360 + 1/3);
            g2 = hue2rgb(p, q, h / 360);
            b2 = hue2rgb(p, q, h / 360 - 1/3);
        }
        
        // Convert back to hex
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return '#' + toHex(r2) + toHex(g2) + toHex(b2);
    }
    
    getAudioData() {
        // If beatReact is OFF, return zero audio influence
        if (!this.beatReact) {
            // Reset smoothed values when beat react is turned off
            this.smoothedBass = 0;
            this.smoothedMid = 0;
            this.smoothedTreble = 0;
            this.smoothedEnergy = 0;
            return {
                bass: 0,
                mid: 0,
                treble: 0,
                energy: 0
            };
        }
        
        // Get raw audio values
        const rawBass = this.getAudioEnergy('bass') || 0;
        const rawMid = this.getAudioEnergy('mid') || 0;
        const rawTreble = this.getAudioEnergy('treble') || 0;
        
        // Calculate overall energy (0-1)
        const energy = (rawBass + rawMid + rawTreble) / 3;
        
        // Apply exponential smoothing to prevent jumpy movement (uses audioSmoothing dial)
        this.smoothedBass += (rawBass - this.smoothedBass) * this.audioSmoothing;
        this.smoothedMid += (rawMid - this.smoothedMid) * this.audioSmoothing;
        this.smoothedTreble += (rawTreble - this.smoothedTreble) * this.audioSmoothing;
        this.smoothedEnergy += (energy - this.smoothedEnergy) * this.audioSmoothing;
        
        // Apply global sensitivity multiplier
        return {
            bass: this.smoothedBass * this.audioSensitivity,
            mid: this.smoothedMid * this.audioSensitivity,
            treble: this.smoothedTreble * this.audioSensitivity,
            energy: this.smoothedEnergy * this.audioSensitivity
        };
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        // deltaTime is in MILLISECONDS from MAL, convert to seconds
        const deltaSeconds = deltaTime / 1000;
        this.time += deltaSeconds;
        
        // Get audio data
        const audioData = this.getAudioData();
        
        // Spawn new rings based on interval
        this.timeSinceLastRing += deltaSeconds;
        let spawnInterval = this.ringSpawnInterval / (this.tunnelSpeed / 5); // Faster speed = more frequent spawns
        
        // BASS → SPAWN: Bass affects spawn rate (more bass = faster spawns)
        if (this.beatReact && this.bassSpawn) {
            const bassBoost = 1.0 - (audioData.bass * 0.5); // Reduce interval (faster spawns) with more bass
            spawnInterval *= Math.max(0.3, bassBoost); // Clamp minimum to prevent too fast
        }
        
        if (this.timeSinceLastRing >= spawnInterval) {
            this.rings.push({
                age: 0,
                rotation: this.rotation
            });
            this.timeSinceLastRing = 0;
        }
        
        // Update existing rings
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const ring = this.rings[i];
            
            // Age the ring (tunnelSpeed controls how fast they grow)
            ring.age += deltaSeconds / this.ringLifetime * (this.tunnelSpeed / 5);
            
            // Remove rings that have finished their lifecycle
            if (ring.age >= 1.0) {
                this.rings.splice(i, 1);
            }
        }
        
        // ROTATION SPEED - Global rotation applied to all rings
        let rotationSpeed = this.rotationSpeed;
        
        // BASS → ROTATION: Bass affects rotation speed
        if (this.beatReact && this.bassRotation) {
            const rotationBoost = 1.0 + (audioData.bass * 0.5);
            rotationSpeed = this.rotationSpeed * rotationBoost;
        }
        
        this.rotation += rotationSpeed * deltaSeconds;
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        const audioData = this.getAudioData();
        const colors = this.getColors();
        
        // Clear with background using opacity setting
        const opacity = Math.round(this.backgroundOpacity * 255).toString(16).padStart(2, '0');
        this.ctx.fillStyle = colors.background + opacity;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid lines first (behind rings)
        if (this.showGrid && this.rings.length > 1) {
            this.drawGridLines(colors, audioData);
        }
        
        // Draw all active rings from oldest to newest (back to front)
        for (const ring of this.rings) {
            this.drawRing(ring.age, ring.rotation, colors, audioData);
        }
        
        // Apply retro effects in order
        this.drawScanlines();
        this.drawStatic();
        this.drawVHSGlitch();
        this.drawRGBShift();
        
        // Apply color banding BEFORE vignette/curvature to avoid posterizing gradients
        if (this.colorBanding > 0) {
            this.applyColorBanding();
        }
        
        // Apply vignette and screen curvature AFTER color banding
        // This prevents the smooth gradients from being posterized
        this.drawVignette();
        this.drawScreenCurvature();
        
        // Apply pixelation effect LAST (after all other effects)
        if (this.pixelation > 0) {
            this.applyPixelation();
        }
    }
    
    applyColorBanding() {
        // Get the image data from the canvas
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // Calculate color depth based on banding amount (0-100)
        // 0% = 256 levels (8-bit per channel, full color)
        // 25% = 64 levels (6-bit)
        // 50% = 16 levels (4-bit)
        // 75% = 4 levels (2-bit)
        // 100% = 2 levels (1-bit, pure posterization)
        const bandingFactor = this.colorBanding / 100;
        const levels = Math.max(2, Math.floor(256 * (1 - bandingFactor * 0.992))); // Keep minimum of 2 levels
        const step = 255 / (levels - 1);
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
            // Quantize each color channel
            data[i] = Math.round(data[i] / step) * step;     // Red
            data[i + 1] = Math.round(data[i + 1] / step) * step; // Green
            data[i + 2] = Math.round(data[i + 2] / step) * step; // Blue
            // Alpha (i + 3) stays unchanged
        }
        
        // Put the modified image data back
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    applyPixelation() {
        // Calculate pixel size based on pixelation amount (0-100)
        // At 100%, we want about 160x120 resolution (classic retro)
        // At 50%, about 320x240
        // At 25%, about 640x480
        const pixelFactor = 1 - (this.pixelation / 100);
        const minResolution = 160; // Minimum width at 100% pixelation
        const targetWidth = Math.max(minResolution, Math.floor(this.canvas.width * pixelFactor));
        const targetHeight = Math.max(Math.floor(minResolution * (this.canvas.height / this.canvas.width)), 
                                      Math.floor(this.canvas.height * pixelFactor));
        
        // Set pixel buffer size
        this.pixelCanvas.width = targetWidth;
        this.pixelCanvas.height = targetHeight;
        
        // Draw the main canvas to the small pixel buffer (downscale with smoothing OFF)
        this.pixelCtx.imageSmoothingEnabled = false;
        this.pixelCtx.drawImage(this.canvas, 0, 0, targetWidth, targetHeight);
        
        // Clear main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the pixelated buffer back to the main canvas (upscale with nearest-neighbor)
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(this.pixelCanvas, 0, 0, this.canvas.width, this.canvas.height);
        
        // Re-enable smoothing for future operations (just in case)
        this.ctx.imageSmoothingEnabled = true;
    }
    
    onCleanup() {
        console.log('RETROE plugin cleaned up');
    }
}

// Auto-register the plugin
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new RetroePlugin(window.visualizer);
        console.log('🎮 RETROE plugin loaded!');
    }
}, 500);
