function initializeSidebarControls() {
    // Connect sidebar audio controls to existing functionality
    const sidebarInputModeBtn = document.getElementById('sidebarInputModeBtn');
    const sidebarAudioDeviceSelect = document.getElementById('sidebarAudioDeviceSelect');
    const sidebarPlaylistToggle = document.getElementById('sidebarPlaylistToggle');
    const sidebarPlaylistDropdown = document.getElementById('sidebarPlaylistDropdown');

    // Connect to existing controls
    // originalInputModeBtn removed - using select dropdown
    const originalAudioDeviceSelect = document.getElementById('audioDeviceSelect');
    // originalPlaylistToggle removed - playlist is now embedded
    const originalPlaylistDropdown = document.getElementById('playlistDropdown');

    if (sidebarInputModeBtn) {
        // Connect sidebar button directly to visualizer functionality
        sidebarInputModeBtn.addEventListener('click', () => {
            if (window.visualizer && window.visualizer.recordManager) {
                // Toggle input mode
                const isCurrentlyPlaylist = window.visualizer.inputMode === 'playlist';
                window.visualizer.inputMode = isCurrentlyPlaylist ? 'microphone' : 'playlist';
                
                // Update button state
                updateSidebarAudioButton();
                
                // Show/hide device selector
                const deviceSelect = document.getElementById('sidebarAudioDeviceSelect');
                if (deviceSelect) {
                    deviceSelect.style.display = isCurrentlyPlaylist ? 'block' : 'none';
                }
            }
        });
    }

    if (sidebarAudioDeviceSelect) {
        // Connect device selection directly to visualizer
        sidebarAudioDeviceSelect.addEventListener('change', async (e) => {
            const deviceId = e.target.value;
            if (window.visualizer && window.visualizer.recordManager) {
                try {
                    // Update the visualizer's audio input
                    await window.visualizer.recordManager.setAudioInput(deviceId);
                    console.log('Audio input changed to:', deviceId);
                } catch (error) {
                    console.error('Error changing audio input:', error);
                }
            }
        });

        // Populate device list when visualizer is ready
        if (window.visualizer && window.visualizer.recordManager) {
            populateAudioDevices();
        }
    }

    if (sidebarPlaylistToggle) {
        // Connect playlist dropdown directly
        sidebarPlaylistToggle.addEventListener('click', () => {
            const dropdown = document.getElementById('sidebarPlaylistDropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
                sidebarPlaylistToggle.classList.toggle('open');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebarPlaylistToggle.contains(e.target) && !sidebarPlaylistDropdown.contains(e.target)) {
                sidebarPlaylistDropdown.classList.remove('show');
                sidebarPlaylistToggle.classList.remove('open');
            }
        });
    }

    // Initialize button states
    updateSidebarAudioButton();
    updateSidebarPlaylistButton();
}

function updateSidebarAudioButton() {
    const sidebarBtn = document.getElementById('sidebarInputModeBtn');
    
    if (sidebarBtn && window.visualizer) {
        const isMicrophoneMode = window.visualizer.inputMode === 'microphone';
        sidebarBtn.classList.toggle('active', isMicrophoneMode);
        
        const textElement = sidebarBtn.querySelector('.input-mode-text');
        if (textElement) {
            textElement.textContent = isMicrophoneMode ? 'Live Audio' : 'Playlist';
        }
    }
}

function updateSidebarPlaylistButton() {
    // playlistToggle button removed - playlist is now embedded in Audio section
}

async function populateAudioDevices() {
    const select = document.getElementById('sidebarAudioDeviceSelect');
    if (!select) return;

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        // Clear existing options
        select.innerHTML = '<option value="">Select Audio Input...</option>';
        
        // Add device options
        audioInputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Audio Input ${audioInputs.indexOf(device) + 1}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error getting audio devices:', error);
    }
}

// Drawer System Functions
function initializeDrawers() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Get all section icons
    const sectionIcons = sidebar.querySelectorAll('.section-icon');
    
    sectionIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            // Only work when sidebar is collapsed
            if (!sidebar.classList.contains('collapsed')) return;
            
            e.stopPropagation();
            
            // Get the section name from the icon's title
            const sectionName = icon.getAttribute('title');
            const drawerId = getDrawerId(sectionName);
            
            if (drawerId) {
                toggleDrawer(drawerId);
            }
        });
    });

    // Add click-outside-to-close functionality
    document.addEventListener('click', (e) => {
        // Only close drawers if sidebar is collapsed
        if (!sidebar.classList.contains('collapsed')) return;
        
        // Check if click is outside any drawer
        const isDrawerClick = e.target.closest('.drawer');
        const isIconClick = e.target.closest('.section-icon');
        
        if (!isDrawerClick && !isIconClick) {
            closeAllDrawers();
        }
    });
}

function getDrawerId(sectionName) {
    const drawerMap = {
        'Scenes': 'drawerScenes',
        'Audio': 'drawerAudio', 
        'Video': 'drawerVideo',
        'Visualizations': 'drawerVisualizations',
        'Background': 'drawerBackground',
        'Output': 'drawerOutput',
        'Layers': 'drawerLayers',
        'Autopilot': 'drawerAutopilot'
    };
    return drawerMap[sectionName];
}

function toggleDrawer(drawerId) {
    const drawer = document.getElementById(drawerId);
    if (!drawer) return;

    // Check if this drawer is currently visible
    const isCurrentlyVisible = drawer.classList.contains('drawer-visible');
    
    // Close all drawers first
    closeAllDrawers();
    
    // If this drawer was not visible, show it
    if (!isCurrentlyVisible) {
        showDrawer(drawer);
    }
    // If it was visible, it stays closed (toggled off)
}

function showDrawer(drawer) {
    // Position the drawer relative to its section container
    const sectionName = getSectionNameFromDrawerId(drawer.id);
    const sectionIcon = document.querySelector(`.section-icon[title="${sectionName}"]`);
    
    if (sectionIcon) {
        // Find the parent section container
        const sectionContainer = sectionIcon.closest('.sidebar-section');
        if (sectionContainer) {
            // Use getBoundingClientRect for accurate viewport positioning
            const sectionRect = sectionContainer.getBoundingClientRect();
            // Subtract 8px to align with visual top of section
            drawer.style.top = `${sectionRect.top - 8}px`;
        }
    }
    
    drawer.classList.remove('drawer-hidden');
    drawer.classList.add('drawer-visible');
}

function getSectionNameFromDrawerId(drawerId) {
    const sectionMap = {
        'drawerScenes': 'Scenes',
        'drawerAudio': 'Audio',
        'drawerVideo': 'Video', 
        'drawerVisualizations': 'Visualizations',
        'drawerBackground': 'Background',
        'drawerOutput': 'Output',
        'drawerLayers': 'Layers',
        'drawerAutopilot': 'Autopilot'
    };
    return sectionMap[drawerId];
}

function hideDrawer(drawer) {
    drawer.classList.remove('drawer-visible');
    drawer.classList.add('drawer-hidden');
}

function closeAllDrawers() {
    const drawers = document.querySelectorAll('.drawer');
    drawers.forEach(drawer => {
        hideDrawer(drawer);
    });
}

// Drawer Control Functionality
function initializeDrawerControls() {
    // VIZ ON/OFF Toggle - connect to existing functionality
    const drawerVizToggleBtn = document.getElementById('drawerVizToggleBtn');
    const originalVizToggleBtn = document.getElementById('vizToggleBtn');
    
    if (drawerVizToggleBtn && originalVizToggleBtn) {
        // Sync initial state
        updateDrawerVizToggle();
        
        // Connect click handler
        drawerVizToggleBtn.addEventListener('click', () => {
            // Call the visualization toggle function directly instead of triggering click
            if (window.visualizer && window.visualizer.toggleVisualization) {
                window.visualizer.toggleVisualization();
            }
            // Update drawer button state
            updateDrawerVizToggle();
        });
    }

    // Spectrum Dropdown - connect to existing functionality
    const drawerVizModeToggle = document.getElementById('drawerVizModeToggle');
    const drawerVizModeDropdown = document.getElementById('drawerVizModeDropdown');
    const originalVizModeToggle = document.getElementById('vizModeToggle');
    const originalVizModeDropdown = document.getElementById('vizModeDropdown');
    
    if (drawerVizModeToggle && originalVizModeToggle) {
        // Sync initial state
        updateDrawerVizMode();
        
        // Connect dropdown toggle
        drawerVizModeToggle.addEventListener('click', () => {
            drawerVizModeDropdown.classList.toggle('show');
        });
        
        // Connect dropdown items
        const drawerItems = drawerVizModeDropdown.querySelectorAll('.drawer-dropdown-item');
        const originalItems = originalVizModeDropdown.querySelectorAll('.dropdown-item');
        
        drawerItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                // Call the visualization mode change function directly
                const mode = item.getAttribute('data-mode');
                if (window.visualizer && window.visualizer.setVisualizationMode) {
                    window.visualizer.setVisualizationMode(parseInt(mode));
                }
                // Update drawer state
                updateDrawerVizMode();
                // Close drawer dropdown
                drawerVizModeDropdown.classList.remove('show');
            });
        });
    }

    // Presets Dropdown - connect to existing functionality
    const drawerPresetSelector = document.getElementById('drawerPresetSelector');
    const originalPresetSelector = document.getElementById('presetSelector');
    
    if (drawerPresetSelector && originalPresetSelector) {
        // Sync options
        syncPresetOptions();
        
        // Connect change handler
        drawerPresetSelector.addEventListener('change', (e) => {
            // Set the original selector's value and trigger its change event
            originalPresetSelector.value = e.target.value;
            originalPresetSelector.dispatchEvent(new Event('change'));
        });
    }

    // Kaleidoscope Video Toggle - connect to existing functionality
    const drawerKaleidoscopeVideoBtn = document.getElementById('drawerKaleidoscopeVideoBtn');
    const originalKaleidoscopeVideoBtn = document.getElementById('kaleidoscopeVideoBtn');

    if (drawerKaleidoscopeVideoBtn && originalKaleidoscopeVideoBtn) {
        // Sync initial state
        updateDrawerKaleidoscopeVideo();
        
        // Connect click handler
        drawerKaleidoscopeVideoBtn.addEventListener('click', () => {
            // Use the exact same logic as the original button
            if (window.visualizer) {
                window.visualizer.kaleidoscopeApplyToVideo = !window.visualizer.kaleidoscopeApplyToVideo;
                originalKaleidoscopeVideoBtn.textContent = `Apply to Video: ${
                    window.visualizer.kaleidoscopeApplyToVideo ? 'On' : 'Off'
                }`;
                originalKaleidoscopeVideoBtn.classList.toggle('active', window.visualizer.kaleidoscopeApplyToVideo);

                // Enable kaleidoscope if turning on
                if (window.visualizer.kaleidoscopeApplyToVideo) {
                    if (!window.visualizer.kaleidoscopeEnabled) {
                        window.visualizer.kaleidoscopeEnabled = true;
                        window.visualizer.initKaleidoscope();
                        window.visualizer.startKaleidoscopeAnimation();
                    }
                }
            }
            // Update drawer button state
            updateDrawerKaleidoscopeVideo();
        });
    }

    // Kaleidoscope Viz Toggle - connect to existing functionality
    const drawerKaleidoscopeVizBtn = document.getElementById('drawerKaleidoscopeVizBtn');
    const originalKaleidoscopeVizBtn = document.getElementById('kaleidoscopeVizBtn');

    if (drawerKaleidoscopeVizBtn && originalKaleidoscopeVizBtn) {
        // Sync initial state
        updateDrawerKaleidoscopeViz();
        
        // Connect click handler
        drawerKaleidoscopeVizBtn.addEventListener('click', () => {
            // Use the exact same logic as the original button
            if (window.visualizer) {
                window.visualizer.kaleidoscopeApplyToViz = !window.visualizer.kaleidoscopeApplyToViz;
                originalKaleidoscopeVizBtn.textContent = `Apply to Viz: ${
                    window.visualizer.kaleidoscopeApplyToViz ? 'On' : 'Off'
                }`;
                originalKaleidoscopeVizBtn.classList.toggle('active', window.visualizer.kaleidoscopeApplyToViz);

                // Enable kaleidoscope if turning on, disable if both are off
                if (window.visualizer.kaleidoscopeApplyToViz) {
                    if (!window.visualizer.kaleidoscopeEnabled) {
                        window.visualizer.kaleidoscopeEnabled = true;
                        window.visualizer.initKaleidoscope();
                        window.visualizer.startKaleidoscopeAnimation();
                    }
                } else if (!window.visualizer.kaleidoscopeApplyToVideo && !window.visualizer.kaleidoscopeApplyToInfiniteZoom) {
                    window.visualizer.stopKaleidoscopeAnimation();
                    window.visualizer.kaleidoscopeEnabled = false;
                }
            }
            // Update drawer button state
            updateDrawerKaleidoscopeViz();
        });
    }

    // Kaleidoscope Infinite Zoom Toggle - connect to existing functionality
    const drawerKaleidoscopeInfiniteZoomBtn = document.getElementById('drawerKaleidoscopeInfiniteZoomBtn');
    const originalKaleidoscopeInfiniteZoomBtn = document.getElementById('kaleidoscopeInfiniteZoomBtn');

    if (drawerKaleidoscopeInfiniteZoomBtn && originalKaleidoscopeInfiniteZoomBtn) {
        // Sync initial state
        updateDrawerKaleidoscopeInfiniteZoom();
        
        // Connect click handler
        drawerKaleidoscopeInfiniteZoomBtn.addEventListener('click', () => {
            // Use the exact same logic as the original button
            if (window.visualizer) {
                window.visualizer.kaleidoscopeApplyToInfiniteZoom = !window.visualizer.kaleidoscopeApplyToInfiniteZoom;
                originalKaleidoscopeInfiniteZoomBtn.textContent = `Infinite Zoom: ${
                    window.visualizer.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'
                }`;
                originalKaleidoscopeInfiniteZoomBtn.classList.toggle('active', window.visualizer.kaleidoscopeApplyToInfiniteZoom);

                // Enable kaleidoscope if turning on IZ, disable if all are off
                if (window.visualizer.kaleidoscopeApplyToInfiniteZoom) {
                    if (!window.visualizer.kaleidoscopeEnabled) {
                        window.visualizer.kaleidoscopeEnabled = true;
                        window.visualizer.initKaleidoscope();
                        window.visualizer.startKaleidoscopeAnimation();
                    }
                } else if (!window.visualizer.kaleidoscopeApplyToViz && !window.visualizer.kaleidoscopeApplyToVideo) {
                    window.visualizer.stopKaleidoscopeAnimation();
                    window.visualizer.kaleidoscopeEnabled = false;
                }
            }
            // Update drawer button state
            updateDrawerKaleidoscopeInfiniteZoom();
        });
    }

    // Infinite Zoom Toggle - connect to existing functionality
    const drawerInfiniteZoomBtn = document.getElementById('drawerInfiniteZoomBtn');
    const originalInfiniteZoomBtn = document.getElementById('infiniteZoomBtn');

    if (drawerInfiniteZoomBtn && originalInfiniteZoomBtn) {
        // Sync initial state
        updateDrawerInfiniteZoom();
        
        // Connect click handler
        drawerInfiniteZoomBtn.addEventListener('click', () => {
            // Use the exact same logic as the original button
            if (window.visualizer && window.visualizer.infiniteZoom) {
                if (window.visualizer.infiniteZoom.isActive) {
                    window.visualizer.infiniteZoom.stop();
                    const btnText = originalInfiniteZoomBtn.querySelector('.kaleidoscope-btn-text');
                    btnText.textContent = 'Infinite Zoom Off';
                    originalInfiniteZoomBtn.classList.remove('active');
                } else {
                    window.visualizer.infiniteZoom.initialize();
                    window.visualizer.infiniteZoom.start();
                    const btnText = originalInfiniteZoomBtn.querySelector('.kaleidoscope-btn-text');
                    btnText.textContent = 'Infinite Zoom On';
                    originalInfiniteZoomBtn.classList.add('active');
                }
            }
            // Update drawer button state
            updateDrawerInfiniteZoom();
        });
    }

    // Kaleidoscope Preset Buttons - connect to existing functionality
    const drawerKelPreset1 = document.getElementById('drawerKelPreset1');
    const drawerKelPreset2 = document.getElementById('drawerKelPreset2');
    const drawerKelPreset3 = document.getElementById('drawerKelPreset3');
    const drawerKelPreset4 = document.getElementById('drawerKelPreset4');

    if (drawerKelPreset1) {
        drawerKelPreset1.addEventListener('click', () => {
            if (window.visualizer && window.visualizer.kaleidoscopePresets) {
                window.visualizer.applyKaleidoscopePreset(window.visualizer.kaleidoscopePresets[0]);
            }
        });
    }

    if (drawerKelPreset2) {
        drawerKelPreset2.addEventListener('click', () => {
            if (window.visualizer && window.visualizer.kaleidoscopePresets) {
                window.visualizer.applyKaleidoscopePreset(window.visualizer.kaleidoscopePresets[1]);
            }
        });
    }

    if (drawerKelPreset3) {
        drawerKelPreset3.addEventListener('click', () => {
            if (window.visualizer && window.visualizer.kaleidoscopePresets) {
                window.visualizer.applyKaleidoscopePreset(window.visualizer.kaleidoscopePresets[2]);
            }
        });
    }

    if (drawerKelPreset4) {
        drawerKelPreset4.addEventListener('click', () => {
            if (window.visualizer && window.visualizer.kaleidoscopePresets) {
                window.visualizer.applyKaleidoscopePreset(window.visualizer.kaleidoscopePresets[3]);
            }
        });
    }

    // Video ON/OFF Toggle - connect to existing functionality
    const drawerVideoToggleBtn = document.getElementById('drawerVideoToggleBtn');
    const originalVideoToggleBtn = document.getElementById('videoToggleBtn');

    if (drawerVideoToggleBtn && originalVideoToggleBtn) {
        // Sync initial state
        updateDrawerVideoToggle();
        
        // Connect click handler
        drawerVideoToggleBtn.addEventListener('click', () => {
            // Call the video toggle function directly
            if (window.visualizer && window.visualizer.toggleVideoPlayback) {
                window.visualizer.toggleVideoPlayback();
            }
            // Update drawer button state
            updateDrawerVideoToggle();
        });
    }

    // Video Input Dropdown - connect to existing functionality
    const drawerVideoDeviceSelect = document.getElementById('drawerVideoDeviceSelect');
    const originalVideoDeviceSelect = document.getElementById('videoDeviceSelect');

    if (drawerVideoDeviceSelect && originalVideoDeviceSelect) {
        // Sync initial state and options
        updateDrawerVideoInput();
        
        // Handle selection change
        drawerVideoDeviceSelect.addEventListener('change', async (e) => {
            const value = e.target.value;
            
            // Update the original select to match
            originalVideoDeviceSelect.value = value;
            
            // Trigger the original change event
            originalVideoDeviceSelect.dispatchEvent(new Event('change'));
            
            // Update the display to show the selected input name
            if (window.visualizer && window.visualizer.updateVideoDropdownDisplay) {
                window.visualizer.updateVideoDropdownDisplay();
            }
            
            // The drawer should already be in sync since updateVideoDeviceList() updates it
            // No need to call updateDrawerVideoInput() here
        });
    }

    // Audio Input Dropdown - connect to existing functionality
    const drawerAudioDeviceSelect = document.getElementById('drawerAudioDeviceSelect');
    const originalAudioDeviceSelect = document.getElementById('audioDeviceSelect');

    if (drawerAudioDeviceSelect && originalAudioDeviceSelect) {
        // Sync initial state and options
        updateDrawerAudioInput();
        
        // Handle selection change
        drawerAudioDeviceSelect.addEventListener('change', async (e) => {
            const value = e.target.value;
            
            // Update the original select to match
            originalAudioDeviceSelect.value = value;
            
            // Trigger the original change event
            originalAudioDeviceSelect.dispatchEvent(new Event('change'));
            
            // Sync back to drawer
            updateDrawerAudioInput();
        });
    }

    // Background Image Toggle - connect to existing functionality
    const drawerBackgroundImgBtn = document.getElementById('drawerBackgroundImgBtn');
    const originalBackgroundImgBtn = null; // Sidebar removed - functionality moved to header

    if (false) { // Disabled - sidebar removed
        // Sync initial state
        updateDrawerBackgroundToggle();
        
        // Connect click handler
        drawerBackgroundImgBtn.addEventListener('click', () => {
            // Toggle background image enabled state directly
            if (window.visualizer) {
                window.visualizer.backgroundImageEnabled = !window.visualizer.backgroundImageEnabled;
                window.visualizer.saveBackgroundImage();
                
                // Force redraw of visualization
                if (window.visualizer.audioMotion) {
                    window.visualizer.audioMotion.draw();
                }
            }
            
            // Update drawer button state
            updateDrawerBackgroundToggle();
        });
    }

    // Background Image Selection - connect to existing functionality
    const drawerBackgroundSelectImageBtn = document.getElementById('drawerBackgroundSelectImageBtn');
    const drawerBackgroundImageFile = document.getElementById('drawerBackgroundImageFile');

    if (drawerBackgroundSelectImageBtn && drawerBackgroundImageFile) {
        // Connect click handler to trigger file input
        drawerBackgroundSelectImageBtn.addEventListener('click', () => {
            drawerBackgroundImageFile.click();
        });
        
        // Handle file selection
        drawerBackgroundImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                console.log('📁 Drawer Background image file selected:', {
                    name: file.name,
                    type: file.type,
                    size: file.size
                });
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    console.log('📖 Drawer File read successfully, data URL length:', e.target.result.length);
                    if (window.visualizer) {
                        window.visualizer.backgroundImage = e.target.result;
                        window.visualizer.backgroundImageEnabled = true; // Auto-enable when image is loaded
                        window.visualizer.backgroundImageFileName = file.name;
                        window.visualizer.backgroundImageFileSize = file.size;
                        window.visualizer.cachedBackgroundImage = null; // Clear cached image
                        window.visualizer.saveBackgroundImage();
                        
                        // Update all UI elements
                        if (window.visualizer.updateBackgroundImageUI) {
                            window.visualizer.updateBackgroundImageUI();
                        }
                        if (window.visualizer.updateSidebarBackgroundImageUI) {
                            window.visualizer.updateSidebarBackgroundImageUI();
                        }
                        
                        // Update drawer button state
                        updateDrawerBackgroundToggle();
                        
                        // Force redraw of visualization
                        if (window.visualizer.audioMotion) {
                            window.visualizer.audioMotion.draw();
                        }
                        
                        console.log('💾 Drawer Background image saved and enabled');
                    }
                };
                reader.readAsDataURL(file);
            } else if (file) {
                console.error('❌ Invalid file type selected:', file.type);
            }
            
            // Reset file input for reselection
            e.target.value = '';
        });
    }
}

// Helper functions to sync drawer states with original controls
function updateDrawerVizToggle() {
    const drawerBtn = document.getElementById('drawerVizToggleBtn');
    const originalBtn = document.getElementById('vizToggleBtn');
    if (drawerBtn && originalBtn) {
        drawerBtn.textContent = originalBtn.textContent;
        // Remove active class first, then add it if original is active
        drawerBtn.classList.remove('active');
        if (originalBtn.classList.contains('active')) {
            drawerBtn.classList.add('active');
        }
    }
}

function updateDrawerVizMode() {
    const drawerToggle = document.getElementById('drawerVizModeToggle');
    const originalToggle = document.getElementById('vizModeToggle');
    if (drawerToggle && originalToggle) {
        drawerToggle.textContent = originalToggle.textContent;
    }
}

function syncPresetOptions() {
    const drawerSelector = document.getElementById('drawerPresetSelector');
    const originalSelector = document.getElementById('presetSelector');
    if (drawerSelector && originalSelector) {
        // Copy options from original to drawer
        drawerSelector.innerHTML = originalSelector.innerHTML;
    }
}

function updateDrawerKaleidoscopeVideo() {
    const drawerBtn = document.getElementById('drawerKaleidoscopeVideoBtn');
    const originalBtn = document.getElementById('kaleidoscopeVideoBtn');
    if (drawerBtn && originalBtn) {
        drawerBtn.classList.toggle('active', originalBtn.classList.contains('active'));
    }
}

function updateDrawerKaleidoscopeViz() {
    const drawerBtn = document.getElementById('drawerKaleidoscopeVizBtn');
    const originalBtn = document.getElementById('kaleidoscopeVizBtn');
    if (drawerBtn && originalBtn) {
        drawerBtn.classList.toggle('active', originalBtn.classList.contains('active'));
    }
}

function updateDrawerKaleidoscopeInfiniteZoom() {
    const drawerBtn = document.getElementById('drawerKaleidoscopeInfiniteZoomBtn');
    const originalBtn = document.getElementById('kaleidoscopeInfiniteZoomBtn');
    if (drawerBtn && originalBtn) {
        drawerBtn.classList.toggle('active', originalBtn.classList.contains('active'));
    }
}

function updateDrawerInfiniteZoom() {
    const drawerBtn = document.getElementById('drawerInfiniteZoomBtn');
    const originalBtn = document.getElementById('infiniteZoomBtn');
    if (drawerBtn && originalBtn) {
        const drawerText = drawerBtn.querySelector('.drawer-btn-text');
        const originalText = originalBtn.querySelector('.kaleidoscope-btn-text');
        if (drawerText && originalText) {
            drawerText.textContent = originalText.textContent;
        }
        drawerBtn.classList.toggle('active', originalBtn.classList.contains('active'));
    }
}

function updateDrawerVideoToggle() {
    const drawerBtn = document.getElementById('drawerVideoToggleBtn');
    const originalBtn = document.getElementById('videoToggleBtn');
    if (drawerBtn && originalBtn) {
        drawerBtn.textContent = originalBtn.textContent;
        drawerBtn.classList.toggle('active', originalBtn.classList.contains('active'));
    }
}

function updateDrawerVideoInput() {
    const drawerSelect = document.getElementById('drawerVideoDeviceSelect');
    const originalSelect = document.getElementById('videoDeviceSelect');
    if (drawerSelect && originalSelect) {
        // Copy options from original to drawer
        drawerSelect.innerHTML = originalSelect.innerHTML;
        
        // Sync selected value
        drawerSelect.value = originalSelect.value;
    }
}

function updateDrawerAudioInput() {
    const drawerSelect = document.getElementById('drawerAudioDeviceSelect');
    const originalSelect = document.getElementById('audioDeviceSelect');
    if (drawerSelect && originalSelect) {
        // Copy options from original to drawer
        drawerSelect.innerHTML = originalSelect.innerHTML;
        
        // Sync selected value
        drawerSelect.value = originalSelect.value;
    }
}

function updateDrawerBackgroundToggle() {
    const drawerBtn = document.getElementById('drawerBackgroundImgBtn');
    const originalBtn = null; // Sidebar removed - functionality moved to header
    if (false) { // Disabled - sidebar removed
        // Get the text from the original button's span
        const originalTextSpan = originalBtn.querySelector('.background-text');
        const text = originalTextSpan ? originalTextSpan.textContent : 'OFF';
        
        // Extract just the ON/OFF part
        const isOn = text.includes('ON');
        drawerBtn.textContent = isOn ? 'ON' : 'OFF';
        drawerBtn.classList.toggle('active', isOn);
    }
}


// Global function for toggling sections
window.toggleSection = function(sectionName) {
    // Handle special cases for remaining sections
    let elementId;
    if (sectionName === 'audio') {
        // Audio section removed - now handled by header dropdown
        console.log('Audio section removed - use header Audio Input button');
        return;
    } else if (sectionName === 'video') {
        elementId = 'sidebarVideoInput';
    } else {
        elementId = `sidebar${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`;
    }
    
    const sectionContent = document.getElementById(elementId);
    const sectionTitle = sectionContent?.previousElementSibling;
    
    if (sectionContent && sectionTitle) {
        const isCollapsed = sectionContent.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand section
            sectionContent.classList.remove('collapsed');
            sectionContent.classList.add('expanded');
            sectionTitle.classList.remove('collapsed');
            sectionTitle.innerHTML = sectionTitle.textContent.replace('▶', '▼');
        } else {
            // Collapse section
            sectionContent.classList.add('collapsed');
            sectionContent.classList.remove('expanded');
            sectionTitle.classList.add('collapsed');
            sectionTitle.innerHTML = sectionTitle.textContent.replace('▼', '▶');
        }
    }
}

// Initialize the visualizer
let visualizer;


        // Global function for closing info popup
        function closeInfoPopup() {
if (window.visualizer) {
    window.visualizer.closeInfoPopup();
}
        }
