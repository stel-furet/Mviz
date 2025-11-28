/**
 * Genre Detector for Enhanced Autopilot
 * Detects music genre based on audio features
 * 
 * Dependencies: None (standalone class)
 * Used by: AudioAnalyzer, AIAutopilot
 * 
 * Extracted from main.js as part of Stage 1: Global Classes Split
 */

class GenreDetector {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.audioAnalyzer = autopilot.audioAnalyzer;
        this.detectionHistory = [];
        this.genreConfidence = {};
        
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
        
        for (const [genre, score] of Object.entries(genreScores)) {
            if (score > bestScore) {
                bestScore = score;
                bestGenre = genre;
            }
        }
        
        
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

// Class is automatically global (no export needed in Stage 1)

