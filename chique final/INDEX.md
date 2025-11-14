# Chique Plugin - Complete Package

## 📦 Package Contents

This package contains everything you need to run the Chique audio-reactive character animation plugin for Freque.

### Core Files (7 files)

1. **chique.js** (18 KB)
   - Main plugin code
   - Contains all animation logic
   - Auto-registers with Freque

2. **moho_char.gltf** (770 KB)
   - 3D character model
   - Skeletal rig with 40+ bones
   - References texture files

3. **README.md** (6.4 KB)
   - Complete documentation
   - Feature overview
   - Technical details
   - Customization guide

4. **SETUP.md** (6.8 KB)
   - Quick installation guide
   - Step-by-step instructions
   - File organization help

5. **DEPLOYMENT.md** (7 KB)
   - Full deployment instructions
   - Directory structure guide
   - Complete file list

6. **TROUBLESHOOTING.md** (9.5 KB)
   - Common issues and solutions
   - Debug procedures
   - Performance tips

7. **test-character.html** (8.8 KB)
   - Standalone test page
   - Verifies GLTF loads correctly
   - Useful for debugging

### Texture Files (41 PNG files - you have these)

Located in your uploads, need to be organized into `moho_char__gltf/` folder.

## 🚀 Quick Start

### Absolute Minimum to Get Running:

1. **Download these 3 files:**
   - chique.js
   - moho_char.gltf
   - (All your PNG texture files)

2. **Create this structure:**
   ```
   plugins/chique/
     ├── chique.js
     ├── moho_char.gltf
     └── moho_char__gltf/
         └── (41 PNG files here)
   ```

3. **Load in Freque and play music!**

## 📖 Which File Should I Read First?

### If you want to...

**...get it running ASAP:**
→ Read **SETUP.md**

**...understand what it does:**
→ Read **README.md**

**...deploy to production:**
→ Read **DEPLOYMENT.md**

**...fix problems:**
→ Read **TROUBLESHOOTING.md**

**...test before deploying:**
→ Use **test-character.html**

**...modify the code:**
→ Read **README.md** → Technical Details section
→ Then examine **chique.js** (well-commented)

## 🎯 Installation Path

### Recommended Order:

```
1. Read SETUP.md (5 min)
   ↓
2. Organize your files (10 min)
   ↓
3. Test with test-character.html (5 min)
   ↓
4. If test works, deploy to Freque (5 min)
   ↓
5. If test fails, check TROUBLESHOOTING.md
   ↓
6. If deployed but not working, check TROUBLESHOOTING.md
   ↓
7. Once working, read README.md to learn customization
```

## 🎨 What This Plugin Does

**Chique** is an audio-reactive character animation plugin that:

- Loads a MOHO-rigged character (Day of the Dead theme)
- Analyzes audio into 6 frequency bands
- Maps frequencies to skeletal bone movements
- Creates natural, music-synchronized animation
- Supports beat detection for accent movements
- Offers 4 presets and 8 customizable controls

**Example Animation:**
- Bass → Body sway, leg bounce
- Vocals → Head bobbing, arm movement
- Cymbals → Feather flutter, hair sway
- Kicks → Beat pulse on whole character

## 🔧 Technical Stack

- **Framework**: Three.js (r128)
- **Rendering**: WebGL 2.0
- **Audio**: Web Audio API
- **Model Format**: GLTF 2.0
- **Textures**: PNG (41 files, ~3-5 MB total)
- **Performance**: 60 FPS target

## 📊 File Sizes

| File | Size | Purpose |
|------|------|---------|
| chique.js | 18 KB | Plugin logic |
| moho_char.gltf | 770 KB | 3D model |
| README.md | 6.4 KB | Documentation |
| SETUP.md | 6.8 KB | Quick start |
| DEPLOYMENT.md | 7 KB | Deployment guide |
| TROUBLESHOOTING.md | 9.5 KB | Problem solving |
| test-character.html | 8.8 KB | Test page |
| 41 PNG textures | ~3-5 MB | Character art |
| **TOTAL** | ~4-6 MB | Complete package |

## 🎮 Controls Overview

Once running, you'll have these controls:

### Master Controls
- Overall Intensity (0-2)
- Motion Smoothing (0-0.5)

### Body Part Controls
- Head Bob (0-2)
- Body Sway (0-2)
- Feather Flutter (0-2)

### View Controls
- Camera Distance (5-50)
- Character Scale (0.1-3)
- Beat Pulse (on/off)

### Presets
- Default Groove
- Subtle Movement
- Headbanger
- Smooth Flow

## 🎵 Audio Mapping

| Frequency Band | Range | Maps To |
|---------------|-------|---------|
| Sub-bass | 20-60 Hz | Legs |
| Bass | 60-250 Hz | Torso, Cape |
| Low-mid | 250-500 Hz | (Reserved) |
| Mid | 500-2 kHz | Head, Arms |
| High-mid | 2-6 kHz | Hair |
| High | 6-20 kHz | Feathers |

## ✅ Pre-Installation Checklist

Before you start, make sure you have:

- [ ] Freque installed and working
- [ ] All 41 PNG texture files
- [ ] chique.js downloaded
- [ ] moho_char.gltf downloaded
- [ ] Modern browser (Chrome/Firefox/Edge)
- [ ] Basic understanding of file structures
- [ ] 5-6 MB of free disk space

## 🔍 Verification Checklist

After installation, verify:

- [ ] All files in correct locations
- [ ] Texture folder named `moho_char__gltf` (double underscore)
- [ ] Character loads in test-character.html
- [ ] Plugin appears in Freque plugin list
- [ ] Character visible when plugin active
- [ ] Animation responds to audio
- [ ] Controls panel accessible
- [ ] Presets work correctly

## 🆘 Quick Problem Solving

### Character doesn't load?
→ Check TROUBLESHOOTING.md → Issue 1

### Character is white/no texture?
→ Check TROUBLESHOOTING.md → Issue 2

### No animation when music plays?
→ Check TROUBLESHOOTING.md → Issue 3

### Performance issues?
→ Check TROUBLESHOOTING.md → Issue 6

### Any other problem?
→ Read through TROUBLESHOOTING.md

## 🎓 Learning Path

### Beginner: Just Want It Working
1. Download files
2. Follow SETUP.md
3. Test with test-character.html
4. Deploy to Freque
5. Try different presets

### Intermediate: Customize Behavior
1. Complete beginner steps
2. Read README.md completely
3. Adjust controls to find sweet spot
4. Modify preset values
5. Test with different music genres

### Advanced: Modify Animation
1. Complete intermediate steps
2. Study chique.js code structure
3. Understand bone mapping system
4. Modify `animateBones()` function
5. Create custom frequency mappings
6. Add new controls/features

## 📁 Recommended File Organization

### Option 1: Minimal (Just works)
```
plugins/chique/
  ├── chique.js
  ├── moho_char.gltf
  └── moho_char__gltf/
      └── (41 PNGs)
```

### Option 2: Complete (With docs)
```
plugins/chique/
  ├── chique.js
  ├── moho_char.gltf
  ├── README.md
  ├── SETUP.md
  ├── DEPLOYMENT.md
  ├── TROUBLESHOOTING.md
  ├── test-character.html
  └── moho_char__gltf/
      └── (41 PNGs)
```

### Option 3: Development (For customization)
```
plugins/chique/
  ├── src/
  │   ├── chique.js
  │   ├── bone-mappings.js
  │   └── audio-analyzer.js
  ├── assets/
  │   ├── moho_char.gltf
  │   └── moho_char__gltf/
  ├── docs/
  │   ├── README.md
  │   ├── SETUP.md
  │   ├── DEPLOYMENT.md
  │   └── TROUBLESHOOTING.md
  └── test/
      └── test-character.html
```

## 🎯 Success Criteria

You'll know it's working when:

✅ Character appears in Freque viewport
✅ Character animates when audio plays
✅ Head bobs to vocals/mids
✅ Body sways to bass
✅ Feathers flutter to highs
✅ Beat pulse works on kicks
✅ Controls adjust behavior
✅ Presets change animation style
✅ No console errors
✅ Runs at 60 FPS

## 🚨 Red Flags

Something's wrong if:

❌ Character is completely white
❌ Console shows 404 errors
❌ Character doesn't appear at all
❌ Animation freezes/stutters
❌ Controls have no effect
❌ Framerate < 30 FPS
❌ Browser crashes/hangs

→ If you see any of these, check TROUBLESHOOTING.md

## 📞 Support Resources

### Included Documentation
- README.md - Complete reference
- SETUP.md - Installation guide
- DEPLOYMENT.md - Deployment reference
- TROUBLESHOOTING.md - Problem solving
- test-character.html - Testing tool
- chique.js - Well-commented source

### External Resources
- Three.js docs: threejs.org/docs
- GLTF specification: khronos.org/gltf
- Web Audio API: developer.mozilla.org/Web_Audio_API
- MOHO: lostmarble.com

## 🎉 What's Next?

Once you have it working:

1. **Experiment with presets** - Find your style
2. **Test different music** - Rock, EDM, jazz, classical
3. **Adjust controls** - Dial in perfect response
4. **Combine with other plugins** - Freque supports multiple
5. **Create custom presets** - Save your configurations
6. **Modify animations** - Edit bone mappings
7. **Share your work** - Record and showcase!

## 📝 Version Info

**Chique Plugin v1.0.0**
- Initial release
- 6-band frequency analysis
- 40+ bone skeletal animation
- 4 presets, 8 controls
- Beat detection system
- Full Three.js integration
- MOHO character support

**Tested With:**
- Freque 2.1+
- Three.js r128
- Chrome 98+, Firefox 97+, Edge 98+
- Windows 10/11, macOS 12+, Linux

## 📄 License & Credits

**Plugin Development**: Steve
**Character Design**: MOHO (Lost Marble)
**Platform**: Freque (meltlive.com)
**Technology**: Three.js, WebGL, Web Audio API

Part of the Freque visualization ecosystem.

---

## 🎬 Ready to Start?

1. ⬇️ Download all files
2. 📖 Read SETUP.md
3. 📁 Organize your files
4. 🧪 Test with test-character.html
5. 🚀 Deploy to Freque
6. 🎵 Play music and enjoy!

**Time Required**: 15-30 minutes for complete setup

**Skill Level**: Beginner-friendly

**Result**: Fully functional audio-reactive character animation

---

Good luck, and happy visualizing! 🎨🎵✨
