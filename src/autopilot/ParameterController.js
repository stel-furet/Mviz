/**
 * Parameter Controller
 * Manages visualization parameter changes for autopilot system
 * 
 * Dependencies: None (standalone class)
 * Used by: AIAutopilot (in audio-system.js)
 * 
 * Extracted from main.js as part of Stage 1: Global Classes Split
 */

class ParameterController {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.visualizer = autopilot.visualizer;
        this.currentParameters = {};
        this.parameterHistory = [];
        
        // User feedback learning
        this.userAdjustments = [];
        this.feedbackHistory = [];
        this.lastUserAdjustment = null;
        this.adjustmentThreshold = 0.1; // Minimum change to consider significant
        
    }
    
    applyParameterChanges(recommendations) {
        if (!this.visualizer.audioMotion) return;
        
        try {
            // Apply visualization parameters
            const vizParams = this.convertToAudioMotionParams(recommendations.visualization);
            this.visualizer.audioMotion.setOptions(vizParams);
            
            // Apply video parameters
            if (recommendations.video && this.autopilot.videoEffectsEnabled) {
                this.applyVideoParameters(recommendations.video);
            }
            
            // Record parameter change
            this.recordParameterChange(recommendations);
            
        } catch (error) {
            console.error('Error applying parameters:', error);
        }
    }
    
    convertToAudioMotionParams(params) {
        const audioMotionParams = {};
        const scope = this.autopilot.scope;
        
        // Convert each parameter to AudioMotion format
        for (const [paramName, value] of Object.entries(params)) {
            let paramDef = null;
            
            // If scope is 'all', check all scopes for parameter definitions
            if (scope === 'all') {
                for (const scopeName of ['bars', 'radial', 'energy', 'global']) {
                    const scopeParams = VISUALIZATION_PARAMETERS[scopeName] || {};
                    if (scopeParams[paramName]) {
                        paramDef = scopeParams[paramName];
                        break;
                    }
                }
            } else {
                // For specific scopes, check that scope first, then global
                const scopeParams = VISUALIZATION_PARAMETERS[scope] || {};
                paramDef = scopeParams[paramName] || VISUALIZATION_PARAMETERS.global[paramName];
            }
            
            if (paramDef && paramDef.audioMotion) {
                const audioMotionParam = paramDef.audioMotion;
                audioMotionParams[audioMotionParam] = this.convertParameterValue(value, paramDef);
            }
        }
        
        return audioMotionParams;
    }
    
    convertParameterValue(value, paramDef) {
        switch (paramDef.type) {
            case 'float':
                return Math.max(paramDef.min, Math.min(paramDef.max, value));
            case 'int':
                const intValue = Math.round(Math.max(paramDef.min, Math.min(paramDef.max, value)));
                // Special handling for fftSize - must be power of 2
                if (paramDef.audioMotion === 'fftSize') {
                    return this.getNearestPowerOfTwo(intValue);
                }
                return intValue;
            case 'boolean':
                return Boolean(value);
            case 'enum':
                return paramDef.values.includes(value) ? value : paramDef.default;
            case 'color':
                return value;
            default:
                return value;
        }
    }
    
    getNearestPowerOfTwo(value) {
        const powersOfTwo = [64, 128, 256, 512, 1024, 2048, 4096, 8192];
        return powersOfTwo.reduce((prev, curr) => 
            Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
        );
    }
    
    applyVideoParameters(videoParams) {
        // Apply video effects to the video element
        const videoElement = this.visualizer.videoElement;
        if (!videoElement) {
            return;
        }
        
        let filterString = '';
        
        // Apply color effects
        if (videoParams.colorEffects) {
            const effects = videoParams.colorEffects;
            if (effects.grayscale > 0) {
                filterString += `grayscale(${effects.grayscale * 100}%) `;
            }
            if (effects.sepia > 0) {
                filterString += `sepia(${effects.sepia * 100}%) `;
            }
            if (effects.invert > 0) {
                filterString += `invert(${effects.invert * 100}%) `;
            }
            if (effects.hue !== 0) {
                filterString += `hue-rotate(${effects.hue}deg) `;
            }
            if (effects.saturation !== 1) {
                filterString += `saturate(${effects.saturation}) `;
            }
            if (effects.brightness !== 1) {
                filterString += `brightness(${effects.brightness}) `;
            }
            if (effects.contrast !== 1) {
                filterString += `contrast(${effects.contrast}) `;
            }
        }
        
        // Apply artistic effects
        if (videoParams.artisticEffects) {
            const effects = videoParams.artisticEffects;
            if (effects.posterize > 0) {
                // Note: CSS doesn't have posterize, this would need custom implementation
                filterString += `contrast(${1 + effects.posterize}) `;
            }
            if (effects.blur > 0) {
                filterString += `blur(${effects.blur}px) `;
            }
            if (effects.sharpen > 0) {
                filterString += `contrast(${1 + effects.sharpen}) `;
            }
        }
        
        videoElement.style.filter = filterString.trim();
    }
    
    recordParameterChange(recommendations) {
        this.parameterHistory.push({
            timestamp: Date.now(),
            parameters: recommendations,
            scope: this.autopilot.scope,
            genre: this.autopilot.currentGenre
        });
        
        // Keep only recent history (last 50 changes)
        if (this.parameterHistory.length > 50) {
            this.parameterHistory = this.parameterHistory.slice(-50);
        }
    }
    
    // Track user manual parameter adjustments
    trackUserAdjustment(parameterName, oldValue, newValue, context) {
        const change = Math.abs(newValue - oldValue);
        
        // Only track significant changes
        if (change < this.adjustmentThreshold) return;
        
        const adjustment = {
            parameter: parameterName,
            oldValue: oldValue,
            newValue: newValue,
            change: change,
            direction: newValue > oldValue ? 'increase' : 'decrease',
            timestamp: Date.now(),
            context: context || {}
        };
        
        this.userAdjustments.push(adjustment);
        this.lastUserAdjustment = adjustment;
        
        // Keep only recent adjustments (last 100)
        if (this.userAdjustments.length > 100) {
            this.userAdjustments = this.userAdjustments.slice(-100);
        }
        
        // Learn from this adjustment
        this.learnFromUserAdjustment(adjustment);
        
        // console.log(`👤 User adjusted ${parameterName}: ${oldValue.toFixed(3)} → ${newValue.toFixed(3)}`);
    }
    
    // Learn from user adjustments
    learnFromUserAdjustment(adjustment) {
        if (!this.autopilot.patternLearning) return;
        
        const context = {
            genre: this.autopilot.currentGenre,
            energy: this.autopilot.audioAnalyzer.getEnergy(),
            tempo: this.autopilot.audioAnalyzer.getTempo(),
            parameter: adjustment.parameter,
            direction: adjustment.direction
        };
        
        // Learn that user prefers this adjustment in this context
        this.autopilot.patternLearning.learnFromUserBehavior(
            'parameter_adjustment',
            JSON.stringify(context),
            'positive' // User made the change, so they prefer it
        );
        
        // Store the adjustment pattern for future recommendations
        this.storeAdjustmentPattern(adjustment, context);
    }
    
    // Store adjustment patterns for future use
    storeAdjustmentPattern(adjustment, context) {
        const patternKey = `${context.genre}_${adjustment.parameter}_${context.direction}`;
        
        if (!this.autopilot.userPreferences.adjustmentPatterns) {
            this.autopilot.userPreferences.adjustmentPatterns = {};
        }
        
        if (!this.autopilot.userPreferences.adjustmentPatterns[patternKey]) {
            this.autopilot.userPreferences.adjustmentPatterns[patternKey] = {
                count: 0,
                avgChange: 0,
                contexts: []
            };
        }
        
        const pattern = this.autopilot.userPreferences.adjustmentPatterns[patternKey];
        pattern.count++;
        pattern.avgChange = (pattern.avgChange * (pattern.count - 1) + adjustment.change) / pattern.count;
        pattern.contexts.push({
            context: context,
            adjustment: adjustment,
            timestamp: Date.now()
        });
        
        // Keep only recent contexts (last 20)
        if (pattern.contexts.length > 20) {
            pattern.contexts = pattern.contexts.slice(-20);
        }
        
        // Save updated preferences
        this.autopilot.saveUserPreferences();
    }
    
    // Get user preference-based recommendations
    getUserPreferenceRecommendations(genre, audioFeatures) {
        if (!this.autopilot.userPreferences.adjustmentPatterns) {
            return null;
        }
        
        const recommendations = {};
        const patterns = this.autopilot.userPreferences.adjustmentPatterns;
        
        // Look for patterns that match current context
        Object.keys(patterns).forEach(patternKey => {
            const [patternGenre, parameter, direction] = patternKey.split('_');
            
            if (patternGenre === genre && patterns[patternKey].count >= 3) {
                const pattern = patterns[patternKey];
                const currentValue = this.getCurrentParameterValue(parameter);
                
                if (currentValue !== null) {
                    // Apply user's preferred adjustment
                    const adjustment = pattern.avgChange * (direction === 'increase' ? 1 : -1);
                    recommendations[parameter] = Math.max(0, Math.min(1, currentValue + adjustment));
                }
            }
        });
        
        return Object.keys(recommendations).length > 0 ? recommendations : null;
    }
    
    // Get current value of a parameter
    getCurrentParameterValue(parameterName) {
        if (!this.visualizer.audioMotion) return null;
        
        const audioMotion = this.visualizer.audioMotion;
        return audioMotion[parameterName] || null;
    }
    
    // Record user feedback (thumbs up/down)
    recordUserFeedback(feedback, context) {
        const feedbackEntry = {
            feedback: feedback, // 'positive' or 'negative'
            context: context,
            timestamp: Date.now()
        };
        
        this.feedbackHistory.push(feedbackEntry);
        
        // Keep only recent feedback (last 50)
        if (this.feedbackHistory.length > 50) {
            this.feedbackHistory = this.feedbackHistory.slice(-50);
        }
        
        // Learn from feedback
        this.learnFromFeedback(feedbackEntry);
        
        // console.log(`👤 User feedback: ${feedback}`, context);
    }
    
    // Learn from user feedback
    learnFromFeedback(feedbackEntry) {
        if (!this.autopilot.patternLearning) return;
        
        const context = {
            genre: this.autopilot.currentGenre,
            energy: this.autopilot.audioAnalyzer.getEnergy(),
            tempo: this.autopilot.audioAnalyzer.getTempo(),
            ...feedbackEntry.context
        };
        
        this.autopilot.patternLearning.learnFromUserBehavior(
            'user_feedback',
            JSON.stringify(context),
            feedbackEntry.feedback
        );
    }
    
    // Get feedback statistics
    getFeedbackStats() {
        const total = this.feedbackHistory.length;
        const positive = this.feedbackHistory.filter(f => f.feedback === 'positive').length;
        const negative = this.feedbackHistory.filter(f => f.feedback === 'negative').length;
        
        return {
            total: total,
            positive: positive,
            negative: negative,
            satisfaction: total > 0 ? positive / total : 0
        };
    }
    
    getCurrentParameters() {
        return this.currentParameters;
    }
    
    getParameterHistory() {
        return this.parameterHistory;
    }
}

// Class is automatically global (no export needed in Stage 1)

