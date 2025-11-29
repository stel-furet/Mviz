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
        
        // Load plugin credits
        this.loadPluginCredits(plugin.pluginName, plugin.metadata.credits);
        
        // Apply z-index to the new plugin (on top of existing plugins, below Kaleidoscope)
        this.recalculateZIndexes();
        
        // Save the updated channel order to localStorage
        this.saveChannelOrder();
        
        return channelStrip;
    }
    
    /**
     * Remove a plugin's channel strip from the mixer
     */
    removePluginChannelStrip(pluginName) {
        
        const channelStrip = this.channelStrips.get(pluginName);
        if (!channelStrip) {
            console.warn(`🔌 No channel strip found for plugin: ${pluginName}`);
            return false;
        }
        
        // Remove the DOM element
        if (channelStrip.parentNode) {
            channelStrip.parentNode.removeChild(channelStrip);
        }
        
        // Remove from tracking map
        this.channelStrips.delete(pluginName);
        
        // Recalculate z-indexes for remaining plugins
        this.recalculateZIndexes();
        
        // Save the updated channel order to localStorage
        this.saveChannelOrder();
        
        return true;
    }
    
    /**
     * Load and display plugin credits text
     */
    loadPluginCredits(pluginName, creditsText) {
        const channelStrip = this.channelStrips.get(pluginName);
        if (!channelStrip) {
            return;
        }
        
        const creditsContainer = channelStrip.querySelector(`.plugin-credits-text[data-plugin="${pluginName}"]`);
        const creditsSection = channelStrip.querySelector('.channel-credits-section');
        
        if (!creditsContainer || !creditsSection) {
            return;
        }
        
        // If credits text exists and is not null/empty
        if (creditsText && creditsText.trim() !== '') {
            // Truncate to 140 characters with ellipsis if longer
            let displayText = creditsText.trim();
            if (displayText.length > 140) {
                displayText = displayText.substring(0, 137) + '...';
            }
            
            creditsContainer.textContent = displayText;
            creditsSection.style.display = '';
        } else {
            // Hide the entire credits section if no credits
            creditsSection.style.display = 'none';
        }
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
            <div class="channel-header" data-hide-label="true">${plugin.metadata.name}</div>
            
            <!-- ON/OFF Toggle -->
            <div class="channel-toggle-section">
                <button class="btn-toggle plugin-power-btn" data-plugin="${plugin.pluginName}" title="Toggle ${plugin.metadata.name}">
                    <span class="toggle-text">${plugin.metadata.name}</span>
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
                <!-- Color Morphing Controls -->
                <div class="control-mini-group plugin-color-morph-group" data-plugin="${plugin.pluginName}" style="display: none;">
                    <button class="btn-morph plugin-color-morph-btn" data-plugin="${plugin.pluginName}" title="Color Morph">
                        <span class="morph-btn-text">Start Morph</span>
                    </button>
                </div>
                <div class="control-mini-group plugin-color-morph-speed-group" data-plugin="${plugin.pluginName}" style="display: none;">
                    <select class="dropdown-selector-mixer plugin-color-morph-speed" data-plugin="${plugin.pluginName}">
                        <option value="slow">Slow</option>
                        <option value="medium" selected>Medium</option>
                        <option value="fast">Fast</option>
                        <option value="ultra">Ultra</option>
                        <option value="energy">Energy</option>
                    </select>
                </div>
                
                <!-- Energy Bar (hidden by default, shown when speed is 'energy') -->
                <div class="energy-container plugin-color-morph-energy" data-plugin="${plugin.pluginName}" style="display: none;">
                    <div class="energy-label">Energy</div>
                    <div class="energy-bar">
                        <div class="energy-fill plugin-color-morph-energy-fill" data-plugin="${plugin.pluginName}"></div>
                    </div>
                </div>
                
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
            
            <!-- Credits Section -->
            <div class="channel-credits-section">
                <div class="control-section-header">Credits</div>
                <div class="plugin-credits-text" data-plugin="${plugin.pluginName}">
                    <!-- Credits text will be loaded here -->
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
                plugin.toggle();
                this.updatePowerButton(plugin.pluginName);
            });
        }
        
        // Opacity slider - use the same vertical slider system as native channels
        const opacitySlider = channelStrip.querySelector('.plugin-opacity-slider');
        const opacityValue = channelStrip.querySelector('.plugin-opacity-value');
        if (opacitySlider && opacityValue) {
            this.initializePluginVerticalSlider(opacitySlider, (value) => {
                plugin.setOpacity(value);
                opacityValue.textContent = `${value}`;
            });
        }
        
        // Color Morph button
        const colorMorphBtn = channelStrip.querySelector('.plugin-color-morph-btn');
        if (colorMorphBtn) {
            colorMorphBtn.addEventListener('click', () => {
                const isActive = plugin.toggleColorMorphing();
                this.updateColorMorphButton(plugin.pluginName, isActive);
            });
        }
        
        // Color Morph speed selector
        const colorMorphSpeed = channelStrip.querySelector('.plugin-color-morph-speed');
        if (colorMorphSpeed) {
            colorMorphSpeed.addEventListener('change', (e) => {
                plugin.setColorMorphSpeed(e.target.value);
                this.updateColorMorphEnergyBar(plugin.pluginName, e.target.value);
            });
        }
        
        // Check if plugin supports color morphing and show/hide controls
        if (plugin.getColorSchemes && typeof plugin.getColorSchemes === 'function') {
            const schemes = plugin.getColorSchemes();
            if (schemes && schemes.length > 1) {
                // Show color morph controls
                const morphGroup = channelStrip.querySelector('.plugin-color-morph-group');
                const speedGroup = channelStrip.querySelector('.plugin-color-morph-speed-group');
                if (morphGroup) morphGroup.style.display = '';
                if (speedGroup) speedGroup.style.display = '';
            }
        }
    }
    
    /**
     * Update color morph energy bar visibility and value
     */
    updateColorMorphEnergyBar(pluginName, speed) {
        const channelStrip = this.channelStrips.get(pluginName);
        if (!channelStrip) return;
        
        const energyContainer = channelStrip.querySelector('.plugin-color-morph-energy');
        
        if (energyContainer) {
            // Show energy bar only when speed is 'energy'
            energyContainer.style.display = (speed === 'energy') ? 'block' : 'none';
        }
    }
    
    /**
     * Initialize vertical slider for plugins (copied from main.js initializeVerticalSlider)
     */
    initializePluginVerticalSlider(sliderElement, onValueChange) {
        const track = sliderElement.querySelector('.vertical-slider-track');
        const thumb = sliderElement.querySelector('.vertical-slider-thumb');
        const fill = sliderElement.querySelector('.vertical-slider-fill');
        const min = parseInt(sliderElement.dataset.min) || 0;
        const max = parseInt(sliderElement.dataset.max) || 100;
        let value = parseInt(sliderElement.dataset.value) || 100;
        let isDragging = false;
        
        // Set thumb and fill position based on value (matching native system exactly)
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
                fill.style.transition = 'none';
            } else {
                thumb.style.transition = '';
                fill.style.transition = '';
            }
            
            thumb.style.top = `${Math.round(top)}px`;
            fill.style.height = `${percentage * 100}%`;
            
            if (immediate) {
                setTimeout(() => {
                    thumb.style.transition = '';
                    fill.style.transition = '';
                }, 0);
            }
        };
        
        // Calculate value from mouse position (matching native system exactly)
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
            return Math.round(min + (percentage * (max - min)));
        };
        
        // Mouse events
        const handleMouseDown = (e) => {
            isDragging = true;
            value = calculateValueFromPosition(e.clientY);
            updateThumbPosition(true);
            onValueChange(value);
            e.preventDefault();
        };
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            value = calculateValueFromPosition(e.clientY);
            updateThumbPosition(true);
            onValueChange(value);
            e.preventDefault();
        };
        
        const handleMouseUp = () => {
            isDragging = false;
        };
        
        // Add event listeners
        track.addEventListener('mousedown', handleMouseDown);
        thumb.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Touch events for mobile
        const handleTouchStart = (e) => {
            isDragging = true;
            const touch = e.touches[0];
            value = calculateValueFromPosition(touch.clientY);
            updateThumbPosition(true);
            onValueChange(value);
            e.preventDefault();
        };
        
        const handleTouchMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            value = calculateValueFromPosition(touch.clientY);
            updateThumbPosition(true);
            onValueChange(value);
            e.preventDefault();
        };
        
        const handleTouchEnd = () => {
            isDragging = false;
        };
        
        track.addEventListener('touchstart', handleTouchStart, { passive: false });
        thumb.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        
        // Allow X key to bubble up when slider is focused
        sliderElement.addEventListener('keydown', (e) => {
            if (e.key === 'x' || e.key === 'X') {
                // Let the event bubble up to the main handler
                return;
            }
        });
        
        // Initial position
        updateThumbPosition(true);
        
        // Return object with setValue method for external control
        return {
            setValue: (newValue) => {
                value = Math.max(min, Math.min(max, newValue));
                sliderElement.dataset.value = value;
                updateThumbPosition(true);
            },
            getValue: () => value
        };
    }
    
    /**
     * Update power button state
     */
    updatePowerButton(pluginName) {
        const plugin = window.pluginManager?.getPlugin(pluginName);
        const channelStrip = this.channelStrips.get(pluginName);
        if (!plugin || !channelStrip) return;
        
        const powerBtn = channelStrip.querySelector('.plugin-power-btn');
        
        if (powerBtn) {
            // Update button state only - text stays as plugin name
            if (plugin.isActive) {
                powerBtn.classList.add('active');
            } else {
                powerBtn.classList.remove('active');
            }
        }
    }
    
    /**
     * Update color morph button state
     */
    updateColorMorphButton(pluginName, isActive) {
        const channelStrip = this.channelStrips.get(pluginName);
        if (!channelStrip) return;
        
        const morphBtn = channelStrip.querySelector('.plugin-color-morph-btn');
        
        if (morphBtn) {
            const btnText = morphBtn.querySelector('.morph-btn-text');
            
            if (isActive) {
                morphBtn.classList.add('active');
                if (btnText) btnText.textContent = 'Stop Morph';
            } else {
                morphBtn.classList.remove('active');
                if (btnText) btnText.textContent = 'Start Morph';
            }
        }
    }
    
    /**
     * Add plugin controls to the channel strip
     */
    addPluginControls(pluginName, controls) {
        // Plugin controls debug disabled
        const channelStrip = this.channelStrips.get(pluginName);
        if (!channelStrip) {
            console.error(`🎛️ DEBUG: No channel strip found for plugin "${pluginName}"`);
            return;
        }
        
        const controlsContainer = channelStrip.querySelector('.plugin-controls-container');
        if (!controlsContainer) {
            console.error(`🎛️ DEBUG: No controls container found for plugin "${pluginName}"`);
            return;
        }
        
        // Get presets container for colorScheme control
        const presetsContainer = channelStrip.querySelector('.plugin-presets-container');
        
        // Get plugin reference for dial color customization
        const plugin = window.pluginManager?.getPlugin(pluginName);
        
        // Clear existing controls
        controlsContainer.innerHTML = '';
        
        // Store current plugin temporarily for dial color access
        this.currentRenderingPlugin = plugin || null;
        
        // Add each control
        controls.forEach((controlConfig, controlId) => {
            // Control creation debug disabled
            const result = this.createControlElement(controlId, controlConfig);
            if (result) {
                const controlElement = result.element || result;
                
                // Special case: colorScheme dropdown goes in presets container, right after Reset button
                if (controlId === 'colorScheme' && presetsContainer) {
                    // Check if colorScheme already exists in presets container
                    const existing = presetsContainer.querySelector(`[data-control="colorScheme"]`);
                    if (!existing) {
                        // Find Reset button and insert after it, or at beginning if no reset button
                        const resetBtn = presetsContainer.querySelector(`#${pluginName}ResetAllBtn`);
                        if (resetBtn && resetBtn.nextSibling) {
                            presetsContainer.insertBefore(controlElement, resetBtn.nextSibling);
                        } else if (resetBtn) {
                            presetsContainer.appendChild(controlElement);
                        } else {
                            presetsContainer.insertBefore(controlElement, presetsContainer.firstChild);
                        }
                    }
                    // Still store setValue/getValue methods even if element already exists
                } else {
                controlsContainer.appendChild(controlElement);
                }
                
                // Store setValue/getValue methods in control config if they exist
                if (result.setValue) {
                    controlConfig.setValue = result.setValue;
                }
                if (result.getValue) {
                    controlConfig.getValue = result.getValue;
                }
                // Control added debug disabled
            } else {
                // Control creation error debug disabled
            }
        });
        
        // Clear plugin reference after controls are created
        this.currentRenderingPlugin = null;
        
        // Controls finished debug disabled
        
        // DOM debug disabled
        
        // Setup collapsible functionality for controls section
        this.setupCollapsibleSection(channelStrip, '.plugin-controls-header', '.plugin-controls-container');
        
        // Check if controls section is collapsed and auto-expand it
        const controlsSection = channelStrip.querySelector('.channel-controls-section');
        if (controlsSection) {
            const header = controlsSection.querySelector('.plugin-controls-header');
            // Controls section debug disabled
            
            // Auto-expand the controls section to show the controls
            if (!controlsContainer.classList.contains('expanded')) {
                // Auto-expand debug disabled
                controlsContainer.classList.add('expanded');
                
                // Also update the header indicator if it exists
                if (header) {
                    const indicator = header.querySelector('.collapse-indicator');
                    if (indicator) {
                        indicator.style.transform = 'rotate(90deg)';
                    }
                }
            }
        }
    }
    
    /**
     * Add input controls to plugin channel strip (channel-input-section)
     */
    addPluginInputControls(pluginName, inputControls) {
        const channelStrip = this.channelStrips.get(pluginName);
        if (!channelStrip) {
            console.error(`🎛️ DEBUG: No channel strip found for plugin "${pluginName}"`);
            return;
        }
        
        const inputContainer = channelStrip.querySelector('.channel-input-section');
        if (!inputContainer) {
            console.error(`No input container found for plugin "${pluginName}"`);
            return;
        }
        
        // Get plugin reference for dial color customization
        const plugin = window.pluginManager?.getPlugin(pluginName);
        
        // Clear existing input controls
        inputContainer.innerHTML = '';
        
        // Store current plugin temporarily for dial color access
        this.currentRenderingPlugin = plugin || null;
        
        // Add each input control
        inputControls.forEach((controlConfig, controlId) => {
            const result = this.createControlElement(controlId, controlConfig);
            if (result) {
                const controlElement = result.element || result;
                inputContainer.appendChild(controlElement);
                
                // Store setValue/getValue methods in control config if they exist
                if (result.setValue) {
                    controlConfig.setValue = result.setValue;
                }
                if (result.getValue) {
                    controlConfig.getValue = result.getValue;
                }
            } else {
                console.error(`Failed to create input control element for "${controlId}"`);
            }
        });
        
        // Clear plugin reference after input controls are created
        this.currentRenderingPlugin = null;
    }
    
    /**
     * Add plugin presets to the channel strip
     */
    addPluginPresets(pluginName, presets) {
        const channelStrip = this.channelStrips.get(pluginName);
        if (!channelStrip) return;
        
        const presetsContainer = channelStrip.querySelector('.plugin-presets-container');
        if (!presetsContainer) return;
        
        // Preserve Reset button if it exists
        const resetButton = presetsContainer.querySelector(`#${pluginName}ResetAllBtn`);
        
        // Clear existing presets
        presetsContainer.innerHTML = '';
        
        // Add Reset ALL button at the very beginning (create if it doesn't exist)
        const plugin = window.pluginManager?.getPlugin(pluginName);
        if (plugin) {
            let resetBtn = resetButton;
            if (!resetBtn) {
                resetBtn = document.createElement('button');
                resetBtn.className = 'control-btn clear-btn';
                resetBtn.id = `${pluginName}ResetAllBtn`;
                resetBtn.textContent = 'Reset ALL';
                resetBtn.title = 'Reset All Settings to Default';
                resetBtn.addEventListener('click', () => {
                    // Reset all controls to their default values
                    if (plugin.presets && plugin.presets.has('default')) {
                        plugin.applyPreset('default');
                    } else {
                        // Fallback: reset each control to its initial value from control config
                        plugin.controls.forEach((controlConfig, controlId) => {
                            // Get the default value from control config
                            const defaultValue = controlConfig.value;
                            
                            // Only reset if we have a default value
                            if (defaultValue !== undefined) {
                                // Update plugin property first
                                if (plugin[controlId] !== undefined) {
                                    // Handle value transformation if needed (e.g., dials that divide by 100)
                                    if (controlConfig.type === 'dial' && controlConfig.onChange) {
                                        // For dials, we need to set the raw value, not the transformed one
                                        plugin[controlId] = defaultValue;
                                    } else {
                                        plugin[controlId] = defaultValue;
                                    }
                                }
                                
                                // Update UI control
                                if (controlConfig.setValue) {
                                    controlConfig.setValue(defaultValue);
                                } else if (controlConfig.onChange) {
                                    // For dials, onChange expects the transformed value
                                    if (controlConfig.type === 'dial') {
                                        // Apply the same transformation as in onChange
                                        const transformedValue = typeof defaultValue === 'number' ? defaultValue : parseFloat(defaultValue);
                                        controlConfig.onChange(transformedValue);
                                    } else {
                                        controlConfig.onChange(defaultValue);
                                    }
                                }
                            }
                        });
                    }
                });
            }
            presetsContainer.appendChild(resetBtn);
            
            // Add colorScheme control right after Reset button if it exists in plugin controls
            // Check if it already exists to avoid duplicates
            const existingColorScheme = presetsContainer.querySelector(`[data-control="colorScheme"]`);
            if (!existingColorScheme) {
                const colorSchemeConfig = plugin.controls.get('colorScheme');
                if (colorSchemeConfig) {
                    const colorSchemeResult = this.createControlElement('colorScheme', colorSchemeConfig);
                    if (colorSchemeResult) {
                        const colorSchemeElement = colorSchemeResult.element || colorSchemeResult;
                        presetsContainer.appendChild(colorSchemeElement);
                        
                        // Store setValue/getValue methods
                        if (colorSchemeResult.setValue) {
                            colorSchemeConfig.setValue = colorSchemeResult.setValue;
                        }
                        if (colorSchemeResult.getValue) {
                            colorSchemeConfig.getValue = colorSchemeResult.getValue;
                        }
                    }
                }
            }
        }
        
        // Add each preset (skip 'default' since Reset ALL does the same thing)
        presets.forEach((presetConfig, presetId) => {
            // Skip default preset - Reset ALL button handles this
            if (presetId === 'default') {
                return;
            }
            
            // Handle dropdown presets (like preset selector)
            if (presetConfig.type === 'dropdown') {
                const controlGroup = document.createElement('div');
                controlGroup.className = 'control-mini-group';
                
                const select = document.createElement('select');
                select.className = 'dropdown-selector-mixer';
                select.setAttribute('data-control', presetId);
                
                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = presetConfig.label || 'Load Preset...';
                select.appendChild(defaultOption);
                
                // Add preset options
                if (presetConfig.options) {
                    presetConfig.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value || option;
                        optionElement.textContent = option.label || option;
                        select.appendChild(optionElement);
                    });
                }
                
                // Add change event listener
                if (presetConfig.onChange) {
                    select.addEventListener('change', (e) => {
                        if (e.target.value) {
                            presetConfig.onChange(e.target.value);
                            // Reset to default after selection
                            e.target.value = '';
                        }
                    });
                }
                
                controlGroup.appendChild(select);
                presetsContainer.appendChild(controlGroup);
            } else {
                // Handle regular preset buttons
                const presetButton = document.createElement('button');
                presetButton.className = 'btn-preset';
                presetButton.textContent = presetConfig.label || presetConfig.name || presetId;
                presetButton.setAttribute('data-control', presetId);
                
                // Use onClick from preset config if available, otherwise try applyPreset method
                if (presetConfig.onClick) {
                    presetButton.addEventListener('click', presetConfig.onClick);
                } else {
                    presetButton.addEventListener('click', () => {
                        const plugin = window.pluginManager?.getPlugin(pluginName);
                        if (plugin && plugin.applyPreset) {
                            plugin.applyPreset(presetId);
                        }
                    });
                }
                
                presetsContainer.appendChild(presetButton);
            }
        });
        
        // Add User Presets dropdown and action buttons after hardcoded presets
        this.addUserPresetsUI(pluginName, presetsContainer);
        
        // Setup collapsible functionality for presets section
        this.setupCollapsibleSection(channelStrip, '.plugin-presets-header', '.plugin-presets-container');
        
        // Auto-expand the presets section to show the presets
        const presetsSection = channelStrip.querySelector('.channel-presets-section');
        if (presetsSection) {
            const header = presetsSection.querySelector('.plugin-presets-header');
            
            // Auto-expand the presets section
            if (!presetsContainer.classList.contains('expanded')) {
                presetsContainer.classList.add('expanded');
                
                // Also update the header indicator if it exists
                if (header) {
                    const indicator = header.querySelector('.collapse-indicator');
                    if (indicator) {
                        indicator.style.transform = 'rotate(90deg)';
                    }
                }
            }
        }
    }
    
    /**
     * Setup collapsible section functionality
     */
    setupCollapsibleSection(channelStrip, headerSelector, contentSelector) {
        const header = channelStrip.querySelector(headerSelector);
        const content = channelStrip.querySelector(contentSelector);
        
        if (!header || !content) return;
        
        // Remove any existing click listeners to prevent duplicates
        const existingHandler = header._collapsibleHandler;
        if (existingHandler) {
            header.removeEventListener('click', existingHandler);
        }
        
        // Create new handler
        const handler = () => {
            const isExpanded = content.classList.contains('expanded');
            const indicator = header.querySelector('.collapse-indicator');
            
            if (isExpanded) {
                content.classList.remove('expanded');
                if (indicator) {
                    indicator.style.transform = 'rotate(0deg)';
                }
            } else {
                content.classList.add('expanded');
                if (indicator) {
                    indicator.style.transform = 'rotate(90deg)';
                }
            }
        };
        
        // Store handler reference and add listener
        header._collapsibleHandler = handler;
        header.addEventListener('click', handler);
    }
    
    /**
     * Add User Presets dropdown and action buttons to plugin presets container
     */
    addUserPresetsUI(pluginName, presetsContainer) {
        const plugin = window.pluginManager?.getPlugin(pluginName);
        if (!plugin) return;
        
        // User Presets Dropdown
        const userPresetsGroup = document.createElement('div');
        userPresetsGroup.className = 'control-mini-group';
        
        const userPresetsLabel = document.createElement('div');
        userPresetsLabel.className = 'control-mini-label';
        userPresetsLabel.textContent = 'User Presets';
        userPresetsGroup.appendChild(userPresetsLabel);
        
        const userPresetsSelect = document.createElement('select');
        userPresetsSelect.className = 'dropdown-selector-mixer';
        userPresetsSelect.id = `${pluginName}PresetSelector`;
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Load Preset...';
        userPresetsSelect.appendChild(defaultOption);
        
        // Add change event listener
        userPresetsSelect.addEventListener('change', (e) => {
            if (plugin && e.target.value !== '') {
                const presetIndex = parseInt(e.target.value);
                plugin.loadUserPreset(presetIndex);
                // Reset dropdown
                e.target.value = '';
            }
        });
        
        userPresetsGroup.appendChild(userPresetsSelect);
        presetsContainer.appendChild(userPresetsGroup);
        
        // Preset Action Buttons
        const actionButtonsGroup = document.createElement('div');
        actionButtonsGroup.className = 'control-mini-group';
        
        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-preset';
        saveBtn.id = `${pluginName}SavePresetBtn`;
        saveBtn.textContent = 'Save';
        saveBtn.title = 'Save Current as Preset';
        saveBtn.addEventListener('click', () => {
            const presetName = prompt('Enter preset name:');
            if (presetName && presetName.trim() !== '') {
                plugin.saveCurrentAsUserPreset(presetName.trim());
            }
        });
        actionButtonsGroup.appendChild(saveBtn);
        
        // Export button
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn-preset';
        exportBtn.id = `${pluginName}ExportPresetsBtn`;
        exportBtn.textContent = 'Export';
        exportBtn.title = 'Export All Presets';
        exportBtn.addEventListener('click', () => {
            if (plugin) {
                plugin.exportUserPresets();
            }
        });
        actionButtonsGroup.appendChild(exportBtn);
        
        // Import button
        const importBtn = document.createElement('button');
        importBtn.className = 'btn-preset';
        importBtn.id = `${pluginName}ImportPresetsBtn`;
        importBtn.textContent = 'Import';
        importBtn.title = 'Import Presets';
        
        // Hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        fileInput.id = `${pluginName}ImportPresetsFile`;
        
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && plugin) {
                plugin.importUserPresets(file);
            }
            // Reset file input
            e.target.value = '';
        });
        
        actionButtonsGroup.appendChild(importBtn);
        actionButtonsGroup.appendChild(fileInput);
        presetsContainer.appendChild(actionButtonsGroup);
        
        // Initial update of dropdown
        if (plugin.updateUserPresetSelector) {
            plugin.updateUserPresetSelector();
        }
    }
    
    /**
     * Create UI control element (Infinite Zoom style)
     */
    createControlElement(controlId, controlConfig) {
        switch (controlConfig.type) {
            case 'slider':
                return this.createSliderControl(controlId, controlConfig);
            case 'dial':
                return this.createDialControl(controlId, controlConfig);
            case 'button':
                return this.createButtonControl(controlId, controlConfig);
            case 'dropdown':
                return this.createDropdownControl(controlId, controlConfig);
            case 'checkbox':
                return this.createCheckboxControl(controlId, controlConfig);
            case 'section-header':
                return this.createSectionHeader(controlId, controlConfig);
            default:
                console.warn(`Unknown control type: ${controlConfig.type}`);
                return null;
        }
    }
    
    /**
     * Create section header for control groups
     */
    createSectionHeader(controlId, config) {
        const header = document.createElement('div');
        header.className = 'control-section-header';
        header.textContent = config.label;
        // Section headers don't need setValue/getValue
        return header;
    }
    
    /**
     * Create slider control (Infinite Zoom style)
     */
    createSliderControl(controlId, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-mini-group';
        controlGroup.setAttribute('data-control', controlId);  // Add data-control attribute for selector
        
        // Header with label and value
        const header = document.createElement('div');
        header.className = 'control-mini-header';
        
        const label = document.createElement('div');
        label.className = 'control-mini-label';
        label.textContent = config.label || controlId;
        
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'control-mini-value';
        const initialValue = config.value !== undefined ? config.value : (config.min || 0);
        valueDisplay.textContent = `${initialValue}${config.unit || ''}`;
        
        header.appendChild(label);
        header.appendChild(valueDisplay);
        
        // Mini slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'mini-slider';
        slider.min = config.min || 0;
        slider.max = config.max || 100;
        slider.step = config.step || 1;
        slider.value = initialValue;
        
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            valueDisplay.textContent = `${value}${config.unit || ''}`;
            if (config.onChange) {
                config.onChange(value);
            }
        });
        
        // Allow X key to bubble up for mixer toggle hotkey
        slider.addEventListener('keydown', (e) => {
            if (e.code === 'KeyX') {
                // Don't prevent default, let it bubble up to main handler
                return;
            }
        });
        
        controlGroup.appendChild(header);
        controlGroup.appendChild(slider);
        
        // Return element and setValue/getValue methods
        return {
            element: controlGroup,
            setValue: (value) => {
                const numValue = parseFloat(value);
                slider.value = numValue;
                valueDisplay.textContent = `${numValue}${config.unit || ''}`;
                if (config.onChange) {
                    config.onChange(numValue);
                }
            },
            getValue: () => parseFloat(slider.value)
        };
    }
    
    /**
     * Create dial control (rotary knob) for mixer channel strips
     */
    createDialControl(controlId, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-mini-group';
        controlGroup.setAttribute('data-control', controlId);
        
        // Label
        const label = document.createElement('div');
        label.className = 'control-mini-label';
        label.textContent = config.label || controlId;
        
        // Dial container
        const dialContainer = document.createElement('div');
        dialContainer.className = 'mixer-dial-container';
        
        // SVG Dial
        const dial = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        dial.setAttribute('class', 'mixer-dial dial-gold');
        dial.setAttribute('viewBox', '0 0 50 50');
        dial.setAttribute('data-min', config.min || 0);
        dial.setAttribute('data-max', config.max || 100);
        dial.setAttribute('data-step', config.step || 1);
        const initialValue = config.value !== undefined ? config.value : (config.min || 0);
        dial.setAttribute('data-value', initialValue);
        dial.setAttribute('data-default', initialValue); // Store default for double-click reset
        
        // Apply custom dial fill color if plugin specifies one
        if (this.currentRenderingPlugin?.metadata?.dialFillColor) {
            const cssVar = this.currentRenderingPlugin.metadata.dialFillColor;
            // Set CSS custom property to override default --dial-color
            dial.style.setProperty('--dial-color', `var(${cssVar})`);
        }
        
        // Dial background circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'dial-bg');
        circle.setAttribute('cx', '25');
        circle.setAttribute('cy', '25');
        circle.setAttribute('r', '18');
        
        // Dial pointer line
        const pointer = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        pointer.setAttribute('class', 'dial-pointer');
        pointer.setAttribute('x1', '25');
        pointer.setAttribute('y1', '7');
        pointer.setAttribute('x2', '25');
        pointer.setAttribute('y2', '1');
        
        dial.appendChild(circle);
        dial.appendChild(pointer);
        
        // Value display
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'mixer-dial-value';
        const decimals = (config.step || 1) < 0.1 ? 2 : ((config.step || 1) < 1 ? 1 : 0);
        valueDisplay.textContent = initialValue.toFixed(decimals);
        
        dialContainer.appendChild(dial);
        dialContainer.appendChild(valueDisplay);
        
        controlGroup.appendChild(label);
        controlGroup.appendChild(dialContainer);
        
        // Initialize dial after adding to DOM
        setTimeout(() => {
            // Re-initialize all dials to include this new one
            if (window.initMixerDials) {
                window.initMixerDials();
            }
        }, 0);
        
        // Listen for dialchange events
        dial.addEventListener('dialchange', (e) => {
            const value = e.detail.value;
            const decimals = (config.step || 1) < 0.1 ? 2 : ((config.step || 1) < 1 ? 1 : 0);
            valueDisplay.textContent = value.toFixed(decimals) + (config.unit || '');
            if (config.onChange) {
                config.onChange(value);
            }
        });
        
        // Return element and setValue/getValue methods
        return {
            element: controlGroup,
            setValue: (value) => {
                const numValue = parseFloat(value);
                dial.setAttribute('data-value', numValue);
                const decimals = (config.step || 1) < 0.1 ? 2 : ((config.step || 1) < 1 ? 1 : 0);
                valueDisplay.textContent = numValue.toFixed(decimals) + (config.unit || '');
                // Trigger dial update by re-initializing
                if (window.initMixerDials) {
                    window.initMixerDials();
                }
            },
            getValue: () => parseFloat(dial.getAttribute('data-value'))
        };
    }
    
    /**
     * Create button control (using existing preset button style)
     */
    createButtonControl(controlId, config) {
        const button = document.createElement('button');
        button.className = config.className || 'btn-preset';
        const initialLabel = config.label || controlId;
        button.textContent = initialLabel;
        button.setAttribute('data-control', controlId);  // Add data-control attribute for selector
        
        if (config.onClick) {
            button.addEventListener('click', config.onClick);
        }
        
        // Return element and setValue/getValue methods
        return {
            element: button,
            setValue: (value) => {
                // For buttons, value can be the label text or a boolean/state
                if (typeof value === 'string') {
                    button.textContent = value;
                } else if (typeof value === 'boolean') {
                    // Update button state (for toggle buttons)
                    if (value) {
                        button.classList.add('active');
                    } else {
                        button.classList.remove('active');
                    }
                }
                // Store current label for getValue
                config._currentLabel = button.textContent;
            },
            getValue: () => button.textContent || config._currentLabel || initialLabel
        };
    }
    
    /**
     * Create dropdown control (using existing dropdown-mini style)
     */
    createDropdownControl(controlId, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-mini-group';
        
        // Header with label
        const header = document.createElement('div');
        header.className = 'control-mini-header';
        
        const label = document.createElement('div');
        label.className = 'control-mini-label';
        label.textContent = config.label || controlId;
        header.appendChild(label);
        
        controlGroup.appendChild(header);
        
        // Dropdown select element
        const select = document.createElement('select');
        select.className = config.className || 'dropdown-mini';
        
        if (config.options) {
            config.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label || option.value;
                select.appendChild(optionElement);
            });
        }
        
        // Set initial value if provided
        if (config.value !== undefined) {
            select.value = config.value;
        }
        
        if (config.onChange) {
            select.addEventListener('change', (e) => {
                config.onChange(e.target.value);
            });
        }
        
        controlGroup.appendChild(select);
        
        // Return element and setValue/getValue methods
        return {
            element: controlGroup,
            setValue: (value) => {
                select.value = value;
                if (config.onChange) {
                    config.onChange(value);
                }
            },
            getValue: () => select.value
        };
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
        toggleButton.className = config.className || 'btn-toggle';
        toggleButton.style.fontSize = '10px';
        toggleButton.style.padding = '2px 6px';
        
        const toggleText = document.createElement('span');
        toggleText.className = 'toggle-text';
        let isChecked = config.checked || false;
        toggleText.textContent = isChecked ? 'ON' : 'OFF';
        toggleButton.appendChild(toggleText);
        
        toggleButton.addEventListener('click', () => {
            isChecked = !isChecked;
            toggleText.textContent = isChecked ? 'ON' : 'OFF';
            if (config.onChange) {
                config.onChange(isChecked);
            }
        });
        
        controlGroup.appendChild(header);
        controlGroup.appendChild(toggleButton);
        
        // Return element and setValue/getValue methods
        return {
            element: controlGroup,
            setValue: (value) => {
                isChecked = !!value;
                toggleText.textContent = isChecked ? 'ON' : 'OFF';
                if (config.onChange) {
                    config.onChange(isChecked);
                }
            },
            getValue: () => isChecked
        };
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
        // Z-index initial debug completely disabled
        return;
        
        // Check if localStorage was loaded
        const savedData = localStorage.getItem('freque-channel-order');
        
        // Show all canvases that exist in the DOM
        const allCanvases = document.querySelectorAll('canvas');
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
        
        // Apply z-indexes to actual canvas elements
        this.recalculateZIndexes();
    }
    
    /**
     * Recalculate z-indexes based on channel strip order
     * All reorderable channels (native viz, video, bg image, plugins) get z-index based on DOM position
     * Audio Input and Kaleidoscope are fixed (not reorderable)
     */
    recalculateZIndexes() {
        const mixerChannels = document.querySelector('.mixer-channels');
        if (!mixerChannels) return;
        
        const channelStrips = Array.from(mixerChannels.querySelectorAll('.channel-strip'));
        let currentZIndex = 1; // Start at z-index 1, increment for each reorderable channel
        
        channelStrips.forEach((strip, index) => {
            const channelType = strip.getAttribute('data-channel');
            const pluginName = strip.getAttribute('data-plugin');
            
            let zIndex = null;
            
            // Skip audio input (no z-index) and kaleidoscope (fixed at 100)
            if (channelType === 'audioinput') {
                return; // No z-index for audio input
            } else if (channelType === 'kaleidoscope') {
                zIndex = 100; // Kaleidoscope always on top
            } else if (channelType === 'display1' || channelType === 'display2' || channelType === 'display3') {
                return; // Display channels don't have visualizations
            } else {
                // All other channels (native viz, video, bg image, plugins) get position-based z-index
                zIndex = currentZIndex++;
            }
            
            // Apply z-index to the appropriate elements
            if (zIndex !== null) {
                this.applyZIndexToVisualization(channelType, pluginName, zIndex);
            }
        });
    }
    
    /**
     * Debug method to show updated z-index values after drag-drop
     */
    debugUpdatedZIndexes() {
        // Z-index debug completely disabled
        return;
        
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
        } catch (error) {
            console.error('🔌 Failed to clear saved channel order:', error);
        }
    }

    /**
     * Reset to default channel order (for debugging)
     */
    resetToDefaultOrder() {
        this.clearSavedChannelOrder();
    }
    
    /**
     * Debug method to inspect current localStorage data
     */
    debugChannelOrder() {
        const savedData = localStorage.getItem('freque-channel-order');
        if (savedData) {
        } else {
        }
        
        const currentOrder = Array.from(document.querySelectorAll('.mixer-channels .channel-strip')).map(strip => ({
            header: strip.querySelector('.channel-header')?.textContent,
            dataChannel: strip.getAttribute('data-channel'),
            dataPlugin: strip.getAttribute('data-plugin'),
            classes: strip.className
        }));
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

// Expose input controls method globally for plugin manager
window.updatePluginInputControls = function(pluginName, inputControls) {
    if (window.pluginMixerIntegration) {
        window.pluginMixerIntegration.addPluginInputControls(pluginName, inputControls);
    }
};
});

// Make globally available
window.PluginMixerIntegration = PluginMixerIntegration;
