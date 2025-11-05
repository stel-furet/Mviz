// TEMPORARY FILE - New applyKaleidoscopeEffect() method
// This will replace the existing method in main.js

applyKaleidoscopeEffect() {
    if (!this.kaleidoscopeCanvas) {
        console.error('Kaleidoscope canvas not initialized');
        return;
    }

    let width = this.kaleidoscopeCanvas.width;
    let height = this.kaleidoscopeCanvas.height;

    // Make sure canvas is properly sized
    if (width === 0 || height === 0) {
        this.resizeKaleidoscopeCanvases();
        width = this.kaleidoscopeCanvas.width;
        height = this.kaleidoscopeCanvas.height;
    }

    // Get all sources (video + visualizations) sorted by z-index
    const sortedSources = this.getActiveCanvasesInZIndexOrder();
    
    // Check if any sources should be drawn in kaleidoscope
    const sourcesToDraw = sortedSources.filter(source => {
        const applyToKal = source.applyToKalProperty ? this[source.applyToKalProperty] : true;
        return applyToKal && source.canvas;
    });
    
    if (sourcesToDraw.length === 0) {
        // Nothing to draw - hide kaleidoscope canvas
        this.kaleidoscopeCanvas.style.display = 'none';
        
        // Show all original canvases
        if (this.videoElement) {
            this.videoElement.style.opacity = this.videoOpacity.toString();
        }
        if (this.audioMotion?.canvas) {
            this.audioMotion.canvas.style.visibility = 'visible';
        }
        if (this.infiniteZoom?.canvas) {
            this.infiniteZoom.canvas.style.visibility = 'visible';
        }
        if (this.fluidDynamics?.canvas) {
            this.fluidDynamics.canvas.style.visibility = 'visible';
        }
        if (this.webglVisualization?.canvas) {
            this.webglVisualization.canvas.style.visibility = 'visible';
        }
        if (window.pluginManager) {
            window.pluginManager.getAllPlugins().forEach(plugin => {
                if (plugin.canvas && plugin.isActive) {
                    plugin.canvas.style.visibility = 'visible';
                }
            });
        }
        return;
    }

    // Show kaleidoscope canvas and clear it
    this.kaleidoscopeCanvas.style.display = 'block';
    this.kaleidoscopeCtx.clearRect(0, 0, width, height);

    // Hide original canvases that are being captured
    sourcesToDraw.forEach(source => {
        if (source.isVideo && this.videoElement) {
            this.videoElement.style.opacity = '0';
        } else if (source.canvas && source.canvas.style) {
            source.canvas.style.visibility = 'hidden';
        }
    });

    // Apply video filters if video is included
    const hasVideo = sourcesToDraw.some(s => s.isVideo);
    if (hasVideo) {
        this.applyFiltersToKaleidoscopeContext();
    }

    const centerX = width * this.kaleidoscopeCenterX;
    const centerY = height * this.kaleidoscopeCenterY;
    const angleStep = (Math.PI * 2) / this.kaleidoscopeSegments;

    // Calculate base radius
    const minDimension = Math.min(width, height);
    const baseRadius = minDimension * 0.45;
    
    let shapeRadius;
    switch (this.kaleidoscopeShape) {
        case 'petal':
            shapeRadius = baseRadius * 1.0;
            break;
        case 'rectangle':
            shapeRadius = baseRadius * 1.0;
            break;
        case 'triangle':
        default:
            shapeRadius = baseRadius * 1.1;
            break;
    }

    // Draw multiple rings
    for (let ring = 0; ring < this.kaleidoscopeRings; ring++) {
        const ringScale = this.kaleidoscopeScale * Math.pow(1 - this.kaleidoscopeRingSpacing, ring);
        const ringRotationOffset = this.kaleidoscopeRingRotations[ring] || (ring * (Math.PI / this.kaleidoscopeSegments));

        // Draw segments
        for (let i = 0; i < this.kaleidoscopeSegments; i++) {
            this.kaleidoscopeCtx.save();
            this.kaleidoscopeCtx.translate(centerX, centerY);
            this.kaleidoscopeCtx.rotate(angleStep * i + this.kaleidoscopeRotation + ringRotationOffset);
            this.kaleidoscopeCtx.scale(ringScale, ringScale);

            // Create clipping path based on shape
            this.kaleidoscopeCtx.beginPath();

            switch (this.kaleidoscopeShape) {
                case 'petal':
                    this.kaleidoscopeCtx.moveTo(0, 0);
                    const petalAngle = angleStep * 0.8;
                    const controlRadius = shapeRadius * 0.7;
                    this.kaleidoscopeCtx.quadraticCurveTo(
                        controlRadius * Math.cos(petalAngle * 0.3),
                        controlRadius * Math.sin(petalAngle * 0.3),
                        shapeRadius * Math.cos(petalAngle * 0.5),
                        shapeRadius * Math.sin(petalAngle * 0.5)
                    );
                    this.kaleidoscopeCtx.quadraticCurveTo(
                        controlRadius * Math.cos(petalAngle * 0.7),
                        controlRadius * Math.sin(petalAngle * 0.7),
                        0,
                        0
                    );
                    break;

                case 'rectangle':
                    const rectAngle = angleStep * 0.45;
                    this.kaleidoscopeCtx.moveTo(0, 0);
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(-rectAngle), shapeRadius * Math.sin(-rectAngle));
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(-rectAngle), shapeRadius * Math.sin(-rectAngle) + shapeRadius * 0.3);
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(rectAngle), shapeRadius * Math.sin(rectAngle) + shapeRadius * 0.3);
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(rectAngle), shapeRadius * Math.sin(rectAngle));
                    this.kaleidoscopeCtx.lineTo(0, 0);
                    break;

                case 'triangle':
                default:
                    this.kaleidoscopeCtx.moveTo(0, 0);
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(0), shapeRadius * Math.sin(0));
                    this.kaleidoscopeCtx.lineTo(shapeRadius * Math.cos(angleStep), shapeRadius * Math.sin(angleStep));
                    break;
            }

            this.kaleidoscopeCtx.closePath();
            this.kaleidoscopeCtx.clip();

            // Set opacity based on ring number
            this.kaleidoscopeCtx.globalAlpha = 1 - (ring * 0.15);

            // Mirror for odd segments
            if (i % 2 !== 0) {
                this.kaleidoscopeCtx.scale(1, -1);
            }

            // Draw ALL sources in z-index order (back to front)
            sourcesToDraw.forEach(source => {
                // Handle video source separately (needs special handling)
                if (source.isVideo && source.canvas) {
                    const videoElement = source.canvas;
                    if (videoElement.readyState >= 2) {
                        // Apply mirror transformation for video
                        this.kaleidoscopeCtx.save();
                        if (this.videoMirror === 'horizontal' || this.videoMirror === 'both') {
                            this.kaleidoscopeCtx.scale(-1, 1);
                        }
                        if (this.videoMirror === 'vertical' || this.videoMirror === 'both') {
                            this.kaleidoscopeCtx.scale(1, -1);
                        }
                        this.kaleidoscopeCtx.drawImage(videoElement, -centerX / ringScale, -centerY / ringScale, width / ringScale, height / ringScale);
                        this.kaleidoscopeCtx.restore();
                    }
                } else if (source.canvas) {
                    // Handle canvas sources (visualizations, plugins)
                    // Skip WebGL if not supported
                    if (source.type === 'webgl' && !source.webglSupported) {
                        return;
                    }
                    
                    // Apply opacity for plugins
                    if (source.type === 'plugin' && source.plugin && source.plugin.opacity !== undefined) {
                        this.kaleidoscopeCtx.save();
                        this.kaleidoscopeCtx.globalAlpha *= source.plugin.opacity;
                        this.kaleidoscopeCtx.drawImage(source.canvas, -centerX / ringScale, -centerY / ringScale, width / ringScale, height / ringScale);
                        this.kaleidoscopeCtx.restore();
                    } else if (source.type === 'fluidDynamics' && source.opacity !== undefined) {
                        this.kaleidoscopeCtx.save();
                        this.kaleidoscopeCtx.globalAlpha *= source.opacity;
                        this.kaleidoscopeCtx.drawImage(source.canvas, -centerX / ringScale, -centerY / ringScale, width / ringScale, height / ringScale);
                        this.kaleidoscopeCtx.restore();
                    } else {
                        this.kaleidoscopeCtx.drawImage(source.canvas, -centerX / ringScale, -centerY / ringScale, width / ringScale, height / ringScale);
                    }
                }
            });

            this.kaleidoscopeCtx.restore();
        }
    }
}

