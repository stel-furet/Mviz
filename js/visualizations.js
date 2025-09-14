const VISUALIZATION_PARAMETERS = {
    // Bars Scope Parameters
    bars: {
        gradient: { min: 0, max: 1, default: 0.5, type: 'float', audioMotion: 'gradient' },
        peakShowTime: { min: 0, max: 2000, default: 500, type: 'int', audioMotion: 'peakHoldTime' },
        barWidth: { min: 1, max: 20, default: 8, type: 'int', audioMotion: 'lineWidth' },
        barSpacing: { min: 0, max: 10, default: 2, type: 'int', audioMotion: 'barSpace' },
        barHeight: { min: 0.1, max: 2.0, default: 1.0, type: 'float', audioMotion: 'linearBoost' },
        mirrorMode: { values: ['off', 'x', 'y', 'xy'], default: 'off', type: 'enum', audioMotion: 'mirror' },
        smoothing: { min: 0, max: 1, default: 0.3, type: 'float', audioMotion: 'smoothing' },
        colormode: { values: ['spectrum', 'rainbow', 'fire', 'ocean', 'neon'], default: 'spectrum', type: 'enum', audioMotion: 'colorMode' },
        fadepeaks: { min: 0, max: 1, default: 0.5, type: 'float', audioMotion: 'fadePeaks' },
        showpeaks: { default: true, type: 'boolean', audioMotion: 'showPeaks' },
        peakdecay: { min: 0, max: 1, default: 0.7, type: 'float', audioMotion: 'peakFadeTime' }
    },
    
    // Radial Scope Parameters  
    radial: {
        gradient: { min: 0, max: 1, default: 0.5, type: 'float', audioMotion: 'gradient' },
        peakShowTime: { min: 0, max: 2000, default: 500, type: 'int', audioMotion: 'peakHoldTime' },
        radialSensitivity: { min: 0.1, max: 3.0, default: 1.0, type: 'float', audioMotion: 'linearBoost' },
        radialSmoothing: { min: 0, max: 1, default: 0.4, type: 'float', audioMotion: 'smoothing' },
        centerGlow: { min: 0, max: 1, default: 0.3, type: 'float', audioMotion: 'reflexAlpha' },
        outerGlow: { min: 0, max: 1, default: 0.6, type: 'float', audioMotion: 'reflexBright' },
        radialinvert: { default: false, type: 'boolean', audioMotion: 'radialInvert' },
        radius: { min: 50, max: 300, default: 150, type: 'int', audioMotion: 'radius' },
        colormode: { values: ['spectrum', 'rainbow', 'fire', 'ocean', 'neon'], default: 'spectrum', type: 'enum', audioMotion: 'colorMode' },
        fadepeaks: { min: 0, max: 1, default: 0.5, type: 'float', audioMotion: 'fadePeaks' },
        showpeaks: { default: true, type: 'boolean', audioMotion: 'showPeaks' },
        peakdecay: { min: 0, max: 1, default: 0.7, type: 'float', audioMotion: 'peakFadeTime' },
        smoothing: { min: 0, max: 1, default: 0.3, type: 'float', audioMotion: 'smoothing' }
    },
    
    // Energy Scope Parameters
    energy: {
        gradient: { min: 0, max: 1, default: 0.5, type: 'float', audioMotion: 'gradient' },
        peakShowTime: { min: 0, max: 2000, default: 500, type: 'int', audioMotion: 'peakHoldTime' },
        energySensitivity: { min: 0.1, max: 3.0, default: 1.0, type: 'float', audioMotion: 'linearBoost' },
        energySmoothing: { min: 0, max: 1, default: 0.5, type: 'float', audioMotion: 'smoothing' },
        particleCount: { min: 10, max: 200, default: 50, type: 'int', audioMotion: 'fftSize' },
        particleSpeed: { min: 0.1, max: 2.0, default: 1.0, type: 'float', audioMotion: 'gravity' },
        colormode: { values: ['spectrum', 'rainbow', 'fire', 'ocean', 'neon'], default: 'spectrum', type: 'enum', audioMotion: 'colorMode' },
        fadepeaks: { min: 0, max: 1, default: 0.5, type: 'float', audioMotion: 'fadePeaks' },
        showpeaks: { min: 0, max: 1, default: 0.7, type: 'float', audioMotion: 'showPeaks' },
        peakdecay: { min: 0, max: 1, default: 0.7, type: 'float', audioMotion: 'peakFadeTime' },
        smoothing: { min: 0, max: 1, default: 0.3, type: 'float', audioMotion: 'smoothing' }
    },
    
    // Global Parameters (affect all scopes)
    global: {
        backgroundColor: { type: 'color', default: '#000000', audioMotion: 'showBgColor' },
        colorScheme: { values: ['default', 'neon', 'fire', 'ocean', 'sunset'], default: 'default', type: 'enum', audioMotion: 'gradient' },
        brightness: { min: 0.1, max: 2.0, default: 1.0, type: 'float', audioMotion: 'linearBoost' },
        contrast: { min: 0.1, max: 2.0, default: 1.0, type: 'float', audioMotion: 'maxDecibels' },
        saturation: { min: 0, max: 2.0, default: 1.0, type: 'float', audioMotion: 'fillAlpha' }
    }
};

// Enhanced Genre Mappings with 7 New Genres
const GENRE_MAPPINGS = {
    // Heavy Metal
    'heavy-metal': {
        visualization: {
            bars: { gradient: 0.8, peakShowTime: 200, barWidth: 12, smoothing: 0.1, colormode: 'fire', fadepeaks: 0.2, showpeaks: true, peakdecay: 0.3 },
            radial: { gradient: 0.9, radialSensitivity: 2.5, centerGlow: 0.8, radialinvert: false, radius: 200, colormode: 'fire', fadepeaks: 0.1, showpeaks: true, peakdecay: 0.2 },
            energy: { energySensitivity: 2.8, particleCount: 150, particleSpeed: 1.8, colormode: 'fire', fadepeaks: 0.1, showpeaks: 0.9, peakdecay: 0.2, smoothing: 0.1 },
            global: { colorScheme: 'fire', brightness: 1.3, contrast: 1.4, saturation: 1.2 }
        },
        video: {
            colorEffects: { grayscale: 0.3, invert: 0.2, contrast: 1.5, brightness: 0.8 },
            artisticEffects: { posterize: 0.6, edgeDetection: 0.4 },
            blendModes: { multiply: 0.3, overlay: 0.2 }
        },
        audioCharacteristics: { energy: 'high', tempo: 'fast', frequency: 'bass-heavy', dynamics: 'aggressive' }
    },
    
    // Rock
    'rock': {
        visualization: {
            bars: { gradient: 0.7, peakShowTime: 300, barWidth: 10, smoothing: 0.2, colormode: 'fire', fadepeaks: 0.3, showpeaks: true, peakdecay: 0.4 },
            radial: { gradient: 0.8, radialSensitivity: 2.0, centerGlow: 0.7, radialinvert: false, radius: 180, colormode: 'fire', fadepeaks: 0.2, showpeaks: true, peakdecay: 0.3 },
            energy: { energySensitivity: 2.2, particleCount: 120, particleSpeed: 1.5, colormode: 'fire', fadepeaks: 0.2, showpeaks: 0.8, peakdecay: 0.3, smoothing: 0.2 },
            global: { colorScheme: 'fire', brightness: 1.2, contrast: 1.3, saturation: 1.1 }
        },
        video: {
            colorEffects: { grayscale: 0.2, invert: 0.1, contrast: 1.3, brightness: 0.9 },
            artisticEffects: { posterize: 0.4, edgeDetection: 0.3 },
            blendModes: { multiply: 0.2, overlay: 0.1 }
        },
        audioCharacteristics: { energy: 'high', tempo: 'medium-fast', frequency: 'balanced', dynamics: 'energetic' }
    },
    
    // Electronic/Dance
    'electronic': {
        visualization: {
            bars: { gradient: 0.6, peakShowTime: 100, barWidth: 6, smoothing: 0.8, colormode: 'neon', fadepeaks: 0.1, showpeaks: true, peakdecay: 0.1 },
            radial: { gradient: 0.7, radialSensitivity: 1.8, centerGlow: 0.9, radialinvert: true, radius: 160, colormode: 'neon', fadepeaks: 0.05, showpeaks: true, peakdecay: 0.1 },
            energy: { energySensitivity: 2.2, particleCount: 100, particleSpeed: 1.5, colormode: 'neon', fadepeaks: 0.05, showpeaks: 0.9, peakdecay: 0.1, smoothing: 0.8 },
            global: { colorScheme: 'neon', brightness: 1.5, contrast: 1.2, saturation: 1.4 }
        },
        video: {
            colorEffects: { hue: 60, saturation: 1.6, brightness: 1.3 },
            artisticEffects: { blur: 2, sharpen: 0.5 },
            blendModes: { screen: 0.4, overlay: 0.3 }
        },
        audioCharacteristics: { energy: 'very-high', tempo: 'very-fast', frequency: 'treble-heavy', dynamics: 'pulsing' }
    },
    
    // Reggae
    'reggae': {
        visualization: {
            bars: { gradient: 0.4, peakShowTime: 600, barWidth: 8, smoothing: 0.6, colormode: 'ocean', fadepeaks: 0.6, showpeaks: true, peakdecay: 0.8 },
            radial: { gradient: 0.5, radialSensitivity: 1.2, centerGlow: 0.4, radialinvert: false, radius: 140, colormode: 'ocean', fadepeaks: 0.5, showpeaks: true, peakdecay: 0.7 },
            energy: { energySensitivity: 1.5, particleCount: 60, particleSpeed: 0.8, colormode: 'ocean', fadepeaks: 0.5, showpeaks: 0.6, peakdecay: 0.8, smoothing: 0.6 },
            global: { colorScheme: 'ocean', brightness: 1.0, contrast: 1.0, saturation: 1.1 }
        },
        video: {
            colorEffects: { hue: 120, saturation: 1.2, brightness: 1.0 },
            artisticEffects: { blur: 1, emboss: 0.2 },
            blendModes: { overlay: 0.1 }
        },
        audioCharacteristics: { energy: 'medium', tempo: 'slow-medium', frequency: 'bass-heavy', dynamics: 'relaxed' }
    },
    
    // Country
    'country': {
        visualization: {
            bars: { gradient: 0.3, peakShowTime: 800, barWidth: 6, smoothing: 0.7, colormode: 'sunset', fadepeaks: 0.7, showpeaks: true, peakdecay: 0.9 },
            radial: { gradient: 0.4, radialSensitivity: 1.0, centerGlow: 0.3, radialinvert: false, radius: 120, colormode: 'sunset', fadepeaks: 0.6, showpeaks: true, peakdecay: 0.8 },
            energy: { energySensitivity: 1.2, particleCount: 40, particleSpeed: 0.6, colormode: 'sunset', fadepeaks: 0.6, showpeaks: 0.5, peakdecay: 0.9, smoothing: 0.7 },
            global: { colorScheme: 'sunset', brightness: 0.9, contrast: 0.9, saturation: 0.8 }
        },
        video: {
            colorEffects: { sepia: 0.3, saturation: 0.9, brightness: 0.9 },
            artisticEffects: { blur: 0.5, emboss: 0.1 },
            blendModes: { multiply: 0.1 }
        },
        audioCharacteristics: { energy: 'low-medium', tempo: 'slow-medium', frequency: 'mid-heavy', dynamics: 'gentle' }
    },
    
    // Funk
    'funk': {
        visualization: {
            bars: { gradient: 0.6, peakShowTime: 150, barWidth: 9, smoothing: 0.4, colormode: 'rainbow', fadepeaks: 0.2, showpeaks: true, peakdecay: 0.3 },
            radial: { gradient: 0.7, radialSensitivity: 1.6, centerGlow: 0.6, radialinvert: true, radius: 170, colormode: 'rainbow', fadepeaks: 0.1, showpeaks: true, peakdecay: 0.2 },
            energy: { energySensitivity: 1.8, particleCount: 80, particleSpeed: 1.2, colormode: 'rainbow', fadepeaks: 0.1, showpeaks: 0.7, peakdecay: 0.3, smoothing: 0.4 },
            global: { colorScheme: 'neon', brightness: 1.1, contrast: 1.1, saturation: 1.3 }
        },
        video: {
            colorEffects: { hue: 180, saturation: 1.4, brightness: 1.1 },
            artisticEffects: { sharpen: 0.3, emboss: 0.2 },
            blendModes: { screen: 0.2, overlay: 0.1 }
        },
        audioCharacteristics: { energy: 'medium-high', tempo: 'medium', frequency: 'bass-heavy', dynamics: 'groovy' }
    },
    
    // Ambient
    'ambient': {
        visualization: {
            bars: { gradient: 0.2, peakShowTime: 1500, barWidth: 4, smoothing: 0.95, colormode: 'ocean', fadepeaks: 0.9, showpeaks: false, peakdecay: 0.95 },
            radial: { gradient: 0.1, radialSensitivity: 0.5, centerGlow: 0.1, radialinvert: false, radius: 100, colormode: 'ocean', fadepeaks: 0.8, showpeaks: false, peakdecay: 0.9 },
            energy: { energySensitivity: 0.8, particleCount: 20, particleSpeed: 0.3, colormode: 'ocean', fadepeaks: 0.8, showpeaks: 0.2, peakdecay: 0.95, smoothing: 0.95 },
            global: { colorScheme: 'ocean', brightness: 0.6, contrast: 0.7, saturation: 0.6 }
        },
        video: {
            colorEffects: { grayscale: 0.4, sepia: 0.2, brightness: 0.7 },
            artisticEffects: { blur: 3, emboss: 0.1 },
            blendModes: { multiply: 0.2 }
        },
        audioCharacteristics: { energy: 'very-low', tempo: 'very-slow', frequency: 'balanced', dynamics: 'ethereal' }
    },
    
    // Punk
    'punk': {
        visualization: {
            bars: { gradient: 0.9, peakShowTime: 100, barWidth: 14, smoothing: 0.05, colormode: 'fire', fadepeaks: 0.1, showpeaks: true, peakdecay: 0.1 },
            radial: { gradient: 0.95, radialSensitivity: 2.8, centerGlow: 0.9, radialinvert: true, radius: 220, colormode: 'fire', fadepeaks: 0.05, showpeaks: true, peakdecay: 0.1 },
            energy: { energySensitivity: 3.0, particleCount: 180, particleSpeed: 2.0, colormode: 'fire', fadepeaks: 0.05, showpeaks: 0.95, peakdecay: 0.1, smoothing: 0.05 },
            global: { colorScheme: 'fire', brightness: 1.4, contrast: 1.5, saturation: 1.3 }
        },
        video: {
            colorEffects: { grayscale: 0.4, invert: 0.3, contrast: 1.6, brightness: 0.7 },
            artisticEffects: { posterize: 0.8, edgeDetection: 0.6 },
            blendModes: { multiply: 0.4, overlay: 0.3 }
        },
        audioCharacteristics: { energy: 'very-high', tempo: 'very-fast', frequency: 'treble-heavy', dynamics: 'chaotic' }
    },
    
    // Jazz (existing)
    'jazz': {
        visualization: {
            bars: { gradient: 0.4, peakShowTime: 800, barWidth: 4, smoothing: 0.9, colormode: 'ocean', fadepeaks: 0.7, showpeaks: true, peakdecay: 0.8 },
            radial: { gradient: 0.3, radialSensitivity: 0.8, centerGlow: 0.2, radialinvert: false, radius: 110, colormode: 'ocean', fadepeaks: 0.6, showpeaks: true, peakdecay: 0.7 },
            energy: { energySensitivity: 0.9, particleCount: 30, particleSpeed: 0.6, colormode: 'ocean', fadepeaks: 0.6, showpeaks: 0.4, peakdecay: 0.8, smoothing: 0.9 },
            global: { colorScheme: 'ocean', brightness: 0.8, contrast: 0.9, saturation: 0.7 }
        },
        video: {
            colorEffects: { sepia: 0.4, saturation: 0.8, brightness: 0.9 },
            artisticEffects: { blur: 1, emboss: 0.3 },
            blendModes: { multiply: 0.2 }
        },
        audioCharacteristics: { energy: 'medium', tempo: 'variable', frequency: 'mid-heavy', dynamics: 'smooth' }
    },
    
    // Classical (existing)
    'classical': {
        visualization: {
            bars: { gradient: 0.2, peakShowTime: 1200, barWidth: 3, smoothing: 0.95, colormode: 'spectrum', fadepeaks: 0.8, showpeaks: true, peakdecay: 0.9 },
            radial: { gradient: 0.1, radialSensitivity: 0.6, centerGlow: 0.1, radialinvert: false, radius: 90, colormode: 'spectrum', fadepeaks: 0.7, showpeaks: true, peakdecay: 0.8 },
            energy: { energySensitivity: 0.7, particleCount: 20, particleSpeed: 0.4, colormode: 'spectrum', fadepeaks: 0.7, showpeaks: 0.3, peakdecay: 0.9, smoothing: 0.95 },
            global: { colorScheme: 'default', brightness: 0.7, contrast: 0.8, saturation: 0.6 }
        },
        video: {
            colorEffects: { grayscale: 0.2, sepia: 0.3, brightness: 0.8 },
            artisticEffects: { blur: 0.5, emboss: 0.2 },
            blendModes: { multiply: 0.1 }
        },
        audioCharacteristics: { energy: 'low-medium', tempo: 'slow-medium', frequency: 'balanced', dynamics: 'gentle' }
    }
};

// Predictive Behavior System for AI Autopilot
