/**
 * MultiDisplayManager - Isolated system for managing multiple Live Display windows
 * Uses LiveDisplayManager for streaming (Phase 2 integration)
 */
class MultiDisplayManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.displays = new Map(); // displayId -> DisplayInstance
        this.displayManagers = new Map(); // displayId -> LiveDisplayManager
        this.globalSettings = this.loadGlobalSettings();
        this.init();
    }
    
    init() {
        console.log('🎯 MultiDisplayManager: Initializing with LiveDisplayManager integration');
        this.setupDisplayButtons();
        this.setupSettingsPanels();
        
        // Initialize mixer controls after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.initializeMixerControls();
        }, 100);
    }

    // Initialize mixer control synchronization
    initializeMixerControls() {
        console.log('🔧 Initializing mixer controls...');
        
        // Initialize all mixer control synchronization
        setTimeout(() => {
            // Background controls
            if (typeof this.updateMixerBackgroundImageUI === 'function') this.updateMixerBackgroundImageUI();
            if (typeof this.updateMixerBackgroundToggleButton === 'function') this.updateMixerBackgroundToggleButton();
            if (typeof this.updateMixerBackgroundOpacitySlider === 'function') this.updateMixerBackgroundOpacitySlider();
            
            // Video controls
            if (typeof this.updateMixerVideoToggleButton === 'function') this.updateMixerVideoToggleButton();
            if (typeof this.updateMixerVideoCameraSelect === 'function') this.updateMixerVideoCameraSelect();
            if (typeof this.updateMixerVideoOpacitySlider === 'function') this.updateMixerVideoOpacitySlider();
            if (typeof this.updateMixerVideoBrightnessSlider === 'function') this.updateMixerVideoBrightnessSlider();
            if (typeof this.updateMixerVideoContrastSlider === 'function') this.updateMixerVideoContrastSlider();
            if (typeof this.updateMixerVideoSaturationSlider === 'function') this.updateMixerVideoSaturationSlider();
            if (typeof this.updateMixerVideoHueRotateSlider === 'function') this.updateMixerVideoHueRotateSlider();
            if (typeof this.updateMixerVideoGrayscaleSlider === 'function') this.updateMixerVideoGrayscaleSlider();
            if (typeof this.updateMixerVideoFadeTimeSlider === 'function') this.updateMixerVideoFadeTimeSlider();
            if (typeof this.updateMixerVideoSepiaSlider === 'function') this.updateMixerVideoSepiaSlider();
            if (typeof this.updateMixerVideoBlurSlider === 'function') this.updateMixerVideoBlurSlider();
            if (typeof this.updateMixerVideoVignetteSlider === 'function') this.updateMixerVideoVignetteSlider();
            if (typeof this.updateMixerVideoPosterizeSlider === 'function') this.updateMixerVideoPosterizeSlider();
            if (typeof this.updateMixerVideoInvertToggle === 'function') this.updateMixerVideoInvertToggle();
            if (typeof this.updateMixerVideoMirrorToggle === 'function') this.updateMixerVideoMirrorToggle();
            if (typeof this.updateMixerVideoPulseToggle === 'function') this.updateMixerVideoPulseToggle();
            if (typeof this.updateMixerVideoPulseRateSlider === 'function') this.updateMixerVideoPulseRateSlider();
            if (typeof this.updateMixerVideoFileInfo === 'function') this.updateMixerVideoFileInfo();
            
            // Blobs controls
            if (typeof this.updateMixerBlobsToggle === 'function') this.updateMixerBlobsToggle();
            if (typeof this.updateMixerBlobsOpacitySlider === 'function') this.updateMixerBlobsOpacitySlider();
            if (typeof this.updateMixerBlobsSaturationSlider === 'function') this.updateMixerBlobsSaturationSlider();
            if (typeof this.updateMixerBlobsPosterizeSlider === 'function') this.updateMixerBlobsPosterizeSlider();
            if (typeof this.updateMixerBlobsContrastSlider === 'function') this.updateMixerBlobsContrastSlider();
            if (typeof this.updateMixerBlobsBrightnessSlider === 'function') this.updateMixerBlobsBrightnessSlider();
            if (typeof this.updateMixerBlobsIntensitySlider === 'function') this.updateMixerBlobsIntensitySlider();
            if (typeof this.updateMixerBlobsMinSizeSlider === 'function') this.updateMixerBlobsMinSizeSlider();
            if (typeof this.updateMixerBlobsMaxSizeSlider === 'function') this.updateMixerBlobsMaxSizeSlider();
            if (typeof this.updateMixerBlobsAgitateSlider === 'function') this.updateMixerBlobsAgitateSlider();
            if (typeof this.updateMixerBlobsDensitySlider === 'function') this.updateMixerBlobsDensitySlider();
            if (typeof this.updateMixerBlobsDecaySlider === 'function') this.updateMixerBlobsDecaySlider();
            if (typeof this.updateMixerBlobsBeatReactButton === 'function') this.updateMixerBlobsBeatReactButton();
            
            // Fluidity controls
            if (typeof this.updateMixerFluidityToggle === 'function') this.updateMixerFluidityToggle();
            if (typeof this.updateMixerFluidityOpacitySlider === 'function') this.updateMixerFluidityOpacitySlider();
            if (typeof this.updateMixerFluidityPresetSelector === 'function') this.updateMixerFluidityPresetSelector();
            if (typeof this.updateMixerFluidityColorSchemeSelect === 'function') this.updateMixerFluidityColorSchemeSelect();
        }, 100);
    }
    
    // Load global capture settings (no longer used - each display has its own)
    loadGlobalSettings() {
        return {}; // Empty - each display manages its own capture settings
    }
    
    // Save global capture settings (no longer used)
    saveGlobalSettings() {
        // No-op - each display saves its own settings
    }
    
    // Setup display buttons (Display 1, 2, 3)
    setupDisplayButtons() {
        for (let i = 1; i <= 3; i++) {
            const displayBtn = document.getElementById(`display${i}Btn`);
            const settingsBtn = document.getElementById(`display${i}SettingsBtn`);
            
            if (displayBtn) {
                displayBtn.addEventListener('click', () => {
                    this.toggleDisplay(i);
                });
            }
            
            if (settingsBtn) {
                settingsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Use existing panel system
                    if (window.visualizer && window.visualizer.toggleFooterSettingsPanel) {
                        window.visualizer.toggleFooterSettingsPanel(`display${i}SettingsPanel`, settingsBtn);
                    }
                });
            }
        }
    }
    
    // Setup settings panels for each display
    setupSettingsPanels() {
        for (let i = 1; i <= 3; i++) {
            this.setupDisplaySettingsPanel(i);
        }
    }
    
    // Setup individual display settings panel
    setupDisplaySettingsPanel(displayId) {
        const panel = document.getElementById(`display${displayId}SettingsPanel`);
        
        // Capture toggles for this display
        this.setupDisplayCaptureToggles(displayId);
        
        // Stream settings
        // Resolution select
        const resolutionSelect = document.getElementById(`display${displayId}ResolutionSelect`);
        if (resolutionSelect) {
            resolutionSelect.value = this.getDisplaySettings(displayId).resolution || '1080p';
            resolutionSelect.addEventListener('change', () => {
                this.updateDisplaySettings(displayId, { resolution: resolutionSelect.value });
            });
        }
        
        // Frame rate select
        const frameRateSelect = document.getElementById(`display${displayId}FrameRateSelect`);
        if (frameRateSelect) {
            const frameRate = this.getDisplaySettings(displayId).frameRate;
            frameRateSelect.value = frameRate ? frameRate.toString() : '30';
            frameRateSelect.addEventListener('change', () => {
                this.updateDisplaySettings(displayId, { frameRate: parseInt(frameRateSelect.value) });
            });
        }
        
        // Video quality select
        const videoQualitySelect = document.getElementById(`display${displayId}VideoQualitySelect`);
        if (videoQualitySelect) {
            videoQualitySelect.value = this.getDisplaySettings(displayId).videoQuality || 'auto';
            videoQualitySelect.addEventListener('change', () => {
                this.updateDisplaySettings(displayId, { videoQuality: videoQualitySelect.value });
            });
        }
        
        // Display mode buttons
        const modeButtons = document.querySelectorAll(`#display${displayId}SettingsPanel .display-mode-btn`);
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update display settings
                const mode = btn.dataset.mode;
                this.updateDisplaySettings(displayId, { presentationMode: mode });
            });
        });
        
        // Sharpness slider
        const sharpnessSlider = document.getElementById(`display${displayId}Sharpness`);
        const sharpnessValue = document.getElementById(`display${displayId}SharpnessValue`);
        if (sharpnessSlider && sharpnessValue) {
            sharpnessSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sharpnessValue.textContent = value + '%';
                this.updateDisplaySettings(displayId, { displaySharpness: value });
            });
        }
        
        // Letterbox color picker
        const letterboxColor = document.getElementById(`display${displayId}LetterboxColor`);
        const letterboxColorValue = document.getElementById(`display${displayId}LetterboxColorValue`);
        if (letterboxColor && letterboxColorValue) {
            letterboxColor.addEventListener('change', (e) => {
                const color = e.target.value;
                letterboxColorValue.textContent = color;
                this.updateDisplaySettings(displayId, { letterboxColor: color });
            });
        }
        
        // Mirror background toggle
        const mirrorBackgroundBtn = document.getElementById(`display${displayId}MirrorBackgroundBtn`);
        if (mirrorBackgroundBtn) {
            mirrorBackgroundBtn.addEventListener('click', () => {
                const currentState = this.getDisplaySettings(displayId).mirrorBackground || false;
                this.updateDisplaySettings(displayId, { mirrorBackground: !currentState });
                this.updateToggleButton(mirrorBackgroundBtn, 'Mirror Background', !currentState);
            });
        }
        
        // Mirror background blur slider
        const mirrorBackgroundBlur = document.getElementById(`display${displayId}MirrorBackgroundBlur`);
        if (mirrorBackgroundBlur) {
            mirrorBackgroundBlur.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.updateDisplaySettings(displayId, { mirrorBackgroundBlur: value });
            });
        }
        
        // Preset buttons
        const presetButtons = document.querySelectorAll(`#display${displayId}SettingsPanel .display-preset-btn`);
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyDisplayPreset(displayId, preset);
            });
        });
    }
    
    // Setup capture toggles for a specific display
    setupDisplayCaptureToggles(displayId) {
        // Capture Video toggle
        const captureVideoBtn = document.getElementById(`display${displayId}CaptureVideoBtn`);
        if (captureVideoBtn) {
            captureVideoBtn.addEventListener('click', () => {
                const currentState = this.getDisplaySettings(displayId).captureVideo !== false;
                this.updateDisplaySettings(displayId, { captureVideo: !currentState });
                this.updateToggleButton(captureVideoBtn, 'Capture Video', !currentState);
            });
        }
        
        // Capture Visualization toggle
        const captureVizBtn = document.getElementById(`display${displayId}CaptureVizBtn`);
        if (captureVizBtn) {
            captureVizBtn.addEventListener('click', () => {
                const currentState = this.getDisplaySettings(displayId).captureVisualization !== false;
                this.updateDisplaySettings(displayId, { captureVisualization: !currentState });
                this.updateToggleButton(captureVizBtn, 'Capture Visualization', !currentState);
            });
        }
        
        // Capture Kaleidoscope toggle
        const captureKaleidoscopeBtn = document.getElementById(`display${displayId}CaptureKaleidoscopeBtn`);
        if (captureKaleidoscopeBtn) {
            captureKaleidoscopeBtn.addEventListener('click', () => {
                const currentState = this.getDisplaySettings(displayId).captureKaleidoscope !== false;
                this.updateDisplaySettings(displayId, { captureKaleidoscope: !currentState });
                this.updateToggleButton(captureKaleidoscopeBtn, 'Capture Kaleidoscope', !currentState);
            });
        }
        
        // Capture Infinite Zoom toggle
        const captureInfiniteZoomBtn = document.getElementById(`display${displayId}CaptureInfiniteZoomBtn`);
        if (captureInfiniteZoomBtn) {
            captureInfiniteZoomBtn.addEventListener('click', () => {
                const currentState = this.getDisplaySettings(displayId).captureInfiniteZoom !== false;
                this.updateDisplaySettings(displayId, { captureInfiniteZoom: !currentState });
                this.updateToggleButton(captureInfiniteZoomBtn, 'Capture Infinite Zoom', !currentState);
            });
        }
        
        // Capture WebGL toggle
        const captureWebGLBtn = document.getElementById(`display${displayId}CaptureWebGLBtn`);
        if (captureWebGLBtn) {
            captureWebGLBtn.addEventListener('click', () => {
                // Check if WebGL is supported before allowing toggle
                if (this.visualizer.webglVisualization && !this.visualizer.webglVisualization.webglSupported) {
                    console.warn(`🎮 Display ${displayId}: WebGL capture clicked but WebGL not supported`);
                    alert('WebGL not supported. Check Browser settings.');
                    return;
                }
                
                const currentState = this.getDisplaySettings(displayId).captureWebGL !== false;
                this.updateDisplaySettings(displayId, { captureWebGL: !currentState });
                this.updateToggleButton(captureWebGLBtn, 'Capture WebGL', !currentState);
            });
        }
        
        // Capture Fluid Dynamics toggle
        const captureFluidDynamicsBtn = document.getElementById(`display${displayId}CaptureFluidDynamicsBtn`);
        if (captureFluidDynamicsBtn) {
            captureFluidDynamicsBtn.addEventListener('click', () => {
                const currentState = this.getDisplaySettings(displayId).captureFluidDynamics !== false;
                this.updateDisplaySettings(displayId, { captureFluidDynamics: !currentState });
                this.updateToggleButton(captureFluidDynamicsBtn, 'Capture Fluid Dynamics', !currentState);
            });
        }
    }
    
    // Toggle display window (create/close)
    toggleDisplay(displayId) {
        console.log(`DEBUG MultiDisplayManager: Toggling display ${displayId}`);
        const display = this.displays.get(displayId);
        const displayManager = this.displayManagers.get(displayId);
        
        if (display && display.window && !display.window.closed) {
            console.log(`DEBUG MultiDisplayManager: Closing existing display ${displayId}`);
            // Close existing display
            if (displayManager) {
                displayManager.stopStreaming();
            }
            display.close();
            this.displays.delete(displayId);
            this.displayManagers.delete(displayId);
            this.updateDisplayButton(displayId, false);
        } else {
            console.log(`DEBUG MultiDisplayManager: Creating new display ${displayId}`);
            // Create new display with LiveDisplayManager
            const newDisplay = this.createDisplay(displayId);
            
            if (newDisplay.openWindow()) {
                this.updateDisplayButton(displayId, true);
                // Start streaming with LiveDisplayManager
                setTimeout(() => {
                    console.log(`DEBUG MultiDisplayManager: Starting streaming for display ${displayId}`);
                    const manager = this.displayManagers.get(displayId);
                    if (manager) {
                        console.log(`DEBUG MultiDisplayManager: Found manager for display ${displayId}:`, manager);
                        console.log(`DEBUG MultiDisplayManager: Manager channel:`, manager.channel);
                        newDisplay.startStream(); // Use newDisplay.startStream() instead of manager.startStreaming()
                    } else {
                        console.error(`DEBUG MultiDisplayManager: No manager found for display ${displayId}`);
                    }
                }, 1000);
            } else {
                this.displays.delete(displayId);
                this.displayManagers.delete(displayId);
            }
        }
    }
    
    // Create new display with LiveDisplayManager
    createDisplay(displayId) {
        console.log(`DEBUG MultiDisplayManager: Creating new display for ID ${displayId}`);
        
        // Create LiveDisplayManager for this display
        const displayManager = new LiveDisplayManager(this.visualizer, displayId);
        console.log(`DEBUG MultiDisplayManager: Created LiveDisplayManager for ID ${displayId}:`, displayManager);
        this.displayManagers.set(displayId, displayManager);
        
        // Create DisplayInstance for window management
        const display = new DisplayInstance(displayId, this.visualizer, displayManager);
        console.log(`DEBUG MultiDisplayManager: Created DisplayInstance for ID ${displayId}:`, display);
        this.displays.set(displayId, display);
        
        return display;
    }
    
    // Update display button state
    updateDisplayButton(displayId, isActive) {
        const button = document.getElementById(`display${displayId}Btn`);
        if (button) {
            if (isActive) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }
    
    // Update toggle button
    updateToggleButton(button, label, isActive) {
        button.textContent = `${label}: ${isActive ? 'On' : 'Off'}`;
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
    
    // Get display settings
    getDisplaySettings(displayId) {
        const display = this.displays.get(displayId);
        return display ? display.settings : {};
    }
    
    // Update display settings
    updateDisplaySettings(displayId, settings) {
        console.log(`DEBUG MultiDisplayManager: Updating settings for Display ${displayId}:`, settings);
        const display = this.displays.get(displayId);
        if (display) {
            display.updateSettings(settings);
        } else {
            console.error(`DEBUG MultiDisplayManager: No display found for ID ${displayId}`);
        }
    }
    
    // Apply display preset
    applyDisplayPreset(displayId, preset) {
        const presets = {
            cinema: {
                presentationMode: 'fit',
                displaySharpness: 20,
                letterboxColor: '#000000',
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
                mirrorBackground: true
            }
        };
        
        const settings = presets[preset];
        if (settings) {
            this.updateDisplaySettings(displayId, settings);
            this.loadDisplaySettingsUI(displayId);
        }
    }
    
    // Load display settings UI
    loadDisplaySettingsUI(displayId) {
        const settings = this.getDisplaySettings(displayId);
        
        // Update display mode buttons
        const modeButtons = document.querySelectorAll(`#display${displayId}SettingsPanel .display-mode-btn`);
        modeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === settings.presentationMode) {
                btn.classList.add('active');
            }
        });
        
        // Update sharpness slider
        const sharpnessSlider = document.getElementById(`display${displayId}Sharpness`);
        const sharpnessValue = document.getElementById(`display${displayId}SharpnessValue`);
        if (sharpnessSlider && sharpnessValue) {
            sharpnessSlider.value = settings.displaySharpness || 0;
            sharpnessValue.textContent = (settings.displaySharpness || 0) + '%';
        }
        
        // Update letterbox color
        const letterboxColor = document.getElementById(`display${displayId}LetterboxColor`);
        const letterboxColorValue = document.getElementById(`display${displayId}LetterboxColorValue`);
        if (letterboxColor && letterboxColorValue) {
            letterboxColor.value = settings.letterboxColor || '#000000';
            letterboxColorValue.textContent = settings.letterboxColor || '#000000';
        }
        
        // Update capture toggles
        const captureVideoBtn = document.getElementById(`display${displayId}CaptureVideoBtn`);
        if (captureVideoBtn) {
            this.updateToggleButton(captureVideoBtn, 'Capture Video', settings.captureVideo !== false);
        }
        
        const captureVizBtn = document.getElementById(`display${displayId}CaptureVizBtn`);
        if (captureVizBtn) {
            this.updateToggleButton(captureVizBtn, 'Capture Visualization', settings.captureVisualization !== false);
        }
        
        const captureKaleidoscopeBtn = document.getElementById(`display${displayId}CaptureKaleidoscopeBtn`);
        if (captureKaleidoscopeBtn) {
            this.updateToggleButton(captureKaleidoscopeBtn, 'Capture Kaleidoscope', settings.captureKaleidoscope !== false);
        }
        
        const captureInfiniteZoomBtn = document.getElementById(`display${displayId}CaptureInfiniteZoomBtn`);
        if (captureInfiniteZoomBtn) {
            this.updateToggleButton(captureInfiniteZoomBtn, 'Capture Infinite Zoom', settings.captureInfiniteZoom !== false);
        }
        
        const captureWebGLBtn = document.getElementById(`display${displayId}CaptureWebGLBtn`);
        if (captureWebGLBtn) {
            this.updateToggleButton(captureWebGLBtn, 'Capture WebGL', settings.captureWebGL !== false);
        }
        
        const captureFluidDynamicsBtn = document.getElementById(`display${displayId}CaptureFluidDynamicsBtn`);
        if (captureFluidDynamicsBtn) {
            this.updateToggleButton(captureFluidDynamicsBtn, 'Capture Fluid Dynamics', settings.captureFluidDynamics !== false);
        }
        
        // Update mirror background toggle
        const mirrorBackgroundBtn = document.getElementById(`display${displayId}MirrorBackgroundBtn`);
        if (mirrorBackgroundBtn) {
            this.updateToggleButton(mirrorBackgroundBtn, 'Mirror Background', settings.mirrorBackground || false);
        }
    }

    // ====== MIXER UI SYNCHRONIZATION METHODS ======
    
    updateMixerVideoFileInfo() {
        
        const mixerVideoFileInfo = document.getElementById('mixerVideoFileInfo');
        const mixerVideoFileName = document.getElementById('mixerVideoFileName');
        
        if (mixerVideoFileInfo && mixerVideoFileName && this.visualizer) {
            // Show mixer file info whenever a video file is loaded (regardless of header panel state)
            const hasVideoFile = this.visualizer.videoFile && this.visualizer.videoMode === 'file';
            
            if (hasVideoFile) {
                mixerVideoFileInfo.style.display = 'block';
                mixerVideoFileName.textContent = this.visualizer.videoFile.name || 'Unknown file';
                
                // Update button states
                this.updateMixerVideoFileButtons();
            } else {
                mixerVideoFileInfo.style.display = 'none';
                mixerVideoFileName.textContent = 'No file selected';
            }
            
        } else {
            console.error('❌ Mixer video file info elements not found for update');
        }
    }

    updateMixerVideoFileButtons() {
        
        const mixerLoopBtn = document.getElementById('mixerVideoFileLoopBtn');
        const mixerMuteBtn = document.getElementById('mixerVideoFileMuteBtn');
        
        if (mixerLoopBtn && mixerMuteBtn && this.visualizer) {
            // Update loop button - toggle active class
            const loop = this.visualizer.videoFileLoop;
            if (loop) {
                mixerLoopBtn.classList.add('active');
            } else {
                mixerLoopBtn.classList.remove('active');
            }
            
            // Update mute button - toggle active class
            const muted = this.visualizer.videoFileMuted;
            if (muted) {
                mixerMuteBtn.classList.add('active');
            } else {
                mixerMuteBtn.classList.remove('active');
            }
            
        } else {
            console.error('❌ Mixer video file buttons not found for update');
        }
    }

    updateMixerVideoToggleButton() {
        const mixerVideoToggle = document.getElementById('mixerVideoToggle');
        if (mixerVideoToggle) {
            const text = mixerVideoToggle.querySelector('.video-text');
            if (text && this.visualizer) {
                const isOn = this.visualizer.videoMode === 'camera' || this.visualizer.videoMode === 'file';
                
                text.textContent = isOn ? 'ON' : 'OFF';
                
                // Update button state
                if (isOn) {
                    mixerVideoToggle.classList.add('active');
                } else {
                    mixerVideoToggle.classList.remove('active');
                }
            }
        } else {
            console.error('❌ Mixer video toggle button not found for update');
        }
    }

    updateMixerVideoCameraSelect() {
        const mixerVideoCameraSelect = document.getElementById('mixerVideoCameraSelect');
        if (mixerVideoCameraSelect && this.visualizer) {
            // Clear existing options except the first one
            while (mixerVideoCameraSelect.children.length > 1) {
                mixerVideoCameraSelect.removeChild(mixerVideoCameraSelect.lastChild);
            }
            
            // Add available video devices
            if (this.visualizer.availableVideoDevices && this.visualizer.availableVideoDevices.length > 0) {
                this.visualizer.availableVideoDevices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Camera ${device.deviceId.substring(0, 8)}`;
                    mixerVideoCameraSelect.appendChild(option);
                });
                
                // Add separator
                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = '──────────────────────';
                mixerVideoCameraSelect.appendChild(separator);
            }
            
            // Add "Video from File" option
            const fileOption = document.createElement('option');
            fileOption.value = 'file';
            fileOption.textContent = '📁 Video from File';
            mixerVideoCameraSelect.appendChild(fileOption);
            
            // Set current selection
            const currentDeviceId = this.visualizer.currentVideoDeviceId;
            if (currentDeviceId) {
                mixerVideoCameraSelect.value = currentDeviceId;
            } else if (this.visualizer.videoMode === 'file') {
                mixerVideoCameraSelect.value = 'file';
            } else {
                mixerVideoCameraSelect.value = '';
            }
            
        } else {
            console.error('❌ Mixer video source select not found for update');
        }
    }

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
            console.error('❌ Mixer Blobs toggle not found for update');
        }
    }

    updateMixerBlobsOpacitySlider() {
        // This method will be called by the main class when opacity changes
        const mixerBlobsOpacityValue = document.getElementById('mixerBlobsOpacityValue');
        
        if (window.multiDisplayManager && window.multiDisplayManager.mixerBlobsOpacitySlider && this.visualizer) {
            // Convert 0.0-1.0 to 0-100
            const opacityPercent = Math.round(this.visualizer.blobsOpacity * 100);
            window.multiDisplayManager.mixerBlobsOpacitySlider.setValue(opacityPercent);
            
            // Update value display
            if (mixerBlobsOpacityValue) {
                mixerBlobsOpacityValue.textContent = opacityPercent;
            }
        } else {
            console.error('❌ Mixer Blobs opacity slider not found for update');
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

    // ========== FLUIDITY CHANNEL UPDATE METHODS ==========

    updateMixerFluidityToggle() {
        const mixerFluidityToggle = document.getElementById('mixerFluidityToggle');
        if (mixerFluidityToggle && this.visualizer) {
            // Check the actual fluid dynamics state, not fluidDynamicsEnabled
            const isActive = this.visualizer.fluidDynamics && this.visualizer.fluidDynamics.isActive;
            const toggleText = mixerFluidityToggle.querySelector('.toggle-text');
            
            if (isActive) {
                mixerFluidityToggle.classList.add('active');
                if (toggleText) toggleText.textContent = 'ON';
            } else {
                mixerFluidityToggle.classList.remove('active');
                if (toggleText) toggleText.textContent = 'OFF';
            }
        } else {
            console.error('❌ Mixer Fluidity toggle not found for update');
        }
    }

    updateMixerFluidityOpacitySlider() {
        const mixerFluidityOpacitySlider = document.getElementById('mixerFluidityOpacitySlider');
        const mixerFluidityOpacityValue = document.getElementById('mixerFluidityOpacityValue');
        if (mixerFluidityOpacitySlider && mixerFluidityOpacityValue && this.visualizer && this.visualizer.fluidDynamics) {
            // Get current opacity from Fluid Dynamics (0.0-1.0) and convert to 0-100
            const opacityPercent = Math.round(this.visualizer.fluidDynamics.opacity * 100);
            mixerFluidityOpacitySlider.value = opacityPercent;
            mixerFluidityOpacityValue.textContent = opacityPercent;
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

    updateMixerVideoProgress(currentTime, duration) {
        
        const mixerProgressFill = document.getElementById('mixerVideoProgressFill');
        const mixerCurrentTimeEl = document.getElementById('mixerVideoCurrentTime');
        const mixerTotalTimeEl = document.getElementById('mixerVideoTotalTime');
        
        
        if (mixerProgressFill && mixerCurrentTimeEl && mixerTotalTimeEl && duration > 0) {
            const progressPercent = (currentTime / duration) * 100;
            mixerProgressFill.style.width = `${progressPercent}%`;
            mixerCurrentTimeEl.textContent = this.formatTime(currentTime);
            mixerTotalTimeEl.textContent = this.formatTime(duration);
            
        } else {
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // ========== INFINITE ZOOM MIXER UPDATE METHODS ==========

    updateMixerInfiniteZoomToggle() {
        const mixerInfiniteZoomToggle = document.getElementById('mixerInfiniteZoomToggle');
        if (mixerInfiniteZoomToggle && this.visualizer) {
            const isActive = this.visualizer.infiniteZoom && this.visualizer.infiniteZoom.isActive;
            const toggleText = mixerInfiniteZoomToggle.querySelector('.toggle-text');
            if (toggleText) {
                toggleText.textContent = isActive ? 'ON' : 'OFF';
            }
            if (isActive) {
                mixerInfiniteZoomToggle.classList.add('active');
            } else {
                mixerInfiniteZoomToggle.classList.remove('active');
            }
        }
    }

    updateMixerInfiniteZoomOpacitySlider() {
        const mixerInfiniteZoomOpacitySlider = document.getElementById('mixerInfiniteZoomOpacitySlider');
        const mixerInfiniteZoomOpacityValue = document.getElementById('mixerInfiniteZoomOpacityValue');
        if (mixerInfiniteZoomOpacitySlider && mixerInfiniteZoomOpacityValue && this.visualizer) {
            const opacity = this.visualizer.infiniteZoomOpacity || 100;
            mixerInfiniteZoomOpacitySlider.setAttribute('data-value', opacity);
            mixerInfiniteZoomOpacityValue.textContent = opacity;
            
            // Update visual elements
            const fill = mixerInfiniteZoomOpacitySlider.querySelector('.vertical-slider-fill');
            const thumb = mixerInfiniteZoomOpacitySlider.querySelector('.vertical-slider-thumb');
            if (fill && thumb) {
                const percentage = opacity / 100;
                fill.style.height = `${percentage * 100}%`;
                thumb.style.bottom = `${percentage * 100}%`;
            }
        }
    }

    updateMixerInfiniteZoomShapeSelect() {
        const mixerInfiniteZoomShapeSelect = document.getElementById('mixerInfiniteZoomShapeSelect');
        if (mixerInfiniteZoomShapeSelect && this.visualizer && this.visualizer.infiniteZoom) {
            mixerInfiniteZoomShapeSelect.value = this.visualizer.infiniteZoom.shape || 'circle';
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
}

/**
 * DisplayInstance - Simplified window management (WebRTC handled by LiveDisplayManager)
 */
class DisplayInstance {
    constructor(displayId, visualizer, displayManager = null) {
        console.log(`DEBUG DisplayInstance: Constructor called with displayId: ${displayId}`);
        this.displayId = displayId;
        this.visualizer = visualizer;
        this.displayManager = displayManager; // LiveDisplayManager instance
        this.window = null;
        this.settings = this.loadDisplaySettings();
        this.isConnected = false;
        
        // Create BroadcastChannel for this display
        this.channel = new BroadcastChannel(`mvpro-live-display-${displayId}`);
        console.log(`DEBUG DisplayInstance ${displayId}: Created BroadcastChannel: mvpro-live-display-${displayId}`);
        
        // Create a dedicated channel for settings
        this.settingsChannel = new BroadcastChannel(`mvpro-live-display-settings-${displayId}`);
        console.log(`DEBUG DisplayInstance ${displayId}: Created settings channel: mvpro-live-display-settings-${displayId}`);
        
        // Share the channel with the LiveDisplayManager
        if (this.displayManager) {
            console.log(`DEBUG DisplayInstance ${displayId}: Sharing channel with LiveDisplayManager`);
            this.displayManager.setChannel(this.channel);
        } else {
            console.error(`DEBUG DisplayInstance ${displayId}: No LiveDisplayManager to share channel with`);
        }
    }
    
    // Load display-specific settings
    loadDisplaySettings() {
        const saved = localStorage.getItem(`mvpro_display_${this.displayId}_settings`);
        const defaults = {
            captureVideo: true,
            captureVisualization: true,
            captureKaleidoscope: true,
            captureInfiniteZoom: true,
            captureWebGL: true,
            captureFluidDynamics: true,
            presentationMode: 'fit',
            displaySharpness: 0,
            letterboxColor: '#000000',
            mirrorBackground: false,
            mirrorBackgroundBlur: 20,
            resolution: '1080p',
            frameRate: 30,
            videoQuality: 'auto'
        };
        
        if (saved) {
            const parsedSettings = JSON.parse(saved);
            // Merge with defaults to ensure new properties are added
            const mergedSettings = { ...defaults, ...parsedSettings };
            console.log(`DEBUG DisplayInstance ${this.displayId}: Merged settings:`, mergedSettings);
            return mergedSettings;
        }
        
        return defaults;
    }
    
    // Save display-specific settings
    saveDisplaySettings() {
        localStorage.setItem(`mvpro_display_${this.displayId}_settings`, JSON.stringify(this.settings));
    }
    
    // Open display window
    openWindow() {
        const width = 1280;
        const height = 720;
        const left = window.screen.width - width - 50;
        const top = 50 + (this.displayId * 50); // Offset each window
        
        this.window = window.open(
            `Display.html?displayId=${this.displayId}`, 
            `MVPro_Display_${this.displayId}`, 
            `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
        );
        
        if (!this.window) {
            alert('Please allow pop-ups to open the display window');
            return false;
        }
        
        // Monitor window close
        const checkWindow = setInterval(() => {
            if (this.window && this.window.closed) {
                clearInterval(checkWindow);
                console.log(`Display ${this.displayId} window was closed manually`);
                this.close();
            }
        }, 1000);
        
        return true;
    }
    
    // Start streaming to this display
    startStream() {
        if (!this.window) return;
        
        console.log(`DEBUG DisplayInstance ${this.displayId}: Starting stream`);
        
        // Delegate to LiveDisplayManager
        if (this.displayManager) {
            console.log(`DEBUG DisplayInstance ${this.displayId}: Sending initial settings before streaming:`, this.settings);
            
        // Send initial settings via dedicated settings channel
        if (this.settingsChannel) {
            console.log(`DEBUG DisplayInstance ${this.displayId}: Sending initial settings via settings channel`);
            this.settingsChannel.postMessage({
                type: 'display-settings',
                data: this.settings
            });
        }
            
            // Start streaming
            this.displayManager.startStreaming();
        } else {
            console.error(`Display ${this.displayId}: No LiveDisplayManager available`);
        }
    }
    
    // Update settings for this specific display
    updateSettings(settings) {
        console.log(`DEBUG DisplayInstance ${this.displayId}: Updating settings:`, settings);
        console.log(`DEBUG DisplayInstance ${this.displayId}: Current settings:`, this.settings);
        
        this.settings = { ...this.settings, ...settings };
        this.saveDisplaySettings();
        
        console.log(`DEBUG DisplayInstance ${this.displayId}: New settings:`, this.settings);
        
        // Send settings via dedicated settings channel
        if (this.settingsChannel) {
            console.log(`DEBUG DisplayInstance ${this.displayId}: Sending settings via settings channel`);
            const message = {
                type: 'display-settings', 
                data: this.settings
            };
            console.log(`DEBUG DisplayInstance ${this.displayId}: Message to send:`, message);
            this.settingsChannel.postMessage(message);
        } else {
            console.error(`DEBUG DisplayInstance ${this.displayId}: Cannot send settings - no settings channel available`);
        }
    }
    
    // Close display
    close() {
        // Delegate cleanup to LiveDisplayManager
        if (this.displayManager) {
            this.displayManager.stopStreaming();
        }
        
        if (this.window && !this.window.closed) {
            this.window.close();
        }
        
        // Close channels
        if (this.channel) {
            this.channel.close();
        }
        
        if (this.settingsChannel) {
            this.settingsChannel.close();
        }
        
        this.window = null;
        this.isConnected = false;
        
        console.log(`Display ${this.displayId}: Closed`);
    }
}