
// Main.js v1762204100 - Kaleidoscope Plugin Integration FIXED - draws plugin canvases in applyKaleidoscopeEffect

// Plugin Canvas Bridge for Kaleidoscope Integration
// Makes plugin canvases available where kaleidoscope system expects them
let bridgedPlugins = new Set(); // Track which plugins have been bridged to avoid spam

function bridgePluginCanvasesToKaleidoscope() {
    if (!window.pluginManager || !window.visualizer) return;
    
    // Bridge all active plugins
    const allPlugins = window.pluginManager.getAllPlugins();
    allPlugins.forEach(plugin => {
        if (plugin.canvas && plugin.isActive) {
            // Create bridge for each plugin
            const pluginPropertyName = `${plugin.pluginName}Visualization`;
            if (!window.visualizer[pluginPropertyName]) {
                window.visualizer[pluginPropertyName] = {};
            }
            window.visualizer[pluginPropertyName].canvas = plugin.canvas;
            
            // Track bridged plugins
                bridgedPlugins.add(plugin.pluginName);
        }
    });
}

// Call bridge function periodically to ensure plugins are available
setInterval(bridgePluginCanvasesToKaleidoscope, 1000);

// ParameterController has been extracted to src/autopilot/ParameterController.js

// GenreDetector has been extracted to src/autopilot/GenreDetector.js


// HarmonicAnalyzer has been extracted to src/audio/HarmonicAnalyzer.js

// ****
// ****


// LiveDisplayManager has been extracted to src/streaming/LiveDisplayManager.js

// StreamManager has been extracted to src/streaming/StreamManager.js

// Freque Visualizer Class with Audio Input and Morph Support
class FrequeVisualizer {
    constructor() {
        this.audio = null;
        this.audioMotion = null;
        this.isPlaying = false;
        this.currentTrackIndex = 0;
        this.playlist = [];
        this.volume = 1.0;
        this.previousVolume = 1.0;
        this.isMuted = false;
        // Load currentMode from localStorage, default to 1 if not found
        const savedMode = localStorage.getItem('freque_am_currentMode');
        this.currentMode = savedMode !== null ? Math.max(0, Math.min(10, parseInt(savedMode))) : 1;
        this.loopMode = 'off';
        this.currentColorScheme = 'default';
        this.backgroundColor = '#000000';
        this.isFullscreen = false;
        this.savedPresets = this.loadPresets();
        this.audioInitialized = false;
        this.streamManager = null;
        this.pendingProPreset = null; // Queue Pro presets during morph

        // Audio input properties
        this.inputMode = 'playlist';
        this.audioStream = null;
        this.streamSource = null;
        this.availableDevices = [];
        
        // Audio monitoring properties
        this.audioMonitoringEnabled = false;
        this.monitorGainNode = null;
        
        // Load audio monitoring state from localStorage
        const savedMonitorState = localStorage.getItem('audioMonitoringEnabled');
        if (savedMonitorState !== null) {
            this.audioMonitoringEnabled = savedMonitorState === 'true';
        }


        // Video input properties
        this.videoInputMode = 'none';
        this.videoStream = null;
        this.currentVideoDeviceId = null;
        this.availableVideoDevices = [];

        // Live Audio Toggle properties
        this.liveAudioEnabled = false;
        this.lastAudioDeviceId = null;

        // Background Image properties
        this.backgroundImageEnabled = false;
        this.backgroundImage = null;
        this.backgroundImageOpacity = 100;
        this.backgroundImageSaturation = 100;
        this.backgroundImagePosterize = 16;
        this.backgroundImageContrast = 100;
        this.backgroundImageSize = 'original';

        // Viz ON/OFF Toggle
        this.visualizationEnabled = true;
        this.visualizationOpacity = 1.0; // AM Visualizer opacity (0.0-1.0)
        this.advancedVolumeAdjust = 0.0; // Default Advanced volume adjustment
        
        // Advanced Visualization Waiting State (Hybrid Approach)
        this.advancedWaitingState = {
            isActive: false,
            energyHistory: [],
            oscillators: null,
            gainNodes: null,
            masterGain: null,
            oscillator: null,  // Legacy single oscillator
            gainNode: null,    // Legacy single gain
            timer: 0
        };

        // Infinite Zoom properties
        this.infiniteZoomOpacity = 1.0; // Infinite Zoom opacity (0.0-1.0)

        // Morph properties
        this.isMorphing = false;
        this.morphInterval = null;
        this.morphStartConfig = null;
        this.morphTargetConfig = null;
        this.morphProgress = 0;
        this.morphDuration = 5000;
        this.morphMode = 'energy';
        
        // Color morph manager (initialized after audioMotion is ready)
        this.colorMorphManager = null;
        this.proColorMorphManager = null;

        // Auto-hide fullscreen controls
        this.controlsTimeout = null;
        this.controlsVisible = true;

        // Energy detection
        this.currentEnergy = 0;
        this.lastEnergy = 0;
        this.energyHistory = [];
        this.energyCheckInterval = null;

        // Video background properties
        this.videoMode = 'off'; // 'off', 'camera', 'file'
        this.videoStream = null;
        this.videoElement = null;
        this.availableVideoDevices = [];
        this.videoOpacity = 1.0;
        this.videoFadeTime = 3; // seconds
        this.videoFadeTimeout = null;
        this.currentVideoDeviceId = null;
        
        // Video file properties
        this.videoFile = null;
        this.videoFileLoopMode = 'one'; // 'off', 'one', 'all'
        this.videoFileMuted = true;
        this.videoFileSize = 'fit'; // 'fit', 'fill', 'stretch', 'original'
        this.videoAudioSource = null;
        this.videoAudioGain = null;
        this.matchVisualizationAspect = true; // Match visualization to video aspect ratio

        // Kaleidoscope properties
        this.kaleidoscopeEnabled = false;
        this.kaleidoscopeSegments = 6;
        this.kaleidoscopeRotation = 0;
        this.kaleidoscopeSpeed = 0;
        this.kaleidoscopeScale = 1.0;
        this.kaleidoscopeCenterX = 0.5;
        this.kaleidoscopeCenterY = 0.5;
        this.kaleidoscopeApplyToVideo = false;
        this.kaleidoscopeApplyToViz = false; // Default to OFF
        this.kaleidoscopeApplyToInfiniteZoom = false; // Default to disabled
        this.kaleidoscopeApplyToWebGL = false; // Default to disabled
        this.kaleidoscopeApplyToFluidDynamics = false; // Default to disabled
        this.kaleidoscopeApplyToNebula = false; // Default to disabled
        
        // Blobs properties
        this.blobsEnabled = false;
        this.blobsVisualization = null;
        this.blobsOpacity = 1.0; // Blobs opacity (0.0-1.0)
        
        // WebGL properties
        this.webglEnabled = false;
        this.webglVisualization = null;
        
        // Center animation variables
        this.kaleidoscopeCenterAnimate = false;
        this.kaleidoscopeCenterAnimMode = 'float'; // 'float' or 'circle'
        this.kaleidoscopeCenterAnimSpeed = 25; // -100 to 100
        this.kaleidoscopeCenterAnimTime = 0;
        this.kaleidoscopeCenterAnimRadius = 0.3; // 60% of viewport
        this.kaleidoscopeRings = 1; // Number of rings

        // Background image properties
        this.backgroundImage = null;
        this.backgroundImageEnabled = false; // Default to OFF
        this.backgroundImageOpacity = 100;
        this.backgroundImageSaturation = 100;
        this.backgroundImagePosterize = 16; // Default to no posterization
        this.backgroundImageContrast = 100; // Default to normal contrast
        this.backgroundImageSize = 'original'; // Default sizing: 'fit', 'fill', 'stretch', 'original'
        this.backgroundImageFileName = '';
        this.backgroundImageFileSize = 0;
        this.cachedBackgroundImage = null; // Cached image for synchronous drawing
        this.backgroundImageElement = null; // DOM element for background image layer
        this.kaleidoscopeRingSpacing = 0.2; // Spacing between rings (as percentage)
        this.kaleidoscopeShape = 'triangle'; // 'triangle', 'petal', 'rectangle'
        this.kaleidoscopeRingSpeedMultiplier = 0.5; // How much each ring's speed differs
        this.kaleidoscopeRingRotations = [
            0,
            0,
            0,
            0,
            0
        ]; // Track individual ring rotations
        this.kaleidoscopeBaseScale = 1; // Add this if not already there
        this.kaleidoscopeBeatRotation = false;
        this.kaleidoscopeBeatShape = false;
        this.kaleidoscopeShapeThreshold = 0.7; // Energy threshold for shape change
        this.kaleidoscopeOriginalShape = 'triangle';


        // Separate canvases for video and viz
        this.kaleidoscopeVideoCanvas = null;
        this.kaleidoscopeVideoCtx = null;
        this.kaleidoscopeVizCanvas = null;
        this.kaleidoscopeVizCtx = null;

        this.kaleidoscopeAnimationFrame = null;

        // REact to audio inout
        this.kaleidoscopeBeatReactive = false;
        this.kaleidoscopeBeatSensitivity = 0.5;
        this.kaleidoscopeBaseScale = 1;
        this.kaleidoscopeBaseSegments = 6;

        this.kaleidoscopePresets = [
            {
                name: 'Classic',
                segments: 6,
                rings: 1,
                shape: 'triangle',
                scale: 100,
                speed: 0,
                ringSpacing: 20
            },
            {
                name: 'Flower',
                segments: 8,
                rings: 3,
                shape: 'petal',
                scale: 120,
                speed: 2,
                ringSpacing: 15
            },
            {
                name: 'Crystal',
                segments: 12,
                rings: 2,
                shape: 'triangle',
                scale: 100,
                speed: 1,
                ringSpacing: 25
            },
            {
                name: 'Mandala',
                segments: 16,
                rings: 4,
                shape: 'petal',
                scale: 150,
                speed: 0.5,
                ringSpacing: 10
            }, {
                name: 'Star',
                segments: 5,
                rings: 2,
                shape: 'triangle',
                scale: 110,
                speed: 3,
                ringSpacing: 30
            }
        ];


        // Enhanced video properties
        this.videoBrightness = 100;
        this.videoContrast = 100;
        this.videoHueRotate = 0;
        this.videoGrayscale = 0;
        this.videoSepia = 0;
        this.videoBlur = 0;
        this.videoSaturation = 100;
        this.videoPosterize = 16;
        this.videoVignette = 0;
        this.videoInvert = false;
        this.videoMirror = 'off'; // 'off', 'horizontal', 'vertical', 'both'
        this.videoPulse = false;
        this.vignetteElement = null;
        this.videoPulseRate = 2.0;
        // seconds for one complete pulse cycle

        // Hybrid Visualization Manager
        this.hybridVisualizationManager = null;
        this.useOfficialAudioMotion = false; // Flag to switch between custom and official

        // AudioMotion-style visualization modes
        this.visualizationModes = [
            // 0 - Spectrum
            {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0, // No spacing between bars for solid look
                bgAlpha: 0.7,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 1,
                frequencyScale: 'log',
                gradient: 'classic', // Orange-yellow-green gradient
                gravity: 3.8,
                ledBars: false,
                linearAmplitude: true,
                linearBoost: 1.5,
                lineWidth: 0,
                loRes: false,
                lumiBars: false,
                maxDecibels: -25,
                maxFPS: 0,
                maxFreq: 22000,
                minDecibels: -85,
                minFreq: 20,
                mirror: 0,
                mode: 0, // This tells it to use maximum frequency bins
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 750, // As requested
                peakHoldTime: 500, // As requested
                peakLine: false, // As requested
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0.15,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0,
                roundBars: false,
                showBgColor: false, // Transparent background
                showFPS: false,
                showPeaks: true, // As requested
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.7, // Increased for smoother animation
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            },
            // 1 - Mirror Wave
            {
                alphaBars: false,
                ansiBands: true,
                barSpace: 0.4243301972800962,
                bgAlpha: 0.0,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.7409580781999876,
                frequencyScale: 'linear',
                gradient: 'prism',
                gravity: 5.241110765118057,
                ledBars: false,
                lineWidth: 1.9277868849548745,
                linearAmplitude: false,
                linearBoost: 1.0031368643495397,
                loRes: false,
                lumiBars: false,
                maxDecibels: -40,
                maxFPS: 0,
                maxFreq: 20000,
                minDecibels: -110.00902526586772,
                minFreq: 28.17293591192646,
                mirror: 1,
                mode: 0,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 594.7913467712076,
                peakHoldTime: 502.3206017658375,
                peakLine: false,
                radial: false,
                radialInvert: true,
                radius: 0.41579158468294086,
                reflexAlpha: 0.9552641490887127,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0.01,
                roundBars: true,
                showBgColor: false,
                showFPS: false,
                showPeaks: true,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.3269721028259904,
                spinSpeed: 0.5612575550887594,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 0.7515247792883378,
                weightingFilter: 'D'
            },
            // 2 - Classic LED
            {
                alphaBars: false,
                ansiBands: true,
                barSpace: 0.5,
                bgAlpha: 0.7,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 1,
                frequencyScale: 'log',
                gradient: 'classic',
                gravity: 3.8,
                ledBars: true,
                linearAmplitude: false,
                linearBoost: 1,
                lineWidth: 0,
                loRes: false,
                lumiBars: false,
                maxDecibels: -25,
                maxFPS: 0,
                maxFreq: 20000,
                minDecibels: -85,
                minFreq: 25,
                mirror: 0,
                mode: 6,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0.15,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0,
                roundBars: false,
                showBgColor: false, // Transparent background
                showFPS: false,
                showPeaks: true,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.5,
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: true,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            },
            // 3 - Stereo
            {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0.1,
                bgAlpha: 0.7,
                channelLayout: 'dual-horizontal',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.8,
                frequencyScale: 'log',
                gradient: 'rainbow',
                gravity: 3.8,
                ledBars: false,
                linearAmplitude: false,
                linearBoost: 1.8,
                lineWidth: 2,
                loRes: false,
                lumiBars: false,
                maxDecibels: -35,
                maxFPS: 0,
                maxFreq: 16000,
                minDecibels: -85,
                minFreq: 20,
                mirror: 1,
                mode: 2,
                noteLabels: false,
                outlineBars: true,
                overlay: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0.5,
                reflexBright: 2,
                reflexFit: true,
                reflexRatio: 0.5,
                roundBars: true,
                showBgColor: false, // Transparent background
                showFPS: false,
                showPeaks: true,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.7,
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            },
            // 4 - Radial Spectrum
            {
                alphaBars: false,
                ansiBands: true,
                barSpace: 0.4243301972800962,
                bgAlpha: 0.0,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 1.0,
                frequencyScale: 'linear',
                gradient: 'prism',
                gravity: 5.241110765118057,
                ledBars: false,
                lineWidth: 4.0,
                linearAmplitude: true,
                linearBoost: 1.8,
                loRes: false,
                lumiBars: false,
                maxDecibels: -22.957439488374686,
                maxFPS: 0,
                maxFreq: 17748.142603118187,
                minDecibels: -95.00902526586772,
                minFreq: 28.17293591192646,
                mirror: 0,
                mode: 0,
                noteLabels: false,
                outlineBars: true,
                overlay: false,
                peakFadeTime: 594.7913467712076,
                peakHoldTime: 502.3206017658375,
                peakLine: false,
                radial: true,
                radialInvert: false,
                radius: 1.2,
                reflexAlpha: 0.9552641490887127,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0.0827583789810725,
                roundBars: true,
                showBgColor: false,
                showFPS: false,
                showPeaks: true,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.3269721028259904,
                spinSpeed: 0.5612575550887594,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1.0,
                weightingFilter: 'D'
            },
            // 5 - Energy
            {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0.1,
                bgAlpha: 0.0,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.7,
                frequencyScale: 'log',
                gradient: 'steelblue',
                gravity: 3.8,
                ledBars: false,
                linearAmplitude: false,
                linearBoost: 1,
                lineWidth: 3,
                loRes: false,
                lumiBars: false,
                maxDecibels: -25,
                maxFPS: 0,
                maxFreq: 16000,
                minDecibels: -85,
                minFreq: 30,
                mirror: -1,
                mode: 10,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0.5,
                roundBars: false,
                showBgColor: false, // Transparent background
                showFPS: false,
                showPeaks: false,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.5,
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            },
            // 6 - Mirror (Center-split Stereo)
            {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0.2,
                bgAlpha: 0.7,
                channelLayout: 'dual-vertical',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.9,
                frequencyScale: 'log',
                gradient: 'orangered',
                gravity: 3.8,
                ledBars: false,
                linearAmplitude: false,
                linearBoost: 1,
                lineWidth: 0,
                loRes: false,
                lumiBars: false,
                maxDecibels: -25,
                maxFPS: 0,
                maxFreq: 20000,
                minDecibels: -85,
                minFreq: 20,
                mirror: 0,
                mode: 1,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0.4,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0.01,
                roundBars: false,
                showBgColor: false, // Transparent background
                showFPS: false,
                showPeaks: false,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.5,
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            },
            // 7 - Fluid (Smooth waveform visualization)
            {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0.1,
                bgAlpha: 0.7,
                channelLayout: 'single',
                colorMode: 'bar-level',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.6,
                frequencyScale: 'log',
                gradient: 'rainbow',
                gravity: 3.8,
                ledBars: false,
                linearAmplitude: true,
                linearBoost: 2.8,
                lineWidth: 1.5,
                loRes: false,
                lumiBars: false,
                maxDecibels: -35,
                maxFPS: 0,
                maxFreq: 20000,
                minDecibels: -85,
                minFreq: 30,
                mirror: -1,
                mode: 10,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 1,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0.5,
                roundBars: true,
                showBgColor: false, // Transparent background
                showFPS: false,
                showPeaks: false,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.7,
                spinSpeed: 1,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1,
                weightingFilter: 'D'
            }
        ];

        // Official AudioMotion Presets (using official library)
        this.officialAudioMotionPresets = [
            // 0 - Fluid (using official audioMotion)
            {
                name: 'Fluid',
                useOfficial: true,
                config: {
                    alphaBars: false,
                    ansiBands: false,
                    barSpace: 0.1,
                    bgAlpha: 0,
                    channelLayout: "single",
                    colorMode: 'bar-level',
                    fadePeaks: false,
                    fftSize: 8192,
                    fillAlpha: 0.9,
                    frequencyScale: "log",
                    gradient: 'rainbow',
                    gravity: 3.8,
                    ledBars: false,
                    linearAmplitude: true,
                    linearBoost: 2.8,
                    lineWidth: 1.5,
                    loRes: false,
                    lumiBars: false,
                    maxDecibels: -25,
                    maxFPS: 0,
                    maxFreq: 20000,
                    minDecibels: -85,
                    minFreq: 30,
                    mirror: -1,
                    mode: 10,
                    noteLabels: false,
                    outlineBars: false,
                    overlay: false,
                    peakFadeTime: 750,
                    peakHoldTime: 500,
                    peakLine: false,
                    radial: false,
                    radialInvert: false,
                    radius: 0.3,
                    reflexAlpha: 1,
                    reflexBright: 1,
                    reflexFit: true,
                    reflexRatio: 0.5,
                    roundBars: false,
                    showBgColor: false,
                    showFPS: false,
                    showPeaks: false,
                    showScaleX: false,
                    showScaleY: false,
                    smoothing: 0.7,
                    spinSpeed: 1,
                    splitGradient: false,
                    trueLeds: false,
                    useCanvas: true,
                    volume: 0.0,
                    weightingFilter: 'D'
                }
            },
            // 1 - Prism (using official audioMotion)
            {
                name: 'Prism',
                useOfficial: true,
                config: {
                    alphaBars: false,
                    ansiBands: false,
                    barSpace: 0.1,
                    bgAlpha: 0,
                    channelLayout: "single",
                    colorMode: 'bar-level',
                    fadePeaks: false,
                    fftSize: 8192,
                    fillAlpha: 0.8,
                    frequencyScale: "log",
                    gradient: 'prism',
                    gravity: 3.8,
                    ledBars: false,
                    linearAmplitude: true,
                    linearBoost: 2.0,
                    lineWidth: 1.5,
                    loRes: false,
                    lumiBars: false,
                    maxDecibels: -25,
                    maxFPS: 0,
                    maxFreq: 22000,
                    minDecibels: -85,
                    minFreq: 30,
                    mirror: 0,
                    mode: 0,
                    noteLabels: false,
                    outlineBars: false,
                    overlay: true,
                    peakFadeTime: 750,
                    peakHoldTime: 300,
                    peakLine: false,
                    radial: false,
                    radialInvert: false,
                    radius: 0.3,
                    reflexAlpha: 1,
                    reflexBright: 1,
                    reflexFit: true,
                    reflexRatio: 0.5,
                    roundBars: true,
                    showBgColor: false,
                    showFPS: false,
                    showPeaks: true,
                    showScaleX: false,
                    showScaleY: false,
                    smoothing: 0.7,
                    spinSpeed: 0,
                    splitGradient: false,
                    trueLeds: false,
                    useCanvas: true,
                    volume: 0.0,
                    weightingFilter: 'D'
                }
            },
            // 2 - Twin Peaks (using official audioMotion)
            {
                name: 'Twin Peaks',
                useOfficial: true,
                config: {
                    alphaBars: false,
                    ansiBands: false,
                    barSpace: 0.25,
                    bgAlpha: 0.7,
                    channelLayout: "dual-combined",
                    colorMode: "bar-level",
                    fadePeaks: false,
                    fftSize: 8192,
                    fillAlpha: 0.25,
                    frequencyScale: "bark",
                    gradientLeft: "steelblue",
                    gradientRight: "orangered",
                    gravity: 3.8,
                    ledBars: false,
                    linearAmplitude: true,
                    linearBoost: 1.8,
                    lineWidth: 1.5,
                    loRes: false,
                    lumiBars: false,
                    maxDecibels: -25,
                    maxFPS: 0,
                    maxFreq: 20000,
                    minDecibels: -85,
                    minFreq: 20,
                    mirror: 0,
                    mode: 10,
                    noteLabels: false,
                    outlineBars: false,
                    overlay: false,
                    peakFadeTime: 750,
                    peakHoldTime: 500,
                    peakLine: false,
                    radial: false,
                    radialInvert: false,
                    radius: 0.3,
                    reflexAlpha: 1,
                    reflexBright: 1,
                    reflexFit: true,
                    reflexRatio: 0,
                    roundBars: true,
                    showBgColor: true,
                    showFPS: false,
                    showPeaks: false,
                    showScaleX: false,
                    showScaleY: false,
                    smoothing: 0.7,
                    spinSpeed: 0,
                    splitGradient: false,
                    trueLeds: false,
                    useCanvas: true,
                    volume: 0.0,
                    weightingFilter: "D"
                }
            },
            // 3 - Circus (using official audioMotion)
            {
                name: 'Circus',
                useOfficial: true,
                config: {
                    alphaBars: false,
                    ansiBands: false,
                    barSpace: 0.1,
                    bgAlpha: 0,
                    channelLayout: "dual-horizontal",
                    colorMode: "bar-level",
                    fadePeaks: false,
                    fftSize: 8192,
                    fillAlpha: 1,
                    frequencyScale: "bark",
                    gradient: "prism",
                    gravity: 4.3,
                    ledBars: false,
                    linearAmplitude: false,
                    linearBoost: 4,
                    lineWidth: 3,
                    loRes: false,
                    lumiBars: false,
                    maxDecibels: -20,
                    maxFPS: 0,
                    maxFreq: 20000,
                    minDecibels: -100,
                    minFreq: 20,
                    mirror: 0,
                    mode: 7,
                    noteLabels: false,
                    outlineBars: false,
                    overlay: true,
                    peakFadeTime: 1650,
                    peakHoldTime: 500,
                    peakLine: false,
                    radial: true,
                    radialInvert: false,
                    radius: 0.05,
                    reflexAlpha: 1,
                    reflexBright: 1,
                    reflexFit: true,
                    reflexRatio: 0,
                    roundBars: true,
                    showBgColor: false,
                    showFPS: false,
                    showPeaks: true,
                    showScaleX: false,
                    showScaleY: false,
                    smoothing: 0.6,
                    spinSpeed: 5,
                    splitGradient: false,
                    trueLeds: false,
                    useCanvas: true,
                    volume: 0.0,
                    weightingFilter: "D"
                }
            }
        ];

        this.init();
    }

    async init() {
        try {
            // Set initial loading state
            const playBtn = document.getElementById('playBtn');
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.style.opacity = '0.5';
            }
            
            // Set track title to loading message
            const trackTitle = document.getElementById('trackTitle');
            if (trackTitle) {
                trackTitle.textContent = 'Tracks Loading...';
            }
            
            this.setupEventListeners();
            this.setupFloatingPanelResizeHandler();
            this.loadPlaylist();

            this.loadBackgroundColor();
            this.updatePresetSelector();
            
            // Load fluid presets after all methods are available
            setTimeout(() => {
                if (this.loadFluidPresets) {
                    this.savedFluidPresets = this.loadFluidPresets();
                    this.updateFluidPresetSelector();
                }
            }, 100);

            await this.initAudioMotion();
            
            // If saved mode is a Pro preset (7-10), load it
            if (this.currentMode >= 7 && this.currentMode <= 10) {
                const proPresetIndex = this.currentMode - 7;
                if (this.officialAudioMotionPresets && this.officialAudioMotionPresets[proPresetIndex]) {
                    // Small delay to ensure officialAudioMotion is ready
                    setTimeout(() => {
                        this.setOfficialAudioMotionPreset(proPresetIndex);
                    }, 100);
                }
            }

            this.streamManager = new StreamManager(this);
            this.recordManager = new RecordManager(this);
            
            // Load saved video input mode and restore playlist video if applicable
            setTimeout(() => {
                const savedMode = this.loadVideoInputMode();
                if (savedMode === 'file' && this.videoPlaylistManager) {
                    // Video playlist manager will auto-load and play saved video
                    // This is handled in VideoPlaylistManager constructor
                }
            }, 500);
            
            // Update codec compatibility indicator now that RecordManager is ready
            setTimeout(() => {
                if (typeof this.updateCodecCompatibility === 'function') {
                    this.updateCodecCompatibility();
                }
            }, 200);
            
            // Phase 1: Test LiveDisplayManager
            this.liveDisplayManager = new LiveDisplayManager(this, 'test');
            
            // Test Phase 1 functionality
            testLiveDisplayManager();
            this.playlistManager = new PlaylistManager(this);
            // Initialize VideoPlaylistManager early so it's available immediately
            if (window.VideoPlaylistManager) {
                this.videoPlaylistManager = new VideoPlaylistManager(this);
            }
            this.aiAutopilot = new AIAutopilot(this);
            this.infiniteZoom = new InfiniteZoomVisualization(this);
            this.fluidDynamics = new FluidDynamicsVisualization(this);
            // Blobs is now a plugin and auto-instantiates itself
            this.blobsVisualization = null; // Will be set by plugin when it loads
            this.webglVisualization = new WebGLVisualizationManager(this);
            
            // Initialize Fluid Dynamics Presets
            this.savedFluidPresets = [];
            
            // Initialize WebGL visualization immediately
            if (this.webglVisualization) {
                this.webglVisualization.initialize();
                
                // Setup WebGL controls AFTER visualization is initialized
                this.setupWebGLControls();
            }
            
            // Initialize playlist UI handlers
            this.initializePlaylistUI();

            this.setBackgroundColor(this.backgroundColor);

            await this.initializeAudioInput();

            await this.initializeFirstTrack();
            this.hideLoading();
        } catch (error) {
            this.showError('Failed to initialize audio visualizer: ' + error.message);
            
            // Show error state
            const trackTitle = document.getElementById('trackTitle');
            if (trackTitle) {
                trackTitle.textContent = 'Initialization failed';
            }
            const playBtn = document.getElementById('playBtn');
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.style.opacity = '0.5';
            }
        }
    }

    async initializeFirstTrack() {
        // Add a small delay to ensure blob URLs are fully accessible
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (this.playlist.length === 0) {
            // No tracks in playlist to initialize
            
            // No tracks available - show appropriate message
            const trackTitle = document.getElementById('trackTitle');
            if (trackTitle) {
                trackTitle.textContent = 'No tracks available';
            }
            
            // Keep play button disabled with 50% opacity
            const playBtn = document.getElementById('playBtn');
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.style.opacity = '0.5';
            }
            return;
        }
        
        // Don't try to initialize immediately - wait for playlist manager to provide valid URLs
        // The tryInitializeFirstTrack() method will be called when tracks become available
        this.audioInitialized = false;
    }

    async tryInitializeFirstTrack() {
        // Only try if we haven't initialized yet and have tracks with valid URLs
        if (this.audioInitialized !== false || this.playlist.length === 0) {
            return;
        }
        
        // Check if we have at least one track with a valid URL
        const validTracks = this.playlist.filter(track => 
            track.url && (track.url.startsWith('blob:') || track.url.startsWith('http'))
        );
        
        if (validTracks.length === 0) {
            // No valid track URLs yet, waiting...
            return;
        }
        
        // Found valid tracks, initializing first track...
        
        // Add a small delay to ensure blob URLs are fully ready
        await new Promise(resolve => setTimeout(resolve, 50));
        
        try {
            // Find the first track with a valid URL
            const firstValidTrackIndex = this.playlist.findIndex(track => 
                track.url && (track.url.startsWith('blob:') || track.url.startsWith('http'))
            );
            
            if (firstValidTrackIndex === -1) {
                // No valid tracks found
                return;
            }
            
            await this.preloadTrack(firstValidTrackIndex);
        this.audioInitialized = true;
            
            // Update current track index to match the loaded track
            this.currentTrackIndex = firstValidTrackIndex;
            
            // Enable play button after successful audio initialization
            const playBtn = document.getElementById('playBtn');
            if (playBtn) {
                playBtn.disabled = false;
                playBtn.style.opacity = '1.0';
                // Play button enabled after track URLs became available
            }
        } catch (error) {
            console.error('Failed to initialize first track:', error);
            
            // Keep play button disabled on error
            const playBtn = document.getElementById('playBtn');
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.style.opacity = '0.5';
            }
            const trackTitle = document.getElementById('trackTitle');
            if (trackTitle) {
                trackTitle.textContent = 'Failed to load initial track';
            }
        }
    }

    async waitForValidTrackURLs() {
        const maxWaitTime = 15000; // Maximum 15 seconds
        const checkInterval = 500; // Check every 500ms
        let elapsed = 0;
        
        
        while (elapsed < maxWaitTime) {
            // Check if we have at least one track with a valid URL
            const validTracks = this.playlist.filter(track => 
                track.url && (track.url.startsWith('blob:') || track.url.startsWith('http'))
            );
            
            if (validTracks.length > 0) {
                return;
            }
            
            // Update track title to show waiting status
            const trackTitle = document.getElementById('trackTitle');
            if (trackTitle) {
                const dots = '.'.repeat((elapsed / 500) % 4);
                trackTitle.textContent = `Scanning tracks${dots}`;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
        }
        
        console.warn('⚠️ Timeout waiting for valid track URLs');
        const trackTitle = document.getElementById('trackTitle');
        if (trackTitle) {
            trackTitle.textContent = 'No playable tracks found';
        }
    }

    async initAudioMotion() {
        try {
            // Initialize custom SpectrumAnalyzer (existing system)
            this.audioMotion = new SpectrumAnalyzer(document.getElementById('visualizer'), this.visualizationModes[this.currentMode]);

            // Initialize official AudioMotion (new hybrid system)
            if (typeof AudioMotionAnalyzer !== 'undefined') {
                try {
                    // Use the same audio context AND canvas as the custom analyzer
                    const sharedAudioContext = this.audioMotion.audioCtx;
                    const sharedCanvas = this.audioMotion.canvas;
                    
                    this.officialAudioMotion = new AudioMotionAnalyzer(
                        null, // No container - we're providing the canvas directly
                        {
                            mode: 10,
                            colorMode: 'bar-level',
                            gradient: 'rainbow',
                            showBgColor: false, // No background color
                            bgAlpha: 0, // Fully transparent background
                            overlay: true, // Overlay mode for transparency
                            start: false, // Don't start automatically
                            audioCtx: sharedAudioContext, // Share the same audio context
                            canvas: sharedCanvas // Share the same canvas
                        }
                    );
                } catch (error) {
                    this.officialAudioMotion = null;
                }
            } else {
                console.warn('⚠️ Official AudioMotion library not loaded, using custom only');
                this.officialAudioMotion = null;
            }

            // Set initial AM canvas opacity and data attribute
            if (this.audioMotion && this.audioMotion.canvas) {
                this.audioMotion.canvas.style.opacity = this.visualizationOpacity.toString();
                // Add unique identifier for z-index management
                this.audioMotion.canvas.setAttribute('data-visualization', 'amvisualizer');
            }
            
            // Initialize Color Morph Managers after AudioMotion is ready
            if (typeof ColorMorphManager !== 'undefined') {
                if (this.audioMotion) {
                    this.colorMorphManager = new ColorMorphManager(this.audioMotion);
                }
                if (this.officialAudioMotion) {
                    this.proColorMorphManager = new ColorMorphManager(this.officialAudioMotion);
                }
            }


        } catch (error) {
            throw error;
        }
    }

    // Audio Input Methods
    async initializeAudioInput() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices.filter(d => d.kind === 'audioinput');
            this.updateDeviceList();
        } catch (e) {
            console.log('Cannot enumerate devices yet');
        }
    }

    updateDeviceList() {
        const select = this.getAudioElement('audioDeviceSelect');
        if (!select) 
            return;
        


        select.innerHTML = '<option value="">Select Audio Input...</option>';

        this.availableDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            let displayName = device.label || `Input ${
                device.deviceId.substr(0, 5)
            }`;

            if (displayName.includes('BlackHole') || displayName.includes('Loopback') || displayName.includes('Virtual') || displayName.includes('Soundflower')) {
                displayName = '🎵 ' + displayName;
            }

            option.textContent = displayName;
            select.appendChild(option);
        });


        const helpOption = document.createElement('option');
        helpOption.value = 'help';
        helpOption.textContent = '❓ How to capture system audio...';
        select.appendChild(helpOption);
        
        // Drawer removed - functionality moved to header controls
    }

    showAudioInputMenu() {
        this.closeAllPanels(); // CLOSE ALL PANELS FIRST
        // Create a custom dropdown menu for audio input selection
        this.createAudioInputDropdown();
        
        // Ensure header playlist shows cached data after dropdown is created
        setTimeout(() => {
            const headerPlaylist = document.getElementById('headerPlaylistDropdown');
            if (headerPlaylist && this.playlistManager && this.playlistManager.currentPlaylist && this.playlistManager.currentPlaylist.tracks) {
                this.playlistManager.renderHeaderPlaylistContent(headerPlaylist);
            }
        }, 100);
    }

    // Helper function to get audio element from header only
    getAudioElement(baseId) {
        // Header-only lookup (sidebar will be removed)
        const headerId = 'header' + baseId.charAt(0).toUpperCase() + baseId.slice(1);
        return document.getElementById(headerId);
    }

    // Helper function to update header audio elements only
    updateAudioElements(baseId, updateFn) {
        const headerId = 'header' + baseId.charAt(0).toUpperCase() + baseId.slice(1);
        const headerElement = document.getElementById(headerId);
        
        if (headerElement) updateFn(headerElement);
    }

    // Footer Settings Panel Management
    toggleFooterSettingsPanel(panelId, buttonElement) {
        const panel = document.getElementById(panelId);
        const button = buttonElement;
        
        if (!panel || !button) return;
        
        // Close other panels first
        this.closeAllPanels();
        
        // Toggle current panel
        if (panel.style.display === 'none' || panel.style.display === '') {
            this.showFooterSettingsPanel(panelId, buttonElement);
        } else {
            this.closeFooterSettingsPanel(panelId);
        }
    }
    
    showFooterSettingsPanel(panelId, buttonElement) {
        const panel = document.getElementById(panelId);
        const button = buttonElement;
        
        if (!panel || !button) return;
        
        // Show panel
        panel.style.display = 'block';
        button.classList.add('active');
        
        // Use new panel positioning system for panel-floating class
        if (panel.classList.contains('panel-floating')) {
            this.positionFloatingPanel(panel, button);
        } else {
            // Legacy positioning for old footer-settings-panel class
        const buttonRect = button.getBoundingClientRect();
        
        // Position: bottom edge 6px above gear icon's top edge, right edge aligned with gear icon's right edge
        panel.style.left = 'auto';
        panel.style.right = `${window.innerWidth - buttonRect.right}px`;
        panel.style.bottom = `${window.innerHeight - buttonRect.top + 6}px`;
        panel.style.top = 'auto';
        
        // Ensure panel doesn't go off-screen
        setTimeout(() => {
            const panelRect = panel.getBoundingClientRect();
            
            // Adjust if panel goes off left edge
            if (panelRect.left < 10) {
                panel.style.right = 'auto';
                panel.style.left = '10px';
            }
            
            // Adjust if panel goes off top edge
            if (panelRect.top < 10) {
                panel.style.bottom = 'auto';
                panel.style.top = '10px';
            }
        }, 10);
        }
        
    }
    
    closeFooterSettingsPanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.style.display = 'none';
        }
        
        // Remove active state from corresponding button
        const buttonId = panelId.replace('Panel', 'Btn');
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.remove('active');
        }
    }
    
    closeAllFooterSettingsPanels() {
        const panels = document.querySelectorAll('.footer-settings-panel');
        panels.forEach(panel => {
            panel.style.display = 'none';
        });
        
        const buttons = document.querySelectorAll('.footer-settings-btn');
        buttons.forEach(button => {
            button.classList.remove('active');
        });
    }

    // SIMPLE: Close ALL panels - one function, no complexity
    closeAllPanels() {
        // Close mixer
        const mixerPanel = document.getElementById('mixerPanel');
        if (mixerPanel) mixerPanel.style.display = 'none';
        const mixerBtn = document.getElementById('mixerBtn');
        if (mixerBtn) mixerBtn.classList.remove('active');
        
        // Close all header panels
        ['headerKaleidoscopePanel', 'headerWebGLPanel', 'headerBlobsPanel', 'headerInfiniteZoomPanel', 'headerNebulaPanel', 'headerFluidDynamicsPanel', 'headerVisualizerPanel'].forEach(id => {
            const panel = document.getElementById(id);
            if (panel) panel.style.display = 'none';
        });
        
        // Close all footer panels
        ['footerDisplaySettingsPanel', 'footerRecordSettingsPanel', 'footerAutopilotSettingsPanel', 'display1SettingsPanel', 'display2SettingsPanel', 'display3SettingsPanel'].forEach(id => {
            const panel = document.getElementById(id);
            if (panel) panel.style.display = 'none';
        });
        
        // Close dynamic panels (B,V,C,A buttons)
        ['footerAudioInputDropdown', 'footerVideoInputDropdown', 'colorPickerPanel', 'backgroundImagePanel', 'playlistPanel'].forEach(id => {
            const panel = document.getElementById(id);
            if (panel) panel.remove();
        });
        
        // Close other panels
        const backgroundPanel = document.getElementById('backgroundSettingsPanel');
        if (backgroundPanel) backgroundPanel.style.display = 'none';
        
        // Use existing footer method
        this.closeAllFooterSettingsPanels();
    }

    toggleFooterAutopilotSettingsPanel() {
        const panel = document.getElementById('footerAutopilotSettingsPanel');
        const button = document.getElementById('footerAutopilotSettingsBtn');
        
        if (!panel || !button) return;
        
        const isVisible = panel.style.display !== 'none';
        
        if (isVisible) {
            this.closeFooterAutopilotSettingsPanel();
        } else {
            this.showFooterAutopilotSettingsPanel();
        }
    }

    showFooterAutopilotSettingsPanel() {
        const panel = document.getElementById('footerAutopilotSettingsPanel');
        const button = document.getElementById('footerAutopilotSettingsBtn');
        
        if (!panel || !button) return;
        
        // Close other panels first
        this.closeAllPanels();
        
        // Position panel above the gear button with 6px gap, right-aligned
        const buttonRect = button.getBoundingClientRect();
        panel.style.left = 'auto';
        panel.style.right = `${window.innerWidth - buttonRect.right}px`;
        panel.style.bottom = `${window.innerHeight - buttonRect.top + 6}px`;
        panel.style.top = 'auto';
        panel.style.display = 'block';
        
        // Update button state
        button.classList.add('active');
        
    }

    closeFooterAutopilotSettingsPanel() {
        const panel = document.getElementById('footerAutopilotSettingsPanel');
        const button = document.getElementById('footerAutopilotSettingsBtn');
        
        if (panel) panel.style.display = 'none';
        if (button) button.classList.remove('active');
        
    }


    initializeFooterSettingsControls() {
        // Initialize display settings controls with footer prefixed IDs
        this.initializeFooterDisplayControls();
        this.initializeFooterRecordControls();
        this.initializeFooterAutopilotControls();
        this.initializeLearningAnalyticsModal();
    }

    initializeDisplaySettingsPanels() {
        
        // Initialize display 1 settings
        this.initializeDisplayPanelSettings('display1');
        
        // Initialize display 2 settings
        this.initializeDisplayPanelSettings('display2');
        
        // Initialize display 3 settings
        this.initializeDisplayPanelSettings('display3');
    }

    initializeDisplayPanelSettings(displayId) {
        const panelId = `${displayId}SettingsPanel`;
        
        
        // Display mode buttons
        const displayModeBtns = document.querySelectorAll(`#${panelId} .display-mode-btn`);
        displayModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setDisplayMode(displayId, mode);
            });
        });
        
        // Enhancement sliders
        const sharpnessSlider = document.getElementById(`${displayId}Sharpness`);
        if (sharpnessSlider) {
            sharpnessSlider.addEventListener('input', (e) => {
                this.setDisplaySharpness(displayId, parseInt(e.target.value));
            });
        }
        
        // Letterbox color picker
        const letterboxColorPicker = document.getElementById(`${displayId}LetterboxColor`);
        if (letterboxColorPicker) {
            letterboxColorPicker.addEventListener('change', (e) => {
                this.setDisplayLetterboxColor(displayId, e.target.value);
            });
        }
        
        // Mirror background toggle
        const mirrorBackgroundBtn = document.getElementById(`${displayId}MirrorBackgroundBtn`);
        if (mirrorBackgroundBtn) {
            mirrorBackgroundBtn.addEventListener('click', () => {
                this.toggleDisplayMirrorBackground(displayId);
            });
        }
        
        // Preset buttons
        const presetBtns = document.querySelectorAll(`#${panelId} .display-preset-btn`);
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyDisplayPreset(displayId, preset);
            });
        });
    }


    setDisplayMode(displayId, mode) {
        // Update active button
        const panelId = `${displayId}SettingsPanel`;
        const modeBtns = document.querySelectorAll(`#${panelId} .display-mode-btn`);
        modeBtns.forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = document.querySelector(`#${panelId} .display-mode-btn[data-mode="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
    }

    setDisplaySharpness(displayId, value) {
        const valueDisplay = document.getElementById(`${displayId}SharpnessValue`);
        if (valueDisplay) {
            valueDisplay.textContent = `${value}%`;
        }
        
        console.log(`Display ${displayId}: Sharpness set to ${value}%`);
    }

    setDisplayLetterboxColor(displayId, color) {
        const valueDisplay = document.getElementById(`${displayId}LetterboxColorValue`);
        if (valueDisplay) {
            valueDisplay.textContent = color;
        }
        
        console.log(`Display ${displayId}: Letterbox color set to ${color}`);
    }

    toggleDisplayMirrorBackground(displayId) {
        const btn = document.getElementById(`${displayId}MirrorBackgroundBtn`);
        if (!btn) return;
        
        const isActive = btn.classList.contains('active');
        btn.classList.toggle('active');
        btn.textContent = `Mirror Background: ${isActive ? 'Off' : 'On'}`;
        
    }

    applyDisplayPreset(displayId, preset) {
        console.log(`Display ${displayId}: Applying preset ${preset}`);
        
        // Update active preset button
        const panelId = `${displayId}SettingsPanel`;
        const presetBtns = document.querySelectorAll(`#${panelId} .display-preset-btn`);
        presetBtns.forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = document.querySelector(`#${panelId} .display-preset-btn[data-preset="${preset}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Apply preset settings
        switch (preset) {
            case 'cinema':
                this.setDisplayMode(displayId, 'fit');
                this.setDisplaySharpness(displayId, 0);
                this.setDisplayLetterboxColor(displayId, '#000000');
                break;
            case 'social':
                this.setDisplayMode(displayId, 'fill');
                this.setDisplaySharpness(displayId, 20);
                this.setDisplayLetterboxColor(displayId, '#1a1a1a');
                break;
            case 'performance':
                this.setDisplayMode(displayId, 'stretch');
                this.setDisplaySharpness(displayId, 10);
                this.setDisplayLetterboxColor(displayId, '#000000');
                break;
            case 'projector':
                this.setDisplayMode(displayId, 'original');
                this.setDisplaySharpness(displayId, 0);
                this.setDisplayLetterboxColor(displayId, '#000000');
                break;
        }
    }

    initializeFooterDisplayControls() {
        // SAFETY: Check if streamManager is initialized
        if (!this.streamManager || !this.streamManager.displaySettings) {
            console.warn('⚠️ initializeFooterDisplayControls: streamManager not yet initialized, skipping setup');
            return;
        }
        
        // Display mode buttons - use same logic as sidebar
        const footerDisplayModeButtons = document.querySelectorAll('#footerDisplaySettingsPanel .display-mode-btn');
        footerDisplayModeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state - footer only (sidebar sync removed)
                document.querySelectorAll('#footerDisplaySettingsPanel .display-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update settings using existing streamManager logic
                const mode = btn.dataset.mode;
                if (this.streamManager && this.streamManager.displaySettings) {
                    this.streamManager.displaySettings.presentationMode = mode;
                    this.streamManager.saveDisplaySettings();
                    
                    // Send to display window if streaming
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({
                            type: 'display-settings', 
                            data: this.streamManager.displaySettings
                        });
                    }
                }
            });
        });

        // Display preset buttons - use existing method
        const footerDisplayPresetButtons = document.querySelectorAll('#footerDisplaySettingsPanel .display-preset-btn');
        footerDisplayPresetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyDisplayPreset(preset);
            });
        });

        // Capture toggle buttons
        const footerCaptureVideoBtn = document.getElementById('footerCaptureVideoBtn');
        if (footerCaptureVideoBtn) {
            // Set initial state
            footerCaptureVideoBtn.textContent = `Capture Video: ${this.streamManager.displaySettings.captureVideo ? 'On' : 'Off'}`;
            footerCaptureVideoBtn.classList.toggle('active', this.streamManager.displaySettings.captureVideo);
            
            footerCaptureVideoBtn.addEventListener('click', () => {
                this.streamManager.displaySettings.captureVideo = !this.streamManager.displaySettings.captureVideo;
                footerCaptureVideoBtn.textContent = `Capture Video: ${this.streamManager.displaySettings.captureVideo ? 'On' : 'Off'}`;
                footerCaptureVideoBtn.classList.toggle('active', this.streamManager.displaySettings.captureVideo);
                this.streamManager.saveDisplaySettings();
                
                // Send update to Live Display window if streaming
                if (this.streamManager.isStreaming) {
                    this.streamManager.channel.postMessage({
                        type: 'display-settings', 
                        data: this.streamManager.displaySettings
                    });
                }
            });
        }

        const footerCaptureVisualizationBtn = document.getElementById('footerCaptureVisualizationBtn');
        if (footerCaptureVisualizationBtn) {
            // Set initial state
            footerCaptureVisualizationBtn.textContent = `Capture Visualization: ${this.streamManager.displaySettings.captureVisualization ? 'On' : 'Off'}`;
            footerCaptureVisualizationBtn.classList.toggle('active', this.streamManager.displaySettings.captureVisualization);
            
            footerCaptureVisualizationBtn.addEventListener('click', () => {
                this.streamManager.displaySettings.captureVisualization = !this.streamManager.displaySettings.captureVisualization;
                footerCaptureVisualizationBtn.textContent = `Capture Visualization: ${this.streamManager.displaySettings.captureVisualization ? 'On' : 'Off'}`;
                footerCaptureVisualizationBtn.classList.toggle('active', this.streamManager.displaySettings.captureVisualization);
                this.streamManager.saveDisplaySettings();
                
                // Send update to Live Display window if streaming
                if (this.streamManager.isStreaming) {
                    this.streamManager.channel.postMessage({
                        type: 'display-settings', 
                        data: this.streamManager.displaySettings
                    });
                }
            });
        }

        const footerCaptureInfiniteZoomBtn = document.getElementById('footerCaptureInfiniteZoomBtn');
        if (footerCaptureInfiniteZoomBtn) {
            // Set initial state
            footerCaptureInfiniteZoomBtn.textContent = `Capture Infinite Zoom: ${this.streamManager.displaySettings.captureInfiniteZoom ? 'On' : 'Off'}`;
            footerCaptureInfiniteZoomBtn.classList.toggle('active', this.streamManager.displaySettings.captureInfiniteZoom);
            
            footerCaptureInfiniteZoomBtn.addEventListener('click', () => {
                this.streamManager.displaySettings.captureInfiniteZoom = !this.streamManager.displaySettings.captureInfiniteZoom;
                footerCaptureInfiniteZoomBtn.textContent = `Capture Infinite Zoom: ${this.streamManager.displaySettings.captureInfiniteZoom ? 'On' : 'Off'}`;
                footerCaptureInfiniteZoomBtn.classList.toggle('active', this.streamManager.displaySettings.captureInfiniteZoom);
                this.streamManager.saveDisplaySettings();
                
                // Send update to Live Display window if streaming
                if (this.streamManager.isStreaming) {
                    this.streamManager.channel.postMessage({
                        type: 'display-settings', 
                        data: this.streamManager.displaySettings
                    });
                }
            });
        }

        const footerMatchVideoInputBtn = document.getElementById('footerMatchVideoInputBtn');
        if (footerMatchVideoInputBtn) {
            // Set initial state
            footerMatchVideoInputBtn.textContent = `Match Video Input: ${this.streamManager.displaySettings.matchVideoInput ? 'On' : 'Off'}`;
            footerMatchVideoInputBtn.classList.toggle('active', this.streamManager.displaySettings.matchVideoInput);
            
            footerMatchVideoInputBtn.addEventListener('click', () => {
                this.streamManager.displaySettings.matchVideoInput = !this.streamManager.displaySettings.matchVideoInput;
                footerMatchVideoInputBtn.textContent = `Match Video Input: ${this.streamManager.displaySettings.matchVideoInput ? 'On' : 'Off'}`;
                footerMatchVideoInputBtn.classList.toggle('active', this.streamManager.displaySettings.matchVideoInput);
                
                // When toggling OFF, set aspect ratio button to match video input
                if (!this.streamManager.displaySettings.matchVideoInput && 
                    (this.videoMode === 'camera' || this.videoMode === 'file')) {
                    this.updateAspectRatioToMatchVideo();
                }
                
                this.streamManager.saveDisplaySettings();
                
                // Reconfigure capture canvas with new aspect ratio logic
                if (this.streamManager.isStreaming) {
                    this.streamManager.reconfigureCapture();
                    this.streamManager.channel.postMessage({
                        type: 'display-settings', 
                        data: this.streamManager.displaySettings
                    });
                }
            });
        }

        // Display Enhancement Controls
        
        // Sharpness slider
        const footerDisplaySharpness = document.getElementById('footerDisplaySharpness');
        if (footerDisplaySharpness) {
            // Set initial value
            footerDisplaySharpness.value = this.streamManager.displaySettings.displaySharpness || 0;
            document.getElementById('footerDisplaySharpnessValue').textContent = footerDisplaySharpness.value + '%';
            
            footerDisplaySharpness.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('footerDisplaySharpnessValue').textContent = value + '%';
                
                if (this.streamManager) {
                    this.streamManager.displaySettings.displaySharpness = value;
                    this.streamManager.saveDisplaySettings();
                    
                    // Send to display window if streaming
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({
                            type: 'display-settings', 
                            data: this.streamManager.displaySettings
                        });
                    }
                }
            });
        }

        // Letterbox color picker
        const footerLetterboxColor = document.getElementById('footerLetterboxColor');
        if (footerLetterboxColor) {
            // Set initial value
            footerLetterboxColor.value = this.streamManager.displaySettings.letterboxColor || '#000000';
            document.getElementById('footerLetterboxColorValue').textContent = footerLetterboxColor.value;
            
            footerLetterboxColor.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('footerLetterboxColorValue').textContent = value;
                
                if (this.streamManager) {
                    this.streamManager.displaySettings.letterboxColor = value;
                    this.streamManager.saveDisplaySettings();
                    
                    // Send to display window if streaming
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({
                            type: 'display-settings', 
                            data: this.streamManager.displaySettings
                        });
                    }
                }
            });
        }

        // Mirror background toggle
        const footerMirrorBackgroundBtn = document.getElementById('footerMirrorBackgroundBtn');
        if (footerMirrorBackgroundBtn) {
            // Set initial state
            const isActive = this.streamManager.displaySettings.mirrorBackground || false;
            footerMirrorBackgroundBtn.textContent = `Mirror Background: ${isActive ? 'On' : 'Off'}`;
            footerMirrorBackgroundBtn.classList.toggle('active', isActive);
            
            // Show/hide blur slider based on initial state
            const blurContainer = document.getElementById('footerMirrorBlurContainer');
            if (blurContainer) {
                blurContainer.style.display = isActive ? 'block' : 'none';
            }
            
            footerMirrorBackgroundBtn.addEventListener('click', () => {
                this.streamManager.displaySettings.mirrorBackground = !this.streamManager.displaySettings.mirrorBackground;
                const newState = this.streamManager.displaySettings.mirrorBackground;
                
                footerMirrorBackgroundBtn.textContent = `Mirror Background: ${newState ? 'On' : 'Off'}`;
                footerMirrorBackgroundBtn.classList.toggle('active', newState);
                
                // Show/hide blur slider
                const blurContainer = document.getElementById('footerMirrorBlurContainer');
                if (blurContainer) {
                    blurContainer.style.display = newState ? 'block' : 'none';
                }
                
                this.streamManager.saveDisplaySettings();
                
                // Send to display window if streaming
                if (this.streamManager.isStreaming) {
                    this.streamManager.channel.postMessage({
                        type: 'display-settings', 
                        data: this.streamManager.displaySettings
                    });
                }
            });
        }

        // Mirror background blur slider
        const footerMirrorBackgroundBlur = document.getElementById('footerMirrorBackgroundBlur');
        if (footerMirrorBackgroundBlur) {
            // Set initial value
            footerMirrorBackgroundBlur.value = this.streamManager.displaySettings.mirrorBackgroundBlur || 20;
            document.getElementById('footerMirrorBackgroundBlurValue').textContent = footerMirrorBackgroundBlur.value + 'px';
            
            footerMirrorBackgroundBlur.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('footerMirrorBackgroundBlurValue').textContent = value + 'px';
                
                if (this.streamManager) {
                    this.streamManager.displaySettings.mirrorBackgroundBlur = value;
                    this.streamManager.saveDisplaySettings();
                    
                    // Send to display window if streaming
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({
                            type: 'display-settings', 
                            data: this.streamManager.displaySettings
                        });
                    }
                }
            });
        }
    }

    initializeFooterAutopilotControls() {
        // Footer Learning Analytics button
        const footerLearningAnalyticsBtn = document.getElementById('footerLearningAnalyticsBtn');
        if (footerLearningAnalyticsBtn) {
            footerLearningAnalyticsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openLearningAnalyticsDashboard();
            });
        }

        // Footer Auto Color Schemes button
        const footerAutoColorSchemesBtn = document.getElementById('footerAutoColorSchemesBtn');
        if (footerAutoColorSchemesBtn) {
            footerAutoColorSchemesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    this.aiAutopilot.autoColorSchemes = !this.aiAutopilot.autoColorSchemes;
                    const isOn = this.aiAutopilot.autoColorSchemes;
                    e.target.textContent = `Auto Color Schemes: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                }
            });
        }

        // Footer Parameter Control button
        const footerEnableParameterControlBtn = document.getElementById('footerEnableParameterControlBtn');
        if (footerEnableParameterControlBtn) {
            footerEnableParameterControlBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    this.aiAutopilot.parameterControlEnabled = !this.aiAutopilot.parameterControlEnabled;
                    const isOn = this.aiAutopilot.parameterControlEnabled;
                    e.target.textContent = `Parameter Control: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                }
            });
        }

        // Footer Learning button
        const footerEnableLearningBtn = document.getElementById('footerEnableLearningBtn');
        if (footerEnableLearningBtn) {
            footerEnableLearningBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    this.aiAutopilot.learningEnabled = !this.aiAutopilot.learningEnabled;
                    const isOn = this.aiAutopilot.learningEnabled;
                    e.target.textContent = `Learning: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                }
            });
        }

        // Footer Reset Learning button
        const footerResetLearningBtn = document.getElementById('footerResetLearningBtn');
        if (footerResetLearningBtn) {
            footerResetLearningBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot && confirm('Are you sure you want to reset all learning data? This cannot be undone.')) {
                    this.aiAutopilot.patternLearning.patterns = {};
                    this.aiAutopilot.patternLearning.userBehavior = {};
                    this.aiAutopilot.patternLearning.performanceMetrics = {};
                    this.aiAutopilot.patternLearning.saveLearningData();
                    this.updateLearningAnalytics();
                }
            });
        }

        // Footer User Feedback buttons
        const footerThumbsUpBtn = document.getElementById('footerThumbsUpBtn');
        if (footerThumbsUpBtn) {
            footerThumbsUpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    const context = {
                        genre: this.aiAutopilot.currentGenre,
                        energy: this.aiAutopilot.audioAnalyzer.getEnergy(),
                        tempo: this.aiAutopilot.audioAnalyzer.getTempo()
                    };
                    this.aiAutopilot.parameterController.recordUserFeedback('positive', context);
                    this.updateFeedbackStats();
                }
            });
        }

        const footerThumbsDownBtn = document.getElementById('footerThumbsDownBtn');
        if (footerThumbsDownBtn) {
            footerThumbsDownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    const context = {
                        genre: this.aiAutopilot.currentGenre,
                        energy: this.aiAutopilot.audioAnalyzer.getEnergy(),
                        tempo: this.aiAutopilot.audioAnalyzer.getTempo()
                    };
                    this.aiAutopilot.parameterController.recordUserFeedback('negative', context);
                    this.updateFeedbackStats();
                }
            });
        }

        // Footer Adaptive Tuning button
        const footerEnableAdaptiveTuningBtn = document.getElementById('footerEnableAdaptiveTuningBtn');
        if (footerEnableAdaptiveTuningBtn) {
            footerEnableAdaptiveTuningBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    this.aiAutopilot.adaptiveTuningEnabled = !this.aiAutopilot.adaptiveTuningEnabled;
                    const isOn = this.aiAutopilot.adaptiveTuningEnabled;
                    e.target.textContent = `Adaptive Tuning: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                }
            });
        }

        // Footer Force Optimization button
        const footerForceOptimizationBtn = document.getElementById('footerForceOptimizationBtn');
        if (footerForceOptimizationBtn) {
            footerForceOptimizationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    if (this.aiAutopilot.adaptiveTuning) {
                        
                        // Force optimization regardless of normal conditions
                        this.aiAutopilot.adaptiveTuning.optimizeParameters(true);
                    } else {
                    }
                } else {
                }
            });
        }

        // Footer Predictive Behavior button
        const footerEnablePredictiveBehaviorBtn = document.getElementById('footerEnablePredictiveBehaviorBtn');
        if (footerEnablePredictiveBehaviorBtn) {
            footerEnablePredictiveBehaviorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    this.aiAutopilot.predictiveBehaviorEnabled = !this.aiAutopilot.predictiveBehaviorEnabled;
                    const isOn = this.aiAutopilot.predictiveBehaviorEnabled;
                    e.target.textContent = `Predictive Behavior: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                }
            });
        }

        // Footer Test Prediction button
        const footerTestPredictionBtn = document.getElementById('footerTestPredictionBtn');
        if (footerTestPredictionBtn) {
            footerTestPredictionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot && this.aiAutopilot.predictiveBehavior) {
                    const audioFeatures = this.aiAutopilot.audioAnalyzer.getCurrentFeatures();
                    const currentParams = this.aiAutopilot.getCurrentParameters();
                    const predictions = this.aiAutopilot.predictiveBehavior.predictOptimalActions(
                        audioFeatures, 
                        this.aiAutopilot.visualizer.currentMode, 
                        currentParams
                    );
                    
                    if (predictions) {
                        alert(`Prediction: ${predictions.modeChange?.reason || 'No mode change'}\nConfidence: ${Math.round(predictions.confidence * 100)}%`);
                    } else {
                        alert('No prediction available - confidence too low');
                    }
                }
            });
        }

        // Footer Multi-layered Intelligence button
        const footerEnableMultiLayeredIntelligenceBtn = document.getElementById('footerEnableMultiLayeredIntelligenceBtn');
        if (footerEnableMultiLayeredIntelligenceBtn) {
            footerEnableMultiLayeredIntelligenceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    this.aiAutopilot.multiLayeredIntelligenceEnabled = !this.aiAutopilot.multiLayeredIntelligenceEnabled;
                    const isOn = this.aiAutopilot.multiLayeredIntelligenceEnabled;
                    e.target.textContent = `Multi-layered Intelligence: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                }
            });
        }

        // Footer Test Intelligence button
        const footerTestIntelligenceBtn = document.getElementById('footerTestIntelligenceBtn');
        if (footerTestIntelligenceBtn) {
            footerTestIntelligenceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot && this.aiAutopilot.multiLayeredIntelligence) {
                    const audioFeatures = this.aiAutopilot.audioAnalyzer.getCurrentFeatures();
                    const currentParams = this.aiAutopilot.getCurrentParameters();
                    const decision = this.aiAutopilot.multiLayeredIntelligence.makeIntelligentDecision(
                        audioFeatures, 
                        this.aiAutopilot.visualizer.currentMode, 
                        currentParams
                    );
                    
                    if (decision) {
                        alert(`Intelligence Decision: ${decision.reason}\nAction: ${decision.action}\nConfidence: ${Math.round(decision.confidence * 100)}%\nSource: ${decision.sourceLayer}`);
                    } else {
                        alert('No intelligence decision available');
                    }
                }
            });
        }

        // Footer Video Effects button
        const footerEnableVideoEffectsBtn = document.getElementById('footerEnableVideoEffectsBtn');
        if (footerEnableVideoEffectsBtn) {
            footerEnableVideoEffectsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    this.aiAutopilot.videoEffectsEnabled = !this.aiAutopilot.videoEffectsEnabled;
                    const isOn = this.aiAutopilot.videoEffectsEnabled;
                    e.target.textContent = `Video Effects: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                }
            });
        }

        // Footer Test Parameter Control button
        const footerTestParameterControlBtn = document.getElementById('footerTestParameterControlBtn');
        if (footerTestParameterControlBtn) {
            footerTestParameterControlBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot) {
                    this.aiAutopilot.testParameterControl();
                }
            });
        }

        // Footer Test Parameters button
        const footerTestParametersBtn = document.getElementById('footerTestParametersBtn');
        if (footerTestParametersBtn) {
            footerTestParametersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.aiAutopilot && this.aiAutopilot.multiLayeredIntelligence) {
                    
                    // Test dramatic parameter changes
                    const testParams = {
                        linearBoost: 5.0,
                        gradient: 0.9,
                        fillAlpha: 0.8,
                        smoothing: 0.2,
                        peakHoldTime: 200
                    };
                    
                    this.aiAutopilot.multiLayeredIntelligence.applyParameterAdjustments(testParams);
                    
                    // Test video effects
                    if (this.aiAutopilot.videoEffectsEnabled) {
                        const testVideoParams = {
                            colorEffects: {
                                brightness: 1.5,
                                contrast: 1.3,
                                saturation: 1.4,
                                hue: 45
                            }
                        };
                        this.aiAutopilot.multiLayeredIntelligence.applyVideoAdjustments(testVideoParams);
                    }
                    
                    alert('Test parameters applied! Check console for details.');
                }
            });
        }
    }

    initializeFooterRecordControls() {
        // Connect footer record controls to unified quality system
        if (!this.recordManager) {
            return;
        }
        
        // Unified Quality Preset select
        const footerQualityPresetSelect = document.getElementById('footerRecordQualityPresetSelect');
        if (footerQualityPresetSelect) {
            footerQualityPresetSelect.value = this.recordManager.qualityPreset;
            footerQualityPresetSelect.addEventListener('change', (e) => {
                this.recordManager.qualityPreset = e.target.value;
                this.recordManager.saveSettings();
                this.toggleCustomRecordingGroup(e.target.value === 'custom');
                this.updateCodecCompatibility();
            });
        }
        
        // Frame rate select
        const footerFrameRateSelect = document.getElementById('footerRecordFrameRateSelect');
        if (footerFrameRateSelect) {
            footerFrameRateSelect.value = this.recordManager.frameRate.toString();
            footerFrameRateSelect.addEventListener('change', (e) => {
                this.recordManager.frameRate = parseInt(e.target.value);
                this.recordManager.saveSettings();
            });
        }
        
        // Custom settings (only visible when qualityPreset = 'custom')
        this.initializeCustomRecordingControls();
        
        // Initialize UI state
        this.toggleCustomRecordingGroup(this.recordManager.qualityPreset === 'custom');
        
        // Aspect ratio and recording area controls
        this.initializeRecordingAreaControls();
        
        // Update compatibility indicator after a brief delay to ensure RecordManager is ready
        setTimeout(() => {
            this.updateCodecCompatibility();
        }, 100);
    }

    initializeCustomRecordingControls() {
        // Custom resolution select
        const footerResolutionSelect = document.getElementById('footerRecordResolutionSelect');
        if (footerResolutionSelect) {
            footerResolutionSelect.value = this.recordManager.customResolution;
            footerResolutionSelect.addEventListener('change', (e) => {
                this.recordManager.customResolution = e.target.value;
                this.recordManager.saveSettings();
                this.updateCodecCompatibility();
            });
        }
        
        // Custom video bitrate slider
        const customVideoBitrateSlider = document.getElementById('customVideoBitrateSlider');
        const customVideoBitrateValue = document.getElementById('customVideoBitrateValue');
        if (customVideoBitrateSlider && customVideoBitrateValue) {
            customVideoBitrateSlider.value = this.recordManager.customVideoBitrate;
            customVideoBitrateValue.textContent = this.recordManager.customVideoBitrate + ' Mbps';
            
            customVideoBitrateSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.recordManager.customVideoBitrate = value;
                customVideoBitrateValue.textContent = value + ' Mbps';
                this.recordManager.saveSettings();
            });
        }
        
        // Custom audio quality select
        const footerAudioQualitySelect = document.getElementById('footerRecordAudioQualitySelect');
        if (footerAudioQualitySelect) {
            footerAudioQualitySelect.value = this.recordManager.customAudioBitrate.toString();
            footerAudioQualitySelect.addEventListener('change', (e) => {
                this.recordManager.customAudioBitrate = parseInt(e.target.value);
                this.recordManager.saveSettings();
            });
        }
        
        // Custom codec select
        const footerCodecSelect = document.getElementById('footerRecordCodecSelect');
        if (footerCodecSelect) {
            footerCodecSelect.value = this.recordManager.customCodec;
            footerCodecSelect.addEventListener('change', (e) => {
                this.recordManager.customCodec = e.target.value;
                this.recordManager.saveSettings();
                this.updateCodecCompatibility();
            });
        }
    }

    toggleCustomRecordingGroup(show) {
        const customGroup = document.getElementById('customRecordingGroup');
        if (customGroup) {
            customGroup.style.display = show ? 'block' : 'none';
        }
    }

    initializeRecordingAreaControls() {
        
        // Aspect ratio select
        const aspectRatioSelect = document.getElementById('footerRecordAspectRatioSelect');
        if (aspectRatioSelect) {
            aspectRatioSelect.value = this.recordManager.aspectRatio;
            aspectRatioSelect.addEventListener('change', (e) => {
                this.recordManager.aspectRatio = e.target.value;
                this.recordManager.saveSettings();
                this.recordManager.updateRecordingAreaOverlay();
            });
        }
        
        // Show recording area toggle
        const showAreaToggle = document.getElementById('showRecordingAreaToggle');
        if (showAreaToggle) {
            showAreaToggle.checked = this.recordManager.showRecordingArea;
            showAreaToggle.addEventListener('change', (e) => {
                this.recordManager.showRecordingArea = e.target.checked;
                this.recordManager.saveSettings();
                this.recordManager.toggleRecordingAreaOverlay(e.target.checked);
            });
        }
        
        // Center recording area button
        const centerAreaBtn = document.getElementById('centerRecordingAreaBtn');
        if (centerAreaBtn) {
            centerAreaBtn.addEventListener('click', () => {
                this.recordManager.centerRecordingArea();
            });
        }
        
        // Filename input (from second method)
        const footerFilenameInput = document.getElementById('footerRecordFilenameInput');
        if (footerFilenameInput) {
            footerFilenameInput.value = this.recordManager.customFilename;
            footerFilenameInput.addEventListener('input', (e) => {
                this.recordManager.customFilename = e.target.value;
                this.recordManager.saveSettings();
            });
        }
        
        // Choose location button (from second method)
        const footerChooseLocationBtn = document.getElementById('footerRecordChooseLocationBtn');
        if (footerChooseLocationBtn) {
            footerChooseLocationBtn.addEventListener('click', async () => {
                try {
                    const dirHandle = await window.showDirectoryPicker();
                    this.recordManager.saveLocation = dirHandle;
                    
                    // Update location display
                    const locationDisplay = document.getElementById('footerRecordFileLocation');
                    if (locationDisplay) {
                        locationDisplay.textContent = `📁 ${dirHandle.name}`;
                    }
                    
                    this.recordManager.saveSettings();
                } catch (error) {
                    console.log('Directory selection cancelled or failed:', error);
                }
            });
        }
    }


    /**
     * Update codec compatibility indicator
     */
    updateCodecCompatibility() {
        const compatibilityStatus = document.getElementById('compatibilityStatus');
        if (!compatibilityStatus) {
            console.warn('Compatibility status element not found');
            return;
        }

        try {
            // Check if recordManager exists and has the method
            if (!this.recordManager || typeof this.recordManager.selectOptimalCodec !== 'function') {
                compatibilityStatus.textContent = '⚡ Initializing...';
                compatibilityStatus.className = 'compatibility-status checking';
                return;
            }

            const codecInfo = this.recordManager.selectOptimalCodec();
            const compatibility = codecInfo.compatibility;
            
            
            // Update text and styling
            compatibilityStatus.textContent = compatibility.text;
            compatibilityStatus.className = `compatibility-status ${compatibility.level}`;
            
        } catch (error) {
            console.error('Error checking codec compatibility:', error);
            // No compatible codecs found
            compatibilityStatus.textContent = '❌ No Compatible Codecs - Update Browser';
            compatibilityStatus.className = 'compatibility-status poor';
        }
    }


    updateAspectRatioToMatchVideo() {
        // Calculate video aspect ratio and select closest matching button
        if (!this.videoElement || this.videoElement.videoWidth <= 0 || this.videoElement.videoHeight <= 0) {
            console.log('No valid video dimensions for aspect ratio matching');
            return;
        }
        
        const videoAspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
        console.log(`Video aspect ratio: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight} = ${videoAspect.toFixed(3)}`);
        
        // Define standard aspect ratios and their tolerance
        const aspectRatios = [
            { ratio: '16:9', value: 16/9, tolerance: 0.1 },
            { ratio: '4:3', value: 4/3, tolerance: 0.1 },
            { ratio: '9:16', value: 9/16, tolerance: 0.1 },
            { ratio: '1:1', value: 1/1, tolerance: 0.1 },
            { ratio: '21:9', value: 21/9, tolerance: 0.1 }
        ];
        
        // Find closest matching aspect ratio
        let closestMatch = aspectRatios[0]; // Default to 16:9
        let smallestDiff = Math.abs(videoAspect - aspectRatios[0].value);
        
        for (const ar of aspectRatios) {
            const diff = Math.abs(videoAspect - ar.value);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestMatch = ar;
            }
        }
        
        console.log(`Closest aspect ratio match: ${closestMatch.ratio} (diff: ${smallestDiff.toFixed(3)})`);
        
        // Update the streamManager setting
        if (this.streamManager) {
            this.streamManager.displaySettings.aspectRatio = closestMatch.ratio;
            this.streamManager.saveDisplaySettings();
        }
        
        // Update footer aspect ratio buttons to show the selected one (sidebar sync removed)
        document.querySelectorAll('#footerDisplaySettingsPanel .aspect-ratio-btn').forEach(btn => {
            if (btn.dataset.ratio === closestMatch.ratio) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        console.log(`Updated aspect ratio buttons to select: ${closestMatch.ratio}`);
    }

    createAudioInputDropdown() {
        // Remove existing dropdown if it exists
        const existingDropdown = document.getElementById('footerAudioInputDropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Get button position
        const button = document.getElementById('footerLiveAudioBtn');
        if (!button) {
            console.error('Footer Live Audio button not found');
            return;
        }

        const buttonRect = button.getBoundingClientRect();
        
        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.id = 'footerAudioInputDropdown';
        dropdown.className = 'panel-floating';
        dropdown.dataset.buttonId = 'footerLiveAudioBtn';
        dropdown.style.left = `${buttonRect.left}px`;
        dropdown.style.top = `${buttonRect.bottom + 4}px`;
        dropdown.style.display = 'block';

        // Create header
        const header = document.createElement('div');
        header.className = 'panel-header';
        
        const title = document.createElement('span');
        title.textContent = 'Audio Input';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.className = 'panel-close-btn';
        closeBtn.onclick = () => dropdown.remove();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        dropdown.appendChild(header);

        // Create content wrapper
        const content = document.createElement('div');
        content.className = 'panel-content';

        // Create device list
        const deviceList = document.createElement('div');
        deviceList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Add devices
        this.availableDevices.forEach(device => {
            const deviceBtn = document.createElement('button');
            deviceBtn.className = 'btn-secondary';
            
            let displayName = device.label || `Input ${device.deviceId.substr(0, 5)}`;
            if (displayName.includes('BlackHole') || displayName.includes('Loopback') || displayName.includes('Virtual') || displayName.includes('Soundflower')) {
                displayName = '🎵 ' + displayName;
            }
            
            deviceBtn.textContent = displayName;
            deviceBtn.onclick = async () => {
                await this.startLiveInput(device.deviceId);
                dropdown.remove();
            };
            
            deviceList.appendChild(deviceBtn);
        });

        // Add help option
        const helpBtn = document.createElement('button');
        helpBtn.className = 'btn-primary';
        helpBtn.style.marginTop = '8px';
        helpBtn.textContent = '❓ System audio help...';
        helpBtn.onclick = () => {
            this.showSystemAudioHelp();
            dropdown.remove();
        };
        
        deviceList.appendChild(helpBtn);
        content.appendChild(deviceList);

        // Add audio settings section after device list
        const settingsSection = document.createElement('div');
        settingsSection.style.cssText = `
            margin-top: 15px;
            border-top: 2px solid var(--border-color);
            padding-top: 15px;
        `;
        
        // Live Audio ON/OFF Toggle
        const toggleSection = document.createElement('div');
        toggleSection.style.cssText = `
            margin-bottom: 15px;
            text-align: center;
        `;
        
        const audioToggle = document.createElement('button');
        audioToggle.className = 'btn-toggle';
        audioToggle.id = 'headerLiveAudioToggleBtn';
        
        audioToggle.textContent = this.liveAudioEnabled ? 'ON' : 'OFF';
        // Let btn-toggle class handle the styling
        if (this.liveAudioEnabled) {
            audioToggle.classList.add('active');
        }
        
        audioToggle.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Call toggleLiveAudio on this instance
            this.toggleLiveAudio();
            
            // Update button text and active class
            const isOn = this.liveAudioEnabled;
            audioToggle.textContent = isOn ? 'ON' : 'OFF';
            if (isOn) {
                audioToggle.classList.add('active');
            } else {
                audioToggle.classList.remove('active');
            }
        };
        
        // Monitor Input Button (between ON/OFF toggle and Clear Input)
        const monitorBtn = document.createElement('button');
        monitorBtn.className = 'btn-toggle';
        monitorBtn.id = 'headerAudioMonitorBtn';
        monitorBtn.style.cssText = `
            margin-top: 10px;
            width: 100%;
        `;
        
        // Set initial state from visualizer
        // In createAudioInputDropdown(), 'this' is already the visualizer
        const isMonitorOn = this.audioMonitoringEnabled;
        monitorBtn.textContent = isMonitorOn ? 'Monitor Input: ON' : 'Monitor Input: OFF';
        if (isMonitorOn) {
            monitorBtn.classList.add('active');
        }
        
        // Use addEventListener like mixer button
        monitorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // In createAudioInputDropdown(), 'this' is already the visualizer
            this.toggleAudioMonitoring();
        });
        
        // Clear Input Button
        const clearAudioInputBtn = document.createElement('button');
        clearAudioInputBtn.className = 'btn-danger';
        clearAudioInputBtn.id = 'headerAudioClearInputBtn';
        clearAudioInputBtn.textContent = 'Clear Input';
        clearAudioInputBtn.style.cssText = `
            margin-top: 10px;
            width: 100%;
        `;
        
        clearAudioInputBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.clearAudioInput();
        };
        
        toggleSection.appendChild(audioToggle);
        toggleSection.appendChild(monitorBtn);
        toggleSection.appendChild(clearAudioInputBtn);
        settingsSection.appendChild(toggleSection);
        
        // Playlist Controls
        this.addPlaylistControlsGroup(settingsSection);
        
        content.appendChild(settingsSection);
        dropdown.appendChild(content);
        
        // Prevent settings section from closing dropdown when clicked
        settingsSection.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Add to page
        document.body.appendChild(dropdown);

        // Close dropdown when clicking outside
        const closeOnOutsideClick = (e) => {
            if (!dropdown.contains(e.target) && e.target !== button) {
                dropdown.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        
        // Add click listener after a short delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);

    }

    addPlaylistControlsGroup(container) {
        const controlGroup = document.createElement('div');
        controlGroup.style.cssText = `margin-bottom: 15px;`;
        
        const groupLabel = document.createElement('div');
        groupLabel.textContent = 'Playlist';
        groupLabel.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        `;
        controlGroup.appendChild(groupLabel);
        
        // Create header playlist container that mirrors sidebar functionality
        const playlistContainer = document.createElement('div');
        playlistContainer.id = 'headerPlaylistDropdown';
        playlistContainer.className = 'embedded-playlist-manager';
        playlistContainer.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 8px;
            min-height: 100px;
            max-height: 200px;
            overflow-y: auto;
        `;
        
        controlGroup.appendChild(playlistContainer);
        container.appendChild(controlGroup);
        
        // Force immediate playlist initialization for header
        setTimeout(() => {
            const headerPlaylist = document.getElementById('headerPlaylistDropdown');
            
            if (headerPlaylist && window.playlistManager) {
                // Check if playlist manager has a cached playlist
                if (window.playlistManager.currentPlaylist && window.playlistManager.currentPlaylist.tracks) {
                    window.playlistManager.renderHeaderPlaylistContent(headerPlaylist);
                } else {
                    window.playlistManager.populateHeaderPlaylistDirect(headerPlaylist);
                }
            } else if (headerPlaylist) {
                // Fallback: create basic playlist structure immediately
                headerPlaylist.innerHTML = `
                    <div class="playlist-actions-dropdown" style="margin-bottom: 10px;">
                        <button class="btn-primary" style="margin-right: 8px;">Add Folder</button>
                        <button class="btn-secondary" style="margin-right: 8px;">Import</button>
                        <button class="btn-secondary">Export</button>
                    </div>
                    <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
                        <div style="font-size: 24px; margin-bottom: 8px;">🎵</div>
                        <div style="font-size: 12px;">No music loaded</div>
                        <div style="font-size: 11px; margin-top: 4px;">Click "Add Folder" to scan your music library</div>
                    </div>
                `;
                
                // Bind the Add Folder button immediately
                const scanBtn = headerPlaylist.querySelector('.btn-primary');
                if (scanBtn) {
                    scanBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Header Add Folder clicked!');
                        
                        // Access the playlist manager through the visualizer
                        if (window.visualizer && window.visualizer.playlistManager) {
                            window.visualizer.playlistManager.scanFolder();
                        } else if (window.playlistManager) {
                            window.playlistManager.scanFolder();
                        } else {
                            // Try to initialize it
                            if (window.visualizer) {
                                const pm = window.visualizer.playlistManager;
                                if (pm && pm.scanFolder) {
                                    pm.scanFolder();
                                } else {
                                    alert('Playlist system not ready. Please refresh the page.');
                                }
                            }
                        }
                    };
                }
                
                // Bind Import button
                const importBtn = headerPlaylist.querySelector('.btn-secondary:nth-of-type(1)');
                if (importBtn) {
                    importBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const importInput = document.getElementById('playlistImportInput');
                        if (importInput) {
                            importInput.click();
                        }
                    };
                }
                
                // Bind Export button
                const exportBtn = headerPlaylist.querySelector('.btn-secondary:nth-of-type(2)');
                if (exportBtn) {
                    exportBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Access the playlist manager through the visualizer
                        if (window.visualizer && window.visualizer.playlistManager) {
                            window.visualizer.playlistManager.exportPlaylist();
                        } else if (window.playlistManager) {
                            window.playlistManager.exportPlaylist();
                        }
                    };
                }
            }
        }, 50);
        
        // Also check again after playlist manager has had time to load cached data
        setTimeout(() => {
            const headerPlaylist = document.getElementById('headerPlaylistDropdown');
            if (headerPlaylist && window.playlistManager && window.playlistManager.currentPlaylist && window.playlistManager.currentPlaylist.tracks) {
                window.playlistManager.renderHeaderPlaylistContent(headerPlaylist);
            }
        }, 1500);
    }

    showVideoInputMenu() {
        this.closeAllPanels(); // CLOSE ALL PANELS FIRST
        // Create a simple custom dropdown for video input selection
        this.createVideoInputDropdown();
    }

    // Helper function to get element by either header or sidebar ID
    getVideoElement(baseId) {
        // Try header first (preferred), then sidebar (fallback)
        const headerId = 'header' + baseId.charAt(0).toUpperCase() + baseId.slice(1);
        const headerElement = document.getElementById(headerId);
        if (headerElement) return headerElement;
        
        const sidebarElement = document.getElementById(baseId);
        return sidebarElement;
    }

    // Helper function to update both header and sidebar elements
    updateVideoElements(baseId, updateFn) {
        const headerId = 'header' + baseId.charAt(0).toUpperCase() + baseId.slice(1);
        const headerElement = document.getElementById(headerId);
        const sidebarElement = document.getElementById(baseId);
        
        if (headerElement) updateFn(headerElement);
        if (sidebarElement) updateFn(sidebarElement);
    }

    createVideoInputDropdown() {
        // Remove existing dropdown if it exists
        const existingDropdown = document.getElementById('footerVideoInputDropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Get button position
        const button = document.getElementById('footerLiveVideoBtn');
        if (!button) {
            console.error('Footer Live Video button not found');
            return;
        }

        const buttonRect = button.getBoundingClientRect();
        
        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.id = 'footerVideoInputDropdown';
        dropdown.className = 'panel-floating';
        dropdown.dataset.buttonId = 'footerLiveVideoBtn';
        dropdown.style.left = `${buttonRect.left}px`;
        dropdown.style.top = `${buttonRect.bottom + 4}px`;
        dropdown.style.display = 'block';

        // Create header
        const header = document.createElement('div');
        header.className = 'panel-header';
        
        const title = document.createElement('span');
        title.textContent = 'Video Settings';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.className = 'panel-close-btn';
        closeBtn.onclick = () => dropdown.remove();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        dropdown.appendChild(header);

        // Create content wrapper
        const content = document.createElement('div');
        content.className = 'panel-content';

        // Create device list
        const deviceList = document.createElement('div');
        deviceList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Add video devices
        this.availableVideoDevices.forEach(device => {
            const deviceBtn = document.createElement('button');
            const isActive = this.videoMode === 'camera' && this.currentVideoDeviceId === device.deviceId;
            
            deviceBtn.className = isActive ? 'btn-primary' : 'btn-secondary';
            
            let displayName = device.label || `Camera ${device.deviceId.substr(0, 5)}`;
            if (displayName.includes('FaceTime') || displayName.includes('Built-in') || displayName.includes('USB')) {
                displayName = '📹 ' + displayName;
            }
            
            // Add active indicator
            if (isActive) {
                displayName = '● ' + displayName;
            }
            
            deviceBtn.textContent = displayName;
            deviceBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Use existing video input system
                await this.startVideoInput(device.deviceId);
                // Don't close panel - let user adjust settings
            };
            
            deviceList.appendChild(deviceBtn);
        });

        // Add separator
        if (this.availableVideoDevices.length > 0) {
            const separator = document.createElement('div');
            separator.style.cssText = `
                border-top: 1px solid var(--border-color);
                margin: 8px 0 4px 0;
            `;
            deviceList.appendChild(separator);
        }

        // Add video from file option
        const fileBtn = document.createElement('button');
        const isFileActive = this.videoMode === 'file';
        
        fileBtn.className = isFileActive ? 'btn-primary' : 'btn-secondary';
        
        let fileDisplayName = '📁 Video from file';
        if (this.videoFile) {
            fileDisplayName += ` (${this.videoFile.name})`;
        }
        
        // Add active indicator
        if (isFileActive) {
            fileDisplayName = '● ' + fileDisplayName;
        }
        
        fileBtn.textContent = fileDisplayName;
        fileBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Trigger file input - same as sidebar functionality
            const fileInput = document.getElementById('videoFileInput');
            if (fileInput) {
                fileInput.click();
            }
            // Don't close panel - let user adjust settings
        };
        
        deviceList.appendChild(fileBtn);

        // Add File Controls directly below the file button (no section label)
        this.addInlineFileControls(deviceList);

        // Add help option
        const helpBtn = document.createElement('button');
        helpBtn.className = 'btn-primary';
        helpBtn.style.marginTop = '8px';
        helpBtn.textContent = '❓ Video input help...';
        helpBtn.onclick = () => {
            alert('Video Input Help:\n\n' +
                  '• Select a camera or video device from the list\n' +
                  '• Built-in cameras will show as "📹 Built-in Camera"\n' +
                  '• External USB cameras will show as "📹 USB Camera"\n' +
                  '• Select "📁 Video from file" to use a video file\n' +
                  '• The video feed will appear in the visualization\n' +
                  '• Click the V button again to stop video input');
            dropdown.remove();
        };
        
        deviceList.appendChild(helpBtn);
        
        // Add video settings section after device list
        const settingsSection = document.createElement('div');
        settingsSection.style.cssText = `
            margin-top: 15px;
            border-top: 2px solid var(--border-color);
            padding-top: 15px;
        `;
        
        // Video ON/OFF Toggle
        const toggleSection = document.createElement('div');
        toggleSection.style.cssText = `
            margin-bottom: 15px;
            text-align: center;
        `;
        
        const videoToggle = document.createElement('button');
        videoToggle.className = 'btn-toggle';
        videoToggle.id = 'videoToggleBtn';
        videoToggle.textContent = this.videoMode === 'camera' || this.videoMode === 'file' ? 'ON' : 'OFF';
        // Let btn-toggle class handle the styling
        if (this.videoMode === 'camera' || this.videoMode === 'file') {
            videoToggle.classList.add('active');
        }
        
        videoToggle.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleVideoPlayback();
            // Let updateVideoToggleState handle the UI updates
            this.updateVideoToggleState();
        };
        
        // Clear Input Button
        const clearInputBtn = document.createElement('button');
        clearInputBtn.className = 'btn-danger';
        clearInputBtn.id = 'headerVideoClearInputBtn';
        clearInputBtn.textContent = 'Clear Input';
        clearInputBtn.style.cssText = `
            margin-top: 10px;
            width: 100%;
        `;
        
        clearInputBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.clearVideoInput();
        };
        
        toggleSection.appendChild(videoToggle);
        toggleSection.appendChild(clearInputBtn);
        settingsSection.appendChild(toggleSection);
        
        // Basic Controls
        this.addControlGroup(settingsSection, 'Basic', [
            { label: 'Opacity', id: 'headerVideoOpacitySlider', min: 0, max: 100, value: 100, suffix: '%' },
            { label: 'Brightness', id: 'headerVideoBrightnessSlider', min: 0, max: 200, value: 100, suffix: '%' },
            { label: 'Contrast', id: 'headerVideoContrastSlider', min: 0, max: 200, value: 100, suffix: '%' },
            { label: 'Fade Time', id: 'headerVideoFadeSlider', min: 0, max: 10, step: 0.5, value: 3, suffix: 's' }
        ]);
        
        // Color Controls
        this.addControlGroup(settingsSection, 'Color', [
            { label: 'Saturation', id: 'headerVideoSaturationSlider', min: 0, max: 200, value: 100, suffix: '%' },
            { label: 'Hue Rotate', id: 'headerVideoHueRotateSlider', min: 0, max: 360, value: 0, suffix: '°' },
            { label: 'Grayscale', id: 'headerVideoGrayscaleSlider', min: 0, max: 100, value: 0, suffix: '%' },
            { label: 'Sepia', id: 'headerVideoSepiaSlider', min: 0, max: 100, value: 0, suffix: '%' }
        ]);
        
        // Effects Controls
        this.addEffectsControlGroup(settingsSection);
        
        // Animation Controls
        this.addAnimationControlGroup(settingsSection);
        
        // Visualization Controls
        this.addVisualizationControlGroup(settingsSection);
        
        // Presets
        this.addPresetsControlGroup(settingsSection);
        
        // File Controls moved inline below "Video from file" button
        
        // Stream Statistics
        this.addStreamStatsGroup(settingsSection);
        
        content.appendChild(deviceList);
        content.appendChild(settingsSection);
        dropdown.appendChild(content);
        
        // Refresh stats if camera is already active
        if (this.videoMode === 'camera' && this.cameraInfo) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.updateCameraStats();
            }, 100);
        } else if (this.videoMode === 'file' && this.videoElement) {
            console.log('Refreshing video file stats for reopened panel...');
            setTimeout(() => {
                const videoInfo = {
                    name: this.videoFile?.name || 'Unknown',
                    resolution: `${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`,
                    duration: this.videoElement.duration,
                    loop: this.videoFileLoopMode
                };
                this.updateVideoFileStats(videoInfo);
                
                // Also update File Controls if a video file is loaded
                if (this.videoFile) {
                    this.updateVideoFileControls(this.videoFile);
                    this.startVideoProgressUpdates();
                }
            }, 100);
        }

        // Add to page
        document.body.appendChild(dropdown);

        // Close dropdown when clicking outside
        const closeOnOutsideClick = (e) => {
            if (!dropdown.contains(e.target) && e.target !== button) {
                dropdown.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        
        // Add click listener after a short delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);

    }

    addControlGroup(container, groupLabel, sliders) {
        const controlGroup = document.createElement('div');
        controlGroup.style.cssText = `
            margin-bottom: 15px;
        `;
        
        const groupLabelEl = document.createElement('div');
        groupLabelEl.textContent = groupLabel;
        groupLabelEl.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        `;
        controlGroup.appendChild(groupLabelEl);
        
        sliders.forEach(slider => {
            const sliderWrapper = document.createElement('div');
            sliderWrapper.className = 'slider-1-wrapper';
            
            const label = document.createElement('label');
            label.textContent = slider.label;
            label.className = 'slider-label';
            
            const input = document.createElement('input');
            input.type = 'range';
            input.id = slider.id;
            input.className = 'slider-1';
            input.min = slider.min;
            input.max = slider.max;
            if (slider.step) input.step = slider.step;
            input.value = slider.value;
            
            const valueSpan = document.createElement('span');
            valueSpan.id = slider.id.replace('Slider', 'Value');
            valueSpan.className = 'slider-1-value';
            valueSpan.textContent = slider.value + (slider.suffix || '');
            
            // Header video sliders work independently (no sidebar sync needed)
            input.addEventListener('input', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Call video control method directly
                this.handleHeaderVideoSlider(slider.id, e.target.value);
                
                // Update value display
                valueSpan.textContent = e.target.value + (slider.suffix || '');
            });
            
            sliderWrapper.appendChild(label);
            sliderWrapper.appendChild(input);
            sliderWrapper.appendChild(valueSpan);
            controlGroup.appendChild(sliderWrapper);
        });
        
        container.appendChild(controlGroup);
    }

    handleHeaderVideoSlider(sliderId, value) {
        // Direct method calls for header video sliders when sidebar sync fails
        const numValue = parseFloat(value);
        
        switch(sliderId) {
            case 'headerVideoOpacitySlider':
                this.setVideoOpacity(numValue / 100);
                break;
            case 'headerVideoBrightnessSlider':
                this.setVideoBrightness(numValue);
                break;
            case 'headerVideoContrastSlider':
                this.setVideoContrast(numValue);
                break;
            case 'headerVideoFadeSlider':
                this.videoFadeTime = numValue;
                break;
            case 'headerVideoSaturationSlider':
                this.setVideoSaturation(numValue);
                break;
            case 'headerVideoHueRotateSlider':
                this.setVideoHueRotate(numValue);
                break;
            case 'headerVideoGrayscaleSlider':
                this.setVideoGrayscale(numValue);
                break;
            case 'headerVideoSepiaSlider':
                this.setVideoSepia(numValue);
                break;
            case 'headerVideoBlurSlider':
                this.setVideoBlur(numValue);
                break;
            case 'headerVideoVignetteSlider':
                this.setVideoVignette(numValue);
                break;
            case 'headerVideoPosterizeSlider':
                this.setVideoPosterize(numValue);
                break;
            default:
                console.log(`Unhandled header video slider: ${sliderId}`);
        }
    }

    addEffectsControlGroup(container) {
        const controlGroup = document.createElement('div');
        controlGroup.style.cssText = `margin-bottom: 15px;`;
        
        const groupLabel = document.createElement('div');
        groupLabel.textContent = 'Effects';
        groupLabel.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        `;
        controlGroup.appendChild(groupLabel);
        
        // Effects sliders
        const effectSliders = [
            { label: 'Blur', id: 'headerVideoBlurSlider', min: 0, max: 20, value: 0, suffix: 'px' },
            { label: 'Vignette', id: 'headerVideoVignetteSlider', min: 0, max: 100, value: 0, suffix: '%' },
            { label: 'Posterize', id: 'headerVideoPosterizeSlider', min: 2, max: 16, value: 16, suffix: '' }
        ];
        
        effectSliders.forEach(slider => {
            const sliderWrapper = document.createElement('div');
            sliderWrapper.className = 'slider-1-wrapper';
            
            const label = document.createElement('label');
            label.textContent = slider.label;
            label.className = 'slider-label';
            
            const input = document.createElement('input');
            input.type = 'range';
            input.id = slider.id;
            input.className = 'slider-1';
            input.min = slider.min;
            input.max = slider.max;
            input.value = slider.value;
            
            const valueSpan = document.createElement('span');
            valueSpan.id = slider.id.replace('Slider', 'Value');
            valueSpan.className = 'slider-1-value';
            valueSpan.textContent = slider.value === 16 && slider.id === 'videoPosterizeSlider' ? 'Off' : slider.value + slider.suffix;
            
            input.addEventListener('input', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Call video control method directly (no sidebar sync)
                this.handleHeaderVideoSlider(slider.id, e.target.value);
                
                // Update display value
                if (slider.id.includes('Posterize')) {
                    valueSpan.textContent = e.target.value === '16' ? 'Off' : e.target.value;
                } else {
                    valueSpan.textContent = e.target.value + slider.suffix;
                }
            });
            
            sliderWrapper.appendChild(label);
            sliderWrapper.appendChild(input);
            sliderWrapper.appendChild(valueSpan);
            controlGroup.appendChild(sliderWrapper);
        });
        
        // Effect toggle buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-top: 8px;
        `;
        
        const invertBtn = document.createElement('button');
        invertBtn.textContent = 'Invert: Off';
        invertBtn.className = 'effect-toggle-btn';
        invertBtn.id = 'headerVideoInvertBtn';
        invertBtn.style.cssText = `
            background: var(--hover-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            flex: 1;
        `;
        
        const mirrorBtn = document.createElement('button');
        mirrorBtn.textContent = 'Mirror: Off';
        mirrorBtn.className = 'effect-toggle-btn';
        mirrorBtn.id = 'headerVideoMirrorBtn';
        mirrorBtn.style.cssText = invertBtn.style.cssText;
        
        invertBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.visualizer) {
                window.visualizer.toggleVideoInvert();
                invertBtn.textContent = `Invert: ${window.visualizer.videoInvert ? 'On' : 'Off'}`;
                invertBtn.classList.toggle('active', window.visualizer.videoInvert);
            }
        };
        
        mirrorBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.visualizer) {
                window.visualizer.cycleVideoMirror();
                const mirrorText = window.visualizer.videoMirror === 'off' ? 'Off' : window.visualizer.videoMirror.charAt(0).toUpperCase() + window.visualizer.videoMirror.slice(1);
                mirrorBtn.textContent = `Mirror: ${mirrorText}`;
                mirrorBtn.classList.toggle('active', window.visualizer.videoMirror !== 'off');
            }
        };
        
        buttonContainer.appendChild(invertBtn);
        buttonContainer.appendChild(mirrorBtn);
        controlGroup.appendChild(buttonContainer);
        
        container.appendChild(controlGroup);
    }

    addAnimationControlGroup(container) {
        const controlGroup = document.createElement('div');
        controlGroup.style.cssText = `margin-bottom: 15px;`;
        
        const groupLabel = document.createElement('div');
        groupLabel.textContent = 'Animation';
        groupLabel.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        `;
        controlGroup.appendChild(groupLabel);
        
        const pulseBtn = document.createElement('button');
        pulseBtn.textContent = 'Pulse: Off';
        pulseBtn.className = 'btn-toggle';
        pulseBtn.id = 'headerVideoPulseBtn';
        // Let btn-toggle class handle the styling
        
        pulseBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.visualizer) {
                window.visualizer.toggleVideoPulse();
                pulseBtn.textContent = `Pulse: ${window.visualizer.videoPulse ? 'On' : 'Off'}`;
                pulseBtn.classList.toggle('active', window.visualizer.videoPulse);
                // Show/hide pulse rate container
                const pulseRateContainer = document.getElementById('headerVideoPulseRateContainer');
                if (pulseRateContainer) {
                    pulseRateContainer.style.display = window.visualizer.videoPulse ? 'flex' : 'none';
                }
            }
        };
        
        controlGroup.appendChild(pulseBtn);
        
        // Pulse Rate Slider
        const pulseRateContainer = document.createElement('div');
        pulseRateContainer.id = 'headerVideoPulseRateContainer';
        pulseRateContainer.style.cssText = `
            display: none;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
        `;
        
        const pulseRateLabel = document.createElement('label');
        pulseRateLabel.textContent = 'Rate:';
        pulseRateLabel.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            min-width: 35px;
        `;
        
        const pulseRateSlider = document.createElement('input');
        pulseRateSlider.type = 'range';
        pulseRateSlider.id = 'headerVideoPulseRateSlider';
        pulseRateSlider.min = '0.5';
        pulseRateSlider.max = '4';
        pulseRateSlider.step = '0.1';
        pulseRateSlider.value = '2';
        pulseRateSlider.style.cssText = `flex: 1; height: 20px;`;
        
        const pulseRateValue = document.createElement('span');
        pulseRateValue.id = 'headerVideoPulseRateValue';
        pulseRateValue.textContent = '2.0s';
        pulseRateValue.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            min-width: 40px;
            text-align: right;
        `;
        
        pulseRateSlider.addEventListener('input', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const value = parseFloat(e.target.value);
            if (window.visualizer) {
                window.visualizer.setVideoPulseRate(value);
            }
            pulseRateValue.textContent = `${value.toFixed(1)}s`;
        });
        
        pulseRateContainer.appendChild(pulseRateLabel);
        pulseRateContainer.appendChild(pulseRateSlider);
        pulseRateContainer.appendChild(pulseRateValue);
        controlGroup.appendChild(pulseRateContainer);
        
        container.appendChild(controlGroup);
    }

    addVisualizationControlGroup(container) {
        const controlGroup = document.createElement('div');
        controlGroup.style.cssText = `margin-bottom: 15px;`;
        
        const groupLabel = document.createElement('div');
        groupLabel.textContent = 'Visualization';
        groupLabel.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        `;
        controlGroup.appendChild(groupLabel);
        
        const aspectBtn = document.createElement('button');
        aspectBtn.textContent = 'Match Video Aspect: On';
        aspectBtn.className = 'btn-toggle active';
        aspectBtn.id = 'matchVisualizationAspectBtn';
        // Let btn-toggle class handle the styling
        
        aspectBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.visualizer) {
                window.visualizer.matchVisualizationAspect = !window.visualizer.matchVisualizationAspect;
                aspectBtn.textContent = `Match Video Aspect: ${window.visualizer.matchVisualizationAspect ? 'On' : 'Off'}`;
                aspectBtn.classList.toggle('active', window.visualizer.matchVisualizationAspect);
                
                // Apply aspect ratio matching if video is active
                if (window.visualizer.videoMode === 'camera' || window.visualizer.videoMode === 'file') {
                    window.visualizer.updateVisualizationAspectRatio();
                }
            }
        };
        
        controlGroup.appendChild(aspectBtn);
        container.appendChild(controlGroup);
    }

    addPresetsControlGroup(container) {
        const controlGroup = document.createElement('div');
        controlGroup.style.cssText = `margin-bottom: 15px;`;
        
        const groupLabel = document.createElement('div');
        groupLabel.textContent = 'Presets';
        groupLabel.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        `;
        controlGroup.appendChild(groupLabel);
        
        const presetButtons = document.createElement('div');
        presetButtons.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
        `;
        
        const presets = [
            'normal', 'dreamy', 'noir', 'cyberpunk', 'vintage', 'retro-tv',
            'underwater', 'infrared', 'acid', 'thermal', 'matrix', 'glitch'
        ];
        
        presets.forEach(preset => {
            const presetBtn = document.createElement('button');
            presetBtn.textContent = preset.charAt(0).toUpperCase() + preset.slice(1).replace('-', ' ');
                presetBtn.className = 'btn-preset';
            presetBtn.dataset.preset = preset;
            
            presetBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.visualizer) {
                    window.visualizer.applyVideoPreset(preset);
                }
            };
            
            presetButtons.appendChild(presetBtn);
        });
        
        controlGroup.appendChild(presetButtons);
        container.appendChild(controlGroup);
    }

    addInlineFileControls(container) {
        // File info display (no section label, appears directly below file button)
        const fileInfo = document.createElement('div');
        fileInfo.id = 'headerVideoFileInfo';
        fileInfo.style.cssText = `
            display: block;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 8px;
            margin-top: 8px;
            margin-bottom: 8px;
        `;
        
        // File info section (only shown when video is loaded)
        const fileInfoSection = document.createElement('div');
        fileInfoSection.id = 'headerVideoFileInfoSection';
        fileInfoSection.style.cssText = `
            display: none;
            margin-bottom: 12px;
        `;
        
        const fileName = document.createElement('span');
        fileName.id = 'headerVideoFileName';
        fileName.textContent = 'No file selected';
        fileName.style.cssText = `
            color: var(--text-primary);
            font-size: 11px;
            display: block;
            margin-bottom: 6px;
        `;
        
        const fileControlsInline = document.createElement('div');
        fileControlsInline.className = 'video-file-controls-inline';
        fileControlsInline.style.cssText = `
            display: flex;
            gap: 8px;
        `;
        
        // NOTE: Loop and Mute buttons have been moved to the playlist section
        // They are now always visible in the playlist controls
        
        // Progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'video-progress-container';
        
        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'video-progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'video-progress-fill';
        progressFill.id = 'headerVideoProgressFill';
        
        progressBar.appendChild(progressFill);
        
        // Time display
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'video-time-display';
        
        const currentTime = document.createElement('span');
        currentTime.className = 'video-current-time';
        currentTime.id = 'headerVideoCurrentTime';
        currentTime.textContent = '0:00';
        
        const totalTime = document.createElement('span');
        totalTime.className = 'video-total-time';
        totalTime.id = 'headerVideoTotalTime';
        totalTime.textContent = '0:00';
        
        timeDisplay.appendChild(currentTime);
        timeDisplay.appendChild(totalTime);
        
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(timeDisplay);
        
        fileInfoSection.appendChild(fileName);
        // fileControlsInline removed - buttons moved to playlist section
        fileInfoSection.appendChild(progressContainer);
        
        fileInfo.appendChild(fileInfoSection);
        
        // Video Playlist Section (always visible)
        const playlistSection = document.createElement('div');
        playlistSection.id = 'videoPlaylistContainer';
        playlistSection.style.cssText = `
            margin-top: 0;
            padding-top: 0;
        `;
        
        // Video Sizing Controls (above playlist)
        const sizingSection = document.createElement('div');
        sizingSection.style.cssText = `
            margin-bottom: 8px;
        `;
        
        const sizingLabel = document.createElement('div');
        sizingLabel.textContent = 'Sizing';
        sizingLabel.style.cssText = `
            color: var(--text-secondary);
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
        `;
        
        const sizingButtons = document.createElement('div');
        sizingButtons.style.cssText = `
            display: flex;
            gap: 4px;
        `;
        
        const sizes = ['fit', 'fill', 'stretch', 'original'];
        sizes.forEach(size => {
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.id = `videoFileSize${size.charAt(0).toUpperCase() + size.slice(1)}`;
            btn.setAttribute('data-size', size);
            btn.textContent = size.charAt(0).toUpperCase() + size.slice(1);
            btn.style.cssText = 'font-size: 10px; padding: 4px 8px; flex: 1;';
            
            if (size === this.videoFileSize) {
                btn.classList.add('active');
            }
            
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.visualizer) {
                    window.visualizer.videoFileSize = size;
                    window.visualizer.updateVideoFileSize();
                    
                    // Update button states
                    sizingButtons.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Save to localStorage
                    localStorage.setItem('freque_video_file_size', size);
                }
            };
            
            sizingButtons.appendChild(btn);
        });
        
        sizingSection.appendChild(sizingLabel);
        sizingSection.appendChild(sizingButtons);
        playlistSection.appendChild(sizingSection);
        
        // Playlist Controls (Loop and Mute - always visible)
        const playlistControls = document.createElement('div');
        playlistControls.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        `;
        
        const loopBtn = document.createElement('button');
        loopBtn.id = 'headerVideoFileLoopBtn';
        loopBtn.className = 'video-file-control-btn btn-toggle active';
        loopBtn.textContent = 'Loop';
        loopBtn.style.cssText = 'font-size: 10px; padding: 4px 8px; flex: 1;';
        
        const muteBtn = document.createElement('button');
        muteBtn.id = 'headerVideoFileMuteBtn';
        muteBtn.className = 'video-file-control-btn btn-toggle active';
        muteBtn.textContent = 'Muted';
        muteBtn.style.cssText = 'font-size: 10px; padding: 4px 8px; flex: 1;';
        
        // Add event prevention to file control buttons
        loopBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.visualizer) {
                // Cycle through loop modes: 'off' -> 'one' -> 'all' -> 'off'
                const modes = ['off', 'one', 'all'];
                const currentIndex = modes.indexOf(window.visualizer.videoFileLoopMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                window.visualizer.videoFileLoopMode = modes[nextIndex];
                
                // Update button text and active state
                const modeLabels = { 'off': 'Loop:OFF', 'one': 'Loop:1', 'all': 'Loop:ALL' };
                loopBtn.textContent = modeLabels[window.visualizer.videoFileLoopMode];
                loopBtn.classList.toggle('active', window.visualizer.videoFileLoopMode !== 'off');
                
                // Apply loop mode to video element
                if (window.visualizer.videoElement) {
                    window.visualizer.videoElement.loop = window.visualizer.videoFileLoopMode === 'one';
                }
                
                // Save to localStorage
                localStorage.setItem('freque_video_loop_mode', window.visualizer.videoFileLoopMode);
            }
        };
        
        // Load saved loop mode
        const savedLoopMode = localStorage.getItem('freque_video_loop_mode');
        if (savedLoopMode && ['off', 'one', 'all'].includes(savedLoopMode)) {
            if (window.visualizer) {
                window.visualizer.videoFileLoopMode = savedLoopMode;
                const modeLabels = { 'off': 'Loop:OFF', 'one': 'Loop:1', 'all': 'Loop:ALL' };
                loopBtn.textContent = modeLabels[savedLoopMode];
                loopBtn.classList.toggle('active', savedLoopMode !== 'off');
            }
        } else {
            // Set default
            if (window.visualizer) {
                const modeLabels = { 'off': 'Loop:OFF', 'one': 'Loop:1', 'all': 'Loop:ALL' };
                loopBtn.textContent = modeLabels[window.visualizer.videoFileLoopMode];
                loopBtn.classList.toggle('active', window.visualizer.videoFileLoopMode !== 'off');
            }
        }
        
        muteBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Toggle mute state and update audio gain
            if (window.visualizer) {
                window.visualizer.videoFileMuted = !window.visualizer.videoFileMuted;
                muteBtn.textContent = window.visualizer.videoFileMuted ? 'Muted' : 'Sound';
                muteBtn.classList.toggle('active', window.visualizer.videoFileMuted);
                
                // Update the audio gain node to actually mute/unmute the video audio
                if (window.visualizer.videoAudioGain) {
                    window.visualizer.videoAudioGain.gain.value = window.visualizer.videoFileMuted ? 0 : window.visualizer.volume;
                }
            }
        };
        
        playlistControls.appendChild(loopBtn);
        playlistControls.appendChild(muteBtn);
        playlistSection.appendChild(playlistControls);
        
        // Playlist Actions
        const playlistActions = document.createElement('div');
        playlistActions.className = 'playlist-actions-dropdown';
        playlistActions.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        `;
        
        const addFolderBtn = document.createElement('button');
        addFolderBtn.className = 'btn-primary';
        addFolderBtn.id = 'videoPlaylistScanBtn';
        addFolderBtn.textContent = 'Add Folder';
        addFolderBtn.style.cssText = 'font-size: 10px; padding: 4px 8px; flex: 1;';
        
        const importBtn = document.createElement('button');
        importBtn.className = 'btn-secondary';
        importBtn.id = 'videoPlaylistImportBtn';
        importBtn.textContent = 'Import';
        importBtn.style.cssText = 'font-size: 10px; padding: 4px 8px; flex: 1;';
        
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn-secondary';
        exportBtn.id = 'videoPlaylistExportBtn';
        exportBtn.textContent = 'Export';
        exportBtn.style.cssText = 'font-size: 10px; padding: 4px 8px; flex: 1;';
        
        playlistActions.appendChild(addFolderBtn);
        playlistActions.appendChild(importBtn);
        playlistActions.appendChild(exportBtn);
        
        // Scanning Progress (hidden by default)
        const progressDiv = document.createElement('div');
        progressDiv.id = 'videoPlaylistProgress';
        progressDiv.className = 'playlist-progress';
        progressDiv.style.display = 'none';
        progressDiv.innerHTML = `
            <div class="progress-bar-container">
                <div class="progress-bar" id="videoPlaylistProgressBar"></div>
            </div>
            <div class="progress-info">
                <span class="progress-text" id="videoPlaylistProgressText">Scanning video folder...</span>
                <span class="progress-count" id="videoPlaylistProgressCount">0/0 files</span>
                <span class="progress-eta" id="videoPlaylistProgressEta">Est: calculating...</span>
            </div>
            <button class="btn-secondary progress-cancel-btn" id="videoPlaylistCancelBtn">Cancel</button>
        `;
        
        // Playlist Stats
        const playlistStats = document.createElement('div');
        playlistStats.className = 'playlist-stats';
        playlistStats.id = 'videoPlaylistStats';
        playlistStats.style.cssText = `
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: var(--text-secondary);
            margin-bottom: 8px;
        `;
        playlistStats.innerHTML = `
            <span id="videoPlaylistCount">No videos loaded</span>
            <span id="videoPlaylistDuration">0:00:00</span>
        `;
        
        // Tracks Container
        const tracksContainer = document.createElement('div');
        tracksContainer.className = 'playlist-tracks-container';
        tracksContainer.id = 'videoPlaylistTracksContainer';
        tracksContainer.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 4px;
        `;
        
        const tracksInner = document.createElement('div');
        tracksInner.className = 'playlist-tracks';
        tracksInner.id = 'videoPlaylistTracks';
        tracksInner.innerHTML = `
            <div class="empty-playlist">
                <div class="empty-playlist-icon">🎬</div>
                <div class="empty-playlist-text">No videos loaded</div>
                <div class="empty-playlist-subtext">Click "Add Folder" to scan your video library</div>
            </div>
        `;
        tracksContainer.appendChild(tracksInner);
        
        playlistSection.appendChild(playlistActions);
        playlistSection.appendChild(progressDiv);
        playlistSection.appendChild(playlistStats);
        playlistSection.appendChild(tracksContainer);
        
        fileInfo.appendChild(playlistSection);
        container.appendChild(fileInfo);
        
        // Hidden file input (already exists in HTML, but we need it available)
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'videoFileInput';
        fileInput.accept = 'video/*';
        fileInput.style.display = 'none';
        container.appendChild(fileInput);
        
        // Hidden import input
        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.id = 'videoPlaylistImportInput';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        container.appendChild(importInput);
        
        // Initialize video playlist UI (manager already initialized in init())
        // Use setTimeout to ensure DOM is fully updated before attaching handlers
        console.log('About to initialize video playlist UI in 50ms...');
        
        // Store reference to visualizer for use in timeout
        const visualizer = this;
        
        setTimeout(() => {
            console.log('Visualizer is:', visualizer);
            
            if (visualizer.videoPlaylistManager) {
                visualizer.initializeVideoPlaylistUI();
                    // Display playlist (empty or with videos) now that UI elements are created
                    setTimeout(() => {
                        console.log('Displaying playlist...');
                        visualizer.videoPlaylistManager.displayPlaylist();
                        // Load and restore current video selection if saved (but do NOT auto-play)
                        // User must click play button to start playback
                        if (visualizer.videoPlaylistManager.currentPlaylist && visualizer.videoPlaylistManager.currentPlaylist.videos.length > 0) {
                            visualizer.videoPlaylistManager.loadCurrentVideo();
                        }
                    }, 50);
            } else {
                console.error('videoPlaylistManager not available after timeout!');
                console.error('window.VideoPlaylistManager:', typeof window.VideoPlaylistManager);
                console.error('Trying to create it now...');
                
                // Try to create it now if the class exists
                if (window.VideoPlaylistManager && !visualizer.videoPlaylistManager) {
                    visualizer.videoPlaylistManager = new VideoPlaylistManager(visualizer);
                    console.log('Created videoPlaylistManager, retrying initialization...');
                    visualizer.initializeVideoPlaylistUI();
                    setTimeout(() => {
                        visualizer.videoPlaylistManager.displayPlaylist();
                    }, 50);
                }
            }
        }, 50);
    }
    
    initializeVideoPlaylistUI() {
        console.log('this.videoPlaylistManager:', this.videoPlaylistManager);
        
        if (!this.videoPlaylistManager) {
            console.error('VideoPlaylistManager not initialized!');
            console.error('window.visualizer:', window.visualizer);
            console.error('window.visualizer.videoPlaylistManager:', window.visualizer?.videoPlaylistManager);
            return;
        }
        
        // Store reference for use in event handlers
        const manager = this.videoPlaylistManager;
        
        // Video playlist scan button - use getElementById like audio playlist
        const scanBtn = document.getElementById('videoPlaylistScanBtn');
        console.log('scanBtn found:', !!scanBtn, scanBtn);
        
        if (scanBtn) {
            // Remove any existing listeners to prevent duplicates
            const newScanBtn = scanBtn.cloneNode(true);
            scanBtn.parentNode.replaceChild(newScanBtn, scanBtn);
            
            newScanBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('manager:', !!manager);
                console.log('scanFolder method:', !!(manager && manager.scanFolder));
                
                if (manager && manager.scanFolder) {
                    // Use setTimeout to ensure user activation is preserved
                    setTimeout(() => {
                        console.log('Calling scanFolder...');
                        manager.scanFolder();
                    }, 0);
                } else {
                    console.error('manager not available when button clicked!');
                }
            });
            console.log('Event listener attached to new button');
        } else {
            console.error('videoPlaylistScanBtn NOT FOUND in DOM');
        }
        
        // Video playlist import button
        const importBtn = document.getElementById('videoPlaylistImportBtn');
        const importInput = document.getElementById('videoPlaylistImportInput');
        if (importBtn && importInput) {
            const newImportBtn = importBtn.cloneNode(true);
            importBtn.parentNode.replaceChild(newImportBtn, importBtn);
            
            newImportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                importInput.click();
            });
            importInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.videoPlaylistManager.importPlaylist(file);
                }
                e.target.value = ''; // Reset input
            };
        }
        
        // Video playlist export button
        const exportBtn = document.getElementById('videoPlaylistExportBtn');
        if (exportBtn) {
            const newExportBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
            
            newExportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.videoPlaylistManager.exportPlaylist();
            });
        }
        
        // Video playlist cancel button
        const cancelBtn = document.getElementById('videoPlaylistCancelBtn');
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            newCancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.videoPlaylistManager.cancelScan();
            });
        }
    }

    addStreamStatsGroup(container) {
        const controlGroup = document.createElement('div');
        controlGroup.style.cssText = `margin-bottom: 15px;`;
        
        const groupLabel = document.createElement('div');
        groupLabel.textContent = 'Stream Statistics';
        groupLabel.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        `;
        controlGroup.appendChild(groupLabel);
        
        const statsContainer = document.createElement('div');
        statsContainer.id = 'headerCameraStatsContainer';
        statsContainer.className = 'stats-container';
        statsContainer.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 8px;
            min-height: 60px;
        `;
        
        const statsPlaceholder = document.createElement('div');
        statsPlaceholder.className = 'stats-placeholder';
        statsPlaceholder.textContent = 'Camera stream info will appear here when video input is active';
        statsPlaceholder.style.cssText = `
            color: var(--text-secondary);
            font-size: 11px;
            text-align: center;
            line-height: 1.4;
        `;
        
        statsContainer.appendChild(statsPlaceholder);
        controlGroup.appendChild(statsContainer);
        container.appendChild(controlGroup);
    }

    updateFooterLiveAudioButton() {
        const footerBtn = document.getElementById('footerLiveAudioBtn');
        if (!footerBtn) return;

        // Check if live audio is enabled
        const isActive = this.liveAudioEnabled;
        
        //     liveAudioEnabled: this.liveAudioEnabled,
        //     isActive: isActive
        // });
        
        if (isActive) {
            footerBtn.classList.add('active');
        } else {
            footerBtn.classList.remove('active');
        }
    }

    updateFooterLiveVideoButton() {
        const footerBtn = document.getElementById('footerLiveVideoBtn');
        if (!footerBtn) return;

        // Check if video is active using existing video system
        const isActive = this.videoMode === 'camera' || this.videoMode === 'file';
        
        //     videoMode: this.videoMode,
        //     isActive: isActive
        // });
        
        if (isActive) {
            footerBtn.classList.add('active');
        } else {
            footerBtn.classList.remove('active');
        }
    }

    updateFooterVisualizerButton() {
        const footerBtn = document.getElementById('footerVisualizerBtn');
        if (!footerBtn) return;

        // Check if visualization is enabled
        const isActive = this.visualizationEnabled;
        
        //     visualizationEnabled: this.visualizationEnabled,
        //     isActive: isActive
        // });
        
        if (isActive) {
            footerBtn.classList.add('active');
        } else {
            footerBtn.classList.remove('active');
        }
    }

    updateFooterVisualizerToggleButton() {
        const toggleBtn = document.getElementById('footerVisualizerToggleBtn');
        if (!toggleBtn) return;

        const toggleText = toggleBtn.querySelector('.toggle-text');
        if (!toggleText) return;

        // Update button text and state
        if (this.visualizationEnabled) {
            toggleText.textContent = 'ON';
            toggleBtn.classList.add('active');
        } else {
            toggleText.textContent = 'OFF';
            toggleBtn.classList.remove('active');
        }
    }

    initializeFooterMorphControls() {
        // Footer Morph Button
        const footerMorphBtn = document.getElementById('footerMorphBtn');
        if (footerMorphBtn) {
            footerMorphBtn.addEventListener('click', () => {
                this.toggleMorph();
            });
        } else {
            console.error('Footer morph button not found');
        }

        // Footer Morph Speed Select
        const footerMorphSpeedSelect = document.getElementById('footerMorphSpeedSelect');
        if (footerMorphSpeedSelect) {
            footerMorphSpeedSelect.addEventListener('change', (e) => {
                this.setMorphSpeed(e.target.value);
            });
        } else {
            console.error('Footer morph speed select not found');
        }
    }

    async toggleLiveAudio() {
        const deviceSelect = this.getAudioElement('audioDeviceSelect');

        if (this.liveAudioEnabled) {
            // Turn OFF live audio
            this.stopLiveInput();
            this.liveAudioEnabled = false;
            this.inputMode = 'playlist';
            this.currentDeviceId = null;
            
            // Update UI for header toggle button
            this.updateAudioElements('liveAudioToggleBtn', (btn) => {
                btn.textContent = 'OFF';
                btn.classList.remove('active');
                btn.style.background = 'var(--hover-color)';
                btn.style.color = 'var(--text-primary)';
            });
            
            if (deviceSelect) {
                deviceSelect.value = '';
            }
            
            // Resume playlist
            this.resumePlaylist();
            
        } else {
            // Turn ON live audio
            if (this.lastAudioDeviceId) {
                // Use last selected device
                await this.startLiveInput(this.lastAudioDeviceId);
            } else {
                // Show device selector
                await this.initializeAudioInput();
                if (deviceSelect) {
                    deviceSelect.style.display = 'block';
                }
            }
            
            this.liveAudioEnabled = true;
            
            // Update UI for header toggle button
            this.updateAudioElements('liveAudioToggleBtn', (btn) => {
                btn.textContent = 'ON';
                btn.classList.add('active');
                btn.style.background = 'var(--accent-color)';
                btn.style.color = 'white';
            });
        }
        
        // Update mixer audio toggle
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAudioToggle) {
            window.multiDisplayManager.updateMixerAudioToggle();
        }
        
        // Update footer button state
        this.updateFooterLiveAudioButton();
    }

    showColorPicker() {
        this.closeAllPanels(); // CLOSE ALL PANELS FIRST
        // Create a custom color picker panel positioned relative to C button
        this.createColorPickerPanel();
    }

    createColorPickerPanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('colorPickerPanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Get C button position
        const button = document.getElementById('footerLiveColorBtn');
        if (!button) {
            console.error('Footer Live Color button not found');
            return;
        }

        const buttonRect = button.getBoundingClientRect();
        
        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'colorPickerPanel';
        panel.className = 'panel-floating';
        panel.dataset.buttonId = 'footerLiveColorBtn';
        panel.style.left = `${buttonRect.left}px`;
        panel.style.top = `${buttonRect.bottom + 4}px`;
        panel.style.display = 'block';

        // Create header
        const header = document.createElement('div');
        header.className = 'panel-header';
        
        const title = document.createElement('span');
        title.textContent = 'Background Color';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.className = 'panel-close-btn';
        closeBtn.addEventListener('click', () => {
            panel.remove();
        });
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create color picker input
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = 'panelColorPicker';
        colorInput.value = this.backgroundColor || '#000000';
        colorInput.style.cssText = `
            width: 100%;
            height: 40px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        
        // Add change event listener
        colorInput.addEventListener('change', (e) => {
            this.setBackgroundColor(e.target.value);
        });
        
        panel.appendChild(header);
        
        // Create content wrapper
        const content = document.createElement('div');
        content.className = 'panel-content';
        content.appendChild(colorInput);
        panel.appendChild(content);
        
        document.body.appendChild(panel);
        
        // Close panel when clicking outside
        const closeOnOutsideClick = (e) => {
            if (!panel.contains(e.target) && e.target !== button) {
                panel.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        
        // Delay the outside click listener to prevent immediate closure
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);
    }

    showBackgroundImageSelection() {
        this.closeAllPanels(); // CLOSE ALL PANELS FIRST
        // Show the background image control panel
        this.createBackgroundImagePanel();
    }

    createBackgroundImagePanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('backgroundImagePanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'backgroundImagePanel';
        panel.className = 'panel-floating';
        panel.dataset.buttonId = 'footerLiveBackgroundBtn';
        
        // Get button position for panel positioning
        const button = document.getElementById('footerLiveBackgroundBtn');
        const buttonRect = button.getBoundingClientRect();
        
        // Position panel below button, left-aligned
        panel.style.left = `${buttonRect.left}px`;
        panel.style.top = `${buttonRect.bottom + 4}px`; // 4px gap below button
        panel.style.display = 'block';
        
        // Panel content - use new CSS classes
        panel.innerHTML = `
            <div class="panel-header">
                <span>Background Image</span>
                <button class="panel-close-btn">×</button>
            </div>
            <div class="panel-content">
            
            <!-- Image Selection -->
            <div class="control-group">
                <button class="control-btn" id="panelBackgroundSelect">Select Image</button>
                <div class="background-file-info" id="panelBackgroundFileInfo" style="display: none;">
                    <div class="file-preview-container">
                        <div class="image-preview" id="panelBackgroundImagePreview"></div>
                        <div class="file-details">
                            <div class="file-name" id="panelBackgroundFileName"></div>
                            <div class="file-size" id="panelBackgroundFileSize"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Background Image Toggle -->
            <div class="control-group">
                <button class="btn-toggle" id="panelBackgroundToggle" title="Toggle Background Image">
                    <span class="background-text">Background IMG: ${this.backgroundImageEnabled ? 'ON' : 'OFF'}</span>
                </button>
            </div>
            
            <!-- Opacity -->
            <div class="control-group">
                <div class="slider-1-wrapper">
                    <label class="slider-label">Opacity</label>
                    <input type="range" id="panelOpacitySlider" class="slider-1" min="0" max="100" value="${this.backgroundImageOpacity || 100}">
                    <span class="slider-1-value" id="panelOpacityValue">${this.backgroundImageOpacity || 100}%</span>
                </div>
            </div>

            <!-- Saturation -->
            <div class="control-group">
                <div class="slider-1-wrapper">
                    <label class="slider-label">Saturation</label>
                    <input type="range" id="panelSaturationSlider" class="slider-1" min="0" max="200" value="${this.backgroundImageSaturation || 100}">
                    <span class="slider-1-value" id="panelSaturationValue">${this.backgroundImageSaturation || 100}%</span>
                </div>
            </div>
            
            <!-- Posterization -->
            <div class="control-group">
                <div class="slider-1-wrapper">
                    <label class="slider-label">Posterization</label>
                    <input type="range" id="panelPosterizeSlider" class="slider-1" min="0" max="16" value="${this.backgroundImagePosterize || 16}">
                    <span class="slider-1-value" id="panelPosterizeValue">${this.backgroundImagePosterize || 16}</span>
                </div>
            </div>
            
            <!-- Contrast -->
            <div class="control-group">
                <div class="slider-1-wrapper">
                    <label class="slider-label">Contrast</label>
                    <input type="range" id="panelContrastSlider" class="slider-1" min="0" max="200" value="${this.backgroundImageContrast || 100}">
                    <span class="slider-1-value" id="panelContrastValue">${this.backgroundImageContrast || 100}%</span>
                </div>
            </div>
            
            <!-- Sizing -->
            <div class="control-group">
                <div class="group-label">Sizing</div>
                <div class="button-group">
                    <button class="size-btn" id="panelBackgroundSizeFit" data-size="fit">Fit</button>
                    <button class="size-btn" id="panelBackgroundSizeFill" data-size="fill">Fill</button>
                    <button class="size-btn" id="panelBackgroundSizeStretch" data-size="stretch">Stretch</button>
                    <button class="size-btn active" id="panelBackgroundSizeOriginal" data-size="original">Original</button>
                </div>
            </div>
            
            <!-- Clear Background -->
            <div class="control-group">
                <button class="control-btn clear-btn" id="panelBackgroundClear">Clear Background</button>
            </div>
            </div>
        `;
        
        // Add event listeners
        this.setupBackgroundPanelEvents(panel);
        
        // Add to document
        document.body.appendChild(panel);
        
        // Update active states
        this.updateBackgroundPanelStates(panel);
        
        // Also update file info if image already exists
        if (this.backgroundImage && this.backgroundImageFileName) {
        this.updateBackgroundPanelStates(panel);
        }
    }

    setupBackgroundPanelEvents(panel) {
        // Close button
        const closeBtn = panel.querySelector('.panel-close-btn');
        closeBtn.addEventListener('click', () => {
            panel.remove();
        });
        
        // Toggle button
        const toggleBtn = panel.querySelector('#panelBackgroundToggle');
        toggleBtn.addEventListener('click', () => {
            this.toggleBackgroundImage();
            const backgroundText = toggleBtn.querySelector('.background-text');
            backgroundText.textContent = `Background IMG: ${this.backgroundImageEnabled ? 'ON' : 'OFF'}`;
            toggleBtn.classList.toggle('active', this.backgroundImageEnabled);
        });
        
        // Select image button
        const selectBtn = panel.querySelector('#panelBackgroundSelect');
        selectBtn.addEventListener('click', () => {
            const backgroundImageFile = document.getElementById('backgroundImageFile');
            if (backgroundImageFile) {
                backgroundImageFile.click();
            }
        });
        
        // Opacity slider
        const opacitySlider = panel.querySelector('#panelOpacitySlider');
        const opacityValue = panel.querySelector('#panelOpacityValue');
        opacitySlider.addEventListener('input', (e) => {
            this.backgroundImageOpacity = parseInt(e.target.value);
            opacityValue.textContent = `${this.backgroundImageOpacity}%`;
            this.saveBackgroundImage();
        });
        
        // Saturation slider
        const saturationSlider = panel.querySelector('#panelSaturationSlider');
        const saturationValue = panel.querySelector('#panelSaturationValue');
        saturationSlider.addEventListener('input', (e) => {
            this.backgroundImageSaturation = parseInt(e.target.value);
            saturationValue.textContent = `${this.backgroundImageSaturation}%`;
            this.saveBackgroundImage();
        });
        
        // Posterize slider
        const posterizeSlider = panel.querySelector('#panelPosterizeSlider');
        const posterizeValue = panel.querySelector('#panelPosterizeValue');
        posterizeSlider.addEventListener('input', (e) => {
            this.backgroundImagePosterize = parseInt(e.target.value);
            posterizeValue.textContent = this.backgroundImagePosterize;
            this.saveBackgroundImage();
        });
        
        // Contrast slider
        const contrastSlider = panel.querySelector('#panelContrastSlider');
        const contrastValue = panel.querySelector('#panelContrastValue');
        contrastSlider.addEventListener('input', (e) => {
            this.backgroundImageContrast = parseInt(e.target.value);
            contrastValue.textContent = `${this.backgroundImageContrast}%`;
            this.saveBackgroundImage();
        });
        
        // Size buttons
        const sizeBtns = panel.querySelectorAll('.size-btn');
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = e.target.getAttribute('data-size');
                this.backgroundImageSize = size;
                this.saveBackgroundImage();
                
                // Update active state
                sizeBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Clear button
        const clearBtn = panel.querySelector('#panelBackgroundClear');
        clearBtn.addEventListener('click', () => {
            this.clearBackgroundImage();
            this.updateFooterBackgroundButton(); // Update B button state
            panel.remove();
        });
    }

    updateBackgroundPanelStates(panel) {
        // Update toggle button
        const toggleBtn = panel.querySelector('#panelBackgroundToggle');
        const backgroundText = toggleBtn.querySelector('.background-text');
        backgroundText.textContent = `Background IMG: ${this.backgroundImageEnabled ? 'ON' : 'OFF'}`;
        toggleBtn.classList.toggle('active', this.backgroundImageEnabled);
        
        // Update file info display
        const fileInfo = panel.querySelector('#panelBackgroundFileInfo');
        const fileName = panel.querySelector('#panelBackgroundFileName');
        const fileSize = panel.querySelector('#panelBackgroundFileSize');
        const imagePreview = panel.querySelector('#panelBackgroundImagePreview');
        
        if (fileInfo && fileName && fileSize && imagePreview) {
            if (this.backgroundImage && this.backgroundImageFileName) {
                //     fileName: this.backgroundImageFileName,
                //     fileSize: this.backgroundImageFileSize,
                //     hasImage: !!this.backgroundImage
                // });
                
                fileInfo.style.display = 'block';
                fileName.textContent = this.backgroundImageFileName;
                fileSize.textContent = this.backgroundImageFileSize ? this.formatFileSize(this.backgroundImageFileSize) : '';
                
                // Create preview image
                const img = new Image();
                img.onload = () => {
                    imagePreview.innerHTML = '';
                    imagePreview.appendChild(img);
                };
                img.onerror = (e) => {
                };
                img.src = this.backgroundImage;
            } else {
                fileInfo.style.display = 'none';
            }
        } else {
            //     fileInfo: !!fileInfo,
            //     fileName: !!fileName,
            //     fileSize: !!fileSize,
            //     imagePreview: !!imagePreview
            // });
        }
        
        // Update size buttons
        const sizeBtns = panel.querySelectorAll('.size-btn');
        sizeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-size') === this.backgroundImageSize);
        });
    }

    toggleBackgroundImage() {
        // Toggle background image enabled state using existing functionality
        this.backgroundImageEnabled = !this.backgroundImageEnabled;
        this.saveBackgroundImage();
        this.updateFooterBackgroundButton();
        this.updateBackgroundImageElement();
        
        // Re-apply z-indexes after background image visibility change
        if (window.pluginMixerIntegration) {
            window.pluginMixerIntegration.reapplyZIndexes();
        }
        
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    updateFooterBackgroundButton() {
        const footerBtn = document.getElementById('footerLiveBackgroundBtn');
        if (!footerBtn) return;

        // Check if background image is enabled
        const isActive = this.backgroundImageEnabled && this.backgroundImage;
        
        if (isActive) {
            footerBtn.classList.add('active');
        } else {
            footerBtn.classList.remove('active');
        }
    }

    saveBackgroundImage() {
        // Save background image settings to localStorage
        const settings = {
            backgroundImage: this.backgroundImage,
            backgroundImageEnabled: this.backgroundImageEnabled,
            backgroundImageOpacity: this.backgroundImageOpacity || 100,
            backgroundImageSaturation: this.backgroundImageSaturation || 100,
            backgroundImagePosterize: this.backgroundImagePosterize || 16,
            backgroundImageContrast: this.backgroundImageContrast || 100,
            backgroundImageSize: this.backgroundImageSize || 'medium'
        };
        localStorage.setItem('backgroundImageSettings', JSON.stringify(settings));
    }

    clearBackgroundImage() {
        // Clear background image and reset settings
        this.backgroundImage = null;
        this.backgroundImageEnabled = false;
        this.backgroundImageOpacity = 100;
        this.backgroundImageSaturation = 100;
        this.backgroundImagePosterize = 16;
        this.backgroundImageContrast = 100;
        this.backgroundImageSize = 'original';
        this.saveBackgroundImage();
        this.updateFooterBackgroundButton();
        
        // Update sidebar UI if it exists
        if (window.visualizer && window.visualizer.updateBackgroundImageUI) {
            window.visualizer.updateBackgroundImageUI();
        }
    }

    loadBackgroundImageSettings() {
        // Load background image settings from localStorage
        try {
            const saved = localStorage.getItem('backgroundImageSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.backgroundImage = settings.backgroundImage || null;
                this.backgroundImageEnabled = settings.backgroundImageEnabled || false;
                this.backgroundImageOpacity = settings.backgroundImageOpacity || 100;
                this.backgroundImageSaturation = settings.backgroundImageSaturation || 100;
                this.backgroundImagePosterize = settings.backgroundImagePosterize || 16;
                this.backgroundImageContrast = settings.backgroundImageContrast || 100;
                this.backgroundImageSize = settings.backgroundImageSize || 'medium';
                
                // Update footer button state
                this.updateFooterBackgroundButton();
            }
        } catch (error) {
            console.error('Error loading background image settings:', error);
        }
    }

    showPlaylistPanel() {
        this.closeAllPanels(); // CLOSE ALL PANELS FIRST
        // Create playlist panel
        this.createPlaylistPanel();
    }

    showVisualizerPanel() {
        // Show the header AM visualizer panel
        const panel = document.getElementById('headerVisualizerPanel');
        if (panel) {
            // Toggle panel visibility
            if (panel.style.display === 'none' || !panel.style.display) {
                this.closeAllPanels(); // CLOSE ALL PANELS FIRST
                // Position panel relative to the visualizer button
                const button = document.getElementById('footerVisualizerBtn');
                if (button) {
                    const rect = button.getBoundingClientRect();
                    panel.style.position = 'fixed';
                    panel.style.left = rect.left + 'px';
                    panel.style.top = (rect.bottom + 5) + 'px';
                    panel.style.zIndex = '10000';
                }
                panel.style.display = 'block';
                
                // Connect functionality to static HTML elements
                this.connectStaticHeaderElements();
                
            } else {
                panel.style.display = 'none';
            }
        } else {
        }
    }

    connectStaticHeaderElements() {
        // Connect static HTML elements to existing functionality
        const loadPresetSelect = document.getElementById('headerPresetSelector');
        const savePresetBtn = document.getElementById('headerSavePresetBtn');
        const exportPresetsBtn = document.getElementById('headerExportPresetsBtn');
        const importPresetsBtn = document.getElementById('headerImportPresetsBtn');
        const importPresetsFile = document.getElementById('headerImportPresetsFile');
        const clearAllPresetsBtn = document.getElementById('clearAllPresetsBtn');
        
        const spectrumButton = document.getElementById('headerVizModeToggle');
        const spectrumDropdownContent = document.getElementById('headerVizModeDropdown');
        const onButton = document.getElementById('headerVizToggleBtn');
        const randomButton = document.getElementById('headerRandomVizBtn');
        
        const colorSchemeButton = document.getElementById('headerColorSchemeToggle');
        const colorSchemeDropdownContent = document.getElementById('headerColorSchemeDropdown');

        // Connect functionality if elements exist
        if (loadPresetSelect && savePresetBtn && exportPresetsBtn && importPresetsBtn && importPresetsFile && clearAllPresetsBtn) {
            this.connectHeaderPresetsFunctionality(loadPresetSelect, savePresetBtn, exportPresetsBtn, importPresetsBtn, importPresetsFile, clearAllPresetsBtn);
            // Load existing presets into dropdown
            this.loadPresetOptions(loadPresetSelect);
        }
        
        if (spectrumButton && spectrumDropdownContent && onButton && randomButton) {
            this.connectHeaderSpectrumFunctionality(spectrumButton, spectrumDropdownContent, onButton, randomButton);
        }
        
        if (colorSchemeButton && colorSchemeDropdownContent) {
            this.connectHeaderColorSchemeFunctionality(colorSchemeButton, colorSchemeDropdownContent);
        }
        
        // Connect dropdown item functionality
        this.connectDropdownItems();
        
    }

    connectDropdownItems() {
        // Connect spectrum mode dropdown items
        const spectrumDropdownItems = document.querySelectorAll('#headerVizModeDropdown .dropdown-item');
        spectrumDropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const mode = parseInt(e.target.getAttribute('data-mode'));
                if (!isNaN(mode)) {
                    // Switch back to custom analyzer if using official
                    if (this.useOfficialAudioMotion) {
                        this.switchToCustomAnalyzer();
                    }
                    
                    // Update lastRegularMode so switchToCustomAnalyzer doesn't override our explicit choice
                    this.lastRegularMode = mode;
                    
                    this.setVisualizationMode(mode);
                    
                    // Update button text and dropdown
                    const spectrumButton = document.getElementById('headerVizModeToggle');
                    if (spectrumButton) {
                        spectrumButton.textContent = e.target.textContent;
                    }
                    
                    // Update active state
                    spectrumDropdownItems.forEach(dropdownItem => dropdownItem.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Close dropdown
                    const dropdown = document.getElementById('headerVizModeDropdown');
                    if (dropdown) {
                        dropdown.style.display = 'none';
                    }
                }
            });
        });
        
        // Connect color scheme dropdown items
        const colorSchemeDropdownItems = document.querySelectorAll('#headerColorSchemeDropdown .dropdown-item');
        colorSchemeDropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const scheme = e.target.getAttribute('data-scheme');
                if (scheme) {
                    this.setColorScheme(scheme);
                    
                    // Update button text and dropdown
                    const colorSchemeButton = document.getElementById('headerColorSchemeToggle');
                    if (colorSchemeButton) {
                        colorSchemeButton.textContent = e.target.textContent;
                    }
                    
                    // Update active state
                    colorSchemeDropdownItems.forEach(dropdownItem => dropdownItem.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Close dropdown
                    const dropdown = document.getElementById('headerColorSchemeDropdown');
                    if (dropdown) {
                        dropdown.style.display = 'none';
                    }
                }
            });
        });
        
    }

    createPlaylistPanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('playlistPanel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        // Get button position for panel positioning
        const button = document.getElementById('footerPlaylistBtn');
        if (!button) {
            console.error('Footer Playlist button not found');
            return;
        }
        
        const buttonRect = button.getBoundingClientRect();
        
        // Create panel container using panel-floating structure
        const panel = document.createElement('div');
        panel.id = 'playlistPanel';
        panel.className = 'panel-floating';
        panel.dataset.buttonId = 'footerPlaylistBtn';
        panel.style.left = `${buttonRect.left}px`;
        panel.style.top = `${buttonRect.top - 4}px`;
        panel.style.transform = 'translateY(-100%)';
        panel.style.display = 'block';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'panel-header';
        
        const title = document.createElement('span');
        title.textContent = 'Playlist';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'panel-close-btn';
        closeBtn.textContent = '×';
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create content
        const content = document.createElement('div');
        content.className = 'panel-content';
        
        // Playlist Actions
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'playlist-actions-dropdown';
        
        const scanBtn = document.createElement('button');
        scanBtn.className = 'btn-primary';
        scanBtn.id = 'panelPlaylistScanBtn';
        scanBtn.title = 'Add Music Folder';
        scanBtn.textContent = 'Add Folder';
        
        const importBtn = document.createElement('button');
        importBtn.className = 'btn-secondary';
        importBtn.id = 'panelPlaylistImportBtn';
        importBtn.title = 'Import Playlist';
        importBtn.textContent = 'Import';
        
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn-secondary';
        exportBtn.id = 'panelPlaylistExportBtn';
        exportBtn.title = 'Export Playlist';
        exportBtn.textContent = 'Export';
        
        actionsContainer.appendChild(scanBtn);
        actionsContainer.appendChild(importBtn);
        actionsContainer.appendChild(exportBtn);
        
        // Scanning Progress (hidden by default)
        const progressContainer = document.createElement('div');
        progressContainer.className = 'playlist-progress';
        progressContainer.id = 'panelPlaylistProgress';
        progressContainer.style.display = 'none';
        
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'progress-bar-container';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.id = 'panelProgressBar';
        
        progressBarContainer.appendChild(progressBar);
        
        const progressInfo = document.createElement('div');
        progressInfo.className = 'progress-info';
        
        const progressText = document.createElement('span');
        progressText.className = 'progress-text';
        progressText.id = 'panelProgressText';
        progressText.textContent = 'Scanning music folder...';
        
        const progressCount = document.createElement('span');
        progressCount.className = 'progress-count';
        progressCount.id = 'panelProgressCount';
        progressCount.textContent = '0/0 files';
        
        const progressEta = document.createElement('span');
        progressEta.className = 'progress-eta';
        progressEta.id = 'panelProgressEta';
        progressEta.textContent = 'Est: calculating...';
        
        progressInfo.appendChild(progressText);
        progressInfo.appendChild(progressCount);
        progressInfo.appendChild(progressEta);
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary progress-cancel-btn';
        cancelBtn.id = 'panelProgressCancelBtn';
        cancelBtn.textContent = 'Cancel';
        
        progressContainer.appendChild(progressBarContainer);
        progressContainer.appendChild(progressInfo);
        progressContainer.appendChild(cancelBtn);
        
        // Playlist Stats
        const statsContainer = document.createElement('div');
        statsContainer.className = 'playlist-stats';
        statsContainer.id = 'panelPlaylistStats';
        
        const trackCount = document.createElement('span');
        trackCount.className = 'playlist-track-count';
        trackCount.id = 'panelPlaylistTrackCount';
        trackCount.textContent = 'No tracks loaded';
        
        const duration = document.createElement('span');
        duration.className = 'playlist-duration';
        duration.id = 'panelPlaylistDuration';
        duration.textContent = '0:00:00';
        
        statsContainer.appendChild(trackCount);
        statsContainer.appendChild(duration);
        
        // Tracks Container
        const tracksContainer = document.createElement('div');
        tracksContainer.className = 'playlist-tracks-container';
        tracksContainer.id = 'panelPlaylistTracksContainer';
        
        const tracksList = document.createElement('div');
        tracksList.className = 'playlist-tracks';
        tracksList.id = 'panelPlaylistTracks';
        
        // Empty playlist state
        const emptyPlaylist = document.createElement('div');
        emptyPlaylist.className = 'empty-playlist';
        
        const emptyIcon = document.createElement('div');
        emptyIcon.className = 'empty-playlist-icon';
        emptyIcon.textContent = '🎵';
        
        const emptyText = document.createElement('div');
        emptyText.className = 'empty-playlist-text';
        emptyText.textContent = 'No music loaded';
        
        const emptySubtext = document.createElement('div');
        emptySubtext.className = 'empty-playlist-subtext';
        emptySubtext.textContent = 'Click "Add Folder" to scan your music library';
        
        emptyPlaylist.appendChild(emptyIcon);
        emptyPlaylist.appendChild(emptyText);
        emptyPlaylist.appendChild(emptySubtext);
        
        tracksList.appendChild(emptyPlaylist);
        tracksContainer.appendChild(tracksList);
        
        // Assemble content
        content.appendChild(actionsContainer);
        content.appendChild(progressContainer);
        content.appendChild(statsContainer);
        content.appendChild(tracksContainer);
        
        // Assemble panel
        panel.appendChild(header);
        panel.appendChild(content);
        
        // Add event listeners
        this.setupPlaylistPanelEvents(panel);
        
        // Add to document
        document.body.appendChild(panel);
        
        // Add click-outside-to-close logic
        const closeOnOutsideClick = (e) => {
            const importInput = document.getElementById('playlistImportInput');
            if (!panel.contains(e.target) && e.target !== button && e.target !== importInput) {
                panel.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        
        // Add click listener after a short delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);
    }

    setupPlaylistPanelEvents(panel) {
        // Close button
        const closeBtn = panel.querySelector('.panel-close-btn');
        closeBtn.addEventListener('click', () => {
            panel.remove();
        });

        // Scan button - Add Music Folder
        const scanBtn = panel.querySelector('#panelPlaylistScanBtn');
        if (scanBtn && this.playlistManager) {
            scanBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playlistManager.scanFolder();
            });
        }

        // Import button
        const importBtn = panel.querySelector('#panelPlaylistImportBtn');
        if (importBtn) {
            importBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const importInput = document.getElementById('playlistImportInput');
                if (importInput) {
                    importInput.click();
                }
            });
        }

        // Set up import handler for panel
        const importInput = document.getElementById('playlistImportInput');
        if (importInput) {
            // Remove any existing panel import handler
            importInput.removeEventListener('change', this._panelImportHandler);
            this._panelImportHandler = async (e) => {
                const file = e.target.files?.[0];
                if (file && this.playlistManager) {
                    await this.playlistManager.importPlaylist(file);
                    // Update panel display after import
                    this.updatePlaylistPanelDisplay(panel);
                }
                e.target.value = ''; // Reset input
            };
            importInput.addEventListener('change', this._panelImportHandler);
        }

        // Export button
        const exportBtn = panel.querySelector('#panelPlaylistExportBtn');
        if (exportBtn && this.playlistManager) {
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playlistManager.exportPlaylist();
            });
        }

        // Progress cancel button
        const cancelBtn = panel.querySelector('#panelProgressCancelBtn');
        if (cancelBtn && this.playlistManager) {
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playlistManager.cancelScan();
            });
        }

        // Initialize panel content by copying from sidebar
        this.initializePlaylistPanelContent(panel);

        // Store panel reference for updates
        this.currentPlaylistPanel = panel;
    }

    createVisualizerPanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('visualizerPanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Get button position
        const button = document.getElementById('footerVisualizerBtn');
        if (!button) {
            console.error('Footer Visualizer button not found');
            return;
        }

        const buttonRect = button.getBoundingClientRect();
        
        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'visualizerPanel';
        panel.className = 'panel-floating';
        panel.dataset.buttonId = 'footerVisualizerBtn';
        panel.style.display = 'block';
        panel.style.left = `${buttonRect.left}px`;
        panel.style.top = `${buttonRect.bottom + 5}px`;

        // Create header
        const header = document.createElement('div');
        header.className = 'panel-header';
        
        const title = document.createElement('span');
        title.textContent = 'Visualizer';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'panel-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => panel.remove();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Create content container
        const content = document.createElement('div');
        content.className = 'panel-content';
        panel.appendChild(content);

        // Create presets section
        const presetsSection = document.createElement('div');
        presetsSection.style.cssText = `
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
        `;

        // Presets label
        const presetsLabel = document.createElement('div');
        presetsLabel.textContent = 'Presets';
        presetsLabel.style.cssText = `
            color: var(--text-primary);
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
        `;
        presetsSection.appendChild(presetsLabel);

        // Presets controls container
        const presetsControls = document.createElement('div');
        presetsControls.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
        `;

        // Load preset dropdown
        const loadPresetSelect = document.createElement('select');
        loadPresetSelect.id = 'headerPresetSelector';
        loadPresetSelect.title = 'Load Saved Preset';
        loadPresetSelect.style.cssText = `
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 6px 8px;
            border-radius: 4px;
            font-size: 12px;
            width: 100%;
            max-height: 200px;
            overflow-y: auto;
        `;
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Load Preset...';
        loadPresetSelect.appendChild(defaultOption);

        // Load existing presets
        this.loadPresetOptions(loadPresetSelect);

        // Preset action buttons container
        const presetButtons = document.createElement('div');
        presetButtons.style.cssText = `
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        `;

        // Save preset button
        const savePresetBtn = document.createElement('button');
        savePresetBtn.id = 'headerSavePresetBtn';
        savePresetBtn.textContent = 'Save';
        savePresetBtn.title = 'Save Current as Preset';
        savePresetBtn.style.cssText = `
            background: var(--hover-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            flex: 1;
        `;

        // Export presets button
        const exportPresetsBtn = document.createElement('button');
        exportPresetsBtn.id = 'headerExportPresetsBtn';
        exportPresetsBtn.textContent = 'Export';
        exportPresetsBtn.title = 'Export All Presets';
        exportPresetsBtn.style.cssText = `
            background: var(--hover-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            flex: 1;
        `;

        // Import presets button
        const importPresetsBtn = document.createElement('button');
        importPresetsBtn.id = 'headerImportPresetsBtn';
        importPresetsBtn.textContent = 'Import';
        importPresetsBtn.title = 'Import Presets';
        importPresetsBtn.style.cssText = `
            background: var(--hover-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            flex: 1;
        `;

        // Hidden file input for import
        const importPresetsFile = document.createElement('input');
        importPresetsFile.type = 'file';
        importPresetsFile.id = 'headerImportPresetsFile';
        importPresetsFile.accept = '.json';
        importPresetsFile.style.display = 'none';

        // Add elements to containers
        presetButtons.appendChild(savePresetBtn);
        presetButtons.appendChild(exportPresetsBtn);
        presetButtons.appendChild(importPresetsBtn);

        presetsControls.appendChild(loadPresetSelect);
        presetsControls.appendChild(presetButtons);
        presetsControls.appendChild(importPresetsFile);

        presetsSection.appendChild(presetsControls);
        content.appendChild(presetsSection);

        // Create spectrum controls section
        const spectrumSection = document.createElement('div');
        spectrumSection.style.cssText = `
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
        `;

        // Spectrum label
        const spectrumLabel = document.createElement('div');
        spectrumLabel.textContent = 'Spectrum';
        spectrumLabel.style.cssText = `
            color: var(--text-primary);
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
        `;
        spectrumSection.appendChild(spectrumLabel);

        // Spectrum controls container
        const spectrumControls = document.createElement('div');
        spectrumControls.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
        `;

        // Spectrum dropdown and ON button container
        const spectrumTopRow = document.createElement('div');
        spectrumTopRow.style.cssText = `
            display: flex;
            gap: 6px;
            align-items: center;
        `;

        // Spectrum dropdown
        const spectrumDropdown = document.createElement('div');
        spectrumDropdown.style.cssText = `
            flex: 1;
            position: relative;
        `;

        const spectrumButton = document.createElement('button');
        spectrumButton.id = 'headerVizModeToggle';
        spectrumButton.textContent = 'Radial Spectrum';
        spectrumButton.style.cssText = `
            background: var(--hover-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 6px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            width: 100%;
            text-align: left;
        `;

        const spectrumDropdownContent = document.createElement('div');
        spectrumDropdownContent.id = 'headerVizModeDropdown';
        spectrumDropdownContent.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            z-index: 1000;
            display: none;
            max-height: 200px;
            overflow-y: auto;
        `;

        // Add spectrum options
        const spectrumOptions = [
            { id: 0, name: 'Spectrum' },
            { id: 1, name: 'Mirror Wave' },
            { id: 2, name: 'Classic LED' },
            { id: 3, name: 'Stereo' },
            { id: 4, name: 'Radial Spectrum' },
            { id: 5, name: 'Energy' },
            { id: 6, name: 'Mirror' }
        ];

        spectrumOptions.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dropdown-item';
            optionDiv.setAttribute('data-mode', option.id);
            optionDiv.textContent = option.name;
            optionDiv.style.cssText = `
                padding: 6px 8px;
                cursor: pointer;
                font-size: 12px;
                color: var(--text-primary);
            `;
            
            if (option.id === 4) { // Radial Spectrum is default
                optionDiv.classList.add('active');
            }
            
            optionDiv.addEventListener('click', () => {
                this.setVisualizationMode(option.id);
                spectrumButton.textContent = option.name;
                spectrumDropdownContent.style.display = 'none';
                
                // Update active state
                spectrumDropdownContent.querySelectorAll('.dropdown-item').forEach(item => {
                    item.classList.remove('active');
                });
                optionDiv.classList.add('active');
            });
            
            spectrumDropdownContent.appendChild(optionDiv);
        });

        spectrumDropdown.appendChild(spectrumButton);
        spectrumDropdown.appendChild(spectrumDropdownContent);

        // ON button
        const onButton = document.createElement('button');
        onButton.id = 'headerVizToggleBtn';
        onButton.textContent = 'ON';
        onButton.title = 'Toggle Visualization';
        onButton.style.cssText = `
            background: var(--accent-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            white-space: nowrap;
        `;

        spectrumTopRow.appendChild(spectrumDropdown);
        spectrumTopRow.appendChild(onButton);

        // Random button
        const randomButton = document.createElement('button');
        randomButton.id = 'headerRandomVizBtn';
        randomButton.textContent = 'Random';
        randomButton.title = 'Random Visualization';
        randomButton.style.cssText = `
            background: var(--hover-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 6px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            width: 100%;
        `;

        spectrumControls.appendChild(spectrumTopRow);
        spectrumControls.appendChild(randomButton);
        spectrumSection.appendChild(spectrumControls);
        content.appendChild(spectrumSection);

        // Create color scheme controls section
        const colorSchemeSection = document.createElement('div');
        colorSchemeSection.style.cssText = `
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
        `;

        // Color scheme label
        const colorSchemeLabel = document.createElement('div');
        colorSchemeLabel.textContent = 'Color Scheme';
        colorSchemeLabel.style.cssText = `
            color: var(--text-primary);
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
        `;
        colorSchemeSection.appendChild(colorSchemeLabel);

        // Color scheme dropdown
        const colorSchemeDropdown = document.createElement('div');
        colorSchemeDropdown.style.cssText = `
            position: relative;
        `;

        const colorSchemeButton = document.createElement('button');
        colorSchemeButton.id = 'headerColorSchemeToggle';
        colorSchemeButton.textContent = 'Default';
        colorSchemeButton.style.cssText = `
            background: var(--hover-color);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 6px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            width: 100%;
            text-align: left;
        `;

        const colorSchemeDropdownContent = document.createElement('div');
        colorSchemeDropdownContent.id = 'headerColorSchemeDropdown';
        colorSchemeDropdownContent.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            z-index: 1000;
            display: none;
            max-height: 200px;
            overflow-y: auto;
        `;

        // Add color scheme options
        const colorSchemeOptions = [
            { id: 'default', name: 'Default' },
            { id: 'earthtones', name: 'Earthtones' },
            { id: 'luigi', name: 'Luigi' },
            { id: 'metal', name: 'Heavy Metal' },
            { id: 'psychedelic', name: 'Psychedelic' }
        ];

        colorSchemeOptions.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dropdown-item';
            optionDiv.setAttribute('data-scheme', option.id);
            optionDiv.textContent = option.name;
            optionDiv.style.cssText = `
                padding: 6px 8px;
                cursor: pointer;
                font-size: 12px;
                color: var(--text-primary);
            `;
            
            if (option.id === 'default') {
                optionDiv.classList.add('active');
            }
            
            optionDiv.addEventListener('click', () => {
                this.setColorScheme(option.id);
                colorSchemeButton.textContent = option.name;
                colorSchemeDropdownContent.style.display = 'none';
                
                // Update active state
                colorSchemeDropdownContent.querySelectorAll('.dropdown-item').forEach(item => {
                    item.classList.remove('active');
                });
                optionDiv.classList.add('active');
            });
            
            colorSchemeDropdownContent.appendChild(optionDiv);
        });

        colorSchemeDropdown.appendChild(colorSchemeButton);
        colorSchemeDropdown.appendChild(colorSchemeDropdownContent);
        colorSchemeSection.appendChild(colorSchemeDropdown);
        content.appendChild(colorSchemeSection);

        // Create visualization mode list
        const modeList = document.createElement('div');
        modeList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Add visualization modes
        const modes = [
            { id: 0, name: 'Spectrum' },
            { id: 1, name: 'Mirror Wave' },
            { id: 2, name: 'Classic LED' },
            { id: 3, name: 'Stereo' },
            { id: 4, name: 'Radial Spectrum' },
            { id: 5, name: 'Energy' },
            { id: 6, name: 'Mirror' }
        ];

        modes.forEach(mode => {
            const modeBtn = document.createElement('button');
            modeBtn.style.cssText = `
                background: var(--hover-color);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
                font-size: 12px;
            `;
            
            modeBtn.textContent = mode.name;
            modeBtn.onclick = () => {
                // Set the visualization mode
                this.setVisualizationMode(mode.id);
                
                // Turn ON visualization if it's not already on
                if (!this.visualizationEnabled) {
                    this.visualizationEnabled = true;
                    
                    // Sidebar toggle button removed - functionality moved to header
                    
                    // Update footer visualizer button state
                    this.updateFooterVisualizerButton();
                    
                    // Resume visualization if audioMotion exists
                    if (this.audioMotion) {
                        this.audioMotion.animate();
                    }
                }
                
                // Close the panel
                panel.remove();
            };
            
            modeBtn.onmouseover = () => {
                modeBtn.style.background = '#404040';
            };
            modeBtn.onmouseout = () => {
                modeBtn.style.background = 'var(--hover-color)';
            };
            
            modeList.appendChild(modeBtn);
        });

        content.appendChild(modeList);
        
        // Add to document
        document.body.appendChild(panel);

        // Add click-outside-to-close logic
        const closeOnOutsideClick = (e) => {
            if (!panel.contains(e.target) && e.target !== button) {
                panel.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 100);

        // Connect presets functionality
        this.connectHeaderPresetsFunctionality(loadPresetSelect, savePresetBtn, exportPresetsBtn, importPresetsBtn, importPresetsFile);
        
        // Connect spectrum functionality
        this.connectHeaderSpectrumFunctionality(spectrumButton, spectrumDropdownContent, onButton, randomButton);
        
        // Connect color scheme functionality
        this.connectHeaderColorSchemeFunctionality(colorSchemeButton, colorSchemeDropdownContent);
    }

    connectHeaderPresetsFunctionality(loadPresetSelect, savePresetBtn, exportPresetsBtn, importPresetsBtn, importPresetsFile, clearAllPresetsBtn) {
        // Prevent duplicate event listeners by checking if already connected
        if (savePresetBtn.dataset.connected === 'true') {
            return;
        }
        
        // Connect load preset functionality
        loadPresetSelect.addEventListener('change', (e) => {
            const presetIndex = e.target.value;
            if (presetIndex !== '') {
                // Use existing preset loading functionality
                this.loadPreset(parseInt(presetIndex));
                // Reset dropdown
                e.target.value = '';
            }
        });

        // Connect save preset functionality
        savePresetBtn.addEventListener('click', () => {
            const presetName = prompt('Enter preset name:');
            if (presetName) {
                console.log('Saving preset:', presetName);
                this.saveCurrentAsPreset(presetName);
                console.log('Presets after save:', this.savedPresets);
                // Refresh the dropdown options
                this.loadPresetOptions(loadPresetSelect);
                console.log('Dropdown options refreshed');
            }
        });

        // Connect export presets functionality
        exportPresetsBtn.addEventListener('click', () => {
            this.exportPresets();
        });

        // Connect import presets functionality
        importPresetsBtn.addEventListener('click', () => {
            importPresetsFile.click();
        });

        importPresetsFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importPresets(file);
                // Refresh the dropdown options
                this.loadPresetOptions(loadPresetSelect);
                // Reset file input
                e.target.value = '';
            }
        });

        // Connect clear all presets functionality
        clearAllPresetsBtn.addEventListener('click', () => {
            this.showClearPresetsModal();
        });
        
        // Mark as connected to prevent duplicate event listeners
        savePresetBtn.dataset.connected = 'true';
        exportPresetsBtn.dataset.connected = 'true';
        importPresetsBtn.dataset.connected = 'true';
        loadPresetSelect.dataset.connected = 'true';
        importPresetsFile.dataset.connected = 'true';
        clearAllPresetsBtn.dataset.connected = 'true';
    }

    connectHeaderSpectrumFunctionality(spectrumButton, spectrumDropdownContent, onButton, randomButton) {
        // Connect spectrum dropdown toggle
        spectrumButton.addEventListener('click', (e) => {
            e.stopPropagation();
            spectrumDropdownContent.style.display = spectrumDropdownContent.style.display === 'none' ? 'block' : 'none';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!spectrumButton.contains(e.target) && !spectrumDropdownContent.contains(e.target)) {
                spectrumDropdownContent.style.display = 'none';
            }
        });

        // Connect ON button functionality
        onButton.addEventListener('click', () => {
            this.toggleVisualization();
            // Update button text
            onButton.textContent = this.visualizationEnabled ? 'ON' : 'OFF';
            onButton.style.background = this.visualizationEnabled ? 'var(--accent-color)' : 'var(--hover-color)';
        });

        // Connect Random button functionality
        randomButton.addEventListener('click', () => {
            this.setRandomVisualization();
            // Update spectrum button text to show random
            spectrumButton.textContent = 'Random';
        });

        // Sync initial state
        onButton.textContent = this.visualizationEnabled ? 'ON' : 'OFF';
        onButton.style.background = this.visualizationEnabled ? 'var(--accent-color)' : 'var(--hover-color)';
    }

    connectHeaderColorSchemeFunctionality(colorSchemeButton, colorSchemeDropdownContent) {
        // Connect color scheme dropdown toggle
        colorSchemeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            colorSchemeDropdownContent.style.display = colorSchemeDropdownContent.style.display === 'none' ? 'block' : 'none';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!colorSchemeButton.contains(e.target) && !colorSchemeDropdownContent.contains(e.target)) {
                colorSchemeDropdownContent.style.display = 'none';
            }
        });

        // Sync initial state
        colorSchemeButton.textContent = this.currentColorScheme || 'Default';
    }

    loadPresetOptions(selectElement) {
        
        // Clear existing options except the first one
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }

        // Add saved presets
        if (this.savedPresets && this.savedPresets.length > 0) {
            // Sort presets: "Last Random" always last, others by name
            const sortedPresets = [...this.savedPresets].sort((a, b) => {
                if (a.name === 'Last Random') return 1;
                if (b.name === 'Last Random') return -1;
                return a.name.localeCompare(b.name);
            });
            
            sortedPresets.forEach((preset, sortedIndex) => {
                // Find original index for value
                const originalIndex = this.savedPresets.findIndex(p => p === preset);
                
                const option = document.createElement('option');
                option.value = originalIndex;
                
                // Don't add visual indicator - keep preset names clean
                option.textContent = preset.name || `Preset ${originalIndex + 1}`;
                
                selectElement.appendChild(option);
            });
        } else {
        }
    }

    initializePlaylistPanelContent(panel) {
        // Copy content from sidebar to panel
        if (this.playlistManager && this.playlistManager.currentPlaylist) {
            this.updatePlaylistPanelDisplay(panel);
        }
    }

    updatePlaylistPanelDisplay(panel) {
        // Update panel stats
        const trackCount = panel.querySelector('#panelPlaylistTrackCount');
        const duration = panel.querySelector('#panelPlaylistDuration');
        const tracks = panel.querySelector('#panelPlaylistTracks');
        
        if (this.playlistManager && this.playlistManager.currentPlaylist) {
            const playlist = this.playlistManager.currentPlaylist;
            const trackList = playlist.tracks || [];
            const totalDuration = trackList.reduce((sum, track) => sum + (track.duration || 0), 0);
            
            if (trackCount) {
                trackCount.textContent = `${trackList.length} track${trackList.length !== 1 ? 's' : ''}`;
            }
            
            if (duration) {
                const hours = Math.floor(totalDuration / 3600);
                const mins = Math.floor((totalDuration % 3600) / 60);
                const secs = Math.floor(totalDuration % 60);
                
                if (hours > 0) {
                    duration.textContent = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else {
                    duration.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
            }
            
            if (tracks) {
                if (trackList.length === 0) {
                    tracks.innerHTML = `
                        <div class="empty-playlist">
                            <div class="empty-playlist-icon">🎵</div>
                            <div class="empty-playlist-text">No music loaded</div>
                            <div class="empty-playlist-subtext">Click "Add Folder" to scan your music library</div>
                        </div>
                    `;
                } else {
                    // Use the existing renderTrackListToContainer method for artist grouping
                    this.playlistManager.renderTrackListToContainer(trackList, tracks);
                    
                    // Add event listeners for track buttons
                    this.setupPanelTrackEvents(panel);
                }
            }
        }
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    setupPanelTrackEvents(panel) {
        // Play button events
        panel.querySelectorAll('.track-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = e.target.getAttribute('data-track-id');
                if (this.playlistManager) {
                    this.playlistManager.playTrack(trackId);
                }
            });
        });

        // Remove button events
        panel.querySelectorAll('.track-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = e.target.getAttribute('data-track-id');
                if (this.playlistManager) {
                    this.playlistManager.removeTrack(trackId);
                    this.updatePlaylistPanelDisplay(panel); // Refresh display
                }
            });
        });

        // Drag and drop functionality - duplicate from sidebar
        this.initializePanelDragAndDrop(panel);
    }

    initializePanelDragAndDrop(panel) {
        let draggedTrackId = null;
        let draggedElement = null;
        
        panel.querySelectorAll('.track-item').forEach(item => {
            // Drag start
            item.addEventListener('dragstart', (e) => {
                draggedTrackId = item.dataset.trackId;
                draggedElement = item;
                e.dataTransfer.setData('text/plain', draggedTrackId);
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
                console.log('Panel drag started for track:', draggedTrackId);
            });
            
            // Drag end
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                panel.querySelectorAll('.track-item').forEach(i => {
                    i.classList.remove('drag-over', 'drop-not-allowed');
                });
                panel.querySelectorAll('.artist-tracks').forEach(a => {
                    a.classList.remove('drag-over');
                });
                draggedTrackId = null;
                draggedElement = null;
            });
            
            // Drag over
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                
                if (draggedElement && item !== draggedElement) {
                    // Check if this is the currently playing track
                    const targetTrackId = item.dataset.trackId;
                    const targetTrack = this.playlistManager.findTrackById(targetTrackId);
                    const isTargetPlaying = this.audio && 
                                           this.audio.src && 
                                           targetTrack && 
                                           this.audio.src === targetTrack.url;
                    
                    if (isTargetPlaying) {
                        e.dataTransfer.dropEffect = 'none';
                        item.classList.add('drop-not-allowed');
                    } else {
                        e.dataTransfer.dropEffect = 'move';
                        item.classList.add('drag-over');
                    }
                }
            });
            
            // Drag leave
            item.addEventListener('dragleave', (e) => {
                item.classList.remove('drag-over', 'drop-not-allowed');
            });
            
            // Drop
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const droppedTrackId = e.dataTransfer.getData('text/plain');
                const targetTrackId = item.dataset.trackId;
                
                console.log(`Panel drop: ${droppedTrackId} onto ${targetTrackId}`);
                
                if (droppedTrackId && targetTrackId && droppedTrackId !== targetTrackId) {
                    // Check if target is currently playing
                    const targetTrack = this.playlistManager.findTrackById(targetTrackId);
                    const isTargetPlaying = this.audio && 
                                           this.audio.src && 
                                           targetTrack && 
                                           this.audio.src === targetTrack.url;
                    
                    if (isTargetPlaying) {
                        console.log('Preventing drop on currently playing track to avoid playback errors');
                        return;
                    }
                    
                    this.playlistManager.reorderTracks(droppedTrackId, targetTrackId);
                    // Refresh both sidebar and panel displays
                    this.playlistManager.displayPlaylist();
                    this.updatePlaylistPanelDisplay(panel);
                }
                
                // Clean up visual feedback
                panel.querySelectorAll('.track-item').forEach(i => {
                    i.classList.remove('drag-over', 'dragging', 'drop-not-allowed');
                });
            });
        });
        
        // Track list container for general drops
        const tracksContainer = panel.querySelector('#panelPlaylistTracks');
        if (tracksContainer) {
            tracksContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                // Find the closest track item to show insertion point
                const afterElement = this.getPanelDragAfterElement(tracksContainer, e.clientY);
                const dragging = panel.querySelector('.dragging');
                
                if (afterElement == null) {
                    tracksContainer.appendChild(dragging);
                } else {
                    tracksContainer.insertBefore(dragging, afterElement);
                }
            });
            
            tracksContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Panel drop on tracks container');
            });
        }
    }

    getPanelDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.track-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }



    async toggleInputMode() {
        const deviceSelect = this.getAudioElement('audioDeviceSelect');

        if (this.inputMode === 'playlist') {
            try {
                let devices = await navigator.mediaDevices.enumerateDevices();
                let audioInputs = devices.filter(d => d.kind === 'audioinput');

                const hasLabels = audioInputs.length > 0 && audioInputs.some(d => d.label && d.label !== '');

                if (! hasLabels) {
                    console.log('No device labels, requesting permission...');

                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({audio: true});

                        stream.getTracks().forEach(track => {
                            track.stop();
                            console.log('Stopped track:', track.label);
                        });

                        devices = await navigator.mediaDevices.enumerateDevices();
                        audioInputs = devices.filter(d => d.kind === 'audioinput');
                        console.log('Found audio inputs:', audioInputs);

                    } catch (err) {

                        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                            this.showError('Microphone blocked. Click the lock icon in the address bar, set Microphone to "Allow", then refresh the page.');
                        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                            this.showError('No microphone found. Please connect a microphone.');
                        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                            this.showError('Microphone is being used by another application.');
                        } else {
                            this.showError(`Microphone error: ${
                                err.name
                            } - ${
                                err.message
                            }`);
                        }
                        return;
                    }
                }

                this.availableDevices = audioInputs;

                if (this.availableDevices.length === 0) {
                    this.showError('No audio input devices found. Please connect a microphone.');
                    return;
                }

                this.updateDeviceList();
                this.inputMode = 'selecting';

            } catch (e) {
                console.error('Unexpected error:', e);
                this.showError(`Error: ${
                    e.message
                }`);
            }
        } else {
            this.stopLiveInput();
            this.inputMode = 'playlist';
            this.currentDeviceId = null;
            this.resumePlaylist();
            // Footer button state will be updated by stopLiveInput()
        }
    }

    clearAudioInput() {
        
        // Stop any current live audio input
        this.stopLiveInput();
        
        // Reset audio properties to initial state
        this.liveAudioEnabled = false;
        this.inputMode = 'playlist';
        this.currentDeviceId = null;
        this.lastAudioDeviceId = null;
        
        // Reset audio device selection in mixer
        const mixerAudioDeviceSelect = document.getElementById('mixerAudioDeviceSelect');
        if (mixerAudioDeviceSelect) {
            mixerAudioDeviceSelect.value = '';
        }
        
        // Update header audio device selector
        this.updateAudioElements('audioDeviceSelect', (select) => {
            select.value = '';
        });
        
        // Update toggle states (turn OFF)
        this.updateAudioElements('liveAudioToggleBtn', (btn) => {
            btn.textContent = 'OFF';
            btn.classList.remove('active');
        });
        
        // Update mixer audio toggle button state
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAudioToggle) {
            window.multiDisplayManager.updateMixerAudioToggle();
        }
        
        // Resume playlist mode
        this.resumePlaylist();
        
        // Update footer Live Audio button state
        this.updateFooterLiveAudioButton();
        
    }

    async initializeVideoInput() {
        try { // Request permission if needed
            const devices = await navigator.mediaDevices.enumerateDevices();
            let videoDevices = devices.filter(d => d.kind === 'videoinput');

            // If no labels, request permission
            if (videoDevices.length > 0 && ! videoDevices[0].label) {
                const tempStream = await navigator.mediaDevices.getUserMedia({video: true});
                tempStream.getTracks().forEach(track => track.stop());

                // Re-enumerate with permissions
                const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
                videoDevices = devicesWithLabels.filter(d => d.kind === 'videoinput');
            }

            this.availableVideoDevices = videoDevices;
            this.updateVideoDeviceList();

        } catch (e) {
            console.log('Video device enumeration failed:', e);
        }
    }

    updateVideoDeviceList() {
        // Header-only video controls (sidebar removed)
        
        // Update mixer video camera select dropdown
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoCameraSelect) {
            window.multiDisplayManager.updateMixerVideoCameraSelect();
        }
    }

    async toggleVideoInput() {
        // Header-only video controls (sidebar removed)
        if (this.videoMode === 'off') { 
            // For header controls, we don't need to show device selector
            // The video settings panel handles device selection
            await this.initializeVideoInput();
            this.videoMode = 'selecting';

        } else { // Turn off video
            this.stopVideoInput();
            this.videoMode = 'off';
            this.updateVideoToggleState();
        }
    }

    clearVideoInput() {
        
        // Stop any current video input
        this.stopVideoInput();
        
        // Reset video properties to initial state
        this.videoFile = null;
        this.videoMode = 'off';
        this.videoStream = null;
        
        // Reset video device selections in both header and mixer
        const mixerVideoCameraSelect = document.getElementById('mixerVideoCameraSelect');
        if (mixerVideoCameraSelect) {
            mixerVideoCameraSelect.value = '';
        }
        
        const videoDeviceSelect = document.getElementById('videoDeviceSelect');
        if (videoDeviceSelect) {
            videoDeviceSelect.value = '';
        }
        
        // Update toggle states (turn OFF)
        this.updateVideoToggleState();
        
        // Hide video file controls
        this.hideVideoFileControls();
        
        // Update mixer video toggle button state
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoToggleButton) {
            window.multiDisplayManager.updateMixerVideoToggleButton();
        }
        
        // Sync header clear button state (if needed for visual feedback)
        const headerClearBtn = document.getElementById('headerVideoClearInputBtn');
        const mixerClearBtn = document.getElementById('mixerVideoClearInputBtn');
        
    }

    toggleVideoPlayback() {
        if (this.videoMode === 'camera' || this.videoMode === 'file') {
            // Video is currently visible - hide it
            if (this.videoElement) {
                this.videoElement.style.display = 'none';
                this.videoMode = 'hidden';
            }
        } else if (this.videoMode === 'hidden') {
            // Video is hidden - show it
            if (this.videoElement) {
                this.videoElement.style.display = 'block';
                this.videoMode = this.videoFile ? 'file' : 'camera';
            }
        } else {
            // No video source selected - start selection process
            this.toggleVideoInput();
        }
        this.updateVideoToggleState();
        
        // Re-apply z-indexes after video visibility change
        if (window.pluginMixerIntegration) {
            window.pluginMixerIntegration.reapplyZIndexes();
        }
    }

    saveVideoSource(type, source) {
        const videoSource = {
            type: type,
            source: source,
            timestamp: Date.now()
        };
        localStorage.setItem('mviz_video_source', JSON.stringify(videoSource));
    }
    
    saveVideoInputMode() {
        const mode = this.videoMode || 'none';
        localStorage.setItem('freque_video_input_mode', mode);
    }
    
    loadVideoInputMode() {
        try {
            const saved = localStorage.getItem('freque_video_input_mode');
            if (saved && ['camera', 'file', 'none'].includes(saved)) {
                return saved;
            }
        } catch (e) {
            console.error('Error loading video input mode:', e);
        }
        return null;
    }

    loadVideoSource() {
        try {
            const saved = localStorage.getItem('mviz_video_source');
            if (saved) {
                const videoSource = JSON.parse(saved);
                return videoSource;
            }
        } catch (e) {
            console.error('Error loading video source:', e);
        }
        return null;
    }

    updateVideoDropdownDisplay() {
        // Header-only video controls (sidebar removed)
        // No dropdown display to update - handled by header panel
        console.log('Video dropdown display update - header controls only');
    }

    updateVisualizationAspectRatio() {

        // DISABLED: Don't resize canvas to match video aspect ratio
        // This ensures visualizations render correctly regardless of video presence
        
                return;
    }

    restoreOriginalAspectRatio() {
        if (!this.audioMotion) return;

        try {
            // Get the container's natural dimensions
            const container = document.getElementById('visualizer');
            if (container) {
                const rect = container.getBoundingClientRect();
                const containerWidth = rect.width || 800;
                const containerHeight = rect.height || 400;


                this.audioMotion.canvas.width = containerWidth;
                this.audioMotion.canvas.height = containerHeight;

                if (this.audioMotion.handleResize) {
                    this.audioMotion.handleResize();
                }
            }
        } catch (error) {
            console.error('Error restoring original aspect ratio:', error);
        }
    }

    async connectVideoAudio() {
        try {
            if (!this.videoElement || !this.audioMotion || !this.audioMotion.audioCtx) {
                console.warn('Cannot connect video audio: missing video element or audio context');
                return;
            }

            // Disconnect any existing video audio connection
            this.disconnectVideoAudio();

            const audioCtx = this.audioMotion.audioCtx;
            
            // Resume audio context if needed
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            // Create audio source from video element
            this.videoAudioSource = audioCtx.createMediaElementSource(this.videoElement);
            
            // Create gain node for mute control
            this.videoAudioGain = audioCtx.createGain();
            
            // Set initial gain based on mute state
            this.videoAudioGain.gain.value = this.videoFileMuted ? 0 : this.volume;
            
            // Connect: videoElement -> audioSource -> gainNode -> destination
            this.videoAudioSource.connect(this.videoAudioGain);
            this.videoAudioGain.connect(audioCtx.destination);
            
            // Connect to analyzer for visualization
            // Note: This will work alongside playlist audio if both are playing
            this.videoAudioGain.connect(this.audioMotion.analyser);
            
            // Connect to stereo analyzer if available
            if (this.audioMotion.analyserRight && 
                (this.audioMotion.channelLayout === 'dual-vertical' || this.audioMotion.channelLayout === 'dual-horizontal')) {
                // For stereo, we need a splitter
                if (this.audioMotion.splitter) {
                    this.videoAudioGain.connect(this.audioMotion.splitter);
                    this.audioMotion.splitter.connect(this.audioMotion.analyser, 0);
                    this.audioMotion.splitter.connect(this.audioMotion.analyserRight, 1);
                } else {
                    this.videoAudioGain.connect(this.audioMotion.analyser);
                }
            }
            
            
            // Set isConnected flag so regular AM visualizations can access audio data
            if (this.audioMotion) {
                this.audioMotion.isConnected = true;
            }
            
            // Reconnect official AudioMotion if it needs connection
            this.reconnectOfficialAudioMotion();
            
        } catch (error) {
            console.error('Failed to connect video audio:', error);
        }
    }

    disconnectVideoAudio() {
        try {
            // Disconnect gain node first
            if (this.videoAudioGain) {
                console.log('Disconnecting video audio gain node');
                this.videoAudioGain.disconnect();
                this.videoAudioGain = null;
            }
            
            // IMPORTANT: Don't call disconnect() on MediaElementSourceNode
            // Just null it - the audio context manages cleanup
            // Calling disconnect() causes issues when recreating the source
            if (this.videoAudioSource) {
                console.log('Nulling video audio source (not disconnecting)');
                this.videoAudioSource = null;
            }
        } catch (error) {
            console.error('Error disconnecting video audio:', error);
        }
    }

    initializePlaylistUI() {
        // Sidebar playlist click handler - will be removed with sidebar
        // Playlist functionality now handled by header dropdown
        
        // Close button handler - try to find it, if not found, retry later
        this.initializeCloseButtonHandler();
        
        // Playlist scan button
        const scanBtn = document.getElementById('playlistScanBtn');
        if (scanBtn) {
            // Remove any existing listeners to prevent duplicates
            const newScanBtn = scanBtn.cloneNode(true);
            scanBtn.parentNode.replaceChild(newScanBtn, scanBtn);
            
            newScanBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Playlist scan button clicked');
                if (this.playlistManager) {
                    // Use setTimeout to ensure user activation is preserved
                    setTimeout(() => {
                        this.playlistManager.scanFolder();
                    }, 0);
                }
            });
        }
        
        // Playlist import button
        const importBtn = document.getElementById('playlistImportBtn');
        const importInput = document.getElementById('playlistImportInput');
        if (importBtn && importInput) {
            // Remove any existing listeners to prevent duplicates
            const newImportBtn = importBtn.cloneNode(true);
            importBtn.parentNode.replaceChild(newImportBtn, importBtn);
            
            newImportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Playlist import button clicked');
                importInput.click();
            });
            
            // Only attach the change listener once
            importInput.removeEventListener('change', this._importHandler);
            this._importHandler = (e) => {
                const file = e.target.files?.[0];
                if (file && this.playlistManager) {
                    this.playlistManager.importPlaylist(file);
                }
                e.target.value = ''; // Reset input
            };
            importInput.addEventListener('change', this._importHandler);
        }
        
        // Playlist export button
        const exportBtn = document.getElementById('playlistExportBtn');
        if (exportBtn) {
            // Remove any existing listeners to prevent duplicates
            const newExportBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
            
            newExportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Playlist export button clicked');
                if (this.playlistManager) {
                    this.playlistManager.exportPlaylist();
                }
            });
        }
        
        // Playlist sort button
        const sortBtn = document.getElementById('playlistSortBtn');
        if (sortBtn) {
            // Remove any existing listeners to prevent duplicates
            const newSortBtn = sortBtn.cloneNode(true);
            sortBtn.parentNode.replaceChild(newSortBtn, sortBtn);
            
            newSortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Playlist sort button clicked');
                if (this.playlistManager) {
                    this.playlistManager.resetToAlphabetical();
                }
            });
        }
        
        // Progress cancel button
        const cancelBtn = document.getElementById('progressCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Progress cancel button clicked');
                if (this.playlistManager) {
                    this.playlistManager.cancelScan();
                }
            });
        }
        
        // Sidebar AI Autopilot button removed - functionality moved to footer

        // Footer Autopilot button
        const footerAutopilotBtn = document.getElementById('footerAutopilotBtn');
        if (footerAutopilotBtn) {
            // Initialize button state
            if (this.aiAutopilot) {
                this.aiAutopilot.updateFooterAutopilotButton();
            }
            
            footerAutopilotBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.aiAutopilot) {
                    if (this.aiAutopilot.isActive) {
                        this.aiAutopilot.deactivate();
                    } else {
                        this.aiAutopilot.activate();
                    }
                    // The updateUI() method will be called by activate/deactivate, which will update both buttons
                }
            });
        }

        // Footer Autopilot Settings button
        const footerAutopilotSettingsBtn = document.getElementById('footerAutopilotSettingsBtn');
        if (footerAutopilotSettingsBtn) {
            footerAutopilotSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFooterAutopilotSettingsPanel();
            });
        }

        // Footer Autopilot Settings panel close button
        const footerAutopilotSettingsClose = document.getElementById('footerAutopilotSettingsClose');
        if (footerAutopilotSettingsClose) {
            footerAutopilotSettingsClose.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeFooterAutopilotSettingsPanel();
            });
        }
        
        // Sidebar AI Autopilot settings button removed - functionality moved to footer
        
        // Sidebar AI Autopilot settings panel close button removed - functionality moved to footer
        
        // Scope buttons
        document.querySelectorAll('.scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scope = e.target.dataset.scope;
                if (this.aiAutopilot) {
                    this.aiAutopilot.scope = scope;
                    
                    // Update button states
                    document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // If scope is specific (radial, energy), immediately switch to that mode
                    if (scope === 'radial' || scope === 'energy') {
                        const targetMode = scope === 'radial' ? 4 : 5;
                        this.setVisualizationMode(targetMode);
                        
                        // Force a decision engine update to respect the new scope
                        setTimeout(() => {
                            if (this.aiAutopilot && this.aiAutopilot.decisionEngine) {
                                this.aiAutopilot.decisionEngine.lastDecision = 0; // Reset decision timer
                            }
                        }, 100);
                    }
                }
            });
        });
        
        // Sidebar auto color schemes toggle removed - functionality moved to footer settings panel
        
        // Timing buttons
        document.querySelectorAll('.timing-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timing = e.target.dataset.timing;
                if (this.aiAutopilot) {
                    this.aiAutopilot.changeTiming = timing;
                    
                    // Update button states
                    document.querySelectorAll('.timing-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });
        
        // Sensitivity buttons
        document.querySelectorAll('.sensitivity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sensitivity = e.target.dataset.sensitivity;
                if (this.aiAutopilot) {
                    this.aiAutopilot.sensitivity = sensitivity;
                    
                    // Update button states
                    document.querySelectorAll('.sensitivity-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });
        
        // Genre selection buttons
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const genre = e.target.dataset.genre;
                if (this.aiAutopilot) {
                    if (genre === 'auto') {
                        this.aiAutopilot.manualGenre = null;
                    } else {
                        this.aiAutopilot.manualGenre = genre;
                        this.aiAutopilot.currentGenre = genre;
                        this.aiAutopilot.genreConfidence = 1.0;
                    }
                    
                    // Update button states
                    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Update display
                    this.updateGenreDisplay();
                }
            });
        });
        
        // Sidebar parameter control toggle removed - functionality moved to footer settings panel
        
        // Sidebar learning controls removed - functionality moved to footer settings panel
        
        // Sidebar reset learning data button removed - functionality moved to footer settings panel
        
        // Sidebar user feedback buttons removed - functionality moved to footer settings panel
        
        // Sidebar adaptive tuning controls removed - functionality moved to footer settings panel
        
        // Sidebar force optimization button removed - functionality moved to footer settings panel
        
        // Sidebar predictive behavior controls removed - functionality moved to footer settings panel
        
        // Sidebar test prediction button removed - functionality moved to footer settings panel
        
        // Sidebar multi-layered intelligence controls removed - functionality moved to footer settings panel
        
        // Sidebar test intelligence button removed - functionality moved to footer settings panel
        
        // Sidebar Learning Analytics button removed - functionality moved to footer settings panel

        // Sidebar analytics close button removed - functionality moved to footer settings panel

        // Sidebar update frequency select removed - functionality moved to footer settings panel

        // Sidebar export learning data button removed - functionality moved to footer settings panel

        // Sidebar reset learning data button removed - functionality moved to footer settings panel

        // Initialize analytics update frequency
        this.analyticsUpdateInterval = 5000; // Default 5 seconds
        this.analyticsUpdateTimer = null;

        // Update learning analytics periodically
        this.startAnalyticsUpdates();
        
        // Sidebar video effects toggle removed - functionality moved to footer settings panel
        
        
        // Sidebar test parameter control button removed - functionality moved to footer settings panel
        
        // Sidebar test parameters button removed - functionality moved to footer settings panel
    }
    
    updateGenreDisplay() {
        if (this.aiAutopilot) {
            this.aiAutopilot.updateGenreDisplay();
        }
    }
    
    updateLearningAnalytics() {
        if (!this.aiAutopilot || !this.aiAutopilot.patternLearning) return;
        
        const analytics = this.aiAutopilot.patternLearning.getLearningAnalytics();
        
        // Update learning progress display
        const progressDisplay = document.getElementById('learningProgressDisplay');
        if (progressDisplay) {
            const progressPercent = Math.round(analytics.learningProgress * 100);
            progressDisplay.textContent = `Learning: ${progressPercent}%`;
        }
        
        // Update pattern count display
        const patternDisplay = document.getElementById('patternCountDisplay');
        if (patternDisplay) {
            patternDisplay.textContent = `Patterns: ${analytics.patterns.total}`;
        }
        
        // Update success rate display
        const successDisplay = document.getElementById('successRateDisplay');
        if (successDisplay) {
            const successPercent = Math.round(analytics.patterns.avgSuccessRate * 100);
            successDisplay.textContent = `Success Rate: ${successPercent}%`;
        }
    }
    
    updateFeedbackStats() {
        if (!this.aiAutopilot || !this.aiAutopilot.parameterController) return;
        
        const stats = this.aiAutopilot.parameterController.getFeedbackStats();
        
        // Update feedback stats display
        const feedbackDisplay = document.getElementById('feedbackStatsDisplay');
        if (feedbackDisplay) {
            const satisfactionPercent = Math.round(stats.satisfaction * 100);
            feedbackDisplay.textContent = `Satisfaction: ${satisfactionPercent}% (${stats.positive}/${stats.total})`;
        }
    }
    
    updateAdaptiveTuningAnalytics() {
        if (!this.aiAutopilot || !this.aiAutopilot.adaptiveTuning) return;
        
        const analytics = this.aiAutopilot.adaptiveTuning.getOptimizationAnalytics();
        
        // Update performance display
        const performanceDisplay = document.getElementById('performanceDisplay');
        if (performanceDisplay) {
            const performancePercent = Math.round(analytics.currentPerformance * 100);
            performanceDisplay.textContent = `Performance: ${performancePercent}%`;
        }
        
        // Update optimization count display
        const optimizationDisplay = document.getElementById('optimizationCountDisplay');
        if (optimizationDisplay) {
            optimizationDisplay.textContent = `Optimizations: ${analytics.totalOptimizations}`;
        }
        
        // Update performance trend display
        const trendDisplay = document.getElementById('performanceTrendDisplay');
        if (trendDisplay) {
            const trendText = analytics.performanceTrend.charAt(0).toUpperCase() + analytics.performanceTrend.slice(1);
            trendDisplay.textContent = `Trend: ${trendText}`;
        }
    }

    updatePredictiveBehaviorAnalytics() {
        if (!this.aiAutopilot || !this.aiAutopilot.predictiveBehavior) return;
        
        const analytics = this.aiAutopilot.predictiveBehavior.getPredictionAnalytics();
        
        // Update prediction count display
        const predictionCountDisplay = document.getElementById('predictionCountDisplay');
        if (predictionCountDisplay) {
            predictionCountDisplay.textContent = `Predictions: ${analytics.totalPredictions}`;
        }
        
        // Update prediction accuracy display
        const predictionAccuracyDisplay = document.getElementById('predictionAccuracyDisplay');
        if (predictionAccuracyDisplay) {
            predictionAccuracyDisplay.textContent = `Accuracy: ${analytics.accuracy}%`;
        }
        
        // Update prediction confidence display
        const predictionConfidenceDisplay = document.getElementById('predictionConfidenceDisplay');
        if (predictionConfidenceDisplay) {
            predictionConfidenceDisplay.textContent = `Confidence: ${analytics.confidence}%`;
        }
    }

    updateMultiLayeredIntelligenceAnalytics() {
        if (!this.aiAutopilot || !this.aiAutopilot.multiLayeredIntelligence) return;
        
        const analytics = this.aiAutopilot.multiLayeredIntelligence.getIntelligenceAnalytics();
        
        // Update intelligence decisions display
        const intelligenceDecisionsDisplay = document.getElementById('intelligenceDecisionsDisplay');
        if (intelligenceDecisionsDisplay) {
            intelligenceDecisionsDisplay.textContent = `Decisions: ${analytics.totalDecisions}`;
        }
        
        // Update meta-learning display
        const metaLearningDisplay = document.getElementById('metaLearningDisplay');
        if (metaLearningDisplay) {
            metaLearningDisplay.textContent = `Meta-Learning: ${analytics.metaLearningProgress.progress}%`;
        }
        
        // Update layer performance display
        const layerPerformanceDisplay = document.getElementById('layerPerformanceDisplay');
        if (layerPerformanceDisplay) {
            const layerCount = Object.keys(analytics.layerPerformance).length;
            const avgSuccessRate = layerCount > 0 ? 
                Object.values(analytics.layerPerformance).reduce((sum, layer) => sum + parseFloat(layer.successRate), 0) / layerCount : 0;
            
            let performanceText = 'Balanced';
            if (avgSuccessRate > 80) performanceText = 'Excellent';
            else if (avgSuccessRate > 60) performanceText = 'Good';
            else if (avgSuccessRate > 40) performanceText = 'Fair';
            else if (avgSuccessRate > 0) performanceText = 'Poor';
            
            layerPerformanceDisplay.textContent = `Performance: ${performanceText}`;
        }
    }

    // Learning Analytics Dashboard Methods
    openLearningAnalyticsDashboard() {
        const modal = document.getElementById('learningAnalyticsModal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateDashboardAnalytics();
            this.logActivity('Learning Analytics Dashboard opened');
        } else {
            console.error('Learning Analytics Modal not found!');
        }
    }


    closeLearningAnalyticsDashboard() {
        const modal = document.getElementById('learningAnalyticsModal');
        if (modal) {
            modal.style.display = 'none';
            this.logActivity('Learning Analytics Dashboard closed');
        }
    }

    initializeLearningAnalyticsModal() {
        // Learning Analytics modal close button
        const analyticsCloseBtn = document.getElementById('analyticsCloseBtn');
        if (analyticsCloseBtn) {
            analyticsCloseBtn.addEventListener('click', () => {
                this.closeLearningAnalyticsDashboard();
            });
        }

        // Learning Analytics modal controls
        const updateFrequencySelect = document.getElementById('updateFrequency');
        if (updateFrequencySelect) {
            updateFrequencySelect.addEventListener('change', (e) => {
                this.setAnalyticsUpdateFrequency(parseInt(e.target.value));
            });
        }

        const exportLearningDataBtn = document.getElementById('exportLearningDataBtn');
        if (exportLearningDataBtn) {
            exportLearningDataBtn.addEventListener('click', () => {
                this.exportLearningData();
            });
        }

        const resetLearningDataBtn = document.getElementById('resetLearningDataBtn');
        if (resetLearningDataBtn) {
            resetLearningDataBtn.addEventListener('click', () => {
                this.resetAllLearningData();
            });
        }
    }

    setAnalyticsUpdateFrequency(interval) {
        this.analyticsUpdateInterval = interval;
        this.startAnalyticsUpdates();
        this.logActivity(`Analytics update frequency changed to ${interval/1000} seconds`);
    }

    startAnalyticsUpdates() {
        // Clear existing timer
        if (this.analyticsUpdateTimer) {
            clearInterval(this.analyticsUpdateTimer);
        }

        // Start new timer
        this.analyticsUpdateTimer = setInterval(() => {
            if (this.aiAutopilot) {
                this.updateLearningAnalytics();
                this.updateFeedbackStats();
                this.updateAdaptiveTuningAnalytics();
                this.updatePredictiveBehaviorAnalytics();
                this.updateMultiLayeredIntelligenceAnalytics();
                this.updateDashboardAnalytics();
            }
        }, this.analyticsUpdateInterval);
    }

    updateDashboardAnalytics() {
        if (!this.aiAutopilot) return;

        // Update Learning Progress
        const patternLearning = this.aiAutopilot.patternLearning;
        if (patternLearning) {
            const learningAnalytics = patternLearning.getLearningAnalytics();
            
            const patternCount = document.getElementById('dashboardPatternCount');
            if (patternCount) patternCount.textContent = learningAnalytics.patternCount;

            const successRate = document.getElementById('dashboardSuccessRate');
            if (successRate) successRate.textContent = `${learningAnalytics.successRate}%`;

            const learningProgress = document.getElementById('dashboardLearningProgress');
            if (learningProgress) learningProgress.textContent = `${learningAnalytics.learningProgress}%`;
        }

        // Update User Feedback
        const parameterController = this.aiAutopilot.parameterController;
        if (parameterController) {
            const feedbackStats = parameterController.getFeedbackStats();
            
            const totalFeedback = document.getElementById('dashboardTotalFeedback');
            if (totalFeedback) totalFeedback.textContent = feedbackStats.total;

            const satisfaction = document.getElementById('dashboardSatisfaction');
            if (satisfaction) satisfaction.textContent = `${Math.round(feedbackStats.satisfaction * 100)}%`;

            const positiveFeedback = document.getElementById('dashboardPositiveFeedback');
            if (positiveFeedback) positiveFeedback.textContent = feedbackStats.positive;
        }

        // Update Predictive Behavior
        const predictiveBehavior = this.aiAutopilot.predictiveBehavior;
        if (predictiveBehavior) {
            const predictionAnalytics = predictiveBehavior.getPredictionAnalytics();
            
            const predictions = document.getElementById('dashboardPredictions');
            if (predictions) predictions.textContent = predictionAnalytics.totalPredictions;

            const predictionAccuracy = document.getElementById('dashboardPredictionAccuracy');
            if (predictionAccuracy) predictionAccuracy.textContent = `${predictionAnalytics.accuracy}%`;

            const confidence = document.getElementById('dashboardConfidence');
            if (confidence) confidence.textContent = `${predictionAnalytics.confidence}%`;
        }

        // Update Adaptive Tuning
        const adaptiveTuning = this.aiAutopilot.adaptiveTuning;
        if (adaptiveTuning) {
            const tuningAnalytics = adaptiveTuning.getOptimizationAnalytics();
            
            const optimizations = document.getElementById('dashboardOptimizations');
            if (optimizations) optimizations.textContent = tuningAnalytics.totalOptimizations;

            const performance = document.getElementById('dashboardPerformance');
            if (performance) performance.textContent = `${Math.round(tuningAnalytics.currentPerformance * 100)}%`;

            const trend = document.getElementById('dashboardTrend');
            if (trend) {
                const trendText = tuningAnalytics.performanceTrend.charAt(0).toUpperCase() + tuningAnalytics.performanceTrend.slice(1);
                trend.textContent = trendText;
            }
        }
    }

    logActivity(message) {
        const activityLog = document.getElementById('activityLog');
        if (activityLog) {
            const timestamp = new Date().toLocaleTimeString();
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.textContent = `[${timestamp}] ${message}`;
            
            // Add to top of log
            activityLog.insertBefore(activityItem, activityLog.firstChild);
            
            // Keep only last 20 items
            while (activityLog.children.length > 20) {
                activityLog.removeChild(activityLog.lastChild);
            }
        }
    }

    exportLearningData() {
        if (!this.aiAutopilot) return;

        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                patternLearning: this.aiAutopilot.patternLearning ? this.aiAutopilot.patternLearning.getLearningAnalytics() : null,
                userFeedback: this.aiAutopilot.parameterController ? this.aiAutopilot.parameterController.getFeedbackStats() : null,
                predictiveBehavior: this.aiAutopilot.predictiveBehavior ? this.aiAutopilot.predictiveBehavior.getPredictionAnalytics() : null,
                adaptiveTuning: this.aiAutopilot.adaptiveTuning ? this.aiAutopilot.adaptiveTuning.getOptimizationAnalytics() : null
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `learning-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.logActivity('Learning data exported successfully');
        } catch (error) {
            console.error('Error exporting learning data:', error);
            this.logActivity('Error exporting learning data');
        }
    }

    resetAllLearningData() {
        if (!this.aiAutopilot) return;

        if (confirm('Are you sure you want to reset all learning data? This action cannot be undone.')) {
            try {
                // Reset pattern learning
                if (this.aiAutopilot.patternLearning) {
                    localStorage.removeItem('autopilot_ml_patterns');
                }

                // Reset user feedback
                if (this.aiAutopilot.parameterController) {
                    this.aiAutopilot.parameterController.feedbackHistory = [];
                    this.aiAutopilot.parameterController.userAdjustments = [];
                }

                // Reset predictive behavior
                if (this.aiAutopilot.predictiveBehavior) {
                    localStorage.removeItem('autopilot_predictions');
                }

                // Reset adaptive tuning
                if (this.aiAutopilot.adaptiveTuning) {
                    localStorage.removeItem('autopilot_adaptive_tuning');
                }

                // Reload the page to reset everything
                window.location.reload();
                this.logActivity('All learning data reset - page reloading');
            } catch (error) {
                console.error('Error resetting learning data:', error);
                this.logActivity('Error resetting learning data');
            }
        }
    }

    closePlaylistPanel() {
        // Playlist is now embedded - no close functionality needed
    }

    updatePlaylistFromManager(playlist) {
        if (!playlist || !playlist.tracks) {
            console.warn('Invalid playlist provided to updatePlaylistFromManager');
            return;
        }
        
        // Clear current playing track only during initial playlist loading, not during background updates
        // Don't clear if we already have a loaded track and this is just a background rescan update
        const hasLoadedTrack = this.audio && this.audio.src && this.audio.src !== location.origin + '/';
        if (!hasLoadedTrack && !this._preservePlayingState) {
            if (this.audio) {
                this.audio.pause();
                this.audio.src = '';
            }
            this.currentTrackIndex = 0;
            this.isPlaying = false;
        }
        
        // Convert PlaylistManager format to visualizer format
        this.playlist = playlist.tracks.map((track, index) => {
            const visualizerTrack = {
                name: track.title,
                url: track.url,
                image: track.artwork,
                artist: track.artist,
                album: track.album,
                duration: track.duration
            };
            
            // Debug URL validity
            if (track.url) {
            } else {
                // Track has no URL - needs rescan
            }
            
            return visualizerTrack;
        });
        
        // Update current track index if needed
        if (this.currentTrackIndex >= this.playlist.length) {
            this.currentTrackIndex = 0;
        }
        
        // If a track is currently playing, find its new index after playlist update
        if (this.audio && this.audio.src) {
            const currentUrl = this.audio.src;
            const newIndex = this.playlist.findIndex(track => track.url === currentUrl);
            if (newIndex >= 0 && newIndex !== this.currentTrackIndex) {
                console.log(`Updating current track index from ${this.currentTrackIndex} to ${newIndex} after playlist update`);
                this.currentTrackIndex = newIndex;
            }
        }
        
        // Update UI
        this.updatePlaylistDropdown();
        this.updateTrackInfo();
        
        // Update panel display if it exists
        if (this.currentPlaylistPanel) {
            this.updatePlaylistPanelDisplay(this.currentPlaylistPanel);
        }
        
        
        // Debug: Check if any tracks have valid URLs and clear track display if needed
        const playableTracks = this.playlist.filter(t => t.url && t.url.startsWith('blob:'));
        if (playableTracks.length === 0) {
            // Update track title to show no track loaded
            const trackTitle = document.getElementById('trackTitle');
            if (trackTitle) {
                trackTitle.textContent = 'No track loaded';
            }
        }
        
        // Try to initialize first track if we haven't already and now have valid URLs
        this.tryInitializeFirstTrack();
    }
    
    playTrackById(trackId) {
        
        if (!this.playlistManager) {
            console.error('PlaylistManager not available');
            return;
        }
        
        const track = this.playlistManager.findTrackById(trackId);
        
        if (!track) {
            console.error('Track not found for ID:', trackId);
            return;
        }
        
        // Check if track needs rescanning
        if (track._needsRescan || !track.url) {
            this.showError('Track needs to be rescanned. Please use "Add Folder" to rescan your music library.');
            return;
        }
        
        // Find index in current playlist
        
        const index = this.playlist.findIndex(t => t.url === track.url);
        
        if (index >= 0) {
            // Use selectTrack to load the track, then force playback
            this.selectTrack(index).then(() => {
                this.play(); // Force playback to start
            }).catch(error => {
                console.error('Error selecting/playing track:', error);
            });
        } else {
            console.error('Track URL not found in visualizer playlist');
            console.log('Available URLs:', this.playlist.map(t => t.url));
        }
    }

    initializeCloseButtonHandler() {
        // Close button removed - playlist is now embedded in sidebar
    }

    async startVideoInput(deviceId) {
        try { // Check if we're switching sources
            const isSourceSwitch = this.videoElement && this.videoStream;

            if (isSourceSwitch) { // Store current opacity for smooth transition
                const currentOpacity = this.videoElement.style.opacity || this.videoOpacity;

                // Start fade out
                this.videoElement.style.transition = `opacity 0.5s linear`;
                this.videoElement.style.opacity = '0';

                // Wait for fade out to complete
                await new Promise(resolve => setTimeout(resolve, 500));

                // Stop the old stream without removing elements
                if (this.videoStream) {
                    this.videoStream.getTracks().forEach(track => {
                        track.stop();
                    });
                    this.videoStream = null;
                }

                // Clear the video source but keep the element
                if (this.videoElement) {
                    this.videoElement.srcObject = null;
                this.videoElement.src = '';
                }
                if (this.captureVideoElement) {
                    this.captureVideoElement.srcObject = null;
                }
            } else { // Normal stop for initial setup
                this.stopVideoInput(false);
            }

            // Get device info to check if it's a Continuity Camera
            let isContinuityCamera = false;
            if (deviceId && this.availableVideoDevices) {
                const device = this.availableVideoDevices.find(d => d.deviceId === deviceId);
                if (device && device.label) {
                    isContinuityCamera = device.label.toLowerCase().includes('iphone') || 
                                       device.label.toLowerCase().includes('ipad') ||
                                       device.label.toLowerCase().includes('continuity');
                }
            }

            // Determine optimal resolution
            const constraints = {
                video: {
                    deviceId: deviceId ? {
                        exact: deviceId
                    } : undefined,
                    width: {
                        ideal: isContinuityCamera ? 1920 : 3840,  // Continuity Camera works better at 1080p
                        max: isContinuityCamera ? 1920 : 3840
                    },
                    height: {
                        ideal: isContinuityCamera ? 1080 : 2160,
                        max: isContinuityCamera ? 1080 : 2160
                    },
                    frameRate: {
                        ideal: 30
                    }
                }
            };

            // Try requested resolution, with appropriate fallbacks
            try {
                this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                if (!isContinuityCamera) {
                console.log('4K not available, trying 1080p');
                constraints.video.width = {
                    ideal: 1920
                };
                constraints.video.height = {
                    ideal: 1080
                };
                    try {
                        this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                    } catch (e2) {
                        // Final fallback - let browser choose best resolution
                        console.log('1080p not available, using default resolution');
                        delete constraints.video.width;
                        delete constraints.video.height;
                this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                    }
                } else {
                    // For Continuity Camera, try lower resolution if 1080p fails
                    console.log('Continuity Camera: trying 720p');
                    constraints.video.width = { ideal: 1280 };
                    constraints.video.height = { ideal: 720 };
                    try {
                        this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                    } catch (e2) {
                        // Final fallback for Continuity Camera
                        console.log('Continuity Camera: using default resolution');
                        delete constraints.video.width;
                        delete constraints.video.height;
                        this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                    }
                }
            }

            // Get container reference
            const container = document.getElementById('visualizationContainer');
            const visualizer = document.getElementById('visualizer');

            // Create backdrop with current background color behind video (only if not source switch)
            if (!document.getElementById('videoBackdrop')) {
                const backdrop = document.createElement('div');
                backdrop.id = 'videoBackdrop';
                backdrop.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${
                    this.backgroundColor
                };
            z-index: 0;
        `;
                container.insertBefore(backdrop, container.firstChild);
            }

            // Create or reuse DISPLAY video element (with filters)
            if (!this.videoElement) {
                this.videoElement = document.createElement('video');
                this.videoElement.id = 'bgVideo';
                this.videoElement.muted = true;
                this.videoElement.playsInline = true;
                this.videoElement.autoplay = true;

                // Critical: Set proper positioning (z-index managed by mixer integration)
                this.videoElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity ${
                    this.videoFadeTime
                }s linear;
            pointer-events: none;
        `;

                // Insert video after backdrop but before visualizer
                const backdrop = document.getElementById('videoBackdrop');
                container.insertBefore(this.videoElement, backdrop.nextSibling);
                
                // Apply current z-index from mixer position
                if (window.pluginMixerIntegration) {
                    window.pluginMixerIntegration.reapplyZIndexes();
                }
            }

        // Create background image element if needed
        this.createBackgroundImageElement();
        
        // Create video element placeholder for z-index management
        this.createVideoElementPlaceholder();

            if (!this.captureVideoElement) {
                this.captureVideoElement = document.createElement('video');
                this.captureVideoElement.id = 'bgVideoCaptureClean';
                this.captureVideoElement.muted = true;
                this.captureVideoElement.playsInline = true;
                this.captureVideoElement.autoplay = true;

                // Detect actual camera stream properties
                this.captureVideoElement.onloadedmetadata = () => {
                    this.detectCameraStreamInfo();
                };
                this.captureVideoElement.style.cssText = `
    position: absolute;
    top: -9999px;
    left: -9999px;
    width: 1px;
    height: 1px;
    visibility: hidden;
    pointer-events: none;
    filter: none !important; /* Force no filters */
    opacity: 1 !important; /* Force full opacity */
    transform: none !important; /* Force no transform */
`;
                document.body.appendChild(this.captureVideoElement);
            }

            // Ensure video is transparent before setting new source
            this.videoElement.style.opacity = '0';

            // Make all relevant elements transparent (only if not already done)
            if (! container.classList.contains('video-active')) {
                const mainArea = document.querySelector('.main-area');

                // Add class for CSS rules
                container.classList.add('video-active');

                // Force transparent backgrounds
                container.style.backgroundColor = 'transparent';
                mainArea.style.backgroundColor = 'transparent';
                visualizer.style.backgroundColor = 'transparent';

                // Ensure visualizer has proper positioning
                visualizer.style.position = 'absolute';
                visualizer.style.zIndex = '1';

                // Ensure canvas itself is transparent
                if (this.audioMotion && this.audioMotion.canvas) {
                    this.audioMotion.canvas.style.background = 'transparent';
                    this.audioMotion.canvas.style.backgroundColor = 'transparent';

                    // Set z-index to ensure canvas is above video layers
                    this.audioMotion.canvas.style.position = 'absolute';
                    this.audioMotion.canvas.style.zIndex = '2';
                }

                // Force the AudioMotion background to be transparent
                if (this.audioMotion) { // Store original background color
                    this.originalBackgroundColor = this.backgroundColor;

                    // Set transparent background in AudioMotion
                    this.audioMotion.backgroundColor = 'transparent';
                    this.audioMotion.showBgColor = false;

                    // Force a redraw
                    if (this.audioMotion.ctx) {
                        this.audioMotion.ctx.clearRect(0, 0, this.audioMotion.canvas.width, this.audioMotion.canvas.height);
                    }
                }
            }

            // Apply settings TO BOTH VIDEO ELEMENTS
            this.videoElement.srcObject = this.videoStream;
            this.captureVideoElement.srcObject = this.videoStream;

            // Add stream detection to main video element too
            this.videoElement.onloadedmetadata = () => {
                this.detectCameraStreamInfo();
            };

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                let resolved = false;

                const handleReady = () => {
                    if (! resolved) {
                        resolved = true;
                        this.videoElement.play().then(() => { // Also ensure capture video is playing
                            return this.captureVideoElement.play();
                        }).then(() => { // Apply filters ONLY TO DISPLAY VIDEO
                            this.applyVideoFilters();
                            resolve();
                        }).catch(reject);
                    }
                };

                this.videoElement.onloadedmetadata = handleReady;
                this.videoElement.onerror = reject;

                // Timeout after 5 seconds
                setTimeout(() => {
                    if (! resolved) {
                        reject(new Error('Video load timeout'));
                    }
                }, 5000);
            });

            // Get actual video dimensions
            const settings = this.videoStream.getVideoTracks()[0].getSettings();
            //     settings.width
            // }x${
            //     settings.height
            // } @ ${
            //     settings.frameRate
            // }fps`);

            this.updateDisplayFilters();

            // Update visualization aspect ratio to match video
            if (this.matchVisualizationAspect) {
                // Small delay to ensure video dimensions are available
                setTimeout(() => this.updateVisualizationAspectRatio(), 200);
            }

            // Smooth fade in after video is fully ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Fade in with proper transition
            this.videoElement.style.transition = `opacity ${
                isSourceSwitch ? 1 : this.videoFadeTime
            }s linear`;
            this.videoElement.style.opacity = this.videoOpacity.toString();

            // Update UI
            this.videoMode = 'camera';
            this.currentVideoDeviceId = deviceId;
            this.updateVideoToggleState();
            
            // Save video source to localStorage
            this.saveVideoSource('camera', deviceId);

            // Header controls only (sidebar removed)

            // Add cleanup listener for unexpected stream end
            const videoTrack = this.videoStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.addEventListener('ended', () => {
                    console.log('Video track ended unexpectedly');
                    this.stopVideoInput();
                });
            }

        } catch (error) {
            console.error('Failed to start video:', error);

            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                this.showError('Camera access denied. Please allow camera access and try again.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                this.showError('Camera not found or not available');
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                this.showError('Camera is being used by another application');
            } else if (error.message === 'Video load timeout') {
                this.showError('Video took too long to load. Please try again.');
            } else {
                this.showError(`Failed to access camera: ${
                    error.message
                }`);
            }

            this.stopVideoInput();
        }
    }

    detectCameraStreamInfo() {
        if (!this.videoStream) return;

        // Get video track information
        const videoTracks = this.videoStream.getVideoTracks();
        if (videoTracks.length > 0) {
            const track = videoTracks[0];
            const settings = track.getSettings();
            const capabilities = track.getCapabilities();

            // Store camera info
            let cameraLabel = track.label || 'Unknown Camera';
            let isContinuity = false;
            
            // Check if this is a Continuity Camera
            if (cameraLabel.toLowerCase().includes('iphone') || 
                cameraLabel.toLowerCase().includes('ipad') ||
                cameraLabel.toLowerCase().includes('continuity')) {
                isContinuity = true;
                // Add indicator if not already present
                if (!cameraLabel.includes('(Continuity Camera)')) {
                    cameraLabel = `📱 ${cameraLabel} (Continuity Camera)`;
                }
            }
            
            this.cameraInfo = {
                label: cameraLabel,
                resolution: `${settings.width || 'Unknown'}x${settings.height || 'Unknown'}`,
                frameRate: settings.frameRate || 'Unknown',
                facingMode: settings.facingMode || 'Unknown',
                capabilities: capabilities,
                isContinuity: isContinuity
            };

            // Get actual video element dimensions
            const videoElement = this.captureVideoElement || this.videoElement;
            if (videoElement && videoElement.videoWidth > 0) {
                this.cameraInfo.actualResolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
            }


            // Update stats display if it exists
            this.updateCameraStats();
        }
    }

    updateCameraStats() {
        // Defensive DOM queries - refresh each time to handle panel closure
        const sidebarContainer = document.getElementById('cameraStatsContainer');
        const headerContainer = document.getElementById('headerCameraStatsContainer');
        const mixerContainer = document.getElementById('mixerCameraStatsContainer');
        
        //     sidebar: !!sidebarContainer,
        //     header: !!headerContainer,
        //     mixer: !!mixerContainer
        // });
        
        const statsContainers = [sidebarContainer, headerContainer, mixerContainer].filter(Boolean);
        
        if (statsContainers.length === 0) {
            return;
        }
        
        
        statsContainers.forEach(statsContainer => {
        if (statsContainer && this.cameraInfo) {
            const streamManager = this.streamManager;
            const captureRes = streamManager ? streamManager.displaySettings.captureResolution : 'Unknown';
            const bitrate = streamManager ? streamManager.displaySettings.captureBitrate : 'Unknown';
            const frameRate = streamManager ? streamManager.displaySettings.captureFrameRate : 'Unknown';

            statsContainer.innerHTML = `
                <div class="stats-row">
                    <span class="stats-label">Camera:</span>
                    <span class="stats-value">${this.cameraInfo.label}</span>
                </div>
                ${this.cameraInfo.isContinuity ? `
                <div class="stats-row" style="color: var(--accent-color);">
                    <span class="stats-label">Type:</span>
                    <span class="stats-value">Apple Continuity Camera</span>
                </div>
                ` : ''}
                <div class="stats-row">
                    <span class="stats-label">Input Resolution:</span>
                    <span class="stats-value">${this.cameraInfo.actualResolution || this.cameraInfo.resolution}</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Input Frame Rate:</span>
                    <span class="stats-value">${this.cameraInfo.frameRate} fps</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Capture Resolution:</span>
                    <span class="stats-value">${captureRes}px</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Capture Frame Rate:</span>
                    <span class="stats-value">${frameRate} fps</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Stream Bitrate:</span>
                    <span class="stats-value">${bitrate} Mbps</span>
                </div>
            `;
        }
        });
    }

    async startVideoFile(file) {
        try {
            console.log('startVideoFile called with file:', file.name);
            
            // CRITICAL: Disconnect audio FIRST before any video element changes
            this.disconnectVideoAudio();
            
            // Check if we're switching sources
            const isSourceSwitch = this.videoElement && (this.videoStream || this.videoFile);

            if (isSourceSwitch) {
                console.log('Source switch detected, pausing current video');
                
                // Pause and reset current video
                if (this.videoElement) {
                    this.videoElement.pause();
                    this.videoElement.currentTime = 0;
                }
                if (this.captureVideoElement) {
                    this.captureVideoElement.pause();
                    this.captureVideoElement.currentTime = 0;
                }
                
                // Store current opacity for smooth transition
                const currentOpacity = this.videoElement.style.opacity || this.videoOpacity;

                // Start fade out
                this.videoElement.style.transition = `opacity 0.5s linear`;
                this.videoElement.style.opacity = '0';

                // Wait for fade out to complete
                await new Promise(resolve => setTimeout(resolve, 500));

                // Stop the old source without removing elements
                this.stopVideoInput(false, true);
            } else {
                // Normal stop for initial setup
                this.stopVideoInput(false, true);
            }

            // Store the file
            this.videoFile = file;
            
            // Load saved size
            const savedSize = localStorage.getItem('freque_video_file_size');
            if (savedSize && ['fit', 'fill', 'stretch', 'original'].includes(savedSize)) {
                this.videoFileSize = savedSize;
            }

            // Get container reference
            const container = document.getElementById('visualizationContainer');

            // Create backdrop if needed
            if (!document.getElementById('videoBackdrop')) {
                console.log('Creating video backdrop...');
                const backdrop = document.createElement('div');
                backdrop.id = 'videoBackdrop';
                backdrop.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: ${this.backgroundColor};
                    z-index: 0;
                `;
                container.insertBefore(backdrop, container.firstChild);
            }

            // Create or reuse DISPLAY video element
            if (!this.videoElement) {
                console.log('Creating new video element...');
                this.videoElement = document.createElement('video');
                this.videoElement.id = 'bgVideo';
                this.videoElement.muted = false; // Keep unmuted, control via gain node
                this.videoElement.playsInline = true;
                this.videoElement.autoplay = true;
                this.videoElement.loop = this.videoFileLoopMode === 'one';

                this.videoElement.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    z-index: 1;
                    opacity: 0;
                    transition: opacity ${this.videoFadeTime}s linear;
                    pointer-events: none;
                `;
                
                // Apply current size setting
                this.applyVideoFileSize();

                const backdrop = document.getElementById('videoBackdrop');
                console.log('Backdrop found:', !!backdrop);
                container.insertBefore(this.videoElement, backdrop.nextSibling);
                console.log('Video element inserted into container');
                
                // Apply current z-index from mixer position
                if (window.pluginMixerIntegration) {
                    window.pluginMixerIntegration.reapplyZIndexes();
                }
            } else {
                // For video file switching, we need to remove and recreate the video element
                // because once a MediaElementSourceNode is created, it can't be disconnected properly
                console.log('Removing old video element for clean audio reconnection...');
                
                if (this.videoElement) {
                    this.videoElement.pause();
                    this.videoElement.src = '';
                    this.videoElement.load(); // Reset the element
                    this.videoElement.remove();
                    this.videoElement = null;
                }
                
                // Create fresh video element
                console.log('Creating fresh video element...');
                this.videoElement = document.createElement('video');
                this.videoElement.id = 'bgVideo';
                this.videoElement.muted = false; // Keep unmuted, control via gain node
                this.videoElement.playsInline = true;
                this.videoElement.autoplay = true;
                this.videoElement.loop = this.videoFileLoopMode === 'one';

                this.videoElement.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    z-index: 1;
                    opacity: 0;
                    transition: opacity ${this.videoFadeTime}s linear;
                    pointer-events: none;
                `;
                
                // Apply current size setting
                this.applyVideoFileSize();

                const backdrop = document.getElementById('videoBackdrop');
                container.insertBefore(this.videoElement, backdrop.nextSibling);
            }

            // Create capture video element for clean video (no effects) - same as camera setup
            if (!this.captureVideoElement) {
                this.captureVideoElement = document.createElement('video');
                this.captureVideoElement.id = 'bgVideoCaptureClean';
                this.captureVideoElement.muted = true; // Capture video is always muted
                this.captureVideoElement.playsInline = true;
                this.captureVideoElement.autoplay = true;
                this.captureVideoElement.loop = this.videoFileLoopMode === 'one';
                
                this.captureVideoElement.style.cssText = `
                    position: absolute;
                    top: -9999px;
                    left: -9999px;
                    width: 1px;
                    height: 1px;
                    visibility: hidden;
                    pointer-events: none;
                    filter: none !important; /* Force no filters */
                    opacity: 1 !important; /* Force full opacity */
                    transform: none !important; /* Force no transform */
                `;
                document.body.appendChild(this.captureVideoElement);
            }

            // Set video source for both elements
            const url = URL.createObjectURL(file);
            this.videoElement.src = url;
            this.videoElement.loop = this.videoFileLoopMode === 'one';
            this.videoElement.muted = false; // Keep unmuted, control via gain node
            
            // Set same source for capture element (clean, no effects)
            this.captureVideoElement.src = url;
            this.captureVideoElement.loop = this.videoFileLoopMode === 'one';
            
            // Save current video if from playlist
            if (this.videoPlaylistManager) {
                this.videoPlaylistManager.saveCurrentVideo();
            }
            
            // Save video input mode
            this.saveVideoInputMode();
            this.captureVideoElement.muted = true; // Capture video is always muted
            
            // Add ended event handler for playlist loop mode 'all'
            this.videoElement.onended = () => {
                console.log('Video ended. Loop mode:', this.videoFileLoopMode);
                if (this.videoFileLoopMode === 'all' && this.videoPlaylistManager && this.videoPlaylistManager.currentPlaylist) {
                    const playlist = this.videoPlaylistManager.currentPlaylist;
                    console.log('Playlist has', playlist.videos.length, 'videos. Current:', this.videoPlaylistManager.currentVideoIndex);
                    
                    if (playlist.videos.length > 0) {
                        const nextIndex = (this.videoPlaylistManager.currentVideoIndex + 1) % playlist.videos.length;
                        console.log('Playing next video at index:', nextIndex);
                        
                        // Small delay to ensure clean transition
                        setTimeout(() => {
                            this.videoPlaylistManager.playVideo(nextIndex);
                        }, 100);
                    }
                }
            };

            // Make containers transparent if not already done (same as camera video)
            if (!container.classList.contains('video-active')) {
                const mainArea = document.querySelector('.main-area');
                const visualizer = document.getElementById('visualizer');

                // Add class for CSS rules
                container.classList.add('video-active');

                // Force transparent backgrounds
                container.style.backgroundColor = 'transparent';
                mainArea.style.backgroundColor = 'transparent';
                visualizer.style.backgroundColor = 'transparent';

                // Ensure visualizer has proper positioning
                visualizer.style.position = 'absolute';
                visualizer.style.zIndex = '1';

                // Ensure canvas itself is transparent
                if (this.audioMotion && this.audioMotion.canvas) {
                    this.audioMotion.canvas.style.background = 'transparent';
                    this.audioMotion.canvas.style.backgroundColor = 'transparent';

                    // Set z-index to ensure canvas is above video layers
                    this.audioMotion.canvas.style.position = 'absolute';
                    this.audioMotion.canvas.style.zIndex = '2';
                }

                // Force the AudioMotion background to be transparent
                if (this.audioMotion) {
                    this.originalBackgroundColor = this.audioMotion.backgroundColor;

                    // Set transparent background in AudioMotion
                    this.audioMotion.backgroundColor = 'transparent';
                    this.audioMotion.showBgColor = false;

                    // Force a redraw
                    if (this.audioMotion.ctx) {
                        this.audioMotion.ctx.clearRect(0, 0, this.audioMotion.canvas.width, this.audioMotion.canvas.height);
                    }
                }
            }

            // Wait for metadata and play
            console.log('Setting up video loading for file:', file.name);
            await new Promise((resolve, reject) => {
                let resolved = false;
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error('Video load timeout'));
                    }
                }, 10000);

                this.videoElement.onloadedmetadata = () => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        console.log('Video metadata loaded, attempting play...');
                        
                        // Force play with explicit promise handling
                        const playPromise = this.videoElement.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                console.log('Main video playing');
                            // Also ensure capture video is playing
                            return this.captureVideoElement.play();
                        }).then(() => {
                                console.log('Capture video playing');
                            }).catch(error => {
                                console.error('Error during video play:', error);
                                // Try to play anyway for capture element
                                this.captureVideoElement.play().catch(e => console.error('Capture play error:', e));
                            });
                        }
                        
                            this.applyVideoFilters();
                            
                            // Fade in after short delay
                            setTimeout(() => {
                                if (this.videoElement) {
                                    this.videoElement.style.opacity = this.videoOpacity.toString();
                                }
                            }, 100);
                            
                            resolve();
                    }
                };

                this.videoElement.onerror = () => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        reject(new Error('Failed to load video'));
                    }
                };
            });
            
            // Connect video audio to AudioMotion after video is loaded
            await this.connectVideoAudio();

            // Update visualization aspect ratio to match video
            if (this.matchVisualizationAspect) {
                // Small delay to ensure video dimensions are available
                setTimeout(() => this.updateVisualizationAspectRatio(), 200);
            }

            // Update UI
            this.videoMode = 'file';
            this.updateVideoToggleState();
            
            // Now detect video file info after mode is set
            this.detectVideoFileInfo();
            
            // Save video source to localStorage
            this.saveVideoSource('file', file.name);
            
            const fileInfo = document.getElementById('videoFileInfo');
            const fileName = document.getElementById('videoFileName');
            if (fileInfo && fileName) {
                fileInfo.style.display = 'flex';
                fileName.textContent = file.name;
            }

            // Show controls panel (if it exists)
            const controlsPanel = document.getElementById('videoControlsPanel');
            if (controlsPanel) {
            controlsPanel.style.display = 'block';
            }

            // Update File Controls section in Video panel
            this.updateVideoFileControls(file);
            
            // Start progress updates for the new video file
            this.startVideoProgressUpdates();


            // If stream manager active, rebuild capture
            if (this.streamManager && this.streamManager.isStreaming) {
                this.streamManager.reconfigureCapture();
            }

            
            // Debug video visibility after a short delay
            setTimeout(() => {
                this.debugVideoVisibility();
            }, 500);

        } catch (error) {
            console.error('Error stack:', error.stack);
            this.showError(`Failed to load video: ${error.message}`);
            this.stopVideoInput();
        }
    }
    
    debugVideoVisibility() {
        const videoElement = this.videoElement;
        const container = document.getElementById('visualizationContainer');
        const mainArea = document.querySelector('.main-area');
        const visualizer = document.getElementById('visualizer');
        
        
        if (videoElement) {
            const rect = videoElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(videoElement);
            
        }
        
        
        if (this.audioMotion && this.audioMotion.canvas) {
            const canvasStyle = window.getComputedStyle(this.audioMotion.canvas);
        }
        
    }

    detectVideoFileInfo() {
        
        if (this.videoElement && this.videoMode === 'file') {
            const videoInfo = {
                name: this.videoFile?.name || 'Unknown',
                resolution: `${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`,
                duration: this.videoElement.duration,
                loop: this.videoFileLoopMode
            };


            // Update stats if needed - with small delay to ensure DOM is ready
            setTimeout(() => {
            this.updateVideoFileStats(videoInfo);
            }, 100);
        } else {
        }
    }

    updateVideoFileStats(videoInfo) {
        // Defensive DOM queries - refresh each time to handle panel closure
        const statsContainers = [
            document.getElementById('cameraStatsContainer'),
            document.getElementById('headerCameraStatsContainer'),
            document.getElementById('mixerCameraStatsContainer')
        ].filter(Boolean);
        
        //     sidebar: !!document.getElementById('cameraStatsContainer'),
        //     header: !!document.getElementById('headerCameraStatsContainer'),
        //     mixer: !!document.getElementById('mixerCameraStatsContainer'),
        //     total: statsContainers.length
        // });
        
        if (statsContainers.length === 0) {
            console.log('No video file stats containers found - video panel may be closed');
            return;
        }
        
        
        statsContainers.forEach(statsContainer => {
        if (statsContainer && videoInfo) {
            const streamManager = this.streamManager;
            const captureRes = streamManager ? streamManager.displaySettings.captureResolution : 'Unknown';
            const bitrate = streamManager ? streamManager.displaySettings.captureBitrate : 'Unknown';
            const frameRate = streamManager ? streamManager.displaySettings.captureFrameRate : 'Unknown';

            statsContainer.innerHTML = `
                <div class="stats-row">
                    <span class="stats-label">File:</span>
                    <span class="stats-value" style="overflow: hidden; text-overflow: ellipsis;">${videoInfo.name}</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Resolution:</span>
                    <span class="stats-value">${videoInfo.resolution}</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Duration:</span>
                    <span class="stats-value">${Math.round(videoInfo.duration)}s</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Loop:</span>
                    <span class="stats-value">${videoInfo.loop ? 'On' : 'Off'}</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Capture Resolution:</span>
                    <span class="stats-value">${captureRes}px</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Stream Bitrate:</span>
                    <span class="stats-value">${bitrate} Mbps</span>
                </div>
            `;
        }
        });
    }

    clearVideoStats() {
        // Clear all video stats containers
        const statsContainers = [
            document.getElementById('cameraStatsContainer'),
            document.getElementById('headerCameraStatsContainer'),
            document.getElementById('mixerCameraStatsContainer')
        ].filter(Boolean);
        
        statsContainers.forEach(statsContainer => {
            statsContainer.innerHTML = `
                <div class="stats-placeholder" style="color: var(--text-secondary); font-size: 11px; text-align: center; line-height: 1.4;">
                    Camera stream info will appear here when video input is active
                </div>
            `;
        });
    }

    stopVideoInput(updateUI = true, isSourceSwitch = false) { // Clear any existing fade timeout immediately
        if (this.videoFadeTimeout) {
            clearTimeout(this.videoFadeTimeout);
            this.videoFadeTimeout = null;
        }
        
        // Disconnect video audio
        this.disconnectVideoAudio();

        // Restore original aspect ratio when video stops (unless it's just a source switch)
        if (updateUI && this.matchVisualizationAspect) {
            this.restoreOriginalAspectRatio();
        }

        // If this is a source switch, do a quick fade and cleanup
        if (isSourceSwitch) {
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('Stopped video track:', track.label);
                });
                this.videoStream = null;
            }

            // Don't remove the video elements or backdrop during source switch
            // Just clear the sources
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
            if (this.captureVideoElement) {
                this.captureVideoElement.srcObject = null;
            }

            return; // Exit early for source switch
        }

        // Normal stop behavior (when turning video off completely)
        if (this.videoElement) {
            this.videoElement.style.transition = `opacity ${
                this.videoFadeTime
            }s linear`;
            this.videoElement.style.opacity = '0';

            this.videoFadeTimeout = setTimeout(() => { // Stop video stream
                if (this.videoStream) {
                    this.videoStream.getTracks().forEach(track => {
                        track.stop();
                    });
                    this.videoStream = null;
                }

                // Remove display video element
                if (this.videoElement) {
                    this.videoElement.srcObject = null;
                    if (this.videoElement.parentNode) {
                        this.videoElement.parentNode.removeChild(this.videoElement);
                    }
                    this.videoElement = null;
                }

                // Remove capture video element
                if (this.captureVideoElement) {
                    this.captureVideoElement.srcObject = null;
                    if (this.captureVideoElement.parentNode) {
                        this.captureVideoElement.parentNode.removeChild(this.captureVideoElement);
                    }
                    this.captureVideoElement = null;
                }


                // Remove backdrop
                const backdrop = document.getElementById('videoBackdrop');
                if (backdrop && backdrop.parentNode) {
                    backdrop.parentNode.removeChild(backdrop);
                }

                // Restore backgrounds
                const container = document.getElementById('visualizationContainer');
                const mainArea = document.querySelector('.main-area');
                const visualizer = document.getElementById('visualizer');

                container.classList.remove('video-active');

                // Restore original background colors
                container.style.backgroundColor = this.backgroundColor;
                mainArea.style.backgroundColor = this.backgroundColor;
                visualizer.style.backgroundColor = '';

                // Restore canvas background
                if (this.audioMotion && this.audioMotion.canvas) {
                    this.audioMotion.canvas.style.background = '';
                    this.audioMotion.canvas.style.backgroundColor = '';
                }

                // Restore AudioMotion background color
                if (this.audioMotion) {
                    this.audioMotion.backgroundColor = this.originalBackgroundColor || this.backgroundColor;
                    this.audioMotion.setBackgroundColor(this.backgroundColor);
                    this.audioMotion.showBgColor = true;
                }

            }, this.videoFadeTime * 1000);
        } else { // No video element, just cleanup capture element if it exists
            if (this.captureVideoElement) {
                this.captureVideoElement.srcObject = null;
                if (this.captureVideoElement.parentNode) {
                    this.captureVideoElement.parentNode.removeChild(this.captureVideoElement);
                }
                this.captureVideoElement = null;
            }


            const backdrop = document.getElementById('videoBackdrop');
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }

            const container = document.getElementById('visualizationContainer');
            const mainArea = document.querySelector('.main-area');

            if (container) {
                container.classList.remove('video-active');
                container.style.backgroundColor = this.backgroundColor;
            }
            if (mainArea) {
                mainArea.style.backgroundColor = this.backgroundColor;
            }

            if (this.audioMotion) {
                this.audioMotion.setBackgroundColor(this.backgroundColor);
            }
        }

        if (updateUI) {
            // Header controls only (sidebar removed)
            this.videoMode = 'off';
            this.updateVideoToggleState();
            
            this.currentVideoDeviceId = null;
            this.videoFile = null;
            
            // Hide File Controls section
            this.hideVideoFileControls();
        }

        

    }

    updateDisplayFilters() {
        if (this.streamManager && this.streamManager.isStreaming) {
            this.streamManager.sendVideoFilters();
        }
    }

    applyDisplayPreset(preset) {
        const presets = {
            cinema: {
                presentationMode: 'fit',
                displaySharpness: 20,
                letterboxColor: '#000000',
                mirrorBackground: false
            },
            presentation: {
                presentationMode: 'fit',
                displaySharpness: 30,
                letterboxColor: '#1a1a1a',
                mirrorBackground: false
            },
            social: {
                presentationMode: 'fit',
                displaySharpness: 0,
                letterboxColor: '#ffffff',
                mirrorBackground: false
            },
            performance: {
                presentationMode: 'fit',
                displaySharpness: 0,
                letterboxColor: '#000000',
                mirrorBackground: false
            },
            projector: {
                presentationMode: 'fit',
                displaySharpness: 50,
                letterboxColor: '#000000',
                mirrorBackground: true,
                mirrorBackgroundBlur: 30
            }
        };

        const settings = presets[preset];
        if (settings && this.streamManager) {
            // Update only the settings we still have
            Object.assign(this.streamManager.displaySettings, settings);
            this.streamManager.saveDisplaySettings();
            
            // Update UI to reflect changes
            this.updateDisplaySettingsUI();
            
            // Send to display window if streaming
            if (this.streamManager.isStreaming) {
                this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
            }
            
        }
    }


    updateDisplaySettingsUI(settings) {         // Update footer presentation mode buttons only (sidebar sync removed)
        if (!settings) return;
        
        // Update presentation mode buttons
        if (settings.presentationMode) {
        document.querySelectorAll('#footerDisplaySettingsPanel .display-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === settings.presentationMode);
        });
        }

        // Update aspect ratio buttons
        if (settings.aspectRatio) {
        document.querySelectorAll('#footerDisplaySettingsPanel .aspect-ratio-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.ratio === settings.aspectRatio);
        });
        }

        // Update capture resolution
        const captureResolution = document.getElementById('captureResolution');
        if (captureResolution && settings.captureResolution !== undefined) {
            captureResolution.value = settings.captureResolution;
        }

        // Update capture frame rate
        const captureFrameRate = document.getElementById('captureFrameRate');
        if (captureFrameRate && settings.captureFrameRate !== undefined) {
            captureFrameRate.value = settings.captureFrameRate;
        }

        // Update capture bitrate
        const captureBitrate = document.getElementById('captureBitrate');
        if (captureBitrate && settings.captureBitrate !== undefined) {
            captureBitrate.value = settings.captureBitrate;
            const bitrateValue = document.getElementById('captureBitrateValue');
            if (bitrateValue) {
                bitrateValue.textContent = `${
                    settings.captureBitrate
                } Mbps`;
            }
        }

        // Update display sharpness
        const displaySharpness = document.getElementById('displaySharpness');
        if (displaySharpness && settings.displaySharpness !== undefined) {
            displaySharpness.value = settings.displaySharpness;
            const sharpnessValue = document.getElementById('displaySharpnessValue');
            if (sharpnessValue) {
                sharpnessValue.textContent = `${
                    settings.displaySharpness
                }%`;
            }
        }

        // Update letterbox color
        const letterboxColor = document.getElementById('letterboxColor');
        if (letterboxColor && settings.letterboxColor !== undefined) {
            letterboxColor.value = settings.letterboxColor;
            const colorValue = document.getElementById('letterboxColorValue');
            if (colorValue) {
                colorValue.textContent = settings.letterboxColor;
            }
        }

        // Update mirror background
        if (settings.mirrorBackground !== undefined) {
            const mirrorBtn = document.getElementById('mirrorBackgroundBtn');
            if (mirrorBtn) {
                mirrorBtn.classList.toggle('active', settings.mirrorBackground);
                mirrorBtn.textContent = `Mirror Background: ${
                    settings.mirrorBackground ? 'On' : 'Off'
                }`;
            }

            // Show/hide mirror blur container
            const mirrorBlurContainer = document.getElementById('mirrorBlurContainer');
            if (mirrorBlurContainer) {
                mirrorBlurContainer.style.display = settings.mirrorBackground ? 'flex' : 'none';
            }

            // Update mirror background blur
            if (settings.mirrorBackgroundBlur !== undefined) {
                const mirrorBlur = document.getElementById('mirrorBackgroundBlur');
                if (mirrorBlur) {
                    mirrorBlur.value = settings.mirrorBackgroundBlur;
                    const blurValue = document.getElementById('mirrorBackgroundBlurValue');
                    if (blurValue) {
                        blurValue.textContent = `${
                            settings.mirrorBackgroundBlur
                        }px`;
                    }
                }
            }
        }
    }

    applyVideoFilters() {
        if (!this.videoElement) 
            return;
        


        let filters = [];

        // Apply posterize FIRST with much stronger effect
        if (this.videoPosterize < 16) { // Much stronger posterize for visible effect
            const steps = this.videoPosterize;
            const posterizeAmount = (16 - steps) / 16;

            // Use multiple contrast passes for stronger effect
            filters.push(`contrast(${
                300 + posterizeAmount * 200
            }%)`); // 300-500%
            filters.push(`brightness(${95}%)`);
            filters.push(`saturate(${200}%)`);

            // Add a second contrast pass for extra posterization
            if (steps < 8) {
                filters.push(`contrast(${150}%)`);
            }
        }

        // Then apply other adjustments
        if (this.videoBrightness !== 100 && this.videoPosterize >= 16) {
            filters.push(`brightness(${
                this.videoBrightness
            }%)`);
        }
        if (this.videoContrast !== 100 && this.videoPosterize >= 16) {
            filters.push(`contrast(${
                this.videoContrast
            }%)`);
        }
        if (this.videoSaturation !== 100 && this.videoPosterize >= 16) {
            filters.push(`saturate(${
                this.videoSaturation
            }%)`);
        }
        if (this.videoHueRotate !== 0) {
            filters.push(`hue-rotate(${
                this.videoHueRotate
            }deg)`);
        }
        if (this.videoGrayscale > 0) {
            filters.push(`grayscale(${
                this.videoGrayscale
            }%)`);
        }
        if (this.videoSepia > 0) {
            filters.push(`sepia(${
                this.videoSepia
            }%)`);
        }
        if (this.videoBlur > 0) {
            filters.push(`blur(${
                this.videoBlur
            }px)`);
        }
        if (this.videoInvert) {
            filters.push('invert(100%)');
        }

        // Apply combined filters
        this.videoElement.style.filter = filters.length > 0 ? filters.join(' ') : 'none';


        // Apply vignette overlay
        this.applyVignette();

        // Apply mirror transformations
        this.applyMirror();

        // Apply pulse animation
        this.applyPulse();
        
        // Also update kaleidoscope filters if it's active
        if (this.kaleidoscopeEnabled && this.kaleidoscopeApplyToVideo) {
            this.applyFiltersToKaleidoscopeContext();
        }
    }

    applyVignette() {
        const container = document.getElementById('visualizationContainer');

        if (this.videoVignette > 0) {
            if (!this.vignetteElement) {
                this.vignetteElement = document.createElement('div');
                this.vignetteElement.className = 'video-vignette';
                container.appendChild(this.vignetteElement);
            }

            const intensity = this.videoVignette / 100;
            const size = 100 - this.videoVignette;

            this.vignetteElement.style.background = `
        radial-gradient(
            ellipse at center,
            transparent ${size}%,
            rgba(0, 0, 0, ${intensity}) 100%
        )
    `;
            this.vignetteElement.style.display = 'block';
        } else if (this.vignetteElement) {
            this.vignetteElement.style.display = 'none';
        }
    }

    applyMirror() {
        if (!this.videoElement) 
            return;
        


        // Remove all mirror classes
        this.videoElement.classList.remove('mirror-horizontal', 'mirror-vertical', 'mirror-both');

        // Apply appropriate mirror class
        switch (this.videoMirror) {
            case 'horizontal':
                this.videoElement.classList.add('mirror-horizontal');
                break;
            case 'vertical':
                this.videoElement.classList.add('mirror-vertical');
                break;
            case 'both':
                this.videoElement.classList.add('mirror-both');
                break;
        }
    }

    applyPulse() {
        if (!this.videoElement) 
            return;
        


        if (this.videoPulse) {
            this.videoElement.classList.add('pulse-active');
            this.videoElement.style.setProperty('--pulse-duration', `${
                this.videoPulseRate
            }s`);
        } else {
            this.videoElement.classList.remove('pulse-active');
        }
    }

    setVideoPulseRate(value) {
        this.videoPulseRate = value;
        if (this.videoPulse) {
            this.applyPulse();
        }
    }

    toggleVideoPulse() {
        this.videoPulse = !this.videoPulse;
        const pulseRateContainer = document.getElementById('videoPulseRateContainer');
        if (pulseRateContainer) {
            pulseRateContainer.style.display = this.videoPulse ? 'flex' : 'none';
        }
        this.applyPulse();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    // Individual setter methods
    setVideoBrightness(value) {
        this.videoBrightness = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoContrast(value) {
        this.videoContrast = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoSaturation(value) {
        this.videoSaturation = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoHueRotate(value) {
        this.videoHueRotate = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoGrayscale(value) {
        this.videoGrayscale = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoSepia(value) {
        this.videoSepia = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoBlur(value) {
        this.videoBlur = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoPosterize(value) {
        this.videoPosterize = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoVignette(value) {
        this.videoVignette = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    toggleVideoInvert() {
        this.videoInvert = !this.videoInvert;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    cycleVideoMirror() {
        const modes = ['off', 'horizontal', 'vertical', 'both'];
        const currentIndex = modes.indexOf(this.videoMirror);
        this.videoMirror = modes[(currentIndex + 1) % modes.length];
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }


    // Video presets
    applyVideoPreset(preset) {
        switch (preset) {
            case 'normal':
                this.videoBrightness = 100;
                this.videoContrast = 100;
                this.videoSaturation = 100;
                this.videoHueRotate = 0;
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 0;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'dreamy':
                this.videoBrightness = 110;
                this.videoContrast = 90;
                this.videoSaturation = 120;
                this.videoHueRotate = 0;
                this.videoGrayscale = 0;
                this.videoSepia = 10;
                this.videoBlur = 3;
                this.videoVignette = 30;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'noir':
                this.videoBrightness = 90;
                this.videoContrast = 130;
                this.videoSaturation = 0;
                this.videoHueRotate = 0;
                this.videoGrayscale = 100;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 50;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'cyberpunk':
                this.videoBrightness = 120;
                this.videoContrast = 150;
                this.videoSaturation = 150;
                this.videoHueRotate = 180;
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 1;
                this.videoVignette = 40;
                this.videoPosterize = 8;
                this.videoInvert = false;
                break;

            case 'vintage':
                this.videoBrightness = 95;
                this.videoContrast = 110;
                this.videoSaturation = 70;
                this.videoHueRotate = 0;
                this.videoGrayscale = 0;
                this.videoSepia = 40;
                this.videoBlur = 0;
                this.videoVignette = 60;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'retro-tv':
                this.videoBrightness = 105;
                this.videoContrast = 95;
                this.videoSaturation = 85;
                this.videoHueRotate = 5;
                this.videoGrayscale = 10;
                this.videoSepia = 5;
                this.videoBlur = 0.5;
                this.videoVignette = 35;
                this.videoPosterize = 12;
                this.videoInvert = false;
                break;

            case 'underwater':
                this.videoBrightness = 85;
                this.videoContrast = 110;
                this.videoSaturation = 130;
                this.videoHueRotate = 200; // Blue-green shift
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 2;
                this.videoVignette = 25;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'infrared':
                this.videoBrightness = 110;
                this.videoContrast = 140;
                this.videoSaturation = 0;
                this.videoHueRotate = 0;
                this.videoGrayscale = 100;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 20;
                this.videoPosterize = 16;
                this.videoInvert = true; // Key for infrared look
                break;

            case 'acid':
                this.videoBrightness = 130;
                this.videoContrast = 170;
                this.videoSaturation = 200;
                this.videoHueRotate = 270; // Purple-pink shift
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 0.5;
                this.videoVignette = 0;
                this.videoPosterize = 6; // Heavy posterization
                this.videoInvert = false;
                break;

            case 'film-negative':
                this.videoBrightness = 100;
                this.videoContrast = 100;
                this.videoSaturation = 100;
                this.videoHueRotate = 180; // Complement colors
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 10;
                this.videoPosterize = 16;
                this.videoInvert = true;
                break;

            case 'thermal':
                this.videoBrightness = 120;
                this.videoContrast = 160;
                this.videoSaturation = 150;
                this.videoHueRotate = 280; // Red-orange-yellow gradient
                this.videoGrayscale = 0;
                this.videoSepia = 20;
                this.videoBlur = 1;
                this.videoVignette = 15;
                this.videoPosterize = 8;
                this.videoInvert = false;
                break;

            case 'matrix':
                this.videoBrightness = 70;
                this.videoContrast = 150;
                this.videoSaturation = 100;
                this.videoHueRotate = 90; // Green tint
                this.videoGrayscale = 50; // Partial desaturation
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 70; // Heavy vignette
                this.videoPosterize = 4; // Heavy posterization
                this.videoInvert = false;
                break;

            case 'glitch':
                this.videoBrightness = 110;
                this.videoContrast = 130;
                this.videoSaturation = 120;
                this.videoHueRotate = Math.random() * 360; // Random hue
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 0;
                this.videoPosterize = 3; // Extreme posterization
                this.videoInvert = Math.random() > 0.5; // Random invert
                break;

        }

        // Update all sliders and buttons to reflect new values
        this.updateVideoControlsUI();
        this.applyVideoFilters();
        this.updateDisplayFilters();
        
        // Update mixer video preset buttons
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoPresetButtons) {
            window.multiDisplayManager.updateMixerVideoPresetButtons(preset);
        }
        
        // Update mixer video control sliders
        if (window.multiDisplayManager) {
            try { window.multiDisplayManager.updateMixerVideoBrightnessSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoContrastSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoSaturationSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoHueRotateSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoGrayscaleSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoFadeTimeSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoSepiaSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoBlurSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoVignetteSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoPosterizeSlider(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoInvertToggle(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoMirrorToggle(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoPulseToggle(); } catch(e) {}
            try { window.multiDisplayManager.updateMixerVideoPulseRateSlider(); } catch(e) {}
        }
    }

    updateVideoControlsUI() { // Update sliders
        const updates = {
            'videoOpacitySlider': [
                this.videoOpacity * 100,
                '%'
            ],
            'videoBrightnessSlider': [
                this.videoBrightness, '%'
            ],
            'videoContrastSlider': [
                this.videoContrast, '%'
            ],
            'videoSaturationSlider': [
                this.videoSaturation, '%'
            ],
            'videoHueRotateSlider': [
                this.videoHueRotate, '°'
            ],
            'videoGrayscaleSlider': [
                this.videoGrayscale, '%'
            ],
            'videoSepiaSlider': [
                this.videoSepia, '%'
            ],
            'videoBlurSlider': [
                this.videoBlur, 'px'
            ],
            'videoVignetteSlider': [
                this.videoVignette, '%'
            ],
            'videoPosterizeSlider': [
                this.videoPosterize, ''
            ],
            'videoPulseRateSlider': [this.videoPulseRate, 's']
        };

        for (const [id, [
                value, unit
            ]
        ] of Object.entries(updates)) {
            const slider = document.getElementById(id);
            const display = document.getElementById(id.replace('Slider', 'Value'));
            if (slider) {
                slider.value = value;
                if (display) {
                    if (id === 'videoPosterizeSlider') {
                        display.textContent = value >= 16 ? 'Off' : `${value} levels`;
                    } else {
                        display.textContent = `${
                            Math.round(value)
                        }${unit}`;
                    }
                }
            }
        }

        // Update toggle buttons (both header and sidebar)
        this.updateVideoElements('videoInvertBtn', (btn) => {
            btn.textContent = `Invert: ${
                this.videoInvert ? 'On' : 'Off'
            }`;
            btn.classList.toggle('active', this.videoInvert);
        });

        this.updateVideoElements('videoMirrorBtn', (btn) => {
            const mirrorText = this.videoMirror === 'off' ? 'Off' : this.videoMirror.charAt(0).toUpperCase() + this.videoMirror.slice(1);
            btn.textContent = `Mirror: ${mirrorText}`;
            btn.classList.toggle('active', this.videoMirror !== 'off');
        });

        this.updateVideoElements('videoPulseBtn', (btn) => {
            btn.textContent = `Pulse: ${
                this.videoPulse ? 'On' : 'Off'
            }`;
            btn.classList.toggle('active', this.videoPulse);
        });

        // Update pulse rate container visibility (both header and sidebar)
        this.updateVideoElements('videoPulseRateContainer', (container) => {
            container.style.display = this.videoPulse ? 'flex' : 'none';
        });
    }

    setVideoOpacity(value) {
        this.videoOpacity = value;
        if (this.videoElement) {
            this.videoElement.style.transition = 'opacity 0.2s ease';
            this.videoElement.style.opacity = value.toString();

            setTimeout(() => {
                this.videoElement.style.transition = `opacity ${
                    this.videoFadeTime
                }s linear`;
            }, 200);
        }
        this.updateDisplayFilters(); // ADD THIS LINE
        
        // Update mixer video opacity slider
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoOpacitySlider) {
            window.multiDisplayManager.updateMixerVideoOpacitySlider();
        }
    }

    setVideoFadeTime(seconds) {
        this.videoFadeTime = seconds;
        if (this.videoElement) {
            this.videoElement.style.transition = `opacity ${seconds}s linear`;
        }
    }

    async startLiveInput(deviceId) {
        try {
            this.stopLiveInput();

            if (this.audio) {
                this.audio.pause();
            }

            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: deviceId ? {
                        exact: deviceId
                    } : undefined,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 48000,
                    channelCount: 2
                }
            });

            if (this.audioMotion && this.audioMotion.audioCtx) {
                if (this.audioMotion.audioCtx.state === 'suspended') {
                    await this.audioMotion.audioCtx.resume();
                }

                // CRITICAL FIX: Disconnect video audio to give live audio priority
                this.disconnectVideoAudio();

                this.audioMotion.disconnectInput();

                this.streamSource = this.audioMotion.audioCtx.createMediaStreamSource(this.audioStream);

                // Check if we need stereo processing
                const audioTracks = this.audioStream.getAudioTracks();
                const settings = audioTracks[0] ?. getSettings();
                const channelCount = settings ?. channelCount || 1;

                if (channelCount > 1 && this.audioMotion.splitter) { // Stereo source - use splitter
                    this.streamSource.connect(this.audioMotion.splitter);
                    this.audioMotion.splitter.connect(this.audioMotion.analyser, 0);
                    this.audioMotion.splitter.connect(this.audioMotion.analyserRight, 1);
                } else { // Mono source or no splitter - direct connection
                    this.streamSource.connect(this.audioMotion.analyser);
                }

                this.audioMotion.isConnected = true;
                
                // Setup audio monitoring if enabled
                this.setupAudioMonitoring();
                
                // Reconnect official AudioMotion if it needs connection
                this.reconnectOfficialAudioMotion();
            }

            // Audio input button removed - using select dropdown
            this.inputMode = 'microphone';
            this.currentDeviceId = deviceId;
            this.lastAudioDeviceId = deviceId; // Store for toggle functionality
            this.liveAudioEnabled = true; // Enable live audio toggle

            document.getElementById('trackTitle').textContent = 'Live Audio Input';
            document.getElementById('playBtn').disabled = true;
            document.getElementById('nextBtn').disabled = true;
            document.getElementById('prevBtn').disabled = true;

            // Update footer Live Audio button state
            this.updateFooterLiveAudioButton();
            
            // Update audio device selector to show selected device (header only)
            this.updateAudioElements('audioDeviceSelect', (select) => {
                select.value = deviceId;
            });
            
            // Update live audio toggle button (header only)
            this.updateAudioElements('liveAudioToggleBtn', (btn) => {
                btn.textContent = 'ON';
                btn.classList.add('active');
                btn.style.background = 'var(--accent-color)';
                btn.style.color = 'white';
            });
            
            // Update mixer audio controls
            if (window.multiDisplayManager) {
                if (window.multiDisplayManager.updateMixerAudioToggle) {
                    window.multiDisplayManager.updateMixerAudioToggle();
                }
                if (window.multiDisplayManager.updateMixerAudioDeviceSelect) {
                    window.multiDisplayManager.updateMixerAudioDeviceSelect();
                }
            }

        } catch (e) {
            console.error('Failed to start live input:', e);
            this.showError('Failed to start audio input');
        }
    }

    // Audio device selection method for mixer
    async selectAudioDevice(deviceId) {
        await this.startLiveInput(deviceId);
    }

    stopLiveInput() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }

        if (this.streamSource) {
            try {
                this.streamSource.disconnect();
            } catch (e) { // Ignore
            }
            this.streamSource = null;
        }
        
        // Disconnect monitoring if active
        this.disconnectAudioMonitoring();

        // Update footer Live Audio button state
        this.updateFooterLiveAudioButton();
        
        // Clear audio device selector (header only)
        this.updateAudioElements('audioDeviceSelect', (select) => {
            select.value = '';
        });
        
        // Update live audio toggle button (header only)
        this.updateAudioElements('liveAudioToggleBtn', (btn) => {
            btn.textContent = 'OFF';
            btn.classList.remove('active');
            btn.style.background = 'var(--hover-color)';
            btn.style.color = 'var(--text-primary)';
        });
        
        // Update live audio state
        this.liveAudioEnabled = false;
    }
    
    // Audio Monitoring Methods
    setupAudioMonitoring() {
        // Only setup monitoring if enabled and we have a stream source
        if (!this.audioMonitoringEnabled || !this.streamSource || !this.audioMotion || !this.audioMotion.audioCtx) {
            return;
        }
        
        try {
            // Disconnect any existing monitoring
            this.disconnectAudioMonitoring();
            
            // Create a gain node for monitoring
            this.monitorGainNode = this.audioMotion.audioCtx.createGain();
            this.monitorGainNode.gain.value = 1.0;
            
            // Connect stream source to monitor gain node to destination (speakers)
            this.streamSource.connect(this.monitorGainNode);
            this.monitorGainNode.connect(this.audioMotion.audioCtx.destination);
            
        } catch (e) {
            console.error('Failed to setup audio monitoring:', e);
        }
    }
    
    disconnectAudioMonitoring() {
        if (this.monitorGainNode) {
            try {
                this.monitorGainNode.disconnect();
            } catch (e) { // Ignore
            }
            this.monitorGainNode = null;
        }
    }
    
    toggleAudioMonitoring() {
        this.audioMonitoringEnabled = !this.audioMonitoringEnabled;
        
        // Save state to localStorage
        localStorage.setItem('audioMonitoringEnabled', this.audioMonitoringEnabled.toString());
        
        // Update monitoring connection
        if (this.audioMonitoringEnabled && this.streamSource) {
            this.setupAudioMonitoring();
        } else {
            this.disconnectAudioMonitoring();
        }
        
        // Update UI
        this.updateAudioMonitorButton();
        
    }
    
    updateAudioMonitorButton() {
        const mixerBtn = document.getElementById('mixerAudioMonitorBtn');
        const headerBtn = document.getElementById('headerAudioMonitorBtn');
        
        const isOn = this.audioMonitoringEnabled;
        const buttonText = isOn ? 'Monitor Input: ON' : 'Monitor Input: OFF';
        
        // Update mixer button
        if (mixerBtn) {
            mixerBtn.textContent = buttonText;
            if (isOn) {
                mixerBtn.classList.add('active');
            } else {
                mixerBtn.classList.remove('active');
            }
        }
        
        // Update header button
        if (headerBtn) {
            headerBtn.textContent = buttonText;
            if (isOn) {
                headerBtn.classList.add('active');
            } else {
                headerBtn.classList.remove('active');
            }
        }
    }

    resumePlaylist() {
        document.getElementById('playBtn').disabled = false;
        document.getElementById('nextBtn').disabled = false;
        document.getElementById('prevBtn').disabled = false;

        if (this.audio && this.audioMotion) {
            // CRITICAL FIX: Disconnect video audio to give playlist priority
            this.disconnectVideoAudio();
            
            this.audioMotion.connectInput(this.audio);
            this.updateTrackInfo();
            
            // Reconnect official AudioMotion if it needs connection
            this.reconnectOfficialAudioMotion();
        }
    }

    showSystemAudioHelp() {
        const helpText = `
To capture system audio on Mac:

1. Install BlackHole (free): 
   https://existential.audio/blackhole/

2. Open "Audio MIDI Setup" (in Applications/Utilities)

3. Click "+" button → "Create Multi-Output Device"

4. Check both "BlackHole 2ch" and your speakers

5. Set this Multi-Output as system output

6. In Freque, select "BlackHole 2ch" as input

This routes system audio to both speakers and visualizer.

Alternative: Loopback ($99) - easier but paid
https://rogueamoeba.com/loopback/
`;

        alert(helpText);
    }

    generateNewProMorphTarget() {
        const baseConfig = this.lockedMorphParams || {};

        // Check if we're in radial mode
        const isRadial = baseConfig.radial !== undefined ? baseConfig.radial : Math.random() > 0.6;

        // Use locked spinSpeed if it exists, otherwise keep current
        const spinSpeed = baseConfig.spinSpeed !== undefined ? baseConfig.spinSpeed : (this.morphStartConfig ? this.morphStartConfig.spinSpeed : 0);

        // Generate mode for Pro (1-8 and 10, exclude modes 0 and 9)
        let randomMode;
        const validModes = [1, 2, 3, 4, 5, 6, 7, 8, 10];
        randomMode = validModes[Math.floor(Math.random() * validModes.length)];
        
        this.morphTargetConfig = {
            // Keep locked parameters unchanged (same as Regular AM)
            mode: baseConfig.mode !== undefined ? baseConfig.mode : randomMode,
            radial: isRadial,
            mirror: baseConfig.mirror !== undefined ? baseConfig.mirror : (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0),
            ledBars: baseConfig.ledBars !== undefined ? baseConfig.ledBars : false,
            ansiBands: baseConfig.ansiBands !== undefined ? baseConfig.ansiBands : Math.random() > 0.7,
            channelLayout: baseConfig.channelLayout || (Math.random() > 0.7 ? 
                (Math.random() > 0.5 ? 'dual-vertical' : 'dual-horizontal') : 'single'),
            frequencyScale: baseConfig.frequencyScale || (Math.random() > 0.5 ? 'log' : 'bark'),
            spinSpeed: spinSpeed,

            // Variable parameters that can change (same as Regular AM, but exclude reflex properties)
            barSpace: Math.random() * 0.05,
            fillAlpha: isRadial ? 1 : 0.8 + Math.random() * 0.2,
            smoothing: 0.3 + Math.random() * 0.5,
            gradient: ['classic', 'rainbow', 'prism', 'steelblue', 'orangered'][Math.floor(Math.random() * 5)],
            showPeaks: Math.random() > 0.5,
            radius: isRadial ? 0.2 + Math.random() * 0.6 : 0.3 + Math.random() * 0.4,
            roundBars: Math.random() > 0.5,
            lineWidth: isRadial ? 4 + Math.random() * 4 : Math.random() * 2,

            // Critical parameters for visibility - boost these for radial
            maxDecibels: isRadial ? -15 + Math.random() * 5 : -20 + Math.random() * 10,
            minDecibels: isRadial ? -70 + Math.random() * 10 : -80 + Math.random() * 10,
            maxFreq: 16000 + Math.random() * 6000,
            minFreq: 20 + Math.random() * 30,
            linearAmplitude: true,
            linearBoost: isRadial ? 3 + Math.random() * 3 : 2 + Math.random() * 3,

            // Other parameters (same as Regular AM, exclude reflex properties)
            alphaBars: false,
            fadePeaks: false,
            loRes: false,
            lumiBars: false,
            maxFPS: 0,
            noteLabels: false,
            outlineBars: Math.random() > 0.7,
            peakFadeTime: 500 + Math.random() * 500,
            peakHoldTime: 300 + Math.random() * 400,
            peakLine: false,
            showFPS: false,
            showScaleY: false,
            splitGradient: false,
            trueLeds: Math.random() > 0.5,
            useCanvas: true,
            weightingFilter: ['', 'A', 'B', 'C', 'D'][Math.floor(Math.random() * 5)],

            // Pro-specific parameters (always locked)
            colorMode: 'bar-level', // Always keep Pro color mode
            overlay: true, // Always keep Pro overlay
            showBgColor: false, // Always keep Pro background transparent
            fftSize: 8192
            // Note: bgAlpha and reflex properties excluded as requested
        };

    }

    // Preset Methods
    async exportPresets() {
        try {
            const dataStr = JSON.stringify(this.savedPresets, null, 2);
            
            // Generate default filename with timestamp
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
            const defaultFilename = `Melt_Visualizer_Presets_${timestamp}.json`;
            
            // Try File System Access API first (modern browsers)
            if ('showSaveFilePicker' in window) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: defaultFilename,
                        types: [{
                            description: 'JSON files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    
                    const writable = await fileHandle.createWritable();
                    await writable.write(dataStr);
                    await writable.close();
                    
                    // Show success message
                    this.showSuccessMessage('Presets exported successfully');
                    return;
                } catch (err) {
                    // User cancelled or error occurred, fall back to download
                    if (err.name !== 'AbortError') {
                        console.warn('File System Access API failed, falling back to download:', err);
                    } else {
                        // User cancelled - don't show error
                        return;
                    }
                }
            }
            
            // Fallback to traditional download for older browsers
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = defaultFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Show success message
            this.showSuccessMessage('Presets exported successfully');
            
        } catch (e) {
            console.error('Error exporting presets:', e);
            alert('Failed to export presets: ' + e.message);
        }
    }

    showSuccessMessage(message) {
        // Reuse the existing error notification system with success styling
        const errorDiv = document.getElementById('error');
        const errorText = document.getElementById('error-text');
        if (errorDiv && errorText) {
            errorDiv.style.display = 'block';
            errorDiv.style.background = 'var(--success-color, #10b981)';
            errorText.textContent = message;
            document.getElementById('loading').style.display = 'none';

            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.style.background = ''; // Reset background
            }, 3000);

            errorDiv.onclick = () => {
                errorDiv.style.display = 'none';
                errorDiv.style.background = ''; // Reset background
            };
        }
    }

    importPresets(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    imported.forEach(importedPreset => {
                        const existingIndex = this.savedPresets.findIndex(p => p.name === importedPreset.name);
                        if (existingIndex >= 0) {
                            if (confirm(`Preset "${
                                importedPreset.name
                            }" already exists. Overwrite?`)) {
                                this.savedPresets[existingIndex] = importedPreset;
                            }
                        } else {
                            this.savedPresets.push(importedPreset);
                        }
                    });

                    if (this.savedPresets.length > 30) {
                        this.savedPresets = this.savedPresets.slice(-30);
                    }

                    this.savePresets();
                    this.updatePresetSelector();
                    
                    // Update header preset selector
                    const headerSelector = document.getElementById('headerPresetSelector');
                    if (headerSelector) {
                        this.loadPresetOptions(headerSelector);
                    }
                    
                    // Update mixer preset selector
                    if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAMPresetSelector) {
                        window.multiDisplayManager.updateMixerAMPresetSelector();
                    }
                    
                    alert(`Successfully imported ${
                        imported.length
                    } preset(s)`);
                } else {
                    alert('Invalid preset file format');
                }
            } catch (error) {
                console.error('Error importing presets:', error);
                alert('Failed to import presets: Invalid file');
            }
        };
        reader.readAsText(file);
    }

    // METHODS

    applyBrightnessBoost(config) { // Force minimum opacity
        if (config.fillAlpha !== undefined) {
            config.fillAlpha = Math.max(0.8, Math.min(1, config.fillAlpha * 2));
        } else {
            config.fillAlpha = 0.9;
        }

        // Force brighter reflections
        if (config.reflexAlpha !== undefined) {
            config.reflexAlpha = Math.max(0.5, Math.min(1, config.reflexAlpha * 2));
        }

        // Amplitude settings for full screen
        config.linearAmplitude = true;
        config.linearBoost = 5;
        config.maxDecibels = -5;
        config.minDecibels = -60;
        config.volume = 2.5;

        // Bar spacing
        config.barSpace = 0.05;

        // Radial settings - FIX FOR MISSING LINES
        if (config.radial) {
            config.radius = 0.8;
            config.lineWidth = Math.max(5, config.lineWidth || 5); // Force thick lines
            if (config.spinSpeed) {
                config.spinSpeed = config.spinSpeed * 0.5;
            }
        }

        // Force line width for line modes
        if (config.mode === 10) {
            config.lineWidth = Math.max(3, config.lineWidth || 2);
        }

        return config;
    }

    applyMorphConfig(config) {
        if (!this.audioMotion) 
            return;
        


        // Don't recalculate frequency bands during morph - keep them stable
        const morphConfig = {
            ...config,
            _isMorphing: true, // Add this flag to prevent resets in setOptions
            showScaleX: false,
            fftSize: config.fftSize || 8192,
            fillAlpha: Math.max(0.6, config.fillAlpha || 0.8),
            volume: config.volume || 1,
            linearBoost: config.linearBoost || 1.5,
            maxDecibels: config.maxDecibels || -25,
            minDecibels: config.minDecibels || -85
        };

        // Save current frequency scale to prevent band recalculation
        const currentFreqScale = this.audioMotion.frequencyScale;
        const currentAnsiBands = this.audioMotion.ansiBands;
        const currentSpinAngle = this.audioMotion.spinAngle;

        try {
            this.audioMotion.setOptions(morphConfig);

            // Force preserve critical animation state
            if (this.isMorphing) { // Restore spin angle if it got reset somehow
                if (this.audioMotion.spinAngle !== currentSpinAngle) {
                    this.audioMotion.spinAngle = currentSpinAngle;
                }

                // If frequency scale changed, force it back to prevent wobble
                if (this.audioMotion.frequencyScale !== currentFreqScale || this.audioMotion.ansiBands !== currentAnsiBands) {
                    this.audioMotion.frequencyScale = currentFreqScale;
                    this.audioMotion.ansiBands = currentAnsiBands;
                }
            }
        } catch (e) {
            console.error('Error applying morph config:', e);
        }
    }

    setVisualizationMode(modeIndex) {
        this.currentMode = modeIndex;
        // Save to localStorage for persistence
        localStorage.setItem('freque_am_currentMode', modeIndex.toString());

        if (this.audioMotion && modeIndex >= 0 && modeIndex < this.visualizationModes.length) {
            const config = {
                ...this.visualizationModes[modeIndex]
            };
            // DON'T apply brightness boost to standard presets - they're already tuned

            try {
                this.audioMotion.setOptions(config);
            } catch (error) {
                console.warn(`Could not set visualization mode ${modeIndex}:`, error);
            }
        }
        
        // Update mixer viz mode select
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAMVizModeSelect) {
            window.multiDisplayManager.updateMixerAMVizModeSelect();
        }
    }

    setRandomVisualization() {
        // Check if we're using Pro visualizations
        if (this.useOfficialAudioMotion) {
            this.setRandomProVisualization();
            return;
        }
        
        // Regular AM random logic (unchanged)
        const randomMode = Math.floor(Math.random() * 11);

        const randomConfig = {
            mode: randomMode,
            alphaBars: false,
            ansiBands: randomMode === 1 || randomMode === 2 ? Math.random() > 0.5 : false,
            barSpace: randomMode === 0 ? 0 : Math.random() * 0.05, // No space for mode 0 (fluid)
            fillAlpha: 0.8 + Math.random() * 0.2, // Keep high for brightness (0.8-1.0)
            frequencyScale: Math.random() > 0.5 ? 'log' : 'linear',
            gradient: [
                'classic',
                'rainbow',
                'prism',
                'steelblue',
                'orangered'
            ][Math.floor(Math.random() * 5)],
            gravity: 1 + Math.random() * 5,
            ledBars: randomMode === 6 ? Math.random() > 0.3 : false,
            linearAmplitude: true, // Always true for better visibility
            linearBoost: 2 + Math.random() * 2, // 2-4 for good brightness
            lineWidth: randomMode === 10 ? 3 + Math.random() * 2 : Math.random() * 5,
            maxDecibels: -20 + Math.random() * 10, // Better range
            minDecibels: -80 + Math.random() * 10,
            maxFreq: 16000 + Math.random() * 6000,
            minFreq: 20 + Math.random() * 30,
            mirror: Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0,
            outlineBars: Math.random() > 0.7,
            peakFadeTime: 500 + Math.random() * 500,
            peakHoldTime: 300 + Math.random() * 400,
            radial: Math.random() > 0.6,
            radialInvert: Math.random() > 0.5,
            radius: 0.8 + Math.random() * 0.4, // Larger radius (0.8-1.2)
            reflexAlpha: 0.5 + Math.random() * 0.5, // Higher minimum
            reflexRatio: Math.random(),
            roundBars: Math.random() > 0.5,
            showBgColor: Math.random() > 0.3,
            showPeaks: Math.random() > 0.3,
            showScaleX: false,
            smoothing: 0.5 + Math.random() * 0.3, // 0.5-0.8 for smoother animation
            spinSpeed: Math.random() > 0.6 ? Math.random() * 2 : 0,
            trueLeds: randomMode === 6 ? Math.random() > 0.5 : false,
            channelLayout: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'dual-vertical' : 'dual-horizontal') : 'single',
            colorMode: 'gradient',
            fadePeaks: false,
            fftSize: 8192,
            loRes: false,
            lumiBars: false,
            maxFPS: 0,
            noteLabels: false,
            overlay: false,
            peakLine: false,
            reflexBright: 1,
            reflexFit: true,
            showFPS: false,
            showScaleY: false,
            splitGradient: false,
            useCanvas: true,
            weightingFilter: ''
        };

        // Special handling for radial mode to ensure visibility
        if (randomConfig.radial) {
            randomConfig.lineWidth = Math.max(3, randomConfig.lineWidth || 3); // Minimum line width
            randomConfig.radius = 0.8 + Math.random() * 0.6; // 0.8-1.4 for better visibility
            randomConfig.fillAlpha = 1; // Full opacity for radial
        }

        document.querySelectorAll('#vizModeDropdown .dropdown-item').forEach(item => {
            item.classList.remove('active');
        });
        // Sidebar vizModeToggle removed - functionality moved to header

        if (this.audioMotion) {
            this.audioMotion.setOptions(randomConfig);

            const preset = {
                name: 'Last Random',
                timestamp: Date.now(),
                config: randomConfig
            };

            // Remove any existing "Last Random" preset (regular or Pro)
            this.savedPresets = this.savedPresets.filter(p => p.name !== 'Last Random');
            
            // Add new "Last Random" preset
                this.savedPresets.push(preset);

            this.savePresets();
            this.updatePresetSelector();
            
            // Also update the header preset selector
            const headerSelector = document.getElementById('headerPresetSelector');
            if (headerSelector) {
                this.loadPresetOptions(headerSelector);
            }
        }
    }

    // Pro Random Visualization Methods
    setRandomProVisualization() {
        if (!this.officialAudioMotion) {
            return;
        }

        const randomProConfig = this.generateRandomProConfig();
        
        // Apply to official AudioMotion
        this.officialAudioMotion.setOptions(randomProConfig);
        
        
        // Save as "Last Random" preset for reference
        const preset = {
            name: 'Last Random',
            timestamp: Date.now(),
            config: randomProConfig,
            useOfficial: true
        };

        // Remove any existing "Last Random" preset (regular or Pro)
        this.savedPresets = this.savedPresets.filter(p => p.name !== 'Last Random');
        
        // Add new "Last Random" preset
            this.savedPresets.push(preset);

        this.savePresets();
        this.updatePresetSelector();
        
        // Also update the header preset selector
        const headerSelector = document.getElementById('headerPresetSelector');
        if (headerSelector) {
            this.loadPresetOptions(headerSelector);
        }
    }

    generateRandomProConfig() {
        // Official AudioMotion supports modes 0-8 (not 9-10 like custom AM)
        const randomMode = Math.floor(Math.random() * 9);
        
        return {
            // Core visualization parameters
            mode: randomMode,
            colorMode: 'bar-level', // Keep for Pro compatibility
            
            // Visual style parameters (same logic as regular AM)
            alphaBars: false,
            ansiBands: randomMode === 1 || randomMode === 2 ? Math.random() > 0.5 : false,
            barSpace: randomMode === 0 ? 0 : Math.random() * 0.05,
            fillAlpha: 0.8 + Math.random() * 0.2,
            
            // Frequency and audio parameters
            frequencyScale: Math.random() > 0.5 ? 'log' : 'bark',
            gradient: ['classic', 'rainbow', 'prism', 'steelblue', 'orangered'][Math.floor(Math.random() * 5)],
            gravity: 1 + Math.random() * 5,
            
            // Advanced parameters
            ledBars: randomMode === 6 ? Math.random() > 0.3 : false,
            linearAmplitude: Math.random() > 0.5,
            linearBoost: 2 + Math.random() * 2,
            lineWidth: randomMode === 10 ? 3 + Math.random() * 2 : Math.random() * 5,
            
            // Audio range parameters
            maxDecibels: -20 + Math.random() * 10,
            minDecibels: -80 + Math.random() * 10,
            maxFreq: 16000 + Math.random() * 6000,
            minFreq: 20 + Math.random() * 30,
            
            // Spatial parameters
            mirror: Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0,
            radial: Math.random() > 0.6,
            radialInvert: Math.random() > 0.5,
            radius: 0.8 + Math.random() * 0.4,
            spinSpeed: Math.random() > 0.6 ? Math.random() * 5 : 0,
            
            // Visual effects
            outlineBars: Math.random() > 0.7,
            roundBars: Math.random() > 0.5,
            showPeaks: Math.random() > 0.3,
            trueLeds: randomMode === 6 ? Math.random() > 0.5 : false,
            
            // Reflection parameters
            reflexAlpha: 0.5 + Math.random() * 0.5,
            reflexRatio: Math.random(),
            reflexBright: 1,
            reflexFit: true,
            
            // Channel layout
            channelLayout: Math.random() > 0.7 ? 
                (Math.random() > 0.5 ? 'dual-vertical' : 'dual-horizontal') : 'single',
            
            // Performance and timing
            peakFadeTime: 500 + Math.random() * 1500,
            peakHoldTime: 300 + Math.random() * 400,
            smoothing: 0.5 + Math.random() * 0.3,
            
            // Fixed Pro-specific parameters
            bgAlpha: 0,
            showBgColor: false,
            overlay: true,
            fftSize: 8192,
            weightingFilter: ['', 'A', 'B', 'C', 'D'][Math.floor(Math.random() * 5)],
            
            // Static parameters
            fadePeaks: false,
            loRes: false,
            lumiBars: false,
            maxFPS: 0,
            noteLabels: false,
            peakLine: false,
            showFPS: false,
            showScaleX: false,
            showScaleY: false,
            splitGradient: false,
            useCanvas: true
        };
    }

    // Kaleidoscope
    /**
     * Get all active visualization canvases sorted by z-index order
     * Used by Kaleidoscope, RecordManager, and LiveDisplayManager to render in correct z-order
     * IMPORTANT: Uses same canvas selection logic as plugin-mixer-integration.js applyZIndexToVisualization()
     */
    getActiveCanvasesInZIndexOrder() {
        const canvases = [];
        
        // Collect all active canvases with their z-indexes
        // Use SAME canvas selection logic as mixer to ensure we read the right z-index!
        
        // VIDEO - add video element as a source with its z-index
        const videoElement = document.getElementById('bgVideo') || document.getElementById('bgVideoPlaceholder');
        if (videoElement && (this.videoMode === 'camera' || this.videoMode === 'file')) {
            const zIndex = parseInt(videoElement.style.zIndex) || 2;
            canvases.push({ 
                canvas: videoElement, 
                zIndex, 
                type: 'video',
                isVideo: true, // Flag to identify video elements
                applyToKalProperty: 'kaleidoscopeApplyToVideo',
                shouldDrawSeparately: () => !this.kaleidoscopeEnabled || !this.kaleidoscopeApplyToVideo
            });
        }
        
        // AM Visualizer
        const amCanvas = document.querySelector('canvas[data-visualization="amvisualizer"]') ||
                        (this.audioMotion?.canvas);
        if (amCanvas && this.visualizationEnabled) {
            const zIndex = parseInt(amCanvas.style.zIndex) || 3;
            canvases.push({ 
                canvas: amCanvas, 
                zIndex, 
                type: 'audioMotion',
                applyToKalProperty: 'kaleidoscopeApplyToViz',
                shouldDrawSeparately: () => !this.kaleidoscopeEnabled || !this.kaleidoscopeApplyToViz
            });
        }
        
        // Infinite Zoom - use same selection logic as mixer
        let izCanvas = document.querySelector('canvas[data-visualization="infinitezoom"]');
        if (!izCanvas && this.infiniteZoom?.canvas) {
            const fallbackCanvas = this.infiniteZoom.canvas;
            if (fallbackCanvas.getAttribute('data-visualization') === 'infinitezoom') {
                izCanvas = fallbackCanvas;
            }
        }
        if (izCanvas && this.infiniteZoom?.isActive) {
            const zIndex = parseInt(izCanvas.style.zIndex) || 4;
            canvases.push({ 
                canvas: izCanvas, 
                zIndex, 
                type: 'infiniteZoom',
                applyToKalProperty: 'kaleidoscopeApplyToInfiniteZoom',
                shouldDrawSeparately: () => !this.kaleidoscopeEnabled || !this.kaleidoscopeApplyToViz || !this.kaleidoscopeApplyToInfiniteZoom
            });
        }
        
        // Blobs (if active) - handled by plugin system now
        const blobsCanvas = document.getElementById('blobs-plugin-canvas');
        if (blobsCanvas && this.blobsEnabled && this.blobsVisualization?.isActive) {
            const zIndex = parseInt(blobsCanvas.style.zIndex) || 5;
            canvases.push({ 
                canvas: blobsCanvas, 
                zIndex, 
                type: 'blobs',
                applyToKalProperty: null, // Blobs always included if active
                shouldDrawSeparately: () => true
            });
        }
        
        // WebGL Visualization (Starfall) - use same selection logic as mixer
        const starfallCanvas = document.querySelector('canvas[data-visualization="starfall"]') ||
                              (this.webGLVisualization?.canvas);
        if (starfallCanvas && this.webglEnabled && this.webglVisualization?.isActive) {
            const zIndex = parseInt(starfallCanvas.style.zIndex) || 4;
            canvases.push({ 
                canvas: starfallCanvas, 
                zIndex, 
                type: 'webgl',
                webglSupported: this.webglVisualization.webglSupported,
                applyToKalProperty: 'kaleidoscopeApplyToWebGL',
                shouldDrawSeparately: () => !this.kaleidoscopeEnabled || !this.kaleidoscopeApplyToViz || !this.kaleidoscopeApplyToWebGL
            });
        }
        
        // Fluid Dynamics
        if (this.fluidDynamics?.isActive && this.fluidDynamics.canvas) {
            const zIndex = parseInt(this.fluidDynamics.canvas.style.zIndex) || 7;
            canvases.push({ 
                canvas: this.fluidDynamics.canvas, 
                zIndex, 
                type: 'fluidDynamics',
                opacity: this.fluidDynamics.opacity || 1.0,
                applyToKalProperty: 'kaleidoscopeApplyToFluidDynamics',
                shouldDrawSeparately: () => !this.kaleidoscopeEnabled || !this.kaleidoscopeApplyToViz || !this.kaleidoscopeApplyToFluidDynamics
            });
        }
        
        // Plugins - use same selection logic as mixer
        if (window.pluginManager) {
            const allPlugins = window.pluginManager.getAllPlugins();
            allPlugins.forEach(plugin => {
                if (plugin.canvas && plugin.isActive && plugin.canvas.width > 0 && plugin.canvas.height > 0) {
                    // Try to find canvas by data-visualization or id (same as mixer)
                    const pluginCanvas = document.querySelector(`canvas[data-visualization="plugin-${plugin.pluginName}"]`) ||
                                        document.getElementById(`${plugin.pluginName}-plugin-canvas`) ||
                                        plugin.canvas;
                    
                    const zIndex = parseInt(pluginCanvas.style.zIndex) || 9;
                    const stateVarName = `kaleidoscopeApplyTo${plugin.pluginName.charAt(0).toUpperCase() + plugin.pluginName.slice(1)}`;
                    canvases.push({ 
                        canvas: pluginCanvas, 
                        zIndex, 
                        type: 'plugin',
                        pluginName: plugin.pluginName,
                        plugin: plugin,
                        applyToKalProperty: stateVarName,
                        shouldDrawSeparately: () => !this.kaleidoscopeEnabled || !this[stateVarName]
                    });
                }
            });
        }
        
        // Sort by z-index (lowest to highest = back to front)
        return canvases.sort((a, b) => a.zIndex - b.zIndex);
    }
    
    initKaleidoscope() {
        const container = document.getElementById('visualizationContainer');
        const rect = container.getBoundingClientRect();

        // Create single kaleidoscope canvas for ALL sources (video + visualizations)
        if (!this.kaleidoscopeCanvas) {
            this.kaleidoscopeCanvas = document.createElement('canvas');
            this.kaleidoscopeCanvas.className = 'kaleidoscope-canvas';
            this.kaleidoscopeCanvas.style.display = 'none';
            this.kaleidoscopeCanvas.style.zIndex = '100'; // Above all visualizations
            container.appendChild(this.kaleidoscopeCanvas);
            this.kaleidoscopeCtx = this.kaleidoscopeCanvas.getContext('2d');
        }

        // Set canvas size
        this.kaleidoscopeCanvas.width = rect.width;
        this.kaleidoscopeCanvas.height = rect.height;
        
        // Keep legacy references for backwards compatibility (point to same canvas)
        this.kaleidoscopeVideoCanvas = this.kaleidoscopeCanvas;
        this.kaleidoscopeVideoCtx = this.kaleidoscopeCtx;
        this.kaleidoscopeVizCanvas = this.kaleidoscopeCanvas;
        this.kaleidoscopeVizCtx = this.kaleidoscopeCtx;
    }

    toggleKaleidoscope() {
        // Sidebar kaleidoscope panel removed - functionality moved to header

        // Toggle panel visibility
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';

            // Update button based on kaleidoscope state (not panel state)
            if (this.kaleidoscopeEnabled) {
                btnText.textContent = 'Kaleidoscope On';
                btn.classList.add('active');
            } else {
                btnText.textContent = 'Kaleidoscope Off';
                btn.classList.remove('active');
            }
        }
    }

    toggleHeaderKaleidoscope() {
        const panel = document.getElementById('headerKaleidoscopePanel');
        const btn = document.getElementById('headerKaleidoscopeBtn');
        const btnText = btn.querySelector('.kaleidoscope-btn-text');

        // Toggle panel visibility
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            if (isVisible) {
                panel.style.display = 'none';
            } else {
                this.closeAllPanels(); // CLOSE ALL PANELS FIRST
                // Position panel using new system
                const buttonRect = btn.getBoundingClientRect();
                panel.style.left = `${buttonRect.left}px`;
                panel.style.top = `${buttonRect.bottom + 5}px`;
                panel.style.display = 'block';
            }

            // Update button based on any Apply To button being ON
            const anyApplyToActive = this.kaleidoscopeApplyToVideo || this.kaleidoscopeApplyToViz || this.kaleidoscopeApplyToInfiniteZoom || this.kaleidoscopeApplyToWebGL || this.kaleidoscopeApplyToFluidDynamics || this.kaleidoscopeApplyToNebula;
            if (anyApplyToActive) {
                btnText.textContent = 'Kaleidoscope';
                btn.classList.add('active');
            } else {
                btnText.textContent = 'Kaleidoscope';
                btn.classList.remove('active');
            }
        }
    }

    updateKaleidoscopeButtonState() {
        const btn = document.getElementById('headerKaleidoscopeBtn');
        if (!btn) return;
        
        const btnText = btn.querySelector('.kaleidoscope-btn-text');
        if (!btnText) return;
        
        // Check if any Apply To button is active
        const anyApplyToActive = this.kaleidoscopeApplyToVideo || this.kaleidoscopeApplyToViz || this.kaleidoscopeApplyToInfiniteZoom || this.kaleidoscopeApplyToWebGL || this.kaleidoscopeApplyToFluidDynamics || this.kaleidoscopeApplyToNebula;
        
        if (anyApplyToActive) {
            btnText.textContent = 'Kaleidoscope';
            btn.classList.add('active');
        } else {
            btnText.textContent = 'Kaleidoscope';
            btn.classList.remove('active');
        }
    }

    // Blobs toggle methods
    toggleBlobs() {
        this.blobsEnabled = !this.blobsEnabled;
        
        //     enabled: this.blobsEnabled,
        //     visualization: !!this.blobsVisualization,
        //     canvas: this.blobsVisualization ? this.blobsVisualization.canvas : null
        // });
        
        if (this.blobsEnabled) {
            this.blobsVisualization.start();
        } else {
            this.blobsVisualization.stop();
        }
        
        this.updateBlobsButton();
        
        // Update mixer UI
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerBlobsToggle) {
            window.multiDisplayManager.updateMixerBlobsToggle();
        }
        
        // Re-apply z-indexes after canvas creation/destruction
        if (window.pluginMixerIntegration) {
            window.pluginMixerIntegration.reapplyZIndexes();
        }
    }

    // WebGL toggle methods
    toggleWebGL() {
        this.webglEnabled = !this.webglEnabled;
        
        //     enabled: this.webglEnabled,
        //     visualization: !!this.webglVisualization,
        //     canvas: this.webglVisualization ? this.webglVisualization.canvas : null
        // });
        
        if (this.webglEnabled) {
            if (this.webglVisualization) {
                this.webglVisualization.start();
            } else {
                console.error('🎮 WebGL visualization not initialized!');
                this.webglEnabled = false; // Revert if not initialized
            }
        } else {
            if (this.webglVisualization) {
                this.webglVisualization.stop();
            }
        }
        
        this.updateWebGLButton();
        
        // Update mixer UI via MultiDisplayManager
        if (window.multiDisplayManager) {
            window.multiDisplayManager.updateMixerStarfallToggle();
            window.multiDisplayManager.updateMixerStarfallOpacitySlider();
        }
        
        // Re-apply z-indexes after canvas creation/destruction
        if (window.pluginMixerIntegration) {
            window.pluginMixerIntegration.reapplyZIndexes();
        }
    }

    updateWebGLButton() {
        // Update header button
        const headerBtn = document.getElementById('headerWebGLBtn');
        const headerBtnText = headerBtn ? headerBtn.querySelector('.webgl-btn-text') : null;
        
        if (headerBtn && headerBtnText) {
            // Always keep the text as "Starfall" regardless of state
            headerBtnText.textContent = 'Starfall';
            
            if (this.webglEnabled) {
                headerBtn.classList.add('active');
            } else {
                headerBtn.classList.remove('active');
            }
        }
        
        // Update header toggle button
        const headerToggleBtn = document.getElementById('headerWebGLToggleBtn');
        const headerToggleText = headerToggleBtn ? headerToggleBtn.querySelector('.toggle-text') : null;
        
        if (headerToggleBtn && headerToggleText) {
            if (this.webglEnabled) {
                headerToggleText.textContent = 'ON';
                headerToggleBtn.classList.add('active');
            } else {
                headerToggleText.textContent = 'OFF';
                headerToggleBtn.classList.remove('active');
            }
        }
    }

    toggleHeaderBlobs() {
        const panel = document.getElementById('headerBlobsPanel');
        const btn = document.getElementById('headerBlobsBtn');
        
        
        // Toggle panel visibility
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            
            if (isVisible) {
                panel.style.display = 'none';
            } else {
                this.closeAllPanels(); // CLOSE ALL PANELS FIRST
                // Position panel below button
                const buttonRect = btn.getBoundingClientRect();
                
                
                // Position relative to viewport, then adjust for scroll
                panel.style.position = 'fixed';
                panel.style.left = `${buttonRect.left}px`;
                panel.style.top = `${buttonRect.bottom + 5}px`;
                panel.style.zIndex = '1000';
                
                panel.style.display = 'block';
            }
        } else {
            console.error('🔵 headerBlobsPanel not found!');
        }
    }

    toggleHeaderWebGL() {
        const panel = document.getElementById('headerWebGLPanel');
        const btn = document.getElementById('headerWebGLBtn');
        
        
        // Toggle panel visibility
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            
            if (isVisible) {
                panel.style.display = 'none';
            } else {
                this.closeAllPanels(); // CLOSE ALL PANELS FIRST
                // Position panel below button
                const buttonRect = btn.getBoundingClientRect();
                
                
                // Position relative to viewport, then adjust for scroll
                panel.style.position = 'fixed';
                panel.style.left = `${buttonRect.left}px`;
                panel.style.top = `${buttonRect.bottom + 5}px`;
                panel.style.zIndex = '1000';
                
                panel.style.display = 'block';
            }
        } else {
            console.error('🎮 headerWebGLPanel not found!');
        }
    }
    
    updateBlobsButton() {
        // Update header button
        const headerBtn = document.getElementById('headerBlobsBtn');
        const headerBtnText = headerBtn ? headerBtn.querySelector('.blobs-btn-text') : null;
        
        if (headerBtn && headerBtnText) {
            headerBtnText.textContent = 'Blobs';
            if (this.blobsEnabled) {
                headerBtn.classList.add('active');
            } else {
                headerBtn.classList.remove('active');
            }
        }
        
        // Update toggle button
        const toggleBtn = document.getElementById('headerBlobsToggleBtn');
        const toggleText = toggleBtn ? toggleBtn.querySelector('.toggle-text') : null;
        
        if (toggleBtn && toggleText) {
            if (this.blobsEnabled) {
                toggleText.textContent = 'ON';
                toggleBtn.classList.add('active');
            } else {
                toggleText.textContent = 'OFF';
                toggleBtn.classList.remove('active');
            }
        }
    }

    positionBlobsPanel() {
        const blobsBtn = document.getElementById('headerBlobsBtn');
        const panel = document.getElementById('headerBlobsPanel');
        
        if (blobsBtn && panel) {
            const btnRect = blobsBtn.getBoundingClientRect();
            const advancedVizSection = document.querySelector('.header-left');
            const advancedVizRect = advancedVizSection ? advancedVizSection.getBoundingClientRect() : null;
            
            // Position panel outside the Advanced-viz area, aligned with button bottom + 4px gap
            let left = btnRect.left;
            let top = btnRect.bottom + 4;
            
            // If Advanced-viz section is available, position outside it
            if (advancedVizRect) {
                left = Math.max(left, advancedVizRect.right + 10); // 10px gap from Advanced-viz area
            }
            
            panel.style.left = left + 'px';
            panel.style.top = top + 'px';
            
        }
    }

    resizeKaleidoscopeCanvases() {
        if (!this.kaleidoscopeVideoCanvas || !this.kaleidoscopeVizCanvas) return;
        
        const container = document.getElementById('visualizationContainer');
        if (!container) {
            console.error('🔮 Kaleidoscope: Container not found during resize!');
            return;
        }
        
        const rect = container.getBoundingClientRect();
        
        // Store old dimensions for any future scaling needs
        const oldWidth = this.kaleidoscopeVideoCanvas.width || rect.width;
        const oldHeight = this.kaleidoscopeVideoCanvas.height || rect.height;
        
        // Ensure minimum dimensions
        const newWidth = Math.max(rect.width, 800);
        const newHeight = Math.max(rect.height, 600);
        
        // Calculate scale factors (for potential future use)
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;
        
        // Update canvas dimensions
        this.kaleidoscopeVideoCanvas.width = newWidth;
        this.kaleidoscopeVideoCanvas.height = newHeight;
        this.kaleidoscopeVizCanvas.width = newWidth;
        this.kaleidoscopeVizCanvas.height = newHeight;
        
        // Note: Kaleidoscope doesn't have persistent particles like Blobs, 
        // so no particle scaling is needed. The effect is recalculated each frame
        // based on current canvas dimensions and center positions.
        
    }

    setupBlobsControls() {
        // Opacity slider
        const opacitySlider = document.getElementById('blobsOpacitySlider');
        const opacityValue = document.getElementById('blobsOpacityValue');
        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', (e) => {
                const value = e.target.value;
                opacityValue.textContent = value + '%';
                this.blobsVisualization.setOpacity(value);
            });
        }

        // Saturation slider
        const saturationSlider = document.getElementById('blobsSaturationSlider');
        const saturationValue = document.getElementById('blobsSaturationValue');
        if (saturationSlider && saturationValue) {
            saturationSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                saturationValue.textContent = value + '%';
                this.blobsVisualization.setSaturation(value);
            });
        }

        // Posterize slider
        const posterizeSlider = document.getElementById('blobsPosterizeSlider');
        const posterizeValue = document.getElementById('blobsPosterizeValue');
        if (posterizeSlider && posterizeValue) {
            posterizeSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                posterizeValue.textContent = value;
                this.blobsVisualization.setPosterize(value);
            });
        }

        // Contrast slider
        const contrastSlider = document.getElementById('blobsContrastSlider');
        const contrastValue = document.getElementById('blobsContrastValue');
        if (contrastSlider && contrastValue) {
            contrastSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                contrastValue.textContent = value + '%';
                this.blobsVisualization.setContrast(value);
            });
        }

        // Brightness slider
        const brightnessSlider = document.getElementById('blobsBrightnessSlider');
        const brightnessValue = document.getElementById('blobsBrightnessValue');
        if (brightnessSlider && brightnessValue) {
            brightnessSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                brightnessValue.textContent = value + '%';
                this.blobsVisualization.setBrightness(value);
            });
        }

        // Intensity slider
        const intensitySlider = document.getElementById('blobsIntensitySlider');
        const intensityValue = document.getElementById('blobsIntensityValue');
        if (intensitySlider && intensityValue) {
            intensitySlider.addEventListener('input', (e) => {
                const value = e.target.value;
                intensityValue.textContent = value + '%';
                this.blobsVisualization.setIntensity(value);
            });
        }

            // Min Size slider
            const minSizeSlider = document.getElementById('blobsMinSizeSlider');
            const minSizeValue = document.getElementById('blobsMinSizeValue');
            if (minSizeSlider && minSizeValue) {
                minSizeSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    minSizeValue.textContent = value.toFixed(1);
                    this.blobsVisualization.setMinSize(value);
                });
            }
            
            // Max Size slider
            const maxSizeSlider = document.getElementById('blobsMaxSizeSlider');
            const maxSizeValue = document.getElementById('blobsMaxSizeValue');
            if (maxSizeSlider && maxSizeValue) {
                maxSizeSlider.addEventListener('input', (e) => {
                    const sliderValue = parseFloat(e.target.value);
                    // Convert slider value to pixel value
                    const pixelValue = 8 + (sliderValue - 1) * (248 - 8) / (10 - 1);
                    maxSizeValue.textContent = Math.round(pixelValue) + 'px';
                    this.blobsVisualization.setMaxSize(sliderValue);
                });
            }
            
            // Decay/Lifespan slider
            const decaySlider = document.getElementById('blobsDecaySlider');
            const decayValue = document.getElementById('blobsDecayValue');
            if (decaySlider && decayValue) {
                decaySlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    decayValue.textContent = value.toFixed(1) + 'x';
                    this.blobsVisualization.setDecayMultiplier(value);
                });
            }
            
            // Agitate slider
            const agitateSlider = document.getElementById('blobsAgitateSlider');
            const agitateValue = document.getElementById('blobsAgitateValue');
            if (agitateSlider && agitateValue) {
                agitateSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value) / 100; // Convert percentage to multiplier
                    agitateValue.textContent = Math.round(value * 100) + '%';
                    this.blobsVisualization.setAgitate(value);
                });
            }
            
            // Density slider
            const densitySlider = document.getElementById('blobsDensitySlider');
            const densityValue = document.getElementById('blobsDensityValue');
            if (densitySlider && densityValue) {
                densitySlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    densityValue.textContent = value;
                    this.blobsVisualization.setDensity(value);
                });
            }
            
            // Beat React button
            const beatReactBtn = document.getElementById('blobsBeatReactBtn');
            if (beatReactBtn) {
                beatReactBtn.addEventListener('click', () => {
                    this.blobsVisualization.beatReact = !this.blobsVisualization.beatReact;
                    beatReactBtn.textContent = `Beat React: ${this.blobsVisualization.beatReact ? 'On' : 'Off'}`;
                    beatReactBtn.classList.toggle('active', this.blobsVisualization.beatReact);
                });
            }
    }

    setupWebGLControls() {
        
        // Check if WebGL is supported before setting up controls
        if (this.webglVisualization && !this.webglVisualization.webglSupported) {
            console.warn('🎮 WebGL: Skipping control setup - WebGL not supported');
            return;
        }
        
        // Opacity slider
        const opacitySlider = document.getElementById('webglOpacitySlider');
        const opacityValue = document.getElementById('webglOpacityValue');
        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                opacityValue.textContent = value + '%';
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ opacity: value });
                }
            });
        }
        
        // Particle Count slider
        const particleCountSlider = document.getElementById('webglParticleCountSlider');
        const particleCountValue = document.getElementById('webglParticleCountValue');
        if (particleCountSlider && particleCountValue) {
            particleCountSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                particleCountValue.textContent = value;
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ particleCount: value });
                    // Update mixer UI via MultiDisplayManager
                    if (window.multiDisplayManager) {
                        window.multiDisplayManager.updateMixerStarfallParticleCountSlider();
                    }
                } else {
                    console.warn('🎮 WebGL: Visualization not available for settings update');
                }
            });
        } else {
            console.warn('🎮 WebGL: Particle count slider elements not found');
        }

        // Particle Size slider
        const particleSizeSlider = document.getElementById('webglParticleSizeSlider');
        const particleSizeValue = document.getElementById('webglParticleSizeValue');
        if (particleSizeSlider && particleSizeValue) {
            particleSizeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                particleSizeValue.textContent = value + 'px';
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ particleSize: value });
                    // Update mixer UI via MultiDisplayManager
                    if (window.multiDisplayManager) {
                        window.multiDisplayManager.updateMixerStarfallParticleSizeSlider();
                    }
                }
            });
        } else {
            console.warn('🎮 WebGL: Particle size slider elements not found');
        }

        // Speed slider
        const speedSlider = document.getElementById('webglSpeedSlider');
        const speedValue = document.getElementById('webglSpeedValue');
        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                speedValue.textContent = value.toFixed(1);
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ speed: value });
                    // Update mixer UI via MultiDisplayManager
                    if (window.multiDisplayManager) {
                        window.multiDisplayManager.updateMixerStarfallSpeedSlider();
                    }
                }
            });
        }

        // Gravity slider
        const gravitySlider = document.getElementById('webglGravitySlider');
        const gravityValue = document.getElementById('webglGravityValue');
        if (gravitySlider && gravityValue) {
            gravitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                gravityValue.textContent = value.toFixed(1);
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ gravity: value });
                    // Update mixer UI via MultiDisplayManager
                    if (window.multiDisplayManager) {
                        window.multiDisplayManager.updateMixerStarfallGravitySlider();
                    }
                }
            });
        }

        // Saturation slider
        const saturationSlider = document.getElementById('webglSaturationSlider');
        const saturationValue = document.getElementById('webglSaturationValue');
        if (saturationSlider && saturationValue) {
            saturationSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                saturationValue.textContent = value + '%';
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ saturation: value });
                    // Update mixer UI via MultiDisplayManager
                    if (window.multiDisplayManager) {
                        window.multiDisplayManager.updateMixerStarfallSaturationSlider();
                    }
                }
            });
        }

        // Color scheme dropdown
        const colorSchemeSelect = document.getElementById('webglColorSchemeSelect');
        if (colorSchemeSelect) {
            colorSchemeSelect.addEventListener('change', (e) => {
                const scheme = e.target.value;
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ colorScheme: scheme });
                    // Update mixer UI via MultiDisplayManager
                    if (window.multiDisplayManager) {
                        window.multiDisplayManager.updateMixerStarfallColorSchemeSelect();
                    }
                }
            });
        }

        // Twinkle intensity slider
        const twinkleSlider = document.getElementById('webglTwinkleSlider');
        const twinkleValue = document.getElementById('webglTwinkleValue');
        if (twinkleSlider && twinkleValue) {
            twinkleSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                twinkleValue.textContent = value + '%';
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ twinkleIntensity: value });
                    // Update mixer UI via MultiDisplayManager
                    if (window.multiDisplayManager) {
                        window.multiDisplayManager.updateMixerStarfallTwinkleSlider();
                    }
                }
            });
        }

        // Star percentage slider
        const starPercentageSlider = document.getElementById('webglStarPercentageSlider');
        const starPercentageValue = document.getElementById('webglStarPercentageValue');
        if (starPercentageSlider && starPercentageValue) {
            starPercentageSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                starPercentageValue.textContent = value + '%';
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ starPercentage: value });
                    // Update mixer UI via MultiDisplayManager
                    if (window.multiDisplayManager) {
                        window.multiDisplayManager.updateMixerStarfallStarPercentageSlider();
                    }
                }
            });
        }

        // Audio Reactivity slider
        const audioReactivitySlider = document.getElementById('webglAudioReactivitySlider');
        const audioReactivityValue = document.getElementById('webglAudioReactivityValue');
        if (audioReactivitySlider && audioReactivityValue) {
            audioReactivitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                audioReactivityValue.textContent = value + '%';
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.setSettings({ audioReactivity: value });
                    // Update mixer UI via MultiDisplayManager
                    if (window.multiDisplayManager) {
                        window.multiDisplayManager.updateMixerStarfallAudioReactivitySlider();
                    }
                }
            });
        } else {
            console.warn('🎮 WebGL: Audio reactivity slider elements not found');
        }

        // Beat Intensity slider
        const beatIntensitySlider = document.getElementById('webglBeatIntensitySlider');
        const beatIntensityValue = document.getElementById('webglBeatIntensityValue');
        if (beatIntensitySlider && beatIntensityValue) {
            beatIntensitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                beatIntensityValue.textContent = value + '%';
                if (this.webglVisualization) {
                    this.webglVisualization.setSettings({ beatIntensity: value });
                } else {
                    console.warn('🎮 WebGL: Visualization not available for beat intensity update');
                }
            });
        } else {
            console.warn('🎮 WebGL: Beat intensity slider elements not found');
        }

        // Beat React button
        const beatReactBtn = document.getElementById('webglBeatReactBtn');
        const beatReactControls = document.getElementById('webglBeatReactControls');
        if (beatReactBtn) {
            beatReactBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    const currentState = this.webglVisualization.currentVisualization.beatReact;
                    
                    this.webglVisualization.currentVisualization.beatReact = !currentState;
                    const newState = this.webglVisualization.currentVisualization.beatReact;
                    
                    beatReactBtn.textContent = `Beat React: ${newState ? 'On' : 'Off'}`;
                    beatReactBtn.classList.toggle('active', newState);
                    
                    // Show/hide individual beat controls
                    if (beatReactControls) {
                        beatReactControls.style.display = newState ? 'block' : 'none';
                    }
                } else {
                    console.warn('🥁 Beat React: WebGL visualization not available');
                }
            });
        } else {
            console.warn('🥁 Beat React: Button element not found');
        }

        // Individual Beat Control Buttons
        const beatSizeBtn = document.getElementById('webglBeatSizeBtn');
        if (beatSizeBtn) {
            beatSizeBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.beatSize = !this.webglVisualization.currentVisualization.beatSize;
                    beatSizeBtn.textContent = `Beat Size: ${this.webglVisualization.currentVisualization.beatSize ? 'On' : 'Off'}`;
                    beatSizeBtn.classList.toggle('active', this.webglVisualization.currentVisualization.beatSize);
                }
            });
        }

        const beatSpeedBtn = document.getElementById('webglBeatSpeedBtn');
        if (beatSpeedBtn) {
            beatSpeedBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.beatSpeed = !this.webglVisualization.currentVisualization.beatSpeed;
                    beatSpeedBtn.textContent = `Beat Speed: ${this.webglVisualization.currentVisualization.beatSpeed ? 'On' : 'Off'}`;
                    beatSpeedBtn.classList.toggle('active', this.webglVisualization.currentVisualization.beatSpeed);
                }
            });
        }

        const beatCountBtn = document.getElementById('webglBeatCountBtn');
        if (beatCountBtn) {
            beatCountBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.beatCount = !this.webglVisualization.currentVisualization.beatCount;
                    beatCountBtn.textContent = `Beat Count: ${this.webglVisualization.currentVisualization.beatCount ? 'On' : 'Off'}`;
                    beatCountBtn.classList.toggle('active', this.webglVisualization.currentVisualization.beatCount);
                }
            });
        }

        const beatGenerationBtn = document.getElementById('webglBeatGenerationBtn');
        if (beatGenerationBtn) {
            beatGenerationBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.beatGeneration = !this.webglVisualization.currentVisualization.beatGeneration;
                    beatGenerationBtn.textContent = `Beat Generation: ${this.webglVisualization.currentVisualization.beatGeneration ? 'On' : 'Off'}`;
                    beatGenerationBtn.classList.toggle('active', this.webglVisualization.currentVisualization.beatGeneration);
                }
            });
        }

        // Energy React button
        const energyReactBtn = document.getElementById('webglEnergyReactBtn');
        const energyReactControls = document.getElementById('webglEnergyReactControls');
        if (energyReactBtn) {
            energyReactBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.energyReact = !this.webglVisualization.currentVisualization.energyReact;
                    energyReactBtn.textContent = `Energy React: ${this.webglVisualization.currentVisualization.energyReact ? 'On' : 'Off'}`;
                    energyReactBtn.classList.toggle('active', this.webglVisualization.currentVisualization.energyReact);
                    
                    // Show/hide individual energy controls
                    if (energyReactControls) {
                        energyReactControls.style.display = this.webglVisualization.currentVisualization.energyReact ? 'block' : 'none';
                    }
                }
            });
        }

        // Energy React individual controls
        const energySizeBtn = document.getElementById('webglEnergySizeBtn');
        if (energySizeBtn) {
            energySizeBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.energySize = !this.webglVisualization.currentVisualization.energySize;
                    energySizeBtn.textContent = `Energy Size: ${this.webglVisualization.currentVisualization.energySize ? 'On' : 'Off'}`;
                    energySizeBtn.classList.toggle('active', this.webglVisualization.currentVisualization.energySize);
                }
            });
        }

        const energySpeedBtn = document.getElementById('webglEnergySpeedBtn');
        if (energySpeedBtn) {
            energySpeedBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.energySpeed = !this.webglVisualization.currentVisualization.energySpeed;
                    energySpeedBtn.textContent = `Energy Speed: ${this.webglVisualization.currentVisualization.energySpeed ? 'On' : 'Off'}`;
                    energySpeedBtn.classList.toggle('active', this.webglVisualization.currentVisualization.energySpeed);
                }
            });
        }

        const energyCountBtn = document.getElementById('webglEnergyCountBtn');
        if (energyCountBtn) {
            energyCountBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.energyCount = !this.webglVisualization.currentVisualization.energyCount;
                    energyCountBtn.textContent = `Energy Count: ${this.webglVisualization.currentVisualization.energyCount ? 'On' : 'Off'}`;
                    energyCountBtn.classList.toggle('active', this.webglVisualization.currentVisualization.energyCount);
                }
            });
        }

        // Frequency React button
        const frequencyReactBtn = document.getElementById('webglFrequencyReactBtn');
        const frequencyReactControls = document.getElementById('webglFrequencyReactControls');
        if (frequencyReactBtn) {
            frequencyReactBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.frequencyReact = !this.webglVisualization.currentVisualization.frequencyReact;
                    frequencyReactBtn.textContent = `Frequency React: ${this.webglVisualization.currentVisualization.frequencyReact ? 'On' : 'Off'}`;
                    frequencyReactBtn.classList.toggle('active', this.webglVisualization.currentVisualization.frequencyReact);
                    
                    // Show/hide individual frequency controls
                    if (frequencyReactControls) {
                        frequencyReactControls.style.display = this.webglVisualization.currentVisualization.frequencyReact ? 'block' : 'none';
                    }
                }
            });
        }

        // Frequency React individual controls
        const bassReactBtn = document.getElementById('webglBassReactBtn');
        if (bassReactBtn) {
            bassReactBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.bassReact = !this.webglVisualization.currentVisualization.bassReact;
                    bassReactBtn.textContent = `Bass React: ${this.webglVisualization.currentVisualization.bassReact ? 'On' : 'Off'}`;
                    bassReactBtn.classList.toggle('active', this.webglVisualization.currentVisualization.bassReact);
                }
            });
        }

        const midReactBtn = document.getElementById('webglMidReactBtn');
        if (midReactBtn) {
            midReactBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.midReact = !this.webglVisualization.currentVisualization.midReact;
                    midReactBtn.textContent = `Mid React: ${this.webglVisualization.currentVisualization.midReact ? 'On' : 'Off'}`;
                    midReactBtn.classList.toggle('active', this.webglVisualization.currentVisualization.midReact);
                }
            });
        }

        const trebleReactBtn = document.getElementById('webglTrebleReactBtn');
        if (trebleReactBtn) {
            trebleReactBtn.addEventListener('click', () => {
                if (this.webglVisualization && this.webglVisualization.currentVisualization) {
                    this.webglVisualization.currentVisualization.trebleReact = !this.webglVisualization.currentVisualization.trebleReact;
                    trebleReactBtn.textContent = `Treble React: ${this.webglVisualization.currentVisualization.trebleReact ? 'On' : 'Off'}`;
                    trebleReactBtn.classList.toggle('active', this.webglVisualization.currentVisualization.trebleReact);
                }
                });
            }
    }

    toggleHeaderInfiniteZoom() {
        const panel = document.getElementById('headerInfiniteZoomPanel');
        const btn = document.getElementById('headerInfiniteZoomBtn');
        
        // Toggle panel visibility only
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            if (isVisible) {
                panel.style.display = 'none';
                btn.classList.remove('active');
            } else {
                this.closeAllPanels(); // CLOSE ALL PANELS FIRST
                // Position panel using new system
                const buttonRect = btn.getBoundingClientRect();
                panel.style.left = `${buttonRect.left}px`;
                panel.style.top = `${buttonRect.bottom + 5}px`;
                panel.style.display = 'block';
                btn.classList.add('active');
            }
        }
    }

    toggleMixer() {
        const panel = document.getElementById('mixerPanel');
        const btn = document.getElementById('mixerBtn');
        const mixerChannels = document.querySelector('.mixer-channels');
        const footer = document.querySelector('footer.footer');
        const isMinimized = panel && panel.classList.contains('mixer-minimized');
        
        // Toggle panel visibility using same positioning as Record panel
        if (panel) {
            // Check if mixer is minimized (channels in footer)
            if (isMinimized && footer && mixerChannels && footer.contains(mixerChannels)) {
                // Toggle visibility of footer mixer-channels
                const isVisible = mixerChannels.style.display !== 'none';
                if (isVisible) {
                    mixerChannels.style.display = 'none';
                    btn.classList.remove('active');
                } else {
                    mixerChannels.style.display = '';
                    btn.classList.add('active');
                }
            } else {
                // Normal panel toggle
                const isVisible = panel.style.display !== 'none';
                if (isVisible) {
                    panel.style.display = 'none';
                    btn.classList.remove('active');
                    
                    // Clean up peek button event listeners when mixer closes
                    this.cleanupPeekButton();
                } else {
                    this.closeAllPanels(); // CLOSE ALL PANELS FIRST
                    // Position panel using same system as Record panel
                    this.positionFloatingPanel(panel, btn);
                    panel.style.display = 'block';
                    btn.classList.add('active');
                    
                    // Setup peek button functionality when mixer opens
                    this.setupPeekButton();
                    
                    // Setup minimize functionality when mixer opens
                    this.setupMixerMinimize();
                    
                    // Setup keyboard shortcut (only once)
                    this.setupMixerKeyboardShortcut();
                    
                    // Setup collapsible preset sections with small delay to ensure DOM is ready
                    setTimeout(() => {
                    this.setupCollapsiblePresets();
                    }, 50);
                }
            }
        }
    }

    cleanupPeekButton() {
        // Remove all peek-related event listeners
        if (this.startPeeking) {
            document.removeEventListener('mouseup', this.stopPeeking);
            document.removeEventListener('keydown', this.handlePeekKeyDown);
            document.removeEventListener('keyup', this.handlePeekKeyUp);
        }
    }

    setupPeekButton() {
        const peekBtn = document.getElementById('mixerPeekBtn');
        const mixerChannels = document.querySelector('.mixer-channels');
        const mixerPanel = document.getElementById('mixerPanel');
        
        if (peekBtn && mixerChannels && mixerPanel) {
            // Remove any existing event listeners to prevent duplicates
            peekBtn.removeEventListener('mousedown', this.startPeeking);
            peekBtn.removeEventListener('mouseup', this.stopPeeking);
            peekBtn.removeEventListener('mouseleave', this.stopPeeking);
            document.removeEventListener('mouseup', this.stopPeeking);
            document.removeEventListener('keydown', this.handlePeekKeyDown);
            document.removeEventListener('keyup', this.handlePeekKeyUp);
            
            // Bind functions to maintain 'this' context
            this.startPeeking = (e) => {
                e.preventDefault();
                mixerChannels.classList.add('peek-mode');
                mixerPanel.classList.add('peek-mode');
                peekBtn.classList.add('peeking');
            };
            
            this.stopPeeking = () => {
                mixerChannels.classList.remove('peek-mode');
                mixerPanel.classList.remove('peek-mode');
                peekBtn.classList.remove('peeking');
            };
            
            // Keyboard event handlers for 'C' key
            this.handlePeekKeyDown = (e) => {
                // Only respond to 'C' key when mixer is open and not already peeking
                if (e.code === 'KeyC' && mixerPanel.style.display !== 'none' && !mixerChannels.classList.contains('peek-mode')) {
                    e.preventDefault();
                    this.startPeeking(e);
                }
            };
            
            this.handlePeekKeyUp = (e) => {
                // Stop peeking when 'C' key is released
                if (e.code === 'KeyC' && mixerPanel.style.display !== 'none') {
                    e.preventDefault();
                    this.stopPeeking();
                }
            };
            
            // Add mouse event listeners
            peekBtn.addEventListener('mousedown', this.startPeeking);
            peekBtn.addEventListener('mouseup', this.stopPeeking);
            peekBtn.addEventListener('mouseleave', this.stopPeeking);
            document.addEventListener('mouseup', this.stopPeeking);
            
            // Add keyboard event listeners
            document.addEventListener('keydown', this.handlePeekKeyDown);
            document.addEventListener('keyup', this.handlePeekKeyUp);
        }
    }

    setupMixerMinimize() {
        const mixerPanel = document.getElementById('mixerPanel');
        const mixerChannels = document.querySelector('.mixer-channels');
        const panelHeader = mixerPanel ? mixerPanel.querySelector('.panel-header') : null;
        const panelContent = mixerPanel ? mixerPanel.querySelector('.panel-content') : null;
        const footer = document.querySelector('footer.footer');
        const footerControls = footer ? footer.querySelector('.controls') : null;
        
        if (!mixerPanel || !mixerChannels || !panelHeader || !panelContent || !footer || !footerControls) return;
        
        // Store original parent for restoration
        const originalParent = mixerChannels.parentElement;
        
        // Load saved minimized state from localStorage
        const savedState = localStorage.getItem('freque_mixer_minimized');
        const isMinimized = savedState === 'true';
        
        if (isMinimized) {
            mixerPanel.classList.add('mixer-minimized');
            mixerChannels.classList.add('mixer-minimized');
            // Move to footer and hide panel-content
            footer.insertBefore(mixerChannels, footerControls);
            panelContent.style.display = 'none';
            
            // Sync footer mixer-channels visibility with button state
            const mixerBtn = document.getElementById('mixerBtn');
            const isButtonActive = mixerBtn && mixerBtn.classList.contains('active');
            mixerChannels.style.display = isButtonActive ? '' : 'none';
        }
        
        // Function to toggle minimize/maximize
        const toggleMixerMinimize = () => {
            const isCurrentlyMinimized = mixerPanel.classList.contains('mixer-minimized');
            
            if (isCurrentlyMinimized) {
                // Maximize
                mixerPanel.classList.remove('mixer-minimized');
                mixerChannels.classList.remove('mixer-minimized');
                localStorage.setItem('freque_mixer_minimized', 'false');
                
                // Move mixer-channels back to panel-content
                panelContent.appendChild(mixerChannels);
                panelContent.style.display = '';
                
                // Show and position the mixer panel
                const mixerBtn = document.getElementById('mixerBtn');
                if (mixerBtn) {
                    this.positionFloatingPanel(mixerPanel, mixerBtn);
                    mixerPanel.style.display = 'block';
                    mixerBtn.classList.add('active');
                }
                
                // Collapse any expanded individual strips
                document.querySelectorAll('.channel-strip.expanded').forEach(strip => {
                    strip.classList.remove('expanded');
                    strip.classList.remove('from-minimized');
                    strip.style.removeProperty('--expanded-left');
                    strip.style.removeProperty('--expanded-width');
                    
                    // Remove placeholder
                    const placeholder = strip.previousElementSibling;
                    if (placeholder && placeholder.classList.contains('expanded-placeholder')) {
                        placeholder.remove();
                    }
                });
            } else {
                // Minimize
                mixerPanel.classList.add('mixer-minimized');
                mixerChannels.classList.add('mixer-minimized');
                localStorage.setItem('freque_mixer_minimized', 'true');
                
                // Move mixer-channels to footer (before controls) and hide panel-content
                footer.insertBefore(mixerChannels, footerControls);
                panelContent.style.display = 'none';
            }
        };
        
        // Store the toggle function on the instance so we can use it elsewhere
        this.toggleMixerMinimize = toggleMixerMinimize;
        
        // Double-click on panel header to toggle minimize/maximize
        panelHeader.addEventListener('dblclick', (e) => {
            // Don't trigger if double-clicking on buttons
            if (e.target.closest('button')) return;
            toggleMixerMinimize();
        });
        
        // Setup double-click on channel handles to expand individual strips
        this.setupChannelHandleExpand();
    }
    
    setupMixerKeyboardShortcut() {
        // Keyboard shortcut: 'v' key to toggle mixer minimize/maximize
        // Only set up once, not every time mixer opens
        if (this._mixerKeyboardSet) return;
        this._mixerKeyboardSet = true;
        
        document.addEventListener('keydown', (e) => {
            const mixerPanel = document.getElementById('mixerPanel');
            if (!mixerPanel) return;
            
            // Check if mixer is minimized (channels in footer) or panel is visible
            const mixerChannels = document.querySelector('.mixer-channels');
            const footer = document.querySelector('footer.footer');
            const isMinimized = mixerPanel.classList.contains('mixer-minimized') && 
                               footer && mixerChannels && footer.contains(mixerChannels);
            
            const computedStyle = window.getComputedStyle(mixerPanel);
            const isVisible = computedStyle.display !== 'none';
            
            // Allow V key if mixer is visible OR if mixer is minimized (in footer)
            if ((isVisible || isMinimized) && 
                !['INPUT', 'TEXTAREA'].includes(e.target.tagName) &&
                e.key.toLowerCase() === 'v') {
                e.preventDefault();
                
                // Call the toggle function if it exists
                if (this.toggleMixerMinimize) {
                    this.toggleMixerMinimize();
                }
            }
        });
    }
    
    setupChannelHandleExpand() {
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) return;
        
        // Use event delegation for dynamically added strips
        mixerChannels.addEventListener('dblclick', (e) => {
            const handle = e.target.closest('.channel-drag-button');
            if (!handle) return;
            
            // Only work when mixer is minimized
            if (!mixerChannels.classList.contains('mixer-minimized')) return;
            
            const channelStrip = handle.closest('.channel-strip');
            if (!channelStrip) return;
            
            // Prevent drag behavior
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle expanded state on this strip
            const isExpanded = channelStrip.classList.contains('expanded');
            
            if (isExpanded) {
                // Collapse this strip - return to container
                channelStrip.classList.remove('expanded');
                channelStrip.classList.remove('from-minimized');
                channelStrip.style.removeProperty('--expanded-width');
                
                // Return strip to original position in container
                if (channelStrip._originalParent && channelStrip._originalNextSibling) {
                    channelStrip._originalParent.insertBefore(channelStrip, channelStrip._originalNextSibling);
                } else if (channelStrip._originalParent) {
                    channelStrip._originalParent.appendChild(channelStrip);
                }
                
                // Clear inline positioning styles
                channelStrip.style.position = '';
                channelStrip.style.left = '';
                channelStrip.style.bottom = '';
                
                // Clear stored references
                delete channelStrip._originalParent;
                delete channelStrip._originalNextSibling;
                
                // Remove placeholder if exists
                const placeholder = document.querySelector('.expanded-placeholder');
                if (placeholder) {
                    placeholder.remove();
                }
            } else {
                // Collapse all other expanded strips first
                document.querySelectorAll('.channel-strip.expanded').forEach(strip => {
                    strip.classList.remove('expanded');
                    strip.classList.remove('from-minimized');
                    strip.style.removeProperty('--expanded-width');
                    
                    // Return to original parent
                    if (strip._originalParent && strip._originalNextSibling) {
                        strip._originalParent.insertBefore(strip, strip._originalNextSibling);
                    } else if (strip._originalParent) {
                        strip._originalParent.appendChild(strip);
                    }
                    
                    // Clear inline styles
                    strip.style.position = '';
                    strip.style.left = '';
                    strip.style.bottom = '';
                    
                    // Clear stored references
                    delete strip._originalParent;
                    delete strip._originalNextSibling;
                    
                    // Remove their placeholders
                    const ph = document.querySelector('.expanded-placeholder');
                    if (ph) {
                        ph.remove();
                    }
                });
                
                // Get strip's exact width and viewport position BEFORE moving it
                const stripWidth = channelStrip.offsetWidth;
                const stripRect = channelStrip.getBoundingClientRect();
                const viewportLeft = stripRect.left;
                const viewportBottom = window.innerHeight - stripRect.bottom;
                
                console.log('Expanding strip:', { 
                    viewportLeft: viewportLeft,
                    viewportBottom: viewportBottom,
                    stripWidth: stripWidth
                });
                
                // Store original parent and position for collapse
                channelStrip._originalParent = mixerChannels;
                channelStrip._originalNextSibling = channelStrip.nextSibling;
                
                // Create a placeholder to maintain the space in the flow
                const placeholder = document.createElement('div');
                placeholder.className = 'channel-strip expanded-placeholder';
                placeholder.style.width = `${stripWidth}px`;
                placeholder.style.minWidth = `${stripWidth}px`;
                placeholder.style.maxWidth = `${stripWidth}px`;
                placeholder.style.height = 'auto';
                placeholder.style.visibility = 'hidden';
                placeholder.style.flexShrink = '0';
                placeholder.style.pointerEvents = 'none';
                
                // Insert placeholder where strip was
                mixerChannels.insertBefore(placeholder, channelStrip);
                
                // Move strip to body level
                document.body.appendChild(channelStrip);
                
                // Set CSS variable for width
                channelStrip.style.setProperty('--expanded-width', `${stripWidth}px`);
                
                // Apply fixed positioning at viewport coordinates
                channelStrip.style.position = 'fixed';
                channelStrip.style.left = `${viewportLeft}px`;
                channelStrip.style.bottom = `${viewportBottom}px`;
                
                // Add expanded class and mark as from minimized mixer
                channelStrip.classList.add('expanded');
                channelStrip.classList.add('from-minimized');
                
                // Add scroll listener to update position when container scrolls
                const scrollHandler = () => {
                    if (!channelStrip.classList.contains('expanded')) {
                        // Strip was collapsed, remove listener
                        mixerChannels.removeEventListener('scroll', scrollHandler);
                        return;
                    }
                    
                    // Recalculate viewport position based on placeholder's current position
                    const placeholderRect = placeholder.getBoundingClientRect();
                    const newLeft = placeholderRect.left;
                    
                    // Update strip's position
                    channelStrip.style.left = `${newLeft}px`;
                };
                
                mixerChannels.addEventListener('scroll', scrollHandler);
                
                // Add resize listener to update position when window resizes
                const resizeHandler = () => {
                    if (!channelStrip.classList.contains('expanded')) {
                        // Strip was collapsed, remove listener
                        window.removeEventListener('resize', resizeHandler);
                        return;
                    }
                    
                    // Recalculate viewport position based on placeholder's current position
                    const placeholderRect = placeholder.getBoundingClientRect();
                    const newLeft = placeholderRect.left;
                    const newBottom = window.innerHeight - placeholderRect.bottom;
                    
                    // Update strip's position
                    channelStrip.style.left = `${newLeft}px`;
                    channelStrip.style.bottom = `${newBottom}px`;
                };
                
                window.addEventListener('resize', resizeHandler);
                
                // Add direct double-click listener to this strip (since it's no longer in .mixer-channels)
                const collapseHandler = (e) => {
                    const handle = e.target.closest('.channel-drag-button');
                    if (!handle) return;
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Collapse this strip
                    channelStrip.classList.remove('expanded');
                    channelStrip.classList.remove('from-minimized');
                    channelStrip.style.removeProperty('--expanded-width');
                    
                    // Remove scroll and resize listeners
                    mixerChannels.removeEventListener('scroll', scrollHandler);
                    window.removeEventListener('resize', resizeHandler);
                    
                    // Return strip to original position in container
                    if (channelStrip._originalParent && channelStrip._originalNextSibling) {
                        channelStrip._originalParent.insertBefore(channelStrip, channelStrip._originalNextSibling);
                    } else if (channelStrip._originalParent) {
                        channelStrip._originalParent.appendChild(channelStrip);
                    }
                    
                    // Clear inline positioning styles
                    channelStrip.style.position = '';
                    channelStrip.style.left = '';
                    channelStrip.style.bottom = '';
                    
                    // Clear stored references
                    delete channelStrip._originalParent;
                    delete channelStrip._originalNextSibling;
                    
                    // Remove placeholder if exists
                    const placeholder = document.querySelector('.expanded-placeholder');
                    if (placeholder) {
                        placeholder.remove();
                    }
                    
                    // Remove this listener
                    channelStrip.removeEventListener('dblclick', collapseHandler);
                };
                
                channelStrip.addEventListener('dblclick', collapseHandler);
            }
        });
    }

    setupCollapsiblePresets() {
        
        const collapsibleHeaders = document.querySelectorAll('.mixer-panel-floating .collapsible-header');
        
        collapsibleHeaders.forEach(header => {
            const targetId = header.getAttribute('data-target');
            const content = document.getElementById(targetId);
            
            if (!content) {
                console.warn('⚠️ Collapsible content not found for:', targetId);
                return;
            }
            
            // Remove any existing click listeners to prevent duplicates
            const existingHandler = header._collapsibleHandler;
            if (existingHandler) {
                header.removeEventListener('click', existingHandler);
            }
            
            // Load saved state (default: collapsed)
            const storageKey = `mixer_preset_${targetId}_expanded`;
            const isExpanded = localStorage.getItem(storageKey) === 'true';
            
            // Set initial state
            if (isExpanded) {
                header.classList.add('expanded');
                content.classList.add('expanded');
            } else {
                header.classList.remove('expanded');
                content.classList.remove('expanded');
            }
            
            // Create and store click handler
            const clickHandler = () => {
                const wasExpanded = header.classList.contains('expanded');
                
                // Toggle classes
                header.classList.toggle('expanded');
                content.classList.toggle('expanded');
                
                // Save state
                localStorage.setItem(storageKey, (!wasExpanded).toString());
                
                //     section: targetId,
                //     expanded: !wasExpanded
                // });
            };
            
            // Store handler reference and add listener
            header._collapsibleHandler = clickHandler;
            header.addEventListener('click', clickHandler);
            
            //     targetId: targetId,
            //     expanded: isExpanded
            // });
        });
    }

    toggleHeaderFluidDynamics() {
        const panel = document.getElementById('headerFluidDynamicsPanel');
        const btn = document.getElementById('headerFluidDynamicsBtn');
        
        // Toggle panel visibility only - do NOT change button active state
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            if (isVisible) {
                panel.style.display = 'none';
                // Don't change button state - it should only reflect visualization ON/OFF
            } else {
                this.closeAllPanels(); // CLOSE ALL PANELS FIRST
                // Position panel using new system
                const buttonRect = btn.getBoundingClientRect();
                panel.style.left = `${buttonRect.left}px`;
                panel.style.top = `${buttonRect.bottom + 5}px`;
                panel.style.display = 'block';
                // Don't change button state - it should only reflect visualization ON/OFF
            }
        }
    }

    toggleHeaderNebula() {
        const panel = document.getElementById('headerNebulaPanel');
        const btn = document.getElementById('headerNebulaBtn');
        
        // Toggle panel visibility only - do NOT change button active state
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            if (isVisible) {
                panel.style.display = 'none';
                // Don't change button state - it should only reflect visualization ON/OFF
            } else {
                this.closeAllPanels(); // CLOSE ALL PANELS FIRST
                // Position panel using new system
                const buttonRect = btn.getBoundingClientRect();
                panel.style.left = `${buttonRect.left}px`;
                panel.style.top = `${buttonRect.bottom + 5}px`;
                panel.style.display = 'block';
                // Don't change button state - it should only reflect visualization ON/OFF
            }
        }
    }
    
    // Advanced Preset Controls Setup and Management
    setupAdvancedPresetControls() {
        
        // Show/hide controls when Pro presets are active
        const headerAMProPresetButtons = document.querySelectorAll('#headerVisualizerPanel .btn-preset-pro[data-official-preset]');
        const advancedControls = document.getElementById('advancedPresetControls');
        
        
        if (advancedControls) {
        }
        
        if (!advancedControls) {
            console.warn('Advanced Preset Controls container not found');
            return;
        }
        
        // Show controls when Pro preset is clicked
        headerAMProPresetButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                advancedControls.style.display = 'block';
                setTimeout(() => this.loadAdvancedControlsFromPreset(), 100);
            });
        });
        
        // Hide controls when regular preset is clicked
        const headerAMPresetButtons = document.querySelectorAll('#headerVisualizerPanel .btn-preset:not(.btn-preset-pro)');
        headerAMPresetButtons.forEach(button => {
            button.addEventListener('click', () => {
                advancedControls.style.display = 'none';
            });
        });
        
        // Set up all control event listeners
        this.setupAdvancedControlEventListeners();
    }

    setupAdvancedControlEventListeners() {
        // Gradient dropdown
        const gradientSelect = document.getElementById('advancedGradient');
        if (gradientSelect) {
            gradientSelect.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.gradient = e.target.value;
                }
            });
        }
        
        // Color Mode dropdown
        const colorModeSelect = document.getElementById('advancedColorMode');
        if (colorModeSelect) {
            colorModeSelect.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.colorMode = e.target.value;
                }
            });
        }
        
        // Channel Layout dropdown
        const channelLayoutSelect = document.getElementById('advancedChannelLayout');
        if (channelLayoutSelect) {
            channelLayoutSelect.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.channelLayout = e.target.value;
                }
            });
        }
        
        // FFT Size dropdown
        const fftSizeSelect = document.getElementById('advancedFftSize');
        if (fftSizeSelect) {
            fftSizeSelect.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.fftSize = parseInt(e.target.value);
                }
            });
        }
        
        // Radial toggle (with conditional Radius control)
        const radialCheckbox = document.getElementById('advancedRadial');
        const radiusWrapper = document.getElementById('advancedRadiusWrapper');
        if (radialCheckbox) {
            radialCheckbox.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.radial = e.target.checked;
                    
                    // Show/hide radius control
                    if (radiusWrapper) {
                        radiusWrapper.style.display = e.target.checked ? 'block' : 'none';
                    }
                }
            });
        }
        
        // All other toggles
        const toggles = [
            { id: 'advancedRadialInvert', prop: 'radialInvert' },
            { id: 'advancedRoundBars', prop: 'roundBars' },
            { id: 'advancedLedBars', prop: 'ledBars' },
            { id: 'advancedLumiBars', prop: 'lumiBars' },
            { id: 'advancedAlphaBars', prop: 'alphaBars' },
            { id: 'advancedSplitGradient', prop: 'splitGradient' },
            { id: 'advancedShowPeaks', prop: 'showPeaks' },
            { id: 'advancedReflexFit', prop: 'reflexFit' }
        ];
        
        toggles.forEach(({ id, prop }) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    if (this.officialAudioMotion) {
                        this.officialAudioMotion[prop] = e.target.checked;
                    }
                });
            }
        });
        
        // All sliders with real-time updates
        const sliders = [
            { id: 'advancedSmoothing', prop: 'smoothing', valueId: 'advancedSmoothingValue', format: (v) => v },
            { id: 'advancedLinearBoost', prop: 'linearBoost', valueId: 'advancedLinearBoostValue', format: (v) => v },
            { id: 'advancedMinDecibels', prop: 'minDecibels', valueId: 'advancedMinDecibelsValue', format: (v) => v },
            { id: 'advancedMaxDecibels', prop: 'maxDecibels', valueId: 'advancedMaxDecibelsValue', format: (v) => v },
            { id: 'advancedFreqMin', prop: 'minFreq', valueId: 'advancedFreqMinValue', format: (v) => v },
            { id: 'advancedFreqMax', prop: 'maxFreq', valueId: 'advancedFreqMaxValue', format: (v) => v },
            { id: 'advancedBarSpace', prop: 'barSpace', valueId: 'advancedBarSpaceValue', format: (v) => v },
            { id: 'advancedRadius', prop: 'radius', valueId: 'advancedRadiusValue', format: (v) => v },
            { id: 'advancedPeakHoldTime', prop: 'peakHoldTime', valueId: 'advancedPeakHoldTimeValue', format: (v) => v },
            { id: 'advancedPeakFadeTime', prop: 'peakFadeTime', valueId: 'advancedPeakFadeTimeValue', format: (v) => v },
            { id: 'advancedReflexRatio', prop: 'reflexRatio', valueId: 'advancedReflexRatioValue', format: (v) => v.toFixed(2) },
            { id: 'advancedReflexBright', prop: 'reflexBright', valueId: 'advancedReflexBrightValue', format: (v) => v.toFixed(1) }
        ];
        
        sliders.forEach(({ id, prop, valueId, format }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(valueId);
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    valueDisplay.textContent = format(value);
                    
                    if (this.officialAudioMotion) {
                        this.officialAudioMotion[prop] = value;
                    }
                });
            }
        });
        
        // Reset button
        const resetButton = document.getElementById('resetAdvancedControls');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetAdvancedControlsToPreset();
            });
        }
    }

    loadAdvancedControlsFromPreset() {
        if (!this.officialAudioMotion) return;
        
        // Get current AudioMotion settings and populate controls
        const settings = this.officialAudioMotion.getOptions();
        
        // Populate dropdowns
        this.setControlValue('advancedGradient', settings.gradient);
        this.setControlValue('advancedColorMode', settings.colorMode);
        this.setControlValue('advancedChannelLayout', settings.channelLayout);
        this.setControlValue('advancedFftSize', settings.fftSize);
        
        // Populate toggles
        this.setControlValue('advancedRadial', settings.radial);
        this.setControlValue('advancedRadialInvert', settings.radialInvert);
        this.setControlValue('advancedRoundBars', settings.roundBars);
        this.setControlValue('advancedLedBars', settings.ledBars);
        this.setControlValue('advancedLumiBars', settings.lumiBars);
        this.setControlValue('advancedAlphaBars', settings.alphaBars);
        this.setControlValue('advancedSplitGradient', settings.splitGradient);
        this.setControlValue('advancedShowPeaks', settings.showPeaks);
        this.setControlValue('advancedReflexFit', settings.reflexFit);
        
        // Populate sliders and update their value displays
        this.setSliderValue('advancedSmoothing', 'advancedSmoothingValue', settings.smoothing);
        this.setSliderValue('advancedLinearBoost', 'advancedLinearBoostValue', settings.linearBoost);
        this.setSliderValue('advancedMinDecibels', 'advancedMinDecibelsValue', settings.minDecibels);
        this.setSliderValue('advancedMaxDecibels', 'advancedMaxDecibelsValue', settings.maxDecibels);
        this.setSliderValue('advancedFreqMin', 'advancedFreqMinValue', settings.minFreq);
        this.setSliderValue('advancedFreqMax', 'advancedFreqMaxValue', settings.maxFreq);
        this.setSliderValue('advancedBarSpace', 'advancedBarSpaceValue', settings.barSpace);
        this.setSliderValue('advancedRadius', 'advancedRadiusValue', settings.radius);
        this.setSliderValue('advancedPeakHoldTime', 'advancedPeakHoldTimeValue', settings.peakHoldTime);
        this.setSliderValue('advancedPeakFadeTime', 'advancedPeakFadeTimeValue', settings.peakFadeTime);
        this.setSliderValue('advancedReflexRatio', 'advancedReflexRatioValue', settings.reflexRatio, (v) => v.toFixed(2));
        this.setSliderValue('advancedReflexBright', 'advancedReflexBrightValue', settings.reflexBright, (v) => v.toFixed(1));
        
        // Handle conditional Radius control visibility
        const radiusWrapper = document.getElementById('advancedRadiusWrapper');
        if (radiusWrapper) {
            radiusWrapper.style.display = settings.radial ? 'block' : 'none';
        }
    }

    setControlValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    }

    setSliderValue(sliderId, valueId, value, formatter = (v) => v) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        if (slider) {
            slider.value = value;
        }
        if (valueDisplay) {
            valueDisplay.textContent = formatter(value);
        }
    }

    resetAdvancedControlsToPreset() {
        // Get the currently active preset and reload its default settings
        const activePresetBtn = document.querySelector('#headerVisualizerPanel .btn-preset-pro.active');
        if (activePresetBtn) {
            const presetIndex = parseInt(activePresetBtn.getAttribute('data-official-preset'));
            if (this.officialAudioMotionPresets && presetIndex >= 0 && presetIndex < this.officialAudioMotionPresets.length) {
                // Reapply the preset to reset all settings
                this.setOfficialAudioMotionPreset(presetIndex);
                // Reload the controls to reflect the reset values
                setTimeout(() => {
                    this.loadAdvancedControlsFromPreset();
                }, 100);
            }
        }
    }
    
    // ========== MIXER ADVANCED CONTROLS ==========
    
    setupMixerAdvancedControlEventListeners() {
        // Gradient dropdown
        const gradientSelect = document.getElementById('mixerAdvancedGradient');
        if (gradientSelect) {
            gradientSelect.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.gradient = e.target.value;
                    const headerSelect = document.getElementById('advancedGradient');
                    if (headerSelect) headerSelect.value = e.target.value;
                }
            });
        }
        
        // Color Mode dropdown
        const colorModeSelect = document.getElementById('mixerAdvancedColorMode');
        if (colorModeSelect) {
            colorModeSelect.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.colorMode = e.target.value;
                    const headerSelect = document.getElementById('advancedColorMode');
                    if (headerSelect) headerSelect.value = e.target.value;
                }
            });
        }
        
        // Channel Layout dropdown
        const channelLayoutSelect = document.getElementById('mixerAdvancedChannelLayout');
        if (channelLayoutSelect) {
            channelLayoutSelect.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.channelLayout = e.target.value;
                    const headerSelect = document.getElementById('advancedChannelLayout');
                    if (headerSelect) headerSelect.value = e.target.value;
                }
            });
        }
        
        // Mode dropdown
        const modeSelect = document.getElementById('mixerAdvancedMode');
        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.mode = parseInt(e.target.value);
                    const headerSelect = document.getElementById('advancedModeSelect');
                    if (headerSelect) headerSelect.value = e.target.value;
                }
            });
        }
        
        // FFT Size dropdown
        const fftSizeSelect = document.getElementById('mixerAdvancedFftSize');
        if (fftSizeSelect) {
            fftSizeSelect.addEventListener('change', (e) => {
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.fftSize = parseInt(e.target.value);
                    const headerSelect = document.getElementById('advancedFftSize');
                    if (headerSelect) headerSelect.value = e.target.value;
                }
            });
        }
        
        // Volume slider
        const volumeSlider = document.getElementById('mixerAdvancedVolumeSlider');
        const volumeValue = document.getElementById('mixerAdvancedVolumeValue');
        if (volumeSlider && volumeValue) {
            volumeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                volumeValue.textContent = value + '%';
                if (this.officialAudioMotion) {
                    this.officialAudioMotion.volume = value / 100;
                }
                const headerSlider = document.getElementById('advancedVolumeSlider');
                const headerValue = document.getElementById('advancedVolumeValue');
                if (headerSlider) headerSlider.value = value;
                if (headerValue) headerValue.textContent = value + '%';
            });
        }
        
        // Smoothing, Linear Boost, Min/Max Decibels, Bar Space, Radius sliders
        const sliders = [
            { id: 'mixerAdvancedSmoothing', headerId: 'advancedSmoothing', prop: 'smoothing', decimals: 2 },
            { id: 'mixerAdvancedLinearBoost', headerId: 'advancedLinearBoost', prop: 'linearBoost', decimals: 1 },
            { id: 'mixerAdvancedMinDecibels', headerId: 'advancedMinDecibels', prop: 'minDecibels', decimals: 0 },
            { id: 'mixerAdvancedMaxDecibels', headerId: 'advancedMaxDecibels', prop: 'maxDecibels', decimals: 0 },
            { id: 'mixerAdvancedBarSpace', headerId: 'advancedBarSpace', prop: 'barSpace', decimals: 1 },
            { id: 'mixerAdvancedRadius', headerId: 'advancedRadius', prop: 'radius', decimals: 2 }
        ];
        
        sliders.forEach(({ id, headerId, prop, decimals }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(id + 'Value');
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    const value = decimals === 0 ? parseInt(e.target.value) : parseFloat(e.target.value);
                    valueDisplay.textContent = decimals === 0 ? value.toString() : value.toFixed(decimals);
                    if (this.officialAudioMotion) {
                        this.officialAudioMotion[prop] = value;
                    }
                    const headerSlider = document.getElementById(headerId);
                    const headerValue = document.getElementById(headerId + 'Value');
                    if (headerSlider) headerSlider.value = value;
                    if (headerValue) headerValue.textContent = decimals === 0 ? value.toString() : value.toFixed(decimals);
                });
            }
        });
        
        // Reset button
        const resetButton = document.getElementById('mixerResetAdvancedControls');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetMixerAdvancedControlsToPreset();
            });
        }
    }
    
    loadMixerAdvancedControlsFromPreset() {
        if (!this.officialAudioMotion) return;
        
        const am = this.officialAudioMotion;
        
        // Dropdowns
        const controls = [
            { id: 'mixerAdvancedGradient', value: am.gradient || 'classic' },
            { id: 'mixerAdvancedColorMode', value: am.colorMode || 'gradient' },
            { id: 'mixerAdvancedChannelLayout', value: am.channelLayout || 'single' },
            { id: 'mixerAdvancedMode', value: (am.mode || 0).toString() },
            { id: 'mixerAdvancedFftSize', value: (am.fftSize || 8192).toString() }
        ];
        
        controls.forEach(({ id, value }) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
        
        // Sliders
        const sliders = [
            { id: 'mixerAdvancedSmoothing', value: am.smoothing || 0.5, decimals: 2 },
            { id: 'mixerAdvancedLinearBoost', value: am.linearBoost || 1.0, decimals: 1 },
            { id: 'mixerAdvancedMinDecibels', value: am.minDecibels || -85, decimals: 0 },
            { id: 'mixerAdvancedMaxDecibels', value: am.maxDecibels || -25, decimals: 0 },
            { id: 'mixerAdvancedBarSpace', value: am.barSpace || 0.1, decimals: 1 },
            { id: 'mixerAdvancedRadius', value: am.radius || 0.3, decimals: 2 },
            { id: 'mixerAdvancedVolumeSlider', value: (am.volume || 0) * 100, decimals: 0, suffix: '%' }
        ];
        
        sliders.forEach(({ id, value, decimals, suffix }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(id === 'mixerAdvancedVolumeSlider' ? 'mixerAdvancedVolumeValue' : id + 'Value');
            if (slider) slider.value = value;
            if (valueDisplay) {
                const displayValue = decimals === 0 ? Math.round(value).toString() : value.toFixed(decimals);
                valueDisplay.textContent = suffix ? displayValue + suffix : displayValue;
            }
        });
    }
    
    resetMixerAdvancedControlsToPreset() {
        const activePresetBtn = document.querySelector('[id^="mixerAMAdvPreset"].active');
        if (activePresetBtn) {
            const presetIndex = parseInt(activePresetBtn.getAttribute('data-official-preset'));
            if (this.officialAudioMotionPresets && presetIndex >= 0 && presetIndex < this.officialAudioMotionPresets.length) {
                this.setOfficialAudioMotionPreset(presetIndex);
                setTimeout(() => {
                    this.loadMixerAdvancedControlsFromPreset();
                    this.loadAdvancedControlsFromPreset();
                }, 100);
            }
        }
    }
    
    // ==================== NATIVE NEBULA PRESET/CONTROL METHODS REMOVED ====================
    // All native Nebula preset handlers removed (335 lines)
    // Methods removed: initNebulaPresetHandlers, updateNebulaPresetButton, updateNebulaToggleButton,
    // initNebulaColorPresetHandlers, applyNebulaColorPreset, initNebulaPresetManagementHandlers,
    // updateNebulaPresetDropdown, updateNebulaUIFromSettings, updateNebulaSliderValue, updateNebulaButtons
    // ==================== END NATIVE NEBULA METHODS REMOVAL ====================

    initNebulaPresetButtonHandlers() {
        // Preset button handlers
        const presetButtons = [
            { id: 'headerNebulaColorPresetBtn', preset: 'color' },
            { id: 'headerNebulaRotationPresetBtn', preset: 'rotation' },
            { id: 'headerNebulaDistancePresetBtn', preset: 'distance' },
            { id: 'headerNebulaPulsarPresetBtn', preset: 'pulsar' },
            { id: 'headerNebulaFilamentDensityPresetBtn', preset: 'filamentDensity' },
            { id: 'headerNebulaChaosPresetBtn', preset: 'chaos' },
            { id: 'headerNebulaExpansionPresetBtn', preset: 'expansion' }
        ];
        
        presetButtons.forEach(button => {
            const element = document.getElementById(button.id);
            if (element) {
                // Set initial state
                this.updateNebulaPresetButton(button.preset, element);
                
                element.addEventListener('click', () => {
                    if (this.nebulaVisualization) {
                        // Toggle the preset
                        const currentState = this.nebulaVisualization.settings.audioPresets[button.preset];
                        this.nebulaVisualization.settings.audioPresets[button.preset] = !currentState;
                        
                        // Debug logging for color preset
                        if (button.preset === 'color') {
                        }
                        
                        // Special handling for color preset toggle
                        if (button.preset === 'color') {
                            if (currentState === true) {
                                // Turning OFF - reset hue shift to original value
                                if (this.nebulaVisualization.originalHueShift !== undefined) {
                                    this.nebulaVisualization.settings.hueShift = this.nebulaVisualization.originalHueShift;
                                    this.nebulaVisualization.applyColorAdjustments();
                                    // Update UI slider to reflect reset value
                                    this.updateNebulaSliderValue('nebulaHueShift', this.nebulaVisualization.originalHueShift, this.nebulaVisualization.originalHueShift + '°');
                                }
                            }
                            // When turning ON, the originalHueShift will be stored automatically
                        }
                        
                        // Update button appearance
                        this.updateNebulaPresetButton(button.preset, element);
                    }
                });
            }
        });
    }
    
    updateNebulaPresetButton(presetName, buttonElement) {
        if (!this.nebulaVisualization || !buttonElement) return;
        
        const isEnabled = this.nebulaVisualization.settings.audioPresets[presetName];
        
        if (isEnabled) {
            buttonElement.classList.add('active');
            buttonElement.textContent = presetName.charAt(0).toUpperCase() + presetName.slice(1) + ' ON';
        } else {
            buttonElement.classList.remove('active');
            buttonElement.textContent = presetName.charAt(0).toUpperCase() + presetName.slice(1) + ' OFF';
        }
    }
    
    updateNebulaToggleButton(buttonElement, isEnabled) {
        if (!buttonElement) return;
        
        const toggleText = buttonElement.querySelector('.toggle-text');
        if (toggleText) {
            // Special cases for self-contained toggle text
            switch (buttonElement.id) {
                case 'nebulaAudioReactiveToggle':
                    toggleText.textContent = isEnabled ? 'Audio React:ON' : 'Audio React:OFF';
                    break;
                case 'nebulaShowPulsarToggle':
                    toggleText.textContent = isEnabled ? 'Show Pulsar:ON' : 'Show Pulsar:OFF';
                    break;
                case 'nebulaCameraOrbitToggle':
                    toggleText.textContent = isEnabled ? 'Camera Orbit:ON' : 'Camera Orbit:OFF';
                    break;
                case 'nebulaFlyThroughToggle':
                    toggleText.textContent = isEnabled ? 'Fly Through:ON' : 'Fly Through:OFF';
                    break;
                case 'nebulaKnockoutBackgroundToggle':
                    toggleText.textContent = isEnabled ? 'Knockout Background:ON' : 'Knockout Background:OFF';
                    break;
                case 'nebulaBloomToggle':
                    toggleText.textContent = isEnabled ? 'Bloom Effect:ON' : 'Bloom Effect:OFF';
                    break;
                case 'nebulaMorphingModeToggle':
                    toggleText.textContent = isEnabled ? 'Morph:ON' : 'Morph:OFF';
                    break;
                default:
                    toggleText.textContent = isEnabled ? 'ON' : 'OFF';
                    break;
            }
        }
        
        if (isEnabled) {
            buttonElement.classList.add('active');
        } else {
            buttonElement.classList.remove('active');
        }
    }
    
    initNebulaColorPresetHandlers() {
        // Color preset button handlers
        const colorPresetButtons = document.querySelectorAll('.nebula-color-preset');
        
        colorPresetButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (this.nebulaVisualization) {
                    const presetName = button.getAttribute('data-preset');
                    this.applyNebulaColorPreset(presetName);
                    
                    // Update active state
                    colorPresetButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                }
            });
        });
    }
    
    applyNebulaColorPreset(presetName) {
        if (!this.nebulaVisualization) {
            return;
        }
        
        // Define color presets with hue, saturation, brightness values
        const presets = {
            default: { hue: 0, saturation: 100, brightness: 100 },      // Original nebula colors (no adjustment)
            fire: { hue: 280, saturation: 200, brightness: 110 },       // Purple-magenta with high saturation
            ice: { hue: 125, saturation: 70, brightness: 95 },          // Green-cyan with moderate saturation
            toxic: { hue: 190, saturation: 200, brightness: 105 },      // Cyan-blue with high saturation
            sunset: { hue: 320, saturation: 140, brightness: 115 },     // Magenta-pink with high saturation
            deepspace: { hue: 270, saturation: 60, brightness: 85 }     // Deep Purple/Magenta (unchanged)
        };
        
        const preset = presets[presetName];
        if (!preset) {
            return;
        }
        
        // Apply the preset values to the nebula settings
        this.nebulaVisualization.updateSetting('hueShift', preset.hue);
        this.nebulaVisualization.updateSetting('saturation', preset.saturation);
        this.nebulaVisualization.updateSetting('brightness', preset.brightness);
        
        // Update the UI sliders to reflect the new values
        this.updateNebulaSliderValue('nebulaHueShift', preset.hue, preset.hue + '°');
        this.updateNebulaSliderValue('nebulaSaturation', preset.saturation, preset.saturation + '%');
        this.updateNebulaSliderValue('nebulaBrightness', preset.brightness, preset.brightness + '%');
    }
    
    initNebulaPresetManagementHandlers() {
        // Preset dropdown selector
        const presetSelect = document.getElementById('nebulaPresetSelect');
        if (presetSelect) {
            presetSelect.addEventListener('change', (e) => {
                const index = parseInt(e.target.value);
                if (!isNaN(index) && this.nebulaVisualization) {
                    const success = this.nebulaVisualization.loadPreset(index);
                    if (success) {
                        this.updateNebulaUIFromSettings();
                    }
                }
                // Reset dropdown to default
                e.target.value = '';
            });
        }
        
        // Save preset button
        const saveBtn = document.getElementById('nebulaSavePresetBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (!this.nebulaVisualization) return;
                
                const name = prompt('Enter preset name:', `Nebula Preset ${this.nebulaVisualization.savedPresets.length + 1}`);
                if (name && name.trim() !== '') {
                    this.nebulaVisualization.saveCurrentAsPreset(name.trim());
                    this.updateNebulaPresetDropdown();
                }
            });
        }
        
        // Export presets button
        const exportBtn = document.getElementById('nebulaExportPresetsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (!this.nebulaVisualization) return;
                
                this.nebulaVisualization.exportPresets();
            });
        }
        
        // Import presets button
        const importBtn = document.getElementById('nebulaImportPresetsBtn');
        const importFile = document.getElementById('nebulaImportPresetsFile');
        
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => {
                importFile.click();
            });
            
            importFile.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file || !this.nebulaVisualization) return;
                
                try {
                    const count = await this.nebulaVisualization.importPresets(file);
                    this.updateNebulaPresetDropdown();
                    alert(`Successfully imported ${count} nebula presets!`);
                } catch (error) {
                    alert('Error importing presets: ' + error);
                }
                
                // Reset file input
                e.target.value = '';
            });
        }
        
        // Initialize dropdown with existing presets
        this.updateNebulaPresetDropdown();
    }
    
    updateNebulaPresetDropdown() {
        const presetSelect = document.getElementById('nebulaPresetSelect');
        if (!presetSelect || !this.nebulaVisualization) return;
        
        // Clear existing options except the first one
        while (presetSelect.children.length > 1) {
            presetSelect.removeChild(presetSelect.lastChild);
        }
        
        // Add saved presets
        if (this.nebulaVisualization.savedPresets && this.nebulaVisualization.savedPresets.length > 0) {
            this.nebulaVisualization.savedPresets.forEach((preset, index) => {
                const option = document.createElement('option');
                option.value = index.toString();
                option.textContent = preset.name || `Preset ${index + 1}`;
                presetSelect.appendChild(option);
            });
        }
        
    }
    
    updateNebulaUIFromSettings() {
        if (!this.nebulaVisualization) return;
        
        const settings = this.nebulaVisualization.settings;
        
        // Update all sliders
        this.updateNebulaSliderValue('nebulaHueShift', settings.hueShift, settings.hueShift + '°');
        this.updateNebulaSliderValue('nebulaSaturation', settings.saturation, settings.saturation + '%');
        this.updateNebulaSliderValue('nebulaBrightness', settings.brightness, settings.brightness + '%');
        this.updateNebulaSliderValue('nebulaCameraDistance', settings.cameraDistance, settings.cameraDistance.toString());
        this.updateNebulaSliderValue('nebulaFilamentDensity', settings.filamentDensity, settings.filamentDensity.toString());
        this.updateNebulaSliderValue('nebulaParticlesPerFilament', settings.particlesPerFilament, settings.particlesPerFilament.toString());
        this.updateNebulaSliderValue('nebulaParticleSize', settings.particleSize, settings.particleSize.toString());
        this.updateNebulaSliderValue('nebulaExpansion', settings.expansion, settings.expansion.toString());
        this.updateNebulaSliderValue('nebulaChaos', settings.chaos, settings.chaos.toString());
        this.updateNebulaSliderValue('nebulaAsymmetry', settings.asymmetry, settings.asymmetry.toString());
        this.updateNebulaSliderValue('nebulaPulsarSize', settings.pulsarSize, settings.pulsarSize.toString());
        this.updateNebulaSliderValue('nebulaPulseRate', settings.pulseRate, settings.pulseRate.toString());
        this.updateNebulaSliderValue('nebulaStarCount', settings.starCount, settings.starCount.toString());
        this.updateNebulaSliderValue('nebulaOrbitSpeed', settings.orbitSpeed, settings.orbitSpeed.toString());
        this.updateNebulaSliderValue('nebulaFlySpeed', settings.flySpeed, settings.flySpeed.toString());
        this.updateNebulaSliderValue('nebulaAudioSensitivity', settings.audioSensitivity, settings.audioSensitivity.toString());
        this.updateNebulaSliderValue('nebulaOverallOpacity', settings.overallOpacity, Math.round(settings.overallOpacity * 100) + '%');
        this.updateNebulaSliderValue('nebulaMorphingSpeed', settings.morphingSpeed, settings.morphingSpeed.toString());
        
        // Update toggles
        this.updateNebulaToggleButton('nebulaCameraOrbitToggle', settings.cameraOrbit);
        this.updateNebulaToggleButton('nebulaFlyThroughToggle', settings.flyThrough);
        this.updateNebulaToggleButton('nebulaShowPulsarToggle', settings.showPulsar);
        this.updateNebulaToggleButton('nebulaBloomToggle', settings.bloom);
        this.updateNebulaToggleButton('nebulaAudioReactiveToggle', settings.audioReactive);
        this.updateNebulaToggleButton('nebulaKnockoutBackgroundToggle', settings.knockoutBackground);
        this.updateNebulaToggleButton('nebulaMorphingModeToggle', settings.morphingMode);
        
        // Update preset buttons
        Object.keys(settings.audioPresets).forEach(preset => {
            this.updateNebulaPresetButton(preset, document.getElementById(`headerNebula${preset.charAt(0).toUpperCase() + preset.slice(1)}PresetBtn`));
        });
        
    }
    
    updateNebulaSliderValue(sliderId, value, displayValue) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = slider?.parentElement.querySelector('.slider-1-value');
        
        if (slider) {
            slider.value = value;
        }
        if (valueDisplay) {
            valueDisplay.textContent = displayValue;
        }
    }

    updateNebulaButtons() {
        const toggleBtn = document.getElementById('headerNebulaToggleBtn');
        if (toggleBtn) {
            const textSpan = toggleBtn.querySelector('.toggle-text');
            if (textSpan) {
                textSpan.textContent = this.nebulaEnabled ? 'ON' : 'OFF';
            }
            toggleBtn.classList.toggle('active', this.nebulaEnabled);
        }
        
        // Also update the main header button
        const mainBtn = document.getElementById('headerNebulaBtn');
        if (mainBtn) {
            // Explicitly remove active class if nebula is disabled, add if enabled
            if (this.nebulaEnabled) {
                mainBtn.classList.add('active');
            } else {
                mainBtn.classList.remove('active');
            }
        }
        
        // Update mixer toggle button
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerNebulaToggle) {
            window.multiDisplayManager.updateMixerNebulaToggle();
        }
    }

    toggleInfiniteZoom() {
        if (!this.infiniteZoom) return;

        // Toggle infinite zoom visibility
                    if (this.infiniteZoom.isActive) {
                        this.infiniteZoom.stop();
                    } else {
                        this.infiniteZoom.initialize();
                        this.infiniteZoom.start();
        }

        // Update toggle button state
        this.updateInfiniteZoomToggleButton();
        
        // Update mixer toggle
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerInfiniteZoomToggle) {
            window.multiDisplayManager.updateMixerInfiniteZoomToggle();
        }
        
        // Re-apply z-indexes after canvas creation/destruction
        if (window.pluginMixerIntegration) {
            window.pluginMixerIntegration.reapplyZIndexes();
        }
    }

    updateInfiniteZoomToggleButton() {
        const toggleBtn = document.getElementById('headerInfiniteZoomToggleBtn');
        if (!toggleBtn) return;

        const toggleText = toggleBtn.querySelector('.toggle-text');
        if (!toggleText) return;

        // Update button text and state
        if (this.infiniteZoom && this.infiniteZoom.isActive) {
            toggleText.textContent = 'ON';
            toggleBtn.classList.add('active');
        } else {
            toggleText.textContent = 'OFF';
            toggleBtn.classList.remove('active');
        }
        
        // Also update the main header button
        const mainBtn = document.getElementById('headerInfiniteZoomBtn');
        if (mainBtn) {
            if (this.infiniteZoom && this.infiniteZoom.isActive) {
                mainBtn.classList.add('active');
            } else {
                mainBtn.classList.remove('active');
            }
        }
    }

    toggleFluidDynamics() {
        if (!this.fluidDynamics) return;

        // Toggle fluid dynamics visibility (mirror Infinite Zoom exactly)
        if (this.fluidDynamics.isActive) {
            this.fluidDynamics.stop();
        } else {
            this.fluidDynamics.initialize();
            this.fluidDynamics.start();
        }

        this.updateFluidDynamicsToggleButton();
        
        // Update mixer UI
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerFluidityToggle) {
            window.multiDisplayManager.updateMixerFluidityToggle();
        }
        
        // Re-apply z-indexes after canvas creation/destruction
        if (window.pluginMixerIntegration) {
            window.pluginMixerIntegration.reapplyZIndexes();
        }
    }

    updateFluidDynamicsToggleButton() {
        const toggleBtn = document.getElementById('headerFluidDynamicsToggleBtn');
        if (!toggleBtn) return;

        const toggleText = toggleBtn.querySelector('.toggle-text');
        if (!toggleText) return;

        // Update button text and state (mirror Infinite Zoom exactly)
        if (this.fluidDynamics && this.fluidDynamics.isActive) {
            toggleText.textContent = 'ON';
            toggleBtn.classList.add('active');
        } else {
            toggleText.textContent = 'OFF';
            toggleBtn.classList.remove('active');
        }
        
        // Also update the main header button
        const mainBtn = document.getElementById('headerFluidDynamicsBtn');
        if (mainBtn) {
            if (this.fluidDynamics && this.fluidDynamics.isActive) {
                mainBtn.classList.add('active');
            } else {
                mainBtn.classList.remove('active');
            }
        }
    }

    startKaleidoscopeAnimation() {
        const animate = () => {
            if (!this.kaleidoscopeEnabled) 
                return;
            


            // Continue animating even if visualization is disabled

            // Update beat reaction
            this.updateKaleidoscopeBeatReaction();

            // Update center animation
            this.updateKaleidoscopeCenterAnimation();

            // Calculate rotation with curve (exponential easing)
            let effectiveSpeed = this.kaleidoscopeSpeed;
            if (effectiveSpeed > 0) { // Apply exponential curve for smoother acceleration
                effectiveSpeed = Math.pow(effectiveSpeed / 6, 1.5) * 6;
            }

            // Add beat boost if enabled
            if (this.kaleidoscopeTempSpeedBoost) {
                effectiveSpeed += this.kaleidoscopeTempSpeedBoost;
            }

            // Update base rotation (reduced from 0.01 to 0.006 for 60% speed)
            if (effectiveSpeed > 0) {
                this.kaleidoscopeRotation += effectiveSpeed * 0.006;
            }

            // Update individual ring rotations
            for (let i = 0; i < this.kaleidoscopeRingRotations.length; i++) {
                const speedMultiplier = 1 + (i * this.kaleidoscopeRingSpeedMultiplier);
                this.kaleidoscopeRingRotations[i] += effectiveSpeed * 0.006 * speedMultiplier;
            }

            this.applyKaleidoscopeEffect();
            this.kaleidoscopeAnimationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    stopKaleidoscopeAnimation() {
        if (this.kaleidoscopeAnimationFrame) {
            cancelAnimationFrame(this.kaleidoscopeAnimationFrame);
            this.kaleidoscopeAnimationFrame = null;
        }

        // Clear kaleidoscope canvases
        if (this.kaleidoscopeVideoCtx) {
            this.kaleidoscopeVideoCtx.clearRect(0, 0, this.kaleidoscopeVideoCanvas.width, this.kaleidoscopeVideoCanvas.height);
        }
        if (this.kaleidoscopeVizCtx) {
            this.kaleidoscopeVizCtx.clearRect(0, 0, this.kaleidoscopeVizCanvas.width, this.kaleidoscopeVizCanvas.height);
        }

        // Hide kaleidoscope canvases
        if (this.kaleidoscopeVideoCanvas) {
            this.kaleidoscopeVideoCanvas.style.display = 'none';
        }
        if (this.kaleidoscopeVizCanvas) {
            this.kaleidoscopeVizCanvas.style.display = 'none';
        }
        
        // Show the original visualization canvas when kaleidoscope is stopped
        if (this.audioMotion && this.audioMotion.canvas) {
            this.audioMotion.canvas.style.visibility = 'visible';
        }
        
        // Show Fluid Dynamics canvas when kaleidoscope is stopped
        if (this.fluidDynamics && this.fluidDynamics.canvas) {
            this.fluidDynamics.canvas.style.visibility = 'visible';
        }
        
        // Show Infinite Zoom canvas when kaleidoscope is stopped
        if (this.infiniteZoom && this.infiniteZoom.canvas) {
            this.infiniteZoom.canvas.style.visibility = 'visible';
        }
        
        // Show WebGL canvas when kaleidoscope is stopped
        if (this.webglEnabled && this.webglVisualization && this.webglVisualization.canvas) {
            this.webglVisualization.canvas.style.visibility = 'visible';
        }

        // Show ALL active plugin canvases when kaleidoscope is stopped (matches native viz behavior)
        if (window.pluginManager) {
            const allPlugins = window.pluginManager.getAllPlugins();
            allPlugins.forEach(plugin => {
                if (plugin.canvas && plugin.isActive) {
                    plugin.canvas.style.visibility = 'visible';
                }
            });
        }

        // Restore video opacity if needed
        if (this.videoElement && this.videoMode === 'camera') {
            this.videoElement.style.opacity = this.videoOpacity.toString();
        }
    }

    updateKaleidoscopeBeatReaction() {
        if (!this.kaleidoscopeBeatReactive || !this.audioMotion || !this.audioMotion.dataArray) 
            return;
        


        let energy = 0;
        const dataArray = this.audioMotion.dataArray;
        const sampleEnd = Math.min(Math.floor(dataArray.length * 0.4), dataArray.length);

        for (let i = 0; i < sampleEnd; i++) {
            energy += dataArray[i];
        }
        energy = energy / sampleEnd / 255;

        // Scale reaction
        const scaleBoost = 1 + (energy * this.kaleidoscopeBeatSensitivity * 2);
        const newScale = Math.min(3, Math.max(0.3, this.kaleidoscopeBaseScale * scaleBoost));
        this.kaleidoscopeScale = newScale;

        // Rotation speed reaction
        if (this.kaleidoscopeBeatRotation) {
            const rotationBoost = energy * this.kaleidoscopeBeatSensitivity * 5;
            this.kaleidoscopeTempSpeedBoost = rotationBoost;
        } else {
            this.kaleidoscopeTempSpeedBoost = 0;
        }

        // Shape change on beat - FIXED VERSION
        if (this.kaleidoscopeBeatShape) { // Initialize cooldown if not exists
            if (this.shapeChangeCooldown === undefined) {
                this.shapeChangeCooldown = false;
            }

            // Lower threshold and check for beat spike
            const threshold = 0.4 * this.kaleidoscopeBeatSensitivity; // Adjustable with sensitivity

            if (!this.shapeChangeCooldown && energy > threshold) {
                const shapes = ['triangle', 'petal', 'rectangle'];
                const currentIndex = shapes.indexOf(this.kaleidoscopeShape);
                this.kaleidoscopeShape = shapes[(currentIndex + 1) % shapes.length];

                // Update UI
                const shapeBtn = document.getElementById('kaleidoscopeShapeBtn');
                if (shapeBtn) {
                    shapeBtn.textContent = `Shape: ${
                        this.kaleidoscopeShape.charAt(0).toUpperCase() + this.kaleidoscopeShape.slice(1)
                    }`;
                }

                // Set cooldown
                this.shapeChangeCooldown = true;
                setTimeout(() => {
                    this.shapeChangeCooldown = false;
                }, 300); // Reduced from 500ms for more responsive changes
            }
        }

        // Update scale slider
        const scaleSlider = document.getElementById('kaleidoscopeScale');
        const scaleValue = document.getElementById('kaleidoscopeScaleValue');
        if (scaleSlider && scaleValue) {
            scaleSlider.value = Math.round(newScale * 100);
            scaleValue.textContent = `${
                Math.round(newScale * 100)
            }%`;
        }
    }
    applyKaleidoscopePreset(preset) {
        this.kaleidoscopeSegments = preset.segments;
        this.kaleidoscopeRings = preset.rings;
        this.kaleidoscopeShape = preset.shape;
        this.kaleidoscopeScale = preset.scale / 100;
        this.kaleidoscopeSpeed = preset.speed;
        this.kaleidoscopeRingSpacing = preset.ringSpacing / 100;

        // Update UI sliders (only if kaleidoscope panel is open)
        const segmentsSlider = document.getElementById('kaleidoscopeSegments');
        if (!segmentsSlider) {
            // Kaleidoscope panel is not open, skip UI updates
            return;
        }
        
        segmentsSlider.value = preset.segments;
        document.getElementById('kaleidoscopeSegmentsValue').textContent = preset.segments;
        document.getElementById('kaleidoscopeRings').value = preset.rings;
        document.getElementById('kaleidoscopeRingsValue').textContent = preset.rings;
        document.getElementById('kaleidoscopeSpeed').value = preset.speed;
        document.getElementById('kaleidoscopeSpeedValue').textContent = preset.speed;
        document.getElementById('kaleidoscopeScale').value = preset.scale;
        document.getElementById('kaleidoscopeScaleValue').textContent = `${
            preset.scale
        }%`;
        document.getElementById('kaleidoscopeRingSpacing').value = preset.ringSpacing;
        document.getElementById('kaleidoscopeRingSpacingValue').textContent = `${
            preset.ringSpacing
        }%`;

        const shapeBtn = document.getElementById('kaleidoscopeShapeBtn');
        if (shapeBtn) {
            shapeBtn.textContent = `Shape: ${
                preset.shape.charAt(0).toUpperCase() + preset.shape.slice(1)
            }`;
        }

        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }

    applyFiltersToKaleidoscopeContext() {
        if (!this.kaleidoscopeVideoCtx) return;
        
        // Apply the same filters to the kaleidoscope canvas context
        let filters = [];

        // Apply posterize FIRST with much stronger effect (same logic as applyVideoFilters)
        if (this.videoPosterize < 16) {
            const steps = this.videoPosterize;
            const posterizeAmount = (16 - steps) / 16;

            filters.push(`contrast(${300 + posterizeAmount * 200}%)`);
            filters.push(`brightness(${95}%)`);
            filters.push(`saturate(${200}%)`);

            if (steps < 8) {
                filters.push(`contrast(${150}%)`);
            }
        }

        // Then apply other adjustments
        if (this.videoBrightness !== 100 && this.videoPosterize >= 16) {
            filters.push(`brightness(${this.videoBrightness}%)`);
        }
        if (this.videoContrast !== 100 && this.videoPosterize >= 16) {
            filters.push(`contrast(${this.videoContrast}%)`);
        }
        if (this.videoSaturation !== 100 && this.videoPosterize >= 16) {
            filters.push(`saturate(${this.videoSaturation}%)`);
        }
        if (this.videoHueRotate !== 0) {
            filters.push(`hue-rotate(${this.videoHueRotate}deg)`);
        }
        if (this.videoGrayscale > 0) {
            filters.push(`grayscale(${this.videoGrayscale}%)`);
        }
        if (this.videoSepia > 0) {
            filters.push(`sepia(${this.videoSepia}%)`);
        }
        if (this.videoBlur > 0) {
            filters.push(`blur(${this.videoBlur}px)`);
        }
        if (this.videoInvert) {
            filters.push('invert(100%)');
        }

        // Apply combined filters to the kaleidoscope canvas
        this.kaleidoscopeVideoCanvas.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
        
        // Apply pulse animation if enabled
        if (this.videoPulse) {
            this.kaleidoscopeVideoCanvas.classList.add('pulse-active');
            this.kaleidoscopeVideoCanvas.style.setProperty('--pulse-duration', `${this.videoPulseRate}s`);
        } else {
            this.kaleidoscopeVideoCanvas.classList.remove('pulse-active');
        }
        
    }

    applyKaleidoscopeEffect() {
    if (!this.kaleidoscopeCanvas) {
        console.error('Kaleidoscope canvas not initialized');
            return;
        }

    let width = this.kaleidoscopeCanvas.width;
    let height = this.kaleidoscopeCanvas.height;

    // Make sure canvas is properly sized
        if (width === 0 || height === 0) {
            this.resizeKaleidoscopeCanvases();
        width = this.kaleidoscopeCanvas.width;
        height = this.kaleidoscopeCanvas.height;
    }

    // Get all sources (video + visualizations) sorted by z-index
    const sortedSources = this.getActiveCanvasesInZIndexOrder();
    
    // Check if any sources should be drawn in kaleidoscope
    const sourcesToDraw = sortedSources.filter(source => {
        const applyToKal = source.applyToKalProperty ? this[source.applyToKalProperty] : true;
        return applyToKal && source.canvas;
    });
    
    if (sourcesToDraw.length === 0) {
        // Nothing to draw - hide kaleidoscope canvas
        this.kaleidoscopeCanvas.style.display = 'none';
        
        // Show all original canvases
        if (this.videoElement) {
            this.videoElement.style.opacity = this.videoOpacity.toString();
        }
        if (this.audioMotion?.canvas) {
            this.audioMotion.canvas.style.visibility = 'visible';
        }
        if (this.infiniteZoom?.canvas) {
            this.infiniteZoom.canvas.style.visibility = 'visible';
        }
        if (this.fluidDynamics?.canvas) {
            this.fluidDynamics.canvas.style.visibility = 'visible';
        }
        if (this.webglVisualization?.canvas) {
            this.webglVisualization.canvas.style.visibility = 'visible';
        }
        if (window.pluginManager) {
            window.pluginManager.getAllPlugins().forEach(plugin => {
                if (plugin.canvas && plugin.isActive) {
                    plugin.canvas.style.visibility = 'visible';
                }
            });
        }
        return;
    }

    // Show kaleidoscope canvas and clear it
    this.kaleidoscopeCanvas.style.display = 'block';
    this.kaleidoscopeCtx.clearRect(0, 0, width, height);

    // Hide original canvases that are being captured
    sourcesToDraw.forEach(source => {
        if (source.isVideo && this.videoElement) {
            this.videoElement.style.opacity = '0';
        } else if (source.canvas && source.canvas.style) {
            source.canvas.style.visibility = 'hidden';
        }
    });

    // Apply video filters if video is included
    const hasVideo = sourcesToDraw.some(s => s.isVideo);
    if (hasVideo) {
                this.applyFiltersToKaleidoscopeContext();
    }

    const centerX = width * this.kaleidoscopeCenterX;
    const centerY = height * this.kaleidoscopeCenterY;
    const angleStep = (Math.PI * 2) / this.kaleidoscopeSegments;

    // Calculate base radius
    const minDimension = Math.min(width, height);
    const baseRadius = minDimension * 0.45;
    
    let shapeRadius;
                        switch (this.kaleidoscopeShape) {
                            case 'petal':
            shapeRadius = baseRadius * 1.0;
                                break;
                            case 'rectangle':
            shapeRadius = baseRadius * 1.0;
                                break;
                            case 'triangle':
                            default:
            shapeRadius = baseRadius * 1.1;
                                break;
                        }

    // Draw multiple rings
            for (let ring = 0; ring < this.kaleidoscopeRings; ring++) {
                const ringScale = this.kaleidoscopeScale * Math.pow(1 - this.kaleidoscopeRingSpacing, ring);
                const ringRotationOffset = this.kaleidoscopeRingRotations[ring] || (ring * (Math.PI / this.kaleidoscopeSegments));

        // Draw segments
                for (let i = 0; i < this.kaleidoscopeSegments; i++) {
            this.kaleidoscopeCtx.save();
            this.kaleidoscopeCtx.translate(centerX, centerY);
            this.kaleidoscopeCtx.rotate(angleStep * i + this.kaleidoscopeRotation + ringRotationOffset);
            this.kaleidoscopeCtx.scale(ringScale, ringScale);

                    // Create clipping path based on shape
            this.kaleidoscopeCtx.beginPath();

                    switch (this.kaleidoscopeShape) {
                        case 'petal':
                    this.kaleidoscopeCtx.moveTo(0, 0);
                            const petalAngle = angleStep * 0.8;
                            const controlRadius = shapeRadius * 0.7;
                    this.kaleidoscopeCtx.quadraticCurveTo(
                        controlRadius * Math.cos(petalAngle * 0.3),
                        controlRadius * Math.sin(petalAngle * 0.3),
                        shapeRadius * Math.cos(petalAngle * 0.5),
                        shapeRadius * Math.sin(petalAngle * 0.5)
                    );
                    this.kaleidoscopeCtx.quadraticCurveTo(
                        controlRadius * Math.cos(petalAngle * 0.7),
                        controlRadius * Math.sin(petalAngle * 0.7),
                        0,
                        0
                    );
                            break;

                        case 'rectangle':
                            const rectAngle = angleStep * 0.45;
                    this.kaleidoscopeCtx.moveTo(0, 0);
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(-rectAngle), shapeRadius * Math.sin(-rectAngle));
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(-rectAngle), shapeRadius * Math.sin(-rectAngle) + shapeRadius * 0.3);
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(rectAngle), shapeRadius * Math.sin(rectAngle) + shapeRadius * 0.3);
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(rectAngle), shapeRadius * Math.sin(rectAngle));
                    this.kaleidoscopeCtx.lineTo(0, 0);
                            break;

                        case 'triangle':
                        default:
                    this.kaleidoscopeCtx.moveTo(0, 0);
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(0), shapeRadius * Math.sin(0));
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(angleStep), shapeRadius * Math.sin(angleStep));
                            break;
                    }

            this.kaleidoscopeCtx.closePath();
            this.kaleidoscopeCtx.clip();

            // Set opacity based on ring number
            this.kaleidoscopeCtx.globalAlpha = 1 - (ring * 0.15);

            // Mirror for odd segments
            if (i % 2 !== 0) {
                this.kaleidoscopeCtx.scale(1, -1);
            }

            // Draw ALL sources in z-index order (back to front)
            sourcesToDraw.forEach(source => {
                // Handle video source separately (needs special handling)
                if (source.isVideo && source.canvas) {
                    const videoElement = source.canvas;
                    if (videoElement.readyState >= 2) {
                        // Apply mirror transformation for video
                        this.kaleidoscopeCtx.save();
                        if (this.videoMirror === 'horizontal' || this.videoMirror === 'both') {
                            this.kaleidoscopeCtx.scale(-1, 1);
                        }
                        if (this.videoMirror === 'vertical' || this.videoMirror === 'both') {
                            this.kaleidoscopeCtx.scale(1, -1);
                        }
                        this.kaleidoscopeCtx.drawImage(videoElement, -centerX / ringScale, -centerY / ringScale, width / ringScale, height / ringScale);
                        this.kaleidoscopeCtx.restore();
                    }
                } else if (source.canvas) {
                    // Handle canvas sources (visualizations, plugins)
                    // Skip WebGL if not supported
                    if (source.type === 'webgl' && !source.webglSupported) {
                        return;
                    }
                    
                    // Handle Fluid Dynamics: Draw black background if TRANSPARENT is false
                    if (source.type === 'fluidDynamics' && this.fluidDynamics?.config) {
                        if (!this.fluidDynamics.config.TRANSPARENT) {
                            // Draw black background rectangle
                            this.kaleidoscopeCtx.save();
                            const bgOpacity = this.fluidDynamics.config.BACKGROUND_OPACITY || 1.0;
                            this.kaleidoscopeCtx.fillStyle = `rgba(0, 0, 0, ${bgOpacity})`;
                            this.kaleidoscopeCtx.fillRect(-centerX / ringScale, -centerY / ringScale, width / ringScale, height / ringScale);
                            this.kaleidoscopeCtx.restore();
                        }
                    }
                    
                    // Apply opacity for plugins
                    if (source.type === 'plugin' && source.plugin) {
                        this.kaleidoscopeCtx.save();
                        
                        // Handle Nebula knockout background
                        if (source.pluginName === 'nebula' && source.plugin.knockoutBackground) {
                            this.kaleidoscopeCtx.globalCompositeOperation = 'screen';
                        }
                        
                        if (source.plugin.opacity !== undefined) {
                            this.kaleidoscopeCtx.globalAlpha *= source.plugin.opacity;
                        }
                        this.kaleidoscopeCtx.drawImage(source.canvas, -centerX / ringScale, -centerY / ringScale, width / ringScale, height / ringScale);
                        this.kaleidoscopeCtx.restore();
                    } else if (source.type === 'fluidDynamics' && source.opacity !== undefined) {
                        this.kaleidoscopeCtx.save();
                        this.kaleidoscopeCtx.globalAlpha *= source.opacity;
                        this.kaleidoscopeCtx.drawImage(source.canvas, -centerX / ringScale, -centerY / ringScale, width / ringScale, height / ringScale);
                        this.kaleidoscopeCtx.restore();
                            } else {
                        this.kaleidoscopeCtx.drawImage(source.canvas, -centerX / ringScale, -centerY / ringScale, width / ringScale, height / ringScale);
                    }
                }
            });

            this.kaleidoscopeCtx.restore();
        }
        }
    }
    setKaleidoscopeSegments(value) {
        this.kaleidoscopeSegments = value;
        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }

    setKaleidoscopeSpeed(value) {
        this.kaleidoscopeSpeed = value;
    }

    setKaleidoscopeScale(value) {
        this.kaleidoscopeScale = value / 100;
        // Store as base scale when manually adjusted
        if (!this.kaleidoscopeBeatReactive) {
            this.kaleidoscopeBaseScale = this.kaleidoscopeScale;
        }
        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }

    setKaleidoscopeCenterX(value) {
        this.kaleidoscopeCenterX = value / 100;
        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }

    setKaleidoscopeCenterY(value) {
        this.kaleidoscopeCenterY = value / 100;
        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }

    updateKaleidoscopeCenterAnimation() {
        if (!this.kaleidoscopeCenterAnimate) return;

        const speed = this.kaleidoscopeCenterAnimSpeed / 100; // Convert to -1 to 1 range
        if (Math.abs(speed) < 0.01) return; // Skip if speed is too low

        this.kaleidoscopeCenterAnimTime += speed * 0.016; // 60fps timing

        if (this.kaleidoscopeCenterAnimMode === 'float') {
            // Random floating movement
            const noiseX = Math.sin(this.kaleidoscopeCenterAnimTime * 0.7) * 0.3 + 
                          Math.sin(this.kaleidoscopeCenterAnimTime * 1.3) * 0.2;
            const noiseY = Math.cos(this.kaleidoscopeCenterAnimTime * 0.9) * 0.3 + 
                          Math.cos(this.kaleidoscopeCenterAnimTime * 1.1) * 0.2;
            
            this.kaleidoscopeCenterX = 0.5 + noiseX;
            this.kaleidoscopeCenterY = 0.5 + noiseY;
        } else if (this.kaleidoscopeCenterAnimMode === 'circle') {
            // Circular movement
            const radius = this.kaleidoscopeCenterAnimRadius;
            this.kaleidoscopeCenterX = 0.5 + Math.cos(this.kaleidoscopeCenterAnimTime) * radius;
            this.kaleidoscopeCenterY = 0.5 + Math.sin(this.kaleidoscopeCenterAnimTime) * radius;
        }

        // Clamp values to stay within bounds
        this.kaleidoscopeCenterX = Math.max(0, Math.min(1, this.kaleidoscopeCenterX));
        this.kaleidoscopeCenterY = Math.max(0, Math.min(1, this.kaleidoscopeCenterY));

        // Update UI values only (not sliders to avoid triggering events)
        const centerXValue = document.getElementById('headerKaleidoscopeCenterXValue');
        const centerYValue = document.getElementById('headerKaleidoscopeCenterYValue');

        if (centerXValue) {
            const xPercent = Math.round(this.kaleidoscopeCenterX * 100);
            centerXValue.textContent = `${xPercent}%`;
        }

        if (centerYValue) {
            const yPercent = Math.round(this.kaleidoscopeCenterY * 100);
            centerYValue.textContent = `${yPercent}%`;
        }
    }

    // End Kaleid0scope

    generateNewMorphTarget() { // Start with locked parameters if they exist
        const baseConfig = this.lockedMorphParams || {};

        // Check if we're in radial mode
        const isRadial = baseConfig.radial !== undefined ? baseConfig.radial : Math.random() > 0.6;

        // Use locked spinSpeed if it exists, otherwise keep current
        const spinSpeed = baseConfig.spinSpeed !== undefined ? baseConfig.spinSpeed : (this.morphStartConfig ? this.morphStartConfig.spinSpeed : 0);

        this.morphTargetConfig = {
            // Keep locked parameters unchanged
            mode: baseConfig.mode !== undefined ? baseConfig.mode : Math.floor(Math.random() * 11),
            radial: isRadial,
            mirror: baseConfig.mirror !== undefined ? baseConfig.mirror : (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0),
            ledBars: baseConfig.ledBars !== undefined ? baseConfig.ledBars : false,
            ansiBands: baseConfig.ansiBands !== undefined ? baseConfig.ansiBands : Math.random() > 0.7,
            channelLayout: baseConfig.channelLayout || 'single',
            frequencyScale: baseConfig.frequencyScale || this.morphStartConfig.frequencyScale,
            spinSpeed: spinSpeed,
            // Use the preserved spin speed

            // Variable parameters that can change
            barSpace: Math.random() * 0.05,
            fillAlpha: isRadial ? 1 : 0.8 + Math.random() * 0.2,
            smoothing: 0.3 + Math.random() * 0.5,
            gradient: [
                'classic',
                'rainbow',
                'prism',
                'steelblue',
                'orangered'
            ][Math.floor(Math.random() * 5)],
            showPeaks: Math.random() > 0.5,
            radius: isRadial ? 0.8 + Math.random() * 0.6 : 0.3 + Math.random() * 0.5,
            reflexRatio: Math.random(),
            reflexAlpha: 0.5 + Math.random() * 0.5,
            roundBars: Math.random() > 0.5,
            lineWidth: isRadial ? 4 + Math.random() * 4 : Math.random() * 2,

            // Critical parameters for visibility - boost these for radial
            fftSize: 8192,
            maxDecibels: isRadial ? -15 + Math.random() * 5 : -20 + Math.random() * 10,
            minDecibels: isRadial ? -70 + Math.random() * 10 : -80 + Math.random() * 10,
            maxFreq: 16000 + Math.random() * 6000,
            minFreq: 20 + Math.random() * 30,
            linearAmplitude: true,
            linearBoost: isRadial ? 3 + Math.random() * 3 : 2 + Math.random() * 3,

            // Other parameters
            alphaBars: false,
            colorMode: 'gradient',
            fadePeaks: false,
            loRes: false,
            lumiBars: false,
            maxFPS: 0,
            noteLabels: false,
            outlineBars: Math.random() > 0.7,
            overlay: false,
            peakFadeTime: 500 + Math.random() * 500,
            peakHoldTime: 300 + Math.random() * 400,
            peakLine: false,
            reflexBright: 1,
            reflexFit: true,
            showBgColor: true,
            showFPS: false,
            showScaleY: false,
            splitGradient: false,
            trueLeds: baseConfig.mode === 6 ? Math.random() > 0.5 : false,
            useCanvas: true,
            weightingFilter: ''
        };
    }

    // Preset Methods
    loadPresets() {
        try {
            const saved = localStorage.getItem('melt_visualizer_presets');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading presets:', e);
            return [];
        }
    }

    // Background Image Methods
    loadBackgroundImage() {
        try {
            const saved = localStorage.getItem('freque_background_image');
            if (saved) {
                const data = JSON.parse(saved);
                this.backgroundImage = data.imageData;
                this.backgroundImageEnabled = data.enabled || false;
                this.backgroundImageOpacity = data.opacity || 100;
                this.backgroundImageSaturation = data.saturation || 100;
                this.backgroundImagePosterize = data.posterize || 16;
                this.backgroundImageContrast = data.contrast || 100;
                this.backgroundImageSize = data.size || 'original';
                this.backgroundImageFileName = data.fileName || '';
                this.backgroundImageFileSize = data.fileSize || 0;
                this.updateBackgroundImageElement();
                return true;
            }
        } catch (e) {
            console.error('Error loading background image:', e);
        }
        return false;
    }

    saveBackgroundImage() {
        try {
            const data = {
                imageData: this.backgroundImage,
                enabled: this.backgroundImageEnabled,
                opacity: this.backgroundImageOpacity,
                saturation: this.backgroundImageSaturation,
                posterize: this.backgroundImagePosterize,
                contrast: this.backgroundImageContrast,
                size: this.backgroundImageSize,
                fileName: this.backgroundImageFileName,
                fileSize: this.backgroundImageFileSize
            };
            localStorage.setItem('freque_background_image', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving background image:', e);
        }
    }

    clearBackgroundImage() {
        this.backgroundImage = null;
        this.backgroundImageEnabled = false;
        this.backgroundImageOpacity = 100;
        this.backgroundImageSaturation = 100;
        this.backgroundImagePosterize = 16;
        this.backgroundImageContrast = 100;
        this.backgroundImageSize = 'original';
        this.backgroundImageFileName = '';
        this.backgroundImageFileSize = 0;
        this.cachedBackgroundImage = null; // Clear cached image
        localStorage.removeItem('freque_background_image');
        
        // Update DOM element
        this.updateBackgroundImageElement();
    }

    createBackgroundImageElement() {
        if (!this.backgroundImageElement) {
            this.backgroundImageElement = document.createElement('div');
            this.backgroundImageElement.id = 'bgImage';
            
            // Critical: Set proper z-index and positioning (mirror video exactly)
            this.backgroundImageElement.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                z-index: 1;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            `;
            
            // Add data attribute for z-index management
            this.backgroundImageElement.setAttribute('data-visualization', 'backgroundimage');
            
            // Add to visualization container (same as video)
            const container = document.getElementById('visualizationContainer');
            if (container) {
                // Insert as first child to ensure proper DOM order for z-index stacking
                if (container.firstChild) {
                    container.insertBefore(this.backgroundImageElement, container.firstChild);
                } else {
                    container.appendChild(this.backgroundImageElement);
                }
            }
        }
    }

    updateBackgroundImageElement() {
        // Ensure element exists
        this.createBackgroundImageElement();
        
        if (this.backgroundImage && this.backgroundImageEnabled) {
            // Set background image
            this.backgroundImageElement.style.backgroundImage = `url(${this.backgroundImage})`;
            this.backgroundImageElement.style.opacity = this.backgroundImageOpacity / 100;
            
            // Apply sizing
            let backgroundSize = 'cover';
            switch (this.backgroundImageSize) {
                case 'fit':
                    backgroundSize = 'contain';
                    break;
                case 'fill':
                    backgroundSize = 'cover';
                    break;
                case 'stretch':
                    backgroundSize = '100% 100%';
                    break;
                case 'original':
                    backgroundSize = 'auto';
                    break;
                default:
                    backgroundSize = 'cover';
            }
            this.backgroundImageElement.style.backgroundSize = backgroundSize;
            
            // Apply filters (saturation, contrast, posterize)
            let filterString = '';
            if (this.backgroundImageSaturation !== 100) {
                filterString += `saturate(${this.backgroundImageSaturation}%) `;
            }
            if (this.backgroundImageContrast !== 100) {
                filterString += `contrast(${this.backgroundImageContrast}%) `;
            }
            // Note: CSS doesn't have posterize, but we can simulate with contrast/brightness
            if (this.backgroundImagePosterize < 16) {
                const posterizeEffect = Math.max(0.5, this.backgroundImagePosterize / 16);
                filterString += `contrast(${100 + (100 * (1 - posterizeEffect))}%) `;
            }
            
            this.backgroundImageElement.style.filter = filterString.trim();
        } else {
            // Hide background image
            this.backgroundImageElement.style.opacity = '0';
            this.backgroundImageElement.style.backgroundImage = 'none';
        }
    }

    createVideoElementPlaceholder() {
        // Create a placeholder video element for z-index management even when no video is loaded
        if (!document.getElementById('bgVideoPlaceholder')) {
            const videoPlaceholder = document.createElement('div');
            videoPlaceholder.id = 'bgVideoPlaceholder';
            
            // Style as invisible placeholder (z-index managed by mixer integration)
            videoPlaceholder.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0;
                pointer-events: none;
                background: transparent;
            `;
            
            // Add data attribute for z-index management
            videoPlaceholder.setAttribute('data-visualization', 'videoinput');
            
            // Add to visualization container
            const container = document.getElementById('visualizationContainer');
            if (container) {
                container.appendChild(videoPlaceholder);
            }
        }
    }

    drawBackgroundImage(ctx, canvasWidth, canvasHeight) {
        //     hasImage: !!this.backgroundImage,
        //     enabled: this.backgroundImageEnabled,
        //     opacity: this.backgroundImageOpacity,
        //     saturation: this.backgroundImageSaturation,
        //     canvasSize: `${canvasWidth}x${canvasHeight}`,
        //     contextType: ctx.constructor.name
        // });

        if (!this.backgroundImage || !this.backgroundImageEnabled) {
            return;
        }

        // Use cached image if available, otherwise create and cache it
        if (!this.cachedBackgroundImage) {
            this.cachedBackgroundImage = new Image();
            this.cachedBackgroundImage.onload = () => {
                //     imageSize: `${this.cachedBackgroundImage.width}x${this.cachedBackgroundImage.height}`,
                //     dataUrlLength: this.backgroundImage.length
                // });
            };
            this.cachedBackgroundImage.onerror = (e) => {
                this.cachedBackgroundImage = null;
            };
            this.cachedBackgroundImage.src = this.backgroundImage;
        }

        // Only draw if image is loaded
        if (this.cachedBackgroundImage && this.cachedBackgroundImage.complete && this.cachedBackgroundImage.naturalWidth > 0) {
            //     imageSize: `${this.cachedBackgroundImage.width}x${this.cachedBackgroundImage.height}`,
            //     dataUrlLength: this.backgroundImage.length
            // });

            // Calculate dimensions based on sizing option
            const imgAspect = this.cachedBackgroundImage.width / this.cachedBackgroundImage.height;
            const canvasAspect = canvasWidth / canvasHeight;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            switch (this.backgroundImageSize) {
                case 'fit':
                    // Scale to fit within canvas while maintaining aspect ratio
                    if (imgAspect > canvasAspect) {
                        drawWidth = canvasWidth;
                        drawHeight = canvasWidth / imgAspect;
                    } else {
                        drawHeight = canvasHeight;
                        drawWidth = canvasHeight * imgAspect;
                    }
                    drawX = (canvasWidth - drawWidth) / 2;
                    drawY = (canvasHeight - drawHeight) / 2;
                    break;
                    
                case 'fill':
                    // Scale to fill entire canvas, cropping if necessary
                    if (imgAspect > canvasAspect) {
                        drawHeight = canvasHeight;
                        drawWidth = canvasHeight * imgAspect;
                        drawX = (canvasWidth - drawWidth) / 2;
                        drawY = 0;
                    } else {
                        drawWidth = canvasWidth;
                        drawHeight = canvasWidth / imgAspect;
                        drawX = 0;
                        drawY = (canvasHeight - drawHeight) / 2;
                    }
                    break;
                    
                case 'stretch':
                    // Scale to fill entire canvas, distorting aspect ratio
                    drawWidth = canvasWidth;
                    drawHeight = canvasHeight;
                    drawX = 0;
                    drawY = 0;
                    break;
                    
                case 'original':
                default:
                    // Display at original size, centered
                    drawWidth = this.cachedBackgroundImage.width;
                    drawHeight = this.cachedBackgroundImage.height;
                    drawX = (canvasWidth - drawWidth) / 2;
                    drawY = (canvasHeight - drawHeight) / 2;
                    break;
            }

            //     imgAspect,
            //     canvasAspect,
            //     drawX, drawY, drawWidth, drawHeight
            // });

            ctx.save();
            ctx.globalAlpha = this.backgroundImageOpacity / 100;
            
            // Build filter string for all effects
            const filters = [];
            
            // Apply posterization effect (same as video posterization)
            if (this.backgroundImagePosterize < 16) {
                const steps = this.backgroundImagePosterize;
                const posterizeAmount = (16 - steps) / 16;
                filters.push(`contrast(${300 + posterizeAmount * 200}%)`);
                filters.push(`brightness(95%)`);
                filters.push(`saturate(200%)`);
                if (steps < 8) {
                    filters.push(`contrast(150%)`);
                }
            }
            
            // Apply contrast filter
            if (this.backgroundImageContrast !== 100) {
                filters.push(`contrast(${this.backgroundImageContrast}%)`);
            }
            
            // Apply saturation filter
            if (this.backgroundImageSaturation !== 100) {
                filters.push(`saturate(${this.backgroundImageSaturation}%)`);
            }
            
            // Apply all filters
            if (filters.length > 0) {
                ctx.filter = filters.join(' ');
            }
            
            ctx.drawImage(this.cachedBackgroundImage, drawX, drawY, drawWidth, drawHeight);
            ctx.restore();
        } else {
        }
    }

    savePresets() {
        try {
            localStorage.setItem('melt_visualizer_presets', JSON.stringify(this.savedPresets));
        } catch (e) {
            console.error('Error saving presets:', e);
        }
    }

    saveCurrentAsPreset(name) {
        // Detect which system is active and save accordingly
        if (this.useOfficialAudioMotion && this.officialAudioMotion) {
            this.saveCurrentProAsPreset(name);
        } else if (this.audioMotion) {
            // Existing regular AM save logic (unchanged)
            const preset = {
                name: name || `Preset ${
                    this.savedPresets.length + 1
                }`,
                timestamp: Date.now(),
                config: this.getCurrentConfig()
            };

            this.savedPresets.push(preset);
            if (this.savedPresets.length > 20) {
                this.savedPresets.shift();
            }

            this.savePresets();
            this.updatePresetSelector();
            
            // Also update the header preset selector specifically
            const headerSelector = document.getElementById('headerPresetSelector');
            if (headerSelector) {
                this.loadPresetOptions(headerSelector);
            }
        } else {
        }
    }

    // Pro Preset Saving Methods
    saveCurrentProAsPreset(name) {
        if (!this.officialAudioMotion) {
            return;
        }

        const preset = {
            name: name || `Advanced Preset ${this.savedPresets.length + 1}`,
            timestamp: Date.now(),
            config: this.getCurrentProConfig(),
            useOfficial: true  // Flag to identify Pro presets
        };
        
        this.savedPresets.push(preset);
        if (this.savedPresets.length > 20) {
            this.savedPresets.shift();
        }
        
        this.savePresets();
        this.updatePresetSelector();
        
        // Also update the header preset selector specifically
        const headerSelector = document.getElementById('headerPresetSelector');
        if (headerSelector) {
            this.loadPresetOptions(headerSelector);
        }
        
    }

    getCurrentProConfig() {
        if (!this.officialAudioMotion) return {};
        
        // Extract current Pro configuration from official AudioMotion
        const config = {};
        const params = [
            'alphaBars', 'ansiBands', 'barSpace', 'bgAlpha', 'channelLayout',
            'colorMode', 'fadePeaks', 'fftSize', 'fillAlpha', 'frequencyScale',
            'gradient', 'gradientLeft', 'gradientRight', 'gravity', 'ledBars',
            'linearAmplitude', 'linearBoost', 'lineWidth', 'loRes', 'lumiBars',
            'maxDecibels', 'maxFPS', 'maxFreq', 'minDecibels', 'minFreq',
            'mirror', 'mode', 'noteLabels', 'outlineBars', 'overlay',
            'peakFadeTime', 'peakHoldTime', 'peakLine', 'radial', 'radialInvert',
            'radius', 'reflexAlpha', 'reflexBright', 'reflexFit', 'reflexRatio',
            'roundBars', 'showBgColor', 'showFPS', 'showPeaks', 'showScaleX',
            'showScaleY', 'smoothing', 'spinSpeed', 'splitGradient', 'trueLeds',
            'useCanvas', 'volume', 'weightingFilter'
        ];
        
        params.forEach(param => {
            if (this.officialAudioMotion[param] !== undefined) {
                config[param] = this.officialAudioMotion[param];
            }
        });
        
        return config;
    }

    // Clear All Presets Functionality
    showClearPresetsModal() {
        const modal = document.getElementById('clearPresetsModal');
        const cancelBtn = document.getElementById('cancelClearBtn');
        const confirmBtn = document.getElementById('confirmClearBtn');
        
        if (!modal || !cancelBtn || !confirmBtn) {
            console.error('Clear presets modal elements not found');
            return;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Set up event listeners (remove any existing ones first)
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newConfirmBtn = confirmBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Cancel button - close modal
        newCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Confirm button - clear presets
        newConfirmBtn.addEventListener('click', () => {
            this.clearAllUserPresets();
            modal.style.display = 'none';
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    clearAllUserPresets() {
        // Preserve "Last Random" presets while clearing user-saved presets
        const lastRandomPresets = this.savedPresets.filter(p => p.name === 'Last Random');
        
        // Clear all user-saved presets but keep "Last Random"
        this.savedPresets = lastRandomPresets;
        
        // Save updated presets array to localStorage
        this.savePresets();
        
        // Update all preset dropdowns
        const headerSelector = document.getElementById('headerPresetSelector');
        if (headerSelector) {
            this.loadPresetOptions(headerSelector);
        }
        
        // Update mixer preset selector if it exists
        const mixerSelector = document.getElementById('mixerAMPresetSelector');
        if (mixerSelector) {
            this.updatePresetSelector();
        }
        
        // Show success message (using error notification system)
        const errorDiv = document.getElementById('error');
        const errorText = document.getElementById('error-text');
        if (errorDiv && errorText) {
            errorDiv.style.display = 'block';
            errorDiv.style.background = 'var(--success-color, #10b981)';
            errorText.textContent = 'User presets cleared successfully';
            document.getElementById('loading').style.display = 'none';

            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.style.background = ''; // Reset background
            }, 3000);

            errorDiv.onclick = () => {
                errorDiv.style.display = 'none';
                errorDiv.style.background = ''; // Reset background
            };
        }
        
    }

    toggleVisualization() {
        this.visualizationEnabled = !this.visualizationEnabled;

        //     enabled: this.visualizationEnabled,
        //     backgroundImageEnabled: this.backgroundImageEnabled,
        //     hasBackgroundImage: !!this.backgroundImage
        // });

        // Sidebar vizToggleBtn removed - functionality moved to header

        // Update footer visualizer button state
        this.updateFooterVisualizerButton();
        
        // Update footer toggle button state
        this.updateFooterVisualizerToggleButton();

        // Handle regular AudioMotion analyzer (only if not using official/advanced)
        if (this.audioMotion && !this.useOfficialAudioMotion) {
            if (this.visualizationEnabled) { // Resume visualization - restart the animation loop
                this.audioMotion.animate();
            } else { // Stop main visualization but keep animation loop for Infinite Zoom
                this.audioMotion.draw();
                // Don't cancel animation frame - let it continue for Infinite Zoom
                // The animation loop will handle skipping main visualization when disabled
                // Let the spectrum analyzer handle all background drawing (including background images)
                // Hide kaleidoscope viz canvas if active (but NOT video kaleidoscope)
                if (this.kaleidoscopeVizCanvas) {
                    this.kaleidoscopeVizCanvas.style.display = 'none';
                }
            }
        }
        
        // Handle official AudioMotion analyzer (Advanced/Pro visualizations)
        if (this.officialAudioMotion && this.useOfficialAudioMotion) {
            if (this.visualizationEnabled) {
                // Show and resume advanced visualization
                if (this.officialAudioMotion.canvas) {
                    this.officialAudioMotion.canvas.style.display = 'block';
                }
                // Reconnect audio if needed
                this.reconnectOfficialAudioMotion();
            } else {
                // Hide advanced visualization
                if (this.officialAudioMotion.canvas) {
                    this.officialAudioMotion.canvas.style.display = 'none';
                }
            }
        }
        
        // Update mixer AM toggle
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAMToggle) {
            window.multiDisplayManager.updateMixerAMToggle();
        }
    }

    // Set AM Visualizer opacity
    setVisualizationOpacity(opacity) {
        this.visualizationOpacity = Math.max(0.0, Math.min(1.0, opacity));
        
        // Apply opacity to AudioMotion canvas
        if (this.audioMotion && this.audioMotion.canvas) {
            this.audioMotion.canvas.style.opacity = this.visualizationOpacity.toString();
        }
        
        // Update mixer opacity slider
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAMOpacitySlider) {
            window.multiDisplayManager.updateMixerAMOpacitySlider();
        }
        
        // Update header opacity slider
        if (window.multiDisplayManager && window.multiDisplayManager.updateHeaderAMVisualizationOpacitySlider) {
            window.multiDisplayManager.updateHeaderAMVisualizationOpacitySlider();
        }
        
    }

    // Set Official AudioMotion Preset (Hybrid System)
    setOfficialAudioMotionPreset(presetIndex) {
        // Queue Pro preset if morph is running
        if (this.isMorphing) {
            this.pendingProPreset = presetIndex;
            return;
        }
        
        // Clear any pending preset since we're switching immediately
        this.pendingProPreset = null;
        
        // Save current regular mode before switching to Advanced
        if (!this.useOfficialAudioMotion && this.currentMode !== undefined) {
            this.lastRegularMode = this.currentMode;
        }

        // Update currentMode to Pro preset index (7-10) and save to localStorage
        // Pro presets are indexed 0-3, which map to modes 7-10
        const proModeIndex = 7 + presetIndex;
        this.currentMode = proModeIndex;
        localStorage.setItem('freque_am_currentMode', proModeIndex.toString());

        if (!this.officialAudioMotion) {
            // Try to initialize it now if the library is available
            if (typeof AudioMotionAnalyzer !== 'undefined') {
                try {
                    // Use the same audio context AND canvas as the custom analyzer
                    const sharedAudioContext = this.audioMotion?.audioCtx;
                    const sharedCanvas = this.audioMotion?.canvas;
                    
                    this.officialAudioMotion = new AudioMotionAnalyzer(
                        null, // No container - we're providing the canvas directly
                        {
                            mode: 10,
                            colorMode: 'bar-level',
                            gradient: 'rainbow',
                            showBgColor: false, // No background color
                            bgAlpha: 0, // Fully transparent background
                            overlay: true, // Overlay mode for transparency
                            start: false,
                            audioCtx: sharedAudioContext, // Share the same audio context
                            canvas: sharedCanvas // Share the same canvas
                        }
                    );
                } catch (error) {
                    return;
                }
            } else {
                return;
            }
        }

        if (!this.officialAudioMotionPresets[presetIndex]) {
            return;
        }

        const preset = this.officialAudioMotionPresets[presetIndex];

        // Stop custom analyzer and clear canvas
        if (this.audioMotion && this.audioMotion.stop) {
            this.audioMotion.stop();
            // Clear the shared canvas before switching
            if (this.audioMotion.canvas && this.audioMotion.ctx) {
                this.audioMotion.ctx.clearRect(0, 0, this.audioMotion.canvas.width, this.audioMotion.canvas.height);
            }
        }

        // Configure and start official AudioMotion
        try {
            // Disconnect any existing audio connections first
            if (this.officialAudioMotion.disconnectInput) {
                try {
                    this.officialAudioMotion.disconnectInput();
                } catch (error) {
                    // Ignore disconnect errors
                }
            }
            
            // Merge preset config with transparency settings
            const transparentConfig = {
                ...preset.config,
                showBgColor: false,
                bgAlpha: 0,
                overlay: true
            };
            this.officialAudioMotion.setOptions(transparentConfig);
            
            // Apply user's volume adjustment
            this.officialAudioMotion.volume = this.advancedVolumeAdjust;
            
            // Connect to same audio sources as custom analyzer
            let audioConnected = false;
            
            // Connect via audio file source node (for regular audio files)
            if (this.audioMotion && this.audioMotion.source) {
                try {
                    this.officialAudioMotion.connectInput(this.audioMotion.source);
                    audioConnected = true;
                } catch (error) {
                    // Ignore connection errors
                }
            }
            
            // Also connect to video audio gain node (for video files)
            if (this.videoAudioGain) {
                try {
                    this.officialAudioMotion.connectInput(this.videoAudioGain);
                    audioConnected = true;
                } catch (error) {
                    // Ignore connection errors
                }
            }
            
            // Also connect to live audio source (for microphone)
            if (this.streamSource) {
                try {
                    this.officialAudioMotion.connectInput(this.streamSource);
                    audioConnected = true;
                } catch (error) {
                    // Ignore connection errors
                }
            }
            
            if (!audioConnected) {
                this.officialAudioMotionNeedsConnection = true;
                
                // Try immediate reconnection in case audio source exists now
                setTimeout(() => {
                    this.reconnectOfficialAudioMotion();
                }, 100);
            } else {
                this.officialAudioMotionNeedsConnection = false;
            }
            
            // Start the official AudioMotion analyzer
            this.officialAudioMotion.toggleAnalyzer(true);
            
            // Set flag to use official analyzer
            this.useOfficialAudioMotion = true;
            
            // Start waiting state monitoring for Advanced visualizations (AFTER flag is set)
            this.startAdvancedWaitingStateMonitoring();
            
        } catch (error) {
            this.useOfficialAudioMotion = false;
        }
    }

    // Switch back to custom analyzer
    switchToCustomAnalyzer() {
        if (this.officialAudioMotion) {
            // Stop waiting state monitoring
            this.stopAdvancedWaitingStateMonitoring();
            
            // Disconnect audio first, then stop analyzer
            if (this.officialAudioMotion.disconnectInput) {
                try {
                    this.officialAudioMotion.disconnectInput();
                } catch (error) {
                    // Ignore disconnect errors
                }
            }
            
            this.officialAudioMotion.toggleAnalyzer(false);
            
            // Clear the shared canvas before switching back
            if (this.audioMotion && this.audioMotion.canvas && this.audioMotion.ctx) {
                this.audioMotion.ctx.clearRect(0, 0, this.audioMotion.canvas.width, this.audioMotion.canvas.height);
            }
        }
        
        // Restart custom analyzer and ensure audio connection
        if (this.audioMotion) {
            if (this.audioMotion.start) {
                this.audioMotion.start();
            }
            
            // Ensure audio is still connected
            if (this.audio && this.audioMotion.connectInput) {
                try {
                    this.audioMotion.connectInput(this.audio);
                } catch (error) {
                    // Ignore reconnection errors
                }
            }
            
            // Restore the previous regular mode if one was saved
            if (this.lastRegularMode !== undefined && this.lastRegularMode !== null) {
                // Small delay to ensure analyzer is ready
                setTimeout(() => {
                    this.setVisualizationMode(this.lastRegularMode);
                }, 100);
            }
        }
        
        this.useOfficialAudioMotion = false;
    }

    // Reconnect official AudioMotion to audio source when it becomes available
    reconnectOfficialAudioMotion() {
        if (!this.officialAudioMotion || !this.useOfficialAudioMotion) {
            return false;
        }

        // Disconnect first to ensure clean connection
        if (this.officialAudioMotion.disconnectInput) {
            try {
                this.officialAudioMotion.disconnectInput();
            } catch (error) {
                // Ignore disconnect errors
            }
        }

        // Try to connect to available audio sources
        let reconnected = false;
        
        // Connect to audio file source if available
        if (this.audioMotion && this.audioMotion.source) {
            try {
                this.officialAudioMotion.connectInput(this.audioMotion.source);
                reconnected = true;
            } catch (error) {
                // Ignore connection errors
            }
        }
        
        // Connect to video audio source if available
        if (this.videoAudioGain) {
            try {
                this.officialAudioMotion.connectInput(this.videoAudioGain);
                reconnected = true;
            } catch (error) {
                // Ignore connection errors
            }
        }
        
        // Connect to live audio source if available
        if (this.streamSource) {
            try {
                this.officialAudioMotion.connectInput(this.streamSource);
                reconnected = true;
            } catch (error) {
                // Ignore connection errors
            }
        }
        
        if (reconnected) {
            this.officialAudioMotionNeedsConnection = false;
            return true;
        }

        this.officialAudioMotionNeedsConnection = true;
        return false;
    }

    // Check if Official AudioMotion is available
    isOfficialAudioMotionAvailable() {
        const available = typeof AudioMotionAnalyzer !== 'undefined' && this.officialAudioMotion !== null;
        //     libraryLoaded: typeof AudioMotionAnalyzer !== 'undefined',
        //     instanceCreated: !!this.officialAudioMotion,
        //     available: available
        // });
        return available;
    }

    // Set Blobs opacity
    setBlobsOpacity(opacity) {
        this.blobsOpacity = Math.max(0.0, Math.min(1.0, opacity));
        
        // Apply opacity to Blobs visualization
        if (this.blobsVisualization) {
            this.blobsVisualization.opacity = this.blobsOpacity;
        }
        
        // Update mixer UI
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerBlobsOpacitySlider) {
            window.multiDisplayManager.updateMixerBlobsOpacitySlider();
        }
    }

    // Set Infinite Zoom opacity
    setInfiniteZoomOpacity(opacity) {
        this.infiniteZoomOpacity = Math.max(0.0, Math.min(1.0, opacity));
        
        // Apply opacity to Infinite Zoom
        if (this.infiniteZoom) {
            this.infiniteZoom.opacity = this.infiniteZoomOpacity;
            // Update existing objects with new opacity
            if (this.infiniteZoom.objects) {
                this.infiniteZoom.objects.forEach(obj => {
                    obj.alpha = this.infiniteZoomOpacity;
                });
            }
        }
        
        // Update mixer opacity slider
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerInfiniteZoomOpacitySlider) {
            window.multiDisplayManager.updateMixerInfiniteZoomOpacitySlider();
        }
        
    }

    getCurrentConfig() {
        if (!this.audioMotion) 
            return {};
        


        const config = {};
        const params = [
            'alphaBars',
            'ansiBands',
            'barSpace',
            'bgAlpha',
            'channelLayout',
            'colorMode',
            'fadePeaks',
            'fftSize',
            'fillAlpha',
            'frequencyScale',
            'gradient',
            'gradientLeft',
            'gradientRight',
            'gravity',
            'ledBars',
            'linearAmplitude',
            'linearBoost',
            'lineWidth',
            'loRes',
            'lumiBars',
            'maxDecibels',
            'maxFPS',
            'maxFreq',
            'minDecibels',
            'minFreq',
            'mirror',
            'mode',
            'noteLabels',
            'outlineBars',
            'overlay',
            'peakFadeTime',
            'peakHoldTime',
            'peakLine',
            'radial',
            'radialInvert',
            'radius',
            'reflexAlpha',
            'reflexBright',
            'reflexFit',
            'reflexRatio',
            'roundBars',
            'showBgColor',
            'showFPS',
            'showPeaks',
            'showScaleY',
            'smoothing',
            'spinSpeed',
            'splitGradient',
            'trueLeds',
            'useCanvas',
            'volume',
            'weightingFilter'
        ];

        params.forEach(param => {
            if (this.audioMotion.hasOwnProperty(param)) {
                config[param] = this.audioMotion[param];
            }
        });

        // Ensure critical values are never undefined
        config.showScaleX = false;
        config.fftSize = config.fftSize || 8192;
        config.linearAmplitude = config.linearAmplitude !== undefined ? config.linearAmplitude : true;
        config.linearBoost = config.linearBoost || 2;
        config.volume = config.volume || 0.0;

        return config;
    }

    loadPreset(index) {
        if (index < 0 || index >= this.savedPresets.length) 
            return;
        

        const preset = this.savedPresets[index];
        if (!preset || !preset.config) return;
        
        // Check if this is a Pro preset
        if (preset.useOfficial) {
            this.loadProPreset(preset);
        } else {
            // Existing regular AM load logic (unchanged)
            if (this.audioMotion) {
                // Switch back to regular AM if currently using Pro
                if (this.useOfficialAudioMotion) {
                    this.switchToCustomAnalyzer();
                }
                
                // Don't apply brightness boost to saved presets
                this.audioMotion.setOptions(preset.config);
                document.querySelectorAll('#vizModeDropdown .dropdown-item').forEach(item => {
                    item.classList.remove('active');
                });
                
            }
        }
    }

    // Pro Preset Loading Methods
    loadProPreset(preset) {
        if (!this.officialAudioMotion) {
            return;
        }
        
        // Switch to Pro system if not already active
        if (!this.useOfficialAudioMotion) {
            this.switchToOfficialAudioMotion();
        }
        
        // Apply Pro preset configuration
        this.officialAudioMotion.setOptions(preset.config);
        
        // Apply user's volume adjustment
        this.officialAudioMotion.volume = this.advancedVolumeAdjust;
        
        // Start waiting state monitoring for Advanced visualizations
        this.startAdvancedWaitingStateMonitoring();
        
    }

    switchToOfficialAudioMotion() {
        // Stop custom analyzer
        if (this.audioMotion && this.audioMotion.stop) {
            this.audioMotion.stop();
        }
        
        // Clear canvas
        const canvas = document.getElementById('visualizationCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Initialize official AudioMotion if needed
        if (!this.officialAudioMotion) {
            // Use existing initialization logic
            this.initAudioMotion();
        }
        
        // Start official AudioMotion
        if (this.officialAudioMotion) {
            this.officialAudioMotion.toggleAnalyzer(true);
            this.useOfficialAudioMotion = true;
            
            // Reconnect audio sources
            this.reconnectOfficialAudioMotion();
            
        }
    }

    // Advanced Visualization Waiting State Methods (Hybrid Approach)
    startAdvancedWaitingStateMonitoring() {
        if (!this.officialAudioMotion || !this.useOfficialAudioMotion) return;
        
        // Clear any existing monitoring
        if (this.advancedWaitingState.monitoringInterval) {
            clearInterval(this.advancedWaitingState.monitoringInterval);
        }
        
        // Monitor energy every 100ms
        this.advancedWaitingState.monitoringInterval = setInterval(() => {
            this.checkAdvancedWaitingState();
        }, 100);
        
    }
    
    stopAdvancedWaitingStateMonitoring() {
        if (this.advancedWaitingState.monitoringInterval) {
            clearInterval(this.advancedWaitingState.monitoringInterval);
            this.advancedWaitingState.monitoringInterval = null;
        }
        
        // Stop synthetic audio if active
        if (this.advancedWaitingState.isActive) {
            this.exitAdvancedWaitingState();
        }
        
    }
    
    checkAdvancedWaitingState() {
        if (!this.officialAudioMotion || !this.useOfficialAudioMotion) return;
        
        // Get current energy from audio analyzer
        let currentEnergy = 0;
        
        try {
            // Try to get energy from AI Autopilot first
            if (this.aiAutopilot && this.aiAutopilot.audioAnalyzer) {
                const features = this.aiAutopilot.audioAnalyzer.getCurrentFeatures();
                if (features && features.energy !== undefined) {
                    currentEnergy = features.energy;
                }
            }
            // Fallback: try to get from custom AudioMotion
            else if (this.audioMotion && this.audioMotion.getCurrentAudioFeatures) {
                const features = this.audioMotion.getCurrentAudioFeatures();
                if (features && features.energy !== undefined) {
                    currentEnergy = features.energy;
                }
            }
            // Final fallback: calculate from frequency data
            else if (this.audioMotion && this.audioMotion.dataArray) {
                const dataArray = this.audioMotion.dataArray;
                let sum = 0;
                const sampleEnd = Math.min(Math.floor(dataArray.length * 0.4), dataArray.length);
                for (let i = 0; i < sampleEnd; i++) {
                    sum += dataArray[i];
                }
                currentEnergy = sum / sampleEnd / 255; // Normalize to 0-1
            }
        } catch (error) {
            // Silent fallback - use previous energy or 0
            currentEnergy = this.advancedWaitingState.energyHistory.length > 0 ? 
                this.advancedWaitingState.energyHistory[this.advancedWaitingState.energyHistory.length - 1] : 0;
        }
        
        // Update energy history (same as Fluid Dynamics)
        this.advancedWaitingState.energyHistory.push(currentEnergy);
        if (this.advancedWaitingState.energyHistory.length > 10) {
            this.advancedWaitingState.energyHistory.shift();
        }
        
        // Calculate average energy over recent history
        const avgEnergy = this.advancedWaitingState.energyHistory.reduce((sum, val) => sum + val, 0) / 
                         this.advancedWaitingState.energyHistory.length;
        
        // Use same threshold as Fluid Dynamics
        const useWaitingAnimation = avgEnergy < 0.02;
        
        if (useWaitingAnimation && !this.advancedWaitingState.isActive) {
            this.enterAdvancedWaitingState();
        } else if (!useWaitingAnimation && this.advancedWaitingState.isActive) {
            this.exitAdvancedWaitingState();
        }
    }
    
    enterAdvancedWaitingState() {
        if (!this.officialAudioMotion || this.advancedWaitingState.isActive) return;
        
        this.advancedWaitingState.isActive = true;
        this.advancedWaitingState.timer = 0;
        
        // Create synthetic audio source for gentle animation
        this.createSyntheticAudioSource();
        
    }
    
    exitAdvancedWaitingState() {
        if (!this.officialAudioMotion || !this.advancedWaitingState.isActive) return;
        
        this.advancedWaitingState.isActive = false;
        
        // Stop synthetic audio source
        this.stopSyntheticAudioSource();
        
    }
    
    createSyntheticAudioSource() {
        try {
            // Use the same AudioContext as the official AudioMotion
            const audioContext = this.officialAudioMotion.audioCtx;
            if (!audioContext) return;
            
            // Create multiple oscillators for broader spectrum coverage
            this.advancedWaitingState.oscillators = [];
            this.advancedWaitingState.gainNodes = [];
            this.advancedWaitingState.masterGain = audioContext.createGain();
            this.advancedWaitingState.silentGain = audioContext.createGain();
            
            // Create oscillators across different frequency ranges for spectrum coverage
            const frequencies = [
                80,   // Low bass
                150,  // Mid bass  
                300,  // Low mid
                600,  // Mid
                1200, // High mid
                2400  // High
            ];
            
            frequencies.forEach((baseFreq, index) => {
                // Create oscillator and gain for each frequency
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                // Different waveforms for variety
                const waveforms = ['sine', 'triangle', 'sawtooth'];
                oscillator.type = waveforms[index % waveforms.length];
                
                // Set base frequency
                oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
                
                // Higher gain per oscillator for more visible activity
                gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);
                
                // Connect: oscillator → individual gain → master gain
                oscillator.connect(gainNode);
                gainNode.connect(this.advancedWaitingState.masterGain);
                
                // Store references
                this.advancedWaitingState.oscillators.push(oscillator);
                this.advancedWaitingState.gainNodes.push(gainNode);
                
                // Start the oscillator
                oscillator.start();
            });
            
            // Set silent gain to prevent synthetic audio from being audible (virtually silent but not zero)
            this.advancedWaitingState.silentGain.gain.setValueAtTime(0.001, audioContext.currentTime); // -60dB
            
            // Connect: master gain → silent gain → AudioMotion input
            this.advancedWaitingState.masterGain.connect(this.advancedWaitingState.silentGain);
            this.advancedWaitingState.silentGain.connect(this.officialAudioMotion._input);
            
            // Set higher master gain for more visible activity (before silent gain)
            this.advancedWaitingState.masterGain.gain.setValueAtTime(2.0, audioContext.currentTime);
            
            // Animate all oscillators for gentle swirling effect
            this.animateSyntheticAudio();
            
        } catch (error) {
            // Ignore synthetic audio creation errors
        }
    }
    
    stopSyntheticAudioSource() {
        try {
            // Stop all oscillators
            if (this.advancedWaitingState.oscillators) {
                this.advancedWaitingState.oscillators.forEach(oscillator => {
                    if (oscillator) {
                        oscillator.stop();
                        oscillator.disconnect();
                    }
                });
                this.advancedWaitingState.oscillators = [];
            }
            
            // Disconnect all gain nodes
            if (this.advancedWaitingState.gainNodes) {
                this.advancedWaitingState.gainNodes.forEach(gainNode => {
                    if (gainNode) {
                        gainNode.disconnect();
                    }
                });
                this.advancedWaitingState.gainNodes = [];
            }
            
            // Disconnect master gain
            if (this.advancedWaitingState.masterGain) {
                this.advancedWaitingState.masterGain.disconnect();
                this.advancedWaitingState.masterGain = null;
            }
            
            // Disconnect silent gain
            if (this.advancedWaitingState.silentGain) {
                this.advancedWaitingState.silentGain.disconnect();
                this.advancedWaitingState.silentGain = null;
            }
            
            // Legacy cleanup for single oscillator (backwards compatibility)
            if (this.advancedWaitingState.oscillator) {
                this.advancedWaitingState.oscillator.stop();
                this.advancedWaitingState.oscillator.disconnect();
                this.advancedWaitingState.oscillator = null;
            }
            
            if (this.advancedWaitingState.gainNode) {
                this.advancedWaitingState.gainNode.disconnect();
                this.advancedWaitingState.gainNode = null;
            }
            
            if (this.advancedWaitingState.animationFrame) {
                cancelAnimationFrame(this.advancedWaitingState.animationFrame);
                this.advancedWaitingState.animationFrame = null;
            }
        } catch (error) {
            // Ignore synthetic audio stop errors
        }
    }
    
    animateSyntheticAudio() {
        if (!this.advancedWaitingState.isActive || 
            (!this.advancedWaitingState.oscillators && !this.advancedWaitingState.oscillator)) return;
        
        // Increment timer (same timing as Fluid Dynamics)
        this.advancedWaitingState.timer += 0.008;
        
        const time = this.advancedWaitingState.timer;
        const audioContext = this.officialAudioMotion.audioCtx;
        
        if (audioContext) {
            // Animate multiple oscillators for spectrum coverage
            if (this.advancedWaitingState.oscillators && this.advancedWaitingState.gainNodes) {
                this.advancedWaitingState.oscillators.forEach((oscillator, index) => {
                    if (oscillator && this.advancedWaitingState.gainNodes[index]) {
                        const gainNode = this.advancedWaitingState.gainNodes[index];
                        
                        // Different phase offsets for each oscillator to create swirling effect
                        const phaseOffset = (index / this.advancedWaitingState.oscillators.length) * Math.PI * 2;
                        
                        // Get base frequency for this oscillator
                        const frequencies = [80, 150, 300, 600, 1200, 2400];
                        const baseFreq = frequencies[index] || 300;
                        
                        // Gentle frequency modulation with different speeds per oscillator
                        const freqSpeed = 0.2 + (index * 0.1); // Different speeds: 0.2, 0.3, 0.4, etc.
                        const freqVariation = Math.sin(time * freqSpeed + phaseOffset) * (baseFreq * 0.1); // 10% variation
                        const newFreq = baseFreq + freqVariation;
                        
                        oscillator.frequency.setValueAtTime(newFreq, audioContext.currentTime);
                        
                        // More pronounced gain modulation for visible activity
                        const gainSpeed = 0.3 + (index * 0.05); // Slightly different gain speeds
                        const baseGain = 0.02; // Higher base gain
                        const gainVariation = Math.sin(time * gainSpeed + phaseOffset) * 0.015; // More pronounced pulsing
                        const newGain = Math.max(0.005, baseGain + gainVariation);
                        
                        gainNode.gain.setValueAtTime(newGain, audioContext.currentTime);
                    }
                });
                
                // Animate master gain for overall breathing effect
                if (this.advancedWaitingState.masterGain) {
                    const masterGainBase = 2.0; // Higher base for more activity
                    const masterGainVariation = Math.sin(time * 0.15) * 0.5; // More pronounced breathing
                    const newMasterGain = Math.max(1.0, masterGainBase + masterGainVariation);
                    
                    this.advancedWaitingState.masterGain.gain.setValueAtTime(
                        newMasterGain, 
                        audioContext.currentTime
                    );
                }
            }
            // Legacy single oscillator animation (backwards compatibility)
            else if (this.advancedWaitingState.oscillator && this.advancedWaitingState.gainNode) {
                // Gentle frequency modulation (like Fluid Dynamics swirls)
                const baseFreq = 60;
                const freqVariation = Math.sin(time * 0.3) * 20; // Slow, gentle variation
                const newFreq = baseFreq + freqVariation;
                
                this.advancedWaitingState.oscillator.frequency.setValueAtTime(
                    newFreq, 
                    audioContext.currentTime
                );
                
                // Gentle gain modulation for pulsing effect
                const baseGain = 0.01;
                const gainVariation = Math.sin(time * 0.5) * 0.005; // Very subtle pulsing
                const newGain = Math.max(0.001, baseGain + gainVariation);
                
                this.advancedWaitingState.gainNode.gain.setValueAtTime(
                    newGain, 
                    audioContext.currentTime
                );
            }
        }
        
        // Continue animation
        this.advancedWaitingState.animationFrame = requestAnimationFrame(() => {
            this.animateSyntheticAudio();
        });
    }

    updatePresetSelector() {
        // Sidebar presetSelector removed - functionality moved to header
        const fsSelector = document.getElementById('fsPresetSelect');

        const updateSelector = (sel) => {
            if (!sel) 
                return;
            

            sel.innerHTML = '<option value="">Load Preset...</option>';
            
            // Sort presets: "Last Random" always last, others by name
            const sortedPresets = [...this.savedPresets].sort((a, b) => {
                if (a.name === 'Last Random') return 1;
                if (b.name === 'Last Random') return -1;
                return a.name.localeCompare(b.name);
            });
            
            sortedPresets.forEach((preset, sortedIndex) => {
                // Find original index for value
                const originalIndex = this.savedPresets.findIndex(p => p === preset);
                
                const option = document.createElement('option');
                option.value = originalIndex;
                
                // Don't add visual indicator - keep preset names clean
                option.textContent = preset.name;
                
                sel.appendChild(option);
            });
        };

        if (this.isFullscreen) {
            updateSelector(fsSelector);
        }
        
        // Update mixer preset selector
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAMPresetSelector) {
            window.multiDisplayManager.updateMixerAMPresetSelector();
        }
    }

    // Background Color Methods
    loadBackgroundColor() {
        try {
            const saved = localStorage.getItem('freque_bgcolor');
            if (saved) {
                this.backgroundColor = saved;
                const picker = document.getElementById('bgColorPicker');
                if (picker) 
                    picker.value = saved;
                

            } else {
                this.backgroundColor = '#000000';
            }
        } catch (e) {
            console.error('Error loading background color:', e);
            this.backgroundColor = '#000000';
        }
    }

    saveBackgroundColor() {
        try {
            localStorage.setItem('freque_bgcolor', this.backgroundColor);
        } catch (e) {
            console.error('Error saving background color:', e);
        }
    }

    setBackgroundColor(color) {
        this.backgroundColor = color;
        const visualizationContainer = document.getElementById('visualizationContainer');
        const mainArea = document.querySelector('.main-area');

        visualizationContainer.style.backgroundColor = color;
        mainArea.style.backgroundColor = color;

        this.saveBackgroundColor();

        if (this.audioMotion) {
            this.audioMotion.setBackgroundColor(color);
        }
    }


    // UI Methods
    toggleGradientMode(enable) {
        const elements = document.querySelectorAll('.header, .footer, .playlist-container, .playlist-header, .info-button, .info-popup, .loading, .error-message, .viz-btn, .color-btn, .control-btn, .fullscreen-btn, .loop-btn, .transparent-btn, .progress-bar, .progress-fill, .volume-slider, .volume-fill, .playlist-item.active, .dropdown-toggle, .random-viz-btn');

        elements.forEach(el => {
            if (enable) {
                el.classList.add('gradient-mode');
            } else {
                el.classList.remove('gradient-mode');
            }
        });
    }

    setColorScheme(scheme) {
        const root = document.documentElement;
        this.currentColorScheme = scheme;

        if (this.audioMotion) {
            this.audioMotion.setColorScheme(scheme);
        }

        const useGradients = (scheme === 'psychedelic' || scheme === 'metal');
        this.toggleGradientMode(useGradients);

        const playlistItems = document.querySelectorAll('.playlist-dropdown-item.active');
        playlistItems.forEach(item => {
            if (scheme === 'luigi') {
                item.classList.add('luigi-scheme');
            } else {
                item.classList.remove('luigi-scheme');
            }
        });

        // Update mixer color scheme select
        if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAMColorSchemeSelect) {
            window.multiDisplayManager.updateMixerAMColorSchemeSelect();
        }

        switch (scheme) {
            case 'earthtones': root.style.setProperty('--accent-color', '#D2691E');
                root.style.setProperty('--primary-bg', '#2F1B14');
                root.style.setProperty('--secondary-bg', '#4A2C17');
                root.style.setProperty('--border-color', '#8B4513');
                root.style.setProperty('--hover-color', '#654321');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#ffffff');
                break;

            case 'luigi': root.style.setProperty('--accent-color', '#0000FF');
                root.style.setProperty('--primary-bg', '#0a0a0a');
                root.style.setProperty('--secondary-bg', '#1a0000');
                root.style.setProperty('--border-color', '#00A000');
                root.style.setProperty('--hover-color', '#000066');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#ffffff');
                break;

            case 'metal': root.style.setProperty('--accent-color', '#C0C0C0');
                root.style.setProperty('--primary-bg', '#0a0a0a');
                root.style.setProperty('--secondary-bg', '#1a1a1a');
                root.style.setProperty('--border-color', '#606060');
                root.style.setProperty('--hover-color', '#2a2a2a');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#C0C0C0');
                break;

            case 'psychedelic': root.style.setProperty('--accent-color', '#FF1493');
                root.style.setProperty('--primary-bg', '#0a0a0a');
                root.style.setProperty('--secondary-bg', '#1a0a1a');
                root.style.setProperty('--border-color', '#9400D3');
                root.style.setProperty('--hover-color', '#2a1a2a');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#00CED1');
                break;

            default: root.style.setProperty('--accent-color', '#2969b0');
                root.style.setProperty('--primary-bg', '#f5f3e9');
                root.style.setProperty('--secondary-bg', '#1a1a1a');
                root.style.setProperty('--border-color', '#898989');
                root.style.setProperty('--hover-color', '#2a2a2a');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#ffffff');
                break;
        }
    }

    // Setup floating panel resize handler for C V B A panels
    setupFloatingPanelResizeHandler() {
        // Update all floating panel positions on window resize
        window.addEventListener('resize', () => {
            this.updateAllFloatingPanelPositions();
        });
    }

    // Position a single floating panel relative to its button
    positionFloatingPanel(panel, button) {
        const buttonRect = button.getBoundingClientRect();
        
        // Special z-index for footer record settings panel
        if (button.id === 'footerRecordSettingsBtn') {
            panel.style.zIndex = '25000';
        }
        
        // Special positioning for right-aligned panels
        if (button.id === 'footerAutopilotSettingsBtn' || button.id === 'mixerBtn') {
            panel.style.left = 'auto';
            panel.style.right = `${window.innerWidth - buttonRect.right}px`;
            
            // For mixer panel, use fixed bottom positioning to prevent jump on resize
            if (button.id === 'mixerBtn') {
                // Bottom edge should always be 4px above footer button top
                const bottomOffset = window.innerHeight - buttonRect.top + 8;
                panel.style.bottom = `${bottomOffset}px`;
                panel.style.top = 'auto';
                panel.style.transform = 'none';
            } else {
            panel.style.top = `${buttonRect.top - 4}px`;
            panel.style.transform = 'translateY(-100%)';
            }
        } else {
            // Default left-aligned positioning
            panel.style.left = `${buttonRect.left}px`;
            panel.style.right = 'auto';
            
            // Special positioning for panels that should appear above button
            if (button.id === 'footerPlaylistBtn' || button.id === 'footerDisplaySettingsBtn' || button.id === 'footerRecordSettingsBtn' || 
                button.id === 'display1SettingsBtn' || button.id === 'display2SettingsBtn' || button.id === 'display3SettingsBtn') {
                panel.style.top = `${buttonRect.top - 4}px`;
                panel.style.transform = 'translateY(-100%)';
            } else {
                // Default positioning for other panels (appears below button)
                panel.style.top = `${buttonRect.bottom + 4}px`;
                panel.style.transform = 'none';
            }
        }
    }

    // Update positions of all floating panels
    updateAllFloatingPanelPositions() {
        const panels = document.querySelectorAll('.panel-floating[data-button-id]');
        panels.forEach(panel => {
            const buttonId = panel.dataset.buttonId;
            const button = document.getElementById(buttonId);
            if (button && panel.style.display !== 'none') {
                this.positionFloatingPanel(panel, button);
            }
        });
    }

    // * new event listeners
    setupEventListeners() { // Dropdown toggles
        const setupDropdown = (toggleId, dropdownId) => {
            const toggle = document.getElementById(toggleId);
            const dropdown = document.getElementById(dropdownId);

            if (! toggle || ! dropdown) 
                return;
            


            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.dropdown-content').forEach(d => {
                    if (d !== dropdown) 
                        d.classList.remove('show');
                    

                });
                dropdown.classList.toggle('show');
            });
        };

        // Sidebar dropdowns removed - functionality moved to header
        // Playlist is now embedded - no dropdown setup needed

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-content').forEach(d => {
                d.classList.remove('show');
            });
        });

        // Sidebar color scheme and visualization mode dropdowns removed - functionality moved to header

        // Sidebar visualization toggle button removed - functionality moved to header

        // Volume icon mute toggle
        const volumeIcon = document.querySelector('.volume-control .volume-icon');
        if (volumeIcon) {
            volumeIcon.style.cursor = 'pointer'; // Make it look clickable
            volumeIcon.addEventListener('click', () => {
                this.toggleMute();
            });
        }

        // Advanced Volume Adjust Slider
        const advancedVolumeSlider = document.getElementById('advancedVolumeSlider');
        const advancedVolumeValue = document.getElementById('advancedVolumeValue');
        if (advancedVolumeSlider && advancedVolumeValue) {
            // Load saved value
            const savedVolume = localStorage.getItem('advancedVolumeAdjust');
            if (savedVolume !== null) {
                this.advancedVolumeAdjust = parseFloat(savedVolume);
                const sliderValue = Math.round(this.advancedVolumeAdjust * 100);
                advancedVolumeSlider.value = sliderValue;
                advancedVolumeValue.textContent = sliderValue + '%';
            } else {
                // Set initial display to match default value
                advancedVolumeValue.textContent = '0%';
            }

            advancedVolumeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.advancedVolumeAdjust = value / 100; // Convert 0-100 to 0.0-1.0
                advancedVolumeValue.textContent = value + '%';
                
                // Apply immediately to current Pro visualization
                if (this.useOfficialAudioMotion && this.officialAudioMotion) {
                    this.officialAudioMotion.volume = this.advancedVolumeAdjust;
                }
                
                // Save to localStorage
                localStorage.setItem('advancedVolumeAdjust', this.advancedVolumeAdjust.toString());
            });
        }

        
        // Sidebar video pulse controls removed - now handled by header sliders only

        // Sidebar video basic controls removed - now handled by header sliders only

        // Sidebar video color controls removed - now handled by header sliders only

        // Sidebar video effects controls removed - now handled by header sliders only


        // Live Display button - both sidebar and footer
        const liveDisplayBtns = document.querySelectorAll('#liveDisplayBtn');
        liveDisplayBtns.forEach(liveDisplayBtn => {
            liveDisplayBtn.addEventListener('click', () => {
                if (this.streamManager) {
                    this.streamManager.toggleLiveDisplay();
                }
            });
        });

        // Footer Display Settings button
        const footerDisplaySettingsBtn = document.getElementById('footerDisplaySettingsBtn');
        if (footerDisplaySettingsBtn) {
            footerDisplaySettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleFooterSettingsPanel('footerDisplaySettingsPanel', footerDisplaySettingsBtn);
            });
        }

        // Footer Record Settings button
        const footerRecordSettingsBtn = document.getElementById('footerRecordSettingsBtn');
        if (footerRecordSettingsBtn) {
            footerRecordSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleFooterSettingsPanel('footerRecordSettingsPanel', footerRecordSettingsBtn);
            });
        }

        // Footer Settings Panel close buttons
        const footerDisplaySettingsClose = document.getElementById('footerDisplaySettingsClose');
        if (footerDisplaySettingsClose) {
            footerDisplaySettingsClose.addEventListener('click', () => {
                this.closeFooterSettingsPanel('footerDisplaySettingsPanel');
            });
        }

        const footerRecordSettingsClose = document.getElementById('footerRecordSettingsClose');
        if (footerRecordSettingsClose) {
            footerRecordSettingsClose.addEventListener('click', () => {
                this.closeFooterSettingsPanel('footerRecordSettingsPanel');
            });
        }

        // Display settings close buttons
        const display1SettingsClose = document.getElementById('display1SettingsClose');
        const display2SettingsClose = document.getElementById('display2SettingsClose');
        const display3SettingsClose = document.getElementById('display3SettingsClose');
        
        if (display1SettingsClose) {
            display1SettingsClose.addEventListener('click', () => {
                this.closeFooterSettingsPanel('display1SettingsPanel');
            });
        }
        
        if (display2SettingsClose) {
            display2SettingsClose.addEventListener('click', () => {
                this.closeFooterSettingsPanel('display2SettingsPanel');
            });
        }
        
        if (display3SettingsClose) {
            display3SettingsClose.addEventListener('click', () => {
                this.closeFooterSettingsPanel('display3SettingsPanel');
            });
        }

        // Click outside to close footer settings panels
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.footer-settings-panel') && !e.target.closest('.footer-settings-btn')) {
                this.closeAllFooterSettingsPanels();
            }
        });

        // Initialize footer settings controls - delay to ensure recordManager is ready
        setTimeout(() => {
            this.initializeFooterSettingsControls();
        }, 100);

        // Initialize display settings panels
        this.initializeDisplaySettingsPanels();

        // Display Settings Panel Controls
        // Close button
        const displaySettingsClose = document.getElementById('displaySettingsClose');
        if (displaySettingsClose) {
            displaySettingsClose.addEventListener('click', () => {
                document.getElementById('displaySettingsPanel').style.display = 'none';
            });
        }

        // Display Settings button toggle
        const displaySettingsBtn = document.getElementById('displaySettingsBtn');
        if (displaySettingsBtn) {
            displaySettingsBtn.addEventListener('click', () => {
                const panel = document.getElementById('displaySettingsPanel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        // Presentation mode buttons
        document.querySelectorAll('.display-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { // Update active state - sidebar only (footer removed)
                document.querySelectorAll('#displaySettingsPanel .display-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update settings
                const mode = btn.dataset.mode;
                if (this.streamManager) {
                    this.streamManager.displaySettings.presentationMode = mode;
                    this.streamManager.saveDisplaySettings();

                    // Send to display window if streaming
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        });

        // Aspect ratio buttons
        document.querySelectorAll('.aspect-ratio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { // Update sidebar only (footer removed)
                document.querySelectorAll('#displaySettingsPanel .aspect-ratio-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const ratio = btn.dataset.ratio;
                if (this.streamManager) {
                    this.streamManager.displaySettings.aspectRatio = ratio;
                    this.streamManager.saveDisplaySettings();
                    this.streamManager.reconfigureCapture();
                }
            });
        });

        // Capture resolution dropdown
        const captureResolution = document.getElementById('captureResolution');
        if (captureResolution) {
            captureResolution.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (this.streamManager) {
                    this.streamManager.displaySettings.captureResolution = value;
                    this.streamManager.saveDisplaySettings();
                    this.streamManager.reconfigureCapture();
                    
                    // Update stats display
                    if (this.cameraInfo) {
                        this.updateCameraStats();
                    }
                }
            });
        }

        // Capture frame rate dropdown
        const captureFrameRate = document.getElementById('captureFrameRate');
        if (captureFrameRate) {
            captureFrameRate.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (this.streamManager) {
                    this.streamManager.displaySettings.captureFrameRate = value;
                    this.streamManager.saveDisplaySettings();
                    this.streamManager.reconfigureCapture();
                    
                    // Update stats display
                    if (this.cameraInfo) {
                        this.updateCameraStats();
                    }
                }
            });
        }

        // Capture bitrate slider
        const captureBitrate = document.getElementById('captureBitrate');
        if (captureBitrate) {
            captureBitrate.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('captureBitrateValue').textContent = `${value} Mbps`;
                if (this.streamManager) {
                    this.streamManager.displaySettings.captureBitrate = value;
                    this.streamManager.saveDisplaySettings();
                    this.streamManager.reconfigureCapture();
                    
                    // Update stats display
                    if (this.cameraInfo) {
                        this.updateCameraStats();
                    }
                }
            });
        }

        // Display sharpness slider
        const displaySharpness = document.getElementById('displaySharpness');
        if (displaySharpness) {
            displaySharpness.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('displaySharpnessValue').textContent = `${value}%`;
                if (this.streamManager) {
                    this.streamManager.displaySettings.displaySharpness = value;
                    this.streamManager.saveDisplaySettings();

                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        }

        // Letterbox color picker
        const letterboxColor = document.getElementById('letterboxColor');
        if (letterboxColor) {
            letterboxColor.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('letterboxColorValue').textContent = value;
                if (this.streamManager) {
                    this.streamManager.displaySettings.letterboxColor = value;
                    this.streamManager.saveDisplaySettings();

                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        }

        // Mirror background toggle
        const mirrorBackgroundBtn = document.getElementById('mirrorBackgroundBtn');
        if (mirrorBackgroundBtn) {
            mirrorBackgroundBtn.addEventListener('click', () => {
                if (this.streamManager) {
                    this.streamManager.displaySettings.mirrorBackground = !this.streamManager.displaySettings.mirrorBackground;
                    this.streamManager.saveDisplaySettings();

                    // Update UI
                    mirrorBackgroundBtn.classList.toggle('active', this.streamManager.displaySettings.mirrorBackground);
                    mirrorBackgroundBtn.textContent = `Mirror Background: ${
                        this.streamManager.displaySettings.mirrorBackground ? 'On' : 'Off'
                    }`;

                    // Show/hide blur controls
                    const blurContainer = document.getElementById('mirrorBlurContainer');
                    if (blurContainer) {
                        blurContainer.style.display = this.streamManager.displaySettings.mirrorBackground ? 'flex' : 'none';
                    }

                    // Send to display
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        }

        // Mirror background blur slider
        const mirrorBackgroundBlur = document.getElementById('mirrorBackgroundBlur');
        if (mirrorBackgroundBlur) {
            mirrorBackgroundBlur.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('mirrorBackgroundBlurValue').textContent = `${value}px`;
                if (this.streamManager) {
                    this.streamManager.displaySettings.mirrorBackgroundBlur = value;
                    this.streamManager.saveDisplaySettings();

                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        }

        // Display preset buttons
        document.querySelectorAll('.display-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = btn.dataset.preset;
                this.applyDisplayPreset(preset);
            });
        });

        // Display aspect ratio buttons
        document.querySelectorAll('#displaySettingsPanel .aspect-ratio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all aspect ratio buttons in display settings
                document.querySelectorAll('#displaySettingsPanel .aspect-ratio-btn').forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                const ratio = btn.dataset.ratio;
                if (this.streamManager) {
                    this.streamManager.displaySettings.aspectRatio = ratio;
                    this.streamManager.saveDisplaySettings();
                    console.log('Display aspect ratio changed to:', ratio);
                    
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        });

        // Kaleidoscope
        // Sidebar kaleidoscope controls removed - functionality moved to header
        
        // Header Kaleidoscope button
        const headerKaleidoscopeBtn = document.getElementById('headerKaleidoscopeBtn');
        if (headerKaleidoscopeBtn) {
            headerKaleidoscopeBtn.addEventListener('click', () => {
                this.toggleHeaderKaleidoscope();
            });
            
            // Initialize button state
            this.updateKaleidoscopeButtonState();
        }

        // Header Infinite Zoom button
        const headerInfiniteZoomBtn = document.getElementById('headerInfiniteZoomBtn');
        if (headerInfiniteZoomBtn) {
            headerInfiniteZoomBtn.addEventListener('click', () => {
                this.toggleHeaderInfiniteZoom();
            });
        }

        // Mixer button
        const mixerBtn = document.getElementById('mixerBtn');
        if (mixerBtn) {
            mixerBtn.addEventListener('click', () => {
                this.toggleMixer();
            });
        }

        // Mixer close button
        const mixerCloseBtn = document.getElementById('mixerCloseBtn');
        if (mixerCloseBtn) {
            mixerCloseBtn.addEventListener('click', () => {
                this.toggleMixer(); // Same function as main mixer button
            });
        }

        // Header Fluid Dynamics button
        const headerFluidDynamicsBtn = document.getElementById('headerFluidDynamicsBtn');
        if (headerFluidDynamicsBtn) {
            headerFluidDynamicsBtn.addEventListener('click', () => {
                this.toggleHeaderFluidDynamics();
            });
        }

        // Header Nebula button
        const headerNebulaBtn = document.getElementById('headerNebulaBtn');
        if (headerNebulaBtn) {
            headerNebulaBtn.addEventListener('click', () => {
                this.toggleHeaderNebula();
            });
        }

        // Native Nebula toggle button removed - Nebula plugin handles power control
        
        // Nebula panel close button
        const headerNebulaCloseBtn = document.getElementById('headerNebulaCloseBtn');
        if (headerNebulaCloseBtn) {
            headerNebulaCloseBtn.addEventListener('click', () => {
                this.toggleHeaderNebula(); // Close the panel
            });
        }
        
        // Native Nebula control handlers removed - Nebula plugin handles all controls

        // Header Infinite Zoom Toggle button
        const headerInfiniteZoomToggleBtn = document.getElementById('headerInfiniteZoomToggleBtn');
        if (headerInfiniteZoomToggleBtn) {
            headerInfiniteZoomToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleInfiniteZoom();
            });
        }

        // Header Fluid Dynamics Toggle button
        const headerFluidDynamicsToggleBtn = document.getElementById('headerFluidDynamicsToggleBtn');
        if (headerFluidDynamicsToggleBtn) {
            headerFluidDynamicsToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleFluidDynamics();
            });
        }

        // Header WebGL Toggle button
        const headerWebGLToggleBtn = document.getElementById('headerWebGLToggleBtn');
        if (headerWebGLToggleBtn) {
            headerWebGLToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Check if WebGL is supported before allowing interaction
                if (this.webglVisualization && !this.webglVisualization.webglSupported) {
                    console.warn('🎮 WebGL: Toggle clicked but WebGL not supported');
                    return;
                }
                
                this.toggleWebGL();
            });
        }

        // Header Blobs button
        const headerBlobsBtn = document.getElementById('headerBlobsBtn');
        if (headerBlobsBtn) {
            headerBlobsBtn.addEventListener('click', () => {
                this.toggleHeaderBlobs();
            });
        }

        // Header Blobs Toggle button
        const headerBlobsToggleBtn = document.getElementById('headerBlobsToggleBtn');
        if (headerBlobsToggleBtn) {
            headerBlobsToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleBlobs();
            });
        }

        // Header WebGL button
        const headerWebGLBtn = document.getElementById('headerWebGLBtn');
        if (headerWebGLBtn) {
            headerWebGLBtn.addEventListener('click', () => {
                // Check if WebGL is supported before allowing interaction
                if (this.webglVisualization && !this.webglVisualization.webglSupported) {
                    console.warn('🎮 WebGL: Button clicked but WebGL not supported');
                    return;
                }
                this.toggleHeaderWebGL();
            });
        }

        // WebGL panel close button
        const headerWebGLCloseBtn = document.getElementById('headerWebGLCloseBtn');
        if (headerWebGLCloseBtn) {
            headerWebGLCloseBtn.addEventListener('click', () => {
                const panel = document.getElementById('headerWebGLPanel');
                if (panel) {
                    panel.style.display = 'none';
                }
            });
        }

        // Click outside to close panels
        document.addEventListener('click', (e) => {
            const kaleidoscopePanel = document.getElementById('headerKaleidoscopePanel');
            const infiniteZoomPanel = document.getElementById('headerInfiniteZoomPanel');
            const blobsPanel = document.getElementById('headerBlobsPanel');
            const webglPanel = document.getElementById('headerWebGLPanel');
            const kaleidoscopeBtn = document.getElementById('headerKaleidoscopeBtn');
            const infiniteZoomBtn = document.getElementById('headerInfiniteZoomBtn');
            const infiniteZoomToggleBtn = document.getElementById('headerInfiniteZoomToggleBtn');
            const blobsBtn = document.getElementById('headerBlobsBtn');
            const webglBtn = document.getElementById('headerWebGLBtn');
            const webglToggleBtn = document.getElementById('headerWebGLToggleBtn');

            // Close Kaleidoscope panel if clicking outside
            if (kaleidoscopePanel && kaleidoscopePanel.style.display !== 'none') {
                if (!kaleidoscopePanel.contains(e.target) && !kaleidoscopeBtn.contains(e.target)) {
                    kaleidoscopePanel.style.display = 'none';
                }
            }

            // Close Infinite Zoom panel if clicking outside
            if (infiniteZoomPanel && infiniteZoomPanel.style.display !== 'none') {
                if (!infiniteZoomPanel.contains(e.target) && !infiniteZoomBtn.contains(e.target) && !infiniteZoomToggleBtn.contains(e.target)) {
                    infiniteZoomPanel.style.display = 'none';
                }
            }

            // Close Blobs panel if clicking outside
            if (blobsPanel && blobsPanel.style.display !== 'none') {
                if (!blobsPanel.contains(e.target) && !blobsBtn.contains(e.target)) {
                    blobsPanel.style.display = 'none';
                }
            }

            // Close WebGL panel if clicking outside
            if (webglPanel && webglPanel.style.display !== 'none') {
                if (!webglPanel.contains(e.target) && !webglBtn.contains(e.target) && !webglToggleBtn.contains(e.target)) {
                    webglPanel.style.display = 'none';
                }
            }
        });
        
        // Sidebar infinite zoom controls removed - functionality moved to header


        // Blobs gear button removed - functionality moved to main button
        
        // Blobs close button
        const blobsCloseBtn = document.getElementById('headerBlobsCloseBtn');
        if (blobsCloseBtn) {
            blobsCloseBtn.addEventListener('click', () => {
                const panel = document.getElementById('headerBlobsPanel');
                if (panel) {
                    panel.style.display = 'none';
                }
            });
        }

        // Blobs control sliders
        this.setupBlobsControls();

        // WebGL control sliders - moved to after WebGL initialization

        // Infinite Zoom gear button
        const infiniteZoomGearBtn = document.getElementById('infiniteZoomGearBtn');
        // Sidebar infinite zoom panel controls removed - functionality moved to header
        
        // Infinite Zoom shape selection
        const infiniteZoomShapeSelect = document.getElementById('infiniteZoomShapeSelect');
        if (infiniteZoomShapeSelect) {
            infiniteZoomShapeSelect.addEventListener('change', (e) => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.shape = e.target.value;
                    this.infiniteZoom.updateObjectShapes();
                }
            });
        }

        // Header Infinite Zoom shape selection
        const headerInfiniteZoomShapeSelect = document.getElementById('headerInfiniteZoomShapeSelect');
        if (headerInfiniteZoomShapeSelect) {
            headerInfiniteZoomShapeSelect.addEventListener('change', (e) => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.shape = e.target.value;
                    this.infiniteZoom.updateObjectShapes();
                    
                    // Update mixer shape select
                    if (window.multiDisplayManager && window.multiDisplayManager.updateMixerInfiniteZoomShapeSelect) {
                        window.multiDisplayManager.updateMixerInfiniteZoomShapeSelect();
                    }
                }
            });
        }
        
        // Infinite Zoom color randomness slider
        const infiniteZoomColorRandomSlider = document.getElementById('infiniteZoomColorRandomSlider');
        const infiniteZoomColorRandomValue = document.getElementById('infiniteZoomColorRandomValue');
        if (infiniteZoomColorRandomSlider && infiniteZoomColorRandomValue) {
            infiniteZoomColorRandomSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                infiniteZoomColorRandomValue.textContent = value.toFixed(1);
                if (this.infiniteZoom) {
                    this.infiniteZoom.colorRandomness = value;
                    // Update existing objects with new color randomness
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.color = this.infiniteZoom.generateColor();
                    });
                }
            });
        }

        // Header Infinite Zoom color randomness slider
        const headerInfiniteZoomColorRandomSlider = document.getElementById('headerInfiniteZoomColorRandomSlider');
        const headerInfiniteZoomColorRandomValue = document.getElementById('headerInfiniteZoomColorRandomValue');
        if (headerInfiniteZoomColorRandomSlider && headerInfiniteZoomColorRandomValue) {
            headerInfiniteZoomColorRandomSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                headerInfiniteZoomColorRandomValue.textContent = value.toFixed(1);
                if (this.infiniteZoom) {
                    this.infiniteZoom.colorRandomness = value;
                    // Update existing objects with new color randomness
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.color = this.infiniteZoom.generateColor();
                    });
                }
                
                // Update mixer slider
                if (window.multiDisplayManager && window.multiDisplayManager.updateMixerInfiniteZoomColorRandomSlider) {
                    window.multiDisplayManager.updateMixerInfiniteZoomColorRandomSlider();
                }
            });
        }
        
        // Infinite Zoom min size slider
        const infiniteZoomMinSizeSlider = document.getElementById('infiniteZoomMinSizeSlider');
        const infiniteZoomMinSizeValue = document.getElementById('infiniteZoomMinSizeValue');
        if (infiniteZoomMinSizeSlider && infiniteZoomMinSizeValue) {
            infiniteZoomMinSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomMinSizeValue.textContent = value;
                if (this.infiniteZoom) {
                    this.infiniteZoom.minSize = value;
                    // Update existing objects with new size range
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.infiniteZoom.minSize + Math.random() * (this.infiniteZoom.maxSize - this.infiniteZoom.minSize);
                    });
                }
            });
        }
        
        // Infinite Zoom max size slider
        const infiniteZoomMaxSizeSlider = document.getElementById('infiniteZoomMaxSizeSlider');
        const infiniteZoomMaxSizeValue = document.getElementById('infiniteZoomMaxSizeValue');
        if (infiniteZoomMaxSizeSlider && infiniteZoomMaxSizeValue) {
            infiniteZoomMaxSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomMaxSizeValue.textContent = value;
                if (this.infiniteZoom) {
                    this.infiniteZoom.maxSize = value;
                    // Update existing objects with new size range
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.infiniteZoom.minSize + Math.random() * (this.infiniteZoom.maxSize - this.infiniteZoom.minSize);
                    });
                }
            });
        }
        
        // Infinite Zoom density slider
        const infiniteZoomDensitySlider = document.getElementById('infiniteZoomDensitySlider');
        const infiniteZoomDensityValue = document.getElementById('infiniteZoomDensityValue');
        if (infiniteZoomDensitySlider && infiniteZoomDensityValue) {
            infiniteZoomDensitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomDensityValue.textContent = value;
                if (this.infiniteZoom) {
                    // Convert 1-100 range to actual density based on screen area
                    // At 100, objects should fill screen with no negative space
                    const screenArea = this.infiniteZoom.canvas ? 
                        this.infiniteZoom.canvas.width * this.infiniteZoom.canvas.height : 800 * 600;
                    const maxDensity = Math.floor(screenArea / 100); // 1 object per 100 pixels for max density
                    this.infiniteZoom.density = Math.floor((value / 100) * maxDensity);
                    // Regenerate objects if active
                    if (this.infiniteZoom.isActive) {
                        this.infiniteZoom.generateInitialObjects();
                    }
                }
            });
        }
        
        // Infinite Zoom speed slider
        const infiniteZoomSpeedSlider = document.getElementById('infiniteZoomSpeedSlider');
        const infiniteZoomSpeedValue = document.getElementById('infiniteZoomSpeedValue');
        if (infiniteZoomSpeedSlider && infiniteZoomSpeedValue) {
            infiniteZoomSpeedSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomSpeedValue.textContent = value;
                if (this.infiniteZoom) {
                    // Convert -100 to 100 range to zoom speed
                    // 0 = no movement, 50 = normal speed, 100 = very fast, -100 = very fast reverse
                    if (value === 0) {
                        this.infiniteZoom.zoomSpeed = 0;
                        this.infiniteZoom.baseZoomSpeed = 0;
                    } else {
                        // Convert to actual zoom speed: -100 to 100 becomes -0.1 to 0.1
                        const newSpeed = (value / 100) * 0.1;
                        this.infiniteZoom.zoomSpeed = newSpeed;
                        this.infiniteZoom.baseZoomSpeed = newSpeed;
                    }
                }
            });
        }
        
        // Infinite Zoom rotation slider
        const infiniteZoomRotationSlider = document.getElementById('infiniteZoomRotationSlider');
        const infiniteZoomRotationValue = document.getElementById('infiniteZoomRotationValue');
        if (infiniteZoomRotationSlider && infiniteZoomRotationValue) {
            infiniteZoomRotationSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                infiniteZoomRotationValue.textContent = value.toFixed(1);
                if (this.infiniteZoom) {
                    this.infiniteZoom.rotationSpeed = value;
                    this.infiniteZoom.baseRotationSpeed = value;
                }
            });
        }
        
        // Infinite Zoom opacity slider
        const infiniteZoomOpacitySlider = document.getElementById('infiniteZoomOpacitySlider');
        const infiniteZoomOpacityValue = document.getElementById('infiniteZoomOpacityValue');
        if (infiniteZoomOpacitySlider && infiniteZoomOpacityValue) {
            infiniteZoomOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomOpacityValue.textContent = value + '%';
                if (this.infiniteZoom) {
                    this.infiniteZoom.opacity = value / 100;
                }
            });
        }
        
        // Infinite Zoom sensitivity slider
        const infiniteZoomSensitivitySlider = document.getElementById('infiniteZoomSensitivitySlider');
        const infiniteZoomSensitivityValue = document.getElementById('infiniteZoomSensitivityValue');
        if (infiniteZoomSensitivitySlider && infiniteZoomSensitivityValue) {
            infiniteZoomSensitivitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomSensitivityValue.textContent = value + '%';
                if (this.infiniteZoom) {
                    this.infiniteZoom.sensitivity = value / 100; // Convert 0-100 to 0-1
                }
            });
        }
        
        // Infinite Zoom Beat React button
        const infiniteZoomBeatReactBtn = document.getElementById('infiniteZoomBeatReactBtn');
        if (infiniteZoomBeatReactBtn) {
            infiniteZoomBeatReactBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatReact = !this.infiniteZoom.beatReact;
                    infiniteZoomBeatReactBtn.textContent = `Beat React: ${this.infiniteZoom.beatReact ? 'On' : 'Off'}`;
                    infiniteZoomBeatReactBtn.classList.toggle('active', this.infiniteZoom.beatReact);
                    
                    // Show/hide beat reaction controls
                    const controls = document.getElementById('infiniteZoomBeatReactControls');
                    if (controls) {
                        controls.style.display = this.infiniteZoom.beatReact ? 'block' : 'none';
                    }
                    
                    // When enabling Beat React, turn on all individual controls by default
                    if (this.infiniteZoom.beatReact) {
                        this.infiniteZoom.beatZoom = true;
                        this.infiniteZoom.beatRotation = true;
                        this.infiniteZoom.beatDensity = true;
                        this.infiniteZoom.beatShape = true;
                        
                        // Update button states
                        const beatZoomBtn = document.getElementById('infiniteZoomBeatZoomBtn');
                        const beatRotationBtn = document.getElementById('infiniteZoomBeatRotationBtn');
                        const beatDensityBtn = document.getElementById('infiniteZoomBeatDensityBtn');
                        const beatShapeBtn = document.getElementById('infiniteZoomBeatShapeBtn');
                        
                        if (beatZoomBtn) {
                            beatZoomBtn.textContent = 'Beat Zoom: On';
                            beatZoomBtn.classList.add('active');
                        }
                        if (beatRotationBtn) {
                            beatRotationBtn.textContent = 'Beat Rotation: On';
                            beatRotationBtn.classList.add('active');
                        }
                        if (beatDensityBtn) {
                            beatDensityBtn.textContent = 'Beat Density: On';
                            beatDensityBtn.classList.add('active');
                        }
                        if (beatShapeBtn) {
                            beatShapeBtn.textContent = 'Beat Shape: On';
                            beatShapeBtn.classList.add('active');
                        }
                    } else {
                        // When disabling Beat React, turn off all individual controls
                        this.infiniteZoom.beatZoom = false;
                        this.infiniteZoom.beatRotation = false;
                        this.infiniteZoom.beatDensity = false;
                        this.infiniteZoom.beatShape = false;
                    }
                    
                }
            });
        }
        
        // Beat reaction control buttons
        const infiniteZoomBeatZoomBtn = document.getElementById('infiniteZoomBeatZoomBtn');
        if (infiniteZoomBeatZoomBtn) {
            infiniteZoomBeatZoomBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatZoom = !this.infiniteZoom.beatZoom;
                    infiniteZoomBeatZoomBtn.textContent = `Beat Zoom: ${this.infiniteZoom.beatZoom ? 'On' : 'Off'}`;
                    infiniteZoomBeatZoomBtn.classList.toggle('active', this.infiniteZoom.beatZoom);
                }
            });
        }
        
        const infiniteZoomBeatRotationBtn = document.getElementById('infiniteZoomBeatRotationBtn');
        if (infiniteZoomBeatRotationBtn) {
            infiniteZoomBeatRotationBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatRotation = !this.infiniteZoom.beatRotation;
                    infiniteZoomBeatRotationBtn.textContent = `Beat Rotation: ${this.infiniteZoom.beatRotation ? 'On' : 'Off'}`;
                    infiniteZoomBeatRotationBtn.classList.toggle('active', this.infiniteZoom.beatRotation);
                }
            });
        }
        
        const infiniteZoomBeatDensityBtn = document.getElementById('infiniteZoomBeatDensityBtn');
        if (infiniteZoomBeatDensityBtn) {
            infiniteZoomBeatDensityBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatDensity = !this.infiniteZoom.beatDensity;
                    infiniteZoomBeatDensityBtn.textContent = `Beat Density: ${this.infiniteZoom.beatDensity ? 'On' : 'Off'}`;
                    infiniteZoomBeatDensityBtn.classList.toggle('active', this.infiniteZoom.beatDensity);
                }
            });
        }
        
        const infiniteZoomBeatShapeBtn = document.getElementById('infiniteZoomBeatShapeBtn');
        if (infiniteZoomBeatShapeBtn) {
            infiniteZoomBeatShapeBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatShape = !this.infiniteZoom.beatShape;
                    infiniteZoomBeatShapeBtn.textContent = `Beat Shape: ${this.infiniteZoom.beatShape ? 'On' : 'Off'}`;
                    infiniteZoomBeatShapeBtn.classList.toggle('active', this.infiniteZoom.beatShape);
                }
            });
        }

        // Header Infinite Zoom controls - connect all remaining sliders and buttons
        const headerInfiniteZoomMinSizeSlider = document.getElementById('headerInfiniteZoomMinSizeSlider');
        const headerInfiniteZoomMinSizeValue = document.getElementById('headerInfiniteZoomMinSizeValue');
        if (headerInfiniteZoomMinSizeSlider && headerInfiniteZoomMinSizeValue) {
            headerInfiniteZoomMinSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomMinSizeValue.textContent = value;
                if (this.infiniteZoom) {
                    this.infiniteZoom.minSize = value;
                    // Update existing objects with new size range
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.infiniteZoom.minSize + Math.random() * (this.infiniteZoom.maxSize - this.infiniteZoom.minSize);
                    });
                }
                
                // Update mixer slider
                if (window.multiDisplayManager && window.multiDisplayManager.updateMixerInfiniteZoomMinSizeSlider) {
                    window.multiDisplayManager.updateMixerInfiniteZoomMinSizeSlider();
                }
            });
        }

        const headerInfiniteZoomMaxSizeSlider = document.getElementById('headerInfiniteZoomMaxSizeSlider');
        const headerInfiniteZoomMaxSizeValue = document.getElementById('headerInfiniteZoomMaxSizeValue');
        if (headerInfiniteZoomMaxSizeSlider && headerInfiniteZoomMaxSizeValue) {
            headerInfiniteZoomMaxSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomMaxSizeValue.textContent = value;
                if (this.infiniteZoom) {
                    this.infiniteZoom.maxSize = value;
                    // Update existing objects with new size range
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.infiniteZoom.minSize + Math.random() * (this.infiniteZoom.maxSize - this.infiniteZoom.minSize);
                    });
                }
                
                // Update mixer slider
                if (window.multiDisplayManager && window.multiDisplayManager.updateMixerInfiniteZoomMaxSizeSlider) {
                    window.multiDisplayManager.updateMixerInfiniteZoomMaxSizeSlider();
                }
            });
        }

        const headerInfiniteZoomDensitySlider = document.getElementById('headerInfiniteZoomDensitySlider');
        const headerInfiniteZoomDensityValue = document.getElementById('headerInfiniteZoomDensityValue');
        if (headerInfiniteZoomDensitySlider && headerInfiniteZoomDensityValue) {
            headerInfiniteZoomDensitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomDensityValue.textContent = value;
                if (this.infiniteZoom) {
                    // Calculate density based on screen area
                    const screenArea = this.infiniteZoom.canvas ? 
                        this.infiniteZoom.canvas.width * this.infiniteZoom.canvas.height : 800 * 600;
                    const maxDensity = Math.floor(screenArea / 100); // 1 object per 100 pixels for max density
                    this.infiniteZoom.density = Math.floor((value / 100) * maxDensity);
                    // Regenerate objects if active
                    if (this.infiniteZoom.isActive) {
                        this.infiniteZoom.generateInitialObjects();
                    }
                }
                
                // Update mixer slider
                if (window.multiDisplayManager && window.multiDisplayManager.updateMixerInfiniteZoomDensitySlider) {
                    window.multiDisplayManager.updateMixerInfiniteZoomDensitySlider();
                }
            });
        }

        const headerInfiniteZoomSpeedSlider = document.getElementById('headerInfiniteZoomSpeedSlider');
        const headerInfiniteZoomSpeedValue = document.getElementById('headerInfiniteZoomSpeedValue');
        if (headerInfiniteZoomSpeedSlider && headerInfiniteZoomSpeedValue) {
            headerInfiniteZoomSpeedSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomSpeedValue.textContent = value;
                if (this.infiniteZoom) {
                    // Convert -100 to 100 range to zoom speed
                    // 0 = no movement, 50 = normal speed, 100 = very fast, -100 = very fast reverse
                    if (value === 0) {
                        this.infiniteZoom.zoomSpeed = 0;
                        this.infiniteZoom.baseZoomSpeed = 0;
                    } else {
                        // Convert to actual zoom speed: -100 to 100 becomes -0.1 to 0.1
                        const newSpeed = (value / 100) * 0.1;
                        this.infiniteZoom.zoomSpeed = newSpeed;
                        this.infiniteZoom.baseZoomSpeed = newSpeed;
                    }
                }
                
                // Update mixer slider
                if (window.multiDisplayManager && window.multiDisplayManager.updateMixerInfiniteZoomSpeedSlider) {
                    window.multiDisplayManager.updateMixerInfiniteZoomSpeedSlider();
                }
            });
        } else {
            console.error('Speed slider or value element not found!');
        }

        const headerInfiniteZoomRotationSlider = document.getElementById('headerInfiniteZoomRotationSlider');
        const headerInfiniteZoomRotationValue = document.getElementById('headerInfiniteZoomRotationValue');
        if (headerInfiniteZoomRotationSlider && headerInfiniteZoomRotationValue) {
            headerInfiniteZoomRotationSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                headerInfiniteZoomRotationValue.textContent = value.toFixed(1);
                if (this.infiniteZoom) {
                    this.infiniteZoom.rotationSpeed = value;
                    this.infiniteZoom.baseRotationSpeed = value;
                }
                
                // Update mixer slider
                if (window.multiDisplayManager && window.multiDisplayManager.updateMixerInfiniteZoomRotationSlider) {
                    window.multiDisplayManager.updateMixerInfiniteZoomRotationSlider();
                }
            });
        } else {
            console.error('Rotation slider or value element not found!');
        }

        const headerInfiniteZoomOpacitySlider = document.getElementById('headerInfiniteZoomOpacitySlider');
        const headerInfiniteZoomOpacityValue = document.getElementById('headerInfiniteZoomOpacityValue');
        if (headerInfiniteZoomOpacitySlider && headerInfiniteZoomOpacityValue) {
            headerInfiniteZoomOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomOpacityValue.textContent = value + '%';
                if (this.infiniteZoom) {
                    this.infiniteZoom.opacity = value / 100;
                    // Update existing objects with new opacity
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.alpha = this.infiniteZoom.opacity;
                    });
                }
            });
        } else {
            console.error('Opacity slider or value element not found!');
        }

        const headerInfiniteZoomBeatReactBtn = document.getElementById('headerInfiniteZoomBeatReactBtn');
        if (headerInfiniteZoomBeatReactBtn) {
            headerInfiniteZoomBeatReactBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatReact = !this.infiniteZoom.beatReact;
                    headerInfiniteZoomBeatReactBtn.textContent = `Beat React: ${this.infiniteZoom.beatReact ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatReactBtn.classList.toggle('active', this.infiniteZoom.beatReact);
                    
                    // Show/hide beat reaction controls
                    const controls = document.getElementById('headerInfiniteZoomBeatReactControls');
                    if (controls) {
                        controls.style.display = this.infiniteZoom.beatReact ? 'block' : 'none';
                    }
                }
            });
        }

        const headerInfiniteZoomSensitivitySlider = document.getElementById('headerInfiniteZoomSensitivitySlider');
        const headerInfiniteZoomSensitivityValue = document.getElementById('headerInfiniteZoomSensitivityValue');
        if (headerInfiniteZoomSensitivitySlider && headerInfiniteZoomSensitivityValue) {
            headerInfiniteZoomSensitivitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomSensitivityValue.textContent = value + '%';
                if (this.infiniteZoom) {
                    this.infiniteZoom.sensitivity = value / 100;
                    // Update beat detection threshold
                    this.infiniteZoom.beatThreshold = 0.1 + (this.infiniteZoom.sensitivity * 0.4);
                }
            });
        }

        const headerInfiniteZoomBeatZoomBtn = document.getElementById('headerInfiniteZoomBeatZoomBtn');
        if (headerInfiniteZoomBeatZoomBtn) {
            headerInfiniteZoomBeatZoomBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatZoom = !this.infiniteZoom.beatZoom;
                    headerInfiniteZoomBeatZoomBtn.textContent = `Beat Zoom: ${this.infiniteZoom.beatZoom ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatZoomBtn.classList.toggle('active', this.infiniteZoom.beatZoom);
                }
            });
        }

        const headerInfiniteZoomBeatRotationBtn = document.getElementById('headerInfiniteZoomBeatRotationBtn');
        if (headerInfiniteZoomBeatRotationBtn) {
            headerInfiniteZoomBeatRotationBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatRotation = !this.infiniteZoom.beatRotation;
                    headerInfiniteZoomBeatRotationBtn.textContent = `Beat Rotation: ${this.infiniteZoom.beatRotation ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatRotationBtn.classList.toggle('active', this.infiniteZoom.beatRotation);
                }
            });
        }

        const headerInfiniteZoomBeatDensityBtn = document.getElementById('headerInfiniteZoomBeatDensityBtn');
        if (headerInfiniteZoomBeatDensityBtn) {
            headerInfiniteZoomBeatDensityBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatDensity = !this.infiniteZoom.beatDensity;
                    headerInfiniteZoomBeatDensityBtn.textContent = `Beat Density: ${this.infiniteZoom.beatDensity ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatDensityBtn.classList.toggle('active', this.infiniteZoom.beatDensity);
                }
            });
        }

        const headerInfiniteZoomBeatShapeBtn = document.getElementById('headerInfiniteZoomBeatShapeBtn');
        if (headerInfiniteZoomBeatShapeBtn) {
            headerInfiniteZoomBeatShapeBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatShape = !this.infiniteZoom.beatShape;
                    headerInfiniteZoomBeatShapeBtn.textContent = `Beat Shape: ${this.infiniteZoom.beatShape ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatShapeBtn.classList.toggle('active', this.infiniteZoom.beatShape);
                }
            });
        }

        const kaleidoscopeSettingsBtn = document.getElementById('kaleidoscopeSettingsBtn');
        // Sidebar kaleidoscope panel controls removed - functionality moved to header

        const headerKaleidoscopeCloseBtn = document.getElementById('headerKaleidoscopeCloseBtn');
        if (headerKaleidoscopeCloseBtn) {
            headerKaleidoscopeCloseBtn.addEventListener('click', () => {
                document.getElementById('headerKaleidoscopePanel').style.display = 'none';
            });
        }

        const headerInfiniteZoomCloseBtn = document.getElementById('headerInfiniteZoomCloseBtn');
        if (headerInfiniteZoomCloseBtn) {
            headerInfiniteZoomCloseBtn.addEventListener('click', () => {
                document.getElementById('headerInfiniteZoomPanel').style.display = 'none';
            });
        }

        // Header Fluid Dynamics close button
        const headerFluidDynamicsCloseBtn = document.getElementById('headerFluidDynamicsCloseBtn');
        if (headerFluidDynamicsCloseBtn) {
            headerFluidDynamicsCloseBtn.addEventListener('click', () => {
                document.getElementById('headerFluidDynamicsPanel').style.display = 'none';
                // Don't remove active class - it should reflect the actual state, not panel visibility
            });
        }

        // Header AM Visualizer close button
        const headerVisualizerCloseBtn = document.getElementById('headerVisualizerCloseBtn');
        if (headerVisualizerCloseBtn) {
            headerVisualizerCloseBtn.addEventListener('click', () => {
                document.getElementById('headerVisualizerPanel').style.display = 'none';
                document.getElementById('footerVisualizerBtn').classList.remove('active');
            });
        }

        // Fluid Dynamics Viscosity slider
        const fluidDynamicsViscositySlider = document.getElementById('headerFluidDynamicsViscositySlider');
        const fluidDynamicsViscosityValue = document.getElementById('headerFluidDynamicsViscosityValue');
        if (fluidDynamicsViscositySlider && fluidDynamicsViscosityValue) {
            fluidDynamicsViscositySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                fluidDynamicsViscosityValue.textContent = value.toFixed(1);
                if (this.fluidDynamics && this.fluidDynamics.updateConfig) {
                    this.fluidDynamics.updateConfig({ VELOCITY_DISSIPATION: value });
                } else {
                    console.warn('🌊 Cannot update fluid config - object or method missing');
                }
            });
        }

        // Fluid Dynamics Pressure slider
        const fluidDynamicsPressureSlider = document.getElementById('headerFluidDynamicsPressureSlider');
        const fluidDynamicsPressureValue = document.getElementById('headerFluidDynamicsPressureValue');
        if (fluidDynamicsPressureSlider && fluidDynamicsPressureValue) {
            fluidDynamicsPressureSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                fluidDynamicsPressureValue.textContent = value.toFixed(1);
                if (this.fluidDynamics && this.fluidDynamics.updateConfig) {
                    this.fluidDynamics.updateConfig({ PRESSURE: value });
                }
            });
        }

        // Fluid Dynamics Curl slider
        const fluidDynamicsCurlSlider = document.getElementById('headerFluidDynamicsCurlSlider');
        const fluidDynamicsCurlValue = document.getElementById('headerFluidDynamicsCurlValue');
        if (fluidDynamicsCurlSlider && fluidDynamicsCurlValue) {
            fluidDynamicsCurlSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                fluidDynamicsCurlValue.textContent = value;
                if (this.fluidDynamics && this.fluidDynamics.updateConfig) {
                    this.fluidDynamics.updateConfig({ CURL: value });
                }
            });
        }

        // Fluid Dynamics Splat Force slider
        const fluidDynamicsSplatForceSlider = document.getElementById('headerFluidDynamicsSplatForceSlider');
        const fluidDynamicsSplatForceValue = document.getElementById('headerFluidDynamicsSplatForceValue');
        if (fluidDynamicsSplatForceSlider && fluidDynamicsSplatForceValue) {
            fluidDynamicsSplatForceSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                fluidDynamicsSplatForceValue.textContent = value;
                if (this.fluidDynamics && this.fluidDynamics.updateConfig) {
                    this.fluidDynamics.updateConfig({ SPLAT_FORCE: value });
                }
            });
        }

        // Preset Buttons
        const fluidDynamicsDefaultPresetBtn = document.getElementById('headerFluidDynamicsDefaultPresetBtn');
        if (fluidDynamicsDefaultPresetBtn) {
            fluidDynamicsDefaultPresetBtn.addEventListener('click', () => {
                if (this.fluidDynamics && this.applyFluidDynamicsDefaultPreset) {
                    this.applyFluidDynamicsDefaultPreset();
                }
            });
        }

        const fluidDynamicsAmbientPresetBtn = document.getElementById('headerFluidDynamicsAmbientPresetBtn');
        if (fluidDynamicsAmbientPresetBtn) {
            fluidDynamicsAmbientPresetBtn.addEventListener('click', () => {
                if (this.fluidDynamics && this.applyFluidDynamicsAmbientPreset) {
                    this.applyFluidDynamicsAmbientPreset();
                }
            });
        }

        const fluidDynamicsMetalPresetBtn = document.getElementById('headerFluidDynamicsMetalPresetBtn');
        if (fluidDynamicsMetalPresetBtn) {
            fluidDynamicsMetalPresetBtn.addEventListener('click', () => {
                if (this.fluidDynamics && this.applyFluidDynamicsMetalPreset) {
                    this.applyFluidDynamicsMetalPreset();
                }
            });
        }

        const fluidDynamicsRandomPresetBtn = document.getElementById('headerFluidDynamicsRandomPresetBtn');
        if (fluidDynamicsRandomPresetBtn) {
            fluidDynamicsRandomPresetBtn.addEventListener('click', () => {
                if (this.fluidDynamics && this.applyFluidDynamicsRandomPreset) {
                    this.applyFluidDynamicsRandomPreset();
                }
            });
        }

        // Preset Management
        const fluidDynamicsSavePresetBtn = document.getElementById('headerFluidDynamicsSavePresetBtn');
        if (fluidDynamicsSavePresetBtn) {
            fluidDynamicsSavePresetBtn.addEventListener('click', () => {
                if (this.saveCurrentFluidPreset) {
                    this.saveCurrentFluidPreset();
                }
            });
        }

        const fluidDynamicsPresetSelector = document.getElementById('headerFluidDynamicsPresetSelector');
        if (fluidDynamicsPresetSelector) {
            fluidDynamicsPresetSelector.addEventListener('change', (e) => {
                if (e.target.value !== '' && this.loadFluidPreset) {
                    this.loadFluidPreset(parseInt(e.target.value));
                    e.target.value = ''; // Reset to "Load Preset..."
                    
                    // Update mixer UI
                    if (window.multiDisplayManager && window.multiDisplayManager.updateMixerFluidityPresetSelector) {
                        window.multiDisplayManager.updateMixerFluidityPresetSelector();
                    }
                }
            });
        }

        const fluidDynamicsExportPresetsBtn = document.getElementById('headerFluidDynamicsExportPresetsBtn');
        if (fluidDynamicsExportPresetsBtn) {
            fluidDynamicsExportPresetsBtn.addEventListener('click', () => {
                if (this.exportFluidPresets) {
                    this.exportFluidPresets();
                }
            });
        }

        const fluidDynamicsImportPresetsBtn = document.getElementById('headerFluidDynamicsImportPresetsBtn');
        if (fluidDynamicsImportPresetsBtn) {
            fluidDynamicsImportPresetsBtn.addEventListener('click', () => {
                document.getElementById('headerFluidDynamicsImportFile').click();
            });
        }

        const fluidDynamicsImportFile = document.getElementById('headerFluidDynamicsImportFile');
        if (fluidDynamicsImportFile) {
            fluidDynamicsImportFile.addEventListener('change', (e) => {
                if (e.target.files.length > 0 && this.importFluidPresets) {
                    this.importFluidPresets(e.target.files[0]);
                    e.target.value = ''; // Reset file input
                }
            });
        }

        // Color Scheme Selector
        const fluidDynamicsColorScheme = document.getElementById('headerFluidDynamicsColorScheme');
        if (fluidDynamicsColorScheme) {
            fluidDynamicsColorScheme.addEventListener('change', (e) => {
                const scheme = e.target.value;
                if (this.fluidDynamics && this.fluidDynamics.setColorScheme) {
                    this.fluidDynamics.setColorScheme(scheme);
                    
                    // Update mixer UI
                    if (window.multiDisplayManager && window.multiDisplayManager.updateMixerFluidityColorSchemeSelect) {
                        window.multiDisplayManager.updateMixerFluidityColorSchemeSelect();
                    }
                }
            });
        }

        // Energy Sensitivity Slider
        const fluidDynamicsEnergySensitivitySlider = document.getElementById('headerFluidDynamicsEnergySensitivitySlider');
        const fluidDynamicsEnergySensitivityValue = document.getElementById('headerFluidDynamicsEnergySensitivityValue');
        if (fluidDynamicsEnergySensitivitySlider && fluidDynamicsEnergySensitivityValue) {
            fluidDynamicsEnergySensitivitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                fluidDynamicsEnergySensitivityValue.textContent = value.toFixed(1);
                if (this.fluidDynamics && this.fluidDynamics.updateEnergyPhysicsConfig) {
                    this.fluidDynamics.updateEnergyPhysicsConfig({ energySensitivity: value });
                }
            });
        }

        // Viscosity Response Slider
        const fluidDynamicsViscosityResponseSlider = document.getElementById('headerFluidDynamicsViscosityResponseSlider');
        const fluidDynamicsViscosityResponseValue = document.getElementById('headerFluidDynamicsViscosityResponseValue');
        if (fluidDynamicsViscosityResponseSlider && fluidDynamicsViscosityResponseValue) {
            fluidDynamicsViscosityResponseSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                fluidDynamicsViscosityResponseValue.textContent = value.toFixed(1);
                if (this.fluidDynamics && this.fluidDynamics.updateEnergyPhysicsConfig) {
                    this.fluidDynamics.updateEnergyPhysicsConfig({ viscosityResponse: value });
                }
            });
        }

        // Curl Response Slider
        const fluidDynamicsCurlResponseSlider = document.getElementById('headerFluidDynamicsCurlResponseSlider');
        const fluidDynamicsCurlResponseValue = document.getElementById('headerFluidDynamicsCurlResponseValue');
        if (fluidDynamicsCurlResponseSlider && fluidDynamicsCurlResponseValue) {
            fluidDynamicsCurlResponseSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                fluidDynamicsCurlResponseValue.textContent = value.toFixed(1);
                if (this.fluidDynamics && this.fluidDynamics.updateEnergyPhysicsConfig) {
                    this.fluidDynamics.updateEnergyPhysicsConfig({ curlResponse: value });
                }
            });
        }

        // Pressure Response Slider
        const fluidDynamicsPressureResponseSlider = document.getElementById('headerFluidDynamicsPressureResponseSlider');
        const fluidDynamicsPressureResponseValue = document.getElementById('headerFluidDynamicsPressureResponseValue');
        if (fluidDynamicsPressureResponseSlider && fluidDynamicsPressureResponseValue) {
            fluidDynamicsPressureResponseSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                fluidDynamicsPressureResponseValue.textContent = value.toFixed(1);
                if (this.fluidDynamics && this.fluidDynamics.updateEnergyPhysicsConfig) {
                    this.fluidDynamics.updateEnergyPhysicsConfig({ pressureResponse: value });
                }
            });
        }

        // Opacity Slider
        const fluidDynamicsOpacitySlider = document.getElementById('headerFluidDynamicsOpacitySlider');
        const fluidDynamicsOpacityValue = document.getElementById('headerFluidDynamicsOpacityValue');
        if (fluidDynamicsOpacitySlider && fluidDynamicsOpacityValue) {
            fluidDynamicsOpacitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                fluidDynamicsOpacityValue.textContent = value.toFixed(1);
                if (this.fluidDynamics && this.fluidDynamics.setOpacity) {
                    this.fluidDynamics.setOpacity(value);
                    // Update mixer UI
                    if (window.multiDisplayManager && window.multiDisplayManager.updateMixerFluidityOpacitySlider) {
                        window.multiDisplayManager.updateMixerFluidityOpacitySlider();
                    }
                }
            });
        }

        // Saturation Slider
        const fluidDynamicsSaturationSlider = document.getElementById('headerFluidDynamicsSaturationSlider');
        const fluidDynamicsSaturationValue = document.getElementById('headerFluidDynamicsSaturationValue');
        if (fluidDynamicsSaturationSlider && fluidDynamicsSaturationValue) {
            fluidDynamicsSaturationSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                fluidDynamicsSaturationValue.textContent = value.toFixed(1);
                if (this.fluidDynamics && this.fluidDynamics.setSaturation) {
                    this.fluidDynamics.setSaturation(value);
                }
            });
        }

        // Beat React Toggle
            // Speed Slider
            const fluidDynamicsSpeedSlider = document.getElementById('headerFluidDynamicsSpeedSlider');
            const fluidDynamicsSpeedValue = document.getElementById('headerFluidDynamicsSpeedValue');
            if (fluidDynamicsSpeedSlider && fluidDynamicsSpeedValue) {
                fluidDynamicsSpeedSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    fluidDynamicsSpeedValue.textContent = value.toFixed(1);
                    if (this.fluidDynamics && this.fluidDynamics.setSpeed) {
                        this.fluidDynamics.setSpeed(value);
                    }
                });
            }

            const fluidDynamicsBeatReactBtn = document.getElementById('headerFluidDynamicsBeatReactBtn');
            if (fluidDynamicsBeatReactBtn) {
                fluidDynamicsBeatReactBtn.addEventListener('click', () => {
                    if (this.fluidDynamics) {
                        const newValue = !this.fluidDynamics.beatReactEnabled;
                        this.fluidDynamics.setBeatReact(newValue);
                        fluidDynamicsBeatReactBtn.textContent = `Beat React: ${newValue ? 'On' : 'Off'}`;
                        fluidDynamicsBeatReactBtn.classList.toggle('active', newValue);
                    }
            });
        }

        // Beat rotation toggle
        const beatRotationBtn = document.getElementById('headerKaleidoscopeBeatRotationBtn');
        if (beatRotationBtn) {
            beatRotationBtn.addEventListener('click', () => {
                this.kaleidoscopeBeatRotation = !this.kaleidoscopeBeatRotation;
                beatRotationBtn.textContent = `Rotation: ${
                    this.kaleidoscopeBeatRotation ? 'On' : 'Off'
                }`;
                beatRotationBtn.classList.toggle('active', this.kaleidoscopeBeatRotation);
            });
        }

        // Beat shape toggle
        const beatShapeBtn = document.getElementById('headerKaleidoscopeBeatShapeBtn');
        if (beatShapeBtn) {
            beatShapeBtn.addEventListener('click', () => {
                this.kaleidoscopeBeatShape = !this.kaleidoscopeBeatShape;
                beatShapeBtn.textContent = `Shape: ${
                    this.kaleidoscopeBeatShape ? 'On' : 'Off'
                }`;
                beatShapeBtn.classList.toggle('active', this.kaleidoscopeBeatShape);

                // Store current shape as original
                if (this.kaleidoscopeBeatShape) {
                    this.kaleidoscopeOriginalShape = this.kaleidoscopeShape;
                }
            });
        }

        // Kaleidoscope sliders
        const kaleidoscopeSegments = document.getElementById('kaleidoscopeSegments');
        if (kaleidoscopeSegments) {
            kaleidoscopeSegments.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeSegments(value);
                document.getElementById('kaleidoscopeSegmentsValue').textContent = value;
            });
        }

        // Header Kaleidoscope sliders
        const headerKaleidoscopeSegments = document.getElementById('headerKaleidoscopeSegments');
        if (headerKaleidoscopeSegments) {
            headerKaleidoscopeSegments.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeSegments(value);
                document.getElementById('headerKaleidoscopeSegmentsValue').textContent = value;
            });
        }

        const kaleidoscopeSpeed = document.getElementById('kaleidoscopeSpeed');
        if (kaleidoscopeSpeed) {
            kaleidoscopeSpeed.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setKaleidoscopeSpeed(value);
                document.getElementById('kaleidoscopeSpeedValue').textContent = value;
            });
        }

        const headerKaleidoscopeSpeed = document.getElementById('headerKaleidoscopeSpeed');
        if (headerKaleidoscopeSpeed) {
            headerKaleidoscopeSpeed.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setKaleidoscopeSpeed(value);
                document.getElementById('headerKaleidoscopeSpeedValue').textContent = value;
            });
        }

        const kaleidoscopeScale = document.getElementById('kaleidoscopeScale');
        if (kaleidoscopeScale) {
            kaleidoscopeScale.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeScale(value);
                document.getElementById('kaleidoscopeScaleValue').textContent = `${value}%`;
            });
        }

        const headerKaleidoscopeScale = document.getElementById('headerKaleidoscopeScale');
        if (headerKaleidoscopeScale) {
            headerKaleidoscopeScale.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeScale(value);
                document.getElementById('headerKaleidoscopeScaleValue').textContent = `${value}%`;
            });
        }

        const kaleidoscopeCenterX = document.getElementById('kaleidoscopeCenterX');
        if (kaleidoscopeCenterX) {
            kaleidoscopeCenterX.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeCenterX(value);
                document.getElementById('kaleidoscopeCenterXValue').textContent = `${value}%`;
            });
        }

        const headerKaleidoscopeCenterX = document.getElementById('headerKaleidoscopeCenterX');
        if (headerKaleidoscopeCenterX) {
            headerKaleidoscopeCenterX.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeCenterX(value);
                document.getElementById('headerKaleidoscopeCenterXValue').textContent = `${value}%`;
            });
        }

        // Beat reactive toggle
        // Beat reactive toggle
        const kaleidoscopeBeatBtn = document.getElementById('headerKaleidoscopeBeatBtn');
        if (kaleidoscopeBeatBtn) {
            kaleidoscopeBeatBtn.addEventListener('click', () => {
                this.kaleidoscopeBeatReactive = !this.kaleidoscopeBeatReactive;
                kaleidoscopeBeatBtn.textContent = `Beat React: ${
                    this.kaleidoscopeBeatReactive ? 'On' : 'Off'
                }`;
                kaleidoscopeBeatBtn.classList.toggle('active', this.kaleidoscopeBeatReactive);

                const sensitivityContainer = document.getElementById('headerBeatSensitivityContainer');
                if (sensitivityContainer) {
                    sensitivityContainer.style.display = this.kaleidoscopeBeatReactive ? 'block' : 'none';
                }

                // Store base values when enabling
                if (this.kaleidoscopeBeatReactive) { // Reset scale to max 300% if it's higher
                    if (this.kaleidoscopeScale > 3) {
                        this.kaleidoscopeScale = 3;
                        // Update slider and display
                        const scaleSlider = document.getElementById('kaleidoscopeScale');
                        const scaleValue = document.getElementById('kaleidoscopeScaleValue');
                        if (scaleSlider && scaleValue) {
                            scaleSlider.value = 300;
                            scaleValue.textContent = '300%';
                        }
                    }
                    this.kaleidoscopeBaseScale = this.kaleidoscopeScale;
                    this.kaleidoscopeBaseSegments = this.kaleidoscopeSegments;
                }
            });
        }

        // Beat sensitivity
        const beatSensitivitySlider = document.getElementById('headerKaleidoscopeBeatSensitivity');
        if (beatSensitivitySlider) {
            beatSensitivitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeBeatSensitivity = value / 100;
                document.getElementById('headerKaleidoscopeBeatSensitivityValue').textContent = `${value}%`;
            });
        }


        // Kaleidoscope preset buttons - use specific selectors to avoid conflicts with other preset types
        document.querySelectorAll('#headerKaleidoscopePanel .btn-preset[data-preset], #mixerKaleidoscopePresets .btn-preset[data-preset]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetIndex = parseInt(e.target.dataset.preset);
                if (!isNaN(presetIndex) && this.kaleidoscopePresets[presetIndex]) {
                this.applyKaleidoscopePreset(this.kaleidoscopePresets[presetIndex]);
                }
            });
        });

        // Rings control
        const kaleidoscopeRings = document.getElementById('kaleidoscopeRings');
        if (kaleidoscopeRings) {
            kaleidoscopeRings.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeRings = value;
                document.getElementById('kaleidoscopeRingsValue').textContent = value;
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        const headerKaleidoscopeRings = document.getElementById('headerKaleidoscopeRings');
        if (headerKaleidoscopeRings) {
            headerKaleidoscopeRings.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeRings = value;
                document.getElementById('headerKaleidoscopeRingsValue').textContent = value;
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        // Ring spacing control
        const kaleidoscopeRingSpacing = document.getElementById('kaleidoscopeRingSpacing');
        if (kaleidoscopeRingSpacing) {
            kaleidoscopeRingSpacing.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeRingSpacing = value / 100;
                document.getElementById('kaleidoscopeRingSpacingValue').textContent = `${value}%`;
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        const headerKaleidoscopeRingSpacing = document.getElementById('headerKaleidoscopeRingSpacing');
        if (headerKaleidoscopeRingSpacing) {
            headerKaleidoscopeRingSpacing.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeRingSpacing = value / 100;
                document.getElementById('headerKaleidoscopeRingSpacingValue').textContent = `${value}%`;
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        // Shape toggle
        const kaleidoscopeShapeBtn = document.getElementById('kaleidoscopeShapeBtn');
        if (kaleidoscopeShapeBtn) {
            kaleidoscopeShapeBtn.addEventListener('click', () => {
                const shapes = ['triangle', 'petal', 'rectangle'];
                const currentIndex = shapes.indexOf(this.kaleidoscopeShape);
                this.kaleidoscopeShape = shapes[(currentIndex + 1) % shapes.length];
                kaleidoscopeShapeBtn.textContent = `Shape: ${
                    this.kaleidoscopeShape.charAt(0).toUpperCase() + this.kaleidoscopeShape.slice(1)
                }`;
                
                // Update header button too
                const headerBtn = document.getElementById('headerKaleidoscopeShapeBtn');
                if (headerBtn) {
                    headerBtn.textContent = `Shape: ${
                        this.kaleidoscopeShape.charAt(0).toUpperCase() + this.kaleidoscopeShape.slice(1)
                    }`;
                }
                
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        // Header Shape toggle
        const headerKaleidoscopeShapeBtn = document.getElementById('headerKaleidoscopeShapeBtn');
        if (headerKaleidoscopeShapeBtn) {
            headerKaleidoscopeShapeBtn.addEventListener('click', () => {
                const shapes = ['triangle', 'petal', 'rectangle'];
                const currentIndex = shapes.indexOf(this.kaleidoscopeShape);
                this.kaleidoscopeShape = shapes[(currentIndex + 1) % shapes.length];
                headerKaleidoscopeShapeBtn.textContent = `Shape: ${
                    this.kaleidoscopeShape.charAt(0).toUpperCase() + this.kaleidoscopeShape.slice(1)
                }`;
                
                // Update sidebar button too
                const sidebarBtn = document.getElementById('kaleidoscopeShapeBtn');
                if (sidebarBtn) {
                    sidebarBtn.textContent = `Shape: ${
                        this.kaleidoscopeShape.charAt(0).toUpperCase() + this.kaleidoscopeShape.slice(1)
                    }`;
                }
                
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        const kaleidoscopeCenterY = document.getElementById('kaleidoscopeCenterY');
        if (kaleidoscopeCenterY) {
            kaleidoscopeCenterY.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeCenterY(value);
                document.getElementById('kaleidoscopeCenterYValue').textContent = `${value}%`;
            });
        }

        const headerKaleidoscopeCenterY = document.getElementById('headerKaleidoscopeCenterY');
        if (headerKaleidoscopeCenterY) {
            headerKaleidoscopeCenterY.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeCenterY(value);
                document.getElementById('headerKaleidoscopeCenterYValue').textContent = `${value}%`;
            });
        }

        // Toggle buttons for applying to video/viz
        const kaleidoscopeVideoBtn = document.getElementById('kaleidoscopeVideoBtn');
        if (kaleidoscopeVideoBtn) {
            // Set initial state
            kaleidoscopeVideoBtn.textContent = `Apply to Video: ${
                this.kaleidoscopeApplyToVideo ? 'On' : 'Off'
            }`;
            kaleidoscopeVideoBtn.classList.toggle('active', this.kaleidoscopeApplyToVideo);
            
            kaleidoscopeVideoBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToVideo = !this.kaleidoscopeApplyToVideo;
                kaleidoscopeVideoBtn.textContent = `Apply to Video: ${
                    this.kaleidoscopeApplyToVideo ? 'On' : 'Off'
                }`;
                kaleidoscopeVideoBtn.classList.toggle('active', this.kaleidoscopeApplyToVideo);

                // Enable kaleidoscope if turning on
                if (this.kaleidoscopeApplyToVideo) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope(); // Make sure it's initialized
                        this.startKaleidoscopeAnimation();
                    }

                    // Force immediate redraw
                    this.applyKaleidoscopeEffect();
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToInfiniteZoom) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Sidebar kaleidoscope button removed - functionality moved to header
            });
        }

        const kaleidoscopeVizBtn = document.getElementById('kaleidoscopeVizBtn');
        if (kaleidoscopeVizBtn) {
            // Set initial state
            kaleidoscopeVizBtn.textContent = `Apply to Viz: ${
                this.kaleidoscopeApplyToViz ? 'On' : 'Off'
            }`;
            kaleidoscopeVizBtn.classList.toggle('active', this.kaleidoscopeApplyToViz);
            
            kaleidoscopeVizBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToViz = !this.kaleidoscopeApplyToViz;
                kaleidoscopeVizBtn.textContent = `Apply to Viz: ${
                    this.kaleidoscopeApplyToViz ? 'On' : 'Off'
                }`;
                kaleidoscopeVizBtn.classList.toggle('active', this.kaleidoscopeApplyToViz);

                // Enable kaleidoscope if turning on, disable if both are off
                if (this.kaleidoscopeApplyToViz) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToVideo && !this.kaleidoscopeApplyToInfiniteZoom) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Sidebar kaleidoscope button removed - functionality moved to header

                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        // Infinite Zoom toggle button
        const kaleidoscopeInfiniteZoomBtn = document.getElementById('kaleidoscopeInfiniteZoomBtn');
        if (kaleidoscopeInfiniteZoomBtn) {
            // Initialize button state
            kaleidoscopeInfiniteZoomBtn.textContent = `Infinite Zoom: ${
                this.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'
            }`;
            kaleidoscopeInfiniteZoomBtn.classList.toggle('active', this.kaleidoscopeApplyToInfiniteZoom);
            
            kaleidoscopeInfiniteZoomBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToInfiniteZoom = !this.kaleidoscopeApplyToInfiniteZoom;
                kaleidoscopeInfiniteZoomBtn.textContent = `Infinite Zoom: ${
                    this.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'
                }`;
                kaleidoscopeInfiniteZoomBtn.classList.toggle('active', this.kaleidoscopeApplyToInfiniteZoom);

                // Enable kaleidoscope if turning on IZ, disable if all are off
                if (this.kaleidoscopeApplyToInfiniteZoom) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToVideo) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Sidebar kaleidoscope button removed - functionality moved to header

                // Apply kaleidoscope effect if enabled
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        // Header Kaleidoscope toggle buttons
        const headerKaleidoscopeVideoBtn = document.getElementById('headerKaleidoscopeVideoBtn');
        if (headerKaleidoscopeVideoBtn) {
            headerKaleidoscopeVideoBtn.textContent = `Apply to Video: ${
                this.kaleidoscopeApplyToVideo ? 'On' : 'Off'
            }`;
            headerKaleidoscopeVideoBtn.classList.toggle('active', this.kaleidoscopeApplyToVideo);
            
            headerKaleidoscopeVideoBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToVideo = !this.kaleidoscopeApplyToVideo;
                headerKaleidoscopeVideoBtn.textContent = `Apply to Video: ${
                    this.kaleidoscopeApplyToVideo ? 'On' : 'Off'
                }`;
                headerKaleidoscopeVideoBtn.classList.toggle('active', this.kaleidoscopeApplyToVideo);
                
                // Update Kaleidoscope button state
                this.updateKaleidoscopeButtonState();

                // Enable kaleidoscope if turning on
                if (this.kaleidoscopeApplyToVideo) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToInfiniteZoom) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Sidebar kaleidoscope button removed - functionality moved to header
            });
        }

        const headerKaleidoscopeVizBtn = document.getElementById('headerKaleidoscopeVizBtn');
        if (headerKaleidoscopeVizBtn) {
            headerKaleidoscopeVizBtn.textContent = `Apply to Viz: ${
                this.kaleidoscopeApplyToViz ? 'On' : 'Off'
            }`;
            headerKaleidoscopeVizBtn.classList.toggle('active', this.kaleidoscopeApplyToViz);
            
            headerKaleidoscopeVizBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToViz = !this.kaleidoscopeApplyToViz;
                headerKaleidoscopeVizBtn.textContent = `Apply to Viz: ${
                    this.kaleidoscopeApplyToViz ? 'On' : 'Off'
                }`;
                headerKaleidoscopeVizBtn.classList.toggle('active', this.kaleidoscopeApplyToViz);
                
                // Update Kaleidoscope button state
                this.updateKaleidoscopeButtonState();

                // Enable kaleidoscope if turning on, disable if both are off
                if (this.kaleidoscopeApplyToViz) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToVideo && !this.kaleidoscopeApplyToInfiniteZoom) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Sidebar kaleidoscope button removed - functionality moved to header
            });
        }

        const headerKaleidoscopeInfiniteZoomBtn = document.getElementById('headerKaleidoscopeInfiniteZoomBtn');
        if (headerKaleidoscopeInfiniteZoomBtn) {
            headerKaleidoscopeInfiniteZoomBtn.textContent = `Infinite Zoom: ${
                this.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'
            }`;
            headerKaleidoscopeInfiniteZoomBtn.classList.toggle('active', this.kaleidoscopeApplyToInfiniteZoom);
            
            headerKaleidoscopeInfiniteZoomBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToInfiniteZoom = !this.kaleidoscopeApplyToInfiniteZoom;
                headerKaleidoscopeInfiniteZoomBtn.textContent = `Infinite Zoom: ${
                    this.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'
                }`;
                headerKaleidoscopeInfiniteZoomBtn.classList.toggle('active', this.kaleidoscopeApplyToInfiniteZoom);
                
                // Update Kaleidoscope button state
                this.updateKaleidoscopeButtonState();

                // Enable kaleidoscope if turning on IZ, disable if all are off
                if (this.kaleidoscopeApplyToInfiniteZoom) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToVideo) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Sidebar kaleidoscope button removed - functionality moved to header
            });
        }

        const headerKaleidoscopeWebGLBtn = document.getElementById('headerKaleidoscopeWebGLBtn');
        if (headerKaleidoscopeWebGLBtn) {
            headerKaleidoscopeWebGLBtn.textContent = `WebGL: ${
                this.kaleidoscopeApplyToWebGL ? 'On' : 'Off'
            }`;
            headerKaleidoscopeWebGLBtn.classList.toggle('active', this.kaleidoscopeApplyToWebGL);
            
            headerKaleidoscopeWebGLBtn.addEventListener('click', () => {
                // Check WebGL support before allowing toggle
                if (this.webglVisualization && !this.webglVisualization.webglSupported) {
                    console.warn('🎮 Kaleidoscope: WebGL not supported - cannot enable WebGL Apply');
                    alert('WebGL not supported. Check Browser settings.');
                    return;
                }
                
                this.kaleidoscopeApplyToWebGL = !this.kaleidoscopeApplyToWebGL;
                headerKaleidoscopeWebGLBtn.textContent = `WebGL: ${
                    this.kaleidoscopeApplyToWebGL ? 'On' : 'Off'
                }`;
                headerKaleidoscopeWebGLBtn.classList.toggle('active', this.kaleidoscopeApplyToWebGL);
                
                // Update Kaleidoscope button state
                this.updateKaleidoscopeButtonState();

                // Enable kaleidoscope if turning on WebGL, disable if all are off
                if (this.kaleidoscopeApplyToWebGL) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToVideo && !this.kaleidoscopeApplyToInfiniteZoom && !this.kaleidoscopeApplyToFluidDynamics) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }
            });
        }

        // Fluid Dynamics Apply Button
        const headerKaleidoscopeFluidBtn = document.getElementById('headerKaleidoscopeFluidBtn');
        if (headerKaleidoscopeFluidBtn) {
            headerKaleidoscopeFluidBtn.textContent = `Fluid: ${
                this.kaleidoscopeApplyToFluidDynamics ? 'On' : 'Off'
            }`;
            headerKaleidoscopeFluidBtn.classList.toggle('active', this.kaleidoscopeApplyToFluidDynamics);
            
            headerKaleidoscopeFluidBtn.addEventListener('click', () => {
                // Check Fluid Dynamics support before allowing toggle
                if (!this.fluidDynamics || !this.fluidDynamics.canvas) {
                    console.warn('🔮 Kaleidoscope: Fluid Dynamics not available - cannot enable Fluid Apply');
                    alert('Fluid Dynamics not available. Please ensure Fluid Dynamics is enabled.');
                    return;
                }
                
                this.kaleidoscopeApplyToFluidDynamics = !this.kaleidoscopeApplyToFluidDynamics;
                headerKaleidoscopeFluidBtn.textContent = `Fluid: ${
                    this.kaleidoscopeApplyToFluidDynamics ? 'On' : 'Off'
                }`;
                headerKaleidoscopeFluidBtn.classList.toggle('active', this.kaleidoscopeApplyToFluidDynamics);
                
                // Update Kaleidoscope button state
                this.updateKaleidoscopeButtonState();

                // Enable kaleidoscope if turning on Fluid, disable if all are off
                if (this.kaleidoscopeApplyToFluidDynamics) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToVideo && !this.kaleidoscopeApplyToInfiniteZoom && !this.kaleidoscopeApplyToWebGL && !this.kaleidoscopeApplyToNebula) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }
            });
        }
        
        // Nebula Apply button
        const headerKaleidoscopeNebulaBtn = document.getElementById('headerKaleidoscopeNebulaBtn');
        if (headerKaleidoscopeNebulaBtn) {
            headerKaleidoscopeNebulaBtn.textContent = `Nebula: ${
                this.kaleidoscopeApplyToNebula ? 'On' : 'Off'
            }`;
            headerKaleidoscopeNebulaBtn.classList.toggle('active', this.kaleidoscopeApplyToNebula);
            
            headerKaleidoscopeNebulaBtn.addEventListener('click', () => {
                // Check Nebula support before allowing toggle (plugin-aware)
                const nebulaCanvas = this.nebulaVisualization?.canvas || 
                                   (window.pluginManager?.plugins.get('nebula')?.canvas);
                if (!nebulaCanvas) {
                    console.warn('🔮 Kaleidoscope: Nebula not available - cannot enable Nebula Apply');
                    alert('Nebula not available. Please ensure Nebula is enabled.');
                    return;
                }
                
                this.kaleidoscopeApplyToNebula = !this.kaleidoscopeApplyToNebula;
                headerKaleidoscopeNebulaBtn.textContent = `Nebula: ${
                    this.kaleidoscopeApplyToNebula ? 'On' : 'Off'
                }`;
                headerKaleidoscopeNebulaBtn.classList.toggle('active', this.kaleidoscopeApplyToNebula);
                
                // Update Kaleidoscope button state
                this.updateKaleidoscopeButtonState();

                // Enable kaleidoscope if turning on Nebula, disable if all are off
                if (this.kaleidoscopeApplyToNebula) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToVideo && !this.kaleidoscopeApplyToInfiniteZoom && !this.kaleidoscopeApplyToWebGL && !this.kaleidoscopeApplyToFluidDynamics) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }
            });
        }

        // Center Animation Controls
        const headerKaleidoscopeAnimateBtn = document.getElementById('headerKaleidoscopeAnimateBtn');
        if (headerKaleidoscopeAnimateBtn) {
            headerKaleidoscopeAnimateBtn.addEventListener('click', () => {
                this.kaleidoscopeCenterAnimate = !this.kaleidoscopeCenterAnimate;
                headerKaleidoscopeAnimateBtn.textContent = `Animate: ${this.kaleidoscopeCenterAnimate ? 'On' : 'Off'}`;
                headerKaleidoscopeAnimateBtn.classList.toggle('active', this.kaleidoscopeCenterAnimate);
            });
        }

        const headerKaleidoscopeFloatBtn = document.getElementById('headerKaleidoscopeFloatBtn');
        if (headerKaleidoscopeFloatBtn) {
            headerKaleidoscopeFloatBtn.addEventListener('click', () => {
                this.kaleidoscopeCenterAnimMode = 'float';
                headerKaleidoscopeFloatBtn.classList.add('active');
                document.getElementById('headerKaleidoscopeCircleBtn').classList.remove('active');
            });
        }

        const headerKaleidoscopeCircleBtn = document.getElementById('headerKaleidoscopeCircleBtn');
        if (headerKaleidoscopeCircleBtn) {
            headerKaleidoscopeCircleBtn.addEventListener('click', () => {
                this.kaleidoscopeCenterAnimMode = 'circle';
                headerKaleidoscopeCircleBtn.classList.add('active');
                document.getElementById('headerKaleidoscopeFloatBtn').classList.remove('active');
            });
        }

        const headerKaleidoscopeAnimSpeed = document.getElementById('headerKaleidoscopeAnimSpeed');
        if (headerKaleidoscopeAnimSpeed) {
            headerKaleidoscopeAnimSpeed.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeCenterAnimSpeed = value;
                document.getElementById('headerKaleidoscopeAnimSpeedValue').textContent = value;
            });
        }

        // End Kaleidoscope

        // Toggle buttons
        const videoInvertBtn = document.getElementById('videoInvertBtn');
        if (videoInvertBtn) {
            videoInvertBtn.addEventListener('click', () => {
                this.toggleVideoInvert();
                videoInvertBtn.textContent = `Invert: ${
                    this.videoInvert ? 'On' : 'Off'
                }`;
                videoInvertBtn.classList.toggle('active', this.videoInvert);
            });
        }

        const videoMirrorBtn = document.getElementById('videoMirrorBtn');
        if (videoMirrorBtn) {
            videoMirrorBtn.addEventListener('click', () => {
                this.cycleVideoMirror();
                const mirrorText = this.videoMirror === 'off' ? 'Off' : this.videoMirror.charAt(0).toUpperCase() + this.videoMirror.slice(1);
                videoMirrorBtn.textContent = `Mirror: ${mirrorText}`;
                videoMirrorBtn.classList.toggle('active', this.videoMirror !== 'off');
            });
        }

        const videoPulseBtn = document.getElementById('videoPulseBtn');
        if (videoPulseBtn) {
            videoPulseBtn.addEventListener('click', () => {
                this.toggleVideoPulse();
                videoPulseBtn.textContent = `Pulse: ${
                    this.videoPulse ? 'On' : 'Off'
                }`;
                videoPulseBtn.classList.toggle('active', this.videoPulse);
            });
        }

        // Inline video file controls
        const videoFileLoopBtn = document.getElementById('videoFileLoopBtn');
        if (videoFileLoopBtn) {
            videoFileLoopBtn.addEventListener('click', () => {
                // Cycle through loop modes: 'off' -> 'one' -> 'all' -> 'off'
                const modes = ['off', 'one', 'all'];
                const currentIndex = modes.indexOf(this.videoFileLoopMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                this.videoFileLoopMode = modes[nextIndex];
                
                const modeLabels = { 'off': 'Loop:OFF', 'one': 'Loop:1', 'all': 'Loop:ALL' };
                videoFileLoopBtn.textContent = modeLabels[this.videoFileLoopMode];
                videoFileLoopBtn.classList.toggle('active', this.videoFileLoopMode !== 'off');
                
                // Update loop setting on video elements
                if (this.videoElement && this.videoMode === 'file') {
                    this.videoElement.loop = this.videoFileLoopMode === 'one';
                }
                
                // Save to localStorage
                localStorage.setItem('freque_video_loop_mode', this.videoFileLoopMode);
                
                // Update stats if visible
                if (this.videoMode === 'file') {
                    this.detectVideoFileInfo();
                }
            });
        }

        const videoFileMuteBtn = document.getElementById('videoFileMuteBtn');
        if (videoFileMuteBtn) {
            videoFileMuteBtn.addEventListener('click', () => {
                this.videoFileMuted = !this.videoFileMuted;
                videoFileMuteBtn.textContent = this.videoFileMuted ? 'Muted' : 'Sound';
                videoFileMuteBtn.classList.toggle('active', this.videoFileMuted);
                
                // Update gain node instead of video element muted property
                if (this.videoAudioGain) {
                    this.videoAudioGain.gain.value = this.videoFileMuted ? 0 : this.volume;
                    console.log('Video audio gain set to:', this.videoFileMuted ? 0 : this.volume);
                }
            });
        }

        // Match Visualization Aspect Ratio toggle
        const matchVisualizationAspectBtn = document.getElementById('matchVisualizationAspectBtn');
        if (matchVisualizationAspectBtn) {
            matchVisualizationAspectBtn.addEventListener('click', () => {
                this.matchVisualizationAspect = !this.matchVisualizationAspect;
                matchVisualizationAspectBtn.textContent = this.matchVisualizationAspect ? 'Match Video Aspect: On' : 'Match Video Aspect: Off';
                matchVisualizationAspectBtn.classList.toggle('active', this.matchVisualizationAspect);
                
                // Apply aspect ratio matching if video is active
                if ((this.videoMode === 'camera' || this.videoMode === 'file') && this.videoElement) {
                    this.updateVisualizationAspectRatio();
                }
                
            });
        }

        // Preset buttons
        // Live video presets (exclude file browser presets)
        document.querySelectorAll('.btn-preset:not([data-target="fileBrowser"])').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                this.applyVideoPreset(preset);
            });
        });

        // Video ON/OFF Toggle Button
        const videoToggleBtn = document.getElementById('videoToggleBtn');
        if (videoToggleBtn) {
            videoToggleBtn.addEventListener('click', () => {
                this.toggleVideoPlayback();
            });
        }
        
        // Helper function to update video toggle button state
        this.updateVideoToggleState = () => {
            // Update header video toggle (sidebar removed)
            const headerVideoToggles = document.querySelectorAll('#headerVideoSettingsPanel .btn-toggle');
            headerVideoToggles.forEach(toggle => {
                if (this.videoMode === 'camera' || this.videoMode === 'file') {
                    toggle.textContent = 'ON';
                    toggle.classList.add('active');
                } else {
                    toggle.textContent = 'OFF';
                    toggle.classList.remove('active');
                }
            });
            
            // Update mixer video toggle and camera select
            if (window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoToggleButton) {
                window.multiDisplayManager.updateMixerVideoToggleButton();
                window.multiDisplayManager.updateMixerVideoCameraSelect();
            }
            
            // Also update the drawer video toggle button
            if (typeof updateDrawerVideoToggle === 'function') {
                updateDrawerVideoToggle();
            }
            
            // Update footer video button
            this.updateFooterLiveVideoButton();
        };

        this.updateVideoFileControls = (file) => {
            // Update File Controls section in Video panel
            const fileInfo = document.getElementById('headerVideoFileInfo');
            const fileInfoSection = document.getElementById('headerVideoFileInfoSection');
            const fileName = document.getElementById('headerVideoFileName');
            const loopBtn = document.getElementById('headerVideoFileLoopBtn');
            const muteBtn = document.getElementById('headerVideoFileMuteBtn');
            
            if (fileInfo && fileInfoSection && fileName && loopBtn && muteBtn) {
                // Show the file info section (file name, controls, progress)
                fileInfoSection.style.display = 'block';
                
                // Update file name
                fileName.textContent = file.name;
                
                // Update loop button state
                const modeLabels = { 'off': 'Loop:OFF', 'one': 'Loop:1', 'all': 'Loop:ALL' };
                loopBtn.textContent = modeLabels[this.videoFileLoopMode] || 'Loop:1';
                loopBtn.classList.toggle('active', this.videoFileLoopMode !== 'off');
                
                // Update mute button state
                muteBtn.classList.toggle('active', this.videoFileMuted);
                muteBtn.textContent = this.videoFileMuted ? 'Muted' : 'Sound';
                
                // Ensure audio gain node matches mute state
                if (this.videoAudioGain) {
                    this.videoAudioGain.gain.value = this.videoFileMuted ? 0 : this.volume;
                }
            }
            
            // Also update mixer file info
            if (window.multiDisplayManager) {
                window.multiDisplayManager.updateMixerVideoFileInfo();
            }
        };

        this.hideVideoFileControls = () => {
            // Hide File Controls section in Video panel
            const fileInfo = document.getElementById('headerVideoFileInfo');
            const fileName = document.getElementById('headerVideoFileName');
            
            const fileInfoSection = document.getElementById('headerVideoFileInfoSection');
            if (fileInfoSection && fileName) {
                // Hide the file info section (but keep playlist visible)
                fileInfoSection.style.display = 'none';
                
                // Reset file name
                fileName.textContent = 'No file selected';
            }
            
            // Also hide mixer file info
            if (window.multiDisplayManager) {
                window.multiDisplayManager.updateMixerVideoFileInfo();
            }
            
            // Clear video stats displays
            this.clearVideoStats();
            
            // Stop progress updates
            this.stopVideoProgressUpdates();
        };

        this.startVideoProgressUpdates = () => {
            // Stop any existing progress updates
            this.stopVideoProgressUpdates();
            
            if (!this.videoElement) return;
            
            // Update progress immediately
            this.updateVideoProgress();
            
            // Start interval for progress updates (every 100ms for smooth updates)
            this.videoProgressInterval = setInterval(() => {
                this.updateVideoProgress();
            }, 100);
        };

        this.stopVideoProgressUpdates = () => {
            if (this.videoProgressInterval) {
                clearInterval(this.videoProgressInterval);
                this.videoProgressInterval = null;
            }
        };

        this.updateVideoProgress = () => {
            if (!this.videoElement) return;
            
            const progressFill = document.getElementById('headerVideoProgressFill');
            const currentTimeEl = document.getElementById('headerVideoCurrentTime');
            const totalTimeEl = document.getElementById('headerVideoTotalTime');
            
            if (progressFill && currentTimeEl && totalTimeEl) {
                const currentTime = this.videoElement.currentTime;
                const duration = this.videoElement.duration;
                
                if (duration > 0) {
                    // Update header progress bar
                    const progressPercent = (currentTime / duration) * 100;
                    progressFill.style.width = `${progressPercent}%`;
                    
                    // Update header time displays
                    currentTimeEl.textContent = this.formatTime(currentTime);
                    totalTimeEl.textContent = this.formatTime(duration);
                    
                    // Update mixer progress via MultiDisplayManager
                    if (window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoProgress) {
                        window.multiDisplayManager.updateMixerVideoProgress(currentTime, duration);
                    }
                }
            } else {
                // Header elements not found, but still update mixer if possible
                if (this.videoElement.duration > 0 && window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoProgress) {
                    window.multiDisplayManager.updateMixerVideoProgress(this.videoElement.currentTime, this.videoElement.duration);
                }
            }
        };

        this.formatTime = (seconds) => {
            if (isNaN(seconds) || seconds === Infinity) return '0:00';
            
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        };

        const videoDeviceSelect = document.getElementById('videoDeviceSelect');
        if (videoDeviceSelect) {
            videoDeviceSelect.addEventListener('change', async (e) => {
                const value = e.target.value;
                if (value === 'file') {
                    // Trigger file input
                    const fileInput = document.getElementById('videoFileInput');
                    if (fileInput) {
                        fileInput.click();
                    }
                } else if (value) {
                    // Start camera input
                    await this.startVideoInput(value);
                }
            });
        }

        // Video file input handler
        const videoFileInput = document.getElementById('videoFileInput');
        if (videoFileInput) {
            videoFileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (file && file.type.startsWith('video/')) {
                    await this.startVideoFile(file);
                    // Header controls only (sidebar removed)
                    // Reset file input for reselection
                    e.target.value = '';
                } else if (file) {
                    this.showError('Please select a valid video file');
                    // Reset the file input
                    e.target.value = '';
                }
            });
        }

        // Sidebar video controls removed - now handled by header sliders only

        // Audio input mode button (removed - now using select dropdown)

        // Audio device selector - handled by header dropdown now
        // Sidebar device selector event listener removed as part of migration

        // Live Audio Toggle button - handled by header dropdown now
        // Sidebar toggle button event listener removed as part of migration

        // Footer Live Audio button
        const footerLiveAudioBtn = document.getElementById('footerLiveAudioBtn');
        if (footerLiveAudioBtn) {
            footerLiveAudioBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Always show audio input menu (panel)
                    this.showAudioInputMenu();
            });
        } else {
            console.error('Footer Live Audio button not found');
        }

        // Footer Live Video button
        const footerLiveVideoBtn = document.getElementById('footerLiveVideoBtn');
        if (footerLiveVideoBtn) {
            footerLiveVideoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Always show video settings panel
                    this.showVideoInputMenu();
            });
        } else {
            console.error('Footer Live Video button not found');
        }

        // Footer Live Color button
        const footerLiveColorBtn = document.getElementById('footerLiveColorBtn');
        if (footerLiveColorBtn) {
            footerLiveColorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Show color picker
                this.showColorPicker();
            });
        } else {
            console.error('Footer Live Color button not found');
        }

        // Footer Live Background button
        const footerLiveBackgroundBtn = document.getElementById('footerLiveBackgroundBtn');
        if (footerLiveBackgroundBtn) {
            footerLiveBackgroundBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Only show background image selection panel (no toggle functionality)
                this.showBackgroundImageSelection();
            });
        } else {
        }

        // Footer Playlist button
        const footerPlaylistBtn = document.getElementById('footerPlaylistBtn');
        if (footerPlaylistBtn) {
            footerPlaylistBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Show playlist panel
                this.showPlaylistPanel();
            });
        } else {
            console.error('Footer Playlist button not found');
        }

        // Footer Visualizer button
        const footerVisualizerBtn = document.getElementById('footerVisualizerBtn');
        if (footerVisualizerBtn) {
            footerVisualizerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Always show the visualizer panel (like A and V buttons)
                this.showVisualizerPanel();
            });
        } else {
            console.error('Footer Visualizer button not found');
        }

        // Footer Visualizer Toggle button
        const footerVisualizerToggleBtn = document.getElementById('footerVisualizerToggleBtn');
        if (footerVisualizerToggleBtn) {
            footerVisualizerToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle visualization ON/OFF
                this.toggleVisualization();
            });
        } else {
            console.error('Footer Visualizer Toggle button not found');
        }

        // Footer Visualizer Random button
        const footerVisualizerRandomBtn = document.getElementById('footerVisualizerRandomBtn');
        if (footerVisualizerRandomBtn) {
            footerVisualizerRandomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Set random visualization mode
                this.setRandomVisualization();
            });
        } else {
            console.error('Footer Visualizer Random button not found');
        }


        // Sidebar morph controls removed - functionality moved to footer

        // Sidebar random visualization button removed - functionality moved to header

        // Fullscreen exit button
        const fullscreenExitBtn = document.getElementById('fullscreenExitBtn');
        if (fullscreenExitBtn) {
            fullscreenExitBtn.addEventListener('click', () => {
                this.exitFullscreen();
            });
        }

        // Click to exit fullscreen on mobile/touch devices
        document.addEventListener('click', (e) => {
            if (this.isFullscreen && (e.target.id === 'visualizationContainer' || e.target.id === 'visualizer' || e.target.tagName === 'CANVAS')) {
                if (window.innerWidth<= 768 || 'ontouchstart' in window) {
            if (!e.target.closest('#fullscreenRandomBtn')) {
                this.exitFullscreen();
            }
        }
    }
});

// Playback controls
document.getElementById('playBtn').addEventListener('click', () => this.togglePlay()) 

                    document.getElementById('prevBtn').addEventListener('click', () => this.prevTrack());
                
                document.getElementById('nextBtn').addEventListener('click', () => this.nextTrack());
                document.getElementById('loopBtn').addEventListener('click', () => this.toggleLoop());

                // Background color controls
                const bgColorBtn = document.getElementById('bgColorBtn');
                const bgColorPicker = document.getElementById('bgColorPicker');

                if (bgColorBtn && bgColorPicker) {
                    bgColorBtn.addEventListener('click', () => {
                        bgColorPicker.click();
                    });

                    bgColorPicker.addEventListener('change', (e) => {
                        this.setBackgroundColor(e.target.value);
                    });
                }

                // Sidebar preset controls removed - functionality moved to header

                const importPresetsFile = document.getElementById('importPresetsFile');
                if (importPresetsFile) {
                    importPresetsFile.addEventListener('change', (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            this.importPresets(file);
                            e.target.value = '';
                        }
                    });
                }

                // Info popup
                const infoBtn = document.getElementById('infoBtn');
                if (infoBtn) {
                    infoBtn.addEventListener('click', () => this.showInfoPopup());
                }

                const popupOverlay = document.getElementById('popupOverlay');
                if (popupOverlay) {
                    popupOverlay.addEventListener('click', () => this.closeInfoPopup());
                }

                // Dummy UI Panel close button
                const dummyUICloseBtn = document.getElementById('dummyUICloseBtn');
                if (dummyUICloseBtn) {
                    dummyUICloseBtn.addEventListener('click', () => {
                        this.toggleDummyUIPanel();
                    });
                }

                // Progress bar click to seek
                const progressBar = document.getElementById('progressBar');
                if (progressBar) {
                    progressBar.addEventListener('click', (e) => {
                        if (this.audio && this.audio.duration) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            this.audio.currentTime = percent * this.audio.duration;
                        }
                    });
                }

                // Volume slider
                const volumeSlider = document.getElementById('volumeSlider');
                if (volumeSlider) {
                    volumeSlider.addEventListener('click', (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        this.setVolume(percent);
                    });
                }

                // ========== FULLSCREEN CONTROLS ==========

                // Fullscreen playback controls
                const fsPlayBtn = document.getElementById('fsPlayBtn');
                if (fsPlayBtn) {
                    fsPlayBtn.addEventListener('click', () => {
                        this.togglePlay();
                        fsPlayBtn.innerHTML = this.isPlaying ? '⏸' : '▶';
                    });
                }

                const fsPrevBtn = document.getElementById('fsPrevBtn');
                if (fsPrevBtn) {
                    fsPrevBtn.addEventListener('click', () => this.prevTrack());
                }

                const fsNextBtn = document.getElementById('fsNextBtn');
                if (fsNextBtn) {
                    fsNextBtn.addEventListener('click', () => this.nextTrack());
                }

                const fsLoopBtn = document.getElementById('fsLoopBtn');
                if (fsLoopBtn) {
                    fsLoopBtn.addEventListener('click', () => {
                        this.toggleLoop();
                        const fsLoopIndicator = document.getElementById('fsLoopIndicator');
                        if (fsLoopIndicator) {
                            switch (this.loopMode) {
                                case 'off': fsLoopBtn.classList.remove('active');
                                    fsLoopIndicator.style.display = 'none';
                                    break;
                                case 'one': fsLoopBtn.classList.add('active');
                                    fsLoopIndicator.style.display = 'flex';
                                    fsLoopIndicator.textContent = '1';
                                    break;
                                case 'all': fsLoopBtn.classList.add('active');
                                    fsLoopIndicator.style.display = 'flex';
                                    fsLoopIndicator.textContent = 'A';
                                    break;
                            }
                        }
                    });
                }

                // Fullscreen progress bar
                const fsProgressBar = document.getElementById('fsProgressBar');
                if (fsProgressBar) {
                    fsProgressBar.addEventListener('click', (e) => {
                        if (this.audio && this.audio.duration) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            this.audio.currentTime = percent * this.audio.duration;
                        }
                    });
                }

                // Fullscreen volume
                const fsVolumeSlider = document.getElementById('fsVolumeSlider');
                if (fsVolumeSlider) {
                    fsVolumeSlider.addEventListener('click', (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        this.setVolume(percent);
                        document.getElementById('fsVolumeFill').style.width = `${
                            percent * 100
                        }%`;
                    });
                }

                // Fullscreen playlist dropdown
                const fsPlaylistSelect = document.getElementById('fsPlaylistSelect');
                if (fsPlaylistSelect) {
                    fsPlaylistSelect.addEventListener('change', async (e) => {
                        if (e.target.value !== '') {
                            await this.selectTrack(parseInt(e.target.value));
                        }
                    });
                }

                // Fullscreen color scheme
                const fsColorSelect = document.getElementById('fsColorSelect');
                if (fsColorSelect) {
                    fsColorSelect.addEventListener('change', (e) => {
                        this.setColorScheme(e.target.value);
                    });
                }

                // Fullscreen visualization mode
                const fsVizSelect = document.getElementById('fsVizSelect');
                if (fsVizSelect) {
                    fsVizSelect.addEventListener('change', (e) => {
                        this.setVisualizationMode(parseInt(e.target.value));
                    });
                }

                // Fullscreen preset dropdown
                const fsPresetSelect = document.getElementById('fsPresetSelect');
                if (fsPresetSelect) {
                    fsPresetSelect.addEventListener('change', (e) => {
                        if (e.target.value !== '') {
                            this.loadPreset(parseInt(e.target.value));
                            e.target.value = '';
                        }
                    });
                }

                // Fullscreen background color
                const fsBgColorBtn = document.getElementById('fsBgColorBtn');
                const fsBgColorPicker = document.getElementById('fsBgColorPicker');
                if (fsBgColorBtn && fsBgColorPicker) {
                    fsBgColorBtn.addEventListener('click', () => {
                        fsBgColorPicker.click();
                    });

                    fsBgColorPicker.addEventListener('change', (e) => {
                        this.setBackgroundColor(e.target.value);
                    });
                }

                // Fullscreen morph controls
                const fsMorphBtn = document.getElementById('fsMorphBtn');
                if (fsMorphBtn) {
                    fsMorphBtn.addEventListener('click', () => {
                        this.toggleMorph();
                        fsMorphBtn.classList.toggle('active', this.isMorphing);
                    });
                }

                const fsMorphSpeed = document.getElementById('fsMorphSpeed');
                if (fsMorphSpeed) {
                    fsMorphSpeed.addEventListener('change', (e) => {
                        this.setMorphSpeed(e.target.value);
                    });
                }

                // Fullscreen random button
                const fsRandomBtn = document.getElementById('fsRandomBtn');
                if (fsRandomBtn) {
                    fsRandomBtn.addEventListener('click', () => {
                        this.setRandomVisualization();
                    });
                }

                // Fullscreen button
                const fullscreenBtn = document.getElementById('fullscreenBtn');
                if (fullscreenBtn) {
                    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
                }

                // Fullscreen change events
                // Fullscreen change events
                const fullscreenChangeHandler = () => {
                    this.isFullscreen = !!(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement);

                    const exitBtn = document.getElementById('fullscreenExitBtn');
                    const fsControls = document.getElementById('fullscreenControls');
                    const visualizationContainer = document.querySelector('.visualization-container');

                    if (this.isFullscreen) {
                        document.body.classList.add('fullscreen-mode');

                        if (visualizationContainer && fsControls) {
                            visualizationContainer.appendChild(fsControls);
                            fsControls.style.display = 'flex';

                            // Start auto-hide timer
                            this.showFullscreenControls();

                            // Add mouse movement listener for fullscreen
                            if (!this.fullscreenMouseHandler) {
                                this.fullscreenMouseHandler = () => this.showFullscreenControls();
                            }
                            document.addEventListener('mousemove', this.fullscreenMouseHandler);
                        }

                        if (exitBtn) {
                            exitBtn.style.display = 'flex';
                        }

                        // Populate fullscreen playlist dropdown
                        const fsPlaylistSelect = document.getElementById('fsPlaylistSelect');
                        if (fsPlaylistSelect && this.playlist) {
                            fsPlaylistSelect.innerHTML = '<option value="">Select Track...</option>';
                            this.playlist.forEach((track, index) => {
                                const option = document.createElement('option');
                                option.value = index;
                                option.textContent = track.name;
                                if (index === this.currentTrackIndex) {
                                    option.selected = true;
                                }
                                fsPlaylistSelect.appendChild(option);
                            });
                        }

                        // Populate fullscreen presets dropdown
                        const fsPresetSelect = document.getElementById('fsPresetSelect');
                        if (fsPresetSelect && this.savedPresets) {
                            fsPresetSelect.innerHTML = '<option value="">Load Preset...</option>';
                            this.savedPresets.forEach((preset, index) => {
                                const option = document.createElement('option');
                                option.value = index;
                                option.textContent = preset.name;
                                fsPresetSelect.appendChild(option);
                            });
                        }

                        // Sync other control states
                        const fsPlayBtn = document.getElementById('fsPlayBtn');
                        if (fsPlayBtn) {
                            fsPlayBtn.innerHTML = this.isPlaying ? '⏸' : '▶';
                        }

                        const fsLoopBtn = document.getElementById('fsLoopBtn');
                        const fsLoopIndicator = document.getElementById('fsLoopIndicator');
                        if (fsLoopBtn && fsLoopIndicator) {
                            switch (this.loopMode) {
                                case 'off': fsLoopBtn.classList.remove('active');
                                    fsLoopIndicator.style.display = 'none';
                                    break;
                                case 'one': fsLoopBtn.classList.add('active');
                                    fsLoopIndicator.style.display = 'flex';
                                    fsLoopIndicator.textContent = '1';
                                    break;
                                case 'all': fsLoopBtn.classList.add('active');
                                    fsLoopIndicator.style.display = 'flex';
                                    fsLoopIndicator.textContent = 'A';
                                    break;
                            }
                        }

                        const fsMorphBtn = document.getElementById('fsMorphBtn');
                        if (fsMorphBtn) {
                            fsMorphBtn.classList.toggle('active', this.isMorphing);
                        }

                        const fsVolumeFill = document.getElementById('fsVolumeFill');
                        if (fsVolumeFill) {
                            fsVolumeFill.style.width = `${
                                this.volume * 100
                            }%`;
                        }

                        const fsVizSelect = document.getElementById('fsVizSelect');
                        if (fsVizSelect) {
                            fsVizSelect.value = this.currentMode;
                        }

                        const fsColorSelect = document.getElementById('fsColorSelect');
                        if (fsColorSelect) {
                            fsColorSelect.value = this.currentColorScheme;
                        }

                        const fsMorphSpeed = document.getElementById('fsMorphSpeed');
                        if (fsMorphSpeed) {
                            fsMorphSpeed.value = this.morphMode;
                        }

                        const fsBgColorPicker = document.getElementById('fsBgColorPicker');
                        if (fsBgColorPicker) {
                            fsBgColorPicker.value = this.backgroundColor;
                        }

                        const fsTrackTitle = document.getElementById('fsTrackTitle');
                        if (fsTrackTitle && this.playlist[this.currentTrackIndex]) {
                            fsTrackTitle.textContent = this.playlist[this.currentTrackIndex].name;
                        }

                    } else {
                        document.body.classList.remove('fullscreen-mode');

                        // Remove mouse movement listener
                        if (this.fullscreenMouseHandler) {
                            document.removeEventListener('mousemove', this.fullscreenMouseHandler);
                        }
                        if (this.controlsTimeout) {
                            clearTimeout(this.controlsTimeout);
                        }

                        if (fsControls) {
                            document.body.appendChild(fsControls);
                            fsControls.style.display = 'none';
                            fsControls.classList.remove('hidden');
                        }

                        if (exitBtn) {
                            exitBtn.style.display = 'none';
                        }

                        if (visualizationContainer && visualizationContainer.style.position === 'fixed') {
                            visualizationContainer.style.position = '';
                            visualizationContainer.style.top = '';
                            visualizationContainer.style.left = '';
                            visualizationContainer.style.width = '';
                            visualizationContainer.style.height = '';
                            visualizationContainer.style.zIndex = '';
                        }
                    }
                };

                document.addEventListener('fullscreenchange', fullscreenChangeHandler);
                document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
                document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
                document.addEventListener('msfullscreenchange', fullscreenChangeHandler);

                // Keyboard controls
                document.addEventListener('keydown', async (e) => {
                    if (e.target.tagName === 'INPUT') 
                        return;
                    


                    switch (e.code) {
                        case 'Space':
                            e.preventDefault();
                            await this.togglePlay();
                            break;
                        case 'ArrowLeft':
                            e.preventDefault();
                            await this.prevTrack();
                            break;
                        case 'ArrowRight':
                            e.preventDefault();
                            await this.nextTrack();
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            this.setVolume(Math.min(1, this.volume + 0.05));
                            break;
                        case 'ArrowDown':
                            e.preventDefault();
                            this.setVolume(Math.max(0, this.volume - 0.05));
                            break;
                        case 'KeyF':
                            e.preventDefault();
                            this.toggleFullscreen();
                            break;
                        case 'KeyR':
                            e.preventDefault();
                            this.setRandomVisualization();
                            break;
                        case 'KeyM':
                            e.preventDefault();
                            this.toggleMorph();
                            break;
                        case 'KeyX':
                            e.preventDefault();
                            this.toggleMixer();
                            break;
                        case 'KeyP':
                            // Memory Profiler Controls (Shift+P to start, Ctrl+P to stop)
                            if (e.shiftKey && window.memoryProfiler) {
                                e.preventDefault();
                                window.memoryProfiler.start();
                            } else if (e.ctrlKey && window.memoryProfiler) {
                                e.preventDefault();
                                window.memoryProfiler.stop();
                            }
                            break;
                        case 'Escape':
                            e.preventDefault();
                            this.exitFullscreen();
                            this.closeInfoPopup();
                            break;
                        case 'KeyU':
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                this.toggleDummyUIPanel();
                            }
                            break;
                    }
                });

                // Touch/swipe gestures for mobile
                let touchStartX = 0;
                let touchStartY = 0;

                document.addEventListener('touchstart', (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                    touchStartY = e.changedTouches[0].screenY;
                }, {passive: true});

                document.addEventListener('touchend', (e) => {
                    const touchEndX = e.changedTouches[0].screenX;
                    const touchEndY = e.changedTouches[0].screenY;
                    const diffX = touchEndX - touchStartX;
                    const diffY = touchEndY - touchStartY;

                    if (Math.abs(diffX) > 50) {
                        if (diffX > 0) {
                            this.prevTrack();
                        } else {
                            this.nextTrack();
                        }
                    }

                    if (Math.abs(diffY) > 50) {
                        if (diffY > 0) {
                            this.setVolume(Math.max(0, this.volume - 0.1));
                        } else {
                            this.setVolume(Math.min(1, this.volume + 0.1));
                        }
                    }
                }, {passive: true});
            }

            // Show/Hide full screen controls
            showFullscreenControls() {
                const fsControls = document.getElementById('fullscreenControls');
                if (fsControls && this.isFullscreen) {
                    fsControls.classList.remove('hidden');
                    this.controlsVisible = true;

                    // Clear existing timeout
                    if (this.controlsTimeout) {
                        clearTimeout(this.controlsTimeout);
                    }

                    // Set new timeout
                    this.controlsTimeout = setTimeout(() => {
                        this.hideFullscreenControls();
                    }, 5000);
                }
            }

            hideFullscreenControls() {
                const fsControls = document.getElementById('fullscreenControls');
                if (fsControls && this.isFullscreen) {
                    fsControls.classList.add('hidden');
                    this.controlsVisible = false;
                }
            }

            // *end evenlisteners
            updatePlaylistDropdown() {
                // Method disabled - playlist now handled by header dropdown and PlaylistManager
                // Sidebar playlist dropdown will be removed
                    return;
                
                // Only clear and populate if using old hardcoded system
                dropdown.innerHTML = '';

                const playlistData = document.querySelectorAll('#playlistData .playlist-data-item');
                let trackIndex = 0;

                playlistData.forEach(item => {
                    if (item.dataset.type === 'album') {
                        const albumDiv = document.createElement('div');
                        albumDiv.className = 'playlist-album-cover';
                        albumDiv.innerHTML = `
                <img src="${
                            item.dataset.image
                        }" alt="${
                            item.dataset.name
                        }">
                <div class="playlist-album-name">${
                            item.dataset.name
                        }</div>
            `;
                        dropdown.appendChild(albumDiv);

                    } else if (item.dataset.type === 'track') {
                        const trackDiv = document.createElement('div');
                        trackDiv.className = 'playlist-dropdown-item';

                        if (trackIndex === this.currentTrackIndex) {
                            trackDiv.classList.add('active');
                        }

                        const currentTrackIndex = trackIndex;
                        trackDiv.innerHTML = `
                <div class="playlist-album-icon">
                    <img src="${
                            item.dataset.image
                        }" alt="${
                            item.dataset.name
                        }">
                </div>
                <div class="playlist-track-name">${
                            item.dataset.name
                        }</div>
            `;

                        trackDiv.addEventListener('click', () => {
                            this.selectTrack(currentTrackIndex);
                            // No need to close - playlist is embedded
                        });

                        dropdown.appendChild(trackDiv);
                        trackIndex++;
                    }
                });
            }

            showInfoPopup() {
                document.getElementById('infoPopup').classList.add('active');
                document.getElementById('popupOverlay').classList.add('active');
            }

            closeInfoPopup() {
                document.getElementById('infoPopup').classList.remove('active');
                document.getElementById('popupOverlay').classList.remove('active');
            }

            // Dummy UI Panel Methods
            toggleDummyUIPanel() {
                const modal = document.getElementById('dummyUIModal');
                if (modal) {
                    if (modal.style.display === 'none') {
                        modal.style.display = 'flex';
                    } else {
                        modal.style.display = 'none';
                    }
                }
            }

            // Morph Methods
            startMorphing() {
                if (this.isMorphing) {
                    this.stopMorphing();
                    return;
                }

                // Branch based on visualization system
                if (this.useOfficialAudioMotion) {
                    this.startProMorphing();
                } else {
                    this.startRegularMorphing();
                }
            }

            startRegularMorphing() {
                this.isMorphing = true;

                // Sidebar morph button removed - functionality moved to footer

                // Update footer morph button
                const footerMorphBtn = document.getElementById('footerMorphBtn');
                if (footerMorphBtn) {
                    footerMorphBtn.classList.add('active');
                    const footerBtnText = footerMorphBtn.querySelector('.morph-btn-text');
                    if (footerBtnText) {
                        footerBtnText.textContent = 'Stop Morph';
                    }
                }

                // Make sure energy history is initialized
                this.energyHistory = this.energyHistory || [];
                this.currentEnergy = 0;
                this.lastEnergy = 0;

                if (this.morphMode === 'energy') {
                    this.startEnergyDetection();
                    // Show sidebar energy container
                    const energyContainer = document.getElementById('energyContainer');
                    if (energyContainer) {
                        energyContainer.style.display = 'block';
                    }
                    // Show footer energy container
                    const footerEnergyContainer = document.getElementById('footerEnergyContainer');
                    if (footerEnergyContainer) {
                        footerEnergyContainer.style.display = 'block';
                    }
                }

                this.morphStartConfig = this.getCurrentConfig();

                // Store MORE locked parameters to prevent visual jumps
                this.lockedMorphParams = {
                    radial: this.morphStartConfig.radial,
                    mirror: this.morphStartConfig.mirror,
                    ledBars: this.morphStartConfig.ledBars,
                    ansiBands: this.morphStartConfig.ansiBands,
                    mode: this.morphStartConfig.mode,
                    channelLayout: this.morphStartConfig.channelLayout,
                    frequencyScale: this.morphStartConfig.frequencyScale, // Lock this
                    spinSpeed: this.morphStartConfig.spinSpeed, // Lock spin speed
                    spinAngle: this.audioMotion ? this.audioMotion.spinAngle : 0 // Preserve current angle
                };

                this.generateNewMorphTarget();
                this.morphProgress = 0;
                
                // Initialize color morphing if both gradients are available
                if (this.colorMorphManager && this.morphStartConfig.gradient && this.morphTargetConfig.gradient) {
                    this.colorMorphManager.startMorph(this.morphStartConfig.gradient, this.morphTargetConfig.gradient);
                }

                this.morphInterval = setInterval(() => {
                    this.updateMorph();
                }, 50);
            }

            startProMorphing() {
                if (!this.officialAudioMotion) {
                    return;
                }

                this.isMorphing = true;

                // Update footer morph button (same UI as regular)
                const footerMorphBtn = document.getElementById('footerMorphBtn');
                if (footerMorphBtn) {
                    footerMorphBtn.classList.add('active');
                    const footerBtnText = footerMorphBtn.querySelector('.morph-btn-text');
                    if (footerBtnText) {
                        footerBtnText.textContent = 'Stop Morph';
                    }
                }

                // Make sure energy history is initialized (same as regular)
                this.energyHistory = this.energyHistory || [];
                this.currentEnergy = 0;
                this.lastEnergy = 0;

                if (this.morphMode === 'energy') {
                    this.startEnergyDetection();
                    // Show sidebar energy container
                    const energyContainer = document.getElementById('energyContainer');
                    if (energyContainer) {
                        energyContainer.style.display = 'block';
                    }
                    // Show footer energy container
                    const footerEnergyContainer = document.getElementById('footerEnergyContainer');
                    if (footerEnergyContainer) {
                        footerEnergyContainer.style.display = 'block';
                    }
                }

                this.morphStartConfig = this.getCurrentProConfig();

                // Store locked parameters to match Regular AM morph behavior
                this.lockedMorphParams = {
                    // Core structure parameters - same as Regular AM (9 parameters)
                    radial: this.morphStartConfig.radial,
                    mirror: this.morphStartConfig.mirror,
                    ledBars: this.morphStartConfig.ledBars,
                    ansiBands: this.morphStartConfig.ansiBands,
                    mode: this.morphStartConfig.mode,
                    channelLayout: this.morphStartConfig.channelLayout,
                    frequencyScale: this.morphStartConfig.frequencyScale,
                    spinSpeed: this.morphStartConfig.spinSpeed,
                    spinAngle: this.morphStartConfig.spinAngle || 0,
                    
                    // Pro-specific parameters (must stay locked for Pro functionality)
                    colorMode: 'bar-level', // Always keep Pro color mode
                    overlay: true, // Always keep Pro overlay
                    showBgColor: false, // Always keep Pro background transparent
                    bgAlpha: 0 // Always keep Pro background transparent
                };

                this.generateNewProMorphTarget();
                this.morphProgress = 0;
                
                // Initialize color morphing if both gradients are available
                if (this.proColorMorphManager && this.morphStartConfig.gradient && this.morphTargetConfig.gradient) {
                    this.proColorMorphManager.startMorph(this.morphStartConfig.gradient, this.morphTargetConfig.gradient);
                }

                this.morphInterval = setInterval(() => {
                    this.updateProMorph();
                }, 50);

            }

            stopMorphing() {
                this.isMorphing = false;
                this.lockedMorphParams = null;

                if (this.morphInterval) {
                    clearInterval(this.morphInterval);
                    this.morphInterval = null;
                }

                if (this.energyCheckInterval) {
                    clearInterval(this.energyCheckInterval);
                    this.energyCheckInterval = null;
                }
                
                // Stop color morphing
                if (this.colorMorphManager) {
                    this.colorMorphManager.stopMorph();
                }
                if (this.proColorMorphManager) {
                    this.proColorMorphManager.stopMorph();
                }

                // Sidebar morph button removed - functionality moved to footer

                // Update footer morph button
                const footerMorphBtn = document.getElementById('footerMorphBtn');
                if (footerMorphBtn) {
                    footerMorphBtn.classList.remove('active');
                    const footerBtnText = footerMorphBtn.querySelector('.morph-btn-text');
                    if (footerBtnText) {
                        footerBtnText.textContent = 'Start Morph';
                    }
                }

                // Hide energy indicators
                const energyContainer = document.getElementById('energyContainer');
                if (energyContainer) {
                    energyContainer.style.display = 'none';
                }
                const footerEnergyContainer = document.getElementById('footerEnergyContainer');
                if (footerEnergyContainer) {
                    footerEnergyContainer.style.display = 'none';
                }
            }

            startEnergyDetection() {
                if (this.energyCheckInterval) {
                    clearInterval(this.energyCheckInterval);
                }

                this.energyCheckInterval = setInterval(() => {
                    this.detectEnergy();
                }, 100);
            }

            detectEnergy() {
                let energy = 0;
                
                if (this.useOfficialAudioMotion && this.officialAudioMotion) {
                    // For Pro visualizations, use official AudioMotion's getEnergy method
                    try {
                        // Get bass energy (20-250 Hz) which is similar to our previous calculation
                        energy = this.officialAudioMotion.getEnergy('bass');
                        if (energy === null || energy === undefined) {
                            energy = 0;
                        }
                    } catch (e) {
                        // Silent fallback - energy stays 0
                        energy = 0;
                    }
                } else if (this.audioMotion && this.audioMotion.dataArray) {
                    // For regular visualizations, use custom AudioMotion data array
                    const dataArray = this.audioMotion.dataArray;
                const bassEnd = Math.min(Math.floor(dataArray.length * 0.1), dataArray.length);
                for (let i = 0; i < bassEnd; i++) {
                    energy += dataArray[i];
                }
                energy = energy / bassEnd / 255;
                } else {
                    // No audio data available
                    return;
                }

                this.energyHistory.push(energy);
                if (this.energyHistory.length > 10) {
                    this.energyHistory.shift();
                }

                this.lastEnergy = this.currentEnergy;
                this.currentEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

                if (this.morphMode === 'energy') {
                    this.updateMorphSpeedFromEnergy();
                }

                // Update sidebar energy indicator
                const energyIndicator = document.getElementById('energyIndicator');
                if (energyIndicator) {
                    energyIndicator.style.width = `${
                        this.currentEnergy * 100
                    }%`;
                    const hue = 120 - (this.currentEnergy * 120);
                    energyIndicator.style.background = `hsl(${hue}, 100%, 50%)`;
                }

                // Update footer energy indicator
                const footerEnergyFill = document.getElementById('footerEnergyFill');
                if (footerEnergyFill) {
                    footerEnergyFill.style.width = `${
                        Math.min(this.currentEnergy * 350, 100)
                    }%`;
                    const hue = 120 - (this.currentEnergy * 120);
                    footerEnergyFill.style.background = `hsl(${hue}, 100%, 50%)`;
                }
                
                // Update mixer energy indicator
                const mixerAMEnergyFill = document.getElementById('mixerAMEnergyFill');
                if (mixerAMEnergyFill) {
                    mixerAMEnergyFill.style.width = `${
                        this.currentEnergy * 100
                    }%`;
                    const hue = 120 - (this.currentEnergy * 120);
                    mixerAMEnergyFill.style.background = `hsl(${hue}, 100%, 50%)`;
                }
            }

            updateMorphSpeedFromEnergy() {
                const minDuration = 1500;
                const maxDuration = 8000;

                this.morphDuration = minDuration + (1 - this.currentEnergy) * (maxDuration - minDuration);

                if (this.currentEnergy > 0.7 && this.lastEnergy < 0.6) {
                    this.morphProgress = 0;
                    this.morphStartConfig = this.getCurrentConfig();
                    this.generateNewMorphTarget();
                }
            }

            updateMorph() {
                if (!this.isMorphing || !this.audioMotion) 
                    return;
                


                this.morphProgress += 50 / this.morphDuration;

                if (this.morphProgress >= 1) {
                    this.morphProgress = 1;

                    // Stop color morphing before applying final config
                    if (this.colorMorphManager) {
                        this.colorMorphManager.stopMorph();
                    }

                    this.applyMorphConfig(this.morphTargetConfig);

                    this.morphStartConfig = this.morphTargetConfig;
                    this.generateNewMorphTarget();
                    this.morphProgress = 0;
                    
                    // Restart color morphing for new target
                    if (this.colorMorphManager && this.morphStartConfig.gradient && this.morphTargetConfig.gradient) {
                        this.colorMorphManager.startMorph(this.morphStartConfig.gradient, this.morphTargetConfig.gradient);
                    }
                    
                    // Process any queued Pro preset
                    if (this.pendingProPreset !== null) {
                        const queuedPreset = this.pendingProPreset;
                        this.pendingProPreset = null;
                        
                        // Temporarily stop morph to allow Pro preset switch
                        const wasMorphing = this.isMorphing;
                        this.stopMorphing();
                        
                        // Switch to Pro preset
                        this.setOfficialAudioMotionPreset(queuedPreset);
                        
                        // Restart morph in Pro mode since user had morph active
                        if (wasMorphing) {
                            this.startProMorphing();
                        }
                    }
                } else {
                    const easedProgress = this.easeInOutCubic(this.morphProgress);
                    
                    // Update color morphing if manager is available
                    let morphedGradient = null;
                    if (this.colorMorphManager && this.morphStartConfig.gradient && this.morphTargetConfig.gradient) {
                        morphedGradient = this.colorMorphManager.updateMorph(easedProgress);
                    }
                    
                    const currentConfig = this.interpolateConfigs(this.morphStartConfig, this.morphTargetConfig, easedProgress, morphedGradient);

                    this.applyMorphConfig(currentConfig);
                }
            }

            updateProMorph() {
                if (!this.isMorphing || !this.officialAudioMotion) {
                    return;
                }

                this.morphProgress += 50 / this.morphDuration;

                if (this.morphProgress >= 1) {
                    this.morphProgress = 1;

                    // Stop color morphing before applying final config
                    if (this.proColorMorphManager) {
                        this.proColorMorphManager.stopMorph();
                    }

                    // Apply target configuration using direct property updates
                    this.applyProMorphConfig(this.morphTargetConfig);

                    this.morphStartConfig = this.morphTargetConfig;
                    this.generateNewProMorphTarget();
                    this.morphProgress = 0;
                    
                    // Restart color morphing for new target
                    if (this.proColorMorphManager && this.morphStartConfig.gradient && this.morphTargetConfig.gradient) {
                        this.proColorMorphManager.startMorph(this.morphStartConfig.gradient, this.morphTargetConfig.gradient);
                    }
                    
                    // Process any queued Pro preset
                    if (this.pendingProPreset !== null) {
                        const queuedPreset = this.pendingProPreset;
                        this.pendingProPreset = null;
                        
                        // Temporarily stop morph to allow Pro preset switch
                        const wasMorphing = this.isMorphing;
                        this.stopMorphing();
                        
                        // Switch to Pro preset
                        this.setOfficialAudioMotionPreset(queuedPreset);
                        
                        // Restart morph in Pro mode since user had morph active
                        if (wasMorphing) {
                            this.startProMorphing();
                        }
                    }
                } else {
                    const easedProgress = this.easeInOutCubic(this.morphProgress);
                    
                    // Update color morphing if manager is available
                    let morphedGradient = null;
                    if (this.proColorMorphManager && this.morphStartConfig.gradient && this.morphTargetConfig.gradient) {
                        morphedGradient = this.proColorMorphManager.updateMorph(easedProgress);
                    }
                    
                    const currentConfig = this.interpolateProConfigs(this.morphStartConfig, this.morphTargetConfig, easedProgress, morphedGradient);

                    // Apply interpolated configuration using direct property updates
                    this.applyProMorphConfig(currentConfig);
                }
            }

            interpolateConfigs(start, target, progress, morphedGradient = null) {
                const config = {};

                // Always use locked parameters if they exist
                if (this.lockedMorphParams) {
                    Object.assign(config, this.lockedMorphParams);
                }

                // Interpolate ONLY numeric properties that should smoothly transition
                const numericProps = [
                    'barSpace',
                    'fillAlpha',
                    'smoothing',
                    'reflexRatio',
                    'reflexAlpha',
                    'lineWidth',
                    'radius',
                    'bgAlpha',
                    'maxDecibels',
                    'minDecibels',
                    'linearBoost',
                    'volume'
                ];

                numericProps.forEach(prop => {
                    if (start[prop] !== undefined && target[prop] !== undefined) {
                        config[prop] = start[prop] + (target[prop] - start[prop]) * progress;
                    }
                });

                // Use morphed gradient if available, otherwise use smooth interpolation
                if (morphedGradient && progress < 1) {
                    // Use the interpolated gradient from ColorMorphManager
                    config.gradient = morphedGradient;
                } else if (progress >= 1) {
                    // At completion, use target gradient
                    config.gradient = target.gradient;
                } else {
                    // During morph, keep start gradient (will be replaced by morphed gradient)
                    config.gradient = start.gradient;
                }

                // Keep these properties from start config to prevent jumps
                config.showPeaks = start.showPeaks;
                config.roundBars = start.roundBars;
                config.outlineBars = start.outlineBars;
                config.linearAmplitude = start.linearAmplitude;

                // Only switch these at the END of morph (when starting new morph)
                if (progress >= 1) {
                    config.showPeaks = target.showPeaks;
                    config.roundBars = target.roundBars;
                    config.outlineBars = target.outlineBars;
                }

                // Always include these critical properties
                config.fftSize = 8192;

                return config;
            }

            interpolateProConfigs(start, target, progress, morphedGradient = null) {
                const config = {};

                // Always use locked parameters if they exist
                if (this.lockedMorphParams) {
                    Object.assign(config, this.lockedMorphParams);
                }

                // Interpolate ONLY numeric properties that should smoothly transition (Pro-specific, exclude bgAlpha and reflex properties)
                const numericProps = [
                    'barSpace',
                    'fillAlpha',
                    'smoothing',
                    'lineWidth',
                    'radius',
                    'maxDecibels',
                    'minDecibels',
                    'linearBoost',
                    'volume',
                    'gravity',
                    'peakFadeTime',
                    'peakHoldTime',
                    'maxFreq',
                    'minFreq'
                ];

                numericProps.forEach(prop => {
                    if (start[prop] !== undefined && target[prop] !== undefined) {
                        config[prop] = start[prop] + (target[prop] - start[prop]) * progress;
                    }
                });

                // Use morphed gradient if available (smooth color interpolation)
                if (morphedGradient && progress < 1) {
                    // Use the interpolated gradient from ColorMorphManager
                    config.gradient = morphedGradient;
                } else if (progress >= 1) {
                    // At completion, use target gradient
                    config.gradient = target.gradient;
                } else {
                    // During morph, keep start gradient (will be replaced by morphed gradient)
                    config.gradient = start.gradient;
                }

                // Keep these properties from start config to prevent jumps (same as Regular AM)
                config.showPeaks = start.showPeaks;
                config.roundBars = start.roundBars;
                config.outlineBars = start.outlineBars;
                config.linearAmplitude = start.linearAmplitude;

                // Only switch these at the END of morph (same as Regular AM)
                if (progress >= 1) {
                    config.showPeaks = target.showPeaks;
                    config.roundBars = target.roundBars;
                    config.outlineBars = target.outlineBars;
                }

                // Always include these critical Pro properties
                config.fftSize = 8192;
                config.colorMode = 'bar-level'; // Always keep Pro color mode
                config.overlay = true; // Always keep Pro overlay
                config.showBgColor = false; // Always keep Pro background transparent
                // Note: bgAlpha excluded as requested

                return config;
            }

            applyProMorphConfig(config) {
                if (!this.officialAudioMotion) {
                    console.warn('⚠️ Official AudioMotion not available for Pro morph config');
                    return;
                }

                try {
                    // Use direct property assignment to avoid DEFAULT_SETTINGS merge
                    // This prevents parameter resets that occur with setOptions()
                    
                    // Numeric properties that can be directly assigned
                    const directProps = [
                        'barSpace', 'fillAlpha', 'smoothing', 'lineWidth', 'radius',
                        'maxDecibels', 'minDecibels', 'linearBoost', 'volume',
                        'gravity', 'peakFadeTime', 'peakHoldTime', 'maxFreq', 'minFreq'
                    ];

                    directProps.forEach(prop => {
                        if (config[prop] !== undefined) {
                            this.officialAudioMotion[prop] = config[prop];
                        }
                    });

                    // Boolean properties that can be directly assigned
                    const boolProps = [
                        'showPeaks', 'roundBars', 'outlineBars', 'linearAmplitude',
                        'overlay', 'showBgColor'
                    ];

                    boolProps.forEach(prop => {
                        if (config[prop] !== undefined) {
                            this.officialAudioMotion[prop] = config[prop];
                        }
                    });

                    // String properties that can be directly assigned
                    if (config.gradient !== undefined) {
                        this.officialAudioMotion.gradient = config.gradient;
                    }

                    if (config.colorMode !== undefined) {
                        this.officialAudioMotion.colorMode = config.colorMode;
                    }

                    // Structural changes that require setOptions (use sparingly)
                    const structuralProps = {};
                    if (config.mode !== undefined && config.mode !== this.officialAudioMotion.mode) {
                        structuralProps.mode = config.mode;
                    }
                    if (config.radial !== undefined && config.radial !== this.officialAudioMotion.radial) {
                        structuralProps.radial = config.radial;
                    }
                    if (config.mirror !== undefined && config.mirror !== this.officialAudioMotion.mirror) {
                        structuralProps.mirror = config.mirror;
                    }
                    if (config.channelLayout !== undefined && config.channelLayout !== this.officialAudioMotion.channelLayout) {
                        structuralProps.channelLayout = config.channelLayout;
                    }

                    // Only call setOptions for structural changes to minimize resets
                    if (Object.keys(structuralProps).length > 0) {
                        // Preserve critical Pro properties when using setOptions
                        structuralProps.colorMode = 'bar-level';
                        structuralProps.overlay = true;
                        structuralProps.showBgColor = false;
                        this.officialAudioMotion.setOptions(structuralProps);
                    }

                } catch (error) {
                }
            }

            easeInOutCubic(t) { // Make the easing even smoother
                if (t < 0.5) {
                    return 4 * t * t * t;
                } else {
                    const p = 2 * t - 2;
                    return 1 + p * p * p / 2;
                }
            }

            toggleMorph() {
                if (this.isMorphing) {
                    this.stopMorphing();
                } else {
                    this.startMorphing();
                }
                
                // Update mixer morph button
                if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAMMorphButton) {
                    window.multiDisplayManager.updateMixerAMMorphButton();
                }
            }

            setMorphSpeed(speed) {
                this.morphMode = speed;

                if (speed === 'energy') {
                    if (this.isMorphing) {
                        this.startEnergyDetection();
                    }
                    // Show sidebar energy container
                    const energyContainer = document.getElementById('energyContainer');
                    if (energyContainer) {
                        energyContainer.style.display = 'block';
                    }
                    // Show footer energy container
                    const footerEnergyContainer = document.getElementById('footerEnergyContainer');
                    if (footerEnergyContainer) {
                        footerEnergyContainer.style.display = 'block';
                    }
                } else {
                    if (this.energyCheckInterval) {
                        clearInterval(this.energyCheckInterval);
                        this.energyCheckInterval = null;
                    }

                    // Hide sidebar energy container
                    const energyContainer = document.getElementById('energyContainer');
                    if (energyContainer) {
                        energyContainer.style.display = 'none';
                    }
                    // Hide footer energy container
                    const footerEnergyContainer = document.getElementById('footerEnergyContainer');
                    if (footerEnergyContainer) {
                        footerEnergyContainer.style.display = 'none';
                    }

                    const speeds = {
                        slow: 10000,
                        medium: 5000,
                        fast: 2000,
                        ultra: 1000
                    };
                    this.morphDuration = speeds[speed] || 5000;
                }
                
                // Update mixer morph speed select and energy container
                if (window.multiDisplayManager) {
                    if (window.multiDisplayManager.updateMixerAMMorphSpeedSelect) {
                        window.multiDisplayManager.updateMixerAMMorphSpeedSelect();
                    }
                    if (window.multiDisplayManager.updateMixerAMEnergyContainer) {
                        window.multiDisplayManager.updateMixerAMEnergyContainer();
                    }
                }
            }

            // Fullscreen Methods
            toggleFullscreen() {
                const visualizationContainer = document.querySelector('.visualization-container');
                const appContainer = document.querySelector('.app-container');
                const exitBtn = document.getElementById('fullscreenExitBtn');

                if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {

                    const element = visualizationContainer || appContainer || document.documentElement;

                    if (exitBtn) {
                        exitBtn.style.display = 'flex';
                    }

                    if (element.requestFullscreen) {
                        element.requestFullscreen().catch(err => {
                            console.error('Error attempting fullscreen:', err);
                            this.fallbackFullscreen();
                        });
                    } else if (element.mozRequestFullScreen) {
                        element.mozRequestFullScreen();
                    } else if (element.webkitRequestFullscreen) {
                        element.webkitRequestFullscreen();
                    } else if (element.webkitEnterFullscreen) {
                        element.webkitEnterFullscreen();
                    } else if (element.msRequestFullscreen) {
                        element.msRequestFullscreen();
                    } else {
                        this.fallbackFullscreen();
                    }
                } else {
                    this.exitFullscreen();
                }
            }

            fallbackFullscreen() {
                const visualizationContainer = document.querySelector('.visualization-container');
                const randomBtn = document.getElementById('fullscreenRandomBtn');
                const exitBtn = document.getElementById('fullscreenExitBtn');

                if (visualizationContainer) {
                    visualizationContainer.style.position = 'fixed';
                    visualizationContainer.style.top = '0';
                    visualizationContainer.style.left = '0';
                    visualizationContainer.style.width = '100vw';
                    visualizationContainer.style.height = '100vh';
                    visualizationContainer.style.zIndex = '9999';
                    document.body.classList.add('fullscreen-mode');
                    this.isFullscreen = true;

                    if (randomBtn) {
                        visualizationContainer.appendChild(randomBtn);
                        randomBtn.style.display = 'block';
                    }

                    if (exitBtn) {
                        exitBtn.style.display = 'flex';
                    }
                }
            }

            exitFullscreen() {
                const randomBtn = document.getElementById('fullscreenRandomBtn');
                const exitBtn = document.getElementById('fullscreenExitBtn');

                if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {

                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                } else if (this.isFullscreen) {
                    const visualizationContainer = document.querySelector('.visualization-container');
                    if (visualizationContainer) {
                        visualizationContainer.style.position = '';
                        visualizationContainer.style.top = '';
                        visualizationContainer.style.left = '';
                        visualizationContainer.style.width = '';
                        visualizationContainer.style.height = '';
                        visualizationContainer.style.zIndex = '';
                        document.body.classList.remove('fullscreen-mode');
                        this.isFullscreen = false;
                    }
                }

                if (randomBtn) {
                    document.body.appendChild(randomBtn);
                    randomBtn.style.display = 'none';
                }

                if (exitBtn) {
                    exitBtn.style.display = 'none';
                }
            }

            // Playlist Methods
            loadPlaylist() {
                this.playlist = [];
                const playlistData = document.querySelectorAll('#playlistData .playlist-data-item[data-type="track"]');

                playlistData.forEach(item => {
                    this.playlist.push({
                        name: item.dataset.name,
                        url: item.dataset.url,
                        image: item.dataset.image || 'https://content.app-sources.com/s/810881111918650241/uploads/Images/Icon-3589409.jpg'
                    });
                });

                this.updatePlaylistDropdown();
                
                // Try to initialize first track if we haven't already and now have valid URLs
                this.tryInitializeFirstTrack();
            }

            async preloadTrack(index) {
                if (index < 0 || index >= this.playlist.length) {
                    console.warn(`Invalid track index: ${index} (playlist length: ${this.playlist.length})`);
                    return;
                }
                
                const track = this.playlist[index];
                if (!track || !track.url) {
                    // Track at index has no URL
                    this.showError('Track has no valid URL - may need rescan');
                    return;
                }

                // Validate URL before attempting to load
                if (!track.url.startsWith('blob:') && !track.url.startsWith('http')) {
                    console.warn(`Invalid track URL format: ${track.url}`);
                    this.showError('Invalid track URL format');
                    return;
                }

                try {
                    if (this.audio) {
                        this.audio.pause();
                        if (this.audioMotion) {
                            this.audioMotion.disconnectInput();
                        }
                    }

                    this.audio = new Audio();
                    this.audio.crossOrigin = 'anonymous';
                    this.audio.src = track.url;
                    this.audio.volume = this.volume;

                // Loading track...

                    await new Promise((resolve, reject) => {
                        const onCanPlay = () => {
                            clearTimeout(timeoutId);
                            resolve();
                        };
                        const onError = (e) => {
                            clearTimeout(timeoutId);
                            console.error('Audio loading error:', e);
                            console.error('Audio element state:', {
                                src: this.audio.src,
                                readyState: this.audio.readyState,
                                networkState: this.audio.networkState,
                                error: this.audio.error
                            });
                            reject(new Error(`Failed to load audio: ${e.type}`));
                        };
                        
                        this.audio.addEventListener('canplay', onCanPlay, {once: true});
                        this.audio.addEventListener('error', onError, {once: true});
                        
                        // Increase timeout to 10 seconds and add better logging
                        const timeoutId = setTimeout(() => {
                            this.audio.removeEventListener('canplay', onCanPlay);
                            this.audio.removeEventListener('error', onError);
                            console.warn(`Audio loading timeout after 10 seconds for track: ${track.name}`);
                            // Don't reject on timeout - let it continue and try to play
                            resolve();
                        }, 10000);
                        
                        // Start loading the audio
                        this.audio.load();
                    });

                    this.audio.addEventListener('timeupdate', () => this.updateProgress());
                    this.audio.addEventListener('ended', () => this.handleTrackEnd());
                    this.audio.addEventListener('error', (e) => {
                        console.error('Audio playback error:', e);
                        console.error('Audio error details:', {
                            src: this.audio.src,
                            error: this.audio.error,
                            networkState: this.audio.networkState,
                            readyState: this.audio.readyState
                        });
                        this.showError('Failed to load audio track');
                    });

                    // Don't connect audio input immediately - wait until play is pressed
                    // This prevents waiting animations from stopping prematurely
                    // Audio will be connected in play() method when user starts playback

                    this.currentTrackIndex = index;
                    this.updateTrackInfo();
                    this.updatePlaylistDropdown();
                    
                    // Enable play button after successful track loading
                    const playBtn = document.getElementById('playBtn');
                    if (playBtn) {
                        playBtn.disabled = false;
                        playBtn.style.opacity = '1.0';
                        // Play button enabled in preloadTrack
                    }
                    
                    // Successfully loaded track

                } catch (error) {
                    console.error('Failed to preload track:', error);
                    this.showError('Failed to load track: ' + error.message);
                    
                    // Disable play button on error
                    const playBtn = document.getElementById('playBtn');
                    if (playBtn) {
                        playBtn.disabled = true;
                        playBtn.style.opacity = '0.5';
                    }
                    const trackTitle = document.getElementById('trackTitle');
                    if (trackTitle) {
                        trackTitle.textContent = 'Failed to load track';
                    }
                }
            }

            async selectTrack(index) {
                await this.preloadTrack(index);
                if (this.isPlaying) {
                    await this.play();
                }
            }

            async togglePlay() {
                if (!this.audio || !this.audioInitialized) {
                    await this.initializeFirstTrack();
                }

                if (this.isPlaying) {
                    this.pause();
                } else {
                    await this.play();
                }
            }

            async play() {
                if (!this.audio) {
                    await this.initializeFirstTrack();
                    
                    // Check if audio was successfully initialized
                    if (!this.audio) {
                        this.showError('No audio track available to play');
                        return;
                    }
                    
                    document.getElementById('fsPlayBtn').innerHTML = '⏸';
                }

                try {
                    // Connect audio to analyzers when play is pressed (not during preload)
                    if (this.audioMotion && !this.audioMotion.isConnected) {
                        this.audioMotion.connectInput(this.audio);
                        
                        // Reconnect official AudioMotion if it needs connection
                        this.reconnectOfficialAudioMotion();
                    }
                    
                    if (this.audioMotion && this.audioMotion.audioCtx) {
                        if (this.audioMotion.audioCtx.state === 'suspended') {
                            await this.audioMotion.audioCtx.resume();
                        }
                    }

                    await this.audio.play();
                    this.isPlaying = true;
                    document.getElementById('playBtn').innerHTML = '⏸';
                } catch (error) {
                    console.error('Playback failed:', error);
                    if (error.name === 'NotAllowedError') {
                        this.showError('Click play again to start playback');
                    } else {
                        this.showError('Playback failed. Please try again.');
                    }
                }
            }

            pause() {
                if (!this.audio) 
                    return;
                


                this.audio.pause();
                this.isPlaying = false;
                document.getElementById('playBtn').innerHTML = '▶';
            }

            async nextTrack() {
                const nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
                await this.selectTrack(nextIndex);
            }

            async prevTrack() {
                const prevIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
                await this.selectTrack(prevIndex);
            }

            toggleLoop() {
                const modes = ['off', 'one', 'all'];
                const currentIndex = modes.indexOf(this.loopMode);
                this.loopMode = modes[(currentIndex + 1) % modes.length];

                const loopBtn = document.getElementById('loopBtn');
                const loopIndicator = document.getElementById('loopIndicator');

                switch (this.loopMode) {
                    case 'off': loopBtn.classList.remove('active');
                        loopIndicator.style.display = 'none';
                        loopBtn.title = 'Toggle Loop (Off)';
                        if (this.audio) 
                            this.audio.loop = false;
                        

                        break;
                    case 'one': loopBtn.classList.add('active');
                        loopIndicator.style.display = 'flex';
                        loopIndicator.textContent = '1';
                        loopBtn.title = 'Toggle Loop (One)';
                        if (this.audio) 
                            this.audio.loop = true;
                        

                        break;
                    case 'all': loopBtn.classList.add('active');
                        loopIndicator.style.display = 'flex';
                        loopIndicator.textContent = 'A';
                        loopBtn.title = 'Toggle Loop (All)';
                        if (this.audio) 
                            this.audio.loop = false;
                        

                        break;
                }
            }

            async handleTrackEnd() {
                if (this.loopMode === 'one') {
                    return;
                } else if (this.loopMode === 'all') {
                    await this.nextTrack();
                } else {
                    this.pause();
                }
            }

            setVolume(value) {
                this.volume = value;
                
                // Control playlist audio volume
                if (this.audio) {
                    this.audio.volume = value;
                }
                
                // Control video file audio volume (if not muted)
                if (this.videoAudioGain && !this.videoFileMuted) {
                    this.videoAudioGain.gain.value = value;
                }
                
                document.getElementById('volumeFill').style.width = `${
                    value * 100
                }%`;

                // Update mixer volume slider
                if (window.multiDisplayManager && window.multiDisplayManager.updateMixerAudioVolumeSlider) {
                    window.multiDisplayManager.updateMixerAudioVolumeSlider();
                }

                // Update mute state
                if (value === 0 && !this.isMuted) {
                    this.isMuted = true;
                } else if (value > 0 && this.isMuted) {
                    this.isMuted = false;
                    this.previousVolume = value;
                }
            }

            toggleMute() {
                const volumeIcon = document.querySelector('.volume-control .volume-icon');

                if (this.isMuted) { // Unmute
                    this.setVolume(this.previousVolume);
                    this.isMuted = false;
                    if (volumeIcon) {
                        // Restore normal volume icon
                        volumeIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
                        volumeIcon.classList.remove('muted');
                        volumeIcon.title = 'Volume';
                    }

                } else { // Mute
                    this.previousVolume = this.volume;
                    this.setVolume(0);
                    this.isMuted = true;
                    if (volumeIcon) {
                        // Change to muted icon (speaker with X)
                        volumeIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
                        volumeIcon.classList.add('muted');
                        volumeIcon.title = 'Unmute';
                    }

                }
            }

            updateProgress() {
                if (!this.audio || !this.audio.duration) 
                    return;
                


                const percent = (this.audio.currentTime / this.audio.duration) * 100;
                document.getElementById('progressFill').style.width = `${percent}%`;

                const current = this.formatTime(this.audio.currentTime);
                const total = this.formatTime(this.audio.duration);
                document.getElementById('timeDisplay').textContent = `${current} / ${total}`;

                const fsProgressFill = document.getElementById('fsProgressFill');
                if (fsProgressFill) {
                    fsProgressFill.style.width = `${percent}%`;
                }
                const fsTimeDisplay = document.getElementById('fsTimeDisplay');
                if (fsTimeDisplay) {
                    fsTimeDisplay.textContent = `${current} / ${total}`;
                }
            }

            updateTrackInfo() {
                const track = this.playlist[this.currentTrackIndex];
                if (track) {
                    const trackTitle = document.getElementById('trackTitle');
                    if (trackTitle) {
                        trackTitle.textContent = track.name;
                    }
                    // Note: playlistToggle was removed when we embedded the playlist
                    // The track name is now displayed in the embedded playlist manager
                }
                const fsTrackTitle = document.getElementById('fsTrackTitle');
                if (fsTrackTitle) {
                    fsTrackTitle.textContent = track.name;
                }
                const fsPlaylistSelect = document.getElementById('fsPlaylistSelect');
                if (fsPlaylistSelect) {
                    fsPlaylistSelect.value = this.currentTrackIndex;
                }
            }

            // Utility Methods
            formatTime(seconds) {
                if (!seconds || isNaN(seconds)) 
                    return '0:00';
                


                const minutes = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${minutes}:${
                    secs.toString().padStart(2, '0')
                }`;
            }

            showLoading() {
                document.getElementById('loading').style.display = 'block';
                document.getElementById('error').style.display = 'none';
            }

            hideLoading() {
                document.getElementById('loading').style.display = 'none';
            }

            showError(message) {
                const errorDiv = document.getElementById('error');
                const errorText = document.getElementById('error-text');

                errorDiv.style.display = 'block';
                errorText.textContent = message;
                document.getElementById('loading').style.display = 'none';

                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 5000);

                errorDiv.onclick = () => {
                    errorDiv.style.display = 'none';
                };
            }
            
            applyVideoFileSize() {
                if (!this.videoElement) return;
                
                let objectFit = 'cover';
                switch (this.videoFileSize) {
                    case 'fit':
                        objectFit = 'contain';
                        break;
                    case 'fill':
                        objectFit = 'cover';
                        break;
                    case 'stretch':
                        objectFit = 'fill';
                        break;
                    case 'original':
                        objectFit = 'none';
                        break;
                    default:
                        objectFit = 'cover';
                }
                this.videoElement.style.objectFit = objectFit;
            }
            
            updateVideoFileSize() {
                this.applyVideoFileSize();
            }
        }

        // Sidebar completely removed - all functionality moved to header/footer controls


// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
window.visualizer = new FrequeVisualizer();

// Add comprehensive diagnostic helper function to window
window.diagnoseLiveDisplayAndRecord = function() {
    console.log('');
    
    // Record Manager State
    if (window.visualizer?.recordManager) {
        const rm = window.visualizer.recordManager;
        console.log(`  isRecording: ${rm.isRecording}`);
        console.log(`  compositeCanvas: ${rm.compositeCanvas?.width}x${rm.compositeCanvas?.height}`);
        console.log(`  compositeCtx: ${!!rm.compositeCtx}`);
        console.log(`  frameRate: ${rm.frameRate}`);
    } else {
    }
    console.log('');
    
    // Live Display Managers State (check multiDisplayManager)
    if (window.multiDisplayManager?.displayManagers && window.multiDisplayManager.displayManagers.size > 0) {
        let displayIndex = 1;
        window.multiDisplayManager.displayManagers.forEach((displayManager, displayId) => {
            console.log(`  Display ${displayIndex} (ID: ${displayId}):`);
            console.log(`    isStreaming: ${displayManager.isStreaming}`);
            console.log(`    compositeCanvas: ${displayManager.compositeCanvas?.width}x${displayManager.compositeCanvas?.height}`);
            console.log(`    compositeCtx: ${!!displayManager.compositeCtx}`);
            console.log(`    frameRate: ${displayManager.frameRate}`);
            console.log(`    displaySettings:`, displayManager.displaySettings);
            displayIndex++;
        });
    } else {
    }
    console.log('');
    
    // Plugin State
    if (window.pluginManager) {
        const plugins = window.pluginManager.getAllPlugins();
        console.log(`  Total plugins: ${plugins.length}`);
        plugins.forEach(plugin => {
            console.log(`  - ${plugin.pluginName}:`);
            console.log(`      isActive: ${plugin.isActive}`);
            console.log(`      canvas: ${plugin.canvas?.width}x${plugin.canvas?.height}`);
            console.log(`      opacity: ${plugin.getOpacity ? plugin.getOpacity() : 'N/A'}`);
            console.log(`      blendMode: ${plugin.getBlendMode ? plugin.getBlendMode() : 'N/A'}`);
            console.log(`      kaleidoscope: ${window.visualizer?.[`kaleidoscopeApplyTo${plugin.pluginName.charAt(0).toUpperCase() + plugin.pluginName.slice(1)}`] ? 'ON' : 'OFF'}`);
        });
    } else {
    }
    console.log('');
    
    // Kaleidoscope State
    if (window.visualizer) {
        console.log(`  enabled: ${window.visualizer.kaleidoscopeEnabled}`);
        console.log(`  applyToViz: ${window.visualizer.kaleidoscopeApplyToViz}`);
        console.log(`  applyToVideo: ${window.visualizer.kaleidoscopeApplyToVideo}`);
        console.log(`  vizCanvas: ${window.visualizer.kaleidoscopeVizCanvas?.width}x${window.visualizer.kaleidoscopeVizCanvas?.height}`);
    } else {
    }
    console.log('');
    
    console.log('===================================================');
    console.log('TIP: Run this function while recording or live display is active');
    console.log('===================================================');
};

// Initialize Plugin AutoLoader after app is created
if (window.pluginAutoLoader) {
    // Start autoloader initialization (it will wait for app to be ready)
    window.pluginAutoLoader.initialize().catch(error => {
        console.error('🔌 Plugin AutoLoader initialization failed:', error);
    });
    
    // Wire up refresh button (DOM is already ready at this point)
    const refreshBtn = document.getElementById('refreshPluginsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Refreshing...';
            
            try {
                await window.pluginAutoLoader.refreshPlugins();
                refreshBtn.textContent = 'Refresh Plugins';
            } catch (error) {
                console.error('🔌 Manual refresh failed:', error);
                refreshBtn.textContent = 'Refresh Failed';
                setTimeout(() => {
                    refreshBtn.textContent = 'Refresh Plugins';
                }, 2000);
            } finally {
                refreshBtn.disabled = false;
            }
        });
    }
}

// Initialize Master Animation Controller (Phase 1 - Foundation)
window.masterAnimationController = new MasterAnimationController();

// Initialize Multi-Display Manager (isolated system)
window.multiDisplayManager = new MultiDisplayManager(window.visualizer);

// Initialize footer Live Audio button state
if (window.visualizer && window.visualizer.updateFooterLiveAudioButton) {
    window.visualizer.updateFooterLiveAudioButton();
}

// Initialize Theme System
initializeThemeSystem();

// Sidebar completely removed - all functionality moved to header/footer controls

// Drawer system completely removed - all functionality moved to header/footer controls

// Initialize Video Devices
if (window.visualizer && window.visualizer.initializeVideoInput) {
    window.visualizer.initializeVideoInput();
}

// Initialize Video Button State
if (window.visualizer && window.visualizer.updateFooterLiveVideoButton) {
    window.visualizer.updateFooterLiveVideoButton();
}

// Initialize Visualizer Button State
if (window.visualizer && window.visualizer.updateFooterVisualizerButton) {
    window.visualizer.updateFooterVisualizerButton();
}

        // Initialize Visualizer Toggle Button State
        if (window.visualizer && window.visualizer.updateFooterVisualizerToggleButton) {
            window.visualizer.updateFooterVisualizerToggleButton();
        }

        // Initialize Infinite Zoom Toggle Button State
        if (window.visualizer && window.visualizer.updateInfiniteZoomToggleButton) {
            window.visualizer.updateInfiniteZoomToggleButton();
        }
        
        // Initialize Fluid Dynamics Toggle Button State
        if (window.visualizer && window.visualizer.updateFluidDynamicsToggleButton) {
            window.visualizer.updateFluidDynamicsToggleButton();
        }
        
        // Initialize Nebula Toggle Button State
        if (window.visualizer && window.visualizer.updateNebulaButtons) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                window.visualizer.updateNebulaButtons();
            }, 100);
        }

        // Initialize Footer Morph Controls
        if (window.visualizer && window.visualizer.initializeFooterMorphControls) {
            window.visualizer.initializeFooterMorphControls();
            // Apply default energy morph settings
            window.visualizer.setMorphSpeed('energy');
        }

        // Initialize Background Button State
        if (window.visualizer && window.visualizer.updateFooterBackgroundButton) {
            window.visualizer.updateFooterBackgroundButton();
        }

        // Load background image settings
        if (window.visualizer && window.visualizer.loadBackgroundImageSettings) {
            window.visualizer.loadBackgroundImageSettings();
        }

// Load saved video source
if (window.visualizer && window.visualizer.loadVideoSource) {
    const savedSource = window.visualizer.loadVideoSource();
    if (savedSource) {
        // Update dropdown to show saved source
        const deviceSelect = document.getElementById('videoDeviceSelect');
        if (deviceSelect) {
            // Update the device list first, then set the selection
            window.visualizer.updateVideoDeviceList();
            deviceSelect.value = savedSource.source;
            window.visualizer.updateVideoDropdownDisplay();
        }
    }
}

// Add resize listener for Infinite Zoom, Blobs, Kaleidoscope, WebGL, and Nebula
let pluginResizeTimeout;
window.addEventListener('resize', () => {
    // Resize native visualizations immediately (they handle it smoothly)
    if (window.visualizer && window.visualizer.infiniteZoom) {
        window.visualizer.infiniteZoom.resize();
    }
    if (window.visualizer && window.visualizer.blobsVisualization) {
        window.visualizer.blobsVisualization.resize();
    }
    if (window.visualizer && window.visualizer.resizeKaleidoscopeCanvases) {
        window.visualizer.resizeKaleidoscopeCanvases();
    }
    if (window.visualizer && window.visualizer.webglVisualization) {
        window.visualizer.webglVisualization.resize();
    }
    
    // Throttle plugin resizes to prevent flickering during drag-resize
    clearTimeout(pluginResizeTimeout);
    pluginResizeTimeout = setTimeout(() => {
        if (window.pluginManager && window.pluginManager.plugins) {
            window.pluginManager.plugins.forEach(plugin => {
                if (plugin && plugin.resize) {
                    plugin.resize();
                }
            });
        }
    }, 150); // Wait 150ms after resize stops
});

// Global debug function for background image
window.debugBackgroundImage = function() {
    if (window.visualizer && window.visualizer.recordManager) {
        window.visualizer.recordManager.debugBackgroundImageState();
    } else {
    }
};

// Global function to test background image loading
window.testBackgroundImage = function() {
    if (window.visualizer) {
        console.log('Current state:', {
            hasImage: !!window.visualizer.backgroundImage,
            enabled: window.visualizer.backgroundImageEnabled,
            opacity: window.visualizer.backgroundImageOpacity,
            saturation: window.visualizer.backgroundImageSaturation
        });
        
        // Test drawing on a temporary canvas
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 800;
        testCanvas.height = 600;
        const testCtx = testCanvas.getContext('2d');
        
        // Background image is now handled by DOM element, not canvas drawing
        
        // Add test canvas to page for visual inspection
        testCanvas.style.position = 'fixed';
        testCanvas.style.top = '10px';
        testCanvas.style.right = '10px';
        testCanvas.style.border = '2px solid red';
        testCanvas.style.zIndex = '9999';
        testCanvas.id = 'debug-test-canvas';
        document.body.appendChild(testCanvas);
        
        console.log('Test canvas added to page (red border)');
    }
};

// Global function to inspect main canvas
window.inspectMainCanvas = function() {
    const mainCanvas = document.querySelector('#visualizationCanvas');
    if (mainCanvas) {
        console.log('Main canvas found:', {
            width: mainCanvas.width,
            height: mainCanvas.height,
            style: mainCanvas.style.cssText,
            computedStyle: window.getComputedStyle(mainCanvas)
        });
        
        // Check if canvas has content
        const ctx = mainCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        const hasContent = imageData.data.some(pixel => pixel !== 0);
        console.log('Canvas has content:', hasContent);
        
        // Create a copy of the canvas for inspection
        const copyCanvas = document.createElement('canvas');
        copyCanvas.width = mainCanvas.width;
        copyCanvas.height = mainCanvas.height;
        const copyCtx = copyCanvas.getContext('2d');
        copyCtx.drawImage(mainCanvas, 0, 0);
        
        copyCanvas.style.position = 'fixed';
        copyCanvas.style.top = '100px';
        copyCanvas.style.right = '10px';
        copyCanvas.style.border = '2px solid blue';
        copyCanvas.style.zIndex = '9999';
        copyCanvas.id = 'debug-main-canvas-copy';
        document.body.appendChild(copyCanvas);
        
        console.log('Main canvas copy added to page (blue border)');
    } else {
        console.log('Available canvas elements:', document.querySelectorAll('canvas'));
    }
};

// Global function for testing Learning Analytics Modal
window.testLearningAnalytics = () => {
    console.log('Testing Learning Analytics Modal...');
    const modal = document.getElementById('learningAnalyticsModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        console.log('Modal should now be visible');
    } else {
        console.error('Modal not found!');
    }
}

// Apply Default Preset - restore initial app settings
FrequeVisualizer.prototype.applyFluidDynamicsDefaultPreset = function() {
    // Set color scheme to default (Vibrant)
    const colorSchemeDropdown = document.getElementById('headerFluidDynamicsColorScheme');
    if (colorSchemeDropdown) {
        colorSchemeDropdown.value = 'vibrant';
        this.fluidDynamics.setColorScheme('vibrant');
    }

    // Clear any custom colors
    if (this.fluidDynamics) {
        this.fluidDynamics.usingCustomColors = false;
        this.fluidDynamics.currentCustomColors = null;
    }

    // Reset Energy Physics to defaults
    const energySensitivitySlider = document.getElementById('headerFluidDynamicsEnergySensitivitySlider');
    const energySensitivityValue = document.getElementById('headerFluidDynamicsEnergySensitivityValue');
    if (energySensitivitySlider && energySensitivityValue) {
        energySensitivitySlider.value = '1.0';
        energySensitivityValue.textContent = '1.0';
        this.fluidDynamics.updateEnergyPhysicsConfig({ energySensitivity: 1.0 });
    }

    const viscosityResponseSlider = document.getElementById('headerFluidDynamicsViscosityResponseSlider');
    const viscosityResponseValue = document.getElementById('headerFluidDynamicsViscosityResponseValue');
    if (viscosityResponseSlider && viscosityResponseValue) {
        viscosityResponseSlider.value = '2.0';
        viscosityResponseValue.textContent = '2.0';
        this.fluidDynamics.updateEnergyPhysicsConfig({ viscosityResponse: 2.0 });
    }

    const curlResponseSlider = document.getElementById('headerFluidDynamicsCurlResponseSlider');
    const curlResponseValue = document.getElementById('headerFluidDynamicsCurlResponseValue');
    if (curlResponseSlider && curlResponseValue) {
        curlResponseSlider.value = '3.0';
        curlResponseValue.textContent = '3.0';
        this.fluidDynamics.updateEnergyPhysicsConfig({ curlResponse: 3.0 });
    }

    const pressureResponseSlider = document.getElementById('headerFluidDynamicsPressureResponseSlider');
    const pressureResponseValue = document.getElementById('headerFluidDynamicsPressureResponseValue');
    if (pressureResponseSlider && pressureResponseValue) {
        pressureResponseSlider.value = '0.5';
        pressureResponseValue.textContent = '0.5';
        this.fluidDynamics.updateEnergyPhysicsConfig({ pressureResponse: 0.5 });
    }

    // Reset Visual Controls to defaults
    const opacitySlider = document.getElementById('headerFluidDynamicsOpacitySlider');
    const opacityValue = document.getElementById('headerFluidDynamicsOpacityValue');
    if (opacitySlider && opacityValue) {
        opacitySlider.value = '1.0';
        opacityValue.textContent = '1.0';
        this.fluidDynamics.setOpacity(1.0);
    }

    const saturationSlider = document.getElementById('headerFluidDynamicsSaturationSlider');
    const saturationValue = document.getElementById('headerFluidDynamicsSaturationValue');
    if (saturationSlider && saturationValue) {
        saturationSlider.value = '1.0';
        saturationValue.textContent = '1.0';
        this.fluidDynamics.setSaturation(1.0);
    }

    const speedSlider = document.getElementById('headerFluidDynamicsSpeedSlider');
    const speedValue = document.getElementById('headerFluidDynamicsSpeedValue');
    if (speedSlider && speedValue) {
        speedSlider.value = '1.0';
        speedValue.textContent = '1.0';
        this.fluidDynamics.setSpeed(1.0);
    }

    // Reset Beat React to default (On)
    this.fluidDynamics.setBeatReact(true);
    const beatReactBtn = document.getElementById('headerFluidDynamicsBeatReactBtn');
    if (beatReactBtn) {
        beatReactBtn.textContent = 'Beat React: On';
        beatReactBtn.classList.add('active');
    }

};

// Apply Ambient Preset - purple scheme, all sliders minimum
FrequeVisualizer.prototype.applyFluidDynamicsAmbientPreset = function() {
        // Set color scheme to Jerry (purple)
        const colorSchemeDropdown = document.getElementById('headerFluidDynamicsColorScheme');
        if (colorSchemeDropdown) {
            colorSchemeDropdown.value = 'jerry';
            this.fluidDynamics.setColorScheme('jerry');
        }

        // Set all physics sliders to minimum values
        const energySensitivitySlider = document.getElementById('headerFluidDynamicsEnergySensitivitySlider');
        const energySensitivityValue = document.getElementById('headerFluidDynamicsEnergySensitivityValue');
        if (energySensitivitySlider && energySensitivityValue) {
            energySensitivitySlider.value = '0.1';
            energySensitivityValue.textContent = '0.1';
            this.fluidDynamics.updateEnergyPhysicsConfig({ energySensitivity: 0.1 });
        }

        const viscosityResponseSlider = document.getElementById('headerFluidDynamicsViscosityResponseSlider');
        const viscosityResponseValue = document.getElementById('headerFluidDynamicsViscosityResponseValue');
        if (viscosityResponseSlider && viscosityResponseValue) {
            viscosityResponseSlider.value = '0.5';
            viscosityResponseValue.textContent = '0.5';
            this.fluidDynamics.updateEnergyPhysicsConfig({ viscosityResponse: 0.5 });
        }

        const curlResponseSlider = document.getElementById('headerFluidDynamicsCurlResponseSlider');
        const curlResponseValue = document.getElementById('headerFluidDynamicsCurlResponseValue');
        if (curlResponseSlider && curlResponseValue) {
            curlResponseSlider.value = '1.0';
            curlResponseValue.textContent = '1.0';
            this.fluidDynamics.updateEnergyPhysicsConfig({ curlResponse: 1.0 });
        }

        const pressureResponseSlider = document.getElementById('headerFluidDynamicsPressureResponseSlider');
        const pressureResponseValue = document.getElementById('headerFluidDynamicsPressureResponseValue');
        if (pressureResponseSlider && pressureResponseValue) {
            pressureResponseSlider.value = '0.1';
            pressureResponseValue.textContent = '0.1';
            this.fluidDynamics.updateEnergyPhysicsConfig({ pressureResponse: 0.1 });
        }

        // Set visual controls to calm settings
        const opacitySlider = document.getElementById('headerFluidDynamicsOpacitySlider');
        const opacityValue = document.getElementById('headerFluidDynamicsOpacityValue');
        if (opacitySlider && opacityValue) {
            opacitySlider.value = '0.8';
            opacityValue.textContent = '0.8';
            this.fluidDynamics.setOpacity(0.8);
        }

        const saturationSlider = document.getElementById('headerFluidDynamicsSaturationSlider');
        const saturationValue = document.getElementById('headerFluidDynamicsSaturationValue');
        if (saturationSlider && saturationValue) {
            saturationSlider.value = '0.7';
            saturationValue.textContent = '0.7';
            this.fluidDynamics.setSaturation(0.7);
        }

        const speedSlider = document.getElementById('headerFluidDynamicsSpeedSlider');
        const speedValue = document.getElementById('headerFluidDynamicsSpeedValue');
        if (speedSlider && speedValue) {
            speedSlider.value = '0.5';
            speedValue.textContent = '0.5';
            this.fluidDynamics.setSpeed(0.5);
        }

    }

// Apply Metal Preset - fire scheme, all sliders maximum
FrequeVisualizer.prototype.applyFluidDynamicsMetalPreset = function() {
        // Set color scheme to Fire (red/orange/yellow)
        const colorSchemeDropdown = document.getElementById('headerFluidDynamicsColorScheme');
        if (colorSchemeDropdown) {
            colorSchemeDropdown.value = 'fire';
            this.fluidDynamics.setColorScheme('fire');
        }

        // Set all physics sliders to maximum values
        const energySensitivitySlider = document.getElementById('headerFluidDynamicsEnergySensitivitySlider');
        const energySensitivityValue = document.getElementById('headerFluidDynamicsEnergySensitivityValue');
        if (energySensitivitySlider && energySensitivityValue) {
            energySensitivitySlider.value = '3.0';
            energySensitivityValue.textContent = '3.0';
            this.fluidDynamics.updateEnergyPhysicsConfig({ energySensitivity: 3.0 });
        }

        const viscosityResponseSlider = document.getElementById('headerFluidDynamicsViscosityResponseSlider');
        const viscosityResponseValue = document.getElementById('headerFluidDynamicsViscosityResponseValue');
        if (viscosityResponseSlider && viscosityResponseValue) {
            viscosityResponseSlider.value = '4.0';
            viscosityResponseValue.textContent = '4.0';
            this.fluidDynamics.updateEnergyPhysicsConfig({ viscosityResponse: 4.0 });
        }

        const curlResponseSlider = document.getElementById('headerFluidDynamicsCurlResponseSlider');
        const curlResponseValue = document.getElementById('headerFluidDynamicsCurlResponseValue');
        if (curlResponseSlider && curlResponseValue) {
            curlResponseSlider.value = '5.0';
            curlResponseValue.textContent = '5.0';
            this.fluidDynamics.updateEnergyPhysicsConfig({ curlResponse: 5.0 });
        }

        const pressureResponseSlider = document.getElementById('headerFluidDynamicsPressureResponseSlider');
        const pressureResponseValue = document.getElementById('headerFluidDynamicsPressureResponseValue');
        if (pressureResponseSlider && pressureResponseValue) {
            pressureResponseSlider.value = '0.6';
            pressureResponseValue.textContent = '0.6';
            this.fluidDynamics.updateEnergyPhysicsConfig({ pressureResponse: 0.6 });
        }

        // Set visual controls to intense settings
        const opacitySlider = document.getElementById('headerFluidDynamicsOpacitySlider');
        const opacityValue = document.getElementById('headerFluidDynamicsOpacityValue');
        if (opacitySlider && opacityValue) {
            opacitySlider.value = '1.0';
            opacityValue.textContent = '1.0';
            this.fluidDynamics.setOpacity(1.0);
        }

        const saturationSlider = document.getElementById('headerFluidDynamicsSaturationSlider');
        const saturationValue = document.getElementById('headerFluidDynamicsSaturationValue');
        if (saturationSlider && saturationValue) {
            saturationSlider.value = '2.0';
            saturationValue.textContent = '2.0';
            this.fluidDynamics.setSaturation(2.0);
        }

        const speedSlider = document.getElementById('headerFluidDynamicsSpeedSlider');
        const speedValue = document.getElementById('headerFluidDynamicsSpeedValue');
        if (speedSlider && speedValue) {
            speedSlider.value = '2.5';
            speedValue.textContent = '2.5';
            this.fluidDynamics.setSpeed(2.5);
        }

    };

// Apply Random Preset - randomize all fluid settings
FrequeVisualizer.prototype.applyFluidDynamicsRandomPreset = function() {
    // Generate random number of colors (3-7 slots)
    const numColors = Math.floor(Math.random() * 5) + 3; // 3-7 colors
    const randomColors = [];
    
    // Generate random RGB colors for each slot
    for (let i = 0; i < numColors; i++) {
        randomColors.push([
            Math.floor(Math.random() * 256), // R: 0-255
            Math.floor(Math.random() * 256), // G: 0-255
            Math.floor(Math.random() * 256)  // B: 0-255
        ]);
    }
    
    // Apply custom color palette to fluid dynamics
    if (this.fluidDynamics && this.fluidDynamics.setCustomColors) {
        this.fluidDynamics.setCustomColors(randomColors);
    }
    
    // Set dropdown to indicate custom colors are being used
    const colorSchemeDropdown = document.getElementById('headerFluidDynamicsColorScheme');
    if (colorSchemeDropdown) {
        colorSchemeDropdown.value = 'vibrant'; // Just use any value as placeholder
    }

    // Randomize physics sliders
    const energySensitivity = (Math.random() * 2.9 + 0.1).toFixed(1); // 0.1-3.0
    const energySensitivitySlider = document.getElementById('headerFluidDynamicsEnergySensitivitySlider');
    const energySensitivityValue = document.getElementById('headerFluidDynamicsEnergySensitivityValue');
    if (energySensitivitySlider && energySensitivityValue) {
        energySensitivitySlider.value = energySensitivity;
        energySensitivityValue.textContent = energySensitivity;
        this.fluidDynamics.updateEnergyPhysicsConfig({ energySensitivity: parseFloat(energySensitivity) });
    }

    const viscosityResponse = (Math.random() * 3.5 + 0.5).toFixed(1); // 0.5-4.0
    const viscosityResponseSlider = document.getElementById('headerFluidDynamicsViscosityResponseSlider');
    const viscosityResponseValue = document.getElementById('headerFluidDynamicsViscosityResponseValue');
    if (viscosityResponseSlider && viscosityResponseValue) {
        viscosityResponseSlider.value = viscosityResponse;
        viscosityResponseValue.textContent = viscosityResponse;
        this.fluidDynamics.updateEnergyPhysicsConfig({ viscosityResponse: parseFloat(viscosityResponse) });
    }

    const curlResponse = (Math.random() * 4.0 + 1.0).toFixed(1); // 1.0-5.0
    const curlResponseSlider = document.getElementById('headerFluidDynamicsCurlResponseSlider');
    const curlResponseValue = document.getElementById('headerFluidDynamicsCurlResponseValue');
    if (curlResponseSlider && curlResponseValue) {
        curlResponseSlider.value = curlResponse;
        curlResponseValue.textContent = curlResponse;
        this.fluidDynamics.updateEnergyPhysicsConfig({ curlResponse: parseFloat(curlResponse) });
    }

    const pressureResponse = (Math.random() * 0.9 + 0.1).toFixed(1); // 0.1-1.0
    const pressureResponseSlider = document.getElementById('headerFluidDynamicsPressureResponseSlider');
    const pressureResponseValue = document.getElementById('headerFluidDynamicsPressureResponseValue');
    if (pressureResponseSlider && pressureResponseValue) {
        pressureResponseSlider.value = pressureResponse;
        pressureResponseValue.textContent = pressureResponse;
        this.fluidDynamics.updateEnergyPhysicsConfig({ pressureResponse: parseFloat(pressureResponse) });
    }

    // Randomize visual controls
    const saturation = (Math.random() * 2.0).toFixed(1); // 0.0-2.0
    const saturationSlider = document.getElementById('headerFluidDynamicsSaturationSlider');
    const saturationValue = document.getElementById('headerFluidDynamicsSaturationValue');
    if (saturationSlider && saturationValue) {
        saturationSlider.value = saturation;
        saturationValue.textContent = saturation;
        this.fluidDynamics.setSaturation(parseFloat(saturation));
    }

    const speed = (Math.random() * 2.9 + 0.1).toFixed(1); // 0.1-3.0
    const speedSlider = document.getElementById('headerFluidDynamicsSpeedSlider');
    const speedValue = document.getElementById('headerFluidDynamicsSpeedValue');
    if (speedSlider && speedValue) {
        speedSlider.value = speed;
        speedValue.textContent = speed;
        this.fluidDynamics.setSpeed(parseFloat(speed));
    }

};

// Fluid Preset Management Methods
FrequeVisualizer.prototype.loadFluidPresets = function() {
    try {
        const saved = localStorage.getItem('MVpro_fluid_presets');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error('Error loading fluid presets:', e);
        return [];
    }
};

FrequeVisualizer.prototype.saveFluidPresets = function() {
    try {
        localStorage.setItem('MVpro_fluid_presets', JSON.stringify(this.savedFluidPresets));
    } catch (e) {
        console.error('Error saving fluid presets:', e);
    }
};

FrequeVisualizer.prototype.getCurrentFluidConfig = function() {
    const config = {};
    
    // Get current color scheme
    const colorSchemeDropdown = document.getElementById('headerFluidDynamicsColorScheme');
    config.colorScheme = colorSchemeDropdown ? colorSchemeDropdown.value : 'vibrant';
    
    // Get custom colors if available
    if (this.fluidDynamics && this.fluidDynamics.currentCustomColors) {
        config.customColors = this.fluidDynamics.currentCustomColors;
    }
    
    // Get physics settings
    const energySensitivitySlider = document.getElementById('headerFluidDynamicsEnergySensitivitySlider');
    config.energySensitivity = energySensitivitySlider ? parseFloat(energySensitivitySlider.value) : 1.0;
    
    const viscosityResponseSlider = document.getElementById('headerFluidDynamicsViscosityResponseSlider');
    config.viscosityResponse = viscosityResponseSlider ? parseFloat(viscosityResponseSlider.value) : 2.0;
    
    const curlResponseSlider = document.getElementById('headerFluidDynamicsCurlResponseSlider');
    config.curlResponse = curlResponseSlider ? parseFloat(curlResponseSlider.value) : 3.0;
    
    const pressureResponseSlider = document.getElementById('headerFluidDynamicsPressureResponseSlider');
    config.pressureResponse = pressureResponseSlider ? parseFloat(pressureResponseSlider.value) : 0.5;
    
    // Get visual controls
    const opacitySlider = document.getElementById('headerFluidDynamicsOpacitySlider');
    config.opacity = opacitySlider ? parseFloat(opacitySlider.value) : 1.0;
    
    const saturationSlider = document.getElementById('headerFluidDynamicsSaturationSlider');
    config.saturation = saturationSlider ? parseFloat(saturationSlider.value) : 1.0;
    
    const speedSlider = document.getElementById('headerFluidDynamicsSpeedSlider');
    config.speed = speedSlider ? parseFloat(speedSlider.value) : 1.0;
    
    // Get beat react state
    config.beatReact = this.fluidDynamics ? this.fluidDynamics.beatReactEnabled : true;
    
    return config;
};

FrequeVisualizer.prototype.saveCurrentFluidPreset = function() {
    const name = prompt('Enter preset name:', `Fluid Preset ${this.savedFluidPresets.length + 1}`);
    if (!name) return;
    
    const preset = {
        name: name,
        timestamp: Date.now(),
        config: this.getCurrentFluidConfig()
    };
    
    this.savedFluidPresets.push(preset);
    if (this.savedFluidPresets.length > 20) {
        this.savedFluidPresets.shift(); // Remove oldest
    }
    
    this.saveFluidPresets();
    this.updateFluidPresetSelector();
};

FrequeVisualizer.prototype.loadFluidPreset = function(index) {
    if (index < 0 || index >= this.savedFluidPresets.length) return;
    
    const preset = this.savedFluidPresets[index];
    if (!preset || !preset.config) return;
    
    const config = preset.config;
    
    // Apply color scheme
    const colorSchemeDropdown = document.getElementById('headerFluidDynamicsColorScheme');
    if (colorSchemeDropdown && config.colorScheme) {
        colorSchemeDropdown.value = config.colorScheme;
        this.fluidDynamics.setColorScheme(config.colorScheme);
    }
    
    // Apply custom colors if available
    if (config.customColors && this.fluidDynamics && this.fluidDynamics.setCustomColors) {
        this.fluidDynamics.setCustomColors(config.customColors);
    }
    
    // Apply physics settings
    if (config.energySensitivity !== undefined) {
        const slider = document.getElementById('headerFluidDynamicsEnergySensitivitySlider');
        const value = document.getElementById('headerFluidDynamicsEnergySensitivityValue');
        if (slider && value) {
            slider.value = config.energySensitivity;
            value.textContent = config.energySensitivity.toFixed(1);
            this.fluidDynamics.updateEnergyPhysicsConfig({ energySensitivity: config.energySensitivity });
        }
    }
    
    if (config.viscosityResponse !== undefined) {
        const slider = document.getElementById('headerFluidDynamicsViscosityResponseSlider');
        const value = document.getElementById('headerFluidDynamicsViscosityResponseValue');
        if (slider && value) {
            slider.value = config.viscosityResponse;
            value.textContent = config.viscosityResponse.toFixed(1);
            this.fluidDynamics.updateEnergyPhysicsConfig({ viscosityResponse: config.viscosityResponse });
        }
    }
    
    if (config.curlResponse !== undefined) {
        const slider = document.getElementById('headerFluidDynamicsCurlResponseSlider');
        const value = document.getElementById('headerFluidDynamicsCurlResponseValue');
        if (slider && value) {
            slider.value = config.curlResponse;
            value.textContent = config.curlResponse.toFixed(1);
            this.fluidDynamics.updateEnergyPhysicsConfig({ curlResponse: config.curlResponse });
        }
    }
    
    if (config.pressureResponse !== undefined) {
        const slider = document.getElementById('headerFluidDynamicsPressureResponseSlider');
        const value = document.getElementById('headerFluidDynamicsPressureResponseValue');
        if (slider && value) {
            slider.value = config.pressureResponse;
            value.textContent = config.pressureResponse.toFixed(1);
            this.fluidDynamics.updateEnergyPhysicsConfig({ pressureResponse: config.pressureResponse });
        }
    }
    
    // Apply visual controls
    if (config.opacity !== undefined) {
        const slider = document.getElementById('headerFluidDynamicsOpacitySlider');
        const value = document.getElementById('headerFluidDynamicsOpacityValue');
        if (slider && value) {
            slider.value = config.opacity;
            value.textContent = config.opacity.toFixed(1);
            this.fluidDynamics.setOpacity(config.opacity);
        }
    }
    
    if (config.saturation !== undefined) {
        const slider = document.getElementById('headerFluidDynamicsSaturationSlider');
        const value = document.getElementById('headerFluidDynamicsSaturationValue');
        if (slider && value) {
            slider.value = config.saturation;
            value.textContent = config.saturation.toFixed(1);
            this.fluidDynamics.setSaturation(config.saturation);
        }
    }
    
    if (config.speed !== undefined) {
        const slider = document.getElementById('headerFluidDynamicsSpeedSlider');
        const value = document.getElementById('headerFluidDynamicsSpeedValue');
        if (slider && value) {
            slider.value = config.speed;
            value.textContent = config.speed.toFixed(1);
            this.fluidDynamics.setSpeed(config.speed);
        }
    }
    
    // Apply beat react
    if (config.beatReact !== undefined) {
        this.fluidDynamics.setBeatReact(config.beatReact);
        const beatReactBtn = document.getElementById('headerFluidDynamicsBeatReactBtn');
        if (beatReactBtn) {
            beatReactBtn.textContent = `Beat React: ${config.beatReact ? 'On' : 'Off'}`;
            beatReactBtn.classList.toggle('active', config.beatReact);
        }
    }
    
};

FrequeVisualizer.prototype.updateFluidPresetSelector = function() {
    const selector = document.getElementById('headerFluidDynamicsPresetSelector');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">Load Preset...</option>';
    this.savedFluidPresets.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = preset.name;
        selector.appendChild(option);
    });
    
    // Update mixer preset selector
    if (window.multiDisplayManager && window.multiDisplayManager.updateMixerFluidityPresetSelector) {
        window.multiDisplayManager.updateMixerFluidityPresetSelector();
    }
};

FrequeVisualizer.prototype.exportFluidPresets = function() {
    try {
        const dataStr = JSON.stringify(this.savedFluidPresets, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `MVpro_fluid_presets_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Error exporting fluid presets:', e);
        alert('Failed to export fluid presets');
    }
};

FrequeVisualizer.prototype.importFluidPresets = function(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                const confirmed = confirm(`Import ${imported.length} fluid presets? This will replace your current presets.`);
                if (confirmed) {
                    this.savedFluidPresets = imported;
                    this.saveFluidPresets();
                    this.updateFluidPresetSelector();
                }
            } else {
                alert('Invalid fluid preset file format');
            }
        } catch (error) {
            console.error('Error importing fluid presets:', error);
            alert('Failed to import fluid presets: Invalid file');
        }
    };
    reader.readAsText(file);
};
});

// ========== KALEIDOSCOPE MIXER EVENT HANDLERS ==========
// Add Kaleidoscope mixer event handlers after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for MultiDisplayManager to be ready
    setTimeout(() => {
        if (window.multiDisplayManager && window.visualizer) {
            // Mixer Kaleidoscope Video Toggle
            const mixerKaleidoscopeVideoToggle = document.getElementById('mixerKaleidoscopeVideoToggle');
            if (mixerKaleidoscopeVideoToggle) {
                mixerKaleidoscopeVideoToggle.addEventListener('click', () => {
                    // Toggle the state
                    window.visualizer.kaleidoscopeApplyToVideo = !window.visualizer.kaleidoscopeApplyToVideo;
                    
                    // Update both UIs
                    window.multiDisplayManager.updateMixerKaleidoscopeVideoToggle();
                    
                    // Update header button
                    const headerBtn = document.getElementById('headerKaleidoscopeVideoBtn');
                    if (headerBtn) {
                        headerBtn.textContent = `Apply to Video: ${window.visualizer.kaleidoscopeApplyToVideo ? 'On' : 'Off'}`;
                        headerBtn.classList.toggle('active', window.visualizer.kaleidoscopeApplyToVideo);
                    }
                    
                    // Call kaleidoscope logic
                    window.visualizer.updateKaleidoscopeButtonState();
                    if (window.visualizer.kaleidoscopeApplyToVideo && !window.visualizer.kaleidoscopeEnabled) {
                        window.visualizer.kaleidoscopeEnabled = true;
                        window.visualizer.initKaleidoscope();
                        window.visualizer.startKaleidoscopeAnimation();
                    }
                });
            }

            // Mixer Kaleidoscope Viz Toggle
            const mixerKaleidoscopeVizToggle = document.getElementById('mixerKaleidoscopeVizToggle');
            if (mixerKaleidoscopeVizToggle) {
                mixerKaleidoscopeVizToggle.addEventListener('click', () => {
                    // Toggle the state
                    window.visualizer.kaleidoscopeApplyToViz = !window.visualizer.kaleidoscopeApplyToViz;
                    
                    // Update both UIs
                    window.multiDisplayManager.updateMixerKaleidoscopeVizToggle();
                    
                    // Update header button
                    const headerBtn = document.getElementById('headerKaleidoscopeVizBtn');
                    if (headerBtn) {
                        headerBtn.textContent = `Apply to Viz: ${window.visualizer.kaleidoscopeApplyToViz ? 'On' : 'Off'}`;
                        headerBtn.classList.toggle('active', window.visualizer.kaleidoscopeApplyToViz);
                    }
                    
                    // Call kaleidoscope logic
                    window.visualizer.updateKaleidoscopeButtonState();
                    if (window.visualizer.kaleidoscopeApplyToViz && !window.visualizer.kaleidoscopeEnabled) {
                        window.visualizer.kaleidoscopeEnabled = true;
                        window.visualizer.initKaleidoscope();
                        window.visualizer.startKaleidoscopeAnimation();
                    }
                });
            }

            // Mixer Kaleidoscope Infinite Zoom Toggle
            const mixerKaleidoscopeInfiniteZoomToggle = document.getElementById('mixerKaleidoscopeInfiniteZoomToggle');
            if (mixerKaleidoscopeInfiniteZoomToggle) {
                mixerKaleidoscopeInfiniteZoomToggle.addEventListener('click', () => {
                    // Toggle the state
                    window.visualizer.kaleidoscopeApplyToInfiniteZoom = !window.visualizer.kaleidoscopeApplyToInfiniteZoom;
                    
                    // Update both UIs
                    window.multiDisplayManager.updateMixerKaleidoscopeInfiniteZoomToggle();
                    
                    // Update header button
                    const headerBtn = document.getElementById('headerKaleidoscopeInfiniteZoomBtn');
                    if (headerBtn) {
                        headerBtn.textContent = `Infinite Zoom: ${window.visualizer.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'}`;
                        headerBtn.classList.toggle('active', window.visualizer.kaleidoscopeApplyToInfiniteZoom);
                    }
                    
                    // Call kaleidoscope logic
                    window.visualizer.updateKaleidoscopeButtonState();
                    if (window.visualizer.kaleidoscopeApplyToInfiniteZoom && !window.visualizer.kaleidoscopeEnabled) {
                        window.visualizer.kaleidoscopeEnabled = true;
                        window.visualizer.initKaleidoscope();
                        window.visualizer.startKaleidoscopeAnimation();
                    }
                });
            }

            // Mixer Kaleidoscope WebGL Toggle
            const mixerKaleidoscopeWebGLToggle = document.getElementById('mixerKaleidoscopeWebGLToggle');
            if (mixerKaleidoscopeWebGLToggle) {
                mixerKaleidoscopeWebGLToggle.addEventListener('click', () => {
                    // Check WebGL support
                    if (window.visualizer.webglVisualization && !window.visualizer.webglVisualization.webglSupported) {
                        console.warn('🎮 Kaleidoscope: WebGL not supported');
                        alert('WebGL not supported. Check Browser settings.');
                        return;
                    }
                    
                    // Toggle the state
                    window.visualizer.kaleidoscopeApplyToWebGL = !window.visualizer.kaleidoscopeApplyToWebGL;
                    
                    // Update both UIs
                    window.multiDisplayManager.updateMixerKaleidoscopeWebGLToggle();
                    
                    // Update header button
                    const headerBtn = document.getElementById('headerKaleidoscopeWebGLBtn');
                    if (headerBtn) {
                        headerBtn.textContent = `WebGL: ${window.visualizer.kaleidoscopeApplyToWebGL ? 'On' : 'Off'}`;
                        headerBtn.classList.toggle('active', window.visualizer.kaleidoscopeApplyToWebGL);
                    }
                    
                    // Call kaleidoscope logic
                    window.visualizer.updateKaleidoscopeButtonState();
                    if (window.visualizer.kaleidoscopeApplyToWebGL && !window.visualizer.kaleidoscopeEnabled) {
                        window.visualizer.kaleidoscopeEnabled = true;
                        window.visualizer.initKaleidoscope();
                        window.visualizer.startKaleidoscopeAnimation();
                    }
                });
            }

            // Mixer Kaleidoscope Fluid Toggle
            const mixerKaleidoscopeFluidToggle = document.getElementById('mixerKaleidoscopeFluidToggle');
            if (mixerKaleidoscopeFluidToggle) {
                mixerKaleidoscopeFluidToggle.addEventListener('click', () => {
                    // Check Fluid Dynamics support
                    if (!window.visualizer.fluidDynamics || !window.visualizer.fluidDynamics.canvas) {
                        console.warn('🔮 Kaleidoscope: Fluid Dynamics not available');
                        alert('Fluid Dynamics not available. Please ensure Fluid Dynamics is enabled.');
                        return;
                    }
                    
                    // Toggle the state
                    window.visualizer.kaleidoscopeApplyToFluidDynamics = !window.visualizer.kaleidoscopeApplyToFluidDynamics;
                    
                    // Update both UIs
                    window.multiDisplayManager.updateMixerKaleidoscopeFluidToggle();
                    
                    // Update header button
                    const headerBtn = document.getElementById('headerKaleidoscopeFluidBtn');
                    if (headerBtn) {
                        headerBtn.textContent = `Fluid: ${window.visualizer.kaleidoscopeApplyToFluidDynamics ? 'On' : 'Off'}`;
                        headerBtn.classList.toggle('active', window.visualizer.kaleidoscopeApplyToFluidDynamics);
                    }
                    
                    // Call kaleidoscope logic
                    window.visualizer.updateKaleidoscopeButtonState();
                    if (window.visualizer.kaleidoscopeApplyToFluidDynamics && !window.visualizer.kaleidoscopeEnabled) {
                        window.visualizer.kaleidoscopeEnabled = true;
                        window.visualizer.initKaleidoscope();
                        window.visualizer.startKaleidoscopeAnimation();
                    }
                });
            }
            
            // Mixer Kaleidoscope Nebula Toggle
            const mixerKaleidoscopeNebulaToggle = document.getElementById('mixerKaleidoscopeNebulaToggle');
            if (mixerKaleidoscopeNebulaToggle) {
                mixerKaleidoscopeNebulaToggle.addEventListener('click', () => {
                    // Check Nebula support
                    if (!window.visualizer.nebulaVisualization || !window.visualizer.nebulaVisualization.canvas) {
                        console.warn('🔮 Kaleidoscope: Nebula not available');
                        alert('Nebula not available. Please ensure Nebula is enabled.');
                        return;
                    }
                    
                    // Toggle the state
                    window.visualizer.kaleidoscopeApplyToNebula = !window.visualizer.kaleidoscopeApplyToNebula;
                    
                    // Update both UIs
                    window.multiDisplayManager.updateMixerKaleidoscopeNebulaToggle();
                    
                    // Update header button
                    const headerBtn = document.getElementById('headerKaleidoscopeNebulaBtn');
                    if (headerBtn) {
                        headerBtn.textContent = `Nebula: ${window.visualizer.kaleidoscopeApplyToNebula ? 'On' : 'Off'}`;
                        headerBtn.classList.toggle('active', window.visualizer.kaleidoscopeApplyToNebula);
                    }
                    
                    // Call kaleidoscope logic
                    window.visualizer.updateKaleidoscopeButtonState();
                    if (window.visualizer.kaleidoscopeApplyToNebula && !window.visualizer.kaleidoscopeEnabled) {
                        window.visualizer.kaleidoscopeEnabled = true;
                        window.visualizer.initKaleidoscope();
                        window.visualizer.startKaleidoscopeAnimation();
                    }
                });
            }

            // ========================================
            // MIXER DISPLAY CONTROLS
            // ========================================

            // Display 1 Capture Toggles
            const display1CaptureVideoToggle = document.getElementById('mixerDisplay1CaptureVideoToggle');
            if (display1CaptureVideoToggle) {
                display1CaptureVideoToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display1CaptureVideoBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display1CaptureVizToggle = document.getElementById('mixerDisplay1CaptureVizToggle');
            if (display1CaptureVizToggle) {
                display1CaptureVizToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display1CaptureVizBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display1CaptureKaleidoscopeToggle = document.getElementById('mixerDisplay1CaptureKaleidoscopeToggle');
            if (display1CaptureKaleidoscopeToggle) {
                display1CaptureKaleidoscopeToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display1CaptureKaleidoscopeBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display1CaptureInfiniteZoomToggle = document.getElementById('mixerDisplay1CaptureInfiniteZoomToggle');
            if (display1CaptureInfiniteZoomToggle) {
                display1CaptureInfiniteZoomToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display1CaptureInfiniteZoomBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display1CaptureWebGLToggle = document.getElementById('mixerDisplay1CaptureWebGLToggle');
            if (display1CaptureWebGLToggle) {
                display1CaptureWebGLToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display1CaptureWebGLBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display1CaptureFluidDynamicsToggle = document.getElementById('mixerDisplay1CaptureFluidDynamicsToggle');
            if (display1CaptureFluidDynamicsToggle) {
                display1CaptureFluidDynamicsToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display1CaptureFluidDynamicsBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            // Display 1 Preset Buttons
            const display1PresetCinema = document.getElementById('mixerDisplay1PresetCinema');
            if (display1PresetCinema) {
                display1PresetCinema.addEventListener('click', () => {
                    const footerBtn = document.querySelector('[data-preset="cinema"]');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display1PresetSocial = document.getElementById('mixerDisplay1PresetSocial');
            if (display1PresetSocial) {
                display1PresetSocial.addEventListener('click', () => {
                    const footerBtn = document.querySelector('[data-preset="social"]');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display1PresetPerformance = document.getElementById('mixerDisplay1PresetPerformance');
            if (display1PresetPerformance) {
                display1PresetPerformance.addEventListener('click', () => {
                    const footerBtn = document.querySelector('[data-preset="performance"]');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display1PresetProjector = document.getElementById('mixerDisplay1PresetProjector');
            if (display1PresetProjector) {
                display1PresetProjector.addEventListener('click', () => {
                    const footerBtn = document.querySelector('[data-preset="projector"]');
                    if (footerBtn) footerBtn.click();
                });
            }

            // Display 1 Mode Buttons
            const display1ModeFit = document.getElementById('mixerDisplay1ModeFit');
            if (display1ModeFit) {
                display1ModeFit.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display1', 'fit');
                    window.visualizer.updateMixerDisplay1ModeButtons('fit');
                });
            }

            const display1ModeFill = document.getElementById('mixerDisplay1ModeFill');
            if (display1ModeFill) {
                display1ModeFill.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display1', 'fill');
                    window.visualizer.updateMixerDisplay1ModeButtons('fill');
                });
            }

            const display1ModeStretch = document.getElementById('mixerDisplay1ModeStretch');
            if (display1ModeStretch) {
                display1ModeStretch.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display1', 'stretch');
                    window.visualizer.updateMixerDisplay1ModeButtons('stretch');
                });
            }

            const display1ModeOriginal = document.getElementById('mixerDisplay1ModeOriginal');
            if (display1ModeOriginal) {
                display1ModeOriginal.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display1', 'original');
                    window.visualizer.updateMixerDisplay1ModeButtons('original');
                });
            }

            // Display 1 Stream Settings
            const display1ResolutionSelect = document.getElementById('mixerDisplay1ResolutionSelect');
            if (display1ResolutionSelect) {
                display1ResolutionSelect.addEventListener('change', (e) => {
                    const footerSelect = document.getElementById('display1ResolutionSelect');
                    if (footerSelect) {
                        footerSelect.value = e.target.value;
                        footerSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

            const display1FrameRateSelect = document.getElementById('mixerDisplay1FrameRateSelect');
            if (display1FrameRateSelect) {
                display1FrameRateSelect.addEventListener('change', (e) => {
                    const footerSelect = document.getElementById('display1FrameRateSelect');
                    if (footerSelect) {
                        footerSelect.value = e.target.value;
                        footerSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

            const display1VideoQualitySelect = document.getElementById('mixerDisplay1VideoQualitySelect');
            if (display1VideoQualitySelect) {
                display1VideoQualitySelect.addEventListener('change', (e) => {
                    const footerSelect = document.getElementById('display1VideoQualitySelect');
                    if (footerSelect) {
                        footerSelect.value = e.target.value;
                        footerSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

            // Display 1 Enhancement Controls
            const display1SharpnessSlider = document.getElementById('mixerDisplay1SharpnessSlider');
            if (display1SharpnessSlider) {
                display1SharpnessSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    window.visualizer.setDisplaySharpness('display1', value);
                    
                    // Update mixer value display
                    const valueDisplay = document.getElementById('mixerDisplay1SharpnessValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = `${value}%`;
                    }
                    
                    // Sync with footer
                    const footerSlider = document.getElementById('display1Sharpness');
                    if (footerSlider) {
                        footerSlider.value = value;
                        footerSlider.dispatchEvent(new Event('input'));
                    }
                });
            }

            const display1LetterboxColorPicker = document.getElementById('mixerDisplay1LetterboxColorPicker');
            if (display1LetterboxColorPicker) {
                display1LetterboxColorPicker.addEventListener('change', (e) => {
                    const color = e.target.value;
                    window.visualizer.setDisplayLetterboxColor('display1', color);
                    
                    // Update mixer value display
                    const valueDisplay = document.getElementById('mixerDisplay1LetterboxColorValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = color;
                    }
                    
                    // Sync with footer
                    const footerPicker = document.getElementById('display1LetterboxColor');
                    if (footerPicker) {
                        footerPicker.value = color;
                        footerPicker.dispatchEvent(new Event('change'));
                    }
                });
            }

            const display1MirrorBackgroundToggle = document.getElementById('mixerDisplay1MirrorBackgroundToggle');
            if (display1MirrorBackgroundToggle) {
                display1MirrorBackgroundToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display1MirrorBackgroundBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            // ========================================
            // DISPLAY 2 MIXER CONTROLS
            // ========================================

            // Display 2 Capture Toggles
            const display2CaptureVideoToggle = document.getElementById('mixerDisplay2CaptureVideoToggle');
            if (display2CaptureVideoToggle) {
                display2CaptureVideoToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display2CaptureVideoBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display2CaptureVizToggle = document.getElementById('mixerDisplay2CaptureVizToggle');
            if (display2CaptureVizToggle) {
                display2CaptureVizToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display2CaptureVizBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display2CaptureKaleidoscopeToggle = document.getElementById('mixerDisplay2CaptureKaleidoscopeToggle');
            if (display2CaptureKaleidoscopeToggle) {
                display2CaptureKaleidoscopeToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display2CaptureKaleidoscopeBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display2CaptureInfiniteZoomToggle = document.getElementById('mixerDisplay2CaptureInfiniteZoomToggle');
            if (display2CaptureInfiniteZoomToggle) {
                display2CaptureInfiniteZoomToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display2CaptureInfiniteZoomBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display2CaptureWebGLToggle = document.getElementById('mixerDisplay2CaptureWebGLToggle');
            if (display2CaptureWebGLToggle) {
                display2CaptureWebGLToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display2CaptureWebGLBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display2CaptureFluidDynamicsToggle = document.getElementById('mixerDisplay2CaptureFluidDynamicsToggle');
            if (display2CaptureFluidDynamicsToggle) {
                display2CaptureFluidDynamicsToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display2CaptureFluidDynamicsBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            // Display 2 Mode Buttons
            const display2ModeFit = document.getElementById('mixerDisplay2ModeFit');
            if (display2ModeFit) {
                display2ModeFit.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display2', 'fit');
                    window.visualizer.updateMixerDisplay2ModeButtons('fit');
                });
            }

            const display2ModeFill = document.getElementById('mixerDisplay2ModeFill');
            if (display2ModeFill) {
                display2ModeFill.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display2', 'fill');
                    window.visualizer.updateMixerDisplay2ModeButtons('fill');
                });
            }

            const display2ModeStretch = document.getElementById('mixerDisplay2ModeStretch');
            if (display2ModeStretch) {
                display2ModeStretch.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display2', 'stretch');
                    window.visualizer.updateMixerDisplay2ModeButtons('stretch');
                });
            }

            const display2ModeOriginal = document.getElementById('mixerDisplay2ModeOriginal');
            if (display2ModeOriginal) {
                display2ModeOriginal.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display2', 'original');
                    window.visualizer.updateMixerDisplay2ModeButtons('original');
                });
            }

            // Display 2 Stream Settings
            const display2ResolutionSelect = document.getElementById('mixerDisplay2ResolutionSelect');
            if (display2ResolutionSelect) {
                display2ResolutionSelect.addEventListener('change', (e) => {
                    const footerSelect = document.getElementById('display2ResolutionSelect');
                    if (footerSelect) {
                        footerSelect.value = e.target.value;
                        footerSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

            const display2FrameRateSelect = document.getElementById('mixerDisplay2FrameRateSelect');
            if (display2FrameRateSelect) {
                display2FrameRateSelect.addEventListener('change', (e) => {
                    const footerSelect = document.getElementById('display2FrameRateSelect');
                    if (footerSelect) {
                        footerSelect.value = e.target.value;
                        footerSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

            const display2VideoQualitySelect = document.getElementById('mixerDisplay2VideoQualitySelect');
            if (display2VideoQualitySelect) {
                display2VideoQualitySelect.addEventListener('change', (e) => {
                    const footerSelect = document.getElementById('display2VideoQualitySelect');
                    if (footerSelect) {
                        footerSelect.value = e.target.value;
                        footerSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

            // Display 2 Enhancement Controls
            const display2SharpnessSlider = document.getElementById('mixerDisplay2SharpnessSlider');
            if (display2SharpnessSlider) {
                display2SharpnessSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    window.visualizer.setDisplaySharpness('display2', value);
                    
                    // Update mixer value display
                    const valueDisplay = document.getElementById('mixerDisplay2SharpnessValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = `${value}%`;
                    }
                    
                    // Sync with footer
                    const footerSlider = document.getElementById('display2Sharpness');
                    if (footerSlider) {
                        footerSlider.value = value;
                        footerSlider.dispatchEvent(new Event('input'));
                    }
                });
            }

            const display2LetterboxColorPicker = document.getElementById('mixerDisplay2LetterboxColorPicker');
            if (display2LetterboxColorPicker) {
                display2LetterboxColorPicker.addEventListener('change', (e) => {
                    const color = e.target.value;
                    window.visualizer.setDisplayLetterboxColor('display2', color);
                    
                    // Update mixer value display
                    const valueDisplay = document.getElementById('mixerDisplay2LetterboxColorValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = color;
                    }
                    
                    // Sync with footer
                    const footerPicker = document.getElementById('display2LetterboxColor');
                    if (footerPicker) {
                        footerPicker.value = color;
                        footerPicker.dispatchEvent(new Event('change'));
                    }
                });
            }

            const display2MirrorBackgroundToggle = document.getElementById('mixerDisplay2MirrorBackgroundToggle');
            if (display2MirrorBackgroundToggle) {
                display2MirrorBackgroundToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display2MirrorBackgroundBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            // ========================================
            // DISPLAY 3 MIXER CONTROLS
            // ========================================

            // Display 3 Capture Toggles
            const display3CaptureVideoToggle = document.getElementById('mixerDisplay3CaptureVideoToggle');
            if (display3CaptureVideoToggle) {
                display3CaptureVideoToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display3CaptureVideoBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display3CaptureVizToggle = document.getElementById('mixerDisplay3CaptureVizToggle');
            if (display3CaptureVizToggle) {
                display3CaptureVizToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display3CaptureVizBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display3CaptureKaleidoscopeToggle = document.getElementById('mixerDisplay3CaptureKaleidoscopeToggle');
            if (display3CaptureKaleidoscopeToggle) {
                display3CaptureKaleidoscopeToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display3CaptureKaleidoscopeBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display3CaptureInfiniteZoomToggle = document.getElementById('mixerDisplay3CaptureInfiniteZoomToggle');
            if (display3CaptureInfiniteZoomToggle) {
                display3CaptureInfiniteZoomToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display3CaptureInfiniteZoomBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display3CaptureWebGLToggle = document.getElementById('mixerDisplay3CaptureWebGLToggle');
            if (display3CaptureWebGLToggle) {
                display3CaptureWebGLToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display3CaptureWebGLBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            const display3CaptureFluidDynamicsToggle = document.getElementById('mixerDisplay3CaptureFluidDynamicsToggle');
            if (display3CaptureFluidDynamicsToggle) {
                display3CaptureFluidDynamicsToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display3CaptureFluidDynamicsBtn');
                    if (footerBtn) footerBtn.click();
                });
            }

            // Display 3 Mode Buttons
            const display3ModeFit = document.getElementById('mixerDisplay3ModeFit');
            if (display3ModeFit) {
                display3ModeFit.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display3', 'fit');
                    window.visualizer.updateMixerDisplay3ModeButtons('fit');
                });
            }

            const display3ModeFill = document.getElementById('mixerDisplay3ModeFill');
            if (display3ModeFill) {
                display3ModeFill.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display3', 'fill');
                    window.visualizer.updateMixerDisplay3ModeButtons('fill');
                });
            }

            const display3ModeStretch = document.getElementById('mixerDisplay3ModeStretch');
            if (display3ModeStretch) {
                display3ModeStretch.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display3', 'stretch');
                    window.visualizer.updateMixerDisplay3ModeButtons('stretch');
                });
            }

            const display3ModeOriginal = document.getElementById('mixerDisplay3ModeOriginal');
            if (display3ModeOriginal) {
                display3ModeOriginal.addEventListener('click', () => {
                    window.visualizer.setDisplayMode('display3', 'original');
                    window.visualizer.updateMixerDisplay3ModeButtons('original');
                });
            }

            // Display 3 Stream Settings
            const display3ResolutionSelect = document.getElementById('mixerDisplay3ResolutionSelect');
            if (display3ResolutionSelect) {
                display3ResolutionSelect.addEventListener('change', (e) => {
                    const footerSelect = document.getElementById('display3ResolutionSelect');
                    if (footerSelect) {
                        footerSelect.value = e.target.value;
                        footerSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

            const display3FrameRateSelect = document.getElementById('mixerDisplay3FrameRateSelect');
            if (display3FrameRateSelect) {
                display3FrameRateSelect.addEventListener('change', (e) => {
                    const footerSelect = document.getElementById('display3FrameRateSelect');
                    if (footerSelect) {
                        footerSelect.value = e.target.value;
                        footerSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

            const display3VideoQualitySelect = document.getElementById('mixerDisplay3VideoQualitySelect');
            if (display3VideoQualitySelect) {
                display3VideoQualitySelect.addEventListener('change', (e) => {
                    const footerSelect = document.getElementById('display3VideoQualitySelect');
                    if (footerSelect) {
                        footerSelect.value = e.target.value;
                        footerSelect.dispatchEvent(new Event('change'));
                    }
                });
            }

            // Display 3 Enhancement Controls
            const display3SharpnessSlider = document.getElementById('mixerDisplay3SharpnessSlider');
            if (display3SharpnessSlider) {
                display3SharpnessSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    window.visualizer.setDisplaySharpness('display3', value);
                    
                    // Update mixer value display
                    const valueDisplay = document.getElementById('mixerDisplay3SharpnessValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = `${value}%`;
                    }
                    
                    // Sync with footer
                    const footerSlider = document.getElementById('display3Sharpness');
                    if (footerSlider) {
                        footerSlider.value = value;
                        footerSlider.dispatchEvent(new Event('input'));
                    }
                });
            }

            const display3LetterboxColorPicker = document.getElementById('mixerDisplay3LetterboxColorPicker');
            if (display3LetterboxColorPicker) {
                display3LetterboxColorPicker.addEventListener('change', (e) => {
                    const color = e.target.value;
                    window.visualizer.setDisplayLetterboxColor('display3', color);
                    
                    // Update mixer value display
                    const valueDisplay = document.getElementById('mixerDisplay3LetterboxColorValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = color;
                    }
                    
                    // Sync with footer
                    const footerPicker = document.getElementById('display3LetterboxColor');
                    if (footerPicker) {
                        footerPicker.value = color;
                        footerPicker.dispatchEvent(new Event('change'));
                    }
                });
            }

            const display3MirrorBackgroundToggle = document.getElementById('mixerDisplay3MirrorBackgroundToggle');
            if (display3MirrorBackgroundToggle) {
                display3MirrorBackgroundToggle.addEventListener('click', () => {
                    const footerBtn = document.getElementById('display3MirrorBackgroundBtn');
                    if (footerBtn) footerBtn.click();
                });
            }
        }
    }, 200);
});

// ========================================
// MIXER DISPLAY UPDATE METHODS
// ========================================

// Update mixer display mode buttons
FrequeVisualizer.prototype.updateMixerDisplay1ModeButtons = function(activeMode) {
    const modes = ['fit', 'fill', 'stretch', 'original'];
    modes.forEach(mode => {
        const btn = document.getElementById(`mixerDisplay1Mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
        if (btn) {
            if (mode === activeMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
};

FrequeVisualizer.prototype.updateMixerDisplay2ModeButtons = function(activeMode) {
    const modes = ['fit', 'fill', 'stretch', 'original'];
    modes.forEach(mode => {
        const btn = document.getElementById(`mixerDisplay2Mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
        if (btn) {
            if (mode === activeMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
};

FrequeVisualizer.prototype.updateMixerDisplay3ModeButtons = function(activeMode) {
    const modes = ['fit', 'fill', 'stretch', 'original'];
    modes.forEach(mode => {
        const btn = document.getElementById(`mixerDisplay3Mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
        if (btn) {
            if (mode === activeMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
};


