/**
 * Musical Structure Detection Engine
 * Detects song sections (intro, verse, chorus, bridge, outro)
 * 
 * Dependencies: AudioAnalyzer (passed in constructor)
 * Used by: AIAutopilot
 * 
 * Extracted from main.js as part of Stage 1: Global Classes Split
 */

class StructureDetector {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.isRunning = false;
        
        // Structure detection parameters
        this.energyThreshold = 0.1;
        this.tempoThreshold = 10; // BPM change threshold
        this.structureWindow = 300; // 5 seconds for structure analysis
        
        // Current structure data
        this.currentSection = 'unknown';
        this.sectionConfidence = 0;
        this.sectionDuration = 0;
        this.sectionStartTime = 0;
        
        // Structure history
        this.sectionHistory = [];
        this.energyPatterns = [];
        this.tempoPatterns = [];
        
        // Section types and their characteristics
        this.sectionTypes = {
            'intro': { energy: 'low', tempo: 'stable', duration: 'short' },
            'verse': { energy: 'medium', tempo: 'stable', duration: 'medium' },
            'chorus': { energy: 'high', tempo: 'stable', duration: 'medium' },
            'bridge': { energy: 'variable', tempo: 'variable', duration: 'short' },
            'outro': { energy: 'decreasing', tempo: 'decreasing', duration: 'short' }
        };
        
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.detectStructure();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    detectStructure() {
        if (!this.isRunning) return;
        
        try {
            if (this.audioAnalyzer) {
                this.analyzeSectionCharacteristics();
                this.updateSectionHistory();
            }
        } catch (error) {
            console.error('Structure detection error:', error);
        }
        
        if (this.isRunning) {
            requestAnimationFrame(() => this.detectStructure());
        }
    }
    
    analyzeSectionCharacteristics() {
        const energy = this.audioAnalyzer.getEnergy();
        const tempo = this.audioAnalyzer.getTempo();
        const energyTrend = this.audioAnalyzer.getEnergyTrend();
        
        // Store patterns for analysis
        this.energyPatterns.push({
            timestamp: Date.now(),
            energy: energy,
            trend: energyTrend
        });
        
        this.tempoPatterns.push({
            timestamp: Date.now(),
            tempo: tempo
        });
        
        // Keep only recent patterns
        if (this.energyPatterns.length > 300) {
            this.energyPatterns = this.energyPatterns.slice(-300);
        }
        if (this.tempoPatterns.length > 300) {
            this.tempoPatterns = this.tempoPatterns.slice(-300);
        }
        
        // Analyze current section
        this.classifyCurrentSection(energy, tempo, energyTrend);
    }
    
    classifyCurrentSection(energy, tempo, energyTrend) {
        const sectionScores = {};
        
        for (const [sectionType, characteristics] of Object.entries(this.sectionTypes)) {
            let score = 0;
            
            // Energy analysis
            if (characteristics.energy === 'low' && energy < 0.3) score += 0.3;
            else if (characteristics.energy === 'medium' && energy >= 0.3 && energy < 0.7) score += 0.3;
            else if (characteristics.energy === 'high' && energy >= 0.7) score += 0.3;
            else if (characteristics.energy === 'variable') score += 0.2;
            else if (characteristics.energy === 'decreasing' && energyTrend < -0.1) score += 0.3;
            
            // Tempo analysis
            if (characteristics.tempo === 'stable' && this.isTempoStable()) score += 0.3;
            else if (characteristics.tempo === 'variable' && !this.isTempoStable()) score += 0.3;
            else if (characteristics.tempo === 'decreasing' && this.isTempoDecreasing()) score += 0.3;
            
            // Duration analysis
            const currentDuration = Date.now() - this.sectionStartTime;
            if (characteristics.duration === 'short' && currentDuration < 10000) score += 0.2;
            else if (characteristics.duration === 'medium' && currentDuration >= 10000 && currentDuration < 30000) score += 0.2;
            else if (characteristics.duration === 'long' && currentDuration >= 30000) score += 0.2;
            
            sectionScores[sectionType] = score;
        }
        
        // Find best matching section
        const bestSection = Object.keys(sectionScores).reduce((a, b) => 
            sectionScores[a] > sectionScores[b] ? a : b
        );
        
        const confidence = sectionScores[bestSection];
        
        // Update current section if confidence is high enough
        if (confidence > 0.5 && bestSection !== this.currentSection) {
            this.currentSection = bestSection;
            this.sectionConfidence = confidence;
            this.sectionStartTime = Date.now();
            this.sectionDuration = 0;
            
        }
        
        this.sectionDuration = Date.now() - this.sectionStartTime;
    }
    
    isTempoStable() {
        if (this.tempoPatterns.length < 10) return true;
        
        const recentTempos = this.tempoPatterns.slice(-10).map(p => p.tempo);
        const avgTempo = recentTempos.reduce((a, b) => a + b, 0) / recentTempos.length;
        const variance = recentTempos.reduce((sum, tempo) => sum + Math.pow(tempo - avgTempo, 2), 0) / recentTempos.length;
        
        return Math.sqrt(variance) < this.tempoThreshold;
    }
    
    isTempoDecreasing() {
        if (this.tempoPatterns.length < 20) return false;
        
        const recentTempos = this.tempoPatterns.slice(-20).map(p => p.tempo);
        const firstHalf = recentTempos.slice(0, 10);
        const secondHalf = recentTempos.slice(10);
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        return secondAvg < firstAvg - 5; // 5 BPM decrease
    }
    
    updateSectionHistory() {
        this.sectionHistory.push({
            timestamp: Date.now(),
            section: this.currentSection,
            confidence: this.sectionConfidence,
            duration: this.sectionDuration
        });
        
        // Keep only recent history
        if (this.sectionHistory.length > 100) {
            this.sectionHistory = this.sectionHistory.slice(-100);
        }
    }
    
    // Public getters
    getCurrentSection() { return this.currentSection; }
    getSectionConfidence() { return this.sectionConfidence; }
    getSectionDuration() { return this.sectionDuration; }
    getSectionHistory() { return this.sectionHistory; }
}

// Class is automatically global (no export needed in Stage 1)

