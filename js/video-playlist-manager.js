// VideoPlaylistManager Class - Handles dynamic video playlist creation and management

class VideoPlaylistManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.currentPlaylist = null;
        this.isScanning = false;
        this.scanCancelled = false;
        this.supportedFormats = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];
        this.maxFiles = 250;
        this.folderHandle = null;
        this.currentVideoIndex = -1;
        
        // Load cached playlist
        this.loadCachedPlaylist();
        
        // Try to auto-load folder handle and rescan if available
        this.autoLoadFolderIfAvailable();
        
        // Don't display playlist here - UI elements don't exist yet
        // Playlist will be displayed when UI is initialized in addInlineFileControls
    }
    
    async autoLoadFolderIfAvailable() {
        try {
            const handle = await this.loadFolderHandle();
            if (handle) {
                
                // Request permission
                const permission = await handle.queryPermission({ mode: 'read' });
                if (permission === 'granted') {
                    this.folderHandle = handle;
                    // Small delay to ensure UI is ready
                    setTimeout(() => {
                        this.rescanSavedFolder();
                    }, 1000);
                } else {
                }
            }
        } catch (error) {
        }
    }
    
    async rescanSavedFolder() {
        if (!this.folderHandle) return;
        
        this.isScanning = true;
        this.scanCancelled = false;
        
        try {
            // Show progress
            this.showProgress();
            
            // Scan folder
            const files = await this.scanDirectory(this.folderHandle);
            
            if (this.scanCancelled) {
                this.hideProgress();
                this.isScanning = false;
                return;
            }
            
            // Filter video files
            const videoFiles = files.filter(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                return this.supportedFormats.includes(ext);
            });
            
            if (videoFiles.length === 0) {
                this.hideProgress();
                this.isScanning = false;
                return;
            }
            
            
            // Process the files
            const videos = await this.processFilesWithProgress(videoFiles);
            
            // Update playlist with newly scanned videos
            this.currentPlaylist = {
                name: this.folderHandle.name,
                folderPath: this.folderHandle.name,
                videos: videos.filter(v => v !== null),
                createdAt: Date.now(),
                hasCustomOrder: false
            };
            
            
            // Save and display
            this.savePlaylist();
            this.displayPlaylist();
            this.hideProgress();
            
        } catch (error) {
            this.hideProgress();
        } finally {
            this.isScanning = false;
        }
    }
    
    generateVideoThumbnail(videoFile) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            
            const url = URL.createObjectURL(videoFile);
            video.src = url;
            
            video.onloadedmetadata = () => {
                video.currentTime = 0.1; // Seek to 0.1 seconds for thumbnail
            };
            
            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 240;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                
                // Calculate aspect ratio and draw
                const aspectRatio = video.videoWidth / video.videoHeight;
                let drawWidth = 240;
                let drawHeight = 240;
                let offsetX = 0;
                let offsetY = 0;
                
                if (aspectRatio > 1) {
                    // Landscape
                    drawHeight = 240 / aspectRatio;
                    offsetY = (240 - drawHeight) / 2;
                } else {
                    // Portrait
                    drawWidth = 240 * aspectRatio;
                    offsetX = (240 - drawWidth) / 2;
                }
                
                // Grey background
                ctx.fillStyle = '#808080';
                ctx.fillRect(0, 0, 240, 240);
                
                // Draw video frame
                ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
                
                // Convert to JPG data URL
                const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
                URL.revokeObjectURL(url);
                resolve(thumbnail);
            };
            
            video.onerror = () => {
                URL.revokeObjectURL(url);
                // Return default thumbnail on error
                resolve(this.generateDefaultThumbnail());
            };
        });
    }
    
    generateDefaultThumbnail() {
        // Create 240x240 default thumbnail - grey background with video icon
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
        
        // Draw play icon (triangle)
        ctx.fillStyle = '#404040';
        ctx.beginPath();
        ctx.moveTo(100, 80);
        ctx.lineTo(100, 160);
        ctx.lineTo(160, 120);
        ctx.closePath();
        ctx.fill();
        
        // Convert to JPG data URL
        return canvas.toDataURL('image/jpeg', 0.8);
    }
    
    async initializeIndexedDB() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('FrequeVideoPlaylistDB', 1);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create object store for folder handles
                    if (!db.objectStoreNames.contains('folderHandles')) {
                        const store = db.createObjectStore('folderHandles', { keyPath: 'id' });
                    }
                };
            });
        } catch (error) {
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
                id: 'currentVideoFolder',
                handle: handle,
                name: playlistName,
                lastAccessed: Date.now()
            };
            
            await store.put(folderData);
            
        } catch (error) {
        }
    }
    
    async loadFolderHandle() {
        try {
            const db = await this.initializeIndexedDB();
            if (!db) return null;
            
            const transaction = db.transaction(['folderHandles'], 'readonly');
            const store = transaction.objectStore('folderHandles');
            
            return new Promise((resolve, reject) => {
                const request = store.get('currentVideoFolder');
                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.handle) {
                        resolve(result.handle);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            return null;
        }
    }
    
    loadCachedPlaylist() {
        try {
            const cached = localStorage.getItem('freque_video_playlist');
            if (cached) {
                this.currentPlaylist = JSON.parse(cached);
                
                // Mark videos as needing rescan for playback
                if (this.currentPlaylist.videos) {
                    this.currentPlaylist.videos.forEach(video => {
                        if (!video.url) {
                            video._needsRescan = true;
                        }
                    });
                }
            }
        } catch (error) {
            this.currentPlaylist = null;
        }
    }
    
    savePlaylist() {
        this.saveToCacheOnly();
    }
    
    saveToCacheOnly() {
        try {
            if (this.currentPlaylist) {
                // Create a serializable copy (remove file objects and blob URLs for caching)
                const serializablePlaylist = {
                    ...this.currentPlaylist,
                    videos: this.currentPlaylist.videos.map(video => ({
                        id: video.id,
                        title: video.title,
                        duration: video.duration,
                        resolution: video.resolution,
                        thumbnail: video.thumbnail,
                        filename: video.filename,
                        size: video.size,
                        type: video.type,
                        lastModified: video.lastModified
                        // Exclude: file, url (not serializable/temporary)
                    }))
                };
                
                localStorage.setItem('freque_video_playlist', JSON.stringify(serializablePlaylist));
            }
        } catch (error) {
        }
    }
    
    saveCurrentVideo() {
        try {
            if (this.currentPlaylist && this.currentVideoIndex >= 0 && this.currentVideoIndex < this.currentPlaylist.videos.length) {
                const video = this.currentPlaylist.videos[this.currentVideoIndex];
                const currentVideoData = {
                    index: this.currentVideoIndex,
                    fileName: video.filename,
                    id: video.id
                };
                localStorage.setItem('freque_video_current_file', JSON.stringify(currentVideoData));
            }
        } catch (error) {
        }
    }
    
    loadCurrentVideo() {
        try {
            const saved = localStorage.getItem('freque_video_current_file');
            if (saved && this.currentPlaylist) {
                const currentVideoData = JSON.parse(saved);
                // Find video by ID or filename
                const videoIndex = this.currentPlaylist.videos.findIndex(v => 
                    v.id === currentVideoData.id || v.filename === currentVideoData.fileName
                );
                
                if (videoIndex >= 0) {
                    this.currentVideoIndex = videoIndex;
                    
                    // Restore UI state (highlight current video) but DO NOT auto-play
                    // User must click play button to start playback
                    document.querySelectorAll('.track-item[data-video-id]').forEach(item => {
                        item.classList.remove('current-video');
                    });
                    const videoItem = document.querySelector(`[data-video-index="${videoIndex}"][data-video-id]`);
                    if (videoItem) {
                        videoItem.classList.add('current-video');
                        // Scroll into view
                        videoItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    
                    // Update file name display
                    const video = this.currentPlaylist.videos[videoIndex];
                    const fileNameDisplay = document.getElementById('headerVideoFileName');
                    if (fileNameDisplay && video) {
                        fileNameDisplay.textContent = video.title || video.filename;
                    }
                    
                    // DO NOT call playVideo() - user must click play button
                }
            }
        } catch (error) {
        }
    }
    
    async scanFolder() {
        if (this.isScanning) {
            return;
        }
        
        try {
            // Check for File System Access API support
            if (!window.showDirectoryPicker) {
                alert('File System Access API is not supported in this browser. Please use a modern browser like Chrome or Edge.');
                return;
            }
            
            // Request folder access
            const handle = await window.showDirectoryPicker();
            this.folderHandle = handle;
            this.isScanning = true;
            this.scanCancelled = false;
            
            // Store folder handle
            await this.storeFolderHandle(handle, handle.name);
            
            // Show progress
            this.showProgress();
            
            // Scan folder
            const files = await this.scanDirectory(handle);
            
            if (this.scanCancelled) {
                this.hideProgress();
                return;
            }
            
            // Process files
            const videos = await this.processFilesWithProgress(files);
            
            if (this.scanCancelled) {
                this.hideProgress();
                return;
            }
            
            // Create playlist
            this.currentPlaylist = {
                name: handle.name,
                folderPath: handle.name,
                videos: videos.filter(v => v !== null),
                createdAt: Date.now(),
                hasCustomOrder: false
            };
            
            // Save and display
            this.savePlaylist();
            this.displayPlaylist();
            this.hideProgress();
            this.isScanning = false;
            
        } catch (error) {
            if (error.name === 'AbortError') {
            } else {
                alert(`Error scanning folder: ${error.message}`);
            }
            this.hideProgress();
            this.isScanning = false;
        }
    }
    
    async scanDirectory(handle) {
        const files = [];
        
        try {
            for await (const entry of handle.values()) {
                if (entry.kind === 'file') {
                    const ext = entry.name.split('.').pop().toLowerCase();
                    if (this.supportedFormats.includes(ext)) {
                        if (files.length >= this.maxFiles) {
                            break;
                        }
                        const file = await entry.getFile();
                        files.push(file);
                    }
                } else if (entry.kind === 'directory') {
                    // Recursively scan subdirectories
                    const subFiles = await this.scanDirectory(entry);
                    files.push(...subFiles);
                    
                    if (files.length >= this.maxFiles) {
                        break;
                    }
                }
                
                if (this.scanCancelled) break;
            }
        } catch (error) {
            throw new Error('Failed to scan directory. Please check folder permissions.');
        }
        
        return files;
    }
    
    async processFilesWithProgress(files) {
        const videos = [];
        const totalFiles = files.length;
        const startTime = Date.now();
        
        this.updateProgress(0, totalFiles, 'Processing files...');
        
        const chunkSize = 3; // Smaller chunk size for videos (they're larger)
        for (let i = 0; i < files.length; i += chunkSize) {
            if (this.scanCancelled) break;
            
            const chunk = files.slice(i, i + chunkSize);
            
            const chunkPromises = chunk.map(async (file, index) => {
                try {
                    this.updateProgress(i + index, totalFiles, `Processing: ${file.name}`);
                    return await this.extractMetadata(file);
                } catch (error) {
                    return null;
                }
            });
            
            const chunkResults = await Promise.all(chunkPromises);
            videos.push(...chunkResults);
            
            const processed = Math.min(i + chunkSize, totalFiles);
            const elapsed = Date.now() - startTime;
            const eta = totalFiles > processed ? (elapsed / processed) * (totalFiles - processed) : 0;
            
            this.updateProgress(processed, totalFiles, `Processed ${processed}/${totalFiles} files`, eta);
            
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        return videos;
    }
    
    showProgress() {
        const progress = document.getElementById('videoPlaylistProgress');
        if (progress) {
            progress.style.display = 'block';
        }
    }
    
    hideProgress() {
        const progress = document.getElementById('videoPlaylistProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }
    
    updateProgress(current, total, text, etaMs = 0) {
        const progressBar = document.getElementById('videoPlaylistProgressBar');
        const progressText = document.getElementById('videoPlaylistProgressText');
        const progressCount = document.getElementById('videoPlaylistProgressCount');
        const progressEta = document.getElementById('videoPlaylistProgressEta');
        
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
        
        const progress = document.getElementById('videoPlaylistProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }
    
    async extractMetadata(file) {
        try {
            const video = {
                id: this.generateVideoId(file),
                filename: file.name,
                relativePath: file.webkitRelativePath || file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                title: this.extractTitleFromFilename(file.name)
            };
            
            // Extract duration and resolution using video element
            const videoInfo = await this.getVideoInfo(file);
            video.duration = videoInfo.duration;
            video.resolution = videoInfo.resolution;
            
            // Generate thumbnail
            video.thumbnail = await this.generateVideoThumbnail(file);
            
            // Create object URL for playback
            video.url = URL.createObjectURL(file);
            video.file = file;
            
            return video;
            
        } catch (error) {
            return null;
        }
    }
    
    async getVideoInfo(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            
            const url = URL.createObjectURL(file);
            video.src = url;
            
            video.onloadedmetadata = () => {
                const info = {
                    duration: video.duration || 0,
                    resolution: `${video.videoWidth}x${video.videoHeight}`
                };
                URL.revokeObjectURL(url);
                resolve(info);
            };
            
            video.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load video metadata'));
            };
            
            // Timeout after 10 seconds
            setTimeout(() => {
                URL.revokeObjectURL(url);
                reject(new Error('Video metadata load timeout'));
            }, 10000);
        });
    }
    
    generateVideoId(file) {
        return btoa(`${file.name}_${file.lastModified}_${file.size}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }
    
    extractTitleFromFilename(filename) {
        return filename
            .replace(/\.(mp4|webm|mov|avi|mkv|m4v)$/i, '')
            .replace(/[-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim() || 'Unknown';
    }
    
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    displayPlaylist() {
        const container = document.getElementById('videoPlaylistContainer');
        if (!container) return;
        
        if (!this.currentPlaylist || !this.currentPlaylist.videos || this.currentPlaylist.videos.length === 0) {
            this.displayEmptyPlaylist();
            return;
        }
        
        const videos = this.currentPlaylist.videos;
        const containerInner = document.getElementById('videoPlaylistTracks');
        if (!containerInner) return;
        
        let html = '';
        videos.forEach((video, index) => {
            // Check if video has file object (means it's playable)
            const isPlayable = video.file && !video._needsRescan;
            const needsRescanClass = video._needsRescan ? 'needs-rescan' : '';
            const isCurrent = index === this.currentVideoIndex ? 'current-video' : '';
            
            html += `
                <div class="track-item ${needsRescanClass} ${isCurrent}" data-video-id="${video.id}" data-video-index="${index}" draggable="true">
                    <div class="track-artwork">
                        <img src="${video.thumbnail || this.generateDefaultThumbnail()}" alt="" />
                    </div>
                    <div class="track-info">
                        <div class="track-title">${this.escapeHtml(video.title || video.filename)}</div>
                        <div class="track-details">
                            <span class="track-duration">${this.formatDuration(video.duration)}</span>
                        </div>
                    </div>
                    <div class="track-actions">
                        <button class="track-play-btn" title="${isPlayable ? 'Play Video' : 'Rescan folder to play'}" ${!isPlayable ? 'disabled' : ''}>▶</button>
                        <button class="track-remove-btn" title="Remove Video">×</button>
                    </div>
                </div>
            `;
        });
        
        containerInner.innerHTML = html;
        this.updatePlaylistStats();
        this.initializeVideoHandlers();
    }
    
    displayEmptyPlaylist() {
        const containerInner = document.getElementById('videoPlaylistTracks');
        if (containerInner) {
            containerInner.innerHTML = `
                <div class="empty-playlist">
                    <div class="empty-playlist-icon">🎬</div>
                    <div class="empty-playlist-text">No videos loaded</div>
                    <div class="empty-playlist-subtext">Click "Add Folder" to scan your video library</div>
                </div>
            `;
        }
        
        this.updatePlaylistStats();
    }
    
    updatePlaylistStats() {
        const videos = this.currentPlaylist?.videos || [];
        const totalDuration = videos.reduce((sum, video) => sum + (video.duration || 0), 0);
        
        const videoCount = document.getElementById('videoPlaylistCount');
        const duration = document.getElementById('videoPlaylistDuration');
        
        if (videoCount) {
            videoCount.textContent = videos.length > 0 ? `${videos.length} video${videos.length !== 1 ? 's' : ''}` : 'No videos loaded';
        }
        
        if (duration) {
            if (videos.length > 0) {
                const hours = Math.floor(totalDuration / 3600);
                const mins = Math.floor((totalDuration % 3600) / 60);
                const secs = Math.floor(totalDuration % 60);
                
                if (hours > 0) {
                    duration.textContent = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else {
                    duration.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
            } else {
                duration.textContent = '0:00:00';
            }
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    initializeVideoHandlers() {
        // Video play buttons - use same selectors as audio
        document.querySelectorAll('.track-play-btn').forEach(btn => {
            // Skip if it's an audio track button (has track-id instead of video-id)
            const item = btn.closest('.track-item');
            if (!item || !item.dataset.videoId) return;
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoIndex = parseInt(item.dataset.videoIndex);
                if (!isNaN(videoIndex)) {
                    this.playVideo(videoIndex);
                }
            });
        });
        
        // Video remove buttons - use same selectors as audio
        document.querySelectorAll('.track-remove-btn').forEach(btn => {
            // Skip if it's an audio track button
            const item = btn.closest('.track-item');
            if (!item || !item.dataset.videoId) return;
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = item.dataset.videoId;
                if (videoId) {
                    this.removeVideo(videoId);
                }
            });
        });
        
        // Drag and drop handlers
        this.initializeDragAndDrop();
    }
    
    initializeDragAndDrop() {
        document.querySelectorAll('.track-item[data-video-id]').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.videoId);
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging', 'drag-over');
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const draggingItem = document.querySelector('.dragging[data-video-id]');
                if (draggingItem && draggingItem !== item) {
                    item.classList.add('drag-over');
                }
            });
            
            item.addEventListener('dragleave', (e) => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const draggedId = e.dataTransfer.getData('text/plain');
                const targetId = item.dataset.videoId;
                
                if (draggedId && targetId && draggedId !== targetId) {
                    this.reorderVideos(draggedId, targetId);
                }
                
                item.classList.remove('drag-over');
            });
        });
    }
    
    reorderVideos(draggedId, targetId) {
        if (!this.currentPlaylist) return;
        
        const videos = this.currentPlaylist.videos;
        const draggedIndex = videos.findIndex(v => v.id === draggedId);
        const targetIndex = videos.findIndex(v => v.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
        
        const [removedVideo] = videos.splice(draggedIndex, 1);
        const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        videos.splice(newTargetIndex, 0, removedVideo);
        
        // Update current video index if needed
        if (this.currentVideoIndex === draggedIndex) {
            this.currentVideoIndex = newTargetIndex;
        } else if (this.currentVideoIndex === targetIndex) {
            this.currentVideoIndex = draggedIndex < targetIndex ? this.currentVideoIndex - 1 : this.currentVideoIndex + 1;
        } else if (draggedIndex < this.currentVideoIndex && this.currentVideoIndex <= targetIndex) {
            this.currentVideoIndex--;
        } else if (targetIndex <= this.currentVideoIndex && this.currentVideoIndex < draggedIndex) {
            this.currentVideoIndex++;
        }
        
        this.currentPlaylist.hasCustomOrder = true;
        this.savePlaylist();
        this.displayPlaylist();
    }
    
    findVideoById(videoId) {
        if (!this.currentPlaylist) return null;
        return this.currentPlaylist.videos.find(video => video.id === videoId);
    }
    
    findVideoByIndex(index) {
        if (!this.currentPlaylist || index < 0 || index >= this.currentPlaylist.videos.length) return null;
        return this.currentPlaylist.videos[index];
    }
    
    playVideo(index) {
        const video = this.findVideoByIndex(index);
        if (!video) {
            return;
        }
        
        if (!video.file) {
            alert('This video needs to be re-scanned. Click "Add Folder" and select the same folder to make videos playable again.');
            return;
        }
        
        this.currentVideoIndex = index;
        this.saveCurrentVideo();
        
        // Update UI to show current video
        document.querySelectorAll('.track-item[data-video-id]').forEach(item => {
            item.classList.remove('current-video');
        });
        const videoItem = document.querySelector(`[data-video-index="${index}"][data-video-id]`);
        if (videoItem) {
            videoItem.classList.add('current-video');
            // Scroll into view
            videoItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Update file name display
        const fileNameDisplay = document.getElementById('headerVideoFileName');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = video.title || video.filename;
        }
        
        // Play video using visualizer's video file system
        if (this.visualizer && video.file) {
            this.visualizer.startVideoFile(video.file);
        }
    }
    
    removeVideo(videoId) {
        if (!this.currentPlaylist) return;
        
        const videoIndex = this.currentPlaylist.videos.findIndex(v => v.id === videoId);
        if (videoIndex === -1) return;
        
        const video = this.currentPlaylist.videos[videoIndex];
        
        // Revoke object URL if exists
        if (video.url) {
            URL.revokeObjectURL(video.url);
        }
        
        // Remove from playlist
        this.currentPlaylist.videos.splice(videoIndex, 1);
        
        // Update current video index
        if (this.currentVideoIndex === videoIndex) {
            this.currentVideoIndex = -1;
            // Stop video if it was playing
            if (this.visualizer) {
                this.visualizer.stopVideoInput();
            }
        } else if (this.currentVideoIndex > videoIndex) {
            this.currentVideoIndex--;
        }
        
        this.savePlaylist();
        this.saveCurrentVideo();
        this.displayPlaylist();
    }
    
    exportPlaylist() {
        if (!this.currentPlaylist || !this.currentPlaylist.videos || this.currentPlaylist.videos.length === 0) {
            alert('No playlist to export');
            return;
        }
        
        try {
            const exportData = {
                name: this.currentPlaylist.name,
                folderPath: this.currentPlaylist.folderPath,
                videos: this.currentPlaylist.videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    filename: video.filename,
                    duration: video.duration,
                    resolution: video.resolution,
                    thumbnail: video.thumbnail,
                    size: video.size,
                    type: video.type,
                    lastModified: video.lastModified
                })),
                exportedAt: Date.now()
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `freque-video-playlist-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('Failed to export playlist');
        }
    }
    
    async importPlaylist(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.videos || !Array.isArray(importData.videos)) {
                throw new Error('Invalid playlist format');
            }
            
            // Mark all videos as needing rescan
            importData.videos.forEach(video => {
                video._needsRescan = true;
            });
            
            this.currentPlaylist = {
                name: importData.name || 'Imported Playlist',
                folderPath: 'Imported',
                videos: importData.videos,
                createdAt: importData.exportedAt || Date.now(),
                hasCustomOrder: false
            };
            
            this.savePlaylist();
            this.displayPlaylist();
            
        } catch (error) {
            alert(`Failed to import playlist: ${error.message}`);
        }
    }
}

// Explicitly attach to window object
window.VideoPlaylistManager = VideoPlaylistManager;

