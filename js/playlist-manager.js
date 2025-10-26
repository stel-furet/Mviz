// PlaylistManager Class - Handles dynamic playlist creation and management
class PlaylistManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.currentPlaylist = null;
        this.isScanning = false;
        this.scanCancelled = false;
        this.supportedFormats = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'];
        this.maxFiles = 250;
        this.defaultArtwork = this.generateDefaultArtwork();
        this.appIcon = this.generateAppIcon();
        this.folderHandle = null;
        this.isBackgroundScanning = false;
        
        // Load cached playlist
        this.loadCachedPlaylist();
        
        // Auto-display cached playlist if it exists
        if (this.currentPlaylist && this.currentPlaylist.tracks && this.currentPlaylist.tracks.length > 0) {
            // Delay to ensure UI is ready
            setTimeout(() => {
                // Auto-displaying cached playlist...
                this.displayPlaylist();
                this.visualizer.updatePlaylistFromManager(this.currentPlaylist);
                
                // Start background rescan to enable playback
                this.startBackgroundRescan();
            }, 1000);
        }
        
        // Test default artwork generation
        // console.log('Default artwork generated:', this.defaultArtwork.substring(0, 50) + '...');
        
        // Test app icon generation
        // console.log('App icon generated:', this.appIcon.substring(0, 50) + '...');
        
        // Check music-metadata library availability
        this.checkMetadataLibrary();
        
        // Add test method for debugging
        window.testMetadataExtraction = (file) => this.extractMetadata(file);
        
        // Initialize tabbed interface (Phase 2 - hidden)
        this.initializeTabbedInterface();
        
        // Phase 4: Activate tabbed interface
        document.body.classList.add('tab-interface-active');
        // console.log('✓ Tabbed interface activated');
        
        // Phase 3 test: Add temporary test function for Audio + Video tabs
        // testAudioTab removed - functionality moved to sidebar
        
        // testVideoTab removed - functionality moved to sidebar
        
        // testAllTabs removed - functionality moved to sidebar
        
        // testAutopilotTab removed - functionality moved to sidebar
        
        // testVisualizationsTab removed - functionality moved to sidebar
        
        // testOutputTab removed - functionality moved to sidebar
        
        // Note: playlistToggle button was removed when we embedded the playlist
        // The playlist is now permanently visible in the Audio section
    }
    
    generateAppIcon() {
        // Create 60x60 app icon - grey placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        
        // Grey background
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 60, 60);
        
        // Darker grey border
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 58, 58);
        
        // Simple "F" for Freque
        ctx.fillStyle = '#404040';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('F', 30, 30);
        
        // Convert to JPG data URL
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    generateDefaultArtwork() {
        // Create 240x240 default artwork - grey background with "no music" icon
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        
        // Grey background
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 240, 240);
        
        // Darker grey border
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 236, 236);
        
        // Draw "no music" symbol (musical note with slash)
        ctx.save();
        ctx.translate(120, 120); // Center
        
        // Musical note (simplified)
        ctx.fillStyle = '#404040';
        ctx.beginPath();
        // Note stem
        ctx.rect(15, -40, 8, 60);
        // Note head
        ctx.ellipse(0, 20, 20, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Red slash
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-35, -35);
        ctx.lineTo(35, 35);
        ctx.stroke();
        
        ctx.restore();
        
        // Convert to JPG data URL
        return canvas.toDataURL('image/jpeg', 0.8);
    }
    
    populatePlaylistDropdown() {
        const dropdown = document.getElementById('playlistDropdown');
        if (!dropdown) return;
        
        dropdown.innerHTML = `
            <!-- Playlist Actions -->
            <div class="playlist-actions-dropdown">
                <button class="btn-primary" id="playlistScanBtn" title="Add Music Folder">Add Folder</button>
                <button class="btn-secondary" id="playlistImportBtn" title="Import Playlist">Import</button>
                <button class="btn-secondary" id="playlistExportBtn" title="Export Playlist">Export</button>
            </div>
            
            <!-- Scanning Progress (hidden by default) -->
            <div class="playlist-progress" id="playlistProgress" style="display: none;">
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
                <div class="progress-info">
                    <span class="progress-text" id="progressText">Scanning music folder...</span>
                    <span class="progress-count" id="progressCount">0/0 files</span>
                    <span class="progress-eta" id="progressEta">Est: calculating...</span>
                </div>
                <button class="btn-secondary progress-cancel-btn" id="progressCancelBtn">Cancel</button>
            </div>
            
            <!-- Playlist Stats -->
            <div class="playlist-stats" id="playlistStats">
                <span class="playlist-track-count" id="playlistTrackCount">No tracks loaded</span>
                <span class="playlist-duration" id="playlistDuration">0:00:00</span>
            </div>
            
            <!-- Tracks Container -->
            <div class="playlist-tracks-container" id="playlistTracksContainer">
                <div class="playlist-tracks" id="playlistTracks">
                    <!-- Artist groups will be populated here -->
                    <div class="empty-playlist">
                        <div class="empty-playlist-icon">🎵</div>
                        <div class="empty-playlist-text">No music loaded</div>
                        <div class="empty-playlist-subtext">Click "Add Folder" to scan your music library</div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('Playlist dropdown content populated');
        
        // Re-initialize event handlers after populating content
        if (this.visualizer) {
            this.visualizer.initializePlaylistUI();
        }
        
        // Specifically initialize the close button that was just created
        setTimeout(() => {
            this.initializeCloseButton();
        }, 100);
    }
    
    initializeCloseButton() {
        // Close button removed - playlist is now embedded in sidebar
        console.log('Playlist is embedded - no close button needed');
    }
    
    showRescanNotification() {
        // Update the empty playlist area to show rescan message
        setTimeout(() => {
            const tracksContainer = document.getElementById('playlistTracks');
            if (tracksContainer && this.currentPlaylist && this.currentPlaylist.tracks.some(track => !track.url)) {
                // Remove any existing notification
                const existingNotification = tracksContainer.querySelector('.rescan-notification');
                if (existingNotification) {
                    existingNotification.remove();
                }
                
                // Add a notification at the top
                const notification = document.createElement('div');
                notification.className = 'rescan-notification';
                
                const isImported = this.currentPlaylist.folderPath === 'Imported';
                const message = isImported ? 
                    'Click "Add Folder" to select the music folder for these tracks' :
                    'Click "Add Folder" to rescan the music folder and enable playback';
                
                notification.innerHTML = `
                    <div class="notification-icon">ℹ️</div>
                    <div class="notification-text">
                        <strong>${isImported ? 'Imported playlist loaded' : 'Playlist loaded from cache'}</strong><br>
                        <small>${message}</small>
                    </div>
                `;
                tracksContainer.insertBefore(notification, tracksContainer.firstChild);
            }
        }, 100);
    }
    
    async initializeIndexedDB() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('FrequePlaylistDB', 1);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create object store for folder handles
                    if (!db.objectStoreNames.contains('folderHandles')) {
                        const store = db.createObjectStore('folderHandles', { keyPath: 'id' });
                        console.log('Created folderHandles object store');
                    }
                };
            });
        } catch (error) {
            console.error('IndexedDB initialization failed:', error);
            return null;
        }
    }
    
    async storeFolderHandle(handle, playlistName) {
        try {
            const db = await this.initializeIndexedDB();
            if (!db) return;
            
            const transaction = db.transaction(['folderHandles'], 'readwrite');
            const store = transaction.objectStore('folderHandles');
            
            const folderData = {
                id: 'currentFolder',
                handle: handle,
                name: playlistName,
                lastAccessed: Date.now()
            };
            
            await store.put(folderData);
            console.log('✅ Folder handle stored in IndexedDB');
            
        } catch (error) {
            console.error('Error storing folder handle:', error);
        }
    }
    
    async loadFolderHandle() {
        try {
            const db = await this.initializeIndexedDB();
            if (!db) return null;
            
            const transaction = db.transaction(['folderHandles'], 'readonly');
            const store = transaction.objectStore('folderHandles');
            
            return new Promise((resolve, reject) => {
                const request = store.get('currentFolder');
                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.handle) {
                        console.log('✅ Folder handle loaded from IndexedDB:', result.name);
                        resolve(result.handle);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            console.error('Error loading folder handle:', error);
            return null;
        }
    }
    
    async startBackgroundRescan() {
        try {
            // Starting background rescan...
            
            // Try to load stored folder handle
            const storedHandle = await this.loadFolderHandle();
            if (!storedHandle) {
                console.log('No stored folder handle found - user will need to rescan manually');
                this.showRescanNotification();
                return;
            }
            
            // Check if current playlist is from the same folder
            if (this.currentPlaylist.folderPath === 'Imported') {
                console.log('Imported playlist detected - cannot auto-rescan, user must select folder');
                this.showRescanNotification();
                return;
            }
            
            this.folderHandle = storedHandle;
            this.isBackgroundScanning = true;
            
            // Show subtle loading indicator
            this.showBackgroundScanIndicator();
            
            // Verify folder access
            try {
                await storedHandle.requestPermission({ mode: 'read' });
            } catch (permissionError) {
                console.warn('Folder permission denied, user will need to rescan manually');
                this.showRescanNotification();
                this.hideBackgroundScanIndicator();
                return;
            }
            
            // Scan folder in background
            const files = await this.scanDirectoryForAudioFiles(storedHandle);
            // Background scan found files
            
            // Process files progressively
            await this.processFilesProgressively(files);
            
            // console.log('✅ Background rescan completed');
            this.hideBackgroundScanIndicator();
            
        } catch (error) {
            console.error('Background rescan failed:', error);
            this.showRescanNotification();
            this.hideBackgroundScanIndicator();
        } finally {
            this.isBackgroundScanning = false;
        }
    }
    
    async processFilesProgressively(files) {
        const batchSize = 3; // Smaller batches for background processing
        let processedCount = 0;
        
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            
            // Process batch
            const batchTracks = await Promise.all(
                batch.map(file => this.extractMetadata(file))
            );
            
            // Update existing tracks with new URLs
            batchTracks.forEach(newTrack => {
                if (newTrack) {
                    const existingTrack = this.findTrackByFilename(newTrack.filename);
                    if (existingTrack) {
                        existingTrack.url = newTrack.url;
                        existingTrack.file = newTrack.file;
                        existingTrack._needsRescan = false;
                        // console.log(`✅ Enabled playback for: ${existingTrack.title}`);
                    }
                }
            });
            
                    // Update track display progressively (enable play buttons as tracks become ready)
                    this.updateTrackPlayabilityUI();
                    
                    // Update visualizer playlist progressively
                    this.visualizer.updatePlaylistFromManager(this.currentPlaylist);
                    
                    processedCount += batch.length;
                    this.updateBackgroundScanProgress(processedCount, files.length);
                    
                    // Yield to UI thread
                    await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    findTrackByFilename(filename) {
        if (!this.currentPlaylist) return null;
        return this.currentPlaylist.tracks.find(track => track.filename === filename);
    }
    
    updateTrackPlayabilityUI() {
        // Update track items to reflect their current playability status
        document.querySelectorAll('.track-item').forEach(item => {
            const trackId = item.dataset.trackId;
            const track = this.findTrackById(trackId);
            
            if (track) {
                const playBtn = item.querySelector('.track-play-btn');
                const isPlayable = track.url && !track._needsRescan;
                
                if (isPlayable) {
                    // Enable track
                    item.classList.remove('needs-rescan');
                    if (playBtn) {
                        playBtn.disabled = false;
                        playBtn.title = 'Play Track';
                    }
                } else {
                    // Keep disabled
                    item.classList.add('needs-rescan');
                    if (playBtn) {
                        playBtn.disabled = true;
                        playBtn.title = 'Rescan folder to play';
                    }
                }
            }
        });
    }
    
    showBackgroundScanIndicator() {
        // Add subtle indicator that background scanning is happening
        const stats = document.getElementById('playlistStats');
        if (stats) {
            const indicator = document.createElement('div');
            indicator.id = 'backgroundScanIndicator';
            indicator.className = 'background-scan-indicator';
            indicator.innerHTML = `
                <span class="scan-icon">🔄</span>
                <span class="scan-text">Enabling playback...</span>
            `;
            stats.appendChild(indicator);
        }
    }
    
    hideBackgroundScanIndicator() {
        const indicator = document.getElementById('backgroundScanIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    updateBackgroundScanProgress(current, total) {
        const indicator = document.getElementById('backgroundScanIndicator');
        if (indicator) {
            const scanText = indicator.querySelector('.scan-text');
            if (scanText) {
                scanText.textContent = `Enabling playback... ${current}/${total}`;
            }
        }
    }
    
    initializeTabbedInterface() {
        // Phase 2: Initialize the hidden tabbed interface
        try {
            // Set app icon source
            const appIcon = document.getElementById('appIcon');
            if (appIcon && this.appIcon) {
                appIcon.src = this.appIcon;
                console.log('✓ App icon initialized');
            }
            
            // Initialize tab click handlers (inactive until Phase 5)
            document.querySelectorAll('.tab-item').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (document.body.classList.contains('tab-interface-active')) {
                        const section = e.target.dataset.section;
                        this.toggleSectionPanel(section);
                    }
                });
            });
            
            // Add click-outside handler to close panels
            document.addEventListener('click', (e) => {
                // Tab header removed - click outside handler simplified
                const openPanel = document.querySelector('.section-panel.show');
                
                // If clicking outside open panel, close it
                if (openPanel && !openPanel.contains(e.target)) {
                    openPanel.classList.remove('show');
                    console.log('Panel closed (click outside)');
                }
            });
            
            // console.log('✓ Tabbed interface initialized (hidden)');
            
        } catch (error) {
            console.error('Error initializing tabbed interface:', error);
        }
    }
    
    toggleSectionPanel(sectionName) {
        const panel = document.getElementById(`${sectionName}Panel`);
        const tab = document.getElementById(`${sectionName}Tab`);
        
        if (panel && tab) {
            const isOpen = panel.classList.contains('show');
            
            if (isOpen) {
                // Close this panel
                panel.classList.remove('show');
                tab.classList.remove('active');
                console.log(`${sectionName} panel closed`);
            } else {
                // Close all other panels first (only 1 tab open at a time)
                document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('show'));
                document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                
                // Panel positioning simplified - no tab header reference needed
                panel.style.left = '0px';
                panel.style.transform = 'none';
                
                // Open this panel
                panel.classList.add('show');
                tab.classList.add('active');
                console.log(`${sectionName} panel opened at tab position (others closed)`);
            }
        }
    }
    
    checkMetadataLibrary() {
        // Use our embedded lightweight metadata parser
        if (typeof window.lightweightMetadata !== 'undefined') {
            this.musicMetadata = window.lightweightMetadata;
            // console.log('✓ Lightweight metadata parser ready (supports MP3 ID3 tags)');
            return;
        }
        
        // Fallback if even our embedded parser isn't ready
        console.warn('⚠ Metadata parser not ready - using filename-only fallback');
        this.musicMetadata = null;
    }
    
    loadCachedPlaylist() {
        try {
            const cached = localStorage.getItem('freque_current_playlist');
            if (cached) {
                this.currentPlaylist = JSON.parse(cached);
                // console.log('Loaded cached playlist:', this.currentPlaylist.tracks?.length || 0, 'tracks');
                
                // Note: Cached playlists don't have file objects or blob URLs
                // They will display metadata but won't be playable until folder is rescanned
                if (this.currentPlaylist.tracks) {
                    this.currentPlaylist.tracks.forEach(track => {
                        if (!track.url) {
                            track._needsRescan = true; // Mark as needing rescan for playback
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading cached playlist:', error);
            this.currentPlaylist = null;
        }
    }
    
    savePlaylist() {
        // Use the saveToCacheOnly method to avoid duplication
        this.saveToCacheOnly();
    }
    
    saveToCacheOnly() {
        // Save metadata to cache without affecting the in-memory playlist with URLs
        try {
            if (this.currentPlaylist) {
                // Create a serializable copy (remove file objects and blob URLs for caching)
                const serializablePlaylist = {
                    ...this.currentPlaylist,
                    tracks: this.currentPlaylist.tracks.map(track => ({
                        id: track.id,
                        title: track.title,
                        artist: track.artist,
                        album: track.album,
                        duration: track.duration,
                        artwork: track.artwork,
                        filename: track.filename,
                        size: track.size,
                        type: track.type,
                        lastModified: track.lastModified
                        // Exclude: file, url (not serializable/temporary)
                    }))
                };
                
                // Save current playlist
                localStorage.setItem('freque_current_playlist', JSON.stringify(serializablePlaylist));
                
                // Save to playlist cache with folder hash
                const folderHash = this.generateFolderHash(this.currentPlaylist.folderPath);
                const cacheKey = `freque_playlist_cache_${folderHash}`;
                localStorage.setItem(cacheKey, JSON.stringify(serializablePlaylist));
                
                // Update cache index
                this.updateCacheIndex(folderHash, this.currentPlaylist.folderPath);
                
                console.log('Playlist saved to cache (metadata only, URLs preserved in memory)');
            }
        } catch (error) {
            console.error('Error saving playlist to cache:', error);
        }
    }
    
    generateFolderHash(folderPath) {
        // Generate hash from folder path for caching
        if (!folderPath) return 'default';
        return btoa(folderPath).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }
    
    updateCacheIndex(folderHash, folderPath) {
        try {
            let cacheIndex = {};
            const existing = localStorage.getItem('freque_playlist_cache_index');
            if (existing) {
                cacheIndex = JSON.parse(existing);
            }
            
            cacheIndex[folderHash] = {
                folderPath: folderPath,
                lastAccessed: Date.now(),
                trackCount: this.currentPlaylist.tracks?.length || 0
            };
            
            localStorage.setItem('freque_playlist_cache_index', JSON.stringify(cacheIndex));
        } catch (error) {
            console.error('Error updating cache index:', error);
        }
    }
    
    loadCachedPlaylistByFolder(folderPath) {
        try {
            const folderHash = this.generateFolderHash(folderPath);
            const cacheKey = `freque_playlist_cache_${folderHash}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const playlist = JSON.parse(cached);
                console.log(`Found cached playlist for folder: ${playlist.tracks?.length || 0} tracks`);
                return playlist;
            }
        } catch (error) {
            console.error('Error loading cached playlist by folder:', error);
        }
        return null;
    }
    
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return "0:00";
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    isAudioFile(file) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return this.supportedFormats.includes(extension);
    }
    
    async scanFolder() {
        try {
            console.log('Starting folder scan...');
            
            // Check if File System Access API is available
            if (!('showDirectoryPicker' in window)) {
                alert('Folder selection not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.');
                return;
            }
            
            // Show directory picker
            const directoryHandle = await window.showDirectoryPicker();
            console.log('Folder selected:', directoryHandle.name);
            
            // Store folder handle for future use
            this.folderHandle = directoryHandle;
            await this.storeFolderHandle(directoryHandle, directoryHandle.name);
            
            // Show warning about playlist replacement
            const confirmed = confirm(
                "⚠️ Current playlist will be replaced!\n\n" +
                "Your current playlist will be lost. Consider exporting it first for later use.\n\n" +
                "Continue with folder scan?"
            );
            
            if (!confirmed) {
                console.log('Folder scan cancelled by user');
                return;
            }
            
            // Start scanning process
            this.isScanning = true;
            this.scanCancelled = false;
            this.showProgress();
            
            // Scan folder for audio files
            const files = await this.scanDirectoryForAudioFiles(directoryHandle);
            
            if (this.scanCancelled) {
                console.log('Scan cancelled during file discovery');
                this.hideProgress();
                return;
            }
            
            console.log(`Found ${files.length} audio files`);
            
            // Check file limit
            if (files.length > this.maxFiles) {
                const confirmed = confirm(
                    `Found ${files.length} audio files, but limit is ${this.maxFiles}.\n\n` +
                    `Only the first ${this.maxFiles} files will be processed. Continue?`
                );
                
                if (!confirmed) {
                    this.hideProgress();
                    return;
                }
                
                files.splice(this.maxFiles); // Keep only first maxFiles
            }
            
            // Process files with progress tracking
            const tracks = await this.processFilesWithProgress(files);
            
            if (this.scanCancelled) {
                console.log('Scan cancelled during processing');
                this.hideProgress();
                return;
            }
            
            // Build playlist
            this.currentPlaylist = {
                name: directoryHandle.name,
                folderPath: directoryHandle.name,
                lastScanned: Date.now(),
                tracks: tracks.filter(track => track !== null) // Remove failed tracks
            };
            
            // Save to cache (metadata only, preserves in-memory version with URLs)
            this.saveToCacheOnly();
            
            console.log(`✅ Playlist created with ${this.currentPlaylist.tracks.length} tracks`);
            console.log('First few tracks:', this.currentPlaylist.tracks.slice(0, 3).map(t => `${t.title} by ${t.artist}`));
            
            // Test first track URL validity immediately
            if (this.currentPlaylist.tracks.length > 0) {
                const firstTrack = this.currentPlaylist.tracks[0];
                console.log('Testing first track URL validity:', firstTrack.url);
                
                // Test if blob URL is accessible
                fetch(firstTrack.url)
                    .then(response => {
                        console.log('✅ Blob URL is valid and accessible');
                    })
                    .catch(error => {
                        console.error('❌ Blob URL is invalid:', error);
                    });
            }
            
            // Update visualizer playlist first
            this.visualizer.updatePlaylistFromManager(this.currentPlaylist);
            
            // Then update the display
            this.displayPlaylist();
            this.hideProgress();
            
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Folder selection cancelled by user');
            } else {
                console.error('Error during folder scan:', error);
                alert('Error scanning folder: ' + error.message);
            }
            this.hideProgress();
        } finally {
            this.isScanning = false;
        }
    }
    
    async scanDirectoryForAudioFiles(directoryHandle) {
        const files = [];
        
        try {
            for await (const entry of directoryHandle.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    if (this.isAudioFile(file)) {
                        files.push(file);
                    }
                }
                
                // Check for cancellation
                if (this.scanCancelled) break;
            }
        } catch (error) {
            console.error('Error scanning directory:', error);
            throw new Error('Failed to scan directory. Please check folder permissions.');
        }
        
        return files;
    }
    
    async processFilesWithProgress(files) {
        const tracks = [];
        const totalFiles = files.length;
        const startTime = Date.now();
        
        this.updateProgress(0, totalFiles, 'Processing files...');
        
        // Process files in chunks to maintain UI responsiveness
        const chunkSize = 5;
        for (let i = 0; i < files.length; i += chunkSize) {
            if (this.scanCancelled) break;
            
            const chunk = files.slice(i, i + chunkSize);
            
            // Process chunk in parallel
            const chunkPromises = chunk.map(async (file, index) => {
                try {
                    this.updateProgress(i + index, totalFiles, `Processing: ${file.name}`);
                    return await this.extractMetadata(file);
                } catch (error) {
                    console.warn(`Skipping file ${file.name}:`, error);
                    return null;
                }
            });
            
            const chunkResults = await Promise.all(chunkPromises);
            tracks.push(...chunkResults);
            
            // Update progress
            const processed = Math.min(i + chunkSize, totalFiles);
            const elapsed = Date.now() - startTime;
            const eta = totalFiles > processed ? (elapsed / processed) * (totalFiles - processed) : 0;
            
            this.updateProgress(processed, totalFiles, `Processed ${processed}/${totalFiles} files`, eta);
            
            // Yield to UI thread
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        return tracks;
    }
    
    showProgress() {
        const progress = document.getElementById('playlistProgress');
        if (progress) {
            progress.style.display = 'block';
        }
    }
    
    hideProgress() {
        const progress = document.getElementById('playlistProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }
    
    updateProgress(current, total, text, etaMs = 0) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressCount = document.getElementById('progressCount');
        const progressEta = document.getElementById('progressEta');
        
        if (progressBar) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressBar.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
        
        if (progressCount) {
            progressCount.textContent = `${current}/${total} files`;
        }
        
        if (progressEta && etaMs > 0) {
            const etaSeconds = Math.round(etaMs / 1000);
            const mins = Math.floor(etaSeconds / 60);
            const secs = etaSeconds % 60;
            progressEta.textContent = `Est: ${mins}:${secs.toString().padStart(2, '0')}`;
        } else if (progressEta) {
            progressEta.textContent = etaMs === 0 && current === total ? 'Complete!' : 'Est: calculating...';
        }
    }
    
    cancelScan() {
        this.scanCancelled = true;
        this.isScanning = false;
        console.log('Playlist scan cancelled by user');
        
        // Hide progress
        const progress = document.getElementById('playlistProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }
    
    async extractMetadata(file) {
        try {
            // console.log(`Extracting metadata from: ${file.name}`);
            
            const track = {
                id: this.generateTrackId(file),
                filename: file.name,
                relativePath: file.webkitRelativePath || file.name, // Use webkitRelativePath if available, fallback to filename
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            };
            
            // Try metadata extraction if parser available
            if (this.musicMetadata) {
                try {
                    const metadata = await this.musicMetadata.parseFile(file);
                    
                    if (metadata && (metadata.title || metadata.artist || metadata.album)) {
                        track.title = metadata.title || this.extractTitleFromFilename(file.name);
                        track.artist = metadata.artist || "Unknown";
                        track.album = metadata.album || "Unknown";
                        track.duration = 0; // Will be calculated via Web Audio API
                        track.artwork = this.defaultArtwork; // Use default for now
                        
                        // console.log(`✓ Metadata extracted: "${track.title}" by ${track.artist} (${track.album})`);
                    } else {
                        this.applyFallbackMetadata(track, file);
                    }
                    
                } catch (metadataError) {
                    console.warn(`Metadata parsing failed for ${file.name}:`, metadataError);
                    this.applyFallbackMetadata(track, file);
                }
            } else {
                // Fallback metadata extraction
                this.applyFallbackMetadata(track, file);
            }
            
            // Get duration using Web Audio API if not available from metadata
            if (!track.duration || track.duration === 0) {
                track.duration = await this.getDurationFromAudio(file);
            }
            
            // Create object URL for playback
            track.url = URL.createObjectURL(file);
            track.file = file; // Keep reference to original file
            // console.log(`Created blob URL for ${track.title}: ${track.url}`);
            
            return track;
            
        } catch (error) {
            console.error(`Failed to process ${file.name}:`, error);
            return null; // Skip this file
        }
    }
    
    generateTrackId(file) {
        // Generate unique ID based on filename and modification time
        return btoa(`${file.name}_${file.lastModified}_${file.size}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }
    
    extractTitleFromFilename(filename) {
        // Remove extension and clean up filename for title
        return filename
            .replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '')
            .replace(/[-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim() || 'Unknown';
    }
    
    applyFallbackMetadata(track, file) {
        track.title = this.extractTitleFromFilename(file.name);
        track.artist = "Unknown";
        track.album = "Unknown";
        track.duration = 0; // Will be calculated separately
        track.artwork = this.defaultArtwork;
        
        console.log(`Using fallback metadata for: ${track.title}`);
    }
    
    
    async resizeArtwork(blob) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 240;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                
                // Draw image scaled to 240x240
                ctx.drawImage(img, 0, 0, 240, 240);
                
                // Convert to JPG data URL
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl);
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(blob);
        });
    }
    
    async getDurationFromAudio(file) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioContext.close();
            
            return audioBuffer.duration;
        } catch (error) {
            console.warn(`Duration extraction failed for ${file.name}:`, error);
            return 0;
        }
    }
    
    displayPlaylist() {
        // displayPlaylist called
        // currentPlaylist exists
        // tracks exist
        // tracks length check
        
        // Ensure dropdown content is populated first
        this.ensureDropdownContent();
        
        if (!this.currentPlaylist || !this.currentPlaylist.tracks) {
            console.log('Displaying empty playlist');
            this.displayEmptyPlaylist();
            return;
        }
        
        // Updating playlist stats...
        // Update stats
        this.updatePlaylistStats();
        
        // Preparing tracks for display...
        // Use current order if user has customized it, otherwise sort alphabetically
        let tracksToDisplay;
        if (this.currentPlaylist.hasCustomOrder) {
            console.log('Using custom track order');
            tracksToDisplay = this.currentPlaylist.tracks;
        } else {
            // Using alphabetical sort
            tracksToDisplay = this.sortTracksForDisplay(this.currentPlaylist.tracks);
        }
        // Tracks to display count
        
        // Rendering track list...
        // Display tracks
        this.renderTrackList(tracksToDisplay);
        
        // Updating track dropdown...
        // Update dropdown for backward compatibility
        this.updateTrackDropdown();
        
        // Update header playlist directly
        this.updateHeaderPlaylist();
        
        // displayPlaylist completed
    }
    
    ensureDropdownContent() {
        const dropdown = document.getElementById('playlistDropdown');
        const tracksContainer = document.getElementById('playlistTracks');
        const hasNewContent = dropdown && dropdown.querySelector('.playlist-actions-dropdown');
        
        // Checking dropdown content
        // Dropdown exists check
        // TracksContainer exists check
        // Has new content check
        
        // Check for playlist actions to confirm it's our new content
        const hasPlaylistActions = dropdown && dropdown.innerHTML.includes('playlist-actions-dropdown');
        
        if (!hasPlaylistActions && dropdown) {
            console.log('Dropdown missing panel header, populating with new content...');
            this.populatePlaylistDropdown();
            
            // Re-initialize UI handlers after populating
            this.visualizer.initializePlaylistUI();
        } else if (hasPlaylistActions) {
            console.log('New dropdown content with playlist actions already exists');
        } else {
            // console.error('Dropdown element not found!');
        }
        
        // Update header playlist if it exists
        this.updateHeaderPlaylist();
    }
    
    updateHeaderPlaylist() {
        const headerPlaylist = document.getElementById('headerPlaylistDropdown');
        if (!headerPlaylist) return;
        
        console.log('Updating header playlist...');
        console.log('Current playlist exists:', !!this.currentPlaylist);
        console.log('Current playlist tracks:', this.currentPlaylist?.tracks?.length || 0);
        
        // Create the header playlist content directly
        this.renderHeaderPlaylistContent(headerPlaylist);
    }
    
    renderHeaderPlaylistContent(headerContainer) {
        const hasPlaylist = this.currentPlaylist && this.currentPlaylist.tracks && this.currentPlaylist.tracks.length > 0;
        
        let statsHtml = 'No tracks loaded';
        let durationHtml = '0:00:00';
        
        if (hasPlaylist) {
            const trackCount = this.currentPlaylist.tracks.length;
            statsHtml = `${trackCount} track${trackCount !== 1 ? 's' : ''}`;
            durationHtml = '0:00:00'; // Simplified for now
        }
        
        // Create basic structure
        headerContainer.innerHTML = `
            <!-- Playlist Actions -->
            <div class="playlist-actions-dropdown">
                <button class="btn-primary" title="Add Music Folder">Add Folder</button>
                <button class="btn-secondary" title="Import Playlist">Import</button>
                <button class="btn-secondary" title="Export Playlist">Export</button>
            </div>
            
            <!-- Playlist Stats -->
            <div class="playlist-stats">
                <span class="playlist-track-count">${statsHtml}</span>
                <span class="playlist-duration">${durationHtml}</span>
            </div>
            
            <!-- Tracks Container -->
            <div class="playlist-tracks-container">
                <div class="playlist-tracks" id="headerPlaylistTracks">
                    ${hasPlaylist ? '' : `
                        <div class="empty-playlist">
                            <div class="empty-playlist-icon">🎵</div>
                            <div class="empty-playlist-text">No music loaded</div>
                            <div class="empty-playlist-subtext">Click "Add Folder" to scan your music library</div>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        // If we have tracks, render them into the header tracks container
        if (hasPlaylist) {
            const headerTracksContainer = headerContainer.querySelector('#headerPlaylistTracks');
            if (headerTracksContainer) {
                // Temporarily set the ID so renderTrackList can find it
                const originalId = headerTracksContainer.id;
                headerTracksContainer.id = 'tempHeaderPlaylistTracks';
                
                // Use existing renderTrackList method but target the header container
                this.renderTrackListToContainer(this.currentPlaylist.tracks, headerTracksContainer);
                
                headerTracksContainer.id = originalId;
            }
        }
        
        // Bind events to the header playlist
        this.bindHeaderPlaylistEvents(headerContainer);
    }
    
    renderTrackListToContainer(tracks, container) {
        // Simple track rendering for header
        let html = '';
        
        // Group tracks by artist for better organization
        const artistGroups = {};
        tracks.forEach(track => {
            const artist = track.artist || 'Unknown Artist';
            if (!artistGroups[artist]) {
                artistGroups[artist] = [];
            }
            artistGroups[artist].push(track);
        });
        
        // Render each artist group
        Object.keys(artistGroups).sort().forEach(artist => {
            html += `<div class="artist-group">`;
            html += `<div class="artist-header">${artist}</div>`;
            
            artistGroups[artist].forEach(track => {
                html += `
                    <div class="track-item" data-track-id="${track.id}" draggable="true">
                        <div class="track-info">
                            <div class="track-title">${track.title || 'Unknown Title'}</div>
                            ${track.album ? `<div class="track-album">${track.album}</div>` : ''}
                        </div>
                        <div class="track-controls">
                            <button class="track-play-btn btn-square" data-track-id="${track.id}" title="Play">▶</button>
                            <button class="track-remove-btn btn-square" data-track-id="${track.id}" title="Remove">✕</button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        container.innerHTML = html;
    }
    
    populateHeaderPlaylistDirect(headerContainer) {
        headerContainer.innerHTML = `
            <!-- Playlist Actions -->
            <div class="playlist-actions-dropdown">
                <button class="btn-primary" title="Add Music Folder">Add Folder</button>
                <button class="btn-secondary" title="Import Playlist">Import</button>
                <button class="btn-secondary" title="Export Playlist">Export</button>
            </div>
            
            <!-- Scanning Progress (hidden by default) -->
            <div class="playlist-progress" style="display: none;">
                <div class="progress-bar-container">
                    <div class="progress-bar"></div>
                </div>
                <div class="progress-info">
                    <span class="progress-text">Scanning music folder...</span>
                    <span class="progress-count">0/0 files</span>
                    <span class="progress-eta">Est: calculating...</span>
                </div>
                <button class="btn-secondary progress-cancel-btn">Cancel</button>
            </div>
            
            <!-- Playlist Stats -->
            <div class="playlist-stats">
                <span class="playlist-track-count">No tracks loaded</span>
                <span class="playlist-duration">0:00:00</span>
            </div>
            
            <!-- Tracks Container -->
            <div class="playlist-tracks-container">
                <div class="playlist-tracks">
                    <!-- Artist groups will be populated here -->
                    <div class="empty-playlist">
                        <div class="empty-playlist-icon">🎵</div>
                        <div class="empty-playlist-text">No music loaded</div>
                        <div class="empty-playlist-subtext">Click "Add Folder" to scan your music library</div>
                    </div>
                </div>
            </div>
        `;
        
        // Bind events to the header playlist
        this.bindHeaderPlaylistEvents(headerContainer);
    }
    
    bindHeaderPlaylistEvents(headerContainer) {
        // Bind Add Folder button
        const scanBtn = headerContainer.querySelector('.btn-primary');
        if (scanBtn) {
            scanBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.scanFolder();
            };
        }
        
        // Bind Import button
        const importBtn = headerContainer.querySelector('.btn-secondary:nth-of-type(1)');
        if (importBtn) {
            importBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const importInput = document.getElementById('playlistImportInput');
                if (importInput) {
                    importInput.click();
                }
            };
        }
        
        // Bind Export button
        const exportBtn = headerContainer.querySelector('.btn-secondary:nth-of-type(2)');
        if (exportBtn) {
            exportBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.exportPlaylist();
            };
        }
        
        // Bind Cancel button
        const cancelBtn = headerContainer.querySelector('.progress-cancel-btn');
        if (cancelBtn) {
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.cancelScan();
            };
        }
        
        // Bind track play buttons and other interactive elements
        const playButtons = headerContainer.querySelectorAll('.track-play-btn');
        playButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const trackId = btn.dataset.trackId;
                if (trackId) {
                    this.playTrack(trackId);
                }
            };
        });
        
        // Bind track remove buttons
        const removeButtons = headerContainer.querySelectorAll('.track-remove-btn');
        removeButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const trackId = btn.dataset.trackId;
                if (trackId) {
                    this.removeTrack(trackId);
                }
            };
        });
        
        // Make tracks draggable and set up drop zones (simplified version)
        const tracks = headerContainer.querySelectorAll('.track-item');
        tracks.forEach(track => {
            track.draggable = true;
            
            track.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', track.dataset.trackId);
                track.classList.add('dragging');
            };
            
            track.ondragend = (e) => {
                track.classList.remove('dragging');
            };
            
            track.ondragover = (e) => {
                e.preventDefault();
            };
            
            track.ondrop = (e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                const targetId = track.dataset.trackId;
                if (draggedId && targetId && draggedId !== targetId) {
                    this.reorderTracks(draggedId, targetId);
                }
            };
        });
    }
    
    displayEmptyPlaylist() {
        const tracksContainer = document.getElementById('playlistTracks');
        if (tracksContainer) {
            tracksContainer.innerHTML = `
                <div class="empty-playlist">
                    <div class="empty-playlist-icon">🎵</div>
                    <div class="empty-playlist-text">No music loaded</div>
                    <div class="empty-playlist-subtext">Click "Add Folder" to scan your music library</div>
                </div>
            `;
        }
        
        // Update stats
        const trackCount = document.getElementById('playlistTrackCount');
        const duration = document.getElementById('playlistDuration');
        if (trackCount) trackCount.textContent = 'No tracks loaded';
        if (duration) duration.textContent = '0:00:00';
    }
    
    updatePlaylistStats() {
        const tracks = this.currentPlaylist.tracks || [];
        const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        
        const trackCount = document.getElementById('playlistTrackCount');
        const duration = document.getElementById('playlistDuration');
        
        if (trackCount) {
            trackCount.textContent = `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;
        }
        
        if (duration) {
            const hours = Math.floor(totalDuration / 3600);
            const mins = Math.floor((totalDuration % 3600) / 60);
            const secs = Math.floor(totalDuration % 60);
            
            if (hours > 0) {
                duration.textContent = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else {
                duration.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        }
    }
    
    sortTracksForDisplay(tracks) {
        // Sort tracks alphabetically by artist, then by title
        // This maintains a clean, predictable order for display
        return tracks.slice().sort((a, b) => {
            // First sort by artist
            const artistA = (a.artist || 'Unknown').toLowerCase();
            const artistB = (b.artist || 'Unknown').toLowerCase();
            
            if (artistA !== artistB) {
                return artistA.localeCompare(artistB);
            }
            
            // Then sort by title within same artist
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return titleA.localeCompare(titleB);
        });
    }
    
    renderTrackList(tracks) {
        console.log('=== renderTrackList called ===');
        const tracksContainer = document.getElementById('playlistTracks');
        // tracksContainer found check
        
        if (!tracksContainer) {
            // console.error('playlistTracks container not found!');
            return;
        }
        
        let html = '';
        console.log('Rendering', tracks.length, 'tracks');
        
        tracks.forEach((track, index) => {
            const isPlayable = track.url && !track._needsRescan;
            const needsRescanClass = track._needsRescan ? 'needs-rescan' : '';
            
            html += `
                <div class="track-item ${needsRescanClass}" data-track-id="${track.id}" data-track-index="${index}" draggable="true">
                    <div class="track-info">
                        <div class="track-title">${this.escapeHtml(track.title)}</div>
                        <div class="track-details">
                            <span class="track-artist">${this.escapeHtml(track.artist)}</span>
                            <span class="track-album">${this.escapeHtml(track.album)}</span>
                            <span class="track-duration">${this.formatDuration(track.duration)}</span>
                        </div>
                    </div>
                    <div class="track-actions">
                        <button class="track-play-btn" title="${isPlayable ? 'Play Track' : 'Rescan folder to play'}" ${!isPlayable ? 'disabled' : ''}>▶</button>
                        <button class="track-pause-btn" title="Pause Track" style="display: none;">⏸</button>
                        <button class="track-remove-btn" title="Remove Track">×</button>
                    </div>
                </div>
            `;
        });
        
        console.log('Generated HTML length:', html.length);
        console.log('Setting innerHTML...');
        tracksContainer.innerHTML = html;
        console.log('HTML set, container now has', tracksContainer.children.length, 'children');
        
        // Initialize track event handlers
        this.initializeTrackHandlers();
        console.log('Track handlers initialized');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    initializeTrackHandlers() {
        // Track play buttons
        document.querySelectorAll('.track-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackItem = btn.closest('.track-item');
                const trackId = trackItem?.dataset.trackId;
                if (trackId) {
                    this.playTrack(trackId);
                    // Show pause button, hide play button
                    const pauseBtn = trackItem.querySelector('.track-pause-btn');
                    if (pauseBtn) {
                        btn.style.display = 'none';
                        pauseBtn.style.display = 'inline-block';
                    }
                }
            });
        });
        
        // Track pause buttons
        document.querySelectorAll('.track-pause-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackItem = btn.closest('.track-item');
                const trackId = trackItem?.dataset.trackId;
                if (trackId) {
                    // Pause the track
                    if (this.visualizer && this.visualizer.isPlaying) {
                        this.visualizer.pause();
                    }
                    // Show play button, hide pause button
                    const playBtn = trackItem.querySelector('.track-play-btn');
                    if (playBtn) {
                        btn.style.display = 'none';
                        playBtn.style.display = 'inline-block';
                    }
                }
            });
        });
        
        // Track remove buttons
        document.querySelectorAll('.track-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackItem = btn.closest('.track-item');
                const trackId = trackItem?.dataset.trackId;
                if (trackId) {
                    this.removeTrack(trackId);
                }
            });
        });
        
        // Track item clicks (for selection)
        document.querySelectorAll('.track-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = item.dataset.trackId;
                if (trackId) {
                    this.selectTrack(trackId);
                }
            });
        });
        
        // Drag and drop handlers
        this.initializeDragAndDrop();
    }
    
    initializeDragAndDrop() {
        let draggedTrackId = null;
        let draggedElement = null;
        
        document.querySelectorAll('.track-item').forEach(item => {
            // Drag start
            item.addEventListener('dragstart', (e) => {
                draggedTrackId = item.dataset.trackId;
                draggedElement = item;
                e.dataTransfer.setData('text/plain', draggedTrackId);
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
                console.log('Drag started for track:', draggedTrackId);
            });
            
            // Drag end
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                document.querySelectorAll('.track-item').forEach(i => {
                    i.classList.remove('drag-over', 'drop-not-allowed');
                });
                document.querySelectorAll('.artist-tracks').forEach(a => {
                    a.classList.remove('drag-over');
                });
                draggedTrackId = null;
                draggedElement = null;
            });
            
            // Drag over
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                
                if (draggedElement && item !== draggedElement) {
                    // Check if this is the currently playing track
                    const targetTrackId = item.dataset.trackId;
                    const targetTrack = this.findTrackById(targetTrackId);
                    const isTargetPlaying = this.visualizer.audio && 
                                           this.visualizer.audio.src && 
                                           targetTrack && 
                                           this.visualizer.audio.src === targetTrack.url;
                    
                    if (isTargetPlaying) {
                        e.dataTransfer.dropEffect = 'none';
                        item.classList.add('drop-not-allowed');
                    } else {
                        e.dataTransfer.dropEffect = 'move';
                        item.classList.add('drag-over');
                    }
                }
            });
            
            // Drag leave
            item.addEventListener('dragleave', (e) => {
                item.classList.remove('drag-over', 'drop-not-allowed');
            });
            
            // Drop
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const droppedTrackId = e.dataTransfer.getData('text/plain');
                const targetTrackId = item.dataset.trackId;
                
                console.log(`Drop: ${droppedTrackId} onto ${targetTrackId}`);
                
                if (droppedTrackId && targetTrackId && droppedTrackId !== targetTrackId) {
                    // Check if target is currently playing
                    const targetTrack = this.findTrackById(targetTrackId);
                    const isTargetPlaying = this.visualizer.audio && 
                                           this.visualizer.audio.src && 
                                           targetTrack && 
                                           this.visualizer.audio.src === targetTrack.url;
                    
                    if (isTargetPlaying) {
                        console.log('Preventing drop on currently playing track to avoid playback errors');
                        return;
                    }
                    
                    this.reorderTracks(droppedTrackId, targetTrackId);
                }
                
                // Clean up visual feedback
                document.querySelectorAll('.track-item').forEach(i => {
                    i.classList.remove('drag-over', 'dragging', 'drop-not-allowed');
                });
            });
        });
        
        // Track list container for general drops
        const tracksContainer = document.getElementById('playlistTracks');
        if (tracksContainer) {
            tracksContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                // Find the closest track item to show insertion point
                const afterElement = this.getDragAfterElement(tracksContainer, e.clientY);
                const draggingElement = document.querySelector('.dragging');
                
                if (draggingElement) {
                    if (afterElement == null) {
                        tracksContainer.appendChild(draggingElement);
                    } else {
                        tracksContainer.insertBefore(draggingElement, afterElement);
                    }
                }
            });
            
            tracksContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Drop on tracks container');
            });
        }
    }
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.track-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    reorderTracks(draggedTrackId, targetTrackId) {
        if (!this.currentPlaylist) {
            console.error('No current playlist for reordering');
            return;
        }
        
        const tracks = this.currentPlaylist.tracks;
        const draggedIndex = tracks.findIndex(t => t.id === draggedTrackId);
        const targetIndex = tracks.findIndex(t => t.id === targetTrackId);
        
        console.log(`Reordering: dragged index ${draggedIndex}, target index ${targetIndex}`);
        
        if (draggedIndex === -1 || targetIndex === -1) {
            console.error('Could not find tracks for reordering:', { draggedTrackId, targetTrackId });
            return;
        }
        
        if (draggedIndex === targetIndex) {
            console.log('Same position, no reordering needed');
            return;
        }
        
        // Store track references
        const draggedTrack = tracks[draggedIndex];
        
        console.log(`Moving "${draggedTrack.title}" from position ${draggedIndex} to ${targetIndex}`);
        
        // Remove dragged track and insert at target position
        const [removedTrack] = tracks.splice(draggedIndex, 1);
        
        // Adjust target index if we removed an item before it
        const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        tracks.splice(newTargetIndex, 0, removedTrack);
        
        // Mark playlist as having custom order
        this.currentPlaylist.hasCustomOrder = true;
        
        // Update current track index in visualizer if the playing track was moved
        if (this.visualizer.audio && this.visualizer.audio.src) {
            const currentPlayingUrl = this.visualizer.audio.src;
            console.log('Checking if playing track was moved...');
            console.log('Current audio URL:', currentPlayingUrl);
            
            // Find the track that's currently playing
            const newIndex = this.currentPlaylist.tracks.findIndex(track => track.url === currentPlayingUrl);
            console.log('New index for playing track:', newIndex);
            console.log('Old current track index:', this.visualizer.currentTrackIndex);
            
            if (newIndex >= 0 && newIndex !== this.visualizer.currentTrackIndex) {
                console.log(`🔄 Updating current track index from ${this.visualizer.currentTrackIndex} to ${newIndex} after reorder`);
                this.visualizer.currentTrackIndex = newIndex;
                
                // Also update the track info display to reflect the new position
                this.visualizer.updateTrackInfo();
            } else if (newIndex === -1) {
                console.error('Currently playing track not found in reordered playlist!');
            } else {
                console.log('Playing track index unchanged');
            }
        }
        
        console.log(`✅ Track reordered successfully - custom order enabled`);
        
        // Save and update display
        this.savePlaylist();
        this.displayPlaylist();
        
        // Update visualizer playlist but preserve current playing state
        this.visualizer._preservePlayingState = true;
        this.visualizer.updatePlaylistFromManager(this.currentPlaylist);
        this.visualizer._preservePlayingState = false;
    }
    
    resetToAlphabetical() {
        if (!this.currentPlaylist) {
            console.warn('No playlist to sort');
            return;
        }
        
        console.log('Resetting playlist to alphabetical order');
        
        // Sort tracks alphabetically
        this.currentPlaylist.tracks = this.sortTracksForDisplay(this.currentPlaylist.tracks);
        
        // Mark as no longer having custom order
        this.currentPlaylist.hasCustomOrder = false;
        
        // Save and update display
        this.savePlaylist();
        this.displayPlaylist();
        this.visualizer.updatePlaylistFromManager(this.currentPlaylist);
        
        console.log('✅ Playlist reset to alphabetical order');
    }
    
    moveTrackToArtist(trackId, targetArtist) {
        if (!this.currentPlaylist) return;
        
        const track = this.findTrackById(trackId);
        if (!track) return;
        
        const oldArtist = track.artist;
        track.artist = targetArtist;
        
        console.log(`Moved track "${track.title}" from "${oldArtist}" to "${targetArtist}"`);
        
        // Save and update display
        this.savePlaylist();
        this.displayPlaylist();
        this.visualizer.updatePlaylistFromManager(this.currentPlaylist);
    }
    
    updateTrackDropdown() {
        // Playlist is now embedded - no dropdown button to update
        // Playlist is embedded - no dropdown button to update
    }
    
    playTrack(trackId) {
        const track = this.findTrackById(trackId);
        if (track && this.visualizer) {
            console.log(`Playing track: ${track.title} by ${track.artist}`);
            this.visualizer.playTrackById(trackId);
        }
    }
    
    selectTrack(trackId) {
        // Update visual selection
        document.querySelectorAll('.track-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const trackItem = document.querySelector(`[data-track-id="${trackId}"]`);
        if (trackItem) {
            trackItem.classList.add('active');
        }
        
        console.log(`Selected track: ${trackId}`);
    }
    
    removeTrack(trackId) {
        if (!this.currentPlaylist) return;
        
        const confirmed = confirm('Remove this track from the playlist?');
        if (!confirmed) return;
        
        this.currentPlaylist.tracks = this.currentPlaylist.tracks.filter(track => track.id !== trackId);
        this.savePlaylist();
        this.displayPlaylist();
        
        console.log(`Removed track: ${trackId}`);
    }
    
    findTrackById(trackId) {
        if (!this.currentPlaylist) return null;
        return this.currentPlaylist.tracks.find(track => track.id === trackId);
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            font-size: 14px;
            line-height: 1.4;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
    
    async exportPlaylist() {
        try {
            if (!this.currentPlaylist || !this.currentPlaylist.tracks || this.currentPlaylist.tracks.length === 0) {
                alert('No playlist to export. Please scan a music folder first.');
                return;
            }
            
            // Create export data
            const exportData = {
                name: this.currentPlaylist.name,
                folderPath: this.currentPlaylist.folderPath,
                exportDate: new Date().toISOString(),
                trackCount: this.currentPlaylist.tracks.length,
                tracks: this.currentPlaylist.tracks.map(track => ({
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    duration: track.duration,
                    filename: track.filename,
                    folderPath: this.currentPlaylist.folderPath,
                    relativePath: track.relativePath || track.filename,
                    // Note: Don't export artwork or URL (too large/temporary)
                })),
                version: "2.0"
            };
            
            // Check if File System Access API is available
            if ('showSaveFilePicker' in window) {
                try {
                    // Open save dialog with suggested filename
                    const suggestedName = `${this.currentPlaylist.name}_playlist_${new Date().toISOString().slice(0, 10)}.json`;
                    
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: suggestedName,
                        types: [{
                            description: 'Freque Playlist Files',
                            accept: {
                                'application/json': ['.json']
                            }
                        }]
                    });
                    
                    // Write file to chosen location
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify(exportData, null, 2));
                    await writable.close();
                    
                    console.log(`✅ Playlist exported to: ${fileHandle.name}`);
                    console.log(`${exportData.trackCount} tracks saved successfully`);
                    
                } catch (saveError) {
                    if (saveError.name === 'AbortError') {
                        console.log('Export cancelled by user');
                    } else {
                        console.error('Error saving file:', saveError);
                        // Fallback to download
                        this.fallbackExport(exportData);
                    }
                }
            } else {
                // Fallback for browsers without File System Access API
                console.log('File System Access API not available, using download fallback');
                this.fallbackExport(exportData);
            }
            
        } catch (error) {
            console.error('Error exporting playlist:', error);
            alert('Error exporting playlist: ' + error.message);
        }
    }
    
    fallbackExport(exportData) {
        // Traditional download fallback
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportData.name}_playlist_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`✅ Playlist downloaded: ${exportData.trackCount} tracks`);
    }
    
    async importPlaylist(file) {
        try {
            if (!file) {
                console.warn('No file provided for import');
                return;
            }
            
            console.log(`Importing playlist from: ${file.name}`);
            
            // Show warning about current playlist
            const confirmed = confirm(
                "⚠️ Current playlist will be replaced!\n\n" +
                "Your current playlist will be lost. Consider exporting it first for later use.\n\n" +
                "Continue with playlist import?"
            );
            
            if (!confirmed) {
                console.log('Playlist import cancelled by user');
                return;
            }
            
            // Read and parse file
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate import data
            if (!importData.tracks || !Array.isArray(importData.tracks)) {
                throw new Error('Invalid playlist file format');
            }
            
            // Create imported playlist with smart path handling
            const importedPlaylist = {
                name: importData.name,
                folderPath: importData.folderPath || 'Imported',
                lastScanned: Date.now(),
                tracks: []
            };

            // Process each track to check if files still exist
            const trackResults = await Promise.all(importData.tracks.map(async (track) => {
                const processedTrack = {
                    ...track,
                    artwork: this.defaultArtwork,
                    url: null,
                    _needsRescan: true
                };

                // If we have folder path and relative path, try to find the file
                if (importData.folderPath && track.relativePath) {
                    try {
                        // Check if we can access the file using File System Access API
                        const fullPath = `${importData.folderPath}/${track.relativePath}`;
                        console.log(`Checking for file: ${fullPath}`);
                        
                        // For now, mark as needing rescan but store the path info
                        processedTrack.originalFolderPath = importData.folderPath;
                        processedTrack.relativePath = track.relativePath;
                        processedTrack._needsRescan = true;
                    } catch (error) {
                        console.log(`File not found: ${track.relativePath}`);
                        processedTrack._needsRescan = true;
                    }
                } else {
                    // No path info available, definitely needs rescan
                    processedTrack._needsRescan = true;
                }

                return processedTrack;
            }));

            importedPlaylist.tracks = trackResults;
            this.currentPlaylist = importedPlaylist;
            
            // Save and display
            this.saveToCacheOnly();
            this.displayPlaylist();
            this.visualizer.updatePlaylistFromManager(this.currentPlaylist);
            
            // Show import results
            const tracksNeedingRescan = trackResults.filter(track => track._needsRescan).length;
            const tracksWithPaths = trackResults.filter(track => track.originalFolderPath).length;
            
            if (tracksNeedingRescan > 0) {
                if (tracksWithPaths > 0) {
                    this.showToast(`Playlist imported! ${tracksNeedingRescan} tracks need rescanning. Click "Add Folder" to rescan.`, 'warning');
                } else {
                    this.showToast(`Playlist imported! ${tracksNeedingRescan} tracks need rescanning. Use "Add Folder" to scan your music library.`, 'warning');
                }
            } else {
                this.showToast(`Playlist imported successfully! ${importData.tracks.length} tracks ready to play.`, 'success');
            }
            
            console.log(`✅ Playlist imported: ${importData.tracks.length} tracks (${tracksNeedingRescan} need rescanning)`);
            
        } catch (error) {
            console.error('Error importing playlist:', error);
            alert('Error importing playlist: ' + error.message);
        }
    }
}

// ****
// ****

