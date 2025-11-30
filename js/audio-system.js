// Infinite Zoom Visualization System
class InfiniteZoomVisualization {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isActive = false;
        this.canvas = null;
        this.ctx = null;
        
        // Settings
        this.colorRandomness = 0.5; // 0-1, how random colors are
        this.minSize = 2;
        this.maxSize = 20;
        this.density = 50; // Will be calculated based on screen area
        this.shape = 'circle'; // circle, square, rectangle, triangle, star, mushroom
        
        // Animation state
        this.zoomSpeed = 0.05; // 50% of max speed
        this.currentZoom = 0;
        this.objects = [];
        this.lastBeatTime = 0;
        this.lastUpdateTime = 0; // Track last update time for deltaTime calculation
        
        // Beat reaction
        this.beatReact = false;
        this.baseZoomSpeed = 0.05; // Store base speed when beat react is off
        
        // Rotation
        this.rotationSpeed = 0; // -10 to 10, 0 = no rotation
        this.currentRotation = 0;
        this.baseRotationSpeed = 0;
        
        // Beat reaction controls
        this.beatZoom = false;
        this.beatRotation = false;
        this.beatDensity = false;
        this.beatShape = false;
        
        // Opacity
        this.opacity = 1.0; // 0-1 range
        
        // Beat React sensitivity (0-1, default 1.0 for 100%)
        this.sensitivity = 1.0;
        
        // Audio response
        this.energyHistory = [];
        this.beatSensitivity = 0.7;
        
    }
    
    initialize() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas style
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        // Z-index will be set by the mixer integration system
        
        // Add unique identifier for z-index management
        this.canvas.setAttribute('data-visualization', 'infinitezoom');
        
        // Add to visualization container
        const container = document.getElementById('visualizationContainer');
        if (container) {
            container.appendChild(this.canvas);
            
            // Resize canvas to fill container
            this.resize();
            
            // Calculate initial density based on screen area (50% of max)
            const screenArea = this.canvas.width * this.canvas.height;
            const maxDensity = Math.floor(screenArea / 100); // 1 object per 100 pixels for max density
            this.density = Math.floor(0.5 * maxDensity); // 50% of max density
        }
        
    }
    
    start() {
        this.isActive = true;
        this.generateInitialObjects();
    }
    
    stop() {
        this.isActive = false;
        this.objects = [];
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
    
    generateInitialObjects() {
        this.objects = [];
        // Use the density as calculated by the slider (already based on screen area)
        for (let i = 0; i < this.density; i++) {
            this.addObject();
        }
    }
    
    addObject() {
        const object = {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: this.minSize + Math.random() * (this.maxSize - this.minSize),
            color: this.generateColor(),
            depth: Math.random() * 1000 + 100, // distance from camera
            rotation: Math.random() * Math.PI * 2,
            shape: this.shape
        };
        this.objects.push(object);
    }
    
    updateObjectShapes() {
        // Update all existing objects to use current shape
        this.objects.forEach(obj => {
            obj.shape = this.shape;
        });
    }
    
    generateColor() {
        if (Math.random() < this.colorRandomness) {
            // Random color
            const hue = Math.random() * 360;
            const saturation = 70 + Math.random() * 30;
            const lightness = 50 + Math.random() * 30;
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } else {
            // Fixed color (white)
            return '#ffffff';
        }
    }
    
    update(audioFeatures = null) {
        if (!this.isActive) return;
        
        // Calculate deltaTime for frame-rate independent movement
        const currentTime = performance.now();
        let deltaTime = 1.0; // Default to 1.0 (60fps equivalent) if first frame
        
        if (this.lastUpdateTime > 0) {
            // Calculate deltaTime in seconds, normalized to 60fps
            // deltaTime = 1.0 means 60fps, 2.0 means 30fps, 0.5 means 120fps
            const deltaMs = currentTime - this.lastUpdateTime;
            deltaTime = (deltaMs / 1000) * 60; // Convert to seconds, then normalize to 60fps
            // Clamp deltaTime to prevent huge jumps (e.g., if tab was hidden)
            deltaTime = Math.min(deltaTime, 2.0); // Max 2x (30fps equivalent)
        }
        
        this.lastUpdateTime = currentTime;
        
        // Debug logging
        if (this.beatReact) {
        }
        
        // Always call audio response FIRST to calculate new speeds
        this.updateAudioResponse(audioFeatures);
        
        // Update zoom (time-based for consistent speed regardless of frame rate)
        const oldZoom = this.currentZoom;
        this.currentZoom += this.zoomSpeed * deltaTime;
        if (this.beatReact && this.zoomSpeed !== 0) {
        }
        
        // Update rotation (time-based for consistent speed regardless of frame rate)
        const oldRotation = this.currentRotation;
        this.currentRotation += this.rotationSpeed * 0.01 * deltaTime; // Scale rotation speed
        if (this.beatReact && this.rotationSpeed !== 0) {
        }
        
        // Update object positions based on zoom direction (time-based)
        this.objects.forEach(obj => {
            obj.depth -= this.zoomSpeed * 50 * deltaTime;
            
            // Dynamic recycling thresholds based on zoom speed (Option 2)
            let recycleThresholdClose, recycleThresholdFar, newDepthMin, newDepthMax;
            
            if (this.zoomSpeed > 0) {
                // Zoom in: adjust thresholds for faster recycling
                recycleThresholdClose = 50; // Objects recycle when they get too close
                newDepthMin = 1000;
                newDepthMax = 1500;
            } else if (this.zoomSpeed < 0) {
                // Zoom out: adjust thresholds for faster recycling to prevent stopping
                // Use much lower threshold to ensure continuous object flow
                recycleThresholdFar = Math.abs(this.zoomSpeed) > 0.1 ? 500 : 1000; // Faster recycling for higher speeds
                newDepthMin = 50;
                newDepthMax = 150;
            }
            
            // Handle object recycling based on dynamic thresholds
            if (this.zoomSpeed > 0 && obj.depth < recycleThresholdClose) {
                // Zoom in: reset objects that get too close
                obj.depth = newDepthMin + Math.random() * (newDepthMax - newDepthMin);
                obj.x = Math.random() * this.canvas.width;
                obj.y = Math.random() * this.canvas.height;
                obj.color = this.generateColor();
            } else if (this.zoomSpeed < 0 && obj.depth > recycleThresholdFar) {
                // Zoom out: reset objects that get too far (with dynamic threshold)
                obj.depth = newDepthMin + Math.random() * (newDepthMax - newDepthMin);
                obj.x = Math.random() * this.canvas.width;
                obj.y = Math.random() * this.canvas.height;
                obj.color = this.generateColor();
            }
        });
        
        // Add new objects on beat
        if (audioFeatures && audioFeatures.beat) {
            const now = Date.now();
            if (now - this.lastBeatTime > 200) { // Debounce
                this.addObject();
                this.lastBeatTime = now;
            }
        }
    }
    
    updateAudioResponse(audioFeatures) {
        
        // Use test features only if no audio features at all
        if (!audioFeatures) {
            // Fallback: generate test audio features for debugging
            const testFeatures = {
                energy: 0.5 + Math.sin(Date.now() / 1000) * 0.3, // Oscillating energy
                beat: Math.random() > 0.95, // Random beats
                tempo: 120,
                dominantFrequency: 1000
            };
            audioFeatures = testFeatures;
        } else if (audioFeatures.energy === 0) {
        } else {
        }
        
        // Track energy history
        this.energyHistory.push(audioFeatures.energy || 0);
        if (this.energyHistory.length > 20) {
            this.energyHistory.shift();
        }
        
        // Beat reaction - only if enabled
        if (this.beatReact) {
            const currentEnergy = audioFeatures.energy || 0;
            const avgEnergy = this.energyHistory.reduce((sum, e) => sum + e, 0) / this.energyHistory.length;
            
            // Beat Zoom - adjust zoom speed based on current energy (scaled by sensitivity)
            if (this.beatZoom) {
                // Map energy 0-1 to zoom speed range, scaled by sensitivity
                // High energy = zoom in (positive), low energy = zoom out (negative)
                const zoomRange = 1.0 * this.sensitivity; // Reduced from 2.0 to 1.0 for more balanced effect
                // Invert the calculation: higher energy = more positive zoom (zoom in)
                this.zoomSpeed = (0.2 - currentEnergy) * zoomRange;
            } else {
                // Restore base zoom speed when beat zoom is off
                this.zoomSpeed = this.baseZoomSpeed;
            }
            
            // Beat Rotation - adjust rotation speed based on current energy (scaled by sensitivity)
            if (this.beatRotation) {
                // Map energy 0-1 to rotation speed range, scaled by sensitivity
                // High energy = clockwise (positive), low energy = counter-clockwise (negative)
                // Use a smaller range and center it around the actual energy values we're seeing
                const rotationRange = 20 * this.sensitivity; // Reduced from 100 to 20 for more balanced effect
                // Invert the calculation: higher energy = more positive rotation (clockwise)
                this.rotationSpeed = (0.2 - currentEnergy) * rotationRange;
            } else {
                // Restore base rotation speed when beat rotation is off
                this.rotationSpeed = this.baseRotationSpeed;
            }
            
            // Beat Density - add objects based on current energy (scaled by sensitivity)
            if (this.beatDensity) {
                // Map energy 0-1 to density multiplier, scaled by sensitivity
                const densityRange = 5.0 * this.sensitivity; // Increased from 2.9 to 5.0 for much more dramatic effect
                const densityMultiplier = 0.1 + currentEnergy * densityRange;
                const targetDensity = Math.floor(this.density * densityMultiplier);
                if (this.objects.length < targetDensity) {
                    this.addObject();
                }
            }
            
            // Beat Shape - change shape on beat
            if (this.beatShape && audioFeatures.beat) {
                const shapes = ['circle', 'square', 'rectangle', 'triangle', 'star', 'mushroom'];
                const currentIndex = shapes.indexOf(this.shape);
                this.shape = shapes[(currentIndex + 1) % shapes.length];
                this.updateObjectShapes();
            } else if (this.beatShape) {
            }
            
            // Add objects on beat (general)
            if (audioFeatures.beat) {
                const now = Date.now();
                if (now - this.lastBeatTime > 200) { // Debounce
                    this.addObject();
                    this.lastBeatTime = now;
                }
            }
            
            // Debug logging
            if (this.beatZoom || this.beatRotation || this.beatDensity) {
            }
        } else {
            // Beat React is disabled - restore all base values
            this.zoomSpeed = this.baseZoomSpeed;
            this.rotationSpeed = this.baseRotationSpeed;
        }
    }
    
    draw() {
        if (!this.isActive || !this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply opacity
        this.ctx.globalAlpha = this.opacity;
        
        // Draw objects with individual rotation
        this.objects.forEach(obj => {
            this.drawObject(obj);
        });
        
        // Reset alpha
        this.ctx.globalAlpha = 1.0;
    }
    
    // This method is called by the main kaleidoscope system
    drawForKaleidoscope() {
        if (!this.isActive || !this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw objects
        this.objects.forEach(obj => {
            this.drawObject(obj);
        });
    }
    
    drawObject(obj) {
        this.drawObjectToContext(this.ctx, obj, 0, 0);
    }
    
    drawObjectToContext(ctx, obj, offsetX = 0, offsetY = 0) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Calculate screen position based on depth
        const scale = 100 / obj.depth;
        let screenX = centerX + (obj.x - centerX) * scale + offsetX;
        let screenY = centerY + (obj.y - centerY) * scale + offsetY;
        const screenSize = obj.size * scale;
        
        // Apply individual object rotation around the center point
        if (this.currentRotation !== 0) {
            // Calculate relative position from center
            const relX = screenX - centerX;
            const relY = screenY - centerY;
            
            // Apply rotation transformation
            const cos = Math.cos(this.currentRotation);
            const sin = Math.sin(this.currentRotation);
            const rotatedX = relX * cos - relY * sin;
            const rotatedY = relX * sin + relY * cos;
            
            // Update screen position
            screenX = centerX + rotatedX;
            screenY = centerY + rotatedY;
        }
        
        // Skip if too small or off-screen
        if (screenSize < 0.5 || screenX < -50 || screenX > this.canvas.width + 50 || 
            screenY < -50 || screenY > this.canvas.height + 50) {
            return;
        }
        
        ctx.save();
        ctx.translate(screenX, screenY);
        // Add global rotation to individual object rotation
        ctx.rotate(obj.rotation + this.currentRotation);
        ctx.fillStyle = obj.color;
        // Apply both global opacity and depth-based alpha
        ctx.globalAlpha = this.opacity * Math.min(1, scale * 2);
        
        switch (obj.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, screenSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'square':
                ctx.fillRect(-screenSize / 2, -screenSize / 2, screenSize, screenSize);
                break;
                
            case 'rectangle':
                ctx.fillRect(-screenSize / 2, -screenSize / 4, screenSize, screenSize / 2);
                break;
                
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -screenSize / 2);
                ctx.lineTo(-screenSize / 2, screenSize / 2);
                ctx.lineTo(screenSize / 2, screenSize / 2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'star':
                this.drawStarToContext(ctx, 0, 0, screenSize / 2, 5);
                break;
                
            case 'mushroom':
                this.drawMushroomToContext(ctx, 0, 0, screenSize);
                break;
        }
        
        ctx.restore();
    }
    
    drawStar(x, y, radius, points) {
        this.drawStarToContext(this.ctx, x, y, radius, points);
    }
    
    drawStarToContext(ctx, x, y, radius, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points;
            const r = i % 2 === 0 ? radius : radius * 0.5;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
    }
    
    drawMushroom(x, y, size) {
        this.drawMushroomToContext(this.ctx, x, y, size);
    }
    
    drawMushroomToContext(ctx, x, y, size) {
        // Generate random colors for each mushroom
        const capColor = this.generateMushroomCapColor();
        const stemColor = this.generateMushroomStemColor();
        
        // Cap (red with white spots)
        ctx.fillStyle = capColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y - size / 4, size / 3, size / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // White spots on cap
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        const spotCount = Math.floor(Math.random() * 4) + 2; // 2-5 spots
        for (let i = 0; i < spotCount; i++) {
            const spotX = x + (Math.random() - 0.5) * size * 0.4;
            const spotY = y - size / 4 + (Math.random() - 0.5) * size * 0.3;
            const spotSize = Math.random() * size * 0.08 + size * 0.03;
            
            ctx.beginPath();
            ctx.ellipse(spotX, spotY, spotSize, spotSize * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        // Stem (light colored)
        ctx.fillStyle = stemColor;
        ctx.strokeStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(x, y + size / 8, size / 12, size / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    
    generateMushroomCapColor() {
        const colors = [
            '#ff4444', // Red
            '#ff6b6b', // Light red
            '#ff8e8e', // Pink-red
            '#ff4444', // Dark red
            '#ff3333'  // Bright red
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    generateMushroomStemColor() {
        const colors = [
            '#f4e4bc', // Cream
            '#f0e68c', // Khaki
            '#f5deb3', // Wheat
            '#ffe4b5', // Moccasin
            '#f0e68c'  // Light khaki
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    resize() {
        if (this.canvas) {
            const container = document.getElementById('visualizationContainer');
            if (container) {
                const rect = container.getBoundingClientRect();
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
            }
        }
    }
    
    getSettings() {
        return {
            isActive: this.isActive,
            colorRandomness: this.colorRandomness,
            minSize: this.minSize,
            maxSize: this.maxSize,
            density: this.density,
            shape: this.shape,
            zoomSpeed: this.zoomSpeed
        };
    }
    
    setSettings(settings) {
        if (settings.colorRandomness !== undefined) this.colorRandomness = settings.colorRandomness;
        if (settings.minSize !== undefined) this.minSize = settings.minSize;
        if (settings.maxSize !== undefined) this.maxSize = settings.maxSize;
        if (settings.density !== undefined) this.density = settings.density;
        if (settings.shape !== undefined) this.shape = settings.shape;
        if (settings.zoomSpeed !== undefined) this.zoomSpeed = settings.zoomSpeed;
    }
}

// AI Autopilot System for Live Performance Visualization Management
class AIAutopilot {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isActive = false;
        
        // Autopilot settings
        this.scope = 'all'; // 'bars', 'radial', 'energy', 'all'
        this.autoColorSchemes = false; // Off by default
        this.changeTiming = 'instant'; // 'instant', 'smooth', 'slow', 'beat-synced'
        this.sensitivity = 'medium'; // 'low', 'medium', 'high'
        
        // Initialize components
        this.audioAnalyzer = new AudioAnalyzer(visualizer.audioMotion);
        this.decisionEngine = new DecisionEngine(this);
        this.parameterController = new ParameterController(this);
        this.genreDetector = new GenreDetector(this);
        this.patternLearning = new PatternLearningSystem(this); // New ML system
        this.adaptiveTuning = new AdaptiveTuningSystem(this); // New adaptive tuning system
        this.predictiveBehavior = new PredictiveBehaviorSystem(this); // New predictive behavior system
        this.multiLayeredIntelligence = new MultiLayeredIntelligenceSystem(this); // New multi-layered intelligence system
        
        // Autopilot state
        this.lastModeChange = 0;
        this.currentMode = visualizer.currentMode; // Use current visualization mode instead of defaulting to 0
        this.modeHistory = [];
        this.energyHistory = [];
        
        // Genre detection state
        this.currentGenre = 'unknown';
        this.genreConfidence = 0;
        this.genreHistory = [];
        this.manualGenre = null; // User-selected genre override
        
        // Parameter control state
        this.parameterHistory = [];
        this.userPreferences = this.loadUserPreferences();
        this.parameterControlEnabled = true; // Enable by default for testing
        this.videoEffectsEnabled = true; // Enable by default
        
        // Learning state
        this.learningEnabled = true; // Enable pattern learning by default
        this.lastLearningUpdate = 0;
        this.learningCooldown = 5000; // 5 seconds between learning updates
        
        // Adaptive tuning state
        this.adaptiveTuningEnabled = true; // Enable adaptive tuning by default
        
        // Predictive behavior state
        this.predictiveBehaviorEnabled = true; // Enable predictive behavior by default
        
        // Multi-layered intelligence state
        this.multiLayeredIntelligenceEnabled = true; // Enable multi-layered intelligence by default
        
        // Define visualization mode groups
        this.modeGroups = {
            bars: [0, 2, 3], // Spectrum, Classic LED, Stereo
            radial: [4], // Radial Spectrum
            energy: [5], // Energy
            all: [0, 1, 2, 3, 4, 5, 6] // All modes
        };
        
    }
    
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.audioAnalyzer.start();
        this.decisionEngine.start();
        
        // Reset history
        this.modeHistory = [this.visualizer.currentMode];
        
        // Don't force a mode change on activation - respect current mode and scope
        this.updateUI();
    }
    
    recordModeChange(newMode) {
        this.modeHistory.push(newMode);
        // Keep only recent history (last 10 changes)
        if (this.modeHistory.length > 10) {
            this.modeHistory = this.modeHistory.slice(-10);
        }
    }
    
    deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.audioAnalyzer.stop();
        this.decisionEngine.stop();
        
        this.updateUI();
    }
    
    updateUI() {
        const btn = document.getElementById('aiAutopilotBtn');
        if (btn) {
            if (this.isActive) {
                btn.textContent = 'Deactivate';
                btn.classList.add('active');
            } else {
                btn.textContent = 'Activate';
                btn.classList.remove('active');
            }
        }
        
        // Also update footer autopilot button
        this.updateFooterAutopilotButton();
    }
    
    updateFooterAutopilotButton() {
        const footerBtn = document.getElementById('footerAutopilotBtn');
        if (footerBtn) {
            const textSpan = footerBtn.querySelector('.autopilot-text');
            if (textSpan) {
                if (this.isActive) {
                    textSpan.textContent = 'Active';
                    footerBtn.classList.add('active');
                } else {
                    textSpan.textContent = 'Autopilot';
                    footerBtn.classList.remove('active');
                }
            }
        }
    }
    
    setIntensity(level) {
        this.intensity = level;
    }
    
    // Enhanced decision making with parameter control and pattern learning
    makeAdvancedDecisions() {
        const audioFeatures = this.audioAnalyzer.getCurrentFeatures();
        
        // Debug logging
        //     energy: audioFeatures.energy?.toFixed(3),
        //     beat: audioFeatures.beat,
        //     tempo: audioFeatures.tempo,
        //     dominantFreq: audioFeatures.dominantFreq,
        //     parameterControlEnabled: this.parameterControlEnabled,
        //     learningEnabled: this.learningEnabled,
        //     scope: this.scope,
        //     multiLayeredIntelligenceEnabled: this.multiLayeredIntelligenceEnabled
        // });
        
        // Use multi-layered intelligence if enabled
        if (this.multiLayeredIntelligenceEnabled && this.multiLayeredIntelligence) {
            const currentParams = this.getCurrentParameters();
            //     linearBoost: this.visualizer.audioMotion?.linearBoost,
            //     gradient: this.visualizer.audioMotion?.gradient,
            //     fillAlpha: this.visualizer.audioMotion?.fillAlpha,
            //     smoothing: this.visualizer.audioMotion?.smoothing
            // });
            
            const decision = this.multiLayeredIntelligence.makeIntelligentDecision(
                audioFeatures, 
                this.visualizer.currentMode, 
                currentParams
            );
            
            if (decision) {
                return; // Multi-layered intelligence handles everything
            } else {
            }
        }
        
        // Use manual genre if set, otherwise detect automatically
        let detectedGenre;
        if (this.manualGenre) {
            detectedGenre = {
                genre: this.manualGenre,
                confidence: 1.0,
                allScores: {}
            };
        } else {
            detectedGenre = this.genreDetector.detectGenre(audioFeatures);
        }
        
        // Update genre state
        this.updateGenreState(detectedGenre);
        
        // Update UI display
        this.updateGenreDisplay();
        
        // Get parameter recommendations based on genre and audio
        if (this.parameterControlEnabled) {
            let parameterRecommendations;
            
            // Try user preference recommendations first (highest priority)
            const userPreferenceRecommendations = this.parameterController.getUserPreferenceRecommendations(
                detectedGenre.genre, 
                audioFeatures
            );
            
            if (userPreferenceRecommendations) {
                parameterRecommendations = {
                    visualization: userPreferenceRecommendations,
                    video: {},
                    source: 'user_preferences',
                    confidence: 0.9 // High confidence in user preferences
                };
            }
            // Try pattern learning recommendations second
            else if (this.learningEnabled) {
                const patternRecommendations = this.patternLearning.getPatternRecommendations(
                    detectedGenre.genre, 
                    audioFeatures
                );
                
                if (patternRecommendations) {
                    parameterRecommendations = {
                        visualization: patternRecommendations.parameters,
                        video: {},
                        source: 'pattern_learning',
                        confidence: patternRecommendations.confidence
                    };
                }
            }
            
            // Fallback to rule-based recommendations if no learning data
            if (!parameterRecommendations) {
                parameterRecommendations = this.getParameterRecommendations(
                detectedGenre, 
                audioFeatures, 
                this.scope
            );
            }
            
            // Apply parameter changes
            this.parameterController.applyParameterChanges(parameterRecommendations);
            
            // Learn from this decision if learning is enabled
            if (this.learningEnabled && this.shouldLearnFromDecision()) {
                this.learnFromCurrentDecision(detectedGenre, audioFeatures, parameterRecommendations);
            }
        }
        
        // Track performance for adaptive tuning
        if (this.adaptiveTuning && this.adaptiveTuningEnabled) {
            const userFeedback = this.getLastUserFeedback();
            this.adaptiveTuning.trackPerformance(audioFeatures, userFeedback);
        }
        
        // Predictive Behavior System - anticipate optimal actions
        if (this.predictiveBehavior && this.predictiveBehaviorEnabled) {
            const currentParams = this.getCurrentParameters();
            const predictions = this.predictiveBehavior.predictOptimalActions(
                audioFeatures, 
                this.visualizer.currentMode, 
                currentParams
            );
            
            if (predictions && predictions.confidence >= 0.8) {
                // Execute predictions if timing is right
                if (predictions.timing?.immediate) {
                    this.predictiveBehavior.executePrediction(predictions);
                } else if (predictions.timing?.delay) {
                    // Schedule delayed execution
                    setTimeout(() => {
                        this.predictiveBehavior.executePrediction(predictions);
                    }, predictions.timing.delay);
                }
            }
        }
        
        // Continue with existing mode switching logic
        this.decisionEngine.evaluateVisualizationChange();
    }
    
    // Get current parameters for predictive behavior
    getCurrentParameters() {
        if (!this.visualizer.audioMotion) return {};
        
        return {
            linearBoost: this.visualizer.audioMotion.linearBoost || 0.5,
            gradient: this.visualizer.audioMotion.gradient || 0.5,
            smoothing: this.visualizer.audioMotion.smoothing || 0.5,
            fillAlpha: this.visualizer.audioMotion.fillAlpha || 0.5,
            peakHoldTime: this.visualizer.audioMotion.peakHoldTime || 0.5,
            maxDecibels: this.visualizer.audioMotion.maxDecibels || 0.5,
            minFreq: this.visualizer.audioMotion.minFreq || 0.5
        };
    }

    // Check if we should learn from the current decision
    shouldLearnFromDecision() {
        const now = Date.now();
        return now - this.lastLearningUpdate > this.learningCooldown;
    }
    
    // Learn from the current decision for future improvements
    learnFromCurrentDecision(genre, audioFeatures, recommendations) {
        try {
            // Calculate effectiveness based on audio response
            const effectiveness = this.calculateDecisionEffectiveness(audioFeatures);
            
            // Learn from successful parameter combinations
            this.patternLearning.learnFromSuccess(
                genre.genre,
                audioFeatures,
                recommendations.visualization || {},
                effectiveness
            );
            
            // Learn from user behavior (if user makes manual adjustments)
            this.learnFromUserInteractions(genre, audioFeatures);
            
            this.lastLearningUpdate = Date.now();
            
            
        } catch (error) {
            console.error('Error in learning from decision:', error);
        }
    }
    
    // Calculate how effective the current decision was
    calculateDecisionEffectiveness(audioFeatures) {
        // Simple effectiveness calculation based on audio response
        const energy = audioFeatures.energy || 0;
        const beat = audioFeatures.beat || false;
        const tempo = audioFeatures.tempo || 0;
        
        // Higher energy and beat detection = more effective
        let effectiveness = energy * 0.6;
        
        if (beat) {
            effectiveness += 0.2;
        }
        
        // Tempo stability bonus
        if (tempo > 0) {
            effectiveness += Math.min(tempo / 200, 0.2);
        }
        
        return Math.min(effectiveness, 1.0);
    }
    
    // Learn from user interactions and manual adjustments
    learnFromUserInteractions(genre, audioFeatures) {
        // This will be expanded when we add user feedback learning
        // For now, just track basic interaction patterns
        const context = {
            genre: genre.genre,
            energy: audioFeatures.energy,
            tempo: audioFeatures.tempo
        };
        
        // Learn that the AI made a decision in this context
        this.patternLearning.learnFromUserBehavior(
            'ai_decision',
            JSON.stringify(context),
            'positive' // Assume positive unless user indicates otherwise
        );
    }
    
    // Method to be called when user manually adjusts parameters
    onUserParameterChange(parameterName, oldValue, newValue) {
        if (this.parameterController) {
            const context = {
                genre: this.currentGenre,
                energy: this.audioAnalyzer.getEnergy(),
                tempo: this.audioAnalyzer.getTempo()
            };
            
            this.parameterController.trackUserAdjustment(parameterName, oldValue, newValue, context);
        }
    }
    
    // Get the last user feedback for performance tracking
    getLastUserFeedback() {
        if (this.parameterController && this.parameterController.feedbackHistory.length > 0) {
            const lastFeedback = this.parameterController.feedbackHistory[this.parameterController.feedbackHistory.length - 1];
            // Only return feedback from the last 30 seconds
            if (Date.now() - lastFeedback.timestamp < 30000) {
                return lastFeedback.feedback;
            }
        }
        return null;
    }
    
    getParameterRecommendations(genre, audioFeatures, scope) {
        // Enhanced parameter recommendations with more dramatic visual changes
        const energy = audioFeatures.energy || 0.5;
        const tempo = audioFeatures.tempo || 120;
        const beat = audioFeatures.beat || false;
        const dominantFreq = audioFeatures.dominantFreq || 0.5;
        const harmonic = audioFeatures.harmonic || {};
        const structure = audioFeatures.structure || {};
        
        // More dramatic parameter ranges for better visual impact
        const recommendations = {
            visualization: {},
            video: {}
        };
        
        // Energy-based parameters (more dramatic range)
        if (energy > 0.7) {
            recommendations.visualization.linearBoost = 2.5 + (energy - 0.7) * 2; // 2.5-4.0
            recommendations.visualization.gradient = 0.8 + (energy - 0.7) * 0.2; // 0.8-1.0
            recommendations.visualization.fillAlpha = 0.9 + (energy - 0.7) * 0.1; // 0.9-1.0
        } else if (energy > 0.4) {
            recommendations.visualization.linearBoost = 1.5 + (energy - 0.4) * 3.33; // 1.5-2.5
            recommendations.visualization.gradient = 0.4 + (energy - 0.4) * 1.33; // 0.4-0.8
            recommendations.visualization.fillAlpha = 0.6 + (energy - 0.4) * 1.0; // 0.6-0.9
        } else {
            recommendations.visualization.linearBoost = 0.5 + energy * 2.5; // 0.5-1.5
            recommendations.visualization.gradient = energy * 1.0; // 0.0-0.4
            recommendations.visualization.fillAlpha = 0.3 + energy * 0.75; // 0.3-0.6
        }
        
        // Tempo-based parameters
        if (tempo > 140) {
            recommendations.visualization.peakHoldTime = 300; // Fast tempo = quick peaks
            recommendations.visualization.smoothing = 0.3; // Less smoothing for fast music
        } else if (tempo > 100) {
            recommendations.visualization.peakHoldTime = 500; // Medium tempo
            recommendations.visualization.smoothing = 0.5;
        } else {
            recommendations.visualization.peakHoldTime = 800; // Slow tempo = longer peaks
            recommendations.visualization.smoothing = 0.8; // More smoothing for slow music
        }
        
        // Beat-reactive parameters
        if (beat) {
            recommendations.visualization.peakFadeTime = 200; // Quick fade on beats
            recommendations.visualization.linearBoost *= 1.3; // Boost on beats
        } else {
            recommendations.visualization.peakFadeTime = 1000; // Slower fade without beats
        }
        
        // Frequency-based parameters
        if (dominantFreq < 0.3) { // Bass heavy
            recommendations.visualization.maxDecibels = -20; // More sensitive to low frequencies
            recommendations.visualization.minFreq = 20; // Lower minimum frequency
        } else if (dominantFreq > 0.7) { // Treble heavy
            recommendations.visualization.maxDecibels = -30; // Less sensitive to high frequencies
            recommendations.visualization.minFreq = 100; // Higher minimum frequency
        } else { // Mid range
            recommendations.visualization.maxDecibels = -25;
            recommendations.visualization.minFreq = 50;
        }
        
        // Harmonic-based parameters
        if (harmonic.chord) {
            // Different chord types get different visual treatments
            if (harmonic.chord.includes('m')) { // Minor chords
                recommendations.visualization.gradient = 0.2; // Darker colors
                recommendations.visualization.fillAlpha = 0.7;
            } else { // Major chords
                recommendations.visualization.gradient = 0.8; // Brighter colors
                recommendations.visualization.fillAlpha = 0.9;
            }
        }
        
        // Structure-based parameters
        if (structure.section) {
            switch (structure.section) {
                case 'intro':
                    recommendations.visualization.linearBoost *= 0.7; // Quieter intro
                    recommendations.visualization.fillAlpha *= 0.8;
                    break;
                case 'chorus':
                    recommendations.visualization.linearBoost *= 1.4; // Louder chorus
                    recommendations.visualization.fillAlpha = Math.min(1.0, recommendations.visualization.fillAlpha * 1.2);
                    break;
                case 'bridge':
                    recommendations.visualization.gradient = 0.5; // Different colors for bridge
                    recommendations.visualization.linearBoost *= 1.1;
                    break;
                case 'outro':
                    recommendations.visualization.linearBoost *= 0.6; // Quieter outro
                    recommendations.visualization.fillAlpha *= 0.7;
                    break;
            }
        }
        
        // Genre-specific enhancements
        const genreMultipliers = {
            'electronic': { boost: 1.5, gradient: 1.0, alpha: 1.0 },
            'rock': { boost: 1.3, gradient: 0.8, alpha: 0.9 },
            'classical': { boost: 0.8, gradient: 0.6, alpha: 0.8 },
            'jazz': { boost: 1.1, gradient: 0.7, alpha: 0.85 },
            'ambient': { boost: 0.6, gradient: 0.3, alpha: 0.6 },
            'country': { boost: 1.2, gradient: 0.9, alpha: 0.9 }
        };
        
        const multiplier = genreMultipliers[genre.genre] || { boost: 1.0, gradient: 1.0, alpha: 1.0 };
        recommendations.visualization.linearBoost *= multiplier.boost;
        recommendations.visualization.gradient *= multiplier.gradient;
        recommendations.visualization.fillAlpha *= multiplier.alpha;
        
        // Clamp values to valid ranges
        recommendations.visualization.linearBoost = Math.max(0.1, Math.min(5.0, recommendations.visualization.linearBoost));
        recommendations.visualization.gradient = Math.max(0.0, Math.min(1.0, recommendations.visualization.gradient));
        recommendations.visualization.fillAlpha = Math.max(0.1, Math.min(1.0, recommendations.visualization.fillAlpha));
        recommendations.visualization.peakHoldTime = Math.max(100, Math.min(2000, recommendations.visualization.peakHoldTime));
        recommendations.visualization.peakFadeTime = Math.max(100, Math.min(2000, recommendations.visualization.peakFadeTime));
        recommendations.visualization.smoothing = Math.max(0.1, Math.min(1.0, recommendations.visualization.smoothing));
        
        return recommendations;
    }
    
    updateGenreState(detectedGenre) {
        this.genreHistory.push({
            genre: detectedGenre.genre,
            confidence: detectedGenre.confidence,
            timestamp: Date.now()
        });
        
        // Keep only recent history (last 20 detections)
        if (this.genreHistory.length > 20) {
            this.genreHistory = this.genreHistory.slice(-20);
        }
        
        // Update current genre if confidence is high enough
        if (detectedGenre.confidence > 0.7) {
            this.currentGenre = detectedGenre.genre;
            this.genreConfidence = detectedGenre.confidence;
        }
    }
    
    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('autopilot_user_preferences');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.warn('Could not load user preferences:', error);
            return {};
        }
    }
    
    saveUserPreferences() {
        try {
            localStorage.setItem('autopilot_user_preferences', JSON.stringify(this.userPreferences));
        } catch (error) {
            console.warn('Could not save user preferences:', error);
        }
    }
    
    updateGenreDisplay() {
        const genreDisplay = document.getElementById('currentGenreDisplay');
        const confidenceDisplay = document.getElementById('genreConfidenceDisplay');
        
        if (genreDisplay) {
            const genreName = this.currentGenre.charAt(0).toUpperCase() + this.currentGenre.slice(1).replace('-', ' ');
            genreDisplay.textContent = genreName;
        }
        
        if (confidenceDisplay) {
            const confidencePercent = Math.round(this.genreConfidence * 100);
            confidenceDisplay.textContent = `${confidencePercent}%`;
        }
    }
    
    // Test method to force parameter changes
    testParameterControl() {
        
        // Force a genre detection
        const testGenre = 'electronic';
        this.manualGenre = testGenre;
        this.currentGenre = testGenre;
        this.genreConfidence = 1.0;
        
        // Get test audio features
        const testAudioFeatures = {
            energy: 0.8,
            beat: true,
            tempo: 140,
            dominantFreq: 0.7,
            energyTrend: 0.1,
            beatStrength: 1.5,
            frequencyBands: { bass: 0.3, mid: 0.5, treble: 0.8 },
            spectralFlux: 0.1
        };
        
        // Get parameter recommendations
        const recommendations = this.getParameterRecommendations(
            { genre: testGenre, confidence: 1.0 },
            testAudioFeatures,
            this.scope
        );
        
        
        // Apply parameter changes
        this.parameterController.applyParameterChanges(recommendations);
        
        // Update display
        this.updateGenreDisplay();
    }
}

