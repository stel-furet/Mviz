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
        
        // History for smoothing
        this.tempoHistory = [];
        this.maxHistoryLength = 10;
        
        // Histogram parameters
        this.histogramBinSize = 10; // 10ms bins
        this.histogram = new Map();
    }
    
    /**
     * Primary method: Detect tempo from beat history using histogram analysis
     * @param {Array<number>} beatHistory - Array of beat timestamps in milliseconds
     * @returns {Object} { tempo: number, confidence: number, candidates: Array }
     */
    detectTempoFromBeats(beatHistory) {
        if (!beatHistory || beatHistory.length < 4) {
            // Not enough beats, return low confidence
            return {
                tempo: this.smoothedTempo || 120,
                confidence: 0,
                candidates: []
            };
        }
        
        // Calculate intervals between consecutive beats
        const intervals = [];
        const now = Date.now();
        const recentBeats = beatHistory.filter(time => now - time < 10000); // Last 10 seconds
        
        if (recentBeats.length < 4) {
            return {
                tempo: this.smoothedTempo || 120,
                confidence: 0,
                candidates: []
            };
        }
        
        // Sort beats chronologically
        const sortedBeats = [...recentBeats].sort((a, b) => a - b);
        
        // Calculate intervals
        for (let i = 1; i < sortedBeats.length; i++) {
            const interval = sortedBeats[i] - sortedBeats[i - 1];
            // Filter to realistic range (30-300 BPM)
            if (interval >= this.minInterval && interval <= this.maxInterval) {
                intervals.push(interval);
            }
        }
        
        if (intervals.length === 0) {
            return {
                tempo: this.smoothedTempo || 120,
                confidence: 0,
                candidates: []
            };
        }
        
        // Build histogram of intervals
        this.histogram.clear();
        intervals.forEach(interval => {
            // Round to nearest bin
            const bin = Math.round(interval / this.histogramBinSize) * this.histogramBinSize;
            this.histogram.set(bin, (this.histogram.get(bin) || 0) + 1);
        });
        
        // Find peaks in histogram (most common intervals)
        const histogramEntries = Array.from(this.histogram.entries())
            .sort((a, b) => b[1] - a[1]); // Sort by count (descending)
        
        // Get top candidates
        const candidates = [];
        const maxCandidates = 3;
        
        for (let i = 0; i < Math.min(maxCandidates, histogramEntries.length); i++) {
            const [interval, count] = histogramEntries[i];
            const bpm = Math.round(60000 / interval);
            
            // Check for multiples (half-time, double-time)
            const halfTimeBPM = bpm / 2;
            const doubleTimeBPM = bpm * 2;
            
            // Calculate confidence based on histogram peak strength
            const confidence = Math.min(1, count / intervals.length);
            
            candidates.push({
                bpm: bpm,
                interval: interval,
                confidence: confidence,
                count: count
            });
            
            // Also consider half-time and double-time if they're in valid range
            if (halfTimeBPM >= this.minBPM && halfTimeBPM <= this.maxBPM) {
                candidates.push({
                    bpm: Math.round(halfTimeBPM),
                    interval: interval * 2,
                    confidence: confidence * 0.7, // Lower confidence for multiples
                    count: count
                });
            }
            
            if (doubleTimeBPM >= this.minBPM && doubleTimeBPM <= this.maxBPM) {
                candidates.push({
                    bpm: Math.round(doubleTimeBPM),
                    interval: interval / 2,
                    confidence: confidence * 0.7,
                    count: count
                });
            }
        }
        
        // Remove duplicates and sort by confidence
        const uniqueCandidates = this.deduplicateCandidates(candidates);
        uniqueCandidates.sort((a, b) => b.confidence - a.confidence);
        
        // Get best candidate
        const bestCandidate = uniqueCandidates[0];
        
        if (!bestCandidate || !bestCandidate.bpm) {
            return {
                tempo: this.smoothedTempo || 120,
                confidence: 0,
                candidates: []
            };
        }
        
        // Clamp to realistic range
        const tempo = Math.max(this.minBPM, Math.min(this.maxBPM, bestCandidate.bpm));
        
        // Apply smoothing if we have history
        if (this.smoothedTempo > 0 && bestCandidate.confidence > 0.5) {
            // Only update if confidence is high enough
            this.smoothedTempo = this.smoothedTempo * 0.9 + tempo * 0.1;
        } else if (bestCandidate.confidence > 0.5) {
            // First detection with good confidence
            this.smoothedTempo = tempo;
        }
        
        // Update history
        this.tempoHistory.push(tempo);
        if (this.tempoHistory.length > this.maxHistoryLength) {
            this.tempoHistory.shift();
        }
        
        this.currentTempo = tempo;
        this.tempoConfidence = bestCandidate.confidence;
        this.tempoCandidates = uniqueCandidates.slice(0, 3); // Top 3 candidates
        
        return {
            tempo: this.smoothedTempo || tempo,
            confidence: this.tempoConfidence,
            candidates: this.tempoCandidates
        };
    }
    
    /**
     * Fallback method: Detect tempo from energy history using autocorrelation
     * @param {Array<number>} energyHistory - Array of energy values over time
     * @returns {Object} { tempo: number, confidence: number }
     */
    detectTempoFromAutocorrelation(energyHistory) {
        if (!energyHistory || energyHistory.length < 60) {
            return {
                tempo: this.smoothedTempo || 120,
                confidence: 0
            };
        }
        
        // Calculate autocorrelation
        const autocorr = [];
        const maxLag = Math.min(60, Math.floor(energyHistory.length / 2)); // 1 second at 60fps
        
        for (let lag = 0; lag < maxLag; lag++) {
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
        
        // Find peaks in autocorrelation (potential tempos)
        const peaks = this.findPeaks(autocorr);
        
        if (peaks.length === 0) {
            return {
                tempo: this.smoothedTempo || 120,
                confidence: 0.3 // Low confidence for autocorrelation
            };
        }
        
        // Convert lag to BPM
        // At 60fps, lag of 30 frames = 0.5 seconds = 120 BPM
        const bestPeak = peaks[0];
        const frameInterval = bestPeak.lag;
        const secondsPerBeat = frameInterval / 60; // Assuming 60fps
        const bpm = Math.round(60 / secondsPerBeat);
        
        // Clamp to realistic range
        const tempo = Math.max(this.minBPM, Math.min(this.maxBPM, bpm));
        
        return {
            tempo: tempo,
            confidence: 0.4 // Lower confidence than beat-based detection
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
        return {
            tempo: this.smoothedTempo || this.currentTempo || 120,
            confidence: this.tempoConfidence,
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
        this.tempoHistory = [];
        this.histogram.clear();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TempoDetector = TempoDetector;
}

