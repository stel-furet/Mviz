/**
 * Enhanced Beat Detector - Frequency-Weighted Bass-Focused
 * Provides accurate beat detection by focusing on bass frequencies where beats are most prominent
 * Uses multi-factor analysis with adaptive intervals based on tempo
 */

class BeatDetectorEnhanced {
    constructor() {
        // Beat detection parameters
        this.baseThreshold = 0.10; // Lower threshold for better sensitivity (0-1 range)
        this.bassWeight = 0.6; // Primary factor weight
        this.overallWeight = 0.2; // Secondary factor weight
        this.fluxWeight = 0.2; // Tertiary factor weight
        
        // Energy smoothing (exponential moving average)
        this.smoothingFactor = 0.9; // Higher = more smoothing
        this.smoothedBassEnergy = 0;
        this.smoothedOverallEnergy = 0;
        this.warmupFrames = 0; // Track initialization frames
        this.warmupRequired = 30; // Need 30 frames (~0.5s) to warm up
        
        // Beat tracking
        this.lastBeatTime = 0;
        this.beatStrength = 0;
        this.beatConfidence = 0;
        
        // Minimum interval fallback (if no tempo available)
        this.defaultMinInterval = 300; // milliseconds
    }
    
    /**
     * Calculate bass energy (20-250 Hz) using FrequencyBandCalculator
     * @param {Uint8Array} dataArray - Frequency data array
     * @param {number} sampleRate - Audio sample rate
     * @param {number} fftSize - FFT size
     * @param {FrequencyBandCalculator} frequencyBandCalculator - Calculator instance
     * @returns {number} Bass energy (0-1)
     */
    calculateBassEnergy(dataArray, sampleRate, fftSize, frequencyBandCalculator) {
        // Combine subBass (20-60 Hz) and bass (60-250 Hz) for comprehensive bass detection
        const subBass = frequencyBandCalculator.calculateBandEnergy(
            dataArray, sampleRate, fftSize, 20, 60
        );
        const bass = frequencyBandCalculator.calculateBandEnergy(
            dataArray, sampleRate, fftSize, 60, 250
        );
        
        // Return combined bass energy (weighted average)
        return (subBass * 0.3 + bass * 0.7);
    }
    
    /**
     * Get adaptive minimum interval based on tempo
     * @param {number} tempo - Current tempo in BPM
     * @returns {number} Minimum interval in milliseconds
     */
    getAdaptiveMinInterval(tempo) {
        if (!tempo || tempo <= 0) {
            return this.defaultMinInterval;
        }
        
        // Calculate half-beat interval: 60000ms / (tempo * 2)
        // This prevents false beats between actual beats
        const halfBeatInterval = 60000 / (tempo * 2);
        
        // Clamp to reasonable range (100ms to 1000ms)
        return Math.max(100, Math.min(1000, halfBeatInterval));
    }
    
    /**
     * Calculate beat confidence score
     * @param {number} bassIncrease - Bass energy increase ratio
     * @param {number} overallIncrease - Overall energy increase ratio
     * @param {number} flux - Spectral flux value (0-1)
     * @param {number} bassMagnitude - Current bass energy magnitude (0-1)
     * @returns {number} Confidence score (0-1)
     */
    calculateBeatConfidence(bassIncrease, overallIncrease, flux, bassMagnitude) {
        // Normalize increases to 0-1 range (ratios > 1 become 0-1, ratios < 1 become 0-1)
        // Use a more generous normalization: ratio of 1.0 = 0, ratio of 1.5 = 1 (more sensitive)
        const normalizedBassIncrease = Math.min(1, Math.max(0, (bassIncrease - 1) / 0.5)); // 1.0 = 0, 1.5 = 1
        const normalizedOverallIncrease = Math.min(1, Math.max(0, (overallIncrease - 1) / 0.5));
        
        // Combine factors with weights
        let confidence = (normalizedBassIncrease * this.bassWeight) + 
                        (normalizedOverallIncrease * this.overallWeight) + 
                        (flux * this.fluxWeight);
        
        // Boost confidence if bass magnitude is strong (stronger bass = more reliable beat)
        // Increase boost to make confidence values higher
        const bassMagnitudeBoost = bassMagnitude * 0.3;
        confidence += bassMagnitudeBoost;
        
        // Scale confidence to produce higher values (multiply by 1.5, then clamp)
        confidence = confidence * 1.5;
        
        // Normalize to 0-1 range
        confidence = Math.min(1, Math.max(0, confidence));
        
        return confidence;
    }
    
    /**
     * Primary beat detection method
     * @param {number} bassEnergy - Current bass energy (0-1)
     * @param {number} overallEnergy - Current overall energy (0-1)
     * @param {number} spectralFlux - Spectral flux value (0-1)
     * @param {number} tempo - Current tempo in BPM (for adaptive interval)
     * @param {number} energyChange - Energy change from previous frame (0-1)
     * @returns {Object} { beat: boolean, beatStrength: number, beatConfidence: number }
     */
    detectBeat(bassEnergy, overallEnergy, spectralFlux, tempo, energyChange) {
        const now = Date.now();
        const timeSinceLastBeat = now - this.lastBeatTime;
        
        // Update smoothed energy values (exponential moving average)
        this.smoothedBassEnergy = (this.smoothingFactor * this.smoothedBassEnergy) + 
                                  ((1 - this.smoothingFactor) * bassEnergy);
        this.smoothedOverallEnergy = (this.smoothingFactor * this.smoothedOverallEnergy) + 
                                     ((1 - this.smoothingFactor) * overallEnergy);
        
        // Increment warmup counter
        this.warmupFrames++;
        
        // During warmup, don't detect beats (wait for smoothed values to stabilize)
        if (this.warmupFrames < this.warmupRequired) {
            return {
                beat: false,
                beatStrength: 0,
                beatConfidence: 0
            };
        }
        
        // Prevent division by zero
        const epsilon = 0.001;
        const smoothedBass = Math.max(this.smoothedBassEnergy, epsilon);
        const smoothedOverall = Math.max(this.smoothedOverallEnergy, epsilon);
        
        // Calculate energy increases (ratio of current to smoothed)
        const bassIncrease = bassEnergy / smoothedBass;
        const overallIncrease = overallEnergy / smoothedOverall;
        
        // Get adaptive minimum interval based on tempo
        const minInterval = this.getAdaptiveMinInterval(tempo);
        
        // Calculate beat confidence
        const confidence = this.calculateBeatConfidence(
            bassIncrease, 
            overallIncrease, 
            spectralFlux, 
            bassEnergy
        );
        
        // Dynamic threshold adjustment based on average bass level
        // Lower threshold for quiet music, higher for loud music
        // Threshold is in 0-1 range, so adjust between 0.08 and 0.15
        const dynamicThreshold = this.baseThreshold * (1 + (1 - smoothedBass) * 0.5);
        const clampedThreshold = Math.min(0.15, Math.max(0.08, dynamicThreshold));
        
        // Beat detected if confidence exceeds threshold AND enough time has passed
        const beatDetected = (confidence > clampedThreshold) && (timeSinceLastBeat > minInterval);
        
        // Calculate beat strength (how much above threshold)
        let beatStrength = 0;
        if (beatDetected) {
            // Strength is how much confidence exceeds threshold, normalized
            beatStrength = Math.min(1, (confidence - clampedThreshold) / (1 - clampedThreshold));
            this.lastBeatTime = now;
        }
        
        // Store current values
        this.beatStrength = beatStrength;
        this.beatConfidence = confidence;
        
        return {
            beat: beatDetected,
            beatStrength: beatStrength,
            beatConfidence: confidence
        };
    }
    
    /**
     * Get current beat strength (0-1)
     * @returns {number} Current beat strength
     */
    getBeatStrength() {
        return this.beatStrength;
    }
    
    /**
     * Get current beat confidence (0-1)
     * @returns {number} Current beat confidence
     */
    getBeatConfidence() {
        return this.beatConfidence;
    }
    
    /**
     * Reset detector state (useful when audio stops)
     */
    reset() {
        this.smoothedBassEnergy = 0;
        this.smoothedOverallEnergy = 0;
        this.warmupFrames = 0;
        this.lastBeatTime = 0;
        this.beatStrength = 0;
        this.beatConfidence = 0;
    }
}

