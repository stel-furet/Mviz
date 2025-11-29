/**
 * Decision Engine for AI Autopilot
 * Makes intelligent decisions about visualization changes based on audio analysis
 * 
 * Dependencies: AudioAnalyzer, AIAutopilot
 * Used by: AIAutopilot
 * 
 * Extracted from main.js as part of Stage 1: Global Classes Split
 */

class DecisionEngine {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.visualizer = autopilot.visualizer;
        this.audioAnalyzer = autopilot.audioAnalyzer;
        
        this.isRunning = false;
        this.decisionFrame = null;
        this.lastDecision = 0;
        this.decisionCooldown = 500; // Minimum 0.5 seconds between major changes
        
        // Available visualization modes
        this.visualizationModes = [
            { id: 0, name: 'Spectrum', energy: 'any', tempo: 'any' },
            { id: 1, name: 'Mirror Wave', energy: 'medium', tempo: 'medium' },
            { id: 2, name: 'Classic LED', energy: 'low', tempo: 'slow' },
            { id: 3, name: 'Stereo', energy: 'any', tempo: 'any' },
            { id: 4, name: 'Radial Spectrum', energy: 'high', tempo: 'fast' },
            { id: 5, name: 'Energy', energy: 'high', tempo: 'any' },
            { id: 6, name: 'Mirror', energy: 'medium', tempo: 'any' }
        ];
        
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.makeDecisions();
    }
    
    stop() {
        this.isRunning = false;
        if (this.decisionFrame) {
            cancelAnimationFrame(this.decisionFrame);
            this.decisionFrame = null;
        }
    }
    
    makeDecisions() {
        if (!this.isRunning) return;
        
        try {
            const now = Date.now();
            
            // Only make decisions periodically to avoid chaos
            if (now - this.lastDecision > this.decisionCooldown) {
                // Use enhanced decision making with parameter control
                this.autopilot.makeAdvancedDecisions();
                this.lastDecision = now; // Update last decision time
            }
            
        } catch (error) {
            console.error('Decision engine error:', error);
        }
        
        this.decisionFrame = requestAnimationFrame(() => this.makeDecisions());
    }
    
    evaluateVisualizationChange() {
        const energy = this.audioAnalyzer.getEnergy();
        const beat = this.audioAnalyzer.getBeat();
        const dominantFreq = this.audioAnalyzer.dominantFreq;
        const energyTrend = this.audioAnalyzer.getEnergyTrend();
        const tempo = this.audioAnalyzer.getTempo();
        
        
        // For specific scopes (radial, energy), only switch if not already in the correct mode
        if (this.autopilot.scope === 'radial' || this.autopilot.scope === 'energy') {
            const expectedMode = this.autopilot.scope === 'radial' ? 4 : 5;
            if (this.visualizer.currentMode !== expectedMode) {
                this.applyModeChange(expectedMode);
                this.autopilot.recordModeChange(expectedMode);
                this.lastDecision = Date.now();
            } else {
            }
            return; // Don't run normal decision logic for specific scopes
        }
        
        // Intelligent mode selection based on multiple factors (only for 'bars' and 'all' scopes)
        let targetMode = this.selectOptimalMode(energy, dominantFreq, tempo, energyTrend);
        
        // Switch if mode is different and conditions are met (less restrictive)
        const shouldSwitch = targetMode !== this.visualizer.currentMode && 
                           this.shouldSwitchMode(targetMode, energy) &&
                           (beat || energy > 0.1 || Math.random() < 0.1); // More responsive switching
        
        
        if (shouldSwitch) {
            this.applyModeChange(targetMode);
            this.autopilot.recordModeChange(targetMode);
            this.lastDecision = Date.now();
            
            // Log detailed switch reasoning
            
            // Evaluate additional automation
            this.evaluateColorSchemeChange(energy, dominantFreq);
            this.evaluateKaleidoscopeActivation(energy, beat);
        }
    }
    
    selectOptimalMode(energy, dominantFreq, tempo, energyTrend) {
        // Get available modes based on scope setting
        const availableModes = this.autopilot.modeGroups[this.autopilot.scope];
        
        
        // Get enhanced audio features including harmonic and structure analysis
        const audioFeatures = this.audioAnalyzer.getCurrentFeatures();
        const harmonic = audioFeatures.harmonic || {};
        const structure = audioFeatures.structure || {};
        
        // If scope is specific (radial, energy), return that mode directly
        if (this.autopilot.scope === 'radial' && availableModes.includes(4)) {
            return 4; // Radial Spectrum
        }
        if (this.autopilot.scope === 'energy' && availableModes.includes(5)) {
            return 5; // Energy
        }
        if (this.autopilot.scope === 'bars' && availableModes.length > 0) {
            // For bars scope, prefer bar-based visualizations
            const barModes = availableModes.filter(mode => [0, 2, 3].includes(mode));
            return barModes.length > 0 ? barModes[Math.floor(Math.random() * barModes.length)] : availableModes[0];
        }
        
        // Enhanced mode selection with harmonic and structure awareness
        let candidateModes = [];
        
        // Structure-based mode selection (highest priority)
        if (structure.section) {
            switch (structure.section) {
                case 'intro':
                    // Intro - prefer subtle, building modes
                    candidateModes = availableModes.filter(mode => [0, 4, 5].includes(mode)); // Spectrum, Radial, Wave
                    break;
                case 'verse':
                    // Verse - balanced, steady modes
                    candidateModes = availableModes.filter(mode => [0, 1, 4, 5].includes(mode)); // Spectrum, Bars, Radial, Wave
                    break;
                case 'chorus':
                    // Chorus - most dynamic, energetic modes
                    candidateModes = availableModes.filter(mode => [1, 2, 3, 6].includes(mode)); // Bars, Stereo, Mirror, Kaleidoscope
                    break;
                case 'bridge':
                    // Bridge - unique, experimental modes
                    candidateModes = availableModes.filter(mode => [2, 3, 6].includes(mode)); // Stereo, Mirror, Kaleidoscope
                    break;
                case 'outro':
                    // Outro - fading, subtle modes
                    candidateModes = availableModes.filter(mode => [0, 4, 5].includes(mode)); // Spectrum, Radial, Wave
                    break;
            }
        }
        
        // Harmonic-based mode selection (if no structure info or as secondary factor)
        if (candidateModes.length === 0 && harmonic.chord) {
            if (harmonic.chord.includes('m')) {
                // Minor chords - prefer darker, more introspective modes
                candidateModes = availableModes.filter(mode => [0, 4, 5].includes(mode)); // Spectrum, Radial, Wave
            } else if (harmonic.chord.includes('M') || harmonic.chord.includes('maj')) {
                // Major chords - prefer brighter, more energetic modes
                candidateModes = availableModes.filter(mode => [1, 2, 3, 6].includes(mode)); // Bars, Stereo, Mirror, Kaleidoscope
            }
        }
        
        // Energy-based selection (fallback if no structure/harmonic info)
        if (candidateModes.length === 0) {
        // Very high energy
        if (energy > 0.4 && energyTrend > 0.02) {
            candidateModes = availableModes.filter(mode => [4, 5].includes(mode)); // Radial, Energy
        }
        // High energy
        else if (energy > 0.3) {
            candidateModes = availableModes.filter(mode => [1, 5, 4].includes(mode)); // Mirror Wave, Energy, Radial
        }
        // Medium energy
        else if (energy > 0.2) {
            candidateModes = availableModes.filter(mode => [3, 6, 0].includes(mode)); // Stereo, Mirror, Spectrum
        }
        // Rising energy
        else if (energyTrend > 0.01) {
            candidateModes = availableModes.filter(mode => [1, 0].includes(mode)); // Mirror Wave, Spectrum
        }
        // Low energy
        else if (energy > 0.1) {
            candidateModes = availableModes.filter(mode => [0, 2].includes(mode)); // Spectrum, Classic LED
        }
        // Very low energy
        else {
            candidateModes = availableModes.filter(mode => [2].includes(mode)); // Classic LED
            }
        }
        
        // If no candidates match scope, use any available mode
        if (candidateModes.length === 0) {
            candidateModes = availableModes;
        }
        
        // Select random mode from candidates for variety
        return candidateModes[Math.floor(Math.random() * candidateModes.length)];
    }
    
    shouldSwitchMode(targetMode, energy) {
        // Prevent rapid switching only in very low energy situations
        if (energy < 0.02) return false;
        
        // Allow more frequent switching - only prevent immediate repeats
        const recentModes = this.autopilot.modeHistory.slice(-1); // Only prevent immediate repeat
        if (recentModes.includes(targetMode)) return false;
        
        return true;
    }
    
    getModeName(modeId) {
        const mode = this.visualizationModes.find(m => m.id === modeId);
        return mode ? mode.name : `Mode ${modeId}`;
    }
    
    applyModeChange(targetMode) {
        const timing = this.autopilot.changeTiming;
        
        switch (timing) {
            case 'instant':
                this.visualizer.setVisualizationMode(targetMode);
                break;
            case 'smooth':
                // Add smooth transition (could be implemented with CSS transitions)
                this.visualizer.setVisualizationMode(targetMode);
                break;
            case 'slow':
                // Add delay for slower changes
                setTimeout(() => {
                    this.visualizer.setVisualizationMode(targetMode);
                }, 500);
                break;
            case 'beat-synced':
                // Wait for next beat to change
                if (this.audioAnalyzer.getBeat()) {
                    this.visualizer.setVisualizationMode(targetMode);
                } else {
                    // Store pending change and apply on next beat
                    this.pendingModeChange = targetMode;
                }
                break;
            default:
                this.visualizer.setVisualizationMode(targetMode);
        }
    }
    
    evaluateColorSchemeChange(energy, dominantFreq) {
        // Only change colors if auto color schemes is enabled
        if (!this.autopilot.autoColorSchemes) return;
        
        // More responsive color scheme automation
        if (dominantFreq === 'bass' && energy > 0.15) {
            // Bass-heavy = darker schemes
            this.visualizer.setColorScheme('metal');
        } else if (dominantFreq === 'treble' && energy > 0.15) {
            // Treble-heavy = brighter schemes  
            this.visualizer.setColorScheme('psychedelic');
        } else if (energy > 0.2) {
            // Medium energy = vibrant schemes
            this.visualizer.setColorScheme('luigi');
        } else {
            // Low energy = calm schemes
            this.visualizer.setColorScheme('earthtones');
        }
    }
    
    evaluateKaleidoscopeActivation(energy, beat) {
        // Auto-activate kaleidoscope for high energy sections
        if (energy > 0.8 && beat && !this.visualizer.kaleidoscopeEnabled) {
            this.visualizer.toggleKaleidoscope();
        } else if (energy < 0.4 && this.visualizer.kaleidoscopeEnabled) {
            this.visualizer.toggleKaleidoscope();
        }
    }
}

// Class is automatically global (no export needed in Stage 1)

