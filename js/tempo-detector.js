/**
 * Tempo Detector - Enhanced BPM Detection
 * Uses histogram-based interval analysis and autocorrelation for accurate tempo detection
 */

class TempoDetector {
    constructor() {
        // Tempo detection parameters
        this.minBPM = 60;
        this.maxBPM = 200;
        this.minInterval = 60000 / this.maxBPM; // 300ms for 200 BPM
        this.maxInterval = 60000 / this.minBPM; // 1000ms for 60 BPM
        
        // Current tempo state
        this.currentTempo = 0;
        this.tempoConfidence = 0;
        this.tempoCandidates = [];
        this.smoothedTempo = 0;
        this.persistentTempo = 0; // Tempo that persists even when confidence is low
        this.persistentConfidence = 0; // Confidence of persistent tempo
        
        // History for smoothing
        this.tempoHistory = [];
        this.maxHistoryLength = 20; // Increased for better stability
        
        // Histogram parameters
        this.histogramBinSize = 10; // 10ms bins
        this.histogram = new Map();
        
        // Exponential decay parameters (like Ableton)
        this.decayHalfLife = 30000; // 30 seconds half-life for beat weighting
        this.maxTimeWindow = 60000; // 60 seconds max window (with decay)
        
        // Autocorrelation state
        this.energyHistory = [];
        this.maxEnergyHistoryLength = 300; // 5 seconds at 60fps
        this.autocorrTempo = 0;
        this.autocorrConfidence = 0;
        this.lastAutocorrUpdate = 0;
        this.autocorrUpdateInterval = 1000; // Update autocorrelation every second
        
        // Stability tracking
        this.tempoStability = 0; // 0-1, how stable tempo is over time
        this.stabilityHistory = [];
    }
    
    /**
     * Calculate exponential decay weight for a beat based on age
     * @param {number} ageMs - Age of beat in milliseconds
     * @returns {number} Weight (0-1)
     */
    getDecayWeight(ageMs) {
        if (ageMs > this.maxTimeWindow) return 0;
        // Exponential decay: weight = 2^(-age/halfLife)
        return Math.pow(2, -ageMs / this.decayHalfLife);
    }
    
    /**
     * Primary method: Detect tempo from beat history using histogram analysis with exponential decay
     * @param {Array<number>} beatHistory - Array of beat timestamps in milliseconds
     * @returns {Object} { tempo: number, confidence: number, candidates: Array }
     */
    detectTempoFromBeats(beatHistory) {
        if (!beatHistory || beatHistory.length < 2) {
            // Not enough beats, return persistent tempo if available
            return {
                tempo: this.persistentTempo || this.smoothedTempo || 120,
                confidence: this.persistentConfidence * 0.5, // Lower confidence but not 0
                candidates: []
            };
        }
        
        const now = Date.now();
        
        // Use exponential decay instead of hard cutoff
        // Weight beats based on age (recent beats have more weight)
        const weightedBeats = beatHistory
            .map(time => ({
                time: time,
                age: now - time,
                weight: this.getDecayWeight(now - time)
            }))
            .filter(beat => beat.weight > 0.01) // Only include beats with meaningful weight
            .sort((a, b) => a.time - b.time);
        
        if (weightedBeats.length < 2) {
            return {
                tempo: this.persistentTempo || this.smoothedTempo || 120,
                confidence: this.persistentConfidence * 0.5,
                candidates: []
            };
        }
        
        // Calculate intervals with weights
        const weightedIntervals = [];
        let totalWeight = 0;
        
        for (let i = 1; i < weightedBeats.length; i++) {
            const interval = weightedBeats[i].time - weightedBeats[i - 1].time;
            // Filter to realistic range
            if (interval >= this.minInterval && interval <= this.maxInterval) {
                // Use average weight of the two beats
                const weight = (weightedBeats[i].weight + weightedBeats[i - 1].weight) / 2;
                weightedIntervals.push({ interval, weight });
                totalWeight += weight;
            }
        }
        
        if (weightedIntervals.length === 0) {
            return {
                tempo: this.persistentTempo || this.smoothedTempo || 120,
                confidence: this.persistentConfidence * 0.5,
                candidates: []
            };
        }
        
        // Build weighted histogram of intervals
        this.histogram.clear();
        weightedIntervals.forEach(({ interval, weight }) => {
            // Round to nearest bin
            const bin = Math.round(interval / this.histogramBinSize) * this.histogramBinSize;
            this.histogram.set(bin, (this.histogram.get(bin) || 0) + weight);
        });
        
        // Find peaks in histogram (most common intervals, weighted)
        const histogramEntries = Array.from(this.histogram.entries())
            .sort((a, b) => b[1] - a[1]); // Sort by weighted count (descending)
        
        // Get top candidates
        const candidates = [];
        const maxCandidates = 3;
        
        for (let i = 0; i < Math.min(maxCandidates, histogramEntries.length); i++) {
            const [interval, weightedCount] = histogramEntries[i];
            const bpm = Math.round(60000 / interval);
            
            // Check for multiples (half-time, double-time)
            const halfTimeBPM = bpm / 2;
            const doubleTimeBPM = bpm * 2;
            
            // Calculate confidence based on weighted histogram peak strength
            // Normalize by total weight and factor in consistency
            const peakStrength = weightedCount / totalWeight;
            const consistency = this.calculateTempoConsistency(bpm);
            const confidence = Math.min(1, peakStrength * 0.7 + consistency * 0.3);
            
            candidates.push({
                bpm: bpm,
                interval: interval,
                confidence: confidence,
                weightedCount: weightedCount
            });
            
            // Also consider half-time and double-time if they're in valid range
            if (halfTimeBPM >= this.minBPM && halfTimeBPM <= this.maxBPM) {
                candidates.push({
                    bpm: Math.round(halfTimeBPM),
                    interval: interval * 2,
                    confidence: confidence * 0.7, // Lower confidence for multiples
                    weightedCount: weightedCount
                });
            }
            
            if (doubleTimeBPM >= this.minBPM && doubleTimeBPM <= this.maxBPM) {
                candidates.push({
                    bpm: Math.round(doubleTimeBPM),
                    interval: interval / 2,
                    confidence: confidence * 0.7,
                    weightedCount: weightedCount
                });
            }
        }
        
        // Remove duplicates and sort by confidence
        const uniqueCandidates = this.deduplicateCandidates(candidates);
        uniqueCandidates.sort((a, b) => b.confidence - a.confidence);
        
        // Get best candidate
        const bestCandidate = uniqueCandidates[0];
        
        if (!bestCandidate || !bestCandidate.bpm) {
            // Return persistent tempo if available
            return {
                tempo: this.persistentTempo || this.smoothedTempo || 120,
                confidence: this.persistentConfidence * 0.3,
                candidates: []
            };
        }
        
        // Clamp to realistic range
        const tempo = Math.max(this.minBPM, Math.min(this.maxBPM, bestCandidate.bpm));
        
        // Calculate tempo stability
        this.updateTempoStability(tempo);
        
        // Apply adaptive smoothing based on confidence and stability
        const smoothingFactor = 0.85 + (bestCandidate.confidence * 0.1) + (this.tempoStability * 0.05);
        const updateFactor = 1 - smoothingFactor;
        
        if (this.smoothedTempo > 0) {
            // Adaptive smoothing: more smoothing for stable, high-confidence tempos
            this.smoothedTempo = this.smoothedTempo * smoothingFactor + tempo * updateFactor;
        } else {
            // First detection
            this.smoothedTempo = tempo;
        }
        
        // Update persistent tempo (maintains even when confidence drops)
        if (bestCandidate.confidence > 0.3) {
            // Update persistent tempo with slower decay
            if (this.persistentTempo > 0) {
                this.persistentTempo = this.persistentTempo * 0.95 + tempo * 0.05;
                this.persistentConfidence = Math.max(this.persistentConfidence * 0.98, bestCandidate.confidence);
            } else {
                this.persistentTempo = tempo;
                this.persistentConfidence = bestCandidate.confidence;
            }
        } else {
            // Decay persistent confidence slowly
            this.persistentConfidence *= 0.99;
        }
        
        // Update history
        this.tempoHistory.push(tempo);
        if (this.tempoHistory.length > this.maxHistoryLength) {
            this.tempoHistory.shift();
        }
        
        this.currentTempo = tempo;
        this.tempoConfidence = bestCandidate.confidence;
        this.tempoCandidates = uniqueCandidates.slice(0, 3); // Top 3 candidates
        
        // Combine with autocorrelation if available
        return this.combineTempoMethods(bestCandidate);
    }
    
    /**
     * Calculate tempo consistency (how stable tempo is over time)
     * @param {number} tempo - Current tempo candidate
     * @returns {number} Consistency score (0-1)
     */
    calculateTempoConsistency(tempo) {
        if (this.tempoHistory.length < 3) return 0.5;
        
        // Check how many recent tempos are within 5 BPM of this tempo
        const recentTempos = this.tempoHistory.slice(-10);
        const withinRange = recentTempos.filter(t => Math.abs(t - tempo) <= 5).length;
        return withinRange / recentTempos.length;
    }
    
    /**
     * Update tempo stability metric
     * @param {number} tempo - Current detected tempo
     */
    updateTempoStability(tempo) {
        if (this.tempoHistory.length < 2) {
            this.tempoStability = 0.5;
            return;
        }
        
        // Calculate variance in recent tempos
        const recentTempos = this.tempoHistory.slice(-10);
        const avgTempo = recentTempos.reduce((a, b) => a + b, 0) / recentTempos.length;
        const variance = recentTempos.reduce((sum, t) => sum + Math.pow(t - avgTempo, 2), 0) / recentTempos.length;
        const stdDev = Math.sqrt(variance);
        
        // Stability is inverse of normalized standard deviation
        // Lower stdDev = higher stability
        const maxStdDev = 20; // Maximum expected stdDev for unstable tempo
        this.tempoStability = Math.max(0, Math.min(1, 1 - (stdDev / maxStdDev)));
        
        this.stabilityHistory.push(this.tempoStability);
        if (this.stabilityHistory.length > 20) {
            this.stabilityHistory.shift();
        }
    }
    
    /**
     * Combine histogram and autocorrelation results
     * @param {Object} histogramCandidate - Best candidate from histogram
     * @returns {Object} Combined result
     */
    combineTempoMethods(histogramCandidate) {
        // If autocorrelation has recent data and good confidence, combine
        const now = Date.now();
        const autocorrAge = now - this.lastAutocorrUpdate;
        
        if (this.autocorrTempo > 0 && this.autocorrConfidence > 0.3 && autocorrAge < 2000) {
            // Check if tempos are similar (within 10 BPM)
            const tempoDiff = Math.abs(histogramCandidate.bpm - this.autocorrTempo);
            
            if (tempoDiff < 10) {
                // Tempos agree - boost confidence
                const combinedConfidence = Math.min(1, 
                    histogramCandidate.confidence * 0.6 + 
                    this.autocorrConfidence * 0.4
                );
                const combinedTempo = (histogramCandidate.bpm * 0.6 + this.autocorrTempo * 0.4);
                
                return {
                    tempo: Math.round(this.smoothedTempo || combinedTempo),
                    confidence: combinedConfidence,
                    candidates: this.tempoCandidates
                };
            }
        }
        
        // Return histogram result
        return {
            tempo: Math.round(this.smoothedTempo || histogramCandidate.bpm),
            confidence: histogramCandidate.confidence,
            candidates: this.tempoCandidates
        };
    }
    
    /**
     * Update energy history for continuous autocorrelation
     * @param {number} energy - Current energy value (0-1)
     */
    updateEnergyHistory(energy) {
        this.energyHistory.push(energy);
        if (this.energyHistory.length > this.maxEnergyHistoryLength) {
            this.energyHistory.shift();
        }
        
        // Update autocorrelation periodically (not every frame for performance)
        const now = Date.now();
        if (now - this.lastAutocorrUpdate > this.autocorrUpdateInterval) {
            this.updateAutocorrelation();
            this.lastAutocorrUpdate = now;
        }
    }
    
    /**
     * Update autocorrelation tempo detection (runs continuously)
     */
    updateAutocorrelation() {
        if (this.energyHistory.length < 60) {
            // Not enough data
            this.autocorrConfidence *= 0.95; // Decay confidence
            return;
        }
        
        // Calculate autocorrelation
        const autocorr = [];
        const maxLag = Math.min(120, Math.floor(this.energyHistory.length / 2)); // 2 seconds at 60fps
        
        // Normalize energy history for better autocorrelation
        const mean = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
        const normalized = this.energyHistory.map(e => e - mean);
        
        for (let lag = 10; lag < maxLag; lag++) { // Start from lag 10 to avoid DC component
            let sum = 0;
            let count = 0;
            
            for (let i = 0; i < normalized.length - lag; i++) {
                sum += normalized[i] * normalized[i + lag];
                count++;
            }
            
            const value = count > 0 ? sum / count : 0;
            autocorr.push({
                lag: lag,
                value: value
            });
        }
        
        // Find peaks in autocorrelation
        const peaks = this.findPeaks(autocorr);
        
        if (peaks.length === 0) {
            this.autocorrConfidence *= 0.95; // Decay confidence
            return;
        }
        
        // Filter peaks to valid tempo range
        const validPeaks = peaks.filter(peak => {
            const frameInterval = peak.lag;
            const secondsPerBeat = frameInterval / 60; // Assuming 60fps
            const bpm = 60 / secondsPerBeat;
            return bpm >= this.minBPM && bpm <= this.maxBPM;
        });
        
        if (validPeaks.length === 0) {
            this.autocorrConfidence *= 0.95;
            return;
        }
        
        // Get best peak
        const bestPeak = validPeaks[0];
        const frameInterval = bestPeak.lag;
        const secondsPerBeat = frameInterval / 60;
        const bpm = Math.round(60 / secondsPerBeat);
        
        // Clamp to realistic range
        const tempo = Math.max(this.minBPM, Math.min(this.maxBPM, bpm));
        
        // Calculate confidence based on peak strength and consistency
        const peakStrength = bestPeak.value / Math.max(...autocorr.map(p => p.value));
        const consistency = this.calculateTempoConsistency(tempo);
        const confidence = Math.min(0.7, peakStrength * 0.6 + consistency * 0.4); // Max 0.7 for autocorr
        
        // Smooth autocorrelation tempo
        if (this.autocorrTempo > 0) {
            this.autocorrTempo = this.autocorrTempo * 0.8 + tempo * 0.2;
            this.autocorrConfidence = this.autocorrConfidence * 0.7 + confidence * 0.3;
        } else {
            this.autocorrTempo = tempo;
            this.autocorrConfidence = confidence;
        }
    }
    
    /**
     * Fallback method: Detect tempo from energy history using autocorrelation
     * @param {Array<number>} energyHistory - Array of energy values over time
     * @returns {Object} { tempo: number, confidence: number }
     */
    detectTempoFromAutocorrelation(energyHistory) {
        // Use the continuously updated autocorrelation result
        if (this.autocorrTempo > 0 && this.autocorrConfidence > 0.2) {
            return {
                tempo: Math.round(this.autocorrTempo),
                confidence: this.autocorrConfidence
            };
        }
        
        // Fallback to direct calculation if needed
        if (!energyHistory || energyHistory.length < 60) {
            return {
                tempo: this.persistentTempo || this.smoothedTempo || 120,
                confidence: 0.2
            };
        }
        
        // Calculate autocorrelation
        const autocorr = [];
        const maxLag = Math.min(120, Math.floor(energyHistory.length / 2));
        
        for (let lag = 10; lag < maxLag; lag++) {
            let sum = 0;
            let count = 0;
            
            for (let i = 0; i < energyHistory.length - lag; i++) {
                sum += energyHistory[i] * energyHistory[i + lag];
                count++;
            }
            
            autocorr.push({
                lag: lag,
                value: count > 0 ? sum / count : 0
            });
        }
        
        // Find peaks
        const peaks = this.findPeaks(autocorr);
        
        if (peaks.length === 0) {
            return {
                tempo: this.persistentTempo || this.smoothedTempo || 120,
                confidence: 0.2
            };
        }
        
        // Convert lag to BPM
        const bestPeak = peaks[0];
        const frameInterval = bestPeak.lag;
        const secondsPerBeat = frameInterval / 60;
        const bpm = Math.round(60 / secondsPerBeat);
        
        // Clamp to realistic range
        const tempo = Math.max(this.minBPM, Math.min(this.maxBPM, bpm));
        
        return {
            tempo: tempo,
            confidence: 0.4
        };
    }
    
    /**
     * Find peaks in an array
     * @param {Array} data - Array of {lag, value} objects
     * @returns {Array} Sorted peaks by value (descending)
     */
    findPeaks(data) {
        const peaks = [];
        
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i].value > data[i - 1].value && data[i].value > data[i + 1].value) {
                // Local maximum
                peaks.push({
                    lag: data[i].lag,
                    value: data[i].value
                });
            }
        }
        
        // Sort by value (descending)
        peaks.sort((a, b) => b.value - a.value);
        
        return peaks;
    }
    
    /**
     * Remove duplicate tempo candidates (within 5 BPM)
     * @param {Array} candidates - Array of candidate objects
     * @returns {Array} Deduplicated candidates
     */
    deduplicateCandidates(candidates) {
        const unique = [];
        const seen = new Set();
        
        for (const candidate of candidates) {
            const key = Math.round(candidate.bpm / 5) * 5; // Round to nearest 5 BPM
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(candidate);
            }
        }
        
        return unique;
    }
    
    /**
     * Get current tempo with confidence
     * @returns {Object} { tempo: number, confidence: number, candidates: Array }
     */
    getTempo() {
        // Return best available tempo (persistent > smoothed > current > default)
        const tempo = this.smoothedTempo || this.persistentTempo || this.currentTempo || 120;
        // Return best available confidence (current > persistent decayed)
        const confidence = this.tempoConfidence > 0 ? this.tempoConfidence : (this.persistentConfidence * 0.3);
        
        return {
            tempo: Math.round(tempo),
            confidence: Math.max(0, Math.min(1, confidence)),
            candidates: this.tempoCandidates
        };
    }
    
    /**
     * Get tempo candidates
     * @returns {Array} Array of tempo candidate objects
     */
    getTempoCandidates() {
        return this.tempoCandidates;
    }
    
    /**
     * Reset tempo detection state
     */
    reset() {
        this.currentTempo = 0;
        this.tempoConfidence = 0;
        this.tempoCandidates = [];
        this.smoothedTempo = 0;
        this.persistentTempo = 0;
        this.persistentConfidence = 0;
        this.tempoHistory = [];
        this.histogram.clear();
        this.energyHistory = [];
        this.autocorrTempo = 0;
        this.autocorrConfidence = 0;
        this.lastAutocorrUpdate = 0;
        this.tempoStability = 0;
        this.stabilityHistory = [];
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TempoDetector = TempoDetector;
}

