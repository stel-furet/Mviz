// Nebula - Browser Compatible Version
// Extracted from @flodlc/nebula and adapted for vanilla JS

(function(global) {
    'use strict';
    
    const DEFAULT_CONFIG = {
        starsCount: 400,
        starsColor: "#FFFFFF",
        starsRotationSpeed: 3,
        cometFrequence: 15,
        nebulasIntensity: 10,
        bgColor: "rgb(8,8,8)",
        sunScale: 1,
        planetsScale: 1,
        solarSystemOrbite: 65,
        solarSystemSpeedOrbit: 100
    };
    
    const fillConfig = (config) => {
        return Object.assign({}, DEFAULT_CONFIG, config);
    };
    
    const parseColor = (color) => {
        const rgb = color.includes("#") ? hexToRGB(color) : color;
        const split = rgb.split(/[\(|,|\)]/);
        return [
            parseInt(split[1], 10),
            parseInt(split[2], 10),
            parseInt(split[3], 10)
        ];
    };
    
    function hexToRGB(hex) {
        let r = "0", g = "0", b = "0";
        if (hex.length <= 5) {
            r = "0x" + hex[1] + hex[1];
            g = "0x" + hex[2] + hex[2];
            b = "0x" + hex[3] + hex[3];
        } else if (hex.length >= 7) {
            r = "0x" + hex[1] + hex[2];
            g = "0x" + hex[3] + hex[4];
            b = "0x" + hex[5] + hex[6];
        }
        return "rgb(" + (+r) + "," + (+g) + "," + (+b) + ")";
    }
    
    const rgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    
    class Drawable {
        constructor({ ctx }) {
            this.ctx = ctx;
        }
        
        getCanvasWidth() {
            return this.ctx.canvas.width;
        }
        
        getCanvasHeight() {
            return this.ctx.canvas.height;
        }
        
        get canvasMinSide() {
            return Math.min(this.getCanvasHeight(), this.getCanvasWidth());
        }
        
        get canvasMaxSide() {
            return Math.max(this.getCanvasHeight(), this.getCanvasWidth());
        }
    }
    
    class Astre extends Drawable {
        constructor({ ctx, width, speed, distance, rgb, origin, startAngle = Math.random() * 360 }) {
            super({ ctx });
            this.relativeWidth = width;
            this.rgb = rgb;
            this.speed = speed;
            this.relativeDistance = distance;
            this.origin = origin;
            this.angle = Math.PI / 180 * (startAngle != null ? startAngle : 0);
        }
        
        rotate() {
            this.angle = (this.angle + Math.PI / 180 * this.speed) % 360;
        }
        
        get width() {
            return this.relativeWidth / 100 * this.canvasMinSide;
        }
        
        get distance() {
            return this.relativeDistance / 100 * this.canvasMinSide;
        }
        
        getAngle() {
            return this.angle;
        }
        
        getRefAngle() {
            return this.getAngle() + (this.origin?.getAngle() ?? 0);
        }
        
        getWidth() {
            return this.width;
        }
        
        getOriginCoords() {
            if (this.origin) {
                const originCoords = this.origin.getOriginCoords();
                return [
                    originCoords[0] + Math.cos(this.origin.getAngle() + this.angle) * (this.distance + this.origin.getWidth()),
                    originCoords[1] + Math.sin(this.origin.getAngle() + this.angle) * (this.distance + this.origin.getWidth())
                ];
            } else {
                const center = [this.getCanvasWidth() / 2, this.getCanvasHeight() / 2];
                return [
                    center[0] + Math.cos(this.angle) * this.distance,
                    center[1] + Math.sin(this.angle) * this.distance
                ];
            }
        }
    }
    
    const roundCoords = (coords) => [Math.round(coords[0]), Math.round(coords[1])];
    
    class Star extends Astre {
        constructor(args) {
            super(args);
        }
        
        draw = () => {
            this.rotate();
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            const coords = roundCoords(this.getOriginCoords());
            this.ctx.arc(...coords, Math.round(this.width), 0, Math.PI * 2);
            this.ctx.closePath();
            this.ctx.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, 1)`;
            this.ctx.fill();
        };
    }
    
    const Random = {
        between: (min, max) => min + Math.random() * (max - min),
        around: (value, variance, type) => {
            if (type === "%") {
                variance = variance * value;
            }
            return value - variance + Math.random() * variance * 2;
        }
    };
    
    const generateStars = ({ stars, count, color, rotationSpeed, ctx }) => {
        let totalStars;
        const missingStars = count - stars.length;
        
        if (missingStars <= 0) {
            totalStars = stars.slice(0, count);
        } else {
            const newStars = new Array(missingStars).fill(0).map(() => 
                new Star({
                    ctx,
                    width: Random.between(0.03, 0.1),
                    distance: 120 * Math.pow(Math.random() * Math.random(), 1/2),
                    speed: Random.around(rotationSpeed * 0.015, 0.005),
                    rgb: parseColor(color)
                })
            );
            totalStars = stars.concat(newStars);
        }
        
        return totalStars.map(star => {
            star.speed = Random.around(rotationSpeed * 0.015, 0.005);
            return star;
        });
    };
    
    const drawOnCanvas = ({ canvas, drawings, bgColor, fps = 0 }) => {
        const width = canvas.width;
        const height = canvas.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) return () => undefined;
        
        ctx.save();
        let animation;
        let lastTimestamp = 0;
        let timeStep = 1000 / fps;
        
        const drawMainCanvas = () => {
            if (fps) {
                animation = requestAnimationFrame(drawMainCanvas);
                const timestamp = Date.now();
                if (timestamp - lastTimestamp < timeStep) return;
                lastTimestamp = timestamp;
            }
            
            ctx.clearRect(0, 0, width, height);
            if (bgColor) {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, width, height);
            }
            
            drawings.forEach(drawing => drawing.draw());
        };
        
        drawMainCanvas();
        
        return () => {
            ctx.restore();
            if (animation) {
                cancelAnimationFrame(animation);
            }
        };
    };
    
    // Simple nebula coloration effect
    class NebulaColoration extends Drawable {
        constructor({ ctx, intensity }) {
            super({ ctx });
            this.intensity = intensity * 0.025;
        }
        
        draw = () => {
            // Simple gradient background for nebula effect
            const ctx = this.ctx;
            const width = this.getCanvasWidth();
            const height = this.getCanvasHeight();
            
            const gradient = ctx.createRadialGradient(
                width/2, height/2, 0,
                width/2, height/2, Math.min(width, height)/2
            );
            
            gradient.addColorStop(0, `rgba(6,2,122,${this.intensity})`);
            gradient.addColorStop(0.5, `rgba(6,66,18,${this.intensity * 0.5})`);
            gradient.addColorStop(1, `rgba(87,4,110,${this.intensity * 0.2})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        };
    }
    
    const CANVAS_STYLE = "width: 100%;height: 100%;position:absolute;will-change:transform;top: 0;left:0;";
    
    class Nebula {
        constructor({ config, element }) {
            this.element = element;
            this.bgCanvas = document.createElement("CANVAS");
            this.canvas = document.createElement("CANVAS");
            this.cancelAnimations = [];
            this.stars = [];
            this.coloration = null;
            
            element.appendChild(this.bgCanvas);
            element.appendChild(this.canvas);
            
            this.styleCanvas();
            window.addEventListener("resize", this.onResize);
            this.config = fillConfig(config);
            this.setConfig(config);
        }
        
        onResize = () => {
            this.styleCanvas();
            this.init();
        };
        
        styleCanvas = () => {
            this.bgCanvas.setAttribute("style", CANVAS_STYLE);
            this.bgCanvas.width = this.element.offsetWidth / 3;
            this.bgCanvas.height = this.element.offsetHeight / 3;
            this.canvas.setAttribute("style", CANVAS_STYLE);
            this.canvas.width = this.element.offsetWidth * 2;
            this.canvas.height = this.element.offsetHeight * 2;
        };
        
        setConfig(config) {
            this.config = fillConfig(config);
            
            // Create nebula coloration
            this.coloration = new NebulaColoration({
                ctx: this.bgCanvas.getContext("2d"),
                intensity: this.config.nebulasIntensity
            });
            
            // Generate stars
            this.stars = generateStars({
                stars: this.stars,
                ctx: this.canvas.getContext("2d"),
                color: this.config.starsColor,
                count: this.config.starsCount,
                rotationSpeed: this.config.starsRotationSpeed
            });
            
            this.init();
        }
        
        init() {
            this.draw();
        }
        
        draw() {
            this.cancelAnimations.forEach(callback => callback());
            this.cancelAnimations = [
                drawOnCanvas({
                    canvas: this.bgCanvas,
                    drawings: [this.coloration],
                    bgColor: this.config.bgColor
                }),
                drawOnCanvas({
                    canvas: this.canvas,
                    drawings: [...this.stars],
                    fps: 40
                })
            ];
        }
        
        destroy() {
            window.removeEventListener("resize", this.onResize);
            this.cancelAnimations.forEach(callback => callback());
            this.cancelAnimations = [];
            this.bgCanvas.parentElement?.removeChild(this.bgCanvas);
            this.canvas.parentElement?.removeChild(this.canvas);
        }
    }
    
    const createNebula = (element, config) => {
        return new Nebula({ config, element });
    };
    
    // Export for browser
    if (typeof window !== 'undefined') {
        window.Nebula = Nebula;
        window.createNebula = createNebula;
    }
    
    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { Nebula, createNebula };
    }
    
})(typeof window !== 'undefined' ? window : this);
