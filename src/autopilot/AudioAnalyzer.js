/**
 * Enhanced Audio Analysis Engine for AI Autopilot
 * Provides real-time audio analysis including energy, beat, tempo, and frequency bands
 * 
 * Dependencies: TempoDetector, FrequencyBandCalculator, BeatDetectorEnhanced, 
 *               StructureDetector, HarmonicAnalyzer (from spectrum-analyzer)
 * Used by: AIAutopilot
 * 
 * Extracted from main.js as part of Stage 1: Global Classes Split
 */

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
        this.tempoConfidence = 0;
        this.tempoCandidates = [];
        
        // History for analysis
        this.energyHistory = new Array(60).fill(0); // 1 second at 60fps
        this.beatHistory = [];
        this.tempoHistory = [];
        
        // Enhanced analysis components
        // Get HarmonicAnalyzer from spectrumAnalyzer (shared instance, independent of Autopilot)
        const spectrumAnalyzer = this.audioMotion;
        if (spectrumAnalyzer && spectrumAnalyzer.harmonicAnalyzer) {
            // Reference the shared instance from spectrum-analyzer
            this.harmonicAnalyzer = spectrumAnalyzer.harmonicAnalyzer;
        } else {
            // Fallback: create own instance if spectrum-analyzer not available (shouldn't happen)
            console.warn('AudioAnalyzer: spectrumAnalyzer.harmonicAnalyzer not available, creating fallback instance');
            this.harmonicAnalyzer = new HarmonicAnalyzer(spectrumAnalyzer || this);
            this.harmonicAnalyzer.start();
        }
        this.structureDetector = new StructureDetector(this);
        
        // Initialize tempo detector
        this.tempoDetector = new TempoDetector();
        
        // Initialize frequency band calculator
        this.frequencyBandCalculator = new FrequencyBandCalculator();
        
        // Initialize enhanced beat detector
        this.beatDetector = new BeatDetectorEnhanced();
        
        // Initialize frequency band energies (7 bands)
        this.subBassEnergy = 0;    // 20-60 Hz
        this.bassEnergy = 0;       // 60-250 Hz
        this.lowMidEnergy = 0;     // 250-500 Hz
        this.midEnergy = 0;        // 500-2000 Hz
        this.highMidEnergy = 0;    // 2000-4000 Hz
        this.trebleEnergy = 0;     // 4000-8000 Hz
        this.airEnergy = 0;        // 8000-22050 Hz
        
        // Beat detection properties
        this.beatStrength = 0;
        this.beatConfidence = 0;
        
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        // Debug the audioMotion connection
        
        // Start enhanced analysis components
        // Note: harmonicAnalyzer is already running in spectrum-analyzer, don't start it again
        // Only start structureDetector (it's still Autopilot-specific)
        this.structureDetector.start();
        
        this.analyze();
    }
    
    stop() {
        this.isRunning = false;
        if (this.analysisFrame) {
            cancelAnimationFrame(this.analysisFrame);
            this.analysisFrame = null;
        }
        
        // Stop enhanced analysis components
        // Note: harmonicAnalyzer is managed by spectrum-analyzer, don't stop it here
        // Only stop structureDetector (it's still Autopilot-specific)
        this.structureDetector.stop();
        
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
                    
                }
            } else {
                // Debug: Check why audio data isn't available
                if (this.analysisFrame && this.analysisFrame % 300 === 0) { // Every 5 seconds
                    // console.warn('⚠️ AudioMotion or analyser not available:', {
                    //     audioMotion: !!this.audioMotion,
                    //     analyser: !!(this.audioMotion && this.audioMotion.analyser)
                    // });
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
        // Get audio context parameters for Hz-based calculation
        const analyser = this.audioMotion.analyser;
        const sampleRate = analyser.context.sampleRate;
        const fftSize = analyser.fftSize;
        
        // Calculate all 7 frequency bands using actual Hz ranges
        const bands = this.frequencyBandCalculator.calculateAllBands(
            dataArray,
            sampleRate,
            fftSize,
            true // Include extended bands (subBass, lowMid, highMid, air)
        );
        
        // Store all 7 band energies (normalized 0-1)
        this.subBassEnergy = bands.subBass || 0;    // 20-60 Hz
        this.bassEnergy = bands.bass || 0;          // 60-250 Hz
        this.lowMidEnergy = bands.lowMid || 0;      // 250-500 Hz
        this.midEnergy = bands.mid || 0;            // 500-2000 Hz
        this.highMidEnergy = bands.highMid || 0;    // 2000-4000 Hz
        this.trebleEnergy = bands.treble || 0;      // 4000-8000 Hz
        this.airEnergy = bands.air || 0;            // 8000-22050 Hz
        
        // Determine dominant frequency (check all 7 bands)
        const bandEnergies = {
            subBass: this.subBassEnergy,
            bass: this.bassEnergy,
            lowMid: this.lowMidEnergy,
            mid: this.midEnergy,
            highMid: this.highMidEnergy,
            treble: this.trebleEnergy,
            air: this.airEnergy
        };
        
        let maxEnergy = 0;
        let dominantBand = 'mid';
        for (const [band, energy] of Object.entries(bandEnergies)) {
            if (energy > maxEnergy) {
                maxEnergy = energy;
                dominantBand = band;
            }
        }
        this.dominantFreq = dominantBand;
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
        // Enhanced beat detection using frequency-weighted bass-focused method
        // Calculate bass energy (20-250 Hz) for beat detection
        let bassEnergy = 0;
        if (this.audioMotion && this.audioMotion.analyser && this.audioMotion.dataArray) {
            const sampleRate = this.audioMotion.analyser.context.sampleRate;
            const fftSize = this.audioMotion.analyser.fftSize || 8192;
            bassEnergy = this.beatDetector.calculateBassEnergy(
                this.audioMotion.dataArray,
                sampleRate,
                fftSize,
                this.frequencyBandCalculator
            );
        }
        
        // Get current tempo for adaptive interval
        const currentTempo = this.currentTempo || 120;
        
        // Calculate energy change
        const energyChange = Math.abs(this.currentEnergy - this.smoothedEnergy);
        
        // Detect beat using enhanced detector
        const beatResult = this.beatDetector.detectBeat(
            bassEnergy,
            this.currentEnergy,
            this.spectralFlux,
            currentTempo,
            energyChange
        );
        
        this.beatDetected = beatResult.beat;
        this.beatStrength = beatResult.beatStrength;
        this.beatConfidence = beatResult.beatConfidence;
        
        // Update beat history for tempo detection
        if (this.beatDetected) {
            const now = Date.now();
            const lastBeat = this.beatHistory[this.beatHistory.length - 1] || 0;
            
            // Prevent beats too close together (minimum 100ms apart)
            if (now - lastBeat > 100) {
                this.beatHistory.push(now);
                // Keep only recent beats (last 10 seconds)
                this.beatHistory = this.beatHistory.filter(time => now - time < 10000);
            }
        }
    }
    
    calculateTempo() {
        // Use enhanced tempo detector
        const tempoResult = this.tempoDetector.detectTempoFromBeats(this.beatHistory);
        
        // If beat-based detection has low confidence, try autocorrelation fallback
        if (tempoResult.confidence < 0.3 && this.energyHistory.length >= 60) {
            const autocorrResult = this.tempoDetector.detectTempoFromAutocorrelation(this.energyHistory);
            if (autocorrResult.confidence > tempoResult.confidence) {
                this.currentTempo = autocorrResult.tempo;
                this.tempoConfidence = autocorrResult.confidence;
            } else {
                this.currentTempo = tempoResult.tempo;
                this.tempoConfidence = tempoResult.confidence;
            }
        } else {
            this.currentTempo = tempoResult.tempo;
            this.tempoConfidence = tempoResult.confidence;
        }
        
        // Store tempo candidates for advanced use
        this.tempoCandidates = tempoResult.candidates || [];
    }
    
    updateEnergyHistory() {
        this.energyHistory.shift();
        this.energyHistory.push(this.currentEnergy);
        
        // Update tempo detector's energy history for continuous autocorrelation
        if (this.tempoDetector && typeof this.tempoDetector.updateEnergyHistory === 'function') {
            this.tempoDetector.updateEnergyHistory(this.currentEnergy);
        }
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
        
        // Use detected tempo, fallback to energy-based estimation if needed
        let finalTempo = this.currentTempo;
        let finalTempoConfidence = this.tempoConfidence || 0;
        let finalTempoCandidates = this.tempoCandidates || [];
        
        if (finalTempo === 0 && this.smoothedEnergy > 0.1) {
            // Estimate tempo based on energy level (fallback only)
            if (this.smoothedEnergy > 0.4) finalTempo = 140; // High energy = fast tempo
            else if (this.smoothedEnergy > 0.2) finalTempo = 120; // Medium energy = medium tempo
            else finalTempo = 100; // Low energy = slow tempo
            finalTempoConfidence = 0.2; // Low confidence for energy-based estimation
        }
        
        return {
            // Basic audio features
            energy: this.smoothedEnergy,
            beat: this.beatDetected,
            beatStrength: this.beatStrength,
            beatConfidence: this.beatConfidence,
            tempo: finalTempo,
            tempoConfidence: finalTempoConfidence,
            tempoCandidates: finalTempoCandidates,
            dominantFreq: dominantFreqNumeric,
            energyTrend: this.getEnergyTrend(),
            frequencyBands: {
                subBass: this.subBassEnergy || 0,    // 20-60 Hz
                bass: this.bassEnergy || 0,          // 60-250 Hz
                lowMid: this.lowMidEnergy || 0,      // 250-500 Hz
                mid: this.midEnergy || 0,            // 500-2000 Hz
                highMid: this.highMidEnergy || 0,    // 2000-4000 Hz
                treble: this.trebleEnergy || 0,      // 4000-8000 Hz
                air: this.airEnergy || 0             // 8000-22050 Hz
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

// Class is automatically global (no export needed in Stage 1)

