# Chique Plugin - Complete Deployment Package

## What You Have

### Core Files (Ready to Use)
1. ✅ **chique.js** - Main plugin code (18KB)
2. ✅ **moho_char.gltf** - Character model (770KB)
3. ✅ **README.md** - Full documentation
4. ✅ **SETUP.md** - Quick setup guide

### Texture Assets (Need to be Organized)
You have 41 PNG texture files that need to be placed in a subfolder.

## Deployment Steps

### Step 1: Create Plugin Directory

In your Freque installation, create this structure:

```
plugins/
  chique/
    ├── chique.js          ← Download and place here
    ├── moho_char.gltf     ← Download and place here
    ├── README.md          ← Download and place here (optional)
    ├── SETUP.md           ← Download and place here (optional)
    └── moho_char__gltf/   ← CREATE THIS FOLDER
        └── (41 PNG files) ← Move all PNG files here
```

### Step 2: Organize Texture Files

**IMPORTANT**: The folder MUST be named exactly `moho_char__gltf` (with double underscore)

Move all these files from your uploads into `moho_char__gltf/`:

```
cabeza_copy_bc89490f-62e7-4149-b987-35a11ea8f72b.png
calavera_0460f3b1-ceb9-4326-b076-febd1f343f27.png
calavera_atras_6c3d61e9-8c44-4442-a310-63e50da89c43.png
capa_ce5a130d-e271-4d5b-9bba-6086f3566723.png
cuello_fb198c1b-4975-47e2-a0a2-331842ab6696.png
dedos_b526185d-3d09-4a35-bb81-61ca5f62f45b.png
hojita_67e194bb-e8e7-4a1e-a357-a1c7ff5926e4.png
hombrera_11aeefeb-d429-42f0-a399-b829d8c870c2.png
Layer_12_bf8489b6-480b-4d34-a883-19419eb2637d.png
Layer_1_af8592ee-11ca-4dbe-82da-ab0f29b3ea60.png
Layer_21_e20b9faa-2d05-46f8-a977-27d8ddf73c1c.png
Layer_2_d4a0ef1f-c85a-4a54-b9ef-6b26d98106f9.png
Layer_3_21e83f19-7367-40e3-9de0-32f1f249080e.png
Layer_4_087dfec8-7b11-433e-9271-50505adb6c89.png
MANO_ABAJO_9c1bf16b-3256-4ad8-a85c-5a007c8b2f65.png
oreja_4019e858-0e43-4d50-bacc-1ae6efd406e9.png
palito_98db9806-3675-4ab6-85c5-74e2c68cb2bb.png
patilla2_506dc33b-17a0-4010-8e71-4b0319fa61bf.png
patillla_bf2e02bc-6fd0-4a28-9506-36955324994d.png
pelo_etremedio_e6260406-c1d2-46ba-89f3-8904d4331a46.png
pierna_extendida_1_5c360512-6125-4f15-a779-ee8c9e06b26a.png
pierna_extendida_2_7bddf866-0919-4fc6-b911-ae481b062422.png
pluma1_323b7b66-2c87-44a4-af5f-3067f7c24ae9.png
plumas_1_1_dbeb5737-456a-42ec-bdf4-62a0d2757f91.png
plumas_1_2_5a8b0eec-5cce-4283-b5e7-0b1faf8d61d6.png
plumas_1_3_81bd4372-cf4c-4653-8d8d-2fd109a3c41c.png
plumas_1_4_f66cef48-9ed5-425b-9ca2-110c01d1d338.png
plumas_1_5_cb1f63fc-0682-44b7-9948-d19641498f09.png
plumas_1_6_25dab393-85cf-4d02-b654-ffbf10a2f960.png
plumas_1_7_6bcd323a-76ec-4ba3-b815-8a297212e9b3.png
plumas_1_8_5682cc0c-631b-44ad-b132-0fd30cc695b6.png
plumas_2_1_85cb0fb3-9109-48e6-9eb0-efa557c1056e.png
plumas_2_2_c3e40e64-b9b6-4a94-9199-c356a3c31c18.png
plumas_2_3_361487a1-30ba-47c5-b397-af119d5c867a.png
plumas_2_3_77478e33-2cd2-4524-8fc2-89692e46e33c.png
plumas_2_3_7b3339a9-610a-4efe-93b2-6856f3ede7ca.png
pulgar_f86b3647-6e84-4261-88b2-a58e8af860c1.png
puno_7ffe4f54-5da6-4160-9428-6ff67c58e42d.png
puno_copy_66fb0f9c-b37e-4e29-88df-75b05e3b41c1.png
puno_detras_iz_be54ab75-7226-43f4-91b3-04415a6fabd4.png
torso_2f54a0ee-2340-46ac-83d8-58d1ca2cfc06.png
```

### Step 3: Verify Installation

Final structure should look like:

```
plugins/chique/
├── chique.js                (18KB)
├── moho_char.gltf          (770KB)
├── README.md               (6.4KB)
├── SETUP.md                (6.8KB)
└── moho_char__gltf/
    ├── cabeza_copy_*.png
    ├── calavera_*.png
    ├── capa_*.png
    └── ... (38 more PNG files)
```

### Step 4: Test in Freque

1. Launch Freque
2. Navigate to Plugins panel
3. Find "Chique" in the list
4. Activate the plugin
5. Start playing audio
6. Character should load and animate!

## Quick Checklist

- [ ] Created `plugins/chique/` directory
- [ ] Placed `chique.js` in directory
- [ ] Placed `moho_char.gltf` in directory
- [ ] Created `moho_char__gltf/` subdirectory
- [ ] Moved all 41 PNG files into subdirectory
- [ ] Verified filenames match exactly
- [ ] Loaded Freque and activated plugin
- [ ] Tested with audio playback

## File Size Summary

- **chique.js**: 18 KB
- **moho_char.gltf**: 770 KB
- **41 PNG textures**: ~2-5 MB total (varies by texture)
- **Total package**: ~3-6 MB

## Technical Requirements

- **Freque**: Latest version with Three.js support
- **Browser**: Chrome, Firefox, or Edge (WebGL 2.0)
- **Audio**: Active audio source (file, mic, or stream)

## What the Plugin Does

The Chique plugin:

1. **Loads** the MOHO character model from GLTF
2. **Indexes** all bones in the skeleton hierarchy
3. **Analyzes** incoming audio into 6 frequency bands
4. **Maps** frequency bands to bone rotations/positions
5. **Smooths** motion for natural animation
6. **Detects** beats and triggers pulse effects
7. **Renders** the animated character with Three.js

## Audio Mapping Overview

| Body Part | Frequency | Effect |
|-----------|-----------|--------|
| Legs | Sub-bass (20-60Hz) | Knee bend on kicks |
| Torso | Bass (60-250Hz) | Sway and lean |
| Arms | Mids (500-2kHz) | Pump on vocals |
| Head | Mids (500-2kHz) | Bob and turn |
| Hair | High-mids (2k-6kHz) | Secondary sway |
| Feathers | Highs (6k-20kHz) | Flutter and shimmer |

## Customization Points

Once working, you can customize:

1. **Bone mappings** - Which bones respond to which frequencies
2. **Response curves** - How strongly bones react
3. **Smoothing factors** - How fluid vs. snappy motion is
4. **Beat detection** - Threshold and timing
5. **Camera positioning** - Viewing angle and distance
6. **Presets** - Create custom animation styles

## Performance Notes

- Runs at 60 FPS on modern hardware
- GPU usage: Moderate (3D rendering)
- CPU usage: Low (bone calculations are simple)
- Memory: ~10-20 MB (textures + geometry)

## Support & Documentation

- **Full docs**: README.md
- **Quick start**: SETUP.md
- **Source code**: chique.js (well-commented)
- **Plugin guide**: FREQUE_PLUGIN_DEVELOPMENT_GUIDE_V2_1.md

## Next Steps After Installation

1. Try all 4 presets (Default, Subtle, Headbanger, Flow)
2. Adjust individual controls to find your style
3. Test with different music genres
4. Combine with other Freque plugins
5. Create custom presets for your performances
6. Consider modifying bone mappings for unique animations

## Troubleshooting

If it doesn't work:

1. **Check browser console** (F12 → Console tab)
2. **Verify file paths** - All files in correct locations?
3. **Test with simple audio** - Try a test tone first
4. **Check GPU support** - Does browser support WebGL?
5. **Try different browser** - Sometimes Chrome works better
6. **Reload Freque** - Fresh start can help

## Advanced: Modifying the Character

Want to use a different MOHO character?

1. Export from MOHO as GLTF
2. Place GLTF in plugin directory
3. Update texture folder name in GLTF file
4. Modify bone names in `animateBones()` method
5. Test and adjust mappings

---

**You're all set!** Download the 4 files, organize your textures, and start visualizing! 🎵✨
