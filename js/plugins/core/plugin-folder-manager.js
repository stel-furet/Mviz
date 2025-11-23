/**
 * Plugin Folder Manager
 * Manages custom plugin folder selection using File System Access API
 * Mirrors the pattern used by PlaylistManager for persistent folder access
 */

class PluginFolderManager {
    constructor() {
        this.customFolderHandle = null;
        this.customFolderPath = null;
        this.db = null;
        
        // Make globally available
        window.pluginFolderManager = this;
        
        this.init();
    }
    
    async init() {
        // Initialize IndexedDB
        await this.initializeIndexedDB();
        
        // Load saved folder handle
        await this.loadFolderHandle();
        
        // Setup UI
        this.setupUI();
    }
    
    /**
     * Initialize IndexedDB for storing folder handles
     */
    async initializeIndexedDB() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('FrequePluginFolders', 1);
                
                request.onerror = () => {
                    console.error('IndexedDB error:', request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    this.db = request.result;
                    resolve(this.db);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create object store for folder handles
                    if (!db.objectStoreNames.contains('folderHandles')) {
                        const store = db.createObjectStore('folderHandles', { keyPath: 'id' });
                        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                    }
                };
            });
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            return null;
        }
    }
    
    /**
     * Store folder handle in IndexedDB
     */
    async storeFolderHandle(handle, folderPath) {
        try {
            const db = await this.initializeIndexedDB();
            if (!db) return;
            
            const transaction = db.transaction(['folderHandles'], 'readwrite');
            const store = transaction.objectStore('folderHandles');
            
            const folderData = {
                id: 'customPluginFolder',
                handle: handle,
                path: folderPath,
                lastAccessed: Date.now()
            };
            
            await store.put(folderData);
            
            // Also store path in localStorage for quick display
            localStorage.setItem('customPluginFolderPath', folderPath);
            
        } catch (error) {
            console.error('Error storing plugin folder handle:', error);
        }
    }
    
    /**
     * Load folder handle from IndexedDB
     */
    async loadFolderHandle() {
        try {
            const db = await this.initializeIndexedDB();
            if (!db) return null;
            
            const transaction = db.transaction(['folderHandles'], 'readonly');
            const store = transaction.objectStore('folderHandles');
            const request = store.get('customPluginFolder');
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (request.result && request.result.handle) {
                        this.customFolderHandle = request.result.handle;
                        this.customFolderPath = request.result.path;
                        
                        // Update UI
                        this.updatePathDisplay();
                        
                        resolve(request.result.handle);
                    } else {
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('Error loading plugin folder handle:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in loadFolderHandle:', error);
            return null;
        }
    }
    
    /**
     * Setup UI elements for folder selection
     */
    setupUI() {
        // Wait for DOM to be fully ready
        setTimeout(() => {
            // Find the refresh plugins button's container
            const refreshBtn = document.getElementById('refreshPluginsBtn');
            if (!refreshBtn) {
                console.error('Refresh plugins button not found');
                return;
            }
            
            // Create choose folder button
            const chooseFolderBtn = document.createElement('button');
            chooseFolderBtn.className = 'btn-primary';
            chooseFolderBtn.id = 'choosePluginFolderBtn';
            chooseFolderBtn.title = 'Select a custom folder to load plugins from';
            chooseFolderBtn.textContent = '📁 Choose Plugin Folder';
            chooseFolderBtn.style.marginTop = '8px';
            
            // Create path display (initially hidden)
            const pathDisplay = document.createElement('div');
            pathDisplay.id = 'customPluginPathDisplay';
            pathDisplay.style.marginTop = '6px';
            pathDisplay.style.fontSize = '0.85em';
            pathDisplay.style.color = 'var(--text-secondary)';
            pathDisplay.style.display = 'none';
            
            const pathText = document.createElement('span');
            pathText.id = 'customPluginPath';
            
            const clearBtn = document.createElement('button');
            clearBtn.id = 'clearPluginFolderBtn';
            clearBtn.className = 'btn-icon';
            clearBtn.title = 'Clear custom folder';
            clearBtn.textContent = '×';
            clearBtn.style.marginLeft = '8px';
            clearBtn.style.color = 'var(--error-color)';
            
            pathDisplay.appendChild(pathText);
            pathDisplay.appendChild(clearBtn);
            
            // Insert after refresh button
            refreshBtn.parentNode.appendChild(chooseFolderBtn);
            refreshBtn.parentNode.appendChild(pathDisplay);
            
            // Setup event listeners
            chooseFolderBtn.addEventListener('click', () => {
                this.selectPluginFolder();
            });
            
            clearBtn.addEventListener('click', () => {
                this.clearCustomFolder();
            });
            
            // Update path display if we have a saved folder
            this.updatePathDisplay();
        }, 500);
    }
    
    /**
     * Update the path display UI
     */
    updatePathDisplay() {
        const pathElement = document.getElementById('customPluginPath');
        const displayElement = document.getElementById('customPluginPathDisplay');
        
        if (!pathElement || !displayElement) return;
        
        // Get path from localStorage or instance variable
        const savedPath = this.customFolderPath || localStorage.getItem('customPluginFolderPath');
        
        if (savedPath) {
            pathElement.textContent = `Custom: ${savedPath}`;
            displayElement.style.display = 'block';
        } else {
            pathElement.textContent = 'Default: js/plugins/';
            displayElement.style.display = 'none';
        }
    }
    
    /**
     * Open directory picker and select custom plugin folder
     */
    async selectPluginFolder() {
        try {
            // Check if File System Access API is available
            if (!('showDirectoryPicker' in window)) {
                alert('Custom plugin folders require Chrome, Edge, or another Chromium-based browser.');
                return;
            }
            
            // Show directory picker
            const directoryHandle = await window.showDirectoryPicker();
            
            // Store folder handle for future use
            this.customFolderHandle = directoryHandle;
            this.customFolderPath = directoryHandle.name;
            await this.storeFolderHandle(directoryHandle, directoryHandle.name);
            
            // Update UI
            this.updatePathDisplay();
            
            // Scan and load plugins from selected folder
            await this.scanAndLoadCustomPlugins();
            
        } catch (error) {
            if (error.name === 'AbortError') {
                // Folder selection cancelled by user - silent
            } else {
                console.error('Error selecting plugin folder:', error);
                alert('Error selecting folder: ' + error.message);
            }
        }
    }
    
    /**
     * Clear custom folder and revert to default
     */
    async clearCustomFolder() {
        const confirmed = confirm('Clear custom plugin folder and revert to default (js/plugins/)?');
        if (!confirmed) return;
        
        try {
            // Clear from IndexedDB
            if (this.db) {
                const transaction = this.db.transaction(['folderHandles'], 'readwrite');
                const store = transaction.objectStore('folderHandles');
                await store.delete('customPluginFolder');
            }
            
            // Clear from localStorage
            localStorage.removeItem('customPluginFolderPath');
            
            // Clear instance variables
            this.customFolderHandle = null;
            this.customFolderPath = null;
            
            // Update UI
            this.updatePathDisplay();
            
            // Optionally refresh plugins
            if (window.pluginAutoLoader) {
                await window.pluginAutoLoader.manualRefresh();
            }
            
        } catch (error) {
            console.error('Error clearing custom folder:', error);
        }
    }
    
    /**
     * Scan custom folder for plugins and load them
     */
    async scanAndLoadCustomPlugins() {
        if (!this.customFolderHandle) {
            return [];
        }
        
        try {
            const pluginFiles = [];
            
            // Iterate through directory entries
            for await (const entry of this.customFolderHandle.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    
                    // Filter for *-freque-plugin.js files
                    if (file.name.endsWith('-freque-plugin.js')) {
                        pluginFiles.push(file);
                    }
                }
            }
            
            // Load each plugin
            for (const file of pluginFiles) {
                await this.loadPluginFromFile(file);
            }
            
            return pluginFiles;
            
        } catch (error) {
            console.error('Error scanning custom plugin folder:', error);
            alert('Error scanning plugin folder. Please check folder permissions.');
            return [];
        }
    }
    
    /**
     * Load a plugin from a file object
     */
    async loadPluginFromFile(file) {
        try {
            // Read file contents
            const code = await file.text();
            
            // Create script element and execute
            const script = document.createElement('script');
            script.textContent = code;
            script.setAttribute('data-custom-plugin', file.name);
            document.head.appendChild(script);
            
        } catch (error) {
            console.error(`❌ Failed to load plugin ${file.name}:`, error);
            throw error;
        }
    }
    
    /**
     * Check if a custom folder is configured
     */
    hasCustomFolder() {
        return this.customFolderHandle !== null;
    }
    
    /**
     * Get list of custom plugin files (for refresh functionality)
     */
    async getCustomPluginFiles() {
        if (!this.customFolderHandle) {
            return [];
        }
        
        try {
            const pluginFiles = [];
            
            for await (const entry of this.customFolderHandle.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    if (file.name.endsWith('-freque-plugin.js')) {
                        pluginFiles.push(file.name);
                    }
                }
            }
            
            return pluginFiles;
            
        } catch (error) {
            console.error('Error getting custom plugin files:', error);
            return [];
        }
    }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
    new PluginFolderManager();
});

