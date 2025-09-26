class SpectrumAnalyzer {
    constructor(container, options = {}) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioCtx = null;
        this.analyser = null;
        this.analyserRight = null; // For stereo/dual channel
        this.dataArray = null;
        this.dataArrayRight = null; // For stereo/dual channel
        this.source = null;
        this.splitter = null; // For channel splitting
        this.isConnected = false;
        this.connectedElement = null;
        this.currentColorScheme = 'default';
        this.backgroundColor = '#000000';

        // Initialize all parameters with defaults
        this.resetToDefaults();

        // Apply provided options
        if (options) {
            this.setOptions(options);
        }

        // Setup
        this.setupCanvas();
        this.setupAudio();
        this.initializePeaks();
        this.calculateFrequencyBands();
        this.animate();

        // Live Audio
        this.inputMode = 'playlist'; // 'playlist' or 'microphone'
        this.audioStream = null;
        this.streamSource = null;
        this.availableDevices = [];

        // Handle resize
        window.addEventListener('resize', () => this.handleResize());

        // console.log('Enhanced SpectrumAnalyzer created with channelLayout support');
    }

    resetToDefaults() { // Full AudioMotion parameter set with single quotes for strings
        this.alphaBars = false;
        this.ansiBands = false;
        this.barSpace = 0.1;
        this.bgAlpha = 0.7;
        this.channelLayout = 'single';
        this.colorMode = 'gradient';
        this.fadePeaks = false;
        this.fftSize = 8192;
        this.fillAlpha = 1;
        this.frequencyScale = 'log';
        this.gradient = 'classic';
        this.gravity = 3.8;
        this.ledBars = false;
        this.linearAmplitude = false;
        this.linearBoost = 1;
        this.lineWidth = 0;
        this.loRes = false;
        this.lumiBars = false;
        this.maxDecibels = -25;
        this.maxFPS = 0;
        this.maxFreq = 22000;
        this.minDecibels = -85;
        this.minFreq = 20;
        this.mirror = 0;
        this.mode = 0;
        this.noteLabels = false;
        this.outlineBars = false;
        this.overlay = false;
        this.peakFadeTime = 750;
        this.peakHoldTime = 500;
        this.peakLine = false;
        this.radial = false;
        this.radialInvert = false;
        this.radius = 0.3;
        this.reflexAlpha = 1;
        this.reflexBright = 1;
        this.reflexFit = true;
        this.reflexRatio = 0;
        this.roundBars = false;
        this.showBgColor = false;
        this.showFPS = false;
        this.showPeaks = true;
        this.showScaleX = false;
        this.showScaleY = false;
        this.smoothing = 0.5;
        this.spinSpeed = 0;
        this.splitGradient = false;
        this.trueLeds = false;
        this.useCanvas = true;
        this.volume = 1;
        this.weightingFilter = '';

        // Additional properties for stereo
        this.gradientLeft = 'steelblue';
        this.gradientRight = 'orangered';

        // Peak tracking
        this.peaks = [];
        this.peaksRight = [];
        this.peakDecay = [];
        this.peakDecayRight = [];
        this.lastPeakTime = [];
        this.lastPeakTimeRight = [];

        // Animation
        this.spinAngle = 0;
        this.animationFrame = null;

        // Frequency bands
        this.frequencyBands = [];
    }

    setColorScheme(scheme) {
        this.currentColorScheme = scheme;
    }

    setBackgroundColor(color) {
        this.backgroundColor = color;
        const visualizationContainer = document.getElementById('visualizationContainer');
        const mainArea = document.querySelector('.main-area');

        // Update backdrop if video is active
        const backdrop = document.getElementById('videoBackdrop');
        if (backdrop) {
            backdrop.style.background = color;
        }

        // Only apply to containers if video is NOT active
        if (!this.videoMode || this.videoMode === 'off') {
            visualizationContainer.style.backgroundColor = color;
            mainArea.style.backgroundColor = color;
        }

        // Save to localStorage using existing method
        try {
            localStorage.setItem('gitup_bgcolor', this.backgroundColor);
        } catch (e) {
            console.error('Error saving background color:', e);
        }

        if (this.audioMotion && (!this.videoMode || this.videoMode === 'off')) {
            this.audioMotion.setBackgroundColor(color);
        }
    }

    setupCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width || 800;
        this.canvas.height = rect.height || 400;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.background = 'transparent';
        this.container.appendChild(this.canvas);
    }

    setupAudio() {
        try {
            this.audioCtx = new(window.AudioContext || window.webkitAudioContext)();

            // Main analyser (left channel or mono)
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothing;
            this.analyser.minDecibels = this.minDecibels;
            this.analyser.maxDecibels = this.maxDecibels;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            // Right channel analyser for stereo modes
            this.analyserRight = this.audioCtx.createAnalyser();
            this.analyserRight.fftSize = this.fftSize;
            this.analyserRight.smoothingTimeConstant = this.smoothing;
            this.analyserRight.minDecibels = this.minDecibels;
            this.analyserRight.maxDecibels = this.maxDecibels;
            this.dataArrayRight = new Uint8Array(this.analyserRight.frequencyBinCount);

            // Channel splitter for stereo
            this.splitter = this.audioCtx.createChannelSplitter(2);

            // console.log('Audio context initialized with stereo support:', {
            //     sampleRate: this.audioCtx.sampleRate,
            //     fftSize: this.analyser.fftSize,
            //     frequencyBinCount: this.analyser.frequencyBinCount
            // });
        } catch (error) {
            console.error('Audio context setup failed:', error);
            this.dataArray = new Uint8Array(128);
            this.dataArrayRight = new Uint8Array(128);
        }
    }

    calculateFrequencyBands() {
        if (!this.analyser) {
            this.frequencyBands = [];
            return;
        }

        const nyquist = this.audioCtx ?. sampleRate / 2 || 22050;
        const binCount = this.analyser.frequencyBinCount;
        const binWidth = nyquist / binCount;

        this.frequencyBands = [];

        if (this.frequencyScale === 'log') {
            const minLog = Math.log10(Math.max(this.minFreq, 20));
            const maxLog = Math.log10(Math.min(this.maxFreq, nyquist));
            // Use all available bins for mode 0 to get smooth fluid appearance
            const bandCount = this.ansiBands ? 31 : (this.mode === 0 ? Math.min(binCount, 512) : 64);

            for (let i = 0; i < bandCount; i++) {
                const logFreq = minLog + (maxLog - minLog) * (i / bandCount);
                const freq = Math.pow(10, logFreq);
                const bin = Math.floor(freq / binWidth);
                this.frequencyBands.push({
                    freq: freq,
                    bin: Math.min(bin, binCount - 1),
                    width: 1 / bandCount
                });
            }
        } else if (this.frequencyScale === 'bark') {
            const bandCount = 24;
            for (let i = 0; i < bandCount; i++) {
                const bark = i + 0.5;
                const freq = 600 * Math.sinh(bark / 4);
                if (freq < this.minFreq || freq > this.maxFreq) 
                    continue;
                

                const bin = Math.floor(freq / binWidth);
                this.frequencyBands.push({
                    freq: freq,
                    bin: Math.min(bin, binCount - 1),
                    width: 1 / bandCount
                });
            }
        } else {
            const bandCount = this.mode === 0 ? Math.min(binCount, 256) : 64;
            for (let i = 0; i < bandCount; i++) {
                const freq = (i / bandCount) * nyquist;
                if (freq < this.minFreq || freq > this.maxFreq) 
                    continue;
                

                this.frequencyBands.push({
                    freq: freq,
                    bin: Math.min(i, binCount - 1),
                    width: 1 / bandCount
                });
            }
        }

        if (this.frequencyBands.length === 0) {
            const fallbackCount = 64;
            for (let i = 0; i < fallbackCount; i++) {
                this.frequencyBands.push({
                    freq: (i / fallbackCount) * nyquist,
                    bin: Math.floor(
                        (i / fallbackCount) * binCount
                    ),
                    width: 1 / fallbackCount
                });
            }
        }
    }

    initializePeaks() {
        const length = (this.frequencyBands && this.frequencyBands.length > 0) ? this.frequencyBands.length : 64;
        this.peaks = new Array(length).fill(0);
        this.peaksRight = new Array(length).fill(0);
        this.peakDecay = new Array(length).fill(0);
        this.peakDecayRight = new Array(length).fill(0);
        this.lastPeakTime = new Array(length).fill(0);
        this.lastPeakTimeRight = new Array(length).fill(0);
    }

    connectInput(audioElement) {
        if (!this.audioCtx || !audioElement) 
            return;
        


        try { // Always disconnect previous source
            if (this.source) {
                try {
                    this.source.disconnect();
                } catch (e) { // Ignore disconnect errors
                }
                this.source = null;
                this.isConnected = false;
            }

            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            // Create new source if needed
            if (!audioElement._audioSourceNode) {
                this.source = this.audioCtx.createMediaElementSource(audioElement);
                audioElement._audioSourceNode = this.source;
            } else {
                this.source = audioElement._audioSourceNode;
            }

            // Connect based on channel layout
            if (this.channelLayout === 'dual-vertical' || this.channelLayout === 'dual-horizontal') { // Stereo mode: split channels
                this.source.connect(this.splitter);
                this.splitter.connect(this.analyser, 0); // Left channel
                this.splitter.connect(this.analyserRight, 1); // Right channel
                this.source.connect(this.audioCtx.destination);
            } else { // Mono mode
                this.source.connect(this.analyser);
                this.source.connect(this.audioCtx.destination);
            }

            this.connectedElement = audioElement;
            this.isConnected = true;
            console.log('Audio connected successfully with channelLayout:', this.channelLayout);
        } catch (error) {
            console.error('Failed to connect audio:', error);
            this.isConnected = false;
        }
    }

    disconnectInput() {
        if (this.source) {
            try {
                this.source.disconnect();
            } catch (error) { // Ignore disconnect errors
            }
            this.source = null;
        }
        this.isConnected = false;
        this.connectedElement = null;
    }

    setOptions(options) { // Save critical animation state before any reset
        const savedSpinAngle = this.spinAngle;
        const savedFrequencyBands = this.frequencyBands;
        const wasConnected = this.isConnected;
        const savedConnectedElement = this.connectedElement;

        // Check if this is a morph update
        const isMorphing = options._isMorphing || false;

        // Only reset to defaults if NOT morphing
        if (! isMorphing) { // First, reset all parameters to their defaults
            this.resetToDefaults();
        }

        // Then apply the new options
        Object.keys(options).forEach(key => {
            if (key !== '_isMorphing' && this.hasOwnProperty(key)) {
                this[key] = options[key];
            }
        });

        // Restore animation state during morphing
        if (isMorphing) {
            this.spinAngle = savedSpinAngle;
            // Don't reset frequency bands during morph to prevent recalculation
            if (savedFrequencyBands && savedFrequencyBands.length > 0) {
                this.frequencyBands = savedFrequencyBands;
            }
        }

        // Restore connection state
        this.isConnected = wasConnected;
        this.connectedElement = savedConnectedElement;

        // Always force showScaleX to false
        this.showScaleX = false;

        // Update audio settings if needed
        if (options.fftSize && this.analyser) {
            this.analyser.fftSize = this.fftSize;
            this.analyserRight.fftSize = this.fftSize;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.dataArrayRight = new Uint8Array(this.analyserRight.frequencyBinCount);
        }

        if (options.smoothing !== undefined && this.analyser) {
            this.analyser.smoothingTimeConstant = this.smoothing;
            this.analyserRight.smoothingTimeConstant = this.smoothing;
        }

        if (options.minDecibels !== undefined && this.analyser) {
            this.analyser.minDecibels = this.minDecibels;
            this.analyserRight.minDecibels = this.minDecibels;
        }

        if (options.maxDecibels !== undefined && this.analyser) {
            this.analyser.maxDecibels = this.maxDecibels;
            this.analyserRight.maxDecibels = this.maxDecibels;
        }

        // Recalculate frequency bands if needed (but not during morphing)
        if (! isMorphing && (options.frequencyScale || options.minFreq || options.maxFreq || options.ansiBands !== undefined || options.mode !== undefined)) {
            this.calculateFrequencyBands();
            this.initializePeaks();
        }

        // Reset spin angle when changing modes (but not during morphing)
        if (! isMorphing && options.mode !== undefined) {
            this.spinAngle = 0;
        }

        // Reconnect audio if channel layout changed
        if (options.channelLayout && this.connectedElement) {
            this.connectInput(this.connectedElement);
        }
    }

    handleResize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width || 800;
        this.canvas.height = rect.height || 400;
    }
    
    generateBasicAudioFeatures() {
        if (!this.analyser || !this.dataArray) {
            console.log('🔍 No analyser or dataArray available - analyser:', !!this.analyser, 'dataArray:', !!this.dataArray);
            return {
                energy: 0,
                beat: false,
                tempo: 0,
                dominantFrequency: 0
            };
        }
        
        // Get fresh audio data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate basic energy from frequency data
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const energy = sum / (this.dataArray.length * 255);
        
        // Debug: check if we're getting real audio data
        const maxDataValue = Math.max(...this.dataArray);
            // console.log('🔍 Audio data - Energy:', energy.toFixed(3), 'Max value:', maxDataValue, 'DataArray length:', this.dataArray.length);
        
        // Simple beat detection based on energy spikes (more sensitive)
        const now = Date.now();
        const timeSinceLastBeat = now - (this.lastBeatTime || 0);
        const beatThreshold = 0.1; // Lowered from 0.3 to 0.1 for more sensitivity
        const beatInterval = 300; // Reduced from 500ms to 300ms for more frequent beats
        
        let beat = false;
        if (energy > beatThreshold && timeSinceLastBeat > beatInterval) {
            beat = true;
            this.lastBeatTime = now;
        }
        
        // Calculate dominant frequency
        let maxValue = 0;
        let dominantBin = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            if (this.dataArray[i] > maxValue) {
                maxValue = this.dataArray[i];
                dominantBin = i;
            }
        }
        const dominantFrequency = (dominantBin / this.dataArray.length) * 22050; // Assuming 44.1kHz sample rate
        
        const features = {
            energy: Math.min(energy, 1),
            beat: beat,
            tempo: 120, // Default tempo
            dominantFrequency: dominantFrequency,
            frequencies: Array.from(this.dataArray).map(val => val / 255), // Convert to 0-1 range
            waveform: Array.from(this.dataArray).map(val => val / 255) // Use frequency data as waveform for now
        };
        
        // console.log('🔍 Generated audio features - Energy:', energy.toFixed(3), 'Beat:', beat, 'DataArray length:', this.dataArray.length);
        
        return features;
    }

    animate() { // Check if visualization is enabled through parent visualizer
        if (window.visualizer && !window.visualizer.visualizationEnabled) {
            // Still update Infinite Zoom even when main visualization is off
            if (window.visualizer.infiniteZoom && window.visualizer.infiniteZoom.isActive) {
                let audioFeatures = null;
                
                // Try to get audio features from AI Autopilot first
                if (window.visualizer.aiAutopilot && window.visualizer.aiAutopilot.audioAnalyzer) {
                    audioFeatures = window.visualizer.aiAutopilot.audioAnalyzer.getCurrentFeatures();
                }
                
                // Fallback: generate basic audio features from main audio analyzer
                if (!audioFeatures && this.analyser && this.dataArray) {
                    audioFeatures = this.generateBasicAudioFeatures();
                    // console.log('🔍 Generated basic audio features (disabled viz):', audioFeatures);
                } else if (!audioFeatures) {
                    console.log('🔍 No audio data available (disabled viz) - analyser:', !!this.analyser, 'dataArray:', !!this.dataArray);
                } else if (audioFeatures && audioFeatures.energy === 0) {
                    // Try to generate basic audio features if AI features have no energy
                    console.log('🔍 AI features have no energy (disabled viz), trying basic audio features...');
                    const basicFeatures = this.generateBasicAudioFeatures();
                    if (basicFeatures.energy > 0) {
                        audioFeatures = basicFeatures;
                        console.log('🔍 Using basic audio features instead (disabled viz):', audioFeatures);
                    }
                }
                
                window.visualizer.infiniteZoom.update(audioFeatures);
                window.visualizer.infiniteZoom.draw();
            }
            
            // Still update WebGL even when main visualization is off
            if (window.visualizer.webglVisualization && window.visualizer.webglVisualization.isActive) {
                let audioFeatures = null;
                
                // Try to get audio features from AI Autopilot first
                if (window.visualizer.aiAutopilot && window.visualizer.aiAutopilot.audioAnalyzer) {
                    audioFeatures = window.visualizer.aiAutopilot.audioAnalyzer.getCurrentFeatures();
                }
                
                // Fallback: generate basic audio features from main audio analyzer
                if (!audioFeatures && this.analyser && this.dataArray) {
                    audioFeatures = this.generateBasicAudioFeatures();
                    // console.log('🔍 Generated basic audio features (disabled viz):', audioFeatures);
                } else if (!audioFeatures) {
                    // console.log('🔍 No audio data available (disabled viz) - analyser:', !!this.analyser, 'dataArray:', !!this.dataArray);
                } else if (audioFeatures && audioFeatures.energy === 0) {
                    // Try to generate basic audio features if AI features have no energy
                    // console.log('🔍 AI features have no energy (disabled viz), trying basic audio features...');
                    const basicFeatures = this.generateBasicAudioFeatures();
                    if (basicFeatures.energy > 0) {
                        audioFeatures = basicFeatures;
                        // console.log('🔍 Using basic audio features instead (disabled viz):', audioFeatures);
                    }
                }
                
                window.visualizer.webglVisualization.update(audioFeatures);
                window.visualizer.webglVisualization.draw();
            }
            
            this.animationFrame = requestAnimationFrame(() => this.animate());
            return; // Skip main drawing but keep loop running for quick resume
        }

        this.getAudioData();
        this.updatePeaks();
        
        // Update and draw Infinite Zoom if active and not captured via kaleidoscope
        if (window.visualizer && window.visualizer.infiniteZoom && window.visualizer.infiniteZoom.isActive) {
            // Check if Infinite Zoom is being captured via kaleidoscope
            const isCapturedViaKaleidoscope = window.visualizer.kaleidoscopeEnabled && 
                (window.visualizer.kaleidoscopeApplyToViz || window.visualizer.kaleidoscopeApplyToInfiniteZoom);
            
            let audioFeatures = null;
            
            // Try to get audio features from AI Autopilot first
            if (window.visualizer.aiAutopilot && window.visualizer.aiAutopilot.audioAnalyzer) {
                audioFeatures = window.visualizer.aiAutopilot.audioAnalyzer.getCurrentFeatures();
            }
            
            // Fallback: generate basic audio features from main audio analyzer
            if (!audioFeatures && this.analyser && this.dataArray) {
                audioFeatures = this.generateBasicAudioFeatures();
                if (!isCapturedViaKaleidoscope) {
                    // console.log('🔍 Generated basic audio features:', audioFeatures);
                }
            } else if (!audioFeatures) {
                if (!isCapturedViaKaleidoscope) {
                    console.log('🔍 No audio data available - analyser:', !!this.analyser, 'dataArray:', !!this.dataArray);
                }
            } else if (audioFeatures && audioFeatures.energy === 0) {
                // Try to generate basic audio features if AI features have no energy
                if (!isCapturedViaKaleidoscope) {
                    // console.log('🔍 AI features have no energy, trying basic audio features...');
                }
                const basicFeatures = this.generateBasicAudioFeatures();
                if (basicFeatures.energy > 0) {
                    audioFeatures = basicFeatures;
                    if (!isCapturedViaKaleidoscope) {
                        // console.log('🔍 Using basic audio features instead:', audioFeatures);
                    }
                }
            }
            
            // Update Infinite Zoom (always needed for kaleidoscope to capture)
            window.visualizer.infiniteZoom.update(audioFeatures);
            
            // Always draw Infinite Zoom (needed for kaleidoscope to capture)
            window.visualizer.infiniteZoom.draw();
            
            // Hide canvas when captured via kaleidoscope to prevent background layer
            if (isCapturedViaKaleidoscope) {
                window.visualizer.infiniteZoom.canvas.style.display = 'none';
            } else {
                window.visualizer.infiniteZoom.canvas.style.display = 'block';
            }
        }
        
        // Update and draw WebGL if active (independent of Infinite Zoom)
        if (window.visualizer && window.visualizer.webglVisualization && window.visualizer.webglVisualization.isActive) {
            // Check if WebGL is being captured via kaleidoscope
            const isWebGLCapturedViaKaleidoscope = window.visualizer.kaleidoscopeEnabled && 
                (window.visualizer.kaleidoscopeApplyToViz || window.visualizer.kaleidoscopeApplyToWebGL);
            
            let audioFeatures = null;
            
            // Try to get audio features from AI Autopilot first
            if (window.visualizer.aiAutopilot && window.visualizer.aiAutopilot.audioAnalyzer) {
                audioFeatures = window.visualizer.aiAutopilot.audioAnalyzer.getCurrentFeatures();
            }
            
            // Fallback: generate basic audio features from main audio analyzer
            if (!audioFeatures && this.analyser && this.dataArray) {
                audioFeatures = this.generateBasicAudioFeatures();
                if (!isWebGLCapturedViaKaleidoscope) {
                    // console.log('🔍 Generated basic audio features:', audioFeatures);
                }
            } else if (!audioFeatures) {
                if (!isWebGLCapturedViaKaleidoscope) {
                    console.log('🔍 No audio data available - analyser:', !!this.analyser, 'dataArray:', !!this.dataArray);
                }
            } else if (audioFeatures && audioFeatures.energy === 0) {
                // Try to generate basic audio features if AI features have no energy
                if (!isWebGLCapturedViaKaleidoscope) {
                    // console.log('🔍 AI features have no energy, trying basic audio features...');
                }
                const basicFeatures = this.generateBasicAudioFeatures();
                if (basicFeatures.energy > 0) {
                    audioFeatures = basicFeatures;
                    if (!isWebGLCapturedViaKaleidoscope) {
                        // console.log('🔍 Using basic audio features instead:', audioFeatures);
                    }
                }
            }
            
            // Update WebGL (always needed for kaleidoscope to capture)
            window.visualizer.webglVisualization.update(audioFeatures);
            
            // Always draw WebGL (needed for kaleidoscope to capture)
            window.visualizer.webglVisualization.draw();
            
            // Hide canvas when captured via kaleidoscope to prevent background layer
            if (isWebGLCapturedViaKaleidoscope) {
                window.visualizer.webglVisualization.canvas.style.display = 'none';
            } else {
                window.visualizer.webglVisualization.canvas.style.display = 'block';
            }
        }
        
        this.draw();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    getAudioData() {
        if (this.analyser && this.dataArray && this.isConnected) { // Get data for main channel
            if (this.mode === 10) {
                this.analyser.getByteTimeDomainData(this.dataArray);
            } else {
                this.analyser.getByteFrequencyData(this.dataArray);
            }

            // Get data for right channel if in stereo mode
            if ((this.channelLayout === 'dual-vertical' || this.channelLayout === 'dual-horizontal') && this.analyserRight) {
                if (this.mode === 10) {
                    this.analyserRight.getByteTimeDomainData(this.dataArrayRight);
                } else {
                    this.analyserRight.getByteFrequencyData(this.dataArrayRight);
                }
            }

            // Apply volume adjustment
            if (this.volume !== 1 && this.mode !== 10) {
                for (let i = 0; i < this.dataArray.length; i++) {
                    this.dataArray[i] = Math.min(255, this.dataArray[i] * this.volume);
                }
                if (this.dataArrayRight) {
                    for (let i = 0; i < this.dataArrayRight.length; i++) {
                        this.dataArrayRight[i] = Math.min(255, this.dataArrayRight[i] * this.volume);
                    }
                }
            }
        } else { // Demo data when not connected
            if (!this.dataArray) 
                this.dataArray = new Uint8Array(128);
            

            if (!this.dataArrayRight) 
                this.dataArrayRight = new Uint8Array(128);
            


            const time = Date.now() * 0.001;
            if (this.mode === 10) { // Demo waveform
                for (let i = 0; i < this.dataArray.length; i++) {
                    const t = i / this.dataArray.length;
                    this.dataArray[i] = 128 + 64 * Math.sin(time * 3 + t * Math.PI * 4) * Math.sin(time * 0.7);
                    this.dataArrayRight[i] = 128 + 64 * Math.sin(time * 2.5 + t * Math.PI * 3) * Math.sin(time * 0.9);
                }
            } else { // Demo frequency bars
                for (let i = 0; i < this.dataArray.length; i++) {
                    const freq = i / this.dataArray.length;
                    const intensity = 0.3 + 0.4 * Math.sin(time * 2 + freq * 10) * Math.exp(- freq * 2) * (0.5 + 0.5 * Math.sin(time * 0.5));
                    this.dataArray[i] = Math.max(0, Math.min(255, intensity * 255));
                    this.dataArrayRight[i] = Math.max(0, Math.min(255, intensity * 255 * 0.8));
                }
            }
        }
    }

    updatePeaks() {
        if (!this.showPeaks) 
            return;
        


        const currentTime = Date.now();
        // Make sure we're using the actual frequency band count
        const dataLength = this.frequencyBands.length;

        // Ensure peaks array matches current band count
        if (this.peaks.length !== dataLength) {
            this.initializePeaks();
        }

        // Update peaks for left/main channel
        for (let i = 0; i < dataLength; i++) {
            let currentValue;

            if (this.frequencyBands && this.frequencyBands.length > 0) {
                const band = this.frequencyBands[i];
                currentValue = band ? this.dataArray[band.bin] / 255 : 0;
            } else {
                const dataIndex = Math.floor(i * this.dataArray.length / dataLength);
                currentValue = this.dataArray[dataIndex] / 255;
            }

            if (currentValue > this.peaks[i]) {
                this.peaks[i] = currentValue;
                this.lastPeakTime[i] = currentTime;
                this.peakDecay[i] = 0;
            } else {
                const timeSincePeak = currentTime - this.lastPeakTime[i];
                if (timeSincePeak > this.peakHoldTime) {
                    const decayTime = timeSincePeak - this.peakHoldTime;
                    const decayRate = this.gravity / 1000;
                    this.peakDecay[i] = Math.min(this.peaks[i], decayRate * decayTime);
                    this.peaks[i] = Math.max(currentValue, this.peaks[i] - this.peakDecay[i]);
                }
            }
        }

        // Update peaks for right channel if in stereo mode
        if (this.channelLayout === 'dual-vertical' || this.channelLayout === 'dual-horizontal') { // Ensure right channel peaks array matches too
            if (this.peaksRight.length !== dataLength) {
                this.initializePeaks();
            }

            for (let i = 0; i < dataLength; i++) {
                let currentValue;

                if (this.frequencyBands && this.frequencyBands.length > 0) {
                    const band = this.frequencyBands[i];
                    currentValue = band ? this.dataArrayRight[band.bin] / 255 : 0;
                } else {
                    const dataIndex = Math.floor(i * this.dataArrayRight.length / dataLength);
                    currentValue = this.dataArrayRight[dataIndex] / 255;
                }

                if (currentValue > this.peaksRight[i]) {
                    this.peaksRight[i] = currentValue;
                    this.lastPeakTimeRight[i] = currentTime;
                    this.peakDecayRight[i] = 0;
                } else {
                    const timeSincePeak = currentTime - this.lastPeakTimeRight[i];
                    if (timeSincePeak > this.peakHoldTime) {
                        const decayTime = timeSincePeak - this.peakHoldTime;
                        const decayRate = this.gravity / 1000;
                        this.peakDecayRight[i] = Math.min(this.peaksRight[i], decayRate * decayTime);
                        this.peaksRight[i] = Math.max(currentValue, this.peaksRight[i] - this.peakDecayRight[i]);
                    }
                }
            }
        }
    }

    drawFluidSpectrum() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const bandCount = this.frequencyBands.length;

        // Create gradient
        const gradient = this.ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'hsl(120, 100%, 50%)'); // Green at bottom
        gradient.addColorStop(0.5, 'hsl(60, 100%, 50%)'); // Yellow in middle
        gradient.addColorStop(1, 'hsl(0, 100%, 50%)');
        // Red at top

        // Draw as continuous path
        this.ctx.beginPath();
        this.ctx.moveTo(0, height);

        for (let i = 0; i < bandCount; i++) {
            const band = this.frequencyBands[i];
            const value = band ? this.dataArray[band.bin] / 255 : 0;
            const amplitude = this.linearAmplitude ? value * this.linearBoost : value;

            const x = (i / bandCount) * width;
            const y = height - (amplitude * height * 0.9);

            if (i === 0) {
                this.ctx.lineTo(x, y);
            } else { // Smooth curve between points
                const prevX = ((i - 1) / bandCount) * width;
                const midX = (prevX + x) / 2;
                this.ctx.quadraticCurveTo(prevX, this.lastY || y, midX, y);
            }
            this.lastY = y;
        }

        this.ctx.lineTo(width, height);
        this.ctx.closePath();

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Draw peaks as individual dots/lines, not connected
        if (this.showPeaks) {
            this.ctx.fillStyle = '#ffffff';

            for (let i = 0; i < bandCount; i++) {
                if (this.peaks[i] > 0.01) {
                    const x = (i / bandCount) * width;
                    const peakY = height - (this.peaks[i] * height * 0.9);
                    const barWidth = width / bandCount;

                    // Draw a small horizontal line for each peak
                    this.ctx.fillRect(x - barWidth / 2, peakY - 1, barWidth, 2);
                }
            }
        }
    }

    draw() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Check if video is active
        const container = document.getElementById('visualizationContainer');
        const isVideoActive = container && container.classList.contains('video-active');

        // Check if background image is active and enabled
        const hasBackgroundImage = window.visualizer && window.visualizer.backgroundImage && window.visualizer.backgroundImageEnabled;

        // console.log('🎬 SpectrumAnalyzer.draw - Layer Debug:', {
        //     isVideoActive,
        //     hasBackgroundImage,
        //     backgroundColor: this.backgroundColor,
        //     showBgColor: this.showBgColor,
        //     bgAlpha: this.bgAlpha,
        //     canvasSize: `${width}x${height}`,
        //     contextType: this.ctx.constructor.name,
        //     visualizerExists: !!window.visualizer,
        //     backgroundImageExists: !!(window.visualizer && window.visualizer.backgroundImage),
        //     backgroundImageEnabled: !!(window.visualizer && window.visualizer.backgroundImageEnabled)
        // });

        if (! isVideoActive) { // Only fill background when video is NOT active
            if (!hasBackgroundImage) {
                // Only fill with background color if no background image
                // console.log('🎨 Filling with background color:', this.backgroundColor);
            this.ctx.fillStyle = this.backgroundColor;
            this.ctx.fillRect(0, 0, width, height);

            if (this.showBgColor && this.backgroundColor !== '#ffffff') {
                    // console.log('🎭 Applying background overlay:', `rgba(0, 0, 0, ${this.bgAlpha})`);
                this.ctx.fillStyle = `rgba(0, 0, 0, ${
                    this.bgAlpha
                })`;
                this.ctx.fillRect(0, 0, width, height);
                }
            } else {
                // Clear canvas for transparency when background image is active
                // console.log('🧹 Clearing canvas for background image transparency');
                this.ctx.clearRect(0, 0, width, height);
            }
        } else { // Clear canvas for transparency when video is active
            // console.log('🧹 Clearing canvas for video transparency');
            this.ctx.clearRect(0, 0, width, height);
        }

        // Draw background image if available (only in main visualization, not in capture)
        if (hasBackgroundImage) {
            // console.log('🖼️ Drawing background image in main visualization');
            window.visualizer.drawBackgroundImage(this.ctx, width, height);
        }

        // Only apply overlay if showBgColor is true AND background is not pure white AND no background image
        if (this.showBgColor && this.backgroundColor !== '#ffffff' && !hasBackgroundImage) {
            // console.log('🎭 Applying background overlay (no background image)');
            this.ctx.fillStyle = `rgba(0, 0, 0, ${
                this.bgAlpha
            })`;
            this.ctx.fillRect(0, 0, width, height);
        } else if (hasBackgroundImage) {
            // console.log('✅ Skipping overlay - background image is active');
        } else {
            // console.log('✅ No overlay - background image should be visible');
        }

        // Draw based on mode - radial takes precedence over channel layout
        // Only draw main visualization elements if visualization is enabled
        if (window.visualizer && !window.visualizer.visualizationEnabled) {
            // Visualization is disabled - only background image and video should be visible
            return;
        }
        
        // console.log('🎨 Drawing visualization elements:', {
        //     radial: this.radial,
        //     channelLayout: this.channelLayout,
        //     mode: this.mode,
        //     ledBars: this.ledBars,
        //     barSpace: this.barSpace
        // });
        
        if (this.radial) {
            // console.log('🌀 Drawing radial visualization');
            this.drawRadial();
        } else if (this.channelLayout === 'dual-vertical') {
            // console.log('📊 Drawing dual vertical visualization');
            this.drawDualVertical();
        } else if (this.channelLayout === 'dual-horizontal') {
            // console.log('📊 Drawing dual horizontal visualization');
            this.drawDualHorizontal();
        } else if (this.mode === 10) {
            // console.log('📈 Drawing line graph visualization');
            this.drawLineGraph();
        } else if (this.mode === 6 && this.ledBars) {
            // console.log('💡 Drawing LED bars visualization');
            this.drawLEDBars();
        } else if (this.mode === 0 && this.barSpace === 0) {
            // console.log('🌊 Drawing fluid spectrum visualization');
            this.drawFluidSpectrum(); // Use fluid drawing for mode 0 with no bar space
        } else {
            this.drawBars();
        }
    }

    drawDualVertical() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const halfHeight = height / 2;

        // Check if this is the Mirror visualization (mode 1 with dual-vertical)
        const isMirrorMode = this.mode === 1;

        if (isMirrorMode) {
            // Mirror mode: bars start from center
            // Left channel goes up from center
            this.ctx.save();
            this.ctx.translate(0, halfHeight);
            this.ctx.scale(1, -1);
            this.drawChannelBars(0, 0, width, halfHeight, this.dataArray, this.peaks, 'left');
            this.ctx.restore();

            // Right channel goes down from center
            this.drawChannelBars(0, halfHeight, width, halfHeight, this.dataArrayRight, this.peaksRight, 'right');
        } else {
            // Standard dual-vertical: top and bottom separate
            // Draw top half (left channel)
            this.ctx.save();
            this.ctx.translate(0, halfHeight);
            this.ctx.scale(1, -1);
            this.drawChannelBars(0, 0, width, halfHeight, this.dataArray, this.peaks, 'left');
            this.ctx.restore();

            // Draw bottom half (right channel)
            this.drawChannelBars(0, halfHeight, width, halfHeight, this.dataArrayRight, this.peaksRight, 'right');
        }
    }

    drawDualHorizontal() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const halfWidth = width / 2;

        // Draw left half (left channel)
        this.drawChannelBars(0, 0, halfWidth, height, this.dataArray, this.peaks, 'left');

        // Draw right half (right channel)
        this.ctx.save();
        this.ctx.translate(width, 0);
        this.ctx.scale(-1, 1);
        this.drawChannelBars(0, 0, halfWidth, height, this.dataArrayRight, this.peaksRight, 'right');
        this.ctx.restore();
    }

    drawChannelBars(x, y, width, height, dataArray, peaks, channel) {
        const bandCount = (this.frequencyBands && this.frequencyBands.length > 0) ? this.frequencyBands.length : 64;

        const barWidth = (width / bandCount) * (1 - this.barSpace);
        const barSpacing = width / bandCount;

        // Check if this is Mirror mode
        const isMirrorMode = this.mode === 1 && this.channelLayout === 'dual-vertical';

        for (let i = 0; i < bandCount; i++) {
            let value;

            if (this.frequencyBands && this.frequencyBands.length > 0) {
                const band = this.frequencyBands[i];
                value = band ? dataArray[band.bin] / 255 : 0;
            } else {
                const dataIndex = Math.floor(i * dataArray.length / bandCount);
                value = dataArray[dataIndex] / 255;
            }

            const amplitude = this.linearAmplitude ? value * this.linearBoost : value;

            const barHeight = amplitude * height * 0.9;
            const barX = x + i * barSpacing + (barSpacing - barWidth) / 2;
            let barY;

            if (isMirrorMode) { // Mirror mode: bars start from y position (which is the center)
                barY = y;
            } else { // Standard mode: bars grow from bottom
                barY = y + height - barHeight;
            }

            // Draw bar with channel-specific color
            if (this.fillAlpha > 0) {
                if (this.colorMode === 'bar-level') { // Color based on bar level
                    const levelColor = this.getBarLevelColor(amplitude);
                    this.ctx.fillStyle = levelColor;
                } else { // Use gradient based on channel
                    const gradient = channel === 'left' ? this.gradientLeft : this.gradientRight;
                    this.ctx.fillStyle = this.getGradientColor(gradient, i, bandCount, amplitude);
                }

                if (this.roundBars) {
                    this.ctx.beginPath();
                    if (isMirrorMode) { // For mirror mode, just draw the bars from center position
                        this.ctx.roundRect(barX, barY, barWidth, barHeight, barWidth / 4);
                    } else {
                        this.ctx.roundRect(barX, barY, barWidth, barHeight, barWidth / 4);
                    }
                    this.ctx.fill();
                } else {
                    this.ctx.fillRect(barX, barY, barWidth, barHeight);
                }
            }

            // Draw outline
            if (this.outlineBars || this.lineWidth > 0) {
                this.ctx.strokeStyle = this.getColor(i, bandCount, amplitude);
                this.ctx.lineWidth = this.lineWidth || 1;
                if (this.roundBars) {
                    this.ctx.beginPath();
                    this.ctx.roundRect(barX, barY, barWidth, barHeight, barWidth / 4);
                    this.ctx.stroke();
                } else {
                    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
                }
            }

            // Draw peak
            if (this.showPeaks && peaks[i] > 0.01) {
                let peakY;
                if (isMirrorMode) { // For mirror mode, peaks are at the end of the bars
                    if (channel === 'left') {
                        peakY = y -(peaks[i] * height * 0.9);
                    } else {
                        peakY = y + (peaks[i] * height * 0.9);
                    }
                } else {
                    peakY = y + height -(peaks[i] * height * 0.9);
                }
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(barX, peakY - 2, barWidth, 3);
            }
        }
    }

    getBarLevelColor(level) { // Color based on intensity level (green -> yellow -> red)
        if (level < 0.33) {
            return `hsl(120, 100%, ${
                50 * level * 3
            }%)`;
        } else if (level < 0.66) {
            return `hsl(${
                120 - (level - 0.33) * 360
            }, 100%, 50%)`;
        } else {
            return `hsl(0, 100%, ${
                50 + (level - 0.66) * 50
            }%)`;
        }
    }

    getGradientColor(gradientType, index, total, intensity) {
        switch (gradientType) {
            case 'steelblue':
                return `rgba(${
                    70 * intensity
                }, ${
                    130 * intensity
                }, ${
                    180 * intensity
                }, ${
                    this.fillAlpha
                })`;
            case 'orangered':
                const orange = 255 * intensity;
                const red = Math.min(255, orange * 1.5);
                return `rgba(${red}, ${
                    orange * 0.6
                }, 0, ${
                    this.fillAlpha
                })`;
            default:
                return this.getColor(index, total, intensity);
        }
    }

    drawBars() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const bandCount = (this.frequencyBands && this.frequencyBands.length > 0) ? this.frequencyBands.length : 64;

        const barWidth = (width / bandCount) * (1 - this.barSpace);
        const barSpacing = width / bandCount;

        // Array to store peak positions for peakLine
        const peakPositions = [];

        for (let i = 0; i < bandCount; i++) {
            let value;

            if (this.frequencyBands && this.frequencyBands.length > 0) {
                const band = this.frequencyBands[i];
                value = band ? this.dataArray[band.bin] / 255 : 0;
            } else {
                const dataIndex = Math.floor(i * this.dataArray.length / bandCount);
                value = this.dataArray[dataIndex] / 255;
            }

            const amplitude = this.linearAmplitude ? value * this.linearBoost : value;

            const barHeight = amplitude * height * 0.9;
            const x = i * barSpacing + (barSpacing - barWidth) / 2;
            const y = height - barHeight;

            if (this.fillAlpha > 0) {
                this.ctx.fillStyle = this.getColor(i, bandCount, amplitude);
                if (this.roundBars) {
                    this.ctx.beginPath();
                    this.ctx.roundRect(x, y, barWidth, barHeight, barWidth / 4);
                    this.ctx.fill();
                } else {
                    this.ctx.fillRect(x, y, barWidth, barHeight);
                }
            }

            if (this.outlineBars || this.lineWidth > 0) {
                this.ctx.strokeStyle = this.getColor(i, bandCount, amplitude);
                this.ctx.lineWidth = this.lineWidth || 1;
                if (this.roundBars) {
                    this.ctx.beginPath();
                    this.ctx.roundRect(x, y, barWidth, barHeight, barWidth / 4);
                    this.ctx.stroke();
                } else {
                    this.ctx.strokeRect(x, y, barWidth, barHeight);
                }
            }

            if (this.showPeaks && this.peaks[i] > 0.01) {
                const peakY = height - (this.peaks[i] * height * 0.9);

                // Store peak position for peakLine
                if (this.peakLine) {
                    peakPositions.push({
                        x: x + barWidth / 2,
                        y: peakY
                    });
                } else { // Draw individual peak bars
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fillRect(x, peakY - 2, barWidth, 3);
                }
            }
        }

        // Draw connected peak line if enabled
        if (this.peakLine && peakPositions.length > 1) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(peakPositions[0].x, peakPositions[0].y);

            for (let i = 1; i < peakPositions.length; i++) {
                this.ctx.lineTo(peakPositions[i].x, peakPositions[i].y);
            }

            this.ctx.stroke();
        }
    }

    drawLEDBars() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const bandCount = (this.frequencyBands && this.frequencyBands.length > 0) ? this.frequencyBands.length : 64;

        const barWidth = (width / bandCount) * (1 - this.barSpace);
        const barSpacing = width / bandCount;
        const ledSize = this.trueLeds ? 4 : 6;
        const ledGap = 2;
        const ledsPerBar = Math.floor(height / (ledSize + ledGap));

        for (let i = 0; i < bandCount; i++) {
            let value;

            if (this.frequencyBands && this.frequencyBands.length > 0) {
                const band = this.frequencyBands[i];
                value = band ? this.dataArray[band.bin] / 255 : 0;
            } else {
                const dataIndex = Math.floor(i * this.dataArray.length / bandCount);
                value = this.dataArray[dataIndex] / 255;
            }

            const litLeds = Math.floor(value * ledsPerBar);
            const x = i * barSpacing + (barSpacing - barWidth) / 2;

            for (let j = 0; j < litLeds; j++) {
                const ledY = height - (j + 1) * (ledSize + ledGap);
                const intensity = 1 - (j / ledsPerBar) * 0.3;

                let color;
                const ledPercent = j / ledsPerBar;
                if (ledPercent < 0.5) {
                    color = `hsl(120, 100%, ${
                        50 * intensity
                    }%)`;
                } else if (ledPercent < 0.8) {
                    color = `hsl(60, 100%, ${
                        50 * intensity
                    }%)`;
                } else {
                    color = `hsl(0, 100%, ${
                        50 * intensity
                    }%)`;
                }

                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, ledY, barWidth, ledSize);
            }

            if (this.showPeaks && this.peaks[i] > 0.01) {
                const peakLed = Math.floor(this.peaks[i] * ledsPerBar);
                const peakY = height - (peakLed + 1) * (ledSize + ledGap);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(x, peakY, barWidth, ledSize);
            }
        }
    }

    drawLineGraph() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        const points = Math.min(512, this.dataArray.length);
        const step = this.dataArray.length / points;

        this.ctx.globalAlpha = this.fillAlpha;

        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        this.applyColorSchemeGradient(gradient);

        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = this.lineWidth || 2;
        this.ctx.beginPath();

        for (let i = 0; i < points; i++) {
            const dataIndex = Math.floor(i * step);
            const x = (i / (points - 1)) * width;

            const value = (this.dataArray[dataIndex] - 128) / 128;
            const y = (height / 2) + (value * height * 0.35);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();

        if (this.fillAlpha > 0 && this.fillAlpha < 1) {
            this.ctx.globalAlpha = this.fillAlpha * 0.3;
            this.ctx.beginPath();

            for (let i = 0; i < points; i++) {
                const dataIndex = Math.floor(i * step);
                const x = (i / (points - 1)) * width;
                const value = (this.dataArray[dataIndex] - 128) / 128;
                const y = (height / 2) + (value * height * 0.35);

                if (i === 0) {
                    this.ctx.moveTo(x, height / 2);
                    this.ctx.lineTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            this.ctx.lineTo(width, height / 2);
            this.ctx.closePath();
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;
    }

    drawRadial() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 2 * (this.radius + 0.4);
        const bandCount = (this.frequencyBands && this.frequencyBands.length > 0) ? this.frequencyBands.length : 64;

        if (this.spinSpeed) {
            this.spinAngle += this.spinSpeed * 0.02;
        }

        // Calculate angle step
        const angleStep = (Math.PI * 2) / bandCount;

        for (let i = 0; i < bandCount; i++) {
            let value;

            if (this.frequencyBands && this.frequencyBands.length > 0) {
                const band = this.frequencyBands[i];
                value = band ? this.dataArray[band.bin] / 255 : 0;
            } else {
                const dataIndex = Math.floor(i * this.dataArray.length / bandCount);
                value = this.dataArray[dataIndex] / 255;
            }

            // Apply linear amplitude if needed
            const amplitude = this.linearAmplitude ? value * this.linearBoost : value;

            const angle = i * angleStep + this.spinAngle;
            const barLength = amplitude * maxRadius * 0.6;
            const innerRadius = this.radialInvert ? maxRadius : maxRadius * 0.2;
            const outerRadius = this.radialInvert ? maxRadius - barLength : innerRadius + barLength;

            const x1 = centerX + Math.cos(angle) * innerRadius;
            const y1 = centerY + Math.sin(angle) * innerRadius;
            const x2 = centerX + Math.cos(angle) * outerRadius;
            const y2 = centerY + Math.sin(angle) * outerRadius;

            // Draw the radial bar
            this.ctx.strokeStyle = this.getColor(i, bandCount, amplitude);
            this.ctx.lineWidth = this.lineWidth || 3;
            this.ctx.lineCap = this.roundBars ? 'round' : 'butt';
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            // Draw peak if enabled
            if (this.showPeaks && this.peaks[i] > 0.01) {
                const peakAmplitude = this.linearAmplitude ? this.peaks[i] * this.linearBoost : this.peaks[i];
                const peakLength = peakAmplitude * maxRadius * 0.6;
                const peakRadius = this.radialInvert ? maxRadius - peakLength : innerRadius + peakLength;
                const px = centerX + Math.cos(angle) * peakRadius;
                const py = centerY + Math.sin(angle) * peakRadius;

                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(px, py, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    applyMirror() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        if (this.mirror === -1) { // Horizontal mirror
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(this.canvas, 0, 0);

            this.ctx.save();
            this.ctx.globalAlpha = 0.9;
            this.ctx.scale(1, -1);
            this.ctx.drawImage(tempCanvas, 0, - height, width, height);
            this.ctx.restore();
        } else if (this.mirror === 1) { // Vertical mirror
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(this.canvas, 0, 0);

            this.ctx.save();
            this.ctx.globalAlpha = 0.5;
            this.ctx.scale(-1, 1);
            this.ctx.translate(- width, 0);
            this.ctx.drawImage(tempCanvas, 0, 0);
            this.ctx.restore();
        }
    }

    applyReflection() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const reflexHeight = height * this.reflexRatio;

        if (reflexHeight <= 0) 
            return;
        


        this.ctx.save();

        this.ctx.translate(0, height);
        this.ctx.scale(1, -1);

        this.ctx.globalAlpha = this.reflexAlpha;

        this.ctx.drawImage(this.canvas, 0, - reflexHeight, width, reflexHeight, 0, 0, width, reflexHeight);

        this.ctx.globalCompositeOperation = 'destination-out';
        const gradient = this.ctx.createLinearGradient(0, 0, 0, reflexHeight);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,1)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, reflexHeight);

        this.ctx.restore();
    }

    applyColorSchemeGradient(gradient) {
        switch (this.currentColorScheme) {
            case 'earthtones':
                gradient.addColorStop(0, '#8B4513');
                gradient.addColorStop(0.25, '#D2691E');
                gradient.addColorStop(0.5, '#CD853F');
                gradient.addColorStop(0.75, '#F4A460');
                gradient.addColorStop(1, '#DEB887');
                break;
            case 'luigi':
                gradient.addColorStop(0, '#00A000');
                gradient.addColorStop(0.33, '#00FF00');
                gradient.addColorStop(0.66, '#0000FF');
                gradient.addColorStop(1, '#FFFF00');
                break;
            case 'metal':
                gradient.addColorStop(0, '#2C2C2C');
                gradient.addColorStop(0.25, '#606060');
                gradient.addColorStop(0.5, '#808080');
                gradient.addColorStop(0.75, '#C0C0C0');
                gradient.addColorStop(1, '#E5E5E5');
                break;
            case 'psychedelic':
                gradient.addColorStop(0, '#FF1493');
                gradient.addColorStop(0.2, '#9400D3');
                gradient.addColorStop(0.4, '#00CED1');
                gradient.addColorStop(0.6, '#FFD700');
                gradient.addColorStop(0.8, '#FF69B4');
                gradient.addColorStop(1, '#00FFFF');
                break;
            default:
                gradient.addColorStop(0, 'hsl(0, 100%, 60%)');
                gradient.addColorStop(0.17, 'hsl(60, 100%, 60%)');
                gradient.addColorStop(0.33, 'hsl(120, 100%, 60%)');
                gradient.addColorStop(0.5, 'hsl(180, 100%, 60%)');
                gradient.addColorStop(0.67, 'hsl(240, 100%, 60%)');
                gradient.addColorStop(0.83, 'hsl(300, 100%, 60%)');
                gradient.addColorStop(1, 'hsl(360, 100%, 60%)');
                break;
        }
    }

    getColor(index, total, value) {
        const intensity = 0.4 + value * 0.6;

        switch (this.currentColorScheme) {
            case 'earthtones':
                const earthColors = [
                    '#8B4513',
                    '#D2691E',
                    '#CD853F',
                    '#F4A460',
                    '#DEB887'
                ];
                const earthIndex = Math.floor((index / total) * earthColors.length);
                return earthColors[earthIndex];

            case 'luigi':
                const luigiColors = ['#00A000', '#00FF00', '#0000FF', '#FFFF00'];
                const luigiIndex = Math.floor((index / total) * luigiColors.length);
                return luigiColors[luigiIndex];

            case 'metal':
                const metalColors = [
                    '#2C2C2C',
                    '#606060',
                    '#808080',
                    '#C0C0C0',
                    '#E5E5E5'
                ];
                const metalIndex = Math.floor((index / total) * metalColors.length);
                return metalColors[metalIndex];

            case 'psychedelic':
                const psychColors = [
                    '#FF1493',
                    '#9400D3',
                    '#00CED1',
                    '#FFD700',
                    '#FF69B4',
                    '#00FFFF'
                ];
                const psychIndex = Math.floor((index / total) * psychColors.length);
                return psychColors[psychIndex];

            default:
                switch (this.gradient) {
                    case 'classic':
                        const hue = 120 - (index / total) * 120;
                        return `hsla(${hue}, 100%, ${
                            50 * intensity
                        }%, ${
                            this.fillAlpha
                        })`;

                    case 'rainbow':
                        const rainbowHue = (index / total) * 360;
                        return `hsla(${rainbowHue}, 100%, ${60}%, ${
                            this.fillAlpha
                        })`;

                    case 'prism':
                        const prismHue = 180 + (index / total) * 180;
                        return `hsla(${prismHue}, 80%, ${
                            60 * intensity
                        }%, ${
                            this.fillAlpha
                        })`;

                    case 'steelblue':
                        return `rgba(${
                            70 * intensity
                        }, ${
                            130 * intensity
                        }, ${
                            180 * intensity
                        }, ${
                            this.fillAlpha
                        })`;

                    case 'orangered':
                        const orange = 255 * intensity;
                        const red = Math.min(255, orange * 1.5);
                        return `rgba(${red}, ${
                            orange * 0.6
                        }, 0, ${
                            this.fillAlpha
                        })`;

                    default:
                        const defaultHue = (index / total) * 120;
                        return `hsla(${
                            120 + defaultHue
                        }, 100%, ${
                            50 * intensity
                        }%, ${
                            this.fillAlpha
                        })`;
                }
        }
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.disconnectInput();
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// ****
// ****

// Enhanced Parameter Mapping System
