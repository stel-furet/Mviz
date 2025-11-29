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
        
        // Beat history for graph visualization
        this.beatHistory = []; // Array of {time: timestamp, strength: number, confidence: number}
        this.maxHistoryLength = 100; // Keep last 100 beats for graph
        this.lastBeatTime = 0;
        
        // Detection metrics tracking
        this.lastBassEnergy = 0;
        this.lastOverallEnergy = 0;
        this.smoothedBassEnergy = 0;
        this.smoothedOverallEnergy = 0;
        this.smoothingFactor = 0.9;
        
        // Persist beat strength (show last value instead of 0)
        this.lastBeatStrength = 0;
        this.lastBeatConfidence = 0;
        
        // Scrollable text container
        this.textScrollY = 0;
        this.textMaxHeight = 0;
        
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
            
            // Add mouse wheel event for scrolling
            // Use passive: false to allow preventDefault if needed, but only prevent when over scrollable area
            this.canvas.addEventListener('wheel', (e) => {
                // Only prevent default if content is scrollable and we're over the text area
                const panelX = 10;
                const panelY = 10;
                const panelWidth = 550;
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // Check if mouse is over the text panel area
                if (mouseX >= panelX && mouseX <= panelX + panelWidth && 
                    mouseY >= panelY && mouseY <= panelY + (this.canvas.height - 20)) {
                    // Only prevent default if content actually overflows
                    if (this.textMaxHeight > (this.canvas.height - 20 - 40)) {
                        e.preventDefault();
                    }
                }
                
                this.onMouseWheel(e);
            }, { passive: false });
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
        
        // Track beat history for graph and persist beat strength
        if (sharedAudioData.beat) {
            const now = Date.now();
            const beatStrength = sharedAudioData.beatStrength || 0;
            const beatConfidence = sharedAudioData.beatConfidence || 0;
            
            // Update persisted values
            this.lastBeatStrength = beatStrength;
            this.lastBeatConfidence = beatConfidence;
            
            this.beatHistory.push({
                time: now,
                strength: beatStrength,
                confidence: beatConfidence
            });
            // Keep only recent beats (last 100)
            if (this.beatHistory.length > this.maxHistoryLength) {
                this.beatHistory.shift();
            }
            this.lastBeatTime = now;
        } else {
            // When no beat detected, keep the last values (don't reset to 0)
            // Only update if we have new data
            if (sharedAudioData.beatStrength !== undefined) {
                // Don't update - keep last value
            }
            if (sharedAudioData.beatConfidence !== undefined) {
                // Update confidence even when no beat (it's always calculated)
                this.lastBeatConfidence = sharedAudioData.beatConfidence;
            }
        }
        
        // Calculate bass energy for comparison
        if (sharedAudioData.frequencyBands) {
            // Combine subBass and bass for total bass energy (20-250 Hz)
            const subBass = sharedAudioData.frequencyBands.subBass || 0;
            const bass = sharedAudioData.frequencyBands.bass || 0;
            this.lastBassEnergy = (subBass * 0.3 + bass * 0.7);
            
            // Update smoothed values
            this.smoothedBassEnergy = (this.smoothingFactor * this.smoothedBassEnergy) + 
                                     ((1 - this.smoothingFactor) * this.lastBassEnergy);
        }
        
        // Update smoothed overall energy
        const currentEnergy = sharedAudioData.energy || 0;
        this.lastOverallEnergy = currentEnergy;
        this.smoothedOverallEnergy = (this.smoothingFactor * this.smoothedOverallEnergy) + 
                                    ((1 - this.smoothingFactor) * currentEnergy);
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
        
        // Calculate circle size based on beat confidence (visual feedback)
        let circleRadius = this.circleRadius;
        let circleOpacity = 1.0;
        if (sharedAudioData && sharedAudioData.beatConfidence !== undefined) {
            // Scale radius from 80% to 120% based on beat confidence
            const confidence = Math.max(0, Math.min(1, sharedAudioData.beatConfidence));
            circleRadius = this.circleRadius * (0.8 + confidence * 0.4);
            // Opacity also varies with confidence
            circleOpacity = 0.7 + confidence * 0.3;
        }
        
        // Draw circle with color
        this.ctx.beginPath();
        this.ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
        
        // Set fill color based on color toggle
        if (this.colorEnabled) {
            const hsl = `hsla(${Math.round(this.currentColor.h)}, ${this.currentColor.s}%, ${this.currentColor.l}%, ${circleOpacity})`;
            this.ctx.fillStyle = hsl;
        } else {
            this.ctx.fillStyle = `rgba(74, 144, 226, ${circleOpacity})`; // Static blue when color is off
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
        
        // Draw main data panel (left side) - transparent background
        const panelX = 10;
        const panelY = 10;
        const panelWidth = 550;
        const panelHeight = height - 20;
        
        // Create scrollable text area using clipping
        const scrollAreaHeight = panelHeight - 40; // Leave space for scroll indicators
        const textStartY = panelY + 20;
        const textEndY = textStartY + scrollAreaHeight;
        
        // Draw semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        // Draw beat history graph panel (right side)
        const graphX = 580;
        const graphY = 10;
        const graphWidth = width - graphX - 10;
        const graphHeight = 200;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(graphX, graphY, graphWidth, graphHeight);
        
        // Set up text rendering (reduced font size by 20%: 14px -> 11px)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '11px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // Clip to scrollable area
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(panelX, textStartY, panelWidth - 20, scrollAreaHeight);
        this.ctx.clip();
        
        let y = textStartY - this.textScrollY;
        const lineHeight = 16; // Reduced proportionally with font size (20px -> 16px, 20% reduction)
        
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
        
        // Energy comparison
        this.ctx.fillText(`Overall Energy: ${((audioData.energy || 0) * 100).toFixed(1)}%`, 20, y);
        y += lineHeight;
        this.ctx.fillText(`Bass Energy (20-250 Hz): ${(this.lastBassEnergy * 100).toFixed(1)}%`, 20, y);
        y += lineHeight;
        
        y += lineHeight;
        
        // Beat detection - use persisted values
        this.ctx.fillText(`Beat: ${audioData.beat ? 'YES' : 'NO'}`, 20, y);
        y += lineHeight;
        // Always show last beat strength (persist value)
        this.ctx.fillText(`Beat Strength: ${(this.lastBeatStrength * 100).toFixed(1)}%`, 20, y);
        y += lineHeight;
        // Show current beat confidence (always calculated)
        this.ctx.fillText(`Beat Confidence: ${(this.lastBeatConfidence * 100).toFixed(1)}%`, 20, y);
        y += lineHeight;
        
        y += lineHeight;
        
        // Beat detection metrics
        this.ctx.fillStyle = '#ffff00'; // Yellow for metrics section
        this.ctx.fillText(`--- Beat Detection Metrics ---`, 20, y);
        y += lineHeight;
        this.ctx.fillStyle = '#ffffff';
        
        // Calculate detection metrics
        const epsilon = 0.001;
        const smoothedBass = Math.max(this.smoothedBassEnergy, epsilon);
        const smoothedOverall = Math.max(this.smoothedOverallEnergy, epsilon);
        const bassIncrease = this.lastBassEnergy / smoothedBass;
        const overallIncrease = this.lastOverallEnergy / smoothedOverall;
        
        // Calculate adaptive interval (estimate from tempo)
        const tempo = audioData.tempo || 120;
        const adaptiveInterval = tempo > 0 ? Math.max(100, Math.min(1000, 60000 / (tempo * 2))) : 300;
        const timeSinceLastBeat = this.lastBeatTime > 0 ? Date.now() - this.lastBeatTime : 0;
        
        // Dynamic threshold (estimate)
        const baseThreshold = 0.15;
        const dynamicThreshold = baseThreshold * (1 + (1 - smoothedBass) * 0.3);
        const clampedThreshold = Math.min(0.3, Math.max(0.1, dynamicThreshold));
        
        this.ctx.fillText(`Bass Increase: ${bassIncrease.toFixed(2)}x`, 20, y);
        y += lineHeight;
        this.ctx.fillText(`Overall Increase: ${overallIncrease.toFixed(2)}x`, 20, y);
        y += lineHeight;
        if (audioData.flux !== undefined) {
            this.ctx.fillText(`Spectral Flux: ${(audioData.flux * 100).toFixed(1)}%`, 20, y);
            y += lineHeight;
        }
        this.ctx.fillText(`Dynamic Threshold: ${(clampedThreshold * 100).toFixed(1)}%`, 20, y);
        y += lineHeight;
        this.ctx.fillText(`Adaptive Interval: ${adaptiveInterval.toFixed(0)}ms`, 20, y);
        y += lineHeight;
        this.ctx.fillText(`Time Since Last Beat: ${timeSinceLastBeat.toFixed(0)}ms`, 20, y);
        y += lineHeight;
        
        // Detection state
        this.ctx.fillStyle = '#00ff00'; // Green for state
        this.ctx.fillText(`--- Detection State ---`, 20, y);
        y += lineHeight;
        this.ctx.fillStyle = '#ffffff';
        
        // Check if detector is warming up (estimate - if no beats detected yet and time is short)
        const isWarmingUp = this.beatHistory.length === 0 && this.time < 0.5;
        this.ctx.fillText(`Warmup: ${isWarmingUp ? 'YES' : 'NO'}`, 20, y);
        y += lineHeight;
        this.ctx.fillText(`Min Interval Active: ${timeSinceLastBeat < adaptiveInterval ? 'YES' : 'NO'}`, 20, y);
        y += lineHeight;
        
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
        
        // Store max height for scrolling (content height only, not including scroll offset)
        this.textMaxHeight = y - textStartY;
        
        // Restore clipping
        this.ctx.restore();
        
        // Draw scroll indicators if content overflows
        if (this.textMaxHeight > scrollAreaHeight) {
            // Top scroll indicator
            if (this.textScrollY > 0) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.fillRect(panelX + panelWidth - 30, textStartY, 20, 20);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('▲', panelX + panelWidth - 20, textStartY + 5);
            }
            
            // Bottom scroll indicator
            if (this.textScrollY < this.textMaxHeight - scrollAreaHeight) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.fillRect(panelX + panelWidth - 30, textEndY - 20, 20, 20);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('▼', panelX + panelWidth - 20, textEndY - 15);
            }
        }
        
        // Draw beat history graph
        this.drawBeatHistoryGraph(graphX + 10, graphY + 10, graphWidth - 20, graphHeight - 40);
        
        this.ctx.restore();
    }
    
    // Handle mouse wheel for scrolling
    onMouseWheel(event) {
        const delta = event.deltaY;
        const scrollSpeed = 20;
        
        // Calculate scroll area height
        const panelHeight = (this.canvas ? this.canvas.height : 600) - 20;
        const scrollAreaHeight = panelHeight - 40;
        const maxScrollOffset = Math.max(0, this.textMaxHeight - scrollAreaHeight);
        
        if (delta > 0) {
            // Scroll down
            this.textScrollY = Math.min(maxScrollOffset, this.textScrollY + scrollSpeed);
        } else {
            // Scroll up
            this.textScrollY = Math.max(0, this.textScrollY - scrollSpeed);
        }
        
        // Clamp scroll position to valid range
        this.textScrollY = Math.max(0, Math.min(maxScrollOffset, this.textScrollY));
    }
    
    /**
     * Draw a simple graph showing beat history
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Graph width
     * @param {number} height - Graph height
     */
    drawBeatHistoryGraph(x, y, width, height) {
        if (this.beatHistory.length === 0) {
            this.ctx.fillStyle = '#888888';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('No beats detected yet', x + width / 2, y + height / 2);
            return;
        }
        
        // Graph title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Beat History (Last 10s)', x, y - 15);
        
        // Draw graph background
        this.ctx.strokeStyle = '#444444';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
        
        // Draw grid lines
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 0.5;
        // Horizontal lines (confidence levels)
        for (let i = 0; i <= 4; i++) {
            const gridY = y + (height / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, gridY);
            this.ctx.lineTo(x + width, gridY);
            this.ctx.stroke();
        }
        // Vertical line (time axis)
        const now = Date.now();
        const timeWindow = 10000; // 10 seconds
        const currentTimeX = x + width;
        this.ctx.beginPath();
        this.ctx.moveTo(currentTimeX, y);
        this.ctx.lineTo(currentTimeX, y + height);
        this.ctx.stroke();
        
        // Draw beat points and lines
        if (this.beatHistory.length > 1) {
            // Draw confidence line
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            let firstPoint = true;
            for (let i = 0; i < this.beatHistory.length; i++) {
                const beat = this.beatHistory[i];
                const timeAgo = now - beat.time;
                
                // Only show beats within time window
                if (timeAgo > timeWindow) continue;
                
                const graphX = x + width - (timeAgo / timeWindow) * width;
                const graphY = y + height - (beat.confidence * height);
                
                if (firstPoint) {
                    this.ctx.moveTo(graphX, graphY);
                    firstPoint = false;
                } else {
                    this.ctx.lineTo(graphX, graphY);
                }
            }
            this.ctx.stroke();
            
            // Draw beat strength line
            this.ctx.strokeStyle = '#ff00ff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            firstPoint = true;
            for (let i = 0; i < this.beatHistory.length; i++) {
                const beat = this.beatHistory[i];
                const timeAgo = now - beat.time;
                
                if (timeAgo > timeWindow) continue;
                
                const graphX = x + width - (timeAgo / timeWindow) * width;
                const graphY = y + height - (beat.strength * height);
                
                if (firstPoint) {
                    this.ctx.moveTo(graphX, graphY);
                    firstPoint = false;
                } else {
                    this.ctx.lineTo(graphX, graphY);
                }
            }
            this.ctx.stroke();
            
            // Draw beat markers (circles)
            this.ctx.fillStyle = '#ffff00';
            for (let i = 0; i < this.beatHistory.length; i++) {
                const beat = this.beatHistory[i];
                const timeAgo = now - beat.time;
                
                if (timeAgo > timeWindow) continue;
                
                const graphX = x + width - (timeAgo / timeWindow) * width;
                const graphY = y + height - (beat.confidence * height);
                
                this.ctx.beginPath();
                this.ctx.arc(graphX, graphY, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Draw axis labels
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('0%', x - 25, y + height);
        this.ctx.fillText('100%', x - 35, y);
        this.ctx.textAlign = 'right';
        this.ctx.fillText('10s ago', x + width, y + height + 15);
        this.ctx.fillText('now', x + width, y + height + 15);
        
        // Draw legend
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(x, y + height + 25, 10, 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'left';
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Confidence', x + 15, y + height + 28);
        
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.fillRect(x + 100, y + height + 25, 10, 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('Strength', x + 115, y + height + 28);
        
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(x + 180, y + height + 26, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('Beats', x + 190, y + height + 28);
    }
}

// Auto-register plugin
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new AudioTestPlugin(window.visualizer);
    }
}, 500);

