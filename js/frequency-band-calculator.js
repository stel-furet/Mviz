/**
 * Frequency Band Calculator
 * Converts Hz ranges to frequency bin indices and calculates band energy
 * Uses actual musical frequency ranges instead of percentage-based divisions
 */

class FrequencyBandCalculator {
    constructor() {
        // Standard musical frequency band definitions (in Hz)
        this.standardBands = {
            subBass: { min: 20, max: 60 },
            bass: { min: 60, max: 250 },
            lowMid: { min: 250, max: 500 },
            mid: { min: 500, max: 2000 },
            highMid: { min: 2000, max: 4000 },
            treble: { min: 4000, max: 8000 },
            air: { min: 8000, max: 22050 }
        };
    }
    
    /**
     * Convert Hz range to frequency bin indices
     * @param {number} sampleRate - Audio sample rate (e.g., 44100)
     * @param {number} fftSize - FFT size (e.g., 8192)
     * @param {number} minHz - Minimum frequency in Hz
     * @param {number} maxHz - Maximum frequency in Hz
     * @returns {Object} { startBin: number, endBin: number }
     */
    getBandBins(sampleRate, fftSize, minHz, maxHz) {
        const nyquist = sampleRate / 2;
        const binCount = fftSize / 2;
        const binWidth = nyquist / binCount;
        
        const startBin = Math.floor(minHz / binWidth);
        const endBin = Math.floor(maxHz / binWidth);
        
        return {
            start: Math.max(0, Math.min(startBin, binCount - 1)),
            end: Math.max(0, Math.min(endBin, binCount - 1))
        };
    }
    
    /**
     * Calculate RMS energy for a specific Hz range
     * @param {Uint8Array} dataArray - Frequency data array (0-255 values)
     * @param {number} sampleRate - Audio sample rate
     * @param {number} fftSize - FFT size
     * @param {number} minHz - Minimum frequency in Hz
     * @param {number} maxHz - Maximum frequency in Hz
     * @returns {number} Normalized energy (0-1)
     */
    calculateBandEnergy(dataArray, sampleRate, fftSize, minHz, maxHz) {
        const bins = this.getBandBins(sampleRate, fftSize, minHz, maxHz);
        
        if (bins.start >= bins.end || bins.start >= dataArray.length) {
            return 0;
        }
        
        // Calculate RMS energy for the band
        let sumSquares = 0;
        let count = 0;
        
        const endBin = Math.min(bins.end, dataArray.length - 1);
        for (let i = bins.start; i <= endBin; i++) {
            const value = dataArray[i];
            sumSquares += value * value;
            count++;
        }
        
        if (count === 0) return 0;
        
        // RMS: sqrt of mean of squares, normalized to 0-1
        const rms = Math.sqrt(sumSquares / count) / 255;
        return Math.min(1, rms);
    }
    
    /**
     * Calculate all standard frequency bands
     * @param {Uint8Array} dataArray - Frequency data array
     * @param {number} sampleRate - Audio sample rate
     * @param {number} fftSize - FFT size
     * @param {boolean} extended - Include extended bands (subBass, lowMid, highMid, air)
     * @returns {Object} Frequency band energy values (0-1)
     */
    calculateAllBands(dataArray, sampleRate, fftSize, extended = false) {
        const bands = {};
        
        // Core bands (always included for backward compatibility)
        bands.bass = this.calculateBandEnergy(
            dataArray, sampleRate, fftSize,
            this.standardBands.bass.min,
            this.standardBands.bass.max
        );
        
        bands.mid = this.calculateBandEnergy(
            dataArray, sampleRate, fftSize,
            this.standardBands.mid.min,
            this.standardBands.mid.max
        );
        
        bands.treble = this.calculateBandEnergy(
            dataArray, sampleRate, fftSize,
            this.standardBands.treble.min,
            this.standardBands.treble.max
        );
        
        // Extended bands (optional)
        if (extended) {
            bands.subBass = this.calculateBandEnergy(
                dataArray, sampleRate, fftSize,
                this.standardBands.subBass.min,
                this.standardBands.subBass.max
            );
            
            bands.lowMid = this.calculateBandEnergy(
                dataArray, sampleRate, fftSize,
                this.standardBands.lowMid.min,
                this.standardBands.lowMid.max
            );
            
            bands.highMid = this.calculateBandEnergy(
                dataArray, sampleRate, fftSize,
                this.standardBands.highMid.min,
                this.standardBands.highMid.max
            );
            
            bands.air = this.calculateBandEnergy(
                dataArray, sampleRate, fftSize,
                this.standardBands.air.min,
                this.standardBands.air.max
            );
        }
        
        return bands;
    }
    
    /**
     * Get standard band Hz ranges (for reference/documentation)
     * @returns {Object} Band definitions with min/max Hz
     */
    getBandDefinitions() {
        return { ...this.standardBands };
    }
}

