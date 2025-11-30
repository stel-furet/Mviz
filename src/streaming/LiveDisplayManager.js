// src/streaming/LiveDisplayManager.js

/**
 * LiveDisplayManager - Manages live streaming to external displays
 * Handles canvas capture and streaming to external windows/devices
 * 
 * Dependencies: FrequeVisualizer (passed as parameter)
 * Used by: FrequeVisualizer
 */
class LiveDisplayManager {
    constructor(visualizer, displayId = 'main') {
        this.visualizer = visualizer;
        this.displayId = displayId;
        this.isStreaming = false;
        this.pc = null;
        this.stream = null;
        this.compositeCanvas = null;
        this.compositeCtx = null;
        this.animationFrame = null;
        this.displayWindow = null;
        // Create channel only if not passed from DisplayInstance
        this.channel = null; // Will be set by setChannel() method
        
        // Create a dedicated channel for settings
        this.settingsChannel = new BroadcastChannel(`freque-live-display-settings-${displayId}`);
        
        this.hasOffered = false;
        this.displayReady = false; // Track if display window is ready
        this.pendingIceCandidates = [];
        
        // Initialize display settings with defaults
        this.displaySettings = {
            captureVideo: true,
            captureVisualization: true,
            captureKaleidoscope: true,
            captureInfiniteZoom: true,
            captureWebGL: true,
            captureFluidDynamics: true,
            captureNebula: true
        };
        
        // Set up settings channel message handler
        this.settingsChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'display-settings' && event.data.data) {
                const settings = event.data.data;
                
                // Update display settings
                if (settings.captureVideo !== undefined) this.displaySettings.captureVideo = settings.captureVideo;
                if (settings.captureVisualization !== undefined) this.displaySettings.captureVisualization = settings.captureVisualization;
                if (settings.captureKaleidoscope !== undefined) this.displaySettings.captureKaleidoscope = settings.captureKaleidoscope;
                if (settings.captureInfiniteZoom !== undefined) this.displaySettings.captureInfiniteZoom = settings.captureInfiniteZoom;
                if (settings.captureWebGL !== undefined) this.displaySettings.captureWebGL = settings.captureWebGL;
                if (settings.captureFluidDynamics !== undefined) this.displaySettings.captureFluidDynamics = settings.captureFluidDynamics;
                if (settings.captureNebula !== undefined) this.displaySettings.captureNebula = settings.captureNebula;
                
                // Update presentation modes and other display settings
                if (settings.presentationMode !== undefined) this.displaySettings.presentationMode = settings.presentationMode;
                if (settings.displaySharpness !== undefined) this.displaySettings.displaySharpness = settings.displaySharpness;
                if (settings.letterboxColor !== undefined) this.displaySettings.letterboxColor = settings.letterboxColor;
                if (settings.mirrorBackground !== undefined) this.displaySettings.mirrorBackground = settings.mirrorBackground;
                if (settings.mirrorBackgroundBlur !== undefined) this.displaySettings.mirrorBackgroundBlur = settings.mirrorBackgroundBlur;
                
                // Update stream quality settings
                let streamSettingsChanged = false;
                
                if (settings.resolution !== undefined && settings.resolution !== this.displaySettings.resolution) {
                    this.displaySettings.resolution = settings.resolution;
                    streamSettingsChanged = true;
                }
                
                if (settings.frameRate !== undefined && settings.frameRate !== this.displaySettings.frameRate) {
                    this.displaySettings.frameRate = settings.frameRate;
                    streamSettingsChanged = true;
                }
                
                if (settings.videoQuality !== undefined && settings.videoQuality !== this.displaySettings.videoQuality) {
                    this.displaySettings.videoQuality = settings.videoQuality;
                    streamSettingsChanged = true;
                }
                
                // Restart streaming if resolution or frameRate changed
                if (streamSettingsChanged && this.isStreaming) {
                    // We need to restart the stream to apply the new settings
                    this.restartStream();
                }
                
                
                // Send updated settings to display window
                if (this.channel) {
                    this.channel.postMessage({
                        type: 'display-settings',
                        data: this.displaySettings
                    });
                }
            }
        };
        
            // IDENTICAL to RecordManager settings
            this.resolution = '4k'; // Default to 4K
            this.aspectRatio = '16:9';
            this.frameRate = 60; // Default to 60 FPS for professional quality
            this.videoQuality = 'master'; // Default to 250 Mbps;
            this.audioQuality = 'auto';
            this.customFilename = 'MV_PRO_Display';
            this.matchVisualizationAspect = true;
            
            // Display settings for capture toggles and presentation modes
            this.displaySettings = {
                captureVideo: true,
                captureVisualization: true,
                captureKaleidoscope: true,
                captureInfiniteZoom: true,
                presentationMode: 'fit',
                displaySharpness: 0,
                letterboxColor: '#000000',
                mirrorBackground: false,
                mirrorBackgroundBlur: 20,
                resolution: '1080p',
                frameRate: 60, // Default to 60 FPS for professional quality
                videoQuality: 'auto'
            };
        
        // IDENTICAL to RecordManager presets
        this.resolutionPresets = {
            'canvas': { width: 0, height: 0 }, // Will be set dynamically
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
            '4k': { width: 3840, height: 2160 }
        };
        
        this.videoQualityPresets = {
            'good': 60000000,         // 60 Mbps
            'excellent': 150000000,   // 150 Mbps
            'master': 250000000,      // 250 Mbps (DEFAULT)
            'ultra': 400000000,       // 400 Mbps
            'maximum': 500000000      // 500 Mbps
        };
        
        this.audioQualityPresets = {
            'auto': 192000, // 192 kbps
            'high': 320000, // 320 kbps
            'medium': 192000, // 192 kbps
            'low': 128000 // 128 kbps
        };
        
        this.loadSettings();
        this.initializeUI();
    }
    
        // IDENTICAL to RecordManager methods
        loadSettings() {
            try {
                const saved = localStorage.getItem(`freque_live_display_settings_${this.displayId}`);
                if (saved) {
                    const settings = JSON.parse(saved);
                    
                    // MIGRATE OLD QUALITY SETTINGS TO NEW NAMES
                    const qualityMigration = {
                        'auto': 'master',      // Old auto (60 Mbps) → master (250 Mbps)
                        'low': 'good',         // Old low → good
                        'medium': 'excellent', // Old medium → excellent
                        'high': 'excellent',   // Old high → excellent
                        '4k': 'excellent',     // Old 4k → excellent
                        '4k-ultra': 'ultra'    // Old 4k-ultra → ultra
                    };
                    
                    // Migrate video quality if it's an old value
                    if (settings.videoQuality && qualityMigration[settings.videoQuality]) {
                        settings.videoQuality = qualityMigration[settings.videoQuality];
                    }
                    
                    this.resolution = settings.resolution || '4k'; // Default to 4K
                    this.aspectRatio = settings.aspectRatio || '16:9';
                    this.frameRate = settings.frameRate || 60; // Default to 60 FPS
                    this.videoQuality = settings.videoQuality || 'master'; // Default to 250 Mbps
                    this.audioQuality = settings.audioQuality || 'auto';
                    this.customFilename = settings.customFilename || 'MV_PRO_Display';
                    this.matchVisualizationAspect = settings.matchVisualizationAspect !== undefined ? settings.matchVisualizationAspect : true;
                }
            } catch (e) {
            }
        }
    
    saveSettings() {
        try {
            const settings = {
                resolution: this.resolution,
                aspectRatio: this.aspectRatio,
                frameRate: this.frameRate,
                videoQuality: this.videoQuality,
                audioQuality: this.audioQuality,
                customFilename: this.customFilename,
                matchVisualizationAspect: this.matchVisualizationAspect
            };
            localStorage.setItem(`freque_live_display_settings_${this.displayId}`, JSON.stringify(settings));
        } catch (e) {
        }
    }
    
    initializeUI() {
        // No UI initialization needed for independent system
    }
    
    // Set the BroadcastChannel from DisplayInstance
    setChannel(channel) {
        this.channel = channel;
        
        // Set up message handler for the channel
        this.setupChannelMessageHandler();
    }
    
    // Set up message handler for the channel
    setupChannelMessageHandler() {
        if (!this.channel) {
            return;
        }
        
        
        // Handle incoming messages
        this.channel.onmessage = async (event) => {
            
            if (!event.data) {
                return;
            }
            
            const { type, data } = event.data;
            
            switch (type) {
                case 'answer':
                    await this.handleAnswer(data);
                    break;
                case 'ice-candidate':
                    await this.handleIceCandidate(data);
                    break;
                case 'display-ready':
                    // Store that display is ready, but only create offer if we're streaming
                    this.displayReady = true;
                    // Only create and send offer if we're already streaming
                    if (this.isStreaming && this.pc) {
                        this.createAndSendOffer();
                    } else {
                    }
                    break;
                case 'pong':
                    break;
                case 'display-settings':
                    // Update display settings
                    if (data) {
                        
                        // Update capture settings
                        if (data.captureVideo !== undefined) {
                            this.displaySettings.captureVideo = data.captureVideo;
                        }
                        if (data.captureVisualization !== undefined) {
                            this.displaySettings.captureVisualization = data.captureVisualization;
                        }
                        if (data.captureKaleidoscope !== undefined) {
                            this.displaySettings.captureKaleidoscope = data.captureKaleidoscope;
                        }
                        if (data.captureInfiniteZoom !== undefined) {
                            this.displaySettings.captureInfiniteZoom = data.captureInfiniteZoom;
                        }
                        
                    } else {
                    }
                    break;
            }
        };
    }
    
    // Modified to use displaySettings for resolution
    getRecordingDimensions() {
        let targetWidth, targetHeight;
        
        // Use resolution from displaySettings
        const resolution = this.displaySettings.resolution || '1080p';
        
        if (resolution === 'canvas') {
            // Use current canvas dimensions with validation
            const canvas = this.visualizer.audioMotion?.canvas;
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                targetWidth = canvas.width;
                targetHeight = canvas.height;
            } else {
                // Canvas not ready or invalid dimensions - fallback to 1080p
                targetWidth = 1920;
                targetHeight = 1080;
            }
        } else {
            const preset = this.resolutionPresets[resolution];
            if (preset) {
                targetWidth = preset.width;
                targetHeight = preset.height;
            } else {
                // Default to 1080p if preset not found
                targetWidth = 1920;
                targetHeight = 1080;
            }
        }
        
        
        // Determine target aspect ratio
        let targetAspect;
        
        // Always use window/canvas dimensions for streaming - don't force video aspect ratio
        // This ensures streaming captures whatever is visible in the window
        const canvas = this.visualizer.audioMotion?.canvas;
        if (canvas) {
            targetAspect = canvas.width / canvas.height;
        } else {
            // Fallback to manual aspect ratio setting
            const [ratioW, ratioH] = this.aspectRatio.split(':').map(Number);
            targetAspect = ratioW / ratioH;
        }
        
        // Calculate final dimensions
        const currentAspect = targetWidth / targetHeight;
        
        if (Math.abs(currentAspect - targetAspect) > 0.01) {
            // Adjust dimensions to match target aspect ratio
            if (currentAspect > targetAspect) {
                // Too wide, reduce width
                targetWidth = Math.round(targetHeight * targetAspect);
            } else {
                // Too tall, reduce height
                targetHeight = Math.round(targetWidth / targetAspect);
            }
        }
        
        
        return { width: targetWidth, height: targetHeight };
    }
    
    // IDENTICAL to RecordManager.setupCompositeCanvas()
    async setupCompositeCanvas() {
        const dimensions = this.getRecordingDimensions();
        
        this.compositeCanvas = document.createElement('canvas');
        this.compositeCanvas.width = dimensions.width;
        this.compositeCanvas.height = dimensions.height;
        this.compositeCtx = this.compositeCanvas.getContext('2d');
        
    }
    
    // Master Animation Controller handles compositing via recordingMasterWrapper
    startCompositing() {
        // Master Animation Controller handles compositing via recordingMasterWrapper
        // This method is overridden by the wrapper when master control is enabled
        // If master control is not enabled, this is a no-op (MAL is required)
        if (window.recordingMasterWrapper && window.recordingMasterWrapper.isMasterControlled()) {
            // Wrapper will handle compositing via master controller
            return;
        }
        // No fallback - MAL is critical infrastructure
    }
    
        // IDENTICAL to RecordManager.compositeFrame()
        compositeFrame() {
            if (!this.compositeCtx) return;
            
            const { width, height } = this.compositeCanvas;
            
            // Apply quality-based canvas smoothing for optimal rendering
            const is4K = this.resolution === '4k';
            
            if (is4K) {
                // High-quality Lanczos upscaling for 4K live displays
                this.compositeCtx.imageSmoothingEnabled = true;
                this.compositeCtx.imageSmoothingQuality = 'high';
            } else {
                // Pixel-perfect rendering for 1080p (no interpolation)
                this.compositeCtx.imageSmoothingEnabled = false;
            }
            
            // Clear canvas with black background
            this.compositeCtx.fillStyle = '#000000';
            this.compositeCtx.fillRect(0, 0, width, height);
            
            // Debug: Log every 60 frames (once per second at 60fps)
            if (!this.frameCount) this.frameCount = 0;
            this.frameCount++;
            // if (this.frameCount % 60 === 0) {
            //     // console.log(`LiveDisplay ${this.displayId}: Composite frame ${this.frameCount} - Canvas: ${width}x${height}`);
            // }
            
            // Background image is now handled by DOM element layer - no canvas drawing needed
        
        // Debug logging for kaleidoscope state
        if (this.visualizer.kaleidoscopeEnabled) {
            if (this.visualizer.kaleidoscopeVideoCanvas) {
            }
        }
        
        // Check if kaleidoscope is active with any sources
        const kaleidoscopeActive = this.visualizer.kaleidoscopeEnabled && 
                                   this.visualizer.kaleidoscopeCanvas && 
                                   this.visualizer.kaleidoscopeCanvas.style.display !== 'none';
        
        // Calculate letterboxing dimensions
        let sharedDrawWidth, sharedDrawHeight, sharedDrawX, sharedDrawY;
        
        if (this.visualizer.videoElement && 
            (this.visualizer.videoMode === 'camera' || this.visualizer.videoMode === 'file') &&
            this.visualizer.videoElement.readyState >= 2) {
            
            // Use video dimensions to calculate proper letterboxing (fit to width, crop top/bottom)
            const videoAspect = this.visualizer.videoElement.videoWidth / this.visualizer.videoElement.videoHeight;
            
            // Always fit video to width and crop top/bottom
            sharedDrawWidth = width;
            sharedDrawHeight = width / videoAspect;
            sharedDrawX = 0;
            sharedDrawY = (height - sharedDrawHeight) / 2;
        }
        
        // SIMPLE LOGIC: Draw kaleidoscope canvas if active, otherwise draw sources individually
        if (kaleidoscopeActive && this.displaySettings && this.displaySettings.captureKaleidoscope) {
            // Kaleidoscope is active - draw the single composited kaleidoscope canvas
            const kalAspect = this.visualizer.kaleidoscopeCanvas.width / this.visualizer.kaleidoscopeCanvas.height;
            let kalDrawWidth = width;
            let kalDrawHeight = width / kalAspect;
            let kalDrawX = 0;
            let kalDrawY = (height - kalDrawHeight) / 2;
            
            const kaleidoscopeOpacity = parseFloat(this.visualizer.kaleidoscopeCanvas.style.opacity) || 1;
                        if (kaleidoscopeOpacity > 0) {
                            this.compositeCtx.globalAlpha = kaleidoscopeOpacity;
                this.compositeCtx.drawImage(this.visualizer.kaleidoscopeCanvas, kalDrawX, kalDrawY, kalDrawWidth, kalDrawHeight);
                            this.compositeCtx.globalAlpha = 1;
                    }
                } else {
            // Kaleidoscope NOT active - draw sources individually in z-index order
            
            // Get all active canvases sorted by z-index (respects visual stacking order)
            const sortedCanvases = this.visualizer.getActiveCanvasesInZIndexOrder();
            
            // Draw each canvas in z-index order (lowest to highest = back to front)
            sortedCanvases.forEach(canvasInfo => {
                // Check if should draw separately (not captured via kaleidoscope)
                if (!canvasInfo.shouldDrawSeparately()) {
                    return; // Skip if captured via kaleidoscope
                }
                
                const canvas = canvasInfo.canvas;
                
                // Visibility check: skip if canvas is hidden or has zero opacity
                if (canvas.style && canvas.style.display === 'none') {
                    return; // Canvas is hidden
                }
                
                // Check canvas validity
                if (!canvas || (canvas.width && canvas.width === 0) || (canvas.height && canvas.height === 0)) {
                    return; // Invalid canvas dimensions
                }
                
                // Check displaySettings for this canvas type (LiveDisplayManager specific)
                if (this.displaySettings) {
                    if (canvasInfo.isVideo && !this.displaySettings.captureVideo) {
                        return; // Video capture disabled
                    }
                    if (canvasInfo.type === 'audioMotion' && !this.displaySettings.captureVisualization) {
                        return; // Visualization capture disabled
                    }
                    if (canvasInfo.type === 'infiniteZoom' && !this.displaySettings.captureInfiniteZoom) {
                        return; // Infinite Zoom capture disabled
                    }
                    if (canvasInfo.type === 'webgl' && !this.displaySettings.captureWebGL) {
                        return; // WebGL capture disabled
                    }
                    if (canvasInfo.type === 'fluidDynamics' && !this.displaySettings.captureFluidDynamics) {
                        return; // Fluid Dynamics capture disabled
                    }
                    if (canvasInfo.type === 'plugin' && !this.displaySettings.captureVisualization) {
                        return; // Plugin capture disabled (uses captureVisualization setting)
                    }
                }
                
                // Handle video elements separately (uses letterboxing)
                if (canvasInfo.isVideo) {
                    const opacity = parseFloat(canvas.style.opacity) || 1;
                    if (opacity > 0 && canvas.readyState >= 2) {
                        this.compositeCtx.globalAlpha = opacity;
                        this.drawVideoWithProperLetterboxing(sharedDrawX, sharedDrawY, sharedDrawWidth, sharedDrawHeight);
                        this.compositeCtx.globalAlpha = 1;
                    }
                    return;
                }
                
                // Handle regular canvas elements
                this.compositeCtx.save();
                
                // Apply opacity from canvas info or canvas style
                let opacity = 1.0;
                if (canvasInfo.opacity !== undefined) {
                    opacity = canvasInfo.opacity; // Use from canvasInfo (e.g., Fluid Dynamics)
                } else if (canvas.style && canvas.style.opacity) {
                    opacity = parseFloat(canvas.style.opacity) || 1.0;
                }
                
                if (opacity > 0) {
                    this.compositeCtx.globalAlpha = opacity;
                    
                    // Handle plugins with custom composite methods
                    if (canvasInfo.type === 'plugin' && canvasInfo.plugin) {
                        const plugin = canvasInfo.plugin;
                        const renderCtx = plugin.getRenderingContext();
                        
                        // Apply blend mode if specified
                        if (renderCtx.blendMode) {
                            this.compositeCtx.globalCompositeOperation = renderCtx.blendMode;
                        }
                        
                        // Pre-render hook
                        if (plugin.beforeComposite) {
                            plugin.beforeComposite(this.compositeCtx, width, height);
                        }
                        
                        // Custom composite or default drawImage
                        const customDrawn = plugin.customComposite ? 
                            plugin.customComposite(this.compositeCtx, width, height) : false;
                        
                        if (!customDrawn) {
                            this.compositeCtx.drawImage(canvas, 0, 0, width, height);
                        }
                        
                        // Post-render hook
                        if (plugin.afterComposite) {
                            plugin.afterComposite(this.compositeCtx);
                        }
                    } else {
                        // Standard canvas drawing
                        // Special handling for WebGL - check support
                        if (canvasInfo.type === 'webgl' && canvasInfo.webglSupported === false) {
                            // Skip if WebGL not supported
                        } else {
                            this.compositeCtx.drawImage(canvas, 0, 0, width, height);
                        }
                    }
                }
                
                this.compositeCtx.restore();
            });
        }
    }
    
    // IDENTICAL to RecordManager.drawVideoWithProperLetterboxing()
    drawVideoWithProperLetterboxing(drawX, drawY, drawWidth, drawHeight) {
        const video = this.visualizer.videoElement;
        
        if (!video || video.readyState < 2) return;
        
        // Apply video effects directly to the video element
        this.compositeCtx.save();
        
        // Build filter string
        const filters = [];
        
        // Apply posterize FIRST with stronger effect
        if (this.visualizer.videoPosterize < 16) {
            const steps = this.visualizer.videoPosterize;
            const posterizeAmount = (16 - steps) / 16;
            filters.push(`contrast(${300 + posterizeAmount * 200}%)`);
            filters.push(`brightness(${95}%)`);
            filters.push(`saturate(${200}%)`);
            if (steps < 8) {
                filters.push(`contrast(${150}%)`);
            }
        }
        
        // Apply other video adjustments
        if (this.visualizer.videoBrightness !== 100 && this.visualizer.videoPosterize >= 16) {
            filters.push(`brightness(${this.visualizer.videoBrightness}%)`);
        }
        if (this.visualizer.videoContrast !== 100 && this.visualizer.videoPosterize >= 16) {
            filters.push(`contrast(${this.visualizer.videoContrast}%)`);
        }
        if (this.visualizer.videoSaturation !== 100 && this.visualizer.videoPosterize >= 16) {
            filters.push(`saturate(${this.visualizer.videoSaturation}%)`);
        }
        if (this.visualizer.videoHueRotate !== 0) {
            filters.push(`hue-rotate(${this.visualizer.videoHueRotate}deg)`);
        }
        if (this.visualizer.videoGrayscale > 0) {
            filters.push(`grayscale(${this.visualizer.videoGrayscale}%)`);
        }
        if (this.visualizer.videoSepia > 0) {
            filters.push(`sepia(${this.visualizer.videoSepia}%)`);
        }
        if (this.visualizer.videoBlur > 0) {
            filters.push(`blur(${this.visualizer.videoBlur}px)`);
        }
        if (this.visualizer.videoInvert) {
            filters.push('invert(100%)');
        }
        
        // Apply filters
        this.compositeCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
        
        // Calculate pulse scale if enabled
        let scale = 1;
        if (this.visualizer.videoPulse) {
            const pulseDuration = this.visualizer.videoPulseRate * 1000;
            const pulsePhase = (Date.now() % pulseDuration) / pulseDuration;
            scale = 1 + (Math.sin(pulsePhase * Math.PI * 2) * 0.02);
        }
        
        // Apply pulse scaling
        if (scale !== 1) {
            const centerX = drawX + drawWidth / 2;
            const centerY = drawY + drawHeight / 2;
            this.compositeCtx.translate(centerX, centerY);
            this.compositeCtx.scale(scale, scale);
            this.compositeCtx.translate(-centerX, -centerY);
        }
        
        // Draw video with proper letterboxing
        this.compositeCtx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        
        this.compositeCtx.restore();
        
        // Apply vignette effect if enabled
        if (this.visualizer.videoVignette > 0) {
            this.compositeCtx.save();
            const intensity = this.visualizer.videoVignette / 100;
            const size = (100 - this.visualizer.videoVignette) / 100;
            
            const gradient = this.compositeCtx.createRadialGradient(
                drawX + drawWidth / 2, drawY + drawHeight / 2, 
                Math.min(drawWidth, drawHeight) * size * 0.5,
                drawX + drawWidth / 2, drawY + drawHeight / 2, 
                Math.max(drawWidth, drawHeight) * 0.7
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
            
            this.compositeCtx.fillStyle = gradient;
            this.compositeCtx.fillRect(drawX, drawY, drawWidth, drawHeight);
            this.compositeCtx.restore();
        }
    }
    
    // IDENTICAL to RecordManager.drawScaledVisualization()
    drawScaledVisualization(canvas) {
        if (!canvas) return;
        
        const { width, height } = this.compositeCanvas;
        const canvasAspect = canvas.width / canvas.height;
        const targetAspect = width / height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (canvasAspect > targetAspect) {
            // Canvas is wider, fit to width
            drawWidth = width;
            drawHeight = width / canvasAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
        } else {
            // Canvas is taller, fit to height
            drawHeight = height;
            drawWidth = height * canvasAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
        }
        
        this.compositeCtx.drawImage(canvas, drawX, drawY, drawWidth, drawHeight);
    }
    
    // NEW: WebRTC streaming instead of MediaRecorder
    async startStreaming() {
        if (this.isStreaming) return;
        
        try {
            
            // Check if channel is available
            if (!this.channel) {
                return;
            }
            
            this.isStreaming = true;
            
            // Create composite canvas (same as Record)
            await this.setupCompositeCanvas();
            
            // Enable master control for live display (auto-enable)
            if (window.recordingMasterWrapper) {
                window.recordingMasterWrapper.enableMasterControl();
            }
            
            // Start compositing (same as Record) - this needs to happen before capturing the stream
            this.startCompositing();
            
            // Wait a moment for the first frame to be drawn
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get stream from composite canvas with frame rate from displaySettings
            const frameRate = this.displaySettings.frameRate || 30;
            this.stream = this.compositeCanvas.captureStream(frameRate);
            
            // Debug stream properties
            this.stream.getVideoTracks().forEach((track, index) => {
            });
            
            // Always create a fresh WebRTC connection
            if (this.pc) {
                this.pc.close();
                this.pc = null;
            }
            
            // Reset connection state
            this.hasAnswered = false;
            this.pendingIceCandidates = [];
            
            // Setup WebRTC negotiation (creates this.pc and adds tracks)
            this.setupWebRTC();
            
            // Always create and send offer after setup
            
            // Add a small delay to ensure the WebRTC connection is fully set up
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create and send offer
            await this.createAndSendOffer();
            
            
        } catch (err) {
            this.stopStreaming();
        }
    }
    
    // NEW: WebRTC methods
    setupWebRTC() {
        // Create a new RTCPeerConnection
        if (this.pc) {
            this.pc.close();
        }
        
        this.pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        
        // Add tracks to peer connection if we have a stream
        if (this.stream && this.stream.getTracks().length > 0) {
            this.stream.getTracks().forEach(track => {
                try {
                    const sender = this.pc.addTrack(track, this.stream);
                } catch (err) {
                }
            });
        } else {
            
            // If we don't have a stream yet, try to recreate it
            if (!this.stream && this.compositeCanvas) {
                try {
                    const frameRate = this.displaySettings.frameRate || 30;
                    this.stream = this.compositeCanvas.captureStream(frameRate);
                    
                    // Now try to add the tracks
                    this.stream.getTracks().forEach(track => {
                        try {
                            const sender = this.pc.addTrack(track, this.stream);
                        } catch (err) {
                        }
                    });
                } catch (err) {
                }
            }
        }
        
        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.channel) {
                // Serialize ICE candidate for BroadcastChannel
                const candidateData = {
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    usernameFragment: event.candidate.usernameFragment
                };
                this.channel.postMessage({
                    type: 'ice-candidate',
                    data: candidateData
                });
            }
        };
        
        // Don't create and send offer immediately - let startStreaming do it
        // when it's ready
    }
    
    // Create and send WebRTC offer
    async createAndSendOffer() {
        try {
            if (!this.channel) {
                return;
            }
            
            if (!this.pc) {
                return;
            }
            
            // Set video bitrate based on quality setting
            const videoQuality = this.displaySettings.videoQuality || 'auto';
            let bitrate = this.videoQualityPresets[videoQuality] || 60000000; // Default to 60 Mbps (was 5)
            
            // Note: 'auto' now uses the preset value of 60 Mbps (no resolution-based override needed)
            // The preset values are already optimized per quality level
            
            
            // Create offer with specific codec preferences
            const offerOptions = {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            };
            
            const offer = await this.pc.createOffer(offerOptions);
            
            // First set the local description with the original offer
            await this.pc.setLocalDescription(offer);
            
            // Get the current description after it's been set
            const currentDescription = this.pc.localDescription;
            
            // We'll apply the bitrate setting when sending to the remote peer
            // This avoids the m-line order issue
            
            // Send offer to display window - serialize the RTCSessionDescription object
            // Include the bitrate information for the remote peer to apply
            this.channel.postMessage({
                type: 'offer',
                data: {
                    type: currentDescription.type,
                    sdp: currentDescription.sdp,
                    bitrate: bitrate
                }
            });
        } catch (error) {
        }
    }
    
    async handleAnswer(answerData) {
        try {
            // Check current state before setting remote description
            if (this.pc.signalingState === 'have-local-offer') {
                // Create RTCSessionDescription from the serialized data
                const answer = new RTCSessionDescription({
                    type: answerData.type,
                    sdp: answerData.sdp
                });
                
                await this.pc.setRemoteDescription(answer);
                
                // Process any pending ICE candidates
                this.processPendingIceCandidates();
            } else {
            }
        } catch (error) {
        }
    }
    
    async handleIceCandidate(candidateData) {
        try {
            // Reconstruct RTCIceCandidate from serialized data
            const candidate = new RTCIceCandidate(candidateData);
            
            if (this.pc.remoteDescription) {
                await this.pc.addIceCandidate(candidate);
            } else {
                this.pendingIceCandidates.push(candidate);
            }
        } catch (error) {
        }
    }
    
    processPendingIceCandidates() {
        this.pendingIceCandidates.forEach(candidate => {
            this.pc.addIceCandidate(candidate);
        });
        this.pendingIceCandidates = [];
    }
    
    openDisplayWindow() {
        try {
            const windowFeatures = 'width=1920,height=1080,resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no';
            this.displayWindow = window.open(`Display.html?displayId=${this.displayId}`, `LiveDisplay_${this.displayId}`, windowFeatures);
            
            if (this.displayWindow) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }
    
    // Restart streaming with new settings
    async restartStream() {
        
        // Save display window reference and state
        const displayWindow = this.displayWindow;
        const displayReady = this.displayReady;
        const channel = this.channel;
        const settingsChannel = this.settingsChannel;
        
        // Send message to display window to prepare for reconnection
        if (channel) {
            channel.postMessage({
                type: 'prepare-reconnect',
                data: { displayId: this.displayId }
            });
        }
        
        // Stop streaming but keep window and channels
        await this.stopStreamingInternal(false);
        
        // Restore window and channels
        this.displayWindow = displayWindow;
        this.displayReady = displayReady;
        this.channel = channel;
        this.settingsChannel = settingsChannel;
        
        // Short delay to ensure cleanup completes
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Ensure everything is completely reset
        this.pc = null;
        this.stream = null;
        this.compositeCanvas = null;
        this.compositeCtx = null;
        this.hasAnswered = false;
        this.pendingIceCandidates = [];
        
        // Start streaming again with new settings
        await this.startStreaming();
        
    }
    
    // Internal method to stop streaming with option to keep channels
    async stopStreamingInternal(closeAll = true) {
        if (!this.isStreaming) return;
        
        this.isStreaming = false;
        
        // Stop compositing (legacy - should not be needed with master control)
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Disable master control if this was the last active display
        if (window.recordingMasterWrapper) {
            // Only stop if no other displays are streaming
            const hasOtherStreaming = this.visualizer?.multiDisplayManager?.displays?.size > 0;
            if (!hasOtherStreaming) {
                window.recordingMasterWrapper.stopCompositing();
            }
        }
        
        // Close WebRTC connection
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        
        // Stop stream tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Clean up composite canvas
        if (this.compositeCanvas) {
            this.compositeCanvas = null;
            this.compositeCtx = null;
        }
        
        // Only close window and channels if closeAll is true
        if (closeAll) {
            // Close display window
            if (this.displayWindow && !this.displayWindow.closed) {
                this.displayWindow.close();
                this.displayWindow = null;
            }
            
            // Close broadcast channel
            if (this.channel) {
                this.channel.close();
                this.channel = null;
            }
            
            // Close settings channel
            if (this.settingsChannel) {
                this.settingsChannel.close();
                this.settingsChannel = null;
            }
        }
        
    }
    
    // Stop streaming and clean up all resources
    stopStreaming() {
        return this.stopStreamingInternal(true);
    }
        
}


// Backward compatibility for any code using window.LiveDisplayManager
if (typeof window !== 'undefined') {
    window.LiveDisplayManager = LiveDisplayManager;
}
