/**
 * Freque Plugin Loader
 * Handles dynamic loading and management of plugins
 */

class FrequePluginLoader {
    constructor() {
        this.loadedPlugins = new Map();
        this.pluginScripts = new Map();
        
        // Initialize
        this.init();
    }
    
    init() {
        // Make globally available
        window.pluginLoader = this;
    }
    
    /**
     * Load a plugin from URL
     */
    async loadPlugin(pluginUrl, pluginName = null) {
        try {
            // Extract plugin name from URL if not provided
            if (!pluginName) {
                const urlParts = pluginUrl.split('/');
                const fileName = urlParts[urlParts.length - 1];
                pluginName = fileName.replace('-freque-plugin.js', '').replace('.js', '');
            }
            
            // Check if already loaded
            if (this.loadedPlugins.has(pluginName)) {
                console.warn(`Plugin "${pluginName}" is already loaded`);
                return this.loadedPlugins.get(pluginName);
            }
            
            // Create script element
            const script = document.createElement('script');
            script.src = pluginUrl;
            script.async = true;
            
            // Load script
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load plugin script: ${pluginUrl}`));
                document.head.appendChild(script);
            });
            
            // Store script reference
            this.pluginScripts.set(pluginName, script);
            
            console.log(`Plugin script loaded: ${pluginName}`);
            return true;
            
        } catch (error) {
            console.error(`Failed to load plugin "${pluginName}":`, error);
            return false;
        }
    }
    
    /**
     * Unload a plugin
     */
    unloadPlugin(pluginName) {
        try {
            // Unregister from plugin manager
            if (window.pluginManager) {
                window.pluginManager.unregisterPlugin(pluginName);
            }
            
            // Remove script
            const script = this.pluginScripts.get(pluginName);
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            // Clean up references
            this.loadedPlugins.delete(pluginName);
            this.pluginScripts.delete(pluginName);
            
            console.log(`Plugin unloaded: ${pluginName}`);
            return true;
            
        } catch (error) {
            console.error(`Failed to unload plugin "${pluginName}":`, error);
            return false;
        }
    }
    
    /**
     * Load Storm template plugin for demonstration
     */
    async loadStormTemplate() {
        const success = await this.loadPlugin('js/plugins/templates/storm-freque-plugin.js', 'storm');
        if (success) {
            console.log('Storm template plugin loaded successfully');
        }
        return success;
    }
    
    /**
     * Get list of loaded plugins
     */
    getLoadedPlugins() {
        return Array.from(this.loadedPlugins.keys());
    }
    
    /**
     * Check if plugin is loaded
     */
    isPluginLoaded(pluginName) {
        return this.loadedPlugins.has(pluginName);
    }
}

// Initialize plugin loader
window.addEventListener('DOMContentLoaded', () => {
    new FrequePluginLoader();
});

// Make globally available
window.FrequePluginLoader = FrequePluginLoader;
