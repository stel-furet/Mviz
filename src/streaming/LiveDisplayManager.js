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
        // console.log(`DEBUG LiveDisplayManager ${this.displayId}: Setting channel`, channel);
        this.channel = channel;
        
        // Set up message handler for the channel
        this.setupChannelMessageHandler();
    }
    
    // Set up message handler for the channel
    setupChannelMessageHandler() {
        if (!this.channel) {
            // console.error(`DEBUG LiveDisplayManager ${this.displayId}: Cannot set up message handler - no channel`);
            return;
        }
        
        // console.log(`DEBUG LiveDisplayManager ${this.displayId}: Setting up channel message handler`);
        
        // Handle incoming messages
        this.channel.onmessage = async (event) => {
            // console.log(`DEBUG LiveDisplayManager ${this.displayId}: Raw message event:`, event);
            
            if (!event.data) {
                // console.error(`DEBUG LiveDisplayManager ${this.displayId}: Received empty message event`);
                return;
            }
            
            const { type, data } = event.data;
            // console.log(`DEBUG LiveDisplayManager ${this.displayId}: Received message:`, type, data);
            
            switch (type) {
                case 'answer':
                    await this.handleAnswer(data);
                    break;
                case 'ice-candidate':
                    await this.handleIceCandidate(data);
                    break;
                case 'display-ready':
                    // console.log(`LiveDisplay ${this.displayId}: Display window ready`);
                    // Store that display is ready, but only create offer if we're streaming
                    this.displayReady = true;
                    // Only create and send offer if we're already streaming
                    if (this.isStreaming && this.pc) {
                        // console.log(`LiveDisplay ${this.displayId}: Display ready and streaming - creating offer`);
                        this.createAndSendOffer();
                    } else {
                        // console.log(`LiveDisplay ${this.displayId}: Display ready but not streaming yet - will create offer when streaming starts`);
                    }
                    break;
                case 'pong':
                    // console.log(`LiveDisplay ${this.displayId}: Pong received`);
                    break;
                case 'display-settings':
                    // Update display settings
                    if (data) {
                        // console.log(`DEBUG LiveDisplay ${this.displayId}: Received display settings:`, data);
                        // console.log(`DEBUG LiveDisplay ${this.displayId}: Current settings:`, this.displaySettings);
                        
                        // Update capture settings
                        if (data.captureVideo !== undefined) {
                            // console.log(`DEBUG LiveDisplay ${this.displayId}: Updating captureVideo from ${this.displaySettings.captureVideo} to ${data.captureVideo}`);
                            this.displaySettings.captureVideo = data.captureVideo;
                        }
                        if (data.captureVisualization !== undefined) {
                            // console.log(`DEBUG LiveDisplay ${this.displayId}: Updating captureVisualization from ${this.displaySettings.captureVisualization} to ${data.captureVisualization}`);
                            this.displaySettings.captureVisualization = data.captureVisualization;
                        }
                        if (data.captureKaleidoscope !== undefined) {
                            this.displaySettings.captureKaleidoscope = data.captureKaleidoscope;
                        }
                        if (data.captureInfiniteZoom !== undefined) {
                            // console.log(`DEBUG LiveDisplay ${this.displayId}: Updating captureInfiniteZoom from ${this.displaySettings.captureInfiniteZoom} to ${data.captureInfiniteZoom}`);
                            this.displaySettings.captureInfiniteZoom = data.captureInfiniteZoom;
                        }
                        
                        // console.log(`DEBUG LiveDisplay ${this.displayId}: Updated settings:`, this.displaySettings);
                    } else {
                        // console.error(`DEBUG LiveDisplay ${this.displayId}: Received empty display settings`);
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
        // console.log(`DEBUG LiveDisplay ${this.displayId}: Getting dimensions for resolution: ${resolution}`);
        
        if (resolution === 'canvas') {
            // Use current canvas dimensions with validation
            const canvas = this.visualizer.audioMotion?.canvas;
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                targetWidth = canvas.width;
                targetHeight = canvas.height;
                // console.log(`DEBUG LiveDisplay ${this.displayId}: Using canvas dimensions: ${targetWidth}x${targetHeight}`);
            } else {
                // Canvas not ready or invalid dimensions - fallback to 1080p
                targetWidth = 1920;
                targetHeight = 1080;
                // console.log(`DEBUG LiveDisplay ${this.displayId}: Canvas not ready, using default: ${targetWidth}x${targetHeight}`);
            }
        } else {
            const preset = this.resolutionPresets[resolution];
            if (preset) {
                targetWidth = preset.width;
                targetHeight = preset.height;
                // console.log(`DEBUG LiveDisplay ${this.displayId}: Using preset dimensions for ${resolution}: ${targetWidth}x${targetHeight}`);
            } else {
                // Default to 1080p if preset not found
                targetWidth = 1920;
                targetHeight = 1080;
                // console.log(`DEBUG LiveDisplay ${this.displayId}: Preset not found, using default: ${targetWidth}x${targetHeight}`);
            }
        }
        
        
        // Determine target aspect ratio
        let targetAspect;
        
        // Always use window/canvas dimensions for streaming - don't force video aspect ratio
        // This ensures streaming captures whatever is visible in the window
        const canvas = this.visualizer.audioMotion?.canvas;
        if (canvas) {
            targetAspect = canvas.width / canvas.height;
            // console.log(`✓ LiveDisplay ${this.displayId} using canvas aspect ratio: ${canvas.width}x${canvas.height} (${targetAspect.toFixed(3)})`);
        } else {
            // Fallback to manual aspect ratio setting
            const [ratioW, ratioH] = this.aspectRatio.split(':').map(Number);
            targetAspect = ratioW / ratioH;
            // console.log(`✓ LiveDisplay ${this.displayId} using manual aspect ratio: ${ratioW}:${ratioH} (${targetAspect.toFixed(3)})`);
        }
        // console.log(`LiveDisplay ${this.displayId} final targetAspect:`, targetAspect);
        
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
    
    // IDENTICAL to RecordManager.startCompositing()
    startCompositing() {
        const composite = () => {
            if (!this.isStreaming) return;
            this.compositeFrame();
            this.animationFrame = requestAnimationFrame(composite);
        };
        composite();
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
            // Kaleidoscope NOT active - draw sources individually
            
            // Draw video background if present and capture enabled
            if (this.displaySettings && this.displaySettings.captureVideo &&
                this.visualizer.videoElement && 
                (this.visualizer.videoMode === 'camera' || this.visualizer.videoMode === 'file') &&
                this.visualizer.videoElement.readyState >= 2) {
                    const opacity = parseFloat(this.visualizer.videoElement.style.opacity) || 1;
                    if (opacity > 0) {
                        this.compositeCtx.globalAlpha = opacity;
                        this.drawVideoWithProperLetterboxing(sharedDrawX, sharedDrawY, sharedDrawWidth, sharedDrawHeight);
                        this.compositeCtx.globalAlpha = 1;
                }
            }
            
            // Draw AudioMotion if active and capture enabled
            if (this.displaySettings && this.displaySettings.captureVisualization &&
                this.visualizer.audioMotion && this.visualizer.audioMotion.canvas && this.visualizer.visualizationEnabled) {
                const shouldDrawSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer.kaleidoscopeApplyToViz;
                if (shouldDrawSeparately) {
                    this.compositeCtx.drawImage(this.visualizer.audioMotion.canvas, 0, 0, width, height);
                }
            }
            
            // Draw Infinite Zoom if active and not captured via kaleidoscope (if capture infinite zoom is enabled)
            if (this.displaySettings && this.displaySettings.captureInfiniteZoom && 
                this.visualizer.infiniteZoom && this.visualizer.infiniteZoom.isActive && 
                this.visualizer.infiniteZoom.canvas) {
                const shouldDrawSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeApplyToInfiniteZoom;
                if (shouldDrawSeparately) {
                    this.compositeCtx.drawImage(this.visualizer.infiniteZoom.canvas, 0, 0, width, height);
                }
            }
            
            // Draw WebGL visualization if active and not captured via kaleidoscope (if capture WebGL is enabled)
            if (this.displaySettings && this.displaySettings.captureWebGL && 
                this.visualizer.webglEnabled && this.visualizer.webglVisualization && 
                this.visualizer.webglVisualization.canvas) {
                const shouldDrawSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeApplyToWebGL;
                if (shouldDrawSeparately) {
                    this.compositeCtx.drawImage(this.visualizer.webglVisualization.canvas, 0, 0, width, height);
                }
            }
            
            // Draw Fluid Dynamics if active and not captured via kaleidoscope (if capture fluid dynamics is enabled)
            if (this.displaySettings && this.displaySettings.captureFluidDynamics && 
                this.visualizer.fluidDynamics && this.visualizer.fluidDynamics.isActive && 
                this.visualizer.fluidDynamics.canvas) {
                const shouldDrawSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeApplyToFluidDynamics;
                if (shouldDrawSeparately) {
                    // Apply Fluid Dynamics opacity setting
                    this.compositeCtx.save();
                    const fluidOpacity = this.visualizer.fluidDynamics.opacity || 1.0;
                    this.compositeCtx.globalAlpha = fluidOpacity;
                    
                    this.compositeCtx.drawImage(this.visualizer.fluidDynamics.canvas, 0, 0, width, height);
                    this.compositeCtx.restore();
                }
            }
            
            // Draw Plugin canvases if active and not captured via kaleidoscope (if capture visualization is enabled)
            if (this.displaySettings && this.displaySettings.captureVisualization && window.pluginManager) {
                const allPlugins = window.pluginManager.getAllPlugins();
                allPlugins.forEach(plugin => {
                    if (plugin.canvas && plugin.isActive) {
                        const stateVarName = `kaleidoscopeApplyTo${plugin.pluginName.charAt(0).toUpperCase() + plugin.pluginName.slice(1)}`;
                        const shouldDrawSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer[stateVarName];
                        if (shouldDrawSeparately && plugin.canvas.width > 0 && plugin.canvas.height > 0) {
                            const renderCtx = plugin.getRenderingContext();
                            
                            this.compositeCtx.save();
                            
                            // Apply opacity (generic)
                            if (renderCtx.opacity !== undefined && renderCtx.opacity !== 1.0) {
                                this.compositeCtx.globalAlpha = renderCtx.opacity;
                            }
                            
                            // Apply blend mode (generic)
                            if (renderCtx.blendMode) {
                                this.compositeCtx.globalCompositeOperation = renderCtx.blendMode;
                            }
                            
                            // Pre-render hook (generic)
                            if (plugin.beforeComposite) {
                                plugin.beforeComposite(this.compositeCtx, width, height);
                            }
                            
                            // Custom composite or default drawImage (generic)
                            const customDrawn = plugin.customComposite ? 
                                plugin.customComposite(this.compositeCtx, width, height) : false;
                            
                            if (!customDrawn) {
                                this.compositeCtx.drawImage(plugin.canvas, 0, 0, width, height);
                            }
                            
                            // Post-render hook (generic)
                            if (plugin.afterComposite) {
                                plugin.afterComposite(this.compositeCtx);
                            }
                            
                            this.compositeCtx.restore();
                        }
                    }
                });
            }
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
                // console.error(`DEBUG LiveDisplay ${this.displayId}: Cannot start streaming - no channel available`);
                return;
            }
            
            this.isStreaming = true;
            
            // Create composite canvas (same as Record)
            await this.setupCompositeCanvas();
            
            // Start compositing (same as Record) - this needs to happen before capturing the stream
            this.startCompositing();
            
            // Wait a moment for the first frame to be drawn
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get stream from composite canvas with frame rate from displaySettings
            const frameRate = this.displaySettings.frameRate || 30;
            this.stream = this.compositeCanvas.captureStream(frameRate);
            // console.log(`LiveDisplay ${this.displayId}: Stream created with ${this.stream.getVideoTracks().length} video tracks`);
            
            // Debug stream properties
            this.stream.getVideoTracks().forEach((track, index) => {
            });
            
            // Always create a fresh WebRTC connection
            if (this.pc) {
                // console.log(`LiveDisplay ${this.displayId}: Closing existing peer connection`);
                this.pc.close();
                this.pc = null;
            }
            
            // Reset connection state
            this.hasAnswered = false;
            this.pendingIceCandidates = [];
            
            // Setup WebRTC negotiation (creates this.pc and adds tracks)
            this.setupWebRTC();
            
            // Always create and send offer after setup
            // console.log(`LiveDisplay ${this.displayId}: Creating offer after WebRTC setup`);
            
            // Add a small delay to ensure the WebRTC connection is fully set up
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create and send offer
            await this.createAndSendOffer();
            
            // console.log(`LiveDisplay ${this.displayId}: Streaming started successfully`);
            
        } catch (err) {
            // console.error(`LiveDisplay ${this.displayId}: Error starting streaming:`, err);
            this.stopStreaming();
        }
    }
    
    // NEW: WebRTC methods
    setupWebRTC() {
        // Create a new RTCPeerConnection
        if (this.pc) {
            // console.log(`LiveDisplay ${this.displayId}: Closing existing peer connection in setupWebRTC`);
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
                    // console.log(`LiveDisplay ${this.displayId}: Added ${track.kind} track to peer connection:`, sender ? 'success' : 'failed');
                } catch (err) {
                    // console.error(`LiveDisplay ${this.displayId}: Error adding track to peer connection:`, err);
                }
            });
        } else {
            // console.error(`LiveDisplay ${this.displayId}: No stream or tracks available to add!`);
            
            // If we don't have a stream yet, try to recreate it
            if (!this.stream && this.compositeCanvas) {
                try {
                    const frameRate = this.displaySettings.frameRate || 30;
                    this.stream = this.compositeCanvas.captureStream(frameRate);
                    // console.log(`LiveDisplay ${this.displayId}: Recreated stream with ${this.stream.getTracks().length} tracks`);
                    
                    // Now try to add the tracks
                    this.stream.getTracks().forEach(track => {
                        try {
                            const sender = this.pc.addTrack(track, this.stream);
                            // console.log(`LiveDisplay ${this.displayId}: Added ${track.kind} track to peer connection (retry):`, sender ? 'success' : 'failed');
                        } catch (err) {
                            // console.error(`LiveDisplay ${this.displayId}: Error adding track to peer connection (retry):`, err);
                        }
                    });
                } catch (err) {
                    // console.error(`LiveDisplay ${this.displayId}: Error recreating stream:`, err);
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
                // console.error(`DEBUG LiveDisplay ${this.displayId}: Cannot send offer - no channel available`);
                return;
            }
            
            if (!this.pc) {
                // console.error(`DEBUG LiveDisplay ${this.displayId}: Cannot create offer - no peer connection available`);
                // console.log(`DEBUG LiveDisplay ${this.displayId}: Will create offer when streaming starts`);
                return;
            }
            
            // Set video bitrate based on quality setting
            const videoQuality = this.displaySettings.videoQuality || 'auto';
            let bitrate = this.videoQualityPresets[videoQuality] || 60000000; // Default to 60 Mbps (was 5)
            
            // Note: 'auto' now uses the preset value of 60 Mbps (no resolution-based override needed)
            // The preset values are already optimized per quality level
            
            // console.log(`DEBUG LiveDisplay ${this.displayId}: Setting video bitrate to ${bitrate/1000000} Mbps (${videoQuality})`);
            
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
            // console.log(`LiveDisplay ${this.displayId}: Original SDP set as local description`);
            
            // We'll apply the bitrate setting when sending to the remote peer
            // This avoids the m-line order issue
            // console.log(`LiveDisplay ${this.displayId}: Created offer with bitrate ${bitrate/1000000} Mbps`);
            
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
            // console.log(`LiveDisplay ${this.displayId}: Offer sent to display window`);
        } catch (error) {
            // console.error(`LiveDisplay ${this.displayId}: Error creating offer:`, error);
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
                // console.log(`LiveDisplay ${this.displayId}: Answer set`);
                
                // Process any pending ICE candidates
                this.processPendingIceCandidates();
            } else {
                // console.log(`LiveDisplay ${this.displayId}: Ignoring answer - wrong state: ${this.pc.signalingState}`);
            }
        } catch (error) {
            // console.error(`LiveDisplay ${this.displayId}: Error handling answer:`, error);
        }
    }
    
    async handleIceCandidate(candidateData) {
        try {
            // Reconstruct RTCIceCandidate from serialized data
            const candidate = new RTCIceCandidate(candidateData);
            
            if (this.pc.remoteDescription) {
                await this.pc.addIceCandidate(candidate);
                // console.log(`LiveDisplay ${this.displayId}: ICE candidate added`);
            } else {
                this.pendingIceCandidates.push(candidate);
                // console.log(`LiveDisplay ${this.displayId}: ICE candidate queued`);
            }
        } catch (error) {
            // console.error(`LiveDisplay ${this.displayId}: Error adding ICE candidate:`, error);
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
                // console.log(`LiveDisplay ${this.displayId}: Display window opened`);
                return true;
            } else {
                // console.error(`LiveDisplay ${this.displayId}: Failed to open display window`);
                return false;
            }
        } catch (error) {
            // console.error(`LiveDisplay ${this.displayId}: Error opening display window:`, error);
            return false;
        }
    }
    
    // Restart streaming with new settings
    async restartStream() {
        // console.log(`LiveDisplay ${this.displayId}: Restarting stream with new settings...`);
        
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
        
        // console.log(`LiveDisplay ${this.displayId}: Stream restarted successfully`);
    }
    
    // Internal method to stop streaming with option to keep channels
    async stopStreamingInternal(closeAll = true) {
        if (!this.isStreaming) return;
        
        // console.log(`LiveDisplay ${this.displayId}: Stopping streaming${closeAll ? '' : ' (keeping channels)'}...`);
        this.isStreaming = false;
        
        // Stop compositing
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
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
        
        // console.log(`LiveDisplay ${this.displayId}: Streaming stopped${closeAll ? '' : ' (keeping channels)'}`);
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
