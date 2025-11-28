# main.js Split Analysis (Revised)

## Implementation Approach

> **IMPORTANT: Two-Stage Migration**
> 
> **Stage 1 (Current):** Global Classes - Split files while keeping current architecture (no ES6 modules)
> **Stage 2 (Future):** ES6 Modules + Vite - Separate project after Stage 1 is complete and stable
> 
> **Branch:** `main-js-split`

---

## Current State

**main.js: 30,963 lines** containing 10 classes, with `FrequeVisualizer` being 19,000+ lines.

## Target State

**~31 new files** averaging ~900 lines each, plus your existing ~22 non-main files = **~53 total JS files**

---

## Testing Requirements

Each phase requires:
1. **Automated tests written BEFORE extraction begins** (using Playwright)
2. **Tests run after EACH class extraction**
3. **Full regression test at phase completion**
4. **Manual testing by user at phase checkpoint**

---

## Class Inventory

| Lines | Class | Size | Action |
|-------|-------|------|--------|
| 31-381 | `ParameterController` | 350 | → `src/autopilot/` |
| 382-566 | `GenreDetector` | 185 | → `src/autopilot/` |
| ~~567-840~~ | ~~`HarmonicAnalyzer`~~ | ~~274~~ | **SKIP** - Already in `spectrum-analyzer.js` |
| 841-1019 | `StructureDetector` | 179 | → `src/autopilot/` |
| 1020-1390 | `AudioAnalyzer` | 371 | → `src/autopilot/` |
| 1391-1679 | `DecisionEngine` | 289 | → `src/autopilot/` |
| 1680-8439 | `RecordManager` | 6,760 | → `src/recording/` |
| 8440-9480 | `LiveDisplayManager` | 1,041 | → `src/streaming/` |
| 9481-10531 | `StreamManager` | 1,051 | → `src/streaming/` |
| 10532-30962 | `FrequeVisualizer` | 19,090 | → Split into ~15 modules |

---

## New File Structure (Global Classes Approach)

> **Note:** No ES6 imports/exports in Stage 1. Classes remain global, loaded via `<script>` tags.
> Barrel exports (`index.js`) will be added in Stage 2 (ES6 migration).

```
src/
├── autopilot/                    # AI/Analysis system (~1,375 lines total)
│   ├── ParameterController.js        350 lines
│   ├── GenreDetector.js              185 lines
│   ├── StructureDetector.js          179 lines
│   ├── AudioAnalyzer.js              371 lines
│   └── DecisionEngine.js             289 lines
│   # Note: HarmonicAnalyzer already in js/spectrum-analyzer.js
│
├── recording/                    # Recording system (~6,760 lines total)
│   └── RecordManager.js              6,760 lines
│
├── streaming/                    # Live display/streaming (~2,100 lines total)
│   ├── LiveDisplayManager.js         1,041 lines
│   └── StreamManager.js              1,051 lines
│
├── core/                         # FrequeVisualizer core (~5,500 lines total)
│   ├── FrequeVisualizer.js           ~2,000 lines (state + init + orchestration)
│   ├── AudioInputManager.js          ~1,200 lines (audio devices + monitoring)
│   └── VideoInputManager.js          ~2,300 lines (camera + video files + filters)
│
├── effects/                      # Visual effects (~4,000 lines total)
│   ├── KaleidoscopeController.js     ~1,400 lines (kaleidoscope + presets)
│   ├── VisualEffectsController.js    ~1,400 lines (Blobs + InfiniteZoom + WebGL)
│   └── FluidNebulaController.js      ~1,200 lines (FluidDynamics + Nebula)
│
├── ui/                           # UI controllers (~5,200 lines total)
│   ├── MixerController.js            ~2,200 lines (mixer panel + channel handlers)
│   ├── FooterController.js           ~1,800 lines (footer panels + controls)
│   └── PanelManager.js               ~1,200 lines (floating panels + presets)
│
├── playlist/                     # Playlist system (~2,000 lines total)
│   ├── PlaylistManager.js            ~1,200 lines (tracks + playback)
│   └── PlaylistUI.js                 ~800 lines (playlist panel UI)
│
├── visualization/                # Visualization modes (~2,300 lines total)
│   ├── MorphController.js            ~1,400 lines (morphing + energy detection)
│   └── ModeManager.js                ~900 lines (mode switching + backgrounds)
│
└── main.js                       # Entry point (~100 lines)
    - Creates window.visualizer
    - Exposes window globals for plugins
    - NO ES6 imports in Stage 1
```

---

## File Count Summary

| Directory | Files | Lines | Notes |
|-----------|-------|-------|-------|
| `src/autopilot/` | 5 | ~1,375 | 5 classes (HarmonicAnalyzer already extracted) |
| `src/recording/` | 1 | ~6,760 | RecordManager |
| `src/streaming/` | 2 | ~2,100 | 2 classes |
| `src/core/` | 3 | ~5,500 | FrequeVisualizer core |
| `src/effects/` | 3 | ~4,000 | 3 consolidated controllers |
| `src/ui/` | 3 | ~5,200 | 3 controllers |
| `src/playlist/` | 2 | ~2,000 | Playlist system |
| `src/visualization/` | 2 | ~2,300 | Morph + modes |
| `src/main.js` | 1 | ~100 | Entry point |
| **New files total** | **22** | **~29,300** | |

**Plus existing files (~22):**
- Audio analysis: `tempo-detector.js`, `frequency-band-calculator.js`, `beat-detector-enhanced.js`, `spectrum-analyzer.js` (includes HarmonicAnalyzer)
- Wrappers: `audiomotion-master-wrapper.js`, `recording-master-wrapper.js`, `kaleidoscope-master-wrapper.js`, `spectrum-analyzer-master-wrapper.js`
- Controllers: `master-animation-controller.js`, `color-morph-manager.js`
- Plugin core: `plugin-base.js`, `plugin-folder-manager.js`, `plugin-autoloader.js`
- Utilities: `memory-profiler.js`
- Libraries: `three.min.js`, `three.module.js`, `GLTFLoader-es6-bridge.js`
- Plus a few others

**Grand total: ~44 JS files** (not counting plugins)

---

## Extraction Plan

### Pre-Phase: Setup (Day 1)
**Goal:** Prepare testing infrastructure and backup

| Task | Description |
|------|-------------|
| Install Playwright | `npm install -D @playwright/test && npx playwright install chromium` |
| Create test structure | `tests/` directory, `tests/fixtures/` with test audio |
| Backup main.js | `cp js/main.js js/main.js.backup-pre-split` |

---

### Phase 1: Standalone Classes (Days 2-8)
**Goal:** Extract 8 standalone classes, reduce main.js by ~10,200 lines

**Tests First (Day 2):** Write ~30 automated tests covering:
- App loads without errors
- Autopilot toggle enables/disables
- Genre detection displays
- Recording start/stop/download
- Live display toggle
- Stream settings accessible

| Day | Extract | Lines | From |
|-----|---------|-------|------|
| 3 | `ParameterController` | 350 | 31-381 |
| 3 | `GenreDetector` | 185 | 382-566 |
| - | ~~`HarmonicAnalyzer`~~ | ~~274~~ | **SKIP** - already in spectrum-analyzer.js |
| 4 | `StructureDetector` | 179 | 841-1019 |
| 4 | `AudioAnalyzer` | 371 | 1020-1390 |
| 4 | `DecisionEngine` | 289 | 1391-1679 |
| 5-6 | `RecordManager` | 6,760 | 1680-8439 |
| 7 | `LiveDisplayManager` | 1,041 | 8440-9480 |
| 8 | `StreamManager` | 1,051 | 9481-10531 |

**Phase Completion:**
- Run full regression tests
- Manual testing by user
- Git tag: `git tag phase-1-complete`

**Result: main.js drops from 31k to ~20k lines**

### Phase 2: Effects Controllers (Days 9-13)
**Goal:** Extract effect systems from FrequeVisualizer

**Tests First (Day 9):** Write ~40 automated tests covering:
- Kaleidoscope toggle/presets/sliders/beat reaction
- Plugin kaleidoscope integration still works
- Blobs toggle/opacity
- Infinite Zoom toggle/opacity
- WebGL toggle
- Fluid Dynamics toggle/presets
- Nebula toggle/presets

| Day | Extract | Methods |
|-----|---------|---------|
| 10-11 | `KaleidoscopeController` | `initKaleidoscope`, `toggleKaleidoscope`, `applyKaleidoscopeEffect`, kaleidoscope presets, beat reaction |
| 12 | `VisualEffectsController` | `toggleBlobs`, `toggleInfiniteZoom`, `toggleWebGL`, `setupBlobsControls`, `setupWebGLControls` |
| 13 | `FluidNebulaController` | `toggleFluidDynamics`, fluid presets (29622-30176), nebula handlers |

**Phase Completion:**
- Run full regression tests
- Manual testing by user
- Git tag: `git tag phase-2-complete`

**Result: main.js drops to ~14k lines**

### Phase 3: UI Controllers (Days 14-18)
**Goal:** Extract UI controllers

**Tests First (Day 14):** Write ~35 automated tests covering:
- Mixer panel open/close
- Channel strips function
- Display mode buttons
- Footer sections work
- Floating panels open/close
- Preset save/load/export

| Day | Extract | Methods |
|-----|---------|---------|
| 15-16 | `MixerController` | `toggleMixer`, mixer handlers (30177-30914), display mode buttons (30915-30962), channel setup |
| 17 | `FooterController` | `initializeFooterSettingsControls`, `initializeFooterDisplayControls`, `initializeFooterAutopilotControls`, `initializeFooterRecordControls` |
| 18 | `PanelManager` | `createPlaylistPanel`, `createVisualizerPanel`, `createColorPickerPanel`, `createBackgroundImagePanel`, preset save/load/export |

**Phase Completion:**
- Run full regression tests
- Manual testing by user
- Git tag: `git tag phase-3-complete`

**Result: main.js drops to ~8k lines**

### Phase 4: Core Modules (Days 19-25)
**Goal:** Finalize FrequeVisualizer split

**Tests First (Day 19):** Write ~35 automated tests covering:
- Microphone input works
- Device selection works
- Audio monitoring toggle
- Camera input works
- Video file input works
- Video filters work
- Playlist load/save/play/skip
- Drag-drop reorder
- Morph toggle works
- All visualization modes work
- Mode switching works

| Day | Extract | Methods |
|-----|---------|---------|
| 20 | `AudioInputManager` | `initializeAudioInput`, `toggleLiveAudio`, `selectAudioDevice`, `setupAudioMonitoring`, device handling |
| 21-22 | `VideoInputManager` | `startVideoInput`, `startVideoFile`, `stopVideoInput`, video filters, camera stats |
| 23 | `PlaylistManager` + `PlaylistUI` | `initializePlaylistUI`, `loadPlaylist`, `selectTrack`, playback controls |
| 24-25 | `MorphController` + `ModeManager` | `startMorphing`, `updateMorph`, `setVisualizationMode`, `setRandomVisualization`, backgrounds |

**Phase Completion:**
- Rename remaining main.js content to `src/core/FrequeVisualizer.js`
- Create new `src/main.js` entry point
- Run full regression tests
- Manual testing by user
- Git tag: `git tag phase-4-complete`

**Result: FrequeVisualizer.js is ~2,000 lines of core orchestration**

---

## How to Extract: Step-by-Step Template (Global Classes Approach)

> **IMPORTANT:** Stage 1 uses Global Classes (no ES6 modules).
> Classes remain globally accessible. No `import`/`export` statements.

### Example: Extracting ParameterController

**Step 1: Create the new file**

```javascript
// src/autopilot/ParameterController.js

/**
 * Parameter Controller
 * Manages visualization parameter changes for autopilot system
 * 
 * Dependencies: None (standalone class)
 * Used by: AIAutopilot (in audio-system.js)
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
        this.adjustmentThreshold = 0.1;
    }
    
    // ... paste all methods from lines 46-380 ...
    
    applyParameterChanges(recommendations) {
        // ...
    }
    
    // etc.
}

// Class is automatically global (no export needed in Stage 1)
```

**Step 2: Add script tag to index.html**

```html
<!-- In index.html, BEFORE main.js -->
<script src="src/autopilot/ParameterController.js"></script>
```

**Step 3: Remove class from main.js**

```javascript
// DELETE lines 31-381 from main.js
// The class is now loaded from src/autopilot/ParameterController.js
```

**Step 4: Test and commit**

```bash
# Run automated tests
npx playwright test tests/phase1-autopilot.spec.js

# If tests pass, commit
git add .
git commit -m "Extract ParameterController to src/autopilot/"
```

### Script Tag Load Order in index.html

```html
<!-- ============================================
     EXTRACTED CLASSES - LOAD ORDER MATTERS
     See DEPENDENCY_MANAGEMENT_STRATEGY.md
     ============================================ -->

<!-- Tier 1: Independent Autopilot Classes -->
<script src="src/autopilot/ParameterController.js"></script>
<script src="src/autopilot/GenreDetector.js"></script>
<script src="src/autopilot/StructureDetector.js"></script>
<script src="src/autopilot/AudioAnalyzer.js"></script>
<script src="src/autopilot/DecisionEngine.js"></script>

<!-- Tier 2: Recording & Streaming -->
<script src="src/recording/RecordManager.js"></script>
<script src="src/streaming/LiveDisplayManager.js"></script>
<script src="src/streaming/StreamManager.js"></script>

<!-- Continue with existing scripts -->
<script src="js/main.js"></script>
```

---

## Extracting FrequeVisualizer Methods (Global Classes Approach)

For methods that need `this` context from FrequeVisualizer:

### Option A: Method Binding (Simpler, recommended for Stage 1)

```javascript
// src/effects/KaleidoscopeController.js

/**
 * Kaleidoscope effect methods
 * These get bound to FrequeVisualizer instance
 * 
 * Dependencies: None
 * Used by: FrequeVisualizer (bound methods)
 */

// These functions will be bound to FrequeVisualizer instance
function initKaleidoscope() {
    // 'this' refers to FrequeVisualizer instance when bound
    this.kaleidoscopeEnabled = false;
    this.kaleidoscopeSegments = 6;
    // ...
}

function toggleKaleidoscope() {
    this.kaleidoscopeEnabled = !this.kaleidoscopeEnabled;
    // ...
}

function applyKaleidoscopeEffect() {
    if (!this.kaleidoscopeEnabled) return;
    // ...
}

// Make functions globally available for binding
window.KaleidoscopeMethods = {
    initKaleidoscope,
    toggleKaleidoscope,
    applyKaleidoscopeEffect
};
```

```javascript
// In FrequeVisualizer constructor (in main.js or FrequeVisualizer.js):

class FrequeVisualizer {
    constructor() {
        // Core state only
        this.audio = null;
        this.audioMotion = null;
        // ...
        
        // Bind methods from KaleidoscopeController
        this.initKaleidoscope = window.KaleidoscopeMethods.initKaleidoscope.bind(this);
        this.toggleKaleidoscope = window.KaleidoscopeMethods.toggleKaleidoscope.bind(this);
        this.applyKaleidoscopeEffect = window.KaleidoscopeMethods.applyKaleidoscopeEffect.bind(this);
    }
}
```

### Option B: Controller Classes (Cleaner, more work)

```javascript
// src/effects/KaleidoscopeController.js

/**
 * Kaleidoscope Controller
 * Manages kaleidoscope effect state and behavior
 * 
 * Dependencies: None
 * Used by: FrequeVisualizer
 */

class KaleidoscopeController {
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

// Class is automatically global
```

```javascript
// In FrequeVisualizer constructor:

class FrequeVisualizer {
    constructor() {
        this.audio = null;
        this.audioMotion = null;
        
        // Controllers
        this.kaleidoscope = new KaleidoscopeController(this);
    }
    
    // Delegate methods (for backward compatibility with plugins)
    toggleKaleidoscope() {
        this.kaleidoscope.toggle();
    }
}
```

**Recommendation:** Start with Option A (faster, less risk), refactor to Option B in Stage 2 (ES6) if desired.

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

## Migration Checklist (Stage 1: Global Classes)

### Pre-Phase: Setup (Day 1)
- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Install Chromium: `npx playwright install chromium`
- [ ] Create `tests/` directory
- [ ] Create `tests/fixtures/` with test audio file
- [ ] Create `playwright.config.js`
- [ ] Backup main.js: `cp js/main.js js/main.js.backup-pre-split`

### Phase 1: Standalone Classes (Days 2-8)
- [ ] Write ~30 automated tests for Autopilot/Recording/Streaming
- [ ] Create `src/autopilot/` folder
- [ ] Extract `ParameterController.js`
- [ ] Extract `GenreDetector.js`
- [ ] ~~Extract `HarmonicAnalyzer.js`~~ **SKIP - already in spectrum-analyzer.js**
- [ ] Extract `StructureDetector.js`
- [ ] Extract `AudioAnalyzer.js`
- [ ] Extract `DecisionEngine.js`
- [ ] Create `src/recording/` folder
- [ ] Extract `RecordManager.js`
- [ ] Create `src/streaming/` folder
- [ ] Extract `LiveDisplayManager.js`
- [ ] Extract `StreamManager.js`
- [ ] Add script tags to index.html
- [ ] Run full regression tests
- [ ] Manual testing
- [ ] Git tag: `git tag phase-1-complete`
- [ ] **Checkpoint: main.js at ~20k lines**

### Phase 2: Effects (Days 9-13)
- [ ] Write ~40 automated tests for Effects
- [ ] Create `src/effects/` folder
- [ ] Extract `KaleidoscopeController.js`
- [ ] Extract `VisualEffectsController.js` (Blobs + InfiniteZoom + WebGL)
- [ ] Extract `FluidNebulaController.js`
- [ ] Add script tags to index.html
- [ ] Run full regression tests
- [ ] Manual testing
- [ ] Git tag: `git tag phase-2-complete`
- [ ] **Checkpoint: main.js at ~14k lines**

### Phase 3: UI (Days 14-18)
- [ ] Write ~35 automated tests for UI
- [ ] Create `src/ui/` folder
- [ ] Extract `MixerController.js`
- [ ] Extract `FooterController.js`
- [ ] Extract `PanelManager.js`
- [ ] Add script tags to index.html
- [ ] Run full regression tests
- [ ] Manual testing
- [ ] Git tag: `git tag phase-3-complete`
- [ ] **Checkpoint: main.js at ~8k lines**

### Phase 4: Core (Days 19-25)
- [ ] Write ~35 automated tests for Core
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
- [ ] Add script tags to index.html
- [ ] Run full regression tests
- [ ] Manual testing
- [ ] Git tag: `git tag phase-4-complete`
- [ ] **Final: FrequeVisualizer.js at ~2k lines**

---

## Stage 2: ES6 Modules (Future Separate Project)

After Stage 1 is complete and stable, see `MIGRATION_PLAN.md` for:
- Vite setup and configuration
- Converting to ES6 import/export
- Adding barrel exports (index.js files)
- Code protection (obfuscation, domain lock)
- V8 bytecode for Electron

---

## Final Structure (After Stage 1)

```
src/
├── main.js                           # Entry point (100 lines)
├── autopilot/                        # 5 files, ~1,375 lines
│   ├── ParameterController.js
│   ├── GenreDetector.js
│   ├── StructureDetector.js
│   ├── AudioAnalyzer.js
│   └── DecisionEngine.js
├── recording/                        # 1 file, ~6,760 lines
│   └── RecordManager.js
├── streaming/                        # 2 files, ~2,100 lines
│   ├── LiveDisplayManager.js
│   └── StreamManager.js
├── core/                             # 3 files, ~5,500 lines
│   ├── FrequeVisualizer.js
│   ├── AudioInputManager.js
│   └── VideoInputManager.js
├── effects/                          # 3 files, ~4,000 lines
│   ├── KaleidoscopeController.js
│   ├── VisualEffectsController.js
│   └── FluidNebulaController.js
├── ui/                               # 3 files, ~5,200 lines
│   ├── MixerController.js
│   ├── FooterController.js
│   └── PanelManager.js
├── playlist/                         # 2 files, ~2,000 lines
│   ├── PlaylistManager.js
│   └── PlaylistUI.js
└── visualization/                    # 2 files, ~2,300 lines
    ├── MorphController.js
    └── ModeManager.js

Total new files: 22
+ Existing files: ~22
─────────────────────
Grand total: ~44 JS files
```

Average file size: **~900 lines** — manageable, findable, changeable.

---

## Timeline Summary

| Phase | Days | Tests | Extractions | Result |
|-------|------|-------|-------------|--------|
| Pre-Phase | 1 | Setup | - | Test infrastructure ready |
| Phase 1 | 7 | 30 | 8 classes | 31k → 20k lines |
| Phase 2 | 5 | 40 | 3 controllers | 20k → 14k lines |
| Phase 3 | 5 | 35 | 3 controllers | 14k → 8k lines |
| Phase 4 | 7 | 35 | 6 modules | 8k → 2k lines |
| Buffer | 3-5 | - | Bug fixes | - |
| **Total** | **~28-30 days** | **~140 tests** | **22 files** | **main.js: 31k → 2k** |
