// src/audio/HarmonicAnalyzer.js

/**
 * HarmonicAnalyzer - Harmonic Analysis Engine for Enhanced Audio Analysis
 * Detects chords, keys, and harmonic progressions from audio
 * 
 * Dependencies: spectrumAnalyzer (passed as parameter)
 * Used by: AudioAnalyzer (Autopilot), spectrum-analyzer.js
 */
class HarmonicAnalyzer {
    constructor(spectrumAnalyzer) {
        // Accept spectrumAnalyzer instead of audioAnalyzer for independence
        this.spectrumAnalyzer = spectrumAnalyzer;
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
        
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.analyzeHarmonics();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    analyzeHarmonics() {
        if (!this.isRunning) return;
        
        try {
            // Get analyser from spectrumAnalyzer directly
            if (this.spectrumAnalyzer && this.spectrumAnalyzer.analyser) {
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
        // Get analyser from spectrumAnalyzer directly
        const analyser = this.spectrumAnalyzer.analyser;
        if (!analyser) return;
        
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
        
        // Get sample rate from analyser context
        const analyser = this.spectrumAnalyzer.analyser;
        if (!analyser || !analyser.context) return noteStrengths;
        
        for (let i = 0; i < dataArray.length; i++) {
            const frequency = (i * analyser.context.sampleRate) / 
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

// StructureDetector has been extracted to src/autopilot/StructureDetector.js

// AudioAnalyzer has been extracted to src/autopilot/AudioAnalyzer.js

// DecisionEngine has been extracted to src/autopilot/DecisionEngine.js

// ****
// ****


// RecordManager has been extracted to src/recording/RecordManager.js


// Backward compatibility for any code using window.HarmonicAnalyzer
if (typeof window !== 'undefined') {
    window.HarmonicAnalyzer = HarmonicAnalyzer;
}
