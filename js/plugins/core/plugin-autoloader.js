/**
 * Plugin Auto-Loading System
 * Automatically discovers, loads, and manages plugins from the js/plugins/ directory
 * Handles plugin lifecycle, missing plugin detection, and manual refresh functionality
 */

class PluginAutoLoader {
    constructor() {
        this.pollingInterval = 12000; // 12 seconds
        this.knownPlugins = new Set();
        this.missingPlugins = new Set();
        this.loadedPlugins = new Map();
        this.isPolling = false;
        this.initialLoadComplete = false;
        this.pollingTimer = null;
    }
    
    /**
     * Initialize the autoloader - wait for app to finish loading, then start
     */
    async initialize() {
        await this.waitForInitialLoad();
        await this.initialPluginScan();
        this.startPolling();
    }
    
    /**
     * Wait for initial app components to load before starting autoloader
     */
    async waitForInitialLoad() {
        return new Promise((resolve) => {
            const checkAppReady = () => {
                // Check if core systems are loaded and have required methods
                const hasPluginManager = !!window.pluginManager;
                const hasPluginLoader = !!window.pluginLoader;
                const hasLoadMethod = window.pluginLoader && typeof window.pluginLoader.loadPlugin === 'function';
                const hasMixerIntegration = !!window.pluginMixerIntegration;
                const hasMixerChannels = !!document.querySelector('.mixer-channels');
                
                const appReady = hasPluginManager && hasPluginLoader && hasLoadMethod && hasMixerIntegration && hasMixerChannels;
                
                if (appReady) {
                    this.initialLoadComplete = true;
                    resolve();
                } else {
                    setTimeout(checkAppReady, 500);
                }
            };
            checkAppReady();
        });
    }
    
    /**
     * Perform initial scan and load all discovered plugins
     */
    async initialPluginScan() {
        try {
            // Scan default plugins directory
            const discoveredPlugins = await this.scanPluginsDirectory();
            
            for (const pluginFile of discoveredPlugins) {
                await this.loadDiscoveredPlugin(pluginFile);
                this.knownPlugins.add(pluginFile);
            }
            
            // Scan custom plugin folder if configured
            await this.scanCustomPluginFolder();
            
        } catch (error) {
            console.error('Initial plugin scan failed:', error);
        }
    }
    
    /**
     * Scan custom plugin folder if one is configured
     */
    async scanCustomPluginFolder() {
        if (!window.pluginFolderManager) return;
        
        if (window.pluginFolderManager.hasCustomFolder()) {
            await window.pluginFolderManager.scanAndLoadCustomPlugins();
        }
    }
    
    /**
     * Start the polling system for ongoing plugin discovery
     */
    startPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        this.pollingTimer = setInterval(() => {
            this.pollForChanges();
        }, this.pollingInterval);
    }
    
    /**
     * Stop the polling system
     */
    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
        this.isPolling = false;
    }
    
    /**
     * Poll for plugin directory changes
     */
    async pollForChanges() {
        try {
            const currentPlugins = await this.scanPluginsDirectory();
            const currentPluginSet = new Set(currentPlugins);
            
            // Find new plugins
            const newPlugins = currentPlugins.filter(plugin => !this.knownPlugins.has(plugin));
            
            // Find missing plugins
            const missingPlugins = Array.from(this.knownPlugins).filter(plugin => !currentPluginSet.has(plugin));
            
            // Handle new plugins
            for (const newPlugin of newPlugins) {
                await this.loadDiscoveredPlugin(newPlugin);
                this.knownPlugins.add(newPlugin);
                
                // Remove from missing if it was previously missing
                this.missingPlugins.delete(newPlugin);
            }
            
            // Handle missing plugins - immediately unload them
            for (const missingPlugin of missingPlugins) {
                if (!this.missingPlugins.has(missingPlugin)) {
                    this.missingPlugins.add(missingPlugin);
                    
                    // Immediately unload the plugin
                    await this.unloadPlugin(missingPlugin);
                }
            }
            
        } catch (error) {
            console.error('🔌 Plugin polling error:', error);
        }
    }
    
    /**
     * Scan the plugins directory and subdirectories for *-freque-plugin.js files
     */
    async scanPluginsDirectory() {
        try {
            const allPlugins = [];
            
            // Scan root plugins directory
            const rootPlugins = await this.scanSingleDirectory('js/plugins/');
            allPlugins.push(...rootPlugins);
            
            // Subdirectories scanning disabled - only scan root plugins directory
            // Future: Enable when templates/, official/, third-party/ directories are created
            
            return allPlugins;
            
        } catch (error) {
            console.error('🔌 Plugin directory scan failed:', error);
            return [];
        }
    }
    
    /**
     * Scan a single directory for plugin files
     */
    async scanSingleDirectory(directoryPath) {
        try {
            const response = await fetch(directoryPath, {
                method: 'GET',
                cache: 'no-cache'
            }).catch(error => {
                // Silently handle network errors (including 404s shown by browser)
                return { ok: false, status: 404 };
            });
            
            if (!response.ok) {
                // Silently return empty array for missing directories
                if (response.status === 404) {
                    return [];
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            return this.parsePluginFiles(html);
            
        } catch (error) {
            // Only log non-404 errors
            if (!error.message?.includes('404')) {
                console.error(`Directory scan failed for ${directoryPath}:`, error);
            }
            return [];
        }
    }
    
    /**
     * Parse HTML directory listing for plugin files
     */
    parsePluginFiles(html) {
        const pluginFiles = [];
        
        // Look for links ending with -freque-plugin.js
        const linkRegex = /<a[^>]+href=["']([^"']*-freque-plugin\.js)["'][^>]*>/gi;
        let match;
        
        while ((match = linkRegex.exec(html)) !== null) {
            let filename = match[1];
            
            // Clean up the filename - remove any path prefixes
            if (filename.startsWith('/')) {
                filename = filename.substring(1);
            }
            if (filename.startsWith('js/plugins/')) {
                filename = filename.replace('js/plugins/', '');
            }
            
            // Skip if it's a full URL or starts with ../
            if (!filename.startsWith('http') && !filename.startsWith('../') && filename.endsWith('-freque-plugin.js')) {
                pluginFiles.push(filename);
            }
        }
        
        // Also try parsing as JSON directory listing (some servers)
        try {
            const jsonMatch = html.match(/\[.*\]/);
            if (jsonMatch) {
                const files = JSON.parse(jsonMatch[0]);
                files.forEach(file => {
                    if (typeof file === 'string' && file.endsWith('-freque-plugin.js')) {
                        // Clean filename
                        let cleanFile = file;
                        if (cleanFile.startsWith('/')) {
                            cleanFile = cleanFile.substring(1);
                        }
                        if (cleanFile.startsWith('js/plugins/')) {
                            cleanFile = cleanFile.replace('js/plugins/', '');
                        }
                        
                        if (!pluginFiles.includes(cleanFile)) {
                            pluginFiles.push(cleanFile);
                        }
                    }
                });
            }
        } catch (e) {
            // Not JSON, continue with regex results
        }
        
        // Sort plugins by saved z-index order from localStorage
        // Plugins in saved order load first (in their saved positions)
        // New plugins load last (alphabetically) and get highest z-index
        return this.sortPluginsByStoredOrder(pluginFiles);
    }
    
    /**
     * Sort plugins by stored z-index order from localStorage
     * Plugins in saved order load first (preserving their positions)
     * New plugins load last (alphabetically) so they get highest z-index
     */
    sortPluginsByStoredOrder(pluginFiles) {
        try {
            const savedData = localStorage.getItem('freque-channel-order');
            if (!savedData) {
                // No saved order, fall back to alphabetical
                return pluginFiles.sort();
            }
            
            const orderData = JSON.parse(savedData);
            if (!orderData.channelOrder || !Array.isArray(orderData.channelOrder)) {
                return pluginFiles.sort();
            }
            
            // Extract plugin names from saved order (filter for plugin entries only)
            const savedPluginOrder = orderData.channelOrder
                .filter(item => item.plugin)
                .map(item => item.plugin);
            
            // Separate plugins into saved (known) and new (unknown)
            const savedPlugins = [];
            const newPlugins = [];
            
            pluginFiles.forEach(file => {
                // Extract plugin name from file path (e.g., "js/plugins/nebula-freque-plugin.js" -> "nebula")
                const match = file.match(/([^\/]+)-freque-plugin\.js$/);
                const pluginName = match ? match[1] : null;
                
                if (pluginName && savedPluginOrder.includes(pluginName)) {
                    savedPlugins.push({ file, pluginName, order: savedPluginOrder.indexOf(pluginName) });
                } else {
                    newPlugins.push(file);
                }
            });
            
            // Sort saved plugins by their saved order
            savedPlugins.sort((a, b) => a.order - b.order);
            
            // Sort new plugins alphabetically
            newPlugins.sort();
            
            // Return: saved plugins first (in order), then new plugins (alphabetically)
            // New plugins load LAST so they get inserted closest to Kaleidoscope
            return [...savedPlugins.map(p => p.file), ...newPlugins];
            
        } catch (error) {
            // On any error, fall back to alphabetical
            return pluginFiles.sort();
        }
    }
    
    /**
     * Load a newly discovered plugin
     */
    async loadDiscoveredPlugin(pluginFile) {
        try {
            
            // Build correct plugin path - ensure single js/plugins/ prefix
            let pluginPath;
            if (pluginFile.startsWith('js/plugins/')) {
                pluginPath = pluginFile;
            } else {
                pluginPath = `js/plugins/${pluginFile}`;
            }
            
            
            // Verify plugin loader is available and has the method
            if (!window.pluginLoader || typeof window.pluginLoader.loadPlugin !== 'function') {
                throw new Error('Plugin loader not available or missing loadPlugin method');
            }
            
            const success = await window.pluginLoader.loadPlugin(pluginPath);
            
            if (success) {
                this.loadedPlugins.set(pluginFile, {
                    file: pluginFile,
                    path: pluginPath,
                    loadedAt: Date.now(),
                    missing: false
                });
            } else {
                throw new Error('Plugin loader returned false');
            }
            
        } catch (error) {
            console.error(`🔌 Failed to load plugin ${pluginFile}:`, error);
            // Remove from available plugins list
            this.knownPlugins.delete(pluginFile);
        }
    }
    
    /**
     * Mark a plugin as missing (but don't cleanup until manual refresh)
     */
    markPluginAsMissing(pluginFile) {
        const pluginInfo = this.loadedPlugins.get(pluginFile);
        if (pluginInfo) {
            pluginInfo.missing = true;
            
            // Could add visual indicator to channel strip here
            // For now, just log it
        }
    }
    
    /**
     * Manual refresh - cleanup missing plugins and rescan
     */
    async refreshPlugins() {
        
        try {
            // First, cleanup missing plugins
            await this.cleanupMissingPlugins();
            
            // Then perform fresh scan of default directory
            const currentPlugins = await this.scanPluginsDirectory();
            const currentPluginSet = new Set(currentPlugins);
            
            // Update known plugins list
            this.knownPlugins.clear();
            currentPlugins.forEach(plugin => this.knownPlugins.add(plugin));
            
            // Clear missing plugins list
            this.missingPlugins.clear();
            
            // Load any new plugins from default directory
            for (const pluginFile of currentPlugins) {
                if (!this.loadedPlugins.has(pluginFile)) {
                    await this.loadDiscoveredPlugin(pluginFile);
                }
            }
            
            // Remove any loaded plugins that are no longer in directory
            for (const [pluginFile, pluginInfo] of this.loadedPlugins.entries()) {
                if (!currentPluginSet.has(pluginFile)) {
                    await this.unloadPlugin(pluginFile);
                }
            }
            
            // Scan custom plugin folder if configured
            await this.scanCustomPluginFolder();
            
            
        } catch (error) {
            console.error('🔌 Manual refresh failed:', error);
        }
    }
    
    /**
     * Cleanup plugins that are marked as missing
     */
    async cleanupMissingPlugins() {
        const missingPluginArray = Array.from(this.missingPlugins);
        
        for (const pluginFile of missingPluginArray) {
            await this.unloadPlugin(pluginFile);
        }
        
        this.missingPlugins.clear();
    }
    
    /**
     * Unload a plugin completely
     */
    async unloadPlugin(pluginFile) {
        try {
            const pluginInfo = this.loadedPlugins.get(pluginFile);
            if (!pluginInfo) return;
            
            // Extract plugin name from filename (remove -freque-plugin.js)
            const pluginName = pluginFile.replace('-freque-plugin.js', '');
            
            // Get plugin instance
            const plugin = window.pluginManager?.getPlugin(pluginName);
            if (plugin) {
                // Stop and cleanup plugin
                plugin.stop();
                plugin.onCleanup();
                
                // Remove from plugin manager
                window.pluginManager.unregisterPlugin(pluginName);
            }
            
            // Remove from our tracking
            this.loadedPlugins.delete(pluginFile);
            this.knownPlugins.delete(pluginFile);
            
            
        } catch (error) {
            console.error(`🔌 Error unloading plugin ${pluginFile}:`, error);
        }
    }
    
    /**
     * Get status information
     */
    getStatus() {
        return {
            isPolling: this.isPolling,
            pollingInterval: this.pollingInterval,
            knownPlugins: Array.from(this.knownPlugins),
            missingPlugins: Array.from(this.missingPlugins),
            loadedPlugins: Array.from(this.loadedPlugins.keys()),
            initialLoadComplete: this.initialLoadComplete
        };
    }
}

// Make globally available
window.PluginAutoLoader = PluginAutoLoader;
