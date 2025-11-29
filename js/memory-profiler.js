/**
 * Memory Profiler for Animation Loop Stuttering Investigation
 * Monitors memory usage, GC patterns, and performance metrics
 */
class MemoryProfiler {
    constructor() {
        this.isEnabled = false;
        this.samples = [];
        this.maxSamples = 1000; // Keep last 1000 samples
        this.sampleInterval = 100; // Sample every 100ms
        this.lastSampleTime = 0;
        this.gcDetectionThreshold = 10; // MB drop to detect GC
        this.stutterDetectionThreshold = 16.67; // Frame time > 16.67ms indicates stutter
        
        // Performance observers
        this.frameTimeObserver = null;
        this.longTaskObserver = null;
        
        // Memory tracking
        this.lastMemoryUsage = 0;
        this.gcEvents = [];
        this.stutterEvents = [];
        
        // Frame timing
        this.lastFrameTime = performance.now();
        this.frameTimings = [];
        
        this.initializeObservers();
    }
    
    initializeObservers() {
        // Long Task Observer (tasks > 50ms)
        if ('PerformanceObserver' in window) {
            try {
                this.longTaskObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            this.recordLongTask(entry);
                        }
                    }
                });
                this.longTaskObserver.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                console.warn('Long Task Observer not supported:', e);
            }
        }
    }
    
    start() {
        this.isEnabled = true;
        this.samples = [];
        this.gcEvents = [];
        this.stutterEvents = [];
        this.frameTimings = [];
        this.lastSampleTime = performance.now();
    }
    
    stop() {
        this.isEnabled = false;
        this.generateReport();
    }
    
    // Call this from the main animation loop
    recordFrame() {
        if (!this.isEnabled) return;
        
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        
        // Record frame timing
        this.frameTimings.push({
            timestamp: now,
            frameTime: frameTime,
            isStutter: frameTime > this.stutterDetectionThreshold
        });
        
        // Detect stutters
        if (frameTime > this.stutterDetectionThreshold) {
            this.stutterEvents.push({
                timestamp: now,
                frameTime: frameTime,
                severity: frameTime > 33 ? 'severe' : 'moderate'
            });
        }
        
        // Keep only recent frame timings
        if (this.frameTimings.length > this.maxSamples) {
            this.frameTimings.shift();
        }
        
        this.lastFrameTime = now;
        
        // Sample memory periodically
        if (now - this.lastSampleTime >= this.sampleInterval) {
            this.sampleMemory();
            this.lastSampleTime = now;
        }
    }
    
    sampleMemory() {
        const sample = {
            timestamp: performance.now(),
            memory: this.getMemoryInfo(),
            canvasCount: this.countCanvases(),
            webglContexts: this.countWebGLContexts(),
            eventListeners: this.estimateEventListeners()
        };
        
        // Detect potential GC events
        if (this.lastMemoryUsage > 0) {
            const memoryDrop = this.lastMemoryUsage - sample.memory.used;
            if (memoryDrop > this.gcDetectionThreshold * 1024 * 1024) {
                this.gcEvents.push({
                    timestamp: sample.timestamp,
                    memoryDrop: memoryDrop,
                    beforeGC: this.lastMemoryUsage,
                    afterGC: sample.memory.used
                });
            }
        }
        
        this.samples.push(sample);
        this.lastMemoryUsage = sample.memory.used;
        
        // Keep only recent samples
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }
    }
    
    getMemoryInfo() {
        // Try different memory APIs
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                source: 'performance.memory'
            };
        }
        
        // Fallback estimation
        return {
            used: 0,
            total: 0,
            limit: 0,
            source: 'unavailable'
        };
    }
    
    countCanvases() {
        return document.querySelectorAll('canvas').length;
    }
    
    countWebGLContexts() {
        const canvases = document.querySelectorAll('canvas');
        let webglCount = 0;
        
        canvases.forEach(canvas => {
            try {
                if (canvas.getContext('webgl') || canvas.getContext('webgl2') || 
                    canvas.getContext('experimental-webgl')) {
                    webglCount++;
                }
            } catch (e) {
                // Context might be lost or unavailable
            }
        });
        
        return webglCount;
    }
    
    estimateEventListeners() {
        // This is an approximation - actual count is hard to get
        const elements = document.querySelectorAll('*');
        let estimated = 0;
        
        // Common event types that might accumulate
        const eventTypes = ['click', 'input', 'change', 'resize', 'wheel', 'mousemove'];
        
        elements.forEach(el => {
            eventTypes.forEach(type => {
                if (el[`on${type}`] !== null) {
                    estimated++;
                }
            });
        });
        
        return estimated;
    }
    
    recordLongTask(entry) {
        if (!this.isEnabled) return;
        
        console.warn('🐌 Long Task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name,
            attribution: entry.attribution
        });
    }
    
    generateReport() {
        const report = {
            summary: this.generateSummary(),
            gcEvents: this.gcEvents,
            stutterEvents: this.stutterEvents,
            memoryTrend: this.analyzeMemoryTrend(),
            framePerformance: this.analyzeFramePerformance(),
            recommendations: this.generateRecommendations()
        };
        
        console.group('🔍 Memory Profiler Report');
        console.groupEnd();
        
        return report;
    }
    
    generateSummary() {
        const totalSamples = this.samples.length;
        const totalGCEvents = this.gcEvents.length;
        const totalStutters = this.stutterEvents.length;
        const avgFrameTime = this.frameTimings.length > 0 ? 
            this.frameTimings.reduce((sum, f) => sum + f.frameTime, 0) / this.frameTimings.length : 0;
        
        return {
            samplingDuration: totalSamples * this.sampleInterval / 1000, // seconds
            totalSamples,
            gcEventsDetected: totalGCEvents,
            stutterEventsDetected: totalStutters,
            avgFrameTime: avgFrameTime.toFixed(2),
            stutterRate: totalSamples > 0 ? (totalStutters / totalSamples * 100).toFixed(2) + '%' : '0%'
        };
    }
    
    analyzeMemoryTrend() {
        if (this.samples.length < 10) return 'Insufficient data';
        
        const first10 = this.samples.slice(0, 10);
        const last10 = this.samples.slice(-10);
        
        const avgFirst = first10.reduce((sum, s) => sum + s.memory.used, 0) / first10.length;
        const avgLast = last10.reduce((sum, s) => sum + s.memory.used, 0) / last10.length;
        
        const trend = avgLast - avgFirst;
        const trendMB = trend / (1024 * 1024);
        
        return {
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            changeMB: trendMB.toFixed(2),
            avgMemoryUsageMB: (avgLast / (1024 * 1024)).toFixed(2)
        };
    }
    
    analyzeFramePerformance() {
        if (this.frameTimings.length === 0) return 'No frame data';
        
        const stutters = this.frameTimings.filter(f => f.isStutter);
        const avgFrameTime = this.frameTimings.reduce((sum, f) => sum + f.frameTime, 0) / this.frameTimings.length;
        const maxFrameTime = Math.max(...this.frameTimings.map(f => f.frameTime));
        
        return {
            totalFrames: this.frameTimings.length,
            stutterFrames: stutters.length,
            stutterPercentage: (stutters.length / this.frameTimings.length * 100).toFixed(2) + '%',
            avgFrameTime: avgFrameTime.toFixed(2) + 'ms',
            maxFrameTime: maxFrameTime.toFixed(2) + 'ms',
            targetFPS: '60fps (16.67ms per frame)'
        };
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        if (this.gcEvents.length > 5) {
            recommendations.push('High GC activity detected - investigate memory allocations in animation loop');
        }
        
        if (this.stutterEvents.length > this.frameTimings.length * 0.1) {
            recommendations.push('Frequent stuttering detected - check for synchronous operations blocking main thread');
        }
        
        const memoryTrend = this.analyzeMemoryTrend();
        if (memoryTrend.trend === 'increasing' && parseFloat(memoryTrend.changeMB) > 10) {
            recommendations.push('Memory leak suspected - memory usage increasing over time');
        }
        
        const canvasCount = this.samples.length > 0 ? this.samples[this.samples.length - 1].canvasCount : 0;
        if (canvasCount > 10) {
            recommendations.push(`High canvas count (${canvasCount}) - consider canvas pooling or cleanup`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push('No obvious memory-related issues detected - investigate other causes');
        }
        
        return recommendations;
    }
    
    // Correlation analysis between GC events and stutters
    analyzeGCStutterCorrelation() {
        const correlations = [];
        const correlationWindow = 500; // 500ms window
        
        this.gcEvents.forEach(gc => {
            const nearbyStutters = this.stutterEvents.filter(stutter => 
                Math.abs(stutter.timestamp - gc.timestamp) <= correlationWindow
            );
            
            if (nearbyStutters.length > 0) {
                correlations.push({
                    gcTimestamp: gc.timestamp,
                    memoryDrop: gc.memoryDrop,
                    nearbyStutters: nearbyStutters.length,
                    maxStutterSeverity: Math.max(...nearbyStutters.map(s => s.frameTime))
                });
            }
        });
        
        return correlations;
    }
}

// Global instance
window.memoryProfiler = new MemoryProfiler();
