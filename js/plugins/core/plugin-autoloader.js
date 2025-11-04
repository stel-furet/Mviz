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
        
        console.log('🔌 Plugin AutoLoader initialized');
    }
    
    /**
     * Initialize the autoloader - wait for app to finish loading, then start
     */
    async initialize() {
        console.log('🔌 AutoLoader waiting for initial app load...');
        await this.waitForInitialLoad();
        
        console.log('🔌 AutoLoader performing initial plugin scan...');
        await this.initialPluginScan();
        
        console.log('🔌 AutoLoader starting polling system...');
        this.startPolling();
        
        console.log('🔌 Plugin AutoLoader fully initialized');
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
                
                console.log('🔌 AutoLoader checking readiness:', {
                    pluginManager: hasPluginManager,
                    pluginLoader: hasPluginLoader,
                    loadMethod: hasLoadMethod,
                    mixerIntegration: hasMixerIntegration,
                    mixerChannels: hasMixerChannels
                });
                
                const appReady = hasPluginManager && hasPluginLoader && hasLoadMethod && hasMixerIntegration && hasMixerChannels;
                
                if (appReady) {
                    console.log('🔌 AutoLoader: All systems ready, proceeding with initialization');
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
            const discoveredPlugins = await this.scanPluginsDirectory();
            console.log(`🔌 Initial scan found ${discoveredPlugins.length} plugins:`, discoveredPlugins);
            
            for (const pluginFile of discoveredPlugins) {
                await this.loadDiscoveredPlugin(pluginFile);
                this.knownPlugins.add(pluginFile);
            }
            
            console.log(`🔌 Initial plugin loading complete. Loaded ${this.loadedPlugins.size} plugins.`);
        } catch (error) {
            console.error('🔌 Initial plugin scan failed:', error);
        }
    }
    
    /**
     * Start the polling system for ongoing plugin discovery
     */
    startPolling() {
        if (this.isPolling) {
            console.warn('🔌 Polling already active');
            return;
        }
        
        this.isPolling = true;
        this.pollingTimer = setInterval(() => {
            this.pollForChanges();
        }, this.pollingInterval);
        
        console.log(`🔌 Plugin polling started (${this.pollingInterval/1000}s interval)`);
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
        console.log('🔌 Plugin polling stopped');
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
                console.log(`🔌 New plugin discovered: ${newPlugin}`);
                await this.loadDiscoveredPlugin(newPlugin);
                this.knownPlugins.add(newPlugin);
                
                // Remove from missing if it was previously missing
                this.missingPlugins.delete(newPlugin);
            }
            
            // Handle missing plugins (mark as missing, don't cleanup until manual refresh)
            for (const missingPlugin of missingPlugins) {
                if (!this.missingPlugins.has(missingPlugin)) {
                    console.log(`🔌 Plugin file missing: ${missingPlugin} (marked as missing)`);
                    this.missingPlugins.add(missingPlugin);
                    this.markPluginAsMissing(missingPlugin);
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
            
            // Scan known subdirectories
            const subdirectories = ['templates/', 'official/', 'third-party/'];
            
            for (const subdir of subdirectories) {
                try {
                    const subdirPlugins = await this.scanSingleDirectory(`js/plugins/${subdir}`);
                    // Add subdirectory path to plugin names, but avoid duplicates
                    const fullPathPlugins = subdirPlugins.map(plugin => {
                        // If plugin already includes the subdirectory, don't add it again
                        if (plugin.startsWith(subdir)) {
                            return plugin;
                        }
                        return `${subdir}${plugin}`;
                    });
                    allPlugins.push(...fullPathPlugins);
                } catch (error) {
                    // Subdirectory might not exist, continue with others
                    console.log(`🔌 Subdirectory js/plugins/${subdir} not accessible, skipping`);
                }
            }
            
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
            });
            
            if (!response.ok) {
                // Silently return empty array for missing directories (404)
                if (response.status === 404) {
                    return [];
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            return this.parsePluginFiles(html);
            
        } catch (error) {
            console.error(`🔌 Directory scan failed for ${directoryPath}:`, error);
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
        
        return pluginFiles.sort();
    }
    
    /**
     * Load a newly discovered plugin
     */
    async loadDiscoveredPlugin(pluginFile) {
        try {
            console.log(`🔌 Loading discovered plugin: ${pluginFile}`);
            
            // Build correct plugin path - ensure single js/plugins/ prefix
            let pluginPath;
            if (pluginFile.startsWith('js/plugins/')) {
                pluginPath = pluginFile;
            } else {
                pluginPath = `js/plugins/${pluginFile}`;
            }
            
            console.log(`🔌 Constructed plugin path: ${pluginPath}`);
            
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
                console.log(`🔌 Successfully loaded plugin: ${pluginFile}`);
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
            console.log(`🔌 Plugin marked as missing: ${pluginFile}`);
            
            // Could add visual indicator to channel strip here
            // For now, just log it
        }
    }
    
    /**
     * Manual refresh - cleanup missing plugins and rescan
     */
    async refreshPlugins() {
        console.log('🔌 Manual plugin refresh initiated...');
        
        try {
            // First, cleanup missing plugins
            await this.cleanupMissingPlugins();
            
            // Then perform fresh scan
            const currentPlugins = await this.scanPluginsDirectory();
            const currentPluginSet = new Set(currentPlugins);
            
            // Update known plugins list
            this.knownPlugins.clear();
            currentPlugins.forEach(plugin => this.knownPlugins.add(plugin));
            
            // Clear missing plugins list
            this.missingPlugins.clear();
            
            // Load any new plugins
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
            
            console.log(`🔌 Manual refresh complete. Active plugins: ${this.loadedPlugins.size}`);
            
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
            console.log(`🔌 Cleaning up missing plugin: ${pluginFile}`);
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
            
            console.log(`🔌 Plugin unloaded: ${pluginFile}`);
            
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
