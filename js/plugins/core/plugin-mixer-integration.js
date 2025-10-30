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
            'audio': 1,
            'video': 1, 
            'audioMotion': 2,
            'infiniteZoom': 3,
            // 4-10 reserved
            // 11+ for plugins (auto-assigned)
            'kaleidoscope': 100 // always top
        };
        
        this.init();
    }
    
    init() {
        // Wait for mixer to be ready
        this.waitForMixer().then(() => {
            this.setupDragDrop();
            console.log('🔌 Plugin Mixer Integration initialized');
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
        
        console.log(`🔌 Created proper mixer channel strip for "${plugin.pluginName}"`);
        return channelStrip;
    }
    
    /**
     * Create channel strip HTML following the existing mixer pattern (Infinite Zoom style)
     */
    createChannelStripHTML(plugin) {
        return `
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
        console.log('🔌 Drag-drop reordering system initialized');
    }
    
    /**
     * Make channel strip draggable
     */
    makeDraggable(channelStrip) {
        if (!this.dragDropEnabled) return;
        
        channelStrip.draggable = true;
        channelStrip.style.cursor = 'move';
        
        channelStrip.addEventListener('dragstart', (e) => {
            this.currentDragElement = channelStrip;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            channelStrip.style.opacity = '0.5';
        });
        
        channelStrip.addEventListener('dragend', (e) => {
            channelStrip.style.opacity = '1';
            this.currentDragElement = null;
            this.recalculateZIndexes();
        });
        
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
        const parent = targetElement.parentNode;
        const draggedRect = draggedElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        
        if (draggedRect.left < targetRect.left) {
            // Insert before target
            parent.insertBefore(draggedElement, targetElement);
        } else {
            // Insert after target
            parent.insertBefore(draggedElement, targetElement.nextSibling);
        }
        
        console.log('🔌 Channel strips reordered');
    }
    
    /**
     * Recalculate z-indexes based on channel strip order
     */
    recalculateZIndexes() {
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) return;
        
        const channelStrips = Array.from(mixerChannels.querySelectorAll('.channel-strip'));
        let zIndex = 1;
        
        channelStrips.forEach((strip, index) => {
            const pluginName = strip.getAttribute('data-plugin');
            
            // Skip kaleidoscope (always z-index 100)
            if (strip.getAttribute('data-channel') === 'kaleidoscope') {
                zIndex = 100;
            } else {
                // Assign z-index based on position
                if (pluginName) {
                    const plugin = window.pluginManager?.getPlugin(pluginName);
                    if (plugin) {
                        plugin.setZIndex(zIndex);
                    }
                }
                zIndex++;
            }
        });
        
        console.log('🔌 Z-indexes recalculated based on channel strip order');
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
}

// Initialize mixer integration
window.addEventListener('DOMContentLoaded', () => {
    window.pluginMixerIntegration = new PluginMixerIntegration();
});

// Make globally available
window.PluginMixerIntegration = PluginMixerIntegration;
