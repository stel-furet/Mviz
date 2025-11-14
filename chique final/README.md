# Chique Plugin for Freque

Audio-reactive character animation plugin featuring a MOHO-rigged character with skeletal animation driven by real-time audio frequency analysis.

## Features

- **Full Skeletal Animation**: Procedurally animated bones driven by frequency bands
- **Frequency-Based Motion Mapping**:
  - Sub-bass (20-60Hz) → Leg movement
  - Bass (60-250Hz) → Torso sway and cape flow
  - Mids (500-2kHz) → Head bobbing and arm movement
  - High-mids (2k-6kHz) → Hair secondary motion
  - Highs (6k-20kHz) → Feather flutter
- **Beat Detection**: Pulse effect on strong beats
- **Smooth Motion**: Configurable smoothing for natural movement
- **Multiple Presets**: Default, Subtle, Headbanger, and Flow modes

## Installation

### Directory Structure

Create the following directory structure in your Freque plugins folder:

```
plugins/
  chique/
    chique.js
    moho_char.gltf
    moho_char__gltf/
      (all 41 PNG texture files)
```

### Required Files

1. **chique.js** - Main plugin file
2. **moho_char.gltf** - Character model
3. **moho_char__gltf/** - Texture directory containing all PNG assets:
   - cabeza_copy_*.png
   - calavera_*.png
   - capa_*.png
   - cuello_*.png
   - dedos_*.png
   - hojita_*.png
   - hombrera_*.png
   - Layer_*.png
   - MANO_ABAJO_*.png
   - oreja_*.png
   - palito_*.png
   - patilla2_*.png
   - patillla_*.png
   - pelo_etremedio_*.png
   - pierna_extendida_*.png
   - pluma1_*.png
   - plumas_1_*.png (8 files)
   - plumas_2_*.png (6 files)
   - pulgar_*.png
   - puno_*.png (3 files)
   - torso_*.png

### Loading the Plugin

1. Copy all files to `plugins/chique/`
2. In Freque, navigate to the plugins menu
3. Select "Chique" from the available plugins
4. The character should load and begin animating to your audio

## Controls

### Master Controls

- **Overall Intensity** (0-2): Master multiplier for all movement
- **Motion Smoothing** (0-0.5): Smoothing factor for natural motion (higher = smoother but less responsive)

### Body Part Controls

- **Head Bob** (0-2): Intensity of head movement response to vocals/mids
- **Body Sway** (0-2): Torso and spine sway response to bass
- **Feather Flutter** (0-2): Decorative feather movement from high frequencies

### Other Controls

- **Beat Pulse**: Toggle whole-character pulse on beat detection
- **Camera Distance** (5-50): Distance from character
- **Character Scale** (0.1-3): Overall size of character

## Presets

### Default Groove
Balanced settings for general music visualization
- Intensity: 1.0
- Head Bob: 1.0
- Body Sway: 0.8
- Feather Flutter: 1.2

### Subtle Movement
Gentle, relaxed animation for ambient music
- Intensity: 0.5
- Higher smoothing (0.3)
- Reduced movement on all parts

### Headbanger
Aggressive movement for heavy music
- Intensity: 2.0
- Low smoothing (0.05)
- Maximum head bob (2.0)
- Beat pulse enabled

### Smooth Flow
Flowing, organic movement
- Intensity: 0.8
- High smoothing (0.25)
- Emphasis on body sway
- Beat pulse disabled

## Technical Details

### Bone Mapping System

The plugin uses a sophisticated bone mapping system that connects audio frequency bands to skeletal transforms:

```javascript
boneMappings = {
    'cabeza copy': {  // Head
        rotation: { 
            z: { source: 'mid', scale: 0.3 },
            y: { source: 'mid', scale: 0.2 }
        }
    },
    'torso': {  // Body
        rotation: { 
            x: { source: 'bass', scale: 0.2 }
        }
    }
    // ... etc
}
```

### Frequency Bands

Audio spectrum (256 bins) is divided into 6 bands:

| Band | Frequency Range | Typical Instruments |
|------|----------------|---------------------|
| Sub-bass | 20-60Hz | Kick drum, sub bass |
| Bass | 60-250Hz | Bass guitar, floor tom |
| Low-mid | 250-500Hz | Lower vocals, guitars |
| Mid | 500-2kHz | Vocals, lead instruments |
| High-mid | 2k-6kHz | Cymbals, brightness |
| High | 6k-20kHz | Air, shimmer |

### Performance

- Target: 60 FPS
- Three.js renderer with antialiasing
- Optimized bone updates (direct transform manipulation)
- Minimal texture memory footprint

### Smoothing Algorithm

Uses exponential smoothing (lerp) to create natural motion:

```javascript
smoothedValue = lerp(current, target, 1 - smoothing)
```

Higher smoothing values create more fluid, delayed motion while lower values create snappier, more responsive animation.

### Beat Detection

- Uses 10-sample rolling average of audio energy
- Threshold: 1.3x average energy
- Minimum time between beats: 200ms
- Triggers 15% scale pulse on beat

## Customization

### Adding New Presets

Add to `setupPresets()` in chique.js:

```javascript
this.addPreset('mypreset', {
    name: 'My Custom Preset',
    values: {
        intensity: 1.5,
        smoothing: 0.2,
        headBobIntensity: 1.2,
        bodySwayIntensity: 1.0,
        featherFlutter: 1.5,
        beatPulse: true,
        cameraDistance: 18,
        characterScale: 1.1
    }
});
```

### Adjusting Bone Mappings

Modify `animateBones()` method to change how bones respond:

```javascript
// Example: Make head bob twice as much
if (this.bones['cabeza copy']) {
    this.bones['cabeza copy'].rotation.z = 
        Math.sin(this.time * 2) * bands.mid * 0.6 * intensity;  // Changed from 0.3
}
```

### Frequency Band Tuning

Adjust frequency ranges in `updateFrequencyBands()`:

```javascript
this.frequencyBands.bass = this.getFrequencyRange(5, 20);  // Wider bass range
```

## Troubleshooting

### Character doesn't load
- Verify all files are in correct directory structure
- Check browser console for GLTF loading errors
- Ensure texture files have correct filenames (case-sensitive)

### No animation
- Check that audio is playing in Freque
- Verify plugin is active (not hidden/disabled)
- Try increasing "Overall Intensity" control

### Jerky motion
- Increase "Motion Smoothing" value
- Check system performance (GPU/CPU usage)
- Reduce number of active plugins

### Character too small/large
- Adjust "Character Scale" control
- Modify "Camera Distance" for better framing

## Credits

- **Plugin Development**: Steve
- **Character Design**: MOHO (Lost Marble)
- **Platform**: Freque (meltlive.com)
- **Technology**: Three.js, WebGL, Web Audio API

## Version History

### v1.0.0 (Initial Release)
- Full skeletal animation system
- 6-band frequency analysis
- Beat detection and pulse
- 4 presets
- 8 user controls
- Support for 41 character parts

## License

Part of the Freque visualization platform.
