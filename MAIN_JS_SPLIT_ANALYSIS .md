# main.js Split Analysis (Revised)

## Current State

**main.js: 30,963 lines** containing 10 classes, with `FrequeVisualizer` being 19,000+ lines.

## Target State

**~32 new files** averaging ~900 lines each, plus your existing ~22 non-main files = **~54 total JS files**

---

## Class Inventory

| Lines | Class | Size | Action |
|-------|-------|------|--------|
| 31-381 | `ParameterController` | 350 | → `src/autopilot/` |
| 382-566 | `GenreDetector` | 185 | → `src/autopilot/` |
| 567-840 | `HarmonicAnalyzer` | 274 | → `src/autopilot/` |
| 841-1019 | `StructureDetector` | 179 | → `src/autopilot/` |
| 1020-1390 | `AudioAnalyzer` | 371 | → `src/autopilot/` |
| 1391-1679 | `DecisionEngine` | 289 | → `src/autopilot/` |
| 1680-8439 | `RecordManager` | 6,760 | → `src/recording/` (split into 2) |
| 8440-9480 | `LiveDisplayManager` | 1,041 | → `src/streaming/` |
| 9481-10531 | `StreamManager` | 1,051 | → `src/streaming/` |
| 10532-30962 | `FrequeVisualizer` | 19,090 | → Split into ~15 modules |

---

## New File Structure

```
src/
├── autopilot/                    # AI/Analysis system (~1,650 lines total)
│   ├── ParameterController.js        350 lines
│   ├── GenreDetector.js              185 lines
│   ├── HarmonicAnalyzer.js           274 lines
│   ├── StructureDetector.js          179 lines
│   ├── AudioAnalyzer.js              371 lines
│   ├── DecisionEngine.js             289 lines
│   └── index.js                      (barrel export)
│
├── recording/                    # Recording system (~6,760 lines total)
│   ├── RecordManager.js              ~4,000 lines (core recording)
│   ├── RecordingUI.js                ~2,760 lines (UI handlers)
│   └── index.js
│
├── streaming/                    # Live display/streaming (~2,100 lines total)
│   ├── LiveDisplayManager.js         1,041 lines
│   ├── StreamManager.js              1,051 lines
│   └── index.js
│
├── core/                         # FrequeVisualizer core (~5,500 lines total)
│   ├── FrequeVisualizer.js           ~2,000 lines (state + init + orchestration)
│   ├── AudioInputManager.js          ~1,200 lines (audio devices + monitoring)
│   ├── VideoInputManager.js          ~2,300 lines (camera + video files + filters)
│   └── index.js
│
├── effects/                      # Visual effects (~4,000 lines total)
│   ├── KaleidoscopeController.js     ~1,400 lines (kaleidoscope + presets)
│   ├── VisualEffectsController.js    ~1,400 lines (Blobs + InfiniteZoom + WebGL)
│   ├── FluidNebulaController.js      ~1,200 lines (FluidDynamics + Nebula)
│   └── index.js
│
├── ui/                           # UI controllers (~5,200 lines total)
│   ├── MixerController.js            ~2,200 lines (mixer panel + channel handlers)
│   ├── FooterController.js           ~1,800 lines (footer panels + controls)
│   ├── PanelManager.js               ~1,200 lines (floating panels + presets)
│   └── index.js
│
├── playlist/                     # Playlist system (~2,000 lines total)
│   ├── PlaylistManager.js            ~1,200 lines (tracks + playback)
│   ├── PlaylistUI.js                 ~800 lines (playlist panel UI)
│   └── index.js
│
├── visualization/                # Visualization modes (~2,300 lines total)
│   ├── MorphController.js            ~1,400 lines (morphing + energy detection)
│   ├── ModeManager.js                ~900 lines (mode switching + backgrounds)
│   └── index.js
│
└── main.js                       # Entry point (~100 lines)
    - imports all modules
    - initializes app
    - exposes window globals for plugins
```

---

## File Count Summary

| Directory | Files | Lines | Notes |
|-----------|-------|-------|-------|
| `src/autopilot/` | 7 | ~1,650 | 6 classes + barrel |
| `src/recording/` | 3 | ~6,760 | Split large class |
| `src/streaming/` | 3 | ~2,100 | 2 classes + barrel |
| `src/core/` | 4 | ~5,500 | FrequeVisualizer core |
| `src/effects/` | 4 | ~4,000 | 3 consolidated controllers |
| `src/ui/` | 4 | ~5,200 | 3 controllers + barrel |
| `src/playlist/` | 3 | ~2,000 | Playlist system |
| `src/visualization/` | 3 | ~2,300 | Morph + modes |
| `src/main.js` | 1 | ~100 | Entry point |
| **New files total** | **32** | **~29,600** | |

**Plus existing files (~22):**
- Audio analysis: `tempo-detector.js`, `frequency-band-calculator.js`, `beat-detector-enhanced.js`, `spectrum-analyzer.js`
- Wrappers: `audiomotion-master-wrapper.js`, `recording-master-wrapper.js`, `kaleidoscope-master-wrapper.js`, `spectrum-analyzer-master-wrapper.js`
- Controllers: `master-animation-controller.js`, `color-morph-manager.js`
- Plugin core: `plugin-base.js`, `plugin-folder-manager.js`, `plugin-autoloader.js`
- Utilities: `memory-profiler.js`
- Libraries: `three.min.js`, `three.module.js`, `GLTFLoader-es6-bridge.js`
- Plus a few others

**Grand total: ~54 JS files** (not counting plugins)

---

## Extraction Plan

### Phase 1: Easy Wins (Week 1)
**Goal:** Extract 9 standalone classes, reduce main.js by ~10,500 lines

| Day | Extract | Lines | From |
|-----|---------|-------|------|
| 1 | `ParameterController` | 350 | 31-381 |
| 1 | `GenreDetector` | 185 | 382-566 |
| 1 | `HarmonicAnalyzer` | 274 | 567-840 |
| 2 | `StructureDetector` | 179 | 841-1019 |
| 2 | `AudioAnalyzer` | 371 | 1020-1390 |
| 2 | `DecisionEngine` | 289 | 1391-1679 |
| 3-4 | `RecordManager` → split | 6,760 | 1680-8439 |
| 5 | `LiveDisplayManager` | 1,041 | 8440-9480 |
| 5 | `StreamManager` | 1,051 | 9481-10531 |

**Result: main.js drops from 31k to ~20k lines**

### Phase 2: Effects (Week 2)
**Goal:** Extract effect systems from FrequeVisualizer

| Day | Extract | Methods |
|-----|---------|---------|
| 1-2 | `KaleidoscopeController` | `initKaleidoscope`, `toggleKaleidoscope`, `applyKaleidoscopeEffect`, kaleidoscope presets, beat reaction |
| 3 | `VisualEffectsController` | `toggleBlobs`, `toggleInfiniteZoom`, `toggleWebGL`, `setupBlobsControls`, `setupWebGLControls` |
| 4-5 | `FluidNebulaController` | `toggleFluidDynamics`, fluid presets (29622-30176), nebula handlers |

**Result: main.js drops to ~14k lines**

### Phase 3: UI (Week 3)
**Goal:** Extract UI controllers

| Day | Extract | Methods |
|-----|---------|---------|
| 1-2 | `MixerController` | `toggleMixer`, mixer handlers (30177-30914), display mode buttons (30915-30962), channel setup |
| 3-4 | `FooterController` | `initializeFooterSettingsControls`, `initializeFooterDisplayControls`, `initializeFooterAutopilotControls`, `initializeFooterRecordControls` |
| 5 | `PanelManager` | `createPlaylistPanel`, `createVisualizerPanel`, `createColorPickerPanel`, `createBackgroundImagePanel`, preset save/load/export |

**Result: main.js drops to ~8k lines**

### Phase 4: Core (Week 4)
**Goal:** Finalize FrequeVisualizer split

| Day | Extract | Methods |
|-----|---------|---------|
| 1 | `AudioInputManager` | `initializeAudioInput`, `toggleLiveAudio`, `selectAudioDevice`, `setupAudioMonitoring`, device handling |
| 2-3 | `VideoInputManager` | `startVideoInput`, `startVideoFile`, `stopVideoInput`, video filters, camera stats |
| 4 | `PlaylistManager` + `PlaylistUI` | `initializePlaylistUI`, `loadPlaylist`, `selectTrack`, playback controls |
| 5 | `MorphController` + `ModeManager` | `startMorphing`, `updateMorph`, `setVisualizationMode`, `setRandomVisualization`, backgrounds |

**Result: main.js (now FrequeVisualizer.js) is ~2,000 lines of core orchestration**

---

## How to Extract: Step-by-Step Template

### Example: Extracting ParameterController

**Step 1: Create the new file**

```javascript
// src/autopilot/ParameterController.js

/**
 * Parameter Controller
 * Manages visualization parameter changes for autopilot system
 * 
 * @module autopilot/ParameterController
 */

export class ParameterController {
    constructor(autopilot) {
        this.autopilot = autopilot;
        this.visualizer = autopilot.visualizer;
        this.currentParameters = {};
        this.parameterHistory = [];
        
        // User feedback learning
        this.userAdjustments = [];
        this.feedbackHistory = [];
        this.lastUserAdjustment = null;
        this.adjustmentThreshold = 0.1;
    }
    
    // ... paste all methods from lines 46-380 ...
    
    applyParameterChanges(recommendations) {
        // ...
    }
    
    // etc.
}

// Backward compatibility for any code using window.ParameterController
if (typeof window !== 'undefined') {
    window.ParameterController = ParameterController;
}
```

**Step 2: Create barrel export**

```javascript
// src/autopilot/index.js

export { ParameterController } from './ParameterController.js';
export { GenreDetector } from './GenreDetector.js';
export { HarmonicAnalyzer } from './HarmonicAnalyzer.js';
export { StructureDetector } from './StructureDetector.js';
export { AudioAnalyzer } from './AudioAnalyzer.js';
export { DecisionEngine } from './DecisionEngine.js';
```

**Step 3: Update main.js**

```javascript
// At top of main.js (will become src/main.js):
import { 
    ParameterController,
    GenreDetector,
    HarmonicAnalyzer,
    StructureDetector,
    AudioAnalyzer,
    DecisionEngine 
} from './autopilot/index.js';

// DELETE lines 31-1679 from main.js
```

**Step 4: Test and commit**

---

## Extracting FrequeVisualizer Methods

For methods that need `this` context from FrequeVisualizer:

### Option A: Method Binding (Simpler, recommended to start)

```javascript
// src/effects/KaleidoscopeController.js

/**
 * Kaleidoscope effect methods
 * These get bound to FrequeVisualizer instance
 */

export function initKaleidoscope() {
    // 'this' refers to FrequeVisualizer instance
    this.kaleidoscopeEnabled = false;
    this.kaleidoscopeSegments = 6;
    // ...
}

export function toggleKaleidoscope() {
    this.kaleidoscopeEnabled = !this.kaleidoscopeEnabled;
    // ...
}

export function applyKaleidoscopeEffect() {
    if (!this.kaleidoscopeEnabled) return;
    // ...
}
```

```javascript
// src/core/FrequeVisualizer.js

import * as Kaleidoscope from '../effects/KaleidoscopeController.js';

class FrequeVisualizer {
    constructor() {
        // Core state only
        this.audio = null;
        this.audioMotion = null;
        // ...
        
        // Bind imported methods
        this.initKaleidoscope = Kaleidoscope.initKaleidoscope.bind(this);
        this.toggleKaleidoscope = Kaleidoscope.toggleKaleidoscope.bind(this);
        this.applyKaleidoscopeEffect = Kaleidoscope.applyKaleidoscopeEffect.bind(this);
    }
}
```

### Option B: Controller Classes (Cleaner, more work)

```javascript
// src/effects/KaleidoscopeController.js

export class KaleidoscopeController {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.enabled = false;
        this.segments = 6;
        this.speed = 1;
        this.scale = 1;
        // ... all kaleidoscope state moves here
    }
    
    init() {
        // Setup code
    }
    
    toggle() {
        this.enabled = !this.enabled;
        this.visualizer.updateKaleidoscopeButtonState();
    }
    
    applyEffect() {
        if (!this.enabled) return;
        // ... effect code, accessing this.visualizer when needed
    }
}
```

```javascript
// src/core/FrequeVisualizer.js

import { KaleidoscopeController } from '../effects/KaleidoscopeController.js';

class FrequeVisualizer {
    constructor() {
        this.audio = null;
        this.audioMotion = null;
        
        // Controllers
        this.kaleidoscope = new KaleidoscopeController(this);
    }
    
    // Delegate methods (for backward compatibility)
    toggleKaleidoscope() {
        this.kaleidoscope.toggle();
    }
}
```

**Recommendation:** Start with Option A (faster), refactor to Option B later if desired.

---

## Consolidated Effects: What Goes Where

### KaleidoscopeController.js (~1,400 lines)
- `initKaleidoscope()`
- `toggleKaleidoscope()`
- `toggleHeaderKaleidoscope()`
- `updateKaleidoscopeButtonState()`
- `startKaleidoscopeAnimation()`
- `stopKaleidoscopeAnimation()`
- `updateKaleidoscopeBeatReaction()`
- `applyKaleidoscopePreset()`
- `applyFiltersToKaleidoscopeContext()`
- `applyKaleidoscopeEffect()`
- `setKaleidoscopeSegments/Speed/Scale/CenterX/CenterY()`
- `updateKaleidoscopeCenterAnimation()`
- Kaleidoscope mixer event handlers (30177-30366)

### VisualEffectsController.js (~1,400 lines)
**Blobs:**
- `toggleBlobs()`
- `toggleHeaderBlobs()`
- `updateBlobsButton()`
- `positionBlobsPanel()`
- `setupBlobsControls()`
- `setBlobsOpacity()`

**Infinite Zoom:**
- `toggleInfiniteZoom()`
- `toggleHeaderInfiniteZoom()`
- `updateInfiniteZoomToggleButton()`
- `setInfiniteZoomOpacity()`

**WebGL:**
- `toggleWebGL()`
- `toggleHeaderWebGL()`
- `updateWebGLButton()`
- `setupWebGLControls()`

### FluidNebulaController.js (~1,200 lines)
**Fluid Dynamics:**
- `toggleFluidDynamics()`
- `toggleHeaderFluidDynamics()`
- `updateFluidDynamicsToggleButton()`
- Fluid presets (29622-30176): `applyFluidDynamicsDefaultPreset()`, `applyFluidDynamicsAmbientPreset()`, etc.
- `loadFluidPresets()`, `saveFluidPresets()`, `getCurrentFluidConfig()`

**Nebula:**
- `toggleHeaderNebula()`
- `initNebulaPresetButtonHandlers()`
- `updateNebulaPresetButton()`
- `initNebulaColorPresetHandlers()`
- `applyNebulaColorPreset()`
- `updateNebulaPresetDropdown()`
- `updateNebulaUIFromSettings()`
- `updateNebulaSliderValue()`
- `updateNebulaButtons()`

---

## Migration Checklist

### Week 1: Standalone Classes
- [ ] Create `src/autopilot/` folder
- [ ] Extract `ParameterController.js`
- [ ] Extract `GenreDetector.js`
- [ ] Extract `HarmonicAnalyzer.js`
- [ ] Extract `StructureDetector.js`
- [ ] Extract `AudioAnalyzer.js`
- [ ] Extract `DecisionEngine.js`
- [ ] Create `src/autopilot/index.js` barrel
- [ ] Create `src/recording/` folder
- [ ] Extract `RecordManager.js` (split if needed)
- [ ] Create `src/streaming/` folder
- [ ] Extract `LiveDisplayManager.js`
- [ ] Extract `StreamManager.js`
- [ ] Test everything still works
- [ ] **Checkpoint: main.js at ~20k lines**

### Week 2: Effects
- [ ] Create `src/effects/` folder
- [ ] Extract `KaleidoscopeController.js`
- [ ] Extract `VisualEffectsController.js` (Blobs + InfiniteZoom + WebGL)
- [ ] Extract `FluidNebulaController.js`
- [ ] Create `src/effects/index.js` barrel
- [ ] Test all effects still work
- [ ] **Checkpoint: main.js at ~14k lines**

### Week 3: UI
- [ ] Create `src/ui/` folder
- [ ] Extract `MixerController.js`
- [ ] Extract `FooterController.js`
- [ ] Extract `PanelManager.js`
- [ ] Create `src/ui/index.js` barrel
- [ ] Test all UI still works
- [ ] **Checkpoint: main.js at ~8k lines**

### Week 4: Core
- [ ] Create `src/core/` folder structure
- [ ] Extract `AudioInputManager.js`
- [ ] Extract `VideoInputManager.js`
- [ ] Create `src/playlist/` folder
- [ ] Extract `PlaylistManager.js` + `PlaylistUI.js`
- [ ] Create `src/visualization/` folder
- [ ] Extract `MorphController.js`
- [ ] Extract `ModeManager.js`
- [ ] Rename remaining main.js to `FrequeVisualizer.js`
- [ ] Create new `src/main.js` entry point
- [ ] Test everything
- [ ] **Final: FrequeVisualizer.js at ~2k lines**

---

## Final Structure

```
src/
├── main.js                           # Entry point (100 lines)
├── autopilot/                        # 7 files, ~1,650 lines
├── recording/                        # 3 files, ~6,760 lines
├── streaming/                        # 3 files, ~2,100 lines
├── core/                             # 4 files, ~5,500 lines
├── effects/                          # 4 files, ~4,000 lines
├── ui/                               # 4 files, ~5,200 lines
├── playlist/                         # 3 files, ~2,000 lines
└── visualization/                    # 3 files, ~2,300 lines

Total new files: 32
+ Existing files: ~22
─────────────────────
Grand total: ~54 JS files
```

Average file size: **~900 lines** — manageable, findable, changeable.
