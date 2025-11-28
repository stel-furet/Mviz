# Freque → Vite ES6 Migration Plan (Revised)

> ## ⚠️ IMPORTANT: This is STAGE 2 (Future Project)
> 
> **This plan is NOT being executed now.**
> 
> **Current Work:** Stage 1 - Global Classes Split (see `MAIN_JS_SPLIT_ANALYSIS.md`)
> - Split main.js into ~22 smaller files
> - Keep current global class architecture
> - No ES6 modules yet
> - No Vite/bundler yet
> 
> **This Plan (Stage 2):** To be executed AFTER Stage 1 is complete and stable
> - Convert to ES6 modules
> - Add Vite bundler
> - Add code protection
> 
> **Estimated Start:** After Stage 1 completion (~4-5 weeks from Stage 1 start)

---

## Key Changes From Original Plan

| Concern | Solution |
|---------|----------|
| **Plugins outside bundle** | ✅ Plugins remain standalone `.js` files, loaded at runtime |
| **Third-party plugin devs** | ✅ Zero changes required to their workflow |
| **Folder-based loading** | ✅ Drag-and-drop to folders still works |
| **Code protection** | ✅ Multi-layer approach added (see Phase 6) |
| **Browser delivery** | ✅ No change |
| **Electron delivery** | ✅ No change + additional V8 bytecode option |

---

## Prerequisites

Before starting this plan, ensure:
- [ ] Stage 1 (Global Classes Split) is complete
- [ ] All automated tests pass
- [ ] App is stable and functional
- [ ] Git tag `phase-4-complete` exists
- [ ] main.js is now ~2,000 lines (FrequeVisualizer.js)

---

## Architecture Overview

```
Your App (Bundled & Protected)          Plugins (NOT Bundled)
┌─────────────────────────────────┐     ┌──────────────────────────────┐
│  dist/                          │     │  plugins/                    │
│  ├── index.html                 │     │  ├── goo-freque-plugin.js    │
│  ├── assets/                    │     │  ├── psych-freque-plugin.js  │
│  │   ├── main-[hash].js ←───────│─────│──│── Exposes window.visualizer│
│  │   │   (obfuscated)           │     │  │   window.pluginManager     │
│  │   │   (domain-locked)        │     │  │   window.FrequePluginBase  │
│  │   └── vendor-[hash].js       │     │  └── vidtrip-freque-plugin.js│
│  └── js/three.module.js         │     │                              │
└─────────────────────────────────┘     │  user-plugins/  (custom path)│
                                        │  └── my-custom-plugin.js     │
                                        └──────────────────────────────┘
```

**Critical:** Your core app gets bundled, minified, and obfuscated. Plugins stay as plain `.js` files that third-party developers can create without any build tools.

---

## Current State Analysis

| Metric | Value | Verdict |
|--------|-------|---------|
| Total JS files | 38 | Manageable |
| `main.js` size | 31,000 lines | 🔴 Critical - must split |
| Module system | Global (window) | Needs modernizing |
| Plugin architecture | Self-registering | ✅ Keep this pattern |
| Delivery | Browser + Electron | Both supported |

---

## Phase 1: Vite Setup (Day 1)
**Goal:** Get Vite running with your existing code unchanged.

### 1.1 Initialize Vite
```bash
cd freque
npm init -y
npm install vite --save-dev
```

### 1.2 Create vite.config.js
See the `vite.config.js` file provided.

### 1.3 Create new entry point
Create `src/main.js` that imports your existing scripts.

### 1.4 Update index.html
Replace all `<script>` tags with:
```html
<script type="module" src="/src/main.js"></script>

<!-- Plugins loaded separately at runtime -->
<script src="plugins/core/plugin-base.js" defer></script>
<script src="plugins/core/plugin-manager.js" defer></script>
```

### 1.5 Test
```bash
npx vite
```

---

## Phase 2: Split main.js (Weeks 1-4)
**Goal:** Break the 31,000-line main.js into ~32 logical modules.

> 📄 **See `MAIN_JS_SPLIT_ANALYSIS.md` for detailed line-by-line breakdown and weekly schedule.**

### Target Structure
```
src/
├── main.js                       # Entry point (~100 lines)
│
├── autopilot/                    # AI/Analysis system (~1,650 lines)
│   ├── ParameterController.js        350 lines
│   ├── GenreDetector.js              185 lines
│   ├── HarmonicAnalyzer.js           274 lines
│   ├── StructureDetector.js          179 lines
│   ├── AudioAnalyzer.js              371 lines
│   ├── DecisionEngine.js             289 lines
│   └── index.js
│
├── recording/                    # Recording system (~6,760 lines)
│   ├── RecordManager.js              ~4,000 lines
│   ├── RecordingUI.js                ~2,760 lines
│   └── index.js
│
├── streaming/                    # Live display/streaming (~2,100 lines)
│   ├── LiveDisplayManager.js         1,041 lines
│   ├── StreamManager.js              1,051 lines
│   └── index.js
│
├── core/                         # FrequeVisualizer core (~5,500 lines)
│   ├── FrequeVisualizer.js           ~2,000 lines
│   ├── AudioInputManager.js          ~1,200 lines
│   ├── VideoInputManager.js          ~2,300 lines
│   └── index.js
│
├── effects/                      # Visual effects (~4,000 lines)
│   ├── KaleidoscopeController.js     ~1,400 lines
│   ├── VisualEffectsController.js    ~1,400 lines (Blobs + InfiniteZoom + WebGL)
│   ├── FluidNebulaController.js      ~1,200 lines (FluidDynamics + Nebula)
│   └── index.js
│
├── ui/                           # UI controllers (~5,200 lines)
│   ├── MixerController.js            ~2,200 lines
│   ├── FooterController.js           ~1,800 lines
│   ├── PanelManager.js               ~1,200 lines
│   └── index.js
│
├── playlist/                     # Playlist system (~2,000 lines)
│   ├── PlaylistManager.js            ~1,200 lines
│   ├── PlaylistUI.js                 ~800 lines
│   └── index.js
│
└── visualization/                # Visualization modes (~2,300 lines)
    ├── MorphController.js            ~1,400 lines
    ├── ModeManager.js                ~900 lines
    └── index.js
```

### File Count Summary

| Category | New Files | Lines |
|----------|-----------|-------|
| Entry point | 1 | ~100 |
| Autopilot | 7 | ~1,650 |
| Recording | 3 | ~6,760 |
| Streaming | 3 | ~2,100 |
| Core | 4 | ~5,500 |
| Effects | 4 | ~4,000 |
| UI | 4 | ~5,200 |
| Playlist | 3 | ~2,000 |
| Visualization | 3 | ~2,300 |
| **Total new** | **32** | **~29,600** |
| + Existing files | ~22 | - |
| **Grand total** | **~54** | - |

### Weekly Extraction Schedule

| Week | Goal | Extract | Result |
|------|------|---------|--------|
| 1 | Standalone classes | `autopilot/*`, `recording/*`, `streaming/*` | 31k → 20k |
| 2 | Effects | `KaleidoscopeController`, `VisualEffectsController`, `FluidNebulaController` | 20k → 14k |
| 3 | UI | `MixerController`, `FooterController`, `PanelManager` | 14k → 8k |
| 4 | Core | `AudioInputManager`, `VideoInputManager`, `playlist/*`, `visualization/*` | 8k → 2k |

### Key Rules

1. **Maintain window globals for plugins:**
```javascript
// At end of src/main.js - REQUIRED for plugins
window.FrequeVisualizer = FrequeVisualizer;
window.visualizer = new FrequeVisualizer();
window.pluginManager = new PluginManager();
window.FrequePluginBase = FrequePluginBase;
```

2. **Extract one class/module at a time, test, commit**

3. **Week 1 classes have zero dependencies** — safest to start with

---

## Phase 3: Audio Modules (Parallel with Phase 2)
**Goal:** Convert your existing audio tier system to ES6 modules.

These already exist as separate files, just need `export` added:

---

## Phase 4: Plugin System - KEEP PLUGINS EXTERNAL (Week 3)
**Goal:** Bundle plugin infrastructure, but load plugins at runtime.

### What Gets Bundled (Your Code)
```javascript
// src/plugins/core/FrequePluginBase.js
export class FrequePluginBase {
    // ... your plugin base class
}

// Expose globally for external plugins
window.FrequePluginBase = FrequePluginBase;
```

```javascript
// src/plugins/core/PluginManager.js
export class PluginManager {
    // ... plugin registration, lifecycle
}

window.pluginManager = new PluginManager();
```

### What Stays External (Third-Party Plugins)
Plugins remain standalone `.js` files:

```javascript
// plugins/goo-freque-plugin.js (UNCHANGED from current)
class GooPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('goo', visualizer, { ... });
    }
    // ...
}

// Auto-register (same pattern as now)
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new GooPlugin(window.visualizer);
    }
}, 500);
```

**Third-party developers change nothing.** They still:
- Write a single `.js` file
- Extend `FrequePluginBase`
- Self-register via `setTimeout`

### Runtime Plugin Loading

```javascript
// src/plugins/core/PluginAutoloader.js
export class PluginAutoloader {
    constructor() {
        this.loadedPlugins = new Set();
    }
    
    /**
     * Load a plugin from a file path
     * Works in both browser and Electron
     */
    async loadPlugin(pluginPath) {
        if (this.loadedPlugins.has(pluginPath)) {
            console.log(`Plugin already loaded: ${pluginPath}`);
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = pluginPath;
            script.onload = () => {
                this.loadedPlugins.add(pluginPath);
                console.log(`✅ Loaded plugin: ${pluginPath}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ Failed to load plugin: ${pluginPath}`);
                reject(new Error(`Failed to load: ${pluginPath}`));
            };
            document.head.appendChild(script);
        });
    }
    
    /**
     * Scan a folder and load all plugins
     * In browser: requires a manifest file
     * In Electron: uses fs to scan directory
     */
    async loadFromFolder(folderPath) {
        if (window.electronAPI) {
            // Electron: scan filesystem directly
            const files = await window.electronAPI.scanPluginFolder(folderPath);
            for (const file of files) {
                if (file.endsWith('-freque-plugin.js')) {
                    await this.loadPlugin(`${folderPath}/${file}`);
                }
            }
        } else {
            // Browser: load from manifest
            const manifest = await fetch(`${folderPath}/manifest.json`).then(r => r.json());
            for (const plugin of manifest.plugins) {
                await this.loadPlugin(`${folderPath}/${plugin}`);
            }
        }
    }
    
    /**
     * Unload a plugin (remove from DOM and registry)
     */
    unloadPlugin(pluginName) {
        if (window.pluginManager) {
            window.pluginManager.unregisterPlugin(pluginName);
        }
        // Note: script tag remains but plugin is deactivated
    }
}
```

### Folder-Based Loading (Unchanged UX)

**User experience stays the same:**
1. User drags `awesome-plugin.js` into `plugins/` folder
2. App scans folder on startup
3. Plugin loads and appears in mixer

**For Electron:**
```javascript
// In your Electron main process
const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

ipcMain.handle('scan-plugin-folder', async (event, folderPath) => {
    const files = fs.readdirSync(folderPath);
    return files.filter(f => f.endsWith('-freque-plugin.js'));
});
```

**For Browser (requires manifest):**
```json
// plugins/manifest.json
{
    "plugins": [
        "goo-freque-plugin.js",
        "psych-freque-plugin.js",
        "vidtrip-freque-plugin.js"
    ]
}
```

---

## Phase 5: Build & Deploy (Week 4)
**Goal:** Production-ready bundled output.

### Build Configuration

```javascript
// vite.config.js
export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            // DON'T bundle plugins folder
            external: [
                /^plugins\//,
                /^user-plugins\//
            ]
        }
    }
});
```

### Output Structure
```
dist/
├── index.html
├── assets/
│   ├── main-[hash].js      # Your bundled app
│   └── vendor-[hash].js    # Three.js, etc.
├── plugins/                 # COPIED, not bundled
│   ├── manifest.json
│   ├── goo-freque-plugin.js
│   └── ...
└── js/
    └── three.module.js
```

---

## Phase 6: Code Protection (Week 4-5)

### Protection Strategy Overview

| Layer | Tool | Protects Against | Performance Impact |
|-------|------|------------------|-------------------|
| 1. Minification | Vite/Terser | Casual inspection | None |
| 2. Obfuscation | javascript-obfuscator | Copy-paste theft | 5-15% |
| 3. Domain Lock | javascript-obfuscator | Unauthorized hosting | None |
| 4. V8 Bytecode | electron-vite | Electron extraction | Slight improvement |
| 5. ASAR Integrity | Electron Fuses | Tampering | None |

### Layer 1: Minification (Built into Vite)
Already enabled by default. Removes comments, whitespace, shortens names.

### Layer 2: Obfuscation

**Recommended Tool: `javascript-obfuscator`**

```bash
npm install javascript-obfuscator --save-dev
npm install rollup-plugin-obfuscator --save-dev
```

```javascript
// vite.config.js
import obfuscatorPlugin from 'rollup-plugin-obfuscator';

export default defineConfig({
    build: {
        rollupOptions: {
            plugins: [
                obfuscatorPlugin({
                    options: {
                        // Recommended settings for Freque
                        compact: true,
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 0.75,
                        deadCodeInjection: true,
                        deadCodeInjectionThreshold: 0.4,
                        debugProtection: false, // Enable for production
                        debugProtectionInterval: 0,
                        disableConsoleOutput: false, // Enable for production
                        identifierNamesGenerator: 'hexadecimal',
                        log: false,
                        numbersToExpressions: true,
                        renameGlobals: false, // IMPORTANT: false to keep window.* exports
                        selfDefending: false, // Can break code, test carefully
                        simplify: true,
                        splitStrings: true,
                        splitStringsChunkLength: 10,
                        stringArray: true,
                        stringArrayCallsTransform: true,
                        stringArrayEncoding: ['base64'],
                        stringArrayIndexShift: true,
                        stringArrayRotate: true,
                        stringArrayShuffle: true,
                        stringArrayWrappersCount: 2,
                        stringArrayWrappersChainedCalls: true,
                        stringArrayWrappersParametersMaxCount: 4,
                        stringArrayWrappersType: 'function',
                        stringArrayThreshold: 0.75,
                        transformObjectKeys: true,
                        unicodeEscapeSequence: false
                    }
                })
            ]
        }
    }
});
```

**Performance Note:** With these settings, expect:
- ~30-50% larger file size (but gzip compresses well)
- ~10-15% slower execution
- Significantly harder to reverse-engineer

### Layer 3: Domain Lock (Browser Only)

```javascript
// vite.config.js - add to obfuscator options
{
    domainLock: [
        'meltlive.com',
        'freque.app',
        'localhost'  // For development
    ],
    domainLockRedirectUrl: 'https://meltlive.com/license-required'
}
```

**What it does:** Code checks `window.location.hostname` at runtime. If domain doesn't match, code fails silently or redirects.

**For Electron:** Domain lock is skipped (no `window.location`), so you need V8 bytecode instead.

### Layer 4: V8 Bytecode (Electron Only)

**Best protection for Electron apps.** Compiles JavaScript to V8 bytecode which:
- Cannot be easily decompiled back to source
- Actually runs slightly faster
- Is unreadable in hex editors

**Option A: electron-vite (Recommended if starting fresh)**
```bash
npm install electron-vite --save-dev
```

```javascript
// electron.vite.config.js
import { defineConfig, bytecodePlugin } from 'electron-vite'

export default defineConfig({
    main: {
        plugins: [
            bytecodePlugin({
                protectedStrings: [
                    'your-api-key',
                    'license-check-endpoint'
                ]
            })
        ]
    },
    preload: {
        plugins: [bytecodePlugin()]
    },
    renderer: {
        // Renderer stays as JS (runs in Chromium)
    }
})
```

**Option B: bytenode (Works with existing setup)**
```bash
npm install bytenode --save-dev
```

```javascript
// compile-bytecode.js (run after Vite build)
const bytenode = require('bytenode');
const fs = require('fs');
const path = require('path');

// Compile main process to bytecode
bytenode.compileFile({
    filename: 'dist/main/index.js',
    output: 'dist/main/index.jsc',
    electron: true
});

// Update your Electron entry to load .jsc
// In package.json: "main": "dist/main/loader.js"
```

```javascript
// dist/main/loader.js
require('bytenode');
require('./index.jsc');
```

### Layer 5: ASAR Integrity (Electron)

Prevents tampering with the app archive:

```javascript
// forge.config.js or electron-builder config
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
    packagerConfig: {
        // ...
    },
    plugins: [
        ['@electron-forge/plugin-fuses', {
            version: FuseVersion.V1,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true
        }]
    ]
};
```

### Protection Comparison by Distribution

| Protection | Browser | Electron |
|------------|---------|----------|
| Minification | ✅ | ✅ |
| Obfuscation | ✅ | ✅ |
| Domain Lock | ✅ | ❌ N/A |
| V8 Bytecode | ❌ N/A | ✅ |
| ASAR Integrity | ❌ N/A | ✅ |

### Obfuscation Tool Comparison

| Tool | Cost | Protection Level | Notes |
|------|------|------------------|-------|
| **javascript-obfuscator** | Free | ⭐⭐⭐ | Best free option, Vite plugin available |
| **Jscrambler** | $$$$ | ⭐⭐⭐⭐⭐ | Enterprise-grade, code locks, monitoring |
| **ByteHide Shield** | $$$ | ⭐⭐⭐⭐ | Good mid-tier option |
| **JSDefender** | $$$ | ⭐⭐⭐⭐ | 20+ years in business |
| **Google Closure** | Free | ⭐⭐ | More for optimization than protection |

**Recommendation:** Start with `javascript-obfuscator` (free). If piracy becomes a measurable problem, evaluate Jscrambler.

---

## Honest Assessment: What Protection Actually Achieves

### What it DOES protect against:
- Casual copy-paste theft
- Non-technical users extracting code
- Quick inspection in DevTools
- Script kiddies looking for easy targets
- Automated code scraping

### What it DOES NOT protect against:
- Determined reverse engineers with time
- State-sponsored actors
- Anyone willing to spend days deobfuscating
- Runtime memory inspection

### The Reality:
> "Any JavaScript that runs in a browser can be reverse-engineered. The goal isn't perfect protection—it's making theft harder than writing original code."

Most pirates will move to easier targets. Corporate customers won't risk legal exposure. The combination of obfuscation + domain lock + V8 bytecode creates enough friction to deter 99% of would-be thieves.

---

## Migration Checklist

### Phase 1: Vite Setup (Day 1)
- [ ] Install Vite
- [ ] Create vite.config.js
- [ ] Create src/main.js entry point
- [ ] Update index.html
- [ ] Verify app runs with `npx vite`

### Phase 2: Split main.js (Weeks 1-4)

**Week 1: Standalone Classes**
- [ ] Create `src/autopilot/` folder
- [ ] Extract `ParameterController.js` (lines 31-381)
- [ ] Extract `GenreDetector.js` (lines 382-566)
- [ ] Extract `HarmonicAnalyzer.js` (lines 567-840)
- [ ] Extract `StructureDetector.js` (lines 841-1019)
- [ ] Extract `AudioAnalyzer.js` (lines 1020-1390)
- [ ] Extract `DecisionEngine.js` (lines 1391-1679)
- [ ] Create `src/recording/` folder
- [ ] Extract `RecordManager.js` (lines 1680-8439)
- [ ] Create `src/streaming/` folder
- [ ] Extract `LiveDisplayManager.js` (lines 8440-9480)
- [ ] Extract `StreamManager.js` (lines 9481-10531)
- [ ] **Checkpoint: main.js at ~20k lines**

**Week 2: Effects**
- [ ] Create `src/effects/` folder
- [ ] Extract `KaleidoscopeController.js`
- [ ] Extract `VisualEffectsController.js` (Blobs + InfiniteZoom + WebGL)
- [ ] Extract `FluidNebulaController.js` (FluidDynamics + Nebula)
- [ ] **Checkpoint: main.js at ~14k lines**

**Week 3: UI**
- [ ] Create `src/ui/` folder
- [ ] Extract `MixerController.js`
- [ ] Extract `FooterController.js`
- [ ] Extract `PanelManager.js`
- [ ] **Checkpoint: main.js at ~8k lines**

**Week 4: Core**
- [ ] Create `src/core/` folder
- [ ] Extract `AudioInputManager.js`
- [ ] Extract `VideoInputManager.js`
- [ ] Create `src/playlist/` folder
- [ ] Extract `PlaylistManager.js` + `PlaylistUI.js`
- [ ] Create `src/visualization/` folder
- [ ] Extract `MorphController.js` + `ModeManager.js`
- [ ] Rename remaining to `FrequeVisualizer.js` (~2k lines)
- [ ] Create new `src/main.js` entry point
- [ ] Maintain `window.*` exports for plugins
- [ ] **Final: ~54 total JS files**

### Phase 3: Audio Modules (Parallel)
- [ ] Convert FrequencyBandCalculator
- [ ] Convert TempoDetector
- [ ] Convert BeatDetectorEnhanced
- [ ] Convert SpectrumAnalyzer

### Phase 4: Plugin System (Week 5)
- [ ] Bundle FrequePluginBase
- [ ] Bundle PluginManager
- [ ] Keep plugins external
- [ ] Implement runtime loading
- [ ] Test folder-based loading
- [ ] Verify third-party plugins work unchanged

### Phase 5: Build (Week 5)
- [ ] Configure production build
- [ ] Test browser deployment
- [ ] Test Electron deployment

### Phase 6: Protection (Week 6)
- [ ] Add javascript-obfuscator
- [ ] Configure domain lock (browser)
- [ ] Add V8 bytecode (Electron)
- [ ] Enable ASAR integrity (Electron)
- [ ] Test performance impact
- [ ] Verify plugins still work with obfuscated core

---

## Timeline

| Phase | Effort | Calendar Time |
|-------|--------|---------------|
| Phase 1: Vite Setup | 2-4 hours | Day 1 |
| Phase 2: Split main.js | 20-30 hours | Weeks 1-4 |
| Phase 3: Audio Modules | 4-6 hours | Parallel |
| Phase 4: Plugin System | 4-6 hours | Week 5 |
| Phase 5: Build | 2-4 hours | Week 5 |
| Phase 6: Protection | 4-8 hours | Week 6 |

**Total: ~40-60 hours spread over 6 weeks**

> 📄 **See `MAIN_JS_SPLIT_ANALYSIS.md` for detailed extraction instructions and method-by-method breakdown.**

---

## FAQ

### Will plugin developers need to change anything?
**No.** Plugins stay as standalone `.js` files. They extend `window.FrequePluginBase` and self-register. Zero changes.

### Can users still drag-drop plugins into folders?
**Yes.** The runtime loader scans folders and loads plugins dynamically, exactly like now.

### Will obfuscation break plugins?
**No,** as long as you set `renameGlobals: false` in the obfuscator config. This preserves `window.visualizer`, `window.pluginManager`, and `window.FrequePluginBase`.

### Is V8 bytecode better than obfuscation?
For Electron, **yes.** Bytecode is compiled, not just scrambled. It's genuinely difficult to reverse. Use both for maximum protection.

### What about WebGL shader code?
Shaders are sent to the GPU as strings—they can't be easily obfuscated without breaking them. Consider:
- Keeping complex shader logic server-side
- Using shader minification (remove comments/whitespace)
- Accepting that shader code is harder to protect

### Should I obfuscate plugins too?
**Your built-in plugins:** Yes, include them in the bundle.
**Third-party plugins:** That's their choice. Provide documentation if they want to.
