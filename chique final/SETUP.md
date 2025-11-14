# Chique Plugin - Quick Setup Guide

## Step-by-Step Installation

### 1. Prepare Your Files

You should have:
- ✅ chique.js (the plugin code)
- ✅ moho_char.gltf (character model)
- ✅ 41 PNG texture files

### 2. Create Directory Structure

In your Freque installation, navigate to the plugins folder and create:

```
your-freque-directory/
  plugins/
    chique/              ← Create this folder
      chique.js          ← Place plugin here
      moho_char.gltf     ← Place GLTF here
      moho_char__gltf/   ← Create this folder for textures
        (all PNG files)  ← Place all 41 PNGs here
```

### 3. Organize Texture Files

All PNG files should go in `moho_char__gltf/` directory:

**Head Parts:**
- cabeza_copy_bc89490f-62e7-4149-b987-35a11ea8f72b.png
- calavera_atras_6c3d61e9-8c44-4442-a310-63e50da89c43.png
- calavera_0460f3b1-ceb9-4326-b076-febd1f343f27.png
- oreja_4019e858-0e43-4d50-bacc-1ae6efd406e9.png
- pelo_etremedio_e6260406-c1d2-46ba-89f3-8904d4331a46.png
- patilla2_506dc33b-17a0-4010-8e71-4b0319fa61bf.png
- patillla_bf2e02bc-6fd0-4a28-9506-36955324994d.png

**Body Parts:**
- capa_ce5a130d-e271-4d5b-9bba-6086f3566723.png
- cuello_fb198c1b-4975-47e2-a0a2-331842ab6696.png
- hombrera_11aeefeb-d429-42f0-a399-b829d8c870c2.png
- torso_2f54a0ee-2340-46ac-83d8-58d1ca2cfc06.png

**Limbs:**
- dedos_b526185d-3d09-4a35-bb81-61ca5f62f45b.png
- MANO_ABAJO_9c1bf16b-3256-4ad8-a85c-5a007c8b2f65.png
- pulgar_f86b3647-6e84-4261-88b2-a58e8af860c1.png
- puno_copy_66fb0f9c-b37e-4e29-88df-75b05e3b41c1.png
- puno_detras_iz_be54ab75-7226-43f4-91b3-04415a6fabd4.png
- puno_7ffe4f54-5da6-4160-9428-6ff67c58e42d.png
- pierna_extendida_1_5c360512-6125-4f15-a779-ee8c9e06b26a.png
- pierna_extendida_2_7bddf866-0919-4fc6-b911-ae481b062422.png

**Decorative:**
- hojita_67e194bb-e8e7-4a1e-a357-a1c7ff5926e4.png
- palito_98db9806-3675-4ab6-85c5-74e2c68cb2bb.png
- pluma1_323b7b66-2c87-44a4-af5f-3067f7c24ae9.png

**Layer Files:**
- Layer_1_af8592ee-11ca-4dbe-82da-ab0f29b3ea60.png
- Layer_2_d4a0ef1f-c85a-4a54-b9ef-6b26d98106f9.png
- Layer_3_21e83f19-7367-40e3-9de0-32f1f249080e.png
- Layer_4_087dfec8-7b11-433e-9271-50505adb6c89.png
- Layer_12_bf8489b6-480b-4d34-a883-19419eb2637d.png
- Layer_21_e20b9faa-2d05-46f8-a977-27d8ddf73c1c.png

**Feathers (Plumas 1):**
- plumas_1_1_dbeb5737-456a-42ec-bdf4-62a0d2757f91.png
- plumas_1_2_5a8b0eec-5cce-4283-b5e7-0b1faf8d61d6.png
- plumas_1_3_81bd4372-cf4c-4653-8d8d-2fd109a3c41c.png
- plumas_1_4_f66cef48-9ed5-425b-9ca2-110c01d1d338.png
- plumas_1_5_cb1f63fc-0682-44b7-9948-d19641498f09.png
- plumas_1_6_25dab393-85cf-4d02-b654-ffbf10a2f960.png
- plumas_1_7_6bcd323a-76ec-4ba3-b815-8a297212e9b3.png
- plumas_1_8_5682cc0c-631b-44ad-b132-0fd30cc695b6.png

**Feathers (Plumas 2):**
- plumas_2_1_85cb0fb3-9109-48e6-9eb0-efa557c1056e.png
- plumas_2_2_c3e40e64-b9b6-4a94-9199-c356a3c31c18.png
- plumas_2_3_7b3339a9-610a-4efe-93b2-6856f3ede7ca.png
- plumas_2_3_77478e33-2cd2-4524-8fc2-89692e46e33c.png
- plumas_2_3_361487a1-30ba-47c5-b397-af119d5c867a.png

### 4. Load in Freque

1. Start Freque application
2. Open the Plugins panel
3. Look for "Chique" in the available plugins list
4. Click to activate

### 5. Test and Configure

1. Start playing audio
2. Character should appear and begin animating
3. Open plugin controls to adjust:
   - Overall Intensity
   - Motion Smoothing
   - Individual body part intensities
4. Try different presets to find your preferred style

## Quick Checklist

Before loading the plugin, verify:

- [ ] chique.js is in `plugins/chique/`
- [ ] moho_char.gltf is in `plugins/chique/`
- [ ] Directory `moho_char__gltf/` exists in `plugins/chique/`
- [ ] All 41 PNG files are in `moho_char__gltf/`
- [ ] Filenames match exactly (case-sensitive!)
- [ ] Three.js is available in Freque (should be built-in)

## Common Issues

### "Failed to load GLTF"
- Check file paths are correct
- Verify GLTF file is in same directory as chique.js
- Ensure texture folder name matches exactly: `moho_char__gltf`

### "Textures not loading"
- Verify all PNG files are present
- Check filenames match exactly (including GUIDs)
- Ensure files aren't corrupted

### "Plugin not appearing"
- Verify chique.js is in correct location
- Check browser console for JavaScript errors
- Ensure FrequePluginBase is loaded before plugin

### "Character not animating"
- Check audio is playing
- Verify plugin is active (not disabled)
- Try increasing "Overall Intensity" slider
- Check system has audio input

## Performance Tips

- If framerate drops, reduce "Feather Flutter" intensity
- Close other resource-intensive plugins
- Lower character scale if needed
- Adjust camera distance for optimal viewing

## Next Steps

Once installed and working:

1. Experiment with different presets
2. Adjust controls to match your music style
3. Create custom presets (see README.md)
4. Combine with other Freque plugins for complex visuals
5. Record your performance with screen capture

## Support

For issues or questions:
- Check browser console (F12) for errors
- Verify all files are present and correctly named
- Review the full README.md for detailed documentation
- Check Freque documentation for plugin system details

## File Structure Visual

```
plugins/
└── chique/
    ├── chique.js                    (Plugin code)
    ├── moho_char.gltf              (Character model)
    ├── README.md                    (Full documentation)
    ├── SETUP.md                     (This file)
    └── moho_char__gltf/            (Texture directory)
        ├── cabeza_copy_*.png
        ├── calavera_*.png
        ├── capa_*.png
        ├── cuello_*.png
        ├── dedos_*.png
        ├── hojita_*.png
        ├── hombrera_*.png
        ├── Layer_1_*.png
        ├── Layer_2_*.png
        ├── Layer_3_*.png
        ├── Layer_4_*.png
        ├── Layer_12_*.png
        ├── Layer_21_*.png
        ├── MANO_ABAJO_*.png
        ├── oreja_*.png
        ├── palito_*.png
        ├── patilla2_*.png
        ├── patillla_*.png
        ├── pelo_etremedio_*.png
        ├── pierna_extendida_1_*.png
        ├── pierna_extendida_2_*.png
        ├── pluma1_*.png
        ├── plumas_1_1_*.png
        ├── plumas_1_2_*.png
        ├── plumas_1_3_*.png
        ├── plumas_1_4_*.png
        ├── plumas_1_5_*.png
        ├── plumas_1_6_*.png
        ├── plumas_1_7_*.png
        ├── plumas_1_8_*.png
        ├── plumas_2_1_*.png
        ├── plumas_2_2_*.png
        ├── plumas_2_3_*.png (3 versions)
        ├── pulgar_*.png
        ├── puno_*.png
        ├── puno_copy_*.png
        ├── puno_detras_iz_*.png
        └── torso_*.png
```

Happy visualizing! 🎵🎨
