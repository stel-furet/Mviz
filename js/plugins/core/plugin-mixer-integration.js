/**
 * Plugin Mixer Integration System
 * Handles proper integration of plugin channel strips with the existing Freque mixer
 * Implements drag-drop reordering and z-index management as specified in the plan
 */

class PluginMixerIntegration {
    constructor() {
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
            'nebula': 7,              // Nebula
            'plugins': 8,             // First plugin starts at 8
            'kaleidoscope': 100       // Always top, non-movable
        };
        
        this.init();
    }
    
    init() {
        // Wait for mixer to be ready
        this.waitForMixer().then(() => {
            this.setupDragDrop();
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
            
            <!-- Remove Plugin Button (only for plugin strips) -->
            <div class="channel-controls-section">
                <button class="btn-danger plugin-remove-btn" data-plugin="${plugin.pluginName}" title="Remove ${plugin.metadata.name} Plugin">
                    Remove Plugin
                </button>
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
        
        // Remove button
        const removeBtn = channelStrip.querySelector('.plugin-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (confirm(`Remove plugin "${plugin.metadata.name}"?`)) {
                    this.removePlugin(plugin.pluginName);
                }
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
        
        // Load saved channel order or initialize default z-indexes
        this.loadChannelOrder();
        
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
            if (dragButton) {
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
    }
    
    /**
     * Make channel strip draggable (only via drag button)
     */
    makeDraggable(channelStrip) {
        if (!this.dragDropEnabled) return;
        
        const dragButton = channelStrip.querySelector('.channel-drag-button');
        if (!dragButton) return;
        
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
            this.recalculateZIndexes();
        });
        
        // Still need dragover and drop on the entire strip for drop zones
        channelStrip.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        channelStrip.addEventListener('drop', (e) => {
            e.preventDefault();
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
        let pluginZIndex = 8; // Plugins start at z-index 8
        
        channelStrips.forEach((strip, index) => {
            const channelType = strip.getAttribute('data-channel');
            const pluginName = strip.getAttribute('data-plugin');
            
            let zIndex = null;
            
            // Determine z-index based on channel type
            if (this.zIndexMap.hasOwnProperty(channelType)) {
                zIndex = this.zIndexMap[channelType];
            } else if (pluginName) {
                // Plugin channel - assign incrementing z-index starting at 8
                zIndex = pluginZIndex++;
            }
            
            // Apply z-index to the appropriate elements
            if (zIndex !== null) {
                this.applyZIndexToVisualization(channelType, pluginName, zIndex);
            }
        });
        
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
            const pluginCanvas = document.getElementById(`${pluginName}-plugin-canvas`);
            if (pluginCanvas) {
                pluginCanvas.style.zIndex = zIndex;
            }
            return;
        }
        
        // Handle native visualization channels
        // Most visualizations create canvases dynamically, so we need to find them by other means
        switch (channelType) {
            case 'backgroundimage':
                // Background image might be applied to a specific element
                const bgElement = document.querySelector('#visualizer .background-image, #visualizationContainer .background-image');
                if (bgElement) bgElement.style.zIndex = zIndex;
                break;
                
            case 'videoinput':
                // Video element is likely in the visualizer container
                const videoElement = document.querySelector('#visualizer video, #visualizationContainer video');
                if (videoElement) videoElement.style.zIndex = zIndex;
                break;
                
            case 'amvisualizer':
                // AudioMotion canvas - look for audiomotion canvas
                const amCanvas = document.querySelector('canvas[data-audiomotion], #visualizer canvas:first-child');
                if (amCanvas) amCanvas.style.zIndex = zIndex;
                break;
                
            case 'infinitezoom':
                // Infinite Zoom canvas - created dynamically by InfiniteZoomVisualization
                const izCanvas = document.querySelector('#visualizationContainer canvas[style*="z-index: 3"], #visualizationContainer canvas[style*="zIndex: 3"]');
                if (izCanvas) izCanvas.style.zIndex = zIndex;
                break;
                
            case 'blobs':
                // Blobs canvas - now handled by plugin system
                const blobsCanvas = document.getElementById('blobs-plugin-canvas');
                if (blobsCanvas) blobsCanvas.style.zIndex = zIndex;
                break;
                
            case 'starfall':
                // Starfall (WebGL) canvas - created dynamically
                const starfallCanvas = document.querySelector('#visualizationContainer canvas[style*="z-index: 4"], #visualizationContainer canvas[style*="zIndex: 4"]');
                if (starfallCanvas) starfallCanvas.style.zIndex = zIndex;
                break;
                
            case 'nebula':
                // Nebula canvas - created dynamically
                const nebulaCanvas = document.querySelector('#visualizationContainer canvas[style*="z-index: 7"], #visualizationContainer canvas[style*="zIndex: 7"]');
                if (nebulaCanvas) nebulaCanvas.style.zIndex = zIndex;
                break;
                
            case 'kaleidoscope':
                // Kaleidoscope canvas - look for kaleidoscope-specific canvas
                const kaleidoscopeCanvas = document.querySelector('#visualizer canvas[data-kaleidoscope], #kaleidoscopeCanvas');
                if (kaleidoscopeCanvas) kaleidoscopeCanvas.style.zIndex = zIndex;
                break;
        }
    }
    
    /**
     * Remove plugin and its channel strip
     */
    removePlugin(pluginName) {
        // Remove from plugin manager
        if (window.pluginManager) {
            window.pluginManager.unregisterPlugin(pluginName);
        }
        
        // Remove channel strip
        const channelStrip = this.channelStrips.get(pluginName);
        if (channelStrip && channelStrip.parentNode) {
            channelStrip.parentNode.removeChild(channelStrip);
        }
        
        this.channelStrips.delete(pluginName);
        
        // Recalculate z-indexes
        this.recalculateZIndexes();
        
        console.log(`🔌 Plugin "${pluginName}" removed`);
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
        
        const channelStrips = Array.from(mixerChannels.querySelectorAll('.channel-strip'));
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
        } catch (error) {
            console.error('🔌 Failed to clear saved channel order:', error);
        }
    }
}

// Initialize mixer integration
window.addEventListener('DOMContentLoaded', () => {
    window.pluginMixerIntegration = new PluginMixerIntegration();
});

// Make globally available
window.PluginMixerIntegration = PluginMixerIntegration;
