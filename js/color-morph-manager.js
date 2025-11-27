/**
 * Color Morph Manager
 * Handles smooth color interpolation between Audio Motion gradients during morphing
 */

// Color interpolation utilities

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (#RRGGBB or #RGB)
 * @returns {{r: number, g: number, b: number}|null}
 */
function hexToRgb(hex) {
    if (!hex) return null;
    
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-digit hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    // Handle 6-digit hex
    if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return { r, g, b };
    }
    
    return null;
}

/**
 * Convert RGB object to hex color string
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string} Hex color string (#RRGGBB)
 */
function rgbToHex(r, g, b) {
    const toHex = (n) => {
        const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Parse color string to RGB (handles hex, rgb(), and named colors)
 * @param {string} color - Color string
 * @returns {{r: number, g: number, b: number}|null}
 */
function parseColor(color) {
    if (!color) return null;
    
    // Try hex first
    if (color.startsWith('#')) {
        return hexToRgb(color);
    }
    
    // Try rgb() format
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10)
        };
    }
    
    // Try rgba() format (ignore alpha)
    const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1], 10),
            g: parseInt(rgbaMatch[2], 10),
            b: parseInt(rgbaMatch[3], 10)
        };
    }
    
    // Handle named colors (common ones)
    const namedColors = {
        'red': { r: 255, g: 0, b: 0 },
        'green': { r: 0, g: 128, b: 0 },
        'blue': { r: 0, g: 0, b: 255 },
        'yellow': { r: 255, g: 255, b: 0 },
        'orange': { r: 255, g: 165, b: 0 },
        'purple': { r: 128, g: 0, b: 128 },
        'pink': { r: 255, g: 192, b: 203 },
        'cyan': { r: 0, g: 255, b: 255 },
        'magenta': { r: 255, g: 0, b: 255 },
        'lime': { r: 0, g: 255, b: 0 },
        'orangered': { r: 255, g: 69, b: 0 },
        'steelblue': { r: 70, g: 130, b: 180 },
        'white': { r: 255, g: 255, b: 255 },
        'black': { r: 0, g: 0, b: 0 },
        'gray': { r: 128, g: 128, b: 128 },
        'grey': { r: 128, g: 128, b: 128 }
    };
    
    const lowerColor = color.toLowerCase().trim();
    if (namedColors[lowerColor]) {
        return namedColors[lowerColor];
    }
    
    // Fallback: try to create a temporary element and get computed color
    try {
        const tempDiv = document.createElement('div');
        tempDiv.style.color = color;
        document.body.appendChild(tempDiv);
        const computed = window.getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);
        
        const rgbMatch = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1], 10),
                g: parseInt(rgbMatch[2], 10),
                b: parseInt(rgbMatch[3], 10)
            };
        }
    } catch (e) {
        // Fallback failed
    }
    
    return null;
}

/**
 * Interpolate between two RGB colors
 * @param {string|Object} color1 - First color (hex string or RGB object)
 * @param {string|Object} color2 - Second color (hex string or RGB object)
 * @param {number} t - Interpolation factor (0-1)
 * @returns {string} Interpolated hex color string
 */
function interpolateRgb(color1, color2, t) {
    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));
    
    // Parse colors to RGB
    const rgb1 = typeof color1 === 'object' ? color1 : parseColor(color1);
    const rgb2 = typeof color2 === 'object' ? color2 : parseColor(color2);
    
    // Fallback if parsing fails
    if (!rgb1 || !rgb2) {
        return t < 0.5 ? (typeof color1 === 'string' ? color1 : '#000000') : (typeof color2 === 'string' ? color2 : '#000000');
    }
    
    // Linear interpolation
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
    
    return rgbToHex(r, g, b);
}

/**
 * Normalize and align color stops from two gradients
 * Creates a unified array with matching positions
 * @param {Array} stops1 - First gradient's color stops
 * @param {Array} stops2 - Second gradient's color stops
 * @returns {Array} Normalized array with { start, target, pos, level }
 */
function normalizeColorStops(stops1, stops2) {
    if (!stops1 || !stops1.length) return [];
    if (!stops2 || !stops2.length) return [];
    
    // Create a map of all unique positions
    const positionMap = new Map();
    
    // Add positions from first gradient
    stops1.forEach(stop => {
        const pos = stop.pos !== undefined ? stop.pos : (stop.level !== undefined ? 1 - stop.level : 0);
        if (!positionMap.has(pos)) {
            positionMap.set(pos, { start: stop, target: null });
        } else {
            positionMap.get(pos).start = stop;
        }
    });
    
    // Add positions from second gradient
    stops2.forEach(stop => {
        const pos = stop.pos !== undefined ? stop.pos : (stop.level !== undefined ? 1 - stop.level : 0);
        if (!positionMap.has(pos)) {
            positionMap.set(pos, { start: null, target: stop });
        } else {
            positionMap.get(pos).target = stop;
        }
    });
    
    // Fill in missing stops by interpolating from nearest neighbors
    const sortedPositions = Array.from(positionMap.keys()).sort((a, b) => a - b);
    
    sortedPositions.forEach((pos, index) => {
        const entry = positionMap.get(pos);
        
        // If start is missing, find nearest start stops
        if (!entry.start && index > 0) {
            for (let i = index - 1; i >= 0; i--) {
                const prevEntry = positionMap.get(sortedPositions[i]);
                if (prevEntry.start) {
                    entry.start = prevEntry.start;
                    break;
                }
            }
        }
        if (!entry.start && index < sortedPositions.length - 1) {
            for (let i = index + 1; i < sortedPositions.length; i++) {
                const nextEntry = positionMap.get(sortedPositions[i]);
                if (nextEntry.start) {
                    entry.start = nextEntry.start;
                    break;
                }
            }
        }
        
        // If target is missing, find nearest target stops
        if (!entry.target && index > 0) {
            for (let i = index - 1; i >= 0; i--) {
                const prevEntry = positionMap.get(sortedPositions[i]);
                if (prevEntry.target) {
                    entry.target = prevEntry.target;
                    break;
                }
            }
        }
        if (!entry.target && index < sortedPositions.length - 1) {
            for (let i = index + 1; i < sortedPositions.length; i++) {
                const nextEntry = positionMap.get(sortedPositions[i]);
                if (nextEntry.target) {
                    entry.target = nextEntry.target;
                    break;
                }
            }
        }
    });
    
    // Convert to normalized array
    const normalized = sortedPositions.map(pos => {
        const entry = positionMap.get(pos);
        const startStop = entry.start || stops1[0];
        const targetStop = entry.target || stops2[0];
        
        // Use the level from whichever stop exists, or average
        const level = startStop.level !== undefined 
            ? (targetStop.level !== undefined 
                ? (startStop.level + targetStop.level) / 2 
                : startStop.level)
            : (targetStop.level !== undefined ? targetStop.level : 1 - pos);
        
        return {
            start: startStop,
            target: targetStop,
            pos: pos,
            level: level
        };
    });
    
    return normalized;
}

/**
 * Color Morph Manager Class
 * Manages smooth color transitions between Audio Motion gradients
 */
class ColorMorphManager {
    constructor(audioMotion) {
        this.audioMotion = audioMotion;
        this.morphing = false;
        this.startGradient = null;
        this.targetGradient = null;
        this.startGradientData = null;
        this.targetGradientData = null;
        this.lastProgress = -1;
        this.morphGradientName = '_morphing';
    }
    
    /**
     * Start a color morph between two gradients
     * @param {string} startGradient - Name of starting gradient
     * @param {string} targetGradient - Name of target gradient
     */
    startMorph(startGradient, targetGradient) {
        if (!this.audioMotion || !this.audioMotion._gradients) {
            console.warn('ColorMorphManager: AudioMotion not available');
            return;
        }
        
        this.startGradient = startGradient;
        this.targetGradient = targetGradient;
        
        // Get gradient data
        this.startGradientData = this.audioMotion._gradients[startGradient];
        this.targetGradientData = this.audioMotion._gradients[targetGradient];
        
        if (!this.startGradientData || !this.targetGradientData) {
            console.warn('ColorMorphManager: Gradient data not found', { startGradient, targetGradient });
            return;
        }
        
        this.morphing = true;
        this.lastProgress = -1;
    }
    
    /**
     * Update the morph progress and register interpolated gradient
     * @param {number} progress - Morph progress (0-1)
     * @returns {string|null} Name of morphed gradient, or null if not morphing
     */
    updateMorph(progress) {
        if (!this.morphing || !this.startGradientData || !this.targetGradientData) {
            return null;
        }
        
        // Clamp progress
        progress = Math.max(0, Math.min(1, progress));
        
        // Skip update if progress hasn't changed significantly (performance optimization)
        if (Math.abs(progress - this.lastProgress) < 0.01 && this.lastProgress >= 0) {
            return this.morphGradientName;
        }
        
        this.lastProgress = progress;
        
        // Normalize color stops
        const normalizedStops = normalizeColorStops(
            this.startGradientData.colorStops,
            this.targetGradientData.colorStops
        );
        
        if (!normalizedStops.length) {
            return null;
        }
        
        // Interpolate colors
        const morphedStops = normalizedStops.map(({ start, target, pos, level }) => {
            const startColor = start.color || '#000000';
            const targetColor = target.color || '#000000';
            const morphedColor = interpolateRgb(startColor, targetColor, progress);
            
            return {
                pos: pos,
                level: level,
                color: morphedColor
            };
        });
        
        // Interpolate background color
        const startBg = this.startGradientData.bgColor || '#000000';
        const targetBg = this.targetGradientData.bgColor || '#000000';
        const morphedBg = interpolateRgb(startBg, targetBg, progress);
        
        // Use direction from start gradient (or target if start doesn't have one)
        const dir = this.startGradientData.dir || this.targetGradientData.dir;
        
        // Register the morphed gradient
        try {
            this.audioMotion.registerGradient(this.morphGradientName, {
                bgColor: morphedBg,
                dir: dir,
                colorStops: morphedStops
            });
        } catch (error) {
            console.error('ColorMorphManager: Error registering morphed gradient', error);
            return null;
        }
        
        return this.morphGradientName;
    }
    
    /**
     * Stop the color morph and cleanup
     */
    stopMorph() {
        this.morphing = false;
        this.startGradient = null;
        this.targetGradient = null;
        this.startGradientData = null;
        this.targetGradientData = null;
        this.lastProgress = -1;
        
        // Note: We don't unregister the gradient in case it's still being used
        // It will be overwritten on the next morph
    }
    
    /**
     * Check if currently morphing
     * @returns {boolean}
     */
    isMorphing() {
        return this.morphing;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ColorMorphManager, interpolateRgb, parseColor, normalizeColorStops };
}

