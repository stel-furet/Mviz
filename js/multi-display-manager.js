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
        
        // Update mirror background toggle
        const mirrorBackgroundBtn = document.getElementById(`display${displayId}MirrorBackgroundBtn`);
        if (mirrorBackgroundBtn) {
            this.updateToggleButton(mirrorBackgroundBtn, 'Mirror Background', settings.mirrorBackground || false);
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
        return saved ? JSON.parse(saved) : {
            captureVideo: true,
            captureVisualization: true,
            captureKaleidoscope: true,
            captureInfiniteZoom: true,
            presentationMode: 'fit',
            displaySharpness: 0,
            letterboxColor: '#000000',
            mirrorBackground: false,
            mirrorBackgroundBlur: 20
        };
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