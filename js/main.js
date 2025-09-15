class ParameterController {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.visualizer = autopilot.visualizer;
        this.currentParameters = {};
        this.parameterHistory = [];
        
        // User feedback learning
        this.userAdjustments = [];
        this.feedbackHistory = [];
        this.lastUserAdjustment = null;
        this.adjustmentThreshold = 0.1; // Minimum change to consider significant
        
        console.log('🎛️ Parameter Controller initialized with user feedback learning');
    }
    
    applyParameterChanges(recommendations) {
        if (!this.visualizer.audioMotion) return;
        
        try {
            // Apply visualization parameters
            const vizParams = this.convertToAudioMotionParams(recommendations.visualization);
            this.visualizer.audioMotion.setOptions(vizParams);
            
            // Apply video parameters
            if (recommendations.video && this.autopilot.videoEffectsEnabled) {
                this.applyVideoParameters(recommendations.video);
            }
            
            // Record parameter change
            this.recordParameterChange(recommendations);
            
            console.log('🎛️ Parameters applied:', vizParams);
        } catch (error) {
            console.error('Error applying parameters:', error);
        }
    }
    
    convertToAudioMotionParams(params) {
        const audioMotionParams = {};
        const scope = this.autopilot.scope;
        
        // Convert each parameter to AudioMotion format
        for (const [paramName, value] of Object.entries(params)) {
            let paramDef = null;
            
            // If scope is 'all', check all scopes for parameter definitions
            if (scope === 'all') {
                for (const scopeName of ['bars', 'radial', 'energy', 'global']) {
                    const scopeParams = VISUALIZATION_PARAMETERS[scopeName] || {};
                    if (scopeParams[paramName]) {
                        paramDef = scopeParams[paramName];
                        break;
                    }
                }
            } else {
                // For specific scopes, check that scope first, then global
                const scopeParams = VISUALIZATION_PARAMETERS[scope] || {};
                paramDef = scopeParams[paramName] || VISUALIZATION_PARAMETERS.global[paramName];
            }
            
            if (paramDef && paramDef.audioMotion) {
                const audioMotionParam = paramDef.audioMotion;
                audioMotionParams[audioMotionParam] = this.convertParameterValue(value, paramDef);
            }
        }
        
        return audioMotionParams;
    }
    
    convertParameterValue(value, paramDef) {
        switch (paramDef.type) {
            case 'float':
                return Math.max(paramDef.min, Math.min(paramDef.max, value));
            case 'int':
                const intValue = Math.round(Math.max(paramDef.min, Math.min(paramDef.max, value)));
                // Special handling for fftSize - must be power of 2
                if (paramDef.audioMotion === 'fftSize') {
                    return this.getNearestPowerOfTwo(intValue);
                }
                return intValue;
            case 'boolean':
                return Boolean(value);
            case 'enum':
                return paramDef.values.includes(value) ? value : paramDef.default;
            case 'color':
                return value;
            default:
                return value;
        }
    }
    
    getNearestPowerOfTwo(value) {
        const powersOfTwo = [64, 128, 256, 512, 1024, 2048, 4096, 8192];
        return powersOfTwo.reduce((prev, curr) => 
            Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
        );
    }
    
    applyVideoParameters(videoParams) {
        // Apply video effects to the video element
        const videoElement = this.visualizer.videoElement;
        if (!videoElement) {
            console.log('🎬 Video element not found, skipping video effects');
            return;
        }
        
        console.log('🎬 Applying video effects:', videoParams);
        let filterString = '';
        
        // Apply color effects
        if (videoParams.colorEffects) {
            const effects = videoParams.colorEffects;
            if (effects.grayscale > 0) {
                filterString += `grayscale(${effects.grayscale * 100}%) `;
            }
            if (effects.sepia > 0) {
                filterString += `sepia(${effects.sepia * 100}%) `;
            }
            if (effects.invert > 0) {
                filterString += `invert(${effects.invert * 100}%) `;
            }
            if (effects.hue !== 0) {
                filterString += `hue-rotate(${effects.hue}deg) `;
            }
            if (effects.saturation !== 1) {
                filterString += `saturate(${effects.saturation}) `;
            }
            if (effects.brightness !== 1) {
                filterString += `brightness(${effects.brightness}) `;
            }
            if (effects.contrast !== 1) {
                filterString += `contrast(${effects.contrast}) `;
            }
        }
        
        // Apply artistic effects
        if (videoParams.artisticEffects) {
            const effects = videoParams.artisticEffects;
            if (effects.posterize > 0) {
                // Note: CSS doesn't have posterize, this would need custom implementation
                filterString += `contrast(${1 + effects.posterize}) `;
            }
            if (effects.blur > 0) {
                filterString += `blur(${effects.blur}px) `;
            }
            if (effects.sharpen > 0) {
                filterString += `contrast(${1 + effects.sharpen}) `;
            }
        }
        
        videoElement.style.filter = filterString.trim();
        console.log('🎬 Applied filter string:', filterString.trim());
    }
    
    recordParameterChange(recommendations) {
        this.parameterHistory.push({
            timestamp: Date.now(),
            parameters: recommendations,
            scope: this.autopilot.scope,
            genre: this.autopilot.currentGenre
        });
        
        // Keep only recent history (last 50 changes)
        if (this.parameterHistory.length > 50) {
            this.parameterHistory = this.parameterHistory.slice(-50);
        }
    }
    
    // Track user manual parameter adjustments
    trackUserAdjustment(parameterName, oldValue, newValue, context) {
        const change = Math.abs(newValue - oldValue);
        
        // Only track significant changes
        if (change < this.adjustmentThreshold) return;
        
        const adjustment = {
            parameter: parameterName,
            oldValue: oldValue,
            newValue: newValue,
            change: change,
            direction: newValue > oldValue ? 'increase' : 'decrease',
            timestamp: Date.now(),
            context: context || {}
        };
        
        this.userAdjustments.push(adjustment);
        this.lastUserAdjustment = adjustment;
        
        // Keep only recent adjustments (last 100)
        if (this.userAdjustments.length > 100) {
            this.userAdjustments = this.userAdjustments.slice(-100);
        }
        
        // Learn from this adjustment
        this.learnFromUserAdjustment(adjustment);
        
        console.log(`👤 User adjusted ${parameterName}: ${oldValue.toFixed(3)} → ${newValue.toFixed(3)}`);
    }
    
    // Learn from user adjustments
    learnFromUserAdjustment(adjustment) {
        if (!this.autopilot.patternLearning) return;
        
        const context = {
            genre: this.autopilot.currentGenre,
            energy: this.autopilot.audioAnalyzer.getEnergy(),
            tempo: this.autopilot.audioAnalyzer.getTempo(),
            parameter: adjustment.parameter,
            direction: adjustment.direction
        };
        
        // Learn that user prefers this adjustment in this context
        this.autopilot.patternLearning.learnFromUserBehavior(
            'parameter_adjustment',
            JSON.stringify(context),
            'positive' // User made the change, so they prefer it
        );
        
        // Store the adjustment pattern for future recommendations
        this.storeAdjustmentPattern(adjustment, context);
    }
    
    // Store adjustment patterns for future use
    storeAdjustmentPattern(adjustment, context) {
        const patternKey = `${context.genre}_${adjustment.parameter}_${context.direction}`;
        
        if (!this.autopilot.userPreferences.adjustmentPatterns) {
            this.autopilot.userPreferences.adjustmentPatterns = {};
        }
        
        if (!this.autopilot.userPreferences.adjustmentPatterns[patternKey]) {
            this.autopilot.userPreferences.adjustmentPatterns[patternKey] = {
                count: 0,
                avgChange: 0,
                contexts: []
            };
        }
        
        const pattern = this.autopilot.userPreferences.adjustmentPatterns[patternKey];
        pattern.count++;
        pattern.avgChange = (pattern.avgChange * (pattern.count - 1) + adjustment.change) / pattern.count;
        pattern.contexts.push({
            context: context,
            adjustment: adjustment,
            timestamp: Date.now()
        });
        
        // Keep only recent contexts (last 20)
        if (pattern.contexts.length > 20) {
            pattern.contexts = pattern.contexts.slice(-20);
        }
        
        // Save updated preferences
        this.autopilot.saveUserPreferences();
    }
    
    // Get user preference-based recommendations
    getUserPreferenceRecommendations(genre, audioFeatures) {
        if (!this.autopilot.userPreferences.adjustmentPatterns) {
            return null;
        }
        
        const recommendations = {};
        const patterns = this.autopilot.userPreferences.adjustmentPatterns;
        
        // Look for patterns that match current context
        Object.keys(patterns).forEach(patternKey => {
            const [patternGenre, parameter, direction] = patternKey.split('_');
            
            if (patternGenre === genre && patterns[patternKey].count >= 3) {
                const pattern = patterns[patternKey];
                const currentValue = this.getCurrentParameterValue(parameter);
                
                if (currentValue !== null) {
                    // Apply user's preferred adjustment
                    const adjustment = pattern.avgChange * (direction === 'increase' ? 1 : -1);
                    recommendations[parameter] = Math.max(0, Math.min(1, currentValue + adjustment));
                }
            }
        });
        
        return Object.keys(recommendations).length > 0 ? recommendations : null;
    }
    
    // Get current value of a parameter
    getCurrentParameterValue(parameterName) {
        if (!this.visualizer.audioMotion) return null;
        
        const audioMotion = this.visualizer.audioMotion;
        return audioMotion[parameterName] || null;
    }
    
    // Record user feedback (thumbs up/down)
    recordUserFeedback(feedback, context) {
        const feedbackEntry = {
            feedback: feedback, // 'positive' or 'negative'
            context: context,
            timestamp: Date.now()
        };
        
        this.feedbackHistory.push(feedbackEntry);
        
        // Keep only recent feedback (last 50)
        if (this.feedbackHistory.length > 50) {
            this.feedbackHistory = this.feedbackHistory.slice(-50);
        }
        
        // Learn from feedback
        this.learnFromFeedback(feedbackEntry);
        
        console.log(`👤 User feedback: ${feedback}`, context);
    }
    
    // Learn from user feedback
    learnFromFeedback(feedbackEntry) {
        if (!this.autopilot.patternLearning) return;
        
        const context = {
            genre: this.autopilot.currentGenre,
            energy: this.autopilot.audioAnalyzer.getEnergy(),
            tempo: this.autopilot.audioAnalyzer.getTempo(),
            ...feedbackEntry.context
        };
        
        this.autopilot.patternLearning.learnFromUserBehavior(
            'user_feedback',
            JSON.stringify(context),
            feedbackEntry.feedback
        );
    }
    
    // Get feedback statistics
    getFeedbackStats() {
        const total = this.feedbackHistory.length;
        const positive = this.feedbackHistory.filter(f => f.feedback === 'positive').length;
        const negative = this.feedbackHistory.filter(f => f.feedback === 'negative').length;
        
        return {
            total: total,
            positive: positive,
            negative: negative,
            satisfaction: total > 0 ? positive / total : 0
        };
    }
    
    getCurrentParameters() {
        return this.currentParameters;
    }
    
    getParameterHistory() {
        return this.parameterHistory;
    }
}

// Genre Detector for Enhanced Autopilot
class GenreDetector {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.audioAnalyzer = autopilot.audioAnalyzer;
        this.detectionHistory = [];
        this.genreConfidence = {};
        
        console.log('🎵 Genre Detector initialized');
    }
    
    detectGenre(audioFeatures) {
        const energy = audioFeatures.energy || 0.5;
        const tempo = audioFeatures.tempo || 120;
        const dominantFreq = audioFeatures.dominantFreq || 0.5;
        const energyTrend = audioFeatures.energyTrend || 0;
        
        // Simple rule-based genre detection
        const genreScores = this.calculateGenreScores(energy, tempo, dominantFreq, energyTrend);
        const bestGenre = this.selectBestGenre(genreScores);
        
        // Record detection
        this.detectionHistory.push({
            timestamp: Date.now(),
            audioFeatures: { energy, tempo, dominantFreq, energyTrend },
            genreScores,
            selectedGenre: bestGenre
        });
        
        // Keep only recent history (last 100 detections)
        if (this.detectionHistory.length > 100) {
            this.detectionHistory = this.detectionHistory.slice(-100);
        }
        
        return bestGenre;
    }
    
    calculateGenreScores(energy, tempo, dominantFreq, energyTrend) {
        const scores = {};
        
        // Heavy Metal: High energy, fast tempo, bass-heavy, aggressive dynamics
        scores['heavy-metal'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.4, energyTarget: 0.8,
            tempoWeight: 0.3, tempoTarget: 160,
            freqWeight: 0.2, freqTarget: 0.2, // Bass-heavy
            trendWeight: 0.1, trendTarget: 0.1 // Aggressive
        });
        
        // Rock: High energy, medium-fast tempo, balanced frequency
        scores['rock'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.6, energyTarget: 0.5, // Medium-high energy
            tempoWeight: 0.4, tempoTarget: 120, // Medium-fast tempo
            freqWeight: 0.0, freqTarget: 0.5, // Frequency less important
            trendWeight: 0.0, trendTarget: 0.0 // Trend less important
        });
        
        // Electronic: Very high energy, very fast tempo, treble-heavy, pulsing
        scores['electronic'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.4, energyTarget: 0.9,
            tempoWeight: 0.3, tempoTarget: 180,
            freqWeight: 0.2, freqTarget: 0.8, // Treble-heavy
            trendWeight: 0.1, trendTarget: 0.15 // Pulsing
        });
        
        // Reggae: Medium energy, slow-medium tempo, bass-heavy, relaxed
        scores['reggae'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.4, energyTarget: 0.5,
            tempoWeight: 0.3, tempoTarget: 100,
            freqWeight: 0.2, freqTarget: 0.2, // Bass-heavy
            trendWeight: 0.1, trendTarget: -0.05 // Relaxed
        });
        
        // Country: Low-medium energy, slow-medium tempo, mid-heavy, gentle
        scores['country'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.6, energyTarget: 0.2, // Much lower energy
            tempoWeight: 0.4, tempoTarget: 80, // Much slower tempo
            freqWeight: 0.0, freqTarget: 0.7, // Frequency less important
            trendWeight: 0.0, trendTarget: -0.05 // Trend less important
        });
        
        // Funk: Medium-high energy, medium tempo, bass-heavy, groovy
        scores['funk'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.4, energyTarget: 0.6,
            tempoWeight: 0.3, tempoTarget: 120,
            freqWeight: 0.2, freqTarget: 0.3, // Bass-heavy
            trendWeight: 0.1, trendTarget: 0.0 // Groovy
        });
        
        // Ambient: Very low energy, very slow tempo, balanced, ethereal
        scores['ambient'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.5, energyTarget: 0.15, // Very low energy
            tempoWeight: 0.3, tempoTarget: 50, // Very slow tempo
            freqWeight: 0.15, freqTarget: 0.5, // Balanced
            trendWeight: 0.05, trendTarget: -0.1 // Ethereal
        });
        
        // Punk: Very high energy, very fast tempo, treble-heavy, chaotic
        scores['punk'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.4, energyTarget: 0.95,
            tempoWeight: 0.3, tempoTarget: 200,
            freqWeight: 0.2, freqTarget: 0.9, // Treble-heavy
            trendWeight: 0.1, trendTarget: 0.2 // Chaotic
        });
        
        // Jazz: Medium energy, variable tempo, mid-heavy, smooth
        scores['jazz'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.4, energyTarget: 0.5,
            tempoWeight: 0.2, tempoTarget: 120, // Variable tempo
            freqWeight: 0.3, freqTarget: 0.6, // Mid-heavy
            trendWeight: 0.1, trendTarget: 0.0 // Smooth
        });
        
        // Classical: Low-medium energy, slow-medium tempo, balanced, gentle
        scores['classical'] = this.calculateScore(energy, tempo, dominantFreq, energyTrend, {
            energyWeight: 0.4, energyTarget: 0.4,
            tempoWeight: 0.3, tempoTarget: 100,
            freqWeight: 0.2, freqTarget: 0.5, // Balanced
            trendWeight: 0.1, trendTarget: -0.05 // Gentle
        });
        
        return scores;
    }
    
    calculateScore(energy, tempo, dominantFreq, energyTrend, targets) {
        // Calculate individual component scores (0-1 range) with very strict penalties
        const energyDiff = Math.abs(energy - targets.energyTarget);
        const energyScore = Math.max(0, 1 - energyDiff * targets.energyWeight * 4); // Very strict penalty
        
        // Special handling for tempo=0 (no tempo detected) - give lower score
        let tempoScore;
        if (tempo === 0) {
            tempoScore = 0.2; // Much lower score when no tempo detected
        } else {
            const tempoDiff = Math.abs(tempo - targets.tempoTarget) / 200;
            tempoScore = Math.max(0, 1 - tempoDiff * targets.tempoWeight * 3); // Very strict penalty
        }
        
        const freqDiff = Math.abs(dominantFreq - targets.freqTarget);
        const freqScore = Math.max(0, 1 - freqDiff * targets.freqWeight * 4); // Very strict penalty
        
        const trendDiff = Math.abs(energyTrend - targets.trendTarget);
        const trendScore = Math.max(0, 1 - trendDiff * targets.trendWeight * 4); // Very strict penalty
        
        // Weighted average with very strict scoring
        const totalWeight = targets.energyWeight + targets.tempoWeight + targets.freqWeight + targets.trendWeight;
        const weightedScore = (energyScore * targets.energyWeight + 
                             tempoScore * targets.tempoWeight + 
                             freqScore * targets.freqWeight + 
                             trendScore * targets.trendWeight) / totalWeight;
        
        // Apply additional penalty for very poor matches
        const finalScore = weightedScore < 0.4 ? weightedScore * 0.3 : weightedScore;
        
        return Math.max(0, Math.min(1, finalScore));
    }
    
    selectBestGenre(genreScores) {
        let bestGenre = 'electronic'; // Default fallback
        let bestScore = 0;
        
        // Debug logging
        console.log('🎵 Genre Scores:', genreScores);
        
        for (const [genre, score] of Object.entries(genreScores)) {
            if (score > bestScore) {
                bestScore = score;
                bestGenre = genre;
            }
        }
        
        console.log(`🎵 Selected Genre: ${bestGenre} (confidence: ${bestScore.toFixed(3)})`);
        
        return {
            genre: bestGenre,
            confidence: bestScore,
            allScores: genreScores
        };
    }
    
    getDetectionHistory() {
        return this.detectionHistory;
    }
    
    getGenreConfidence() {
        return this.genreConfidence;
    }
}

// Harmonic Analysis Engine for Enhanced Audio Analysis
class HarmonicAnalyzer {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.isRunning = false;
        
        // Harmonic analysis parameters
        this.chordDetectionThreshold = 0.3;
        this.harmonicWindow = 60; // frames for harmonic analysis
        this.keyDetectionWindow = 300; // 5 seconds for key detection
        
        // Current harmonic data
        this.currentChord = null;
        this.chordConfidence = 0;
        this.currentKey = null;
        this.keyConfidence = 0;
        this.harmonicProgression = [];
        
        // History for analysis
        this.chordHistory = [];
        this.keyHistory = [];
        this.harmonicContent = [];
        
        // Musical note frequencies (A4 = 440Hz)
        this.noteFrequencies = this.generateNoteFrequencies();
        this.chordPatterns = this.initializeChordPatterns();
        
        console.log('🎼 Harmonic Analyzer initialized');
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.analyzeHarmonics();
        console.log('🎼 Harmonic analysis started');
    }
    
    stop() {
        this.isRunning = false;
        console.log('🎼 Harmonic analysis stopped');
    }
    
    analyzeHarmonics() {
        if (!this.isRunning) return;
        
        try {
            if (this.audioAnalyzer && this.audioAnalyzer.audioMotion && this.audioAnalyzer.audioMotion.analyser) {
                this.detectChord();
                this.detectKey();
                this.analyzeHarmonicProgression();
            }
        } catch (error) {
            console.error('Harmonic analysis error:', error);
        }
        
        if (this.isRunning) {
            requestAnimationFrame(() => this.analyzeHarmonics());
        }
    }
    
    detectChord() {
        const analyser = this.audioAnalyzer.audioMotion.analyser;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Convert frequency data to note strengths
        const noteStrengths = this.analyzeNoteStrengths(dataArray);
        
        // Find the strongest chord match
        const chordMatch = this.findBestChordMatch(noteStrengths);
        
        if (chordMatch.confidence > this.chordDetectionThreshold) {
            this.currentChord = chordMatch.chord;
            this.chordConfidence = chordMatch.confidence;
            
            // Add to history
            this.chordHistory.push({
                timestamp: Date.now(),
                chord: this.currentChord,
                confidence: this.chordConfidence
            });
            
            // Keep only recent history
            if (this.chordHistory.length > 100) {
                this.chordHistory = this.chordHistory.slice(-100);
            }
        }
    }
    
    detectKey() {
        if (this.chordHistory.length < 10) return;
        
        // Analyze recent chord progression for key detection
        const recentChords = this.chordHistory.slice(-20).map(c => c.chord);
        const keyMatch = this.analyzeKeyFromProgression(recentChords);
        
        if (keyMatch.confidence > 0.4) {
            this.currentKey = keyMatch.key;
            this.keyConfidence = keyMatch.confidence;
            
            // Add to history
            this.keyHistory.push({
                timestamp: Date.now(),
                key: this.currentKey,
                confidence: this.keyConfidence
            });
            
            // Keep only recent history
            if (this.keyHistory.length > 50) {
                this.keyHistory = this.keyHistory.slice(-50);
            }
        }
    }
    
    analyzeHarmonicProgression() {
        if (this.chordHistory.length < 5) return;
        
        // Analyze chord progression patterns
        const recentChords = this.chordHistory.slice(-10).map(c => c.chord);
        const progression = this.identifyProgressionPattern(recentChords);
        
        if (progression) {
            this.harmonicProgression.push({
                timestamp: Date.now(),
                progression: progression
            });
            
            // Keep only recent progressions
            if (this.harmonicProgression.length > 20) {
                this.harmonicProgression = this.harmonicProgression.slice(-20);
            }
        }
    }
    
    analyzeNoteStrengths(dataArray) {
        const noteStrengths = new Array(12).fill(0); // 12 semitones
        
        for (let i = 0; i < dataArray.length; i++) {
            const frequency = (i * this.audioAnalyzer.audioMotion.analyser.context.sampleRate) / 
                             (2 * dataArray.length);
            
            if (frequency < 80 || frequency > 2000) continue; // Focus on musical range
            
            // Find closest note
            const noteIndex = this.findClosestNote(frequency);
            const strength = dataArray[i] / 255;
            
            noteStrengths[noteIndex] += strength;
        }
        
        return noteStrengths;
    }
    
    findClosestNote(frequency) {
        const A4 = 440;
        const semitone = Math.round(12 * Math.log2(frequency / A4));
        return ((semitone % 12) + 12) % 12;
    }
    
    findBestChordMatch(noteStrengths) {
        let bestMatch = { chord: null, confidence: 0 };
        
        for (const [chordName, pattern] of Object.entries(this.chordPatterns)) {
            const confidence = this.calculateChordConfidence(noteStrengths, pattern);
            
            if (confidence > bestMatch.confidence) {
                bestMatch = { chord: chordName, confidence };
            }
        }
        
        return bestMatch;
    }
    
    calculateChordConfidence(noteStrengths, chordPattern) {
        let totalStrength = 0;
        let chordNotes = 0;
        
        for (let i = 0; i < 12; i++) {
            if (chordPattern[i]) {
                totalStrength += noteStrengths[i];
                chordNotes++;
            }
        }
        
        return chordNotes > 0 ? totalStrength / chordNotes : 0;
    }
    
    analyzeKeyFromProgression(chords) {
        // Simple key detection based on chord frequency
        const chordCounts = {};
        chords.forEach(chord => {
            chordCounts[chord] = (chordCounts[chord] || 0) + 1;
        });
        
        // Find most common chord (simplified key detection)
        const mostCommonChord = Object.keys(chordCounts).reduce((a, b) => 
            chordCounts[a] > chordCounts[b] ? a : b
        );
        
        return {
            key: mostCommonChord,
            confidence: chordCounts[mostCommonChord] / chords.length
        };
    }
    
    identifyProgressionPattern(chords) {
        // Simple progression pattern recognition
        if (chords.length < 3) return null;
        
        const patterns = {
            'I-V-vi-IV': ['C', 'G', 'Am', 'F'],
            'vi-IV-I-V': ['Am', 'F', 'C', 'G'],
            'I-vi-IV-V': ['C', 'Am', 'F', 'G']
        };
        
        for (const [patternName, pattern] of Object.entries(patterns)) {
            if (this.matchesPattern(chords, pattern)) {
                return patternName;
            }
        }
        
        return null;
    }
    
    matchesPattern(chords, pattern) {
        if (chords.length < pattern.length) return false;
        
        const recentChords = chords.slice(-pattern.length);
        return recentChords.every((chord, index) => 
            chord === pattern[index] || chord.includes(pattern[index])
        );
    }
    
    generateNoteFrequencies() {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const frequencies = {};
        
        for (let octave = 0; octave < 8; octave++) {
            for (let i = 0; i < 12; i++) {
                const frequency = 440 * Math.pow(2, (i - 9) / 12 + (octave - 4));
                frequencies[`${notes[i]}${octave}`] = frequency;
            }
        }
        
        return frequencies;
    }
    
    initializeChordPatterns() {
        return {
            'C': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0], // C-E-G
            'Cm': [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0], // C-Eb-G
            'F': [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0], // F-A-C
            'G': [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1], // G-B-D
            'Am': [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0], // A-C-E
            'Dm': [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0], // D-F-A
            'Em': [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1], // E-G-B
            'Bdim': [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0] // B-D-F
        };
    }
    
    // Public getters
    getCurrentChord() { return this.currentChord; }
    getChordConfidence() { return this.chordConfidence; }
    getCurrentKey() { return this.currentKey; }
    getKeyConfidence() { return this.keyConfidence; }
    getHarmonicProgression() { return this.harmonicProgression; }
}

// Musical Structure Detection Engine
class StructureDetector {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.isRunning = false;
        
        // Structure detection parameters
        this.energyThreshold = 0.1;
        this.tempoThreshold = 10; // BPM change threshold
        this.structureWindow = 300; // 5 seconds for structure analysis
        
        // Current structure data
        this.currentSection = 'unknown';
        this.sectionConfidence = 0;
        this.sectionDuration = 0;
        this.sectionStartTime = 0;
        
        // Structure history
        this.sectionHistory = [];
        this.energyPatterns = [];
        this.tempoPatterns = [];
        
        // Section types and their characteristics
        this.sectionTypes = {
            'intro': { energy: 'low', tempo: 'stable', duration: 'short' },
            'verse': { energy: 'medium', tempo: 'stable', duration: 'medium' },
            'chorus': { energy: 'high', tempo: 'stable', duration: 'medium' },
            'bridge': { energy: 'variable', tempo: 'variable', duration: 'short' },
            'outro': { energy: 'decreasing', tempo: 'decreasing', duration: 'short' }
        };
        
        console.log('🏗️ Structure Detector initialized');
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.detectStructure();
        console.log('🏗️ Structure detection started');
    }
    
    stop() {
        this.isRunning = false;
        console.log('🏗️ Structure detection stopped');
    }
    
    detectStructure() {
        if (!this.isRunning) return;
        
        try {
            if (this.audioAnalyzer) {
                this.analyzeSectionCharacteristics();
                this.updateSectionHistory();
            }
        } catch (error) {
            console.error('Structure detection error:', error);
        }
        
        if (this.isRunning) {
            requestAnimationFrame(() => this.detectStructure());
        }
    }
    
    analyzeSectionCharacteristics() {
        const energy = this.audioAnalyzer.getEnergy();
        const tempo = this.audioAnalyzer.getTempo();
        const energyTrend = this.audioAnalyzer.getEnergyTrend();
        
        // Store patterns for analysis
        this.energyPatterns.push({
            timestamp: Date.now(),
            energy: energy,
            trend: energyTrend
        });
        
        this.tempoPatterns.push({
            timestamp: Date.now(),
            tempo: tempo
        });
        
        // Keep only recent patterns
        if (this.energyPatterns.length > 300) {
            this.energyPatterns = this.energyPatterns.slice(-300);
        }
        if (this.tempoPatterns.length > 300) {
            this.tempoPatterns = this.tempoPatterns.slice(-300);
        }
        
        // Analyze current section
        this.classifyCurrentSection(energy, tempo, energyTrend);
    }
    
    classifyCurrentSection(energy, tempo, energyTrend) {
        const sectionScores = {};
        
        for (const [sectionType, characteristics] of Object.entries(this.sectionTypes)) {
            let score = 0;
            
            // Energy analysis
            if (characteristics.energy === 'low' && energy < 0.3) score += 0.3;
            else if (characteristics.energy === 'medium' && energy >= 0.3 && energy < 0.7) score += 0.3;
            else if (characteristics.energy === 'high' && energy >= 0.7) score += 0.3;
            else if (characteristics.energy === 'variable') score += 0.2;
            else if (characteristics.energy === 'decreasing' && energyTrend < -0.1) score += 0.3;
            
            // Tempo analysis
            if (characteristics.tempo === 'stable' && this.isTempoStable()) score += 0.3;
            else if (characteristics.tempo === 'variable' && !this.isTempoStable()) score += 0.3;
            else if (characteristics.tempo === 'decreasing' && this.isTempoDecreasing()) score += 0.3;
            
            // Duration analysis
            const currentDuration = Date.now() - this.sectionStartTime;
            if (characteristics.duration === 'short' && currentDuration < 10000) score += 0.2;
            else if (characteristics.duration === 'medium' && currentDuration >= 10000 && currentDuration < 30000) score += 0.2;
            else if (characteristics.duration === 'long' && currentDuration >= 30000) score += 0.2;
            
            sectionScores[sectionType] = score;
        }
        
        // Find best matching section
        const bestSection = Object.keys(sectionScores).reduce((a, b) => 
            sectionScores[a] > sectionScores[b] ? a : b
        );
        
        const confidence = sectionScores[bestSection];
        
        // Update current section if confidence is high enough
        if (confidence > 0.5 && bestSection !== this.currentSection) {
            this.currentSection = bestSection;
            this.sectionConfidence = confidence;
            this.sectionStartTime = Date.now();
            this.sectionDuration = 0;
            
            console.log(`🏗️ Section detected: ${bestSection} (confidence: ${confidence.toFixed(2)})`);
        }
        
        this.sectionDuration = Date.now() - this.sectionStartTime;
    }
    
    isTempoStable() {
        if (this.tempoPatterns.length < 10) return true;
        
        const recentTempos = this.tempoPatterns.slice(-10).map(p => p.tempo);
        const avgTempo = recentTempos.reduce((a, b) => a + b, 0) / recentTempos.length;
        const variance = recentTempos.reduce((sum, tempo) => sum + Math.pow(tempo - avgTempo, 2), 0) / recentTempos.length;
        
        return Math.sqrt(variance) < this.tempoThreshold;
    }
    
    isTempoDecreasing() {
        if (this.tempoPatterns.length < 20) return false;
        
        const recentTempos = this.tempoPatterns.slice(-20).map(p => p.tempo);
        const firstHalf = recentTempos.slice(0, 10);
        const secondHalf = recentTempos.slice(10);
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        return secondAvg < firstAvg - 5; // 5 BPM decrease
    }
    
    updateSectionHistory() {
        this.sectionHistory.push({
            timestamp: Date.now(),
            section: this.currentSection,
            confidence: this.sectionConfidence,
            duration: this.sectionDuration
        });
        
        // Keep only recent history
        if (this.sectionHistory.length > 100) {
            this.sectionHistory = this.sectionHistory.slice(-100);
        }
    }
    
    // Public getters
    getCurrentSection() { return this.currentSection; }
    getSectionConfidence() { return this.sectionConfidence; }
    getSectionDuration() { return this.sectionDuration; }
    getSectionHistory() { return this.sectionHistory; }
}

// Enhanced Audio Analysis Engine for AI Autopilot
class AudioAnalyzer {
    constructor(audioMotion) {
        this.audioMotion = audioMotion;
        this.isRunning = false;
        this.analysisFrame = null;
        
        // Analysis parameters
        this.beatThreshold = 1.05; // More sensitive beat detection
        this.energySmoothing = 0.9;  // Smoother energy for better beat detection
        this.tempoWindow = 120; // frames for tempo analysis
        
        // Current analysis data
        this.currentEnergy = 0;
        this.smoothedEnergy = 0;
        this.beatDetected = false;
        this.currentTempo = 0;
        
        // History for analysis
        this.energyHistory = new Array(60).fill(0); // 1 second at 60fps
        this.beatHistory = [];
        this.tempoHistory = [];
        
        // Enhanced analysis components
        this.harmonicAnalyzer = new HarmonicAnalyzer(this);
        this.structureDetector = new StructureDetector(this);
        
        console.log('🎵 Enhanced Audio Analyzer initialized');
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        // Debug the audioMotion connection
        console.log('🔍 AudioMotion debug:', {
            audioMotion: !!this.audioMotion,
            analyser: !!(this.audioMotion && this.audioMotion.analyser),
            frequencyBinCount: this.audioMotion?.analyser?.frequencyBinCount
        });
        
        // Start enhanced analysis components
        this.harmonicAnalyzer.start();
        this.structureDetector.start();
        
        this.analyze();
        console.log('🎵 Enhanced audio analysis started');
    }
    
    stop() {
        this.isRunning = false;
        if (this.analysisFrame) {
            cancelAnimationFrame(this.analysisFrame);
            this.analysisFrame = null;
        }
        
        // Stop enhanced analysis components
        this.harmonicAnalyzer.stop();
        this.structureDetector.stop();
        
        console.log('🎵 Enhanced audio analysis stopped');
    }
    
    analyze() {
        if (!this.isRunning) return;
        
        try {
            // Get current audio data
            if (this.audioMotion && this.audioMotion.analyser) {
                this.extractAudioFeatures();
                this.detectBeats();
                this.calculateTempo();
                this.updateEnergyHistory();
                
                // Debug output every 60 frames (1 second)
                if (this.analysisFrame && this.analysisFrame % 60 === 0) {
                    const chord = this.harmonicAnalyzer.getCurrentChord();
                    const key = this.harmonicAnalyzer.getCurrentKey();
                    const section = this.structureDetector.getCurrentSection();
                    
                    console.log(`🎵 Enhanced Analysis: Energy=${this.currentEnergy.toFixed(3)}, Beat=${this.beatDetected}, Tempo=${this.currentTempo}, Freq=${this.dominantFreq}`);
                    console.log(`🎼 Harmonic: Chord=${chord || 'none'}, Key=${key || 'none'}`);
                    console.log(`🏗️ Structure: Section=${section}, Duration=${this.structureDetector.getSectionDuration()}ms`);
                }
            } else {
                // Debug: Check why audio data isn't available
                if (this.analysisFrame && this.analysisFrame % 300 === 0) { // Every 5 seconds
                    console.warn('⚠️ AudioMotion or analyser not available:', {
                        audioMotion: !!this.audioMotion,
                        analyser: !!(this.audioMotion && this.audioMotion.analyser)
                    });
                }
            }
        } catch (error) {
            console.error('Audio analysis error:', error);
        }
        
        this.analysisFrame = requestAnimationFrame(() => this.analyze());
    }
    
    extractAudioFeatures() {
        // Extract energy and frequency data
        const analyser = this.audioMotion.analyser;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate overall energy (RMS)
        let totalEnergy = 0;
        for (let i = 0; i < dataArray.length; i++) {
            totalEnergy += dataArray[i] * dataArray[i];
        }
        this.currentEnergy = Math.sqrt(totalEnergy / dataArray.length) / 255;
        
        // Smooth energy for stability
        this.smoothedEnergy = this.smoothedEnergy * this.energySmoothing + 
                             this.currentEnergy * (1 - this.energySmoothing);
        
        // Frequency band analysis
        this.analyzeFrequencyBands(dataArray);
        
        // Spectral flux for better beat detection
        this.calculateSpectralFlux(dataArray);
    }
    
    analyzeFrequencyBands(dataArray) {
        const binCount = dataArray.length;
        const bassEnd = Math.floor(binCount * 0.1);     // 0-10% (bass)
        const midEnd = Math.floor(binCount * 0.5);      // 10-50% (mids) 
        const trebleEnd = binCount;                     // 50-100% (treble)
        
        // Calculate energy in each band
        let bassEnergy = 0, midEnergy = 0, trebleEnergy = 0;
        
        for (let i = 0; i < bassEnd; i++) {
            bassEnergy += dataArray[i] * dataArray[i];
        }
        for (let i = bassEnd; i < midEnd; i++) {
            midEnergy += dataArray[i] * dataArray[i];
        }
        for (let i = midEnd; i < trebleEnd; i++) {
            trebleEnergy += dataArray[i] * dataArray[i];
        }
        
        // Normalize by band size
        this.bassEnergy = Math.sqrt(bassEnergy / bassEnd) / 255;
        this.midEnergy = Math.sqrt(midEnergy / (midEnd - bassEnd)) / 255;
        this.trebleEnergy = Math.sqrt(trebleEnergy / (trebleEnd - midEnd)) / 255;
        
        // Determine dominant frequency
        this.dominantFreq = 'mid';
        if (this.bassEnergy > this.midEnergy && this.bassEnergy > this.trebleEnergy) {
            this.dominantFreq = 'bass';
        } else if (this.trebleEnergy > this.midEnergy && this.trebleEnergy > this.bassEnergy) {
            this.dominantFreq = 'treble';
        }
    }
    
    calculateSpectralFlux(dataArray) {
        // Store previous frame for flux calculation
        if (!this.previousSpectrum) {
            this.previousSpectrum = new Uint8Array(dataArray.length);
            this.spectralFlux = 0;
            return;
        }
        
        // Calculate spectral flux (change between frames)
        let flux = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const diff = dataArray[i] - this.previousSpectrum[i];
            flux += diff > 0 ? diff : 0; // Only positive changes (onset)
        }
        
        this.spectralFlux = flux / dataArray.length / 255;
        
        // Update previous spectrum
        this.previousSpectrum.set(dataArray);
    }
    
    detectBeats() {
        // Enhanced beat detection using both energy and spectral flux
        const energyIncrease = this.currentEnergy / (this.smoothedEnergy + 0.001);
        const fluxThreshold = 0.05; // More sensitive flux detection
        
        // Beat detected if energy spike OR significant spectral change
        this.beatDetected = (energyIncrease > this.beatThreshold) || 
                           (this.spectralFlux > fluxThreshold);
        
        if (this.beatDetected) {
            const now = Date.now();
            const lastBeat = this.beatHistory[this.beatHistory.length - 1] || 0;
            
            // Prevent beats too close together (minimum 100ms apart)
            if (now - lastBeat > 100) {
                this.beatHistory.push(now);
                // Keep only recent beats (last 10 seconds)
                this.beatHistory = this.beatHistory.filter(time => now - time < 10000);
                
                // Log beat detection for debugging (every 4 beats)
                if (this.beatHistory.length % 4 === 0) {
                    console.log(`🥁 Beat detected - Energy: ${energyIncrease.toFixed(2)}, Flux: ${this.spectralFlux.toFixed(3)}, BPM: ${this.currentTempo}`);
                }
            }
        }
    }
    
    calculateTempo() {
        if (this.beatHistory.length < 4) return;
        
        // Calculate intervals between recent beats
        const intervals = [];
        for (let i = 1; i < Math.min(this.beatHistory.length, 8); i++) {
            const interval = this.beatHistory[i] - this.beatHistory[i-1];
            // Filter out unrealistic intervals (too fast/slow)
            if (interval > 200 && interval < 2000) { // 30-300 BPM range
                intervals.push(interval);
            }
        }
        
        if (intervals.length > 0) {
            // Find most common interval (tempo)
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            this.currentTempo = Math.round(60000 / avgInterval); // Convert to BPM
            
            // Clamp to realistic range
            this.currentTempo = Math.max(60, Math.min(200, this.currentTempo));
        }
    }
    
    updateEnergyHistory() {
        this.energyHistory.shift();
        this.energyHistory.push(this.currentEnergy);
    }
    
    // Public getters for decision engine
    getEnergy() { return this.smoothedEnergy; }
    getBeat() { return this.beatDetected; }
    getTempo() { return this.currentTempo; }
    getEnergyTrend() {
        const recent = this.energyHistory.slice(-30); // Last 0.5 seconds
        const older = this.energyHistory.slice(-60, -30); // Previous 0.5 seconds
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        return recentAvg - olderAvg; // Positive = increasing energy
    }
    
    // Enhanced method for genre detection and parameter control
    getCurrentFeatures() {
        // Convert dominantFreq string to numeric value for genre detection
        let dominantFreqNumeric = 0.5; // Default to mid
        if (this.dominantFreq === 'bass') dominantFreqNumeric = 0.2;
        else if (this.dominantFreq === 'treble') dominantFreqNumeric = 0.8;
        else if (this.dominantFreq === 'mid') dominantFreqNumeric = 0.5;
        
        // Estimate tempo from energy if no tempo detected yet
        let estimatedTempo = this.currentTempo;
        if (estimatedTempo === 0 && this.smoothedEnergy > 0.1) {
            // Estimate tempo based on energy level
            if (this.smoothedEnergy > 0.4) estimatedTempo = 140; // High energy = fast tempo
            else if (this.smoothedEnergy > 0.2) estimatedTempo = 120; // Medium energy = medium tempo
            else estimatedTempo = 100; // Low energy = slow tempo
        }
        
        return {
            // Basic audio features
            energy: this.smoothedEnergy,
            beat: this.beatDetected,
            tempo: estimatedTempo,
            dominantFreq: dominantFreqNumeric,
            energyTrend: this.getEnergyTrend(),
            beatStrength: this.beatDetected ? this.currentEnergy / (this.smoothedEnergy + 0.001) : 0,
            frequencyBands: {
                bass: this.bassEnergy || 0,
                mid: this.midEnergy || 0,
                treble: this.trebleEnergy || 0
            },
            spectralFlux: this.spectralFlux || 0,
            
            // Enhanced harmonic features
            harmonic: {
                chord: this.harmonicAnalyzer.getCurrentChord(),
                chordConfidence: this.harmonicAnalyzer.getChordConfidence(),
                key: this.harmonicAnalyzer.getCurrentKey(),
                keyConfidence: this.harmonicAnalyzer.getKeyConfidence(),
                progression: this.harmonicAnalyzer.getHarmonicProgression()
            },
            
            // Enhanced structure features
            structure: {
                section: this.structureDetector.getCurrentSection(),
                sectionConfidence: this.structureDetector.getSectionConfidence(),
                sectionDuration: this.structureDetector.getSectionDuration(),
                sectionHistory: this.structureDetector.getSectionHistory()
            }
        };
    }
}

// Decision Engine for AI Autopilot
class DecisionEngine {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.visualizer = autopilot.visualizer;
        this.audioAnalyzer = autopilot.audioAnalyzer;
        
        this.isRunning = false;
        this.decisionFrame = null;
        this.lastDecision = 0;
        this.decisionCooldown = 500; // Minimum 0.5 seconds between major changes
        
        // Available visualization modes
        this.visualizationModes = [
            { id: 0, name: 'Spectrum', energy: 'any', tempo: 'any' },
            { id: 1, name: 'Mirror Wave', energy: 'medium', tempo: 'medium' },
            { id: 2, name: 'Classic LED', energy: 'low', tempo: 'slow' },
            { id: 3, name: 'Stereo', energy: 'any', tempo: 'any' },
            { id: 4, name: 'Radial Spectrum', energy: 'high', tempo: 'fast' },
            { id: 5, name: 'Energy', energy: 'high', tempo: 'any' },
            { id: 6, name: 'Mirror', energy: 'medium', tempo: 'any' }
        ];
        
        console.log('🧠 Decision Engine initialized');
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.makeDecisions();
        console.log('🧠 Decision Engine started');
    }
    
    stop() {
        this.isRunning = false;
        if (this.decisionFrame) {
            cancelAnimationFrame(this.decisionFrame);
            this.decisionFrame = null;
        }
        console.log('🧠 Decision Engine stopped');
    }
    
    makeDecisions() {
        if (!this.isRunning) return;
        
        try {
            const now = Date.now();
            
            // Only make decisions periodically to avoid chaos
            if (now - this.lastDecision > this.decisionCooldown) {
                // Use enhanced decision making with parameter control
                this.autopilot.makeAdvancedDecisions();
                this.lastDecision = now; // Update last decision time
            }
            
        } catch (error) {
            console.error('Decision engine error:', error);
        }
        
        this.decisionFrame = requestAnimationFrame(() => this.makeDecisions());
    }
    
    evaluateVisualizationChange() {
        const energy = this.audioAnalyzer.getEnergy();
        const beat = this.audioAnalyzer.getBeat();
        const dominantFreq = this.audioAnalyzer.dominantFreq;
        const energyTrend = this.audioAnalyzer.getEnergyTrend();
        const tempo = this.audioAnalyzer.getTempo();
        
        // Debug logging
        console.log('🎯 Visualization Change Evaluation:', {
            energy: energy?.toFixed(3),
            beat: beat,
            dominantFreq: dominantFreq,
            energyTrend: energyTrend?.toFixed(3),
            tempo: tempo,
            currentMode: this.visualizer.currentMode,
            scope: this.autopilot.scope
        });
        
        // For specific scopes (radial, energy), only switch if not already in the correct mode
        if (this.autopilot.scope === 'radial' || this.autopilot.scope === 'energy') {
            const expectedMode = this.autopilot.scope === 'radial' ? 4 : 5;
            console.log(`🎯 Scope check: Current mode ${this.visualizer.currentMode}, Expected mode ${expectedMode} for scope ${this.autopilot.scope}`);
            if (this.visualizer.currentMode !== expectedMode) {
                console.log(`🎯 Scope enforcement: Switching to ${this.autopilot.scope} mode (${expectedMode})`);
                this.applyModeChange(expectedMode);
                this.autopilot.recordModeChange(expectedMode);
                this.lastDecision = Date.now();
            } else {
                console.log(`🎯 Scope enforcement: Already in correct mode ${expectedMode} for scope ${this.autopilot.scope}`);
            }
            return; // Don't run normal decision logic for specific scopes
        }
        
        // Intelligent mode selection based on multiple factors (only for 'bars' and 'all' scopes)
        let targetMode = this.selectOptimalMode(energy, dominantFreq, tempo, energyTrend);
        
        // Switch if mode is different and conditions are met (less restrictive)
        const shouldSwitch = targetMode !== this.visualizer.currentMode && 
                           this.shouldSwitchMode(targetMode, energy) &&
                           (beat || energy > 0.1 || Math.random() < 0.1); // More responsive switching
        
        console.log('🎯 Switch Decision:', {
            shouldSwitch: shouldSwitch,
            beat: beat,
            targetMode: targetMode,
            currentMode: this.visualizer.currentMode,
            shouldSwitchMode: this.shouldSwitchMode(targetMode, energy)
        });
        
        if (shouldSwitch) {
            this.applyModeChange(targetMode);
            this.autopilot.recordModeChange(targetMode);
            this.lastDecision = Date.now();
            
            // Log detailed switch reasoning
            console.log(`🎨 Autopilot: ${this.getModeName(this.visualizer.currentMode)} → ${this.getModeName(targetMode)}`);
            console.log(`   Energy: ${energy.toFixed(2)}, Freq: ${dominantFreq}, BPM: ${tempo}, Trend: ${energyTrend.toFixed(3)}`);
            
            // Evaluate additional automation
            this.evaluateColorSchemeChange(energy, dominantFreq);
            this.evaluateKaleidoscopeActivation(energy, beat);
        }
    }
    
    selectOptimalMode(energy, dominantFreq, tempo, energyTrend) {
        // Get available modes based on scope setting
        const availableModes = this.autopilot.modeGroups[this.autopilot.scope];
        
        console.log(`🎯 Scope: ${this.autopilot.scope}, Available modes:`, availableModes);
        
        // Get enhanced audio features including harmonic and structure analysis
        const audioFeatures = this.audioAnalyzer.getCurrentFeatures();
        const harmonic = audioFeatures.harmonic || {};
        const structure = audioFeatures.structure || {};
        
        // If scope is specific (radial, energy), return that mode directly
        if (this.autopilot.scope === 'radial' && availableModes.includes(4)) {
            return 4; // Radial Spectrum
        }
        if (this.autopilot.scope === 'energy' && availableModes.includes(5)) {
            return 5; // Energy
        }
        if (this.autopilot.scope === 'bars' && availableModes.length > 0) {
            // For bars scope, prefer bar-based visualizations
            const barModes = availableModes.filter(mode => [0, 2, 3].includes(mode));
            return barModes.length > 0 ? barModes[Math.floor(Math.random() * barModes.length)] : availableModes[0];
        }
        
        // Enhanced mode selection with harmonic and structure awareness
        let candidateModes = [];
        
        // Structure-based mode selection (highest priority)
        if (structure.section) {
            switch (structure.section) {
                case 'intro':
                    // Intro - prefer subtle, building modes
                    candidateModes = availableModes.filter(mode => [0, 4, 5].includes(mode)); // Spectrum, Radial, Wave
                    break;
                case 'verse':
                    // Verse - balanced, steady modes
                    candidateModes = availableModes.filter(mode => [0, 1, 4, 5].includes(mode)); // Spectrum, Bars, Radial, Wave
                    break;
                case 'chorus':
                    // Chorus - most dynamic, energetic modes
                    candidateModes = availableModes.filter(mode => [1, 2, 3, 6].includes(mode)); // Bars, Stereo, Mirror, Kaleidoscope
                    break;
                case 'bridge':
                    // Bridge - unique, experimental modes
                    candidateModes = availableModes.filter(mode => [2, 3, 6].includes(mode)); // Stereo, Mirror, Kaleidoscope
                    break;
                case 'outro':
                    // Outro - fading, subtle modes
                    candidateModes = availableModes.filter(mode => [0, 4, 5].includes(mode)); // Spectrum, Radial, Wave
                    break;
            }
        }
        
        // Harmonic-based mode selection (if no structure info or as secondary factor)
        if (candidateModes.length === 0 && harmonic.chord) {
            if (harmonic.chord.includes('m')) {
                // Minor chords - prefer darker, more introspective modes
                candidateModes = availableModes.filter(mode => [0, 4, 5].includes(mode)); // Spectrum, Radial, Wave
            } else if (harmonic.chord.includes('M') || harmonic.chord.includes('maj')) {
                // Major chords - prefer brighter, more energetic modes
                candidateModes = availableModes.filter(mode => [1, 2, 3, 6].includes(mode)); // Bars, Stereo, Mirror, Kaleidoscope
            }
        }
        
        // Energy-based selection (fallback if no structure/harmonic info)
        if (candidateModes.length === 0) {
        // Very high energy
        if (energy > 0.4 && energyTrend > 0.02) {
            candidateModes = availableModes.filter(mode => [4, 5].includes(mode)); // Radial, Energy
        }
        // High energy
        else if (energy > 0.3) {
            candidateModes = availableModes.filter(mode => [1, 5, 4].includes(mode)); // Mirror Wave, Energy, Radial
        }
        // Medium energy
        else if (energy > 0.2) {
            candidateModes = availableModes.filter(mode => [3, 6, 0].includes(mode)); // Stereo, Mirror, Spectrum
        }
        // Rising energy
        else if (energyTrend > 0.01) {
            candidateModes = availableModes.filter(mode => [1, 0].includes(mode)); // Mirror Wave, Spectrum
        }
        // Low energy
        else if (energy > 0.1) {
            candidateModes = availableModes.filter(mode => [0, 2].includes(mode)); // Spectrum, Classic LED
        }
        // Very low energy
        else {
            candidateModes = availableModes.filter(mode => [2].includes(mode)); // Classic LED
            }
        }
        
        // If no candidates match scope, use any available mode
        if (candidateModes.length === 0) {
            candidateModes = availableModes;
        }
        
        // Select random mode from candidates for variety
        return candidateModes[Math.floor(Math.random() * candidateModes.length)];
    }
    
    shouldSwitchMode(targetMode, energy) {
        // Prevent rapid switching only in very low energy situations
        if (energy < 0.02) return false;
        
        // Allow more frequent switching - only prevent immediate repeats
        const recentModes = this.autopilot.modeHistory.slice(-1); // Only prevent immediate repeat
        if (recentModes.includes(targetMode)) return false;
        
        return true;
    }
    
    getModeName(modeId) {
        const mode = this.visualizationModes.find(m => m.id === modeId);
        return mode ? mode.name : `Mode ${modeId}`;
    }
    
    applyModeChange(targetMode) {
        console.log(`🎯 applyModeChange called: ${this.visualizer.currentMode} → ${targetMode}`);
        const timing = this.autopilot.changeTiming;
        
        switch (timing) {
            case 'instant':
                this.visualizer.setVisualizationMode(targetMode);
                break;
            case 'smooth':
                // Add smooth transition (could be implemented with CSS transitions)
                this.visualizer.setVisualizationMode(targetMode);
                break;
            case 'slow':
                // Add delay for slower changes
                setTimeout(() => {
                    this.visualizer.setVisualizationMode(targetMode);
                }, 500);
                break;
            case 'beat-synced':
                // Wait for next beat to change
                if (this.audioAnalyzer.getBeat()) {
                    this.visualizer.setVisualizationMode(targetMode);
                } else {
                    // Store pending change and apply on next beat
                    this.pendingModeChange = targetMode;
                }
                break;
            default:
                this.visualizer.setVisualizationMode(targetMode);
        }
    }
    
    evaluateColorSchemeChange(energy, dominantFreq) {
        // Only change colors if auto color schemes is enabled
        if (!this.autopilot.autoColorSchemes) return;
        
        // More responsive color scheme automation
        if (dominantFreq === 'bass' && energy > 0.15) {
            // Bass-heavy = darker schemes
            this.visualizer.setColorScheme('metal');
            console.log('🎨 Color: Bass-heavy → Metal');
        } else if (dominantFreq === 'treble' && energy > 0.15) {
            // Treble-heavy = brighter schemes  
            this.visualizer.setColorScheme('psychedelic');
            console.log('🎨 Color: Treble-heavy → Psychedelic');
        } else if (energy > 0.2) {
            // Medium energy = vibrant schemes
            this.visualizer.setColorScheme('luigi');
            console.log('🎨 Color: Medium energy → Luigi');
        } else {
            // Low energy = calm schemes
            this.visualizer.setColorScheme('earthtones');
            console.log('🎨 Color: Low energy → Earthtones');
        }
    }
    
    evaluateKaleidoscopeActivation(energy, beat) {
        // Auto-activate kaleidoscope for high energy sections
        if (energy > 0.8 && beat && !this.visualizer.kaleidoscopeEnabled) {
            this.visualizer.toggleKaleidoscope();
            console.log('🔮 Autopilot activated kaleidoscope (high energy)');
        } else if (energy < 0.4 && this.visualizer.kaleidoscopeEnabled) {
            this.visualizer.toggleKaleidoscope();
            console.log('🔮 Autopilot deactivated kaleidoscope (low energy)');
        }
    }
}

// ****
// ****

// RecordManager Class - Handles video/audio recording
class RecordManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.compositeCanvas = null;
        this.compositeCtx = null;
        this.animationFrame = null;
        this.saveLocation = null;
        
        // Recording settings
        this.resolution = '1080p';
        this.aspectRatio = '16:9';
        this.frameRate = 30;
        this.videoQuality = 'auto';
        this.audioQuality = 'auto';
        this.customFilename = 'Vizzy_Recording';
        this.matchVisualizationAspect = true;
        
        // Resolution presets
        this.resolutionPresets = {
            'canvas': { width: 0, height: 0 }, // Will be set dynamically
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
            '4k': { width: 3840, height: 2160 }
        };
        
        // Quality presets
        this.videoQualityPresets = {
            'auto': 5000000, // 5 Mbps
            'high': 8000000, // 8 Mbps
            'medium': 3000000, // 3 Mbps
            'low': 1500000 // 1.5 Mbps
        };
        
        this.audioQualityPresets = {
            'auto': 192000, // 192 kbps
            'high': 320000, // 320 kbps
            'medium': 192000, // 192 kbps
            'low': 128000 // 128 kbps
        };
        
        this.loadSettings();
        console.log('RecordManager initialized with aspect ratio:', this.aspectRatio);
        this.initializeUI();
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('gitup_record_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.resolution = settings.resolution || '1080p';
                this.aspectRatio = settings.aspectRatio || '16:9';
                this.frameRate = settings.frameRate || 30;
                this.videoQuality = settings.videoQuality || 'auto';
                this.audioQuality = settings.audioQuality || 'auto';
                this.customFilename = settings.customFilename || 'Vizzy_Recording';
                this.saveLocation = settings.saveLocation || null;
                this.matchVisualizationAspect = settings.matchVisualizationAspect !== undefined ? settings.matchVisualizationAspect : true;
            }
        } catch (e) {
            console.error('Error loading recording settings:', e);
        }
    }
    
    saveSettings() {
        try {
            const settings = {
                resolution: this.resolution,
                aspectRatio: this.aspectRatio,
                frameRate: this.frameRate,
                videoQuality: this.videoQuality,
                audioQuality: this.audioQuality,
                customFilename: this.customFilename,
                saveLocation: this.saveLocation,
                matchVisualizationAspect: this.matchVisualizationAspect
            };
            localStorage.setItem('gitup_record_settings', JSON.stringify(settings));
        } catch (e) {
            console.error('Error saving recording settings:', e);
        }
    }
    
    initializeUI() {
        // Record button click handler - both sidebar and footer
        const recordBtns = document.querySelectorAll('#recordBtn');
        recordBtns.forEach(recordBtn => {
            recordBtn.addEventListener('click', () => {
                if (this.isRecording) {
                    this.stopRecording();
                } else {
                    this.startRecording();
                }
            });
        });
        
        // Settings button click handler
        const settingsBtn = document.getElementById('recordSettingsBtn');
        const settingsPanel = document.getElementById('recordSettingsPanel');
        const closeBtn = document.getElementById('recordSettingsClose');
        
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = settingsPanel.style.display !== 'none';
                settingsPanel.style.display = isVisible ? 'none' : 'block';
            });
        }
        
        if (closeBtn && settingsPanel) {
            closeBtn.addEventListener('click', () => {
                settingsPanel.style.display = 'none';
            });
        }
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (settingsPanel && !settingsPanel.contains(e.target) && 
                !settingsBtn.contains(e.target)) {
                settingsPanel.style.display = 'none';
            }
        });
        
        this.initializeSettingsControls();
        this.initializeBackgroundImageControls();
        this.updateUI();
    }
    
    initializeSettingsControls() {
        // Resolution select
        const resolutionSelect = document.getElementById('recordResolutionSelect');
        if (resolutionSelect) {
            resolutionSelect.value = this.resolution;
            resolutionSelect.addEventListener('change', (e) => {
                this.resolution = e.target.value;
                this.updateUI();
                this.saveSettings();
            });
        }
        
        // Aspect ratio buttons
        document.querySelectorAll('.aspect-ratio-btn').forEach(btn => {
            // Set initial active state based on current aspect ratio
            if (btn.dataset.ratio === this.aspectRatio) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.aspect-ratio-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.aspectRatio = btn.dataset.ratio;
                console.log('Aspect ratio changed to:', this.aspectRatio);
                this.updateUI();
                this.saveSettings();
            });
        });
        
        // Frame rate buttons
        document.querySelectorAll('.framerate-btn').forEach(btn => {
            // Set initial active state based on current frame rate
            if (parseInt(btn.dataset.fps) === this.frameRate) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.framerate-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.frameRate = parseInt(btn.dataset.fps);
                console.log('Frame rate changed to:', this.frameRate);
                this.updateUI();
                this.saveSettings();
            });
        });
        
        // Quality selects
        const videoQualitySelect = document.getElementById('recordVideoQualitySelect');
        const audioQualitySelect = document.getElementById('recordAudioQualitySelect');
        
        if (videoQualitySelect) {
            videoQualitySelect.value = this.videoQuality;
            videoQualitySelect.addEventListener('change', (e) => {
                this.videoQuality = e.target.value;
                this.updateUI();
                this.saveSettings();
            });
        }
        
        if (audioQualitySelect) {
            audioQualitySelect.value = this.audioQuality;
            audioQualitySelect.addEventListener('change', (e) => {
                this.audioQuality = e.target.value;
                this.updateUI();
                this.saveSettings();
            });
        }
        
        // Filename input
        const filenameInput = document.getElementById('recordFilenameInput');
        if (filenameInput) {
            filenameInput.value = this.customFilename;
            filenameInput.addEventListener('input', (e) => {
                this.customFilename = e.target.value || 'Vizzy_Recording';
                this.saveSettings();
            });
        }
        
        // Choose location button
        const chooseLocationBtn = document.getElementById('recordChooseLocationBtn');
        if (chooseLocationBtn) {
            chooseLocationBtn.addEventListener('click', () => {
                this.chooseFileLocation();
            });
        }

        // Match Visualization Aspect Ratio toggle
        const matchVisualizationAspectBtn = document.getElementById('recordMatchVisualizationAspectBtn');
        if (matchVisualizationAspectBtn) {
            // Set initial state
            matchVisualizationAspectBtn.textContent = this.matchVisualizationAspect ? 'Match Video Aspect: On' : 'Match Video Aspect: Off';
            matchVisualizationAspectBtn.classList.toggle('active', this.matchVisualizationAspect);
            
            matchVisualizationAspectBtn.addEventListener('click', () => {
                this.matchVisualizationAspect = !this.matchVisualizationAspect;
                matchVisualizationAspectBtn.textContent = this.matchVisualizationAspect ? 'Match Video Aspect: On' : 'Match Video Aspect: Off';
                matchVisualizationAspectBtn.classList.toggle('active', this.matchVisualizationAspect);
                
                // Apply aspect ratio matching if video is active
                if (this.visualizer && (this.visualizer.videoMode === 'camera' || this.visualizer.videoMode === 'file') && this.visualizer.videoElement) {
                    this.visualizer.updateVisualizationAspectRatio();
                }
                
                console.log('Match visualization aspect ratio:', this.matchVisualizationAspect);
                this.saveSettings();
            });
        }
    }

    initializeBackgroundImageControls() {
        // Load saved background image from visualizer
        if (this.visualizer) {
            this.visualizer.loadBackgroundImage();
        }

        // Background image button - toggle ON/OFF only
        const backgroundImgBtn = document.getElementById('backgroundImgBtn');
        const backgroundSelectImageBtn = document.getElementById('backgroundSelectImageBtn');
        const backgroundImageFile = document.getElementById('backgroundImageFile');
        
        if (backgroundImgBtn) {
            // Initialize button state
            this.updateBackgroundToggleButton();
            
            backgroundImgBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    console.log('🔘 Background IMG button clicked - current state:', {
                        enabled: this.visualizer.backgroundImageEnabled,
                        hasImage: !!this.visualizer.backgroundImage
                    });
                    
                    // Toggle background image enabled state
                    this.visualizer.backgroundImageEnabled = !this.visualizer.backgroundImageEnabled;
                    this.visualizer.saveBackgroundImage();
                    this.updateBackgroundToggleButton();
                    
                    console.log('🔘 Background IMG button toggled to:', this.visualizer.backgroundImageEnabled);
                    
                    // Force redraw of visualization
                    if (this.visualizer.audioMotion) {
                        console.log('🔄 Forcing visualization redraw after background toggle');
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        if (backgroundSelectImageBtn) {
            backgroundSelectImageBtn.addEventListener('click', () => {
                if (backgroundImageFile) {
                    backgroundImageFile.click();
                }
            });
        }

        // File input handler
        if (backgroundImageFile) {
            backgroundImageFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                console.log('📁 Background image file selected:', {
                    name: file?.name,
                    type: file?.type,
                    size: file?.size,
                    sizeMB: file ? (file.size / (1024 * 1024)).toFixed(2) + 'MB' : 'N/A'
                });
                
                if (file) {
                    // Validate file type
                    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
                        console.error('❌ Invalid file type:', file.type);
                        alert('Please select a JPG or PNG image file.');
                        return;
                    }

                    // Validate file size (2MB limit)
                    if (file.size > 2 * 1024 * 1024) {
                        console.error('❌ File too large:', file.size, 'bytes');
                        alert('File size must be less than 2MB.');
                        return;
                    }

                    console.log('✅ File validation passed, reading...');
                    // Read file as data URL
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        console.log('📖 File read successfully, data URL length:', e.target.result.length);
                        if (this.visualizer) {
                            this.visualizer.backgroundImage = e.target.result;
                            this.visualizer.backgroundImageEnabled = true; // Auto-enable when image is loaded
                            this.visualizer.backgroundImageFileName = file.name;
                            this.visualizer.backgroundImageFileSize = file.size;
                            this.visualizer.cachedBackgroundImage = null; // Clear cached image
                            this.visualizer.saveBackgroundImage();
                            this.updateBackgroundImageUI();
                            this.visualizer.updateFooterBackgroundButton(); // Update footer button
                            console.log('💾 Background image saved and enabled');
                        }
                    };
                    reader.onerror = (e) => {
                        console.error('❌ File read error:', e);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Settings panel toggle
        const backgroundSettingsBtn = document.getElementById('backgroundSettingsBtn');
        const backgroundSettingsPanel = document.getElementById('backgroundSettingsPanel');
        const backgroundSettingsClose = document.getElementById('backgroundSettingsClose');

        if (backgroundSettingsBtn && backgroundSettingsPanel) {
            backgroundSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = backgroundSettingsPanel.style.display !== 'none';
                backgroundSettingsPanel.style.display = isVisible ? 'none' : 'block';
            });
        }

        if (backgroundSettingsClose && backgroundSettingsPanel) {
            backgroundSettingsClose.addEventListener('click', () => {
                backgroundSettingsPanel.style.display = 'none';
            });
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (backgroundSettingsPanel && !backgroundSettingsPanel.contains(e.target) && 
                !backgroundSettingsBtn.contains(e.target)) {
                backgroundSettingsPanel.style.display = 'none';
            }
        });

        // Opacity slider
        const opacitySlider = document.getElementById('backgroundOpacitySlider');
        const opacityValue = document.getElementById('backgroundOpacityValue');
        
        if (opacitySlider && opacityValue) {
            opacitySlider.value = this.visualizer ? this.visualizer.backgroundImageOpacity : 100;
            opacityValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageOpacity : 100}%`;
            
            opacitySlider.addEventListener('input', (e) => {
                if (this.visualizer) {
                    this.visualizer.backgroundImageOpacity = parseInt(e.target.value);
                    opacityValue.textContent = `${this.visualizer.backgroundImageOpacity}%`;
                    this.visualizer.saveBackgroundImage();
                }
            });
        }

        // Saturation slider
        const saturationSlider = document.getElementById('backgroundSaturationSlider');
        const saturationValue = document.getElementById('backgroundSaturationValue');
        
        if (saturationSlider && saturationValue) {
            saturationSlider.value = this.visualizer ? this.visualizer.backgroundImageSaturation : 100;
            saturationValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageSaturation : 100}%`;
            
            saturationSlider.addEventListener('input', (e) => {
                if (this.visualizer) {
                    this.visualizer.backgroundImageSaturation = parseInt(e.target.value);
                    saturationValue.textContent = `${this.visualizer.backgroundImageSaturation}%`;
                    this.visualizer.saveBackgroundImage();
                }
            });
        }

        // Posterization slider
        const posterizeSlider = document.getElementById('backgroundPosterizeSlider');
        const posterizeValue = document.getElementById('backgroundPosterizeValue');
        
        if (posterizeSlider && posterizeValue) {
            posterizeSlider.value = this.visualizer ? this.visualizer.backgroundImagePosterize : 16;
            posterizeValue.textContent = this.visualizer ? this.visualizer.backgroundImagePosterize : 16;
            
            posterizeSlider.addEventListener('input', (e) => {
                if (this.visualizer) {
                    this.visualizer.backgroundImagePosterize = parseInt(e.target.value);
                    posterizeValue.textContent = this.visualizer.backgroundImagePosterize;
                    this.visualizer.saveBackgroundImage();
                }
            });
        }

        // Contrast slider
        const contrastSlider = document.getElementById('backgroundContrastSlider');
        const contrastValue = document.getElementById('backgroundContrastValue');
        
        if (contrastSlider && contrastValue) {
            contrastSlider.value = this.visualizer ? this.visualizer.backgroundImageContrast : 100;
            contrastValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageContrast : 100}%`;
            
            contrastSlider.addEventListener('input', (e) => {
                if (this.visualizer) {
                    this.visualizer.backgroundImageContrast = parseInt(e.target.value);
                    contrastValue.textContent = `${this.visualizer.backgroundImageContrast}%`;
                    this.visualizer.saveBackgroundImage();
                }
            });
        }

        // Size buttons
        const sizeButtons = document.querySelectorAll('.size-btn[data-size]');
        sizeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.visualizer) {
                    const size = e.target.getAttribute('data-size');
                    this.visualizer.backgroundImageSize = size;
                    this.visualizer.saveBackgroundImage();
                    
                    // Update active state
                    sizeButtons.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });

        // Clear background button
        const clearBtn = document.getElementById('backgroundClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    this.visualizer.clearBackgroundImage();
                    this.updateBackgroundImageUI();
                }
            });
        }

        // Initialize UI state
        this.updateBackgroundImageUI();
        
        // Initialize Sidebar Background Controls
        this.initializeSidebarBackgroundControls();
    }
    
    initializeSidebarBackgroundControls() {
        // Sidebar background image button - toggle ON/OFF only
        const sidebarBackgroundImgBtn = document.getElementById('sidebarBackgroundImgBtn');
        const sidebarBackgroundSelectImageBtn = document.getElementById('sidebarBackgroundSelectImageBtn');
        const sidebarBackgroundImageFile = document.getElementById('sidebarBackgroundImageFile');
        
        if (sidebarBackgroundImgBtn) {
            // Initialize button state
            this.updateSidebarBackgroundToggleButton();
            
            sidebarBackgroundImgBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    console.log('🔘 Sidebar Background IMG button clicked - current state:', {
                        enabled: this.visualizer.backgroundImageEnabled,
                        hasImage: !!this.visualizer.backgroundImage
                    });
                    
                    // Toggle background image enabled state
                    this.visualizer.backgroundImageEnabled = !this.visualizer.backgroundImageEnabled;
                    this.visualizer.saveBackgroundImage();
                    this.updateSidebarBackgroundToggleButton();
                    this.updateBackgroundToggleButton(); // Also update original button
                    
                    console.log('🔘 Sidebar Background IMG button toggled to:', this.visualizer.backgroundImageEnabled);
                    
                    // Force redraw of visualization
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        if (sidebarBackgroundSelectImageBtn) {
            sidebarBackgroundSelectImageBtn.addEventListener('click', () => {
                if (sidebarBackgroundImageFile) {
                    sidebarBackgroundImageFile.click();
                }
            });
        }

        // File input handler
        if (sidebarBackgroundImageFile) {
            sidebarBackgroundImageFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                console.log('📁 Sidebar Background image file selected:', {
                    name: file?.name,
                    type: file?.type,
                    size: file?.size,
                    lastModified: file?.lastModified
                });
                
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        console.log('📖 Sidebar File read successfully, data URL length:', e.target.result.length);
                        if (this.visualizer) {
                            this.visualizer.backgroundImage = e.target.result;
                            this.visualizer.backgroundImageEnabled = true; // Auto-enable when image is loaded
                            this.visualizer.backgroundImageFileName = file.name;
                            this.visualizer.backgroundImageFileSize = file.size;
                            this.visualizer.cachedBackgroundImage = null; // Clear cached image
                            this.visualizer.saveBackgroundImage();
                            this.updateSidebarBackgroundImageUI();
                            this.updateBackgroundImageUI(); // Also update original UI
                            this.visualizer.updateFooterBackgroundButton(); // Update footer button
                            console.log('💾 Sidebar Background image saved and enabled');
                        }
                    };
                    reader.onerror = (e) => {
                        console.error('❌ Sidebar File read error:', e);
                        this.showError('Failed to read image file');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Note: Settings panel removed - all controls are now embedded directly in sidebar

        // Initialize all sidebar sliders and controls
        this.initializeSidebarBackgroundSliders();
        this.initializeSidebarBackgroundSizeButtons();
        this.initializeSidebarBackgroundClearButton();
        
        // Initialize UI state
        this.updateSidebarBackgroundImageUI();
    }
    
    initializeSidebarBackgroundSliders() {
        // Opacity slider
        const sidebarOpacitySlider = document.getElementById('sidebarBackgroundOpacitySlider');
        const sidebarOpacityValue = document.getElementById('sidebarBackgroundOpacityValue');
        
        if (sidebarOpacitySlider && sidebarOpacityValue) {
            sidebarOpacitySlider.value = this.visualizer ? this.visualizer.backgroundImageOpacity : 100;
            sidebarOpacityValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageOpacity : 100}%`;
            
            sidebarOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sidebarOpacityValue.textContent = `${value}%`;
                if (this.visualizer) {
                    this.visualizer.backgroundImageOpacity = value;
                    this.visualizer.saveBackgroundImage();
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        // Saturation slider
        const sidebarSaturationSlider = document.getElementById('sidebarBackgroundSaturationSlider');
        const sidebarSaturationValue = document.getElementById('sidebarBackgroundSaturationValue');
        
        if (sidebarSaturationSlider && sidebarSaturationValue) {
            sidebarSaturationSlider.value = this.visualizer ? this.visualizer.backgroundImageSaturation : 100;
            sidebarSaturationValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageSaturation : 100}%`;
            
            sidebarSaturationSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sidebarSaturationValue.textContent = `${value}%`;
                if (this.visualizer) {
                    this.visualizer.backgroundImageSaturation = value;
                    this.visualizer.saveBackgroundImage();
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        // Posterization slider
        const sidebarPosterizeSlider = document.getElementById('sidebarBackgroundPosterizeSlider');
        const sidebarPosterizeValue = document.getElementById('sidebarBackgroundPosterizeValue');
        
        if (sidebarPosterizeSlider && sidebarPosterizeValue) {
            sidebarPosterizeSlider.value = this.visualizer ? this.visualizer.backgroundImagePosterize : 16;
            sidebarPosterizeValue.textContent = `${this.visualizer ? this.visualizer.backgroundImagePosterize : 16}`;
            
            sidebarPosterizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sidebarPosterizeValue.textContent = `${value}`;
                if (this.visualizer) {
                    this.visualizer.backgroundImagePosterize = value;
                    this.visualizer.saveBackgroundImage();
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }

        // Contrast slider
        const sidebarContrastSlider = document.getElementById('sidebarBackgroundContrastSlider');
        const sidebarContrastValue = document.getElementById('sidebarBackgroundContrastValue');
        
        if (sidebarContrastSlider && sidebarContrastValue) {
            sidebarContrastSlider.value = this.visualizer ? this.visualizer.backgroundImageContrast : 100;
            sidebarContrastValue.textContent = `${this.visualizer ? this.visualizer.backgroundImageContrast : 100}%`;
            
            sidebarContrastSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sidebarContrastValue.textContent = `${value}%`;
                if (this.visualizer) {
                    this.visualizer.backgroundImageContrast = value;
                    this.visualizer.saveBackgroundImage();
                    if (this.visualizer.audioMotion) {
                        this.visualizer.audioMotion.draw();
                    }
                }
            });
        }
    }
    
    initializeSidebarBackgroundSizeButtons() {
        const sizeButtons = [
            'sidebarBackgroundSizeFit',
            'sidebarBackgroundSizeFill', 
            'sidebarBackgroundSizeStretch',
            'sidebarBackgroundSizeOriginal'
        ];
        
        sizeButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    // Remove active class from all buttons
                    sizeButtons.forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) btn.classList.remove('active');
                    });
                    
                    // Add active class to clicked button
                    button.classList.add('active');
                    
                    // Update visualizer
                    if (this.visualizer) {
                        this.visualizer.backgroundImageSize = button.dataset.size;
                        this.visualizer.saveBackgroundImage();
                        if (this.visualizer.audioMotion) {
                            this.visualizer.audioMotion.draw();
                        }
                    }
                });
            }
        });
    }
    
    initializeSidebarBackgroundClearButton() {
        const sidebarClearBtn = document.getElementById('sidebarBackgroundClearBtn');
        if (sidebarClearBtn) {
            sidebarClearBtn.addEventListener('click', () => {
                if (this.visualizer) {
                    this.visualizer.clearBackgroundImage();
                    this.updateSidebarBackgroundImageUI();
                    this.updateBackgroundImageUI(); // Also update original UI
                }
            });
        }
    }
    
    updateSidebarBackgroundToggleButton() {
        const sidebarBackgroundImgBtn = document.getElementById('sidebarBackgroundImgBtn');
        if (sidebarBackgroundImgBtn && this.visualizer) {
            const textSpan = sidebarBackgroundImgBtn.querySelector('.background-text');
            if (textSpan) {
                textSpan.textContent = this.visualizer.backgroundImageEnabled ? 'Background IMG: ON' : 'Background IMG: OFF';
            }
            sidebarBackgroundImgBtn.classList.toggle('active', this.visualizer.backgroundImageEnabled);
        }
    }
    
    updateSidebarBackgroundImageUI() {
        const sidebarBackgroundImgBtn = document.getElementById('sidebarBackgroundImgBtn');
        const sidebarBackgroundFileInfo = document.getElementById('sidebarBackgroundFileInfo');
        const sidebarBackgroundFileName = document.getElementById('sidebarBackgroundFileName');
        const sidebarBackgroundFileSize = document.getElementById('sidebarBackgroundFileSize');
        const sidebarBackgroundImagePreview = document.getElementById('sidebarBackgroundImagePreview');

        if (sidebarBackgroundImgBtn) {
            if (this.visualizer && this.visualizer.backgroundImageEnabled && this.visualizer.backgroundImage) {
                sidebarBackgroundImgBtn.classList.add('active');
                sidebarBackgroundImgBtn.querySelector('.background-text').textContent = 'Background IMG: ON';
            } else {
                sidebarBackgroundImgBtn.classList.remove('active');
                sidebarBackgroundImgBtn.querySelector('.background-text').textContent = 'Background IMG: OFF';
            }
        }

        if (this.visualizer && this.visualizer.backgroundImage && this.visualizer.backgroundImageFileName) {
            if (sidebarBackgroundFileInfo) sidebarBackgroundFileInfo.style.display = 'block';
            if (sidebarBackgroundFileName) sidebarBackgroundFileName.textContent = this.visualizer.backgroundImageFileName;
            if (sidebarBackgroundFileSize) sidebarBackgroundFileSize.textContent = this.formatFileSize(this.visualizer.backgroundImageFileSize);
            if (sidebarBackgroundImagePreview) sidebarBackgroundImagePreview.style.backgroundImage = `url(${this.visualizer.backgroundImage})`;
        } else {
            if (sidebarBackgroundFileInfo) sidebarBackgroundFileInfo.style.display = 'none';
        }
    }

    updateBackgroundToggleButton() {
        const backgroundImgBtn = document.getElementById('backgroundImgBtn');
        if (backgroundImgBtn) {
            if (this.visualizer && this.visualizer.backgroundImageEnabled && this.visualizer.backgroundImage) {
                backgroundImgBtn.classList.add('active');
                backgroundImgBtn.querySelector('.background-text').textContent = 'Background IMG: On';
            } else {
                backgroundImgBtn.classList.remove('active');
                backgroundImgBtn.querySelector('.background-text').textContent = 'Background IMG: Off';
            }
        }
    }

    updateBackgroundToggleButton() {
        const backgroundImgBtn = document.getElementById('backgroundImgBtn');
        if (backgroundImgBtn && this.visualizer) {
            const textSpan = backgroundImgBtn.querySelector('.background-text');
            if (textSpan) {
                textSpan.textContent = this.visualizer.backgroundImageEnabled ? 'Background IMG: ON' : 'Background IMG: OFF';
            }
            backgroundImgBtn.classList.toggle('active', this.visualizer.backgroundImageEnabled);
            
            console.log('🔄 Background toggle button updated:', {
                enabled: this.visualizer.backgroundImageEnabled,
                hasImage: !!this.visualizer.backgroundImage,
                buttonText: textSpan?.textContent,
                buttonActive: backgroundImgBtn.classList.contains('active')
            });
            
            // Debug summary
            this.debugBackgroundImageState();
        }
    }

    debugBackgroundImageState() {
        if (!this.visualizer) return;
        
        console.log('🔍 BACKGROUND IMAGE DEBUG SUMMARY:', {
            'Image Data': this.visualizer.backgroundImage ? `Present (${this.visualizer.backgroundImage.length} chars)` : 'Missing',
            'Enabled': this.visualizer.backgroundImageEnabled,
            'Opacity': this.visualizer.backgroundImageOpacity + '%',
            'Saturation': this.visualizer.backgroundImageSaturation + '%',
            'Button Text': document.querySelector('#backgroundImgBtn .background-text')?.textContent,
            'Button Active': document.querySelector('#backgroundImgBtn')?.classList.contains('active'),
            'Canvas Elements': {
                'Main Canvas': document.querySelector('#visualizationCanvas') ? 'Present' : 'Missing',
                'Capture Canvas': document.querySelector('#captureCanvas') ? 'Present' : 'Missing',
                'Composite Canvas': document.querySelector('#compositeCanvas') ? 'Present' : 'Missing',
                'All Canvas Elements': document.querySelectorAll('canvas').length + ' found'
            },
            'Layer Order': [
                'Layer 0: Background Image',
                'Layer 1: Video (if active)',
                'Layer 2: AudioMotion Visualization',
                'Layer 3: Infinite Zoom',
                'Layer 4: Kaleidoscope',
                'Layer 5: Video Effects'
            ]
        });
    }

    updateBackgroundImageUI() {
        const backgroundImgBtn = document.getElementById('backgroundImgBtn');
        const backgroundFileInfo = document.getElementById('backgroundFileInfo');
        const backgroundFileName = document.getElementById('backgroundFileName');
        const backgroundFileSize = document.getElementById('backgroundFileSize');
        const backgroundImagePreview = document.getElementById('backgroundImagePreview');

        // Update toggle button
        this.updateBackgroundToggleButton();

        // Update sliders
        const opacitySlider = document.getElementById('backgroundOpacitySlider');
        const opacityValue = document.getElementById('backgroundOpacityValue');
        const saturationSlider = document.getElementById('backgroundSaturationSlider');
        const saturationValue = document.getElementById('backgroundSaturationValue');
        const posterizeSlider = document.getElementById('backgroundPosterizeSlider');
        const posterizeValue = document.getElementById('backgroundPosterizeValue');
        const contrastSlider = document.getElementById('backgroundContrastSlider');
        const contrastValue = document.getElementById('backgroundContrastValue');

        if (this.visualizer) {
            if (opacitySlider && opacityValue) {
                opacitySlider.value = this.visualizer.backgroundImageOpacity;
                opacityValue.textContent = `${this.visualizer.backgroundImageOpacity}%`;
            }
            if (saturationSlider && saturationValue) {
                saturationSlider.value = this.visualizer.backgroundImageSaturation;
                saturationValue.textContent = `${this.visualizer.backgroundImageSaturation}%`;
            }
            if (posterizeSlider && posterizeValue) {
                posterizeSlider.value = this.visualizer.backgroundImagePosterize;
                posterizeValue.textContent = this.visualizer.backgroundImagePosterize;
            }
            if (contrastSlider && contrastValue) {
                contrastSlider.value = this.visualizer.backgroundImageContrast;
                contrastValue.textContent = `${this.visualizer.backgroundImageContrast}%`;
            }

            // Update size buttons
            const sizeButtons = document.querySelectorAll('.size-btn[data-size]');
            sizeButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-size') === this.visualizer.backgroundImageSize) {
                    btn.classList.add('active');
                }
            });
        }

        if (backgroundFileInfo && backgroundFileName && backgroundFileSize && backgroundImagePreview) {
            if (this.visualizer && this.visualizer.backgroundImage) {
                backgroundFileInfo.style.display = 'block';
                
                // Display filename and file size
                const filename = this.visualizer.backgroundImageFileName || 'Background Image';
                const fileSize = this.visualizer.backgroundImageFileSize || 0;
                const fileSizeText = fileSize > 0 ? this.formatFileSize(fileSize) : '';
                
                backgroundFileName.textContent = filename;
                backgroundFileSize.textContent = fileSizeText;
                
                // Create preview image
                const img = new Image();
                img.onload = () => {
                    backgroundImagePreview.innerHTML = '';
                    backgroundImagePreview.appendChild(img);
                };
                img.src = this.visualizer.backgroundImage;
            } else {
                backgroundFileInfo.style.display = 'none';
            }
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    updateUI() {
        // Update recording info display
        const dimensions = this.getRecordingDimensions();
        const outputDisplay = document.getElementById('recordingOutput');
        const estSizeDisplay = document.getElementById('recordingEstSize');
        
        if (outputDisplay) {
            outputDisplay.textContent = `${dimensions.width}×${dimensions.height} @ ${this.frameRate}fps`;
        }
        
        if (estSizeDisplay) {
            const estimatedMBPerMin = this.estimateFileSize();
            estSizeDisplay.textContent = `~${estimatedMBPerMin} MB/min`;
        }
        
        // Update file location display
        const locationDisplay = document.getElementById('recordFileLocation');
        if (locationDisplay) {
            locationDisplay.textContent = this.saveLocation ? 
                `📁 ${this.saveLocation}` : '📥 Downloads folder';
        }
    }
    
    getRecordingDimensions() {
        let targetWidth, targetHeight;
        
        if (this.resolution === 'canvas') {
            // Use current canvas dimensions
            const canvas = this.visualizer.audioMotion?.canvas;
            if (canvas) {
                targetWidth = canvas.width;
                targetHeight = canvas.height;
            } else {
                targetWidth = 1920;
                targetHeight = 1080;
            }
        } else {
            const preset = this.resolutionPresets[this.resolution];
            targetWidth = preset.width;
            targetHeight = preset.height;
        }
        
        console.log(`Recording dimensions before aspect ratio: ${targetWidth}x${targetHeight}`);
        console.log(`Current aspect ratio setting: ${this.aspectRatio}`);
        
        // Apply aspect ratio
        const [ratioW, ratioH] = this.aspectRatio.split(':').map(Number);
        const targetAspect = ratioW / ratioH;
        const currentAspect = targetWidth / targetHeight;
        
        console.log(`Target aspect: ${targetAspect} (${ratioW}:${ratioH}), Current aspect: ${currentAspect}`);
        
        if (currentAspect > targetAspect) {
            // Too wide, adjust width
            targetWidth = Math.round(targetHeight * targetAspect);
            console.log(`Adjusted width to fit aspect ratio: ${targetWidth}x${targetHeight}`);
        } else if (currentAspect < targetAspect) {
            // Too tall, adjust height
            targetHeight = Math.round(targetWidth / targetAspect);
            console.log(`Adjusted height to fit aspect ratio: ${targetWidth}x${targetHeight}`);
        } else {
            console.log(`Aspect ratio already matches: ${targetWidth}x${targetHeight}`);
        }
        
        return { width: targetWidth, height: targetHeight };
    }
    
    estimateFileSize() {
        const dimensions = this.getRecordingDimensions();
        const videoBitrate = this.videoQualityPresets[this.videoQuality] || 5000000;
        const audioBitrate = this.audioQualityPresets[this.audioQuality] || 192000;
        
        // Calculate total bitrate and convert to MB per minute
        const totalBitrate = videoBitrate + audioBitrate;
        const mbPerSecond = totalBitrate / 8 / 1024 / 1024; // Convert bits to MB
        const mbPerMinute = Math.round(mbPerSecond * 60);
        
        return mbPerMinute;
    }
    
    async chooseFileLocation() {
        try {
            if ('showDirectoryPicker' in window) {
                const directoryHandle = await window.showDirectoryPicker();
                this.saveLocation = directoryHandle.name;
                this.directoryHandle = directoryHandle;
                this.updateUI();
                this.saveSettings();
            } else {
                alert('File picker not supported in this browser. Files will be saved to Downloads folder.');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error choosing location:', err);
            }
        }
    }
    
    async startRecording() {
        if (this.isRecording) return;
        
        try {
            console.log('Starting recording...');
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.recordedChunks = [];
            
            // Update UI - both sidebar and footer buttons
            const recordBtns = document.querySelectorAll('#recordBtn');
            recordBtns.forEach(recordBtn => {
            const recordText = recordBtn.querySelector('.record-text');
            const recordTimer = recordBtn.querySelector('.record-timer');
            
            recordBtn.classList.add('recording');
            recordText.style.display = 'none';
            recordTimer.style.display = 'inline';
            });
            
            // Start timer
            this.updateTimer();
            this.timerInterval = setInterval(() => this.updateTimer(), 100);
            
            // Create composite canvas
            await this.setupCompositeCanvas();
            
            // Get video stream
            const videoStream = this.compositeCanvas.captureStream(this.frameRate);
            
            // Get audio stream
            const audioStream = await this.getAudioStream();
            
            // Combine streams
            const combinedStream = new MediaStream();
            videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
            if (audioStream) {
                audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
            }
            
            // Setup MediaRecorder
            const mimeType = 'video/webm;codecs=vp9,opus';
            const videoBitrate = this.videoQualityPresets[this.videoQuality];
            
            this.mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: mimeType,
                videoBitsPerSecond: videoBitrate
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };
            
            this.mediaRecorder.start(1000); // Record in 1 second chunks
            
            // Start compositing loop
            this.startCompositing();
            
            console.log('Recording started successfully');
            
        } catch (err) {
            console.error('Error starting recording:', err);
            alert('Failed to start recording: ' + err.message);
            this.stopRecording();
        }
    }
    
    async setupCompositeCanvas() {
        const dimensions = this.getRecordingDimensions();
        
        this.compositeCanvas = document.createElement('canvas');
        this.compositeCanvas.width = dimensions.width;
        this.compositeCanvas.height = dimensions.height;
        this.compositeCtx = this.compositeCanvas.getContext('2d');
        
        console.log(`Created composite canvas: ${dimensions.width}x${dimensions.height}`);
    }
    
    startCompositing() {
        const composite = () => {
            if (!this.isRecording) return;
            
            this.compositeFrame();
            this.animationFrame = requestAnimationFrame(composite);
        };
        composite();
    }
    
    compositeFrame() {
        if (!this.compositeCtx) return;
        
        const { width, height } = this.compositeCanvas;
        
        // Clear canvas with black background
        this.compositeCtx.fillStyle = '#000000';
        this.compositeCtx.fillRect(0, 0, width, height);
        
        // Draw background image if available and enabled
        if (this.visualizer.backgroundImage && this.visualizer.backgroundImageEnabled) {
            console.log('🎥 RecordManager: Drawing background image in composite');
            this.visualizer.drawBackgroundImage(this.compositeCtx, width, height);
        } else {
            console.log('🎥 RecordManager: Background image skipped -', {
                hasImage: !!this.visualizer.backgroundImage,
                enabled: this.visualizer.backgroundImageEnabled
            });
        }
        
        // Debug logging for kaleidoscope state
        if (this.visualizer.kaleidoscopeEnabled) {
            console.log('Kaleidoscope enabled - ApplyToVideo:', this.visualizer.kaleidoscopeApplyToVideo, 
                       'ApplyToViz:', this.visualizer.kaleidoscopeApplyToViz);
            if (this.visualizer.kaleidoscopeVideoCanvas) {
                console.log('Kaleidoscope video canvas display:', this.visualizer.kaleidoscopeVideoCanvas.style.display,
                           'opacity:', this.visualizer.kaleidoscopeVideoCanvas.style.opacity);
            }
        }
        
        // Get source canvas (main visualization canvas)
        let sourceCanvas = null;
        
        // Determine which canvas to capture based on current state
        if (this.visualizer.kaleidoscopeEnabled) {
            if (this.visualizer.kaleidoscopeApplyToViz && this.visualizer.kaleidoscopeVizCanvas) {
                sourceCanvas = this.visualizer.kaleidoscopeVizCanvas;
            } else if (this.visualizer.kaleidoscopeApplyToVideo && this.visualizer.kaleidoscopeVideoCanvas) {
                sourceCanvas = this.visualizer.kaleidoscopeVideoCanvas;
            } else if (this.visualizer.audioMotion?.canvas) {
                sourceCanvas = this.visualizer.audioMotion.canvas;
            }
        } else if (this.visualizer.audioMotion?.canvas) {
            sourceCanvas = this.visualizer.audioMotion.canvas;
        }
        
        if (!sourceCanvas) {
            console.warn('No source canvas found for recording');
            return;
        }
        
        // Calculate shared letterboxing dimensions for both video and visualization
        let sharedDrawWidth, sharedDrawHeight, sharedDrawX, sharedDrawY;
        
        if (this.visualizer.videoElement && 
            (this.visualizer.videoMode === 'camera' || this.visualizer.videoMode === 'file') &&
            this.visualizer.videoElement.readyState >= 2) {
            
            // Use video dimensions to calculate shared letterboxing
            const videoAspect = this.visualizer.videoElement.videoWidth / this.visualizer.videoElement.videoHeight;
            const canvasAspect = width / height;
            
            if (videoAspect > canvasAspect) {
                // Video is wider, fit to width
                sharedDrawWidth = width;
                sharedDrawHeight = width / videoAspect;
                sharedDrawX = 0;
                sharedDrawY = (height - sharedDrawHeight) / 2;
            } else {
                // Video is taller, fit to height
                sharedDrawHeight = height;
                sharedDrawWidth = height * videoAspect;
                sharedDrawX = (width - sharedDrawWidth) / 2;
                sharedDrawY = 0;
            }
            
            console.log(`Shared letterbox dimensions: ${sharedDrawWidth}x${sharedDrawHeight} at ${sharedDrawX},${sharedDrawY}`);
            
            // Draw video background with shared dimensions
            if (this.visualizer.kaleidoscopeEnabled && 
                this.visualizer.kaleidoscopeApplyToVideo && 
                this.visualizer.kaleidoscopeVideoCanvas &&
                this.visualizer.kaleidoscopeVideoCanvas.style.display !== 'none') {
                
                // Draw kaleidoscope video canvas
                const kaleidoscopeOpacity = parseFloat(this.visualizer.kaleidoscopeVideoCanvas.style.opacity) || 1;
                if (kaleidoscopeOpacity > 0) {
                    this.compositeCtx.globalAlpha = kaleidoscopeOpacity;
                    this.compositeCtx.drawImage(this.visualizer.kaleidoscopeVideoCanvas, sharedDrawX, sharedDrawY, sharedDrawWidth, sharedDrawHeight);
                    this.compositeCtx.globalAlpha = 1;
                }
            } else {
                // Draw regular video with effects using shared dimensions
                const opacity = parseFloat(this.visualizer.videoElement.style.opacity) || 1;
                if (opacity > 0) {
                    this.compositeCtx.globalAlpha = opacity;
                    this.drawVideoWithEffects(sharedDrawX, sharedDrawY, sharedDrawWidth, sharedDrawHeight);
                    this.compositeCtx.globalAlpha = 1;
                }
            }
            
            // Draw visualization using the same shared dimensions
            console.log(`Drawing visualization with shared dimensions: ${sharedDrawWidth}x${sharedDrawHeight} at ${sharedDrawX},${sharedDrawY}`);
            this.compositeCtx.drawImage(sourceCanvas, sharedDrawX, sharedDrawY, sharedDrawWidth, sharedDrawHeight);
            
            // Draw Infinite Zoom if active and not captured via kaleidoscope
            if (this.visualizer.infiniteZoom && this.visualizer.infiniteZoom.isActive && this.visualizer.infiniteZoom.canvas) {
                const shouldDrawSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeApplyToInfiniteZoom;
                if (shouldDrawSeparately) {
                    this.compositeCtx.drawImage(this.visualizer.infiniteZoom.canvas, sharedDrawX, sharedDrawY, sharedDrawWidth, sharedDrawHeight);
                }
            }
            
        } else {
            // No video - draw visualization with standard letterboxing
            this.drawScaledVisualization(sourceCanvas);
            
            // Draw Infinite Zoom if active and not captured via kaleidoscope
            if (this.visualizer.infiniteZoom && this.visualizer.infiniteZoom.isActive && this.visualizer.infiniteZoom.canvas) {
                const shouldDrawSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeApplyToInfiniteZoom;
                if (shouldDrawSeparately) {
                    this.drawScaledVisualization(this.visualizer.infiniteZoom.canvas);
                }
            }
        }
    }
    
    drawScaledVideo() {
        const video = this.visualizer.videoElement;
        const { width, height } = this.compositeCanvas;
        
        if (!video || video.readyState < 2) return;
        
        // Create temporary canvas for video effects processing
        if (!this.tempVideoCanvas) {
            this.tempVideoCanvas = document.createElement('canvas');
            this.tempVideoCtx = this.tempVideoCanvas.getContext('2d');
        }
        
        // Set temp canvas size to match composite canvas
        this.tempVideoCanvas.width = width;
        this.tempVideoCanvas.height = height;
        
        // Calculate scaling to fit with letterboxing
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = width / height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (videoAspect > canvasAspect) {
            // Video is wider, fit to width
            drawWidth = width;
            drawHeight = width / videoAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
        } else {
            // Video is taller, fit to height
            drawHeight = height;
            drawWidth = height * videoAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
        }
        
        // Apply video effects to temp canvas context
        this.tempVideoCtx.save();
        
        // Build filter string like the StreamManager does
        const filters = [];
        
        // Apply posterize FIRST with stronger effect
        if (this.visualizer.videoPosterize < 16) {
            const steps = this.visualizer.videoPosterize;
            const posterizeAmount = (16 - steps) / 16;
            filters.push(`contrast(${300 + posterizeAmount * 200}%)`);
            filters.push(`brightness(${95}%)`);
            filters.push(`saturate(${200}%)`);
            if (steps < 8) {
                filters.push(`contrast(${150}%)`);
            }
        }
        
        // Apply other video adjustments
        if (this.visualizer.videoBrightness !== 100 && this.visualizer.videoPosterize >= 16) {
            filters.push(`brightness(${this.visualizer.videoBrightness}%)`);
        }
        if (this.visualizer.videoContrast !== 100 && this.visualizer.videoPosterize >= 16) {
            filters.push(`contrast(${this.visualizer.videoContrast}%)`);
        }
        if (this.visualizer.videoSaturation !== 100 && this.visualizer.videoPosterize >= 16) {
            filters.push(`saturate(${this.visualizer.videoSaturation}%)`);
        }
        if (this.visualizer.videoHueRotate !== 0) {
            filters.push(`hue-rotate(${this.visualizer.videoHueRotate}deg)`);
        }
        if (this.visualizer.videoGrayscale > 0) {
            filters.push(`grayscale(${this.visualizer.videoGrayscale}%)`);
        }
        if (this.visualizer.videoSepia > 0) {
            filters.push(`sepia(${this.visualizer.videoSepia}%)`);
        }
        if (this.visualizer.videoBlur > 0) {
            filters.push(`blur(${this.visualizer.videoBlur}px)`);
        }
        if (this.visualizer.videoInvert) {
            filters.push('invert(100%)');
        }
        
        // Apply filters to temp canvas
        this.tempVideoCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
        this.tempVideoCtx.globalAlpha = 1;
        
        // Clear temp canvas
        this.tempVideoCtx.clearRect(0, 0, width, height);
        
        // Draw video to temp canvas with effects
        this.tempVideoCtx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        
        this.tempVideoCtx.restore();
        
        // Calculate pulse scale if enabled
        let scale = 1;
        if (this.visualizer.videoPulse) {
            const pulseDuration = this.visualizer.videoPulseRate * 1000; // Convert to ms
            const pulsePhase = (Date.now() % pulseDuration) / pulseDuration;
            scale = 1 + (Math.sin(pulsePhase * Math.PI * 2) * 0.02); // 2% scale variation
        }
        
        // Apply mirror transformations if enabled
        this.compositeCtx.save();
        
        if (this.visualizer.videoMirror) {
            this.compositeCtx.scale(-1, 1);
            this.compositeCtx.translate(-width, 0);
        }
        
        // Apply pulse scaling
        if (scale !== 1) {
            this.compositeCtx.translate(width / 2, height / 2);
            this.compositeCtx.scale(scale, scale);
            this.compositeCtx.translate(-width / 2, -height / 2);
        }
        
        // Draw processed video from temp canvas to composite canvas
        this.compositeCtx.drawImage(this.tempVideoCanvas, 0, 0);
        
        this.compositeCtx.restore();
        
        // Apply vignette effect if enabled
        if (this.visualizer.videoVignette > 0) {
            this.compositeCtx.save();
            const intensity = this.visualizer.videoVignette / 100;
            const size = (100 - this.visualizer.videoVignette) / 100;
            
            const gradient = this.compositeCtx.createRadialGradient(
                width / 2, height / 2, Math.min(width, height) * size * 0.5,
                width / 2, height / 2, Math.max(width, height) * 0.7
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
            
            this.compositeCtx.fillStyle = gradient;
            this.compositeCtx.fillRect(0, 0, width, height);
            this.compositeCtx.restore();
        }
    }
    
    drawVideoWithEffects(drawX, drawY, drawWidth, drawHeight) {
        const video = this.visualizer.videoElement;
        const { width, height } = this.compositeCanvas;
        
        if (!video || video.readyState < 2) return;
        
        // Create temporary canvas for video effects processing
        if (!this.tempVideoCanvas) {
            this.tempVideoCanvas = document.createElement('canvas');
            this.tempVideoCtx = this.tempVideoCanvas.getContext('2d');
        }
        
        // Set temp canvas size to match composite canvas
        this.tempVideoCanvas.width = width;
        this.tempVideoCanvas.height = height;
        
        // Apply video effects to temp canvas context
        this.tempVideoCtx.save();
        
        // Build filter string like the StreamManager does
        const filters = [];
        
        // Apply posterize FIRST with stronger effect
        if (this.visualizer.videoPosterize < 16) {
            const steps = this.visualizer.videoPosterize;
            const posterizeAmount = (16 - steps) / 16;
            filters.push(`contrast(${300 + posterizeAmount * 200}%)`);
            filters.push(`brightness(${95}%)`);
            filters.push(`saturate(${200}%)`);
            if (steps < 8) {
                filters.push(`contrast(${150}%)`);
            }
        }
        
        // Apply other video adjustments
        if (this.visualizer.videoBrightness !== 100 && this.visualizer.videoPosterize >= 16) {
            filters.push(`brightness(${this.visualizer.videoBrightness}%)`);
        }
        if (this.visualizer.videoContrast !== 100 && this.visualizer.videoPosterize >= 16) {
            filters.push(`contrast(${this.visualizer.videoContrast}%)`);
        }
        if (this.visualizer.videoSaturation !== 100 && this.visualizer.videoPosterize >= 16) {
            filters.push(`saturate(${this.visualizer.videoSaturation}%)`);
        }
        if (this.visualizer.videoHueRotate !== 0) {
            filters.push(`hue-rotate(${this.visualizer.videoHueRotate}deg)`);
        }
        if (this.visualizer.videoGrayscale > 0) {
            filters.push(`grayscale(${this.visualizer.videoGrayscale}%)`);
        }
        if (this.visualizer.videoSepia > 0) {
            filters.push(`sepia(${this.visualizer.videoSepia}%)`);
        }
        if (this.visualizer.videoBlur > 0) {
            filters.push(`blur(${this.visualizer.videoBlur}px)`);
        }
        if (this.visualizer.videoInvert) {
            filters.push('invert(100%)');
        }
        
        // Apply filters to temp canvas
        this.tempVideoCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
        this.tempVideoCtx.globalAlpha = 1;
        
        // Clear temp canvas
        this.tempVideoCtx.clearRect(0, 0, width, height);
        
        // Draw video to temp canvas with effects at specified dimensions
        this.tempVideoCtx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        
        this.tempVideoCtx.restore();
        
        // Calculate pulse scale if enabled
        let scale = 1;
        if (this.visualizer.videoPulse) {
            const pulseDuration = this.visualizer.videoPulseRate * 1000;
            const pulsePhase = (Date.now() % pulseDuration) / pulseDuration;
            scale = 1 + (Math.sin(pulsePhase * Math.PI * 2) * 0.02);
        }
        
        // Apply mirror transformations if enabled
        this.compositeCtx.save();
        
        if (this.visualizer.videoMirror) {
            this.compositeCtx.scale(-1, 1);
            this.compositeCtx.translate(-width, 0);
        }
        
        // Apply pulse scaling
        if (scale !== 1) {
            this.compositeCtx.translate(width / 2, height / 2);
            this.compositeCtx.scale(scale, scale);
            this.compositeCtx.translate(-width / 2, -height / 2);
        }
        
        // Draw processed video from temp canvas to composite canvas
        this.compositeCtx.drawImage(this.tempVideoCanvas, 0, 0);
        
        this.compositeCtx.restore();
        
        // Apply vignette effect if enabled
        if (this.visualizer.videoVignette > 0) {
            this.compositeCtx.save();
            const intensity = this.visualizer.videoVignette / 100;
            const size = (100 - this.visualizer.videoVignette) / 100;
            
            const gradient = this.compositeCtx.createRadialGradient(
                width / 2, height / 2, Math.min(width, height) * size * 0.5,
                width / 2, height / 2, Math.max(width, height) * 0.7
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
            
            this.compositeCtx.fillStyle = gradient;
            this.compositeCtx.fillRect(0, 0, width, height);
            this.compositeCtx.restore();
        }
    }
    
    drawScaledCanvas(canvas) {
        const { width, height } = this.compositeCanvas;
        
        if (!canvas || canvas.width === 0 || canvas.height === 0) return;
        
        // For kaleidoscope canvases, use full dimensions (they're already sized to match the container)
        if (canvas === this.visualizer.kaleidoscopeVideoCanvas || canvas === this.visualizer.kaleidoscopeVizCanvas) {
            console.log('Drawing kaleidoscope canvas at full size');
            this.compositeCtx.drawImage(canvas, 0, 0, width, height);
            return;
        }
        
        // For other canvases, calculate scaling to fit with letterboxing
        const canvasAspect = canvas.width / canvas.height;
        const targetAspect = width / height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (canvasAspect > targetAspect) {
            // Canvas is wider, fit to width
            drawWidth = width;
            drawHeight = width / canvasAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
        } else {
            // Canvas is taller, fit to height
            drawHeight = height;
            drawWidth = height * canvasAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
        }
        
        this.compositeCtx.drawImage(canvas, drawX, drawY, drawWidth, drawHeight);
    }
    
    drawScaledVisualization(sourceCanvas) {
        const { width, height } = this.compositeCanvas;
        
        // Use standard letterboxing for visualization
        const sourceAspect = sourceCanvas.width / sourceCanvas.height;
        const canvasAspect = width / height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (sourceAspect > canvasAspect) {
            // Source is wider, fit to width
            drawWidth = width;
            drawHeight = width / sourceAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
        } else {
            // Source is taller, fit to height
            drawHeight = height;
            drawWidth = height * sourceAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
        }
        
        console.log(`Drawing visualization: ${drawWidth}x${drawHeight} at ${drawX},${drawY}`);
        this.compositeCtx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);
    }
    
    async getAudioStream() {
        try {
            // Check if using live audio input
            if (this.visualizer.audioStream) {
                console.log('Using live audio input for recording');
                return this.visualizer.audioStream.clone();
            }
            
            // Get audio from AudioMotion's audio context
            const audioMotion = this.visualizer.audioMotion;
            if (!audioMotion || !audioMotion.audioCtx) {
                console.warn('No AudioMotion context available');
                return null;
            }
            
            const audioCtx = audioMotion.audioCtx;
            const destination = audioCtx.createMediaStreamDestination();
            
            // Create a gain node to tap the audio
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.0;
            
            // Connect all available audio sources to capture everything
            let hasAudioSource = false;
            
            // Connect playlist/live audio if available
            if (audioMotion.source) {
                try {
                    audioMotion.source.connect(gainNode);
                    hasAudioSource = true;
                    console.log('Connected AudioMotion source to recording');
                } catch (e) {
                    console.error('Error connecting AudioMotion source:', e);
                }
            }
            
            // Also connect video audio if available (can be simultaneous with playlist)
            if (this.visualizer.videoAudioGain) {
                try {
                    this.visualizer.videoAudioGain.connect(gainNode);
                    hasAudioSource = true;
                    console.log('Connected video audio to recording');
                } catch (e) {
                    console.error('Error connecting video audio:', e);
                }
            }
            
            if (hasAudioSource) {
                gainNode.connect(destination);
                console.log('Audio stream created successfully with all available sources');
                return destination.stream;
            }
            
            // Fallback: try to capture from the current audio element
            if (this.visualizer.audio && this.visualizer.audio.src) {
                console.log('Capturing audio from media element');
                const source = this.visualizer.audio._audioSourceNode;
                if (source) {
                    source.connect(gainNode);
                    gainNode.connect(destination);
                    return destination.stream;
                }
            }
            
            console.warn('No audio source found for recording');
            return null;
            
        } catch (err) {
            console.error('Error getting audio stream:', err);
            return null;
        }
    }
    
    updateTimer() {
        if (!this.isRecording || !this.recordingStartTime) return;
        
        const elapsed = Date.now() - this.recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        let timeString;
        if (hours > 0) {
            timeString = `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            timeString = `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
        
        const recordTimers = document.querySelectorAll('.record-timer');
        recordTimers.forEach(recordTimer => {
            recordTimer.textContent = timeString;
        });
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        console.log('Stopping recording...');
        this.isRecording = false;
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Stop animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Clean up temporary canvases
        this.tempVideoCanvas = null;
        this.tempVideoCtx = null;
        this.compositeCanvas = null;
        this.compositeCtx = null;
        
        // Update UI - both sidebar and footer buttons
        const recordBtns = document.querySelectorAll('#recordBtn');
        recordBtns.forEach(recordBtn => {
        const recordText = recordBtn.querySelector('.record-text');
        const recordTimer = recordBtn.querySelector('.record-timer');
        
        recordBtn.classList.remove('recording');
        recordText.style.display = 'inline';
        recordTimer.style.display = 'none';
        recordTimer.textContent = '00:00';
        });
        
        console.log('Recording stopped');
    }
    
    async saveRecording() {
        if (this.recordedChunks.length === 0) {
            console.warn('No recorded data to save');
            return;
        }
        
        try {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `${this.customFilename}_${timestamp}.webm`;
            
            if (this.directoryHandle && 'showDirectoryPicker' in window) {
                // Save to chosen directory
                try {
                    const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    
                    console.log(`Recording saved to ${this.saveLocation}/${filename}`);
                    alert(`Recording saved successfully to ${this.saveLocation}/${filename}`);
                } catch (err) {
                    console.error('Error saving to chosen directory:', err);
                    this.fallbackDownload(blob, filename);
                }
            } else {
                // Fallback to downloads folder
                this.fallbackDownload(blob, filename);
            }
            
        } catch (err) {
            console.error('Error saving recording:', err);
            alert('Error saving recording: ' + err.message);
        }
        
        // Clear recorded chunks
        this.recordedChunks = [];
    }
    
    fallbackDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Recording downloaded as ${filename}`);
        alert(`Recording saved to Downloads folder as ${filename}`);
    }
}

// ****
// ****

// Fixed better canvas capture
class StreamManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.pc = null;
        this.stream = null;
        this.channel = new BroadcastChannel('gitup-live-display');
        this.displayWindow = null;
        this.isStreaming = false;
        this.captureCanvas = null;
        this.captureCtx = null;
        this.animationFrame = null;
        this.pendingIceCandidates = []; // Queue for ICE candidates received before remote description
        this.hasOffered = false; // Track if we've already sent an offer

        // Display settings
        this.displaySettings = this.loadDisplaySettings();

        this.init();
    }

    init() { // Listen for messages from display window
        this.channel.onmessage = async (event) => {
            const {type, data} = event.data;

            switch (type) {
                case 'display-ready':
                    console.log('Display window ready');
                    // Only start streaming if we're supposed to be streaming and don't have a connection
                    if (this.isStreaming && (!this.pc || this.pc.connectionState === 'closed' || this.pc.connectionState === 'failed')) {
                        console.log('Starting streaming after display ready');
                        try {
                            await this.startStreaming();
                        } catch (error) {
                            console.error('Failed to start streaming:', error);
                            this.handleStreamingError(error);
                        }
                    } else if (this.pc) {
                        console.log('Peer connection already exists, state:', this.pc.connectionState);
                    }
                    break;
                case 'answer':
                    await this.handleAnswer(data);
                    break;
                case 'ice-candidate-answer':
                    await this.handleIceCandidate(data);
                    break;
                case 'pong':
                    console.log('Display window alive');
                    break;
            }
        };
    }

    loadDisplaySettings() {
        const saved = localStorage.getItem('gitup_display_settings');
        return saved ? JSON.parse(saved) : {
            presentationMode: 'fit', // Changed to 'fit' for proper sizing
            aspectRatio: 'auto',
            captureResolution: 2560,  // Changed to 2K default
            captureFrameRate: 60,
            captureBitrate: 30,  // Changed to 30 Mbps default
            displaySharpness: 0,
            letterboxColor: '#000000',
            mirrorBackground: false,
            mirrorBackgroundBlur: 20
        };
    }

    saveDisplaySettings() {
        localStorage.setItem('gitup_display_settings', JSON.stringify(this.displaySettings));
    }

    updateDisplaySettings(settings) {
        Object.assign(this.displaySettings, settings);
        this.saveDisplaySettings();

        // Send settings to display window
        this.channel.postMessage({type: 'display-settings', data: this.displaySettings});

        // If streaming, reconfigure capture
        if (this.isStreaming) {
            this.reconfigureCapture();
        }
    }

    reconfigureCapture() { // Update capture canvas size based on resolution
        const width = this.displaySettings.captureResolution;
        const height = Math.round(width * 9 / 16); // Always use 16:9 for display window compatibility

        if (this.captureCanvas) {
            this.captureCanvas.width = width;
            this.captureCanvas.height = height;
        }

        // Update WebRTC parameters if connection exists
        if (this.pc) {
            const senders = this.pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');

            if (videoSender) {
                const params = videoSender.getParameters();
                if (! params.encodings) {
                    params.encodings = [{}];
                }

                params.encodings[0].maxBitrate = this.displaySettings.captureBitrate * 1000000;
                params.encodings[0].maxFramerate = this.displaySettings.captureFrameRate;

                videoSender.setParameters(params).then(() => console.log('Updated WebRTC parameters')).catch(e => console.error('Failed to update parameters:', e));
            }
        }
    }

    calculateHeightForAspectRatio(width, ratio) {
        const ratioMap = {
            '16:9': 9 / 16,
            '4:3': 3 / 4,
            '1:1': 1,
            '9:16': 16 / 9,
            '21:9': 9 / 21,
            'auto': 9 / 16 // Default to 16:9 for auto
        };
        return Math.round(width * (ratioMap[ratio] || 9 / 16));
    }

    sendVideoFilters() {
        if (!this.isStreaming) 
            return;
        


        // Collect all video filter values including opacity
        const filters = {
            brightness: this.visualizer.videoBrightness || 100,
            contrast: this.visualizer.videoContrast || 100,
            saturation: this.visualizer.videoSaturation || 100,
            hueRotate: this.visualizer.videoHueRotate || 0,
            grayscale: this.visualizer.videoGrayscale || 0,
            sepia: this.visualizer.videoSepia || 0,
            blur: this.visualizer.videoBlur || 0,
            invert: this.visualizer.videoInvert || false,
            opacity: this.visualizer.videoOpacity || 1, // Send actual opacity value
            mirror: this.visualizer.videoMirror || 'off',
            vignette: this.visualizer.videoVignette || 0,
            posterize: this.visualizer.videoPosterize || 16
        };

        // Send via BroadcastChannel
        this.channel.postMessage({type: 'video-filters', data: filters});
    }

    async toggleLiveDisplay() {
        if (this.isStreaming) {
            this.stopStreaming();
        } else {
            if (this.openDisplayWindow()) {
                // Start streaming immediately when window opens
                // The display window will send 'display-ready' and we'll handle it
                this.isStreaming = true;
                // Set this BEFORE opening so we're ready

                // Update button state immediately - both sidebar and footer buttons
                const btns = document.querySelectorAll('#liveDisplayBtn');
                btns.forEach(btn => {
                    btn.classList.add('active');
                    btn.textContent = 'Stop Display';
                });
            }
        }
    }

    openDisplayWindow() { // Open display window
        // First, set performance mode for optimal quality
        const performancePreset = {
            presentationMode: 'fit',  // Use 'fit' for proper video sizing
            aspectRatio: '16:9',      // Default to 16:9 aspect ratio
            captureResolution: 2560,  // 2K resolution default
            captureFrameRate: 60,
            captureBitrate: 30,
            displaySharpness: 0,
            letterboxColor: '#000000',
            mirrorBackground: false,
            mirrorBackgroundBlur: 20
        };
        
        // Apply performance settings
        this.updateDisplaySettings(performancePreset);
        
        const width = 1280;
        const height = 720;
        const left = window.screen.width - width - 50;
        const top = 50;

        this.displayWindow = window.open('display.html', 'GitItUp Live Display', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`);

        if (!this.displayWindow) {
            alert('Please allow pop-ups to open the display window');
            return false;
        }

        // Add window focus to ensure it's visible
        this.displayWindow.focus();

        // Monitor window close
        const checkWindow = setInterval(() => {
            if (this.displayWindow && this.displayWindow.closed) {
                clearInterval(checkWindow);
                console.log('Display window was closed manually');
                this.stopStreaming();
            }
        }, 1000);

        // Add timeout for initial connection
        setTimeout(() => {
            if (!this.pc && this.isStreaming) {
                console.warn('Connection not established within timeout period');
                // Send a ping to check if display window is responsive
                this.channel.postMessage({type: 'ping'});
            }
        }, 5000);

        return true;
    }

    async startStreaming() { // Clean up any existing connection and canvases first
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }

        // Clean up any existing stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Clear any pending ICE candidates from previous attempts
        this.pendingIceCandidates = [];
        
        // Reset offer tracking
        this.hasOffered = false;

        // Force cleanup of existing canvases
        if (this.captureCanvas) {
            if (this.captureCanvas.parentNode) {
                this.captureCanvas.parentNode.removeChild(this.captureCanvas);
            }
            this.captureCanvas = null;
            this.captureCtx = null;
        }

        // Also cleanup temp video canvas
        this.tempVideoCanvas = null;
        this.tempVideoCtx = null;

        this.isStreaming = true;

        console.log('Starting fresh streaming session');

        // Send initial video filter state
        this.sendVideoFilters();

        // Send initial display settings
        this.channel.postMessage({type: 'display-settings', data: this.displaySettings});

        try { // Create capture canvas - this will now always create fresh
            this.setupCaptureCanvas();

            // Start capturing
            this.startCapture();

            // Get stream from capture canvas (try without frame rate parameter)
            this.stream = this.captureCanvas.captureStream();

            console.log('Stream created with tracks:', this.stream.getTracks().length);

            // Create peer connection with better config
            this.pc = new RTCPeerConnection({
                iceServers: [
                    {
                        urls: 'stun:stun.l.google.com:19302'
                    }
                ],
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            });

            // Add tracks to peer connection with encoding parameters
            this.stream.getTracks().forEach(track => {
                console.log('Adding track:', track.kind);
                const sender = this.pc.addTrack(track, this.stream);

                // Set high quality parameters for video track
                if (track.kind === 'video') {
                    const params = sender.getParameters();
                    if (! params.encodings) {
                        params.encodings = [{}];
                    }

                    // Use configured bitrate and frame rate
                    params.encodings[0].maxBitrate = this.displaySettings.captureBitrate * 1000000;
                    params.encodings[0].scaleResolutionDownBy = 1.0; // No downscaling
                    params.encodings[0].maxFramerate = this.displaySettings.captureFrameRate;

                    sender.setParameters(params).then(() => console.log('Video parameters set for configured quality')).catch(e => console.error('Failed to set video parameters:', e));
                }
            });

            // Handle ICE candidates
            this.pc.onicecandidate = (event) => {
                if (event.candidate) { // Serialize the ICE candidate to a plain object
                    this.channel.postMessage({
                        type: 'ice-candidate',
                        data: {
                            candidate: event.candidate.candidate,
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            sdpMid: event.candidate.sdpMid,
                            usernameFragment: event.candidate.usernameFragment
                        }
                    });
                }
            };

            // Monitor connection state
            this.pc.onconnectionstatechange = () => {
                console.log('PC Connection state:', this.pc.connectionState);
                console.log('PC Signaling state:', this.pc.signalingState);
                
                if (this.pc.connectionState === 'connected') {
                    console.log('✅ WebRTC connection established successfully!');
                } else if (this.pc.connectionState === 'failed') {
                    console.log('❌ Connection failed, may need to restart');
                    this.handleStreamingError(new Error('WebRTC connection failed'));
                } else if (this.pc.connectionState === 'disconnected') {
                    console.log('⚠️ Connection disconnected');
                }
            };

            // Create and send offer - only if we haven't already
            if (!this.hasOffered) {
                const offer = await this.pc.createOffer();
                await this.pc.setLocalDescription(offer);

                this.channel.postMessage({type: 'offer', data: offer});
                this.hasOffered = true;
                console.log('✅ Offer sent successfully');
            } else {
                console.log('Offer already sent, skipping duplicate');
            }

        } catch (error) {
            console.error('Error starting stream:', error);
            this.stopStreaming();
        }
    }

    setupCaptureCanvas() { // Always create a fresh canvas for capturing
        this.captureCanvas = document.createElement('canvas');
        this.captureCtx = this.captureCanvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false
        });

        // Use configured resolution but always maintain 16:9 aspect ratio for display compatibility
        const width = this.displaySettings.captureResolution;
        const height = Math.round(width * 9 / 16); // Always use 16:9 for display window compatibility

        this.captureCanvas.width = width;
        this.captureCanvas.height = height;

        // Store base dimensions for consistent scaling (always base on 2K for visual consistency)
        this.baseCaptureWidth = 2560;
        this.baseCaptureHeight = 1440;
        this.captureScale = width / this.baseCaptureWidth; // Scale factor for quality enhancement

        console.log('Capture canvas size:', this.captureCanvas.width, 'x', this.captureCanvas.height, '(16:9 aspect ratio for display compatibility)');
        console.log('Capture scale factor:', this.captureScale, 'x for', this.displaySettings.captureResolution + 'px quality');
    }

    startCapture() {
        console.log('startCapture() method called');
        let frameCount = 0;
        let pulsePhase = 0; // For pulse animation

        const capture = () => {
            // Continue capturing if streaming OR if file video is playing
            if (!this.isStreaming && this.visualizer.videoMode !== 'file') {
                return;
            }
            


            try {
                const container = document.getElementById('visualizationContainer');
                if (! container) {
                    console.error('Container not found');
                    this.animationFrame = requestAnimationFrame(capture);
                    return;
                }

                // Clear capture canvas
                this.captureCtx.fillStyle = this.visualizer.backgroundColor || '#000000';
                this.captureCtx.fillRect(0, 0, this.captureCanvas.width, this.captureCanvas.height);

                // Layer 0: Background Image (if available and enabled)
                if (this.visualizer.backgroundImage && this.visualizer.backgroundImageEnabled) {
                    console.log('📡 StreamManager Layer 0: Drawing background image');
                    this.visualizer.drawBackgroundImage(this.captureCtx, this.captureCanvas.width, this.captureCanvas.height);
                } else {
                    // console.log('📡 StreamManager Layer 0: Background image skipped -', {
                    //     hasImage: !!this.visualizer.backgroundImage,
                    //     enabled: this.visualizer.backgroundImageEnabled
                    // });
                }

                // Layer 1: Video background - ONLY IF KALEIDOSCOPE VIDEO IS NOT ACTIVE
                if ((this.visualizer.videoMode === 'camera' || this.visualizer.videoMode === 'file') && !(this.visualizer.kaleidoscopeEnabled && this.visualizer.kaleidoscopeApplyToVideo)) { // Create temporary canvas for video if needed
                    if (!this.tempVideoCanvas) {
                        this.tempVideoCanvas = document.createElement('canvas');
                        this.tempVideoCanvas.width = this.captureCanvas.width;
                        this.tempVideoCanvas.height = this.captureCanvas.height;
                        this.tempVideoCtx = this.tempVideoCanvas.getContext('2d');
                    }

                    // Update temp canvas size if capture canvas changed
                    if (this.tempVideoCanvas.width !== this.captureCanvas.width || this.tempVideoCanvas.height !== this.captureCanvas.height) {
                        this.tempVideoCanvas.width = this.captureCanvas.width;
                        this.tempVideoCanvas.height = this.captureCanvas.height;
                    }

                    const videoSource = this.visualizer.captureVideoElement || this.visualizer.videoElement;
                    
                    // Debug: Log what video elements are available
                    if (frameCount % 60 === 0) { // Log every 60 frames to avoid spam
                        console.log('Capture debug - videoMode:', this.visualizer.videoMode);
                        console.log('Available video elements:', {
                            captureVideoElement: !!this.visualizer.captureVideoElement,
                            videoElement: !!this.visualizer.videoElement
                        });
                        console.log('Selected videoSource:', videoSource ? videoSource.constructor.name : 'none');
                        if (videoSource) {
                            console.log('VideoSource details:', {
                                readyState: videoSource.readyState,
                                dimensions: videoSource.videoWidth + 'x' + videoSource.videoHeight,
                                paused: videoSource.paused,
                                currentTime: videoSource.currentTime
                            });
                        }
                    }

                    if (videoSource && videoSource.readyState >= 2) {
                        if (frameCount % 60 === 0) {
                            console.log('Video source found for capture:', videoSource.constructor.name, 'ready state:', videoSource.readyState, 'dimensions:', videoSource.videoWidth + 'x' + videoSource.videoHeight);
                        }
                        // Clear temp canvas
                        this.tempVideoCtx.clearRect(0, 0, this.tempVideoCanvas.width, this.tempVideoCanvas.height);

                        this.tempVideoCtx.save();

                        // Apply mirror transformations FIRST
                        if (this.visualizer.videoMirror === 'horizontal' || this.visualizer.videoMirror === 'both') {
                            this.tempVideoCtx.scale(-1, 1);
                            this.tempVideoCtx.translate(-this.tempVideoCanvas.width, 0);
                        }
                        if (this.visualizer.videoMirror === 'vertical' || this.visualizer.videoMirror === 'both') {
                            this.tempVideoCtx.scale(1, -1);
                            this.tempVideoCtx.translate(0, -this.tempVideoCanvas.height);
                        }

                        // Build filter string
                        const filters = [];

                        // Apply posterize FIRST with much stronger effect
                        if (this.visualizer.videoPosterize < 16) {
                            const steps = this.visualizer.videoPosterize;
                            const posterizeAmount = (16 - steps) / 16;
                            filters.push(`contrast(${
                                300 + posterizeAmount * 200
                            }%)`);
                            filters.push(`brightness(${95}%)`);
                            filters.push(`saturate(${200}%)`);
                            if (steps < 8) {
                                filters.push(`contrast(${150}%)`);
                            }
                        }

                        // Then other filters
                        if (this.visualizer.videoBrightness !== 100 && this.visualizer.videoPosterize >= 16) {
                            filters.push(`brightness(${
                                this.visualizer.videoBrightness
                            }%)`);
                        }
                        if (this.visualizer.videoContrast !== 100 && this.visualizer.videoPosterize >= 16) {
                            filters.push(`contrast(${
                                this.visualizer.videoContrast
                            }%)`);
                        }
                        if (this.visualizer.videoSaturation !== 100 && this.visualizer.videoPosterize >= 16) {
                            filters.push(`saturate(${
                                this.visualizer.videoSaturation
                            }%)`);
                        }
                        if (this.visualizer.videoHueRotate !== 0) {
                            filters.push(`hue-rotate(${
                                this.visualizer.videoHueRotate
                            }deg)`);
                        }
                        if (this.visualizer.videoGrayscale > 0) {
                            filters.push(`grayscale(${
                                this.visualizer.videoGrayscale
                            }%)`);
                        }
                        if (this.visualizer.videoSepia > 0) {
                            filters.push(`sepia(${
                                this.visualizer.videoSepia
                            }%)`);
                        }
                        if (this.visualizer.videoBlur > 0) {
                            filters.push(`blur(${
                                this.visualizer.videoBlur
                            }px)`);
                        }
                        if (this.visualizer.videoInvert) {
                            filters.push('invert(100%)');
                        }

                        this.tempVideoCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
                        this.tempVideoCtx.globalAlpha = 1;

                        // Draw video to temp canvas
                        this.tempVideoCtx.drawImage(videoSource, 0, 0, this.tempVideoCanvas.width, this.tempVideoCanvas.height);

                        this.tempVideoCtx.restore();

                        // Calculate pulse scale if enabled
                        let scale = 1;
                        if (this.visualizer.videoPulse) {
                            const pulseDuration = this.visualizer.videoPulseRate * 1000; // Convert to ms
                            pulsePhase = (Date.now() % pulseDuration) / pulseDuration;
                            scale = 1 + (Math.sin(pulsePhase * Math.PI * 2) * 0.02); // 2% scale variation
                        }

                        // Draw temp canvas to main canvas with opacity and pulse
                        this.captureCtx.save();
                        this.captureCtx.globalAlpha = this.visualizer.videoOpacity || 1;

                        if (scale !== 1) {
                            const centerX = this.captureCanvas.width / 2;
                            const centerY = this.captureCanvas.height / 2;
                            this.captureCtx.translate(centerX, centerY);
                            this.captureCtx.scale(scale, scale);
                            this.captureCtx.translate(- centerX, - centerY);
                        }

                        this.captureCtx.drawImage(this.tempVideoCanvas, 0, 0);
                        this.captureCtx.restore();

                        // Draw vignette AFTER video but BEFORE visualization
                        if (this.visualizer.videoVignette > 0) {
                            this.captureCtx.save();
                            const intensity = this.visualizer.videoVignette / 100;
                            const size = (100 - this.visualizer.videoVignette) / 100;

                            const gradient = this.captureCtx.createRadialGradient(this.captureCanvas.width / 2, this.captureCanvas.height / 2, Math.min(this.captureCanvas.width, this.captureCanvas.height) * size * 0.5, this.captureCanvas.width / 2, this.captureCanvas.height / 2, Math.max(this.captureCanvas.width, this.captureCanvas.height) * 0.7);
                            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                            gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

                            this.captureCtx.fillStyle = gradient;
                            this.captureCtx.fillRect(0, 0, this.captureCanvas.width, this.captureCanvas.height);
                            this.captureCtx.restore();
                        }
                    }
                }

                // Layer 2: Kaleidoscope video (if active) - WITH FILTERS APPLIED
                if (this.visualizer.kaleidoscopeEnabled && this.visualizer.kaleidoscopeApplyToVideo && this.visualizer.kaleidoscopeVideoCanvas && this.visualizer.kaleidoscopeVideoCanvas.style.display !== 'none') {

                    this.captureCtx.save();

                    // Apply video filters to kaleidoscope
                    const filters = [];

                    if (this.visualizer.videoPosterize < 16) {
                        const steps = this.visualizer.videoPosterize;
                        const posterizeAmount = (16 - steps) / 16;
                        filters.push(`contrast(${
                            300 + posterizeAmount * 200
                        }%)`);
                        filters.push(`brightness(${95}%)`);
                        filters.push(`saturate(${200}%)`);
                        if (steps < 8) {
                            filters.push(`contrast(${150}%)`);
                        }
                    }

                    if (this.visualizer.videoBrightness !== 100 && this.visualizer.videoPosterize >= 16) {
                        filters.push(`brightness(${
                            this.visualizer.videoBrightness
                        }%)`);
                    }
                    if (this.visualizer.videoContrast !== 100 && this.visualizer.videoPosterize >= 16) {
                        filters.push(`contrast(${
                            this.visualizer.videoContrast
                        }%)`);
                    }
                    if (this.visualizer.videoSaturation !== 100 && this.visualizer.videoPosterize >= 16) {
                        filters.push(`saturate(${
                            this.visualizer.videoSaturation
                        }%)`);
                    }
                    if (this.visualizer.videoHueRotate !== 0) {
                        filters.push(`hue-rotate(${
                            this.visualizer.videoHueRotate
                        }deg)`);
                    }
                    if (this.visualizer.videoGrayscale > 0) {
                        filters.push(`grayscale(${
                            this.visualizer.videoGrayscale
                        }%)`);
                    }
                    if (this.visualizer.videoSepia > 0) {
                        filters.push(`sepia(${
                            this.visualizer.videoSepia
                        }%)`);
                    }
                    if (this.visualizer.videoBlur > 0) {
                        filters.push(`blur(${
                            this.visualizer.videoBlur
                        }px)`);
                    }
                    if (this.visualizer.videoInvert) {
                        filters.push('invert(100%)');
                    }

                    this.captureCtx.filter = filters.length > 0 ? filters.join(' ') : 'none';
                    this.captureCtx.globalAlpha = this.visualizer.videoOpacity || 1;

                    // Apply pulse if enabled
                    if (this.visualizer.videoPulse) {
                        const pulseDuration = this.visualizer.videoPulseRate * 1000;
                        pulsePhase = (Date.now() % pulseDuration) / pulseDuration;
                        const scale = 1 + (Math.sin(pulsePhase * Math.PI * 2) * 0.02);

                        if (scale !== 1) {
                            const centerX = this.captureCanvas.width / 2;
                            const centerY = this.captureCanvas.height / 2;
                            this.captureCtx.translate(centerX, centerY);
                            this.captureCtx.scale(scale, scale);
                            this.captureCtx.translate(- centerX, - centerY);
                        }
                    }

                    // Draw kaleidoscope video canvas with proper scaling
                    this.captureCtx.save();
                    this.captureCtx.scale(this.captureScale, this.captureScale);
                    this.captureCtx.drawImage(this.visualizer.kaleidoscopeVideoCanvas, 0, 0, this.baseCaptureWidth, this.baseCaptureHeight);
                    this.captureCtx.restore();

                    this.captureCtx.restore();

                    // Apply vignette to kaleidoscope if needed
                    if (this.visualizer.videoVignette > 0) {
                        this.captureCtx.save();
                        const intensity = this.visualizer.videoVignette / 100;
                        const size = (100 - this.visualizer.videoVignette) / 100;

                        const gradient = this.captureCtx.createRadialGradient(this.captureCanvas.width / 2, this.captureCanvas.height / 2, Math.min(this.captureCanvas.width, this.captureCanvas.height) * size * 0.5, this.captureCanvas.width / 2, this.captureCanvas.height / 2, Math.max(this.captureCanvas.width, this.captureCanvas.height) * 0.7);
                        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

                        this.captureCtx.fillStyle = gradient;
                        this.captureCtx.fillRect(0, 0, this.captureCanvas.width, this.captureCanvas.height);
                        this.captureCtx.restore();
                    }

                    if (frameCount % 60 === 0) {
                        console.log('Captured video kaleidoscope with filters');
                    }
                }

                // Reset context state completely before viz layers
                this.captureCtx.save();
                this.captureCtx.filter = 'none';
                this.captureCtx.globalAlpha = 1;
                this.captureCtx.globalCompositeOperation = 'source-over';

                // Layer 3: Main visualization - Only if kaleidoscope viz is NOT active
                if (!this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeEnabled) {
                    let vizCanvas = null;

                    if (this.visualizer.audioMotion && this.visualizer.audioMotion.canvas) {
                        vizCanvas = this.visualizer.audioMotion.canvas;
                    }

                    if (! vizCanvas) {
                        const canvases = container.getElementsByTagName('canvas');
                        for (let canvas of canvases) {
                            if (! canvas.classList.contains('kaleidoscope-canvas') && canvas.width > 0 && canvas.height > 0 && canvas.id !== 'bgVideoCaptureClean') {
                                vizCanvas = canvas;
                                break;
                            }
                        }
                    }

                    if (vizCanvas && vizCanvas.width > 0 && vizCanvas.height > 0) {
                        const isVisible = vizCanvas.style.visibility !== 'hidden' && vizCanvas.style.display !== 'none';

                        if (isVisible) {
                            // Scale the visualization to maintain consistent visual size regardless of capture resolution
                            this.captureCtx.save();
                            this.captureCtx.scale(this.captureScale, this.captureScale);
                            this.captureCtx.drawImage(vizCanvas, 0, 0, this.baseCaptureWidth, this.baseCaptureHeight);
                            this.captureCtx.restore();

                            if (frameCount % 60 === 0) {
                                console.log('Capturing viz from canvas:', vizCanvas.width, 'x', vizCanvas.height, 'scaled by', this.captureScale + 'x');
                            }
                        }
                    }
                }

                this.captureCtx.restore();

                // Layer 4: Kaleidoscope viz (if active)
                if (this.visualizer.kaleidoscopeEnabled && this.visualizer.kaleidoscopeApplyToViz && this.visualizer.kaleidoscopeVizCanvas && this.visualizer.kaleidoscopeVizCanvas.style.display !== 'none') {

                    this.captureCtx.save();
                    this.captureCtx.globalAlpha = 1;
                    this.captureCtx.filter = 'none';

                    // Draw kaleidoscope viz canvas with proper scaling
                    this.captureCtx.save();
                    this.captureCtx.scale(this.captureScale, this.captureScale);
                    this.captureCtx.drawImage(this.visualizer.kaleidoscopeVizCanvas, 0, 0, this.baseCaptureWidth, this.baseCaptureHeight);
                    this.captureCtx.restore();

                    if (frameCount % 60 === 0) {
                        console.log('Captured viz kaleidoscope scaled by', this.captureScale + 'x');
                    }

                    this.captureCtx.restore();
                }

                // Layer 5: Infinite Zoom (only when NOT captured via kaleidoscope)
                if (this.visualizer.infiniteZoom && this.visualizer.infiniteZoom.isActive && this.visualizer.infiniteZoom.canvas) {
                    // Only capture Infinite Zoom separately if kaleidoscope is OFF or not applying to viz or not applying to infinite zoom
                    const shouldCaptureSeparately = !this.visualizer.kaleidoscopeEnabled || !this.visualizer.kaleidoscopeApplyToViz || !this.visualizer.kaleidoscopeApplyToInfiniteZoom;
                    
                    if (shouldCaptureSeparately) {
                        this.captureCtx.save();
                        this.captureCtx.globalAlpha = this.visualizer.infiniteZoom.opacity || 1;
                        this.captureCtx.filter = 'none';

                        // Draw Infinite Zoom canvas with proper scaling
                        this.captureCtx.save();
                        this.captureCtx.scale(this.captureScale, this.captureScale);
                        this.captureCtx.drawImage(this.visualizer.infiniteZoom.canvas, 0, 0, this.baseCaptureWidth, this.baseCaptureHeight);
                        this.captureCtx.restore();

                        if (frameCount % 60 === 0) {
                            console.log('Captured Infinite Zoom separately scaled by', this.captureScale + 'x');
                        }

                        this.captureCtx.restore();
                    } else if (frameCount % 60 === 0) {
                        console.log('Infinite Zoom captured via kaleidoscope - skipping separate capture');
                    }
                }

                frameCount++;

            } catch (error) {
                console.error('Capture error:', error);
            }

            this.animationFrame = requestAnimationFrame(capture);
        };

        capture();
    }

    async handleAnswer(answer) {
        try {
            if (!this.pc) {
                console.warn('No peer connection available for answer');
                return;
            }

            console.log('Handling answer, current signaling state:', this.pc.signalingState);
            console.log('Connection state:', this.pc.connectionState);

            if (this.pc.signalingState === 'have-local-offer') {
                await this.pc.setRemoteDescription(answer);
                console.log('Answer set successfully');
                
                // Process any queued ICE candidates now that we have remote description
                await this.processPendingIceCandidates();
            } else if (this.pc.signalingState === 'stable') {
                console.log('Peer connection already stable, ignoring duplicate answer');
                // Connection might already be established, check if we have a stream
                if (this.pc.connectionState === 'connected') {
                    console.log('Connection already established successfully');
                }
            } else {
                console.warn('Cannot set remote description, unexpected signaling state:', this.pc.signalingState);
            }
        } catch (error) {
            console.error('Error handling answer:', error);
            // If this fails, the connection might be in a bad state - close and retry
            if (this.pc) {
                this.pc.close();
                this.pc = null;
            }
        }
    }

    async handleIceCandidate(candidateData) {
        try {
            if (this.pc && this.pc.remoteDescription) { 
                // Reconstruct RTCIceCandidate from plain object
                const candidate = new RTCIceCandidate({candidate: candidateData.candidate, sdpMLineIndex: candidateData.sdpMLineIndex, sdpMid: candidateData.sdpMid, usernameFragment: candidateData.usernameFragment});
                await this.pc.addIceCandidate(candidate);
                console.log('ICE candidate added successfully from display window');
            } else if (this.pc) {
                // Queue the candidate if we don't have remote description yet
                console.log('Queueing ICE candidate until remote description is set');
                this.pendingIceCandidates.push(candidateData);
            } else {
                console.warn('Cannot add ICE candidate: no peer connection');
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    async processPendingIceCandidates() {
        // Process any queued ICE candidates after remote description is set
        for (const candidateData of this.pendingIceCandidates) {
            try {
                const candidate = new RTCIceCandidate({candidate: candidateData.candidate, sdpMLineIndex: candidateData.sdpMLineIndex, sdpMid: candidateData.sdpMid, usernameFragment: candidateData.usernameFragment});
                await this.pc.addIceCandidate(candidate);
                console.log('Queued ICE candidate added successfully');
            } catch (error) {
                console.error('Error adding queued ICE candidate:', error);
            }
        }
        this.pendingIceCandidates = [];
    }

    handleStreamingError(error) {
        console.error('Streaming error occurred:', error);
        
        // Show user-friendly error message
        const errorMessage = error.message || 'Unknown connection error';
        console.warn('Connection error: ' + errorMessage);
        
        // Don't automatically retry - this was causing connection loops
        console.log('❌ Streaming stopped due to error. Manual restart required.');
        
        // Reset streaming state without auto-retry
        this.isStreaming = false;
        this.hasOffered = false;
        
        // Close peer connection but keep display window open
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        
        // Update button state - both sidebar and footer buttons
        const btns = document.querySelectorAll('#liveDisplayBtn');
        btns.forEach(btn => {
            btn.classList.remove('active');
            btn.textContent = 'Live Display';
        });
    }

    stopStreaming() {
        this.isStreaming = false;

        // Reset offer tracking
        this.hasOffered = false;

        // Stop capture animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Remove debug canvas if it exists
        if (this.captureCanvas && this.captureCanvas.parentNode) {
            this.captureCanvas.parentNode.removeChild(this.captureCanvas);
        }

        // Close peer connection
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }

        // Stop stream tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Notify display window
        this.channel.postMessage({type: 'close'});

        // Close display window
        if (this.displayWindow && !this.displayWindow.closed) {
            this.displayWindow.close();
        }
        this.displayWindow = null;

        // Update button state - both sidebar and footer buttons
        const btns = document.querySelectorAll('#liveDisplayBtn');
        btns.forEach(btn => {
            btn.classList.remove('active');
            btn.textContent = 'Live Display';
        });
    }
}


// ****
// ****

// GitItUp Visualizer Class with Audio Input and Morph Support
class GitItUpVisualizer {
    constructor() {
        this.audio = null;
        this.audioMotion = null;
        this.isPlaying = false;
        this.currentTrackIndex = 0;
        this.playlist = [];
        this.volume = 0.7;
        this.previousVolume = 0.7;
        this.isMuted = false;
        this.currentMode = 4;
        this.loopMode = 'off';
        this.currentColorScheme = 'default';
        this.backgroundColor = '#000000';
        this.isFullscreen = false;
        this.savedPresets = this.loadPresets();
        this.audioInitialized = false;
        this.streamManager = null;

        // Audio input properties
        this.inputMode = 'playlist';
        this.audioStream = null;
        this.streamSource = null;
        this.availableDevices = [];

        // Video input properties
        this.videoInputMode = 'none';
        this.videoStream = null;
        this.currentVideoDeviceId = null;
        this.availableVideoDevices = [];

        // Live Audio Toggle properties
        this.liveAudioEnabled = false;
        this.lastAudioDeviceId = null;

        // Background Image properties
        this.backgroundImageEnabled = false;
        this.backgroundImage = null;
        this.backgroundImageOpacity = 100;
        this.backgroundImageSaturation = 100;
        this.backgroundImagePosterize = 16;
        this.backgroundImageContrast = 100;
        this.backgroundImageSize = 'original';

        // Viz ON/OFF Toggle
        this.visualizationEnabled = true;

        // Morph properties
        this.isMorphing = false;
        this.morphInterval = null;
        this.morphStartConfig = null;
        this.morphTargetConfig = null;
        this.morphProgress = 0;
        this.morphDuration = 5000;
        this.morphMode = 'medium';

        // Auto-hide fullscreen controls
        this.controlsTimeout = null;
        this.controlsVisible = true;

        // Energy detection
        this.currentEnergy = 0;
        this.lastEnergy = 0;
        this.energyHistory = [];
        this.energyCheckInterval = null;

        // Video background properties
        this.videoMode = 'off'; // 'off', 'camera', 'file'
        this.videoStream = null;
        this.videoElement = null;
        this.availableVideoDevices = [];
        this.videoOpacity = 1.0;
        this.videoFadeTime = 3; // seconds
        this.videoFadeTimeout = null;
        this.currentVideoDeviceId = null;
        
        // Video file properties
        this.videoFile = null;
        this.videoFileLoop = true;
        this.videoFileMuted = true;
        this.videoAudioSource = null;
        this.videoAudioGain = null;
        this.matchVisualizationAspect = true; // Match visualization to video aspect ratio

        // Kaleidoscope properties
        this.kaleidoscopeEnabled = false;
        this.kaleidoscopeSegments = 6;
        this.kaleidoscopeRotation = 0;
        this.kaleidoscopeSpeed = 0;
        this.kaleidoscopeScale = 1.0;
        this.kaleidoscopeCenterX = 0.5;
        this.kaleidoscopeCenterY = 0.5;
        this.kaleidoscopeApplyToVideo = false;
        this.kaleidoscopeApplyToViz = true; // Default to ON
        this.kaleidoscopeApplyToInfiniteZoom = false; // Default to disabled
        this.kaleidoscopeRings = 1; // Number of rings

        // Background image properties
        this.backgroundImage = null;
        this.backgroundImageEnabled = false; // Default to OFF
        this.backgroundImageOpacity = 100;
        this.backgroundImageSaturation = 100;
        this.backgroundImagePosterize = 16; // Default to no posterization
        this.backgroundImageContrast = 100; // Default to normal contrast
        this.backgroundImageSize = 'original'; // Default sizing: 'fit', 'fill', 'stretch', 'original'
        this.backgroundImageFileName = '';
        this.backgroundImageFileSize = 0;
        this.cachedBackgroundImage = null; // Cached image for synchronous drawing
        this.kaleidoscopeRingSpacing = 0.2; // Spacing between rings (as percentage)
        this.kaleidoscopeShape = 'triangle'; // 'triangle', 'petal', 'rectangle'
        this.kaleidoscopeRingSpeedMultiplier = 0.5; // How much each ring's speed differs
        this.kaleidoscopeRingRotations = [
            0,
            0,
            0,
            0,
            0
        ]; // Track individual ring rotations
        this.kaleidoscopeBaseScale = 1; // Add this if not already there
        this.kaleidoscopeBeatRotation = false;
        this.kaleidoscopeBeatShape = false;
        this.kaleidoscopeShapeThreshold = 0.7; // Energy threshold for shape change
        this.kaleidoscopeOriginalShape = 'triangle';


        // Separate canvases for video and viz
        this.kaleidoscopeVideoCanvas = null;
        this.kaleidoscopeVideoCtx = null;
        this.kaleidoscopeVizCanvas = null;
        this.kaleidoscopeVizCtx = null;

        this.kaleidoscopeAnimationFrame = null;

        // REact to audio inout
        this.kaleidoscopeBeatReactive = false;
        this.kaleidoscopeBeatSensitivity = 0.5;
        this.kaleidoscopeBaseScale = 1;
        this.kaleidoscopeBaseSegments = 6;

        this.kaleidoscopePresets = [
            {
                name: 'Classic',
                segments: 6,
                rings: 1,
                shape: 'triangle',
                scale: 100,
                speed: 0,
                ringSpacing: 20
            },
            {
                name: 'Flower',
                segments: 8,
                rings: 3,
                shape: 'petal',
                scale: 120,
                speed: 2,
                ringSpacing: 15
            },
            {
                name: 'Crystal',
                segments: 12,
                rings: 2,
                shape: 'triangle',
                scale: 100,
                speed: 1,
                ringSpacing: 25
            },
            {
                name: 'Mandala',
                segments: 16,
                rings: 4,
                shape: 'petal',
                scale: 150,
                speed: 0.5,
                ringSpacing: 10
            }, {
                name: 'Star',
                segments: 5,
                rings: 2,
                shape: 'triangle',
                scale: 110,
                speed: 3,
                ringSpacing: 30
            }
        ];


        // Enhanced video properties
        this.videoBrightness = 100;
        this.videoContrast = 100;
        this.videoHueRotate = 0;
        this.videoGrayscale = 0;
        this.videoSepia = 0;
        this.videoBlur = 0;
        this.videoSaturation = 100;
        this.videoPosterize = 16;
        this.videoVignette = 0;
        this.videoInvert = false;
        this.videoMirror = 'off'; // 'off', 'horizontal', 'vertical', 'both'
        this.videoPulse = false;
        this.vignetteElement = null;
        this.videoPulseRate = 2.0;
        // seconds for one complete pulse cycle

        // AudioMotion-style visualization modes
        this.visualizationModes = [
            // 0 - Spectrum
            {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0, // No spacing between bars for solid look
                bgAlpha: 0.7,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 1,
                frequencyScale: 'log',
                gradient: 'classic', // Orange-yellow-green gradient
                gravity: 3.8,
                ledBars: false,
                linearAmplitude: true,
                linearBoost: 1.5,
                lineWidth: 0,
                loRes: false,
                lumiBars: false,
                maxDecibels: -25,
                maxFPS: 0,
                maxFreq: 22000,
                minDecibels: -85,
                minFreq: 20,
                mirror: 0,
                mode: 0, // This tells it to use maximum frequency bins
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 750, // As requested
                peakHoldTime: 500, // As requested
                peakLine: false, // As requested
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0.15,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0,
                roundBars: false,
                showBgColor: true,
                showFPS: false,
                showPeaks: true, // As requested
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.7, // Increased for smoother animation
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            },
            // 1 - Mirror Wave
            {
                alphaBars: false,
                ansiBands: true,
                barSpace: 0.4243301972800962,
                bgAlpha: 0.8718491729657911,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.7409580781999876,
                frequencyScale: 'linear',
                gradient: 'prism',
                gravity: 5.241110765118057,
                ledBars: false,
                lineWidth: 1.9277868849548745,
                linearAmplitude: false,
                linearBoost: 1.0031368643495397,
                loRes: false,
                lumiBars: false,
                maxDecibels: -40,
                maxFPS: 0,
                maxFreq: 20000,
                minDecibels: -110.00902526586772,
                minFreq: 28.17293591192646,
                mirror: 1,
                mode: 0,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 594.7913467712076,
                peakHoldTime: 502.3206017658375,
                peakLine: false,
                radial: false,
                radialInvert: true,
                radius: 0.41579158468294086,
                reflexAlpha: 0.9552641490887127,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0.01,
                roundBars: true,
                showBgColor: false,
                showFPS: false,
                showPeaks: true,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.3269721028259904,
                spinSpeed: 0.5612575550887594,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 0.7515247792883378,
                weightingFilter: 'D'
            },
            // 2 - Classic LED
            {
                alphaBars: false,
                ansiBands: true,
                barSpace: 0.5,
                bgAlpha: 0.7,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 1,
                frequencyScale: 'log',
                gradient: 'classic',
                gravity: 3.8,
                ledBars: true,
                linearAmplitude: false,
                linearBoost: 1,
                lineWidth: 0,
                loRes: false,
                lumiBars: false,
                maxDecibels: -25,
                maxFPS: 0,
                maxFreq: 20000,
                minDecibels: -85,
                minFreq: 25,
                mirror: 0,
                mode: 6,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0.15,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0,
                roundBars: false,
                showBgColor: true,
                showFPS: false,
                showPeaks: true,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.5,
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: true,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            },
            // 3 - Stereo
            {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0.1,
                bgAlpha: 0.7,
                channelLayout: 'dual-horizontal',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.8,
                frequencyScale: 'log',
                gradient: 'rainbow',
                gravity: 3.8,
                ledBars: false,
                linearAmplitude: false,
                linearBoost: 1.8,
                lineWidth: 2,
                loRes: false,
                lumiBars: false,
                maxDecibels: -35,
                maxFPS: 0,
                maxFreq: 16000,
                minDecibels: -85,
                minFreq: 20,
                mirror: 1,
                mode: 2,
                noteLabels: false,
                outlineBars: true,
                overlay: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0.5,
                reflexBright: 2,
                reflexFit: true,
                reflexRatio: 0.5,
                roundBars: true,
                showBgColor: true,
                showFPS: false,
                showPeaks: true,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.7,
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            },
            // 4 - Radial Spectrum
            {
                alphaBars: false,
                ansiBands: true,
                barSpace: 0.4243301972800962,
                bgAlpha: 0.8718491729657911,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.9,
                frequencyScale: 'linear',
                gradient: 'prism',
                gravity: 5.241110765118057,
                ledBars: false,
                lineWidth: 1.9277868849548745,
                linearAmplitude: true,
                linearBoost: 2.4,
                loRes: false,
                lumiBars: false,
                maxDecibels: -22.957439488374686,
                maxFPS: 0,
                maxFreq: 17748.142603118187,
                minDecibels: -95.00902526586772,
                minFreq: 28.17293591192646,
                mirror: 0,
                mode: 0,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 594.7913467712076,
                peakHoldTime: 502.3206017658375,
                peakLine: false,
                radial: true,
                radialInvert: false,
                radius: 1.2,
                reflexAlpha: 0.9552641490887127,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0.0827583789810725,
                roundBars: true,
                showBgColor: false,
                showFPS: false,
                showPeaks: true,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.3269721028259904,
                spinSpeed: 0.5612575550887594,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 0.7515247792883378,
                weightingFilter: 'D'
            },
            // 5 - Energy
            {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0.1,
                bgAlpha: 0.0,
                channelLayout: 'single',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.7,
                frequencyScale: 'log',
                gradient: 'steelblue',
                gravity: 3.8,
                ledBars: false,
                linearAmplitude: false,
                linearBoost: 1,
                lineWidth: 3,
                loRes: false,
                lumiBars: false,
                maxDecibels: -25,
                maxFPS: 0,
                maxFreq: 16000,
                minDecibels: -85,
                minFreq: 30,
                mirror: -1,
                mode: 10,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0.5,
                roundBars: false,
                showBgColor: true,
                showFPS: false,
                showPeaks: false,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.5,
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            },
            // 6 - Mirror (Center-split Stereo)
            {
                alphaBars: false,
                ansiBands: false,
                barSpace: 0.2,
                bgAlpha: 0.7,
                channelLayout: 'dual-vertical',
                colorMode: 'gradient',
                fadePeaks: false,
                fftSize: 8192,
                fillAlpha: 0.9,
                frequencyScale: 'log',
                gradient: 'orangered',
                gravity: 3.8,
                ledBars: false,
                linearAmplitude: false,
                linearBoost: 1,
                lineWidth: 0,
                loRes: false,
                lumiBars: false,
                maxDecibels: -25,
                maxFPS: 0,
                maxFreq: 20000,
                minDecibels: -85,
                minFreq: 20,
                mirror: 0,
                mode: 1,
                noteLabels: false,
                outlineBars: false,
                overlay: false,
                peakFadeTime: 750,
                peakHoldTime: 500,
                peakLine: false,
                radial: false,
                radialInvert: false,
                radius: 0.3,
                reflexAlpha: 0.4,
                reflexBright: 1,
                reflexFit: true,
                reflexRatio: 0.01,
                roundBars: false,
                showBgColor: true,
                showFPS: false,
                showPeaks: false,
                showScaleX: false,
                showScaleY: false,
                smoothing: 0.5,
                spinSpeed: 0,
                splitGradient: false,
                trueLeds: false,
                useCanvas: true,
                volume: 1,
                weightingFilter: ''
            }
        ];

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.loadPlaylist();

            this.loadBackgroundColor();
            this.updatePresetSelector();

            await this.initAudioMotion();

            this.streamManager = new StreamManager(this);
            this.recordManager = new RecordManager(this);
            this.playlistManager = new PlaylistManager(this);
            this.aiAutopilot = new AIAutopilot(this);
            this.infiniteZoom = new InfiniteZoomVisualization(this);
            
            // Initialize playlist UI handlers
            this.initializePlaylistUI();

            this.setBackgroundColor(this.backgroundColor);

            await this.initializeAudioInput();

            await this.initializeFirstTrack();
            this.hideLoading();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize audio visualizer: ' + error.message);
        }
    }

    async initializeFirstTrack() {
        // Add a small delay to ensure blob URLs are fully accessible
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (this.playlist.length === 0) {
            console.warn('No tracks in playlist to initialize');
            return;
        }
        
        await this.preloadTrack(0);
        this.audioInitialized = true;
    }

    async initAudioMotion() {
        try {
            console.log('Creating SpectrumAnalyzer instance...');

            this.audioMotion = new SpectrumAnalyzer(document.getElementById('visualizer'), this.visualizationModes[4]);

            console.log('SpectrumAnalyzer initialized successfully');

        } catch (error) {
            console.error('SpectrumAnalyzer initialization error:', error);
            throw error;
        }
    }

    // Audio Input Methods
    async initializeAudioInput() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices.filter(d => d.kind === 'audioinput');
            this.updateDeviceList();
        } catch (e) {
            console.log('Cannot enumerate devices yet');
        }
    }

    updateDeviceList() {
        const select = document.getElementById('audioDeviceSelect');
        if (! select) 
            return;
        


        select.innerHTML = '<option value="">Select Audio Input...</option>';

        this.availableDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            let displayName = device.label || `Input ${
                device.deviceId.substr(0, 5)
            }`;

            if (displayName.includes('BlackHole') || displayName.includes('Loopback') || displayName.includes('Virtual') || displayName.includes('Soundflower')) {
                displayName = '🎵 ' + displayName;
            }

            option.textContent = displayName;
            select.appendChild(option);
        });


        const helpOption = document.createElement('option');
        helpOption.value = 'help';
        helpOption.textContent = '❓ How to capture system audio...';
        select.appendChild(helpOption);
        
        // Update drawer select as well
        const drawerSelect = document.getElementById('drawerAudioDeviceSelect');
        if (drawerSelect) {
            drawerSelect.innerHTML = select.innerHTML;
            drawerSelect.value = select.value;
        }
    }

    showAudioInputMenu() {
        // Check if dropdown is already open, if so close it
        const existingDropdown = document.getElementById('footerAudioInputDropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }
        
        // Create a custom dropdown menu for audio input selection
        this.createAudioInputDropdown();
    }

    createAudioInputDropdown() {
        // Remove existing dropdown if it exists
        const existingDropdown = document.getElementById('footerAudioInputDropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Get button position
        const button = document.getElementById('footerLiveAudioBtn');
        if (!button) {
            console.error('Footer Live Audio button not found');
            return;
        }

        const buttonRect = button.getBoundingClientRect();
        
        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.id = 'footerAudioInputDropdown';
        dropdown.className = 'footer-audio-dropdown';
        dropdown.style.cssText = `
            position: fixed;
            top: ${buttonRect.bottom + 4}px;
            left: ${buttonRect.left}px;
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            min-width: 250px;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border-color);
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Audio Input';
        title.style.cssText = `
            margin: 0;
            color: var(--text-primary);
            font-size: 14px;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
        `;
        closeBtn.onclick = () => dropdown.remove();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        dropdown.appendChild(header);

        // Create device list
        const deviceList = document.createElement('div');
        deviceList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Add devices
        this.availableDevices.forEach(device => {
            const deviceBtn = document.createElement('button');
            deviceBtn.style.cssText = `
                background: var(--hover-color);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
                font-size: 12px;
            `;
            
            let displayName = device.label || `Input ${device.deviceId.substr(0, 5)}`;
            if (displayName.includes('BlackHole') || displayName.includes('Loopback') || displayName.includes('Virtual') || displayName.includes('Soundflower')) {
                displayName = '🎵 ' + displayName;
            }
            
            deviceBtn.textContent = displayName;
            deviceBtn.onclick = async () => {
                await this.startLiveInput(device.deviceId);
                dropdown.remove();
            };
            
            deviceBtn.onmouseover = () => {
                deviceBtn.style.background = '#404040';
            };
            deviceBtn.onmouseout = () => {
                deviceBtn.style.background = 'var(--hover-color)';
            };
            
            deviceList.appendChild(deviceBtn);
        });

        // Add help option
        const helpBtn = document.createElement('button');
        helpBtn.style.cssText = `
            background: var(--accent-color);
            border: 1px solid var(--accent-color);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            text-align: left;
            margin-top: 8px;
            transition: all 0.2s ease;
            font-size: 12px;
        `;
        helpBtn.textContent = '❓ System audio help...';
        helpBtn.onclick = () => {
            this.showSystemAudioHelp();
            dropdown.remove();
        };
        
        deviceList.appendChild(helpBtn);
        dropdown.appendChild(deviceList);

        // Add to page
        document.body.appendChild(dropdown);

        // Close dropdown when clicking outside
        const closeOnOutsideClick = (e) => {
            if (!dropdown.contains(e.target) && e.target !== button) {
                dropdown.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        
        // Add click listener after a short delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);

        console.log('Custom audio input dropdown created');
    }

    showVideoInputMenu() {
        // Check if dropdown is already open, if so close it
        const existingDropdown = document.getElementById('footerVideoInputDropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }
        
        // Create a simple custom dropdown for video input selection
        this.createVideoInputDropdown();
    }

    createVideoInputDropdown() {
        // Remove existing dropdown if it exists
        const existingDropdown = document.getElementById('footerVideoInputDropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Get button position
        const button = document.getElementById('footerLiveVideoBtn');
        if (!button) {
            console.error('Footer Live Video button not found');
            return;
        }

        const buttonRect = button.getBoundingClientRect();
        
        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.id = 'footerVideoInputDropdown';
        dropdown.style.cssText = `
            position: fixed;
            top: ${buttonRect.bottom + 4}px;
            left: ${buttonRect.left}px;
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            min-width: 250px;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border-color);
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Video Input';
        title.style.cssText = `
            margin: 0;
            color: var(--text-primary);
            font-size: 14px;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
        `;
        closeBtn.onclick = () => dropdown.remove();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        dropdown.appendChild(header);

        // Create device list
        const deviceList = document.createElement('div');
        deviceList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Add video devices
        this.availableVideoDevices.forEach(device => {
            const deviceBtn = document.createElement('button');
            const isActive = this.videoMode === 'camera' && this.currentVideoDeviceId === device.deviceId;
            
            deviceBtn.style.cssText = `
                background: ${isActive ? 'var(--accent-color)' : 'var(--hover-color)'};
                border: 1px solid ${isActive ? 'var(--accent-color)' : 'var(--border-color)'};
                color: ${isActive ? 'white' : 'var(--text-primary)'};
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
                font-size: 12px;
            `;
            
            let displayName = device.label || `Camera ${device.deviceId.substr(0, 5)}`;
            if (displayName.includes('FaceTime') || displayName.includes('Built-in') || displayName.includes('USB')) {
                displayName = '📹 ' + displayName;
            }
            
            // Add active indicator
            if (isActive) {
                displayName = '● ' + displayName;
            }
            
            deviceBtn.textContent = displayName;
            deviceBtn.onclick = async () => {
                // Use existing video input system
                await this.startVideoInput(device.deviceId);
                dropdown.remove();
            };
            
            deviceBtn.onmouseover = () => {
                if (!isActive) {
                    deviceBtn.style.background = '#404040';
                }
            };
            deviceBtn.onmouseout = () => {
                if (!isActive) {
                    deviceBtn.style.background = 'var(--hover-color)';
                }
            };
            
            deviceList.appendChild(deviceBtn);
        });

        // Add help option
        const helpBtn = document.createElement('button');
        helpBtn.style.cssText = `
            background: var(--accent-color);
            border: 1px solid var(--accent-color);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            text-align: left;
            margin-top: 8px;
            transition: all 0.2s ease;
            font-size: 12px;
        `;
        helpBtn.textContent = '❓ Video input help...';
        helpBtn.onclick = () => {
            alert('Video Input Help:\n\n' +
                  '• Select a camera or video device from the list\n' +
                  '• Built-in cameras will show as "📹 Built-in Camera"\n' +
                  '• External USB cameras will show as "📹 USB Camera"\n' +
                  '• The video feed will appear in the visualization\n' +
                  '• Click the V button again to stop video input');
            dropdown.remove();
        };
        
        deviceList.appendChild(helpBtn);
        dropdown.appendChild(deviceList);

        // Add to page
        document.body.appendChild(dropdown);

        // Close dropdown when clicking outside
        const closeOnOutsideClick = (e) => {
            if (!dropdown.contains(e.target) && e.target !== button) {
                dropdown.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        
        // Add click listener after a short delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);

        console.log('Custom video input dropdown created');
    }


    updateFooterLiveAudioButton() {
        const footerBtn = document.getElementById('footerLiveAudioBtn');
        if (!footerBtn) return;

        // Check if live audio is enabled
        const isActive = this.liveAudioEnabled;
        
        console.log('A button state check:', {
            liveAudioEnabled: this.liveAudioEnabled,
            isActive: isActive
        });
        
        if (isActive) {
            footerBtn.classList.add('active');
        } else {
            footerBtn.classList.remove('active');
        }
    }

    updateFooterLiveVideoButton() {
        const footerBtn = document.getElementById('footerLiveVideoBtn');
        if (!footerBtn) return;

        // Check if video is active using existing video system
        const isActive = this.videoMode === 'camera' || this.videoMode === 'file';
        
        console.log('V button state check:', {
            videoMode: this.videoMode,
            isActive: isActive
        });
        
        if (isActive) {
            footerBtn.classList.add('active');
        } else {
            footerBtn.classList.remove('active');
        }
    }

    updateFooterVisualizerButton() {
        const footerBtn = document.getElementById('footerVisualizerBtn');
        if (!footerBtn) return;

        // Check if visualization is enabled
        const isActive = this.visualizationEnabled;
        
        console.log('Visualizer button state check:', {
            visualizationEnabled: this.visualizationEnabled,
            isActive: isActive
        });
        
        if (isActive) {
            footerBtn.classList.add('active');
        } else {
            footerBtn.classList.remove('active');
        }
    }

    updateFooterVisualizerToggleButton() {
        const toggleBtn = document.getElementById('footerVisualizerToggleBtn');
        if (!toggleBtn) return;

        const toggleText = toggleBtn.querySelector('.toggle-text');
        if (!toggleText) return;

        // Update button text and state
        if (this.visualizationEnabled) {
            toggleText.textContent = 'ON';
            toggleBtn.classList.add('active');
        } else {
            toggleText.textContent = 'OFF';
            toggleBtn.classList.remove('active');
        }
    }

    initializeFooterMorphControls() {
        // Footer Morph Button
        const footerMorphBtn = document.getElementById('footerMorphBtn');
        if (footerMorphBtn) {
            console.log('Initializing footer morph button');
            footerMorphBtn.addEventListener('click', () => {
                this.toggleMorph();
            });
        } else {
            console.error('Footer morph button not found');
        }

        // Footer Morph Speed Select
        const footerMorphSpeedSelect = document.getElementById('footerMorphSpeedSelect');
        if (footerMorphSpeedSelect) {
            console.log('Initializing footer morph speed select');
            footerMorphSpeedSelect.addEventListener('change', (e) => {
                this.setMorphSpeed(e.target.value);
            });
        } else {
            console.error('Footer morph speed select not found');
        }
    }

    async toggleLiveAudio() {
        const toggleBtn = document.getElementById('liveAudioToggleBtn');
        const deviceSelect = document.getElementById('audioDeviceSelect');

        if (this.liveAudioEnabled) {
            // Turn OFF live audio
            this.stopLiveInput();
            this.liveAudioEnabled = false;
            this.inputMode = 'playlist';
            this.currentDeviceId = null;
            
            // Update UI
            toggleBtn.textContent = 'OFF';
            toggleBtn.classList.remove('active');
            if (deviceSelect) {
                deviceSelect.value = '';
            }
            
            // Resume playlist
            this.resumePlaylist();
            
        } else {
            // Turn ON live audio
            if (this.lastAudioDeviceId) {
                // Use last selected device
                await this.startLiveInput(this.lastAudioDeviceId);
            } else {
                // Show device selector
                await this.initializeAudioInput();
                if (deviceSelect) {
                    deviceSelect.style.display = 'block';
                }
            }
            
            this.liveAudioEnabled = true;
            
            // Update UI
            toggleBtn.textContent = 'ON';
            toggleBtn.classList.add('active');
        }
        
        // Update footer button state
        this.updateFooterLiveAudioButton();
    }

    showColorPicker() {
        // Check if panel is already open, if so close it
        const existingPanel = document.getElementById('colorPickerPanel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        // Create a custom color picker panel positioned relative to C button
        this.createColorPickerPanel();
    }

    createColorPickerPanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('colorPickerPanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Get C button position
        const button = document.getElementById('footerLiveColorBtn');
        if (!button) {
            console.error('Footer Live Color button not found');
            return;
        }

        const buttonRect = button.getBoundingClientRect();
        
        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'colorPickerPanel';
        panel.className = 'color-picker-panel';
        panel.style.cssText = `
            position: fixed;
            top: ${buttonRect.bottom + 4}px;
            left: ${buttonRect.left}px;
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            min-width: 200px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border-color);
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Background Color';
        title.style.cssText = `
            margin: 0;
            color: var(--text-primary);
            font-size: 14px;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        closeBtn.addEventListener('click', () => {
            panel.remove();
        });
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create color picker input
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = 'panelColorPicker';
        colorInput.value = this.backgroundColor || '#000000';
        colorInput.style.cssText = `
            width: 100%;
            height: 40px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        
        // Add change event listener
        colorInput.addEventListener('change', (e) => {
            this.setBackgroundColor(e.target.value);
        });
        
        panel.appendChild(header);
        panel.appendChild(colorInput);
        document.body.appendChild(panel);
        
        // Close panel when clicking outside
        const closeOnOutsideClick = (e) => {
            if (!panel.contains(e.target) && e.target !== button) {
                panel.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        
        // Delay the outside click listener to prevent immediate closure
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);
    }

    showBackgroundImageSelection() {
        // Check if panel is already open, if so close it
        const existingPanel = document.getElementById('backgroundImagePanel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        // Show the background image control panel
        this.createBackgroundImagePanel();
    }

    createBackgroundImagePanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('backgroundImagePanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'backgroundImagePanel';
        panel.className = 'background-image-panel';
        
        // Get button position for panel positioning
        const button = document.getElementById('footerLiveBackgroundBtn');
        const buttonRect = button.getBoundingClientRect();
        
        // Position panel below button, left-aligned
        panel.style.position = 'fixed';
        panel.style.top = `${buttonRect.bottom + 4}px`; // 4px gap below button
        panel.style.left = `${buttonRect.left}px`;
        panel.style.zIndex = '10000';
        panel.style.background = 'var(--secondary-bg)';
        panel.style.border = '1px solid var(--border-color)';
        panel.style.borderRadius = '8px';
        panel.style.padding = '15px';
        panel.style.minWidth = '250px';
        panel.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        
        // Panel content - match sidebar styling exactly
        panel.innerHTML = `
            <div class="panel-header">
                <h4 style="margin: 0 0 15px 0; color: var(--text-primary);">Background Image</h4>
                <button class="close-btn" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 18px;">×</button>
            </div>
            
            <!-- Background Image Toggle -->
            <div class="control-group">
                <button class="dropdown-toggle viz-toggle-btn" id="panelBackgroundToggle" title="Toggle Background Image">
                    <span class="background-text">Background IMG: ${this.backgroundImageEnabled ? 'ON' : 'OFF'}</span>
                </button>
            </div>
            
            <!-- Image Selection -->
            <div class="control-group">
                <div class="group-label">Image</div>
                <button class="control-btn" id="panelBackgroundSelect">Select Image</button>
                <div class="background-file-info" id="panelBackgroundFileInfo" style="display: none;">
                    <div class="file-preview-container">
                        <div class="image-preview" id="panelBackgroundImagePreview"></div>
                        <div class="file-details">
                            <div class="file-name" id="panelBackgroundFileName"></div>
                            <div class="file-size" id="panelBackgroundFileSize"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Opacity -->
            <div class="control-group">
                <div class="group-label">Opacity</div>
                <div class="slider-container">
                    <input type="range" id="panelOpacitySlider" class="control-slider" min="0" max="100" value="${this.backgroundImageOpacity || 100}">
                    <span class="slider-value" id="panelOpacityValue">${this.backgroundImageOpacity || 100}%</span>
                </div>
            </div>

            <!-- Saturation -->
            <div class="control-group">
                <div class="group-label">Saturation</div>
                <div class="slider-container">
                    <input type="range" id="panelSaturationSlider" class="control-slider" min="0" max="200" value="${this.backgroundImageSaturation || 100}">
                    <span class="slider-value" id="panelSaturationValue">${this.backgroundImageSaturation || 100}%</span>
                </div>
            </div>
            
            <!-- Posterization -->
            <div class="control-group">
                <div class="group-label">Posterization</div>
                <div class="slider-container">
                    <input type="range" id="panelPosterizeSlider" class="control-slider" min="0" max="16" value="${this.backgroundImagePosterize || 16}">
                    <span class="slider-value" id="panelPosterizeValue">${this.backgroundImagePosterize || 16}</span>
                </div>
            </div>
            
            <!-- Contrast -->
            <div class="control-group">
                <div class="group-label">Contrast</div>
                <div class="slider-container">
                    <input type="range" id="panelContrastSlider" class="control-slider" min="0" max="200" value="${this.backgroundImageContrast || 100}">
                    <span class="slider-value" id="panelContrastValue">${this.backgroundImageContrast || 100}%</span>
                </div>
            </div>
            
            <!-- Sizing -->
            <div class="control-group">
                <div class="group-label">Sizing</div>
                <div class="button-group">
                    <button class="size-btn" id="panelBackgroundSizeFit" data-size="fit">Fit</button>
                    <button class="size-btn" id="panelBackgroundSizeFill" data-size="fill">Fill</button>
                    <button class="size-btn" id="panelBackgroundSizeStretch" data-size="stretch">Stretch</button>
                    <button class="size-btn active" id="panelBackgroundSizeOriginal" data-size="original">Original</button>
                </div>
            </div>
            
            <!-- Clear Background -->
            <div class="control-group">
                <button class="control-btn clear-btn" id="panelBackgroundClear">Clear Background</button>
            </div>
        `;
        
        // Add event listeners
        this.setupBackgroundPanelEvents(panel);
        
        // Add to document
        document.body.appendChild(panel);
        
        // Update active states
        this.updateBackgroundPanelStates(panel);
    }

    setupBackgroundPanelEvents(panel) {
        // Close button
        const closeBtn = panel.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            panel.remove();
        });
        
        // Toggle button
        const toggleBtn = panel.querySelector('#panelBackgroundToggle');
        toggleBtn.addEventListener('click', () => {
            this.toggleBackgroundImage();
            const backgroundText = toggleBtn.querySelector('.background-text');
            backgroundText.textContent = `Background IMG: ${this.backgroundImageEnabled ? 'ON' : 'OFF'}`;
            toggleBtn.classList.toggle('active', this.backgroundImageEnabled);
        });
        
        // Select image button
        const selectBtn = panel.querySelector('#panelBackgroundSelect');
        selectBtn.addEventListener('click', () => {
            const backgroundImageFile = document.getElementById('backgroundImageFile');
            if (backgroundImageFile) {
                backgroundImageFile.click();
            }
        });
        
        // Opacity slider
        const opacitySlider = panel.querySelector('#panelOpacitySlider');
        const opacityValue = panel.querySelector('#panelOpacityValue');
        opacitySlider.addEventListener('input', (e) => {
            this.backgroundImageOpacity = parseInt(e.target.value);
            opacityValue.textContent = `${this.backgroundImageOpacity}%`;
            this.saveBackgroundImage();
        });
        
        // Saturation slider
        const saturationSlider = panel.querySelector('#panelSaturationSlider');
        const saturationValue = panel.querySelector('#panelSaturationValue');
        saturationSlider.addEventListener('input', (e) => {
            this.backgroundImageSaturation = parseInt(e.target.value);
            saturationValue.textContent = `${this.backgroundImageSaturation}%`;
            this.saveBackgroundImage();
        });
        
        // Posterize slider
        const posterizeSlider = panel.querySelector('#panelPosterizeSlider');
        const posterizeValue = panel.querySelector('#panelPosterizeValue');
        posterizeSlider.addEventListener('input', (e) => {
            this.backgroundImagePosterize = parseInt(e.target.value);
            posterizeValue.textContent = this.backgroundImagePosterize;
            this.saveBackgroundImage();
        });
        
        // Contrast slider
        const contrastSlider = panel.querySelector('#panelContrastSlider');
        const contrastValue = panel.querySelector('#panelContrastValue');
        contrastSlider.addEventListener('input', (e) => {
            this.backgroundImageContrast = parseInt(e.target.value);
            contrastValue.textContent = `${this.backgroundImageContrast}%`;
            this.saveBackgroundImage();
        });
        
        // Size buttons
        const sizeBtns = panel.querySelectorAll('.size-btn');
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = e.target.getAttribute('data-size');
                this.backgroundImageSize = size;
                this.saveBackgroundImage();
                
                // Update active state
                sizeBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Clear button
        const clearBtn = panel.querySelector('#panelBackgroundClear');
        clearBtn.addEventListener('click', () => {
            this.clearBackgroundImage();
            this.updateFooterBackgroundButton(); // Update B button state
            panel.remove();
        });
    }

    updateBackgroundPanelStates(panel) {
        // Update toggle button
        const toggleBtn = panel.querySelector('#panelBackgroundToggle');
        const backgroundText = toggleBtn.querySelector('.background-text');
        backgroundText.textContent = `Background IMG: ${this.backgroundImageEnabled ? 'ON' : 'OFF'}`;
        toggleBtn.classList.toggle('active', this.backgroundImageEnabled);
        
        // Update size buttons
        const sizeBtns = panel.querySelectorAll('.size-btn');
        sizeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-size') === this.backgroundImageSize);
        });
    }

    toggleBackgroundImage() {
        // Toggle background image enabled state using existing functionality
        this.backgroundImageEnabled = !this.backgroundImageEnabled;
        this.saveBackgroundImage();
        this.updateFooterBackgroundButton();
        
        console.log('Background image toggled to:', this.backgroundImageEnabled);
    }

    updateFooterBackgroundButton() {
        const footerBtn = document.getElementById('footerLiveBackgroundBtn');
        if (!footerBtn) return;

        // Check if background image is enabled
        const isActive = this.backgroundImageEnabled && this.backgroundImage;
        
        if (isActive) {
            footerBtn.classList.add('active');
        } else {
            footerBtn.classList.remove('active');
        }
    }

    saveBackgroundImage() {
        // Save background image settings to localStorage
        const settings = {
            backgroundImage: this.backgroundImage,
            backgroundImageEnabled: this.backgroundImageEnabled,
            backgroundImageOpacity: this.backgroundImageOpacity || 100,
            backgroundImageSaturation: this.backgroundImageSaturation || 100,
            backgroundImagePosterize: this.backgroundImagePosterize || 16,
            backgroundImageContrast: this.backgroundImageContrast || 100,
            backgroundImageSize: this.backgroundImageSize || 'medium'
        };
        localStorage.setItem('backgroundImageSettings', JSON.stringify(settings));
    }

    clearBackgroundImage() {
        // Clear background image and reset settings
        this.backgroundImage = null;
        this.backgroundImageEnabled = false;
        this.backgroundImageOpacity = 100;
        this.backgroundImageSaturation = 100;
        this.backgroundImagePosterize = 16;
        this.backgroundImageContrast = 100;
        this.backgroundImageSize = 'original';
        this.saveBackgroundImage();
        this.updateFooterBackgroundButton();
        
        // Update sidebar UI if it exists
        if (window.visualizer && window.visualizer.updateBackgroundImageUI) {
            window.visualizer.updateBackgroundImageUI();
        }
    }

    loadBackgroundImageSettings() {
        // Load background image settings from localStorage
        try {
            const saved = localStorage.getItem('backgroundImageSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.backgroundImage = settings.backgroundImage || null;
                this.backgroundImageEnabled = settings.backgroundImageEnabled || false;
                this.backgroundImageOpacity = settings.backgroundImageOpacity || 100;
                this.backgroundImageSaturation = settings.backgroundImageSaturation || 100;
                this.backgroundImagePosterize = settings.backgroundImagePosterize || 16;
                this.backgroundImageContrast = settings.backgroundImageContrast || 100;
                this.backgroundImageSize = settings.backgroundImageSize || 'medium';
                
                // Update footer button state
                this.updateFooterBackgroundButton();
            }
        } catch (error) {
            console.error('Error loading background image settings:', error);
        }
    }

    showPlaylistPanel() {
        // Create playlist panel
        this.createPlaylistPanel();
    }

    showVisualizerPanel() {
        // Check if panel is already open, if so close it
        const existingPanel = document.getElementById('visualizerPanel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        // Create visualizer panel
        this.createVisualizerPanel();
    }

    createPlaylistPanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('playlistPanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'playlistPanel';
        panel.className = 'playlist-panel';
        
        // Get button position for panel positioning
        const button = document.getElementById('footerPlaylistBtn');
        const buttonRect = button.getBoundingClientRect();
        
        // Position panel above button, left-aligned
        panel.style.position = 'fixed';
        panel.style.top = `${buttonRect.top - 4}px`;
        panel.style.left = `${buttonRect.left}px`;
        panel.style.transform = 'translateY(-100%)';
        panel.style.zIndex = '10000';
        panel.style.background = 'var(--secondary-bg)';
        panel.style.border = '1px solid var(--border-color)';
        panel.style.borderRadius = '8px';
        panel.style.padding = '15px';
        panel.style.minWidth = '300px';
        panel.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        
        // Panel content - separate from sidebar with panel-specific IDs
        panel.innerHTML = `
            <div class="panel-header">
                <h4 style="margin: 0 0 15px 0; color: var(--text-primary);">Playlist</h4>
                <button class="close-btn" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 18px;">×</button>
            </div>
            
            <!-- Playlist Actions -->
            <div class="playlist-actions-dropdown">
                <button class="playlist-scan-btn" id="panelPlaylistScanBtn" title="Add Music Folder">📁 Add Folder</button>
                <button class="playlist-import-btn" id="panelPlaylistImportBtn" title="Import Playlist">📥</button>
                <button class="playlist-export-btn" id="panelPlaylistExportBtn" title="Export Playlist">📤</button>
            </div>
            
            <!-- Scanning Progress (hidden by default) -->
            <div class="playlist-progress" id="panelPlaylistProgress" style="display: none;">
                <div class="progress-bar-container">
                    <div class="progress-bar" id="panelProgressBar"></div>
                </div>
                <div class="progress-info">
                    <span class="progress-text" id="panelProgressText">Scanning music folder...</span>
                    <span class="progress-count" id="panelProgressCount">0/0 files</span>
                    <span class="progress-eta" id="panelProgressEta">Est: calculating...</span>
                </div>
                <button class="progress-cancel-btn" id="panelProgressCancelBtn">Cancel</button>
            </div>
            
            <!-- Playlist Stats -->
            <div class="playlist-stats" id="panelPlaylistStats">
                <span class="playlist-track-count" id="panelPlaylistTrackCount">No tracks loaded</span>
                <span class="playlist-duration" id="panelPlaylistDuration">0:00:00</span>
            </div>
            
            <!-- Tracks Container -->
            <div class="playlist-tracks-container" id="panelPlaylistTracksContainer">
                <div class="playlist-tracks" id="panelPlaylistTracks">
                    <!-- Artist groups will be populated here -->
                    <div class="empty-playlist">
                        <div class="empty-playlist-icon">🎵</div>
                        <div class="empty-playlist-text">No music loaded</div>
                        <div class="empty-playlist-subtext">Click "Add Folder" to scan your music library</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        this.setupPlaylistPanelEvents(panel);
        
        // Add to document
        document.body.appendChild(panel);
    }

    setupPlaylistPanelEvents(panel) {
        // Close button
        const closeBtn = panel.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            panel.remove();
        });

        // Scan button - Add Music Folder
        const scanBtn = panel.querySelector('#panelPlaylistScanBtn');
        if (scanBtn && this.playlistManager) {
            scanBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playlistManager.scanFolder();
            });
        }

        // Import button
        const importBtn = panel.querySelector('#panelPlaylistImportBtn');
        if (importBtn) {
            importBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const importInput = document.getElementById('playlistImportInput');
                if (importInput) {
                    importInput.click();
                }
            });
        }

        // Set up import handler for panel
        const importInput = document.getElementById('playlistImportInput');
        if (importInput) {
            // Remove any existing panel import handler
            importInput.removeEventListener('change', this._panelImportHandler);
            this._panelImportHandler = async (e) => {
                const file = e.target.files?.[0];
                if (file && this.playlistManager) {
                    await this.playlistManager.importPlaylist(file);
                    // Update panel display after import
                    this.updatePlaylistPanelDisplay(panel);
                }
                e.target.value = ''; // Reset input
            };
            importInput.addEventListener('change', this._panelImportHandler);
        }

        // Export button
        const exportBtn = panel.querySelector('#panelPlaylistExportBtn');
        if (exportBtn && this.playlistManager) {
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playlistManager.exportPlaylist();
            });
        }

        // Progress cancel button
        const cancelBtn = panel.querySelector('#panelProgressCancelBtn');
        if (cancelBtn && this.playlistManager) {
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playlistManager.cancelScan();
            });
        }

        // Initialize panel content by copying from sidebar
        this.initializePlaylistPanelContent(panel);

        // Store panel reference for updates
        this.currentPlaylistPanel = panel;
    }

    createVisualizerPanel() {
        // Remove existing panel if any
        const existingPanel = document.getElementById('visualizerPanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Get button position
        const button = document.getElementById('footerVisualizerBtn');
        if (!button) {
            console.error('Footer Visualizer button not found');
            return;
        }

        const buttonRect = button.getBoundingClientRect();
        
        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'visualizerPanel';
        panel.className = 'visualizer-panel';
        panel.style.cssText = `
            position: fixed;
            top: ${buttonRect.bottom + 4}px;
            left: ${buttonRect.left}px;
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            min-width: 250px;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border-color);
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Visualizer';
        title.style.cssText = `
            margin: 0;
            color: var(--text-primary);
            font-size: 14px;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
        `;
        closeBtn.onclick = () => panel.remove();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Create visualization mode list
        const modeList = document.createElement('div');
        modeList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Add visualization modes
        const modes = [
            { id: 0, name: 'Spectrum' },
            { id: 1, name: 'Mirror Wave' },
            { id: 2, name: 'Classic LED' },
            { id: 3, name: 'Stereo' },
            { id: 4, name: 'Radial Spectrum' },
            { id: 5, name: 'Energy' },
            { id: 6, name: 'Mirror' }
        ];

        modes.forEach(mode => {
            const modeBtn = document.createElement('button');
            modeBtn.style.cssText = `
                background: var(--hover-color);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
                font-size: 12px;
            `;
            
            modeBtn.textContent = mode.name;
            modeBtn.onclick = () => {
                // Set the visualization mode
                this.setVisualizationMode(mode.id);
                
                // Turn ON visualization if it's not already on
                if (!this.visualizationEnabled) {
                    this.visualizationEnabled = true;
                    
                    // Update sidebar toggle button
                    const sidebarBtn = document.getElementById('vizToggleBtn');
                    if (sidebarBtn) {
                        sidebarBtn.textContent = 'ON';
                        sidebarBtn.classList.add('active');
                    }
                    
                    // Update footer visualizer button state
                    this.updateFooterVisualizerButton();
                    
                    // Resume visualization if audioMotion exists
                    if (this.audioMotion) {
                        this.audioMotion.animate();
                    }
                }
                
                // Close the panel
                panel.remove();
            };
            
            modeBtn.onmouseover = () => {
                modeBtn.style.background = '#404040';
            };
            modeBtn.onmouseout = () => {
                modeBtn.style.background = 'var(--hover-color)';
            };
            
            modeList.appendChild(modeBtn);
        });

        panel.appendChild(modeList);
        
        // Add to document
        document.body.appendChild(panel);
    }


    initializePlaylistPanelContent(panel) {
        // Copy content from sidebar to panel
        if (this.playlistManager && this.playlistManager.currentPlaylist) {
            this.updatePlaylistPanelDisplay(panel);
        }
    }

    updatePlaylistPanelDisplay(panel) {
        // Update panel stats
        const trackCount = panel.querySelector('#panelPlaylistTrackCount');
        const duration = panel.querySelector('#panelPlaylistDuration');
        const tracks = panel.querySelector('#panelPlaylistTracks');
        
        if (this.playlistManager && this.playlistManager.currentPlaylist) {
            const playlist = this.playlistManager.currentPlaylist;
            const trackList = playlist.tracks || [];
            const totalDuration = trackList.reduce((sum, track) => sum + (track.duration || 0), 0);
            
            if (trackCount) {
                trackCount.textContent = `${trackList.length} track${trackList.length !== 1 ? 's' : ''}`;
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
            
            if (tracks) {
                if (trackList.length === 0) {
                    tracks.innerHTML = `
                        <div class="empty-playlist">
                            <div class="empty-playlist-icon">🎵</div>
                            <div class="empty-playlist-text">No music loaded</div>
                            <div class="empty-playlist-subtext">Click "Add Folder" to scan your music library</div>
                        </div>
                    `;
                } else {
                    // Display tracks with drag and drop support
                    let html = '';
                    trackList.forEach((track, index) => {
                        html += `
                            <div class="track-item" data-track-id="${track.id}" data-track-index="${index}" draggable="true">
                                <div class="track-info">
                                    <div class="track-title">${track.title || 'Unknown Title'}</div>
                                    <div class="track-duration">${this.formatDuration(track.duration || 0)}</div>
                                </div>
                                <div class="track-actions">
                                    <button class="track-play-btn" data-track-id="${track.id}" title="Play">▶</button>
                                    <button class="track-remove-btn" data-track-id="${track.id}" title="Remove">×</button>
                                </div>
                            </div>
                        `;
                    });
                    tracks.innerHTML = html;
                    
                    // Add event listeners for track buttons
                    this.setupPanelTrackEvents(panel);
                }
            }
        }
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    setupPanelTrackEvents(panel) {
        // Play button events
        panel.querySelectorAll('.track-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = e.target.getAttribute('data-track-id');
                if (this.playlistManager) {
                    this.playlistManager.playTrack(trackId);
                }
            });
        });

        // Remove button events
        panel.querySelectorAll('.track-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = e.target.getAttribute('data-track-id');
                if (this.playlistManager) {
                    this.playlistManager.removeTrack(trackId);
                    this.updatePlaylistPanelDisplay(panel); // Refresh display
                }
            });
        });

        // Drag and drop functionality - duplicate from sidebar
        this.initializePanelDragAndDrop(panel);
    }

    initializePanelDragAndDrop(panel) {
        let draggedTrackId = null;
        let draggedElement = null;
        
        panel.querySelectorAll('.track-item').forEach(item => {
            // Drag start
            item.addEventListener('dragstart', (e) => {
                draggedTrackId = item.dataset.trackId;
                draggedElement = item;
                e.dataTransfer.setData('text/plain', draggedTrackId);
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
                console.log('Panel drag started for track:', draggedTrackId);
            });
            
            // Drag end
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                panel.querySelectorAll('.track-item').forEach(i => {
                    i.classList.remove('drag-over', 'drop-not-allowed');
                });
                panel.querySelectorAll('.artist-tracks').forEach(a => {
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
                    const targetTrack = this.playlistManager.findTrackById(targetTrackId);
                    const isTargetPlaying = this.audio && 
                                           this.audio.src && 
                                           targetTrack && 
                                           this.audio.src === targetTrack.url;
                    
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
                
                console.log(`Panel drop: ${droppedTrackId} onto ${targetTrackId}`);
                
                if (droppedTrackId && targetTrackId && droppedTrackId !== targetTrackId) {
                    // Check if target is currently playing
                    const targetTrack = this.playlistManager.findTrackById(targetTrackId);
                    const isTargetPlaying = this.audio && 
                                           this.audio.src && 
                                           targetTrack && 
                                           this.audio.src === targetTrack.url;
                    
                    if (isTargetPlaying) {
                        console.log('Preventing drop on currently playing track to avoid playback errors');
                        return;
                    }
                    
                    this.playlistManager.reorderTracks(droppedTrackId, targetTrackId);
                    // Refresh both sidebar and panel displays
                    this.playlistManager.displayPlaylist();
                    this.updatePlaylistPanelDisplay(panel);
                }
                
                // Clean up visual feedback
                panel.querySelectorAll('.track-item').forEach(i => {
                    i.classList.remove('drag-over', 'dragging', 'drop-not-allowed');
                });
            });
        });
        
        // Track list container for general drops
        const tracksContainer = panel.querySelector('#panelPlaylistTracks');
        if (tracksContainer) {
            tracksContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                // Find the closest track item to show insertion point
                const afterElement = this.getPanelDragAfterElement(tracksContainer, e.clientY);
                const dragging = panel.querySelector('.dragging');
                
                if (afterElement == null) {
                    tracksContainer.appendChild(dragging);
                } else {
                    tracksContainer.insertBefore(dragging, afterElement);
                }
            });
            
            tracksContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Panel drop on tracks container');
            });
        }
    }

    getPanelDragAfterElement(container, y) {
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



    async toggleInputMode() {
        const deviceSelect = document.getElementById('audioDeviceSelect');

        if (this.inputMode === 'playlist') {
            try {
                let devices = await navigator.mediaDevices.enumerateDevices();
                let audioInputs = devices.filter(d => d.kind === 'audioinput');

                const hasLabels = audioInputs.length > 0 && audioInputs.some(d => d.label && d.label !== '');

                if (! hasLabels) {
                    console.log('No device labels, requesting permission...');

                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({audio: true});

                        stream.getTracks().forEach(track => {
                            track.stop();
                            console.log('Stopped track:', track.label);
                        });

                        devices = await navigator.mediaDevices.enumerateDevices();
                        audioInputs = devices.filter(d => d.kind === 'audioinput');
                        console.log('Found audio inputs:', audioInputs);

                    } catch (err) {
                        console.error('getUserMedia error:', err);

                        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                            this.showError('Microphone blocked. Click the lock icon in the address bar, set Microphone to "Allow", then refresh the page.');
                        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                            this.showError('No microphone found. Please connect a microphone.');
                        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                            this.showError('Microphone is being used by another application.');
                        } else {
                            this.showError(`Microphone error: ${
                                err.name
                            } - ${
                                err.message
                            }`);
                        }
                        return;
                    }
                }

                this.availableDevices = audioInputs;

                if (this.availableDevices.length === 0) {
                    this.showError('No audio input devices found. Please connect a microphone.');
                    return;
                }

                this.updateDeviceList();
                this.inputMode = 'selecting';

            } catch (e) {
                console.error('Unexpected error:', e);
                this.showError(`Error: ${
                    e.message
                }`);
            }
        } else {
            this.stopLiveInput();
            this.inputMode = 'playlist';
            this.currentDeviceId = null;
            this.resumePlaylist();
            // Footer button state will be updated by stopLiveInput()
        }
    }

    async initializeVideoInput() {
        try { // Request permission if needed
            const devices = await navigator.mediaDevices.enumerateDevices();
            let videoDevices = devices.filter(d => d.kind === 'videoinput');

            // If no labels, request permission
            if (videoDevices.length > 0 && ! videoDevices[0].label) {
                const tempStream = await navigator.mediaDevices.getUserMedia({video: true});
                tempStream.getTracks().forEach(track => track.stop());

                // Re-enumerate with permissions
                const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
                videoDevices = devicesWithLabels.filter(d => d.kind === 'videoinput');
            }

            this.availableVideoDevices = videoDevices;
            this.updateVideoDeviceList();

        } catch (e) {
            console.log('Video device enumeration failed:', e);
        }
    }

    updateVideoDeviceList() {
        const select = document.getElementById('videoDeviceSelect');
        if (! select) 
            return;
        


        select.innerHTML = '<option value="">Select Video Input...</option>';

        this.availableVideoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            let displayName = device.label || `Camera ${
                device.deviceId.substr(0, 5)
            }`;

            // Add icons for common camera types including Continuity Camera
            if (displayName.toLowerCase().includes('iphone') || 
                displayName.toLowerCase().includes('ipad') ||
                displayName.toLowerCase().includes('continuity')) {
                displayName = '📱 ' + displayName + ' (Continuity Camera)';
            } else if (displayName.toLowerCase().includes('obs')) {
                displayName = '🎬 ' + displayName;
            } else if (displayName.toLowerCase().includes('virtual')) {
                displayName = '💻 ' + displayName;
            } else if (displayName.toLowerCase().includes('back') || displayName.toLowerCase().includes('rear')) {
                displayName = '📷 ' + displayName;
            } else {
                displayName = '📹 ' + displayName;
            } option.textContent = displayName;
            select.appendChild(option);
        });

        // Add separator
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────────';
        select.appendChild(separator);

        // Add video from file option
        const fileOption = document.createElement('option');
        fileOption.value = 'file';
        fileOption.textContent = '📁 Video from file' + (this.videoFile ? ` (${this.videoFile.name})` : '');
        select.appendChild(fileOption);
        
        // Update drawer select as well
        const drawerSelect = document.getElementById('drawerVideoDeviceSelect');
        if (drawerSelect) {
            drawerSelect.innerHTML = select.innerHTML;
            drawerSelect.value = select.value;
        }
        
        console.log('Video device list updated. Total options:', select.options.length);
    }

    async toggleVideoInput() {
        const deviceSelect = document.getElementById('videoDeviceSelect');

        if (this.videoMode === 'off') { // Show device selector
            await this.initializeVideoInput();

            deviceSelect.style.display = 'block';
            this.videoMode = 'selecting';

        } else { // Turn off video
            this.stopVideoInput();
            this.videoMode = 'off';
            this.updateVideoToggleState();
        }
    }

    toggleVideoPlayback() {
        if (this.videoMode === 'camera' || this.videoMode === 'file') {
            // Video is currently visible - hide it
            if (this.videoElement) {
                this.videoElement.style.display = 'none';
                this.videoMode = 'hidden';
            }
        } else if (this.videoMode === 'hidden') {
            // Video is hidden - show it
            if (this.videoElement) {
                this.videoElement.style.display = 'block';
                this.videoMode = this.videoFile ? 'file' : 'camera';
            }
        } else {
            // No video source selected - start selection process
            this.toggleVideoInput();
        }
        this.updateVideoToggleState();
    }

    saveVideoSource(type, source) {
        const videoSource = {
            type: type,
            source: source,
            timestamp: Date.now()
        };
        localStorage.setItem('mviz_video_source', JSON.stringify(videoSource));
        console.log('Video source saved:', videoSource);
    }

    loadVideoSource() {
        try {
            const saved = localStorage.getItem('mviz_video_source');
            if (saved) {
                const videoSource = JSON.parse(saved);
                console.log('Video source loaded:', videoSource);
                return videoSource;
            }
        } catch (e) {
            console.error('Error loading video source:', e);
        }
        return null;
    }

    updateVideoDropdownDisplay() {
        const deviceSelect = document.getElementById('videoDeviceSelect');
        if (deviceSelect) {
            // Force the dropdown to show the selected option text
            const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
            if (selectedOption) {
                console.log('Selected video source:', selectedOption.textContent);
            }
        }
        
        // Also update the drawer select
        const drawerSelect = document.getElementById('drawerVideoDeviceSelect');
        if (drawerSelect) {
            // Copy the updated options and value from the original
            drawerSelect.innerHTML = deviceSelect.innerHTML;
            drawerSelect.value = deviceSelect.value;
        }
    }

    updateVisualizationAspectRatio() {
        console.log('=== updateVisualizationAspectRatio called ===');
        console.log('matchVisualizationAspect:', this.matchVisualizationAspect);
        console.log('videoElement exists:', !!this.videoElement);
        console.log('audioMotion exists:', !!this.audioMotion);
        console.log('videoMode:', this.videoMode);

        if (!this.matchVisualizationAspect || !this.videoElement || !this.audioMotion) {
            console.log('Early return - missing required components');
            return;
        }

        try {
            // Get video dimensions
            const videoWidth = this.videoElement.videoWidth;
            const videoHeight = this.videoElement.videoHeight;
            
            console.log('Raw video dimensions:', videoWidth, 'x', videoHeight);
            console.log('Video readyState:', this.videoElement.readyState);
            console.log('Video currentTime:', this.videoElement.currentTime);
            
            if (!videoWidth || !videoHeight) {
                console.warn('Video dimensions not available yet - scheduling retry');
                // Try again in a bit
                setTimeout(() => this.updateVisualizationAspectRatio(), 500);
                return;
            }

            const videoAspect = videoWidth / videoHeight;
            console.log(`✓ Video aspect ratio: ${videoWidth}x${videoHeight} (${videoAspect.toFixed(3)})`);

            // Get current canvas dimensions
            const currentWidth = this.audioMotion.canvas.width;
            const currentHeight = this.audioMotion.canvas.height;
            const currentAspect = currentWidth / currentHeight;

            console.log(`✓ Current canvas aspect ratio: ${currentWidth}x${currentHeight} (${currentAspect.toFixed(3)})`);

            // Only resize if aspect ratios are significantly different (avoid tiny adjustments)
            const aspectDiff = Math.abs(videoAspect - currentAspect);
            console.log('Aspect ratio difference:', aspectDiff);
            
            if (aspectDiff < 0.01) {
                console.log('✓ Aspect ratios already match, no resize needed');
                return;
            }

            // Calculate new canvas dimensions maintaining current height
            const newWidth = Math.round(currentHeight * videoAspect);
            
            console.log(`🔄 Resizing visualization canvas: ${currentWidth}x${currentHeight} → ${newWidth}x${currentHeight}`);
            
            // Resize the AudioMotion canvas
            this.audioMotion.canvas.width = newWidth;
            this.audioMotion.canvas.height = currentHeight;
            
            console.log('Canvas resized, triggering AudioMotion handleResize...');
            
            // Trigger AudioMotion to handle the resize
            if (this.audioMotion.handleResize) {
                this.audioMotion.handleResize();
                console.log('✓ AudioMotion handleResize called');
            } else {
                console.log('⚠ AudioMotion handleResize not available, using fallback');
                // Fallback: manually trigger resize handling
                const container = document.getElementById('visualizer');
                if (container) {
                    container.style.width = newWidth + 'px';
                    container.style.height = currentHeight + 'px';
                    console.log('✓ Container resized manually');
                }
            }

            console.log('✅ Visualization canvas resized to match video aspect ratio');

        } catch (error) {
            console.error('❌ Error updating visualization aspect ratio:', error);
        }
    }

    restoreOriginalAspectRatio() {
        if (!this.audioMotion) return;

        try {
            // Get the container's natural dimensions
            const container = document.getElementById('visualizer');
            if (container) {
                const rect = container.getBoundingClientRect();
                const containerWidth = rect.width || 800;
                const containerHeight = rect.height || 400;

                console.log(`Restoring original canvas dimensions: ${containerWidth}x${containerHeight}`);

                this.audioMotion.canvas.width = containerWidth;
                this.audioMotion.canvas.height = containerHeight;

                if (this.audioMotion.handleResize) {
                    this.audioMotion.handleResize();
                }
            }
        } catch (error) {
            console.error('Error restoring original aspect ratio:', error);
        }
    }

    async connectVideoAudio() {
        try {
            if (!this.videoElement || !this.audioMotion || !this.audioMotion.audioCtx) {
                console.warn('Cannot connect video audio: missing video element or audio context');
                return;
            }

            // Disconnect any existing video audio connection
            this.disconnectVideoAudio();

            const audioCtx = this.audioMotion.audioCtx;
            
            // Resume audio context if needed
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            // Create audio source from video element
            this.videoAudioSource = audioCtx.createMediaElementSource(this.videoElement);
            
            // Create gain node for mute control
            this.videoAudioGain = audioCtx.createGain();
            
            // Set initial gain based on mute state
            this.videoAudioGain.gain.value = this.videoFileMuted ? 0 : 1;
            
            // Connect: videoElement -> audioSource -> gainNode -> destination
            this.videoAudioSource.connect(this.videoAudioGain);
            this.videoAudioGain.connect(audioCtx.destination);
            
            // Connect to analyzer for visualization
            // Note: This will work alongside playlist audio if both are playing
            this.videoAudioGain.connect(this.audioMotion.analyser);
            
            // Connect to stereo analyzer if available
            if (this.audioMotion.analyserRight && 
                (this.audioMotion.channelLayout === 'dual-vertical' || this.audioMotion.channelLayout === 'dual-horizontal')) {
                // For stereo, we need a splitter
                if (this.audioMotion.splitter) {
                    this.videoAudioGain.connect(this.audioMotion.splitter);
                    this.audioMotion.splitter.connect(this.audioMotion.analyser, 0);
                    this.audioMotion.splitter.connect(this.audioMotion.analyserRight, 1);
                } else {
                    this.videoAudioGain.connect(this.audioMotion.analyser);
                }
            }
            
            console.log('Video audio connected to AudioMotion with gain control');
            
        } catch (error) {
            console.error('Failed to connect video audio:', error);
        }
    }

    disconnectVideoAudio() {
        try {
            if (this.videoAudioSource) {
                this.videoAudioSource.disconnect();
                this.videoAudioSource = null;
            }
            if (this.videoAudioGain) {
                this.videoAudioGain.disconnect();
                this.videoAudioGain = null;
            }
            console.log('Video audio disconnected');
        } catch (error) {
            console.error('Error disconnecting video audio:', error);
        }
    }

    initializePlaylistUI() {
        // Prevent clicks inside embedded playlist from bubbling up
        const playlistDropdown = document.getElementById('playlistDropdown');
        if (playlistDropdown) {
            playlistDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Click inside embedded playlist - preventing bubble');
            });
        }
        
        // Close button handler - try to find it, if not found, retry later
        this.initializeCloseButtonHandler();
        
        // Playlist scan button
        const scanBtn = document.getElementById('playlistScanBtn');
        if (scanBtn) {
            // Remove any existing listeners to prevent duplicates
            const newScanBtn = scanBtn.cloneNode(true);
            scanBtn.parentNode.replaceChild(newScanBtn, scanBtn);
            
            newScanBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Playlist scan button clicked');
                if (this.playlistManager) {
                    // Use setTimeout to ensure user activation is preserved
                    setTimeout(() => {
                        this.playlistManager.scanFolder();
                    }, 0);
                }
            });
        }
        
        // Playlist import button
        const importBtn = document.getElementById('playlistImportBtn');
        const importInput = document.getElementById('playlistImportInput');
        if (importBtn && importInput) {
            // Remove any existing listeners to prevent duplicates
            const newImportBtn = importBtn.cloneNode(true);
            importBtn.parentNode.replaceChild(newImportBtn, importBtn);
            
            newImportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Playlist import button clicked');
                importInput.click();
            });
            
            // Only attach the change listener once
            importInput.removeEventListener('change', this._importHandler);
            this._importHandler = (e) => {
                const file = e.target.files?.[0];
                if (file && this.playlistManager) {
                    this.playlistManager.importPlaylist(file);
                }
                e.target.value = ''; // Reset input
            };
            importInput.addEventListener('change', this._importHandler);
        }
        
        // Playlist export button
        const exportBtn = document.getElementById('playlistExportBtn');
        if (exportBtn) {
            // Remove any existing listeners to prevent duplicates
            const newExportBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
            
            newExportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Playlist export button clicked');
                if (this.playlistManager) {
                    this.playlistManager.exportPlaylist();
                }
            });
        }
        
        // Playlist sort button
        const sortBtn = document.getElementById('playlistSortBtn');
        if (sortBtn) {
            // Remove any existing listeners to prevent duplicates
            const newSortBtn = sortBtn.cloneNode(true);
            sortBtn.parentNode.replaceChild(newSortBtn, sortBtn);
            
            newSortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Playlist sort button clicked');
                if (this.playlistManager) {
                    this.playlistManager.resetToAlphabetical();
                }
            });
        }
        
        // Progress cancel button
        const cancelBtn = document.getElementById('progressCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Progress cancel button clicked');
                if (this.playlistManager) {
                    this.playlistManager.cancelScan();
                }
            });
        }
        
        // AI Autopilot button
        const aiAutopilotBtn = document.getElementById('aiAutopilotBtn');
        if (aiAutopilotBtn) {
            // Remove any existing listeners to prevent duplicates
            const newAIBtn = aiAutopilotBtn.cloneNode(true);
            aiAutopilotBtn.parentNode.replaceChild(newAIBtn, aiAutopilotBtn);
            
            newAIBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('AI Autopilot button clicked');
                if (this.aiAutopilot) {
                    if (this.aiAutopilot.isActive) {
                        this.aiAutopilot.deactivate();
                    } else {
                        this.aiAutopilot.activate();
                    }
                }
            });
        }

        // Footer Autopilot button
        const footerAutopilotBtn = document.getElementById('footerAutopilotBtn');
        if (footerAutopilotBtn) {
            // Initialize button state
            if (this.aiAutopilot) {
                this.aiAutopilot.updateFooterAutopilotButton();
            }
            
            footerAutopilotBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Footer Autopilot button clicked');
                if (this.aiAutopilot) {
                    if (this.aiAutopilot.isActive) {
                        this.aiAutopilot.deactivate();
                    } else {
                        this.aiAutopilot.activate();
                    }
                    // The updateUI() method will be called by activate/deactivate, which will update both buttons
                }
            });
        }
        
        // AI Autopilot settings button
        const aiAutopilotSettingsBtn = document.getElementById('aiAutopilotSettingsBtn');
        if (aiAutopilotSettingsBtn) {
            aiAutopilotSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('AI Autopilot settings button clicked');
                const panel = document.getElementById('aiAutopilotSettingsPanel');
                if (panel) {
                    const isVisible = panel.style.display !== 'none';
                    panel.style.display = isVisible ? 'none' : 'block';
                    console.log('Settings panel', isVisible ? 'closed' : 'opened');
                } else {
                    console.error('AI Autopilot settings panel not found');
                }
            });
        }
        
        // AI Autopilot settings panel close button
        const aiSettingsClose = document.getElementById('aiAutopilotSettingsClose');
        if (aiSettingsClose) {
            aiSettingsClose.addEventListener('click', () => {
                const panel = document.getElementById('aiAutopilotSettingsPanel');
                if (panel) panel.style.display = 'none';
            });
        }
        
        // Scope buttons
        document.querySelectorAll('.scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scope = e.target.dataset.scope;
                if (this.aiAutopilot) {
                    this.aiAutopilot.scope = scope;
                    console.log(`🎯 Autopilot scope set to: ${scope}`);
                    
                    // Update button states
                    document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // If scope is specific (radial, energy), immediately switch to that mode
                    if (scope === 'radial' || scope === 'energy') {
                        const targetMode = scope === 'radial' ? 4 : 5;
                        console.log(`🎯 Scope change: Immediately switching to mode ${targetMode} (${scope})`);
                        this.setVisualizationMode(targetMode);
                        
                        // Force a decision engine update to respect the new scope
                        setTimeout(() => {
                            if (this.aiAutopilot && this.aiAutopilot.decisionEngine) {
                                console.log(`🎯 Scope change: Forcing decision engine update for scope ${scope}`);
                                this.aiAutopilot.decisionEngine.lastDecision = 0; // Reset decision timer
                            }
                        }, 100);
                    }
                }
            });
        });
        
        // Auto color schemes toggle
        const autoColorBtn = document.getElementById('autoColorSchemesBtn');
        if (autoColorBtn) {
            autoColorBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    this.aiAutopilot.autoColorSchemes = !this.aiAutopilot.autoColorSchemes;
                    const isOn = this.aiAutopilot.autoColorSchemes;
                    e.target.textContent = `Auto Color Schemes: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                    console.log(`🎨 Auto color schemes: ${isOn ? 'enabled' : 'disabled'}`);
                }
            });
        }
        
        // Timing buttons
        document.querySelectorAll('.timing-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timing = e.target.dataset.timing;
                if (this.aiAutopilot) {
                    this.aiAutopilot.changeTiming = timing;
                    console.log(`⏱️ Change timing set to: ${timing}`);
                    
                    // Update button states
                    document.querySelectorAll('.timing-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });
        
        // Sensitivity buttons
        document.querySelectorAll('.sensitivity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sensitivity = e.target.dataset.sensitivity;
                if (this.aiAutopilot) {
                    this.aiAutopilot.sensitivity = sensitivity;
                    console.log(`🎚️ Sensitivity set to: ${sensitivity}`);
                    
                    // Update button states
                    document.querySelectorAll('.sensitivity-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });
        
        // Genre selection buttons
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const genre = e.target.dataset.genre;
                if (this.aiAutopilot) {
                    if (genre === 'auto') {
                        this.aiAutopilot.manualGenre = null;
                        console.log(`🎵 Genre detection set to: Auto`);
                    } else {
                        this.aiAutopilot.manualGenre = genre;
                        this.aiAutopilot.currentGenre = genre;
                        this.aiAutopilot.genreConfidence = 1.0;
                        console.log(`🎵 Manual genre set to: ${genre}`);
                    }
                    
                    // Update button states
                    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Update display
                    this.updateGenreDisplay();
                }
            });
        });
        
        // Parameter control toggle
        const paramControlBtn = document.getElementById('enableParameterControlBtn');
        if (paramControlBtn) {
            paramControlBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    this.aiAutopilot.parameterControlEnabled = !this.aiAutopilot.parameterControlEnabled;
                    const isOn = this.aiAutopilot.parameterControlEnabled;
                    e.target.textContent = `Parameter Control: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                    console.log(`🎛️ Parameter control: ${isOn ? 'enabled' : 'disabled'}`);
                }
            });
        }
        
        // Learning controls
        const enableLearningBtn = document.getElementById('enableLearningBtn');
        if (enableLearningBtn) {
            enableLearningBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    this.aiAutopilot.learningEnabled = !this.aiAutopilot.learningEnabled;
                    const isOn = this.aiAutopilot.learningEnabled;
                    e.target.textContent = `Learning: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                    console.log(`🧠 Pattern learning: ${isOn ? 'enabled' : 'disabled'}`);
                }
            });
        }
        
        // Reset learning data
        const resetLearningBtn = document.getElementById('resetLearningBtn');
        if (resetLearningBtn) {
            resetLearningBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot && confirm('Are you sure you want to reset all learning data? This cannot be undone.')) {
                    this.aiAutopilot.patternLearning.patterns = {};
                    this.aiAutopilot.patternLearning.userBehavior = {};
                    this.aiAutopilot.patternLearning.performanceMetrics = {};
                    this.aiAutopilot.patternLearning.saveLearningData();
                    this.updateLearningAnalytics();
                    console.log('🧠 Learning data reset');
                }
            });
        }
        
        // User feedback buttons
        const thumbsUpBtn = document.getElementById('thumbsUpBtn');
        if (thumbsUpBtn) {
            thumbsUpBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    const context = {
                        genre: this.aiAutopilot.currentGenre,
                        energy: this.aiAutopilot.audioAnalyzer.getEnergy(),
                        tempo: this.aiAutopilot.audioAnalyzer.getTempo()
                    };
                    this.aiAutopilot.parameterController.recordUserFeedback('positive', context);
                    this.updateFeedbackStats();
                    console.log('👍 User liked current settings');
                }
            });
        }
        
        const thumbsDownBtn = document.getElementById('thumbsDownBtn');
        if (thumbsDownBtn) {
            thumbsDownBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    const context = {
                        genre: this.aiAutopilot.currentGenre,
                        energy: this.aiAutopilot.audioAnalyzer.getEnergy(),
                        tempo: this.aiAutopilot.audioAnalyzer.getTempo()
                    };
                    this.aiAutopilot.parameterController.recordUserFeedback('negative', context);
                    this.updateFeedbackStats();
                    console.log('👎 User disliked current settings');
                }
            });
        }
        
        // Adaptive tuning controls
        const enableAdaptiveTuningBtn = document.getElementById('enableAdaptiveTuningBtn');
        if (enableAdaptiveTuningBtn) {
            enableAdaptiveTuningBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    this.aiAutopilot.adaptiveTuningEnabled = !this.aiAutopilot.adaptiveTuningEnabled;
                    const isOn = this.aiAutopilot.adaptiveTuningEnabled;
                    e.target.textContent = `Adaptive Tuning: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                    console.log(`🎯 Adaptive tuning: ${isOn ? 'enabled' : 'disabled'}`);
                }
            });
        }
        
        const forceOptimizationBtn = document.getElementById('forceOptimizationBtn');
        if (forceOptimizationBtn) {
            forceOptimizationBtn.addEventListener('click', (e) => {
                console.log('🎯 Force Optimization button clicked');
                if (this.aiAutopilot) {
                    console.log('🎯 AI Autopilot exists:', !!this.aiAutopilot);
                    if (this.aiAutopilot.adaptiveTuning) {
                        console.log('🎯 Adaptive Tuning exists:', !!this.aiAutopilot.adaptiveTuning);
                        console.log('🎯 Performance window length:', this.aiAutopilot.adaptiveTuning.performanceWindow.length);
                        
                        // Force optimization regardless of normal conditions
                        this.aiAutopilot.adaptiveTuning.optimizeParameters(true);
                        console.log('🎯 Forced parameter optimization completed');
                    } else {
                        console.error('🎯 Adaptive Tuning not available');
                    }
                } else {
                    console.error('🎯 AI Autopilot not available');
                }
            });
        } else {
            console.error('🎯 Force Optimization button not found');
        }
        
        // Predictive behavior controls
        const enablePredictiveBehaviorBtn = document.getElementById('enablePredictiveBehaviorBtn');
        if (enablePredictiveBehaviorBtn) {
            enablePredictiveBehaviorBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    this.aiAutopilot.predictiveBehaviorEnabled = !this.aiAutopilot.predictiveBehaviorEnabled;
                    const isOn = this.aiAutopilot.predictiveBehaviorEnabled;
                    e.target.textContent = `Predictive Behavior: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                    console.log(`🎯 Predictive behavior: ${isOn ? 'enabled' : 'disabled'}`);
                }
            });
        }
        
        const testPredictionBtn = document.getElementById('testPredictionBtn');
        if (testPredictionBtn) {
            testPredictionBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot && this.aiAutopilot.predictiveBehavior) {
                    const audioFeatures = this.aiAutopilot.audioAnalyzer.getCurrentFeatures();
                    const currentParams = this.aiAutopilot.getCurrentParameters();
                    const predictions = this.aiAutopilot.predictiveBehavior.predictOptimalActions(
                        audioFeatures, 
                        this.aiAutopilot.visualizer.currentMode, 
                        currentParams
                    );
                    
                    if (predictions) {
                        console.log('🎯 Test prediction result:', predictions);
                        alert(`Prediction: ${predictions.modeChange?.reason || 'No mode change'}\nConfidence: ${Math.round(predictions.confidence * 100)}%`);
                    } else {
                        console.log('🎯 No prediction available (low confidence)');
                        alert('No prediction available - confidence too low');
                    }
                }
            });
        }
        
        // Multi-layered intelligence controls
        const enableMultiLayeredIntelligenceBtn = document.getElementById('enableMultiLayeredIntelligenceBtn');
        if (enableMultiLayeredIntelligenceBtn) {
            enableMultiLayeredIntelligenceBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    this.aiAutopilot.multiLayeredIntelligenceEnabled = !this.aiAutopilot.multiLayeredIntelligenceEnabled;
                    const isOn = this.aiAutopilot.multiLayeredIntelligenceEnabled;
                    e.target.textContent = `Multi-layered Intelligence: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                    console.log(`🧠 Multi-layered intelligence: ${isOn ? 'enabled' : 'disabled'}`);
                }
            });
        }
        
        const testIntelligenceBtn = document.getElementById('testIntelligenceBtn');
        if (testIntelligenceBtn) {
            testIntelligenceBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot && this.aiAutopilot.multiLayeredIntelligence) {
                    const audioFeatures = this.aiAutopilot.audioAnalyzer.getCurrentFeatures();
                    const currentParams = this.aiAutopilot.getCurrentParameters();
                    const decision = this.aiAutopilot.multiLayeredIntelligence.makeIntelligentDecision(
                        audioFeatures, 
                        this.aiAutopilot.visualizer.currentMode, 
                        currentParams
                    );
                    
                    if (decision) {
                        console.log('🧠 Test intelligence result:', decision);
                        alert(`Intelligence Decision: ${decision.reason}\nAction: ${decision.action}\nConfidence: ${Math.round(decision.confidence * 100)}%\nSource: ${decision.sourceLayer}`);
                    } else {
                        console.log('🧠 No intelligence decision available');
                        alert('No intelligence decision available');
                    }
                }
            });
        }
        
        // Learning Analytics Dashboard controls
        const learningAnalyticsBtn = document.getElementById('learningAnalyticsBtn');
        if (learningAnalyticsBtn) {
            console.log('Learning Analytics button found, adding event listener');
            learningAnalyticsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Learning Analytics button clicked');
                this.openLearningAnalyticsDashboard();
            });
        } else {
            console.error('Learning Analytics button not found!');
        }

        const analyticsCloseBtn = document.getElementById('analyticsCloseBtn');
        if (analyticsCloseBtn) {
            analyticsCloseBtn.addEventListener('click', () => {
                this.closeLearningAnalyticsDashboard();
            });
        }

        const updateFrequencySelect = document.getElementById('updateFrequency');
        if (updateFrequencySelect) {
            updateFrequencySelect.addEventListener('change', (e) => {
                this.setAnalyticsUpdateFrequency(parseInt(e.target.value));
            });
        }

        const exportLearningDataBtn = document.getElementById('exportLearningDataBtn');
        if (exportLearningDataBtn) {
            exportLearningDataBtn.addEventListener('click', () => {
                this.exportLearningData();
            });
        }

        const resetLearningDataBtn = document.getElementById('resetLearningDataBtn');
        if (resetLearningDataBtn) {
            resetLearningDataBtn.addEventListener('click', () => {
                this.resetAllLearningData();
            });
        }

        // Initialize analytics update frequency
        this.analyticsUpdateInterval = 5000; // Default 5 seconds
        this.analyticsUpdateTimer = null;

        // Update learning analytics periodically
        this.startAnalyticsUpdates();
        
        // Video effects toggle
        const videoEffectsBtn = document.getElementById('enableVideoEffectsBtn');
        if (videoEffectsBtn) {
            videoEffectsBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    this.aiAutopilot.videoEffectsEnabled = !this.aiAutopilot.videoEffectsEnabled;
                    const isOn = this.aiAutopilot.videoEffectsEnabled;
                    e.target.textContent = `Video Effects: ${isOn ? 'On' : 'Off'}`;
                    e.target.classList.toggle('active', isOn);
                    console.log(`🎬 Video effects: ${isOn ? 'enabled' : 'disabled'}`);
                }
            });
        }
        
        
        // Test parameter control button
        const testParamBtn = document.getElementById('testParameterControlBtn');
        if (testParamBtn) {
            testParamBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot) {
                    this.aiAutopilot.testParameterControl();
                    console.log('🧪 Test parameter control triggered');
                }
            });
        }
        
        // Test parameters button
        const testParametersBtn = document.getElementById('testParametersBtn');
        if (testParametersBtn) {
            testParametersBtn.addEventListener('click', (e) => {
                if (this.aiAutopilot && this.aiAutopilot.multiLayeredIntelligence) {
                    console.log('🧪 Testing parameter changes...');
                    
                    // Test dramatic parameter changes
                    const testParams = {
                        linearBoost: 5.0,
                        gradient: 0.9,
                        fillAlpha: 0.8,
                        volume: 3.0,
                        smoothing: 0.2,
                        peakHoldTime: 200
                    };
                    
                    this.aiAutopilot.multiLayeredIntelligence.applyParameterAdjustments(testParams);
                    
                    // Test video effects
                    if (this.aiAutopilot.videoEffectsEnabled) {
                        const testVideoParams = {
                            colorEffects: {
                                brightness: 1.5,
                                contrast: 1.3,
                                saturation: 1.4,
                                hue: 45
                            }
                        };
                        this.aiAutopilot.multiLayeredIntelligence.applyVideoAdjustments(testVideoParams);
                    }
                    
                    alert('Test parameters applied! Check console for details.');
                }
            });
        }
    }
    
    updateGenreDisplay() {
        if (this.aiAutopilot) {
            this.aiAutopilot.updateGenreDisplay();
        }
    }
    
    updateLearningAnalytics() {
        if (!this.aiAutopilot || !this.aiAutopilot.patternLearning) return;
        
        const analytics = this.aiAutopilot.patternLearning.getLearningAnalytics();
        
        // Update learning progress display
        const progressDisplay = document.getElementById('learningProgressDisplay');
        if (progressDisplay) {
            const progressPercent = Math.round(analytics.learningProgress * 100);
            progressDisplay.textContent = `Learning: ${progressPercent}%`;
        }
        
        // Update pattern count display
        const patternDisplay = document.getElementById('patternCountDisplay');
        if (patternDisplay) {
            patternDisplay.textContent = `Patterns: ${analytics.patterns.total}`;
        }
        
        // Update success rate display
        const successDisplay = document.getElementById('successRateDisplay');
        if (successDisplay) {
            const successPercent = Math.round(analytics.patterns.avgSuccessRate * 100);
            successDisplay.textContent = `Success Rate: ${successPercent}%`;
        }
    }
    
    updateFeedbackStats() {
        if (!this.aiAutopilot || !this.aiAutopilot.parameterController) return;
        
        const stats = this.aiAutopilot.parameterController.getFeedbackStats();
        
        // Update feedback stats display
        const feedbackDisplay = document.getElementById('feedbackStatsDisplay');
        if (feedbackDisplay) {
            const satisfactionPercent = Math.round(stats.satisfaction * 100);
            feedbackDisplay.textContent = `Satisfaction: ${satisfactionPercent}% (${stats.positive}/${stats.total})`;
        }
    }
    
    updateAdaptiveTuningAnalytics() {
        if (!this.aiAutopilot || !this.aiAutopilot.adaptiveTuning) return;
        
        const analytics = this.aiAutopilot.adaptiveTuning.getOptimizationAnalytics();
        
        // Update performance display
        const performanceDisplay = document.getElementById('performanceDisplay');
        if (performanceDisplay) {
            const performancePercent = Math.round(analytics.currentPerformance * 100);
            performanceDisplay.textContent = `Performance: ${performancePercent}%`;
        }
        
        // Update optimization count display
        const optimizationDisplay = document.getElementById('optimizationCountDisplay');
        if (optimizationDisplay) {
            optimizationDisplay.textContent = `Optimizations: ${analytics.totalOptimizations}`;
        }
        
        // Update performance trend display
        const trendDisplay = document.getElementById('performanceTrendDisplay');
        if (trendDisplay) {
            const trendText = analytics.performanceTrend.charAt(0).toUpperCase() + analytics.performanceTrend.slice(1);
            trendDisplay.textContent = `Trend: ${trendText}`;
        }
    }

    updatePredictiveBehaviorAnalytics() {
        if (!this.aiAutopilot || !this.aiAutopilot.predictiveBehavior) return;
        
        const analytics = this.aiAutopilot.predictiveBehavior.getPredictionAnalytics();
        
        // Update prediction count display
        const predictionCountDisplay = document.getElementById('predictionCountDisplay');
        if (predictionCountDisplay) {
            predictionCountDisplay.textContent = `Predictions: ${analytics.totalPredictions}`;
        }
        
        // Update prediction accuracy display
        const predictionAccuracyDisplay = document.getElementById('predictionAccuracyDisplay');
        if (predictionAccuracyDisplay) {
            predictionAccuracyDisplay.textContent = `Accuracy: ${analytics.accuracy}%`;
        }
        
        // Update prediction confidence display
        const predictionConfidenceDisplay = document.getElementById('predictionConfidenceDisplay');
        if (predictionConfidenceDisplay) {
            predictionConfidenceDisplay.textContent = `Confidence: ${analytics.confidence}%`;
        }
    }

    updateMultiLayeredIntelligenceAnalytics() {
        if (!this.aiAutopilot || !this.aiAutopilot.multiLayeredIntelligence) return;
        
        const analytics = this.aiAutopilot.multiLayeredIntelligence.getIntelligenceAnalytics();
        
        // Update intelligence decisions display
        const intelligenceDecisionsDisplay = document.getElementById('intelligenceDecisionsDisplay');
        if (intelligenceDecisionsDisplay) {
            intelligenceDecisionsDisplay.textContent = `Decisions: ${analytics.totalDecisions}`;
        }
        
        // Update meta-learning display
        const metaLearningDisplay = document.getElementById('metaLearningDisplay');
        if (metaLearningDisplay) {
            metaLearningDisplay.textContent = `Meta-Learning: ${analytics.metaLearningProgress.progress}%`;
        }
        
        // Update layer performance display
        const layerPerformanceDisplay = document.getElementById('layerPerformanceDisplay');
        if (layerPerformanceDisplay) {
            const layerCount = Object.keys(analytics.layerPerformance).length;
            const avgSuccessRate = layerCount > 0 ? 
                Object.values(analytics.layerPerformance).reduce((sum, layer) => sum + parseFloat(layer.successRate), 0) / layerCount : 0;
            
            let performanceText = 'Balanced';
            if (avgSuccessRate > 80) performanceText = 'Excellent';
            else if (avgSuccessRate > 60) performanceText = 'Good';
            else if (avgSuccessRate > 40) performanceText = 'Fair';
            else if (avgSuccessRate > 0) performanceText = 'Poor';
            
            layerPerformanceDisplay.textContent = `Performance: ${performanceText}`;
        }
    }

    // Learning Analytics Dashboard Methods
    openLearningAnalyticsDashboard() {
        console.log('Opening Learning Analytics Dashboard...');
        const modal = document.getElementById('learningAnalyticsModal');
        if (modal) {
            console.log('Modal found, setting display to flex');
            modal.style.display = 'flex';
            this.updateDashboardAnalytics();
            this.logActivity('Learning Analytics Dashboard opened');
        } else {
            console.error('Learning Analytics Modal not found!');
        }
    }


    closeLearningAnalyticsDashboard() {
        const modal = document.getElementById('learningAnalyticsModal');
        if (modal) {
            modal.style.display = 'none';
            this.logActivity('Learning Analytics Dashboard closed');
        }
    }

    setAnalyticsUpdateFrequency(interval) {
        this.analyticsUpdateInterval = interval;
        this.startAnalyticsUpdates();
        this.logActivity(`Analytics update frequency changed to ${interval/1000} seconds`);
    }

    startAnalyticsUpdates() {
        // Clear existing timer
        if (this.analyticsUpdateTimer) {
            clearInterval(this.analyticsUpdateTimer);
        }

        // Start new timer
        this.analyticsUpdateTimer = setInterval(() => {
            if (this.aiAutopilot) {
                this.updateLearningAnalytics();
                this.updateFeedbackStats();
                this.updateAdaptiveTuningAnalytics();
                this.updatePredictiveBehaviorAnalytics();
                this.updateMultiLayeredIntelligenceAnalytics();
                this.updateDashboardAnalytics();
            }
        }, this.analyticsUpdateInterval);
    }

    updateDashboardAnalytics() {
        if (!this.aiAutopilot) return;

        // Update Learning Progress
        const patternLearning = this.aiAutopilot.patternLearning;
        if (patternLearning) {
            const learningAnalytics = patternLearning.getLearningAnalytics();
            
            const patternCount = document.getElementById('dashboardPatternCount');
            if (patternCount) patternCount.textContent = learningAnalytics.patternCount;

            const successRate = document.getElementById('dashboardSuccessRate');
            if (successRate) successRate.textContent = `${learningAnalytics.successRate}%`;

            const learningProgress = document.getElementById('dashboardLearningProgress');
            if (learningProgress) learningProgress.textContent = `${learningAnalytics.learningProgress}%`;
        }

        // Update User Feedback
        const parameterController = this.aiAutopilot.parameterController;
        if (parameterController) {
            const feedbackStats = parameterController.getFeedbackStats();
            
            const totalFeedback = document.getElementById('dashboardTotalFeedback');
            if (totalFeedback) totalFeedback.textContent = feedbackStats.total;

            const satisfaction = document.getElementById('dashboardSatisfaction');
            if (satisfaction) satisfaction.textContent = `${Math.round(feedbackStats.satisfaction * 100)}%`;

            const positiveFeedback = document.getElementById('dashboardPositiveFeedback');
            if (positiveFeedback) positiveFeedback.textContent = feedbackStats.positive;
        }

        // Update Predictive Behavior
        const predictiveBehavior = this.aiAutopilot.predictiveBehavior;
        if (predictiveBehavior) {
            const predictionAnalytics = predictiveBehavior.getPredictionAnalytics();
            
            const predictions = document.getElementById('dashboardPredictions');
            if (predictions) predictions.textContent = predictionAnalytics.totalPredictions;

            const predictionAccuracy = document.getElementById('dashboardPredictionAccuracy');
            if (predictionAccuracy) predictionAccuracy.textContent = `${predictionAnalytics.accuracy}%`;

            const confidence = document.getElementById('dashboardConfidence');
            if (confidence) confidence.textContent = `${predictionAnalytics.confidence}%`;
        }

        // Update Adaptive Tuning
        const adaptiveTuning = this.aiAutopilot.adaptiveTuning;
        if (adaptiveTuning) {
            const tuningAnalytics = adaptiveTuning.getOptimizationAnalytics();
            
            const optimizations = document.getElementById('dashboardOptimizations');
            if (optimizations) optimizations.textContent = tuningAnalytics.totalOptimizations;

            const performance = document.getElementById('dashboardPerformance');
            if (performance) performance.textContent = `${Math.round(tuningAnalytics.currentPerformance * 100)}%`;

            const trend = document.getElementById('dashboardTrend');
            if (trend) {
                const trendText = tuningAnalytics.performanceTrend.charAt(0).toUpperCase() + tuningAnalytics.performanceTrend.slice(1);
                trend.textContent = trendText;
            }
        }
    }

    logActivity(message) {
        const activityLog = document.getElementById('activityLog');
        if (activityLog) {
            const timestamp = new Date().toLocaleTimeString();
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.textContent = `[${timestamp}] ${message}`;
            
            // Add to top of log
            activityLog.insertBefore(activityItem, activityLog.firstChild);
            
            // Keep only last 20 items
            while (activityLog.children.length > 20) {
                activityLog.removeChild(activityLog.lastChild);
            }
        }
    }

    exportLearningData() {
        if (!this.aiAutopilot) return;

        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                patternLearning: this.aiAutopilot.patternLearning ? this.aiAutopilot.patternLearning.getLearningAnalytics() : null,
                userFeedback: this.aiAutopilot.parameterController ? this.aiAutopilot.parameterController.getFeedbackStats() : null,
                predictiveBehavior: this.aiAutopilot.predictiveBehavior ? this.aiAutopilot.predictiveBehavior.getPredictionAnalytics() : null,
                adaptiveTuning: this.aiAutopilot.adaptiveTuning ? this.aiAutopilot.adaptiveTuning.getOptimizationAnalytics() : null
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `learning-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.logActivity('Learning data exported successfully');
        } catch (error) {
            console.error('Error exporting learning data:', error);
            this.logActivity('Error exporting learning data');
        }
    }

    resetAllLearningData() {
        if (!this.aiAutopilot) return;

        if (confirm('Are you sure you want to reset all learning data? This action cannot be undone.')) {
            try {
                // Reset pattern learning
                if (this.aiAutopilot.patternLearning) {
                    localStorage.removeItem('autopilot_ml_patterns');
                }

                // Reset user feedback
                if (this.aiAutopilot.parameterController) {
                    this.aiAutopilot.parameterController.feedbackHistory = [];
                    this.aiAutopilot.parameterController.userAdjustments = [];
                }

                // Reset predictive behavior
                if (this.aiAutopilot.predictiveBehavior) {
                    localStorage.removeItem('autopilot_predictions');
                }

                // Reset adaptive tuning
                if (this.aiAutopilot.adaptiveTuning) {
                    localStorage.removeItem('autopilot_adaptive_tuning');
                }

                // Reload the page to reset everything
                window.location.reload();
                this.logActivity('All learning data reset - page reloading');
            } catch (error) {
                console.error('Error resetting learning data:', error);
                this.logActivity('Error resetting learning data');
            }
        }
    }

    closePlaylistPanel() {
        // Playlist is now embedded - no close functionality needed
        console.log('Playlist is embedded - no close functionality needed');
    }

    updatePlaylistFromManager(playlist) {
        if (!playlist || !playlist.tracks) {
            console.warn('Invalid playlist provided to updatePlaylistFromManager');
            return;
        }
        
        // Clear current playing track when loading new playlist (unless preserving state)
        if (!this._preservePlayingState) {
            if (this.audio) {
                this.audio.pause();
                this.audio.src = '';
            }
            this.currentTrackIndex = 0;
            this.isPlaying = false;
        }
        
        // Convert PlaylistManager format to visualizer format
        this.playlist = playlist.tracks.map((track, index) => {
            const visualizerTrack = {
                name: track.title,
                url: track.url,
                image: track.artwork,
                artist: track.artist,
                album: track.album,
                duration: track.duration
            };
            
            // Debug URL validity
            if (track.url) {
                console.log(`Track "${track.title}" has URL: ${track.url.substring(0, 50)}...`);
            } else {
                console.warn(`Track "${track.title}" has no URL - needs rescan`);
            }
            
            return visualizerTrack;
        });
        
        // Update current track index if needed
        if (this.currentTrackIndex >= this.playlist.length) {
            this.currentTrackIndex = 0;
        }
        
        // If a track is currently playing, find its new index after playlist update
        if (this.audio && this.audio.src) {
            const currentUrl = this.audio.src;
            const newIndex = this.playlist.findIndex(track => track.url === currentUrl);
            if (newIndex >= 0 && newIndex !== this.currentTrackIndex) {
                console.log(`Updating current track index from ${this.currentTrackIndex} to ${newIndex} after playlist update`);
                this.currentTrackIndex = newIndex;
            }
        }
        
        // Update UI
        this.updatePlaylistDropdown();
        this.updateTrackInfo();
        
        // Update panel display if it exists
        if (this.currentPlaylistPanel) {
            this.updatePlaylistPanelDisplay(this.currentPlaylistPanel);
        }
        
        console.log(`✅ Visualizer playlist updated with ${this.playlist.length} tracks`);
        
        // Debug: Check if any tracks have valid URLs and clear track display if needed
        const playableTracks = this.playlist.filter(t => t.url && t.url.startsWith('blob:'));
        if (playableTracks.length === 0) {
            // Update track title to show no track loaded
            const trackTitle = document.getElementById('trackTitle');
            if (trackTitle) {
                trackTitle.textContent = 'No track loaded';
            }
        }
        console.log(`Playable tracks: ${playableTracks.length}/${this.playlist.length}`);
    }
    
    playTrackById(trackId) {
        console.log('=== playTrackById called ===');
        console.log('trackId:', trackId);
        console.log('playlistManager exists:', !!this.playlistManager);
        
        if (!this.playlistManager) {
            console.error('PlaylistManager not available');
            return;
        }
        
        const track = this.playlistManager.findTrackById(trackId);
        console.log('Found track:', track ? `${track.title} by ${track.artist}` : 'null');
        
        if (!track) {
            console.error('Track not found for ID:', trackId);
            return;
        }
        
        // Check if track needs rescanning
        if (track._needsRescan || !track.url) {
            this.showError('Track needs to be rescanned. Please use "Add Folder" to rescan your music library.');
            return;
        }
        
        // Find index in current playlist
        console.log('Current playlist length:', this.playlist?.length || 0);
        console.log('Looking for URL:', track.url);
        
        const index = this.playlist.findIndex(t => t.url === track.url);
        console.log('Found index:', index);
        
        if (index >= 0) {
            console.log(`Playing track at index ${index}: ${track.title}`);
            // Use selectTrack to load the track, then force playback
            this.selectTrack(index).then(() => {
                console.log('Track selected, starting playback...');
                this.play(); // Force playback to start
            }).catch(error => {
                console.error('Error selecting/playing track:', error);
            });
        } else {
            console.error('Track URL not found in visualizer playlist');
            console.log('Available URLs:', this.playlist.map(t => t.url));
        }
    }

    initializeCloseButtonHandler() {
        // Close button removed - playlist is now embedded in sidebar
        console.log('Playlist is embedded - no close button handler needed');
    }

    async startVideoInput(deviceId) {
        try { // Check if we're switching sources
            const isSourceSwitch = this.videoElement && this.videoStream;

            if (isSourceSwitch) { // Store current opacity for smooth transition
                const currentOpacity = this.videoElement.style.opacity || this.videoOpacity;

                // Start fade out
                this.videoElement.style.transition = `opacity 0.5s linear`;
                this.videoElement.style.opacity = '0';

                // Wait for fade out to complete
                await new Promise(resolve => setTimeout(resolve, 500));

                // Stop the old stream without removing elements
                if (this.videoStream) {
                    this.videoStream.getTracks().forEach(track => {
                        track.stop();
                        console.log('Stopped video track:', track.label);
                    });
                    this.videoStream = null;
                }

                // Clear the video source but keep the element
                if (this.videoElement) {
                    this.videoElement.srcObject = null;
                this.videoElement.src = '';
                }
                if (this.captureVideoElement) {
                    this.captureVideoElement.srcObject = null;
                }
            } else { // Normal stop for initial setup
                this.stopVideoInput(false);
            }

            // Get device info to check if it's a Continuity Camera
            let isContinuityCamera = false;
            if (deviceId && this.availableVideoDevices) {
                const device = this.availableVideoDevices.find(d => d.deviceId === deviceId);
                if (device && device.label) {
                    isContinuityCamera = device.label.toLowerCase().includes('iphone') || 
                                       device.label.toLowerCase().includes('ipad') ||
                                       device.label.toLowerCase().includes('continuity');
                }
            }

            // Determine optimal resolution
            const constraints = {
                video: {
                    deviceId: deviceId ? {
                        exact: deviceId
                    } : undefined,
                    width: {
                        ideal: isContinuityCamera ? 1920 : 3840,  // Continuity Camera works better at 1080p
                        max: isContinuityCamera ? 1920 : 3840
                    },
                    height: {
                        ideal: isContinuityCamera ? 1080 : 2160,
                        max: isContinuityCamera ? 1080 : 2160
                    },
                    frameRate: {
                        ideal: 30
                    }
                }
            };

            // Try requested resolution, with appropriate fallbacks
            try {
                this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                if (!isContinuityCamera) {
                console.log('4K not available, trying 1080p');
                constraints.video.width = {
                    ideal: 1920
                };
                constraints.video.height = {
                    ideal: 1080
                };
                    try {
                        this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                    } catch (e2) {
                        // Final fallback - let browser choose best resolution
                        console.log('1080p not available, using default resolution');
                        delete constraints.video.width;
                        delete constraints.video.height;
                this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                    }
                } else {
                    // For Continuity Camera, try lower resolution if 1080p fails
                    console.log('Continuity Camera: trying 720p');
                    constraints.video.width = { ideal: 1280 };
                    constraints.video.height = { ideal: 720 };
                    try {
                        this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                    } catch (e2) {
                        // Final fallback for Continuity Camera
                        console.log('Continuity Camera: using default resolution');
                        delete constraints.video.width;
                        delete constraints.video.height;
                        this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                    }
                }
            }

            // Get container reference
            const container = document.getElementById('visualizationContainer');
            const visualizer = document.getElementById('visualizer');

            // Create backdrop with current background color behind video (only if not source switch)
            if (!document.getElementById('videoBackdrop')) {
                const backdrop = document.createElement('div');
                backdrop.id = 'videoBackdrop';
                backdrop.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${
                    this.backgroundColor
                };
            z-index: 0;
        `;
                container.insertBefore(backdrop, container.firstChild);
            }

            // Create or reuse DISPLAY video element (with filters)
            if (!this.videoElement) {
                this.videoElement = document.createElement('video');
                this.videoElement.id = 'bgVideo';
                this.videoElement.muted = true;
                this.videoElement.playsInline = true;
                this.videoElement.autoplay = true;

                // Critical: Set proper z-index and positioning
                this.videoElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 1;
            opacity: 0;
            transition: opacity ${
                    this.videoFadeTime
                }s linear;
            pointer-events: none;
        `;

                // Insert video after backdrop but before visualizer
                const backdrop = document.getElementById('videoBackdrop');
                container.insertBefore(this.videoElement, backdrop.nextSibling);
            }

            if (!this.captureVideoElement) {
                this.captureVideoElement = document.createElement('video');
                this.captureVideoElement.id = 'bgVideoCaptureClean';
                this.captureVideoElement.muted = true;
                this.captureVideoElement.playsInline = true;
                this.captureVideoElement.autoplay = true;

                // Detect actual camera stream properties
                this.captureVideoElement.onloadedmetadata = () => {
                    this.detectCameraStreamInfo();
                };
                this.captureVideoElement.style.cssText = `
    position: absolute;
    top: -9999px;
    left: -9999px;
    width: 1px;
    height: 1px;
    visibility: hidden;
    pointer-events: none;
    filter: none !important; /* Force no filters */
    opacity: 1 !important; /* Force full opacity */
    transform: none !important; /* Force no transform */
`;
                document.body.appendChild(this.captureVideoElement);
            }

            // Ensure video is transparent before setting new source
            this.videoElement.style.opacity = '0';

            // Make all relevant elements transparent (only if not already done)
            if (! container.classList.contains('video-active')) {
                const mainArea = document.querySelector('.main-area');

                // Add class for CSS rules
                container.classList.add('video-active');

                // Force transparent backgrounds
                container.style.backgroundColor = 'transparent';
                mainArea.style.backgroundColor = 'transparent';
                visualizer.style.backgroundColor = 'transparent';

                // Ensure visualizer has proper positioning
                visualizer.style.position = 'absolute';
                visualizer.style.zIndex = '1';

                // Ensure canvas itself is transparent
                if (this.audioMotion && this.audioMotion.canvas) {
                    this.audioMotion.canvas.style.background = 'transparent';
                    this.audioMotion.canvas.style.backgroundColor = 'transparent';

                    // Set z-index to ensure canvas is above video layers
                    this.audioMotion.canvas.style.position = 'absolute';
                    this.audioMotion.canvas.style.zIndex = '3';
                }

                // Force the AudioMotion background to be transparent
                if (this.audioMotion) { // Store original background color
                    this.originalBackgroundColor = this.backgroundColor;

                    // Set transparent background in AudioMotion
                    this.audioMotion.backgroundColor = 'transparent';
                    this.audioMotion.showBgColor = false;

                    // Force a redraw
                    if (this.audioMotion.ctx) {
                        this.audioMotion.ctx.clearRect(0, 0, this.audioMotion.canvas.width, this.audioMotion.canvas.height);
                    }
                }
            }

            // Apply settings TO BOTH VIDEO ELEMENTS
            this.videoElement.srcObject = this.videoStream;
            this.captureVideoElement.srcObject = this.videoStream;

            // Add stream detection to main video element too
            this.videoElement.onloadedmetadata = () => {
                this.detectCameraStreamInfo();
            };

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                let resolved = false;

                const handleReady = () => {
                    if (! resolved) {
                        resolved = true;
                        this.videoElement.play().then(() => { // Also ensure capture video is playing
                            return this.captureVideoElement.play();
                        }).then(() => { // Apply filters ONLY TO DISPLAY VIDEO
                            this.applyVideoFilters();
                            resolve();
                        }).catch(reject);
                    }
                };

                this.videoElement.onloadedmetadata = handleReady;
                this.videoElement.onerror = reject;

                // Timeout after 5 seconds
                setTimeout(() => {
                    if (! resolved) {
                        reject(new Error('Video load timeout'));
                    }
                }, 5000);
            });

            // Get actual video dimensions
            const settings = this.videoStream.getVideoTracks()[0].getSettings();
            console.log(`Video started: ${
                settings.width
            }x${
                settings.height
            } @ ${
                settings.frameRate
            }fps`);

            this.updateDisplayFilters();

            // Update visualization aspect ratio to match video
            if (this.matchVisualizationAspect) {
                // Small delay to ensure video dimensions are available
                setTimeout(() => this.updateVisualizationAspectRatio(), 200);
            }

            // Smooth fade in after video is fully ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Fade in with proper transition
            this.videoElement.style.transition = `opacity ${
                isSourceSwitch ? 1 : this.videoFadeTime
            }s linear`;
            this.videoElement.style.opacity = this.videoOpacity.toString();

            // Update UI
            this.videoMode = 'camera';
            this.currentVideoDeviceId = deviceId;
            this.updateVideoToggleState();
            
            // Save video source to localStorage
            this.saveVideoSource('camera', deviceId);

            // Keep device selector visible and update selection
            const deviceSelect = document.getElementById('videoDeviceSelect');
            if (deviceSelect) {
                // Update the list first, then set the selection
                this.updateVideoDeviceList();
                deviceSelect.value = deviceId;
                deviceSelect.style.display = 'block';
                this.updateVideoDropdownDisplay();
            }

            // Add cleanup listener for unexpected stream end
            const videoTrack = this.videoStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.addEventListener('ended', () => {
                    console.log('Video track ended unexpectedly');
                    this.stopVideoInput();
                });
            }

        } catch (error) {
            console.error('Failed to start video:', error);

            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                this.showError('Camera access denied. Please allow camera access and try again.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                this.showError('Camera not found or not available');
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                this.showError('Camera is being used by another application');
            } else if (error.message === 'Video load timeout') {
                this.showError('Video took too long to load. Please try again.');
            } else {
                this.showError(`Failed to access camera: ${
                    error.message
                }`);
            }

            this.stopVideoInput();
        }
    }

    detectCameraStreamInfo() {
        if (!this.videoStream) return;

        // Get video track information
        const videoTracks = this.videoStream.getVideoTracks();
        if (videoTracks.length > 0) {
            const track = videoTracks[0];
            const settings = track.getSettings();
            const capabilities = track.getCapabilities();

            // Store camera info
            let cameraLabel = track.label || 'Unknown Camera';
            let isContinuity = false;
            
            // Check if this is a Continuity Camera
            if (cameraLabel.toLowerCase().includes('iphone') || 
                cameraLabel.toLowerCase().includes('ipad') ||
                cameraLabel.toLowerCase().includes('continuity')) {
                isContinuity = true;
                // Add indicator if not already present
                if (!cameraLabel.includes('(Continuity Camera)')) {
                    cameraLabel = `📱 ${cameraLabel} (Continuity Camera)`;
                }
            }
            
            this.cameraInfo = {
                label: cameraLabel,
                resolution: `${settings.width || 'Unknown'}x${settings.height || 'Unknown'}`,
                frameRate: settings.frameRate || 'Unknown',
                facingMode: settings.facingMode || 'Unknown',
                capabilities: capabilities,
                isContinuity: isContinuity
            };

            // Get actual video element dimensions
            const videoElement = this.captureVideoElement || this.videoElement;
            if (videoElement && videoElement.videoWidth > 0) {
                this.cameraInfo.actualResolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
            }

            console.log('🎥 Camera Stream Info:', this.cameraInfo);

            // Update stats display if it exists
            this.updateCameraStats();
        }
    }

    updateCameraStats() {
        const statsContainer = document.getElementById('cameraStatsContainer');
        if (statsContainer && this.cameraInfo) {
            const streamManager = this.streamManager;
            const captureRes = streamManager ? streamManager.displaySettings.captureResolution : 'Unknown';
            const bitrate = streamManager ? streamManager.displaySettings.captureBitrate : 'Unknown';
            const frameRate = streamManager ? streamManager.displaySettings.captureFrameRate : 'Unknown';

            statsContainer.innerHTML = `
                <div class="stats-row">
                    <span class="stats-label">Camera:</span>
                    <span class="stats-value">${this.cameraInfo.label}</span>
                </div>
                ${this.cameraInfo.isContinuity ? `
                <div class="stats-row" style="color: var(--accent-color);">
                    <span class="stats-label">Type:</span>
                    <span class="stats-value">Apple Continuity Camera</span>
                </div>
                ` : ''}
                <div class="stats-row">
                    <span class="stats-label">Input Resolution:</span>
                    <span class="stats-value">${this.cameraInfo.actualResolution || this.cameraInfo.resolution}</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Input Frame Rate:</span>
                    <span class="stats-value">${this.cameraInfo.frameRate} fps</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Capture Resolution:</span>
                    <span class="stats-value">${captureRes}px</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Capture Frame Rate:</span>
                    <span class="stats-value">${frameRate} fps</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Stream Bitrate:</span>
                    <span class="stats-value">${bitrate} Mbps</span>
                </div>
            `;
        }
    }

    async startVideoFile(file) {
        try {
            console.log('startVideoFile called with file:', file.name);
            
            // Check if we're switching sources
            const isSourceSwitch = this.videoElement && (this.videoStream || this.videoFile);

            if (isSourceSwitch) {
                // Store current opacity for smooth transition
                const currentOpacity = this.videoElement.style.opacity || this.videoOpacity;

                // Start fade out
                this.videoElement.style.transition = `opacity 0.5s linear`;
                this.videoElement.style.opacity = '0';

                // Wait for fade out to complete
                await new Promise(resolve => setTimeout(resolve, 500));

                // Stop the old source without removing elements
                this.stopVideoInput(false, true);
            } else {
                // Normal stop for initial setup
                this.stopVideoInput(false, true);
            }

            // Store the file
            this.videoFile = file;

            // Get container reference
            const container = document.getElementById('visualizationContainer');
            console.log('Container found:', !!container);

            // Create backdrop if needed
            if (!document.getElementById('videoBackdrop')) {
                console.log('Creating video backdrop...');
                const backdrop = document.createElement('div');
                backdrop.id = 'videoBackdrop';
                backdrop.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: ${this.backgroundColor};
                    z-index: 0;
                `;
                container.insertBefore(backdrop, container.firstChild);
            }

            // Create or reuse DISPLAY video element
            if (!this.videoElement) {
                console.log('Creating new video element...');
                this.videoElement = document.createElement('video');
                this.videoElement.id = 'bgVideo';
                this.videoElement.muted = false; // Keep unmuted, control via gain node
                this.videoElement.playsInline = true;
                this.videoElement.autoplay = true;
                this.videoElement.loop = this.videoFileLoop;

                this.videoElement.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    z-index: 1;
                    opacity: 0;
                    transition: opacity ${this.videoFadeTime}s linear;
                    pointer-events: none;
                `;

                const backdrop = document.getElementById('videoBackdrop');
                console.log('Backdrop found:', !!backdrop);
                container.insertBefore(this.videoElement, backdrop.nextSibling);
                console.log('Video element inserted into container');
            } else {
                console.log('Reusing existing video element...');
                // Update settings for existing element
                this.videoElement.muted = false; // Keep unmuted, control via gain node
                this.videoElement.loop = this.videoFileLoop;
            }

            // Set video source
            const url = URL.createObjectURL(file);
            this.videoElement.src = url;
            this.videoElement.loop = this.videoFileLoop;
            this.videoElement.muted = false; // Keep unmuted, control via gain node

            // Make containers transparent if not already done (same as camera video)
            if (!container.classList.contains('video-active')) {
                const mainArea = document.querySelector('.main-area');
                const visualizer = document.getElementById('visualizer');

                // Add class for CSS rules
                container.classList.add('video-active');

                // Force transparent backgrounds
                container.style.backgroundColor = 'transparent';
                mainArea.style.backgroundColor = 'transparent';
                visualizer.style.backgroundColor = 'transparent';

                // Ensure visualizer has proper positioning
                visualizer.style.position = 'absolute';
                visualizer.style.zIndex = '1';

                // Ensure canvas itself is transparent
                if (this.audioMotion && this.audioMotion.canvas) {
                    this.audioMotion.canvas.style.background = 'transparent';
                    this.audioMotion.canvas.style.backgroundColor = 'transparent';

                    // Set z-index to ensure canvas is above video layers
                    this.audioMotion.canvas.style.position = 'absolute';
                    this.audioMotion.canvas.style.zIndex = '3';
                }

                // Force the AudioMotion background to be transparent
                if (this.audioMotion) {
                    this.originalBackgroundColor = this.audioMotion.backgroundColor;

                    // Set transparent background in AudioMotion
                    this.audioMotion.backgroundColor = 'transparent';
                    this.audioMotion.showBgColor = false;

                    // Force a redraw
                    if (this.audioMotion.ctx) {
                        this.audioMotion.ctx.clearRect(0, 0, this.audioMotion.canvas.width, this.audioMotion.canvas.height);
                    }
                }
            }

            // Wait for metadata and play
            console.log('Setting up video loading...');
            await new Promise((resolve, reject) => {
                let resolved = false;
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error('Video load timeout'));
                    }
                }, 10000);

                this.videoElement.onloadedmetadata = () => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        this.videoElement.play().then(() => {
                            this.applyVideoFilters();
                            this.detectVideoFileInfo();
                            
                            // Fade in after short delay
                            setTimeout(() => {
                                if (this.videoElement) {
                                    this.videoElement.style.opacity = this.videoOpacity.toString();
                                }
                            }, 100);
                            
                            resolve();
                        }).catch(reject);
                    }
                };

                this.videoElement.onerror = () => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        reject(new Error('Failed to load video'));
                    }
                };
            });
            
            // Connect video audio to AudioMotion after video is loaded
            await this.connectVideoAudio();

            // Update visualization aspect ratio to match video
            if (this.matchVisualizationAspect) {
                // Small delay to ensure video dimensions are available
                setTimeout(() => this.updateVisualizationAspectRatio(), 200);
            }

            // Update UI
            this.videoMode = 'file';
            this.updateVideoToggleState();
            
            // Save video source to localStorage
            this.saveVideoSource('file', file.name);
            
            const fileInfo = document.getElementById('videoFileInfo');
            const fileName = document.getElementById('videoFileName');
            if (fileInfo && fileName) {
                fileInfo.style.display = 'flex';
                fileName.textContent = file.name;
            }

            // Show controls panel (if it exists)
            const controlsPanel = document.getElementById('videoControlsPanel');
            if (controlsPanel) {
            controlsPanel.style.display = 'block';
            }


            // If stream manager active, rebuild capture
            if (this.streamManager && this.streamManager.isStreaming) {
                this.streamManager.reconfigureCapture();
            }

            console.log('Video file started:', file.name);
            
            // Debug video visibility after a short delay
            setTimeout(() => {
                this.debugVideoVisibility();
            }, 500);

        } catch (error) {
            console.error('Error starting video file:', error);
            console.error('Error stack:', error.stack);
            this.showError(`Failed to load video: ${error.message}`);
            this.stopVideoInput();
        }
    }
    
    debugVideoVisibility() {
        const videoElement = this.videoElement;
        const container = document.getElementById('visualizationContainer');
        const mainArea = document.querySelector('.main-area');
        const visualizer = document.getElementById('visualizer');
        
        console.log('=== VIDEO DEBUG INFO ===');
        console.log('Video Mode:', this.videoMode);
        console.log('Video Element exists:', !!videoElement);
        
        if (videoElement) {
            const rect = videoElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(videoElement);
            
            console.log('Video Element:');
            console.log('  - Position:', computedStyle.position);
            console.log('  - Z-index:', computedStyle.zIndex);
            console.log('  - Opacity:', computedStyle.opacity);
            console.log('  - Display:', computedStyle.display);
            console.log('  - Width:', computedStyle.width);
            console.log('  - Height:', computedStyle.height);
            console.log('  - Filter:', computedStyle.filter);
            console.log('  - BoundingRect:', rect);
            console.log('  - Src:', videoElement.src);
            console.log('  - ReadyState:', videoElement.readyState);
            console.log('  - Paused:', videoElement.paused);
            console.log('  - Current Time:', videoElement.currentTime);
        }
        
        console.log('\nContainer backgrounds:');
        console.log('  - Visualization Container BG:', container.style.backgroundColor);
        console.log('  - Main Area BG:', mainArea.style.backgroundColor);
        console.log('  - Visualizer BG:', visualizer.style.backgroundColor);
        
        console.log('\nAudioMotion Canvas:');
        if (this.audioMotion && this.audioMotion.canvas) {
            const canvasStyle = window.getComputedStyle(this.audioMotion.canvas);
            console.log('  - Z-index:', canvasStyle.zIndex);
            console.log('  - Position:', canvasStyle.position);
            console.log('  - Visibility:', canvasStyle.visibility);
            console.log('  - Display:', canvasStyle.display);
        }
        
        console.log('=== END DEBUG INFO ===');
    }

    detectVideoFileInfo() {
        if (this.videoElement && this.videoMode === 'file') {
            const videoInfo = {
                name: this.videoFile?.name || 'Unknown',
                resolution: `${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`,
                duration: this.videoElement.duration,
                loop: this.videoFileLoop
            };

            console.log('📹 Video File Info:', videoInfo);

            // Update stats if needed
            this.updateVideoFileStats(videoInfo);
        }
    }

    updateVideoFileStats(videoInfo) {
        const statsContainer = document.getElementById('cameraStatsContainer');
        if (statsContainer && videoInfo) {
            const streamManager = this.streamManager;
            const captureRes = streamManager ? streamManager.displaySettings.captureResolution : 'Unknown';
            const bitrate = streamManager ? streamManager.displaySettings.captureBitrate : 'Unknown';
            const frameRate = streamManager ? streamManager.displaySettings.captureFrameRate : 'Unknown';

            statsContainer.innerHTML = `
                <div class="stats-row">
                    <span class="stats-label">File:</span>
                    <span class="stats-value" style="overflow: hidden; text-overflow: ellipsis;">${videoInfo.name}</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Resolution:</span>
                    <span class="stats-value">${videoInfo.resolution}</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Duration:</span>
                    <span class="stats-value">${Math.round(videoInfo.duration)}s</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Loop:</span>
                    <span class="stats-value">${videoInfo.loop ? 'On' : 'Off'}</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Capture Resolution:</span>
                    <span class="stats-value">${captureRes}px</span>
                </div>
                <div class="stats-row">
                    <span class="stats-label">Stream Bitrate:</span>
                    <span class="stats-value">${bitrate} Mbps</span>
                </div>
            `;
        }
    }

    stopVideoInput(updateUI = true, isSourceSwitch = false) { // Clear any existing fade timeout immediately
        if (this.videoFadeTimeout) {
            clearTimeout(this.videoFadeTimeout);
            this.videoFadeTimeout = null;
        }
        
        // Disconnect video audio
        this.disconnectVideoAudio();

        // Restore original aspect ratio when video stops (unless it's just a source switch)
        if (updateUI && this.matchVisualizationAspect) {
            this.restoreOriginalAspectRatio();
        }

        // If this is a source switch, do a quick fade and cleanup
        if (isSourceSwitch) {
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('Stopped video track:', track.label);
                });
                this.videoStream = null;
            }

            // Don't remove the video elements or backdrop during source switch
            // Just clear the sources
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
            if (this.captureVideoElement) {
                this.captureVideoElement.srcObject = null;
            }

            return; // Exit early for source switch
        }

        // Normal stop behavior (when turning video off completely)
        if (this.videoElement) {
            this.videoElement.style.transition = `opacity ${
                this.videoFadeTime
            }s linear`;
            this.videoElement.style.opacity = '0';

            this.videoFadeTimeout = setTimeout(() => { // Stop video stream
                if (this.videoStream) {
                    this.videoStream.getTracks().forEach(track => {
                        track.stop();
                        console.log('Stopped video track:', track.label);
                    });
                    this.videoStream = null;
                }

                // Remove display video element
                if (this.videoElement) {
                    this.videoElement.srcObject = null;
                    if (this.videoElement.parentNode) {
                        this.videoElement.parentNode.removeChild(this.videoElement);
                    }
                    this.videoElement = null;
                }

                // Remove capture video element
                if (this.captureVideoElement) {
                    this.captureVideoElement.srcObject = null;
                    if (this.captureVideoElement.parentNode) {
                        this.captureVideoElement.parentNode.removeChild(this.captureVideoElement);
                    }
                    this.captureVideoElement = null;
                }


                // Remove backdrop
                const backdrop = document.getElementById('videoBackdrop');
                if (backdrop && backdrop.parentNode) {
                    backdrop.parentNode.removeChild(backdrop);
                }

                // Restore backgrounds
                const container = document.getElementById('visualizationContainer');
                const mainArea = document.querySelector('.main-area');
                const visualizer = document.getElementById('visualizer');

                container.classList.remove('video-active');

                // Restore original background colors
                container.style.backgroundColor = this.backgroundColor;
                mainArea.style.backgroundColor = this.backgroundColor;
                visualizer.style.backgroundColor = '';

                // Restore canvas background
                if (this.audioMotion && this.audioMotion.canvas) {
                    this.audioMotion.canvas.style.background = '';
                    this.audioMotion.canvas.style.backgroundColor = '';
                }

                // Restore AudioMotion background color
                if (this.audioMotion) {
                    this.audioMotion.backgroundColor = this.originalBackgroundColor || this.backgroundColor;
                    this.audioMotion.setBackgroundColor(this.backgroundColor);
                    this.audioMotion.showBgColor = true;
                }

            }, this.videoFadeTime * 1000);
        } else { // No video element, just cleanup capture element if it exists
            if (this.captureVideoElement) {
                this.captureVideoElement.srcObject = null;
                if (this.captureVideoElement.parentNode) {
                    this.captureVideoElement.parentNode.removeChild(this.captureVideoElement);
                }
                this.captureVideoElement = null;
            }


            const backdrop = document.getElementById('videoBackdrop');
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }

            const container = document.getElementById('visualizationContainer');
            const mainArea = document.querySelector('.main-area');

            if (container) {
                container.classList.remove('video-active');
                container.style.backgroundColor = this.backgroundColor;
            }
            if (mainArea) {
                mainArea.style.backgroundColor = this.backgroundColor;
            }

            if (this.audioMotion) {
                this.audioMotion.setBackgroundColor(this.backgroundColor);
            }
        }

        if (updateUI) {
            const deviceSelect = document.getElementById('videoDeviceSelect');
            const controlsPanel = document.getElementById('videoControlsPanel');

            if (deviceSelect) {
                deviceSelect.value = '';
            }
            
            // Hide file info
            const fileInfo = document.getElementById('videoFileInfo');
            if (fileInfo) {
                fileInfo.style.display = 'none';
            }
            
            if (controlsPanel) {
                controlsPanel.style.display = 'none';
            }

            this.videoMode = 'off';
            this.updateVideoToggleState();
            
            this.currentVideoDeviceId = null;
            this.videoFile = null;
        }

        

    }

    updateDisplayFilters() {
        if (this.streamManager && this.streamManager.isStreaming) {
            this.streamManager.sendVideoFilters();
        }
    }

    applyDisplayPreset(preset) {
        const presets = {
            cinema: {
                presentationMode: 'fit',
                aspectRatio: '21:9',
                captureResolution: 2560,
                captureFrameRate: 24,
                captureBitrate: 30,
                displaySharpness: 20,
                letterboxColor: '#000000',
                mirrorBackground: false
            },
            presentation: {
                presentationMode: 'fit',
                aspectRatio: '16:9',
                captureResolution: 2560,
                captureFrameRate: 30,
                captureBitrate: 30,
                displaySharpness: 30,
                letterboxColor: '#1a1a1a',
                mirrorBackground: false
            },
            social: {
                presentationMode: 'fit',
                aspectRatio: '1:1',
                captureResolution: 2560,
                captureFrameRate: 30,
                captureBitrate: 30,
                displaySharpness: 0,
                letterboxColor: '#ffffff',
                mirrorBackground: false
            },
            performance: {
                presentationMode: 'fit',
                aspectRatio: 'auto',
                captureResolution: 2560,
                captureFrameRate: 60,
                captureBitrate: 30,
                displaySharpness: 0,
                letterboxColor: '#000000',
                mirrorBackground: false
            },
            projector: {
                presentationMode: 'fit',
                aspectRatio: '4:3',
                captureResolution: 2560,
                captureFrameRate: 60,
                captureBitrate: 30,
                displaySharpness: 50,
                letterboxColor: '#000000',
                mirrorBackground: true,
                mirrorBackgroundBlur: 30
            }
        };

        const settings = presets[preset];
        if (settings && this.streamManager) {
            this.streamManager.updateDisplaySettings(settings);
            this.updateDisplaySettingsUI(settings);
        }
    }

    updateDisplaySettingsUI(settings) { // Update presentation mode buttons
        document.querySelectorAll('.display-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === settings.presentationMode);
        });

        // Update aspect ratio buttons if they exist
        document.querySelectorAll('.aspect-ratio-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.ratio === settings.aspectRatio);
        });

        // Update capture resolution
        const captureResolution = document.getElementById('captureResolution');
        if (captureResolution && settings.captureResolution !== undefined) {
            captureResolution.value = settings.captureResolution;
        }

        // Update capture frame rate
        const captureFrameRate = document.getElementById('captureFrameRate');
        if (captureFrameRate && settings.captureFrameRate !== undefined) {
            captureFrameRate.value = settings.captureFrameRate;
        }

        // Update capture bitrate
        const captureBitrate = document.getElementById('captureBitrate');
        if (captureBitrate && settings.captureBitrate !== undefined) {
            captureBitrate.value = settings.captureBitrate;
            const bitrateValue = document.getElementById('captureBitrateValue');
            if (bitrateValue) {
                bitrateValue.textContent = `${
                    settings.captureBitrate
                } Mbps`;
            }
        }

        // Update display sharpness
        const displaySharpness = document.getElementById('displaySharpness');
        if (displaySharpness && settings.displaySharpness !== undefined) {
            displaySharpness.value = settings.displaySharpness;
            const sharpnessValue = document.getElementById('displaySharpnessValue');
            if (sharpnessValue) {
                sharpnessValue.textContent = `${
                    settings.displaySharpness
                }%`;
            }
        }

        // Update letterbox color
        const letterboxColor = document.getElementById('letterboxColor');
        if (letterboxColor && settings.letterboxColor !== undefined) {
            letterboxColor.value = settings.letterboxColor;
            const colorValue = document.getElementById('letterboxColorValue');
            if (colorValue) {
                colorValue.textContent = settings.letterboxColor;
            }
        }

        // Update mirror background
        if (settings.mirrorBackground !== undefined) {
            const mirrorBtn = document.getElementById('mirrorBackgroundBtn');
            if (mirrorBtn) {
                mirrorBtn.classList.toggle('active', settings.mirrorBackground);
                mirrorBtn.textContent = `Mirror Background: ${
                    settings.mirrorBackground ? 'On' : 'Off'
                }`;
            }

            // Show/hide mirror blur container
            const mirrorBlurContainer = document.getElementById('mirrorBlurContainer');
            if (mirrorBlurContainer) {
                mirrorBlurContainer.style.display = settings.mirrorBackground ? 'flex' : 'none';
            }

            // Update mirror background blur
            if (settings.mirrorBackgroundBlur !== undefined) {
                const mirrorBlur = document.getElementById('mirrorBackgroundBlur');
                if (mirrorBlur) {
                    mirrorBlur.value = settings.mirrorBackgroundBlur;
                    const blurValue = document.getElementById('mirrorBackgroundBlurValue');
                    if (blurValue) {
                        blurValue.textContent = `${
                            settings.mirrorBackgroundBlur
                        }px`;
                    }
                }
            }
        }
    }

    applyVideoFilters() {
        if (!this.videoElement) 
            return;
        


        let filters = [];

        // Apply posterize FIRST with much stronger effect
        if (this.videoPosterize < 16) { // Much stronger posterize for visible effect
            const steps = this.videoPosterize;
            const posterizeAmount = (16 - steps) / 16;

            // Use multiple contrast passes for stronger effect
            filters.push(`contrast(${
                300 + posterizeAmount * 200
            }%)`); // 300-500%
            filters.push(`brightness(${95}%)`);
            filters.push(`saturate(${200}%)`);

            // Add a second contrast pass for extra posterization
            if (steps < 8) {
                filters.push(`contrast(${150}%)`);
            }
        }

        // Then apply other adjustments
        if (this.videoBrightness !== 100 && this.videoPosterize >= 16) {
            filters.push(`brightness(${
                this.videoBrightness
            }%)`);
        }
        if (this.videoContrast !== 100 && this.videoPosterize >= 16) {
            filters.push(`contrast(${
                this.videoContrast
            }%)`);
        }
        if (this.videoSaturation !== 100 && this.videoPosterize >= 16) {
            filters.push(`saturate(${
                this.videoSaturation
            }%)`);
        }
        if (this.videoHueRotate !== 0) {
            filters.push(`hue-rotate(${
                this.videoHueRotate
            }deg)`);
        }
        if (this.videoGrayscale > 0) {
            filters.push(`grayscale(${
                this.videoGrayscale
            }%)`);
        }
        if (this.videoSepia > 0) {
            filters.push(`sepia(${
                this.videoSepia
            }%)`);
        }
        if (this.videoBlur > 0) {
            filters.push(`blur(${
                this.videoBlur
            }px)`);
        }
        if (this.videoInvert) {
            filters.push('invert(100%)');
        }

        // Apply combined filters
        this.videoElement.style.filter = filters.length > 0 ? filters.join(' ') : 'none';

        console.log('Applied filters to LIVE VIDEO (videoElement):', this.videoElement.style.filter);

        // Apply vignette overlay
        this.applyVignette();

        // Apply mirror transformations
        this.applyMirror();

        // Apply pulse animation
        this.applyPulse();
        
        // Also update kaleidoscope filters if it's active
        if (this.kaleidoscopeEnabled && this.kaleidoscopeApplyToVideo) {
            this.applyFiltersToKaleidoscopeContext();
        }
    }

    applyVignette() {
        const container = document.getElementById('visualizationContainer');

        if (this.videoVignette > 0) {
            if (!this.vignetteElement) {
                this.vignetteElement = document.createElement('div');
                this.vignetteElement.className = 'video-vignette';
                container.appendChild(this.vignetteElement);
            }

            const intensity = this.videoVignette / 100;
            const size = 100 - this.videoVignette;

            this.vignetteElement.style.background = `
        radial-gradient(
            ellipse at center,
            transparent ${size}%,
            rgba(0, 0, 0, ${intensity}) 100%
        )
    `;
            this.vignetteElement.style.display = 'block';
        } else if (this.vignetteElement) {
            this.vignetteElement.style.display = 'none';
        }
    }

    applyMirror() {
        if (!this.videoElement) 
            return;
        


        // Remove all mirror classes
        this.videoElement.classList.remove('mirror-horizontal', 'mirror-vertical', 'mirror-both');

        // Apply appropriate mirror class
        switch (this.videoMirror) {
            case 'horizontal':
                this.videoElement.classList.add('mirror-horizontal');
                break;
            case 'vertical':
                this.videoElement.classList.add('mirror-vertical');
                break;
            case 'both':
                this.videoElement.classList.add('mirror-both');
                break;
        }
    }

    applyPulse() {
        if (!this.videoElement) 
            return;
        


        if (this.videoPulse) {
            this.videoElement.classList.add('pulse-active');
            this.videoElement.style.setProperty('--pulse-duration', `${
                this.videoPulseRate
            }s`);
        } else {
            this.videoElement.classList.remove('pulse-active');
        }
    }

    setVideoPulseRate(value) {
        this.videoPulseRate = value;
        if (this.videoPulse) {
            this.applyPulse();
        }
    }

    toggleVideoPulse() {
        this.videoPulse = !this.videoPulse;
        const pulseRateContainer = document.getElementById('videoPulseRateContainer');
        if (pulseRateContainer) {
            pulseRateContainer.style.display = this.videoPulse ? 'flex' : 'none';
        }
        this.applyPulse();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    // Individual setter methods
    setVideoBrightness(value) {
        this.videoBrightness = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoContrast(value) {
        this.videoContrast = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoSaturation(value) {
        this.videoSaturation = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoHueRotate(value) {
        this.videoHueRotate = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoGrayscale(value) {
        this.videoGrayscale = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoSepia(value) {
        this.videoSepia = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoBlur(value) {
        this.videoBlur = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoPosterize(value) {
        this.videoPosterize = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoVignette(value) {
        this.videoVignette = value;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    toggleVideoInvert() {
        this.videoInvert = !this.videoInvert;
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    cycleVideoMirror() {
        const modes = ['off', 'horizontal', 'vertical', 'both'];
        const currentIndex = modes.indexOf(this.videoMirror);
        this.videoMirror = modes[(currentIndex + 1) % modes.length];
        this.applyVideoFilters();
        this.updateDisplayFilters(); // ADD THIS LINE
    }


    // Video presets
    applyVideoPreset(preset) {
        switch (preset) {
            case 'normal':
                this.videoBrightness = 100;
                this.videoContrast = 100;
                this.videoSaturation = 100;
                this.videoHueRotate = 0;
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 0;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'dreamy':
                this.videoBrightness = 110;
                this.videoContrast = 90;
                this.videoSaturation = 120;
                this.videoHueRotate = 0;
                this.videoGrayscale = 0;
                this.videoSepia = 10;
                this.videoBlur = 3;
                this.videoVignette = 30;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'noir':
                this.videoBrightness = 90;
                this.videoContrast = 130;
                this.videoSaturation = 0;
                this.videoHueRotate = 0;
                this.videoGrayscale = 100;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 50;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'cyberpunk':
                this.videoBrightness = 120;
                this.videoContrast = 150;
                this.videoSaturation = 150;
                this.videoHueRotate = 180;
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 1;
                this.videoVignette = 40;
                this.videoPosterize = 8;
                this.videoInvert = false;
                break;

            case 'vintage':
                this.videoBrightness = 95;
                this.videoContrast = 110;
                this.videoSaturation = 70;
                this.videoHueRotate = 0;
                this.videoGrayscale = 0;
                this.videoSepia = 40;
                this.videoBlur = 0;
                this.videoVignette = 60;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'retro-tv':
                this.videoBrightness = 105;
                this.videoContrast = 95;
                this.videoSaturation = 85;
                this.videoHueRotate = 5;
                this.videoGrayscale = 10;
                this.videoSepia = 5;
                this.videoBlur = 0.5;
                this.videoVignette = 35;
                this.videoPosterize = 12;
                this.videoInvert = false;
                break;

            case 'underwater':
                this.videoBrightness = 85;
                this.videoContrast = 110;
                this.videoSaturation = 130;
                this.videoHueRotate = 200; // Blue-green shift
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 2;
                this.videoVignette = 25;
                this.videoPosterize = 16;
                this.videoInvert = false;
                break;

            case 'infrared':
                this.videoBrightness = 110;
                this.videoContrast = 140;
                this.videoSaturation = 0;
                this.videoHueRotate = 0;
                this.videoGrayscale = 100;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 20;
                this.videoPosterize = 16;
                this.videoInvert = true; // Key for infrared look
                break;

            case 'acid':
                this.videoBrightness = 130;
                this.videoContrast = 170;
                this.videoSaturation = 200;
                this.videoHueRotate = 270; // Purple-pink shift
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 0.5;
                this.videoVignette = 0;
                this.videoPosterize = 6; // Heavy posterization
                this.videoInvert = false;
                break;

            case 'film-negative':
                this.videoBrightness = 100;
                this.videoContrast = 100;
                this.videoSaturation = 100;
                this.videoHueRotate = 180; // Complement colors
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 10;
                this.videoPosterize = 16;
                this.videoInvert = true;
                break;

            case 'thermal':
                this.videoBrightness = 120;
                this.videoContrast = 160;
                this.videoSaturation = 150;
                this.videoHueRotate = 280; // Red-orange-yellow gradient
                this.videoGrayscale = 0;
                this.videoSepia = 20;
                this.videoBlur = 1;
                this.videoVignette = 15;
                this.videoPosterize = 8;
                this.videoInvert = false;
                break;

            case 'matrix':
                this.videoBrightness = 70;
                this.videoContrast = 150;
                this.videoSaturation = 100;
                this.videoHueRotate = 90; // Green tint
                this.videoGrayscale = 50; // Partial desaturation
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 70; // Heavy vignette
                this.videoPosterize = 4; // Heavy posterization
                this.videoInvert = false;
                break;

            case 'glitch':
                this.videoBrightness = 110;
                this.videoContrast = 130;
                this.videoSaturation = 120;
                this.videoHueRotate = Math.random() * 360; // Random hue
                this.videoGrayscale = 0;
                this.videoSepia = 0;
                this.videoBlur = 0;
                this.videoVignette = 0;
                this.videoPosterize = 3; // Extreme posterization
                this.videoInvert = Math.random() > 0.5; // Random invert
                break;

        }

        // Update all sliders and buttons to reflect new values
        this.updateVideoControlsUI();
        this.applyVideoFilters();
        this.updateDisplayFilters();
    }

    updateVideoControlsUI() { // Update sliders
        const updates = {
            'videoOpacitySlider': [
                this.videoOpacity * 100,
                '%'
            ],
            'videoBrightnessSlider': [
                this.videoBrightness, '%'
            ],
            'videoContrastSlider': [
                this.videoContrast, '%'
            ],
            'videoSaturationSlider': [
                this.videoSaturation, '%'
            ],
            'videoHueRotateSlider': [
                this.videoHueRotate, '°'
            ],
            'videoGrayscaleSlider': [
                this.videoGrayscale, '%'
            ],
            'videoSepiaSlider': [
                this.videoSepia, '%'
            ],
            'videoBlurSlider': [
                this.videoBlur, 'px'
            ],
            'videoVignetteSlider': [
                this.videoVignette, '%'
            ],
            'videoPosterizeSlider': [
                this.videoPosterize, ''
            ],
            'videoPulseRateSlider': [this.videoPulseRate, 's']
        };

        for (const [id, [
                value, unit
            ]
        ] of Object.entries(updates)) {
            const slider = document.getElementById(id);
            const display = document.getElementById(id.replace('Slider', 'Value'));
            if (slider) {
                slider.value = value;
                if (display) {
                    if (id === 'videoPosterizeSlider') {
                        display.textContent = value >= 16 ? 'Off' : `${value} levels`;
                    } else {
                        display.textContent = `${
                            Math.round(value)
                        }${unit}`;
                    }
                }
            }
        }

        // Update toggle buttons
        const invertBtn = document.getElementById('videoInvertBtn');
        if (invertBtn) {
            invertBtn.textContent = `Invert: ${
                this.videoInvert ? 'On' : 'Off'
            }`;
            invertBtn.classList.toggle('active', this.videoInvert);
        }

        const mirrorBtn = document.getElementById('videoMirrorBtn');
        if (mirrorBtn) {
            const mirrorText = this.videoMirror === 'off' ? 'Off' : this.videoMirror.charAt(0).toUpperCase() + this.videoMirror.slice(1);
            mirrorBtn.textContent = `Mirror: ${mirrorText}`;
            mirrorBtn.classList.toggle('active', this.videoMirror !== 'off');
        }

        const pulseBtn = document.getElementById('videoPulseBtn');
        if (pulseBtn) {
            pulseBtn.textContent = `Pulse: ${
                this.videoPulse ? 'On' : 'Off'
            }`;
            pulseBtn.classList.toggle('active', this.videoPulse);
        }

        const pulseRateContainer = document.getElementById('videoPulseRateContainer');
        if (pulseRateContainer) {
            pulseRateContainer.style.display = this.videoPulse ? 'flex' : 'none';
        }
    }

    setVideoOpacity(value) {
        this.videoOpacity = value;
        if (this.videoElement) {
            this.videoElement.style.transition = 'opacity 0.2s ease';
            this.videoElement.style.opacity = value.toString();

            setTimeout(() => {
                this.videoElement.style.transition = `opacity ${
                    this.videoFadeTime
                }s linear`;
            }, 200);
        }
        this.updateDisplayFilters(); // ADD THIS LINE
    }

    setVideoFadeTime(seconds) {
        this.videoFadeTime = seconds;
        if (this.videoElement) {
            this.videoElement.style.transition = `opacity ${seconds}s linear`;
        }
    }

    async startLiveInput(deviceId) {
        try {
            this.stopLiveInput();

            if (this.audio) {
                this.audio.pause();
            }

            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: deviceId ? {
                        exact: deviceId
                    } : undefined,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 48000,
                    channelCount: 2
                }
            });

            if (this.audioMotion && this.audioMotion.audioCtx) {
                if (this.audioMotion.audioCtx.state === 'suspended') {
                    await this.audioMotion.audioCtx.resume();
                }

                this.audioMotion.disconnectInput();

                this.streamSource = this.audioMotion.audioCtx.createMediaStreamSource(this.audioStream);

                // Check if we need stereo processing
                const audioTracks = this.audioStream.getAudioTracks();
                const settings = audioTracks[0] ?. getSettings();
                const channelCount = settings ?. channelCount || 1;

                if (channelCount > 1 && this.audioMotion.splitter) { // Stereo source - use splitter
                    this.streamSource.connect(this.audioMotion.splitter);
                    this.audioMotion.splitter.connect(this.audioMotion.analyser, 0);
                    this.audioMotion.splitter.connect(this.audioMotion.analyserRight, 1);
                } else { // Mono source or no splitter - direct connection
                    this.streamSource.connect(this.audioMotion.analyser);
                }

                this.audioMotion.isConnected = true;
            }

            // Audio input button removed - using select dropdown
            this.inputMode = 'microphone';
            this.currentDeviceId = deviceId;
            this.lastAudioDeviceId = deviceId; // Store for toggle functionality
            this.liveAudioEnabled = true; // Enable live audio toggle

            document.getElementById('trackTitle').textContent = 'Live Audio Input';
            document.getElementById('playBtn').disabled = true;
            document.getElementById('nextBtn').disabled = true;
            document.getElementById('prevBtn').disabled = true;

            // Update footer Live Audio button state
            this.updateFooterLiveAudioButton();
            
            // Update sidebar audio device selector to show selected device
            const deviceSelect = document.getElementById('audioDeviceSelect');
            if (deviceSelect) {
                deviceSelect.value = deviceId;
            }
            
            // Update live audio toggle button
            const toggleBtn = document.getElementById('liveAudioToggleBtn');
            if (toggleBtn) {
                toggleBtn.textContent = 'ON';
                toggleBtn.classList.add('active');
            }

        } catch (e) {
            console.error('Failed to start live input:', e);
            this.showError('Failed to start audio input');
        }
    }

    stopLiveInput() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }

        if (this.streamSource) {
            try {
                this.streamSource.disconnect();
            } catch (e) { // Ignore
            }
            this.streamSource = null;
        }

        // Update footer Live Audio button state
        this.updateFooterLiveAudioButton();
        
        // Clear sidebar audio device selector
        const deviceSelect = document.getElementById('audioDeviceSelect');
        if (deviceSelect) {
            deviceSelect.value = '';
        }
        
        // Update live audio toggle button
        const toggleBtn = document.getElementById('liveAudioToggleBtn');
        if (toggleBtn) {
            toggleBtn.textContent = 'OFF';
            toggleBtn.classList.remove('active');
        }
        
        // Update live audio state
        this.liveAudioEnabled = false;
    }

    resumePlaylist() {
        document.getElementById('playBtn').disabled = false;
        document.getElementById('nextBtn').disabled = false;
        document.getElementById('prevBtn').disabled = false;

        if (this.audio && this.audioMotion) {
            this.audioMotion.connectInput(this.audio);
            this.updateTrackInfo();
        }
    }

    showSystemAudioHelp() {
        const helpText = `
To capture system audio on Mac:

1. Install BlackHole (free): 
   https://existential.audio/blackhole/

2. Open "Audio MIDI Setup" (in Applications/Utilities)

3. Click "+" button → "Create Multi-Output Device"

4. Check both "BlackHole 2ch" and your speakers

5. Set this Multi-Output as system output

6. In GitItUp, select "BlackHole 2ch" as input

This routes system audio to both speakers and visualizer.

Alternative: Loopback ($99) - easier but paid
https://rogueamoeba.com/loopback/
`;

        alert(helpText);
    }

    // Preset Methods
    exportPresets() {
        try {
            const dataStr = JSON.stringify(this.savedPresets, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gitup_presets_${
                Date.now()
            }.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Error exporting presets:', e);
            alert('Failed to export presets');
        }
    }

    importPresets(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    imported.forEach(importedPreset => {
                        const existingIndex = this.savedPresets.findIndex(p => p.name === importedPreset.name);
                        if (existingIndex >= 0) {
                            if (confirm(`Preset "${
                                importedPreset.name
                            }" already exists. Overwrite?`)) {
                                this.savedPresets[existingIndex] = importedPreset;
                            }
                        } else {
                            this.savedPresets.push(importedPreset);
                        }
                    });

                    if (this.savedPresets.length > 30) {
                        this.savedPresets = this.savedPresets.slice(-30);
                    }

                    this.savePresets();
                    this.updatePresetSelector();
                    alert(`Successfully imported ${
                        imported.length
                    } preset(s)`);
                } else {
                    alert('Invalid preset file format');
                }
            } catch (error) {
                console.error('Error importing presets:', error);
                alert('Failed to import presets: Invalid file');
            }
        };
        reader.readAsText(file);
    }

    // METHODS

    applyBrightnessBoost(config) { // Force minimum opacity
        if (config.fillAlpha !== undefined) {
            config.fillAlpha = Math.max(0.8, Math.min(1, config.fillAlpha * 2));
        } else {
            config.fillAlpha = 0.9;
        }

        // Force brighter reflections
        if (config.reflexAlpha !== undefined) {
            config.reflexAlpha = Math.max(0.5, Math.min(1, config.reflexAlpha * 2));
        }

        // Amplitude settings for full screen
        config.linearAmplitude = true;
        config.linearBoost = 5;
        config.maxDecibels = -5;
        config.minDecibels = -60;
        config.volume = 2.5;

        // Bar spacing
        config.barSpace = 0.05;

        // Radial settings - FIX FOR MISSING LINES
        if (config.radial) {
            config.radius = 0.8;
            config.lineWidth = Math.max(5, config.lineWidth || 5); // Force thick lines
            if (config.spinSpeed) {
                config.spinSpeed = config.spinSpeed * 0.5;
            }
        }

        // Force line width for line modes
        if (config.mode === 10) {
            config.lineWidth = Math.max(3, config.lineWidth || 2);
        }

        return config;
    }

    applyMorphConfig(config) {
        if (!this.audioMotion) 
            return;
        


        // Don't recalculate frequency bands during morph - keep them stable
        const morphConfig = {
            ...config,
            _isMorphing: true, // Add this flag to prevent resets in setOptions
            showScaleX: false,
            fftSize: config.fftSize || 8192,
            fillAlpha: Math.max(0.6, config.fillAlpha || 0.8),
            volume: config.volume || 1,
            linearBoost: config.linearBoost || 1.5,
            maxDecibels: config.maxDecibels || -25,
            minDecibels: config.minDecibels || -85
        };

        // Save current frequency scale to prevent band recalculation
        const currentFreqScale = this.audioMotion.frequencyScale;
        const currentAnsiBands = this.audioMotion.ansiBands;
        const currentSpinAngle = this.audioMotion.spinAngle;

        try {
            this.audioMotion.setOptions(morphConfig);

            // Force preserve critical animation state
            if (this.isMorphing) { // Restore spin angle if it got reset somehow
                if (this.audioMotion.spinAngle !== currentSpinAngle) {
                    this.audioMotion.spinAngle = currentSpinAngle;
                }

                // If frequency scale changed, force it back to prevent wobble
                if (this.audioMotion.frequencyScale !== currentFreqScale || this.audioMotion.ansiBands !== currentAnsiBands) {
                    this.audioMotion.frequencyScale = currentFreqScale;
                    this.audioMotion.ansiBands = currentAnsiBands;
                }
            }
        } catch (e) {
            console.error('Error applying morph config:', e);
        }
    }

    setVisualizationMode(modeIndex) {
        console.log(`🎨 setVisualizationMode called: ${this.currentMode} → ${modeIndex}`);
        console.trace('🎨 setVisualizationMode call stack');
        this.currentMode = modeIndex;

        if (this.audioMotion && modeIndex >= 0 && modeIndex < this.visualizationModes.length) {
            const config = {
                ...this.visualizationModes[modeIndex]
            };
            // DON'T apply brightness boost to standard presets - they're already tuned

            try {
                console.log('Setting visualization mode', modeIndex, 'with config:', config);
                this.audioMotion.setOptions(config);
                console.log('Visualization mode applied successfully');
            } catch (error) {
                console.warn(`Could not set visualization mode ${modeIndex}:`, error);
            }
        }
    }

    setRandomVisualization() {
        const randomMode = Math.floor(Math.random() * 11);

        const randomConfig = {
            mode: randomMode,
            alphaBars: false,
            ansiBands: randomMode === 1 || randomMode === 2 ? Math.random() > 0.5 : false,
            barSpace: randomMode === 0 ? 0 : Math.random() * 0.05, // No space for mode 0 (fluid)
            bgAlpha: 0.3 + Math.random() * 0.7,
            fillAlpha: 0.8 + Math.random() * 0.2, // Keep high for brightness (0.8-1.0)
            frequencyScale: Math.random() > 0.5 ? 'log' : 'linear',
            gradient: [
                'classic',
                'rainbow',
                'prism',
                'steelblue',
                'orangered'
            ][Math.floor(Math.random() * 5)],
            gravity: 1 + Math.random() * 5,
            ledBars: randomMode === 6 ? Math.random() > 0.3 : false,
            linearAmplitude: true, // Always true for better visibility
            linearBoost: 2 + Math.random() * 2, // 2-4 for good brightness
            lineWidth: randomMode === 10 ? 3 + Math.random() * 2 : Math.random() * 5,
            maxDecibels: -20 + Math.random() * 10, // Better range
            minDecibels: -80 + Math.random() * 10,
            maxFreq: 16000 + Math.random() * 6000,
            minFreq: 20 + Math.random() * 30,
            mirror: Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0,
            outlineBars: Math.random() > 0.7,
            peakFadeTime: 500 + Math.random() * 500,
            peakHoldTime: 300 + Math.random() * 400,
            radial: Math.random() > 0.6,
            radialInvert: Math.random() > 0.5,
            radius: 0.8 + Math.random() * 0.4, // Larger radius (0.8-1.2)
            reflexAlpha: 0.5 + Math.random() * 0.5, // Higher minimum
            reflexRatio: Math.random() * 0.5,
            roundBars: Math.random() > 0.5,
            showBgColor: Math.random() > 0.3,
            showPeaks: Math.random() > 0.3,
            showScaleX: false,
            smoothing: 0.5 + Math.random() * 0.3, // 0.5-0.8 for smoother animation
            spinSpeed: Math.random() > 0.6 ? Math.random() * 2 : 0,
            trueLeds: randomMode === 6 ? Math.random() > 0.5 : false,
            volume: 1.5 + Math.random() * 1, // 1.5-2.5 for better amplitude
            channelLayout: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'dual-vertical' : 'dual-horizontal') : 'single',
            colorMode: 'gradient',
            fadePeaks: false,
            fftSize: 8192,
            loRes: false,
            lumiBars: false,
            maxFPS: 0,
            noteLabels: false,
            overlay: false,
            peakLine: false,
            reflexBright: 1,
            reflexFit: true,
            showFPS: false,
            showScaleY: false,
            splitGradient: false,
            useCanvas: true,
            weightingFilter: ''
        };

        // Special handling for radial mode to ensure visibility
        if (randomConfig.radial) {
            randomConfig.lineWidth = Math.max(3, randomConfig.lineWidth || 3); // Minimum line width
            randomConfig.radius = 0.8 + Math.random() * 0.6; // 0.8-1.4 for better visibility
            randomConfig.fillAlpha = 1; // Full opacity for radial
        }

        document.querySelectorAll('#vizModeDropdown .dropdown-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById('vizModeToggle').textContent = 'Random';

        if (this.audioMotion) {
            console.log('Setting random visualization with config:', randomConfig);
            this.audioMotion.setOptions(randomConfig);

            const preset = {
                name: 'Last Random',
                timestamp: Date.now(),
                config: randomConfig
            };

            const lastRandomIndex = this.savedPresets.findIndex(p => p.name === 'Last Random');
            if (lastRandomIndex >= 0) {
                this.savedPresets[lastRandomIndex] = preset;
            } else {
                this.savedPresets.push(preset);
            }

            this.savePresets();
            this.updatePresetSelector();
        }
    }

    // Kaleidoscope
    initKaleidoscope() {
        const container = document.getElementById('visualizationContainer');
        const rect = container.getBoundingClientRect();

        // Create video kaleidoscope canvas if needed
        if (!this.kaleidoscopeVideoCanvas) {
            this.kaleidoscopeVideoCanvas = document.createElement('canvas');
            this.kaleidoscopeVideoCanvas.className = 'kaleidoscope-canvas kaleidoscope-video';
            this.kaleidoscopeVideoCanvas.style.display = 'none';
            this.kaleidoscopeVideoCanvas.style.zIndex = '2'; // Above video but below viz
            container.appendChild(this.kaleidoscopeVideoCanvas);
            this.kaleidoscopeVideoCtx = this.kaleidoscopeVideoCanvas.getContext('2d');
        }

        // Create viz kaleidoscope canvas if needed
        if (!this.kaleidoscopeVizCanvas) {
            this.kaleidoscopeVizCanvas = document.createElement('canvas');
            this.kaleidoscopeVizCanvas.className = 'kaleidoscope-canvas kaleidoscope-viz';
            this.kaleidoscopeVizCanvas.style.display = 'none';
            this.kaleidoscopeVizCanvas.style.zIndex = '3'; // On top
            container.appendChild(this.kaleidoscopeVizCanvas);
            this.kaleidoscopeVizCtx = this.kaleidoscopeVizCanvas.getContext('2d');
        }

        // Set canvas sizes
        this.kaleidoscopeVideoCanvas.width = rect.width;
        this.kaleidoscopeVideoCanvas.height = rect.height;
        this.kaleidoscopeVizCanvas.width = rect.width;
        this.kaleidoscopeVizCanvas.height = rect.height;
    }

    toggleKaleidoscope() {
        const panel = document.getElementById('kaleidoscopePanel');
        const btn = document.getElementById('kaleidoscopeBtn');
        const btnText = btn.querySelector('.kaleidoscope-btn-text');

        // Toggle panel visibility
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';

            // Update button based on kaleidoscope state (not panel state)
            if (this.kaleidoscopeEnabled) {
                btnText.textContent = 'Kaleidoscope On';
                btn.classList.add('active');
            } else {
                btnText.textContent = 'Kaleidoscope Off';
                btn.classList.remove('active');
            }
        }
    }

    toggleHeaderKaleidoscope() {
        const panel = document.getElementById('headerKaleidoscopePanel');
        const btn = document.getElementById('headerKaleidoscopeBtn');
        const btnText = btn.querySelector('.kaleidoscope-btn-text');

        // Toggle panel visibility
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            if (isVisible) {
                panel.style.display = 'none';
            } else {
                // Position panel below button like video panel
                const buttonRect = btn.getBoundingClientRect();
                panel.style.position = 'fixed';
                panel.style.top = `${buttonRect.bottom + 4}px`; // 4px gap below button
                panel.style.left = `${buttonRect.left}px`;
                panel.style.display = 'block';
            }

            // Update button based on kaleidoscope state (not panel state)
            if (this.kaleidoscopeEnabled) {
                btnText.textContent = 'Kaleidoscope On';
                btn.classList.add('active');
            } else {
                btnText.textContent = 'Kaleidoscope Off';
                btn.classList.remove('active');
            }
        }
    }
    
    toggleInfiniteZoom() {
        const panel = document.getElementById('infiniteZoomPanel');
        const btn = document.getElementById('infiniteZoomBtn');
        const btnText = btn.querySelector('.kaleidoscope-btn-text');
        
        // Toggle panel visibility
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                // Panel is opening - toggle infinite zoom state
                if (this.infiniteZoom) {
                    if (this.infiniteZoom.isActive) {
                        this.infiniteZoom.stop();
                        btnText.textContent = 'Infinite Zoom Off';
                        btn.classList.remove('active');
                    } else {
                        this.infiniteZoom.initialize();
                        this.infiniteZoom.start();
                        btnText.textContent = 'Infinite Zoom On';
                        btn.classList.add('active');
                    }
                }
            }
        }
    }

    toggleHeaderInfiniteZoom() {
        const panel = document.getElementById('headerInfiniteZoomPanel');
        const btn = document.getElementById('headerInfiniteZoomBtn');
        const btnText = btn.querySelector('.infinite-zoom-btn-text');
        
        // Toggle panel visibility
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            if (isVisible) {
                panel.style.display = 'none';
            } else {
                // Position panel below button like video panel
                const buttonRect = btn.getBoundingClientRect();
                panel.style.position = 'fixed';
                panel.style.top = `${buttonRect.bottom + 4}px`; // 4px gap below button
                panel.style.left = `${buttonRect.left}px`;
                panel.style.display = 'block';
            }
            
            if (!isVisible) {
                // Panel is opening - toggle infinite zoom state
                if (this.infiniteZoom) {
                    if (this.infiniteZoom.isActive) {
                        this.infiniteZoom.stop();
                        btnText.textContent = 'Infinite Zoom Off';
                        btn.classList.remove('active');
                    } else {
                        this.infiniteZoom.initialize();
                        this.infiniteZoom.start();
                        btnText.textContent = 'Infinite Zoom On';
                        btn.classList.add('active');
                    }
                }
            }
        }
    }

    startKaleidoscopeAnimation() {
        const animate = () => {
            if (!this.kaleidoscopeEnabled) 
                return;
            


            // Continue animating even if visualization is disabled

            // Update beat reaction
            this.updateKaleidoscopeBeatReaction();

            // Calculate rotation with curve (exponential easing)
            let effectiveSpeed = this.kaleidoscopeSpeed;
            if (effectiveSpeed > 0) { // Apply exponential curve for smoother acceleration
                effectiveSpeed = Math.pow(effectiveSpeed / 6, 1.5) * 6;
            }

            // Add beat boost if enabled
            if (this.kaleidoscopeTempSpeedBoost) {
                effectiveSpeed += this.kaleidoscopeTempSpeedBoost;
            }

            // Update base rotation (reduced from 0.01 to 0.006 for 60% speed)
            if (effectiveSpeed > 0) {
                this.kaleidoscopeRotation += effectiveSpeed * 0.006;
            }

            // Update individual ring rotations
            for (let i = 0; i < this.kaleidoscopeRingRotations.length; i++) {
                const speedMultiplier = 1 + (i * this.kaleidoscopeRingSpeedMultiplier);
                this.kaleidoscopeRingRotations[i] += effectiveSpeed * 0.006 * speedMultiplier;
            }

            this.applyKaleidoscopeEffect();
            this.kaleidoscopeAnimationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    stopKaleidoscopeAnimation() {
        if (this.kaleidoscopeAnimationFrame) {
            cancelAnimationFrame(this.kaleidoscopeAnimationFrame);
            this.kaleidoscopeAnimationFrame = null;
        }

        // Clear kaleidoscope canvases
        if (this.kaleidoscopeVideoCtx) {
            this.kaleidoscopeVideoCtx.clearRect(0, 0, this.kaleidoscopeVideoCanvas.width, this.kaleidoscopeVideoCanvas.height);
        }
        if (this.kaleidoscopeVizCtx) {
            this.kaleidoscopeVizCtx.clearRect(0, 0, this.kaleidoscopeVizCanvas.width, this.kaleidoscopeVizCanvas.height);
        }

        // Hide kaleidoscope canvases
        if (this.kaleidoscopeVideoCanvas) {
            this.kaleidoscopeVideoCanvas.style.display = 'none';
        }
        if (this.kaleidoscopeVizCanvas) {
            this.kaleidoscopeVizCanvas.style.display = 'none';
        }
        
        // Show the original visualization canvas when kaleidoscope is stopped
        if (this.audioMotion && this.audioMotion.canvas) {
            this.audioMotion.canvas.style.visibility = 'visible';
        }

        // Restore video opacity if needed
        if (this.videoElement && this.videoMode === 'camera') {
            this.videoElement.style.opacity = this.videoOpacity.toString();
        }
    }

    updateKaleidoscopeBeatReaction() {
        if (!this.kaleidoscopeBeatReactive || !this.audioMotion || !this.audioMotion.dataArray) 
            return;
        


        let energy = 0;
        const dataArray = this.audioMotion.dataArray;
        const sampleEnd = Math.min(Math.floor(dataArray.length * 0.4), dataArray.length);

        for (let i = 0; i < sampleEnd; i++) {
            energy += dataArray[i];
        }
        energy = energy / sampleEnd / 255;

        // Scale reaction
        const scaleBoost = 1 + (energy * this.kaleidoscopeBeatSensitivity * 2);
        const newScale = Math.min(2, Math.max(0.3, this.kaleidoscopeBaseScale * scaleBoost));
        this.kaleidoscopeScale = newScale;

        // Rotation speed reaction
        if (this.kaleidoscopeBeatRotation) {
            const rotationBoost = energy * this.kaleidoscopeBeatSensitivity * 5;
            this.kaleidoscopeTempSpeedBoost = rotationBoost;
        } else {
            this.kaleidoscopeTempSpeedBoost = 0;
        }

        // Shape change on beat - FIXED VERSION
        if (this.kaleidoscopeBeatShape) { // Initialize cooldown if not exists
            if (this.shapeChangeCooldown === undefined) {
                this.shapeChangeCooldown = false;
            }

            // Lower threshold and check for beat spike
            const threshold = 0.4 * this.kaleidoscopeBeatSensitivity; // Adjustable with sensitivity

            if (!this.shapeChangeCooldown && energy > threshold) {
                const shapes = ['triangle', 'petal', 'rectangle'];
                const currentIndex = shapes.indexOf(this.kaleidoscopeShape);
                this.kaleidoscopeShape = shapes[(currentIndex + 1) % shapes.length];

                // Update UI
                const shapeBtn = document.getElementById('kaleidoscopeShapeBtn');
                if (shapeBtn) {
                    shapeBtn.textContent = `Shape: ${
                        this.kaleidoscopeShape.charAt(0).toUpperCase() + this.kaleidoscopeShape.slice(1)
                    }`;
                }

                // Set cooldown
                this.shapeChangeCooldown = true;
                setTimeout(() => {
                    this.shapeChangeCooldown = false;
                }, 300); // Reduced from 500ms for more responsive changes
            }
        }

        // Update scale slider
        const scaleSlider = document.getElementById('kaleidoscopeScale');
        const scaleValue = document.getElementById('kaleidoscopeScaleValue');
        if (scaleSlider && scaleValue) {
            scaleSlider.value = Math.round(newScale * 100);
            scaleValue.textContent = `${
                Math.round(newScale * 100)
            }%`;
        }
    }
    applyKaleidoscopePreset(preset) {
        this.kaleidoscopeSegments = preset.segments;
        this.kaleidoscopeRings = preset.rings;
        this.kaleidoscopeShape = preset.shape;
        this.kaleidoscopeScale = preset.scale / 100;
        this.kaleidoscopeSpeed = preset.speed;
        this.kaleidoscopeRingSpacing = preset.ringSpacing / 100;

        // Update UI sliders
        document.getElementById('kaleidoscopeSegments').value = preset.segments;
        document.getElementById('kaleidoscopeSegmentsValue').textContent = preset.segments;
        document.getElementById('kaleidoscopeRings').value = preset.rings;
        document.getElementById('kaleidoscopeRingsValue').textContent = preset.rings;
        document.getElementById('kaleidoscopeSpeed').value = preset.speed;
        document.getElementById('kaleidoscopeSpeedValue').textContent = preset.speed;
        document.getElementById('kaleidoscopeScale').value = preset.scale;
        document.getElementById('kaleidoscopeScaleValue').textContent = `${
            preset.scale
        }%`;
        document.getElementById('kaleidoscopeRingSpacing').value = preset.ringSpacing;
        document.getElementById('kaleidoscopeRingSpacingValue').textContent = `${
            preset.ringSpacing
        }%`;

        const shapeBtn = document.getElementById('kaleidoscopeShapeBtn');
        if (shapeBtn) {
            shapeBtn.textContent = `Shape: ${
                preset.shape.charAt(0).toUpperCase() + preset.shape.slice(1)
            }`;
        }

        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }

    applyFiltersToKaleidoscopeContext() {
        if (!this.kaleidoscopeVideoCtx) return;
        
        // Apply the same filters to the kaleidoscope canvas context
        let filters = [];

        // Apply posterize FIRST with much stronger effect (same logic as applyVideoFilters)
        if (this.videoPosterize < 16) {
            const steps = this.videoPosterize;
            const posterizeAmount = (16 - steps) / 16;

            filters.push(`contrast(${300 + posterizeAmount * 200}%)`);
            filters.push(`brightness(${95}%)`);
            filters.push(`saturate(${200}%)`);

            if (steps < 8) {
                filters.push(`contrast(${150}%)`);
            }
        }

        // Then apply other adjustments
        if (this.videoBrightness !== 100 && this.videoPosterize >= 16) {
            filters.push(`brightness(${this.videoBrightness}%)`);
        }
        if (this.videoContrast !== 100 && this.videoPosterize >= 16) {
            filters.push(`contrast(${this.videoContrast}%)`);
        }
        if (this.videoSaturation !== 100 && this.videoPosterize >= 16) {
            filters.push(`saturate(${this.videoSaturation}%)`);
        }
        if (this.videoHueRotate !== 0) {
            filters.push(`hue-rotate(${this.videoHueRotate}deg)`);
        }
        if (this.videoGrayscale > 0) {
            filters.push(`grayscale(${this.videoGrayscale}%)`);
        }
        if (this.videoSepia > 0) {
            filters.push(`sepia(${this.videoSepia}%)`);
        }
        if (this.videoBlur > 0) {
            filters.push(`blur(${this.videoBlur}px)`);
        }
        if (this.videoInvert) {
            filters.push('invert(100%)');
        }

        // Apply combined filters to the kaleidoscope canvas
        this.kaleidoscopeVideoCanvas.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
        
        // Apply pulse animation if enabled
        if (this.videoPulse) {
            this.kaleidoscopeVideoCanvas.classList.add('pulse-active');
            this.kaleidoscopeVideoCanvas.style.setProperty('--pulse-duration', `${this.videoPulseRate}s`);
        } else {
            this.kaleidoscopeVideoCanvas.classList.remove('pulse-active');
        }
        
        console.log('Applied filters to kaleidoscope canvas:', this.kaleidoscopeVideoCanvas.style.filter);
    }

    applyKaleidoscopeEffect() {
        if (!this.kaleidoscopeVideoCanvas || !this.kaleidoscopeVizCanvas) {
            console.error('Kaleidoscope canvases not initialized');
            return;
        }

        console.log('Applying kaleidoscope effect:', {
            videoMode: this.videoMode,
            applyToVideo: this.kaleidoscopeApplyToVideo,
            applyToViz: this.kaleidoscopeApplyToViz,
            videoElement: !!this.videoElement,
            captureVideoElement: !!this.captureVideoElement,
            videoReady: this.videoElement ?. readyState,
            captureReady: this.captureVideoElement ?. readyState
        });

        let width = this.kaleidoscopeVideoCanvas.width;
        let height = this.kaleidoscopeVideoCanvas.height;

        // Make sure canvases are properly sized
        if (width === 0 || height === 0) {
            const container = document.getElementById('visualizationContainer');
            const rect = container.getBoundingClientRect();
            this.kaleidoscopeVideoCanvas.width = rect.width;
            this.kaleidoscopeVideoCanvas.height = rect.height;
            this.kaleidoscopeVizCanvas.width = rect.width;
            this.kaleidoscopeVizCanvas.height = rect.height;
            width = rect.width;
            height = rect.height;
            console.log('Resized kaleidoscope canvases to:', width, 'x', height);
        }

        // Skip viz kaleidoscope if visualization is disabled
        if (!this.visualizationEnabled) {
            if (this.kaleidoscopeVizCanvas) {
                this.kaleidoscopeVizCanvas.style.display = 'none';
            }
            // Still process video kaleidoscope if enabled
        }

        const centerX = width * this.kaleidoscopeCenterX;
        const centerY = height * this.kaleidoscopeCenterY;
        const angleStep = (Math.PI * 2) / this.kaleidoscopeSegments;

        // Calculate base radius for 90% viewport fill
        const baseRadius = width * 0.45;
        let shapeRadius;

        switch (this.kaleidoscopeShape) {
            case 'petal': shapeRadius = baseRadius * 1.0;
                break;
            case 'rectangle': shapeRadius = baseRadius * 1.0;
                break;
            case 'triangle':
            default: shapeRadius = baseRadius * 1.1;
                break;
        }

        // Apply kaleidoscope to VIDEO if enabled
        if (this.kaleidoscopeApplyToVideo && (this.videoMode === 'camera' || this.videoMode === 'file')) {
            let videoSource = null;

            if (this.captureVideoElement && this.captureVideoElement.readyState >= 2) {
                videoSource = this.captureVideoElement;
                console.log('Using captureVideoElement for kaleidoscope');
            } else if (this.videoElement && this.videoElement.readyState >= 2) {
                videoSource = this.videoElement;
                console.log('Using videoElement for kaleidoscope');
            } else {
                console.warn('No video source ready for kaleidoscope');
            }

            if (videoSource) {
                this.kaleidoscopeVideoCanvas.style.display = 'block';
                this.kaleidoscopeVideoCtx.clearRect(0, 0, width, height);

                console.log('Drawing video kaleidoscope with', this.kaleidoscopeSegments, 'segments');
                
                // Apply video filters to kaleidoscope canvas
                this.applyFiltersToKaleidoscopeContext();
                
                // Apply video opacity to kaleidoscope canvas
                this.kaleidoscopeVideoCanvas.style.opacity = this.videoOpacity.toString();

                // Draw multiple rings for VIDEO
                for (let ring = 0; ring < this.kaleidoscopeRings; ring++) {
                    const ringScale = this.kaleidoscopeScale * Math.pow(1 - this.kaleidoscopeRingSpacing, ring);
                    const ringRotationOffset = this.kaleidoscopeRingRotations[ring] || (ring * (Math.PI / this.kaleidoscopeSegments));

                    // Draw video kaleidoscope segments for this ring
                    for (let i = 0; i < this.kaleidoscopeSegments; i++) {
                        this.kaleidoscopeVideoCtx.save();
                        this.kaleidoscopeVideoCtx.translate(centerX, centerY);
                        this.kaleidoscopeVideoCtx.rotate(angleStep * i + this.kaleidoscopeRotation + ringRotationOffset);
                        this.kaleidoscopeVideoCtx.scale(ringScale, ringScale);

                        // Create clipping path based on shape
                        this.kaleidoscopeVideoCtx.beginPath();

                        switch (this.kaleidoscopeShape) {
                            case 'petal':
                                // Curved petal shape
                                this.kaleidoscopeVideoCtx.moveTo(0, 0);
                                const scaleAdjust = Math.max(1, this.kaleidoscopeScale);
                                const petalAngle = angleStep * (1.2 * scaleAdjust);
                                const controlRadius = shapeRadius * 0.7;
                                this.kaleidoscopeVideoCtx.quadraticCurveTo(controlRadius * Math.cos(petalAngle * 0.3), controlRadius * Math.sin(petalAngle * 0.3), shapeRadius * Math.cos(petalAngle * 0.5), shapeRadius * Math.sin(petalAngle * 0.5));
                                this.kaleidoscopeVideoCtx.quadraticCurveTo(controlRadius * Math.cos(petalAngle * 0.7), controlRadius * Math.sin(petalAngle * 0.7), 0, 0);
                                break;

                            case 'rectangle':
                                // Draw rectangle as a path from origin
                                const rectAngle = angleStep * 0.45;
                                this.kaleidoscopeVideoCtx.moveTo(0, 0);
                                this.kaleidoscopeVideoCtx.lineTo(shapeRadius * Math.cos(- rectAngle), shapeRadius * Math.sin(- rectAngle));
                                this.kaleidoscopeVideoCtx.lineTo(shapeRadius * Math.cos(- rectAngle), shapeRadius * Math.sin(- rectAngle) + shapeRadius * 0.3);
                                this.kaleidoscopeVideoCtx.lineTo(shapeRadius * Math.cos(rectAngle), shapeRadius * Math.sin(rectAngle) + shapeRadius * 0.3);
                                this.kaleidoscopeVideoCtx.lineTo(shapeRadius * Math.cos(rectAngle), shapeRadius * Math.sin(rectAngle));
                                this.kaleidoscopeVideoCtx.lineTo(0, 0);
                                break;

                            case 'triangle':
                            default:
                                // Original triangular shape
                                this.kaleidoscopeVideoCtx.moveTo(0, 0);
                                this.kaleidoscopeVideoCtx.lineTo(shapeRadius * Math.cos(0), shapeRadius * Math.sin(0));
                                this.kaleidoscopeVideoCtx.lineTo(shapeRadius * Math.cos(angleStep), shapeRadius * Math.sin(angleStep));
                                break;
                        }

                        this.kaleidoscopeVideoCtx.closePath();
                        this.kaleidoscopeVideoCtx.clip();

                        // Set opacity based on ring number for better visibility
                        this.kaleidoscopeVideoCtx.globalAlpha = 1 - (ring * 0.15);

                        // Apply mirror transformation if needed
                        if (this.videoMirror === 'horizontal' || this.videoMirror === 'both') {
                            this.kaleidoscopeVideoCtx.scale(-1, 1);
                        }
                        if (this.videoMirror === 'vertical' || this.videoMirror === 'both') {
                            this.kaleidoscopeVideoCtx.scale(1, -1);
                        }

                        // Draw segment
                        if (i % 2 === 0) {
                            this.kaleidoscopeVideoCtx.drawImage(videoSource, - centerX / ringScale, - centerY / ringScale, width / ringScale, height / ringScale);
                        } else {
                            this.kaleidoscopeVideoCtx.scale(1, -1);
                            this.kaleidoscopeVideoCtx.drawImage(videoSource, - centerX / ringScale, - centerY / ringScale, width / ringScale, height / ringScale);
                        }
                        this.kaleidoscopeVideoCtx.restore();
                    }
                }

                // Hide original video when kaleidoscope is active
                if (this.videoElement) {
                    this.videoElement.style.opacity = '0';
                }

                console.log('Video kaleidoscope drawn successfully');
            } else {
                console.warn('Video source not ready for kaleidoscope');
            }
        } else {
            this.kaleidoscopeVideoCanvas.style.display = 'none';
            if (this.videoElement && this.videoMode === 'camera') {
                this.videoElement.style.opacity = this.videoOpacity.toString();
            }
        }

        // Check if we need to draw kaleidoscope (either AM viz or IZ)
        const shouldDrawKaleidoscope = (this.kaleidoscopeApplyToViz && this.audioMotion && this.audioMotion.canvas && this.visualizationEnabled) ||
                                     (this.kaleidoscopeApplyToInfiniteZoom && this.infiniteZoom && this.infiniteZoom.isActive && this.infiniteZoom.canvas);

        if (shouldDrawKaleidoscope) {
            this.kaleidoscopeVizCanvas.style.display = 'block';
            this.kaleidoscopeVizCtx.clearRect(0, 0, width, height);

            console.log('Drawing viz kaleidoscope');

            // Hide the original visualization canvas when kaleidoscope is active
            if (this.audioMotion && this.audioMotion.canvas) {
                this.audioMotion.canvas.style.visibility = 'hidden';
            }

            // Draw multiple rings for VISUALIZATION
            for (let ring = 0; ring < this.kaleidoscopeRings; ring++) {
                const ringScale = this.kaleidoscopeScale * Math.pow(1 - this.kaleidoscopeRingSpacing, ring);
                const ringRotationOffset = this.kaleidoscopeRingRotations[ring] || (ring * (Math.PI / this.kaleidoscopeSegments));

                // Draw viz kaleidoscope segments for this ring
                for (let i = 0; i < this.kaleidoscopeSegments; i++) {
                    this.kaleidoscopeVizCtx.save();
                    this.kaleidoscopeVizCtx.translate(centerX, centerY);
                    this.kaleidoscopeVizCtx.rotate(angleStep * i + this.kaleidoscopeRotation + ringRotationOffset);
                    this.kaleidoscopeVizCtx.scale(ringScale, ringScale);

                    // Create clipping path based on shape
                    this.kaleidoscopeVizCtx.beginPath();

                    switch (this.kaleidoscopeShape) {
                        case 'petal':
                            // Curved petal shape
                            this.kaleidoscopeVizCtx.moveTo(0, 0);
                            const petalAngle = angleStep * 0.8;
                            const controlRadius = shapeRadius * 0.7;
                            this.kaleidoscopeVizCtx.quadraticCurveTo(controlRadius * Math.cos(petalAngle * 0.3), controlRadius * Math.sin(petalAngle * 0.3), shapeRadius * Math.cos(petalAngle * 0.5), shapeRadius * Math.sin(petalAngle * 0.5));
                            this.kaleidoscopeVizCtx.quadraticCurveTo(controlRadius * Math.cos(petalAngle * 0.7), controlRadius * Math.sin(petalAngle * 0.7), 0, 0);
                            break;

                        case 'rectangle':
                            // Draw rectangle as a path from origin
                            const rectAngle = angleStep * 0.45;
                            this.kaleidoscopeVizCtx.moveTo(0, 0);
                            this.kaleidoscopeVizCtx.lineTo(shapeRadius * Math.cos(- rectAngle), shapeRadius * Math.sin(- rectAngle));
                            this.kaleidoscopeVizCtx.lineTo(shapeRadius * Math.cos(- rectAngle), shapeRadius * Math.sin(- rectAngle) + shapeRadius * 0.3);
                            this.kaleidoscopeVizCtx.lineTo(shapeRadius * Math.cos(rectAngle), shapeRadius * Math.sin(rectAngle) + shapeRadius * 0.3);
                            this.kaleidoscopeVizCtx.lineTo(shapeRadius * Math.cos(rectAngle), shapeRadius * Math.sin(rectAngle));
                            this.kaleidoscopeVizCtx.lineTo(0, 0);
                            break;

                        case 'triangle':
                        default:
                            // Original triangular shape
                            this.kaleidoscopeVizCtx.moveTo(0, 0);
                            this.kaleidoscopeVizCtx.lineTo(shapeRadius * Math.cos(0), shapeRadius * Math.sin(0));
                            this.kaleidoscopeVizCtx.lineTo(shapeRadius * Math.cos(angleStep), shapeRadius * Math.sin(angleStep));
                            break;
                    }

                    this.kaleidoscopeVizCtx.closePath();
                    this.kaleidoscopeVizCtx.clip();

                    // Set opacity based on ring number for better visibility
                    this.kaleidoscopeVizCtx.globalAlpha = 1 - (ring * 0.15);

                    // Draw segment - include main visualization and/or infinite zoom
                    if (i % 2 === 0) {
                        // Draw main visualization if enabled and available
                        if (this.kaleidoscopeApplyToViz && this.audioMotion && this.audioMotion.canvas && this.visualizationEnabled) {
                        this.kaleidoscopeVizCtx.drawImage(this.audioMotion.canvas, - centerX / ringScale, - centerY / ringScale, width / ringScale, height / ringScale);
                        }
                        
                        // Draw infinite zoom if active and enabled for kaleidoscope
                        if (this.infiniteZoom && this.infiniteZoom.isActive && this.infiniteZoom.canvas && this.kaleidoscopeApplyToInfiniteZoom) {
                            this.kaleidoscopeVizCtx.drawImage(this.infiniteZoom.canvas, - centerX / ringScale, - centerY / ringScale, width / ringScale, height / ringScale);
                        }
                    } else {
                        this.kaleidoscopeVizCtx.scale(1, -1);
                        // Draw main visualization if enabled and available
                        if (this.kaleidoscopeApplyToViz && this.audioMotion && this.audioMotion.canvas && this.visualizationEnabled) {
                        this.kaleidoscopeVizCtx.drawImage(this.audioMotion.canvas, - centerX / ringScale, - centerY / ringScale, width / ringScale, height / ringScale);
                        }
                        
                        // Draw infinite zoom if active and enabled for kaleidoscope
                        if (this.infiniteZoom && this.infiniteZoom.isActive && this.infiniteZoom.canvas && this.kaleidoscopeApplyToInfiniteZoom) {
                            this.kaleidoscopeVizCtx.drawImage(this.infiniteZoom.canvas, - centerX / ringScale, - centerY / ringScale, width / ringScale, height / ringScale);
                        }
                    }
                    this.kaleidoscopeVizCtx.restore();
                }
            }

            console.log('Viz kaleidoscope drawn successfully');
        } else {
            this.kaleidoscopeVizCanvas.style.display = 'none';
            // Show the original visualization canvas when kaleidoscope is not active
            if (this.audioMotion && this.audioMotion.canvas) {
                this.audioMotion.canvas.style.visibility = 'visible';
            }
        }
    }
    setKaleidoscopeSegments(value) {
        this.kaleidoscopeSegments = value;
        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }

    setKaleidoscopeSpeed(value) {
        this.kaleidoscopeSpeed = value;
    }

    setKaleidoscopeScale(value) {
        this.kaleidoscopeScale = value / 100;
        // Store as base scale when manually adjusted
        if (!this.kaleidoscopeBeatReactive) {
            this.kaleidoscopeBaseScale = this.kaleidoscopeScale;
        }
        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }

    setKaleidoscopeCenterX(value) {
        this.kaleidoscopeCenterX = value / 100;
        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }

    setKaleidoscopeCenterY(value) {
        this.kaleidoscopeCenterY = value / 100;
        if (this.kaleidoscopeEnabled) {
            this.applyKaleidoscopeEffect();
        }
    }


    // End Kaleid0scope

    generateNewMorphTarget() { // Start with locked parameters if they exist
        const baseConfig = this.lockedMorphParams || {};

        // Check if we're in radial mode
        const isRadial = baseConfig.radial !== undefined ? baseConfig.radial : Math.random() > 0.6;

        // Use locked spinSpeed if it exists, otherwise keep current
        const spinSpeed = baseConfig.spinSpeed !== undefined ? baseConfig.spinSpeed : (this.morphStartConfig ? this.morphStartConfig.spinSpeed : 0);

        this.morphTargetConfig = {
            // Keep locked parameters unchanged
            mode: baseConfig.mode !== undefined ? baseConfig.mode : Math.floor(Math.random() * 11),
            radial: isRadial,
            mirror: baseConfig.mirror !== undefined ? baseConfig.mirror : (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0),
            ledBars: baseConfig.ledBars !== undefined ? baseConfig.ledBars : false,
            ansiBands: baseConfig.ansiBands !== undefined ? baseConfig.ansiBands : Math.random() > 0.7,
            channelLayout: baseConfig.channelLayout || 'single',
            frequencyScale: baseConfig.frequencyScale || this.morphStartConfig.frequencyScale,
            spinSpeed: spinSpeed,
            // Use the preserved spin speed

            // Variable parameters that can change
            barSpace: Math.random() * 0.05,
            fillAlpha: isRadial ? 1 : 0.8 + Math.random() * 0.2,
            smoothing: 0.3 + Math.random() * 0.5,
            gradient: [
                'classic',
                'rainbow',
                'prism',
                'steelblue',
                'orangered'
            ][Math.floor(Math.random() * 5)],
            showPeaks: Math.random() > 0.5,
            radius: isRadial ? 0.8 + Math.random() * 0.6 : 0.3 + Math.random() * 0.5,
            reflexRatio: Math.random() * 0.5,
            reflexAlpha: 0.5 + Math.random() * 0.5,
            roundBars: Math.random() > 0.5,
            lineWidth: isRadial ? 4 + Math.random() * 4 : Math.random() * 2,
            bgAlpha: 0.5 + Math.random() * 0.5,

            // Critical parameters for visibility - boost these for radial
            fftSize: 8192,
            maxDecibels: isRadial ? -15 + Math.random() * 5 : -20 + Math.random() * 10,
            minDecibels: isRadial ? -70 + Math.random() * 10 : -80 + Math.random() * 10,
            maxFreq: 16000 + Math.random() * 6000,
            minFreq: 20 + Math.random() * 30,
            linearAmplitude: true,
            linearBoost: isRadial ? 3 + Math.random() * 3 : 2 + Math.random() * 3,
            volume: isRadial ? 2 + Math.random() * 1.5 : 1.5 + Math.random() * 1,

            // Other parameters
            alphaBars: false,
            colorMode: 'gradient',
            fadePeaks: false,
            loRes: false,
            lumiBars: false,
            maxFPS: 0,
            noteLabels: false,
            outlineBars: Math.random() > 0.7,
            overlay: false,
            peakFadeTime: 500 + Math.random() * 500,
            peakHoldTime: 300 + Math.random() * 400,
            peakLine: false,
            reflexBright: 1,
            reflexFit: true,
            showBgColor: true,
            showFPS: false,
            showScaleY: false,
            splitGradient: false,
            trueLeds: baseConfig.mode === 6 ? Math.random() > 0.5 : false,
            useCanvas: true,
            weightingFilter: ''
        };
    }

    // Preset Methods
    loadPresets() {
        try {
            const saved = localStorage.getItem('gitup_presets');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading presets:', e);
            return [];
        }
    }

    // Background Image Methods
    loadBackgroundImage() {
        try {
            const saved = localStorage.getItem('gitup_background_image');
            if (saved) {
                const data = JSON.parse(saved);
                this.backgroundImage = data.imageData;
                this.backgroundImageEnabled = data.enabled || false;
                this.backgroundImageOpacity = data.opacity || 100;
                this.backgroundImageSaturation = data.saturation || 100;
                this.backgroundImagePosterize = data.posterize || 16;
                this.backgroundImageContrast = data.contrast || 100;
                this.backgroundImageSize = data.size || 'original';
                this.backgroundImageFileName = data.fileName || '';
                this.backgroundImageFileSize = data.fileSize || 0;
                return true;
            }
        } catch (e) {
            console.error('Error loading background image:', e);
        }
        return false;
    }

    saveBackgroundImage() {
        try {
            const data = {
                imageData: this.backgroundImage,
                enabled: this.backgroundImageEnabled,
                opacity: this.backgroundImageOpacity,
                saturation: this.backgroundImageSaturation,
                posterize: this.backgroundImagePosterize,
                contrast: this.backgroundImageContrast,
                size: this.backgroundImageSize,
                fileName: this.backgroundImageFileName,
                fileSize: this.backgroundImageFileSize
            };
            localStorage.setItem('gitup_background_image', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving background image:', e);
        }
    }

    clearBackgroundImage() {
        this.backgroundImage = null;
        this.backgroundImageEnabled = false;
        this.backgroundImageOpacity = 100;
        this.backgroundImageSaturation = 100;
        this.backgroundImagePosterize = 16;
        this.backgroundImageContrast = 100;
        this.backgroundImageSize = 'original';
        this.backgroundImageFileName = '';
        this.backgroundImageFileSize = 0;
        this.cachedBackgroundImage = null; // Clear cached image
        localStorage.removeItem('gitup_background_image');
    }

    drawBackgroundImage(ctx, canvasWidth, canvasHeight) {
        // console.log('🎨 drawBackgroundImage called:', {
        //     hasImage: !!this.backgroundImage,
        //     enabled: this.backgroundImageEnabled,
        //     opacity: this.backgroundImageOpacity,
        //     saturation: this.backgroundImageSaturation,
        //     canvasSize: `${canvasWidth}x${canvasHeight}`,
        //     contextType: ctx.constructor.name
        // });

        if (!this.backgroundImage || !this.backgroundImageEnabled) {
            console.log('❌ Background image not drawn - missing image or disabled');
            return;
        }

        // Use cached image if available, otherwise create and cache it
        if (!this.cachedBackgroundImage) {
            this.cachedBackgroundImage = new Image();
            this.cachedBackgroundImage.onload = () => {
                console.log('🖼️ Background image cached:', {
                    imageSize: `${this.cachedBackgroundImage.width}x${this.cachedBackgroundImage.height}`,
                    dataUrlLength: this.backgroundImage.length
                });
            };
            this.cachedBackgroundImage.onerror = (e) => {
                console.error('❌ Background image failed to load:', e);
                this.cachedBackgroundImage = null;
            };
            this.cachedBackgroundImage.src = this.backgroundImage;
        }

        // Only draw if image is loaded
        if (this.cachedBackgroundImage && this.cachedBackgroundImage.complete && this.cachedBackgroundImage.naturalWidth > 0) {
            // console.log('🖼️ Drawing cached background image:', {
            //     imageSize: `${this.cachedBackgroundImage.width}x${this.cachedBackgroundImage.height}`,
            //     dataUrlLength: this.backgroundImage.length
            // });

            // Calculate dimensions based on sizing option
            const imgAspect = this.cachedBackgroundImage.width / this.cachedBackgroundImage.height;
            const canvasAspect = canvasWidth / canvasHeight;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            switch (this.backgroundImageSize) {
                case 'fit':
                    // Scale to fit within canvas while maintaining aspect ratio
                    if (imgAspect > canvasAspect) {
                        drawWidth = canvasWidth;
                        drawHeight = canvasWidth / imgAspect;
                    } else {
                        drawHeight = canvasHeight;
                        drawWidth = canvasHeight * imgAspect;
                    }
                    drawX = (canvasWidth - drawWidth) / 2;
                    drawY = (canvasHeight - drawHeight) / 2;
                    break;
                    
                case 'fill':
                    // Scale to fill entire canvas, cropping if necessary
                    if (imgAspect > canvasAspect) {
                        drawHeight = canvasHeight;
                        drawWidth = canvasHeight * imgAspect;
                        drawX = (canvasWidth - drawWidth) / 2;
                        drawY = 0;
                    } else {
                        drawWidth = canvasWidth;
                        drawHeight = canvasWidth / imgAspect;
                        drawX = 0;
                        drawY = (canvasHeight - drawHeight) / 2;
                    }
                    break;
                    
                case 'stretch':
                    // Scale to fill entire canvas, distorting aspect ratio
                    drawWidth = canvasWidth;
                    drawHeight = canvasHeight;
                    drawX = 0;
                    drawY = 0;
                    break;
                    
                case 'original':
                default:
                    // Display at original size, centered
                    drawWidth = this.cachedBackgroundImage.width;
                    drawHeight = this.cachedBackgroundImage.height;
                    drawX = (canvasWidth - drawWidth) / 2;
                    drawY = (canvasHeight - drawHeight) / 2;
                    break;
            }

            // console.log('📐 Background image draw calculations:', {
            //     imgAspect,
            //     canvasAspect,
            //     drawX, drawY, drawWidth, drawHeight
            // });

            ctx.save();
            ctx.globalAlpha = this.backgroundImageOpacity / 100;
            // console.log('🎭 Applied opacity:', ctx.globalAlpha);
            
            // Build filter string for all effects
            const filters = [];
            
            // Apply posterization effect (same as video posterization)
            if (this.backgroundImagePosterize < 16) {
                const steps = this.backgroundImagePosterize;
                const posterizeAmount = (16 - steps) / 16;
                filters.push(`contrast(${300 + posterizeAmount * 200}%)`);
                filters.push(`brightness(95%)`);
                filters.push(`saturate(200%)`);
                if (steps < 8) {
                    filters.push(`contrast(150%)`);
                }
            }
            
            // Apply contrast filter
            if (this.backgroundImageContrast !== 100) {
                filters.push(`contrast(${this.backgroundImageContrast}%)`);
            }
            
            // Apply saturation filter
            if (this.backgroundImageSaturation !== 100) {
                filters.push(`saturate(${this.backgroundImageSaturation}%)`);
            }
            
            // Apply all filters
            if (filters.length > 0) {
                ctx.filter = filters.join(' ');
                console.log('🎨 Applied background image filters:', ctx.filter);
            }
            
            ctx.drawImage(this.cachedBackgroundImage, drawX, drawY, drawWidth, drawHeight);
            // console.log('✅ Background image drawn successfully');
            ctx.restore();
        } else {
            console.log('⏳ Background image not ready yet, skipping draw');
        }
    }

    savePresets() {
        try {
            localStorage.setItem('gitup_presets', JSON.stringify(this.savedPresets));
        } catch (e) {
            console.error('Error saving presets:', e);
        }
    }

    saveCurrentAsPreset(name) {
        if (!this.audioMotion) 
            return;
        


        const preset = {
            name: name || `Preset ${
                this.savedPresets.length + 1
            }`,
            timestamp: Date.now(),
            config: this.getCurrentConfig()
        };

        this.savedPresets.push(preset);
        if (this.savedPresets.length > 20) {
            this.savedPresets.shift();
        }

        this.savePresets();
        this.updatePresetSelector();
    }

    toggleVisualization() {
        this.visualizationEnabled = !this.visualizationEnabled;

        console.log('🔄 AM Visualization toggled:', {
            enabled: this.visualizationEnabled,
            backgroundImageEnabled: this.backgroundImageEnabled,
            hasBackgroundImage: !!this.backgroundImage
        });

        // Update button text
        const btn = document.getElementById('vizToggleBtn');
        if (btn) {
            btn.textContent = this.visualizationEnabled ? 'ON' : 'OFF';
            btn.classList.toggle('active', this.visualizationEnabled);
        }

        // Update footer visualizer button state
        this.updateFooterVisualizerButton();
        
        // Update footer toggle button state
        this.updateFooterVisualizerToggleButton();

        if (this.audioMotion) {
            if (this.visualizationEnabled) { // Resume visualization - restart the animation loop
                this.audioMotion.animate();
            } else { // Stop main visualization but keep animation loop for Infinite Zoom
                console.log('🔄 Forcing visualization redraw after AM toggle');
                this.audioMotion.draw();
                // Don't cancel animation frame - let it continue for Infinite Zoom
                // The animation loop will handle skipping main visualization when disabled
                // Let the spectrum analyzer handle all background drawing (including background images)
                // Hide kaleidoscope viz canvas if active (but NOT video kaleidoscope)
                if (this.kaleidoscopeVizCanvas) {
                    this.kaleidoscopeVizCanvas.style.display = 'none';
                }
            }
        }
    }

    getCurrentConfig() {
        if (!this.audioMotion) 
            return {};
        


        const config = {};
        const params = [
            'alphaBars',
            'ansiBands',
            'barSpace',
            'bgAlpha',
            'channelLayout',
            'colorMode',
            'fadePeaks',
            'fftSize',
            'fillAlpha',
            'frequencyScale',
            'gradient',
            'gradientLeft',
            'gradientRight',
            'gravity',
            'ledBars',
            'linearAmplitude',
            'linearBoost',
            'lineWidth',
            'loRes',
            'lumiBars',
            'maxDecibels',
            'maxFPS',
            'maxFreq',
            'minDecibels',
            'minFreq',
            'mirror',
            'mode',
            'noteLabels',
            'outlineBars',
            'overlay',
            'peakFadeTime',
            'peakHoldTime',
            'peakLine',
            'radial',
            'radialInvert',
            'radius',
            'reflexAlpha',
            'reflexBright',
            'reflexFit',
            'reflexRatio',
            'roundBars',
            'showBgColor',
            'showFPS',
            'showPeaks',
            'showScaleY',
            'smoothing',
            'spinSpeed',
            'splitGradient',
            'trueLeds',
            'useCanvas',
            'volume',
            'weightingFilter'
        ];

        params.forEach(param => {
            if (this.audioMotion.hasOwnProperty(param)) {
                config[param] = this.audioMotion[param];
            }
        });

        // Ensure critical values are never undefined
        config.showScaleX = false;
        config.fftSize = config.fftSize || 8192;
        config.linearAmplitude = config.linearAmplitude !== undefined ? config.linearAmplitude : true;
        config.linearBoost = config.linearBoost || 2;
        config.volume = config.volume || 1.5;

        return config;
    }

    loadPreset(index) {
        if (index < 0 || index >= this.savedPresets.length) 
            return;
        


        const preset = this.savedPresets[index];
        if (preset && preset.config && this.audioMotion) { // Don't apply brightness boost to saved presets
            this.audioMotion.setOptions(preset.config);
            document.querySelectorAll('#vizModeDropdown .dropdown-item').forEach(item => {
                item.classList.remove('active');
            });
        }
    }

    updatePresetSelector() {
        const selector = document.getElementById('presetSelector');
        const fsSelector = document.getElementById('fsPresetSelect');

        const updateSelector = (sel) => {
            if (!sel) 
                return;
            

            sel.innerHTML = '<option value="">Load Preset...</option>';
            this.savedPresets.forEach((preset, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = preset.name;
                sel.appendChild(option);
            });
        };

        updateSelector(selector);
        if (this.isFullscreen) {
            updateSelector(fsSelector);
        }
    }

    // Background Color Methods
    loadBackgroundColor() {
        try {
            const saved = localStorage.getItem('gitup_bgcolor');
            if (saved) {
                this.backgroundColor = saved;
                const picker = document.getElementById('bgColorPicker');
                if (picker) 
                    picker.value = saved;
                

            } else {
                this.backgroundColor = '#000000';
            }
        } catch (e) {
            console.error('Error loading background color:', e);
            this.backgroundColor = '#000000';
        }
    }

    saveBackgroundColor() {
        try {
            localStorage.setItem('gitup_bgcolor', this.backgroundColor);
        } catch (e) {
            console.error('Error saving background color:', e);
        }
    }

    setBackgroundColor(color) {
        this.backgroundColor = color;
        const visualizationContainer = document.getElementById('visualizationContainer');
        const mainArea = document.querySelector('.main-area');

        visualizationContainer.style.backgroundColor = color;
        mainArea.style.backgroundColor = color;

        this.saveBackgroundColor();

        if (this.audioMotion) {
            this.audioMotion.setBackgroundColor(color);
        }
    }


    // UI Methods
    toggleGradientMode(enable) {
        const elements = document.querySelectorAll('.header, .footer, .playlist-container, .playlist-header, .info-button, .info-popup, .loading, .error-message, .viz-btn, .color-btn, .control-btn, .fullscreen-btn, .loop-btn, .transparent-btn, .progress-bar, .progress-fill, .volume-slider, .volume-fill, .playlist-item.active, .dropdown-toggle, .random-viz-btn');

        elements.forEach(el => {
            if (enable) {
                el.classList.add('gradient-mode');
            } else {
                el.classList.remove('gradient-mode');
            }
        });
    }

    setColorScheme(scheme) {
        const root = document.documentElement;
        this.currentColorScheme = scheme;

        if (this.audioMotion) {
            this.audioMotion.setColorScheme(scheme);
        }

        const useGradients = (scheme === 'psychedelic' || scheme === 'metal');
        this.toggleGradientMode(useGradients);

        const playlistItems = document.querySelectorAll('.playlist-dropdown-item.active');
        playlistItems.forEach(item => {
            if (scheme === 'luigi') {
                item.classList.add('luigi-scheme');
            } else {
                item.classList.remove('luigi-scheme');
            }
        });

        switch (scheme) {
            case 'earthtones': root.style.setProperty('--accent-color', '#D2691E');
                root.style.setProperty('--primary-bg', '#2F1B14');
                root.style.setProperty('--secondary-bg', '#4A2C17');
                root.style.setProperty('--border-color', '#8B4513');
                root.style.setProperty('--hover-color', '#654321');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#ffffff');
                break;

            case 'luigi': root.style.setProperty('--accent-color', '#0000FF');
                root.style.setProperty('--primary-bg', '#0a0a0a');
                root.style.setProperty('--secondary-bg', '#1a0000');
                root.style.setProperty('--border-color', '#00A000');
                root.style.setProperty('--hover-color', '#000066');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#ffffff');
                break;

            case 'metal': root.style.setProperty('--accent-color', '#C0C0C0');
                root.style.setProperty('--primary-bg', '#0a0a0a');
                root.style.setProperty('--secondary-bg', '#1a1a1a');
                root.style.setProperty('--border-color', '#606060');
                root.style.setProperty('--hover-color', '#2a2a2a');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#C0C0C0');
                break;

            case 'psychedelic': root.style.setProperty('--accent-color', '#FF1493');
                root.style.setProperty('--primary-bg', '#0a0a0a');
                root.style.setProperty('--secondary-bg', '#1a0a1a');
                root.style.setProperty('--border-color', '#9400D3');
                root.style.setProperty('--hover-color', '#2a1a2a');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#00CED1');
                break;

            default: root.style.setProperty('--accent-color', '#2969b0');
                root.style.setProperty('--primary-bg', '#f5f3e9');
                root.style.setProperty('--secondary-bg', '#1a1a1a');
                root.style.setProperty('--border-color', '#898989');
                root.style.setProperty('--hover-color', '#2a2a2a');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#ffffff');
                break;
        }
    }

    // * new event listeners
    setupEventListeners() { // Dropdown toggles
        const setupDropdown = (toggleId, dropdownId) => {
            const toggle = document.getElementById(toggleId);
            const dropdown = document.getElementById(dropdownId);

            if (! toggle || ! dropdown) 
                return;
            


            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.dropdown-content').forEach(d => {
                    if (d !== dropdown) 
                        d.classList.remove('show');
                    

                });
                dropdown.classList.toggle('show');
            });
        };

        setupDropdown('colorSchemeToggle', 'colorSchemeDropdown');
        setupDropdown('vizModeToggle', 'vizModeDropdown');
        // Playlist is now embedded - no dropdown setup needed

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-content').forEach(d => {
                d.classList.remove('show');
            });
        });

        // Color scheme dropdown items
        document.querySelectorAll('#colorSchemeDropdown .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('#colorSchemeDropdown .dropdown-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const scheme = item.dataset.scheme;
                this.setColorScheme(scheme);
                document.getElementById('colorSchemeToggle').textContent = item.textContent;
                document.getElementById('colorSchemeDropdown').classList.remove('show');
            });
        });

        // Visualization mode dropdown items
        document.querySelectorAll('#vizModeDropdown .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const mode = item.dataset.mode;
                if (mode === 'random') {
                    this.setRandomVisualization();
                } else {
                    document.querySelectorAll('#vizModeDropdown .dropdown-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    this.setVisualizationMode(parseInt(mode));
                    document.getElementById('vizModeToggle').textContent = item.textContent;
                }
                document.getElementById('vizModeDropdown').classList.remove('show');
            });
        });

        // Visualization toggle button
        const vizToggleBtn = document.getElementById('vizToggleBtn');
        if (vizToggleBtn) {
            vizToggleBtn.addEventListener('click', () => {
                this.toggleVisualization();
            });
        }

        // Volume icon mute toggle
        const volumeIcon = document.querySelector('.volume-control span');
        if (volumeIcon) {
            volumeIcon.style.cursor = 'pointer'; // Make it look clickable
            volumeIcon.addEventListener('click', () => {
                this.toggleMute();
            });
        }

        
        // Pulse controls
        const videoPulseRateSlider = document.getElementById('videoPulseRateSlider');
        if (videoPulseRateSlider) {
            videoPulseRateSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setVideoPulseRate(value);
                document.getElementById('videoPulseRateValue').textContent = `${
                    value.toFixed(1)
                }s`;
            });
        }

        // Basic controls
        const videoBrightnessSlider = document.getElementById('videoBrightnessSlider');
        if (videoBrightnessSlider) {
            videoBrightnessSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setVideoBrightness(value);
                document.getElementById('videoBrightnessValue').textContent = `${value}%`;
            });
        }

        const videoContrastSlider = document.getElementById('videoContrastSlider');
        if (videoContrastSlider) {
            videoContrastSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setVideoContrast(value);
                document.getElementById('videoContrastValue').textContent = `${value}%`;
            });
        }

        // Color controls
        const videoSaturationSlider = document.getElementById('videoSaturationSlider');
        if (videoSaturationSlider) {
            videoSaturationSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setVideoSaturation(value);
                document.getElementById('videoSaturationValue').textContent = `${value}%`;
            });
        }

        const videoHueRotateSlider = document.getElementById('videoHueRotateSlider');
        if (videoHueRotateSlider) {
            videoHueRotateSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setVideoHueRotate(value);
                document.getElementById('videoHueRotateValue').textContent = `${value}°`;
            });
        }

        const videoGrayscaleSlider = document.getElementById('videoGrayscaleSlider');
        if (videoGrayscaleSlider) {
            videoGrayscaleSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setVideoGrayscale(value);
                document.getElementById('videoGrayscaleValue').textContent = `${value}%`;
            });
        }

        const videoSepiaSlider = document.getElementById('videoSepiaSlider');
        if (videoSepiaSlider) {
            videoSepiaSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setVideoSepia(value);
                document.getElementById('videoSepiaValue').textContent = `${value}%`;
            });
        }

        // Effects controls
        const videoBlurSlider = document.getElementById('videoBlurSlider');
        if (videoBlurSlider) {
            videoBlurSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setVideoBlur(value);
                document.getElementById('videoBlurValue').textContent = `${value}px`;
            });
        }

        const videoVignetteSlider = document.getElementById('videoVignetteSlider');
        if (videoVignetteSlider) {
            videoVignetteSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setVideoVignette(value);
                document.getElementById('videoVignetteValue').textContent = `${value}%`;
            });
        }

        const videoPosterizeSlider = document.getElementById('videoPosterizeSlider');
        if (videoPosterizeSlider) {
            videoPosterizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setVideoPosterize(value);
                const displayText = value >= 16 ? 'Off' : `${value} levels`;
                document.getElementById('videoPosterizeValue').textContent = displayText;
            });
        }


        // Live Display button - both sidebar and footer
        const liveDisplayBtns = document.querySelectorAll('#liveDisplayBtn');
        liveDisplayBtns.forEach(liveDisplayBtn => {
            liveDisplayBtn.addEventListener('click', () => {
                if (this.streamManager) {
                    this.streamManager.toggleLiveDisplay();
                }
            });
        });

        // Display Settings Panel Controls
        // Close button
        const displaySettingsClose = document.getElementById('displaySettingsClose');
        if (displaySettingsClose) {
            displaySettingsClose.addEventListener('click', () => {
                document.getElementById('displaySettingsPanel').style.display = 'none';
            });
        }

        // Display Settings button toggle
        const displaySettingsBtn = document.getElementById('displaySettingsBtn');
        if (displaySettingsBtn) {
            displaySettingsBtn.addEventListener('click', () => {
                const panel = document.getElementById('displaySettingsPanel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        // Presentation mode buttons
        document.querySelectorAll('.display-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { // Update active state
                document.querySelectorAll('.display-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update settings
                const mode = btn.dataset.mode;
                if (this.streamManager) {
                    this.streamManager.displaySettings.presentationMode = mode;
                    this.streamManager.saveDisplaySettings();

                    // Send to display window if streaming
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        });

        // Aspect ratio buttons
        document.querySelectorAll('.aspect-ratio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.aspect-ratio-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const ratio = btn.dataset.ratio;
                if (this.streamManager) {
                    this.streamManager.displaySettings.aspectRatio = ratio;
                    this.streamManager.saveDisplaySettings();
                    this.streamManager.reconfigureCapture();
                }
            });
        });

        // Capture resolution dropdown
        const captureResolution = document.getElementById('captureResolution');
        if (captureResolution) {
            captureResolution.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (this.streamManager) {
                    this.streamManager.displaySettings.captureResolution = value;
                    this.streamManager.saveDisplaySettings();
                    this.streamManager.reconfigureCapture();
                    
                    // Update stats display
                    if (this.cameraInfo) {
                        this.updateCameraStats();
                    }
                }
            });
        }

        // Capture frame rate dropdown
        const captureFrameRate = document.getElementById('captureFrameRate');
        if (captureFrameRate) {
            captureFrameRate.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (this.streamManager) {
                    this.streamManager.displaySettings.captureFrameRate = value;
                    this.streamManager.saveDisplaySettings();
                    this.streamManager.reconfigureCapture();
                    
                    // Update stats display
                    if (this.cameraInfo) {
                        this.updateCameraStats();
                    }
                }
            });
        }

        // Capture bitrate slider
        const captureBitrate = document.getElementById('captureBitrate');
        if (captureBitrate) {
            captureBitrate.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('captureBitrateValue').textContent = `${value} Mbps`;
                if (this.streamManager) {
                    this.streamManager.displaySettings.captureBitrate = value;
                    this.streamManager.saveDisplaySettings();
                    this.streamManager.reconfigureCapture();
                    
                    // Update stats display
                    if (this.cameraInfo) {
                        this.updateCameraStats();
                    }
                }
            });
        }

        // Display sharpness slider
        const displaySharpness = document.getElementById('displaySharpness');
        if (displaySharpness) {
            displaySharpness.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('displaySharpnessValue').textContent = `${value}%`;
                if (this.streamManager) {
                    this.streamManager.displaySettings.displaySharpness = value;
                    this.streamManager.saveDisplaySettings();

                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        }

        // Letterbox color picker
        const letterboxColor = document.getElementById('letterboxColor');
        if (letterboxColor) {
            letterboxColor.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('letterboxColorValue').textContent = value;
                if (this.streamManager) {
                    this.streamManager.displaySettings.letterboxColor = value;
                    this.streamManager.saveDisplaySettings();

                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        }

        // Mirror background toggle
        const mirrorBackgroundBtn = document.getElementById('mirrorBackgroundBtn');
        if (mirrorBackgroundBtn) {
            mirrorBackgroundBtn.addEventListener('click', () => {
                if (this.streamManager) {
                    this.streamManager.displaySettings.mirrorBackground = !this.streamManager.displaySettings.mirrorBackground;
                    this.streamManager.saveDisplaySettings();

                    // Update UI
                    mirrorBackgroundBtn.classList.toggle('active', this.streamManager.displaySettings.mirrorBackground);
                    mirrorBackgroundBtn.textContent = `Mirror Background: ${
                        this.streamManager.displaySettings.mirrorBackground ? 'On' : 'Off'
                    }`;

                    // Show/hide blur controls
                    const blurContainer = document.getElementById('mirrorBlurContainer');
                    if (blurContainer) {
                        blurContainer.style.display = this.streamManager.displaySettings.mirrorBackground ? 'flex' : 'none';
                    }

                    // Send to display
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        }

        // Mirror background blur slider
        const mirrorBackgroundBlur = document.getElementById('mirrorBackgroundBlur');
        if (mirrorBackgroundBlur) {
            mirrorBackgroundBlur.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('mirrorBackgroundBlurValue').textContent = `${value}px`;
                if (this.streamManager) {
                    this.streamManager.displaySettings.mirrorBackgroundBlur = value;
                    this.streamManager.saveDisplaySettings();

                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        }

        // Display preset buttons
        document.querySelectorAll('.display-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = btn.dataset.preset;
                this.applyDisplayPreset(preset);
            });
        });

        // Display aspect ratio buttons
        document.querySelectorAll('#displaySettingsPanel .aspect-ratio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all aspect ratio buttons in display settings
                document.querySelectorAll('#displaySettingsPanel .aspect-ratio-btn').forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                const ratio = btn.dataset.ratio;
                if (this.streamManager) {
                    this.streamManager.displaySettings.aspectRatio = ratio;
                    this.streamManager.saveDisplaySettings();
                    console.log('Display aspect ratio changed to:', ratio);
                    
                    if (this.streamManager.isStreaming) {
                        this.streamManager.channel.postMessage({type: 'display-settings', data: this.streamManager.displaySettings});
                    }
                }
            });
        });

        // Kaleidoscope
        // Kaleidoscope controls
        const kaleidoscopeBtn = document.getElementById('kaleidoscopeBtn');
        if (kaleidoscopeBtn) {
            kaleidoscopeBtn.addEventListener('click', () => {
                this.toggleKaleidoscope();
            });
        }
        
        // Header Kaleidoscope button
        const headerKaleidoscopeBtn = document.getElementById('headerKaleidoscopeBtn');
        if (headerKaleidoscopeBtn) {
            headerKaleidoscopeBtn.addEventListener('click', () => {
                this.toggleHeaderKaleidoscope();
            });
        }

        // Header Infinite Zoom button
        const headerInfiniteZoomBtn = document.getElementById('headerInfiniteZoomBtn');
        if (headerInfiniteZoomBtn) {
            headerInfiniteZoomBtn.addEventListener('click', () => {
                this.toggleHeaderInfiniteZoom();
            });
        }

        // Click outside to close panels
        document.addEventListener('click', (e) => {
            const kaleidoscopePanel = document.getElementById('headerKaleidoscopePanel');
            const infiniteZoomPanel = document.getElementById('headerInfiniteZoomPanel');
            const kaleidoscopeBtn = document.getElementById('headerKaleidoscopeBtn');
            const infiniteZoomBtn = document.getElementById('headerInfiniteZoomBtn');

            // Close Kaleidoscope panel if clicking outside
            if (kaleidoscopePanel && kaleidoscopePanel.style.display !== 'none') {
                if (!kaleidoscopePanel.contains(e.target) && !kaleidoscopeBtn.contains(e.target)) {
                    kaleidoscopePanel.style.display = 'none';
                }
            }

            // Close Infinite Zoom panel if clicking outside
            if (infiniteZoomPanel && infiniteZoomPanel.style.display !== 'none') {
                if (!infiniteZoomPanel.contains(e.target) && !infiniteZoomBtn.contains(e.target)) {
                    infiniteZoomPanel.style.display = 'none';
                }
            }
        });
        
        // Infinite Zoom toggle button
        const infiniteZoomBtn = document.getElementById('infiniteZoomBtn');
        if (infiniteZoomBtn) {
            infiniteZoomBtn.addEventListener('click', () => {
                // Toggle IZ on/off
                if (this.infiniteZoom) {
                    if (this.infiniteZoom.isActive) {
                        this.infiniteZoom.stop();
                        const btnText = infiniteZoomBtn.querySelector('.kaleidoscope-btn-text');
                        btnText.textContent = 'Infinite Zoom Off';
                        infiniteZoomBtn.classList.remove('active');
                    } else {
                        this.infiniteZoom.initialize();
                        this.infiniteZoom.start();
                        const btnText = infiniteZoomBtn.querySelector('.kaleidoscope-btn-text');
                        btnText.textContent = 'Infinite Zoom On';
                        infiniteZoomBtn.classList.add('active');
                    }
                }
            });
        }

        // Infinite Zoom gear button
        const infiniteZoomGearBtn = document.getElementById('infiniteZoomGearBtn');
        if (infiniteZoomGearBtn) {
            infiniteZoomGearBtn.addEventListener('click', () => {
                // Only toggle settings panel, don't affect IZ state
                const panel = document.getElementById('infiniteZoomPanel');
                if (panel) {
                    const isVisible = panel.style.display !== 'none';
                    panel.style.display = isVisible ? 'none' : 'block';
                }
            });
        }
        
        // Infinite Zoom close button
        const infiniteZoomCloseBtn = document.getElementById('infiniteZoomCloseBtn');
        if (infiniteZoomCloseBtn) {
            infiniteZoomCloseBtn.addEventListener('click', () => {
                const panel = document.getElementById('infiniteZoomPanel');
                if (panel) {
                    panel.style.display = 'none';
                }
            });
        }
        
        // Infinite Zoom shape selection
        const infiniteZoomShapeSelect = document.getElementById('infiniteZoomShapeSelect');
        if (infiniteZoomShapeSelect) {
            infiniteZoomShapeSelect.addEventListener('change', (e) => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.shape = e.target.value;
                    this.infiniteZoom.updateObjectShapes();
                    console.log(`🔍 Infinite Zoom shape set to: ${e.target.value}`);
                }
            });
        }

        // Header Infinite Zoom shape selection
        const headerInfiniteZoomShapeSelect = document.getElementById('headerInfiniteZoomShapeSelect');
        if (headerInfiniteZoomShapeSelect) {
            headerInfiniteZoomShapeSelect.addEventListener('change', (e) => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.shape = e.target.value;
                    this.infiniteZoom.updateObjectShapes();
                    console.log(`🔍 Infinite Zoom shape set to: ${e.target.value}`);
                }
            });
        }
        
        // Infinite Zoom color randomness slider
        const infiniteZoomColorRandomSlider = document.getElementById('infiniteZoomColorRandomSlider');
        const infiniteZoomColorRandomValue = document.getElementById('infiniteZoomColorRandomValue');
        if (infiniteZoomColorRandomSlider && infiniteZoomColorRandomValue) {
            infiniteZoomColorRandomSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                infiniteZoomColorRandomValue.textContent = value.toFixed(1);
                if (this.infiniteZoom) {
                    this.infiniteZoom.colorRandomness = value;
                    // Update existing objects with new color randomness
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.color = this.infiniteZoom.generateColor();
                    });
                }
            });
        }

        // Header Infinite Zoom color randomness slider
        const headerInfiniteZoomColorRandomSlider = document.getElementById('headerInfiniteZoomColorRandomSlider');
        const headerInfiniteZoomColorRandomValue = document.getElementById('headerInfiniteZoomColorRandomValue');
        if (headerInfiniteZoomColorRandomSlider && headerInfiniteZoomColorRandomValue) {
            headerInfiniteZoomColorRandomSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                headerInfiniteZoomColorRandomValue.textContent = value.toFixed(1);
                if (this.infiniteZoom) {
                    this.infiniteZoom.colorRandomness = value;
                    // Update existing objects with new color randomness
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.color = this.infiniteZoom.generateColor();
                    });
                }
            });
        }
        
        // Infinite Zoom min size slider
        const infiniteZoomMinSizeSlider = document.getElementById('infiniteZoomMinSizeSlider');
        const infiniteZoomMinSizeValue = document.getElementById('infiniteZoomMinSizeValue');
        if (infiniteZoomMinSizeSlider && infiniteZoomMinSizeValue) {
            infiniteZoomMinSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomMinSizeValue.textContent = value;
                if (this.infiniteZoom) {
                    this.infiniteZoom.minSize = value;
                    // Update existing objects with new size range
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.infiniteZoom.minSize + Math.random() * (this.infiniteZoom.maxSize - this.infiniteZoom.minSize);
                    });
                }
            });
        }
        
        // Infinite Zoom max size slider
        const infiniteZoomMaxSizeSlider = document.getElementById('infiniteZoomMaxSizeSlider');
        const infiniteZoomMaxSizeValue = document.getElementById('infiniteZoomMaxSizeValue');
        if (infiniteZoomMaxSizeSlider && infiniteZoomMaxSizeValue) {
            infiniteZoomMaxSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomMaxSizeValue.textContent = value;
                if (this.infiniteZoom) {
                    this.infiniteZoom.maxSize = value;
                    // Update existing objects with new size range
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.infiniteZoom.minSize + Math.random() * (this.infiniteZoom.maxSize - this.infiniteZoom.minSize);
                    });
                }
            });
        }
        
        // Infinite Zoom density slider
        const infiniteZoomDensitySlider = document.getElementById('infiniteZoomDensitySlider');
        const infiniteZoomDensityValue = document.getElementById('infiniteZoomDensityValue');
        if (infiniteZoomDensitySlider && infiniteZoomDensityValue) {
            infiniteZoomDensitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomDensityValue.textContent = value;
                if (this.infiniteZoom) {
                    // Convert 1-100 range to actual density based on screen area
                    // At 100, objects should fill screen with no negative space
                    const screenArea = this.infiniteZoom.canvas ? 
                        this.infiniteZoom.canvas.width * this.infiniteZoom.canvas.height : 800 * 600;
                    const maxDensity = Math.floor(screenArea / 100); // 1 object per 100 pixels for max density
                    this.infiniteZoom.density = Math.floor((value / 100) * maxDensity);
                    // Regenerate objects if active
                    if (this.infiniteZoom.isActive) {
                        this.infiniteZoom.generateInitialObjects();
                    }
                }
            });
        }
        
        // Infinite Zoom speed slider
        const infiniteZoomSpeedSlider = document.getElementById('infiniteZoomSpeedSlider');
        const infiniteZoomSpeedValue = document.getElementById('infiniteZoomSpeedValue');
        if (infiniteZoomSpeedSlider && infiniteZoomSpeedValue) {
            infiniteZoomSpeedSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomSpeedValue.textContent = value;
                if (this.infiniteZoom) {
                    // Convert -100 to 100 range to zoom speed
                    // 0 = no movement, 50 = normal speed, 100 = very fast, -100 = very fast reverse
                    if (value === 0) {
                        this.infiniteZoom.zoomSpeed = 0;
                        this.infiniteZoom.baseZoomSpeed = 0;
                    } else {
                        // Convert to actual zoom speed: -100 to 100 becomes -0.1 to 0.1
                        const newSpeed = (value / 100) * 0.1;
                        this.infiniteZoom.zoomSpeed = newSpeed;
                        this.infiniteZoom.baseZoomSpeed = newSpeed;
                    }
                }
            });
        }
        
        // Infinite Zoom rotation slider
        const infiniteZoomRotationSlider = document.getElementById('infiniteZoomRotationSlider');
        const infiniteZoomRotationValue = document.getElementById('infiniteZoomRotationValue');
        if (infiniteZoomRotationSlider && infiniteZoomRotationValue) {
            infiniteZoomRotationSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                infiniteZoomRotationValue.textContent = value.toFixed(1);
                if (this.infiniteZoom) {
                    this.infiniteZoom.rotationSpeed = value;
                    this.infiniteZoom.baseRotationSpeed = value;
                    console.log('🔍 Rotation slider changed to:', value, 'Base:', this.infiniteZoom.baseRotationSpeed);
                }
            });
        }
        
        // Infinite Zoom opacity slider
        const infiniteZoomOpacitySlider = document.getElementById('infiniteZoomOpacitySlider');
        const infiniteZoomOpacityValue = document.getElementById('infiniteZoomOpacityValue');
        if (infiniteZoomOpacitySlider && infiniteZoomOpacityValue) {
            infiniteZoomOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomOpacityValue.textContent = value + '%';
                if (this.infiniteZoom) {
                    this.infiniteZoom.opacity = value / 100;
                }
            });
        }
        
        // Infinite Zoom sensitivity slider
        const infiniteZoomSensitivitySlider = document.getElementById('infiniteZoomSensitivitySlider');
        const infiniteZoomSensitivityValue = document.getElementById('infiniteZoomSensitivityValue');
        if (infiniteZoomSensitivitySlider && infiniteZoomSensitivityValue) {
            infiniteZoomSensitivitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                infiniteZoomSensitivityValue.textContent = value + '%';
                if (this.infiniteZoom) {
                    this.infiniteZoom.sensitivity = value / 100; // Convert 0-100 to 0-1
                    console.log('🔍 Sensitivity changed to:', this.infiniteZoom.sensitivity);
                }
            });
        }
        
        // Infinite Zoom Beat React button
        const infiniteZoomBeatReactBtn = document.getElementById('infiniteZoomBeatReactBtn');
        if (infiniteZoomBeatReactBtn) {
            infiniteZoomBeatReactBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatReact = !this.infiniteZoom.beatReact;
                    infiniteZoomBeatReactBtn.textContent = `Beat React: ${this.infiniteZoom.beatReact ? 'On' : 'Off'}`;
                    infiniteZoomBeatReactBtn.classList.toggle('active', this.infiniteZoom.beatReact);
                    console.log('🔍 Beat React toggled to:', this.infiniteZoom.beatReact);
                    
                    // Show/hide beat reaction controls
                    const controls = document.getElementById('infiniteZoomBeatReactControls');
                    if (controls) {
                        controls.style.display = this.infiniteZoom.beatReact ? 'block' : 'none';
                    }
                    
                    // When enabling Beat React, turn on all individual controls by default
                    if (this.infiniteZoom.beatReact) {
                        this.infiniteZoom.beatZoom = true;
                        this.infiniteZoom.beatRotation = true;
                        this.infiniteZoom.beatDensity = true;
                        this.infiniteZoom.beatShape = true;
                        
                        // Update button states
                        const beatZoomBtn = document.getElementById('infiniteZoomBeatZoomBtn');
                        const beatRotationBtn = document.getElementById('infiniteZoomBeatRotationBtn');
                        const beatDensityBtn = document.getElementById('infiniteZoomBeatDensityBtn');
                        const beatShapeBtn = document.getElementById('infiniteZoomBeatShapeBtn');
                        
                        if (beatZoomBtn) {
                            beatZoomBtn.textContent = 'Beat Zoom: On';
                            beatZoomBtn.classList.add('active');
                        }
                        if (beatRotationBtn) {
                            beatRotationBtn.textContent = 'Beat Rotation: On';
                            beatRotationBtn.classList.add('active');
                        }
                        if (beatDensityBtn) {
                            beatDensityBtn.textContent = 'Beat Density: On';
                            beatDensityBtn.classList.add('active');
                        }
                        if (beatShapeBtn) {
                            beatShapeBtn.textContent = 'Beat Shape: On';
                            beatShapeBtn.classList.add('active');
                        }
                    } else {
                        // When disabling Beat React, turn off all individual controls
                        this.infiniteZoom.beatZoom = false;
                        this.infiniteZoom.beatRotation = false;
                        this.infiniteZoom.beatDensity = false;
                        this.infiniteZoom.beatShape = false;
                    }
                    
                    console.log(`🔍 Infinite Zoom Beat React: ${this.infiniteZoom.beatReact ? 'On' : 'Off'}`);
                }
            });
        }
        
        // Beat reaction control buttons
        const infiniteZoomBeatZoomBtn = document.getElementById('infiniteZoomBeatZoomBtn');
        if (infiniteZoomBeatZoomBtn) {
            infiniteZoomBeatZoomBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatZoom = !this.infiniteZoom.beatZoom;
                    infiniteZoomBeatZoomBtn.textContent = `Beat Zoom: ${this.infiniteZoom.beatZoom ? 'On' : 'Off'}`;
                    infiniteZoomBeatZoomBtn.classList.toggle('active', this.infiniteZoom.beatZoom);
                }
            });
        }
        
        const infiniteZoomBeatRotationBtn = document.getElementById('infiniteZoomBeatRotationBtn');
        if (infiniteZoomBeatRotationBtn) {
            infiniteZoomBeatRotationBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatRotation = !this.infiniteZoom.beatRotation;
                    infiniteZoomBeatRotationBtn.textContent = `Beat Rotation: ${this.infiniteZoom.beatRotation ? 'On' : 'Off'}`;
                    infiniteZoomBeatRotationBtn.classList.toggle('active', this.infiniteZoom.beatRotation);
                    console.log('🔍 Beat Rotation toggled to:', this.infiniteZoom.beatRotation);
                }
            });
        }
        
        const infiniteZoomBeatDensityBtn = document.getElementById('infiniteZoomBeatDensityBtn');
        if (infiniteZoomBeatDensityBtn) {
            infiniteZoomBeatDensityBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatDensity = !this.infiniteZoom.beatDensity;
                    infiniteZoomBeatDensityBtn.textContent = `Beat Density: ${this.infiniteZoom.beatDensity ? 'On' : 'Off'}`;
                    infiniteZoomBeatDensityBtn.classList.toggle('active', this.infiniteZoom.beatDensity);
                }
            });
        }
        
        const infiniteZoomBeatShapeBtn = document.getElementById('infiniteZoomBeatShapeBtn');
        if (infiniteZoomBeatShapeBtn) {
            infiniteZoomBeatShapeBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatShape = !this.infiniteZoom.beatShape;
                    infiniteZoomBeatShapeBtn.textContent = `Beat Shape: ${this.infiniteZoom.beatShape ? 'On' : 'Off'}`;
                    infiniteZoomBeatShapeBtn.classList.toggle('active', this.infiniteZoom.beatShape);
                }
            });
        }

        // Header Infinite Zoom controls - connect all remaining sliders and buttons
        const headerInfiniteZoomMinSizeSlider = document.getElementById('headerInfiniteZoomMinSizeSlider');
        const headerInfiniteZoomMinSizeValue = document.getElementById('headerInfiniteZoomMinSizeValue');
        if (headerInfiniteZoomMinSizeSlider && headerInfiniteZoomMinSizeValue) {
            headerInfiniteZoomMinSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomMinSizeValue.textContent = value;
                if (this.infiniteZoom) {
                    this.infiniteZoom.minSize = value;
                    // Update existing objects with new size range
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.infiniteZoom.minSize + Math.random() * (this.infiniteZoom.maxSize - this.infiniteZoom.minSize);
                    });
                }
            });
        }

        const headerInfiniteZoomMaxSizeSlider = document.getElementById('headerInfiniteZoomMaxSizeSlider');
        const headerInfiniteZoomMaxSizeValue = document.getElementById('headerInfiniteZoomMaxSizeValue');
        if (headerInfiniteZoomMaxSizeSlider && headerInfiniteZoomMaxSizeValue) {
            headerInfiniteZoomMaxSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomMaxSizeValue.textContent = value;
                if (this.infiniteZoom) {
                    this.infiniteZoom.maxSize = value;
                    // Update existing objects with new size range
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.size = this.infiniteZoom.minSize + Math.random() * (this.infiniteZoom.maxSize - this.infiniteZoom.minSize);
                    });
                }
            });
        }

        const headerInfiniteZoomDensitySlider = document.getElementById('headerInfiniteZoomDensitySlider');
        const headerInfiniteZoomDensityValue = document.getElementById('headerInfiniteZoomDensityValue');
        if (headerInfiniteZoomDensitySlider && headerInfiniteZoomDensityValue) {
            headerInfiniteZoomDensitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomDensityValue.textContent = value;
                if (this.infiniteZoom) {
                    // Calculate density based on screen area
                    const screenArea = this.infiniteZoom.canvas ? 
                        this.infiniteZoom.canvas.width * this.infiniteZoom.canvas.height : 800 * 600;
                    const maxDensity = Math.floor(screenArea / 100); // 1 object per 100 pixels for max density
                    this.infiniteZoom.density = Math.floor((value / 100) * maxDensity);
                    // Regenerate objects if active
                    if (this.infiniteZoom.isActive) {
                        this.infiniteZoom.generateInitialObjects();
                    }
                }
            });
        }

        const headerInfiniteZoomSpeedSlider = document.getElementById('headerInfiniteZoomSpeedSlider');
        const headerInfiniteZoomSpeedValue = document.getElementById('headerInfiniteZoomSpeedValue');
        if (headerInfiniteZoomSpeedSlider && headerInfiniteZoomSpeedValue) {
            headerInfiniteZoomSpeedSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomSpeedValue.textContent = value;
                if (this.infiniteZoom) {
                    // Convert from -100 to 100 range to -1 to 1 range
                    this.infiniteZoom.speed = value / 100;
                }
            });
        }

        const headerInfiniteZoomRotationSlider = document.getElementById('headerInfiniteZoomRotationSlider');
        const headerInfiniteZoomRotationValue = document.getElementById('headerInfiniteZoomRotationValue');
        if (headerInfiniteZoomRotationSlider && headerInfiniteZoomRotationValue) {
            headerInfiniteZoomRotationSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                headerInfiniteZoomRotationValue.textContent = value.toFixed(1);
                if (this.infiniteZoom) {
                    // Convert from -10 to 10 range to -0.1 to 0.1 range
                    this.infiniteZoom.rotation = value / 10;
                }
            });
        }

        const headerInfiniteZoomOpacitySlider = document.getElementById('headerInfiniteZoomOpacitySlider');
        const headerInfiniteZoomOpacityValue = document.getElementById('headerInfiniteZoomOpacityValue');
        if (headerInfiniteZoomOpacitySlider && headerInfiniteZoomOpacityValue) {
            headerInfiniteZoomOpacitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomOpacityValue.textContent = value + '%';
                if (this.infiniteZoom) {
                    this.infiniteZoom.opacity = value / 100;
                    // Update existing objects with new opacity
                    this.infiniteZoom.objects.forEach(obj => {
                        obj.alpha = this.infiniteZoom.opacity;
                    });
                }
            });
        }

        const headerInfiniteZoomBeatReactBtn = document.getElementById('headerInfiniteZoomBeatReactBtn');
        if (headerInfiniteZoomBeatReactBtn) {
            headerInfiniteZoomBeatReactBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatReact = !this.infiniteZoom.beatReact;
                    headerInfiniteZoomBeatReactBtn.textContent = `Beat React: ${this.infiniteZoom.beatReact ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatReactBtn.classList.toggle('active', this.infiniteZoom.beatReact);
                    
                    // Show/hide beat reaction controls
                    const controls = document.getElementById('headerInfiniteZoomBeatReactControls');
                    if (controls) {
                        controls.style.display = this.infiniteZoom.beatReact ? 'block' : 'none';
                    }
                }
            });
        }

        const headerInfiniteZoomSensitivitySlider = document.getElementById('headerInfiniteZoomSensitivitySlider');
        const headerInfiniteZoomSensitivityValue = document.getElementById('headerInfiniteZoomSensitivityValue');
        if (headerInfiniteZoomSensitivitySlider && headerInfiniteZoomSensitivityValue) {
            headerInfiniteZoomSensitivitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                headerInfiniteZoomSensitivityValue.textContent = value + '%';
                if (this.infiniteZoom) {
                    this.infiniteZoom.sensitivity = value / 100;
                    // Update beat detection threshold
                    this.infiniteZoom.beatThreshold = 0.1 + (this.infiniteZoom.sensitivity * 0.4);
                }
            });
        }

        const headerInfiniteZoomBeatZoomBtn = document.getElementById('headerInfiniteZoomBeatZoomBtn');
        if (headerInfiniteZoomBeatZoomBtn) {
            headerInfiniteZoomBeatZoomBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatZoom = !this.infiniteZoom.beatZoom;
                    headerInfiniteZoomBeatZoomBtn.textContent = `Beat Zoom: ${this.infiniteZoom.beatZoom ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatZoomBtn.classList.toggle('active', this.infiniteZoom.beatZoom);
                }
            });
        }

        const headerInfiniteZoomBeatRotationBtn = document.getElementById('headerInfiniteZoomBeatRotationBtn');
        if (headerInfiniteZoomBeatRotationBtn) {
            headerInfiniteZoomBeatRotationBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatRotation = !this.infiniteZoom.beatRotation;
                    headerInfiniteZoomBeatRotationBtn.textContent = `Beat Rotation: ${this.infiniteZoom.beatRotation ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatRotationBtn.classList.toggle('active', this.infiniteZoom.beatRotation);
                }
            });
        }

        const headerInfiniteZoomBeatDensityBtn = document.getElementById('headerInfiniteZoomBeatDensityBtn');
        if (headerInfiniteZoomBeatDensityBtn) {
            headerInfiniteZoomBeatDensityBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatDensity = !this.infiniteZoom.beatDensity;
                    headerInfiniteZoomBeatDensityBtn.textContent = `Beat Density: ${this.infiniteZoom.beatDensity ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatDensityBtn.classList.toggle('active', this.infiniteZoom.beatDensity);
                }
            });
        }

        const headerInfiniteZoomBeatShapeBtn = document.getElementById('headerInfiniteZoomBeatShapeBtn');
        if (headerInfiniteZoomBeatShapeBtn) {
            headerInfiniteZoomBeatShapeBtn.addEventListener('click', () => {
                if (this.infiniteZoom) {
                    this.infiniteZoom.beatShape = !this.infiniteZoom.beatShape;
                    headerInfiniteZoomBeatShapeBtn.textContent = `Beat Shape: ${this.infiniteZoom.beatShape ? 'On' : 'Off'}`;
                    headerInfiniteZoomBeatShapeBtn.classList.toggle('active', this.infiniteZoom.beatShape);
                }
            });
        }

        const kaleidoscopeSettingsBtn = document.getElementById('kaleidoscopeSettingsBtn');
        if (kaleidoscopeSettingsBtn) {
            kaleidoscopeSettingsBtn.addEventListener('click', () => {
                const panel = document.getElementById('kaleidoscopePanel');
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            });
        }

        const kaleidoscopeCloseBtn = document.getElementById('kaleidoscopeCloseBtn');
        if (kaleidoscopeCloseBtn) {
            kaleidoscopeCloseBtn.addEventListener('click', () => {
                document.getElementById('kaleidoscopePanel').style.display = 'none';
            });
        }

        const headerKaleidoscopeCloseBtn = document.getElementById('headerKaleidoscopeCloseBtn');
        if (headerKaleidoscopeCloseBtn) {
            headerKaleidoscopeCloseBtn.addEventListener('click', () => {
                document.getElementById('headerKaleidoscopePanel').style.display = 'none';
            });
        }

        const headerInfiniteZoomCloseBtn = document.getElementById('headerInfiniteZoomCloseBtn');
        if (headerInfiniteZoomCloseBtn) {
            headerInfiniteZoomCloseBtn.addEventListener('click', () => {
                document.getElementById('headerInfiniteZoomPanel').style.display = 'none';
            });
        }

        // Beat rotation toggle
        const beatRotationBtn = document.getElementById('kaleidoscopeBeatRotationBtn');
        if (beatRotationBtn) {
            beatRotationBtn.addEventListener('click', () => {
                this.kaleidoscopeBeatRotation = !this.kaleidoscopeBeatRotation;
                beatRotationBtn.textContent = `Rotation: ${
                    this.kaleidoscopeBeatRotation ? 'On' : 'Off'
                }`;
                beatRotationBtn.classList.toggle('active', this.kaleidoscopeBeatRotation);
            });
        }

        // Beat shape toggle
        const beatShapeBtn = document.getElementById('kaleidoscopeBeatShapeBtn');
        if (beatShapeBtn) {
            beatShapeBtn.addEventListener('click', () => {
                this.kaleidoscopeBeatShape = !this.kaleidoscopeBeatShape;
                beatShapeBtn.textContent = `Shape: ${
                    this.kaleidoscopeBeatShape ? 'On' : 'Off'
                }`;
                beatShapeBtn.classList.toggle('active', this.kaleidoscopeBeatShape);

                // Store current shape as original
                if (this.kaleidoscopeBeatShape) {
                    this.kaleidoscopeOriginalShape = this.kaleidoscopeShape;
                }
            });
        }

        // Kaleidoscope sliders
        const kaleidoscopeSegments = document.getElementById('kaleidoscopeSegments');
        if (kaleidoscopeSegments) {
            kaleidoscopeSegments.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeSegments(value);
                document.getElementById('kaleidoscopeSegmentsValue').textContent = value;
            });
        }

        // Header Kaleidoscope sliders
        const headerKaleidoscopeSegments = document.getElementById('headerKaleidoscopeSegments');
        if (headerKaleidoscopeSegments) {
            headerKaleidoscopeSegments.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeSegments(value);
                document.getElementById('headerKaleidoscopeSegmentsValue').textContent = value;
            });
        }

        const kaleidoscopeSpeed = document.getElementById('kaleidoscopeSpeed');
        if (kaleidoscopeSpeed) {
            kaleidoscopeSpeed.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setKaleidoscopeSpeed(value);
                document.getElementById('kaleidoscopeSpeedValue').textContent = value;
            });
        }

        const headerKaleidoscopeSpeed = document.getElementById('headerKaleidoscopeSpeed');
        if (headerKaleidoscopeSpeed) {
            headerKaleidoscopeSpeed.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setKaleidoscopeSpeed(value);
                document.getElementById('headerKaleidoscopeSpeedValue').textContent = value;
            });
        }

        const kaleidoscopeScale = document.getElementById('kaleidoscopeScale');
        if (kaleidoscopeScale) {
            kaleidoscopeScale.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeScale(value);
                document.getElementById('kaleidoscopeScaleValue').textContent = `${value}%`;
            });
        }

        const headerKaleidoscopeScale = document.getElementById('headerKaleidoscopeScale');
        if (headerKaleidoscopeScale) {
            headerKaleidoscopeScale.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeScale(value);
                document.getElementById('headerKaleidoscopeScaleValue').textContent = `${value}%`;
            });
        }

        const kaleidoscopeCenterX = document.getElementById('kaleidoscopeCenterX');
        if (kaleidoscopeCenterX) {
            kaleidoscopeCenterX.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeCenterX(value);
                document.getElementById('kaleidoscopeCenterXValue').textContent = `${value}%`;
            });
        }

        const headerKaleidoscopeCenterX = document.getElementById('headerKaleidoscopeCenterX');
        if (headerKaleidoscopeCenterX) {
            headerKaleidoscopeCenterX.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeCenterX(value);
                document.getElementById('headerKaleidoscopeCenterXValue').textContent = `${value}%`;
            });
        }

        // Beat reactive toggle
        // Beat reactive toggle
        const kaleidoscopeBeatBtn = document.getElementById('kaleidoscopeBeatBtn');
        if (kaleidoscopeBeatBtn) {
            kaleidoscopeBeatBtn.addEventListener('click', () => {
                this.kaleidoscopeBeatReactive = !this.kaleidoscopeBeatReactive;
                kaleidoscopeBeatBtn.textContent = `Beat React: ${
                    this.kaleidoscopeBeatReactive ? 'On' : 'Off'
                }`;
                kaleidoscopeBeatBtn.classList.toggle('active', this.kaleidoscopeBeatReactive);

                const sensitivityContainer = document.getElementById('beatSensitivityContainer');
                if (sensitivityContainer) {
                    sensitivityContainer.style.display = this.kaleidoscopeBeatReactive ? 'block' : 'none';
                }

                // Store base values when enabling
                if (this.kaleidoscopeBeatReactive) { // Reset scale to max 150% if it's higher
                    if (this.kaleidoscopeScale > 1.5) {
                        this.kaleidoscopeScale = 1.5;
                        // Update slider and display
                        const scaleSlider = document.getElementById('kaleidoscopeScale');
                        const scaleValue = document.getElementById('kaleidoscopeScaleValue');
                        if (scaleSlider && scaleValue) {
                            scaleSlider.value = 150;
                            scaleValue.textContent = '150%';
                        }
                    }
                    this.kaleidoscopeBaseScale = this.kaleidoscopeScale;
                    this.kaleidoscopeBaseSegments = this.kaleidoscopeSegments;
                }
            });
        }

        // Beat sensitivity
        const beatSensitivitySlider = document.getElementById('kaleidoscopeBeatSensitivity');
        if (beatSensitivitySlider) {
            beatSensitivitySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeBeatSensitivity = value / 100;
                document.getElementById('kaleidoscopeBeatSensitivityValue').textContent = `${value}%`;
            });
        }


        // Kaleidoscope preset buttons
        document.querySelectorAll('.kaleidoscope-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetIndex = parseInt(e.target.dataset.preset);
                this.applyKaleidoscopePreset(this.kaleidoscopePresets[presetIndex]);
            });
        });

        // Rings control
        const kaleidoscopeRings = document.getElementById('kaleidoscopeRings');
        if (kaleidoscopeRings) {
            kaleidoscopeRings.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeRings = value;
                document.getElementById('kaleidoscopeRingsValue').textContent = value;
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        const headerKaleidoscopeRings = document.getElementById('headerKaleidoscopeRings');
        if (headerKaleidoscopeRings) {
            headerKaleidoscopeRings.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeRings = value;
                document.getElementById('headerKaleidoscopeRingsValue').textContent = value;
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        // Ring spacing control
        const kaleidoscopeRingSpacing = document.getElementById('kaleidoscopeRingSpacing');
        if (kaleidoscopeRingSpacing) {
            kaleidoscopeRingSpacing.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeRingSpacing = value / 100;
                document.getElementById('kaleidoscopeRingSpacingValue').textContent = `${value}%`;
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        const headerKaleidoscopeRingSpacing = document.getElementById('headerKaleidoscopeRingSpacing');
        if (headerKaleidoscopeRingSpacing) {
            headerKaleidoscopeRingSpacing.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.kaleidoscopeRingSpacing = value / 100;
                document.getElementById('headerKaleidoscopeRingSpacingValue').textContent = `${value}%`;
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        // Shape toggle
        const kaleidoscopeShapeBtn = document.getElementById('kaleidoscopeShapeBtn');
        if (kaleidoscopeShapeBtn) {
            kaleidoscopeShapeBtn.addEventListener('click', () => {
                const shapes = ['triangle', 'petal', 'rectangle'];
                const currentIndex = shapes.indexOf(this.kaleidoscopeShape);
                this.kaleidoscopeShape = shapes[(currentIndex + 1) % shapes.length];
                kaleidoscopeShapeBtn.textContent = `Shape: ${
                    this.kaleidoscopeShape.charAt(0).toUpperCase() + this.kaleidoscopeShape.slice(1)
                }`;
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        const kaleidoscopeCenterY = document.getElementById('kaleidoscopeCenterY');
        if (kaleidoscopeCenterY) {
            kaleidoscopeCenterY.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeCenterY(value);
                document.getElementById('kaleidoscopeCenterYValue').textContent = `${value}%`;
            });
        }

        const headerKaleidoscopeCenterY = document.getElementById('headerKaleidoscopeCenterY');
        if (headerKaleidoscopeCenterY) {
            headerKaleidoscopeCenterY.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setKaleidoscopeCenterY(value);
                document.getElementById('headerKaleidoscopeCenterYValue').textContent = `${value}%`;
            });
        }

        // Toggle buttons for applying to video/viz
        const kaleidoscopeVideoBtn = document.getElementById('kaleidoscopeVideoBtn');
        if (kaleidoscopeVideoBtn) {
            // Set initial state
            kaleidoscopeVideoBtn.textContent = `Apply to Video: ${
                this.kaleidoscopeApplyToVideo ? 'On' : 'Off'
            }`;
            kaleidoscopeVideoBtn.classList.toggle('active', this.kaleidoscopeApplyToVideo);
            
            kaleidoscopeVideoBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToVideo = !this.kaleidoscopeApplyToVideo;
                kaleidoscopeVideoBtn.textContent = `Apply to Video: ${
                    this.kaleidoscopeApplyToVideo ? 'On' : 'Off'
                }`;
                kaleidoscopeVideoBtn.classList.toggle('active', this.kaleidoscopeApplyToVideo);

                // Enable kaleidoscope if turning on
                if (this.kaleidoscopeApplyToVideo) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope(); // Make sure it's initialized
                        this.startKaleidoscopeAnimation();
                    }

                    // Force immediate redraw
                    this.applyKaleidoscopeEffect();
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToInfiniteZoom) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Update main button state
                const btn = document.getElementById('kaleidoscopeBtn');
                const btnText = btn.querySelector('.kaleidoscope-btn-text');
                if (this.kaleidoscopeEnabled) {
                    btnText.textContent = 'Kaleidoscope On';
                    btn.classList.add('active');
                } else {
                    btnText.textContent = 'Kaleidoscope Off';
                    btn.classList.remove('active');
                }
            });
        }

        const kaleidoscopeVizBtn = document.getElementById('kaleidoscopeVizBtn');
        if (kaleidoscopeVizBtn) {
            // Set initial state
            kaleidoscopeVizBtn.textContent = `Apply to Viz: ${
                this.kaleidoscopeApplyToViz ? 'On' : 'Off'
            }`;
            kaleidoscopeVizBtn.classList.toggle('active', this.kaleidoscopeApplyToViz);
            
            kaleidoscopeVizBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToViz = !this.kaleidoscopeApplyToViz;
                kaleidoscopeVizBtn.textContent = `Apply to Viz: ${
                    this.kaleidoscopeApplyToViz ? 'On' : 'Off'
                }`;
                kaleidoscopeVizBtn.classList.toggle('active', this.kaleidoscopeApplyToViz);

                // Enable kaleidoscope if turning on, disable if both are off
                if (this.kaleidoscopeApplyToViz) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToVideo && !this.kaleidoscopeApplyToInfiniteZoom) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Update main button state
                const btn = document.getElementById('kaleidoscopeBtn');
                const btnText = btn.querySelector('.kaleidoscope-btn-text');
                if (this.kaleidoscopeEnabled) {
                    btnText.textContent = 'Kaleidoscope On';
                    btn.classList.add('active');
                } else {
                    btnText.textContent = 'Kaleidoscope Off';
                    btn.classList.remove('active');
                }

                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        // Infinite Zoom toggle button
        const kaleidoscopeInfiniteZoomBtn = document.getElementById('kaleidoscopeInfiniteZoomBtn');
        if (kaleidoscopeInfiniteZoomBtn) {
            // Initialize button state
            kaleidoscopeInfiniteZoomBtn.textContent = `Infinite Zoom: ${
                this.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'
            }`;
            kaleidoscopeInfiniteZoomBtn.classList.toggle('active', this.kaleidoscopeApplyToInfiniteZoom);
            
            kaleidoscopeInfiniteZoomBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToInfiniteZoom = !this.kaleidoscopeApplyToInfiniteZoom;
                kaleidoscopeInfiniteZoomBtn.textContent = `Infinite Zoom: ${
                    this.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'
                }`;
                kaleidoscopeInfiniteZoomBtn.classList.toggle('active', this.kaleidoscopeApplyToInfiniteZoom);

                // Enable kaleidoscope if turning on IZ, disable if all are off
                if (this.kaleidoscopeApplyToInfiniteZoom) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToVideo) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Update main button state
                const btn = document.getElementById('kaleidoscopeBtn');
                const btnText = btn.querySelector('.kaleidoscope-btn-text');
                if (this.kaleidoscopeEnabled) {
                    btnText.textContent = 'Kaleidoscope On';
                    btn.classList.add('active');
                } else {
                    btnText.textContent = 'Kaleidoscope Off';
                    btn.classList.remove('active');
                }

                // Apply kaleidoscope effect if enabled
                if (this.kaleidoscopeEnabled) {
                    this.applyKaleidoscopeEffect();
                }
            });
        }

        // Header Kaleidoscope toggle buttons
        const headerKaleidoscopeVideoBtn = document.getElementById('headerKaleidoscopeVideoBtn');
        if (headerKaleidoscopeVideoBtn) {
            headerKaleidoscopeVideoBtn.textContent = `Apply to Video: ${
                this.kaleidoscopeApplyToVideo ? 'On' : 'Off'
            }`;
            headerKaleidoscopeVideoBtn.classList.toggle('active', this.kaleidoscopeApplyToVideo);
            
            headerKaleidoscopeVideoBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToVideo = !this.kaleidoscopeApplyToVideo;
                headerKaleidoscopeVideoBtn.textContent = `Apply to Video: ${
                    this.kaleidoscopeApplyToVideo ? 'On' : 'Off'
                }`;
                headerKaleidoscopeVideoBtn.classList.toggle('active', this.kaleidoscopeApplyToVideo);

                // Enable kaleidoscope if turning on
                if (this.kaleidoscopeApplyToVideo) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToInfiniteZoom) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Update main button state
                const btn = document.getElementById('kaleidoscopeBtn');
                const btnText = btn.querySelector('.kaleidoscope-btn-text');
                if (this.kaleidoscopeEnabled) {
                    btnText.textContent = 'Kaleidoscope On';
                    btn.classList.add('active');
                } else {
                    btnText.textContent = 'Kaleidoscope Off';
                    btn.classList.remove('active');
                }
            });
        }

        const headerKaleidoscopeVizBtn = document.getElementById('headerKaleidoscopeVizBtn');
        if (headerKaleidoscopeVizBtn) {
            headerKaleidoscopeVizBtn.textContent = `Apply to Viz: ${
                this.kaleidoscopeApplyToViz ? 'On' : 'Off'
            }`;
            headerKaleidoscopeVizBtn.classList.toggle('active', this.kaleidoscopeApplyToViz);
            
            headerKaleidoscopeVizBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToViz = !this.kaleidoscopeApplyToViz;
                headerKaleidoscopeVizBtn.textContent = `Apply to Viz: ${
                    this.kaleidoscopeApplyToViz ? 'On' : 'Off'
                }`;
                headerKaleidoscopeVizBtn.classList.toggle('active', this.kaleidoscopeApplyToViz);

                // Enable kaleidoscope if turning on, disable if both are off
                if (this.kaleidoscopeApplyToViz) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToVideo && !this.kaleidoscopeApplyToInfiniteZoom) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Update main button state
                const btn = document.getElementById('kaleidoscopeBtn');
                const btnText = btn.querySelector('.kaleidoscope-btn-text');
                if (this.kaleidoscopeEnabled) {
                    btnText.textContent = 'Kaleidoscope On';
                    btn.classList.add('active');
                } else {
                    btnText.textContent = 'Kaleidoscope Off';
                    btn.classList.remove('active');
                }
            });
        }

        const headerKaleidoscopeInfiniteZoomBtn = document.getElementById('headerKaleidoscopeInfiniteZoomBtn');
        if (headerKaleidoscopeInfiniteZoomBtn) {
            headerKaleidoscopeInfiniteZoomBtn.textContent = `Infinite Zoom: ${
                this.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'
            }`;
            headerKaleidoscopeInfiniteZoomBtn.classList.toggle('active', this.kaleidoscopeApplyToInfiniteZoom);
            
            headerKaleidoscopeInfiniteZoomBtn.addEventListener('click', () => {
                this.kaleidoscopeApplyToInfiniteZoom = !this.kaleidoscopeApplyToInfiniteZoom;
                headerKaleidoscopeInfiniteZoomBtn.textContent = `Infinite Zoom: ${
                    this.kaleidoscopeApplyToInfiniteZoom ? 'On' : 'Off'
                }`;
                headerKaleidoscopeInfiniteZoomBtn.classList.toggle('active', this.kaleidoscopeApplyToInfiniteZoom);

                // Enable kaleidoscope if turning on IZ, disable if all are off
                if (this.kaleidoscopeApplyToInfiniteZoom) {
                    if (!this.kaleidoscopeEnabled) {
                        this.kaleidoscopeEnabled = true;
                        this.initKaleidoscope();
                        this.startKaleidoscopeAnimation();
                    }
                } else if (!this.kaleidoscopeApplyToViz && !this.kaleidoscopeApplyToVideo) {
                    this.stopKaleidoscopeAnimation();
                    this.kaleidoscopeEnabled = false;
                }

                // Update main button state
                const btn = document.getElementById('kaleidoscopeBtn');
                const btnText = btn.querySelector('.kaleidoscope-btn-text');
                if (this.kaleidoscopeEnabled) {
                    btnText.textContent = 'Kaleidoscope On';
                    btn.classList.add('active');
                } else {
                    btnText.textContent = 'Kaleidoscope Off';
                    btn.classList.remove('active');
                }
            });
        }


        // End Kaleidoscope

        // Toggle buttons
        const videoInvertBtn = document.getElementById('videoInvertBtn');
        if (videoInvertBtn) {
            videoInvertBtn.addEventListener('click', () => {
                this.toggleVideoInvert();
                videoInvertBtn.textContent = `Invert: ${
                    this.videoInvert ? 'On' : 'Off'
                }`;
                videoInvertBtn.classList.toggle('active', this.videoInvert);
            });
        }

        const videoMirrorBtn = document.getElementById('videoMirrorBtn');
        if (videoMirrorBtn) {
            videoMirrorBtn.addEventListener('click', () => {
                this.cycleVideoMirror();
                const mirrorText = this.videoMirror === 'off' ? 'Off' : this.videoMirror.charAt(0).toUpperCase() + this.videoMirror.slice(1);
                videoMirrorBtn.textContent = `Mirror: ${mirrorText}`;
                videoMirrorBtn.classList.toggle('active', this.videoMirror !== 'off');
            });
        }

        const videoPulseBtn = document.getElementById('videoPulseBtn');
        if (videoPulseBtn) {
            videoPulseBtn.addEventListener('click', () => {
                this.toggleVideoPulse();
                videoPulseBtn.textContent = `Pulse: ${
                    this.videoPulse ? 'On' : 'Off'
                }`;
                videoPulseBtn.classList.toggle('active', this.videoPulse);
            });
        }

        // Inline video file controls
        const videoFileLoopBtn = document.getElementById('videoFileLoopBtn');
        if (videoFileLoopBtn) {
            videoFileLoopBtn.addEventListener('click', () => {
                this.videoFileLoop = !this.videoFileLoop;
                videoFileLoopBtn.classList.toggle('active', this.videoFileLoop);
                
                // Update loop setting on video elements
                if (this.videoElement && this.videoMode === 'file') {
                    this.videoElement.loop = this.videoFileLoop;
                }
                
                // Update stats if visible
                if (this.videoMode === 'file') {
                    this.detectVideoFileInfo();
                }
            });
        }

        const videoFileMuteBtn = document.getElementById('videoFileMuteBtn');
        if (videoFileMuteBtn) {
            videoFileMuteBtn.addEventListener('click', () => {
                this.videoFileMuted = !this.videoFileMuted;
                videoFileMuteBtn.textContent = this.videoFileMuted ? 'Muted' : 'Sound';
                videoFileMuteBtn.classList.toggle('active', this.videoFileMuted);
                
                // Update gain node instead of video element muted property
                if (this.videoAudioGain) {
                    this.videoAudioGain.gain.value = this.videoFileMuted ? 0 : 1;
                    console.log('Video audio gain set to:', this.videoFileMuted ? 0 : 1);
                }
            });
        }

        // Match Visualization Aspect Ratio toggle
        const matchVisualizationAspectBtn = document.getElementById('matchVisualizationAspectBtn');
        if (matchVisualizationAspectBtn) {
            matchVisualizationAspectBtn.addEventListener('click', () => {
                this.matchVisualizationAspect = !this.matchVisualizationAspect;
                matchVisualizationAspectBtn.textContent = this.matchVisualizationAspect ? 'Match Video Aspect: On' : 'Match Video Aspect: Off';
                matchVisualizationAspectBtn.classList.toggle('active', this.matchVisualizationAspect);
                
                // Apply aspect ratio matching if video is active
                if ((this.videoMode === 'camera' || this.videoMode === 'file') && this.videoElement) {
                    this.updateVisualizationAspectRatio();
                }
                
                console.log('Match visualization aspect ratio:', this.matchVisualizationAspect);
            });
        }

        // Preset buttons
        // Live video presets (exclude file browser presets)
        document.querySelectorAll('.video-preset-btn:not([data-target="fileBrowser"])').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                console.log('Applying LIVE VIDEO preset:', preset);
                this.applyVideoPreset(preset);
            });
        });

        // Video ON/OFF Toggle Button
        const videoToggleBtn = document.getElementById('videoToggleBtn');
        if (videoToggleBtn) {
            videoToggleBtn.addEventListener('click', () => {
                this.toggleVideoPlayback();
            });
        }
        
        // Helper function to update video toggle button state
        this.updateVideoToggleState = () => {
            const videoToggleBtn = document.getElementById('videoToggleBtn');
            if (videoToggleBtn) {
                if (this.videoMode === 'camera' || this.videoMode === 'file') {
                    videoToggleBtn.textContent = 'ON';
                    videoToggleBtn.classList.add('active');
                } else {
                    videoToggleBtn.textContent = 'OFF';
                    videoToggleBtn.classList.remove('active');
                }
            }
            
            // Also update the drawer video toggle button
            if (typeof updateDrawerVideoToggle === 'function') {
                updateDrawerVideoToggle();
            }
            
            // Update footer video button
            this.updateFooterLiveVideoButton();
        };

        const videoDeviceSelect = document.getElementById('videoDeviceSelect');
        if (videoDeviceSelect) {
            videoDeviceSelect.addEventListener('change', async (e) => {
                const value = e.target.value;
                if (value === 'file') {
                    // Trigger file input
                    const fileInput = document.getElementById('videoFileInput');
                    if (fileInput) {
                        fileInput.click();
                    }
                } else if (value) {
                    // Start camera input
                    await this.startVideoInput(value);
                }
            });
        }

        // Video file input handler
        const videoFileInput = document.getElementById('videoFileInput');
        if (videoFileInput) {
            videoFileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (file && file.type.startsWith('video/')) {
                    console.log('Selected video file:', file.name, file.type);
                    await this.startVideoFile(file);
                    // Update the dropdown to show the file name
                    this.updateVideoDeviceList();
                    const deviceSelect = document.getElementById('videoDeviceSelect');
                    if (deviceSelect) {
                        deviceSelect.value = 'file';
                        this.updateVideoDropdownDisplay();
                    }
                    // Reset file input for reselection
                    e.target.value = '';
                } else if (file) {
                    this.showError('Please select a valid video file');
                    // Reset the file input
                    e.target.value = '';
                }
            });
        }

        const videoOpacitySlider = document.getElementById('videoOpacitySlider');
        if (videoOpacitySlider) {
            videoOpacitySlider.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                this.setVideoOpacity(value);
                document.getElementById('videoOpacityValue').textContent = `${
                    e.target.value
                }%`;
            });
        }

        const videoFadeSlider = document.getElementById('videoFadeSlider');
        if (videoFadeSlider) {
            videoFadeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setVideoFadeTime(value);
                document.getElementById('videoFadeValue').textContent = `${
                    value.toFixed(1)
                }s`;
            });
        }

        // Audio input mode button (removed - now using select dropdown)

        // Audio device selector
        const deviceSelect = document.getElementById('audioDeviceSelect');
        if (deviceSelect) {
            deviceSelect.addEventListener('change', async (e) => {
                const deviceId = e.target.value;

                if (deviceId === 'help') {
                    this.showSystemAudioHelp();
                    e.target.value = '';
                } else if (deviceId) {
                    await this.startLiveInput(deviceId);
                }
            });
        }

        // Live Audio Toggle button
        const liveAudioToggleBtn = document.getElementById('liveAudioToggleBtn');
        if (liveAudioToggleBtn) {
            liveAudioToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleLiveAudio();
            });
        }

        // Footer Live Audio button
        const footerLiveAudioBtn = document.getElementById('footerLiveAudioBtn');
        if (footerLiveAudioBtn) {
            console.log('Footer Live Audio button found, adding event listener');
            footerLiveAudioBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Footer Live Audio button clicked');
                
                // If live audio is ON, toggle it OFF
                if (this.liveAudioEnabled) {
                    this.toggleLiveAudio();
                } else {
                    // If live audio is OFF, show device selection menu
                    this.showAudioInputMenu();
                }
            });
        } else {
            console.error('Footer Live Audio button not found');
        }

        // Footer Live Video button
        const footerLiveVideoBtn = document.getElementById('footerLiveVideoBtn');
        if (footerLiveVideoBtn) {
            console.log('Footer Live Video button found, adding event listener');
            footerLiveVideoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Footer Live Video button clicked');
                
                // If video is already active, toggle it off
                if (this.videoMode === 'camera' || this.videoMode === 'file') {
                    this.stopVideoInput();
                } else {
                    // Otherwise show device selection menu
                    this.showVideoInputMenu();
                }
            });
        } else {
            console.error('Footer Live Video button not found');
        }

        // Footer Live Color button
        const footerLiveColorBtn = document.getElementById('footerLiveColorBtn');
        if (footerLiveColorBtn) {
            console.log('Footer Live Color button found, adding event listener');
            footerLiveColorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Footer Live Color button clicked');
                
                // Show color picker
                this.showColorPicker();
            });
        } else {
            console.error('Footer Live Color button not found');
        }

        // Footer Live Background button
        const footerLiveBackgroundBtn = document.getElementById('footerLiveBackgroundBtn');
        if (footerLiveBackgroundBtn) {
            console.log('Footer Live Background button found, adding event listener');
            footerLiveBackgroundBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Footer Live Background button clicked');
                
                // If background image is enabled, toggle it off
                if (this.backgroundImageEnabled) {
                    this.toggleBackgroundImage();
                } else {
                    // Otherwise show background image selection
                    this.showBackgroundImageSelection();
                }
            });
        } else {
            console.error('Footer Live Background button not found');
        }

        // Footer Playlist button
        const footerPlaylistBtn = document.getElementById('footerPlaylistBtn');
        if (footerPlaylistBtn) {
            console.log('Footer Playlist button found, adding event listener');
            footerPlaylistBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Footer Playlist button clicked');
                
                // Show playlist panel
                this.showPlaylistPanel();
            });
        } else {
            console.error('Footer Playlist button not found');
        }

        // Footer Visualizer button
        const footerVisualizerBtn = document.getElementById('footerVisualizerBtn');
        if (footerVisualizerBtn) {
            console.log('Footer Visualizer button found, adding event listener');
            footerVisualizerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Footer Visualizer button clicked');
                
                // Always show the visualizer panel (like A and V buttons)
                this.showVisualizerPanel();
            });
        } else {
            console.error('Footer Visualizer button not found');
        }

        // Footer Visualizer Toggle button
        const footerVisualizerToggleBtn = document.getElementById('footerVisualizerToggleBtn');
        if (footerVisualizerToggleBtn) {
            console.log('Footer Visualizer Toggle button found, adding event listener');
            footerVisualizerToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Footer Visualizer Toggle button clicked');
                
                // Toggle visualization ON/OFF
                this.toggleVisualization();
            });
        } else {
            console.error('Footer Visualizer Toggle button not found');
        }

        // Footer Visualizer Random button
        const footerVisualizerRandomBtn = document.getElementById('footerVisualizerRandomBtn');
        if (footerVisualizerRandomBtn) {
            console.log('Footer Visualizer Random button found, adding event listener');
            footerVisualizerRandomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Footer Visualizer Random button clicked');
                
                // Set random visualization mode
                this.setRandomVisualization();
            });
        } else {
            console.error('Footer Visualizer Random button not found');
        }


        // Morph controls
        const morphBtn = document.getElementById('morphBtn');
        if (morphBtn) {
            morphBtn.addEventListener('click', () => {
                this.toggleMorph();
            });
        } else {
            console.error('Morph button not found during initialization');
        }

        const morphSpeedSelect = document.getElementById('morphSpeedSelect');
        if (morphSpeedSelect) {
            morphSpeedSelect.addEventListener('change', (e) => {
                this.setMorphSpeed(e.target.value);
            });
        }

        // Random visualization button
        const randomBtn = document.getElementById('randomVizBtn');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                this.setRandomVisualization();
            });
        }

        // Fullscreen exit button
        const fullscreenExitBtn = document.getElementById('fullscreenExitBtn');
        if (fullscreenExitBtn) {
            fullscreenExitBtn.addEventListener('click', () => {
                this.exitFullscreen();
            });
        }

        // Click to exit fullscreen on mobile/touch devices
        document.addEventListener('click', (e) => {
            if (this.isFullscreen && (e.target.id === 'visualizationContainer' || e.target.id === 'visualizer' || e.target.tagName === 'CANVAS')) {
                if (window.innerWidth<= 768 || 'ontouchstart' in window) {
            if (!e.target.closest('#fullscreenRandomBtn')) {
                this.exitFullscreen();
            }
        }
    }
});

// Playback controls
document.getElementById('playBtn').addEventListener('click', () => this.togglePlay()) 

                    document.getElementById('prevBtn').addEventListener('click', () => this.prevTrack());
                
                document.getElementById('nextBtn').addEventListener('click', () => this.nextTrack());
                document.getElementById('loopBtn').addEventListener('click', () => this.toggleLoop());

                // Background color controls
                const bgColorBtn = document.getElementById('bgColorBtn');
                const bgColorPicker = document.getElementById('bgColorPicker');

                if (bgColorBtn && bgColorPicker) {
                    bgColorBtn.addEventListener('click', () => {
                        bgColorPicker.click();
                    });

                    bgColorPicker.addEventListener('change', (e) => {
                        this.setBackgroundColor(e.target.value);
                    });
                }

                // Preset controls
                const savePresetBtn = document.getElementById('savePresetBtn');
                if (savePresetBtn) {
                    savePresetBtn.addEventListener('click', () => {
                        const name = prompt('Enter preset name:', `Preset ${
                            this.savedPresets.length + 1
                        }`);
                        if (name) {
                            this.saveCurrentAsPreset(name);
                        }
                    });
                }

                const presetSelector = document.getElementById('presetSelector');
                if (presetSelector) {
                    presetSelector.addEventListener('change', (e) => {
                        if (e.target.value !== '') {
                            this.loadPreset(parseInt(e.target.value));
                            e.target.value = '';
                        }
                    });
                }

                const exportPresetsBtn = document.getElementById('exportPresetsBtn');
                if (exportPresetsBtn) {
                    exportPresetsBtn.addEventListener('click', () => {
                        this.exportPresets();
                    });
                }

                const importPresetsBtn = document.getElementById('importPresetsBtn');
                if (importPresetsBtn) {
                    importPresetsBtn.addEventListener('click', () => {
                        document.getElementById('importPresetsFile').click();
                    });
                }

                const importPresetsFile = document.getElementById('importPresetsFile');
                if (importPresetsFile) {
                    importPresetsFile.addEventListener('change', (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            this.importPresets(file);
                            e.target.value = '';
                        }
                    });
                }

                // Info popup
                const infoBtn = document.getElementById('infoBtn');
                if (infoBtn) {
                    infoBtn.addEventListener('click', () => this.showInfoPopup());
                }

                const popupOverlay = document.getElementById('popupOverlay');
                if (popupOverlay) {
                    popupOverlay.addEventListener('click', () => this.closeInfoPopup());
                }

                // Progress bar click to seek
                const progressBar = document.getElementById('progressBar');
                if (progressBar) {
                    progressBar.addEventListener('click', (e) => {
                        if (this.audio && this.audio.duration) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            this.audio.currentTime = percent * this.audio.duration;
                        }
                    });
                }

                // Volume slider
                const volumeSlider = document.getElementById('volumeSlider');
                if (volumeSlider) {
                    volumeSlider.addEventListener('click', (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        this.setVolume(percent);
                    });
                }

                // ========== FULLSCREEN CONTROLS ==========

                // Fullscreen playback controls
                const fsPlayBtn = document.getElementById('fsPlayBtn');
                if (fsPlayBtn) {
                    fsPlayBtn.addEventListener('click', () => {
                        this.togglePlay();
                        fsPlayBtn.innerHTML = this.isPlaying ? '⏸' : '▶';
                    });
                }

                const fsPrevBtn = document.getElementById('fsPrevBtn');
                if (fsPrevBtn) {
                    fsPrevBtn.addEventListener('click', () => this.prevTrack());
                }

                const fsNextBtn = document.getElementById('fsNextBtn');
                if (fsNextBtn) {
                    fsNextBtn.addEventListener('click', () => this.nextTrack());
                }

                const fsLoopBtn = document.getElementById('fsLoopBtn');
                if (fsLoopBtn) {
                    fsLoopBtn.addEventListener('click', () => {
                        this.toggleLoop();
                        const fsLoopIndicator = document.getElementById('fsLoopIndicator');
                        if (fsLoopIndicator) {
                            switch (this.loopMode) {
                                case 'off': fsLoopBtn.classList.remove('active');
                                    fsLoopIndicator.style.display = 'none';
                                    break;
                                case 'one': fsLoopBtn.classList.add('active');
                                    fsLoopIndicator.style.display = 'flex';
                                    fsLoopIndicator.textContent = '1';
                                    break;
                                case 'all': fsLoopBtn.classList.add('active');
                                    fsLoopIndicator.style.display = 'flex';
                                    fsLoopIndicator.textContent = 'A';
                                    break;
                            }
                        }
                    });
                }

                // Fullscreen progress bar
                const fsProgressBar = document.getElementById('fsProgressBar');
                if (fsProgressBar) {
                    fsProgressBar.addEventListener('click', (e) => {
                        if (this.audio && this.audio.duration) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            this.audio.currentTime = percent * this.audio.duration;
                        }
                    });
                }

                // Fullscreen volume
                const fsVolumeSlider = document.getElementById('fsVolumeSlider');
                if (fsVolumeSlider) {
                    fsVolumeSlider.addEventListener('click', (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        this.setVolume(percent);
                        document.getElementById('fsVolumeFill').style.width = `${
                            percent * 100
                        }%`;
                    });
                }

                // Fullscreen playlist dropdown
                const fsPlaylistSelect = document.getElementById('fsPlaylistSelect');
                if (fsPlaylistSelect) {
                    fsPlaylistSelect.addEventListener('change', async (e) => {
                        if (e.target.value !== '') {
                            await this.selectTrack(parseInt(e.target.value));
                        }
                    });
                }

                // Fullscreen color scheme
                const fsColorSelect = document.getElementById('fsColorSelect');
                if (fsColorSelect) {
                    fsColorSelect.addEventListener('change', (e) => {
                        this.setColorScheme(e.target.value);
                    });
                }

                // Fullscreen visualization mode
                const fsVizSelect = document.getElementById('fsVizSelect');
                if (fsVizSelect) {
                    fsVizSelect.addEventListener('change', (e) => {
                        this.setVisualizationMode(parseInt(e.target.value));
                    });
                }

                // Fullscreen preset dropdown
                const fsPresetSelect = document.getElementById('fsPresetSelect');
                if (fsPresetSelect) {
                    fsPresetSelect.addEventListener('change', (e) => {
                        if (e.target.value !== '') {
                            this.loadPreset(parseInt(e.target.value));
                            e.target.value = '';
                        }
                    });
                }

                // Fullscreen background color
                const fsBgColorBtn = document.getElementById('fsBgColorBtn');
                const fsBgColorPicker = document.getElementById('fsBgColorPicker');
                if (fsBgColorBtn && fsBgColorPicker) {
                    fsBgColorBtn.addEventListener('click', () => {
                        fsBgColorPicker.click();
                    });

                    fsBgColorPicker.addEventListener('change', (e) => {
                        this.setBackgroundColor(e.target.value);
                    });
                }

                // Fullscreen morph controls
                const fsMorphBtn = document.getElementById('fsMorphBtn');
                if (fsMorphBtn) {
                    fsMorphBtn.addEventListener('click', () => {
                        this.toggleMorph();
                        fsMorphBtn.classList.toggle('active', this.isMorphing);
                    });
                }

                const fsMorphSpeed = document.getElementById('fsMorphSpeed');
                if (fsMorphSpeed) {
                    fsMorphSpeed.addEventListener('change', (e) => {
                        this.setMorphSpeed(e.target.value);
                    });
                }

                // Fullscreen random button
                const fsRandomBtn = document.getElementById('fsRandomBtn');
                if (fsRandomBtn) {
                    fsRandomBtn.addEventListener('click', () => {
                        this.setRandomVisualization();
                    });
                }

                // Fullscreen button
                const fullscreenBtn = document.getElementById('fullscreenBtn');
                if (fullscreenBtn) {
                    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
                }

                // Fullscreen change events
                // Fullscreen change events
                const fullscreenChangeHandler = () => {
                    this.isFullscreen = !!(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement);

                    const exitBtn = document.getElementById('fullscreenExitBtn');
                    const fsControls = document.getElementById('fullscreenControls');
                    const visualizationContainer = document.querySelector('.visualization-container');

                    if (this.isFullscreen) {
                        document.body.classList.add('fullscreen-mode');

                        if (visualizationContainer && fsControls) {
                            visualizationContainer.appendChild(fsControls);
                            fsControls.style.display = 'flex';

                            // Start auto-hide timer
                            this.showFullscreenControls();

                            // Add mouse movement listener for fullscreen
                            if (!this.fullscreenMouseHandler) {
                                this.fullscreenMouseHandler = () => this.showFullscreenControls();
                            }
                            document.addEventListener('mousemove', this.fullscreenMouseHandler);
                        }

                        if (exitBtn) {
                            exitBtn.style.display = 'flex';
                        }

                        // Populate fullscreen playlist dropdown
                        const fsPlaylistSelect = document.getElementById('fsPlaylistSelect');
                        if (fsPlaylistSelect && this.playlist) {
                            fsPlaylistSelect.innerHTML = '<option value="">Select Track...</option>';
                            this.playlist.forEach((track, index) => {
                                const option = document.createElement('option');
                                option.value = index;
                                option.textContent = track.name;
                                if (index === this.currentTrackIndex) {
                                    option.selected = true;
                                }
                                fsPlaylistSelect.appendChild(option);
                            });
                        }

                        // Populate fullscreen presets dropdown
                        const fsPresetSelect = document.getElementById('fsPresetSelect');
                        if (fsPresetSelect && this.savedPresets) {
                            fsPresetSelect.innerHTML = '<option value="">Load Preset...</option>';
                            this.savedPresets.forEach((preset, index) => {
                                const option = document.createElement('option');
                                option.value = index;
                                option.textContent = preset.name;
                                fsPresetSelect.appendChild(option);
                            });
                        }

                        // Sync other control states
                        const fsPlayBtn = document.getElementById('fsPlayBtn');
                        if (fsPlayBtn) {
                            fsPlayBtn.innerHTML = this.isPlaying ? '⏸' : '▶';
                        }

                        const fsLoopBtn = document.getElementById('fsLoopBtn');
                        const fsLoopIndicator = document.getElementById('fsLoopIndicator');
                        if (fsLoopBtn && fsLoopIndicator) {
                            switch (this.loopMode) {
                                case 'off': fsLoopBtn.classList.remove('active');
                                    fsLoopIndicator.style.display = 'none';
                                    break;
                                case 'one': fsLoopBtn.classList.add('active');
                                    fsLoopIndicator.style.display = 'flex';
                                    fsLoopIndicator.textContent = '1';
                                    break;
                                case 'all': fsLoopBtn.classList.add('active');
                                    fsLoopIndicator.style.display = 'flex';
                                    fsLoopIndicator.textContent = 'A';
                                    break;
                            }
                        }

                        const fsMorphBtn = document.getElementById('fsMorphBtn');
                        if (fsMorphBtn) {
                            fsMorphBtn.classList.toggle('active', this.isMorphing);
                        }

                        const fsVolumeFill = document.getElementById('fsVolumeFill');
                        if (fsVolumeFill) {
                            fsVolumeFill.style.width = `${
                                this.volume * 100
                            }%`;
                        }

                        const fsVizSelect = document.getElementById('fsVizSelect');
                        if (fsVizSelect) {
                            fsVizSelect.value = this.currentMode;
                        }

                        const fsColorSelect = document.getElementById('fsColorSelect');
                        if (fsColorSelect) {
                            fsColorSelect.value = this.currentColorScheme;
                        }

                        const fsMorphSpeed = document.getElementById('fsMorphSpeed');
                        if (fsMorphSpeed) {
                            fsMorphSpeed.value = this.morphMode;
                        }

                        const fsBgColorPicker = document.getElementById('fsBgColorPicker');
                        if (fsBgColorPicker) {
                            fsBgColorPicker.value = this.backgroundColor;
                        }

                        const fsTrackTitle = document.getElementById('fsTrackTitle');
                        if (fsTrackTitle && this.playlist[this.currentTrackIndex]) {
                            fsTrackTitle.textContent = this.playlist[this.currentTrackIndex].name;
                        }

                    } else {
                        document.body.classList.remove('fullscreen-mode');

                        // Remove mouse movement listener
                        if (this.fullscreenMouseHandler) {
                            document.removeEventListener('mousemove', this.fullscreenMouseHandler);
                        }
                        if (this.controlsTimeout) {
                            clearTimeout(this.controlsTimeout);
                        }

                        if (fsControls) {
                            document.body.appendChild(fsControls);
                            fsControls.style.display = 'none';
                            fsControls.classList.remove('hidden');
                        }

                        if (exitBtn) {
                            exitBtn.style.display = 'none';
                        }

                        if (visualizationContainer && visualizationContainer.style.position === 'fixed') {
                            visualizationContainer.style.position = '';
                            visualizationContainer.style.top = '';
                            visualizationContainer.style.left = '';
                            visualizationContainer.style.width = '';
                            visualizationContainer.style.height = '';
                            visualizationContainer.style.zIndex = '';
                        }
                    }
                };

                document.addEventListener('fullscreenchange', fullscreenChangeHandler);
                document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
                document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
                document.addEventListener('msfullscreenchange', fullscreenChangeHandler);

                // Keyboard controls
                document.addEventListener('keydown', async (e) => {
                    if (e.target.tagName === 'INPUT') 
                        return;
                    


                    switch (e.code) {
                        case 'Space':
                            e.preventDefault();
                            await this.togglePlay();
                            break;
                        case 'ArrowLeft':
                            e.preventDefault();
                            await this.prevTrack();
                            break;
                        case 'ArrowRight':
                            e.preventDefault();
                            await this.nextTrack();
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            this.setVolume(Math.min(1, this.volume + 0.05));
                            break;
                        case 'ArrowDown':
                            e.preventDefault();
                            this.setVolume(Math.max(0, this.volume - 0.05));
                            break;
                        case 'KeyF':
                            e.preventDefault();
                            this.toggleFullscreen();
                            break;
                        case 'KeyR':
                            e.preventDefault();
                            this.setRandomVisualization();
                            break;
                        case 'KeyM':
                            e.preventDefault();
                            this.toggleMorph();
                            break;
                        case 'KeyL':
                            e.preventDefault();
                            this.toggleLoop();
                            break;
                        case 'Escape':
                            e.preventDefault();
                            this.exitFullscreen();
                            this.closeInfoPopup();
                            break;
                    }
                });

                // Touch/swipe gestures for mobile
                let touchStartX = 0;
                let touchStartY = 0;

                document.addEventListener('touchstart', (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                    touchStartY = e.changedTouches[0].screenY;
                }, {passive: true});

                document.addEventListener('touchend', (e) => {
                    const touchEndX = e.changedTouches[0].screenX;
                    const touchEndY = e.changedTouches[0].screenY;
                    const diffX = touchEndX - touchStartX;
                    const diffY = touchEndY - touchStartY;

                    if (Math.abs(diffX) > 50) {
                        if (diffX > 0) {
                            this.prevTrack();
                        } else {
                            this.nextTrack();
                        }
                    }

                    if (Math.abs(diffY) > 50) {
                        if (diffY > 0) {
                            this.setVolume(Math.max(0, this.volume - 0.1));
                        } else {
                            this.setVolume(Math.min(1, this.volume + 0.1));
                        }
                    }
                }, {passive: true});
            }

            // Show/Hide full screen controls
            showFullscreenControls() {
                const fsControls = document.getElementById('fullscreenControls');
                if (fsControls && this.isFullscreen) {
                    fsControls.classList.remove('hidden');
                    this.controlsVisible = true;

                    // Clear existing timeout
                    if (this.controlsTimeout) {
                        clearTimeout(this.controlsTimeout);
                    }

                    // Set new timeout
                    this.controlsTimeout = setTimeout(() => {
                        this.hideFullscreenControls();
                    }, 5000);
                }
            }

            hideFullscreenControls() {
                const fsControls = document.getElementById('fullscreenControls');
                if (fsControls && this.isFullscreen) {
                    fsControls.classList.add('hidden');
                    this.controlsVisible = false;
                }
            }

            // *end evenlisteners
            updatePlaylistDropdown() {
                const dropdown = document.getElementById('playlistDropdown');
                if (!dropdown) return;
                
                // Check if we have new playlist content - if so, don't overwrite it
                const hasNewContent = dropdown.querySelector('.playlist-actions-dropdown');
                if (hasNewContent) {
                    console.log('Preserving new playlist content, skipping old dropdown update');
                    return;
                }
                
                // Only clear and populate if using old hardcoded system
                dropdown.innerHTML = '';

                const playlistData = document.querySelectorAll('#playlistData .playlist-data-item');
                let trackIndex = 0;

                playlistData.forEach(item => {
                    if (item.dataset.type === 'album') {
                        const albumDiv = document.createElement('div');
                        albumDiv.className = 'playlist-album-cover';
                        albumDiv.innerHTML = `
                <img src="${
                            item.dataset.image
                        }" alt="${
                            item.dataset.name
                        }">
                <div class="playlist-album-name">${
                            item.dataset.name
                        }</div>
            `;
                        dropdown.appendChild(albumDiv);

                    } else if (item.dataset.type === 'track') {
                        const trackDiv = document.createElement('div');
                        trackDiv.className = 'playlist-dropdown-item';

                        if (trackIndex === this.currentTrackIndex) {
                            trackDiv.classList.add('active');
                        }

                        const currentTrackIndex = trackIndex;
                        trackDiv.innerHTML = `
                <div class="playlist-album-icon">
                    <img src="${
                            item.dataset.image
                        }" alt="${
                            item.dataset.name
                        }">
                </div>
                <div class="playlist-track-name">${
                            item.dataset.name
                        }</div>
            `;

                        trackDiv.addEventListener('click', () => {
                            this.selectTrack(currentTrackIndex);
                            // No need to close - playlist is embedded
                        });

                        dropdown.appendChild(trackDiv);
                        trackIndex++;
                    }
                });
            }

            showInfoPopup() {
                document.getElementById('infoPopup').classList.add('active');
                document.getElementById('popupOverlay').classList.add('active');
            }

            closeInfoPopup() {
                document.getElementById('infoPopup').classList.remove('active');
                document.getElementById('popupOverlay').classList.remove('active');
            }

            // Morph Methods
            startMorphing() {
                if (this.isMorphing) {
                    this.stopMorphing();
                    return;
                }

                this.isMorphing = true;

                // Update sidebar morph button
                const morphBtn = document.getElementById('morphBtn');
                if (morphBtn) {
                    morphBtn.classList.add('active');
                    const btnText = morphBtn.querySelector('.morph-btn-text');
                    if (btnText) {
                        btnText.textContent = 'Stop Morph';
                    }
                }

                // Update footer morph button
                const footerMorphBtn = document.getElementById('footerMorphBtn');
                if (footerMorphBtn) {
                    footerMorphBtn.classList.add('active');
                    const footerBtnText = footerMorphBtn.querySelector('.morph-btn-text');
                    if (footerBtnText) {
                        footerBtnText.textContent = 'Stop Morph';
                    }
                }

                // Make sure energy history is initialized
                this.energyHistory = this.energyHistory || [];
                this.currentEnergy = 0;
                this.lastEnergy = 0;

                if (this.morphMode === 'energy') {
                    this.startEnergyDetection();
                    // Show sidebar energy container
                    const energyContainer = document.getElementById('energyContainer');
                    if (energyContainer) {
                        energyContainer.style.display = 'block';
                    }
                    // Show footer energy container
                    const footerEnergyContainer = document.getElementById('footerEnergyContainer');
                    if (footerEnergyContainer) {
                        footerEnergyContainer.style.display = 'block';
                    }
                }

                this.morphStartConfig = this.getCurrentConfig();

                // Store MORE locked parameters to prevent visual jumps
                this.lockedMorphParams = {
                    radial: this.morphStartConfig.radial,
                    mirror: this.morphStartConfig.mirror,
                    ledBars: this.morphStartConfig.ledBars,
                    ansiBands: this.morphStartConfig.ansiBands,
                    mode: this.morphStartConfig.mode,
                    channelLayout: this.morphStartConfig.channelLayout,
                    frequencyScale: this.morphStartConfig.frequencyScale, // Lock this
                    spinSpeed: this.morphStartConfig.spinSpeed, // Lock spin speed
                    spinAngle: this.audioMotion ? this.audioMotion.spinAngle : 0 // Preserve current angle
                };

                this.generateNewMorphTarget();
                this.morphProgress = 0;

                this.morphInterval = setInterval(() => {
                    this.updateMorph();
                }, 50);
            }

            stopMorphing() {
                this.isMorphing = false;
                this.lockedMorphParams = null;

                if (this.morphInterval) {
                    clearInterval(this.morphInterval);
                    this.morphInterval = null;
                }

                if (this.energyCheckInterval) {
                    clearInterval(this.energyCheckInterval);
                    this.energyCheckInterval = null;
                }

                // Update sidebar morph button
                const morphBtn = document.getElementById('morphBtn');
                if (morphBtn) {
                    morphBtn.classList.remove('active');
                    const btnText = morphBtn.querySelector('.morph-btn-text');
                    if (btnText) {
                        btnText.textContent = 'Start Morph';
                    }
                }

                // Update footer morph button
                const footerMorphBtn = document.getElementById('footerMorphBtn');
                if (footerMorphBtn) {
                    footerMorphBtn.classList.remove('active');
                    const footerBtnText = footerMorphBtn.querySelector('.morph-btn-text');
                    if (footerBtnText) {
                        footerBtnText.textContent = 'Start Morph';
                    }
                }

                // Hide energy indicators
                const energyContainer = document.getElementById('energyContainer');
                if (energyContainer) {
                    energyContainer.style.display = 'none';
                }
                const footerEnergyContainer = document.getElementById('footerEnergyContainer');
                if (footerEnergyContainer) {
                    footerEnergyContainer.style.display = 'none';
                }
            }

            startEnergyDetection() {
                if (this.energyCheckInterval) {
                    clearInterval(this.energyCheckInterval);
                }

                this.energyCheckInterval = setInterval(() => {
                    this.detectEnergy();
                }, 100);
            }

            detectEnergy() {
                if (!this.audioMotion || !this.audioMotion.dataArray) {
                    console.log('Energy detection: No audioMotion or dataArray');
                    return;
                }
                


                let energy = 0;
                const dataArray = this.audioMotion.dataArray;

                const bassEnd = Math.min(Math.floor(dataArray.length * 0.1), dataArray.length);
                for (let i = 0; i < bassEnd; i++) {
                    energy += dataArray[i];
                }
                energy = energy / bassEnd / 255;

                this.energyHistory.push(energy);
                if (this.energyHistory.length > 10) {
                    this.energyHistory.shift();
                }

                this.lastEnergy = this.currentEnergy;
                this.currentEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

                if (this.morphMode === 'energy') {
                    this.updateMorphSpeedFromEnergy();
                }

                // Update sidebar energy indicator
                const energyIndicator = document.getElementById('energyIndicator');
                if (energyIndicator) {
                    energyIndicator.style.width = `${
                        this.currentEnergy * 100
                    }%`;
                    const hue = 120 - (this.currentEnergy * 120);
                    energyIndicator.style.background = `hsl(${hue}, 100%, 50%)`;
                }

                // Update footer energy indicator
                const footerEnergyFill = document.getElementById('footerEnergyFill');
                if (footerEnergyFill) {
                    footerEnergyFill.style.width = `${
                        this.currentEnergy * 100
                    }%`;
                    const hue = 120 - (this.currentEnergy * 120);
                    footerEnergyFill.style.background = `hsl(${hue}, 100%, 50%)`;
                    console.log(`Energy: ${this.currentEnergy.toFixed(3)}, Width: ${(this.currentEnergy * 100).toFixed(1)}%`);
                } else {
                    console.log('Footer energy fill not found');
                }
            }

            updateMorphSpeedFromEnergy() {
                const minDuration = 1500;
                const maxDuration = 8000;

                this.morphDuration = minDuration + (1 - this.currentEnergy) * (maxDuration - minDuration);

                if (this.currentEnergy > 0.7 && this.lastEnergy < 0.6) {
                    this.morphProgress = 0;
                    this.morphStartConfig = this.getCurrentConfig();
                    this.generateNewMorphTarget();
                }
            }

            updateMorph() {
                if (!this.isMorphing || !this.audioMotion) 
                    return;
                


                this.morphProgress += 50 / this.morphDuration;

                if (this.morphProgress >= 1) {
                    this.morphProgress = 1;

                    this.applyMorphConfig(this.morphTargetConfig);

                    this.morphStartConfig = this.morphTargetConfig;
                    this.generateNewMorphTarget();
                    this.morphProgress = 0;
                } else {
                    const easedProgress = this.easeInOutCubic(this.morphProgress);
                    const currentConfig = this.interpolateConfigs(this.morphStartConfig, this.morphTargetConfig, easedProgress);

                    this.applyMorphConfig(currentConfig);
                }
            }

            interpolateConfigs(start, target, progress) {
                const config = {};

                // Always use locked parameters if they exist
                if (this.lockedMorphParams) {
                    Object.assign(config, this.lockedMorphParams);
                }

                // Interpolate ONLY numeric properties that should smoothly transition
                const numericProps = [
                    'barSpace',
                    'fillAlpha',
                    'smoothing',
                    'reflexRatio',
                    'reflexAlpha',
                    'lineWidth',
                    'radius',
                    'bgAlpha',
                    'maxDecibels',
                    'minDecibels',
                    'linearBoost',
                    'volume'
                ];

                numericProps.forEach(prop => {
                    if (start[prop] !== undefined && target[prop] !== undefined) {
                        config[prop] = start[prop] + (target[prop] - start[prop]) * progress;
                    }
                });

                // Keep these properties from start config to prevent jumps
                config.gradient = start.gradient;
                config.showPeaks = start.showPeaks;
                config.roundBars = start.roundBars;
                config.outlineBars = start.outlineBars;
                config.linearAmplitude = start.linearAmplitude;

                // Only switch these at the END of morph (when starting new morph)
                if (progress >= 1) {
                    config.gradient = target.gradient;
                    config.showPeaks = target.showPeaks;
                    config.roundBars = target.roundBars;
                    config.outlineBars = target.outlineBars;
                }

                // Always include these critical properties
                config.fftSize = 8192;

                return config;
            }

            easeInOutCubic(t) { // Make the easing even smoother
                if (t < 0.5) {
                    return 4 * t * t * t;
                } else {
                    const p = 2 * t - 2;
                    return 1 + p * p * p / 2;
                }
            }

            toggleMorph() {
                if (this.isMorphing) {
                    this.stopMorphing();
                } else {
                    this.startMorphing();
                }
            }

            setMorphSpeed(speed) {
                this.morphMode = speed;

                if (speed === 'energy') {
                    if (this.isMorphing) {
                        this.startEnergyDetection();
                    }
                    // Show sidebar energy container
                    const energyContainer = document.getElementById('energyContainer');
                    if (energyContainer) {
                        energyContainer.style.display = 'block';
                    }
                    // Show footer energy container
                    const footerEnergyContainer = document.getElementById('footerEnergyContainer');
                    if (footerEnergyContainer) {
                        footerEnergyContainer.style.display = 'block';
                    }
                } else {
                    if (this.energyCheckInterval) {
                        clearInterval(this.energyCheckInterval);
                        this.energyCheckInterval = null;
                    }

                    // Hide sidebar energy container
                    const energyContainer = document.getElementById('energyContainer');
                    if (energyContainer) {
                        energyContainer.style.display = 'none';
                    }
                    // Hide footer energy container
                    const footerEnergyContainer = document.getElementById('footerEnergyContainer');
                    if (footerEnergyContainer) {
                        footerEnergyContainer.style.display = 'none';
                    }

                    const speeds = {
                        slow: 10000,
                        medium: 5000,
                        fast: 2000,
                        ultra: 1000
                    };
                    this.morphDuration = speeds[speed] || 5000;
                }
            }

            // Fullscreen Methods
            toggleFullscreen() {
                const visualizationContainer = document.querySelector('.visualization-container');
                const appContainer = document.querySelector('.app-container');
                const exitBtn = document.getElementById('fullscreenExitBtn');

                if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {

                    const element = visualizationContainer || appContainer || document.documentElement;

                    if (exitBtn) {
                        exitBtn.style.display = 'flex';
                    }

                    if (element.requestFullscreen) {
                        element.requestFullscreen().catch(err => {
                            console.error('Error attempting fullscreen:', err);
                            this.fallbackFullscreen();
                        });
                    } else if (element.mozRequestFullScreen) {
                        element.mozRequestFullScreen();
                    } else if (element.webkitRequestFullscreen) {
                        element.webkitRequestFullscreen();
                    } else if (element.webkitEnterFullscreen) {
                        element.webkitEnterFullscreen();
                    } else if (element.msRequestFullscreen) {
                        element.msRequestFullscreen();
                    } else {
                        this.fallbackFullscreen();
                    }
                } else {
                    this.exitFullscreen();
                }
            }

            fallbackFullscreen() {
                const visualizationContainer = document.querySelector('.visualization-container');
                const randomBtn = document.getElementById('fullscreenRandomBtn');
                const exitBtn = document.getElementById('fullscreenExitBtn');

                if (visualizationContainer) {
                    visualizationContainer.style.position = 'fixed';
                    visualizationContainer.style.top = '0';
                    visualizationContainer.style.left = '0';
                    visualizationContainer.style.width = '100vw';
                    visualizationContainer.style.height = '100vh';
                    visualizationContainer.style.zIndex = '9999';
                    document.body.classList.add('fullscreen-mode');
                    this.isFullscreen = true;

                    if (randomBtn) {
                        visualizationContainer.appendChild(randomBtn);
                        randomBtn.style.display = 'block';
                    }

                    if (exitBtn) {
                        exitBtn.style.display = 'flex';
                    }
                }
            }

            exitFullscreen() {
                const randomBtn = document.getElementById('fullscreenRandomBtn');
                const exitBtn = document.getElementById('fullscreenExitBtn');

                if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {

                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                } else if (this.isFullscreen) {
                    const visualizationContainer = document.querySelector('.visualization-container');
                    if (visualizationContainer) {
                        visualizationContainer.style.position = '';
                        visualizationContainer.style.top = '';
                        visualizationContainer.style.left = '';
                        visualizationContainer.style.width = '';
                        visualizationContainer.style.height = '';
                        visualizationContainer.style.zIndex = '';
                        document.body.classList.remove('fullscreen-mode');
                        this.isFullscreen = false;
                    }
                }

                if (randomBtn) {
                    document.body.appendChild(randomBtn);
                    randomBtn.style.display = 'none';
                }

                if (exitBtn) {
                    exitBtn.style.display = 'none';
                }
            }

            // Playlist Methods
            loadPlaylist() {
                this.playlist = [];
                const playlistData = document.querySelectorAll('#playlistData .playlist-data-item[data-type="track"]');

                playlistData.forEach(item => {
                    this.playlist.push({
                        name: item.dataset.name,
                        url: item.dataset.url,
                        image: item.dataset.image || 'https://content.app-sources.com/s/810881111918650241/uploads/Images/Icon-3589409.jpg'
                    });
                });

                this.updatePlaylistDropdown();
            }

            async preloadTrack(index) {
                if (index < 0 || index >= this.playlist.length) {
                    console.warn(`Invalid track index: ${index} (playlist length: ${this.playlist.length})`);
                    return;
                }
                
                const track = this.playlist[index];
                if (!track || !track.url) {
                    console.warn(`Track at index ${index} has no URL:`, track);
                    this.showError('Track has no valid URL - may need rescan');
                    return;
                }

                // Validate URL before attempting to load
                if (!track.url.startsWith('blob:') && !track.url.startsWith('http')) {
                    console.warn(`Invalid track URL format: ${track.url}`);
                    this.showError('Invalid track URL format');
                    return;
                }

                try {
                    if (this.audio) {
                        this.audio.pause();
                        if (this.audioMotion) {
                            this.audioMotion.disconnectInput();
                        }
                    }

                    this.audio = new Audio();
                    this.audio.crossOrigin = 'anonymous';
                    this.audio.src = track.url;
                    this.audio.volume = this.volume;

                    console.log(`Loading track ${index}: "${track.name}" from ${track.url.substring(0, 50)}...`);

                    await new Promise((resolve, reject) => {
                        this.audio.addEventListener('canplay', resolve, {once: true});
                        this.audio.addEventListener('error', (e) => {
                            console.error('Audio loading error:', e);
                            reject(new Error(`Failed to load audio: ${e.type}`));
                        }, {once: true});
                        setTimeout(() => {
                            console.warn('Audio loading timeout after 5 seconds');
                            reject(new Error('Audio loading timeout'));
                        }, 5000);
                    });

                    this.audio.addEventListener('timeupdate', () => this.updateProgress());
                    this.audio.addEventListener('ended', () => this.handleTrackEnd());
                    this.audio.addEventListener('error', (e) => {
                        console.error('Audio playback error:', e);
                        this.showError('Failed to load audio track');
                    });

                    if (this.audioMotion) {
                        this.audioMotion.connectInput(this.audio);
                    }

                    this.currentTrackIndex = index;
                    this.updateTrackInfo();
                    this.updatePlaylistDropdown();
                    
                    console.log(`✅ Successfully loaded track ${index}: "${track.name}"`);

                } catch (error) {
                    console.error('Failed to preload track:', error);
                    this.showError('Failed to load track: ' + error.message);
                }
            }

            async selectTrack(index) {
                await this.preloadTrack(index);
                if (this.isPlaying) {
                    await this.play();
                }
            }

            async togglePlay() {
                if (!this.audio || !this.audioInitialized) {
                    await this.initializeFirstTrack();
                }

                if (this.isPlaying) {
                    this.pause();
                } else {
                    await this.play();
                }
            }

            async play() {
                if (!this.audio) {
                    await this.initializeFirstTrack();
                    document.getElementById('fsPlayBtn').innerHTML = '⏸';
                }

                try {
                    if (this.audioMotion && this.audioMotion.audioCtx) {
                        if (this.audioMotion.audioCtx.state === 'suspended') {
                            await this.audioMotion.audioCtx.resume();
                        }
                    }

                    await this.audio.play();
                    this.isPlaying = true;
                    document.getElementById('playBtn').innerHTML = '⏸';
                } catch (error) {
                    console.error('Playback failed:', error);
                    if (error.name === 'NotAllowedError') {
                        this.showError('Click play again to start playback');
                    } else {
                        this.showError('Playback failed. Please try again.');
                    }
                }
            }

            pause() {
                if (!this.audio) 
                    return;
                


                this.audio.pause();
                this.isPlaying = false;
                document.getElementById('playBtn').innerHTML = '▶';
            }

            async nextTrack() {
                const nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
                await this.selectTrack(nextIndex);
            }

            async prevTrack() {
                const prevIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
                await this.selectTrack(prevIndex);
            }

            toggleLoop() {
                const modes = ['off', 'one', 'all'];
                const currentIndex = modes.indexOf(this.loopMode);
                this.loopMode = modes[(currentIndex + 1) % modes.length];

                const loopBtn = document.getElementById('loopBtn');
                const loopIndicator = document.getElementById('loopIndicator');

                switch (this.loopMode) {
                    case 'off': loopBtn.classList.remove('active');
                        loopIndicator.style.display = 'none';
                        loopBtn.title = 'Toggle Loop (Off)';
                        if (this.audio) 
                            this.audio.loop = false;
                        

                        break;
                    case 'one': loopBtn.classList.add('active');
                        loopIndicator.style.display = 'flex';
                        loopIndicator.textContent = '1';
                        loopBtn.title = 'Toggle Loop (One)';
                        if (this.audio) 
                            this.audio.loop = true;
                        

                        break;
                    case 'all': loopBtn.classList.add('active');
                        loopIndicator.style.display = 'flex';
                        loopIndicator.textContent = 'A';
                        loopBtn.title = 'Toggle Loop (All)';
                        if (this.audio) 
                            this.audio.loop = false;
                        

                        break;
                }
            }

            async handleTrackEnd() {
                if (this.loopMode === 'one') {
                    return;
                } else if (this.loopMode === 'all') {
                    await this.nextTrack();
                } else {
                    this.pause();
                }
            }

            setVolume(value) {
                this.volume = value;
                if (this.audio) {
                    this.audio.volume = value;
                }
                document.getElementById('volumeFill').style.width = `${
                    value * 100
                }%`;

                // Update mute state
                if (value === 0 && !this.isMuted) {
                    this.isMuted = true;
                } else if (value > 0 && this.isMuted) {
                    this.isMuted = false;
                    this.previousVolume = value;
                }
            }

            toggleMute() {
                const volumeIcon = document.querySelector('.volume-control span');

                if (this.isMuted) { // Unmute
                    this.setVolume(this.previousVolume);
                    this.isMuted = false;
                    if (volumeIcon) 
                        volumeIcon.textContent = '🔊';
                    

                } else { // Mute
                    this.previousVolume = this.volume;
                    this.setVolume(0);
                    this.isMuted = true;
                    if (volumeIcon) 
                        volumeIcon.textContent = '🔇';
                    

                }
            }

            updateProgress() {
                if (!this.audio || !this.audio.duration) 
                    return;
                


                const percent = (this.audio.currentTime / this.audio.duration) * 100;
                document.getElementById('progressFill').style.width = `${percent}%`;

                const current = this.formatTime(this.audio.currentTime);
                const total = this.formatTime(this.audio.duration);
                document.getElementById('timeDisplay').textContent = `${current} / ${total}`;

                const fsProgressFill = document.getElementById('fsProgressFill');
                if (fsProgressFill) {
                    fsProgressFill.style.width = `${percent}%`;
                }
                const fsTimeDisplay = document.getElementById('fsTimeDisplay');
                if (fsTimeDisplay) {
                    fsTimeDisplay.textContent = `${current} / ${total}`;
                }
            }

            updateTrackInfo() {
                const track = this.playlist[this.currentTrackIndex];
                if (track) {
                    const trackTitle = document.getElementById('trackTitle');
                    if (trackTitle) {
                        trackTitle.textContent = track.name;
                    }
                    // Note: playlistToggle was removed when we embedded the playlist
                    // The track name is now displayed in the embedded playlist manager
                }
                const fsTrackTitle = document.getElementById('fsTrackTitle');
                if (fsTrackTitle) {
                    fsTrackTitle.textContent = track.name;
                }
                const fsPlaylistSelect = document.getElementById('fsPlaylistSelect');
                if (fsPlaylistSelect) {
                    fsPlaylistSelect.value = this.currentTrackIndex;
                }
            }

            // Utility Methods
            formatTime(seconds) {
                if (!seconds || isNaN(seconds)) 
                    return '0:00';
                


                const minutes = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${minutes}:${
                    secs.toString().padStart(2, '0')
                }`;
            }

            showLoading() {
                document.getElementById('loading').style.display = 'block';
                document.getElementById('error').style.display = 'none';
            }

            hideLoading() {
                document.getElementById('loading').style.display = 'none';
            }

            showError(message) {
                const errorDiv = document.getElementById('error');
                const errorText = document.getElementById('error-text');

                errorDiv.style.display = 'block';
                errorText.textContent = message;
                document.getElementById('loading').style.display = 'none';

                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 5000);

                errorDiv.onclick = () => {
                    errorDiv.style.display = 'none';
                };
            }
        }

        // Sidebar System Functions
        function initializeSidebar() {
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = document.getElementById('sidebarToggle');
            
            if (!sidebar || !sidebarToggle) return;

            // Load saved sidebar state or default to expanded
            const savedState = localStorage.getItem('vizzy-sidebar-collapsed');
            const isCollapsed = savedState === 'true';
            
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
            }

            // Add toggle functionality
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                const isNowCollapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('vizzy-sidebar-collapsed', isNowCollapsed.toString());
                
                // Update toggle icon
                const toggleIcon = sidebarToggle.querySelector('.toggle-icon');
                if (toggleIcon) {
                    toggleIcon.textContent = isNowCollapsed ? '☰' : '✕';
                }
                
                // Close any open drawers when toggling sidebar
                if (typeof closeAllDrawers === 'function') {
                    closeAllDrawers();
                }
            });


            // Initialize with correct icon
            const toggleIcon = sidebarToggle.querySelector('.toggle-icon');
            if (toggleIcon) {
                toggleIcon.textContent = sidebar.classList.contains('collapsed') ? '☰' : '✕';
            }

            // Initialize sidebar controls
            initializeSidebarControls();
        }


// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
window.visualizer = new GitItUpVisualizer();

// Initialize footer Live Audio button state
if (window.visualizer && window.visualizer.updateFooterLiveAudioButton) {
    window.visualizer.updateFooterLiveAudioButton();
}

// Initialize Theme System
initializeThemeSystem();

// Initialize Sidebar
initializeSidebar();

// Initialize Drawers
initializeDrawers();

// Initialize Drawer Controls
initializeDrawerControls();

// Initialize Video Devices
if (window.visualizer && window.visualizer.initializeVideoInput) {
    window.visualizer.initializeVideoInput();
}

// Initialize Video Button State
if (window.visualizer && window.visualizer.updateFooterLiveVideoButton) {
    window.visualizer.updateFooterLiveVideoButton();
}

// Initialize Visualizer Button State
if (window.visualizer && window.visualizer.updateFooterVisualizerButton) {
    window.visualizer.updateFooterVisualizerButton();
}

        // Initialize Visualizer Toggle Button State
        if (window.visualizer && window.visualizer.updateFooterVisualizerToggleButton) {
            window.visualizer.updateFooterVisualizerToggleButton();
        }

        // Initialize Footer Morph Controls
        if (window.visualizer && window.visualizer.initializeFooterMorphControls) {
            window.visualizer.initializeFooterMorphControls();
        }

        // Initialize Background Button State
        if (window.visualizer && window.visualizer.updateFooterBackgroundButton) {
            window.visualizer.updateFooterBackgroundButton();
        }

        // Load background image settings
        if (window.visualizer && window.visualizer.loadBackgroundImageSettings) {
            window.visualizer.loadBackgroundImageSettings();
        }

// Load saved video source
if (window.visualizer && window.visualizer.loadVideoSource) {
    const savedSource = window.visualizer.loadVideoSource();
    if (savedSource) {
        // Update dropdown to show saved source
        const deviceSelect = document.getElementById('videoDeviceSelect');
        if (deviceSelect) {
            // Update the device list first, then set the selection
            window.visualizer.updateVideoDeviceList();
            deviceSelect.value = savedSource.source;
            window.visualizer.updateVideoDropdownDisplay();
        }
    }
}

// Add resize listener for Infinite Zoom
window.addEventListener('resize', () => {
    if (window.visualizer && window.visualizer.infiniteZoom) {
        window.visualizer.infiniteZoom.resize();
    }
});

// Global debug function for background image
window.debugBackgroundImage = function() {
    if (window.visualizer && window.visualizer.recordManager) {
        window.visualizer.recordManager.debugBackgroundImageState();
    } else {
        console.log('❌ Visualizer or RecordManager not available');
    }
};

// Global function to test background image loading
window.testBackgroundImage = function() {
    console.log('🧪 Testing background image functionality...');
    if (window.visualizer) {
        console.log('Current state:', {
            hasImage: !!window.visualizer.backgroundImage,
            enabled: window.visualizer.backgroundImageEnabled,
            opacity: window.visualizer.backgroundImageOpacity,
            saturation: window.visualizer.backgroundImageSaturation
        });
        
        // Test drawing on a temporary canvas
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 800;
        testCanvas.height = 600;
        const testCtx = testCanvas.getContext('2d');
        
        console.log('Testing drawBackgroundImage...');
        window.visualizer.drawBackgroundImage(testCtx, 800, 600);
        
        // Add test canvas to page for visual inspection
        testCanvas.style.position = 'fixed';
        testCanvas.style.top = '10px';
        testCanvas.style.right = '10px';
        testCanvas.style.border = '2px solid red';
        testCanvas.style.zIndex = '9999';
        testCanvas.id = 'debug-test-canvas';
        document.body.appendChild(testCanvas);
        
        console.log('Test canvas added to page (red border)');
    }
};

// Global function to inspect main canvas
window.inspectMainCanvas = function() {
    console.log('🔍 Inspecting main canvas...');
    const mainCanvas = document.querySelector('#visualizationCanvas');
    if (mainCanvas) {
        console.log('Main canvas found:', {
            width: mainCanvas.width,
            height: mainCanvas.height,
            style: mainCanvas.style.cssText,
            computedStyle: window.getComputedStyle(mainCanvas)
        });
        
        // Check if canvas has content
        const ctx = mainCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        const hasContent = imageData.data.some(pixel => pixel !== 0);
        console.log('Canvas has content:', hasContent);
        
        // Create a copy of the canvas for inspection
        const copyCanvas = document.createElement('canvas');
        copyCanvas.width = mainCanvas.width;
        copyCanvas.height = mainCanvas.height;
        const copyCtx = copyCanvas.getContext('2d');
        copyCtx.drawImage(mainCanvas, 0, 0);
        
        copyCanvas.style.position = 'fixed';
        copyCanvas.style.top = '100px';
        copyCanvas.style.right = '10px';
        copyCanvas.style.border = '2px solid blue';
        copyCanvas.style.zIndex = '9999';
        copyCanvas.id = 'debug-main-canvas-copy';
        document.body.appendChild(copyCanvas);
        
        console.log('Main canvas copy added to page (blue border)');
    } else {
        console.log('❌ Main canvas not found');
        console.log('Available canvas elements:', document.querySelectorAll('canvas'));
    }
};

// Global function for testing Learning Analytics Modal
window.testLearningAnalytics = () => {
    console.log('Testing Learning Analytics Modal...');
    const modal = document.getElementById('learningAnalyticsModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        console.log('Modal should now be visible');
    } else {
        console.error('Modal not found!');
    }
};
});


