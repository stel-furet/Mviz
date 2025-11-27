/**
 * Audio Testing Plugin
 * Simple visualization for testing audio analysis features
 * Displays tempo, frequencies, notes, and other audio data
 */

class AudioTestPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('audio-test', visualizer, {
            version: '1.0.0',
            author: 'Freque',
            description: 'Audio Analysis Testing Plugin',
            targetFPS: 60
        });
        
        // Circle properties
        this.circleRadius = 100;
        this.circleX = 0; // Will be set to center
        this.circleY = 0; // Will be set to center
        this.baseY = 0; // Base Y position for bouncing
        this.bounceOffset = 0; // Current bounce offset (negative = up, 0 = base, positive = invalid)
        this.rotationAngle = 0; // Current rotation angle
        this.currentColor = { h: 240, s: 100, l: 20 }; // HSL color (dark blue to dark red based on energy)
        
        // Toggle states
        this.beatEnabled = true;
        this.rotateEnabled = true;
        this.colorEnabled = true;
        
        // Animation state
        this.time = 0;
        this.bounceVelocity = 0; // For smoother bounce physics (negative = up, positive = down)
        this.maxBounceHeight = 50; // Maximum bounce height in pixels
        
        // Frequency band calculator for Hz range display
        this.frequencyBandCalculator = new FrequencyBandCalculator();
        
        // Musical note names
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        // Setup controls
        this.setupControls();
    }
    
    /**
     * Convert Hz to musical note name (e.g., "A4", "C#5")
     * @param {number} frequency - Frequency in Hz
     * @returns {string} Note name with octave (e.g., "A4") or "N/A" if frequency is 0
     */
    hzToNoteName(frequency) {
        if (!frequency || frequency <= 0) return 'N/A';
        
        // A4 (440 Hz) is the reference note (MIDI note 69)
        const A4_FREQUENCY = 440;
        const A4_MIDI = 69;
        
        // Calculate semitones from A4
        const semitones = 12 * Math.log2(frequency / A4_FREQUENCY);
        const midiNote = Math.round(A4_MIDI + semitones);
        
        // Convert MIDI note to note name and octave
        const noteIndex = midiNote % 12;
        const octave = Math.floor(midiNote / 12) - 1; // MIDI note 0 = C-1, MIDI note 69 = A4
        
        // Handle negative octaves (very low frequencies)
        if (octave < 0) {
            return `${this.noteNames[noteIndex]}${octave}`;
        }
        
        return `${this.noteNames[noteIndex]}${octave}`;
    }
    
    /**
     * Get frequency band name from Hz value
     * @param {number} frequency - Frequency in Hz
     * @returns {string} Band name (e.g., "subBass", "bass", "mid", etc.)
     */
    getFrequencyBandName(frequency) {
        if (!frequency || frequency <= 0) return 'N/A';
        
        if (frequency < 60) return 'subBass';
        if (frequency < 250) return 'bass';
        if (frequency < 500) return 'lowMid';
        if (frequency < 2000) return 'mid';
        if (frequency < 4000) return 'highMid';
        if (frequency < 8000) return 'treble';
        return 'air';
    }
    
    setupControls() {
        // Beat toggle
        this.addControl('beatToggle', {
            type: 'button',
            label: 'Beat: On',
            className: 'btn-primary-mixer',
            wrapperClass: 'button-mini-wrapper',
            onClick: () => {
                this.beatEnabled = !this.beatEnabled;
                const button = document.querySelector(`[data-plugin="audio-test"] [data-control="beatToggle"]`);
                if (button) {
                    button.textContent = `Beat: ${this.beatEnabled ? 'On' : 'Off'}`;
                    button.classList.toggle('active', this.beatEnabled);
                }
            }
        });
        
        // Rotate toggle
        this.addControl('rotateToggle', {
            type: 'button',
            label: 'Rotate: On',
            className: 'btn-primary-mixer',
            wrapperClass: 'button-mini-wrapper',
            onClick: () => {
                this.rotateEnabled = !this.rotateEnabled;
                const button = document.querySelector(`[data-plugin="audio-test"] [data-control="rotateToggle"]`);
                if (button) {
                    button.textContent = `Rotate: ${this.rotateEnabled ? 'On' : 'Off'}`;
                    button.classList.toggle('active', this.rotateEnabled);
                }
            }
        });
        
        // Color toggle
        this.addControl('colorToggle', {
            type: 'button',
            label: 'Color: On',
            className: 'btn-primary-mixer',
            wrapperClass: 'button-mini-wrapper',
            onClick: () => {
                this.colorEnabled = !this.colorEnabled;
                const button = document.querySelector(`[data-plugin="audio-test"] [data-control="colorToggle"]`);
                if (button) {
                    button.textContent = `Color: ${this.colorEnabled ? 'On' : 'Off'}`;
                    button.classList.toggle('active', this.colorEnabled);
                }
            }
        });
    }
    
    onInitialize() {
        // Set initial circle position to center
        if (this.canvas) {
            this.circleX = this.canvas.width / 2;
            this.circleY = this.canvas.height / 2;
            this.baseY = this.circleY;
        }
    }
    
    onResize(width, height) {
        // Update circle position to center
        this.circleX = width / 2;
        this.circleY = height / 2;
        this.baseY = this.circleY;
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        if (!sharedAudioData) return;
        
        this.time += deltaTime / 1000; // Convert to seconds
        
        // Convert deltaTime to seconds for frame-rate independent physics
        const dt = deltaTime / 1000;
        
        // Update bounce (beat reaction)
        if (this.beatEnabled && sharedAudioData.beat) {
            // Bounce on beat - apply upward impulse
            // Negative velocity = upward movement
            this.bounceVelocity = -400; // Upward velocity (pixels per second)
        }
        
        // Apply physics to bounce
        if (this.beatEnabled) {
            // Apply gravity (positive = downward force)
            const gravity = 800; // pixels per second squared
            this.bounceVelocity += gravity * dt;
            
            // Update position
            this.bounceOffset += this.bounceVelocity * dt;
            
            // Constrain bounceOffset: negative = up, 0 = base, positive = invalid
            // Never allow ball to go below baseY
            if (this.bounceOffset > 0) {
                this.bounceOffset = 0;
                // Ensure bounce velocity is upward (negative) after collision
                // If velocity was positive (downward), bounce it back up
                if (this.bounceVelocity > 0) {
                    this.bounceVelocity *= -0.6; // Bounce back with damping
                } else {
                    // If already negative, ensure it stays negative (upward)
                    this.bounceVelocity = Math.min(0, this.bounceVelocity);
                }
            }
            
            // Limit maximum bounce height
            if (this.bounceOffset < -this.maxBounceHeight) {
                this.bounceOffset = -this.maxBounceHeight;
                // If at max height and still moving up, stop or reverse
                if (this.bounceVelocity < 0) {
                    this.bounceVelocity = 0;
                }
            }
        } else {
            // Decay bounce when disabled - smoothly return to base
            this.bounceOffset *= 0.9;
            this.bounceVelocity *= 0.9;
            
            // Ensure bounceOffset never goes positive when disabled
            if (this.bounceOffset > 0) {
                this.bounceOffset = 0;
                this.bounceVelocity = 0;
            }
        }
        
        // Update rotation (tempo reaction)
        if (this.rotateEnabled && sharedAudioData.tempo && sharedAudioData.tempoConfidence > 0.5) {
            // Rotate speed based on tempo (normalize to 120 BPM)
            // At 120 BPM, rotate at 1 rotation per second
            const tempoMultiplier = sharedAudioData.tempo / 120;
            const rotationSpeed = tempoMultiplier * Math.PI * 2; // Full rotation per second at 120 BPM
            this.rotationAngle += (deltaTime / 1000) * rotationSpeed;
        } else if (this.rotateEnabled) {
            // Slow rotation if no tempo detected
            this.rotationAngle += (deltaTime / 1000) * 0.1;
        }
        
        // Update color (energy reaction)
        // Linear interpolation: low energy (0) = dark blue, high energy (1) = dark red
        if (this.colorEnabled) {
            const energy = Math.max(0, Math.min(1, sharedAudioData.energy || 0)); // Clamp 0-1
            
            // Dark blue: HSL(240, 100%, 20%)
            // Dark red: HSL(0, 100%, 20%)
            // Interpolate hue linearly from 240 (blue) to 0 (red) as energy increases
            // Taking the shorter path: blue (240) -> magenta (300) -> red (0) = 120 degrees forward
            const blueHue = 240;
            
            // Linear interpolation: energy 0 = 240 (blue), energy 1 = 0 (red)
            // Path: 240 -> 300 -> 0 (add 120 degrees total)
            this.currentColor.h = (blueHue + energy * 120) % 360;
            
            // Keep saturation and lightness constant (dark, saturated colors)
            this.currentColor.s = 100;
            this.currentColor.l = 20;
        }
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        if (!this.ctx || !this.canvas) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Calculate current Y position with bounce
        const currentY = this.baseY - this.bounceOffset;
        
        // Save context for rotation
        this.ctx.save();
        
        // Translate to circle center and rotate
        this.ctx.translate(this.circleX, currentY);
        if (this.rotateEnabled) {
            this.ctx.rotate(this.rotationAngle);
        }
        
        // Draw circle with color
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.circleRadius, 0, Math.PI * 2);
        
        // Set fill color based on color toggle
        if (this.colorEnabled) {
            const hsl = `hsl(${Math.round(this.currentColor.h)}, ${this.currentColor.s}%, ${this.currentColor.l}%)`;
            this.ctx.fillStyle = hsl;
        } else {
            this.ctx.fillStyle = '#4a90e2'; // Static blue when color is off
        }
        
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw text "Freque" inside circle
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Freque', 0, 0);
        
        // Restore context
        this.ctx.restore();
        
        // Draw onscreen audio data display
        this.drawAudioData(sharedAudioData, width, height);
    }
    
    drawAudioData(audioData, width, height) {
        if (!audioData) return;
        
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 550, 450);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        let y = 20;
        const lineHeight = 20;
        
        // Tempo information
        this.ctx.fillText(`Tempo: ${audioData.tempo || 0} BPM`, 20, y);
        y += lineHeight;
        this.ctx.fillText(`Tempo Confidence: ${((audioData.tempoConfidence || 0) * 100).toFixed(1)}%`, 20, y);
        y += lineHeight;
        
        if (audioData.tempoCandidates && audioData.tempoCandidates.length > 0) {
            this.ctx.fillText(`Tempo Candidates:`, 20, y);
            y += lineHeight;
            audioData.tempoCandidates.slice(0, 3).forEach((candidate, i) => {
                this.ctx.fillText(`  ${i + 1}. ${candidate.bpm} BPM (${(candidate.confidence * 100).toFixed(1)}%)`, 30, y);
                y += lineHeight;
            });
        }
        
        y += lineHeight;
        
        // Energy
        this.ctx.fillText(`Energy: ${((audioData.energy || 0) * 100).toFixed(1)}%`, 20, y);
        y += lineHeight;
        
        // Beat
        this.ctx.fillText(`Beat: ${audioData.beat ? 'YES' : 'NO'}`, 20, y);
        y += lineHeight;
        if (audioData.beatStrength) {
            this.ctx.fillText(`Beat Strength: ${(audioData.beatStrength * 100).toFixed(1)}%`, 20, y);
            y += lineHeight;
        }
        
        y += lineHeight;
        
        // Frequency bands with real-time Hz values
        if (audioData.frequencyBands && audioData.dataArray) {
            let sampleRate = 44100;
            let fftSize = 8192;
            
            // Get analyser info
            if (window.visualizer && window.visualizer.audioMotion && window.visualizer.audioMotion.analyser) {
                const analyser = window.visualizer.audioMotion.analyser;
                if (analyser.context) {
                    sampleRate = analyser.context.sampleRate;
                    fftSize = analyser.fftSize;
                }
            }
            
            // Calculate Hz per bin
            const nyquist = sampleRate / 2;
            const binCount = fftSize / 2;
            const binWidth = nyquist / binCount;
            
            // Calculate dominant Hz in each band (weighted by energy)
            const calculateDominantHz = (minHz, maxHz) => {
                const startBin = Math.floor(minHz / binWidth);
                const endBin = Math.floor(maxHz / binWidth);
                const actualEndBin = Math.min(endBin, audioData.dataArray.length - 1);
                
                if (startBin >= actualEndBin || startBin >= audioData.dataArray.length) {
                    return 0;
                }
                
                let totalEnergy = 0;
                let weightedHz = 0;
                
                for (let i = startBin; i <= actualEndBin; i++) {
                    const value = audioData.dataArray[i];
                    const energy = value * value; // Square for energy weighting
                    const binHz = i * binWidth;
                    
                    totalEnergy += energy;
                    weightedHz += binHz * energy;
                }
                
                if (totalEnergy === 0) return 0;
                return weightedHz / totalEnergy; // Weighted average Hz
            };
            
            // Calculate current Hz for all 7 bands
            const subBassHz = calculateDominantHz(20, 60);
            const bassHz = calculateDominantHz(60, 250);
            const lowMidHz = calculateDominantHz(250, 500);
            const midHz = calculateDominantHz(500, 2000);
            const highMidHz = calculateDominantHz(2000, 4000);
            const trebleHz = calculateDominantHz(4000, 8000);
            const airHz = calculateDominantHz(8000, 22050);
            
            // Display all 7 bands with real-time Hz values
            this.ctx.fillText(`Sub-Bass (20-60 Hz): ${((audioData.frequencyBands.subBass || 0) * 100).toFixed(1)}% - Current: ${subBassHz.toFixed(1)} Hz`, 20, y);
            y += lineHeight;
            this.ctx.fillText(`Bass (60-250 Hz): ${((audioData.frequencyBands.bass || 0) * 100).toFixed(1)}% - Current: ${bassHz.toFixed(1)} Hz`, 20, y);
            y += lineHeight;
            this.ctx.fillText(`Low-Mid (250-500 Hz): ${((audioData.frequencyBands.lowMid || 0) * 100).toFixed(1)}% - Current: ${lowMidHz.toFixed(1)} Hz`, 20, y);
            y += lineHeight;
            this.ctx.fillText(`Mid (500-2000 Hz): ${((audioData.frequencyBands.mid || 0) * 100).toFixed(1)}% - Current: ${midHz.toFixed(1)} Hz`, 20, y);
            y += lineHeight;
            this.ctx.fillText(`High-Mid (2000-4000 Hz): ${((audioData.frequencyBands.highMid || 0) * 100).toFixed(1)}% - Current: ${highMidHz.toFixed(1)} Hz`, 20, y);
            y += lineHeight;
            this.ctx.fillText(`Treble (4000-8000 Hz): ${((audioData.frequencyBands.treble || 0) * 100).toFixed(1)}% - Current: ${trebleHz.toFixed(1)} Hz`, 20, y);
            y += lineHeight;
            this.ctx.fillText(`Air (8000-22050 Hz): ${((audioData.frequencyBands.air || 0) * 100).toFixed(1)}% - Current: ${airHz.toFixed(1)} Hz`, 20, y);
            y += lineHeight;
        }
        
        y += lineHeight;
        
        // Dominant frequency with band name and note name
        if (audioData.dominantFrequency) {
            const dominantHz = audioData.dominantFrequency;
            const bandName = this.getFrequencyBandName(dominantHz);
            const noteName = this.hzToNoteName(dominantHz);
            this.ctx.fillText(`Dominant Freq: ${dominantHz.toFixed(1)} Hz - Band: ${bandName} (${noteName})`, 20, y);
            y += lineHeight;
        }
        
        // Harmonic/Note information (if available)
        if (audioData.harmonic) {
            y += lineHeight;
            if (audioData.harmonic.chord) {
                this.ctx.fillText(`Chord: ${audioData.harmonic.chord}`, 20, y);
                y += lineHeight;
                this.ctx.fillText(`Chord Confidence: ${((audioData.harmonic.chordConfidence || 0) * 100).toFixed(1)}%`, 20, y);
                y += lineHeight;
            }
            if (audioData.harmonic.key) {
                this.ctx.fillText(`Key: ${audioData.harmonic.key}`, 20, y);
                y += lineHeight;
            }
        }
        
        // Spectral flux
        if (audioData.flux !== undefined) {
            y += lineHeight;
            this.ctx.fillText(`Spectral Flux: ${(audioData.flux * 100).toFixed(1)}%`, 20, y);
        }
        
        // Energy change
        if (audioData.energyChange !== undefined) {
            y += lineHeight;
            this.ctx.fillText(`Energy Change: ${(audioData.energyChange * 100).toFixed(1)}%`, 20, y);
        }
        
        this.ctx.restore();
    }
}

// Auto-register plugin
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new AudioTestPlugin(window.visualizer);
    }
}, 500);

