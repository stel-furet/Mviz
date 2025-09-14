class PredictiveBehaviorSystem {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.predictionHistory = [];
        this.userBehaviorPatterns = [];
        this.contextPredictions = [];
        this.predictionAccuracy = 0;
        this.lastPrediction = 0;
        this.predictionCooldown = 10000; // 10 seconds between predictions
        this.confidenceThreshold = 0.8; // Only act on high-confidence predictions
        this.anticipationWindow = 5000; // Look 5 seconds ahead
        
        this.loadPredictionData();
    }

    // Analyze audio context and predict optimal actions
    predictOptimalActions(audioFeatures, currentMode, currentParams) {
        const now = Date.now();
        if (now - this.lastPrediction < this.predictionCooldown) {
            return null;
        }

        try {
            const predictions = {
                modeChange: this.predictModeChange(audioFeatures, currentMode),
                parameterAdjustment: this.predictParameterAdjustment(audioFeatures, currentParams),
                timing: this.predictOptimalTiming(audioFeatures),
                confidence: 0
            };

            // Calculate overall confidence
            predictions.confidence = this.calculatePredictionConfidence(predictions, audioFeatures);
            
            // Only return predictions with high confidence
            if (predictions.confidence >= this.confidenceThreshold) {
                this.lastPrediction = now;
                this.recordPrediction(predictions, audioFeatures);
                return predictions;
            }

            return null;
        } catch (error) {
            console.error('Error in predictive behavior:', error);
            return null;
        }
    }

    // Predict if a mode change would be beneficial
    predictModeChange(audioFeatures, currentMode) {
        const { energy, beat, tempo, dominantFreq, energyTrend } = audioFeatures;
        
        // Analyze current mode effectiveness
        const currentModeEffectiveness = this.analyzeModeEffectiveness(currentMode, audioFeatures);
        
        // Predict better modes based on audio context
        const suggestedModes = this.getContextualModeSuggestions(audioFeatures);
        
        // Find the best alternative mode
        let bestMode = null;
        let bestScore = currentModeEffectiveness;
        
        for (const mode of suggestedModes) {
            if (mode !== currentMode) {
                const modeScore = this.analyzeModeEffectiveness(mode, audioFeatures);
                if (modeScore > bestScore) {
                    bestMode = mode;
                    bestScore = modeScore;
                }
            }
        }

        return {
            suggested: bestMode,
            confidence: bestMode ? Math.min(0.9, (bestScore - currentModeEffectiveness) * 2) : 0,
            reason: this.getModeChangeReason(bestMode, audioFeatures),
            timing: this.predictModeChangeTiming(audioFeatures)
        };
    }

    // Predict parameter adjustments that would improve performance
    predictParameterAdjustment(audioFeatures, currentParams) {
        const adjustments = {};
        const { energy, beat, tempo, dominantFreq } = audioFeatures;
        
        // Predict linearBoost adjustment
        if (energy > 0.7 && currentParams.linearBoost < 0.8) {
            adjustments.linearBoost = {
                suggested: Math.min(1.0, currentParams.linearBoost + 0.2),
                confidence: energy * 0.8,
                reason: 'High energy detected - boost linear response'
            };
        } else if (energy < 0.3 && currentParams.linearBoost > 0.3) {
            adjustments.linearBoost = {
                suggested: Math.max(0.1, currentParams.linearBoost - 0.2),
                confidence: (1 - energy) * 0.8,
                reason: 'Low energy detected - reduce linear boost'
            };
        }

        // Predict gradient adjustment
        if (beat && currentParams.gradient < 0.8) {
            adjustments.gradient = {
                suggested: Math.min(1.0, currentParams.gradient + 0.15),
                confidence: 0.7,
                reason: 'Beat detected - enhance gradient response'
            };
        }

        // Predict smoothing adjustment based on tempo
        if (tempo > 120 && currentParams.smoothing > 0.3) {
            adjustments.smoothing = {
                suggested: Math.max(0.1, currentParams.smoothing - 0.1),
                confidence: 0.6,
                reason: 'High tempo - reduce smoothing for responsiveness'
            };
        } else if (tempo < 80 && currentParams.smoothing < 0.7) {
            adjustments.smoothing = {
                suggested: Math.min(0.9, currentParams.smoothing + 0.1),
                confidence: 0.6,
                reason: 'Low tempo - increase smoothing for smoothness'
            };
        }

        return adjustments;
    }

    // Predict optimal timing for changes
    predictOptimalTiming(audioFeatures) {
        const { beat, energy, tempo } = audioFeatures;
        
        // Prefer timing changes on beats
        if (beat) {
            return {
                immediate: true,
                confidence: 0.9,
                reason: 'Beat detected - optimal timing for change'
            };
        }

        // For high energy, immediate changes are usually good
        if (energy > 0.7) {
            return {
                immediate: true,
                confidence: 0.7,
                reason: 'High energy - immediate change recommended'
            };
        }

        // For low energy, wait for a better moment
        return {
            immediate: false,
            confidence: 0.6,
            reason: 'Low energy - waiting for better timing',
            delay: 2000 // Wait 2 seconds
        };
    }

    // Analyze how effective a mode is for current audio context
    analyzeModeEffectiveness(mode, audioFeatures) {
        const { energy, beat, tempo, dominantFreq } = audioFeatures;
        let effectiveness = 0.5; // Base effectiveness

        // Mode-specific effectiveness analysis
        switch (mode) {
            case 0: // Spectrum/Bars
                effectiveness = energy * 0.8 + (beat ? 0.2 : 0);
                break;
            case 1: // Mirror Wave
                effectiveness = (1 - energy) * 0.7 + (tempo > 100 ? 0.3 : 0);
                break;
            case 2: // Classic LED
                effectiveness = beat ? 0.9 : 0.4;
                break;
            case 3: // Stereo
                effectiveness = 0.6 + (dominantFreq > 0.5 ? 0.3 : 0);
                break;
            case 4: // Radial Spectrum
                effectiveness = energy * 0.9 + (beat ? 0.1 : 0);
                break;
            case 5: // Energy
                effectiveness = energy * 1.0;
                break;
            case 6: // Mirror
                effectiveness = (1 - energy) * 0.8 + (tempo < 80 ? 0.2 : 0);
                break;
            case 7: // Kaleidoscope
                effectiveness = energy * 0.7 + (beat ? 0.3 : 0);
                break;
        }

        return Math.min(1.0, effectiveness);
    }

    // Get mode suggestions based on audio context
    getContextualModeSuggestions(audioFeatures) {
        const { energy, beat, tempo, dominantFreq } = audioFeatures;
        const suggestions = [];

        // High energy contexts
        if (energy > 0.7) {
            suggestions.push(0, 4, 5, 7); // Spectrum, Radial, Energy, Kaleidoscope
        }

        // Beat-heavy contexts
        if (beat) {
            suggestions.push(0, 2, 4, 5); // Spectrum, LED, Radial, Energy
        }

        // Low energy contexts
        if (energy < 0.3) {
            suggestions.push(1, 6); // Mirror Wave, Mirror
        }

        // High tempo contexts
        if (tempo > 120) {
            suggestions.push(0, 2, 4); // Spectrum, LED, Radial
        }

        // Low tempo contexts
        if (tempo < 80) {
            suggestions.push(1, 6, 7); // Mirror Wave, Mirror, Kaleidoscope
        }

        // Remove duplicates and return
        return [...new Set(suggestions)];
    }

    // Get reason for mode change suggestion
    getModeChangeReason(suggestedMode, audioFeatures) {
        const { energy, beat, tempo } = audioFeatures;
        
        if (!suggestedMode) return 'No change needed';
        
        const modeNames = {
            0: 'Spectrum', 1: 'Mirror Wave', 2: 'LED', 3: 'Stereo',
            4: 'Radial', 5: 'Energy', 6: 'Mirror', 7: 'Kaleidoscope'
        };

        let reason = `Switch to ${modeNames[suggestedMode]}`;
        
        if (energy > 0.7) reason += ' for high energy';
        else if (beat) reason += ' for beat response';
        else if (tempo > 120) reason += ' for high tempo';
        else if (tempo < 80) reason += ' for low tempo';
        
        return reason;
    }

    // Predict timing for mode changes
    predictModeChangeTiming(audioFeatures) {
        const { beat, energy } = audioFeatures;
        
        if (beat) return 'immediate';
        if (energy > 0.6) return 'soon';
        return 'wait';
    }

    // Calculate overall prediction confidence
    calculatePredictionConfidence(predictions, audioFeatures) {
        let totalConfidence = 0;
        let count = 0;

        if (predictions.modeChange && predictions.modeChange.confidence > 0) {
            totalConfidence += predictions.modeChange.confidence;
            count++;
        }

        if (predictions.parameterAdjustment && Object.keys(predictions.parameterAdjustment).length > 0) {
            const paramConfidences = Object.values(predictions.parameterAdjustment).map(p => p.confidence);
            totalConfidence += paramConfidences.reduce((a, b) => a + b, 0) / paramConfidences.length;
            count++;
        }

        if (predictions.timing && predictions.timing.confidence > 0) {
            totalConfidence += predictions.timing.confidence;
            count++;
        }

        return count > 0 ? totalConfidence / count : 0;
    }

    // Record prediction for learning
    recordPrediction(predictions, audioFeatures) {
        this.predictionHistory.push({
            timestamp: Date.now(),
            predictions,
            audioFeatures,
            executed: false
        });

        // Keep only last 100 predictions
        if (this.predictionHistory.length > 100) {
            this.predictionHistory.shift();
        }

        this.savePredictionData();
    }

    // Execute a prediction
    executePrediction(prediction) {
        try {
            // Execute mode change if suggested
            if (prediction.modeChange && prediction.modeChange.suggested !== null) {
                this.autopilot.visualizer.setVisualizationMode(prediction.modeChange.suggested);
                console.log(`🎯 Predictive mode change: ${prediction.modeChange.reason}`);
            }

            // Execute parameter adjustments
            if (prediction.parameterAdjustment) {
                for (const [param, adjustment] of Object.entries(prediction.parameterAdjustment)) {
                    if (adjustment.confidence > 0.6) {
                        this.autopilot.visualizer.audioMotion[param] = adjustment.suggested;
                        console.log(`🎯 Predictive parameter adjustment: ${param} = ${adjustment.suggested} (${adjustment.reason})`);
                    }
                }
            }

            // Mark as executed
            prediction.executed = true;
            this.updatePredictionAccuracy();

        } catch (error) {
            console.error('Error executing prediction:', error);
        }
    }

    // Update prediction accuracy based on user feedback
    updatePredictionAccuracy() {
        const recentPredictions = this.predictionHistory.slice(-20);
        const executedPredictions = recentPredictions.filter(p => p.executed);
        
        if (executedPredictions.length > 0) {
            // Simple accuracy calculation - could be enhanced with user feedback
            this.predictionAccuracy = executedPredictions.length / recentPredictions.length;
        }
    }

    // Get prediction analytics
    getPredictionAnalytics() {
        const totalPredictions = this.predictionHistory.length;
        const executedPredictions = this.predictionHistory.filter(p => p.executed).length;
        const recentAccuracy = this.predictionAccuracy * 100;

        return {
            totalPredictions,
            executedPredictions,
            accuracy: Math.round(recentAccuracy),
            confidence: Math.round(this.confidenceThreshold * 100)
        };
    }

    // Load prediction data from localStorage
    loadPredictionData() {
        try {
            const data = localStorage.getItem('autopilot_predictions');
            if (data) {
                const parsed = JSON.parse(data);
                this.predictionHistory = parsed.predictionHistory || [];
                this.predictionAccuracy = parsed.predictionAccuracy || 0;
            }
        } catch (error) {
            console.error('Error loading prediction data:', error);
        }
    }

    // Save prediction data to localStorage
    savePredictionData() {
        try {
            const data = {
                predictionHistory: this.predictionHistory.slice(-50), // Keep last 50
                predictionAccuracy: this.predictionAccuracy
            };
            localStorage.setItem('autopilot_predictions', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving prediction data:', error);
        }
    }
}

// Multi-layered Intelligence System for AI Autopilot
class MultiLayeredIntelligenceSystem {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.decisionLayers = {
            reactive: new ReactiveDecisionLayer(autopilot),
            predictive: new PredictiveDecisionLayer(autopilot),
            strategic: new StrategicDecisionLayer(autopilot)
        };
        this.metaLearning = new MetaLearningSystem(autopilot);
        this.conflictResolver = new ConflictResolver(autopilot);
        this.contextAnalyzer = new ContextAnalyzer(autopilot);
        
        this.decisionHistory = [];
        this.performanceMetrics = {};
        this.learningEnabled = true;
        
        this.loadIntelligenceData();
    }

    // Main decision-making orchestrator
    makeIntelligentDecision(audioFeatures, currentMode, currentParams) {
        try {
            // Check scope constraints first
            if (this.autopilot.scope === 'radial' || this.autopilot.scope === 'energy') {
                const expectedMode = this.autopilot.scope === 'radial' ? 4 : 5;
                if (currentMode !== expectedMode) {
                    console.log(`🧠 Multi-layer scope enforcement: Switching to ${this.autopilot.scope} mode (${expectedMode})`);
                    return {
                        action: 'mode_change',
                        mode: expectedMode,
                        confidence: 1.0,
                        sourceLayer: 'scope_enforcement',
                        reason: `Scope enforcement: ${this.autopilot.scope} mode required`
                    };
                }
                // If already in correct mode, only allow parameter adjustments
                return this.makeScopeConstrainedDecision(audioFeatures, currentMode, currentParams);
            }
            
            // Analyze current context
            const context = this.contextAnalyzer.analyzeContext(audioFeatures, currentMode, currentParams);
            
            // Get decisions from each layer
            const layerDecisions = this.getLayerDecisions(context, audioFeatures, currentMode, currentParams);
            
            // Resolve conflicts between layers
            const resolvedDecision = this.conflictResolver.resolveConflicts(layerDecisions, context);
            
            // Apply meta-learning to improve decision quality
            const finalDecision = this.metaLearning.enhanceDecision(resolvedDecision, context);
            
            // Execute the decision
            this.executeDecision(finalDecision, context);
            
            // Learn from the outcome
            if (this.learningEnabled) {
                this.learnFromDecision(finalDecision, context);
            }
            
            // Record decision for analysis
            this.recordDecision(finalDecision, context);
            
            return finalDecision;
            
        } catch (error) {
            console.error('Error in multi-layered intelligence:', error);
            return null;
        }
    }

    // Make decisions when scope is constrained to specific modes
    makeScopeConstrainedDecision(audioFeatures, currentMode, currentParams) {
        const { energy, beat, tempo, dominantFreq } = audioFeatures;
        
        // Only allow parameter adjustments for constrained scopes
        if (beat && energy > 0.5) {
            return {
                action: 'parameter_adjustment',
                parameters: {
                    linearBoost: Math.min(5.0, (this.autopilot.visualizer.audioMotion.linearBoost || 1.0) + 2.0),
                    gradient: Math.min(1.0, (this.autopilot.visualizer.audioMotion.gradient || 0.5) + 0.4),
                    fillAlpha: Math.min(1.0, (this.autopilot.visualizer.audioMotion.fillAlpha || 0.5) + 0.3),
                    volume: Math.min(3.0, (this.autopilot.visualizer.audioMotion.volume || 1.0) + 1.0),
                    peakHoldTime: Math.max(100, (this.autopilot.visualizer.audioMotion.peakHoldTime || 500) - 200)
                },
                confidence: 0.8,
                sourceLayer: 'scope_constrained',
                reason: 'Beat detected - enhancing parameters for constrained scope'
            };
        }
        
        if (energy > 0.8) {
            return {
                action: 'parameter_adjustment',
                parameters: {
                    linearBoost: Math.min(8.0, (this.autopilot.visualizer.audioMotion.linearBoost || 1.0) + 4.0),
                    gradient: Math.min(1.0, (this.autopilot.visualizer.audioMotion.gradient || 0.5) + 0.5),
                    fillAlpha: Math.min(1.0, (this.autopilot.visualizer.audioMotion.fillAlpha || 0.5) + 0.4),
                    volume: Math.min(5.0, (this.autopilot.visualizer.audioMotion.volume || 1.0) + 2.0),
                    smoothing: Math.max(0.1, (this.autopilot.visualizer.audioMotion.smoothing || 0.5) - 0.3),
                    peakHoldTime: Math.max(50, (this.autopilot.visualizer.audioMotion.peakHoldTime || 500) - 300)
                },
                confidence: 0.9,
                sourceLayer: 'scope_constrained',
                reason: 'High energy - maximizing parameters for constrained scope'
            };
        }
        
        if (energy < 0.3) {
            return {
                action: 'parameter_adjustment',
                parameters: {
                    smoothing: Math.min(0.9, (this.autopilot.visualizer.audioMotion.smoothing || 0.5) + 0.4),
                    fillAlpha: Math.max(0.1, (this.autopilot.visualizer.audioMotion.fillAlpha || 0.5) - 0.4),
                    linearBoost: Math.max(0.5, (this.autopilot.visualizer.audioMotion.linearBoost || 1.0) - 0.5),
                    volume: Math.max(0.5, (this.autopilot.visualizer.audioMotion.volume || 1.0) - 0.3),
                    peakHoldTime: Math.min(1000, (this.autopilot.visualizer.audioMotion.peakHoldTime || 500) + 300)
                },
                confidence: 0.7,
                sourceLayer: 'scope_constrained',
                reason: 'Low energy - smoothing parameters for constrained scope'
            };
        }
        
        // Add video effects for more dramatic changes
        if (energy > 0.6 && this.autopilot.videoEffectsEnabled) {
            return {
                action: 'video_adjustment',
                videoParameters: {
                    colorEffects: {
                        brightness: 1.0 + (energy * 0.5),
                        contrast: 1.0 + (energy * 0.3),
                        saturation: 1.0 + (energy * 0.4),
                        hue: energy * 30
                    }
                },
                confidence: 0.8,
                sourceLayer: 'scope_constrained',
                reason: 'High energy - applying video effects for constrained scope'
            };
        }
        
        return {
            action: 'no_action',
            confidence: 0.5,
            sourceLayer: 'scope_constrained',
            reason: 'No parameter adjustment needed for constrained scope'
        };
    }

    // Get decisions from all layers
    getLayerDecisions(context, audioFeatures, currentMode, currentParams) {
        const decisions = {};
        
        // Reactive layer - immediate responses
        decisions.reactive = this.decisionLayers.reactive.makeDecision(context, audioFeatures);
        
        // Predictive layer - future-focused decisions
        decisions.predictive = this.decisionLayers.predictive.makeDecision(context, audioFeatures);
        
        // Strategic layer - long-term optimization
        decisions.strategic = this.decisionLayers.strategic.makeDecision(context, audioFeatures);
        
        return decisions;
    }

    // Execute the final decision
    executeDecision(decision, context) {
        if (!decision || !decision.action) return;
        
        try {
            switch (decision.action) {
                case 'mode_change':
                    if (decision.mode !== undefined) {
                        this.autopilot.visualizer.setVisualizationMode(decision.mode);
                        console.log(`🧠 Multi-layer decision: Mode change to ${decision.mode}`);
                    }
                    break;
                    
                case 'parameter_adjustment':
                    if (decision.parameters) {
                        this.applyParameterAdjustments(decision.parameters);
                        console.log(`🧠 Multi-layer decision: Parameter adjustments applied`);
                    }
                    break;
                    
                case 'video_adjustment':
                    if (decision.videoParameters && this.autopilot.videoEffectsEnabled) {
                        this.applyVideoAdjustments(decision.videoParameters);
                        console.log(`🧠 Multi-layer decision: Video adjustments applied`);
                    }
                    break;
                    
                case 'timing_adjustment':
                    if (decision.timing) {
                        this.adjustTiming(decision.timing);
                        console.log(`🧠 Multi-layer decision: Timing adjusted`);
                    }
                    break;
                    
                case 'no_action':
                    console.log(`🧠 Multi-layer decision: No action needed`);
                    break;
            }
        } catch (error) {
            console.error('Error executing multi-layer decision:', error);
        }
    }

    // Apply parameter adjustments
    applyParameterAdjustments(parameters) {
        if (!this.autopilot.visualizer.audioMotion) {
            console.log('🧠 No audioMotion available for parameter adjustment');
            return;
        }
        
        console.log('🧠 Applying parameters:', parameters);
        console.log('🧠 Before - audioMotion params:', {
            linearBoost: this.autopilot.visualizer.audioMotion.linearBoost,
            gradient: this.autopilot.visualizer.audioMotion.gradient,
            fillAlpha: this.autopilot.visualizer.audioMotion.fillAlpha,
            smoothing: this.autopilot.visualizer.audioMotion.smoothing
        });
        
        try {
            // Use setOptions to properly apply parameter changes
            this.autopilot.visualizer.audioMotion.setOptions(parameters);
            console.log('🧠 Multi-layer parameters applied via setOptions:', parameters);
            
            // Force a redraw to ensure changes are visible
            if (this.autopilot.visualizer.audioMotion.ctx) {
                this.autopilot.visualizer.audioMotion.ctx.clearRect(0, 0, 
                    this.autopilot.visualizer.audioMotion.canvas.width, 
                    this.autopilot.visualizer.audioMotion.canvas.height);
            }
            
            // Verify the parameters were actually set
            setTimeout(() => {
                console.log('🧠 After - audioMotion params:', {
                    linearBoost: this.autopilot.visualizer.audioMotion.linearBoost,
                    gradient: this.autopilot.visualizer.audioMotion.gradient,
                    fillAlpha: this.autopilot.visualizer.audioMotion.fillAlpha,
                    smoothing: this.autopilot.visualizer.audioMotion.smoothing
                });
            }, 100);
            
        } catch (error) {
            console.error('Error applying multi-layer parameters via setOptions:', error);
            // Fallback to direct property setting
            console.log('🧠 Falling back to direct property setting');
            for (const [param, value] of Object.entries(parameters)) {
                if (this.autopilot.visualizer.audioMotion.hasOwnProperty(param)) {
                    this.autopilot.visualizer.audioMotion[param] = value;
                    console.log(`🧠 Set ${param} = ${value}`);
                } else {
                    console.log(`🧠 Property ${param} not found on audioMotion`);
                }
            }
        }
    }

    // Apply video adjustments
    applyVideoAdjustments(videoParameters) {
        if (!this.autopilot.parameterController) return;
        
        try {
            this.autopilot.parameterController.applyVideoParameters(videoParameters);
            console.log('🧠 Multi-layer video parameters applied:', videoParameters);
        } catch (error) {
            console.error('Error applying multi-layer video parameters:', error);
        }
    }

    // Adjust timing settings
    adjustTiming(timing) {
        if (timing.cooldown) {
            this.autopilot.decisionEngine.decisionCooldown = timing.cooldown;
        }
        if (timing.sensitivity) {
            this.autopilot.sensitivity = timing.sensitivity;
        }
    }

    // Learn from decision outcomes
    learnFromDecision(decision, context) {
        this.metaLearning.learnFromOutcome(decision, context);
        this.updatePerformanceMetrics(decision, context);
    }

    // Record decision for analysis
    recordDecision(decision, context) {
        this.decisionHistory.push({
            timestamp: Date.now(),
            decision,
            context,
            executed: true
        });
        
        // Keep only last 100 decisions
        if (this.decisionHistory.length > 100) {
            this.decisionHistory.shift();
        }
    }

    // Update performance metrics
    updatePerformanceMetrics(decision, context) {
        const layer = decision.sourceLayer || 'unknown';
        if (!this.performanceMetrics[layer]) {
            this.performanceMetrics[layer] = {
                totalDecisions: 0,
                successfulDecisions: 0,
                averageConfidence: 0
            };
        }
        
        this.performanceMetrics[layer].totalDecisions++;
        if (decision.confidence > 0.7) {
            this.performanceMetrics[layer].successfulDecisions++;
        }
        
        // Update average confidence
        const current = this.performanceMetrics[layer];
        current.averageConfidence = (current.averageConfidence * (current.totalDecisions - 1) + decision.confidence) / current.totalDecisions;
    }

    // Get intelligence analytics
    getIntelligenceAnalytics() {
        const totalDecisions = this.decisionHistory.length;
        const layerPerformance = {};
        
        for (const [layer, metrics] of Object.entries(this.performanceMetrics)) {
            layerPerformance[layer] = {
                successRate: metrics.totalDecisions > 0 ? 
                    (metrics.successfulDecisions / metrics.totalDecisions * 100).toFixed(1) : 0,
                averageConfidence: metrics.averageConfidence.toFixed(2),
                totalDecisions: metrics.totalDecisions
            };
        }
        
        return {
            totalDecisions,
            layerPerformance,
            metaLearningProgress: this.metaLearning.getLearningProgress()
        };
    }

    // Load intelligence data
    loadIntelligenceData() {
        try {
            const data = localStorage.getItem('autopilot_intelligence');
            if (data) {
                const parsed = JSON.parse(data);
                this.decisionHistory = parsed.decisionHistory || [];
                this.performanceMetrics = parsed.performanceMetrics || {};
            }
        } catch (error) {
            console.error('Error loading intelligence data:', error);
        }
    }

    // Save intelligence data
    saveIntelligenceData() {
        try {
            const data = {
                decisionHistory: this.decisionHistory.slice(-50),
                performanceMetrics: this.performanceMetrics
            };
            localStorage.setItem('autopilot_intelligence', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving intelligence data:', error);
        }
    }
}

// Reactive Decision Layer - Immediate responses
class ReactiveDecisionLayer {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.responseThreshold = 0.8;
    }

    makeDecision(context, audioFeatures) {
        const { energy, beat, tempo, dominantFreq } = audioFeatures;
        
        // High energy immediate response
        if (energy > 0.8) {
            return {
                action: 'mode_change',
                mode: this.getHighEnergyMode(context),
                confidence: energy,
                sourceLayer: 'reactive',
                reason: 'High energy detected - immediate response needed'
            };
        }
        
        // Beat detection response
        if (beat && energy > 0.5) {
            return {
                action: 'parameter_adjustment',
                parameters: {
                    linearBoost: Math.min(1.0, this.autopilot.visualizer.audioMotion.linearBoost + 0.2),
                    gradient: Math.min(1.0, this.autopilot.visualizer.audioMotion.gradient + 0.15)
                },
                confidence: 0.9,
                sourceLayer: 'reactive',
                reason: 'Beat detected - enhancing responsiveness'
            };
        }
        
        // Low energy response
        if (energy < 0.2) {
            return {
                action: 'parameter_adjustment',
                parameters: {
                    smoothing: Math.min(0.9, this.autopilot.visualizer.audioMotion.smoothing + 0.1),
                    fillAlpha: Math.max(0.1, this.autopilot.visualizer.audioMotion.fillAlpha - 0.1)
                },
                confidence: 0.8,
                sourceLayer: 'reactive',
                reason: 'Low energy - smoothing response'
            };
        }
        
        return {
            action: 'no_action',
            confidence: 0.5,
            sourceLayer: 'reactive',
            reason: 'No immediate response needed'
        };
    }

    getHighEnergyMode(context) {
        const highEnergyModes = [0, 4, 5, 7]; // Spectrum, Radial, Energy, Kaleidoscope
        return highEnergyModes[Math.floor(Math.random() * highEnergyModes.length)];
    }
}

// Predictive Decision Layer - Future-focused decisions
class PredictiveDecisionLayer {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.predictionWindow = 5000; // 5 seconds ahead
    }

    makeDecision(context, audioFeatures) {
        // Use existing predictive behavior system
        if (this.autopilot.predictiveBehavior) {
            const predictions = this.autopilot.predictiveBehavior.predictOptimalActions(
                audioFeatures,
                this.autopilot.visualizer.currentMode,
                this.autopilot.getCurrentParameters()
            );
            
            if (predictions && predictions.confidence >= 0.8) {
                return {
                    action: predictions.modeChange ? 'mode_change' : 'parameter_adjustment',
                    mode: predictions.modeChange?.suggested,
                    parameters: predictions.parameterAdjustment,
                    confidence: predictions.confidence,
                    sourceLayer: 'predictive',
                    reason: predictions.modeChange?.reason || 'Predictive parameter optimization'
                };
            }
        }
        
        return {
            action: 'no_action',
            confidence: 0.3,
            sourceLayer: 'predictive',
            reason: 'No high-confidence predictions available'
        };
    }
}

// Strategic Decision Layer - Long-term optimization
class StrategicDecisionLayer {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.optimizationHorizon = 30000; // 30 seconds
    }

    makeDecision(context, audioFeatures) {
        // Use adaptive tuning for strategic decisions
        if (this.autopilot.adaptiveTuning) {
            const tuningAnalytics = this.autopilot.adaptiveTuning.getOptimizationAnalytics();
            
            if (tuningAnalytics.currentPerformance < 0.6) {
                return {
                    action: 'parameter_adjustment',
                    parameters: this.getStrategicOptimizations(context),
                    confidence: 0.7,
                    sourceLayer: 'strategic',
                    reason: 'Strategic optimization needed - performance below threshold'
                };
            }
        }
        
        // Use pattern learning for strategic decisions
        if (this.autopilot.patternLearning) {
            const recommendations = this.autopilot.patternLearning.getPatternRecommendations(
                context.genre || 'unknown',
                audioFeatures
            );
            
            if (recommendations && recommendations.confidence > 0.6) {
                return {
                    action: 'parameter_adjustment',
                    parameters: recommendations.parameters,
                    confidence: recommendations.confidence,
                    sourceLayer: 'strategic',
                    reason: 'Strategic pattern-based optimization'
                };
            }
        }
        
        return {
            action: 'no_action',
            confidence: 0.4,
            sourceLayer: 'strategic',
            reason: 'No strategic optimization needed'
        };
    }

    getStrategicOptimizations(context) {
        // Strategic parameter adjustments based on context
        const optimizations = {};
        
        if (context.energy > 0.7) {
            optimizations.linearBoost = 0.8;
            optimizations.gradient = 0.7;
        } else if (context.energy < 0.3) {
            optimizations.smoothing = 0.8;
            optimizations.fillAlpha = 0.3;
        }
        
        return optimizations;
    }
}

// Context Analyzer - Determines decision context
class ContextAnalyzer {
    constructor(autopilot) {
        this.autopilot = autopilot;
    }

    analyzeContext(audioFeatures, currentMode, currentParams) {
        const { energy, beat, tempo, dominantFreq } = audioFeatures;
        
        return {
            energy: energy,
            beat: beat,
            tempo: tempo,
            dominantFreq: dominantFreq,
            currentMode: currentMode,
            currentParams: currentParams,
            genre: this.autopilot.genreDetector?.detectedGenre?.genre || 'unknown',
            timeOfDay: this.getTimeOfDay(),
            sessionDuration: this.getSessionDuration(),
            userEngagement: this.getUserEngagement(),
            systemLoad: this.getSystemLoad()
        };
    }

    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 6) return 'night';
        if (hour < 12) return 'morning';
        if (hour < 18) return 'afternoon';
        return 'evening';
    }

    getSessionDuration() {
        return Date.now() - (this.autopilot.sessionStartTime || Date.now());
    }

    getUserEngagement() {
        // Calculate based on recent user interactions
        const recentFeedback = this.autopilot.parameterController?.feedbackHistory?.slice(-10) || [];
        return recentFeedback.length > 0 ? 'high' : 'low';
    }

    getSystemLoad() {
        // Simple system load estimation
        return this.autopilot.decisionHistory?.length > 50 ? 'high' : 'low';
    }
}

// Conflict Resolver - Resolves disagreements between layers
class ConflictResolver {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.layerPriorities = {
            reactive: 1,    // Highest priority for immediate responses
            predictive: 2,  // Medium priority for predictions
            strategic: 3    // Lowest priority for long-term planning
        };
    }

    resolveConflicts(layerDecisions, context) {
        const validDecisions = Object.entries(layerDecisions)
            .filter(([layer, decision]) => decision.action !== 'no_action')
            .map(([layer, decision]) => ({ ...decision, layer }));
        
        if (validDecisions.length === 0) {
            return { action: 'no_action', confidence: 0.5, sourceLayer: 'conflict_resolver' };
        }
        
        if (validDecisions.length === 1) {
            return validDecisions[0];
        }
        
        // Resolve conflicts based on priority and confidence
        const sortedDecisions = validDecisions.sort((a, b) => {
            const priorityA = this.layerPriorities[a.sourceLayer] || 999;
            const priorityB = this.layerPriorities[b.sourceLayer] || 999;
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB; // Lower number = higher priority
            }
            
            return b.confidence - a.confidence; // Higher confidence wins
        });
        
        const winningDecision = sortedDecisions[0];
        
        // Merge compatible decisions
        const mergedDecision = this.mergeCompatibleDecisions(sortedDecisions);
        
        return {
            ...winningDecision,
            mergedFrom: sortedDecisions.map(d => d.sourceLayer),
            reason: `Resolved conflict between ${sortedDecisions.map(d => d.sourceLayer).join(', ')}`
        };
    }

    mergeCompatibleDecisions(decisions) {
        const merged = { ...decisions[0] };
        
        // Merge parameter adjustments
        const parameterDecisions = decisions.filter(d => d.action === 'parameter_adjustment');
        if (parameterDecisions.length > 1) {
            merged.parameters = {};
            parameterDecisions.forEach(decision => {
                if (decision.parameters) {
                    Object.assign(merged.parameters, decision.parameters);
                }
            });
        }
        
        return merged;
    }
}

// Meta-Learning System - Learns how to learn better
class MetaLearningSystem {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.learningHistory = [];
        this.effectivenessScores = {};
        this.learningProgress = 0;
    }

    enhanceDecision(decision, context) {
        // Apply meta-learning insights to improve decision
        const enhancedDecision = { ...decision };
        
        // Adjust confidence based on historical effectiveness
        if (this.effectivenessScores[decision.sourceLayer]) {
            const effectiveness = this.effectivenessScores[decision.sourceLayer];
            enhancedDecision.confidence *= effectiveness;
        }
        
        // Add meta-learning insights
        enhancedDecision.metaInsights = this.getMetaInsights(context);
        
        return enhancedDecision;
    }

    learnFromOutcome(decision, context) {
        // Learn from decision outcomes to improve future decisions
        this.learningHistory.push({
            timestamp: Date.now(),
            decision,
            context,
            outcome: null // Will be updated when outcome is known
        });
        
        // Update effectiveness scores
        this.updateEffectivenessScores(decision);
        
        // Update learning progress
        this.updateLearningProgress();
    }

    updateEffectivenessScores(decision) {
        const layer = decision.sourceLayer;
        if (!this.effectivenessScores[layer]) {
            this.effectivenessScores[layer] = 0.5;
        }
        
        // Simple effectiveness calculation based on confidence
        const effectiveness = decision.confidence > 0.8 ? 1.0 : decision.confidence;
        this.effectivenessScores[layer] = (this.effectivenessScores[layer] + effectiveness) / 2;
    }

    updateLearningProgress() {
        const totalDecisions = this.learningHistory.length;
        const effectiveDecisions = this.learningHistory.filter(h => h.decision.confidence > 0.7).length;
        
        this.learningProgress = totalDecisions > 0 ? (effectiveDecisions / totalDecisions) * 100 : 0;
    }

    getMetaInsights(context) {
        const insights = [];
        
        if (context.userEngagement === 'high') {
            insights.push('High user engagement - prioritize user preferences');
        }
        
        if (context.systemLoad === 'high') {
            insights.push('High system load - use conservative decisions');
        }
        
        if (context.sessionDuration > 300000) { // 5 minutes
            insights.push('Long session - consider variety in decisions');
        }
        
        return insights;
    }

    getLearningProgress() {
        return {
            progress: Math.round(this.learningProgress),
            totalDecisions: this.learningHistory.length,
            effectivenessScores: { ...this.effectivenessScores }
        };
    }
}

// Adaptive Parameter Tuning System for AI Autopilot
class AdaptiveTuningSystem {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.tuningData = this.loadTuningData();
        this.performanceHistory = this.tuningData.performanceHistory || [];
        this.optimizationTargets = this.tuningData.optimizationTargets || {};
        this.abTests = this.tuningData.abTests || [];
        
        // Tuning configuration
        this.optimizationInterval = 30000; // 30 seconds between optimizations
        this.minSamplesForOptimization = 10;
        this.maxOptimizationHistory = 500;
        this.learningRate = 0.1;
        this.explorationRate = 0.2; // 20% chance to try new parameters
        
        // Performance tracking
        this.currentPerformance = 0;
        this.performanceWindow = [];
        this.lastOptimization = 0;
        
        console.log('🎯 Adaptive Tuning System initialized');
    }
    
    // Track performance of current parameters
    trackPerformance(audioFeatures, userFeedback = null) {
        const performance = this.calculatePerformance(audioFeatures, userFeedback);
        
        this.performanceWindow.push({
            performance: performance,
            timestamp: Date.now(),
            audioFeatures: { ...audioFeatures },
            userFeedback: userFeedback
        });
        
        // Keep only recent performance data (last 100 samples)
        if (this.performanceWindow.length > 100) {
            this.performanceWindow = this.performanceWindow.slice(-100);
        }
        
        this.currentPerformance = performance;
        
        // Check if we should optimize
        if (this.shouldOptimize()) {
            this.optimizeParameters();
        }
    }
    
    // Calculate performance score based on audio and user feedback
    calculatePerformance(audioFeatures, userFeedback) {
        let score = 0;
        
        // Audio-based performance (60% weight)
        const energy = audioFeatures.energy || 0;
        const beat = audioFeatures.beat || false;
        const tempo = audioFeatures.tempo || 0;
        
        score += energy * 0.3; // Energy response
        if (beat) score += 0.2; // Beat detection
        score += Math.min(tempo / 200, 0.1); // Tempo stability
        
        // User feedback (40% weight)
        if (userFeedback === 'positive') {
            score += 0.4;
        } else if (userFeedback === 'negative') {
            score -= 0.2;
        }
        
        // Smooth the score
        return Math.max(0, Math.min(1, score));
    }
    
    // Check if we should run optimization
    shouldOptimize() {
        const now = Date.now();
        const hasEnoughSamples = this.performanceWindow.length >= this.minSamplesForOptimization;
        const enoughTimePassed = now - this.lastOptimization > this.optimizationInterval;
        
        return hasEnoughSamples && enoughTimePassed;
    }
    
    // Optimize parameters based on performance history
    optimizeParameters(forced = false) {
        try {
            console.log('🎯 Starting parameter optimization...', forced ? '(FORCED)' : '');
            
            // Analyze current performance trends
            const performanceAnalysis = this.analyzePerformance();
            
            // Get current parameters
            const currentParams = this.getCurrentParameters();
            console.log('🎯 Current parameters:', currentParams);
            
            // Generate optimization suggestions
            const optimizations = this.generateOptimizations(currentParams, performanceAnalysis, forced);
            console.log('🎯 Generated optimizations:', optimizations);
            
            // Apply optimizations
            this.applyOptimizations(optimizations);
            
            // Record optimization
            this.recordOptimization(optimizations, performanceAnalysis);
            
            this.lastOptimization = Date.now();
            
            console.log('🎯 Parameter optimization completed');
            
        } catch (error) {
            console.error('Error in parameter optimization:', error);
        }
    }
    
    // Analyze performance trends
    analyzePerformance() {
        if (this.performanceWindow.length < 5) {
            return { trend: 'stable', avgPerformance: 0.5 };
        }
        
        const recent = this.performanceWindow.slice(-10);
        const older = this.performanceWindow.slice(-20, -10);
        
        const recentAvg = recent.reduce((sum, p) => sum + p.performance, 0) / recent.length;
        const olderAvg = older.length > 0 ? 
            older.reduce((sum, p) => sum + p.performance, 0) / older.length : recentAvg;
        
        const trend = recentAvg > olderAvg + 0.1 ? 'improving' : 
                     recentAvg < olderAvg - 0.1 ? 'declining' : 'stable';
        
        return {
            trend: trend,
            avgPerformance: recentAvg,
            recentPerformance: recentAvg,
            olderPerformance: olderAvg,
            sampleCount: this.performanceWindow.length
        };
    }
    
    // Generate optimization suggestions
    generateOptimizations(currentParams, performanceAnalysis, forced = false) {
        const optimizations = {};
        
        // Define parameter ranges for optimization
        const parameterRanges = {
            linearBoost: { min: 0.5, max: 2.0, step: 0.1 },
            gradient: { min: 0, max: 1, step: 0.1 },
            fillAlpha: { min: 0.1, max: 1, step: 0.1 },
            peakHoldTime: { min: 0, max: 1, step: 0.1 },
            smoothing: { min: 0, max: 1, step: 0.1 },
            maxDecibels: { min: -60, max: -10, step: 5 },
            minFreq: { min: 20, max: 2000, step: 50 }
        };
        
        // Apply different optimization strategies based on performance trend
        Object.keys(parameterRanges).forEach(paramName => {
            const currentValue = currentParams[paramName] || 0.5;
            const range = parameterRanges[paramName];
            
            let newValue = currentValue;
            
            if (forced) {
                // When forced, always make a change for demonstration
                newValue = this.exploreParameterSpace(paramName, currentValue, range, 0.2);
            } else if (performanceAnalysis.trend === 'declining') {
                // Try more aggressive changes when performance is declining
                newValue = this.exploreParameterSpace(paramName, currentValue, range, 0.3);
            } else if (performanceAnalysis.trend === 'improving') {
                // Fine-tune when performance is improving
                newValue = this.fineTuneParameter(paramName, currentValue, range, 0.1);
            } else {
                // Stable performance - try small improvements
                newValue = this.exploreParameterSpace(paramName, currentValue, range, 0.15);
            }
            
            // Only change if the difference is significant (or if forced)
            if (forced || Math.abs(newValue - currentValue) > range.step) {
                optimizations[paramName] = newValue;
            }
        });
        
        return optimizations;
    }
    
    // Explore parameter space for better values
    exploreParameterSpace(paramName, currentValue, range, explorationRate) {
        // 20% chance to try a completely new value
        if (Math.random() < this.explorationRate) {
            return range.min + Math.random() * (range.max - range.min);
        }
        
        // Otherwise, make a small adjustment
        const adjustment = (Math.random() - 0.5) * explorationRate * (range.max - range.min);
        return Math.max(range.min, Math.min(range.max, currentValue + adjustment));
    }
    
    // Fine-tune parameter with small adjustments
    fineTuneParameter(paramName, currentValue, range, tuningRate) {
        const adjustment = (Math.random() - 0.5) * tuningRate * (range.max - range.min);
        return Math.max(range.min, Math.min(range.max, currentValue + adjustment));
    }
    
    // Apply optimizations to the visualizer
    applyOptimizations(optimizations) {
        if (Object.keys(optimizations).length === 0) return;
        
        if (this.autopilot.visualizer.audioMotion) {
            this.autopilot.visualizer.audioMotion.setOptions(optimizations);
            console.log('🎯 Applied optimizations:', optimizations);
        }
    }
    
    // Record optimization for future analysis
    recordOptimization(optimizations, performanceAnalysis) {
        const optimization = {
            timestamp: Date.now(),
            optimizations: { ...optimizations },
            performanceBefore: performanceAnalysis.avgPerformance,
            performanceTrend: performanceAnalysis.trend,
            sampleCount: performanceAnalysis.sampleCount
        };
        
        this.performanceHistory.push(optimization);
        
        // Keep only recent history
        if (this.performanceHistory.length > this.maxOptimizationHistory) {
            this.performanceHistory = this.performanceHistory.slice(-this.maxOptimizationHistory);
        }
        
        // Save tuning data
        this.saveTuningData();
    }
    
    // Get current parameter values
    getCurrentParameters() {
        if (!this.autopilot.visualizer.audioMotion) return {};
        
        // Get parameters from the visualizer's current configuration
        const audioMotion = this.autopilot.visualizer.audioMotion;
        
        return {
            linearBoost: audioMotion.linearBoost || 1.0,
            gradient: audioMotion.gradient || 0.5,
            fillAlpha: audioMotion.fillAlpha || 0.8,
            peakHoldTime: audioMotion.peakHoldTime || 0.5,
            smoothing: audioMotion.smoothing || 0.5,
            maxDecibels: audioMotion.maxDecibels || -30,
            minFreq: audioMotion.minFreq || 20
        };
    }
    
    // Get optimization analytics
    getOptimizationAnalytics() {
        const totalOptimizations = this.performanceHistory.length;
        const recentOptimizations = this.performanceHistory.slice(-10);
        
        const avgPerformance = this.performanceWindow.length > 0 ?
            this.performanceWindow.reduce((sum, p) => sum + p.performance, 0) / this.performanceWindow.length : 0;
        
        const performanceTrend = this.analyzePerformance();
        
        return {
            totalOptimizations: totalOptimizations,
            currentPerformance: avgPerformance,
            performanceTrend: performanceTrend.trend,
            recentOptimizations: recentOptimizations.length,
            optimizationFrequency: totalOptimizations > 0 ? 
                (Date.now() - this.performanceHistory[0].timestamp) / (totalOptimizations * 1000) : 0
        };
    }
    
    // Data persistence
    loadTuningData() {
        try {
            const saved = localStorage.getItem('autopilot_adaptive_tuning');
            return saved ? JSON.parse(saved) : { 
                performanceHistory: [], 
                optimizationTargets: {}, 
                abTests: [] 
            };
        } catch (error) {
            console.warn('Could not load tuning data:', error);
            return { performanceHistory: [], optimizationTargets: {}, abTests: [] };
        }
    }
    
    saveTuningData() {
        try {
            const data = {
                performanceHistory: this.performanceHistory,
                optimizationTargets: this.optimizationTargets,
                abTests: this.abTests,
                lastSaved: Date.now()
            };
            localStorage.setItem('autopilot_adaptive_tuning', JSON.stringify(data));
        } catch (error) {
            console.warn('Could not save tuning data:', error);
        }
    }
}

// Pattern Learning System for AI Autopilot
class PatternLearningSystem {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.learningData = this.loadLearningData();
        this.patterns = this.learningData.patterns || {};
        this.userBehavior = this.learningData.userBehavior || {};
        this.performanceMetrics = this.learningData.performanceMetrics || {};
        
        // Learning configuration
        this.learningRate = 0.1; // How quickly to adapt to new patterns
        this.minSamples = 5; // Minimum samples before making predictions
        this.maxHistory = 1000; // Maximum stored samples per pattern
        
        console.log('🧠 Pattern Learning System initialized');
    }
    
    // Learn from successful parameter combinations
    learnFromSuccess(genre, audioFeatures, parameters, effectiveness) {
        const patternKey = this.getPatternKey(genre, audioFeatures);
        
        if (!this.patterns[patternKey]) {
            this.patterns[patternKey] = {
                samples: [],
                successRate: 0,
                avgEffectiveness: 0,
                lastUpdated: Date.now()
            };
        }
        
        const pattern = this.patterns[patternKey];
        
        // Add new sample
        pattern.samples.push({
            parameters: { ...parameters },
            effectiveness: effectiveness,
            timestamp: Date.now()
        });
        
        // Keep only recent samples
        if (pattern.samples.length > this.maxHistory) {
            pattern.samples = pattern.samples.slice(-this.maxHistory);
        }
        
        // Update success rate and average effectiveness
        this.updatePatternMetrics(pattern);
        
        // Save learning data
        this.saveLearningData();
        
        console.log(`🧠 Learned pattern for ${patternKey}:`, {
            samples: pattern.samples.length,
            successRate: pattern.successRate.toFixed(3),
            avgEffectiveness: pattern.avgEffectiveness.toFixed(3)
        });
    }
    
    // Get pattern-based parameter recommendations
    getPatternRecommendations(genre, audioFeatures) {
        const patternKey = this.getPatternKey(genre, audioFeatures);
        const pattern = this.patterns[patternKey];
        
        if (!pattern || pattern.samples.length < this.minSamples) {
            return null; // Not enough data for recommendations
        }
        
        // Find most effective parameter combinations
        const effectiveSamples = pattern.samples
            .filter(s => s.effectiveness > pattern.avgEffectiveness)
            .sort((a, b) => b.effectiveness - a.effectiveness)
            .slice(0, 5); // Top 5 most effective
        
        if (effectiveSamples.length === 0) {
            return null;
        }
        
        // Calculate weighted average of effective parameters
        const recommendations = this.calculateWeightedAverage(effectiveSamples);
        
        console.log(`🧠 Pattern recommendations for ${patternKey}:`, recommendations);
        
        return {
            confidence: pattern.successRate,
            parameters: recommendations,
            source: 'pattern_learning'
        };
    }
    
    // Learn from user behavior patterns
    learnFromUserBehavior(action, context, outcome) {
        const behaviorKey = `${action}_${context}`;
        
        if (!this.userBehavior[behaviorKey]) {
            this.userBehavior[behaviorKey] = {
                totalActions: 0,
                positiveOutcomes: 0,
                contexts: [],
                lastAction: Date.now()
            };
        }
        
        const behavior = this.userBehavior[behaviorKey];
        behavior.totalActions++;
        
        if (outcome === 'positive') {
            behavior.positiveOutcomes++;
        }
        
        behavior.contexts.push({
            context: { ...context },
            outcome: outcome,
            timestamp: Date.now()
        });
        
        // Keep only recent contexts
        if (behavior.contexts.length > 100) {
            behavior.contexts = behavior.contexts.slice(-100);
        }
        
        behavior.lastAction = Date.now();
        
        console.log(`🧠 Learned user behavior: ${behaviorKey}`, {
            totalActions: behavior.totalActions,
            successRate: (behavior.positiveOutcomes / behavior.totalActions).toFixed(3)
        });
    }
    
    // Get user behavior predictions
    predictUserPreference(action, context) {
        const behaviorKey = `${action}_${context}`;
        const behavior = this.userBehavior[behaviorKey];
        
        if (!behavior || behavior.totalActions < 3) {
            return null; // Not enough data
        }
        
        const successRate = behavior.positiveOutcomes / behavior.totalActions;
        
        return {
            action: action,
            context: context,
            predictedPreference: successRate > 0.6 ? 'positive' : 'negative',
            confidence: Math.abs(successRate - 0.5) * 2, // 0-1 confidence
            totalActions: behavior.totalActions
        };
    }
    
    // Helper methods
    getPatternKey(genre, audioFeatures) {
        const energyLevel = audioFeatures.energy > 0.7 ? 'high' : audioFeatures.energy > 0.4 ? 'medium' : 'low';
        const tempoCategory = audioFeatures.tempo > 140 ? 'fast' : audioFeatures.tempo > 100 ? 'medium' : 'slow';
        return `${genre}_${energyLevel}_${tempoCategory}`;
    }
    
    updatePatternMetrics(pattern) {
        if (pattern.samples.length === 0) return;
        
        const totalEffectiveness = pattern.samples.reduce((sum, sample) => sum + sample.effectiveness, 0);
        pattern.avgEffectiveness = totalEffectiveness / pattern.samples.length;
        
        const successfulSamples = pattern.samples.filter(s => s.effectiveness > 0.7).length;
        pattern.successRate = successfulSamples / pattern.samples.length;
        pattern.lastUpdated = Date.now();
    }
    
    calculateWeightedAverage(samples) {
        const weights = samples.map(s => s.effectiveness);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        
        const avgParams = {};
        const paramKeys = Object.keys(samples[0].parameters);
        
        paramKeys.forEach(key => {
            const weightedSum = samples.reduce((sum, sample, index) => {
                return sum + (sample.parameters[key] * weights[index]);
            }, 0);
            avgParams[key] = weightedSum / totalWeight;
        });
        
        return avgParams;
    }
    
    // Data persistence
    loadLearningData() {
        try {
            const saved = localStorage.getItem('autopilot_ml_patterns');
            return saved ? JSON.parse(saved) : { patterns: {}, userBehavior: {}, performanceMetrics: {} };
        } catch (error) {
            console.warn('Could not load learning data:', error);
            return { patterns: {}, userBehavior: {}, performanceMetrics: {} };
        }
    }
    
    saveLearningData() {
        try {
            const data = {
                patterns: this.patterns,
                userBehavior: this.userBehavior,
                performanceMetrics: this.performanceMetrics,
                lastSaved: Date.now()
            };
            localStorage.setItem('autopilot_ml_patterns', JSON.stringify(data));
        } catch (error) {
            console.warn('Could not save learning data:', error);
        }
    }
    
    // Get learning analytics
    getLearningAnalytics() {
        const totalPatterns = Object.keys(this.patterns).length;
        const totalSamples = Object.values(this.patterns).reduce((sum, pattern) => sum + pattern.samples.length, 0);
        const avgSuccessRate = totalPatterns > 0 ? 
            Object.values(this.patterns).reduce((sum, pattern) => sum + pattern.successRate, 0) / totalPatterns : 0;
        
        const totalBehaviors = Object.keys(this.userBehavior).length;
        const totalActions = Object.values(this.userBehavior).reduce((sum, behavior) => sum + behavior.totalActions, 0);
        
        return {
            patterns: {
                total: totalPatterns,
                samples: totalSamples,
                avgSuccessRate: avgSuccessRate
            },
            userBehavior: {
                total: totalBehaviors,
                actions: totalActions
            },
            learningProgress: Math.min(totalSamples / 100, 1) // 0-1 progress indicator
        };
    }
}

