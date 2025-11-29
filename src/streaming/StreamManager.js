// src/streaming/StreamManager.js

/**
 * StreamManager - Manages WebRTC streaming and canvas capture
 * Handles streaming to external displays via BroadcastChannel
 * 
 * Dependencies: FrequeVisualizer (passed as parameter)
 * Used by: FrequeVisualizer
 */
class StreamManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.pc = null;
        this.stream = null;
        this.channel = new BroadcastChannel('freque-live-display');
        this.displayWindow = null;
        this.isStreaming = false;
        this.captureCanvas = null;
        this.captureCtx = null;
        this.animationFrame = null;
        this.pendingIceCandidates = []; // Queue for ICE candidates received before remote description
        this.hasOffered = false; // Track if we've already sent an offer

        // Display settings
        this.displaySettings = this.loadDisplaySettings();

        this.init();
    }

    init() { // Listen for messages from display window
        this.channel.onmessage = async (event) => {
            const {type, data} = event.data;

            switch (type) {
                case 'display-ready':
                    console.log('Display window ready');
                    // Only start streaming if we're supposed to be streaming and don't have a connection
                    if (this.isStreaming && (!this.pc || this.pc.connectionState === 'closed' || this.pc.connectionState === 'failed')) {
                        console.log('Starting streaming after display ready');
                        try {
                            await this.startStreaming();
                        } catch (error) {
                            console.error('Failed to start streaming:', error);
                            this.handleStreamingError(error);
                        }
                    } else if (this.pc) {
                        console.log('Peer connection already exists, state:', this.pc.connectionState);
                    }
                    break;
                case 'answer':
                    await this.handleAnswer(data);
                    break;
                case 'ice-candidate-answer':
                    await this.handleIceCandidate(data);
                    break;
                case 'pong':
                    console.log('Display window alive');
                    break;
            }
        };
    }

    loadDisplaySettings() {
        const saved = localStorage.getItem('freque_display_settings');
        return saved ? JSON.parse(saved) : {
            presentationMode: 'fit', // Default to Fit mode
            aspectRatio: '4:3',  // Default to 4:3 aspect ratio
            captureResolution: 2560,  // Changed to 2K default
            captureFrameRate: 60,
            captureBitrate: 30,  // Changed to 30 Mbps default
            displaySharpness: 0,
            letterboxColor: '#000000',
            mirrorBackground: false,
            mirrorBackgroundBlur: 20,
            captureVideo: true,  // Control video capture to Live Display
            captureVisualization: true,  // Control visualization capture to Live Display
            captureInfiniteZoom: true,  // Control Infinite Zoom capture to Live Display
            matchVideoInput: false  // Control whether to match video input aspect ratio
        };
    }

    saveDisplaySettings() {
        localStorage.setItem('freque_display_settings', JSON.stringify(this.displaySettings));
    }

    updateDisplaySettings(settings) {
        Object.assign(this.displaySettings, settings);
        this.saveDisplaySettings();

        // Send settings to display window
        this.channel.postMessage({type: 'display-settings', data: this.displaySettings});

        // If streaming, reconfigure capture
        if (this.isStreaming) {
            this.reconfigureCapture();
        }
    }

    reconfigureCapture() { // Update capture canvas size based on resolution and aspect ratio
        const width = this.displaySettings.captureResolution;
        let height;
        
        // Calculate height based on aspect ratio setting
        if (this.displaySettings.matchVideoInput && 
            this.visualizer && (this.visualizer.videoMode === 'camera' || this.visualizer.videoMode === 'file') && 
            this.visualizer.videoElement && this.visualizer.videoElement.videoWidth > 0) {
            // Use video input aspect ratio
            const videoAspect = this.visualizer.videoElement.videoWidth / this.visualizer.videoElement.videoHeight;
            height = Math.round(width / videoAspect);
            console.log(`Using video aspect ratio: ${this.visualizer.videoElement.videoWidth}x${this.visualizer.videoElement.videoHeight} (${videoAspect.toFixed(3)})`);
        } else {
            // Use canvas aspect ratio (like Record system) - captures whatever is visible
            const canvas = this.visualizer.audioMotion?.canvas;
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                const canvasAspect = canvas.width / canvas.height;
                height = Math.round(width / canvasAspect);
                console.log(`Using canvas aspect ratio: ${canvas.width}x${canvas.height} (${canvasAspect.toFixed(3)})`);
            } else {
                // Fallback to manual aspect ratio setting
            const [ratioW, ratioH] = this.displaySettings.aspectRatio.split(':').map(Number);
            if (ratioW && ratioH) {
                const aspectRatio = ratioW / ratioH;
                height = Math.round(width / aspectRatio);
                console.log(`Using manual aspect ratio: ${ratioW}:${ratioH} (${aspectRatio.toFixed(3)})`);
            } else {
                // Fallback to 16:9 if invalid aspect ratio
                height = Math.round(width * 9 / 16);
                console.log('Using fallback 16:9 aspect ratio');
                }
            }
        }

        if (this.captureCanvas) {
            this.captureCanvas.width = width;
            this.captureCanvas.height = height;
            console.log(`Reconfigured capture canvas to ${width}x${height}`);
        }

        // Update WebRTC parameters if connection exists
        if (this.pc) {
            const senders = this.pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');

            if (videoSender) {
                const params = videoSender.getParameters();
                if (! params.encodings) {
                    params.encodings = [{}];
                }

                params.encodings[0].maxBitrate = this.displaySettings.captureBitrate * 1000000;
                params.encodings[0].maxFramerate = this.displaySettings.captureFrameRate;

                videoSender.setParameters(params).then(() => console.log('Updated WebRTC parameters')).catch(e => console.error('Failed to update parameters:', e));
            }
        }
    }

    calculateHeightForAspectRatio(width, ratio) {
        const ratioMap = {
            '16:9': 9 / 16,
            '4:3': 3 / 4,
            '1:1': 1,
            '9:16': 16 / 9,
            '21:9': 9 / 21,
            'auto': 9 / 16 // Default to 16:9 for auto
        };
        return Math.round(width * (ratioMap[ratio] || 9 / 16));
    }

    sendVideoFilters() {
        if (!this.isStreaming) 
            return;
        


        // Collect all video filter values including opacity
        const filters = {
            brightness: this.visualizer.videoBrightness || 100,
            contrast: this.visualizer.videoContrast || 100,
            saturation: this.visualizer.videoSaturation || 100,
            hueRotate: this.visualizer.videoHueRotate || 0,
            grayscale: this.visualizer.videoGrayscale || 0,
            sepia: this.visualizer.videoSepia || 0,
            blur: this.visualizer.videoBlur || 0,
            invert: this.visualizer.videoInvert || false,
            opacity: this.visualizer.videoOpacity || 1, // Send actual opacity value
            mirror: this.visualizer.videoMirror || 'off',
            vignette: this.visualizer.videoVignette || 0,
            posterize: this.visualizer.videoPosterize || 16
        };

        // Send via BroadcastChannel
        this.channel.postMessage({type: 'video-filters', data: filters});
    }

    async toggleLiveDisplay() {
        if (this.isStreaming) {
            this.stopStreaming();
        } else {
            if (this.openDisplayWindow()) {
                // Start streaming immediately when window opens
                // The display window will send 'display-ready' and we'll handle it
                this.isStreaming = true;
                // Set this BEFORE opening so we're ready

                // Update button state immediately - both sidebar and footer buttons
                const btns = document.querySelectorAll('#liveDisplayBtn');
                btns.forEach(btn => {
                    btn.classList.add('active');
                    btn.textContent = 'Stop Display';
                });
            }
        }
    }

    openDisplayWindow() { // Open display window
        // First, set performance mode for optimal quality
        const performancePreset = {
            presentationMode: 'fit',  // Use 'fit' for proper video sizing
            aspectRatio: '16:9',      // Default to 16:9 aspect ratio
            captureResolution: 2560,  // 2K resolution default
            captureFrameRate: 60,
            captureBitrate: 30,
            displaySharpness: 0,
            letterboxColor: '#000000',
            mirrorBackground: false,
            mirrorBackgroundBlur: 20
        };
        
        // Apply performance settings
        this.updateDisplaySettings(performancePreset);
        
        const width = 1280;
        const height = 720;
        const left = window.screen.width - width - 50;
        const top = 50;

        this.displayWindow = window.open('display.html', 'Freque Live Display', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`);

        if (!this.displayWindow) {
            alert('Please allow pop-ups to open the display window');
            return false;
        }

        // Add window focus to ensure it's visible
        this.displayWindow.focus();

        // Monitor window close
        const checkWindow = setInterval(() => {
            if (this.displayWindow && this.displayWindow.closed) {
                clearInterval(checkWindow);
                console.log('Display window was closed manually');
                this.stopStreaming();
            }
        }, 1000);

        // Add timeout for initial connection
        setTimeout(() => {
            if (!this.pc && this.isStreaming) {
                console.warn('Connection not established within timeout period');
                // Send a ping to check if display window is responsive
                this.channel.postMessage({type: 'ping'});
            }
        }, 5000);

        return true;
    }

    async startStreaming() { // Clean up any existing connection and canvases first
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }

        // Clean up any existing stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Clear any pending ICE candidates from previous attempts
        this.pendingIceCandidates = [];
        
        // Reset offer tracking
        this.hasOffered = false;

        // Force cleanup of existing canvases
        if (this.captureCanvas) {
            if (this.captureCanvas.parentNode) {
                this.captureCanvas.parentNode.removeChild(this.captureCanvas);
            }
            this.captureCanvas = null;
            this.captureCtx = null;
        }

        // Also cleanup temp video canvas
        this.tempVideoCanvas = null;
        this.tempVideoCtx = null;

        this.isStreaming = true;

        console.log('Starting fresh streaming session');

        // Send initial video filter state
        this.sendVideoFilters();

        // Send initial display settings
        this.channel.postMessage({type: 'display-settings', data: this.displaySettings});

        try { // Create capture canvas - this will now always create fresh
            this.setupCaptureCanvas();

            // Start capturing
            this.startCapture();

            // Get stream from capture canvas (try without frame rate parameter)
            this.stream = this.captureCanvas.captureStream();

            console.log('Stream created with tracks:', this.stream.getTracks().length);

            // Create peer connection with better config
            this.pc = new RTCPeerConnection({
                iceServers: [
                    {
                        urls: 'stun:stun.l.google.com:19302'
                    }
                ],
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            });

            // Add tracks to peer connection with encoding parameters
            this.stream.getTracks().forEach(track => {
                console.log('Adding track:', track.kind);
                const sender = this.pc.addTrack(track, this.stream);

                // Set high quality parameters for video track
                if (track.kind === 'video') {
                    const params = sender.getParameters();
                    if (! params.encodings) {
                        params.encodings = [{}];
                    }

                    // Use configured bitrate and frame rate
                    params.encodings[0].maxBitrate = this.displaySettings.captureBitrate * 1000000;
                    params.encodings[0].scaleResolutionDownBy = 1.0; // No downscaling
                    params.encodings[0].maxFramerate = this.displaySettings.captureFrameRate;

                    sender.setParameters(params).then(() => console.log('Video parameters set for configured quality')).catch(e => console.error('Failed to set video parameters:', e));
                }
            });

            // Handle ICE candidates
            this.pc.onicecandidate = (event) => {
                if (event.candidate) { // Serialize the ICE candidate to a plain object
                    this.channel.postMessage({
                        type: 'ice-candidate',
                        data: {
                            candidate: event.candidate.candidate,
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            sdpMid: event.candidate.sdpMid,
                            usernameFragment: event.candidate.usernameFragment
                        }
                    });
                }
            };

            // Monitor connection state
            this.pc.onconnectionstatechange = () => {
                console.log('PC Connection state:', this.pc.connectionState);
                console.log('PC Signaling state:', this.pc.signalingState);
                
                if (this.pc.connectionState === 'connected') {
                } else if (this.pc.connectionState === 'failed') {
                    console.log('❌ Connection failed, may need to restart');
                    this.handleStreamingError(new Error('WebRTC connection failed'));
                } else if (this.pc.connectionState === 'disconnected') {
                    console.log('⚠️ Connection disconnected');
                }
            };

            // Create and send offer - only if we haven't already
            if (!this.hasOffered) {
                const offer = await this.pc.createOffer();
                await this.pc.setLocalDescription(offer);

                this.channel.postMessage({type: 'offer', data: offer});
                this.hasOffered = true;
            } else {
                console.log('Offer already sent, skipping duplicate');
            }

        } catch (error) {
            console.error('Error starting stream:', error);
            this.stopStreaming();
        }
    }

    setupCaptureCanvas() { // Always create a fresh canvas for capturing
        this.captureCanvas = document.createElement('canvas');
        this.captureCtx = this.captureCanvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false
        });

        // Use configured resolution with proper aspect ratio
        const width = this.displaySettings.captureResolution;
        let height;
        
        // Calculate height based on aspect ratio setting
        if (this.displaySettings.matchVideoInput && 
            this.visualizer && (this.visualizer.videoMode === 'camera' || this.visualizer.videoMode === 'file') && 
            this.visualizer.videoElement && this.visualizer.videoElement.videoWidth > 0) {
            // Use video input aspect ratio
            const videoAspect = this.visualizer.videoElement.videoWidth / this.visualizer.videoElement.videoHeight;
            height = Math.round(width / videoAspect);
        } else {
            // Use canvas aspect ratio (like Record system) - captures whatever is visible
            const canvas = this.visualizer.audioMotion?.canvas;
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                const canvasAspect = canvas.width / canvas.height;
                height = Math.round(width / canvasAspect);
            } else {
                // Fallback to manual aspect ratio setting
            const [ratioW, ratioH] = this.displaySettings.aspectRatio.split(':').map(Number);
            if (ratioW && ratioH) {
                const aspectRatio = ratioW / ratioH;
                height = Math.round(width / aspectRatio);
            } else {
                // Fallback to 16:9 if invalid aspect ratio
                height = Math.round(width * 9 / 16);
                }
            }
        }

        this.captureCanvas.width = width;
        this.captureCanvas.height = height;

        // Store base dimensions for consistent scaling (match actual capture canvas aspect ratio)
        this.baseCaptureWidth = 2560;
        this.baseCaptureHeight = Math.round(2560 * height / width); // Match capture canvas aspect ratio
        this.captureScale = width / this.baseCaptureWidth; // Scale factor for quality enhancement

        console.log('Capture canvas size:', this.captureCanvas.width, 'x', this.captureCanvas.height, `(${(width/height).toFixed(3)} aspect ratio)`);
        console.log('Capture scale factor:', this.captureScale, 'x for', this.displaySettings.captureResolution + 'px quality');
    }

    startCapture() {
        console.log('startCapture() method called');
        let frameCount = 0;
        let pulsePhase = 0; // For pulse animation

        const capture = () => {
            // Continue capturing if streaming OR if file video is playing
            if (!this.isStreaming && this.visualizer.videoMode !== 'file') {
                return;
            }
            


            try {
                const container = document.getElementById('visualizationContainer');
                if (! container) {
                    console.error('Container not found');
                    this.animationFrame = requestAnimationFrame(capture);
                    return;
                }

                // Clear capture canvas
                this.captureCtx.fillStyle = this.visualizer.backgroundColor || '#000000';
                this.captureCtx.fillRect(0, 0, this.captureCanvas.width, this.captureCanvas.height);

                // Layer 0: Background Image - now handled by DOM element layer, not canvas drawing
                // Background image will be captured as part of the visual composite

                // Layer 1: Video background - ONLY IF KALEIDOSCOPE VIDEO IS NOT ACTIVE AND CAPTURE VIDEO IS ENABLED
                if (this.displaySettings.captureVideo && (this.visualizer.videoMode === 'camera' || this.visualizer.videoMode === 'file') && !(this.visualizer.kaleidoscopeEnabled && this.visualizer.kaleidoscopeApplyToVideo)) { // Create temporary canvas for video if needed
                    if (!this.tempVideoCanvas) {
                        this.tempVideoCanvas = document.createElement('canvas');
                        this.tempVideoCanvas.width = this.captureCanvas.width;
                        this.tempVideoCanvas.height = this.captureCanvas.height;
                        this.tempVideoCtx = this.tempVideoCanvas.getContext('2d');
                    }

                    // Update temp canvas size if capture canvas changed
                    if (this.tempVideoCanvas.width !== this.captureCanvas.width || this.tempVideoCanvas.height !== this.captureCanvas.height) {
                        this.tempVideoCanvas.width = this.captureCanvas.width;
                        this.tempVideoCanvas.height = this.captureCanvas.height;
                    }

                    const videoSource = this.visualizer.captureVideoElement || this.visualizer.videoElement;
                    
                    // Debug: Log what video elements are available
                    if (frameCount % 60 === 0) { // Log every 60 frames to avoid spam
                        //     captureVideoElement: !!this.visualizer.captureVideoElement,
                        //     videoElement: !!this.visualizer.videoElement
                        // });
                        // if (videoSource) {
                        //         readyState: videoSource.readyState,
                        //         dimensions: videoSource.videoWidth + 'x' + videoSource.videoHeight,
                        //         paused: videoSource.paused,
                        //         currentTime: videoSource.currentTime
                        //     });
                        // }
                    }

                    if (videoSource && videoSource.readyState >= 2) {
                        if (frameCount % 60 === 0) {
                        }
                        // Clear temp canvas
                        this.tempVideoCtx.clearRect(0, 0, this.tempVideoCanvas.width, this.tempVideoCanvas.height);

                        this.tempVideoCtx.save();

                        // Apply mirror transformations FIRST
                        if (this.visualizer.videoMirror === 'horizontal' || this.visualizer.videoMirror === 'both') {
                            this.tempVideoCtx.scale(-1, 1);
                            this.tempVideoCtx.translate(-this.tempVideoCanvas.width, 0);
                        }
                        if (this.visualizer.videoMirror === 'vertical' || this.visualizer.videoMirror === 'both') {
                            this.tempVideoCtx.scale(1, -1);
                            this.tempVideoCtx.translate(0, -this.tempVideoCanvas.height);
                        }

                        // Build filter string
                        const filters = [];

                        // Apply posterize FIRST with much stronger effect
                        if (this.visualizer.videoPosterize < 16) {
                            const steps = this.visualizer.videoPosterize;
                            const posterizeAmount = (16 - steps) / 16;
                            filters.push(`contrast(${
                                300 + posterizeAmount * 200
                            }%)`);
                            filters.push(`brightness(${95}%)`);
                            filters.push(`saturate(${200}%)`);
                            if (steps < 8) {
                                filters.push(`contrast(${150}%)`);
                            }
                        }

                        // Then other filters
                        if (this.visualizer.videoBrightness !== 100 && this.visualizer.videoPosterize >= 16) {
                            filters.push(`brightness(${
                                this.visualizer.videoBrightness
                            }%)`);
                        }
                        if (this.visualizer.videoContrast !== 100 && this.visualizer.videoPosterize >= 16) {
                            filters.push(`contrast(${
                                this.visualizer.videoContrast
                            }%)`);
                        }
                        if (this.visualizer.videoSaturation !== 100 && this.visualizer.videoPosterize >= 16) {
                            filters.push(`saturate(${
                                this.visualizer.videoSaturation
                            }%)`);
                        }
                        if (this.visualizer.videoHueRotate !== 0) {
                            filters.push(`hue-rotate(${
                                this.visualizer.videoHueRotate
                            }deg)`);
                        }
                        if (this.visualizer.videoGrayscale > 0) {
                            filters.push(`grayscale(${
                                this.visualizer.videoGrayscale
                            }%)`);
                        }
                        if (this.visualizer.videoSepia > 0) {
                            filters.push(`sepia(${
                                this.visualizer.videoSepia
                            }%)`);
                        }
                        if (this.visualizer.videoBlur > 0) {
                            filters.push(`blur(${
                                this.visualizer.videoBlur
                            }px)`);
                        }
                        if (this.visualizer.videoInvert) {
                            filters.push('invert(100%)');
                        }

                        this.tempVideoCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
                        this.tempVideoCtx.globalAlpha = 1;

                        // Draw video to temp canvas
                        this.tempVideoCtx.drawImage(videoSource, 0, 0, this.tempVideoCanvas.width, this.tempVideoCanvas.height);

                        this.tempVideoCtx.restore();

                        // Calculate pulse scale if enabled
                        let scale = 1;
                        if (this.visualizer.videoPulse) {
                            const pulseDuration = this.visualizer.videoPulseRate * 1000; // Convert to ms
                            pulsePhase = (Date.now() % pulseDuration) / pulseDuration;
                            scale = 1 + (Math.sin(pulsePhase * Math.PI * 2) * 0.02); // 2% scale variation
                        }

                        // Draw temp canvas to main canvas with opacity and pulse
                        this.captureCtx.save();
                        this.captureCtx.globalAlpha = this.visualizer.videoOpacity || 1;

                        if (scale !== 1) {
                            const centerX = this.captureCanvas.width / 2;
                            const centerY = this.captureCanvas.height / 2;
                            this.captureCtx.translate(centerX, centerY);
                            this.captureCtx.scale(scale, scale);
                            this.captureCtx.translate(- centerX, - centerY);
                        }

                        this.captureCtx.drawImage(this.tempVideoCanvas, 0, 0);
                        this.captureCtx.restore();

                        // Draw vignette AFTER video but BEFORE visualization
                        if (this.visualizer.videoVignette > 0) {
                            this.captureCtx.save();
                            const intensity = this.visualizer.videoVignette / 100;
                            const size = (100 - this.visualizer.videoVignette) / 100;

                            const gradient = this.captureCtx.createRadialGradient(this.captureCanvas.width / 2, this.captureCanvas.height / 2, Math.min(this.captureCanvas.width, this.captureCanvas.height) * size * 0.5, this.captureCanvas.width / 2, this.captureCanvas.height / 2, Math.max(this.captureCanvas.width, this.captureCanvas.height) * 0.7);
                            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                            gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

                            this.captureCtx.fillStyle = gradient;
                            this.captureCtx.fillRect(0, 0, this.captureCanvas.width, this.captureCanvas.height);
                            this.captureCtx.restore();
                        }
                    }
                }

                // Layer 2: Kaleidoscope video (if active) - WITH FILTERS APPLIED AND CAPTURE VIDEO IS ENABLED
                if (this.displaySettings.captureVideo && this.visualizer.kaleidoscopeEnabled && this.visualizer.kaleidoscopeApplyToVideo && this.visualizer.kaleidoscopeVideoCanvas && this.visualizer.kaleidoscopeVideoCanvas.style.display !== 'none') {

                    this.captureCtx.save();

                    // Apply video filters to kaleidoscope
                    const filters = [];

                    if (this.visualizer.videoPosterize < 16) {
                        const steps = this.visualizer.videoPosterize;
                        const posterizeAmount = (16 - steps) / 16;
                        filters.push(`contrast(${
                            300 + posterizeAmount * 200
                        }%)`);
                        filters.push(`brightness(${95}%)`);
                        filters.push(`saturate(${200}%)`);
                        if (steps < 8) {
                            filters.push(`contrast(${150}%)`);
                        }
                    }

                    if (this.visualizer.videoBrightness !== 100 && this.visualizer.videoPosterize >= 16) {
                        filters.push(`brightness(${
                            this.visualizer.videoBrightness
                        }%)`);
                    }
                    if (this.visualizer.videoContrast !== 100 && this.visualizer.videoPosterize >= 16) {
                        filters.push(`contrast(${
                            this.visualizer.videoContrast
                        }%)`);
                    }
                    if (this.visualizer.videoSaturation !== 100 && this.visualizer.videoPosterize >= 16) {
                        filters.push(`saturate(${
                            this.visualizer.videoSaturation
                        }%)`);
                    }
                    if (this.visualizer.videoHueRotate !== 0) {
                        filters.push(`hue-rotate(${
                            this.visualizer.videoHueRotate
                        }deg)`);
                    }
                    if (this.visualizer.videoGrayscale > 0) {
                        filters.push(`grayscale(${
                            this.visualizer.videoGrayscale
                        }%)`);
                    }
                    if (this.visualizer.videoSepia > 0) {
                        filters.push(`sepia(${
                            this.visualizer.videoSepia
                        }%)`);
                    }
                    if (this.visualizer.videoBlur > 0) {
                        filters.push(`blur(${
                            this.visualizer.videoBlur
                        }px)`);
                    }
                    if (this.visualizer.videoInvert) {
                        filters.push('invert(100%)');
                    }

                    this.captureCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
                    this.captureCtx.globalAlpha = this.visualizer.videoOpacity || 1;

                    // Apply pulse if enabled
                    if (this.visualizer.videoPulse) {
                        const pulseDuration = this.visualizer.videoPulseRate * 1000;
                        pulsePhase = (Date.now() % pulseDuration) / pulseDuration;
                        const scale = 1 + (Math.sin(pulsePhase * Math.PI * 2) * 0.02);

                        if (scale !== 1) {
                            const centerX = this.captureCanvas.width / 2;
                            const centerY = this.captureCanvas.height / 2;
                            this.captureCtx.translate(centerX, centerY);
                            this.captureCtx.scale(scale, scale);
                            this.captureCtx.translate(- centerX, - centerY);
                        }
                    }

                    // Draw kaleidoscope video canvas with proper scaling
                    this.captureCtx.save();
                    this.captureCtx.scale(this.captureScale, this.captureScale);
                    this.captureCtx.drawImage(this.visualizer.kaleidoscopeVideoCanvas, 0, 0, this.baseCaptureWidth, this.baseCaptureHeight);
                    this.captureCtx.restore();

                    this.captureCtx.restore();

                    // Apply vignette to kaleidoscope if needed
                    if (this.visualizer.videoVignette > 0) {
                        this.captureCtx.save();
                        const intensity = this.visualizer.videoVignette / 100;
                        const size = (100 - this.visualizer.videoVignette) / 100;

                        const gradient = this.captureCtx.createRadialGradient(this.captureCanvas.width / 2, this.captureCanvas.height / 2, Math.min(this.captureCanvas.width, this.captureCanvas.height) * size * 0.5, this.captureCanvas.width / 2, this.captureCanvas.height / 2, Math.max(this.captureCanvas.width, this.captureCanvas.height) * 0.7);
                        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

                        this.captureCtx.fillStyle = gradient;
                        this.captureCtx.fillRect(0, 0, this.captureCanvas.width, this.captureCanvas.height);
                        this.captureCtx.restore();
                    }

                    if (frameCount % 60 === 0) {
                        console.log('Captured video kaleidoscope with filters');
                    }
                }

                // Reset context state completely before viz layers
                this.captureCtx.save();
                this.captureCtx.filter = 'none';
                this.captureCtx.globalAlpha = 1;
                this.captureCtx.globalCompositeOperation = 'source-over';

                // Layer 3: Main visualization - Only if kaleidoscope viz is NOT active AND CAPTURE VISUALIZATION IS ENABLED
                if (this.displaySettings.captureVisualization && (!this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeEnabled)) {
                    let vizCanvas = null;

                    if (this.visualizer.audioMotion && this.visualizer.audioMotion.canvas) {
                        vizCanvas = this.visualizer.audioMotion.canvas;
                    }

                    if (! vizCanvas) {
                        const canvases = container.getElementsByTagName('canvas');
                        for (let canvas of canvases) {
                            if (! canvas.classList.contains('kaleidoscope-canvas') && canvas.width > 0 && canvas.height > 0 && canvas.id !== 'bgVideoCaptureClean') {
                                vizCanvas = canvas;
                                break;
                            }
                        }
                    }

                    if (vizCanvas && vizCanvas.width > 0 && vizCanvas.height > 0) {
                        const isVisible = vizCanvas.style.visibility !== 'hidden' && vizCanvas.style.display !== 'none';

                        if (isVisible) {
                            // Scale the visualization to maintain consistent visual size regardless of capture resolution
                            this.captureCtx.save();
                            this.captureCtx.scale(this.captureScale, this.captureScale);
                            this.captureCtx.drawImage(vizCanvas, 0, 0, this.baseCaptureWidth, this.baseCaptureHeight);
                            this.captureCtx.restore();

                            if (frameCount % 60 === 0) {
                                console.log('Capturing viz from canvas:', vizCanvas.width, 'x', vizCanvas.height, 'scaled by', this.captureScale + 'x');
                            }
                        }
                    }
                }

                this.captureCtx.restore();

                // Layer 4: Kaleidoscope viz (if active) AND CAPTURE VISUALIZATION IS ENABLED
                if (this.displaySettings.captureVisualization && this.visualizer.kaleidoscopeEnabled && this.visualizer.kaleidoscopeApplyToViz && this.visualizer.kaleidoscopeVizCanvas && this.visualizer.kaleidoscopeVizCanvas.style.display !== 'none') {

                    this.captureCtx.save();
                    this.captureCtx.globalAlpha = 1;
                    this.captureCtx.filter = 'none';

                    // Draw kaleidoscope viz canvas with proper scaling
                    this.captureCtx.save();
                    this.captureCtx.scale(this.captureScale, this.captureScale);
                    this.captureCtx.drawImage(this.visualizer.kaleidoscopeVizCanvas, 0, 0, this.baseCaptureWidth, this.baseCaptureHeight);
                    this.captureCtx.restore();

                    if (frameCount % 60 === 0) {
                        console.log('Captured viz kaleidoscope scaled by', this.captureScale + 'x');
                    }

                    this.captureCtx.restore();
                }

                // Layer 5: Infinite Zoom (only when NOT captured via kaleidoscope) AND CAPTURE INFINITE ZOOM IS ENABLED
                if (this.displaySettings.captureInfiniteZoom && this.visualizer.infiniteZoom && this.visualizer.infiniteZoom.isActive && this.visualizer.infiniteZoom.canvas) {
                    // Only capture Infinite Zoom separately if kaleidoscope is OFF or not applying to viz or not applying to infinite zoom
                    const shouldCaptureSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeApplyToInfiniteZoom;
                    
                    if (shouldCaptureSeparately) {
                        this.captureCtx.save();
                        this.captureCtx.globalAlpha = this.visualizer.infiniteZoom.opacity || 1;
                        this.captureCtx.filter = 'none';

                        // Draw Infinite Zoom canvas with proper scaling
                        this.captureCtx.save();
                        this.captureCtx.scale(this.captureScale, this.captureScale);
                        this.captureCtx.drawImage(this.visualizer.infiniteZoom.canvas, 0, 0, this.baseCaptureWidth, this.baseCaptureHeight);
                        this.captureCtx.restore();

                        if (frameCount % 60 === 0) {
                            console.log('Captured Infinite Zoom separately scaled by', this.captureScale + 'x');
                        }

                        this.captureCtx.restore();
                    } else if (frameCount % 60 === 0) {
                        console.log('Infinite Zoom captured via kaleidoscope - skipping separate capture');
                    }
                }

                // Layer 6: WebGL (only when NOT captured via kaleidoscope) AND CAPTURE WEBGL IS ENABLED
                if (this.displaySettings.captureWebGL && this.visualizer.webglEnabled && this.visualizer.webglVisualization && this.visualizer.webglVisualization.isActive && this.visualizer.webglVisualization.canvas) {
                    // Check WebGL support before attempting to capture
                    if (!this.visualizer.webglVisualization.webglSupported) {
                        if (frameCount % 60 === 0) {
                            console.warn('🎮 Stream: WebGL not supported - skipping WebGL capture');
                        }
                    } else {
                        // Only capture WebGL separately if kaleidoscope is OFF or not applying to viz or not applying to webgl
                        const shouldCaptureSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeApplyToWebGL;
                        
                        if (shouldCaptureSeparately) {
                            this.captureCtx.save();
                            this.captureCtx.globalAlpha = 1; // WebGL doesn't have opacity setting like Infinite Zoom
                            this.captureCtx.filter = 'none';

                            // Draw WebGL canvas with proper scaling
                            this.captureCtx.save();
                            this.captureCtx.scale(this.captureScale, this.captureScale);
                            this.captureCtx.drawImage(this.visualizer.webglVisualization.canvas, 0, 0, this.baseCaptureWidth, this.baseCaptureHeight);
                            this.captureCtx.restore();

                            if (frameCount % 60 === 0) {
                                console.log('Captured WebGL separately scaled by', this.captureScale + 'x');
                            }

                            this.captureCtx.restore();
                        } else if (frameCount % 60 === 0) {
                            console.log('WebGL captured via kaleidoscope - skipping separate capture');
                        }
                    }
                }

                frameCount++;

            } catch (error) {
                console.error('Capture error:', error);
            }

            this.animationFrame = requestAnimationFrame(capture);
        };

        capture();
    }

    async handleAnswer(answer) {
        try {
            if (!this.pc) {
                console.warn('No peer connection available for answer');
                return;
            }

            console.log('Handling answer, current signaling state:', this.pc.signalingState);
            console.log('Connection state:', this.pc.connectionState);

            if (this.pc.signalingState === 'have-local-offer') {
                await this.pc.setRemoteDescription(answer);
                console.log('Answer set successfully');
                
                // Process any queued ICE candidates now that we have remote description
                await this.processPendingIceCandidates();
            } else if (this.pc.signalingState === 'stable') {
                console.log('Peer connection already stable, ignoring duplicate answer');
                // Connection might already be established, check if we have a stream
                if (this.pc.connectionState === 'connected') {
                    console.log('Connection already established successfully');
                }
            } else {
                console.warn('Cannot set remote description, unexpected signaling state:', this.pc.signalingState);
            }
        } catch (error) {
            console.error('Error handling answer:', error);
            // If this fails, the connection might be in a bad state - close and retry
            if (this.pc) {
                this.pc.close();
                this.pc = null;
            }
        }
    }

    async handleIceCandidate(candidateData) {
        try {
            if (this.pc && this.pc.remoteDescription) { 
                // Reconstruct RTCIceCandidate from plain object
                const candidate = new RTCIceCandidate({candidate: candidateData.candidate, sdpMLineIndex: candidateData.sdpMLineIndex, sdpMid: candidateData.sdpMid, usernameFragment: candidateData.usernameFragment});
                await this.pc.addIceCandidate(candidate);
                console.log('ICE candidate added successfully from display window');
            } else if (this.pc) {
                // Queue the candidate if we don't have remote description yet
                console.log('Queueing ICE candidate until remote description is set');
                this.pendingIceCandidates.push(candidateData);
            } else {
                console.warn('Cannot add ICE candidate: no peer connection');
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    async processPendingIceCandidates() {
        // Process any queued ICE candidates after remote description is set
        for (const candidateData of this.pendingIceCandidates) {
            try {
                const candidate = new RTCIceCandidate({candidate: candidateData.candidate, sdpMLineIndex: candidateData.sdpMLineIndex, sdpMid: candidateData.sdpMid, usernameFragment: candidateData.usernameFragment});
                await this.pc.addIceCandidate(candidate);
                console.log('Queued ICE candidate added successfully');
            } catch (error) {
                console.error('Error adding queued ICE candidate:', error);
            }
        }
        this.pendingIceCandidates = [];
    }

    handleStreamingError(error) {
        console.error('Streaming error occurred:', error);
        
        // Show user-friendly error message
        const errorMessage = error.message || 'Unknown connection error';
        console.warn('Connection error: ' + errorMessage);
        
        // Don't automatically retry - this was causing connection loops
        console.log('❌ Streaming stopped due to error. Manual restart required.');
        
        // Reset streaming state without auto-retry
        this.isStreaming = false;
        this.hasOffered = false;
        
        // Close peer connection but keep display window open
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        
        // Update button state - both sidebar and footer buttons
        const btns = document.querySelectorAll('#liveDisplayBtn');
        btns.forEach(btn => {
            btn.classList.remove('active');
            btn.textContent = 'Live Display';
        });
    }

    stopStreaming() {
        this.isStreaming = false;

        // Reset offer tracking
        this.hasOffered = false;

        // Stop capture animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Remove debug canvas if it exists
        if (this.captureCanvas && this.captureCanvas.parentNode) {
            this.captureCanvas.parentNode.removeChild(this.captureCanvas);
        }

        // Close peer connection
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }

        // Stop stream tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Notify display window
        this.channel.postMessage({type: 'close'});

        // Close display window
        if (this.displayWindow && !this.displayWindow.closed) {
            this.displayWindow.close();
        }
        this.displayWindow = null;

        // Update button state - both sidebar and footer buttons
        const btns = document.querySelectorAll('#liveDisplayBtn');
        btns.forEach(btn => {
            btn.classList.remove('active');
            btn.textContent = 'Live Display';
        });
    }
}


// ****
// ****

// Phase 1: Test LiveDisplayManager functionality
async function testLiveDisplayManager() {
    try {
        
        if (!window.visualizer || !window.visualizer.liveDisplayManager) {
            return;
        }
        
        const manager = window.visualizer.liveDisplayManager;
        
        // Test 1: Verify composite canvas creation
        await manager.setupCompositeCanvas();
        
        // Test 2: Verify streaming capability
        const videoStream = manager.compositeCanvas.captureStream(30);
        
        // Test 3: Verify compositing works
        manager.startCompositing();
        
        // Stop compositing after 1 second
        setTimeout(() => {
            manager.stopStreaming();
        }, 1000);
        
    } catch (error) {
    }
}


// Backward compatibility for any code using window.StreamManager
if (typeof window !== 'undefined') {
    window.StreamManager = StreamManager;
}
