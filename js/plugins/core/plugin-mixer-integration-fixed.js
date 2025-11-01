/**
 * Plugin Mixer Integration System
 * Handles proper integration of plugin channel strips with the existing Freque mixer
 * Implements drag-drop reordering and z-index management as specified in the plan
 */

class PluginMixerIntegration {
    constructor() {
        console.log('🔥 CACHE BUSTER: Plugin Mixer Integration v1761853300 LOADED - FIXED VIDEO Z-INDEX');
        this.channelStrips = new Map();
        this.dragDropEnabled = false;
        this.currentDragElement = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        // Z-index assignments as per plan
        this.zIndexMap = {
            'audioinput': null,        // No z-index (audio only)
            'backgroundimage': 1,      // Background Image
            'videoinput': 2,          // Video Input
            'amvisualizer': 3,        // AM Visualizer
            'infinitezoom': 4,        // Infinite Zoom
            'blobs': 5,               // Blobs
            'starfall': 6,            // Starfall
            'fluidity': 7,            // Fluidity (Fluid Dynamics)
            'nebula': 8,              // Nebula
            'plugins': 9,             // First plugin starts at 9
            'kaleidoscope': 100       // Always top, non-movable
        };
        
        this.init();
    }
    
    init() {
        // Wait for mixer to be ready
        this.waitForMixer().then(() => {
            this.setupDragDrop();
            
            // Expose reset method globally for debugging
            window.resetChannelOrder = () => this.resetToDefaultOrder();
        });
    }
    
    async waitForMixer() {
        return new Promise((resolve) => {
            const checkMixer = () => {
                const mixerPanel = document.querySelector('.mixer-panel-floating .panel-content');
                if (mixerPanel) {
                    resolve(mixerPanel);
                } else {
                    setTimeout(checkMixer, 100);
                }
            };
            checkMixer();
        });
    }
    
    /**
     * Create a proper channel strip for a plugin following the existing mixer pattern
     */
    createPluginChannelStrip(plugin) {
        // Find the mixer channels container specifically (not the info panel)
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) {
            console.error('Mixer channels container not found');
            return null;
        }
        
        // The channels are direct children of mixer-channels
        // We need to insert before the Kaleidoscope channel specifically
        
        // Find kaleidoscope channel by looking for the comment and following div
        // Look for the actual Kaleidoscope channel strip in the mixer
        const allChannelStrips = mixerChannels.querySelectorAll('.channel-strip');
        let kaleidoscopeChannel = null;
        
        // Find the channel strip with "Kaleidoscope" in the header
        for (const strip of allChannelStrips) {
            const header = strip.querySelector('.channel-header');
            if (header && header.textContent.trim() === 'Kaleidoscope') {
                kaleidoscopeChannel = strip;
                break;
            }
        }
        
        // Create channel strip following the existing pattern
        const channelStrip = document.createElement('div');
        channelStrip.className = 'channel-strip viz-channel plugin-channel';
        channelStrip.setAttribute('data-plugin', plugin.pluginName);
        channelStrip.setAttribute('data-channel', `plugin-${plugin.pluginName}`);
        channelStrip.setAttribute('data-draggable', 'true');
        
        // Create channel content following existing mixer structure
        channelStrip.innerHTML = this.createChannelStripHTML(plugin);
        
        // Insert before kaleidoscope or at end
        if (kaleidoscopeChannel && kaleidoscopeChannel.parentNode === mixerChannels) {
            mixerChannels.insertBefore(channelStrip, kaleidoscopeChannel);
        } else {
            mixerChannels.appendChild(channelStrip);
        }
        
        // Store reference
        this.channelStrips.set(plugin.pluginName, channelStrip);
        
        // Setup event listeners
        this.setupChannelStripEvents(plugin, channelStrip);
        
        // Make draggable
        this.makeDraggable(channelStrip);
        
        return channelStrip;
    }
    
    /**
     * Create channel strip HTML following the existing mixer pattern (Infinite Zoom style)
     */
    createChannelStripHTML(plugin) {
        return `
            <div class="channel-drag-button" title="Drag to reorder">
                <svg width="16" height="8" viewBox="0 0 16 8" class="drag-arrows">
                    <path d="M2 4 L0 2 L0 6 Z" fill="currentColor"/>
                    <path d="M14 4 L16 2 L16 6 Z" fill="currentColor"/>
                    <path d="M4 3 L12 3 L12 5 L4 5 Z" fill="currentColor" opacity="0.5"/>
                </svg>
            </div>
            <div class="channel-header">${plugin.metadata.name}</div>
            
            <!-- ON/OFF Toggle -->
            <div class="channel-toggle-section">
                <button class="btn-toggle plugin-power-btn" data-plugin="${plugin.pluginName}" title="Toggle ${plugin.metadata.name}">
                    <span class="toggle-text">OFF</span>
                </button>
            </div>
            
            <!-- Opacity Control -->
            <div class="vertical-slider-section">
                <div class="vertical-slider-container">
                    <div class="vertical-slider-label top">Opacity</div>
                    <div class="vertical-slider-wrapper">
                        <div class="vertical-slider plugin-opacity-slider" data-plugin="${plugin.pluginName}" data-min="0" data-max="100" data-value="100">
                            <div class="vertical-slider-track"></div>
                            <div class="vertical-slider-fill"></div>
                            <div class="vertical-slider-thumb"></div>
                        </div>
                    </div>
                    <div class="vertical-slider-label bottom plugin-opacity-value" data-plugin="${plugin.pluginName}">100</div>
                </div>
            </div>
            
            <!-- Channel Input Section (for dropdowns if needed) -->
            <div class="channel-input-section">
                <!-- Plugin-specific input controls will be added here -->
            </div>
            
            <!-- Presets Section -->
            <div class="channel-presets-section">
                <div class="control-mini-label collapsible-header plugin-presets-header" data-target="${plugin.pluginName}Presets" data-plugin="${plugin.pluginName}">
                    <span>Presets</span>
                    <span class="collapse-indicator"></span>
                </div>
                <div class="collapsible-content plugin-presets-container" id="${plugin.pluginName}Presets" data-plugin="${plugin.pluginName}">
                    <!-- Preset buttons will be added here -->
                </div>
            </div>
            
            <!-- Plugin Controls Section -->
            <div class="channel-controls-section">
                <div class="control-mini-label collapsible-header plugin-controls-header" data-target="${plugin.pluginName}Controls" data-plugin="${plugin.pluginName}">
                    <span>Controls</span>
                    <span class="collapse-indicator"></span>
                </div>
                <div class="collapsible-content plugin-controls-container" id="${plugin.pluginName}Controls" data-plugin="${plugin.pluginName}">
                    <!-- Plugin-specific controls will be added here -->
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners for channel strip controls
     */
    setupChannelStripEvents(plugin, channelStrip) {
        // Power toggle
        const powerBtn = channelStrip.querySelector('.plugin-power-btn');
        if (powerBtn) {
            powerBtn.addEventListener('click', () => {
                console.log(`🔌 TOGGLE DEBUG: Button clicked for plugin "${plugin.pluginName}"`);
                console.log(`🔌 TOGGLE DEBUG: Plugin state before toggle - isActive: ${plugin.isActive}`);
                console.log(`🔌 TOGGLE DEBUG: Plugin manager has plugin:`, !!window.pluginManager?.getPlugin(plugin.pluginName));
                console.log(`🔌 TOGGLE DEBUG: Channel strips count:`, this.channelStrips.size);
                console.log(`🔌 TOGGLE DEBUG: Channel strips for this plugin:`, this.channelStrips.has(plugin.pluginName));
                
                plugin.toggle();
                
                console.log(`🔌 TOGGLE DEBUG: Plugin state after toggle - isActive: ${plugin.isActive}`);
                console.log(`🔌 TOGGLE DEBUG: About to update power button`);
                
                this.updatePowerButton(plugin.pluginName);
                
                console.log(`🔌 TOGGLE DEBUG: Power button updated`);
            });
        }
        
        // Opacity slider
        const opacitySlider = channelStrip.querySelector('.plugin-opacity-slider');
        const opacityValue = channelStrip.querySelector('.plugin-opacity-value');
        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                plugin.setOpacity(value);
                opacityValue.textContent = `${value}%`;
            });
        }
    }
    
    /**
     * Update power button state
     */
    updatePowerButton(pluginName) {
        const plugin = window.pluginManager?.getPlugin(pluginName);
        const channelStrip = this.channelStrips.get(pluginName);
        if (!plugin || !channelStrip) return;
        
        const powerBtn = channelStrip.querySelector('.plugin-power-btn');
        const toggleText = channelStrip.querySelector('.toggle-text');
        
        if (powerBtn && toggleText) {
            if (plugin.isActive) {
                powerBtn.classList.add('active');
                toggleText.textContent = 'ON';
            } else {
                powerBtn.classList.remove('active');
                toggleText.textContent = 'OFF';
            }
        }
    }
    
    /**
     * Add plugin controls to the channel strip
     */
    addPluginControls(pluginName, controls) {
        const channelStrip = this.channelStrips.get(pluginName);
        if (!channelStrip) return;
        
        const controlsContainer = channelStrip.querySelector('.plugin-controls-container');
        if (!controlsContainer) return;
        
        // Clear existing controls
        controlsContainer.innerHTML = '';
        
        // Add each control
        controls.forEach((controlConfig, controlId) => {
            const controlElement = this.createControlElement(controlId, controlConfig);
            if (controlElement) {
                controlsContainer.appendChild(controlElement);
            }
        });
    }
    
    /**
     * Add plugin presets to the channel strip
     */
    addPluginPresets(pluginName, presets) {
        const channelStrip = this.channelStrips.get(pluginName);
        if (!channelStrip) return;
        
        const presetsContainer = channelStrip.querySelector('.preset-buttons-container');
        if (!presetsContainer) return;
        
        // Clear existing presets
        presetsContainer.innerHTML = '';
        
        // Add each preset
        presets.forEach((presetConfig, presetId) => {
            const presetButton = document.createElement('button');
            presetButton.className = 'btn-preset';
            presetButton.textContent = presetConfig.name || presetId;
            presetButton.addEventListener('click', () => {
                const plugin = window.pluginManager?.getPlugin(pluginName);
                if (plugin && plugin.applyPreset) {
                    plugin.applyPreset(presetId);
                }
            });
            presetsContainer.appendChild(presetButton);
        });
    }
    
    /**
     * Create UI control element (Infinite Zoom style)
     */
    createControlElement(controlId, controlConfig) {
        switch (controlConfig.type) {
            case 'slider':
                return this.createSliderControl(controlId, controlConfig);
            case 'button':
                return this.createButtonControl(controlId, controlConfig);
            case 'dropdown':
                return this.createDropdownControl(controlId, controlConfig);
            case 'checkbox':
                return this.createCheckboxControl(controlId, controlConfig);
            default:
                console.warn(`Unknown control type: ${controlConfig.type}`);
                return null;
        }
    }
    
    /**
     * Create slider control (Infinite Zoom style)
     */
    createSliderControl(controlId, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-mini-group';
        
        // Header with label and value
        const header = document.createElement('div');
        header.className = 'control-mini-header';
        
        const label = document.createElement('div');
        label.className = 'control-mini-label';
        label.textContent = config.label || controlId;
        
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'control-mini-value';
        valueDisplay.textContent = `${config.value || config.min || 0}${config.unit || ''}`;
        
        header.appendChild(label);
        header.appendChild(valueDisplay);
        
        // Mini slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'mini-slider';
        slider.min = config.min || 0;
        slider.max = config.max || 100;
        slider.step = config.step || 1;
        slider.value = config.value || config.min || 0;
        
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            valueDisplay.textContent = `${value}${config.unit || ''}`;
            if (config.onChange) {
                config.onChange(value);
            }
        });
        
        controlGroup.appendChild(header);
        controlGroup.appendChild(slider);
        
        return controlGroup;
    }
    
    /**
     * Create button control (using existing preset button style)
     */
    createButtonControl(controlId, config) {
        const button = document.createElement('button');
        button.className = config.className || 'btn-preset';
        button.textContent = config.label || controlId;
        
        if (config.onClick) {
            button.addEventListener('click', config.onClick);
        }
        
        return button;
    }
    
    /**
     * Create dropdown control (using existing dropdown-mini style)
     */
    createDropdownControl(controlId, config) {
        const select = document.createElement('select');
        select.className = 'dropdown-mini';
        
        if (config.options) {
            config.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label || option.value;
                select.appendChild(optionElement);
            });
        }
        
        if (config.onChange) {
            select.addEventListener('change', (e) => {
                config.onChange(e.target.value);
            });
        }
        
        return select;
    }
    
    /**
     * Create checkbox control (styled as mini toggle button)
     */
    createCheckboxControl(controlId, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-mini-group';
        
        // Header with label
        const header = document.createElement('div');
        header.className = 'control-mini-header';
        
        const label = document.createElement('div');
        label.className = 'control-mini-label';
        label.textContent = config.label || controlId;
        header.appendChild(label);
        
        // Toggle button styled as checkbox
        const toggleButton = document.createElement('button');
        toggleButton.className = 'btn-toggle';
        toggleButton.style.fontSize = '10px';
        toggleButton.style.padding = '2px 6px';
        
        const toggleText = document.createElement('span');
        toggleText.className = 'toggle-text';
        toggleText.textContent = config.checked ? 'ON' : 'OFF';
        toggleButton.appendChild(toggleText);
        
        let isChecked = config.checked || false;
        
        toggleButton.addEventListener('click', () => {
            isChecked = !isChecked;
            toggleText.textContent = isChecked ? 'ON' : 'OFF';
            if (config.onChange) {
                config.onChange(isChecked);
            }
        });
        
        controlGroup.appendChild(header);
        controlGroup.appendChild(toggleButton);
        
        return controlGroup;
    }
    
    /**
     * Setup drag-drop reordering system
     */
    setupDragDrop() {
        this.dragDropEnabled = true;
        
        // Initialize drag-drop for all existing native channel strips
        this.initializeNativeChannelDragDrop();
        
        // Load saved channel order AFTER data-channel attributes are set
        setTimeout(() => {
            this.loadChannelOrder();
        }, 50);
        
        // If no saved order was loaded, initialize default z-indexes
        setTimeout(() => {
            this.initializeDefaultZIndexes();
        }, 100);
        
    }
    
    /**
     * Initialize drag-drop for all native channel strips
     */
    initializeNativeChannelDragDrop() {
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) return;
        
        // Find all channel strips with drag buttons (excluding Audio and Kaleidoscope)
        const channelStrips = mixerChannels.querySelectorAll('.channel-strip');
        
        channelStrips.forEach(strip => {
            const dragButton = strip.querySelector('.channel-drag-button');
            const isDisplayChannel = strip.classList.contains('display-channel');
            
            if (dragButton && !isDisplayChannel) {
                // Add data attributes for identification
                const header = strip.querySelector('.channel-header');
                if (header) {
                    const channelName = header.textContent.trim().toLowerCase().replace(/\s+/g, '');
                    strip.setAttribute('data-channel', channelName);
                    strip.setAttribute('data-draggable', 'true');
                }
                
                // Make it draggable
                this.makeDraggable(strip);
            }
        });
    }
    
    /**
     * Initialize default z-indexes for all visualization elements
     */
    initializeDefaultZIndexes() {
        // Apply default z-indexes based on the current channel order
        this.recalculateZIndexes();
        
        // Debug: Show initial z-index values once on app launch
        this.debugInitialZIndexes();
    }
    
    /**
     * Re-apply z-indexes when visualizations are started/stopped
     * This ensures z-indexes are applied after canvases are created
     */
    reapplyZIndexes() {
        // Wait a bit for canvases to be created
        setTimeout(() => {
            this.recalculateZIndexes();
        }, 50);
    }
    
    /**
     * Debug method to show initial z-index values on app launch
     */
    debugInitialZIndexes() {
        console.log('🔍 Z-INDEX DEBUG: Initial channel z-index values on app launch:');
        console.log('🔍 DEBUG TIMING: This debug runs 100ms after setupDragDrop()');
        console.log('🔍 DEBUG TIMING: localStorage should have loaded 50ms ago');
        
        // Check if localStorage was loaded
        const savedData = localStorage.getItem('freque-channel-order');
        console.log('🔍 DEBUG STORAGE: localStorage data exists:', !!savedData);
        
        // Show all canvases that exist in the DOM
        const allCanvases = document.querySelectorAll('canvas');
        console.log('🔍 DEBUG CANVASES: Found', allCanvases.length, 'canvas elements in DOM');
        allCanvases.forEach((canvas, i) => {
            console.log(`  Canvas ${i+1}: id="${canvas.id}", zIndex="${canvas.style.zIndex}", parent="${canvas.parentElement?.id || 'no-id'}"`)
        });
        
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) return;
        
        const channelStrips = Array.from(mixerChannels.querySelectorAll('.channel-strip'));
        
        channelStrips.forEach((strip, index) => {
            const channelType = strip.getAttribute('data-channel');
            const pluginName = strip.getAttribute('data-plugin');
            const header = strip.querySelector('.channel-header')?.textContent;
            
            // Skip Audio Input, Kaleidoscope, and Display channels - they don't have visualizations
            if (channelType === 'audioinput' || channelType === 'kaleidoscope' || 
                channelType === 'display1' || channelType === 'display2' || channelType === 'display3') {
                return;
            }
            
            // Try to find the actual visualization element and get its z-index
            let actualZIndex = 'not found';
            let elementType = 'unknown';
            
            if (pluginName) {
                // Plugin channel
                const pluginCanvas = document.getElementById(`${pluginName}-plugin-canvas`);
                if (pluginCanvas) {
                    actualZIndex = pluginCanvas.style.zIndex || 'not set';
                    elementType = 'plugin canvas';
                }
            } else if (channelType) {
                // Native visualization channels only
                switch (channelType) {
                    case 'backgroundimage':
                        const bgElement = document.querySelector('#visualizer .background-image, #visualizationContainer .background-image');
                        if (bgElement) {
                            actualZIndex = bgElement.style.zIndex || 'not set';
                            elementType = 'background element';
                        }
                        break;
                    case 'videoinput':
                        const videoElement = document.querySelector('#visualizer video, #visualizationContainer video');
                        if (videoElement) {
                            actualZIndex = videoElement.style.zIndex || 'not set';
                            elementType = 'video element';
                        }
                        break;
                    case 'amvisualizer':
                        const amCanvas = document.querySelector('canvas[data-audiomotion], #visualizer canvas:first-child');
                        if (amCanvas) {
                            actualZIndex = amCanvas.style.zIndex || 'not set';
                            elementType = 'AM canvas';
                        }
                        break;
                    case 'infinitezoom':
                        const izCanvas = document.querySelector('#visualizationContainer canvas');
                        if (izCanvas && izCanvas.style.zIndex === '3') {
                            actualZIndex = izCanvas.style.zIndex;
                            elementType = 'IZ canvas';
                        }
                        break;
                    case 'blobs':
                        const blobsCanvas = document.getElementById('blobs-plugin-canvas');
                        if (blobsCanvas) {
                            actualZIndex = blobsCanvas.style.zIndex || 'not set';
                            elementType = 'Blobs canvas';
                        }
                        break;
                    case 'starfall':
                        const starfallCanvas = document.querySelector('#visualizationContainer canvas[style*="z-index: 4"]');
                        if (starfallCanvas) {
                            actualZIndex = starfallCanvas.style.zIndex;
                            elementType = 'Starfall canvas';
                        }
                        break;
                    case 'fluidity':
                        const fluidCanvas = document.getElementById('fluidcanvas');
                        if (fluidCanvas) {
                            actualZIndex = fluidCanvas.style.zIndex || 'not set';
                            elementType = 'Fluid canvas';
                        }
                        break;
                    case 'nebula':
                        const nebulaCanvas = document.querySelector('#visualizationContainer canvas[style*="z-index: 20"]');
                        if (nebulaCanvas) {
                            actualZIndex = nebulaCanvas.style.zIndex;
                            elementType = 'Nebula canvas';
                        }
                        break;
                }
            }
            
            // Show what z-index this channel should have according to our mapping
            let expectedZIndex = 'not mapped';
            if (this.zIndexMap.hasOwnProperty(channelType)) {
                expectedZIndex = this.zIndexMap[channelType];
            } else if (pluginName) {
                expectedZIndex = `8+ (plugin)`;
            }
            
            console.log(`  ${header} (${channelType || pluginName || 'unknown'}): expected=${expectedZIndex}, found=${elementType} z-index=${actualZIndex}`);
        });
        
        console.log('🔍 Z-INDEX DEBUG: End of initial values');
    }
    
    /**
     * Make channel strip draggable (only via drag button)
     */
    makeDraggable(channelStrip) {
        if (!this.dragDropEnabled) return;
        
        const dragButton = channelStrip.querySelector('.channel-drag-button');
        if (!dragButton) return;
        
        // Skip placeholder handles (non-functional)
        if (dragButton.classList.contains('placeholder')) return;
        
        // Make only the drag button draggable
        dragButton.draggable = true;
        
        // Store reference to the channel strip on the drag button
        dragButton.channelStrip = channelStrip;
        
        dragButton.addEventListener('dragstart', (e) => {
            this.currentDragElement = channelStrip;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            channelStrip.style.opacity = '0.5';
            
            // Create drag image from the entire channel strip
            const dragImage = channelStrip.cloneNode(true);
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        });
        
        dragButton.addEventListener('dragend', (e) => {
            channelStrip.style.opacity = '1';
            this.currentDragElement = null;
            // Clean up any remaining drop-target indicators
            document.querySelectorAll('.channel-strip.drop-target').forEach(strip => {
                strip.classList.remove('drop-target');
            });
            this.recalculateZIndexes();
        });
        
        // Still need dragover and drop on the entire strip for drop zones
        channelStrip.addEventListener('dragover', (e) => {
            e.preventDefault();
            // Add drop target indicator
            channelStrip.classList.add('drop-target');
        });
        
        channelStrip.addEventListener('dragleave', (e) => {
            // Remove drop target indicator when leaving
            channelStrip.classList.remove('drop-target');
        });
        
        channelStrip.addEventListener('drop', (e) => {
            e.preventDefault();
            // Remove drop target indicator
            channelStrip.classList.remove('drop-target');
            if (this.currentDragElement && this.currentDragElement !== channelStrip) {
                this.reorderChannelStrips(this.currentDragElement, channelStrip);
            }
        });
    }
    
    /**
     * Reorder channel strips based on drag-drop
     */
    reorderChannelStrips(draggedElement, targetElement) {
        // Check if either element is non-draggable (Audio or Kaleidoscope)
        const draggedChannel = draggedElement.getAttribute('data-channel');
        const targetChannel = targetElement.getAttribute('data-channel');
        
        // Prevent reordering if Audio or Kaleidoscope is involved
        if (draggedChannel === 'audioinput' || draggedChannel === 'kaleidoscope' ||
            targetChannel === 'audioinput' || targetChannel === 'kaleidoscope') {
            return;
        }
        
        const parent = targetElement.parentNode;
        const draggedRect = draggedElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        // Determine insertion position based on horizontal position
        if (draggedRect.left < targetRect.left) {
            // Insert before target
            parent.insertBefore(draggedElement, targetElement);
        } else {
            // Insert after target
            parent.insertBefore(draggedElement, targetElement.nextSibling);
        }
        
        // Save the new order to localStorage
        this.saveChannelOrder();
    }
    
    /**
     * Recalculate z-indexes based on channel strip order
     */
    recalculateZIndexes() {
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) return;
        
        const channelStrips = Array.from(mixerChannels.querySelectorAll('.channel-strip'));
        let currentZIndex = 1; // Start at z-index 1
        
        channelStrips.forEach((strip, index) => {
            const channelType = strip.getAttribute('data-channel');
            const pluginName = strip.getAttribute('data-plugin');
            
            let zIndex = null;
            
            // Skip audio input (no z-index) and kaleidoscope (fixed at 100)
            if (channelType === 'audioinput') {
                return; // No z-index for audio
            } else if (channelType === 'kaleidoscope') {
                zIndex = 100; // Fixed z-index for kaleidoscope
            } else {
                // Assign z-index based on position in DOM (left = low, right = high)
                zIndex = currentZIndex++;
            }
            
            // Apply z-index to the appropriate elements
            if (zIndex !== null) {
                this.applyZIndexToVisualization(channelType, pluginName, zIndex);
            }
        });
        
        // Debug: Show updated z-index values after drag-drop
        this.debugUpdatedZIndexes();
    }
    
    /**
     * Debug method to show updated z-index values after drag-drop
     */
    debugUpdatedZIndexes() {
        console.log('🔄 Z-INDEX DEBUG: Updated z-index values after drag-drop:');
        
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) return;
        
        const channelStrips = Array.from(mixerChannels.querySelectorAll('.channel-strip'));
        
        channelStrips.forEach((strip, index) => {
            const channelType = strip.getAttribute('data-channel');
            const pluginName = strip.getAttribute('data-plugin');
            const header = strip.querySelector('.channel-header')?.textContent;
            
            // Skip Audio Input, Kaleidoscope, and Display channels - they don't have visualizations
            if (channelType === 'audioinput' || channelType === 'kaleidoscope' || 
                channelType === 'display1' || channelType === 'display2' || channelType === 'display3') {
                return;
            }
            
            // Calculate the assigned z-index based on DOM position (same logic as recalculateZIndexes)
            let assignedZIndex = null;
            if (channelType === 'audioinput') {
                assignedZIndex = null; // No z-index for audio
            } else if (channelType === 'kaleidoscope') {
                assignedZIndex = 100; // Fixed z-index for kaleidoscope
            } else {
                // Calculate z-index based on position in DOM
                const draggableChannels = channelStrips.filter(s => {
                    const type = s.getAttribute('data-channel');
                    return type !== 'audioinput' && type !== 'kaleidoscope';
                });
                const position = draggableChannels.indexOf(strip);
                assignedZIndex = position + 1; // Start at z-index 1
            }
            
            // Try to find the actual visualization element and get its z-index
            let actualZIndex = 'not found';
            let elementType = 'unknown';
            
            if (pluginName) {
                // Plugin channel
                const pluginCanvas = document.getElementById(`${pluginName}-plugin-canvas`);
                if (pluginCanvas) {
                    actualZIndex = pluginCanvas.style.zIndex || 'not set';
                    elementType = 'plugin canvas';
                }
            } else if (channelType) {
                // Native visualization channels only
                switch (channelType) {
                    case 'backgroundimage':
                        // Background image DOM element
                        const bgElement = document.getElementById('bgImage');
                        if (bgElement) {
                            actualZIndex = bgElement.style.zIndex || 'not set';
                            elementType = 'background element';
                        }
                        break;
                    case 'videoinput':
                        const videoElement = document.getElementById('bgVideo') || document.getElementById('bgVideoPlaceholder');
                        if (videoElement) {
                            actualZIndex = videoElement.style.zIndex || 'not set';
                            elementType = videoElement.id === 'bgVideo' ? 'real video' : 'placeholder';
                        }
                        break;
                    case 'amvisualizer':
                        const amCanvas = document.querySelector('canvas[data-audiomotion], #visualizer canvas:first-child');
                        if (amCanvas) {
                            actualZIndex = amCanvas.style.zIndex || 'not set';
                            elementType = 'AM canvas';
                        }
                        break;
                    case 'infinitezoom':
                        // Only use canvas if it has the correct data-visualization attribute
                        let izCanvas = document.querySelector('canvas[data-visualization="infinitezoom"]');
                        if (!izCanvas && window.visualizer?.infiniteZoom?.canvas) {
                            const fallbackCanvas = window.visualizer.infiniteZoom.canvas;
                            if (fallbackCanvas.getAttribute('data-visualization') === 'infinitezoom') {
                                izCanvas = fallbackCanvas;
                            }
                        }
                        if (izCanvas) {
                            actualZIndex = izCanvas.style.zIndex || 'not set';
                            elementType = 'IZ canvas';
                        }
                        break;
                    case 'blobs':
                        const blobsCanvas = document.getElementById('blobs-plugin-canvas');
                        if (blobsCanvas) {
                            actualZIndex = blobsCanvas.style.zIndex || 'not set';
                            elementType = 'Blobs canvas';
                        }
                        break;
                    case 'starfall':
                        const starfallCanvas = document.querySelector('#visualizationContainer canvas[style*="z-index: 4"]');
                        if (starfallCanvas) {
                            actualZIndex = starfallCanvas.style.zIndex;
                            elementType = 'Starfall canvas';
                        }
                        break;
                    case 'fluidity':
                        const fluidCanvas = document.getElementById('fluidcanvas');
                        if (fluidCanvas) {
                            actualZIndex = fluidCanvas.style.zIndex || 'not set';
                            elementType = 'Fluid canvas';
                        }
                        break;
                    case 'nebula':
                        // Only use canvas if it has the correct data-visualization attribute
                        let nebulaCanvas = document.querySelector('canvas[data-visualization="nebula"]');
                        if (!nebulaCanvas && window.visualizer?.nebulaVisualization?.canvas) {
                            const fallbackCanvas = window.visualizer.nebulaVisualization.canvas;
                            if (fallbackCanvas.getAttribute('data-visualization') === 'nebula') {
                                nebulaCanvas = fallbackCanvas;
                            }
                        }
                        if (nebulaCanvas) {
                            actualZIndex = nebulaCanvas.style.zIndex || 'not set';
                            elementType = 'Nebula canvas';
                        }
                        break;
                }
            }
            
            // Standard status check for all elements
            const status = (assignedZIndex == actualZIndex) ? '✅' : '❌';
            console.log(`  ${header} (${channelType || pluginName || 'unknown'}): assigned=${assignedZIndex}, actual=${actualZIndex} ${status}`);
        });
        
        console.log('🔄 Z-INDEX DEBUG: End of updated values');
    }
    
    /**
     * Apply z-index to the actual visualization elements
     */
    applyZIndexToVisualization(channelType, pluginName, zIndex) {
        // Handle plugin channels
        if (pluginName) {
            const plugin = window.pluginManager?.getPlugin(pluginName);
            if (plugin && plugin.setZIndex) {
                plugin.setZIndex(zIndex);
            }
            
            // Also apply to plugin canvas if it exists
            const pluginCanvas = document.querySelector(`canvas[data-visualization="plugin-${pluginName}"]`) ||
                               document.getElementById(`${pluginName}-plugin-canvas`);
            if (pluginCanvas) {
                pluginCanvas.style.zIndex = zIndex;
            }
            return;
        }
        
        // Handle native visualization channels
        // Use data-visualization attributes for reliable canvas detection
        switch (channelType) {
            case 'backgroundimage':
                // Background image DOM element
                const bgElement = document.getElementById('bgImage');
                if (bgElement) {
                    bgElement.style.zIndex = zIndex;
                    // Force stacking context
                    bgElement.style.position = 'absolute';
                }
                break;
                
            case 'videoinput':
                // Video element (prefer real video over placeholder)
                const videoElement = document.getElementById('bgVideo') || document.getElementById('bgVideoPlaceholder');
                if (videoElement) {
                    videoElement.style.zIndex = zIndex;
                    videoElement.style.position = 'absolute';
                    // If we have a real video element, hide the placeholder
                    if (videoElement.id === 'bgVideo') {
                        const placeholder = document.getElementById('bgVideoPlaceholder');
                        if (placeholder) placeholder.style.display = 'none';
                    }
                }
                break;
                
            case 'amvisualizer':
                // AudioMotion canvas - use data attribute or direct reference
                const amCanvas = document.querySelector('canvas[data-visualization="amvisualizer"]') ||
                               (window.visualizer?.audioMotion?.canvas);
                if (amCanvas) {
                    amCanvas.style.zIndex = zIndex;
                    amCanvas.style.position = 'absolute';
                }
                break;
                
            case 'infinitezoom':
                // Only use canvas if it has the correct data-visualization attribute
                let izCanvas = document.querySelector('canvas[data-visualization="infinitezoom"]');
                if (!izCanvas && window.visualizer?.infiniteZoom?.canvas) {
                    const fallbackCanvas = window.visualizer.infiniteZoom.canvas;
                    if (fallbackCanvas.getAttribute('data-visualization') === 'infinitezoom') {
                        izCanvas = fallbackCanvas;
                    }
                }
                if (izCanvas) {
                    izCanvas.style.zIndex = zIndex;
                    izCanvas.style.position = 'absolute';
                }
                break;
                
            case 'blobs':
                // Blobs canvas - now handled by plugin system
                const blobsCanvas = document.getElementById('blobs-plugin-canvas');
                if (blobsCanvas) blobsCanvas.style.zIndex = zIndex;
                break;
                
            case 'starfall':
                // Starfall (WebGL) canvas - use data attribute or direct reference
                const starfallCanvas = document.querySelector('canvas[data-visualization="starfall"]') ||
                                     (window.visualizer?.webGLVisualization?.canvas);
                if (starfallCanvas) starfallCanvas.style.zIndex = zIndex;
                break;
                
            case 'fluidity':
                // Fluidity (Fluid Dynamics) canvas - use data attribute or direct reference
                const fluidityCanvas = document.querySelector('canvas[data-visualization="fluidity"]') ||
                                     (window.visualizer?.fluidDynamics?.canvas);
                if (fluidityCanvas) {
                    fluidityCanvas.style.zIndex = zIndex;
                    fluidityCanvas.style.position = 'absolute';
                }
                break;
                
            case 'nebula':
                // Only use canvas if it has the correct data-visualization attribute
                let nebulaCanvas = document.querySelector('canvas[data-visualization="nebula"]');
                if (!nebulaCanvas && window.visualizer?.nebulaVisualization?.canvas) {
                    const fallbackCanvas = window.visualizer.nebulaVisualization.canvas;
                    if (fallbackCanvas.getAttribute('data-visualization') === 'nebula') {
                        nebulaCanvas = fallbackCanvas;
                    }
                }
                if (nebulaCanvas) {
                    nebulaCanvas.style.zIndex = zIndex;
                    nebulaCanvas.style.position = 'absolute';
                }
                break;
                
            case 'kaleidoscope':
                // Kaleidoscope canvases - there are multiple
                const kaleidoscopeVideoCanvas = window.visualizer?.kaleidoscopeVideoCanvas;
                const kaleidoscopeVizCanvas = window.visualizer?.kaleidoscopeVizCanvas;
                if (kaleidoscopeVideoCanvas) kaleidoscopeVideoCanvas.style.zIndex = zIndex;
                if (kaleidoscopeVizCanvas) kaleidoscopeVizCanvas.style.zIndex = zIndex + 1; // Viz canvas on top
                break;
        }
    }
    
    
    /**
     * Get channel strip for plugin
     */
    getChannelStrip(pluginName) {
        return this.channelStrips.get(pluginName);
    }
    
    /**
     * Save current channel order to localStorage
     */
    saveChannelOrder() {
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) return;
        
        // Only save draggable channels (exclude Display channels and those without data-channel)
        const channelStrips = Array.from(mixerChannels.querySelectorAll('.channel-strip[data-channel]:not(.display-channel)'));
        const channelOrder = channelStrips.map(strip => {
            const channelType = strip.getAttribute('data-channel');
            const pluginName = strip.getAttribute('data-plugin');
            
            return {
                type: channelType,
                plugin: pluginName,
                id: pluginName || channelType
            };
        });
        
        const orderData = {
            channelOrder: channelOrder,
            lastUpdated: Date.now()
        };
        
        try {
            localStorage.setItem('freque-channel-order', JSON.stringify(orderData));
        } catch (error) {
            console.error('🔌 Failed to save channel order:', error);
        }
    }
    
    /**
     * Load channel order from localStorage and reorder channels
     */
    loadChannelOrder() {
        try {
            const savedData = localStorage.getItem('freque-channel-order');
            if (!savedData) {
                return;
            }
            
            const orderData = JSON.parse(savedData);
            if (!orderData.channelOrder || !Array.isArray(orderData.channelOrder)) {
                return;
            }
            
            this.applyChannelOrder(orderData.channelOrder);
            
        } catch (error) {
            console.error('🔌 Failed to load channel order:', error);
        }
    }
    
    /**
     * Apply a specific channel order to the mixer
     */
    applyChannelOrder(savedOrder) {
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) return;
        
        const currentStrips = Array.from(mixerChannels.querySelectorAll('.channel-strip'));
        const stripMap = new Map();
        
        // Create a map of current strips by their identifier
        currentStrips.forEach(strip => {
            const channelType = strip.getAttribute('data-channel');
            const pluginName = strip.getAttribute('data-plugin');
            const id = pluginName || channelType;
            stripMap.set(id, strip);
        });
        
        // Reorder strips according to saved order
        const orderedStrips = [];
        const usedIds = new Set();
        
        // First, add strips in saved order
        savedOrder.forEach(item => {
            const strip = stripMap.get(item.id);
            if (strip) {
                orderedStrips.push(strip);
                usedIds.add(item.id);
            }
        });
        
        // Then add any new strips that weren't in the saved order
        currentStrips.forEach(strip => {
            const channelType = strip.getAttribute('data-channel');
            const pluginName = strip.getAttribute('data-plugin');
            const id = pluginName || channelType;
            
            if (!usedIds.has(id)) {
                // Insert new plugins before Kaleidoscope, others at their default position
                if (pluginName) {
                    // Find position before Kaleidoscope
                    const kaleidoscopeIndex = orderedStrips.findIndex(s => 
                        s.getAttribute('data-channel') === 'kaleidoscope');
                    if (kaleidoscopeIndex !== -1) {
                        orderedStrips.splice(kaleidoscopeIndex, 0, strip);
                    } else {
                        orderedStrips.push(strip);
                    }
                } else {
                    orderedStrips.push(strip);
                }
            }
        });
        
        // Apply the new order to the DOM
        orderedStrips.forEach(strip => {
            mixerChannels.appendChild(strip);
        });
        
        // Recalculate z-indexes after reordering
        this.recalculateZIndexes();
    }
    
    /**
     * Clear saved channel order (reset to default)
     */
    clearSavedChannelOrder() {
        try {
            localStorage.removeItem('freque-channel-order');
            console.log('🔌 Cleared saved channel order from localStorage');
        } catch (error) {
            console.error('🔌 Failed to clear saved channel order:', error);
        }
    }

    /**
     * Reset to default channel order (for debugging)
     */
    resetToDefaultOrder() {
        this.clearSavedChannelOrder();
        console.log('🔌 Resetting to default order - please refresh the page');
    }
    
    /**
     * Debug method to inspect current localStorage data
     */
    debugChannelOrder() {
        const savedData = localStorage.getItem('freque-channel-order');
        if (savedData) {
            console.log('🔌 Current localStorage data:', JSON.parse(savedData));
        } else {
            console.log('🔌 No localStorage data found');
        }
        
        const currentOrder = Array.from(document.querySelectorAll('.mixer-channels .channel-strip')).map(strip => ({
            header: strip.querySelector('.channel-header')?.textContent,
            dataChannel: strip.getAttribute('data-channel'),
            dataPlugin: strip.getAttribute('data-plugin'),
            classes: strip.className
        }));
        console.log('🔌 Current DOM order:', currentOrder);
    }
    
    /**
     * Get actual z-index value and detailed canvas info for debugging
     */
    getActualZIndexWithInfo(channelType) {
        switch (channelType) {
            case 'backgroundimage':
                // Background image DOM element
                const bgElement = document.getElementById('bgImage');
                return {
                    zIndex: bgElement ? bgElement.style.zIndex || 'not set' : 'not found',
                    info: bgElement ? `Element found: ${bgElement.tagName}#${bgElement.id}` : 'Element not found'
                };
                
            case 'videoinput':
                const videoElement = document.getElementById('bgVideo') || document.getElementById('bgVideoPlaceholder');
                const elementType = videoElement?.id === 'bgVideo' ? 'real video' : 'placeholder';
                return {
                    zIndex: videoElement ? videoElement.style.zIndex || 'not set' : 'not found',
                    info: videoElement ? `Element found: ${videoElement.tagName}#${videoElement.id} (${elementType})` : 'Element not found'
                };
                
            case 'amvisualizer':
                const amCanvas = document.querySelector('canvas[data-visualization="amvisualizer"]') || window.visualizer?.audioMotion?.canvas;
                return {
                    zIndex: amCanvas ? amCanvas.style.zIndex || 'not set' : 'not found',
                    info: amCanvas ? `Canvas found: ID=${amCanvas.id || 'none'}, data-viz=${amCanvas.getAttribute('data-visualization')}` : 'Canvas not found'
                };
                
            case 'infinitezoom':
                // Only use canvas if it has the correct data-visualization attribute
                let izCanvas = document.querySelector('canvas[data-visualization="infinitezoom"]');
                if (!izCanvas && window.visualizer?.infiniteZoom?.canvas) {
                    const fallbackCanvas = window.visualizer.infiniteZoom.canvas;
                    if (fallbackCanvas.getAttribute('data-visualization') === 'infinitezoom') {
                        izCanvas = fallbackCanvas;
                    }
                }
                return {
                    zIndex: izCanvas ? izCanvas.style.zIndex || 'not set' : 'not found',
                    info: izCanvas ? `Canvas found: ID=${izCanvas.id || 'none'}, data-viz=${izCanvas.getAttribute('data-visualization')}` : 'Canvas not found'
                };
                
            case 'blobs':
                const blobsCanvas = document.getElementById('blobs-plugin-canvas');
                return {
                    zIndex: blobsCanvas ? blobsCanvas.style.zIndex || 'not set' : 'not found',
                    info: blobsCanvas ? `Plugin canvas found: ID=${blobsCanvas.id}` : 'Plugin canvas not found'
                };
                
            case 'starfall':
                const starfallCanvas = document.querySelector('canvas[data-visualization="starfall"]') || window.visualizer?.webGLVisualization?.canvas;
                return {
                    zIndex: starfallCanvas ? starfallCanvas.style.zIndex || 'not set' : 'not found',
                    info: starfallCanvas ? `Canvas found: ID=${starfallCanvas.id || 'none'}, data-viz=${starfallCanvas.getAttribute('data-visualization')}` : 'Canvas not found'
                };
                
            case 'fluidity':
                const fluidityCanvas = document.querySelector('canvas[data-visualization="fluidity"]') || window.visualizer?.fluidDynamics?.canvas;
                return {
                    zIndex: fluidityCanvas ? fluidityCanvas.style.zIndex || 'not set' : 'not found',
                    info: fluidityCanvas ? `Canvas found: ID=${fluidityCanvas.id || 'none'}, data-viz=${fluidityCanvas.getAttribute('data-visualization')}` : 'Canvas not found'
                };
                
            case 'nebula':
                // Handle multiple nebula canvases - prefer one with z-index
                const nebulaCanvases = document.querySelectorAll('canvas[data-visualization="nebula"]');
                let nebulaCanvas = null;
                let debugInfo = '';
                
                if (nebulaCanvases.length > 1) {
                    nebulaCanvas = Array.from(nebulaCanvases).find(canvas => canvas.style.zIndex) || nebulaCanvases[0];
                    debugInfo = `Multiple canvases found (${nebulaCanvases.length}), selected one with z-index`;
                } else if (nebulaCanvases.length === 1) {
                    nebulaCanvas = nebulaCanvases[0];
                    debugInfo = 'Single canvas found';
                } else {
                    // Only use direct reference if it has correct data-visualization attribute
                    const fallbackCanvas = window.visualizer?.nebulaVisualization?.canvas;
                    if (fallbackCanvas && fallbackCanvas.getAttribute('data-visualization') === 'nebula') {
                        nebulaCanvas = fallbackCanvas;
                        debugInfo = 'Using direct reference';
                    } else {
                        debugInfo = 'No valid canvas found';
                    }
                }
                
                return {
                    zIndex: nebulaCanvas ? nebulaCanvas.style.zIndex || 'not set' : 'not found',
                    info: nebulaCanvas ? `${debugInfo}: ID=${nebulaCanvas.id || 'none'}, data-viz=${nebulaCanvas.getAttribute('data-visualization')}` : 'Canvas not found'
                };
                
            default:
                return {
                    zIndex: 'unknown',
                    info: 'Unknown channel type'
                };
        }
    }
}

// Initialize mixer integration
window.addEventListener('DOMContentLoaded', () => {
    window.pluginMixerIntegration = new PluginMixerIntegration();
});

// Make globally available
window.PluginMixerIntegration = PluginMixerIntegration;
