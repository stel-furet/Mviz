// src/recording/RecordManager.js

/**
 * RecordManager - Handles video/audio recording
 * Manages canvas capture, encoding, and file saving
 * 
 * Dependencies: FrequeVisualizer (passed as parameter)
 * Used by: FrequeVisualizer
 */
class RecordManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.compositeCanvas = null;
        this.compositeCtx = null;
        this.cropCanvas = null;
        this.cropCtx = null;
        this.shouldCrop = false;
        this.animationFrame = null;
        this.saveLocation = null;
        
        // Audio recording nodes - keep alive during recording
        this.audioDestination = null;
        this.audioGainNode = null;
        this.audioSourceConnections = []; // Track all audio source connections
        
        // Recording settings - Unified Quality System
        this.qualityPreset = 'professional'; // Default to professional quality
        this.frameRate = 60; // Default to 60 FPS for professional quality
        this.customFilename = 'Freque_Recording';
        this.matchVisualizationAspect = true;
        this.recordFormat = 'mp4'; // MP4 only for professional compatibility
        
        // Custom settings (only used when qualityPreset = 'custom')
        this.customResolution = '1080p';
        this.customVideoBitrate = 15; // Mbps
        this.customAudioBitrate = 320; // kbps
        this.customCodec = 'auto';
        
        // Recording area settings
        this.aspectRatio = 'window'; // Default to current behavior
        this.showRecordingArea = false;
        this.recordingAreaOverlay = null;
        this.cropArea = { x: 0, y: 0, width: 0, height: 0 };
        
        // Resolution presets
        this.resolutionPresets = {
            'canvas': { width: 0, height: 0 }, // Will be set dynamically
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
            '4k': { width: 3840, height: 2160 }
        };
        
        // Unified Quality Presets - OPTIMIZED FOR PROFESSIONAL QUALITY
        this.qualityPresets = {
            'web-hd': {
                resolution: '1080p',
                videoBitrate: 15000000, // 15 Mbps
                audioBitrate: 256000, // 256 kbps
                codec: 'h264-high'
            },
            'professional': {
                resolution: '1080p',
                videoBitrate: 35000000, // 35 Mbps
                audioBitrate: 320000, // 320 kbps
                codec: 'h264-high'
            },
            'broadcast': {
                resolution: '1080p',
                videoBitrate: 60000000, // 60 Mbps
                audioBitrate: 512000, // 512 kbps
                codec: 'h264-high'
            },
            'good-4k': {
                resolution: '4k',
                videoBitrate: 60000000, // 60 Mbps
                audioBitrate: 512000, // 512 kbps
                codec: 'h264-high'
            },
            'excellent-4k': {
                resolution: '4k',
                videoBitrate: 150000000, // 150 Mbps
                audioBitrate: 1024000, // 1024 kbps
                codec: 'h264-high'
            },
            'master-4k': {
                resolution: '4k',
                videoBitrate: 250000000, // 250 Mbps (DEFAULT)
                audioBitrate: 1024000, // 1024 kbps
                codec: 'h264-high'
            },
            'ultra-4k': {
                resolution: '4k',
                videoBitrate: 400000000, // 400 Mbps
                audioBitrate: 1024000, // 1024 kbps
                codec: 'h264-high'
            },
            'maximum-4k': {
                resolution: '4k',
                videoBitrate: 600000000, // 600 Mbps
                audioBitrate: 1024000, // 1024 kbps
                codec: 'h264-high'
            }
        };
        
        this.loadSettings();
        this.detectSupportedFormats();
        this.initializeUI();
        this.updateFileExtensionDisplay();
        
        // Ensure overlay starts hidden by default
        this.forceHideRecordingAreaOverlay();
        
        // Initialize recording area overlay if needed
        if (this.showRecordingArea) {
            setTimeout(() => this.updateRecordingAreaOverlay(), 100);
        }
        
        // Handle window resize to update overlay position
        window.addEventListener('resize', () => {
            if (this.showRecordingArea) {
                setTimeout(() => this.updateRecordingAreaOverlay(), 100);
            }
        });
    }
    
    detectSupportedFormats() {
        // Check MP4 support (prefer H.264 + AAC for best compatibility)
        this.supportsMP4 = MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac') || 
                          MediaRecorder.isTypeSupported('video/mp4');
        
        // Check WebM support (fallback)
        this.supportsWebM = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ||
                           MediaRecorder.isTypeSupported('video/webm');
        
        
        // If MP4 is not supported, fallback to WebM
        if (!this.supportsMP4 && this.recordFormat === 'mp4') {
            this.recordFormat = 'webm';
        }
    }
    
    
    showFormatFallbackMessage() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff9800;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = '⚠️ MP4 not supported - recording in WebM format';
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }
    
    
    /**
     * Professional codec selection for maximum Adobe compatibility
     */
    selectOptimalCodec() {
        // Professional H.264 codecs in order of preference for Adobe apps
        const codecOptions = {
            'h264-high': [
                'video/mp4; codecs="avc1.64001F,mp4a.40.2"', // H.264 High Profile Level 3.1
                'video/mp4; codecs="avc1.640028,mp4a.40.2"', // H.264 High Profile Level 4.0
                'video/mp4; codecs="h264,aac"'
            ],
            'h264-main': [
                'video/mp4; codecs="avc1.4D401E,mp4a.40.2"', // H.264 Main Profile Level 3.0
                'video/mp4; codecs="avc1.4D401F,mp4a.40.2"', // H.264 Main Profile Level 3.1
                'video/mp4; codecs="avc1.4D4028,mp4a.40.2"', // H.264 Main Profile Level 4.0
                'video/mp4; codecs="h264,aac"'
            ],
            'h264-baseline': [
                'video/mp4; codecs="avc1.42E01E,mp4a.40.2"', // H.264 Baseline Profile Level 3.0
                'video/mp4; codecs="avc1.42E01F,mp4a.40.2"', // H.264 Baseline Profile Level 3.1
                'video/mp4; codecs="h264,aac"'
            ],
            'auto': [
                // Try best codecs first
                'video/mp4; codecs="avc1.4D4028,mp4a.40.2"', // H.264 Main Profile Level 4.0
                'video/mp4; codecs="avc1.64001F,mp4a.40.2"', // H.264 High Profile Level 3.1
                'video/mp4; codecs="avc1.42E01E,mp4a.40.2"', // H.264 Baseline Profile Level 3.0
                'video/mp4; codecs="h264,aac"',
                'video/mp4' // Generic fallback
            ]
        };

        // Get codec preference from current settings
        const settings = this.getRecordingSettings();
        const targetCodec = settings.codec || 'auto';
        const codecs = codecOptions[targetCodec] || codecOptions['auto'];
        
        for (const codec of codecs) {
            if (MediaRecorder.isTypeSupported(codec)) {
                return {
                    mimeType: codec,
                    profile: targetCodec,
                    compatibility: this.getCompatibilityRating(codec)
                };
            }
        }

        // If no MP4 codecs work, show error
        throw new Error('No compatible MP4 codecs found. Please update your browser for professional video recording.');
    }

    /**
     * Get recording settings from unified quality preset or custom settings
     */
    getRecordingSettings() {
        if (this.qualityPreset === 'custom') {
            return {
                resolution: this.customResolution,
                videoBitrate: this.customVideoBitrate * 1000000, // Convert Mbps to bps
                audioBitrate: this.customAudioBitrate * 1000, // Convert kbps to bps
                codec: this.customCodec
            };
        } else {
            const preset = this.qualityPresets[this.qualityPreset];
            if (!preset) {
                throw new Error(`Unknown quality preset: ${this.qualityPreset}`);
            }
            return preset;
        }
    }

    /**
     * Get compatibility rating for codec
     */
    getCompatibilityRating(codec) {
        if (codec.includes('avc1.64') || codec.includes('avc1.4D4028')) {
            return { level: 'excellent', text: '🎬 Excellent - QuickTime & Adobe Compatible' };
        } else if (codec.includes('avc1.4D') || codec.includes('h264,aac')) {
            return { level: 'good', text: '✅ Good - Professional Software Compatible' };
        } else if (codec.includes('avc1.42')) {
            return { level: 'good', text: '✅ Good - Maximum Compatibility' };
        } else {
            return { level: 'limited', text: '⚠️ Limited - Basic MP4 Support' };
        }
    }
    
    updateFileExtensionDisplay() {
        // Always MP4 for professional compatibility
        const extensionElement = document.getElementById('footerRecordFileExtension');
        if (extensionElement) {
            extensionElement.textContent = '.mp4';
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('freque_record_settings');
            
            if (saved) {
                const settings = JSON.parse(saved);
                
                // Core recording settings
                this.qualityPreset = settings.qualityPreset || 'professional';
                this.frameRate = settings.frameRate || 30;
                this.customFilename = settings.customFilename || 'Freque_Recording';
                this.saveLocation = settings.saveLocation || null;
                this.matchVisualizationAspect = settings.matchVisualizationAspect !== undefined ? settings.matchVisualizationAspect : true;
                this.recordFormat = 'mp4'; // Always MP4 for professional compatibility
                
                // Custom settings
                this.customResolution = settings.customResolution || '1080p';
                this.customVideoBitrate = settings.customVideoBitrate || 15;
                this.customAudioBitrate = settings.customAudioBitrate || 320;
                this.customCodec = settings.customCodec || 'auto';
                
                // Recording area settings
                this.aspectRatio = settings.aspectRatio || 'window';
                this.showRecordingArea = settings.showRecordingArea || false;
            }
        } catch (e) {
        }
    }
    
    saveSettings() {
        try {
            const settings = {
                qualityPreset: this.qualityPreset,
                frameRate: this.frameRate,
                customFilename: this.customFilename,
                saveLocation: this.saveLocation,
                matchVisualizationAspect: this.matchVisualizationAspect,
                recordFormat: this.recordFormat,
                
                // Custom settings
                customResolution: this.customResolution,
                customVideoBitrate: this.customVideoBitrate,
                customAudioBitrate: this.customAudioBitrate,
                customCodec: this.customCodec,
                
                // Recording area settings
                aspectRatio: this.aspectRatio,
                showRecordingArea: this.showRecordingArea
            };
            localStorage.setItem('freque_record_settings', JSON.stringify(settings));
        } catch (e) {
        }
    }
    
    initializeUI() {
        // Record button click handler - both sidebar and footer
        const recordBtns = document.querySelectorAll('#recordBtn');
        recordBtns.forEach(recordBtn => {
            recordBtn.addEventListener('click', () => {
                if (this.isRecording) {
                    this.stopRecording();
                } else {
                    this.startRecording();
                }
            });
        });
        
        // Settings button click handler
        const settingsBtn = document.getElementById('recordSettingsBtn');
        const settingsPanel = document.getElementById('recordSettingsPanel');
        const closeBtn = document.getElementById('recordSettingsClose');
        
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = settingsPanel.style.display !== 'none';
                settingsPanel.style.display = isVisible ? 'none' : 'block';
            });
        }
        
        if (closeBtn && settingsPanel) {
            closeBtn.addEventListener('click', () => {
                settingsPanel.style.display = 'none';
            });
        }
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (settingsPanel && !settingsPanel.contains(e.target) && 
                !settingsBtn.contains(e.target)) {
                settingsPanel.style.display = 'none';
            }
        });
        
        this.initializeSettingsControls();
        this.initializeBackgroundImageControls();
        this.updateUI();
    }
    
    initializeSettingsControls() {
        // Resolution select
        const resolutionSelect = document.getElementById('recordResolutionSelect');
        if (resolutionSelect) {
            resolutionSelect.value = this.resolution;
            resolutionSelect.addEventListener('change', (e) => {
                this.resolution = e.target.value;
                this.updateUI();
                this.saveSettings();
            });
        }
        
        // Frame rate select
        const frameRateSelect = document.getElementById('recordFrameRateSelect');
        if (frameRateSelect) {
            frameRateSelect.value = this.frameRate.toString();
            frameRateSelect.addEventListener('change', (e) => {
                this.frameRate = parseInt(e.target.value);
                this.updateUI();
                this.saveSettings();
            });
        }
        
        // Quality selects
        const videoQualitySelect = document.getElementById('recordVideoQualitySelect');
        const audioQualitySelect = document.getElementById('recordAudioQualitySelect');
        
        if (videoQualitySelect) {
            videoQualitySelect.value = this.videoQuality;
            videoQualitySelect.addEventListener('change', (e) => {
                this.videoQuality = e.target.value;
                this.updateUI();
                this.saveSettings();
            });
        }
        
        if (audioQualitySelect) {
            audioQualitySelect.value = this.audioQuality;
            audioQualitySelect.addEventListener('change', (e) => {
                this.audioQuality = e.target.value;
                this.updateUI();
                this.saveSettings();
            });
        }
        
        // Filename input
        const filenameInput = document.getElementById('recordFilenameInput');
        if (filenameInput) {
            filenameInput.value = this.customFilename;
            filenameInput.addEventListener('input', (e) => {
                this.customFilename = e.target.value || 'Freque_Recording';
                this.saveSettings();
            });
        }
        
        // Choose location button
        const chooseLocationBtn = document.getElementById('recordChooseLocationBtn');
        if (chooseLocationBtn) {
            chooseLocationBtn.addEventListener('click', () => {
                this.chooseFileLocation();
            });
        }

    }

    initializeBackgroundImageControls() {
        // Load saved background image from visualizer
        if (this.visualizer) {
            this.visualizer.loadBackgroundImage();
            // Update mixer UI if background image exists
            setTimeout(() => {
                this.updateMixerBackgroundImageUI();
                this.updateMixerBackgroundToggleButton();
                this.updateMixerBackgroundOpacitySlider();
                this.updateMixerBackgroundSizingButtons();
                this.updateMixerBackgroundSaturationSlider();
                this.updateMixerBackgroundPosterizeSlider();
                this.updateMixerBackgroundContrastSlider();
                this.updateMixerVideoOpacitySlider();
                this.updateMixerVideoBrightnessSlider();
                this.updateMixerVideoContrastSlider();
                this.updateMixerVideoSaturationSlider();
                this.updateMixerVideoHueRotateSlider();
                this.updateMixerVideoGrayscaleSlider();
                this.updateMixerVideoFadeTimeSlider();
                this.updateMixerVideoSepiaSlider();
                this.updateMixerVideoBlurSlider();
                this.updateMixerVideoVignetteSlider();
                this.updateMixerVideoPosterizeSlider();
                this.updateMixerVideoInvertToggle();
                this.updateMixerVideoMirrorToggle();
                this.updateMixerVideoPulseToggle();
                this.updateMixerVideoPulseRateSlider();
                
                // Audio controls initialization
                this.updateMixerAudioToggle();
                this.updateMixerAudioVolumeSlider();
                this.updateMixerAudioDeviceSelect();
                // Monitor button state is set when created in HTML, no init needed
                
                // AM Visualizer controls initialization
                this.updateMixerAMToggle();
                this.updateMixerAMOpacitySlider();
                this.updateHeaderAMVisualizationOpacitySlider();
                this.updateHeaderAMBackgroundOpacitySlider();
                this.updateMixerAMVizModeSelect();
                this.updateMixerAMMorphButton();
                this.updateMixerAMMorphSpeedSelect();
                this.updateMixerAMEnergyContainer();
                this.updateMixerAMPresetSelector();
                this.updateMixerAMColorSchemeSelect();
                
        // Infinite Zoom controls initialization
        this.updateMixerInfiniteZoomToggle();
        this.updateMixerInfiniteZoomOpacitySlider();
        this.updateMixerInfiniteZoomShapeSelect();
        this.updateMixerInfiniteZoomColorRandomSlider();
        this.updateMixerInfiniteZoomMinSizeSlider();
        this.updateMixerInfiniteZoomMaxSizeSlider();
        this.updateMixerInfiniteZoomDensitySlider();
        this.updateMixerInfiniteZoomSpeedSlider();
        this.updateMixerInfiniteZoomRotationSlider();
        
        // Blobs controls initialization
        this.updateMixerBlobsToggle();
        this.updateMixerBlobsOpacitySlider();
        this.updateMixerBlobsSaturationSlider();
        this.updateMixerBlobsPosterizeSlider();
        this.updateMixerBlobsContrastSlider();
        this.updateMixerBlobsBrightnessSlider();
        this.updateMixerBlobsIntensitySlider();
        this.updateMixerBlobsMinSizeSlider();
        this.updateMixerBlobsMaxSizeSlider();
        this.updateMixerBlobsAgitateSlider();
        this.updateMixerBlobsDensitySlider();
        this.updateMixerBlobsDecaySlider();
        this.updateMixerBlobsBeatReactButton();
            
        // Starfall controls initialization
        this.updateMixerStarfallToggle();
        this.updateMixerStarfallOpacitySlider();
        this.updateMixerStarfallColorSchemeSelect();
        this.updateMixerStarfallParticleCountSlider();
        this.updateMixerStarfallParticleSizeSlider();
        this.updateMixerStarfallSpeedSlider();
        this.updateMixerStarfallGravitySlider();
        this.updateMixerStarfallSaturationSlider();
        this.updateMixerStarfallTwinkleSlider();
        this.updateMixerStarfallStarPercentageSlider();
        this.updateMixerStarfallAudioReactivitySlider();

        // Fluidity controls initialization
        this.updateMixerFluidityToggle();
        this.updateMixerFluidityOpacitySlider();
        this.updateMixerFluidityPresetSelector();
        this.updateMixerFluidityColorSchemeSelect();

        // Kaleidoscope controls initialization
        this.updateMixerKaleidoscopeVideoToggle();
        this.updateMixerKaleidoscopeVizToggle();
        this.updateMixerKaleidoscopeInfiniteZoomToggle();
        this.updateMixerKaleidoscopeWebGLToggle();
        this.updateMixerKaleidoscopeFluidToggle();
        this.updateMixerKaleidoscopeNebulaToggle();

        // Nebula controls initialization
        this.updateMixerNebulaToggle();
        this.updateMixerNebulaOpacitySlider();
        this.updateMixerNebulaColorSchemeSelect();
        this.updateMixerNebulaPresetSelector();
        this.updateMixerNebulaControlSliders();
            
        // Call mixer file info update on the MultiDisplayManager
            if (window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoFileInfo) {
                window.multiDisplayManager.updateMixerVideoFileInfo();
            }
            }, 100);
        }

        // Background image button - toggle ON/OFF only
        const backgroundImgBtn = document.getElementById('backgroundImgBtn');
        const backgroundSelectImageBtn = document.getElementById('backgroundSelectImageBtn');
        const backgroundImageFile = document.getElementById('backgroundImageFile');
        
        if (backgroundImgBtn) {
            // Header button toggles background image ON/OFF
            backgroundImgBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (this.visualizer) {
                    // Toggle background image enabled state
                    this.visualizer.backgroundImageEnabled = !this.visualizer.backgroundImageEnabled;
                    this.visualizer.saveBackgroundImage();
                    this.visualizer.updateBackgroundImageElement();
                    
                    // Update all UIs
                    this.updateBackgroundToggleButton();
                    this.updateMixerBackgroundToggleButton();
                    this.visualizer.updateFooterBackgroundButton();
                    
                    
                    // Force redraw of visualization
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        if (backgroundSelectImageBtn) {
            backgroundSelectImageBtn.addEventListener('click', () => {
                if (backgroundImageFile) {
                    backgroundImageFile.click();
                }
            });
        }

        // Mixer background select button
        const mixerBackgroundSelect = document.getElementById('mixerBackgroundSelect');
        const mixerBackgroundImageFile = document.getElementById('mixerBackgroundImageFile');
        
        if (mixerBackgroundSelect && mixerBackgroundImageFile) {
            mixerBackgroundSelect.addEventListener('click', () => {
                mixerBackgroundImageFile.click();
            });
        } else {
            // // console.error('❌ Mixer background select elements not found:', {
            //     button: !!mixerBackgroundSelect,
            //     fileInput: !!mixerBackgroundImageFile
            // });
        }

        // Mixer background toggle button
        const mixerBackgroundToggle = document.getElementById('mixerBackgroundToggle');
        if (mixerBackgroundToggle) {
            mixerBackgroundToggle.addEventListener('click', () => {
                if (this.visualizer) {
                    //     enabled: this.visualizer.backgroundImageEnabled,
                    //     hasImage: !!this.visualizer.backgroundImage
                    // });
                    
                    // Toggle background image enabled state
                    this.visualizer.backgroundImageEnabled = !this.visualizer.backgroundImageEnabled;
                    this.visualizer.saveBackgroundImage();
                    this.visualizer.updateBackgroundImageElement();
                    
                    // Update all UIs
                    this.updateMixerBackgroundToggleButton();
                    this.updateBackgroundToggleButton(); // Update header toggle too
                    this.visualizer.updateFooterBackgroundButton(); // Update footer button
                    
                    
                    // Force redraw of visualization
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        } else {
            // // console.error('❌ Mixer background toggle button not found');
        }

        // Mixer background opacity slider (custom JS slider)
        const mixerBackgroundOpacity = document.getElementById('mixerBackgroundOpacity');
        if (mixerBackgroundOpacity) {
            this.mixerOpacitySlider = this.initializeVerticalSlider(mixerBackgroundOpacity, (value) => {
                if (this.visualizer) {
                    this.visualizer.backgroundImageOpacity = value;
                    this.visualizer.saveBackgroundImage();
                    this.visualizer.updateBackgroundImageElement();
                    
                    // Update value display
                    const valueDisplay = document.getElementById('mixerBackgroundOpacityValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = value;
                    }
                    
                    // Update header UI too
                    this.updateBackgroundImageUI();
                    
                    
                    // Force redraw of visualization
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        } else {
            // // console.error('❌ Mixer background opacity slider not found');
        }

        // Mixer background sizing buttons
        const mixerSizingButtons = document.querySelectorAll('#mixerBackgroundSizeFit, #mixerBackgroundSizeFill, #mixerBackgroundSizeStretch, #mixerBackgroundSizeOriginal');
        if (mixerSizingButtons.length > 0) {
            mixerSizingButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const size = button.getAttribute('data-size');
                    
                    if (this.visualizer && size) {
                        this.visualizer.backgroundImageSize = size;
                        this.visualizer.saveBackgroundImage();
                        this.visualizer.updateBackgroundImageElement();
                        
                        // Update all UIs
                        this.updateMixerBackgroundSizingButtons();
                        this.updateBackgroundImageUI(); // Update header UI too
                        
                        
                        // Force redraw of visualization
                        if (this.visualizer.audioMotion) {
                            this.visualizer.audioMotion.draw();
                        }
                    }
                });
            });
        } else {
            // // console.error('❌ Mixer background sizing buttons not found');
        }

        // Mixer background saturation slider
        const mixerBackgroundSaturation = document.getElementById('mixerBackgroundSaturation');
        if (mixerBackgroundSaturation) {
            mixerBackgroundSaturation.addEventListener('input', () => {
                const value = parseInt(mixerBackgroundSaturation.value);
                
                if (this.visualizer) {
                    this.visualizer.backgroundImageSaturation = value;
                    this.visualizer.saveBackgroundImage();
                    
                    // Update only the value display, not the slider position
                    const mixerBackgroundSaturationValue = document.getElementById('mixerBackgroundSaturationValue');
                    if (mixerBackgroundSaturationValue) {
                        mixerBackgroundSaturationValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer background saturation slider not found');
        }

        // Mixer background posterization slider
        const mixerBackgroundPosterize = document.getElementById('mixerBackgroundPosterize');
        if (mixerBackgroundPosterize) {
            mixerBackgroundPosterize.addEventListener('input', () => {
                const value = parseInt(mixerBackgroundPosterize.value);
                
                if (this.visualizer) {
                    this.visualizer.backgroundImagePosterize = value;
                    this.visualizer.saveBackgroundImage();
                    
                    // Update only the value display, not the slider position
                    const mixerBackgroundPosterizeValue = document.getElementById('mixerBackgroundPosterizeValue');
                    if (mixerBackgroundPosterizeValue) {
                        mixerBackgroundPosterizeValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer background posterize slider not found');
        }

        // Mixer background contrast slider
        const mixerBackgroundContrast = document.getElementById('mixerBackgroundContrast');
        if (mixerBackgroundContrast) {
            mixerBackgroundContrast.addEventListener('input', () => {
                const value = parseInt(mixerBackgroundContrast.value);
                
                if (this.visualizer) {
                    this.visualizer.backgroundImageContrast = value;
                    this.visualizer.saveBackgroundImage();
                    
                    // Update only the value display, not the slider position
                    const mixerBackgroundContrastValue = document.getElementById('mixerBackgroundContrastValue');
                    if (mixerBackgroundContrastValue) {
                        mixerBackgroundContrastValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer background contrast slider not found');
        }

        // Mixer video toggle button
        const mixerVideoToggle = document.getElementById('mixerVideoToggle');
        if (mixerVideoToggle) {
            mixerVideoToggle.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Toggle video state
                    this.visualizer.toggleVideoPlayback();
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video toggle button not found');
        }

        // Mixer video opacity slider (custom JS slider)
        const mixerVideoOpacity = document.getElementById('mixerVideoOpacity');
        if (mixerVideoOpacity) {
            this.mixerVideoOpacitySlider = this.initializeVerticalSlider(mixerVideoOpacity, (value) => {
                if (this.visualizer) {
                    this.visualizer.setVideoOpacity(value / 100);
                    
                    // Update value display
                    const valueDisplay = document.getElementById('mixerVideoOpacityValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video opacity slider not found');
        }

        // Mixer video source select dropdown (cameras + file)
        const mixerVideoCameraSelect = document.getElementById('mixerVideoCameraSelect');
        if (mixerVideoCameraSelect) {
            mixerVideoCameraSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                
                if (value === 'file') {
                    // File selection - trigger file picker (allow replacement of current file)
                const videoFileInput = document.getElementById('videoFileInput');
                if (videoFileInput) {
                        // Reset the input value to allow selecting the same file again
                        videoFileInput.value = '';
                    videoFileInput.click();
                } else {
                }
                } else if (value && this.visualizer) {
                    // Camera device ID - use existing camera selection logic
                    this.visualizer.startVideoInput(value);
                } else if (value === '' && this.visualizer) {
                    // Empty selection - turn off video
                    this.visualizer.stopVideoInput();
                }
            });
        } else {
            // // console.error('❌ Mixer video source select not found');
        }

        // Mixer video preset buttons
        const mixerVideoPresetButtons = document.querySelectorAll('#mixerVideoPresetNormal, #mixerVideoPresetDreamy, #mixerVideoPresetNoir, #mixerVideoPresetCyberpunk, #mixerVideoPresetVintage, #mixerVideoPresetRetroTv, #mixerVideoPresetUnderwater, #mixerVideoPresetInfrared, #mixerVideoPresetAcid, #mixerVideoPresetThermal, #mixerVideoPresetMatrix, #mixerVideoPresetGlitch');
        if (mixerVideoPresetButtons.length > 0) {
            mixerVideoPresetButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const preset = button.getAttribute('data-preset');
                    
                    if (this.visualizer && preset) {
                        // Use existing video preset logic
                        this.visualizer.applyVideoPreset(preset);
                        
                        // Update button states (remove active from all, add to clicked)
                        mixerVideoPresetButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        
                    } else {
                        //     visualizer: !!this.visualizer,
                        //     preset: preset
                        // });
                    }
                });
            });
        } else {
            // // console.error('❌ Mixer video preset buttons not found');
        }

        // Mixer video brightness slider
        const mixerVideoBrightness = document.getElementById('mixerVideoBrightness');
        if (mixerVideoBrightness) {
            mixerVideoBrightness.addEventListener('input', () => {
                const value = parseInt(mixerVideoBrightness.value);
                
                if (this.visualizer) {
                    this.visualizer.videoBrightness = value;
                    this.visualizer.applyVideoFilters();
                    
                    // Update only the value display, not the slider position
                    const mixerVideoBrightnessValue = document.getElementById('mixerVideoBrightnessValue');
                    if (mixerVideoBrightnessValue) {
                        mixerVideoBrightnessValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video brightness slider not found');
        }

        // Mixer video contrast slider
        const mixerVideoContrast = document.getElementById('mixerVideoContrast');
        if (mixerVideoContrast) {
            mixerVideoContrast.addEventListener('input', () => {
                const value = parseInt(mixerVideoContrast.value);
                
                if (this.visualizer) {
                    this.visualizer.videoContrast = value;
                    this.visualizer.applyVideoFilters();
                    
                    // Update only the value display, not the slider position
                    const mixerVideoContrastValue = document.getElementById('mixerVideoContrastValue');
                    if (mixerVideoContrastValue) {
                        mixerVideoContrastValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video contrast slider not found');
        }

        // Mixer video saturation slider
        const mixerVideoSaturation = document.getElementById('mixerVideoSaturation');
        if (mixerVideoSaturation) {
            mixerVideoSaturation.addEventListener('input', () => {
                const value = parseInt(mixerVideoSaturation.value);
                
                if (this.visualizer) {
                    this.visualizer.videoSaturation = value;
                    this.visualizer.applyVideoFilters();
                    
                    // Update only the value display, not the slider position
                    const mixerVideoSaturationValue = document.getElementById('mixerVideoSaturationValue');
                    if (mixerVideoSaturationValue) {
                        mixerVideoSaturationValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video saturation slider not found');
        }

        // Mixer video hue rotation slider
        const mixerVideoHueRotate = document.getElementById('mixerVideoHueRotate');
        if (mixerVideoHueRotate) {
            mixerVideoHueRotate.addEventListener('input', () => {
                const value = parseInt(mixerVideoHueRotate.value);
                
                if (this.visualizer) {
                    this.visualizer.videoHueRotate = value;
                    this.visualizer.applyVideoFilters();
                    
                    // Update only the value display, not the slider position
                    const mixerVideoHueRotateValue = document.getElementById('mixerVideoHueRotateValue');
                    if (mixerVideoHueRotateValue) {
                        mixerVideoHueRotateValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video hue rotation slider not found');
        }

        // Mixer video grayscale slider
        const mixerVideoGrayscale = document.getElementById('mixerVideoGrayscale');
        if (mixerVideoGrayscale) {
            mixerVideoGrayscale.addEventListener('input', () => {
                const value = parseInt(mixerVideoGrayscale.value);
                
                if (this.visualizer) {
                    this.visualizer.videoGrayscale = value;
                    this.visualizer.applyVideoFilters();
                    
                    // Update only the value display, not the slider position
                    const mixerVideoGrayscaleValue = document.getElementById('mixerVideoGrayscaleValue');
                    if (mixerVideoGrayscaleValue) {
                        mixerVideoGrayscaleValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video grayscale slider not found');
        }

        // Mixer video fade time slider
        const mixerVideoFadeTime = document.getElementById('mixerVideoFadeTime');
        if (mixerVideoFadeTime) {
            mixerVideoFadeTime.addEventListener('input', () => {
                const value = parseFloat(mixerVideoFadeTime.value);
                
                if (this.visualizer) {
                    this.visualizer.videoFadeTime = value;
                    
                    // Update only the value display, not the slider position
                    const mixerVideoFadeTimeValue = document.getElementById('mixerVideoFadeTimeValue');
                    if (mixerVideoFadeTimeValue) {
                        mixerVideoFadeTimeValue.textContent = value.toFixed(1) + 's';
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video fade time slider not found');
        }

        // Mixer video sepia slider
        const mixerVideoSepia = document.getElementById('mixerVideoSepia');
        if (mixerVideoSepia) {
            mixerVideoSepia.addEventListener('input', () => {
                const value = parseInt(mixerVideoSepia.value);
                
                if (this.visualizer) {
                    this.visualizer.videoSepia = value;
                    this.visualizer.applyVideoFilters();
                    
                    // Update only the value display, not the slider position
                    const mixerVideoSepiaValue = document.getElementById('mixerVideoSepiaValue');
                    if (mixerVideoSepiaValue) {
                        mixerVideoSepiaValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video sepia slider not found');
        }

        // Mixer video blur slider
        const mixerVideoBlur = document.getElementById('mixerVideoBlur');
        if (mixerVideoBlur) {
            mixerVideoBlur.addEventListener('input', () => {
                const value = parseInt(mixerVideoBlur.value);
                
                if (this.visualizer) {
                    this.visualizer.videoBlur = value;
                    this.visualizer.applyVideoFilters();
                    
                    // Update only the value display, not the slider position
                    const mixerVideoBlurValue = document.getElementById('mixerVideoBlurValue');
                    if (mixerVideoBlurValue) {
                        mixerVideoBlurValue.textContent = value + 'px';
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video blur slider not found');
        }

        // Mixer video vignette slider
        const mixerVideoVignette = document.getElementById('mixerVideoVignette');
        if (mixerVideoVignette) {
            mixerVideoVignette.addEventListener('input', () => {
                const value = parseInt(mixerVideoVignette.value);
                
                if (this.visualizer) {
                    this.visualizer.videoVignette = value;
                    this.visualizer.applyVideoFilters();
                    
                    // Update only the value display, not the slider position
                    const mixerVideoVignetteValue = document.getElementById('mixerVideoVignetteValue');
                    if (mixerVideoVignetteValue) {
                        mixerVideoVignetteValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video vignette slider not found');
        }

        // Mixer video posterize slider
        const mixerVideoPosterize = document.getElementById('mixerVideoPosterize');
        if (mixerVideoPosterize) {
            mixerVideoPosterize.addEventListener('input', () => {
                const value = parseInt(mixerVideoPosterize.value);
                
                if (this.visualizer) {
                    this.visualizer.videoPosterize = value;
                    this.visualizer.applyVideoFilters();
                    
                    // Update only the value display, not the slider position
                    const mixerVideoPosterizeValue = document.getElementById('mixerVideoPosterizeValue');
                    if (mixerVideoPosterizeValue) {
                        mixerVideoPosterizeValue.textContent = value;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video posterize slider not found');
        }

        // Mixer video invert toggle button
        const mixerVideoInvert = document.getElementById('mixerVideoInvert');
        if (mixerVideoInvert) {
            mixerVideoInvert.addEventListener('click', () => {
                if (this.visualizer) {
                    this.visualizer.videoInvert = !this.visualizer.videoInvert;
                    this.visualizer.applyVideoFilters();
                    
                    
                    // Update button text and state
                    const effectText = mixerVideoInvert.querySelector('.effect-text');
                    if (effectText) {
                        effectText.textContent = `Invert: ${this.visualizer.videoInvert ? 'ON' : 'OFF'}`;
                    }
                    mixerVideoInvert.classList.toggle('active', this.visualizer.videoInvert);
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video invert toggle not found');
        }

        // Mixer video mirror toggle button (duplicate header implementation exactly)
        const mixerVideoMirror = document.getElementById('mixerVideoMirror');
        if (mixerVideoMirror) {
            mixerVideoMirror.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.visualizer) {
                    // Use cycleVideoMirror() method exactly like header
                    this.visualizer.cycleVideoMirror();
                    
                    
                    // Update button text exactly like header implementation
                    const effectText = mixerVideoMirror.querySelector('.effect-text');
                    if (effectText) {
                        const mirrorText = this.visualizer.videoMirror === 'off' ? 'Off' : 
                            this.visualizer.videoMirror.charAt(0).toUpperCase() + this.visualizer.videoMirror.slice(1);
                        effectText.textContent = `Mirror: ${mirrorText}`;
                    }
                    mixerVideoMirror.classList.toggle('active', this.visualizer.videoMirror !== 'off');
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video mirror toggle not found');
        }

        // Mixer video pulse toggle button (duplicate header implementation exactly)
        const mixerVideoPulse = document.getElementById('mixerVideoPulse');
        if (mixerVideoPulse) {
            mixerVideoPulse.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.visualizer) {
                    // Use toggleVideoPulse() method exactly like header
                    this.visualizer.toggleVideoPulse();
                    
                    
                    // Update button text exactly like header implementation
                    const effectText = mixerVideoPulse.querySelector('.effect-text');
                    if (effectText) {
                        effectText.textContent = `Pulse: ${this.visualizer.videoPulse ? 'On' : 'Off'}`;
                    }
                    mixerVideoPulse.classList.toggle('active', this.visualizer.videoPulse);
                    
                    // Show/hide pulse rate container (conditional display)
                    const pulseRateContainer = document.getElementById('mixerVideoPulseRateContainer');
                    if (pulseRateContainer) {
                        pulseRateContainer.style.display = this.visualizer.videoPulse ? 'flex' : 'none';
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video pulse toggle not found');
        }

        // Mixer video pulse rate slider (duplicate header implementation exactly)
        const mixerVideoPulseRate = document.getElementById('mixerVideoPulseRate');
        if (mixerVideoPulseRate) {
            mixerVideoPulseRate.addEventListener('input', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const value = parseFloat(e.target.value);
                if (this.visualizer) {
                    // Use setVideoPulseRate() method exactly like header
                    this.visualizer.setVideoPulseRate(value);
                    
                    
                    // Update display value
                    const mixerVideoPulseRateValue = document.getElementById('mixerVideoPulseRateValue');
                    if (mixerVideoPulseRateValue) {
                        mixerVideoPulseRateValue.textContent = `${value.toFixed(1)}s`;
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video pulse rate slider not found');
        }

        // Mixer video file loop button (syncs with header)
        const mixerVideoFileLoopBtn = document.getElementById('mixerVideoFileLoopBtn');
        if (mixerVideoFileLoopBtn) {
            mixerVideoFileLoopBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.visualizer) {
                    // Cycle through loop modes: 'off' -> 'one' -> 'all' -> 'off'
                    const modes = ['off', 'one', 'all'];
                    const currentIndex = modes.indexOf(this.visualizer.videoFileLoopMode);
                    const nextIndex = (currentIndex + 1) % modes.length;
                    this.visualizer.videoFileLoopMode = modes[nextIndex];
                    
                    // Update video element loop property
                    if (this.visualizer.videoElement && this.visualizer.videoMode === 'file') {
                        this.visualizer.videoElement.loop = this.visualizer.videoFileLoopMode === 'one';
                    }
                    
                    // Save to localStorage
                    localStorage.setItem('freque_video_loop_mode', this.visualizer.videoFileLoopMode);
                    
                    // Update both mixer and header buttons
                    if (window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoFileButtons) {
                        window.multiDisplayManager.updateMixerVideoFileButtons();
                    }
                    this.updateHeaderVideoFileButtons();
                }
            });
        } else {
            // // console.error('❌ Mixer video file loop button not found');
        }

        // Mixer video file mute button (syncs with header)
        const mixerVideoFileMuteBtn = document.getElementById('mixerVideoFileMuteBtn');
        if (mixerVideoFileMuteBtn) {
            mixerVideoFileMuteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.visualizer) {
                    // Toggle mute state
                    this.visualizer.videoFileMuted = !this.visualizer.videoFileMuted;
                    
                    // Update audio gain node
                    if (this.visualizer.videoAudioGain) {
                        this.visualizer.videoAudioGain.gain.value = this.visualizer.videoFileMuted ? 0 : this.visualizer.volume;
                    }
                    
                    // Update both mixer and header buttons
                    if (window.multiDisplayManager && window.multiDisplayManager.updateMixerVideoFileButtons) {
                        window.multiDisplayManager.updateMixerVideoFileButtons();
                    }
                    this.updateHeaderVideoFileButtons();
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video file mute button not found');
        }

        // Mixer video file delete button
        const mixerVideoFileDeleteBtn = document.getElementById('mixerVideoFileDeleteBtn');
        if (mixerVideoFileDeleteBtn) {
            mixerVideoFileDeleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.visualizer) {
                    
                    // Stop and clear the video file
                    this.visualizer.stopVideoInput();
                    
                    // Reset video file properties
                    this.visualizer.videoFile = null;
                    this.visualizer.videoMode = 'off';
                    
                    // Update both mixer and header video source selects to empty state
                    const mixerVideoCameraSelect = document.getElementById('mixerVideoCameraSelect');
                    if (mixerVideoCameraSelect) {
                        mixerVideoCameraSelect.value = '';
                    }
                    
                    const videoDeviceSelect = document.getElementById('videoDeviceSelect');
                    if (videoDeviceSelect) {
                        videoDeviceSelect.value = '';
                    }
                    
                    // Hide video file controls in both header and mixer
                    this.visualizer.hideVideoFileControls();
                    
                    // Update mixer UI
                    if (window.multiDisplayManager) {
                        if (window.multiDisplayManager.updateMixerVideoFileInfo) {
                            window.multiDisplayManager.updateMixerVideoFileInfo();
                        }
                        if (window.multiDisplayManager.updateMixerVideoToggleButton) {
                            window.multiDisplayManager.updateMixerVideoToggleButton();
                        }
                        if (window.multiDisplayManager.updateMixerVideoCameraSelect) {
                            window.multiDisplayManager.updateMixerVideoCameraSelect();
                        }
                    }
                    
                }
            });
        } else {
            // // console.error('❌ Mixer video file delete button not found');
        }

        // Mixer video clear input button
        const mixerVideoClearInputBtn = document.getElementById('mixerVideoClearInputBtn');
        if (mixerVideoClearInputBtn) {
            mixerVideoClearInputBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.visualizer) {
                    this.visualizer.clearVideoInput();
                }
            });
        } else {
            // // console.error('❌ Mixer video clear input button not found');
        }

        // ========== AUDIO INPUT CHANNEL ==========

        // Mixer audio toggle button
        const mixerAudioToggle = document.getElementById('mixerAudioToggle');
        if (mixerAudioToggle) {
            mixerAudioToggle.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Toggle live audio state
                    this.visualizer.toggleLiveAudio();
                    
                    // Update mixer UI
                    this.updateMixerAudioToggle();
                    
                }
            });
        } else {
        }

        // Mixer audio device select dropdown
        const mixerAudioDeviceSelect = document.getElementById('mixerAudioDeviceSelect');
        if (mixerAudioDeviceSelect) {
            mixerAudioDeviceSelect.addEventListener('change', (e) => {
                const deviceId = e.target.value;
                
                if (deviceId && this.visualizer) {
                    // Select the audio device
                    this.visualizer.selectAudioDevice(deviceId);
                    
                }
            });
        } else {
        }

        // Mixer audio clear input button
        const mixerAudioClearInputBtn = document.getElementById('mixerAudioClearInputBtn');
        if (mixerAudioClearInputBtn) {
            mixerAudioClearInputBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.visualizer) {
                    this.visualizer.clearAudioInput();
                }
            });
        } else {
        }
        
        // Mixer audio monitor button
        const mixerAudioMonitorBtn = document.getElementById('mixerAudioMonitorBtn');
        if (mixerAudioMonitorBtn) {
            mixerAudioMonitorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.visualizer) {
                    this.visualizer.toggleAudioMonitoring();
                }
            });
        }

        // ========== AM VISUALIZER CHANNEL ==========

        // Mixer AM toggle button
        const mixerAMToggle = document.getElementById('mixerAMToggle');
        if (mixerAMToggle) {
            mixerAMToggle.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Toggle AM visualization state
                    this.visualizer.toggleVisualization();
                    
                    // Update mixer UI
                    this.updateMixerAMToggle();
                    
                }
            });
        } else {
        }

        // Mixer AM opacity slider (restored)
        const mixerAMOpacitySlider = document.getElementById('mixerAMOpacitySlider');
        if (mixerAMOpacitySlider) {
            this.mixerAMOpacitySlider = this.initializeVerticalSlider(mixerAMOpacitySlider, (value) => {
                if (this.visualizer) {
                    // Convert 0-100 to 0.0-1.0
                    const opacityValue = value / 100;
                    this.visualizer.setVisualizationOpacity(opacityValue);
                    
                    // Update value display
                    const valueDisplay = document.getElementById('mixerAMOpacityValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = value;
                    }
                    
                    // Sync with header slider
                    this.updateHeaderAMVisualizationOpacitySlider();
                    
                }
            });
        } else {
        }

        // Header AM Visualization Opacity slider
        const headerAMVisualizationOpacity = document.getElementById('headerAMVisualizationOpacity');
        const headerAMVisualizationOpacityValue = headerAMVisualizationOpacity ? headerAMVisualizationOpacity.nextElementSibling : null;
        if (headerAMVisualizationOpacity && headerAMVisualizationOpacityValue) {
            headerAMVisualizationOpacity.addEventListener('input', (e) => {
                if (this.visualizer) {
                    const value = parseInt(e.target.value);
                    const opacityValue = value / 100; // Convert 0-100 to 0.0-1.0
                    this.visualizer.setVisualizationOpacity(opacityValue);
                    headerAMVisualizationOpacityValue.textContent = value + '%';
                    
                    // Sync with mixer slider
                    this.updateMixerAMOpacitySlider();
                    
                }
            });
        } else {
        }

        // Header AM Background Opacity slider
        const headerAMBackgroundOpacity = document.getElementById('headerAMBackgroundOpacity');
        const headerAMBackgroundOpacityValue = headerAMBackgroundOpacity ? headerAMBackgroundOpacity.nextElementSibling : null;
        if (headerAMBackgroundOpacity && headerAMBackgroundOpacityValue) {
            headerAMBackgroundOpacity.addEventListener('input', (e) => {
                if (this.visualizer) {
                    const value = parseInt(e.target.value);
                    
                    // Check if unified method exists, otherwise use direct approach
                    if (typeof this.visualizer.updateBackgroundOpacity === 'function') {
                        this.visualizer.updateBackgroundOpacity(value);
                    } else {
                        // Fallback to direct method calls
                        const opacityValue = value / 100;
                        if (this.visualizer.audioMotion) {
                            this.visualizer.audioMotion.bgAlpha = opacityValue;
                            this.visualizer.audioMotion.showBgColor = value > 0;
                        }
                        if (this.visualizer.officialAudioMotion && this.visualizer.useOfficialAudioMotion) {
                            this.visualizer.officialAudioMotion.bgAlpha = opacityValue;
                            this.visualizer.officialAudioMotion.showBgColor = value > 0;
                        }
                    }
                    
                    headerAMBackgroundOpacityValue.textContent = value + '%';
                }
            });
        } else {
        }

        // Header AM Preset buttons
        const headerAMPresetButtons = document.querySelectorAll('#headerVisualizerPanel .btn-preset[data-preset]');
        if (headerAMPresetButtons.length > 0) {
            headerAMPresetButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const presetIndex = parseInt(button.getAttribute('data-preset'));
                    
                    if (this.visualizer && presetIndex >= 0 && presetIndex < this.visualizer.visualizationModes.length) {
                        // Switch back to custom analyzer if using official
                        if (this.visualizer.useOfficialAudioMotion) {
                            this.visualizer.switchToCustomAnalyzer();
                        }
                        
                        // Update lastRegularMode so switchToCustomAnalyzer doesn't override our explicit choice
                        this.visualizer.lastRegularMode = presetIndex;
                        
                        this.visualizer.setVisualizationMode(presetIndex);
                        
                        // Update active state
                        headerAMPresetButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        
                        // Remove active state from Pro preset buttons
                        const headerAMProPresetButtons = document.querySelectorAll('#headerVisualizerPanel .btn-preset-pro');
                        headerAMProPresetButtons.forEach(btn => btn.classList.remove('active'));
                        
                    }
                });
            });
        } else {
        }

        // Header AM Pro Preset buttons (Official AudioMotion)
        const headerAMProPresetButtons = document.querySelectorAll('#headerVisualizerPanel .btn-preset-pro[data-official-preset]');
        if (headerAMProPresetButtons.length > 0) {
            headerAMProPresetButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling to other handlers
                    e.preventDefault(); // Prevent default button behavior
                    
                    const presetIndex = parseInt(button.getAttribute('data-official-preset'));
                    
                    if (this.visualizer && this.visualizer.officialAudioMotionPresets && presetIndex >= 0 && presetIndex < this.visualizer.officialAudioMotionPresets.length) {
                        this.visualizer.setOfficialAudioMotionPreset(presetIndex);
                        
                        // Update active state
                        headerAMProPresetButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        
                        // Clear regular preset active states
                        headerAMPresetButtons.forEach(btn => btn.classList.remove('active'));
                        
                    }
                });
            });
        }

        // Advanced Preset Controls Setup
        if (this.visualizer && typeof this.visualizer.setupAdvancedPresetControls === 'function') {
            this.visualizer.setupAdvancedPresetControls();
        }

        // Mixer AM Visualization Mode dropdown
        const mixerAMVizModeSelect = document.getElementById('mixerAMVizModeSelect');
        if (mixerAMVizModeSelect) {
            mixerAMVizModeSelect.addEventListener('change', (e) => {
                if (this.visualizer) {
                    const modeId = parseInt(e.target.value);
                    
                    // Set visualization mode
                    this.visualizer.setVisualizationMode(modeId);
                    
                }
            });
        }

        // Mixer AM Random button
        const mixerAMRandomBtn = document.getElementById('mixerAMRandomBtn');
        if (mixerAMRandomBtn) {
            mixerAMRandomBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Set random visualization mode
                    this.visualizer.setRandomVisualization();
                    
                    // Update mixer dropdown
                    this.updateMixerAMVizModeSelect();
                    
                }
            });
        } else {
        }

        // Mixer AM Morph button
        const mixerAMMorphBtn = document.getElementById('mixerAMMorphBtn');
        if (mixerAMMorphBtn) {
            mixerAMMorphBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Toggle morph state
                    this.visualizer.toggleMorph();
                    
                    // Update mixer UI
                    this.updateMixerAMMorphButton();
                    
                }
            });
        } else {
        }

        // Mixer AM Morph Speed dropdown
        const mixerAMMorphSpeedSelect = document.getElementById('mixerAMMorphSpeedSelect');
        if (mixerAMMorphSpeedSelect) {
            mixerAMMorphSpeedSelect.addEventListener('change', (e) => {
                if (this.visualizer) {
                    const speed = e.target.value;
                    
                    // Set morph speed
                    this.visualizer.setMorphSpeed(speed);
                    
                    // Update energy container visibility
                    this.updateMixerAMEnergyContainer();
                    
                }
            });
        } else {
        }

        // ========== AM PRESET CONTROLS ==========
        
        // Mixer AM Regular Preset Buttons (0-6)
        const mixerAMPresetButtons = document.querySelectorAll('[id^="mixerAMPreset"][data-preset]');
        if (mixerAMPresetButtons.length > 0) {
            mixerAMPresetButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const presetIndex = parseInt(button.getAttribute('data-preset'));
                    
                    if (this.visualizer && presetIndex >= 0 && presetIndex < this.visualizer.visualizationModes.length) {
                        // Switch back to custom analyzer if using official
                        if (this.visualizer.useOfficialAudioMotion) {
                            this.visualizer.switchToCustomAnalyzer();
                        }
                        
                        // Update lastRegularMode so switchToCustomAnalyzer doesn't override our explicit choice
                        this.visualizer.lastRegularMode = presetIndex;
                        
                        this.visualizer.setVisualizationMode(presetIndex);
                        
                        // Update active state for mixer buttons
                        mixerAMPresetButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        
                        // Remove active state from mixer advanced preset buttons
                        const mixerAMAdvPresetButtons = document.querySelectorAll('[id^="mixerAMAdvPreset"]');
                        mixerAMAdvPresetButtons.forEach(btn => btn.classList.remove('active'));
                        
                        // Sync with header buttons
                        const headerAMPresetButtons = document.querySelectorAll('#headerVisualizerPanel .btn-preset[data-preset]');
                        headerAMPresetButtons.forEach(btn => btn.classList.remove('active'));
                        const headerBtn = document.querySelector(`#headerVisualizerPanel .btn-preset[data-preset="${presetIndex}"]`);
                        if (headerBtn) headerBtn.classList.add('active');
                        
                        const headerAMProPresetButtons = document.querySelectorAll('#headerVisualizerPanel .btn-preset-pro');
                        headerAMProPresetButtons.forEach(btn => btn.classList.remove('active'));
                        
                        // Hide advanced controls
                        const mixerAdvancedControls = document.getElementById('mixerAdvancedPresetControls');
                        if (mixerAdvancedControls) {
                            mixerAdvancedControls.style.display = 'none';
                        }
                    }
                });
            });
        }
        
        // Mixer AM Advanced Preset Buttons (Fluid, Prism, Twin Peaks, Circus)
        const mixerAMAdvPresetButtons = document.querySelectorAll('[id^="mixerAMAdvPreset"][data-official-preset]');
        if (mixerAMAdvPresetButtons.length > 0) {
            mixerAMAdvPresetButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const presetIndex = parseInt(button.getAttribute('data-official-preset'));
                    
                    if (this.visualizer && this.visualizer.officialAudioMotionPresets && presetIndex >= 0 && presetIndex < this.visualizer.officialAudioMotionPresets.length) {
                        this.visualizer.setOfficialAudioMotionPreset(presetIndex);
                        
                        // Update active state for mixer buttons
                        mixerAMAdvPresetButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        
                        // Remove active state from mixer regular preset buttons
                        const mixerAMPresetButtons = document.querySelectorAll('[id^="mixerAMPreset"][data-preset]');
                        mixerAMPresetButtons.forEach(btn => btn.classList.remove('active'));
                        
                        // Sync with header buttons
                        const headerAMProPresetButtons = document.querySelectorAll('#headerVisualizerPanel .btn-preset-pro[data-official-preset]');
                        headerAMProPresetButtons.forEach(btn => btn.classList.remove('active'));
                        const headerBtn = document.querySelector(`#headerVisualizerPanel .btn-preset-pro[data-official-preset="${presetIndex}"]`);
                        if (headerBtn) headerBtn.classList.add('active');
                        
                        const headerAMPresetButtons = document.querySelectorAll('#headerVisualizerPanel .btn-preset[data-preset]');
                        headerAMPresetButtons.forEach(btn => btn.classList.remove('active'));
                        
                        // Show advanced controls
                        const mixerAdvancedControls = document.getElementById('mixerAdvancedPresetControls');
                        if (mixerAdvancedControls) {
                            mixerAdvancedControls.style.display = 'block';
                        }
                        
                        // Load control values from preset
                        if (this.visualizer && typeof this.visualizer.loadMixerAdvancedControlsFromPreset === 'function') {
                            setTimeout(() => this.visualizer.loadMixerAdvancedControlsFromPreset(), 100);
                        }
                    }
                });
            });
        }
        
        // Setup mixer advanced control event listeners
        if (this.visualizer && typeof this.visualizer.setupMixerAdvancedControlEventListeners === 'function') {
            this.visualizer.setupMixerAdvancedControlEventListeners();
        }

        // Mixer AM Preset Selector
        const mixerAMPresetSelector = document.getElementById('mixerAMPresetSelector');
        if (mixerAMPresetSelector) {
            mixerAMPresetSelector.addEventListener('change', (e) => {
                if (this.visualizer && e.target.value !== '') {
                    const presetIndex = parseInt(e.target.value);
                    
                    // Load preset
                    this.visualizer.loadPreset(presetIndex);
                    
                    // Reset dropdown
                    e.target.value = '';
                    
                }
            });
        } else {
        }

        // Mixer AM Save Preset Button
        const mixerAMSavePresetBtn = document.getElementById('mixerAMSavePresetBtn');
        if (mixerAMSavePresetBtn) {
            mixerAMSavePresetBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Save current preset
                    const presetName = prompt('Enter preset name:');
                    if (presetName) {
                        this.visualizer.saveCurrentAsPreset(presetName);
                    }
                    
                    // Update both dropdowns
                    this.updateMixerAMPresetSelector();
                    
                }
            });
        } else {
        }

        // Mixer AM Export Presets Button
        const mixerAMExportPresetsBtn = document.getElementById('mixerAMExportPresetsBtn');
        if (mixerAMExportPresetsBtn) {
            mixerAMExportPresetsBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Export presets
                    this.visualizer.exportPresets();
                    
                }
            });
        } else {
        }

        // Mixer AM Import Presets Button
        const mixerAMImportPresetsBtn = document.getElementById('mixerAMImportPresetsBtn');
        const mixerAMImportPresetsFile = document.getElementById('mixerAMImportPresetsFile');
        if (mixerAMImportPresetsBtn && mixerAMImportPresetsFile) {
            mixerAMImportPresetsBtn.addEventListener('click', () => {
                mixerAMImportPresetsFile.click();
            });
            
            mixerAMImportPresetsFile.addEventListener('change', (e) => {
                if (this.visualizer && e.target.files.length > 0) {
                    
                    // Import presets
                    this.visualizer.importPresets(e.target.files[0]);
                    
                    // Update both dropdowns
                    this.updateMixerAMPresetSelector();
                    
                }
            });
        } else {
        }

        // Mixer AM Color Scheme Select
        const mixerAMColorSchemeSelect = document.getElementById('mixerAMColorSchemeSelect');
        if (mixerAMColorSchemeSelect) {
            mixerAMColorSchemeSelect.addEventListener('change', (e) => {
                if (this.visualizer) {
                    const scheme = e.target.value;
                    
                    // Set color scheme
                    this.visualizer.setColorScheme(scheme);
                    
                }
            });
        } else {
        }

        // ========== INFINITE ZOOM CHANNEL ==========

        // Mixer Infinite Zoom toggle button
        const mixerInfiniteZoomToggle = document.getElementById('mixerInfiniteZoomToggle');
        if (mixerInfiniteZoomToggle) {
            mixerInfiniteZoomToggle.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Toggle Infinite Zoom state
                    this.visualizer.toggleInfiniteZoom();
                    
                    // Update mixer UI
                    this.updateMixerInfiniteZoomToggle();
                    
                }
            });
        } else {
        }

        // Mixer Infinite Zoom opacity slider
        const mixerInfiniteZoomOpacitySlider = document.getElementById('mixerInfiniteZoomOpacitySlider');
        if (mixerInfiniteZoomOpacitySlider) {
            this.mixerInfiniteZoomOpacitySlider = this.initializeVerticalSlider(mixerInfiniteZoomOpacitySlider, (value) => {
                if (this.visualizer) {
                    // Convert 0-100 to 0.0-1.0
                    const opacityValue = value / 100;
                    this.visualizer.setInfiniteZoomOpacity(opacityValue);
                    
                    // Update value display
                    const valueDisplay = document.getElementById('mixerInfiniteZoomOpacityValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = value;
                    }
                    
                }
            });
        } else {
        }

        // Mixer Infinite Zoom Shape Select
        const mixerInfiniteZoomShapeSelect = document.getElementById('mixerInfiniteZoomShapeSelect');
        if (mixerInfiniteZoomShapeSelect) {
            mixerInfiniteZoomShapeSelect.addEventListener('change', (e) => {
                if (this.visualizer && this.visualizer.infiniteZoom) {
                    const shape = e.target.value;
                    
                    // Set shape and update objects
                    this.visualizer.infiniteZoom.shape = shape;
                    this.visualizer.infiniteZoom.updateObjectShapes();
                    
                    // Update header dropdown
                    const headerInfiniteZoomShapeSelect = document.getElementById('headerInfiniteZoomShapeSelect');
                    if (headerInfiniteZoomShapeSelect) {
                        headerInfiniteZoomShapeSelect.value = shape;
                    }
                    
                }
            });
        } else {
        }

        // ========== INFINITE ZOOM SLIDERS ==========

        // Mixer Infinite Zoom Color Randomness Dial
        const mixerInfiniteZoomColorRandomDial = document.getElementById('mixerInfiniteZoomColorRandomDial');
        const mixerInfiniteZoomColorRandomValue = document.getElementById('mixerInfiniteZoomColorRandomValue');
        if (mixerInfiniteZoomColorRandomDial && mixerInfiniteZoomColorRandomValue) {
            mixerInfiniteZoomColorRandomDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.infiniteZoom) {
                    const value = parseFloat(e.detail.value);
                    mixerInfiniteZoomColorRandomValue.textContent = value.toFixed(1);
                    
                    this.visualizer.infiniteZoom.colorRandomness = value;
                    // Update existing objects with new color randomness
                    this.visualizer.infiniteZoom.objects.forEach(obj => {
                        obj.color = this.visualizer.infiniteZoom.generateColor();
                    });
                    
                    // Update header slider
                    const headerInfiniteZoomColorRandomSlider = document.getElementById('headerInfiniteZoomColorRandomSlider');
                    const headerInfiniteZoomColorRandomValue = document.getElementById('headerInfiniteZoomColorRandomValue');
                    if (headerInfiniteZoomColorRandomSlider && headerInfiniteZoomColorRandomValue) {
                        headerInfiniteZoomColorRandomSlider.value = value;
                        headerInfiniteZoomColorRandomValue.textContent = value.toFixed(1);
                    }
                }
            });
        }

        // Mixer Infinite Zoom Min Size Dial
        const mixerInfiniteZoomMinSizeDial = document.getElementById('mixerInfiniteZoomMinSizeDial');
        const mixerInfiniteZoomMinSizeValue = document.getElementById('mixerInfiniteZoomMinSizeValue');
        if (mixerInfiniteZoomMinSizeDial && mixerInfiniteZoomMinSizeValue) {
            mixerInfiniteZoomMinSizeDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.infiniteZoom) {
                    const value = parseInt(e.detail.value);
                    mixerInfiniteZoomMinSizeValue.textContent = value;
                    
                    this.visualizer.infiniteZoom.minSize = value;
                    // Update existing objects with new size range
                    this.visualizer.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.visualizer.infiniteZoom.minSize + Math.random() * (this.visualizer.infiniteZoom.maxSize - this.visualizer.infiniteZoom.minSize);
                    });
                    
                    // Update header slider
                    const headerInfiniteZoomMinSizeSlider = document.getElementById('headerInfiniteZoomMinSizeSlider');
                    const headerInfiniteZoomMinSizeValue = document.getElementById('headerInfiniteZoomMinSizeValue');
                    if (headerInfiniteZoomMinSizeSlider && headerInfiniteZoomMinSizeValue) {
                        headerInfiniteZoomMinSizeSlider.value = value;
                        headerInfiniteZoomMinSizeValue.textContent = value;
                    }
                    
                }
            });
        }

        // Mixer Infinite Zoom Max Size Dial
        const mixerInfiniteZoomMaxSizeDial = document.getElementById('mixerInfiniteZoomMaxSizeDial');
        const mixerInfiniteZoomMaxSizeValue = document.getElementById('mixerInfiniteZoomMaxSizeValue');
        if (mixerInfiniteZoomMaxSizeDial && mixerInfiniteZoomMaxSizeValue) {
            mixerInfiniteZoomMaxSizeDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.infiniteZoom) {
                    const value = parseInt(e.detail.value);
                    mixerInfiniteZoomMaxSizeValue.textContent = value;
                    
                    this.visualizer.infiniteZoom.maxSize = value;
                    // Update existing objects with new size range
                    this.visualizer.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.visualizer.infiniteZoom.minSize + Math.random() * (this.visualizer.infiniteZoom.maxSize - this.visualizer.infiniteZoom.minSize);
                    });
                    
                    // Update header slider
                    const headerInfiniteZoomMaxSizeSlider = document.getElementById('headerInfiniteZoomMaxSizeSlider');
                    const headerInfiniteZoomMaxSizeValue = document.getElementById('headerInfiniteZoomMaxSizeValue');
                    if (headerInfiniteZoomMaxSizeSlider && headerInfiniteZoomMaxSizeValue) {
                        headerInfiniteZoomMaxSizeSlider.value = value;
                        headerInfiniteZoomMaxSizeValue.textContent = value;
                    }
                    
                }
            });
        }

        // Mixer Infinite Zoom Density Dial
        const mixerInfiniteZoomDensityDial = document.getElementById('mixerInfiniteZoomDensityDial');
        const mixerInfiniteZoomDensityValue = document.getElementById('mixerInfiniteZoomDensityValue');
        if (mixerInfiniteZoomDensityDial && mixerInfiniteZoomDensityValue) {
            mixerInfiniteZoomDensityDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.infiniteZoom) {
                    const value = parseInt(e.detail.value);
                    mixerInfiniteZoomDensityValue.textContent = value;
                    
                    // Calculate density based on screen area
                    const screenArea = this.visualizer.infiniteZoom.canvas ? 
                        this.visualizer.infiniteZoom.canvas.width * this.visualizer.infiniteZoom.canvas.height : 800 * 600;
                    const maxDensity = Math.floor(screenArea / 100); // 1 object per 100 pixels for max density
                    this.visualizer.infiniteZoom.density = Math.floor((value / 100) * maxDensity);
                    // Regenerate objects if active
                    if (this.visualizer.infiniteZoom.isActive) {
                        this.visualizer.infiniteZoom.generateInitialObjects();
                    }
                    
                    // Update header slider
                    const headerInfiniteZoomDensitySlider = document.getElementById('headerInfiniteZoomDensitySlider');
                    const headerInfiniteZoomDensityValue = document.getElementById('headerInfiniteZoomDensityValue');
                    if (headerInfiniteZoomDensitySlider && headerInfiniteZoomDensityValue) {
                        headerInfiniteZoomDensitySlider.value = value;
                        headerInfiniteZoomDensityValue.textContent = value;
                    }
                    
                }
            });
        }

        // Mixer Infinite Zoom Speed Dial
        const mixerInfiniteZoomSpeedDial = document.getElementById('mixerInfiniteZoomSpeedDial');
        const mixerInfiniteZoomSpeedValue = document.getElementById('mixerInfiniteZoomSpeedValue');
        if (mixerInfiniteZoomSpeedDial && mixerInfiniteZoomSpeedValue) {
            mixerInfiniteZoomSpeedDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.infiniteZoom) {
                    const value = parseInt(e.detail.value);
                    mixerInfiniteZoomSpeedValue.textContent = value;
                    
                    // Convert -100 to 100 range to zoom speed
                    if (value === 0) {
                        this.visualizer.infiniteZoom.zoomSpeed = 0;
                        this.visualizer.infiniteZoom.baseZoomSpeed = 0;
                    } else {
                        // Convert to actual zoom speed: -100 to 100 becomes -0.1 to 0.1
                        const newSpeed = (value / 100) * 0.1;
                        this.visualizer.infiniteZoom.zoomSpeed = newSpeed;
                        this.visualizer.infiniteZoom.baseZoomSpeed = newSpeed;
                    }
                    
                    // Update header slider
                    const headerInfiniteZoomSpeedSlider = document.getElementById('headerInfiniteZoomSpeedSlider');
                    const headerInfiniteZoomSpeedValue = document.getElementById('headerInfiniteZoomSpeedValue');
                    if (headerInfiniteZoomSpeedSlider && headerInfiniteZoomSpeedValue) {
                        headerInfiniteZoomSpeedSlider.value = value;
                        headerInfiniteZoomSpeedValue.textContent = value;
                    }
                    
                }
            });
        }

        // Mixer Infinite Zoom Rotation Dial
        const mixerInfiniteZoomRotationDial = document.getElementById('mixerInfiniteZoomRotationDial');
        const mixerInfiniteZoomRotationValue = document.getElementById('mixerInfiniteZoomRotationValue');
        if (mixerInfiniteZoomRotationDial && mixerInfiniteZoomRotationValue) {
            mixerInfiniteZoomRotationDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.infiniteZoom) {
                    const value = parseFloat(e.detail.value);
                    mixerInfiniteZoomRotationValue.textContent = value.toFixed(1);
                    
                    this.visualizer.infiniteZoom.rotationSpeed = value;
                    this.visualizer.infiniteZoom.baseRotationSpeed = value;
                    
                    // Update header slider
                    const headerInfiniteZoomRotationSlider = document.getElementById('headerInfiniteZoomRotationSlider');
                    const headerInfiniteZoomRotationValue = document.getElementById('headerInfiniteZoomRotationValue');
                    if (headerInfiniteZoomRotationSlider && headerInfiniteZoomRotationValue) {
                        headerInfiniteZoomRotationSlider.value = value;
                        headerInfiniteZoomRotationValue.textContent = value.toFixed(1);
                    }
                    
                }
            });
        }

        // Initialize Infinite Zoom dials on startup
        setTimeout(() => {
            if (window.initMixerDials) {
                window.initMixerDials();
                
                // Trigger initial dialchange events for Infinite Zoom dials
                const infiniteZoomDials = [
                    'mixerInfiniteZoomColorRandomDial',
                    'mixerInfiniteZoomMinSizeDial',
                    'mixerInfiniteZoomMaxSizeDial',
                    'mixerInfiniteZoomDensityDial',
                    'mixerInfiniteZoomSpeedDial',
                    'mixerInfiniteZoomRotationDial'
                ];
                
                infiniteZoomDials.forEach(dialId => {
                    const dialElement = document.getElementById(dialId);
                    if (dialElement) {
                        const initialValue = parseFloat(dialElement.getAttribute('data-value'));
                        if (!isNaN(initialValue)) {
                            dialElement.dispatchEvent(new CustomEvent('dialchange', {
                                detail: { value: initialValue }
                            }));
                        }
                    }
                });
            }
        }, 100);

        // ========== BLOBS CHANNEL ==========

        // Mixer Blobs toggle button
        const mixerBlobsToggle = document.getElementById('mixerBlobsToggle');
        if (mixerBlobsToggle) {
            mixerBlobsToggle.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Toggle Blobs state
                    this.visualizer.toggleBlobs();
                    
                    // Update mixer UI
                    this.updateMixerBlobsToggle();
                    
                }
            });
        } else {
        }

        // Mixer Blobs opacity slider
        const mixerBlobsOpacitySlider = document.getElementById('mixerBlobsOpacitySlider');
        if (mixerBlobsOpacitySlider) {
            this.mixerBlobsOpacitySlider = this.initializeVerticalSlider(mixerBlobsOpacitySlider, (value) => {
                if (this.visualizer) {
                    // Convert 0-100 to 0.0-1.0
                    const opacityValue = value / 100;
                    this.visualizer.setBlobsOpacity(opacityValue);
                    
                    // Update value display
                    const valueDisplay = document.getElementById('mixerBlobsOpacityValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = value;
                    }
                    
                }
            });
        } else {
        }

        // ========== BLOBS CONTROL SLIDERS ==========

        // Mixer Blobs Saturation Slider
        const mixerBlobsSaturationSlider = document.getElementById('mixerBlobsSaturationSlider');
        const mixerBlobsSaturationValue = document.getElementById('mixerBlobsSaturationValue');
        if (mixerBlobsSaturationSlider && mixerBlobsSaturationValue) {
            mixerBlobsSaturationSlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const value = parseFloat(e.target.value);
                    mixerBlobsSaturationValue.textContent = value + '%';
                    
                    this.visualizer.blobsVisualization.saturation = value / 100;
                    
                    // Update header slider
                    const headerBlobsSaturationSlider = document.getElementById('blobsSaturationSlider');
                    const headerBlobsSaturationValue = document.getElementById('blobsSaturationValue');
                    if (headerBlobsSaturationSlider && headerBlobsSaturationValue) {
                        headerBlobsSaturationSlider.value = value;
                        headerBlobsSaturationValue.textContent = value + '%';
                    }
                }
            });
        }

        // Mixer Blobs Posterize Slider
        const mixerBlobsPosterizeSlider = document.getElementById('mixerBlobsPosterizeSlider');
        const mixerBlobsPosterizeValue = document.getElementById('mixerBlobsPosterizeValue');
        if (mixerBlobsPosterizeSlider && mixerBlobsPosterizeValue) {
            mixerBlobsPosterizeSlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const value = parseInt(e.target.value);
                    mixerBlobsPosterizeValue.textContent = value;
                    
                    this.visualizer.blobsVisualization.posterize = value;
                    
                    // Update header slider
                    const headerBlobsPosterizeSlider = document.getElementById('blobsPosterizeSlider');
                    const headerBlobsPosterizeValue = document.getElementById('blobsPosterizeValue');
                    if (headerBlobsPosterizeSlider && headerBlobsPosterizeValue) {
                        headerBlobsPosterizeSlider.value = value;
                        headerBlobsPosterizeValue.textContent = value;
                    }
                }
            });
        }

        // Mixer Blobs Contrast Slider
        const mixerBlobsContrastSlider = document.getElementById('mixerBlobsContrastSlider');
        const mixerBlobsContrastValue = document.getElementById('mixerBlobsContrastValue');
        if (mixerBlobsContrastSlider && mixerBlobsContrastValue) {
            mixerBlobsContrastSlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const value = parseFloat(e.target.value);
                    mixerBlobsContrastValue.textContent = value + '%';
                    
                    this.visualizer.blobsVisualization.contrast = value / 100;
                    
                    // Update header slider
                    const headerBlobsContrastSlider = document.getElementById('blobsContrastSlider');
                    const headerBlobsContrastValue = document.getElementById('blobsContrastValue');
                    if (headerBlobsContrastSlider && headerBlobsContrastValue) {
                        headerBlobsContrastSlider.value = value;
                        headerBlobsContrastValue.textContent = value + '%';
                    }
                }
            });
        }

        // Mixer Blobs Brightness Slider
        const mixerBlobsBrightnessSlider = document.getElementById('mixerBlobsBrightnessSlider');
        const mixerBlobsBrightnessValue = document.getElementById('mixerBlobsBrightnessValue');
        if (mixerBlobsBrightnessSlider && mixerBlobsBrightnessValue) {
            mixerBlobsBrightnessSlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const value = parseFloat(e.target.value);
                    mixerBlobsBrightnessValue.textContent = value + '%';
                    
                    this.visualizer.blobsVisualization.brightness = value / 100;
                    
                    // Update header slider
                    const headerBlobsBrightnessSlider = document.getElementById('blobsBrightnessSlider');
                    const headerBlobsBrightnessValue = document.getElementById('blobsBrightnessValue');
                    if (headerBlobsBrightnessSlider && headerBlobsBrightnessValue) {
                        headerBlobsBrightnessSlider.value = value;
                        headerBlobsBrightnessValue.textContent = value + '%';
                    }
                }
            });
        }

        // Mixer Blobs Intensity Slider
        const mixerBlobsIntensitySlider = document.getElementById('mixerBlobsIntensitySlider');
        const mixerBlobsIntensityValue = document.getElementById('mixerBlobsIntensityValue');
        if (mixerBlobsIntensitySlider && mixerBlobsIntensityValue) {
            mixerBlobsIntensitySlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const value = parseFloat(e.target.value);
                    mixerBlobsIntensityValue.textContent = value + '%';
                    
                    this.visualizer.blobsVisualization.intensity = value / 100;
                    
                    // Update header slider
                    const headerBlobsIntensitySlider = document.getElementById('blobsIntensitySlider');
                    const headerBlobsIntensityValue = document.getElementById('blobsIntensityValue');
                    if (headerBlobsIntensitySlider && headerBlobsIntensityValue) {
                        headerBlobsIntensitySlider.value = value;
                        headerBlobsIntensityValue.textContent = value + '%';
                    }
                }
            });
        }

        // Mixer Blobs Min Size Slider
        const mixerBlobsMinSizeSlider = document.getElementById('mixerBlobsMinSizeSlider');
        const mixerBlobsMinSizeValue = document.getElementById('mixerBlobsMinSizeValue');
        if (mixerBlobsMinSizeSlider && mixerBlobsMinSizeValue) {
            mixerBlobsMinSizeSlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const value = parseFloat(e.target.value);
                    mixerBlobsMinSizeValue.textContent = value.toFixed(1);
                    
                    this.visualizer.blobsVisualization.setMinSize(value);
                    
                    // Update header slider
                    const headerBlobsMinSizeSlider = document.getElementById('blobsMinSizeSlider');
                    const headerBlobsMinSizeValue = document.getElementById('blobsMinSizeValue');
                    if (headerBlobsMinSizeSlider && headerBlobsMinSizeValue) {
                        headerBlobsMinSizeSlider.value = value;
                        headerBlobsMinSizeValue.textContent = value.toFixed(1);
                    }
                }
            });
        }

        // Mixer Blobs Max Size Slider
        const mixerBlobsMaxSizeSlider = document.getElementById('mixerBlobsMaxSizeSlider');
        const mixerBlobsMaxSizeValue = document.getElementById('mixerBlobsMaxSizeValue');
        if (mixerBlobsMaxSizeSlider && mixerBlobsMaxSizeValue) {
            mixerBlobsMaxSizeSlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const sliderValue = parseFloat(e.target.value);
                    // Convert slider value to pixel value (exactly like header)
                    const pixelValue = 8 + (sliderValue - 1) * (248 - 8) / (10 - 1);
                    mixerBlobsMaxSizeValue.textContent = Math.round(pixelValue) + 'px';
                    
                    this.visualizer.blobsVisualization.setMaxSize(sliderValue);
                    
                    // Update header slider
                    const headerBlobsMaxSizeSlider = document.getElementById('blobsMaxSizeSlider');
                    const headerBlobsMaxSizeValue = document.getElementById('blobsMaxSizeValue');
                    if (headerBlobsMaxSizeSlider && headerBlobsMaxSizeValue) {
                        headerBlobsMaxSizeSlider.value = sliderValue;
                        headerBlobsMaxSizeValue.textContent = Math.round(pixelValue) + 'px';
                    }
                }
            });
        }

        // Mixer Blobs Agitate Slider
        const mixerBlobsAgitateSlider = document.getElementById('mixerBlobsAgitateSlider');
        const mixerBlobsAgitateValue = document.getElementById('mixerBlobsAgitateValue');
        if (mixerBlobsAgitateSlider && mixerBlobsAgitateValue) {
            mixerBlobsAgitateSlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const value = parseFloat(e.target.value);
                    mixerBlobsAgitateValue.textContent = value + '%';
                    
                    this.visualizer.blobsVisualization.agitate = value / 100;
                    
                    // Update header slider
                    const headerBlobsAgitateSlider = document.getElementById('blobsAgitateSlider');
                    const headerBlobsAgitateValue = document.getElementById('blobsAgitateValue');
                    if (headerBlobsAgitateSlider && headerBlobsAgitateValue) {
                        headerBlobsAgitateSlider.value = value;
                        headerBlobsAgitateValue.textContent = value + '%';
                    }
                }
            });
        }

        // Mixer Blobs Density Slider
        const mixerBlobsDensitySlider = document.getElementById('mixerBlobsDensitySlider');
        const mixerBlobsDensityValue = document.getElementById('mixerBlobsDensityValue');
        if (mixerBlobsDensitySlider && mixerBlobsDensityValue) {
            mixerBlobsDensitySlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const value = parseInt(e.target.value);
                    mixerBlobsDensityValue.textContent = value;
                    
                    this.visualizer.blobsVisualization.density = value;
                    this.visualizer.blobsVisualization.particleCount = value;
                    
                    // Update header slider
                    const headerBlobsDensitySlider = document.getElementById('blobsDensitySlider');
                    const headerBlobsDensityValue = document.getElementById('blobsDensityValue');
                    if (headerBlobsDensitySlider && headerBlobsDensityValue) {
                        headerBlobsDensitySlider.value = value;
                        headerBlobsDensityValue.textContent = value;
                    }
                }
            });
        }

        // Mixer Blobs Lifespan (Decay) Slider
        const mixerBlobsDecaySlider = document.getElementById('mixerBlobsDecaySlider');
        const mixerBlobsDecayValue = document.getElementById('mixerBlobsDecayValue');
        if (mixerBlobsDecaySlider && mixerBlobsDecayValue) {
            mixerBlobsDecaySlider.addEventListener('input', (e) => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    const value = parseFloat(e.target.value);
                    mixerBlobsDecayValue.textContent = value + 'x';
                    
                    this.visualizer.blobsVisualization.decayMultiplier = value;
                    
                    // Update header slider
                    const headerBlobsDecaySlider = document.getElementById('blobsDecaySlider');
                    const headerBlobsDecayValue = document.getElementById('blobsDecayValue');
                    if (headerBlobsDecaySlider && headerBlobsDecayValue) {
                        headerBlobsDecaySlider.value = value;
                        headerBlobsDecayValue.textContent = value + 'x';
                    }
                }
            });
        }

        // Mixer Blobs Beat React Button
        const mixerBlobsBeatReactBtn = document.getElementById('mixerBlobsBeatReactBtn');
        if (mixerBlobsBeatReactBtn) {
            mixerBlobsBeatReactBtn.addEventListener('click', () => {
                if (this.visualizer && this.visualizer.blobsVisualization) {
                    this.visualizer.blobsVisualization.beatReact = !this.visualizer.blobsVisualization.beatReact;
                    
                    const isOn = this.visualizer.blobsVisualization.beatReact;
                    mixerBlobsBeatReactBtn.textContent = `Beat React: ${isOn ? 'On' : 'Off'}`;
                    
                    // Update header button
                    const headerBlobsBeatReactBtn = document.getElementById('blobsBeatReactBtn');
                    if (headerBlobsBeatReactBtn) {
                        headerBlobsBeatReactBtn.textContent = `Beat React: ${isOn ? 'On' : 'Off'}`;
                    }
                }
            });
        }

        // ========== STARFALL CHANNEL ==========

        // Mixer Starfall toggle button
        const mixerStarfallToggle = document.getElementById('mixerStarfallToggle');
        if (mixerStarfallToggle) {
            mixerStarfallToggle.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Toggle Starfall state
                    this.visualizer.toggleWebGL();
                    
                    // Update mixer UI
                    this.updateMixerStarfallToggle();
                    
                }
            });
        } else {
        }

        // Mixer Starfall opacity slider
        const mixerStarfallOpacitySlider = document.getElementById('mixerStarfallOpacitySlider');
        if (mixerStarfallOpacitySlider) {
            this.mixerStarfallOpacitySlider = this.initializeVerticalSlider(mixerStarfallOpacitySlider, (value) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ opacity: value });
                }
            });
        } else {
        }

        // ========== STARFALL CONTROL SLIDERS ==========

        // Color Scheme Dropdown
        const mixerStarfallColorSchemeSelect = document.getElementById('mixerStarfallColorSchemeSelect');
        if (mixerStarfallColorSchemeSelect) {
            mixerStarfallColorSchemeSelect.addEventListener('change', (e) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    const scheme = e.target.value;
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ colorScheme: scheme });
                }
            });
        } else {
        }

        // Particle Count Dial
        const mixerStarfallParticleCountDial = document.getElementById('mixerStarfallParticleCountDial');
        const mixerStarfallParticleCountValue = document.getElementById('mixerStarfallParticleCountValue');
        if (mixerStarfallParticleCountDial && mixerStarfallParticleCountValue) {
            mixerStarfallParticleCountDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    const value = parseInt(e.detail.value);
                    mixerStarfallParticleCountValue.textContent = value;
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ particleCount: value });
                }
            });
        }

        // Particle Size Dial
        const mixerStarfallParticleSizeDial = document.getElementById('mixerStarfallParticleSizeDial');
        const mixerStarfallParticleSizeValue = document.getElementById('mixerStarfallParticleSizeValue');
        if (mixerStarfallParticleSizeDial && mixerStarfallParticleSizeValue) {
            mixerStarfallParticleSizeDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    const value = parseFloat(e.detail.value);
                    mixerStarfallParticleSizeValue.textContent = value + 'px';
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ particleSize: value });
                }
            });
        }

        // Speed Dial
        const mixerStarfallSpeedDial = document.getElementById('mixerStarfallSpeedDial');
        const mixerStarfallSpeedValue = document.getElementById('mixerStarfallSpeedValue');
        if (mixerStarfallSpeedDial && mixerStarfallSpeedValue) {
            mixerStarfallSpeedDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    const value = parseFloat(e.detail.value);
                    mixerStarfallSpeedValue.textContent = value.toFixed(1);
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ speed: value });
                }
            });
        }

        // Gravity Dial
        const mixerStarfallGravityDial = document.getElementById('mixerStarfallGravityDial');
        const mixerStarfallGravityValue = document.getElementById('mixerStarfallGravityValue');
        if (mixerStarfallGravityDial && mixerStarfallGravityValue) {
            mixerStarfallGravityDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    const value = parseFloat(e.detail.value);
                    mixerStarfallGravityValue.textContent = value.toFixed(1);
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ gravity: value });
                }
            });
        }

        // Saturation Dial
        const mixerStarfallSaturationDial = document.getElementById('mixerStarfallSaturationDial');
        const mixerStarfallSaturationValue = document.getElementById('mixerStarfallSaturationValue');
        if (mixerStarfallSaturationDial && mixerStarfallSaturationValue) {
            mixerStarfallSaturationDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    const value = parseInt(e.detail.value);
                    mixerStarfallSaturationValue.textContent = value + '%';
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ saturation: value });
                }
            });
        }

        // Twinkle Intensity Dial
        const mixerStarfallTwinkleDial = document.getElementById('mixerStarfallTwinkleDial');
        const mixerStarfallTwinkleValue = document.getElementById('mixerStarfallTwinkleValue');
        if (mixerStarfallTwinkleDial && mixerStarfallTwinkleValue) {
            mixerStarfallTwinkleDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    const value = parseInt(e.detail.value);
                    mixerStarfallTwinkleValue.textContent = value + '%';
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ twinkleIntensity: value });
                }
            });
        }

        // Star Percentage Dial
        const mixerStarfallStarPercentageDial = document.getElementById('mixerStarfallStarPercentageDial');
        const mixerStarfallStarPercentageValue = document.getElementById('mixerStarfallStarPercentageValue');
        if (mixerStarfallStarPercentageDial && mixerStarfallStarPercentageValue) {
            mixerStarfallStarPercentageDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    const value = parseInt(e.detail.value);
                    mixerStarfallStarPercentageValue.textContent = value + '%';
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ starPercentage: value });
                }
            });
        }

        // Audio Reactivity Dial
        const mixerStarfallAudioReactivityDial = document.getElementById('mixerStarfallAudioReactivityDial');
        const mixerStarfallAudioReactivityValue = document.getElementById('mixerStarfallAudioReactivityValue');
        if (mixerStarfallAudioReactivityDial && mixerStarfallAudioReactivityValue) {
            mixerStarfallAudioReactivityDial.addEventListener('dialchange', (e) => {
                if (this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
                    const value = parseInt(e.detail.value);
                    mixerStarfallAudioReactivityValue.textContent = value + '%';
                    this.visualizer.webglVisualization.currentVisualization.setSettings({ audioReactivity: value });
                }
            });
        }

        // Initialize Starfall dials on startup
        setTimeout(() => {
            if (window.initMixerDials) {
                window.initMixerDials();
                
                // Trigger initial dialchange events for Starfall dials
                const starfallDials = [
                    'mixerStarfallParticleCountDial',
                    'mixerStarfallParticleSizeDial',
                    'mixerStarfallSpeedDial',
                    'mixerStarfallGravityDial',
                    'mixerStarfallSaturationDial',
                    'mixerStarfallTwinkleDial',
                    'mixerStarfallStarPercentageDial',
                    'mixerStarfallAudioReactivityDial'
                ];
                
                starfallDials.forEach(dialId => {
                    const dialElement = document.getElementById(dialId);
                    if (dialElement) {
                        const initialValue = parseFloat(dialElement.getAttribute('data-value'));
                        if (!isNaN(initialValue)) {
                            dialElement.dispatchEvent(new CustomEvent('dialchange', {
                                detail: { value: initialValue }
                            }));
                        }
                    }
                });
            }
        }, 100);

        // ========== FLUIDITY CHANNEL ==========

        // Mixer Fluidity toggle button
        const mixerFluidityToggle = document.getElementById('mixerFluidityToggle');
        if (mixerFluidityToggle) {
            mixerFluidityToggle.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Toggle Fluidity state
                    this.visualizer.toggleFluidDynamics();
                    
                    // Update mixer UI
                    this.updateMixerFluidityToggle();
                    
                }
            });
        } else {
        }

        // Mixer Fluidity opacity slider
        const mixerFluidityOpacitySlider = document.getElementById('mixerFluidityOpacitySlider');
        if (mixerFluidityOpacitySlider) {
            this.mixerFluidityOpacitySlider = this.initializeVerticalSlider(mixerFluidityOpacitySlider, (value) => {
                if (this.visualizer && this.visualizer.fluidDynamics) {
                    // Convert 0-100 to 0.0-1.0 for fluid dynamics opacity
                    const opacityValue = value / 100;
                    this.visualizer.fluidDynamics.setOpacity(opacityValue);
                }
            });
        } else {
        }

        // ========== FLUIDITY PRESET CONTROLS ==========

        // Built-in Preset Buttons
        const mixerFluidityDefaultPresetBtn = document.getElementById('mixerFluidityDefaultPresetBtn');
        if (mixerFluidityDefaultPresetBtn) {
            mixerFluidityDefaultPresetBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    // Call the same function as header button
                    const headerBtn = document.getElementById('headerFluidDynamicsDefaultPresetBtn');
                    if (headerBtn) headerBtn.click();
                }
            });
        }

        const mixerFluidityAmbientPresetBtn = document.getElementById('mixerFluidityAmbientPresetBtn');
        if (mixerFluidityAmbientPresetBtn) {
            mixerFluidityAmbientPresetBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    const headerBtn = document.getElementById('headerFluidDynamicsAmbientPresetBtn');
                    if (headerBtn) headerBtn.click();
                }
            });
        }

        const mixerFluidityMetalPresetBtn = document.getElementById('mixerFluidityMetalPresetBtn');
        if (mixerFluidityMetalPresetBtn) {
            mixerFluidityMetalPresetBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    const headerBtn = document.getElementById('headerFluidDynamicsMetalPresetBtn');
                    if (headerBtn) headerBtn.click();
                }
            });
        }

        const mixerFluidityRandomPresetBtn = document.getElementById('mixerFluidityRandomPresetBtn');
        if (mixerFluidityRandomPresetBtn) {
            mixerFluidityRandomPresetBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    const headerBtn = document.getElementById('headerFluidDynamicsRandomPresetBtn');
                    if (headerBtn) headerBtn.click();
                }
            });
        }

        // User Presets Dropdown
        const mixerFluidityPresetSelector = document.getElementById('mixerFluidityPresetSelector');
        if (mixerFluidityPresetSelector) {
            mixerFluidityPresetSelector.addEventListener('change', (e) => {
                if (this.visualizer && e.target.value) {
                    // Sync with header dropdown
                    const headerSelector = document.getElementById('headerFluidDynamicsPresetSelector');
                    if (headerSelector) {
                        headerSelector.value = e.target.value;
                        headerSelector.dispatchEvent(new Event('change'));
                    }
                }
            });
        }

        // Action Buttons
        const mixerFluditySavePresetBtn = document.getElementById('mixerFluditySavePresetBtn');
        if (mixerFluditySavePresetBtn) {
            mixerFluditySavePresetBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    const headerBtn = document.getElementById('headerFluidDynamicsSavePresetBtn');
                    if (headerBtn) headerBtn.click();
                }
            });
        }

        const mixerFluidityExportPresetsBtn = document.getElementById('mixerFluidityExportPresetsBtn');
        if (mixerFluidityExportPresetsBtn) {
            mixerFluidityExportPresetsBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    const headerBtn = document.getElementById('headerFluidDynamicsExportPresetsBtn');
                    if (headerBtn) headerBtn.click();
                }
            });
        }

        const mixerFluidityImportPresetsBtn = document.getElementById('mixerFluidityImportPresetsBtn');
        if (mixerFluidityImportPresetsBtn) {
            mixerFluidityImportPresetsBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    const headerBtn = document.getElementById('headerFluidDynamicsImportPresetsBtn');
                    if (headerBtn) headerBtn.click();
                }
            });
        }

        // ========== FLUIDITY COLOR SCHEME ==========

        // Color Scheme Dropdown
        const mixerFluidityColorSchemeSelect = document.getElementById('mixerFluidityColorSchemeSelect');
        if (mixerFluidityColorSchemeSelect) {
            mixerFluidityColorSchemeSelect.addEventListener('change', (e) => {
                if (this.visualizer) {
                    const scheme = e.target.value;
                    // Sync with header dropdown
                    const headerColorScheme = document.getElementById('headerFluidDynamicsColorScheme');
                    if (headerColorScheme) {
                        headerColorScheme.value = scheme;
                        headerColorScheme.dispatchEvent(new Event('change'));
                    }
                }
            });
        }
        
        // Background Opacity Sliders
        const mixerFluidityBackgroundSlider = document.getElementById('mixerFluidityBackgroundSlider');
        const mixerFluidityBackgroundValue = document.getElementById('mixerFluidityBackgroundValue');
        const headerFluidDynamicsBackgroundSlider = document.getElementById('headerFluidDynamicsBackgroundSlider');
        const headerFluidDynamicsBackgroundValue = document.getElementById('headerFluidDynamicsBackgroundValue');
        
        const updateFluidBackground = (value) => {
            if (this.visualizer && this.visualizer.fluidDynamics) {
                const fluid = this.visualizer.fluidDynamics;
                const opacity = parseFloat(value);
                
                // Update config
                fluid.config.BACKGROUND_OPACITY = opacity;
                
                // Update display values
                const displayValue = opacity.toFixed(2);
                if (mixerFluidityBackgroundValue) {
                    mixerFluidityBackgroundValue.textContent = displayValue;
                }
                if (headerFluidDynamicsBackgroundValue) {
                    headerFluidDynamicsBackgroundValue.textContent = displayValue;
                }
                
                // Update slider values to stay in sync
                if (mixerFluidityBackgroundSlider) {
                    mixerFluidityBackgroundSlider.value = opacity;
                }
                if (headerFluidDynamicsBackgroundSlider) {
                    headerFluidDynamicsBackgroundSlider.value = opacity;
                }
                
                // Apply the opacity change
                fluid.applyBackgroundKnockout();
            }
        };
        
        if (mixerFluidityBackgroundSlider) {
            mixerFluidityBackgroundSlider.addEventListener('input', (e) => {
                updateFluidBackground(e.target.value);
            });
        }
        
        // Mixer Dial for Fluidity Background
        const mixerFluidityBackgroundDial = document.getElementById('mixerFluidityBackgroundDial');
        if (mixerFluidityBackgroundDial) {
            mixerFluidityBackgroundDial.addEventListener('dialchange', (e) => {
                updateFluidBackground(e.detail.value);
            });
        }
        
        if (headerFluidDynamicsBackgroundSlider) {
            headerFluidDynamicsBackgroundSlider.addEventListener('input', (e) => {
                updateFluidBackground(e.target.value);
            });
        }

        // ========== FLUIDITY CONTROL DIALS ==========

        // Helper function to sync dial with header slider
        const syncFluidityDialToHeader = (dialValue, headerSliderId, headerValueId) => {
            const headerSlider = document.getElementById(headerSliderId);
            const headerValue = document.getElementById(headerValueId);
            if (headerSlider && headerValue) {
                headerSlider.value = dialValue;
                headerValue.textContent = dialValue.toFixed(1);
                headerSlider.dispatchEvent(new Event('input'));
            }
        };

        // Saturation Dial
        const mixerFluditySaturationDial = document.getElementById('mixerFluditySaturationDial');
        const mixerFluditySaturationValue = document.getElementById('mixerFluditySaturationValue');
        if (mixerFluditySaturationDial && mixerFluditySaturationValue) {
            mixerFluditySaturationDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseFloat(e.detail.value);
                    mixerFluditySaturationValue.textContent = value.toFixed(1);
                    syncFluidityDialToHeader(value, 'headerFluidDynamicsSaturationSlider', 'headerFluidDynamicsSaturationValue');
                }
            });
        }

        // Speed Dial
        const mixerFluiditySpeedDial = document.getElementById('mixerFluiditySpeedDial');
        const mixerFluiditySpeedValue = document.getElementById('mixerFluiditySpeedValue');
        if (mixerFluiditySpeedDial && mixerFluiditySpeedValue) {
            mixerFluiditySpeedDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseFloat(e.detail.value);
                    mixerFluiditySpeedValue.textContent = value.toFixed(1);
                    syncFluidityDialToHeader(value, 'headerFluidDynamicsSpeedSlider', 'headerFluidDynamicsSpeedValue');
                }
            });
        }

        // Viscosity Dial
        const mixerFluidityViscosityDial = document.getElementById('mixerFluidityViscosityDial');
        const mixerFluidityViscosityValue = document.getElementById('mixerFluidityViscosityValue');
        if (mixerFluidityViscosityDial && mixerFluidityViscosityValue) {
            mixerFluidityViscosityDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseFloat(e.detail.value);
                    mixerFluidityViscosityValue.textContent = value.toFixed(1);
                    syncFluidityDialToHeader(value, 'headerFluidDynamicsViscositySlider', 'headerFluidDynamicsViscosityValue');
                }
            });
        }

        // Pressure Dial
        const mixerFluidityPressureDial = document.getElementById('mixerFluidityPressureDial');
        const mixerFluidityPressureValue = document.getElementById('mixerFluidityPressureValue');
        if (mixerFluidityPressureDial && mixerFluidityPressureValue) {
            mixerFluidityPressureDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseFloat(e.detail.value);
                    mixerFluidityPressureValue.textContent = value.toFixed(1);
                    syncFluidityDialToHeader(value, 'headerFluidDynamicsPressureSlider', 'headerFluidDynamicsPressureValue');
                }
            });
        }

        // Curl Dial
        const mixerFludityCurlDial = document.getElementById('mixerFludityCurlDial');
        const mixerFludityCurlValue = document.getElementById('mixerFludityCurlValue');
        if (mixerFludityCurlDial && mixerFludityCurlValue) {
            mixerFludityCurlDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseInt(e.detail.value);
                    mixerFludityCurlValue.textContent = value;
                    const headerSlider = document.getElementById('headerFluidDynamicsCurlSlider');
                    const headerValue = document.getElementById('headerFluidDynamicsCurlValue');
                    if (headerSlider && headerValue) {
                        headerSlider.value = value;
                        headerValue.textContent = value;
                        headerSlider.dispatchEvent(new Event('input'));
                    }
                }
            });
        }

        // Splat Force Dial
        const mixerFluditySplatForceDial = document.getElementById('mixerFluditySplatForceDial');
        const mixerFluditySplatForceValue = document.getElementById('mixerFluditySplatForceValue');
        if (mixerFluditySplatForceDial && mixerFluditySplatForceValue) {
            mixerFluditySplatForceDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseInt(e.detail.value);
                    mixerFluditySplatForceValue.textContent = value;
                    const headerSlider = document.getElementById('headerFluidDynamicsSplatForceSlider');
                    const headerValue = document.getElementById('headerFluidDynamicsSplatForceValue');
                    if (headerSlider && headerValue) {
                        headerSlider.value = value;
                        headerValue.textContent = value;
                        headerSlider.dispatchEvent(new Event('input'));
                    }
                }
            });
        }

        // Beat React Button
        const mixerFluidityBeatReactBtn = document.getElementById('mixerFluidityBeatReactBtn');
        if (mixerFluidityBeatReactBtn) {
            mixerFluidityBeatReactBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    // Sync with header button
                    const headerBtn = document.getElementById('headerFluidDynamicsBeatReactBtn');
                    if (headerBtn) headerBtn.click();
                }
            });
        }

        // Energy Sensitivity Dial
        const mixerFluidityEnergySensitivityDial = document.getElementById('mixerFluidityEnergySensitivityDial');
        const mixerFluidityEnergySensitivityValue = document.getElementById('mixerFluidityEnergySensitivityValue');
        if (mixerFluidityEnergySensitivityDial && mixerFluidityEnergySensitivityValue) {
            mixerFluidityEnergySensitivityDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseFloat(e.detail.value);
                    mixerFluidityEnergySensitivityValue.textContent = value.toFixed(1);
                    syncFluidityDialToHeader(value, 'headerFluidDynamicsEnergySensitivitySlider', 'headerFluidDynamicsEnergySensitivityValue');
                }
            });
        }

        // Viscosity Response Dial
        const mixerFluidityViscosityResponseDial = document.getElementById('mixerFluidityViscosityResponseDial');
        const mixerFluidityViscosityResponseValue = document.getElementById('mixerFluidityViscosityResponseValue');
        if (mixerFluidityViscosityResponseDial && mixerFluidityViscosityResponseValue) {
            mixerFluidityViscosityResponseDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseFloat(e.detail.value);
                    mixerFluidityViscosityResponseValue.textContent = value.toFixed(1);
                    syncFluidityDialToHeader(value, 'headerFluidDynamicsViscosityResponseSlider', 'headerFluidDynamicsViscosityResponseValue');
                }
            });
        }

        // Curl Response Dial
        const mixerFludityCurlResponseDial = document.getElementById('mixerFludityCurlResponseDial');
        const mixerFludityCurlResponseValue = document.getElementById('mixerFludityCurlResponseValue');
        if (mixerFludityCurlResponseDial && mixerFludityCurlResponseValue) {
            mixerFludityCurlResponseDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseFloat(e.detail.value);
                    mixerFludityCurlResponseValue.textContent = value.toFixed(1);
                    syncFluidityDialToHeader(value, 'headerFluidDynamicsCurlResponseSlider', 'headerFluidDynamicsCurlResponseValue');
                }
            });
        }

        // Pressure Response Dial
        const mixerFluidityPressureResponseDial = document.getElementById('mixerFluidityPressureResponseDial');
        const mixerFluidityPressureResponseValue = document.getElementById('mixerFluidityPressureResponseValue');
        if (mixerFluidityPressureResponseDial && mixerFluidityPressureResponseValue) {
            mixerFluidityPressureResponseDial.addEventListener('dialchange', (e) => {
                if (this.visualizer) {
                    const value = parseFloat(e.detail.value);
                    mixerFluidityPressureResponseValue.textContent = value.toFixed(1);
                    syncFluidityDialToHeader(value, 'headerFluidDynamicsPressureResponseSlider', 'headerFluidDynamicsPressureResponseValue');
                }
            });
        }

        // Initialize Fluidity dial values after dials are ready
        // This ensures FluidDynamics values are set correctly on startup
        setTimeout(() => {
            if (window.initMixerDials) {
                window.initMixerDials();
                
                // Trigger initial values for all Fluidity dials
                const fluityDials = [
                    { dial: 'mixerFluditySaturationDial', header: 'headerFluidDynamicsSaturationSlider' },
                    { dial: 'mixerFluiditySpeedDial', header: 'headerFluidDynamicsSpeedSlider' },
                    { dial: 'mixerFluidityViscosityDial', header: 'headerFluidDynamicsViscositySlider' },
                    { dial: 'mixerFluidityPressureDial', header: 'headerFluidDynamicsPressureSlider' },
                    { dial: 'mixerFludityCurlDial', header: 'headerFluidDynamicsCurlSlider' },
                    { dial: 'mixerFluditySplatForceDial', header: 'headerFluidDynamicsSplatForceSlider' },
                    { dial: 'mixerFluidityEnergySensitivityDial', header: 'headerFluidDynamicsEnergySensitivitySlider' },
                    { dial: 'mixerFluidityViscosityResponseDial', header: 'headerFluidDynamicsViscosityResponseSlider' },
                    { dial: 'mixerFludityCurlResponseDial', header: 'headerFluidDynamicsCurlResponseSlider' },
                    { dial: 'mixerFluidityPressureResponseDial', header: 'headerFluidDynamicsPressureResponseSlider' }
                ];
                
                fluityDials.forEach(({ dial: dialId, header: headerId }) => {
                    const dialElement = document.getElementById(dialId);
                    const headerSlider = document.getElementById(headerId);
                    if (dialElement && headerSlider) {
                        const initialValue = parseFloat(dialElement.getAttribute('data-value'));
                        if (!isNaN(initialValue)) {
                            // Manually trigger the dialchange event to set initial FluidDynamics values
                            dialElement.dispatchEvent(new CustomEvent('dialchange', {
                                detail: { value: initialValue }
                            }));
                    }
                }
            });
        }
        }, 100);

        // ========== NEBULA CHANNEL ==========

        // Mixer Nebula toggle button
        const mixerNebulaToggle = document.getElementById('mixerNebulaToggle');
        if (mixerNebulaToggle) {
            mixerNebulaToggle.addEventListener('click', () => {
                if (this.visualizer) {
                    
                    // Toggle Nebula state
                    this.visualizer.toggleNebula();
                    
                    // Update mixer UI
                    this.updateMixerNebulaToggle();
                    
                    // Update header button
                    const headerBtn = document.getElementById('headerNebulaBtn');
                    if (headerBtn) {
                        const toggleText = headerBtn.querySelector('.toggle-text');
                        if (toggleText) {
                            toggleText.textContent = this.visualizer.nebulaEnabled ? 'ON' : 'OFF';
                            headerBtn.classList.toggle('active', this.visualizer.nebulaEnabled);
                        }
                    }
                }
            });
        } else {
        }

        // Mixer Nebula opacity slider
        const mixerNebulaOpacitySlider = document.getElementById('mixerNebulaOpacitySlider');
        if (mixerNebulaOpacitySlider) {
            this.mixerNebulaOpacitySlider = this.initializeVerticalSlider(mixerNebulaOpacitySlider, (value) => {
                if (this.visualizer && this.visualizer.nebulaVisualization) {
                    // Convert 0-100 to 0.0-1.0 for nebula opacity
                    const opacityValue = value / 100;
                    this.visualizer.nebulaVisualization.updateSetting('overallOpacity', opacityValue);
                    
                    // Update header panel slider
                    const headerSlider = document.getElementById('nebulaOverallOpacity');
                    const headerValue = document.querySelector('#nebulaOverallOpacity + .slider-1-value');
                    if (headerSlider && headerValue) {
                        headerSlider.value = opacityValue;
                        headerValue.textContent = Math.round(opacityValue * 100) + '%';
                    }
                }
            });
        } else {
        }

        // Mixer Nebula color scheme dropdown
        const mixerNebulaColorSchemeSelect = document.getElementById('mixerNebulaColorSchemeSelect');
        if (mixerNebulaColorSchemeSelect) {
            mixerNebulaColorSchemeSelect.addEventListener('change', (e) => {
                if (this.visualizer && this.visualizer.nebulaVisualization) {
                    const scheme = e.target.value;
                    
                    // Apply color scheme by triggering the appropriate header button
                    const headerBtn = document.getElementById(`nebulaPreset${scheme.charAt(0).toUpperCase() + scheme.slice(1)}`);
                    if (headerBtn) {
                        headerBtn.click();
                    }
                    
                    // Update mixer UI
                    this.updateMixerNebulaColorSchemeSelect();
                }
            });
        } else {
        }

        // ========== NEBULA PRESET CONTROLS ==========

        // Built-in Preset Buttons
        const mixerNebulaPresetDefault = document.getElementById('mixerNebulaPresetDefault');
        if (mixerNebulaPresetDefault) {
            mixerNebulaPresetDefault.addEventListener('click', () => {
                if (this.visualizer && this.visualizer.nebulaVisualization) {
                    // Reset to default settings
                    this.visualizer.nebulaVisualization.resetToDefaults();
                    this.updateMixerNebulaControlSliders();
                }
            });
        }

        const mixerNebulaPresetCinematic = document.getElementById('mixerNebulaPresetCinematic');
        if (mixerNebulaPresetCinematic) {
            mixerNebulaPresetCinematic.addEventListener('click', () => {
                if (this.visualizer && this.visualizer.nebulaVisualization) {
                    // Apply cinematic preset
                    const cinematicSettings = {
                        cameraDistance: 120,
                        filamentDensity: 2.0,
                        pulsarSize: 8,
                        pulseRate: 1.0,
                        starCount: 2000,
                        cameraOrbit: true,
                        orbitSpeed: 2.0
                    };
                    Object.entries(cinematicSettings).forEach(([key, value]) => {
                        this.visualizer.nebulaVisualization.updateSetting(key, value);
                    });
                    this.updateMixerNebulaControlSliders();
                }
            });
        }

        const mixerNebulaPresetEnergetic = document.getElementById('mixerNebulaPresetEnergetic');
        if (mixerNebulaPresetEnergetic) {
            mixerNebulaPresetEnergetic.addEventListener('click', () => {
                if (this.visualizer && this.visualizer.nebulaVisualization) {
                    // Apply energetic preset
                    const energeticSettings = {
                        filamentDensity: 3.0,
                        expansion: 60,
                        chaos: 4.0,
                        pulsarSize: 12,
                        pulseRate: 4.0,
                        audioReactive: true,
                        audioReactivePresets: { color: true, rotation: true, pulsar: true }
                    };
                    Object.entries(energeticSettings).forEach(([key, value]) => {
                        this.visualizer.nebulaVisualization.updateSetting(key, value);
                    });
                    this.updateMixerNebulaControlSliders();
                }
            });
        }

        // User Presets Dropdown
        const mixerNebulaUserPresetSelect = document.getElementById('mixerNebulaUserPresetSelect');
        if (mixerNebulaUserPresetSelect) {
            mixerNebulaUserPresetSelect.addEventListener('change', (e) => {
                if (e.target.value && this.visualizer && this.visualizer.nebulaVisualization) {
                    this.visualizer.nebulaVisualization.loadPreset(e.target.value);
                    this.updateMixerNebulaControlSliders();
                    e.target.value = ''; // Reset dropdown
                }
            });
        }

        // Preset Management Buttons
        const mixerNebulaSavePresetBtn = document.getElementById('mixerNebulaSavePresetBtn');
        if (mixerNebulaSavePresetBtn) {
            mixerNebulaSavePresetBtn.addEventListener('click', () => {
                const headerBtn = document.getElementById('nebulaSavePresetBtn');
                if (headerBtn) headerBtn.click();
            });
        }

        const mixerNebulaExportPresetsBtn = document.getElementById('mixerNebulaExportPresetsBtn');
        if (mixerNebulaExportPresetsBtn) {
            mixerNebulaExportPresetsBtn.addEventListener('click', () => {
                const headerBtn = document.getElementById('nebulaExportPresetsBtn');
                if (headerBtn) headerBtn.click();
            });
        }

        const mixerNebulaImportPresetsBtn = document.getElementById('mixerNebulaImportPresetsBtn');
        if (mixerNebulaImportPresetsBtn) {
            mixerNebulaImportPresetsBtn.addEventListener('click', () => {
                const headerBtn = document.getElementById('nebulaImportPresetsBtn');
                if (headerBtn) headerBtn.click();
            });
        }

        // ========== NEBULA CONTROL SLIDERS ==========

        // Helper function to sync mixer slider with header slider
        const syncNebulaSlider = (mixerSliderId, mixerValueId, headerSliderId, headerValueId, setting, suffix = '') => {
            const mixerSlider = document.getElementById(mixerSliderId);
            const mixerValue = document.getElementById(mixerValueId);
            
            if (mixerSlider && mixerValue) {
                mixerSlider.addEventListener('input', (e) => {
                    if (this.visualizer && this.visualizer.nebulaVisualization) {
                        const value = parseFloat(e.target.value);
                        mixerValue.textContent = value + suffix;
                        
                        // Update nebula setting
                        this.visualizer.nebulaVisualization.updateSetting(setting, value);
                        
                        // Sync with header slider
                        const headerSlider = document.getElementById(headerSliderId);
                        const headerValue = document.getElementById(headerValueId);
                        if (headerSlider && headerValue) {
                            headerSlider.value = value;
                            headerValue.textContent = value + suffix;
                        }
                    }
                });
            }
        };

        // Helper function to sync mixer toggle with header toggle
        const syncNebulaToggle = (mixerToggleId, headerToggleId, setting) => {
            const mixerToggle = document.getElementById(mixerToggleId);
            
            if (mixerToggle) {
                mixerToggle.addEventListener('click', () => {
                    if (this.visualizer && this.visualizer.nebulaVisualization) {
                        const currentValue = this.visualizer.nebulaVisualization.settings[setting];
                        const newValue = !currentValue;
                        
                        // Update nebula setting
                        this.visualizer.nebulaVisualization.updateSetting(setting, newValue);
                        
                        // Update mixer toggle
                        const toggleText = mixerToggle.querySelector('.toggle-text');
                        if (toggleText) {
                            toggleText.textContent = newValue ? 'ON' : 'OFF';
                            mixerToggle.classList.toggle('active', newValue);
                        }
                        
                        // Sync with header toggle
                        const headerToggle = document.getElementById(headerToggleId);
                        if (headerToggle) {
                            const headerToggleText = headerToggle.querySelector('.toggle-text');
                            if (headerToggleText) {
                                const currentText = headerToggleText.textContent;
                                const newText = currentText.replace(/(ON|OFF)$/, newValue ? 'ON' : 'OFF');
                                headerToggleText.textContent = newText;
                                headerToggle.classList.toggle('active', newValue);
                            }
                        }
                    }
                });
            }
        };

        // Sync all sliders
        syncNebulaSlider('mixerNebulaCameraDistanceSlider', 'mixerNebulaCameraDistanceValue', 'nebulaCameraDistance', 'nebulaCameraDistance + .slider-1-value', 'cameraDistance');
        syncNebulaSlider('mixerNebulaStarCountSlider', 'mixerNebulaStarCountValue', 'nebulaStarCount', 'nebulaStarCount + .slider-1-value', 'starCount');
        syncNebulaSlider('mixerNebulaMorphingSpeedSlider', 'mixerNebulaMorphingSpeedValue', 'nebulaMorphingSpeed', 'nebulaMorphingSpeed + .slider-1-value', 'morphingSpeed');
        syncNebulaSlider('mixerNebulaHueShiftSlider', 'mixerNebulaHueShiftValue', 'nebulaHueShift', 'nebulaHueShift + .slider-1-value', 'hueShift', '°');
        syncNebulaSlider('mixerNebulaSaturationSlider', 'mixerNebulaSaturationValue', 'nebulaSaturation', 'nebulaSaturation + .slider-1-value', 'saturation', '%');
        syncNebulaSlider('mixerNebulaBrightnessSlider', 'mixerNebulaBrightnessValue', 'nebulaBrightness', 'nebulaBrightness + .slider-1-value', 'brightness', '%');
        syncNebulaSlider('mixerNebulaFilamentDensitySlider', 'mixerNebulaFilamentDensityValue', 'nebulaFilamentDensity', 'nebulaFilamentDensity + .slider-1-value', 'filamentDensity');
        syncNebulaSlider('mixerNebulaParticlesPerFilamentSlider', 'mixerNebulaParticlesPerFilamentValue', 'nebulaParticlesPerFilament', 'nebulaParticlesPerFilament + .slider-1-value', 'particlesPerFilament');
        syncNebulaSlider('mixerNebulaParticleSizeSlider', 'mixerNebulaParticleSizeValue', 'nebulaParticleSize', 'nebulaParticleSize + .slider-1-value', 'particleSize');
        syncNebulaSlider('mixerNebulaExpansionSlider', 'mixerNebulaExpansionValue', 'nebulaExpansion', 'nebulaExpansion + .slider-1-value', 'expansion');
        syncNebulaSlider('mixerNebulaChaosSlider', 'mixerNebulaChaosValue', 'nebulaChaos', 'nebulaChaos + .slider-1-value', 'chaos');
        syncNebulaSlider('mixerNebulaAsymmetrySlider', 'mixerNebulaAsymmetryValue', 'nebulaAsymmetry', 'nebulaAsymmetry + .slider-1-value', 'asymmetry');
        syncNebulaSlider('mixerNebulaPulsarSizeSlider', 'mixerNebulaPulsarSizeValue', 'nebulaPulsarSize', 'nebulaPulsarSize + .slider-1-value', 'pulsarSize');
        syncNebulaSlider('mixerNebulaPulseRateSlider', 'mixerNebulaPulseRateValue', 'nebulaPulseRate', 'nebulaPulseRate + .slider-1-value', 'pulseRate');
        syncNebulaSlider('mixerNebulaAudioSensitivitySlider', 'mixerNebulaAudioSensitivityValue', 'nebulaAudioSensitivity', 'nebulaAudioSensitivity + .slider-1-value', 'audioSensitivity');
        syncNebulaSlider('mixerNebulaOrbitSpeedSlider', 'mixerNebulaOrbitSpeedValue', 'nebulaOrbitSpeed', 'nebulaOrbitSpeed + .slider-1-value', 'orbitSpeed');
        syncNebulaSlider('mixerNebulaFlySpeedSlider', 'mixerNebulaFlySpeedValue', 'nebulaFlySpeed', 'nebulaFlySpeed + .slider-1-value', 'flySpeed');

        // Sync all toggles
        syncNebulaToggle('mixerNebulaBloomToggle', 'nebulaBloomToggle', 'bloom');
        syncNebulaToggle('mixerNebulaKnockoutBackgroundToggle', 'nebulaKnockoutBackgroundToggle', 'knockoutBackground');
        syncNebulaToggle('mixerNebulaMorphingModeToggle', 'nebulaMorphingModeToggle', 'morphingMode');
        syncNebulaToggle('mixerNebulaShowPulsarToggle', 'nebulaShowPulsarToggle', 'showPulsar');
        syncNebulaToggle('mixerNebulaAudioReactiveToggle', 'nebulaAudioReactiveToggle', 'audioReactive');
        syncNebulaToggle('mixerNebulaCameraOrbitToggle', 'nebulaCameraOrbitToggle', 'cameraOrbit');
        syncNebulaToggle('mixerNebulaFlyThroughToggle', 'nebulaFlyThroughToggle', 'flyThrough');

        // Audio reactive preset toggles (special handling)
        const mixerNebulaColorReactiveToggle = document.getElementById('mixerNebulaColorReactiveToggle');
        if (mixerNebulaColorReactiveToggle) {
            mixerNebulaColorReactiveToggle.addEventListener('click', () => {
                const headerBtn = document.getElementById('headerNebulaColorPresetBtn');
                if (headerBtn) headerBtn.click();
                this.updateMixerNebulaControlSliders();
            });
        }

        const mixerNebulaRotationReactiveToggle = document.getElementById('mixerNebulaRotationReactiveToggle');
        if (mixerNebulaRotationReactiveToggle) {
            mixerNebulaRotationReactiveToggle.addEventListener('click', () => {
                const headerBtn = document.getElementById('headerNebulaRotationPresetBtn');
                if (headerBtn) headerBtn.click();
                this.updateMixerNebulaControlSliders();
            });
        }

        const mixerNebulaPulsarReactiveToggle = document.getElementById('mixerNebulaPulsarReactiveToggle');
        if (mixerNebulaPulsarReactiveToggle) {
            mixerNebulaPulsarReactiveToggle.addEventListener('click', () => {
                const headerBtn = document.getElementById('headerNebulaPulsarPresetBtn');
                if (headerBtn) headerBtn.click();
                this.updateMixerNebulaControlSliders();
            });
        }

        // Mixer audio volume slider
        const mixerAudioVolumeSlider = document.getElementById('mixerAudioVolumeSlider');
        if (mixerAudioVolumeSlider) {
            this.mixerAudioVolumeSlider = this.initializeVerticalSlider(mixerAudioVolumeSlider, (value) => {
                if (this.visualizer) {
                    // Convert 0-100 to 0.0-1.0
                    const volumeValue = value / 100;
                    this.visualizer.setVolume(volumeValue);
                    
                    // Update value display
                    const valueDisplay = document.getElementById('mixerAudioVolumeValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = value;
                    }
                    
                }
            });
        } else {
        }

        // Mixer file input handler
        if (mixerBackgroundImageFile) {
            mixerBackgroundImageFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                //     name: file?.name,
                //     type: file?.type,
                //     size: file?.size,
                //     lastModified: file?.lastModified
                // });
                
                if (file) {
                    // Validate file type
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                    if (!validTypes.includes(file.type)) {
                        alert('Please select a valid image file (JPG, JPEG, or PNG).');
                        return;
                    }
                    
                    // Validate file size (10MB limit)
                    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
                    if (file.size > maxSize) {
                        alert('File size must be less than 10MB.');
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (this.visualizer) {
                            this.visualizer.backgroundImage = e.target.result;
                            this.visualizer.backgroundImageEnabled = true; // Auto-enable when image is loaded
                            this.visualizer.backgroundImageFileName = file.name;
                            this.visualizer.backgroundImageFileSize = file.size;
                            this.visualizer.cachedBackgroundImage = null; // Clear cached image
                            this.visualizer.saveBackgroundImage();
                            this.visualizer.updateBackgroundImageElement();
                            
                            // Update all UIs
                            this.updateMixerBackgroundImageUI();
                            this.updateMixerBackgroundToggleButton(); // Update mixer toggle
                            this.updateMixerBackgroundOpacitySlider(); // Update mixer opacity
                            this.updateMixerBackgroundSizingButtons(); // Update mixer sizing
                            this.updateMixerBackgroundSaturationSlider(); // Update mixer saturation
                            this.updateMixerBackgroundPosterizeSlider(); // Update mixer posterize
                            this.updateMixerBackgroundContrastSlider(); // Update mixer contrast
                            this.updateBackgroundImageUI(); // Update header UI too
                            this.visualizer.updateFooterBackgroundButton(); // Update footer button
                            
                            //     fileName: file.name,
                            //     fileSize: file.size,
                            //     hasImage: !!this.visualizer.backgroundImage
                            // });
                        }
                    };
                    reader.onerror = (e) => {
                    };
                    reader.readAsDataURL(file);
                } else {
                }
            });
        }

        // File input handler
        if (backgroundImageFile) {
            backgroundImageFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                //     name: file?.name,
                //     type: file?.type,
                //     size: file?.size,
                //     sizeMB: file ? (file.size / (1024 * 1024)).toFixed(2) + 'MB' : 'N/A'
                // });
                
                if (file) {
                    // Validate file type
                    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
                        alert('Please select a JPG or PNG image file.');
                        return;
                    }

                    // Validate file size (2MB limit)
                    if (file.size > 2 * 1024 * 1024) {
                        alert('File size must be less than 2MB.');
                        return;
                    }

                    // Read file as data URL
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (this.visualizer) {
                            this.visualizer.backgroundImage = e.target.result;
                            this.visualizer.backgroundImageEnabled = true; // Auto-enable when image is loaded
                            this.visualizer.backgroundImageFileName = file.name;
                            this.visualizer.backgroundImageFileSize = file.size;
                            this.visualizer.cachedBackgroundImage = null; // Clear cached image
                            this.visualizer.saveBackgroundImage();
                            this.visualizer.updateBackgroundImageElement();
                            this.updateBackgroundImageUI();
                            this.updateMixerBackgroundImageUI(); // Update mixer UI too
                            this.updateMixerBackgroundToggleButton(); // Update mixer toggle too
                            this.updateMixerBackgroundOpacitySlider(); // Update mixer opacity too
                            this.updateMixerBackgroundSizingButtons(); // Update mixer sizing too
                            this.updateMixerBackgroundSaturationSlider(); // Update mixer saturation too
                            this.updateMixerBackgroundPosterizeSlider(); // Update mixer posterize too
                            this.updateMixerBackgroundContrastSlider(); // Update mixer contrast too
                            this.visualizer.updateFooterBackgroundButton(); // Update footer button
                            
                            // Update background image panel if it exists
                            const backgroundPanel = document.getElementById('backgroundImagePanel');
                            if (backgroundPanel) {
                                this.visualizer.updateBackgroundPanelStates(backgroundPanel);
                            }
                            
                        }
                    };
                    reader.onerror = (e) => {
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Settings panel toggle
        const backgroundSettingsBtn = document.getElementById('backgroundSettingsBtn');
        const backgroundSettingsPanel = document.getElementById('backgroundSettingsPanel');
        const backgroundSettingsClose = document.getElementById('backgroundSettingsClose');

        if (backgroundSettingsBtn && backgroundSettingsPanel) {
            backgroundSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = backgroundSettingsPanel.style.display !== 'none';
                if (!isVisible) {
                    this.closeAllPanels(); // CLOSE ALL PANELS FIRST
                }
                backgroundSettingsPanel.style.display = isVisible ? 'none' : 'block';
            });
        }

        if (backgroundSettingsClose && backgroundSettingsPanel) {
            backgroundSettingsClose.addEventListener('click', () => {
                backgroundSettingsPanel.style.display = 'none';
            });
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (backgroundSettingsPanel && !backgroundSettingsPanel.contains(e.target) && 
                !backgroundSettingsBtn.contains(e.target)) {
                backgroundSettingsPanel.style.display = 'none';
            }
        });

        // Opacity slider
        const opacitySlider = document.getElementById('backgroundOpacitySlider');
        const opacityValue = document.getElementById('backgroundOpacityValue');
        
        if (opacitySlider && opacityValue) {
            opacitySlider.value = this.visualizer ? this.visualizer.backgroundImageOpacity : 100;
            opacityValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageOpacity : 100}%`;
            
            opacitySlider.addEventListener('input', (e) => {
                if (this.visualizer) {
                    this.visualizer.backgroundImageOpacity = parseInt(e.target.value);
                    opacityValue.textContent = `${this.visualizer.backgroundImageOpacity}%`;
                    this.visualizer.saveBackgroundImage();
                }
            });
        }

        // Saturation slider
        const saturationSlider = document.getElementById('backgroundSaturationSlider');
        const saturationValue = document.getElementById('backgroundSaturationValue');
        
        if (saturationSlider && saturationValue) {
            saturationSlider.value = this.visualizer ? this.visualizer.backgroundImageSaturation : 100;
            saturationValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageSaturation : 100}%`;
            
            saturationSlider.addEventListener('input', (e) => {
                if (this.visualizer) {
                    this.visualizer.backgroundImageSaturation = parseInt(e.target.value);
                    saturationValue.textContent = `${this.visualizer.backgroundImageSaturation}%`;
                    this.visualizer.saveBackgroundImage();
                }
            });
        }

        // Posterization slider
        const posterizeSlider = document.getElementById('backgroundPosterizeSlider');
        const posterizeValue = document.getElementById('backgroundPosterizeValue');
        
        if (posterizeSlider && posterizeValue) {
            posterizeSlider.value = this.visualizer ? this.visualizer.backgroundImagePosterize : 16;
            posterizeValue.textContent = this.visualizer ? this.visualizer.backgroundImagePosterize : 16;
            
            posterizeSlider.addEventListener('input', (e) => {
                if (this.visualizer) {
                    this.visualizer.backgroundImagePosterize = parseInt(e.target.value);
                    posterizeValue.textContent = this.visualizer.backgroundImagePosterize;
                    this.visualizer.saveBackgroundImage();
                }
            });
        }

        // Contrast slider
        const contrastSlider = document.getElementById('backgroundContrastSlider');
        const contrastValue = document.getElementById('backgroundContrastValue');
        
        if (contrastSlider && contrastValue) {
            contrastSlider.value = this.visualizer ? this.visualizer.backgroundImageContrast : 100;
            contrastValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageContrast : 100}%`;
            
            contrastSlider.addEventListener('input', (e) => {
                if (this.visualizer) {
                    this.visualizer.backgroundImageContrast = parseInt(e.target.value);
                    contrastValue.textContent = `${this.visualizer.backgroundImageContrast}%`;
                    this.visualizer.saveBackgroundImage();
                }
            });
        }

        // Size buttons
        const sizeButtons = document.querySelectorAll('.size-btn[data-size]');
        sizeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.visualizer) {
                    const size = e.target.getAttribute('data-size');
                    this.visualizer.backgroundImageSize = size;
                    this.visualizer.saveBackgroundImage();
                    
                    // Update active state
                    sizeButtons.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });

        // Clear background button
        const clearBtn = document.getElementById('backgroundClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    this.visualizer.clearBackgroundImage();
                    this.updateBackgroundImageUI();
                }
            });
        }

        // Initialize UI state
        this.updateBackgroundImageUI();
        
        // Sidebar background controls removed - functionality moved to header
    }
    
    // Sidebar background controls removed - functionality moved to header
    initializeSidebarBackgroundControls_removed() {
        // Sidebar background image button - toggle ON/OFF only
        // Sidebar background elements removed - functionality moved to header
        
        // Sidebar background button removed - functionality moved to header
        if (false) { // Disabled - sidebar removed
            // Initialize button state
            this.updateSidebarBackgroundToggleButton();
            
            sidebarBackgroundImgBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    //     enabled: this.visualizer.backgroundImageEnabled,
                    //     hasImage: !!this.visualizer.backgroundImage
                    // });
                    
                    // Toggle background image enabled state
                    this.visualizer.backgroundImageEnabled = !this.visualizer.backgroundImageEnabled;
                    this.visualizer.saveBackgroundImage();
                    this.updateBackgroundToggleButton(); // Header controls only
                    
                    
                    // Force redraw of visualization
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        // Sidebar background select image button removed - functionality moved to header
        if (false) { // Disabled - sidebar removed
            sidebarBackgroundSelectImageBtn.addEventListener('click', () => {
                if (sidebarBackgroundImageFile) {
                    sidebarBackgroundImageFile.click();
                }
            });
        }

        // Sidebar background file input removed - functionality moved to header
        if (false) { // Disabled - sidebar removed
            sidebarBackgroundImageFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                //     name: file?.name,
                //     type: file?.type,
                //     size: file?.size,
                //     lastModified: file?.lastModified
                // });
                
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (this.visualizer) {
                            this.visualizer.backgroundImage = e.target.result;
                            this.visualizer.backgroundImageEnabled = true; // Auto-enable when image is loaded
                            this.visualizer.backgroundImageFileName = file.name;
                            this.visualizer.backgroundImageFileSize = file.size;
                            this.visualizer.cachedBackgroundImage = null; // Clear cached image
                            this.visualizer.saveBackgroundImage();
                            this.visualizer.updateBackgroundImageElement();
                            this.updateBackgroundImageUI(); // Header controls only
                            this.visualizer.updateFooterBackgroundButton(); // Update footer button
                        }
                    };
                    reader.onerror = (e) => {
                        this.showError('Failed to read image file');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Note: Settings panel removed - all controls are now embedded directly in sidebar

        // Sidebar background controls removed - functionality moved to header
    }
    
    // Sidebar background sliders removed - functionality moved to header
    initializeSidebarBackgroundSliders_removed() {
        // Sidebar background opacity elements removed - functionality moved to header
        
        if (false) { // Disabled - sidebar removed
            sidebarOpacitySlider.value = this.visualizer ? this.visualizer.backgroundImageOpacity : 100;
            sidebarOpacityValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageOpacity : 100}%`;
            
            sidebarOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sidebarOpacityValue.textContent = `${value}%`;
                if (this.visualizer) {
                    this.visualizer.backgroundImageOpacity = value;
                    this.visualizer.saveBackgroundImage();
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        // Sidebar background saturation elements removed - functionality moved to header
        
        if (false) { // Disabled - sidebar removed
            sidebarSaturationSlider.value = this.visualizer ? this.visualizer.backgroundImageSaturation : 100;
            sidebarSaturationValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageSaturation : 100}%`;
            
            sidebarSaturationSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sidebarSaturationValue.textContent = `${value}%`;
                if (this.visualizer) {
                    this.visualizer.backgroundImageSaturation = value;
                    this.visualizer.saveBackgroundImage();
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        // Sidebar background posterization elements removed - functionality moved to header
        
        if (false) { // Disabled - sidebar removed
            sidebarPosterizeSlider.value = this.visualizer ? this.visualizer.backgroundImagePosterize : 16;
            sidebarPosterizeValue.textContent = `${this.visualizer ? this.visualizer.backgroundImagePosterize : 16}`;
            
            sidebarPosterizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sidebarPosterizeValue.textContent = `${value}`;
                if (this.visualizer) {
                    this.visualizer.backgroundImagePosterize = value;
                    this.visualizer.saveBackgroundImage();
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        // Sidebar background contrast elements removed - functionality moved to header
        
        if (false) { // Disabled - sidebar removed
            sidebarContrastSlider.value = this.visualizer ? this.visualizer.backgroundImageContrast : 100;
            sidebarContrastValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageContrast : 100}%`;
            
            sidebarContrastSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sidebarContrastValue.textContent = `${value}%`;
                if (this.visualizer) {
                    this.visualizer.backgroundImageContrast = value;
                    this.visualizer.saveBackgroundImage();
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }
    }
    
    initializeSidebarBackgroundSizeButtons() {
        const sizeButtons = [
            'sidebarBackgroundSizeFit',
            'sidebarBackgroundSizeFill', 
            'sidebarBackgroundSizeStretch',
            'sidebarBackgroundSizeOriginal'
        ];
        
        sizeButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    // Remove active class from all buttons
                    sizeButtons.forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) btn.classList.remove('active');
                    });
                    
                    // Add active class to clicked button
                    button.classList.add('active');
                    
                    // Update visualizer
                    if (this.visualizer) {
                        this.visualizer.backgroundImageSize = button.dataset.size;
                        this.visualizer.saveBackgroundImage();
                        if (this.visualizer.audioMotion) {
                            this.visualizer.audioMotion.draw();
                        }
                    }
                });
            }
        });
    }
    
    // Sidebar background clear button removed - functionality moved to header
    initializeSidebarBackgroundClearButton_removed() {
        // Sidebar background clear button removed - functionality moved to header
        const sidebarClearBtn = null; // Disabled - sidebar removed
        if (false) { // Disabled - sidebar removed
            sidebarClearBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    this.visualizer.clearBackgroundImage();
                    this.updateBackgroundImageUI(); // Header controls only
                }
            });
        }
    }
    
    // Sidebar background toggle button removed - functionality moved to header
    updateSidebarBackgroundToggleButton_removed() {
        // Sidebar background toggle button removed - functionality moved to header
        const sidebarBackgroundImgBtn = null; // Disabled - sidebar removed
        if (false) { // Disabled - sidebar removed
            const textSpan = sidebarBackgroundImgBtn.querySelector('.background-text');
            if (textSpan) {
                textSpan.textContent = this.visualizer.backgroundImageEnabled ? 'Background IMG: ON' : 'Background IMG: OFF';
            }
            sidebarBackgroundImgBtn.classList.toggle('active', this.visualizer.backgroundImageEnabled);
        }
    }
    
    // Sidebar background image UI removed - functionality moved to header
    updateSidebarBackgroundImageUI_removed() {
        // Sidebar background UI elements removed - functionality moved to header
        const sidebarBackgroundImgBtn = null; // Disabled - sidebar removed
        const sidebarBackgroundFileInfo = null; // Disabled - sidebar removed
        const sidebarBackgroundFileName = null; // Disabled - sidebar removed
        const sidebarBackgroundFileSize = null; // Disabled - sidebar removed
        const sidebarBackgroundImagePreview = null; // Disabled - sidebar removed

        if (false) { // Disabled - sidebar removed
            if (this.visualizer && this.visualizer.backgroundImageEnabled && this.visualizer.backgroundImage) {
                sidebarBackgroundImgBtn.classList.add('active');
                sidebarBackgroundImgBtn.querySelector('.background-text').textContent = 'Background IMG: ON';
            } else {
                sidebarBackgroundImgBtn.classList.remove('active');
                sidebarBackgroundImgBtn.querySelector('.background-text').textContent = 'Background IMG: OFF';
            }
        }

        if (false) { // Disabled - sidebar removed
            if (sidebarBackgroundFileInfo) sidebarBackgroundFileInfo.style.display = 'block';
            if (sidebarBackgroundFileName) sidebarBackgroundFileName.textContent = this.visualizer.backgroundImageFileName;
            if (sidebarBackgroundFileSize) sidebarBackgroundFileSize.textContent = this.formatFileSize(this.visualizer.backgroundImageFileSize);
            if (sidebarBackgroundImagePreview) sidebarBackgroundImagePreview.style.backgroundImage = `url(${this.visualizer.backgroundImage})`;
        } else {
            if (sidebarBackgroundFileInfo) sidebarBackgroundFileInfo.style.display = 'none';
        }
    }

    updateBackgroundToggleButton() {
        const backgroundImgBtn = document.getElementById('backgroundImgBtn');
        if (backgroundImgBtn && this.visualizer) {
            // Header button shows proper ON/OFF state
            const textSpan = backgroundImgBtn.querySelector('.background-text');
            if (textSpan) {
                textSpan.textContent = this.visualizer.backgroundImageEnabled ? 'Background IMG: ON' : 'Background IMG: OFF';
            }
            // Update active state based on enabled status
            backgroundImgBtn.classList.toggle('active', this.visualizer.backgroundImageEnabled);
        }
    }


    debugBackgroundImageState() {
        if (!this.visualizer) return;
        
        //     'Image Data': this.visualizer.backgroundImage ? `Present (${this.visualizer.backgroundImage.length} chars)` : 'Missing',
        //     'Enabled': this.visualizer.backgroundImageEnabled,
        //     'Opacity': this.visualizer.backgroundImageOpacity + '%',
        //     'Saturation': this.visualizer.backgroundImageSaturation + '%',
        //     'Button Text': document.querySelector('#backgroundImgBtn .background-text')?.textContent,
        //     'Button Active': document.querySelector('#backgroundImgBtn')?.classList.contains('active'),
        //     'Canvas Elements': {
        //         'Main Canvas': document.querySelector('#visualizationCanvas') ? 'Present' : 'Missing',
        //         'Capture Canvas': document.querySelector('#captureCanvas') ? 'Present' : 'Missing',
        //         'Composite Canvas': document.querySelector('#compositeCanvas') ? 'Present' : 'Missing',
        //         'All Canvas Elements': document.querySelectorAll('canvas').length + ' found'
        //     },
        //     'Layer Order': [
        //         'Layer 0: Background Image',
        //         'Layer 1: Video (if active)',
        //         'Layer 2: AudioMotion Visualization',
        //         'Layer 3: Infinite Zoom',
        //         'Layer 4: Kaleidoscope',
        //         'Layer 5: Video Effects'
        //     ]
        // });
    }

    updateMixerBackgroundSizingButtons() {
        const mixerSizingButtons = document.querySelectorAll('#mixerBackgroundSizeFit, #mixerBackgroundSizeFill, #mixerBackgroundSizeStretch, #mixerBackgroundSizeOriginal');
        
        if (mixerSizingButtons.length > 0 && this.visualizer) {
            const currentSize = this.visualizer.backgroundImageSize || 'original';
            
            // Remove active class from all buttons
            mixerSizingButtons.forEach(button => {
                button.classList.remove('active');
            });
            
            // Add active class to current size button
            const activeButton = document.querySelector(`#mixerBackgroundSize${currentSize.charAt(0).toUpperCase() + currentSize.slice(1)}`);
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
        } else {
            // // console.error('❌ Mixer background sizing buttons not found for update');
        }
    }

    // Initialize custom vertical slider
    initializeVerticalSlider(sliderElement, onValueChange) {
        const track = sliderElement.querySelector('.vertical-slider-track');
        const thumb = sliderElement.querySelector('.vertical-slider-thumb');
        const min = parseInt(sliderElement.dataset.min) || 0;
        const max = parseInt(sliderElement.dataset.max) || 100;
        let value = parseInt(sliderElement.dataset.value) || 0;
        let isDragging = false;
        
        // Set thumb position based on value
        const updateThumbPosition = (immediate = false) => {
            const percentage = (value - min) / (max - min);
            const trackHeight = track.offsetHeight;
            const thumbHeight = thumb.offsetHeight;
            const maxTop = trackHeight - thumbHeight;
            // Top = 100%, Bottom = 0% (inverted for natural vertical feel)
            const top = maxTop - (percentage * maxTop);
            
            // Disable transition during dragging for immediate response
            if (immediate || isDragging) {
                thumb.style.transition = 'none';
            } else {
                thumb.style.transition = '';
            }
            
            thumb.style.top = `${Math.round(top)}px`;
        };
        
        // Calculate value from mouse position (more precise)
        const calculateValueFromPosition = (clientY) => {
            const rect = track.getBoundingClientRect();
            const trackHeight = rect.height;
            const thumbHeight = thumb.offsetHeight;
            
            // Calculate relative position with thumb center offset
            let relativeY = clientY - rect.top - (thumbHeight / 2);
            const availableHeight = trackHeight - thumbHeight;
            relativeY = Math.max(0, Math.min(availableHeight, relativeY));
            
            // Convert to percentage (invert: top = 100%, bottom = 0%)
            const percentage = 1 - (relativeY / availableHeight);
            
            // Convert to value with better precision
            const newValue = Math.round(min + (percentage * (max - min)));
            return Math.max(min, Math.min(max, newValue));
        };
        
        // Mouse down on thumb or track
        const handleMouseDown = (e) => {
            isDragging = true;
            
            // Immediate response - no lag
            const newValue = calculateValueFromPosition(e.clientY);
            value = newValue;
            sliderElement.dataset.value = value;
            updateThumbPosition(true);
            onValueChange(value);
            
            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        };
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            // Immediate response during drag
            const newValue = calculateValueFromPosition(e.clientY);
            if (newValue !== value) {
                value = newValue;
                sliderElement.dataset.value = value;
                updateThumbPosition(true);
                onValueChange(value);
            }
            e.preventDefault();
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            
            // Re-enable transitions
            thumb.style.transition = '';
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        // Add event listeners
        sliderElement.addEventListener('mousedown', handleMouseDown);
        
        // Initial position after DOM is ready
        setTimeout(() => updateThumbPosition(), 0);
        
        // Return API for external control
        return {
            setValue: (newValue) => {
                value = Math.max(min, Math.min(max, newValue));
                sliderElement.dataset.value = value;
                updateThumbPosition();
            },
            getValue: () => value
        };
    }

    updateMixerBackgroundOpacitySlider() {
        
        const mixerBackgroundOpacityValue = document.getElementById('mixerBackgroundOpacityValue');
        
        if (this.mixerOpacitySlider && this.visualizer) {
            const opacity = this.visualizer.backgroundImageOpacity || 100;
            
            // Update custom slider
            this.mixerOpacitySlider.setValue(opacity);
            
            // Update value display
            if (mixerBackgroundOpacityValue) {
                mixerBackgroundOpacityValue.textContent = opacity;
            }
            
        } else {
            // // console.error('❌ Mixer background opacity slider not found for update');
        }
    }

    updateMixerBackgroundToggleButton() {
        
        const mixerBackgroundToggle = document.getElementById('mixerBackgroundToggle');
        if (mixerBackgroundToggle) {
            if (this.visualizer) {
                const isEnabled = this.visualizer.backgroundImageEnabled;
                const hasImage = !!this.visualizer.backgroundImage;
                
                // Update button state only - text stays as "Background Image"
                if (isEnabled && hasImage) {
                    mixerBackgroundToggle.classList.add('active');
                } else {
                    mixerBackgroundToggle.classList.remove('active');
                }
                
            }
        } else {
            // // console.error('❌ Mixer background toggle button not found for update');
        }
    }

    updateMixerBackgroundImageUI() {
        
        const mixerBackgroundFileInfo = document.getElementById('mixerBackgroundFileInfo');
        const mixerBackgroundFileName = document.getElementById('mixerBackgroundFileName');
        const mixerBackgroundFileSize = document.getElementById('mixerBackgroundFileSize');
        const mixerBackgroundImagePreview = document.getElementById('mixerBackgroundImagePreview');

        //     fileInfo: !!mixerBackgroundFileInfo,
        //     fileName: !!mixerBackgroundFileName,
        //     fileSize: !!mixerBackgroundFileSize,
        //     imagePreview: !!mixerBackgroundImagePreview
        // });

        if (mixerBackgroundFileInfo && mixerBackgroundFileName && mixerBackgroundFileSize && mixerBackgroundImagePreview) {
            if (this.visualizer && this.visualizer.backgroundImage) {
                mixerBackgroundFileInfo.style.display = 'block';
                
                // Display filename and file size
                const filename = this.visualizer.backgroundImageFileName || 'Background Image';
                const fileSize = this.visualizer.backgroundImageFileSize || 0;
                const fileSizeText = fileSize > 0 ? this.formatFileSize(fileSize) : '';
                
                mixerBackgroundFileName.textContent = filename;
                mixerBackgroundFileSize.textContent = fileSizeText;
                
                // Create preview image
                const img = new Image();
                img.onload = () => {
                    mixerBackgroundImagePreview.style.backgroundImage = `url(${this.visualizer.backgroundImage})`;
                    mixerBackgroundImagePreview.style.backgroundSize = 'cover';
                    mixerBackgroundImagePreview.style.backgroundPosition = 'center';
                };
                img.onerror = (e) => {
                };
                img.src = this.visualizer.backgroundImage;
            } else {
                mixerBackgroundFileInfo.style.display = 'none';
            }
        } else {
        }
    }

    updateMixerBackgroundSaturationSlider() {
        
        const mixerBackgroundSaturation = document.getElementById('mixerBackgroundSaturation');
        const mixerBackgroundSaturationValue = document.getElementById('mixerBackgroundSaturationValue');
        
        if (mixerBackgroundSaturation && this.visualizer) {
            const saturation = this.visualizer.backgroundImageSaturation || 100;
            mixerBackgroundSaturation.value = saturation;
            
            if (mixerBackgroundSaturationValue) {
                mixerBackgroundSaturationValue.textContent = saturation;
            }
            
        } else {
            // // console.error('❌ Mixer background saturation slider not found for update');
        }
    }

    updateMixerBackgroundPosterizeSlider() {
        
        const mixerBackgroundPosterize = document.getElementById('mixerBackgroundPosterize');
        const mixerBackgroundPosterizeValue = document.getElementById('mixerBackgroundPosterizeValue');
        
        if (mixerBackgroundPosterize && this.visualizer) {
            const posterize = this.visualizer.backgroundImagePosterize || 16;
            mixerBackgroundPosterize.value = posterize;
            
            if (mixerBackgroundPosterizeValue) {
                mixerBackgroundPosterizeValue.textContent = posterize;
            }
            
        } else {
            // // console.error('❌ Mixer background posterize slider not found for update');
        }
    }

    updateMixerBackgroundContrastSlider() {
        
        const mixerBackgroundContrast = document.getElementById('mixerBackgroundContrast');
        const mixerBackgroundContrastValue = document.getElementById('mixerBackgroundContrastValue');
        
        if (mixerBackgroundContrast && this.visualizer) {
            const contrast = this.visualizer.backgroundImageContrast || 100;
            mixerBackgroundContrast.value = contrast;
            
            if (mixerBackgroundContrastValue) {
                mixerBackgroundContrastValue.textContent = contrast;
            }
            
        } else {
            // // console.error('❌ Mixer background contrast slider not found for update');
        }
    }

    updateMixerVideoOpacitySlider() {
        
        const mixerVideoOpacityValue = document.getElementById('mixerVideoOpacityValue');
        
        if (this.mixerVideoOpacitySlider && this.visualizer) {
            const opacity = Math.round((this.visualizer.videoOpacity || 1) * 100);
            
            // Update custom slider
            this.mixerVideoOpacitySlider.setValue(opacity);
            
            // Update value display
            if (mixerVideoOpacityValue) {
                mixerVideoOpacityValue.textContent = opacity;
            }
            
        } else {
            // // console.error('❌ Mixer video opacity slider not found for update');
        }
    }

    updateMixerVideoPresetButtons(activePreset) {
        
        const mixerVideoPresetButtons = document.querySelectorAll('#mixerVideoPresetNormal, #mixerVideoPresetDreamy, #mixerVideoPresetNoir, #mixerVideoPresetCyberpunk, #mixerVideoPresetVintage, #mixerVideoPresetRetroTv, #mixerVideoPresetUnderwater, #mixerVideoPresetInfrared, #mixerVideoPresetAcid, #mixerVideoPresetThermal, #mixerVideoPresetMatrix, #mixerVideoPresetGlitch');
        
        if (mixerVideoPresetButtons.length > 0) {
            // Remove active class from all buttons
            mixerVideoPresetButtons.forEach(button => {
                button.classList.remove('active');
            });
            
            // Add active class to the matching preset button
            if (activePreset) {
                const activeButton = document.querySelector(`#mixerVideoPreset${activePreset.charAt(0).toUpperCase() + activePreset.slice(1).replace('-', '')}`);
                if (activeButton) {
                    activeButton.classList.add('active');
                } else {
                    console.warn('⚠️ Mixer video preset button not found for:', activePreset);
                }
            }
        } else {
            // // console.error('❌ Mixer video preset buttons not found for update');
        }
    }

    updateMixerVideoBrightnessSlider() {
        
        const mixerVideoBrightness = document.getElementById('mixerVideoBrightness');
        const mixerVideoBrightnessValue = document.getElementById('mixerVideoBrightnessValue');
        
        if (mixerVideoBrightness && this.visualizer) {
            const brightness = this.visualizer.videoBrightness || 100;
            mixerVideoBrightness.value = brightness;
            
            if (mixerVideoBrightnessValue) {
                mixerVideoBrightnessValue.textContent = brightness;
            }
            
        } else {
            // // console.error('❌ Mixer video brightness slider not found for update');
        }
    }

    updateMixerVideoContrastSlider() {
        
        const mixerVideoContrast = document.getElementById('mixerVideoContrast');
        const mixerVideoContrastValue = document.getElementById('mixerVideoContrastValue');
        
        if (mixerVideoContrast && this.visualizer) {
            const contrast = this.visualizer.videoContrast || 100;
            mixerVideoContrast.value = contrast;
            
            if (mixerVideoContrastValue) {
                mixerVideoContrastValue.textContent = contrast;
            }
            
        } else {
            // // console.error('❌ Mixer video contrast slider not found for update');
        }
    }

    updateMixerVideoSaturationSlider() {
        
        const mixerVideoSaturation = document.getElementById('mixerVideoSaturation');
        const mixerVideoSaturationValue = document.getElementById('mixerVideoSaturationValue');
        
        if (mixerVideoSaturation && this.visualizer) {
            const saturation = this.visualizer.videoSaturation || 100;
            mixerVideoSaturation.value = saturation;
            
            if (mixerVideoSaturationValue) {
                mixerVideoSaturationValue.textContent = saturation;
            }
            
        } else {
            // // console.error('❌ Mixer video saturation slider not found for update');
        }
    }

    updateMixerVideoHueRotateSlider() {
        
        const mixerVideoHueRotate = document.getElementById('mixerVideoHueRotate');
        const mixerVideoHueRotateValue = document.getElementById('mixerVideoHueRotateValue');
        
        if (mixerVideoHueRotate && this.visualizer) {
            const hueRotate = this.visualizer.videoHueRotate || 0;
            mixerVideoHueRotate.value = hueRotate;
            
            if (mixerVideoHueRotateValue) {
                mixerVideoHueRotateValue.textContent = hueRotate;
            }
            
        } else {
            // // console.error('❌ Mixer video hue rotation slider not found for update');
        }
    }

    updateMixerVideoGrayscaleSlider() {
        
        const mixerVideoGrayscale = document.getElementById('mixerVideoGrayscale');
        const mixerVideoGrayscaleValue = document.getElementById('mixerVideoGrayscaleValue');
        
        if (mixerVideoGrayscale && this.visualizer) {
            const grayscale = this.visualizer.videoGrayscale || 0;
            mixerVideoGrayscale.value = grayscale;
            
            if (mixerVideoGrayscaleValue) {
                mixerVideoGrayscaleValue.textContent = grayscale;
            }
            
        } else {
            // // console.error('❌ Mixer video grayscale slider not found for update');
        }
    }

    updateMixerVideoFadeTimeSlider() {
        
        const mixerVideoFadeTime = document.getElementById('mixerVideoFadeTime');
        const mixerVideoFadeTimeValue = document.getElementById('mixerVideoFadeTimeValue');
        
        if (mixerVideoFadeTime && this.visualizer) {
            const fadeTime = this.visualizer.videoFadeTime || 3;
            mixerVideoFadeTime.value = fadeTime;
            
            if (mixerVideoFadeTimeValue) {
                mixerVideoFadeTimeValue.textContent = fadeTime.toFixed(1) + 's';
            }
            
        } else {
            // // console.error('❌ Mixer video fade time slider not found for update');
        }
    }

    updateMixerVideoSepiaSlider() {
        
        const mixerVideoSepia = document.getElementById('mixerVideoSepia');
        const mixerVideoSepiaValue = document.getElementById('mixerVideoSepiaValue');
        
        if (mixerVideoSepia && this.visualizer) {
            const sepia = this.visualizer.videoSepia || 0;
            mixerVideoSepia.value = sepia;
            
            if (mixerVideoSepiaValue) {
                mixerVideoSepiaValue.textContent = sepia;
            }
            
        } else {
            // // console.error('❌ Mixer video sepia slider not found for update');
        }
    }

    updateMixerVideoBlurSlider() {
        
        const mixerVideoBlur = document.getElementById('mixerVideoBlur');
        const mixerVideoBlurValue = document.getElementById('mixerVideoBlurValue');
        
        if (mixerVideoBlur && this.visualizer) {
            const blur = this.visualizer.videoBlur || 0;
            mixerVideoBlur.value = blur;
            
            if (mixerVideoBlurValue) {
                mixerVideoBlurValue.textContent = blur + 'px';
            }
            
        } else {
            // // console.error('❌ Mixer video blur slider not found for update');
        }
    }

    updateMixerVideoVignetteSlider() {
        
        const mixerVideoVignette = document.getElementById('mixerVideoVignette');
        const mixerVideoVignetteValue = document.getElementById('mixerVideoVignetteValue');
        
        if (mixerVideoVignette && this.visualizer) {
            const vignette = this.visualizer.videoVignette || 0;
            mixerVideoVignette.value = vignette;
            
            if (mixerVideoVignetteValue) {
                mixerVideoVignetteValue.textContent = vignette;
            }
            
        } else {
            // // console.error('❌ Mixer video vignette slider not found for update');
        }
    }

    updateMixerVideoPosterizeSlider() {
        
        const mixerVideoPosterize = document.getElementById('mixerVideoPosterize');
        const mixerVideoPosterizeValue = document.getElementById('mixerVideoPosterizeValue');
        
        if (mixerVideoPosterize && this.visualizer) {
            const posterize = this.visualizer.videoPosterize || 16;
            mixerVideoPosterize.value = posterize;
            
            if (mixerVideoPosterizeValue) {
                mixerVideoPosterizeValue.textContent = posterize;
            }
            
        } else {
            // // console.error('❌ Mixer video posterize slider not found for update');
        }
    }

    updateMixerVideoInvertToggle() {
        
        const mixerVideoInvert = document.getElementById('mixerVideoInvert');
        
        if (mixerVideoInvert && this.visualizer) {
            const invert = this.visualizer.videoInvert || false;
            
            const effectText = mixerVideoInvert.querySelector('.effect-text');
            if (effectText) {
                effectText.textContent = `Invert: ${invert ? 'ON' : 'OFF'}`;
            }
            mixerVideoInvert.classList.toggle('active', invert);
            
        } else {
            // // console.error('❌ Mixer video invert toggle not found for update');
        }
    }

    updateMixerVideoMirrorToggle() {
        
        const mixerVideoMirror = document.getElementById('mixerVideoMirror');
        
        if (mixerVideoMirror && this.visualizer) {
            const mirror = this.visualizer.videoMirror || 'off';
            
            const effectText = mixerVideoMirror.querySelector('.effect-text');
            if (effectText) {
                const mirrorText = mirror === 'off' ? 'Off' : 
                    mirror.charAt(0).toUpperCase() + mirror.slice(1);
                effectText.textContent = `Mirror: ${mirrorText}`;
            }
            mixerVideoMirror.classList.toggle('active', mirror !== 'off');
            
        } else {
            // // console.error('❌ Mixer video mirror toggle not found for update');
        }
    }

    updateMixerVideoPulseToggle() {
        
        const mixerVideoPulse = document.getElementById('mixerVideoPulse');
        
        if (mixerVideoPulse && this.visualizer) {
            const pulse = this.visualizer.videoPulse || false;
            
            const effectText = mixerVideoPulse.querySelector('.effect-text');
            if (effectText) {
                effectText.textContent = `Pulse: ${pulse ? 'On' : 'Off'}`;
            }
            mixerVideoPulse.classList.toggle('active', pulse);
            
            // Show/hide pulse rate container based on pulse state
            const pulseRateContainer = document.getElementById('mixerVideoPulseRateContainer');
            if (pulseRateContainer) {
                pulseRateContainer.style.display = pulse ? 'flex' : 'none';
            }
            
        } else {
            // // console.error('❌ Mixer video pulse toggle not found for update');
        }
    }

    updateMixerVideoPulseRateSlider() {
        
        const mixerVideoPulseRate = document.getElementById('mixerVideoPulseRate');
        const mixerVideoPulseRateValue = document.getElementById('mixerVideoPulseRateValue');
        
        if (mixerVideoPulseRate && this.visualizer) {
            const pulseRate = this.visualizer.videoPulseRate || 2.0;
            mixerVideoPulseRate.value = pulseRate;
            
            if (mixerVideoPulseRateValue) {
                mixerVideoPulseRateValue.textContent = `${pulseRate.toFixed(1)}s`;
            }
            
        } else {
            // // console.error('❌ Mixer video pulse rate slider not found for update');
        }
    }

    // ========== AUDIO UPDATE METHODS ==========

    updateMixerAudioToggle() {
        const mixerAudioToggle = document.getElementById('mixerAudioToggle');
        if (mixerAudioToggle && this.visualizer) {
                const isOn = this.visualizer.liveAudioEnabled;
                
            // Update button state only - text stays as "Audio Input"
                if (isOn) {
                    mixerAudioToggle.classList.add('active');
                } else {
                    mixerAudioToggle.classList.remove('active');
            }
        } else {
        }
    }

    updateMixerAudioVolumeSlider() {
        if (this.mixerAudioVolumeSlider && this.visualizer) {
            // Convert 0.0-1.0 to 0-100
            const volumePercent = Math.round(this.visualizer.volume * 100);
            this.mixerAudioVolumeSlider.setValue(volumePercent);
            
            // Update value display
            const valueDisplay = document.getElementById('mixerAudioVolumeValue');
            if (valueDisplay) {
                valueDisplay.textContent = volumePercent;
            }
        } else {
        }
    }

    updateMixerAudioDeviceSelect() {
        const mixerAudioDeviceSelect = document.getElementById('mixerAudioDeviceSelect');
        if (mixerAudioDeviceSelect && this.visualizer) {
            // Clear existing options
            mixerAudioDeviceSelect.innerHTML = '<option value="">Select Audio Input...</option>';
            
            // Add available devices
            if (this.visualizer.availableDevices && this.visualizer.availableDevices.length > 0) {
                this.visualizer.availableDevices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    let displayName = device.label || `Input ${device.deviceId.substr(0, 5)}`;
                    
                    // Add special icons for virtual audio devices
                    if (displayName.includes('BlackHole') || displayName.includes('Loopback') || 
                        displayName.includes('Virtual') || displayName.includes('Soundflower')) {
                        displayName = '🎵 ' + displayName;
                    }
                    
                    option.textContent = displayName;
                    mixerAudioDeviceSelect.appendChild(option);
                });
                
                // Set current selection
                if (this.visualizer.lastAudioDeviceId) {
                    mixerAudioDeviceSelect.value = this.visualizer.lastAudioDeviceId;
                }
            }
        } else {
        }
    }

    // ========== AM VISUALIZER UPDATE METHODS ==========

    updateMixerAMToggle() {
        const mixerAMToggle = document.getElementById('mixerAMToggle');
        if (mixerAMToggle && this.visualizer) {
                const isOn = this.visualizer.visualizationEnabled;
                
            // Update button state only - text stays as "AM Visualizer"
                if (isOn) {
                    mixerAMToggle.classList.add('active');
                } else {
                    mixerAMToggle.classList.remove('active');
            }
        } else {
        }
    }

    updateMixerAMOpacitySlider() {
        if (this.mixerAMOpacitySlider && this.visualizer) {
            // Convert 0.0-1.0 to 0-100
            const opacityPercent = Math.round(this.visualizer.visualizationOpacity * 100);
            this.mixerAMOpacitySlider.setValue(opacityPercent);
            
            // Update value display
            const valueDisplay = document.getElementById('mixerAMOpacityValue');
            if (valueDisplay) {
                valueDisplay.textContent = opacityPercent;
            }
        } else {
        }
    }

    updateHeaderAMVisualizationOpacitySlider() {
        if (this.visualizer) {
            // Update visualization opacity slider
            const vizOpacitySlider = document.getElementById('headerAMVisualizationOpacity');
            const vizOpacityValue = vizOpacitySlider ? vizOpacitySlider.nextElementSibling : null;
            if (vizOpacitySlider && vizOpacityValue) {
                const opacityPercent = Math.round(this.visualizer.visualizationOpacity * 100);
                vizOpacitySlider.value = opacityPercent;
                vizOpacityValue.textContent = opacityPercent + '%';
            }
        }
    }

    updateHeaderAMBackgroundOpacitySlider() {
        if (this.visualizer && this.visualizer.audioMotion) {
            // Update background opacity slider
            const bgOpacitySlider = document.getElementById('headerAMBackgroundOpacity');
            const bgOpacityValue = bgOpacitySlider ? bgOpacitySlider.nextElementSibling : null;
            if (bgOpacitySlider && bgOpacityValue) {
                const bgOpacityPercent = Math.round(this.visualizer.audioMotion.bgAlpha * 100);
                bgOpacitySlider.value = bgOpacityPercent;
                bgOpacityValue.textContent = bgOpacityPercent + '%';
            }
        }
    }

    updateMixerAMVizModeSelect() {
        const mixerAMVizModeSelect = document.getElementById('mixerAMVizModeSelect');
        if (mixerAMVizModeSelect && this.visualizer) {
            mixerAMVizModeSelect.value = this.visualizer.currentMode.toString();
        } else {
        }
    }

    updateMixerAMMorphButton() {
        const mixerAMMorphBtn = document.getElementById('mixerAMMorphBtn');
        if (mixerAMMorphBtn && this.visualizer) {
            const text = mixerAMMorphBtn.querySelector('.morph-btn-text');
            if (text) {
                const isMorphing = this.visualizer.isMorphing;
                
                text.textContent = isMorphing ? 'Stop Morph' : 'Start Morph';
                
                // Update button state
                if (isMorphing) {
                    mixerAMMorphBtn.classList.add('active');
                } else {
                    mixerAMMorphBtn.classList.remove('active');
                }
            }
        } else {
        }
    }

    updateMixerAMMorphSpeedSelect() {
        const mixerAMMorphSpeedSelect = document.getElementById('mixerAMMorphSpeedSelect');
        if (mixerAMMorphSpeedSelect && this.visualizer) {
            mixerAMMorphSpeedSelect.value = this.visualizer.morphMode;
        } else {
        }
    }

    updateMixerAMEnergyContainer() {
        const mixerAMEnergyContainer = document.getElementById('mixerAMEnergyContainer');
        if (mixerAMEnergyContainer && this.visualizer) {
            // Show energy container only when morph speed is 'energy'
            const isEnergyMode = this.visualizer.morphMode === 'energy';
            mixerAMEnergyContainer.style.display = isEnergyMode ? 'block' : 'none';
            } else {
        }
    }

    updateMixerAMPresetSelector() {
        const mixerAMPresetSelector = document.getElementById('mixerAMPresetSelector');
        if (mixerAMPresetSelector && this.visualizer) {
            // Clear existing options except default
            const defaultOption = mixerAMPresetSelector.querySelector('option[value=""]');
            mixerAMPresetSelector.innerHTML = '';
            if (defaultOption) {
                mixerAMPresetSelector.appendChild(defaultOption);
            } else {
                const newDefaultOption = document.createElement('option');
                newDefaultOption.value = '';
                newDefaultOption.textContent = 'Load Preset...';
                mixerAMPresetSelector.appendChild(newDefaultOption);
            }
            
            // Add saved presets
            if (this.visualizer.savedPresets && this.visualizer.savedPresets.length > 0) {
                this.visualizer.savedPresets.forEach((preset, index) => {
                    const option = document.createElement('option');
                    option.value = index.toString();
                    
                    // Don't add visual indicator - keep preset names clean
                    option.textContent = preset.name || `Preset ${index + 1}`;
                    
                    mixerAMPresetSelector.appendChild(option);
                });
            }
        } else {
        }
    }

    updateMixerAMColorSchemeSelect() {
        const mixerAMColorSchemeSelect = document.getElementById('mixerAMColorSchemeSelect');
        if (mixerAMColorSchemeSelect && this.visualizer) {
            mixerAMColorSchemeSelect.value = this.visualizer.currentColorScheme || 'default';
            } else {
        }
    }

    // ========== INFINITE ZOOM UPDATE METHODS ==========

    updateMixerInfiniteZoomToggle() {
        const mixerInfiniteZoomToggle = document.getElementById('mixerInfiniteZoomToggle');
        if (mixerInfiniteZoomToggle && this.visualizer) {
                const isOn = this.visualizer.infiniteZoom && this.visualizer.infiniteZoom.isActive;
                
            // Update button state only - text stays as "Infinite Zoom"
                if (isOn) {
                    mixerInfiniteZoomToggle.classList.add('active');
        } else {
                    mixerInfiniteZoomToggle.classList.remove('active');
            }
        } else {
        }
    }

    updateMixerInfiniteZoomOpacitySlider() {
        if (this.mixerInfiniteZoomOpacitySlider && this.visualizer) {
            // Convert 0.0-1.0 to 0-100
            const opacityPercent = Math.round(this.visualizer.infiniteZoomOpacity * 100);
            this.mixerInfiniteZoomOpacitySlider.setValue(opacityPercent);
            
            // Update value display
            const valueDisplay = document.getElementById('mixerInfiniteZoomOpacityValue');
            if (valueDisplay) {
                valueDisplay.textContent = opacityPercent;
            }
        } else {
        }
    }

    updateMixerInfiniteZoomShapeSelect() {
        const mixerInfiniteZoomShapeSelect = document.getElementById('mixerInfiniteZoomShapeSelect');
        if (mixerInfiniteZoomShapeSelect && this.visualizer && this.visualizer.infiniteZoom) {
            mixerInfiniteZoomShapeSelect.value = this.visualizer.infiniteZoom.shape || 'circle';
        } else {
        }
    }

    updateMixerInfiniteZoomColorRandomSlider() {
        const mixerInfiniteZoomColorRandomSlider = document.getElementById('mixerInfiniteZoomColorRandomSlider');
        const mixerInfiniteZoomColorRandomValue = document.getElementById('mixerInfiniteZoomColorRandomValue');
        if (mixerInfiniteZoomColorRandomSlider && mixerInfiniteZoomColorRandomValue && this.visualizer && this.visualizer.infiniteZoom) {
            const value = this.visualizer.infiniteZoom.colorRandomness || 0.5;
            mixerInfiniteZoomColorRandomSlider.value = value;
            mixerInfiniteZoomColorRandomValue.textContent = value.toFixed(1);
        }
    }

    updateMixerInfiniteZoomMinSizeSlider() {
        const mixerInfiniteZoomMinSizeSlider = document.getElementById('mixerInfiniteZoomMinSizeSlider');
        const mixerInfiniteZoomMinSizeValue = document.getElementById('mixerInfiniteZoomMinSizeValue');
        if (mixerInfiniteZoomMinSizeSlider && mixerInfiniteZoomMinSizeValue && this.visualizer && this.visualizer.infiniteZoom) {
            const value = this.visualizer.infiniteZoom.minSize || 2;
            mixerInfiniteZoomMinSizeSlider.value = value;
            mixerInfiniteZoomMinSizeValue.textContent = value;
        }
    }

    updateMixerInfiniteZoomMaxSizeSlider() {
        const mixerInfiniteZoomMaxSizeSlider = document.getElementById('mixerInfiniteZoomMaxSizeSlider');
        const mixerInfiniteZoomMaxSizeValue = document.getElementById('mixerInfiniteZoomMaxSizeValue');
        if (mixerInfiniteZoomMaxSizeSlider && mixerInfiniteZoomMaxSizeValue && this.visualizer && this.visualizer.infiniteZoom) {
            const value = this.visualizer.infiniteZoom.maxSize || 20;
            mixerInfiniteZoomMaxSizeSlider.value = value;
            mixerInfiniteZoomMaxSizeValue.textContent = value;
        }
    }

    updateMixerInfiniteZoomDensitySlider() {
        const mixerInfiniteZoomDensitySlider = document.getElementById('mixerInfiniteZoomDensitySlider');
        const mixerInfiniteZoomDensityValue = document.getElementById('mixerInfiniteZoomDensityValue');
        if (mixerInfiniteZoomDensitySlider && mixerInfiniteZoomDensityValue && this.visualizer && this.visualizer.infiniteZoom) {
            // Convert density back to percentage
            const screenArea = this.visualizer.infiniteZoom.canvas ? 
                this.visualizer.infiniteZoom.canvas.width * this.visualizer.infiniteZoom.canvas.height : 800 * 600;
            const maxDensity = Math.floor(screenArea / 100);
            const densityPercent = maxDensity > 0 ? Math.round((this.visualizer.infiniteZoom.density / maxDensity) * 100) : 50;
            mixerInfiniteZoomDensitySlider.value = densityPercent;
            mixerInfiniteZoomDensityValue.textContent = densityPercent;
        }
    }

    updateMixerInfiniteZoomSpeedSlider() {
        const mixerInfiniteZoomSpeedSlider = document.getElementById('mixerInfiniteZoomSpeedSlider');
        const mixerInfiniteZoomSpeedValue = document.getElementById('mixerInfiniteZoomSpeedValue');
        if (mixerInfiniteZoomSpeedSlider && mixerInfiniteZoomSpeedValue && this.visualizer && this.visualizer.infiniteZoom) {
            // Convert speed back to -100 to 100 range
            const baseSpeed = this.visualizer.infiniteZoom.baseZoomSpeed || 0;
            let speedValue = 50; // default
            if (baseSpeed === 0) {
                speedValue = 0;
        } else {
                // Convert from actual speed to UI range: -0.1 to 0.1 becomes -100 to 100
                speedValue = (baseSpeed / 0.1) * 100;
            }
            mixerInfiniteZoomSpeedSlider.value = speedValue;
            mixerInfiniteZoomSpeedValue.textContent = speedValue;
        }
    }

    updateMixerInfiniteZoomRotationSlider() {
        const mixerInfiniteZoomRotationSlider = document.getElementById('mixerInfiniteZoomRotationSlider');
        const mixerInfiniteZoomRotationValue = document.getElementById('mixerInfiniteZoomRotationValue');
        if (mixerInfiniteZoomRotationSlider && mixerInfiniteZoomRotationValue && this.visualizer && this.visualizer.infiniteZoom) {
            const value = this.visualizer.infiniteZoom.baseRotationSpeed || 0;
            mixerInfiniteZoomRotationSlider.value = value;
            mixerInfiniteZoomRotationValue.textContent = value.toFixed(1);
        }
    }

    // ========== BLOBS UPDATE METHODS ==========

    updateMixerBlobsToggle() {
        const mixerBlobsToggle = document.getElementById('mixerBlobsToggle');
        if (mixerBlobsToggle && this.visualizer) {
            const text = mixerBlobsToggle.querySelector('.toggle-text');
            if (text) {
                const isOn = this.visualizer.blobsEnabled;
                
                text.textContent = isOn ? 'ON' : 'OFF';
                
                // Update button state
                if (isOn) {
                    mixerBlobsToggle.classList.add('active');
                } else {
                    mixerBlobsToggle.classList.remove('active');
                }
            }
        } else {
        }
    }

    updateMixerBlobsOpacitySlider() {
        if (this.mixerBlobsOpacitySlider && this.visualizer) {
            // Convert 0.0-1.0 to 0-100
            const opacityPercent = Math.round(this.visualizer.blobsOpacity * 100);
            this.mixerBlobsOpacitySlider.setValue(opacityPercent);
            
            // Update value display
            const valueDisplay = document.getElementById('mixerBlobsOpacityValue');
            if (valueDisplay) {
                valueDisplay.textContent = opacityPercent;
            }
        } else {
        }
    }

    updateMixerBlobsSaturationSlider() {
        const mixerBlobsSaturationSlider = document.getElementById('mixerBlobsSaturationSlider');
        const mixerBlobsSaturationValue = document.getElementById('mixerBlobsSaturationValue');
        if (mixerBlobsSaturationSlider && mixerBlobsSaturationValue && this.visualizer && this.visualizer.blobsVisualization) {
            const value = Math.round((this.visualizer.blobsVisualization.saturation || 1) * 100);
            mixerBlobsSaturationSlider.value = value;
            mixerBlobsSaturationValue.textContent = value + '%';
        }
    }

    updateMixerBlobsPosterizeSlider() {
        const mixerBlobsPosterizeSlider = document.getElementById('mixerBlobsPosterizeSlider');
        const mixerBlobsPosterizeValue = document.getElementById('mixerBlobsPosterizeValue');
        if (mixerBlobsPosterizeSlider && mixerBlobsPosterizeValue && this.visualizer && this.visualizer.blobsVisualization) {
            const value = this.visualizer.blobsVisualization.posterize || 16;
            mixerBlobsPosterizeSlider.value = value;
            mixerBlobsPosterizeValue.textContent = value;
        }
    }

    updateMixerBlobsContrastSlider() {
        const mixerBlobsContrastSlider = document.getElementById('mixerBlobsContrastSlider');
        const mixerBlobsContrastValue = document.getElementById('mixerBlobsContrastValue');
        if (mixerBlobsContrastSlider && mixerBlobsContrastValue && this.visualizer && this.visualizer.blobsVisualization) {
            const value = Math.round((this.visualizer.blobsVisualization.contrast || 1) * 100);
            mixerBlobsContrastSlider.value = value;
            mixerBlobsContrastValue.textContent = value + '%';
        }
    }

    updateMixerBlobsBrightnessSlider() {
        const mixerBlobsBrightnessSlider = document.getElementById('mixerBlobsBrightnessSlider');
        const mixerBlobsBrightnessValue = document.getElementById('mixerBlobsBrightnessValue');
        if (mixerBlobsBrightnessSlider && mixerBlobsBrightnessValue && this.visualizer && this.visualizer.blobsVisualization) {
            const value = Math.round((this.visualizer.blobsVisualization.brightness || 1) * 100);
            mixerBlobsBrightnessSlider.value = value;
            mixerBlobsBrightnessValue.textContent = value + '%';
        }
    }

    updateMixerBlobsIntensitySlider() {
        const mixerBlobsIntensitySlider = document.getElementById('mixerBlobsIntensitySlider');
        const mixerBlobsIntensityValue = document.getElementById('mixerBlobsIntensityValue');
        if (mixerBlobsIntensitySlider && mixerBlobsIntensityValue && this.visualizer && this.visualizer.blobsVisualization) {
            const value = Math.round((this.visualizer.blobsVisualization.intensity || 1) * 100);
            mixerBlobsIntensitySlider.value = value;
            mixerBlobsIntensityValue.textContent = value + '%';
        }
    }

    updateMixerBlobsMinSizeSlider() {
        const mixerBlobsMinSizeSlider = document.getElementById('mixerBlobsMinSizeSlider');
        const mixerBlobsMinSizeValue = document.getElementById('mixerBlobsMinSizeValue');
        if (mixerBlobsMinSizeSlider && mixerBlobsMinSizeValue && this.visualizer && this.visualizer.blobsVisualization) {
            const value = this.visualizer.blobsVisualization.minSize || 2;
            mixerBlobsMinSizeSlider.value = value;
            mixerBlobsMinSizeValue.textContent = value.toFixed(1);
        }
    }

    updateMixerBlobsMaxSizeSlider() {
        const mixerBlobsMaxSizeSlider = document.getElementById('mixerBlobsMaxSizeSlider');
        const mixerBlobsMaxSizeValue = document.getElementById('mixerBlobsMaxSizeValue');
        if (mixerBlobsMaxSizeSlider && mixerBlobsMaxSizeValue && this.visualizer && this.visualizer.blobsVisualization) {
            const sliderValue = this.visualizer.blobsVisualization.maxSize || 1;
            // Convert slider value to pixel value (exactly like header)
            const pixelValue = 8 + (sliderValue - 1) * (248 - 8) / (10 - 1);
            mixerBlobsMaxSizeSlider.value = sliderValue;
            mixerBlobsMaxSizeValue.textContent = Math.round(pixelValue) + 'px';
        }
    }

    updateMixerBlobsAgitateSlider() {
        const mixerBlobsAgitateSlider = document.getElementById('mixerBlobsAgitateSlider');
        const mixerBlobsAgitateValue = document.getElementById('mixerBlobsAgitateValue');
        if (mixerBlobsAgitateSlider && mixerBlobsAgitateValue && this.visualizer && this.visualizer.blobsVisualization) {
            const value = Math.round((this.visualizer.blobsVisualization.agitate || 1) * 100);
            mixerBlobsAgitateSlider.value = value;
            mixerBlobsAgitateValue.textContent = value + '%';
        }
    }

    updateMixerBlobsDensitySlider() {
        const mixerBlobsDensitySlider = document.getElementById('mixerBlobsDensitySlider');
        const mixerBlobsDensityValue = document.getElementById('mixerBlobsDensityValue');
        if (mixerBlobsDensitySlider && mixerBlobsDensityValue && this.visualizer && this.visualizer.blobsVisualization) {
            const value = this.visualizer.blobsVisualization.density || 200;
            mixerBlobsDensitySlider.value = value;
            mixerBlobsDensityValue.textContent = value;
        }
    }

    updateMixerBlobsDecaySlider() {
        const mixerBlobsDecaySlider = document.getElementById('mixerBlobsDecaySlider');
        const mixerBlobsDecayValue = document.getElementById('mixerBlobsDecayValue');
        if (mixerBlobsDecaySlider && mixerBlobsDecayValue && this.visualizer && this.visualizer.blobsVisualization) {
            const value = this.visualizer.blobsVisualization.decayMultiplier || 10;
            mixerBlobsDecaySlider.value = value;
            mixerBlobsDecayValue.textContent = value + 'x';
        }
    }

    updateMixerBlobsBeatReactButton() {
        const mixerBlobsBeatReactBtn = document.getElementById('mixerBlobsBeatReactBtn');
        if (mixerBlobsBeatReactBtn && this.visualizer && this.visualizer.blobsVisualization) {
            const isOn = this.visualizer.blobsVisualization.beatReact;
            mixerBlobsBeatReactBtn.textContent = `Beat React: ${isOn ? 'On' : 'Off'}`;
        }
    }

    // ========== STARFALL UPDATE METHODS ==========

    updateMixerStarfallToggle() {
        const mixerStarfallToggle = document.getElementById('mixerStarfallToggle');
        if (mixerStarfallToggle && this.visualizer) {
                const isOn = this.visualizer.webglEnabled;
                
            // Update button state only - text stays as "Starfall"
                if (isOn) {
                    mixerStarfallToggle.classList.add('active');
                } else {
                    mixerStarfallToggle.classList.remove('active');
            }
        } else {
        }
    }

    updateMixerStarfallOpacitySlider() {
        if (this.mixerStarfallOpacitySlider && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            // Get current opacity from WebGL visualization (0.0-1.0) and convert to 0-100
            const opacityPercent = Math.round(this.visualizer.webglVisualization.currentVisualization.opacity * 100);
            this.mixerStarfallOpacitySlider.setValue(opacityPercent);
            
            // Update value display
            const valueDisplay = document.getElementById('mixerStarfallOpacityValue');
            if (valueDisplay) {
                valueDisplay.textContent = opacityPercent;
            }
        } else {
        }
    }

    updateMixerStarfallColorSchemeSelect() {
        const mixerStarfallColorSchemeSelect = document.getElementById('mixerStarfallColorSchemeSelect');
        if (mixerStarfallColorSchemeSelect && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            const currentScheme = this.visualizer.webglVisualization.currentVisualization.currentColorScheme;
            mixerStarfallColorSchemeSelect.value = currentScheme;
        }
    }

    updateMixerStarfallParticleCountSlider() {
        const mixerStarfallParticleCountSlider = document.getElementById('mixerStarfallParticleCountSlider');
        const mixerStarfallParticleCountValue = document.getElementById('mixerStarfallParticleCountValue');
        if (mixerStarfallParticleCountSlider && mixerStarfallParticleCountValue && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            const value = this.visualizer.webglVisualization.currentVisualization.particleCount;
            mixerStarfallParticleCountSlider.value = value;
            mixerStarfallParticleCountValue.textContent = value;
        }
    }

    updateMixerStarfallParticleSizeSlider() {
        const mixerStarfallParticleSizeSlider = document.getElementById('mixerStarfallParticleSizeSlider');
        const mixerStarfallParticleSizeValue = document.getElementById('mixerStarfallParticleSizeValue');
        if (mixerStarfallParticleSizeSlider && mixerStarfallParticleSizeValue && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            const value = this.visualizer.webglVisualization.currentVisualization.particleSize;
            mixerStarfallParticleSizeSlider.value = value;
            mixerStarfallParticleSizeValue.textContent = value + 'px';
        }
    }

    updateMixerStarfallSpeedSlider() {
        const mixerStarfallSpeedSlider = document.getElementById('mixerStarfallSpeedSlider');
        const mixerStarfallSpeedValue = document.getElementById('mixerStarfallSpeedValue');
        if (mixerStarfallSpeedSlider && mixerStarfallSpeedValue && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            const value = this.visualizer.webglVisualization.currentVisualization.speed;
            mixerStarfallSpeedSlider.value = value;
            mixerStarfallSpeedValue.textContent = value.toFixed(1);
        }
    }

    updateMixerStarfallGravitySlider() {
        const mixerStarfallGravitySlider = document.getElementById('mixerStarfallGravitySlider');
        const mixerStarfallGravityValue = document.getElementById('mixerStarfallGravityValue');
        if (mixerStarfallGravitySlider && mixerStarfallGravityValue && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            const value = this.visualizer.webglVisualization.currentVisualization.gravity;
            mixerStarfallGravitySlider.value = value;
            mixerStarfallGravityValue.textContent = value.toFixed(1);
        }
    }

    updateMixerStarfallSaturationSlider() {
        const mixerStarfallSaturationSlider = document.getElementById('mixerStarfallSaturationSlider');
        const mixerStarfallSaturationValue = document.getElementById('mixerStarfallSaturationValue');
        if (mixerStarfallSaturationSlider && mixerStarfallSaturationValue && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            const value = Math.round(this.visualizer.webglVisualization.currentVisualization.saturation * 100);
            mixerStarfallSaturationSlider.value = value;
            mixerStarfallSaturationValue.textContent = value + '%';
        }
    }

    updateMixerStarfallTwinkleSlider() {
        const mixerStarfallTwinkleSlider = document.getElementById('mixerStarfallTwinkleSlider');
        const mixerStarfallTwinkleValue = document.getElementById('mixerStarfallTwinkleValue');
        if (mixerStarfallTwinkleSlider && mixerStarfallTwinkleValue && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            const value = Math.round(this.visualizer.webglVisualization.currentVisualization.twinkleIntensity * 100);
            mixerStarfallTwinkleSlider.value = value;
            mixerStarfallTwinkleValue.textContent = value + '%';
        }
    }

    updateMixerStarfallStarPercentageSlider() {
        const mixerStarfallStarPercentageSlider = document.getElementById('mixerStarfallStarPercentageSlider');
        const mixerStarfallStarPercentageValue = document.getElementById('mixerStarfallStarPercentageValue');
        if (mixerStarfallStarPercentageSlider && mixerStarfallStarPercentageValue && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            const value = Math.round(this.visualizer.webglVisualization.currentVisualization.starPercentage * 100);
            mixerStarfallStarPercentageSlider.value = value;
            mixerStarfallStarPercentageValue.textContent = value + '%';
        }
    }

    updateMixerStarfallAudioReactivitySlider() {
        const mixerStarfallAudioReactivitySlider = document.getElementById('mixerStarfallAudioReactivitySlider');
        const mixerStarfallAudioReactivityValue = document.getElementById('mixerStarfallAudioReactivityValue');
        if (mixerStarfallAudioReactivitySlider && mixerStarfallAudioReactivityValue && this.visualizer && this.visualizer.webglVisualization && this.visualizer.webglVisualization.currentVisualization) {
            const value = Math.round(this.visualizer.webglVisualization.currentVisualization.audioReactivity * 100);
            mixerStarfallAudioReactivitySlider.value = value;
            mixerStarfallAudioReactivityValue.textContent = value + '%';
        }
    }

    // ========== FLUIDITY CHANNEL UPDATE METHODS ==========

    updateMixerFluidityToggle() {
        const mixerFluidityToggle = document.getElementById('mixerFluidityToggle');
        if (mixerFluidityToggle && this.visualizer) {
            // Check the actual fluid dynamics state, not fluidDynamicsEnabled
            const isActive = this.visualizer.fluidDynamics && this.visualizer.fluidDynamics.isActive;
            
            // Update button state only - text stays as "Fluidity"
            if (isActive) {
                mixerFluidityToggle.classList.add('active');
            } else {
                mixerFluidityToggle.classList.remove('active');
            }
        } else {
        }
    }

    updateMixerFluidityOpacitySlider() {
        if (this.mixerFluidityOpacitySlider && this.visualizer && this.visualizer.fluidDynamics) {
            // Get current opacity from Fluid Dynamics (0.0-1.0) and convert to 0-100
            const opacityPercent = Math.round(this.visualizer.fluidDynamics.opacity * 100);
            this.mixerFluidityOpacitySlider.setValue(opacityPercent);
            
            // Update value display
            const valueDisplay = document.getElementById('mixerFluidityOpacityValue');
            if (valueDisplay) {
                valueDisplay.textContent = opacityPercent;
            }
        } else {
        }
    }

    updateMixerFluidityPresetSelector() {
        const mixerFluidityPresetSelector = document.getElementById('mixerFluidityPresetSelector');
        const headerFluidDynamicsPresetSelector = document.getElementById('headerFluidDynamicsPresetSelector');
        
        if (mixerFluidityPresetSelector && headerFluidDynamicsPresetSelector) {
            // Sync mixer dropdown with header dropdown
            mixerFluidityPresetSelector.innerHTML = headerFluidDynamicsPresetSelector.innerHTML;
            mixerFluidityPresetSelector.value = headerFluidDynamicsPresetSelector.value;
        }
    }

    updateMixerFluidityColorSchemeSelect() {
        const mixerFluidityColorSchemeSelect = document.getElementById('mixerFluidityColorSchemeSelect');
        const headerFluidDynamicsColorScheme = document.getElementById('headerFluidDynamicsColorScheme');
        
        if (mixerFluidityColorSchemeSelect && headerFluidDynamicsColorScheme) {
            // Sync mixer dropdown with header dropdown
            mixerFluidityColorSchemeSelect.value = headerFluidDynamicsColorScheme.value;
        }
    }

    // ========== KALEIDOSCOPE CHANNEL UPDATE METHODS ==========

    updateMixerKaleidoscopeVideoToggle() {
        const mixerKaleidoscopeVideoToggle = document.getElementById('mixerKaleidoscopeVideoToggle');
        if (mixerKaleidoscopeVideoToggle && this.visualizer) {
            const toggleText = mixerKaleidoscopeVideoToggle.querySelector('.toggle-text');
            if (toggleText) {
                const isOn = this.visualizer.kaleidoscopeApplyToVideo;
                toggleText.textContent = isOn ? 'ON' : 'OFF';
                mixerKaleidoscopeVideoToggle.classList.toggle('active', isOn);
            }
        }
    }

    updateMixerKaleidoscopeVizToggle() {
        const mixerKaleidoscopeVizToggle = document.getElementById('mixerKaleidoscopeVizToggle');
        if (mixerKaleidoscopeVizToggle && this.visualizer) {
            const toggleText = mixerKaleidoscopeVizToggle.querySelector('.toggle-text');
            if (toggleText) {
                const isOn = this.visualizer.kaleidoscopeApplyToViz;
                toggleText.textContent = isOn ? 'ON' : 'OFF';
                mixerKaleidoscopeVizToggle.classList.toggle('active', isOn);
            }
        }
    }

    updateMixerKaleidoscopeInfiniteZoomToggle() {
        const mixerKaleidoscopeInfiniteZoomToggle = document.getElementById('mixerKaleidoscopeInfiniteZoomToggle');
        if (mixerKaleidoscopeInfiniteZoomToggle && this.visualizer) {
            const toggleText = mixerKaleidoscopeInfiniteZoomToggle.querySelector('.toggle-text');
            if (toggleText) {
                const isOn = this.visualizer.kaleidoscopeApplyToInfiniteZoom;
                toggleText.textContent = isOn ? 'ON' : 'OFF';
                mixerKaleidoscopeInfiniteZoomToggle.classList.toggle('active', isOn);
            }
        }
    }

    updateMixerKaleidoscopeWebGLToggle() {
        const mixerKaleidoscopeWebGLToggle = document.getElementById('mixerKaleidoscopeWebGLToggle');
        if (mixerKaleidoscopeWebGLToggle && this.visualizer) {
            const toggleText = mixerKaleidoscopeWebGLToggle.querySelector('.toggle-text');
            if (toggleText) {
                const isOn = this.visualizer.kaleidoscopeApplyToWebGL;
                toggleText.textContent = isOn ? 'ON' : 'OFF';
                mixerKaleidoscopeWebGLToggle.classList.toggle('active', isOn);
            }
        }
    }

    updateMixerKaleidoscopeFluidToggle() {
        const mixerKaleidoscopeFluidToggle = document.getElementById('mixerKaleidoscopeFluidToggle');
        if (mixerKaleidoscopeFluidToggle && this.visualizer) {
            const toggleText = mixerKaleidoscopeFluidToggle.querySelector('.toggle-text');
            if (toggleText) {
                const isOn = this.visualizer.kaleidoscopeApplyToFluidDynamics;
                toggleText.textContent = isOn ? 'ON' : 'OFF';
                mixerKaleidoscopeFluidToggle.classList.toggle('active', isOn);
            }
        }
    }

    updateMixerKaleidoscopeNebulaToggle() {
        const mixerKaleidoscopeNebulaToggle = document.getElementById('mixerKaleidoscopeNebulaToggle');
        if (mixerKaleidoscopeNebulaToggle && this.visualizer) {
            const toggleText = mixerKaleidoscopeNebulaToggle.querySelector('.toggle-text');
            if (toggleText) {
                const isOn = this.visualizer.kaleidoscopeApplyToNebula;
                toggleText.textContent = isOn ? 'ON' : 'OFF';
                mixerKaleidoscopeNebulaToggle.classList.toggle('active', isOn);
            }
        }
    }

    // ========================================
    // NEBULA MIXER METHODS
    // ========================================

    updateMixerNebulaToggle() {
        const mixerNebulaToggle = document.getElementById('mixerNebulaToggle');
        if (mixerNebulaToggle && this.visualizer) {
            const isActive = this.visualizer.nebulaEnabled;
            const toggleText = mixerNebulaToggle.querySelector('.toggle-text');
            
            if (isActive) {
                mixerNebulaToggle.classList.add('active');
                if (toggleText) toggleText.textContent = 'ON';
            } else {
                mixerNebulaToggle.classList.remove('active');
                if (toggleText) toggleText.textContent = 'OFF';
            }
        }
    }

    updateMixerNebulaOpacitySlider() {
        if (this.mixerNebulaOpacitySlider && this.visualizer && this.visualizer.nebulaVisualization) {
            // Get current opacity from Nebula (0.0-1.0) and convert to 0-100
            const opacityPercent = Math.round(this.visualizer.nebulaVisualization.settings.overallOpacity * 100);
            this.mixerNebulaOpacitySlider.setValue(opacityPercent);
            
            // Update value display
            const valueDisplay = document.getElementById('mixerNebulaOpacityValue');
            if (valueDisplay) {
                valueDisplay.textContent = opacityPercent;
            }
        }
    }

    updateMixerNebulaColorSchemeSelect() {
        const mixerNebulaColorSchemeSelect = document.getElementById('mixerNebulaColorSchemeSelect');
        if (mixerNebulaColorSchemeSelect && this.visualizer && this.visualizer.nebulaVisualization) {
            // Determine current color scheme based on nebula settings
            const settings = this.visualizer.nebulaVisualization.settings;
            let currentScheme = 'default';
            
            // Check if any preset colors are active
            if (settings.hueShift === 280 && settings.saturation === 200) currentScheme = 'fire';
            else if (settings.hueShift === 125 && settings.saturation === 70) currentScheme = 'ice';
            else if (settings.hueShift === 190 && settings.saturation === 200) currentScheme = 'toxic';
            else if (settings.hueShift === 320 && settings.saturation === 140) currentScheme = 'sunset';
            else if (settings.hueShift === 0 && settings.saturation === 100) currentScheme = 'default';
            
            mixerNebulaColorSchemeSelect.value = currentScheme;
        }
    }

    updateMixerNebulaPresetSelector() {
        const mixerNebulaUserPresetSelect = document.getElementById('mixerNebulaUserPresetSelect');
        if (mixerNebulaUserPresetSelect && this.visualizer && this.visualizer.nebulaVisualization) {
            // Clear existing options except the first one
            while (mixerNebulaUserPresetSelect.children.length > 1) {
                mixerNebulaUserPresetSelect.removeChild(mixerNebulaUserPresetSelect.lastChild);
            }
            
            // Load saved presets from localStorage
            const savedPresets = JSON.parse(localStorage.getItem('nebulaPresets') || '{}');
            Object.keys(savedPresets).forEach(presetName => {
                const option = document.createElement('option');
                option.value = presetName;
                option.textContent = presetName;
                mixerNebulaUserPresetSelect.appendChild(option);
            });
        }
    }

    updateMixerNebulaControlSliders() {
        if (!this.visualizer || !this.visualizer.nebulaVisualization) return;
        
        const settings = this.visualizer.nebulaVisualization.settings;
        
        // Update all control sliders and their value displays
        const controls = [
            { slider: 'mixerNebulaCameraDistanceSlider', value: 'mixerNebulaCameraDistanceValue', setting: 'cameraDistance' },
            { slider: 'mixerNebulaStarCountSlider', value: 'mixerNebulaStarCountValue', setting: 'starCount' },
            { slider: 'mixerNebulaMorphingSpeedSlider', value: 'mixerNebulaMorphingSpeedValue', setting: 'morphingSpeed' },
            { slider: 'mixerNebulaHueShiftSlider', value: 'mixerNebulaHueShiftValue', setting: 'hueShift', suffix: '°' },
            { slider: 'mixerNebulaSaturationSlider', value: 'mixerNebulaSaturationValue', setting: 'saturation', suffix: '%' },
            { slider: 'mixerNebulaBrightnessSlider', value: 'mixerNebulaBrightnessValue', setting: 'brightness', suffix: '%' },
            { slider: 'mixerNebulaFilamentDensitySlider', value: 'mixerNebulaFilamentDensityValue', setting: 'filamentDensity' },
            { slider: 'mixerNebulaParticlesPerFilamentSlider', value: 'mixerNebulaParticlesPerFilamentValue', setting: 'particlesPerFilament' },
            { slider: 'mixerNebulaParticleSizeSlider', value: 'mixerNebulaParticleSizeValue', setting: 'particleSize' },
            { slider: 'mixerNebulaExpansionSlider', value: 'mixerNebulaExpansionValue', setting: 'expansion' },
            { slider: 'mixerNebulaChaosSlider', value: 'mixerNebulaChaosValue', setting: 'chaos' },
            { slider: 'mixerNebulaAsymmetrySlider', value: 'mixerNebulaAsymmetryValue', setting: 'asymmetry' },
            { slider: 'mixerNebulaPulsarSizeSlider', value: 'mixerNebulaPulsarSizeValue', setting: 'pulsarSize' },
            { slider: 'mixerNebulaPulseRateSlider', value: 'mixerNebulaPulseRateValue', setting: 'pulseRate' },
            { slider: 'mixerNebulaAudioSensitivitySlider', value: 'mixerNebulaAudioSensitivityValue', setting: 'audioSensitivity' },
            { slider: 'mixerNebulaOrbitSpeedSlider', value: 'mixerNebulaOrbitSpeedValue', setting: 'orbitSpeed' },
            { slider: 'mixerNebulaFlySpeedSlider', value: 'mixerNebulaFlySpeedValue', setting: 'flySpeed' }
        ];
        
        controls.forEach(control => {
            const sliderEl = document.getElementById(control.slider);
            const valueEl = document.getElementById(control.value);
            
            if (sliderEl && valueEl && settings[control.setting] !== undefined) {
                sliderEl.value = settings[control.setting];
                const displayValue = control.suffix ? settings[control.setting] + control.suffix : settings[control.setting];
                valueEl.textContent = displayValue;
            }
        });
        
        // Update toggle buttons
        const toggles = [
            { button: 'mixerNebulaBloomToggle', setting: 'bloom' },
            { button: 'mixerNebulaKnockoutBackgroundToggle', setting: 'knockoutBackground' },
            { button: 'mixerNebulaMorphingModeToggle', setting: 'morphingMode' },
            { button: 'mixerNebulaShowPulsarToggle', setting: 'showPulsar' },
            { button: 'mixerNebulaAudioReactiveToggle', setting: 'audioReactive' },
            { button: 'mixerNebulaColorReactiveToggle', setting: 'color' },
            { button: 'mixerNebulaRotationReactiveToggle', setting: 'rotation' },
            { button: 'mixerNebulaPulsarReactiveToggle', setting: 'pulsar' },
            { button: 'mixerNebulaCameraOrbitToggle', setting: 'cameraOrbit' },
            { button: 'mixerNebulaFlyThroughToggle', setting: 'flyThrough' }
        ];
        
        toggles.forEach(toggle => {
            const buttonEl = document.getElementById(toggle.button);
            if (buttonEl) {
                const isActive = settings[toggle.setting] || (toggle.setting === 'color' && settings.audioReactivePresets?.color) || 
                                (toggle.setting === 'rotation' && settings.audioReactivePresets?.rotation) || 
                                (toggle.setting === 'pulsar' && settings.audioReactivePresets?.pulsar);
                const toggleText = buttonEl.querySelector('.toggle-text');
                
                if (isActive) {
                    buttonEl.classList.add('active');
                    if (toggleText) toggleText.textContent = 'ON';
                } else {
                    buttonEl.classList.remove('active');
                    if (toggleText) toggleText.textContent = 'OFF';
                }
            }
        });
    }

    updateHeaderVideoFileButtons() {
        
        const headerLoopBtn = document.getElementById('headerVideoFileLoopBtn');
        const headerMuteBtn = document.getElementById('headerVideoFileMuteBtn');
        
        if (headerLoopBtn && headerMuteBtn && this.visualizer) {
            // Update loop button
            const loopMode = this.visualizer.videoFileLoopMode;
            const modeLabels = { 'off': 'Loop:OFF', 'one': 'Loop:1', 'all': 'Loop:ALL' };
            headerLoopBtn.textContent = modeLabels[loopMode] || 'Loop:1';
            headerLoopBtn.classList.toggle('active', loopMode !== 'off');
            
            // Update mute button
            const muted = this.visualizer.videoFileMuted;
            headerMuteBtn.textContent = muted ? 'Muted' : 'Sound';
            headerMuteBtn.classList.toggle('active', muted);
            
        } else {
        }
    }

    updateBackgroundImageUI() {
        const backgroundImgBtn = document.getElementById('backgroundImgBtn');
        const backgroundFileInfo = document.getElementById('backgroundFileInfo');
        const backgroundFileName = document.getElementById('backgroundFileName');
        const backgroundFileSize = document.getElementById('backgroundFileSize');
        const backgroundImagePreview = document.getElementById('backgroundImagePreview');

        // Update toggle button
        this.updateBackgroundToggleButton();

        // Update sliders
        const opacitySlider = document.getElementById('backgroundOpacitySlider');
        const opacityValue = document.getElementById('backgroundOpacityValue');
        const saturationSlider = document.getElementById('backgroundSaturationSlider');
        const saturationValue = document.getElementById('backgroundSaturationValue');
        const posterizeSlider = document.getElementById('backgroundPosterizeSlider');
        const posterizeValue = document.getElementById('backgroundPosterizeValue');
        const contrastSlider = document.getElementById('backgroundContrastSlider');
        const contrastValue = document.getElementById('backgroundContrastValue');

        if (this.visualizer) {
            if (opacitySlider && opacityValue) {
                opacitySlider.value = this.visualizer.backgroundImageOpacity;
                opacityValue.textContent = `${this.visualizer.backgroundImageOpacity}%`;
            }
            if (saturationSlider && saturationValue) {
                saturationSlider.value = this.visualizer.backgroundImageSaturation;
                saturationValue.textContent = `${this.visualizer.backgroundImageSaturation}%`;
            }
            if (posterizeSlider && posterizeValue) {
                posterizeSlider.value = this.visualizer.backgroundImagePosterize;
                posterizeValue.textContent = this.visualizer.backgroundImagePosterize;
            }
            if (contrastSlider && contrastValue) {
                contrastSlider.value = this.visualizer.backgroundImageContrast;
                contrastValue.textContent = `${this.visualizer.backgroundImageContrast}%`;
            }

            // Update size buttons
            const sizeButtons = document.querySelectorAll('.size-btn[data-size]');
            sizeButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-size') === this.visualizer.backgroundImageSize) {
                    btn.classList.add('active');
                }
            });
        }

        if (backgroundFileInfo && backgroundFileName && backgroundFileSize && backgroundImagePreview) {
            if (this.visualizer && this.visualizer.backgroundImage) {
                backgroundFileInfo.style.display = 'block';
                
                // Display filename and file size
                const filename = this.visualizer.backgroundImageFileName || 'Background Image';
                const fileSize = this.visualizer.backgroundImageFileSize || 0;
                const fileSizeText = fileSize > 0 ? this.formatFileSize(fileSize) : '';
                
                backgroundFileName.textContent = filename;
                backgroundFileSize.textContent = fileSizeText;
                
                // Create preview image
                const img = new Image();
                img.onload = () => {
                    backgroundImagePreview.innerHTML = '';
                    backgroundImagePreview.appendChild(img);
                };
                img.src = this.visualizer.backgroundImage;
            } else {
                backgroundFileInfo.style.display = 'none';
            }
        }
    }

    // Unified method to update background opacity across all visualization systems
    updateBackgroundOpacity(value) {
        const opacityValue = value / 100; // Convert 0-100 to 0.0-1.0
        
        
        // Update custom AudioMotion (regular visualizations)
        if (this.audioMotion) {
            this.audioMotion.bgAlpha = opacityValue;
            this.audioMotion.showBgColor = value > 0;
        }
        
        // Update official AudioMotion (Pro visualizations) if active
        if (this.officialAudioMotion && this.useOfficialAudioMotion) {
            this.officialAudioMotion.bgAlpha = opacityValue;
            this.officialAudioMotion.showBgColor = value > 0;
        }
        
        // Future visualization systems can be added here
        // Example: if (this.futureVisualization) { this.futureVisualization.setBackgroundOpacity(opacityValue); }
        
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    updateUI() {
        // Footer recording info only (sidebar recording info removed)
        // The footer updateFooterRecordingInfo() method handles all recording info display
    }
    
    getRecordingDimensions() {
        let targetWidth, targetHeight;
        
        // Get resolution from current recording settings
        const settings = this.getRecordingSettings();
        const resolution = settings.resolution;
        
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
                // Fallback to 1080p
                targetWidth = 1920;
                targetHeight = 1080;
            }
        }
        
        
        // Determine target aspect ratio
        let targetAspect;
        
        // Debug aspect ratio calculation
        if (this.visualizer?.videoElement) {
        }
        
        // Always use window/canvas dimensions for recording - don't force video aspect ratio
        // This ensures recording captures whatever is visible in the window
        const canvas = this.visualizer.audioMotion?.canvas;
        if (canvas) {
            targetAspect = canvas.width / canvas.height;
        } else {
            // Fallback to manual aspect ratio setting
        const [ratioW, ratioH] = this.aspectRatio.split(':').map(Number);
            targetAspect = ratioW / ratioH;
        }
        
        const currentAspect = targetWidth / targetHeight;
        
        
        if (currentAspect > targetAspect) {
            // Too wide, adjust width
            targetWidth = Math.round(targetHeight * targetAspect);
        } else if (currentAspect < targetAspect) {
            // Too tall, adjust height
            targetHeight = Math.round(targetWidth / targetAspect);
        } else {
        }
        
        return { width: targetWidth, height: targetHeight };
    }
    
    estimateFileSize() {
        const dimensions = this.getRecordingDimensions();
        const settings = this.getRecordingSettings();
        const videoBitrate = settings.videoBitrate;
        const audioBitrate = settings.audioBitrate;
        
        // Calculate total bitrate and convert to MB per minute
        const totalBitrate = videoBitrate + audioBitrate;
        const mbPerSecond = totalBitrate / 8 / 1024 / 1024; // Convert bits to MB
        const mbPerMinute = Math.round(mbPerSecond * 60);
        
        return mbPerMinute;
    }
    
    async chooseFileLocation() {
        try {
            if ('showDirectoryPicker' in window) {
                const directoryHandle = await window.showDirectoryPicker();
                this.saveLocation = directoryHandle.name;
                this.directoryHandle = directoryHandle;
                this.updateUI();
                this.saveSettings();
            } else {
                alert('File picker not supported in this browser. Files will be saved to Downloads folder.');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error choosing location:', err);
            }
        }
    }
    
    async startRecording() {
        if (this.isRecording) return;
        
        try {
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.recordedChunks = [];
            
            // Update UI - both sidebar and footer buttons
            const recordBtns = document.querySelectorAll('#recordBtn');
            recordBtns.forEach(recordBtn => {
            const recordText = recordBtn.querySelector('.record-text');
            const recordTimer = recordBtn.querySelector('.record-timer');
            
            recordBtn.classList.add('recording');
            recordText.style.display = 'none';
            recordTimer.style.display = 'inline';
            });
            
            // Start timer
            this.updateTimer();
            this.timerInterval = setInterval(() => this.updateTimer(), 100);
            
            // Create composite canvas
            await this.setupCompositeCanvas();
            
            // Setup crop canvas if needed
            this.setupCropCanvas();
            
            // Enable master control for recording (auto-enable)
            if (window.recordingMasterWrapper) {
                window.recordingMasterWrapper.enableMasterControl();
            }
            
            // Start compositing to ensure first frame is ready
            this.startCompositing();
            
            // Wait a moment for the first frame to be drawn (ensures Nebula and other visualizations are ready)
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Get video stream from appropriate canvas
            const sourceCanvas = this.shouldCrop ? this.cropCanvas : this.compositeCanvas;
            const videoStream = sourceCanvas.captureStream(this.frameRate);
            
            
            // Get audio stream
            const audioStream = await this.getAudioStream();
            
            // Combine streams
            const combinedStream = new MediaStream();
            videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
            if (audioStream) {
                audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
            }
            
            // Professional codec selection for Adobe compatibility
            const recordingSettings = this.getRecordingSettings();
            const codecInfo = this.selectOptimalCodec();
            const canvasRect = this.compositeCanvas.getBoundingClientRect();
            const videoBitrate = recordingSettings.videoBitrate;
            const audioBitrate = recordingSettings.audioBitrate;
            
            
            // Create MediaRecorder with professional settings
            const mediaRecorderOptions = {
                mimeType: codecInfo.mimeType,
                videoBitsPerSecond: videoBitrate,
                audioBitsPerSecond: audioBitrate
            };
            
            // Add keyframe interval for better scrubbing (every 2 seconds)
            if (this.frameRate) {
                mediaRecorderOptions.videoKeyFrameIntervalDuration = 2000; // 2 seconds
            }
            
            this.mediaRecorder = new MediaRecorder(combinedStream, mediaRecorderOptions);
            
            // Store the actual format being used for saving (always MP4)
            this.actualRecordFormat = 'mp4';
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };
            
            this.mediaRecorder.start(1000); // Record in 1 second chunks
            
            
        } catch (err) {
            alert('Failed to start recording: ' + err.message);
            this.stopRecording();
        }
    }
    
    async setupCompositeCanvas() {
        const dimensions = this.getRecordingDimensions();
        
        this.compositeCanvas = document.createElement('canvas');
        this.compositeCanvas.width = dimensions.width;
        this.compositeCanvas.height = dimensions.height;
        this.compositeCtx = this.compositeCanvas.getContext('2d');
        
    }
    
    setupCropCanvas() {
        // Always calculate cropArea when aspectRatio is not 'window'
        // showRecordingArea only controls overlay visibility, not cropping
        if (this.aspectRatio !== 'window') {
            const dimensions = this.calculateRecordingAreaDimensions();
            if (dimensions) {
                // Use overlay position if it exists and is positioned, otherwise use calculated position
                if (this.recordingAreaOverlay && this.recordingAreaOverlay.style.display !== 'none') {
                    // Overlay exists and is visible - use its current position
                    const overlayRect = this.recordingAreaOverlay.getBoundingClientRect();
                    const canvas = this.visualizer.audioMotion?.canvas;
                    if (canvas) {
                        const canvasRect = canvas.getBoundingClientRect();
                        // Convert overlay screen position to canvas-relative position
                        this.cropArea = {
                            x: overlayRect.left - canvasRect.left,
                            y: overlayRect.top - canvasRect.top,
                            width: dimensions.width,
                            height: dimensions.height
                        };
                    } else {
                        // Fallback to calculated position
                        this.cropArea = {
                            x: dimensions.x,
                            y: dimensions.y,
                            width: dimensions.width,
                            height: dimensions.height
                        };
                    }
                } else if (this.cropArea.width > 0 && this.cropArea.height > 0) {
                    // Overlay hidden but cropArea already set (from previous positioning) - keep existing position
                    // Just update width/height in case aspect ratio changed
                    this.cropArea.width = dimensions.width;
                    this.cropArea.height = dimensions.height;
                } else {
                    // No overlay or no previous position - use calculated (centered) position
                    this.cropArea = {
                        x: dimensions.x,
                        y: dimensions.y,
                        width: dimensions.width,
                        height: dimensions.height
                    };
                }
            }
        }
        
        // shouldCrop is based on aspectRatio, not showRecordingArea
        this.shouldCrop = this.aspectRatio !== 'window' && 
                         this.cropArea.width > 0 && 
                         this.cropArea.height > 0;
        
        if (!this.shouldCrop) {
            return;
        }
        
        // Calculate crop canvas size based on recording resolution and selected aspect ratio
        // The crop canvas should maintain the selected aspect ratio at the recording resolution
        const recordingDims = this.getRecordingDimensions();
        
        // Get aspect ratio from selection (not from screen pixel dimensions)
        let targetAspect;
        switch (this.aspectRatio) {
            case '16:9': targetAspect = 16/9; break;
            case '9:16': targetAspect = 9/16; break;
            case '1:1': targetAspect = 1; break;
            case '4:3': targetAspect = 4/3; break;
            default: targetAspect = this.cropArea.width / this.cropArea.height; // Fallback
        }
        
        // Size crop canvas to maintain aspect ratio within recording resolution
        let cropCanvasWidth, cropCanvasHeight;
        if (recordingDims.width / recordingDims.height > targetAspect) {
            // Recording is wider than crop aspect ratio - fit to height
            cropCanvasHeight = recordingDims.height;
            cropCanvasWidth = cropCanvasHeight * targetAspect;
        } else {
            // Recording is taller than crop aspect ratio - fit to width
            cropCanvasWidth = recordingDims.width;
            cropCanvasHeight = cropCanvasWidth / targetAspect;
        }
        
        // Create crop canvas with calculated dimensions
        this.cropCanvas = document.createElement('canvas');
        this.cropCanvas.width = Math.round(cropCanvasWidth);
        this.cropCanvas.height = Math.round(cropCanvasHeight);
        this.cropCtx = this.cropCanvas.getContext('2d');
    }
    
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
    
    compositeFrame() {
        if (!this.compositeCtx) return;
        
        const { width, height } = this.compositeCanvas;
        
        // Apply quality-based canvas smoothing for optimal rendering
        const settings = this.getRecordingSettings();
        const is4K = settings.resolution === '4k';
        
        if (is4K) {
            // High-quality Lanczos upscaling for 4K recordings
            this.compositeCtx.imageSmoothingEnabled = true;
            this.compositeCtx.imageSmoothingQuality = 'high';
        } else {
            // Pixel-perfect rendering for 1080p (no interpolation)
            this.compositeCtx.imageSmoothingEnabled = false;
        }
        
        // Clear canvas with black background
        this.compositeCtx.fillStyle = '#000000';
        this.compositeCtx.fillRect(0, 0, width, height);
        
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
        if (kaleidoscopeActive) {
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
        
        // Update crop canvas if cropping is enabled
        this.updateCropCanvas();
    }
    
    updateCropCanvas() {
        if (!this.shouldCrop || !this.cropCanvas || !this.compositeCanvas) {
            return;
        }
        
        // Clear crop canvas
        this.cropCtx.fillStyle = '#000000';
        this.cropCtx.fillRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        
        // Convert screen coordinates to composite canvas pixel coordinates
        const canvas = this.visualizer.audioMotion?.canvas;
        if (!canvas) {
            return;
        }
        
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = this.compositeCanvas.width / canvasRect.width;
        const scaleY = this.compositeCanvas.height / canvasRect.height;
        
        // Convert crop area position from screen coordinates to composite canvas coordinates
        const cropX = this.cropArea.x * scaleX;
        const cropY = this.cropArea.y * scaleY;
        
        // Calculate crop region size in composite canvas coordinates
        // Use the aspect ratio to determine the crop region size, not screen pixel dimensions
        let targetAspect;
        switch (this.aspectRatio) {
            case '16:9': targetAspect = 16/9; break;
            case '9:16': targetAspect = 9/16; break;
            case '1:1': targetAspect = 1; break;
            case '4:3': targetAspect = 4/3; break;
            default: targetAspect = this.cropArea.width / this.cropArea.height; // Fallback
        }
        
        // Calculate crop region size in composite canvas coordinates
        // Fit to height (same as calculateRecordingAreaDimensions logic)
        const cropHeight = this.compositeCanvas.height;
        const cropWidth = cropHeight * targetAspect;
        
        // Ensure crop region doesn't exceed composite canvas bounds
        const finalCropX = Math.max(0, Math.min(cropX, this.compositeCanvas.width - cropWidth));
        const finalCropY = Math.max(0, Math.min(cropY, this.compositeCanvas.height - cropHeight));
        const finalCropWidth = Math.min(cropWidth, this.compositeCanvas.width - finalCropX);
        const finalCropHeight = Math.min(cropHeight, this.compositeCanvas.height - finalCropY);
        
        // Copy cropped region from composite canvas to crop canvas
        this.cropCtx.drawImage(
            this.compositeCanvas,
            finalCropX, finalCropY, finalCropWidth, finalCropHeight, // Source region in composite canvas
            0, 0, this.cropCanvas.width, this.cropCanvas.height // Destination (crop canvas)
        );
    }
    
    drawScaledVideo() {
        const video = this.visualizer.videoElement;
        const { width, height } = this.compositeCanvas;
        
        if (!video || video.readyState < 2) return;
        
        // Create temporary canvas for video effects processing
        if (!this.tempVideoCanvas) {
            this.tempVideoCanvas = document.createElement('canvas');
            this.tempVideoCtx = this.tempVideoCanvas.getContext('2d');
        }
        
        // Set temp canvas size to match composite canvas
        this.tempVideoCanvas.width = width;
        this.tempVideoCanvas.height = height;
        
        // Calculate scaling to fit with letterboxing
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = width / height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (videoAspect > canvasAspect) {
            // Video is wider, fit to width
            drawWidth = width;
            drawHeight = width / videoAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
        } else {
            // Video is taller, fit to height
            drawHeight = height;
            drawWidth = height * videoAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
        }
        
        // Apply video effects to temp canvas context
        this.tempVideoCtx.save();
        
        // Build filter string like the StreamManager does
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
        
        // Apply filters to temp canvas
        this.tempVideoCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
        this.tempVideoCtx.globalAlpha = 1;
        
        // Clear temp canvas
        this.tempVideoCtx.clearRect(0, 0, width, height);
        
        // Draw video to temp canvas with effects (fill entire canvas like Live Display)
        this.tempVideoCtx.drawImage(video, 0, 0, this.tempVideoCanvas.width, this.tempVideoCanvas.height);
        
        this.tempVideoCtx.restore();
        
        // Calculate pulse scale if enabled
        let scale = 1;
        if (this.visualizer.videoPulse) {
            const pulseDuration = this.visualizer.videoPulseRate * 1000; // Convert to ms
            const pulsePhase = (Date.now() % pulseDuration) / pulseDuration;
            scale = 1 + (Math.sin(pulsePhase * Math.PI * 2) * 0.02); // 2% scale variation
        }
        
        // Apply mirror transformations if enabled
        this.compositeCtx.save();
        
        // Apply pulse scaling
        if (scale !== 1) {
            this.compositeCtx.translate(width / 2, height / 2);
            this.compositeCtx.scale(scale, scale);
            this.compositeCtx.translate(-width / 2, -height / 2);
        }
        
        // Draw processed video from temp canvas to composite canvas
        this.compositeCtx.drawImage(this.tempVideoCanvas, 0, 0);
        
        this.compositeCtx.restore();
        
        // Apply vignette effect if enabled
        if (this.visualizer.videoVignette > 0) {
            this.compositeCtx.save();
            const intensity = this.visualizer.videoVignette / 100;
            const size = (100 - this.visualizer.videoVignette) / 100;
            
            const gradient = this.compositeCtx.createRadialGradient(
                width / 2, height / 2, Math.min(width, height) * size * 0.5,
                width / 2, height / 2, Math.max(width, height) * 0.7
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
            
            this.compositeCtx.fillStyle = gradient;
            this.compositeCtx.fillRect(0, 0, width, height);
            this.compositeCtx.restore();
        }
    }
    
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
    
    drawVideoWithEffects(drawX, drawY, drawWidth, drawHeight) {
        const video = this.visualizer.videoElement;
        const { width, height } = this.compositeCanvas;
        
        if (!video || video.readyState < 2) return;
        
        // Create temporary canvas for video effects processing
        if (!this.tempVideoCanvas) {
            this.tempVideoCanvas = document.createElement('canvas');
            this.tempVideoCtx = this.tempVideoCanvas.getContext('2d');
        }
        
        // Set temp canvas size to match composite canvas
        this.tempVideoCanvas.width = width;
        this.tempVideoCanvas.height = height;
        
        // Apply video effects to temp canvas context
        this.tempVideoCtx.save();
        
        // Build filter string like the StreamManager does
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
        
        // Apply filters to temp canvas
        this.tempVideoCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
        this.tempVideoCtx.globalAlpha = 1;
        
        // Clear temp canvas
        this.tempVideoCtx.clearRect(0, 0, width, height);
        
        // Draw video to temp canvas with effects (fill entire canvas like Live Display)
        this.tempVideoCtx.drawImage(video, 0, 0, this.tempVideoCanvas.width, this.tempVideoCanvas.height);
        
        this.tempVideoCtx.restore();
        
        // Calculate pulse scale if enabled
        let scale = 1;
        if (this.visualizer.videoPulse) {
            const pulseDuration = this.visualizer.videoPulseRate * 1000;
            const pulsePhase = (Date.now() % pulseDuration) / pulseDuration;
            scale = 1 + (Math.sin(pulsePhase * Math.PI * 2) * 0.02);
        }
        
        // Apply mirror transformations if enabled
        this.compositeCtx.save();
        
        // Apply pulse scaling
        if (scale !== 1) {
            this.compositeCtx.translate(width / 2, height / 2);
            this.compositeCtx.scale(scale, scale);
            this.compositeCtx.translate(-width / 2, -height / 2);
        }
        
        // Draw processed video from temp canvas to composite canvas
        this.compositeCtx.drawImage(this.tempVideoCanvas, 0, 0);
        
        this.compositeCtx.restore();
        
        // Apply vignette effect if enabled
        if (this.visualizer.videoVignette > 0) {
            this.compositeCtx.save();
            const intensity = this.visualizer.videoVignette / 100;
            const size = (100 - this.visualizer.videoVignette) / 100;
            
            const gradient = this.compositeCtx.createRadialGradient(
                width / 2, height / 2, Math.min(width, height) * size * 0.5,
                width / 2, height / 2, Math.max(width, height) * 0.7
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
            
            this.compositeCtx.fillStyle = gradient;
            this.compositeCtx.fillRect(0, 0, width, height);
            this.compositeCtx.restore();
        }
    }
    
    drawScaledCanvas(canvas) {
        const { width, height } = this.compositeCanvas;
        
        if (!canvas || canvas.width === 0 || canvas.height === 0) return;
        
        // For kaleidoscope canvases, use full dimensions (they're already sized to match the container)
        if (canvas === this.visualizer.kaleidoscopeVideoCanvas || canvas === this.visualizer.kaleidoscopeVizCanvas) {
            console.log('Drawing kaleidoscope canvas at full size');
            this.compositeCtx.drawImage(canvas, 0, 0, width, height);
            return;
        }
        
        // For other canvases, calculate scaling to fit with letterboxing
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
    
    drawScaledVisualization(sourceCanvas) {
        const { width, height } = this.compositeCanvas;
        
        // Use standard letterboxing for visualization
        const sourceAspect = sourceCanvas.width / sourceCanvas.height;
        const canvasAspect = width / height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (sourceAspect > canvasAspect) {
            // Source is wider, fit to width
            drawWidth = width;
            drawHeight = width / sourceAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
        } else {
            // Source is taller, fit to height
            drawHeight = height;
            drawWidth = height * sourceAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
        }
        
        this.compositeCtx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);
    }
    
    async getAudioStream() {
        try {
            // Check if using live audio input
            if (this.visualizer.audioStream) {
                console.log('Using live audio input for recording');
                return this.visualizer.audioStream.clone();
            }
            
            // Get audio from AudioMotion's audio context
            const audioMotion = this.visualizer.audioMotion;
            if (!audioMotion || !audioMotion.audioCtx) {
                console.warn('No AudioMotion context available');
                return null;
            }
            
            // SAFE FIX: Ensure audio is connected to AudioMotion before recording
            if (this.visualizer.audio && this.visualizer.audio.src) {
                try {
                    // Check if audio is already connected by looking for existing source
                    const hasExistingConnection = audioMotion._sources && 
                        audioMotion._sources.some(source => 
                            source.mediaElement === this.visualizer.audio
                        );
                    
                    if (!hasExistingConnection && !audioMotion.isConnected) {
                        audioMotion.connectInput(this.visualizer.audio);
                        audioMotion.isConnected = true;
                        // Give it a moment to establish the connection
                        await new Promise(resolve => setTimeout(resolve, 50));
                    } else {
                    }
                } catch (e) {
                }
            }
            
            const audioCtx = audioMotion.audioCtx;
            
            // Reuse existing destination if recording is active, otherwise create new
            if (!this.audioDestination || !this.isRecording) {
                this.audioDestination = audioCtx.createMediaStreamDestination();
                this.audioGainNode = audioCtx.createGain();
                this.audioGainNode.gain.value = 1.0;
                this.audioGainNode.connect(this.audioDestination);
                this.audioSourceConnections = []; // Reset connections
            }
            
            // Reconnect audio sources if they've changed (e.g., after visualization mode switch)
            // Disconnect old connections first
            this.audioSourceConnections.forEach(connection => {
                try {
                    connection.disconnect(this.audioGainNode);
                } catch (e) {
                    // Ignore disconnect errors
                }
            });
            this.audioSourceConnections = [];
            
            // Connect all available audio sources to capture everything
            let hasAudioSource = false;
            
            // Connect playlist/live audio if available
            if (audioMotion.source) {
                try {
                    audioMotion.source.connect(this.audioGainNode);
                    this.audioSourceConnections.push(audioMotion.source);
                    hasAudioSource = true;
                } catch (e) {
                    console.error('Error connecting AudioMotion source:', e);
                }
            }
            
            // Also connect video audio if available (can be simultaneous with playlist)
            if (this.visualizer.videoAudioGain) {
                try {
                    this.visualizer.videoAudioGain.connect(this.audioGainNode);
                    this.audioSourceConnections.push(this.visualizer.videoAudioGain);
                    hasAudioSource = true;
                } catch (e) {
                    console.error('Error connecting video audio:', e);
                }
            }
            
            if (hasAudioSource) {
                return this.audioDestination.stream;
            }
            
            // Fallback: try to capture from the current audio element directly
            if (this.visualizer.audio && this.visualizer.audio.src) {
                try {
                    // Try to get or create an audio source node
                    let source = this.visualizer.audio._audioSourceNode;
                    if (!source) {
                        source = audioCtx.createMediaElementSource(this.visualizer.audio);
                        this.visualizer.audio._audioSourceNode = source;
                    }
                    
                    source.connect(this.audioGainNode);
                    this.audioSourceConnections.push(source);
                    hasAudioSource = true;
                    return this.audioDestination.stream;
                } catch (e) {
                }
            }
            
            // Final fallback: create a silent audio track to prevent recording errors
            if (!hasAudioSource) {
                try {
                    // Create a silent audio source
                    const oscillator = audioCtx.createOscillator();
                    const silentGain = audioCtx.createGain();
                    silentGain.gain.value = 0; // Silent
                    
                    oscillator.connect(silentGain);
                    silentGain.connect(this.audioDestination);
                    oscillator.start();
                    
                    // Stop the oscillator after a short time to avoid continuous generation
                    setTimeout(() => {
                        try {
                            oscillator.stop();
                        } catch (e) {
                            // Ignore stop errors
                        }
                    }, 100);
                    
                    return this.audioDestination.stream;
                } catch (e) {
                }
            }
            
            return null;
            
        } catch (err) {
            return null;
        }
    }

    /**
     * Recording Area Overlay Methods
     */
    calculateRecordingAreaDimensions() {
        if (this.aspectRatio === 'window') {
            // Use current window/canvas size - no overlay needed
            return null;
        }
        
        
        // Get the main visualization canvas
        const canvas = this.visualizer.audioMotion?.canvas;
        if (!canvas) {
            return null;
        }
        
        const canvasRect = canvas.getBoundingClientRect();
        const canvasWidth = canvasRect.width;
        const canvasHeight = canvasRect.height;
        
        // Parse aspect ratio
        let targetAspect;
        switch (this.aspectRatio) {
            case '16:9': targetAspect = 16/9; break;
            case '9:16': targetAspect = 9/16; break;
            case '1:1': targetAspect = 1; break;
            case '4:3': targetAspect = 4/3; break;
            default: return null;
        }
        
        // Always fit vertically, crop horizontally as requested
        const height = canvasHeight;
        const width = height * targetAspect;
        
        // Center horizontally
        const x = (canvasWidth - width) / 2;
        const y = 0;
        
        return {
            x: Math.max(0, x),
            y: y,
            width: Math.min(width, canvasWidth),
            height: height,
            canvasRect: canvasRect
        };
    }

    updateRecordingAreaOverlay() {
        // Always calculate cropArea when aspectRatio is set (for recording)
        // showRecordingArea only controls overlay visibility
        let dimensions = null;
        if (this.aspectRatio !== 'window') {
            dimensions = this.calculateRecordingAreaDimensions();
            if (dimensions) {
                // Check if we have a previous cropArea with valid dimensions
                const hasPreviousCropArea = this.cropArea.width > 0 && this.cropArea.height > 0;
                
                if (hasPreviousCropArea) {
                    // Calculate center of previous cropArea
                    const oldCenterX = this.cropArea.x + this.cropArea.width / 2;
                    const oldCenterY = this.cropArea.y + this.cropArea.height / 2;
                    
                    // Position new cropArea so its center matches the old center
                    const newX = oldCenterX - dimensions.width / 2;
                    const newY = oldCenterY - dimensions.height / 2;
                    
                    // Constrain to canvas bounds
                    const canvas = this.visualizer.audioMotion?.canvas;
                    if (canvas) {
                        const canvasRect = canvas.getBoundingClientRect();
                        const constrainedX = Math.max(0, Math.min(newX, canvasRect.width - dimensions.width));
                        const constrainedY = Math.max(0, Math.min(newY, canvasRect.height - dimensions.height));
                        
                        this.cropArea = {
                            x: constrainedX,
                            y: constrainedY,
                            width: dimensions.width,
                            height: dimensions.height
                        };
                    } else {
                        // Fallback to calculated position if canvas not available
                        this.cropArea = {
                            x: dimensions.x,
                            y: dimensions.y,
                            width: dimensions.width,
                            height: dimensions.height
                        };
                    }
                } else {
                    // No previous position - use calculated (centered) position
                    this.cropArea = {
                        x: dimensions.x,
                        y: dimensions.y,
                        width: dimensions.width,
                        height: dimensions.height
                    };
                }
                
                // Update shouldCrop if recording is active
                if (this.isRecording) {
                    this.shouldCrop = this.cropArea.width > 0 && this.cropArea.height > 0;
                    // Recreate crop canvas if needed
                    if (this.shouldCrop && !this.cropCanvas) {
                        this.setupCropCanvas();
                    }
                }
            }
        }
        
        // Only show/hide overlay based on showRecordingArea
        if (!this.showRecordingArea || this.aspectRatio === 'window') {
            this.hideRecordingAreaOverlay();
            return; // Overlay hidden, but cropArea is still set above
        }
        
        // Show overlay (cropArea is already calculated above)
        if (!dimensions) {
            dimensions = this.calculateRecordingAreaDimensions();
            if (!dimensions) {
                this.hideRecordingAreaOverlay();
                return;
            }
        }
        
        // Create overlay if it doesn't exist
        if (!this.recordingAreaOverlay) {
            this.recordingAreaOverlay = document.createElement('div');
            this.recordingAreaOverlay.className = 'recording-area-overlay';
            this.recordingAreaOverlay.innerHTML = '<div class="dimensions-text"></div>';
            document.body.appendChild(this.recordingAreaOverlay);
            
            // Add drag functionality
            this.addDragFunctionality();
        }
        
        // Position overlay (use existing cropArea position if overlay was previously positioned)
        const overlay = this.recordingAreaOverlay;
        const canvas = this.visualizer.audioMotion?.canvas;
        if (canvas) {
            const canvasRect = canvas.getBoundingClientRect();
            overlay.style.left = (canvasRect.left + this.cropArea.x) + 'px';
            overlay.style.top = (canvasRect.top + this.cropArea.y) + 'px';
        } else {
            overlay.style.left = (dimensions.canvasRect.left + dimensions.x) + 'px';
            overlay.style.top = (dimensions.canvasRect.top + dimensions.y) + 'px';
        }
        overlay.style.width = this.cropArea.width + 'px';
        overlay.style.height = this.cropArea.height + 'px';
        overlay.style.display = 'block';
        
        // Update dimensions text
        const dimensionsText = overlay.querySelector('.dimensions-text');
        if (dimensionsText) {
            dimensionsText.textContent = `${Math.round(this.cropArea.width)}×${Math.round(this.cropArea.height)}`;
        }
    }

    toggleRecordingAreaOverlay(show) {
        this.showRecordingArea = show;
        // Always update to calculate cropArea (even when hiding overlay)
        // This ensures cropArea is set for recording even when overlay is hidden
        this.updateRecordingAreaOverlay();
    }

    hideRecordingAreaOverlay() {
        if (this.recordingAreaOverlay) {
            this.recordingAreaOverlay.style.display = 'none';
        }
    }

    forceHideRecordingAreaOverlay() {
        // Force remove any existing overlay
        const existingOverlay = document.querySelector('.recording-area-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        this.recordingAreaOverlay = null;
    }

    centerRecordingArea() {
        // Force recalculation of centered position (ignore existing position)
        if (this.aspectRatio !== 'window') {
            const dimensions = this.calculateRecordingAreaDimensions();
            if (dimensions) {
                // Force centered position (ignore any existing cropArea position)
                this.cropArea = {
                    x: dimensions.x,
                    y: dimensions.y,
                    width: dimensions.width,
                    height: dimensions.height
                };
                
                // Update crop canvas if recording is active
                if (this.isRecording && this.shouldCrop && !this.cropCanvas) {
                    this.setupCropCanvas();
                }
            }
        }
        
        // Update overlay to show centered position
        this.updateRecordingAreaOverlay();
    }

    addDragFunctionality() {
        if (!this.recordingAreaOverlay) return;
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        this.recordingAreaOverlay.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(this.recordingAreaOverlay.style.left);
            startTop = parseInt(this.recordingAreaOverlay.style.top);
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // Get canvas bounds for constraint
            const canvas = this.visualizer.audioMotion?.canvas;
            if (!canvas) return;
            
            const canvasRect = canvas.getBoundingClientRect();
            const overlayWidth = parseInt(this.recordingAreaOverlay.style.width);
            const overlayHeight = parseInt(this.recordingAreaOverlay.style.height);
            
            // Constrain to canvas bounds
            const constrainedLeft = Math.max(canvasRect.left, 
                Math.min(newLeft, canvasRect.right - overlayWidth));
            const constrainedTop = Math.max(canvasRect.top, 
                Math.min(newTop, canvasRect.bottom - overlayHeight));
            
            this.recordingAreaOverlay.style.left = constrainedLeft + 'px';
            this.recordingAreaOverlay.style.top = constrainedTop + 'px';
            
            // Update crop area
            this.cropArea.x = constrainedLeft - canvasRect.left;
            this.cropArea.y = constrainedTop - canvasRect.top;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    updateTimer() {
        if (!this.isRecording || !this.recordingStartTime) return;
        
        const elapsed = Date.now() - this.recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        let timeString;
        if (hours > 0) {
            timeString = `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            timeString = `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
        
        const recordTimers = document.querySelectorAll('.record-timer');
        recordTimers.forEach(recordTimer => {
            recordTimer.textContent = timeString;
        });
    }
    
    /**
     * Reconnect audio sources during recording (called when visualization mode changes)
     * This ensures audio continues to be recorded even after mode switches
     * Uses seamless reconnection to prevent audio drops
     */
    reconnectAudioDuringRecording() {
        if (!this.isRecording || !this.audioGainNode || !this.audioDestination) {
            return; // Not recording or audio nodes not set up
        }
        
        const audioMotion = this.visualizer.audioMotion;
        if (!audioMotion || !audioMotion.audioCtx) {
            return;
        }
        
        // Build list of sources that should be connected
        const desiredSources = [];
        if (audioMotion.source) {
            desiredSources.push(audioMotion.source);
        }
        if (this.visualizer.videoAudioGain) {
            desiredSources.push(this.visualizer.videoAudioGain);
        }
        
        // CRITICAL: Verify and reconnect ALL desired sources
        // Use a more aggressive approach - always try to connect, and handle errors gracefully
        desiredSources.forEach(source => {
            const isInArray = this.audioSourceConnections.includes(source);
            
            if (!isInArray) {
                // Source not in our array - definitely need to connect
                try {
                    source.connect(this.audioGainNode);
                    this.audioSourceConnections.push(source);
                } catch (e) {
                    // Connection failed - might be already connected or source is invalid
                    // Try to add anyway in case it's a new source object
                    console.warn('Failed to connect audio source for recording:', e);
                }
            } else {
                // Source is in our array, but connection might have been broken
                // Try to reconnect to ensure it's still connected
                try {
                    // Disconnect first (if connected) then reconnect
                    try {
                        source.disconnect(this.audioGainNode);
                    } catch (e) {
                        // Not connected - that's fine, we'll connect it now
                    }
                    source.connect(this.audioGainNode);
                } catch (e) {
                    // Reconnection failed - connection might still be intact
                    // This is okay, we'll try again on next reconnection
                }
            }
        });
        
        // Only disconnect sources that are no longer needed (after connecting new ones)
        const sourcesToDisconnect = this.audioSourceConnections.filter(
            connection => !desiredSources.includes(connection)
        );
        
        sourcesToDisconnect.forEach(connection => {
            try {
                connection.disconnect(this.audioGainNode);
                const index = this.audioSourceConnections.indexOf(connection);
                if (index > -1) {
                    this.audioSourceConnections.splice(index, 1);
                }
            } catch (e) {
                // Ignore disconnect errors
            }
        });
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Stop animation frame (legacy - should not be needed with master control)
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Disable master control
        if (window.recordingMasterWrapper) {
            window.recordingMasterWrapper.stopCompositing();
        }
        
        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Clean up audio recording nodes
        if (this.audioSourceConnections) {
            this.audioSourceConnections.forEach(connection => {
                try {
                    if (this.audioGainNode) {
                        connection.disconnect(this.audioGainNode);
                    }
                } catch (e) {
                    // Ignore disconnect errors
                }
            });
            this.audioSourceConnections = [];
        }
        this.audioDestination = null;
        this.audioGainNode = null;
        
        // Clean up temporary canvases
        this.tempVideoCanvas = null;
        this.tempVideoCtx = null;
        this.compositeCanvas = null;
        this.compositeCtx = null;
        this.cropCanvas = null;
        this.cropCtx = null;
        this.shouldCrop = false;
        
        // Update UI - both sidebar and footer buttons
        const recordBtns = document.querySelectorAll('#recordBtn');
        recordBtns.forEach(recordBtn => {
        const recordText = recordBtn.querySelector('.record-text');
        const recordTimer = recordBtn.querySelector('.record-timer');
        
        recordBtn.classList.remove('recording');
        recordText.style.display = 'inline';
        recordTimer.style.display = 'none';
        recordTimer.textContent = '00:00';
        });
        
    }
    
    async saveRecording() {
        
        if (this.recordedChunks.length === 0) {
            return;
        }
        
        try {
            // Determine actual format from the blob type, not just settings
            const blobType = this.recordedChunks[0]?.type || 'video/webm';
            let actualFormat = blobType.includes('mp4') ? 'mp4' : 'webm';
            
            // Use the detected format
            const format = actualFormat;
            const mimeType = blobType;
            let extension = format === 'mp4' ? '.mp4' : '.webm';
            
            
            let blob = new Blob(this.recordedChunks, { type: mimeType });
            
            const finalBlob = blob;
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `${this.customFilename}_${timestamp}${extension}`;
            
            
            if (this.directoryHandle && 'showDirectoryPicker' in window) {
                // Save to chosen directory
                try {
                    const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(finalBlob);
                    await writable.close();
                    
                    alert(`Recording saved successfully to ${this.saveLocation}/${filename}`);
                } catch (err) {
                    console.error('Error saving to chosen directory:', err);
                    this.fallbackDownload(finalBlob, filename);
                }
            } else {
                // Fallback to downloads folder
                this.fallbackDownload(finalBlob, filename);
            }
            
        } catch (err) {
            alert('Error saving recording: ' + err.message);
        }
        
        // Clear recorded chunks
        this.recordedChunks = [];
    }
    
    fallbackDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        
        // Add error handling for download
        a.addEventListener('error', (e) => {
            console.error('Download failed:', e);
            alert('Download failed. Please check your browser settings and try again.');
        });
        
        // Try to trigger download with timeout fallback
        try {
        a.click();
        } catch (e) {
            console.error('Error triggering download click:', e);
            alert('Unable to trigger download. Please check your browser settings.');
        }
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    }
}


// Backward compatibility for any code using window.RecordManager
if (typeof window !== 'undefined') {
    window.RecordManager = RecordManager;
}
