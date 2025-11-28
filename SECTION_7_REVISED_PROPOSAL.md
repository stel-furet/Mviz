# Section 7: Note/Chord Detection - REVISED PROPOSAL

## Problem Analysis

### Why Previous Attempt Failed

1. **Data Flow Issue:**
   - Previous attempt likely added pitch detection to `HarmonicAnalyzer` (in `AudioAnalyzer`)
   - `AudioAnalyzer` is part of Autopilot system
   - Autopilot is OPTIONAL and only runs when enabled
   - Data from `HarmonicAnalyzer` never reached `sharedAudioData`
   - Plugins couldn't access the data

2. **Architecture Understanding:**
   - **ONLY** data path to plugins: `master-animation-controller.js` → `generateSharedAudioData()` → `spectrumAnalyzer.generateBasicAudioFeatures()`
   - This is the SINGLE source of truth for plugin audio data
   - Autopilot is a SEPARATE system that doesn't feed into `sharedAudioData`
   - Any new features MUST be added to `generateBasicAudioFeatures()` to reach plugins

3. **YIN/HPS Problem:**
   - YIN and HPS algorithms require TIME-DOMAIN audio buffers
   - `generateBasicAudioFeatures()` only has FREQUENCY-DOMAIN data (`dataArray` from `getByteFrequencyData()`)
   - We don't have access to raw audio samples in this context
   - Full YIN/HPS implementation would require major architectural changes

## Revised Solution: Frequency-Domain Pitch Detection

### Key Principles

1. **Add to `spectrum-analyzer.js` directly** - No Autopilot dependency
2. **Use frequency-domain methods** - Work with existing `dataArray` (frequency bins)
3. **Lightweight for 60fps** - Simple, efficient algorithms
4. **Add to `cachedAudioFeatures`** - Automatically flows to plugins via `sharedAudioData`
5. **Independent operation** - Works whether Autopilot is on or off

### Implementation Strategy

#### Phase 1: Simple Pitch Detection (Frequency-Domain Peak Picking)

**File:** `js/pitch-detector-frequency.js` (new file)

**Method:** Frequency-domain peak picking with harmonic tracking

**How it works:**
1. Find strongest frequency peaks in spectrum
2. Track harmonics (2x, 3x, 4x frequency) to identify fundamental
3. Use peak strength and harmonic relationships to determine pitch
4. Apply smoothing over time for stability

**Advantages:**
- Works with frequency-domain data (what we have)
- Lightweight and fast (60fps capable)
- No time-domain buffers needed
- Independent of Autopilot

**Limitations:**
- Less accurate than YIN/HPS for complex sounds
- Single pitch detection (not polyphonic)
- Works best for monophonic or dominant pitch

#### Phase 2: Chroma Features (Frequency-Domain)

**File:** `js/chroma-features-frequency.js` (new file)

**Method:** Map frequency bins to pitch classes, sum energy across octaves

**How it works:**
1. Map each frequency bin to one of 12 pitch classes (C, C#, D, etc.)
2. Sum energy across all octaves for each pitch class
3. Normalize to create 12-dimensional chroma vector
4. Apply temporal smoothing

**Advantages:**
- Works with frequency-domain data
- Lightweight calculation
- Enables chord detection
- Independent of Autopilot

#### Phase 3: Simple Chord Detection (Chroma-Based)

**File:** Integrate into `spectrum-analyzer.js`

**Method:** Template matching with chroma features

**How it works:**
1. Calculate chroma features (Phase 2)
2. Match against chord templates (major, minor, etc.)
3. Calculate confidence scores
4. Return best match

**Advantages:**
- Works with frequency-domain data
- Simple and fast
- Good enough for visualization purposes
- Independent of Autopilot

## Detailed Implementation

### Step 1: Create Frequency-Domain Pitch Detector

**File:** `js/pitch-detector-frequency.js` (new file)

```javascript
class PitchDetectorFrequency {
    constructor() {
        this.smoothingFactor = 0.85;
        this.smoothedPitch = 0;
        this.smoothedConfidence = 0;
    }
    
    /**
     * Detect pitch from frequency-domain data
     * @param {Uint8Array} dataArray - Frequency data (0-255)
     * @param {number} sampleRate - Audio sample rate
     * @param {number} fftSize - FFT size
     * @returns {Object} {pitch: Hz, confidence: 0-1, note: 'C', noteIndex: 0-11}
     */
    detectPitch(dataArray, sampleRate, fftSize) {
        const nyquist = sampleRate / 2;
        const binCount = dataArray.length;
        const binWidth = nyquist / binCount;
        
        // Find strongest peaks
        const peaks = this.findPeaks(dataArray, 5); // Top 5 peaks
        
        // Find fundamental by checking for harmonics
        const fundamental = this.findFundamental(peaks, binWidth);
        
        // Convert to note
        const noteInfo = this.frequencyToNote(fundamental.frequency);
        
        // Smooth over time
        this.smoothedPitch = (this.smoothingFactor * this.smoothedPitch) + 
                             ((1 - this.smoothingFactor) * fundamental.frequency);
        this.smoothedConfidence = (this.smoothingFactor * this.smoothedConfidence) + 
                                  ((1 - this.smoothingFactor) * fundamental.confidence);
        
        return {
            pitch: this.smoothedPitch,
            confidence: this.smoothedConfidence,
            note: noteInfo.note,
            noteIndex: noteInfo.index
        };
    }
    
    findPeaks(dataArray, count) {
        // Find top N peaks by magnitude
        const peaks = [];
        for (let i = 1; i < dataArray.length - 1; i++) {
            if (dataArray[i] > dataArray[i-1] && dataArray[i] > dataArray[i+1]) {
                peaks.push({index: i, magnitude: dataArray[i]});
            }
        }
        peaks.sort((a, b) => b.magnitude - a.magnitude);
        return peaks.slice(0, count);
    }
    
    findFundamental(peaks, binWidth) {
        // Check if peaks are harmonics of each other
        // Fundamental is the lowest frequency that has harmonics
        for (const peak of peaks) {
            const freq = peak.index * binWidth;
            let harmonicCount = 0;
            
            // Check for harmonics (2x, 3x, 4x)
            for (const otherPeak of peaks) {
                const otherFreq = otherPeak.index * binWidth;
                const ratio = otherFreq / freq;
                if (ratio > 1.9 && ratio < 2.1) harmonicCount++; // 2x
                if (ratio > 2.9 && ratio < 3.1) harmonicCount++; // 3x
                if (ratio > 3.9 && ratio < 4.1) harmonicCount++; // 4x
            }
            
            if (harmonicCount >= 1) {
                return {
                    frequency: freq,
                    confidence: Math.min(1, 0.5 + (harmonicCount * 0.15))
                };
            }
        }
        
        // Fallback: use strongest peak
        if (peaks.length > 0) {
            return {
                frequency: peaks[0].index * binWidth,
                confidence: 0.3
            };
        }
        
        return {frequency: 0, confidence: 0};
    }
    
    frequencyToNote(frequency) {
        const A4 = 440;
        const semitone = Math.round(12 * Math.log2(frequency / A4));
        const noteIndex = ((semitone % 12) + 12) % 12;
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return {note: notes[noteIndex], index: noteIndex};
    }
}
```

### Step 2: Create Chroma Features Calculator

**File:** `js/chroma-features-frequency.js` (new file)

```javascript
class ChromaFeaturesFrequency {
    constructor() {
        this.smoothingFactor = 0.9;
        this.smoothedChroma = new Array(12).fill(0);
    }
    
    /**
     * Calculate chroma features from frequency-domain data
     * @param {Uint8Array} dataArray - Frequency data
     * @param {number} sampleRate - Audio sample rate
     * @param {number} fftSize - FFT size
     * @returns {Array<number>} 12-dimensional chroma vector
     */
    calculateChroma(dataArray, sampleRate, fftSize) {
        const nyquist = sampleRate / 2;
        const binCount = dataArray.length;
        const binWidth = nyquist / binCount;
        const chroma = new Array(12).fill(0);
        
        // Map each frequency bin to pitch class
        for (let i = 0; i < binCount; i++) {
            const frequency = i * binWidth;
            if (frequency < 80 || frequency > 2000) continue; // Musical range
            
            const pitchClass = this.frequencyToPitchClass(frequency);
            const energy = dataArray[i] / 255;
            chroma[pitchClass] += energy;
        }
        
        // Normalize
        const max = Math.max(...chroma);
        if (max > 0) {
            for (let i = 0; i < 12; i++) {
                chroma[i] /= max;
            }
        }
        
        // Smooth over time
        for (let i = 0; i < 12; i++) {
            this.smoothedChroma[i] = (this.smoothingFactor * this.smoothedChroma[i]) + 
                                     ((1 - this.smoothingFactor) * chroma[i]);
        }
        
        return this.smoothedChroma;
    }
    
    frequencyToPitchClass(frequency) {
        const A4 = 440;
        const semitone = Math.round(12 * Math.log2(frequency / A4));
        return ((semitone % 12) + 12) % 12;
    }
}
```

### Step 3: Create Simple Chord Detector

**File:** `js/chord-detector-simple.js` (new file)

```javascript
class ChordDetectorSimple {
    constructor() {
        this.chordTemplates = this.initializeChordTemplates();
    }
    
    /**
     * Detect chord from chroma features
     * @param {Array<number>} chroma - 12-dimensional chroma vector
     * @returns {Object} {chord: 'C', confidence: 0-1}
     */
    detectChord(chroma) {
        let bestMatch = {chord: null, confidence: 0};
        
        for (const [chordName, template] of Object.entries(this.chordTemplates)) {
            const confidence = this.calculateChordConfidence(chroma, template);
            if (confidence > bestMatch.confidence) {
                bestMatch = {chord: chordName, confidence};
            }
        }
        
        return bestMatch;
    }
    
    calculateChordConfidence(chroma, template) {
        let match = 0;
        let total = 0;
        
        for (let i = 0; i < 12; i++) {
            if (template[i]) {
                match += chroma[i];
                total++;
            } else {
                match -= chroma[i] * 0.5; // Penalize non-chord notes
            }
        }
        
        return Math.max(0, Math.min(1, match / total));
    }
    
    initializeChordTemplates() {
        // Simple chord templates (1 = note present, 0 = note absent)
        const templates = {};
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        // Major chords
        for (let root = 0; root < 12; root++) {
            templates[notes[root]] = new Array(12).fill(0);
            templates[notes[root]][root] = 1;
            templates[notes[root]][(root + 4) % 12] = 1;
            templates[notes[root]][(root + 7) % 12] = 1;
        }
        
        // Minor chords
        for (let root = 0; root < 12; root++) {
            const minorName = notes[root] + 'm';
            templates[minorName] = new Array(12).fill(0);
            templates[minorName][root] = 1;
            templates[minorName][(root + 3) % 12] = 1;
            templates[minorName][(root + 7) % 12] = 1;
        }
        
        return templates;
    }
}
```

### Step 4: Integrate into SpectrumAnalyzer

**File:** `js/spectrum-analyzer.js`

**Changes:**
1. Import new modules in constructor
2. Initialize pitch detector, chroma calculator, chord detector
3. Add pitch/chord detection to `generateBasicAudioFeatures()`
4. Add results to `cachedAudioFeatures`

**Key Integration Points:**
```javascript
// In constructor:
this.pitchDetector = new PitchDetectorFrequency();
this.chromaCalculator = new ChromaFeaturesFrequency();
this.chordDetector = new ChordDetectorSimple();

// In generateBasicAudioFeatures():
// After frequency bands calculation...

// Detect pitch
const pitchResult = this.pitchDetector.detectPitch(
    this.dataArray,
    this.analyser.context.sampleRate,
    this.analyser.fftSize
);

// Calculate chroma features
const chroma = this.chromaCalculator.calculateChroma(
    this.dataArray,
    this.analyser.context.sampleRate,
    this.analyser.fftSize
);

// Detect chord
const chordResult = this.chordDetector.detectChord(chroma);

// Add to cachedAudioFeatures
this.cachedAudioFeatures.pitch = pitchResult.pitch;
this.cachedAudioFeatures.pitchConfidence = pitchResult.confidence;
this.cachedAudioFeatures.note = pitchResult.note;
this.cachedAudioFeatures.noteIndex = pitchResult.noteIndex;
this.cachedAudioFeatures.chroma = chroma;
this.cachedAudioFeatures.chord = chordResult.chord;
this.cachedAudioFeatures.chordConfidence = chordResult.confidence;
```

### Step 5: Update Shared Audio Data

**File:** `js/master-animation-controller.js`

**Update `generateSharedAudioData()` fallback object:**
```javascript
return {
    // ... existing properties ...
    pitch: 0,
    pitchConfidence: 0,
    note: null,
    noteIndex: 0,
    chroma: new Array(12).fill(0),
    chord: null,
    chordConfidence: 0
};
```

## Success Criteria

1. ✅ **No Autopilot dependency** - Works independently
2. ✅ **Data reaches plugins** - Added to `cachedAudioFeatures` → `sharedAudioData`
3. ✅ **60fps performance** - Lightweight frequency-domain methods
4. ✅ **Backward compatible** - Existing code still works
5. ✅ **Simple implementation** - No complex time-domain algorithms

## Files to Modify

1. **New:** `js/pitch-detector-frequency.js` - Frequency-domain pitch detection
2. **New:** `js/chroma-features-frequency.js` - Chroma feature calculation
3. **New:** `js/chord-detector-simple.js` - Simple chord detection
4. **Modify:** `js/spectrum-analyzer.js` - Integrate pitch/chord detection
5. **Modify:** `js/master-animation-controller.js` - Update fallback object
6. **Modify:** `index.html` - Add script tags
7. **Modify:** `html-pdf freque docs v1/Freque_Audio_Detection.html` - Update documentation

## Implementation Complexity

**Estimated Effort:** Medium (4-6 hours)
- Pitch detector: 2 hours
- Chroma features: 1 hour
- Chord detector: 1 hour
- Integration: 1 hour
- Testing: 1 hour

## Key Differences from Original Proposal

1. **Frequency-domain instead of time-domain** - Works with existing data
2. **Simpler algorithms** - Peak picking instead of YIN/HPS
3. **Direct integration** - Added to `spectrum-analyzer.js`, not Autopilot
4. **Guaranteed data flow** - Goes through `cachedAudioFeatures` → `sharedAudioData`
5. **No Autopilot requirement** - Works independently

