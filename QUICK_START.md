# Freque Migration - Quick Start (Revised)

## What's Changed

| Your Concern | Solution |
|--------------|----------|
| Third-party plugins | ✅ No changes required - they stay as standalone .js files |
| Drag-drop plugin loading | ✅ Still works - folder scanning unchanged |
| Code protection | ✅ Multi-layer approach: obfuscation + domain lock + V8 bytecode |
| Browser delivery | ✅ No change |
| Electron delivery | ✅ No change + better protection options |

---

## Quick Start (15 minutes)

### Step 1: Copy files to your project
```bash
# From your freque directory:
cp -r freque-migration-v2/* ./
```

### Step 2: Create legacy folder for existing code
```bash
mkdir -p src/legacy
cp js/*.js src/legacy/
```

### Step 3: Install dependencies
```bash
npm install
```

### Step 4: Update index.html

Replace your script tags (lines 46-61) with:
```html
<!-- Core app (bundled) -->
<script type="module" src="/src/main.js"></script>

<!-- Plugins loaded at runtime (NOT bundled) -->
<!-- These load automatically via PluginAutoloader -->
```

### Step 5: Test
```bash
npm run dev
```

---

## For Plugin Developers

**Nothing changes.** Plugins are still:

1. Single `.js` files
2. Extend `window.FrequePluginBase`
3. Self-register via `setTimeout`
4. Drag-and-drop into `plugins/` folder

Example plugin (unchanged from current):
```javascript
class MyPlugin extends FrequePluginBase {
    constructor(visualizer) {
        super('myplugin', visualizer, {
            version: '1.0.0',
            author: 'Me',
            description: 'My awesome plugin'
        });
    }
    
    onRender(deltaTime, timestamp, audioData) {
        // Visualization code
    }
}

// Auto-register
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new MyPlugin(window.visualizer);
    }
}, 500);
```

---

## Code Protection Setup

### Development (No Protection)
```bash
npm run dev        # Fast, readable code
npm run build      # Minified only
```

### Production (Full Protection)
```bash
npm run build:protected   # Obfuscated + domain locked
```

### Electron Extra Protection
```bash
npm run build:protected
npm run bytecode          # Compile to V8 bytecode
npm run electron:build    # Package app
```

---

## Protection Layers Explained

| Layer | What It Does | Enabled By |
|-------|--------------|------------|
| **Minification** | Removes whitespace, shortens names | Default in Vite |
| **Obfuscation** | Scrambles logic, encrypts strings | `build:protected` |
| **Domain Lock** | Only runs on your domains | Configure in vite.config.js |
| **V8 Bytecode** | Compiles to unreadable binary | `npm run bytecode` |
| **ASAR Integrity** | Prevents tampering | Electron fuses |

### Enable Domain Lock

Edit `vite.config.js`, uncomment and customize:
```javascript
domainLock: [
    'meltlive.com',
    '.meltlive.com',
    'freque.app',
    'localhost'
],
domainLockRedirectUrl: 'https://meltlive.com/unauthorized'
```

---

## Browser vs Electron Plugin Loading

### Browser
Requires `plugins/manifest.json`:
```json
{
    "plugins": [
        "goo-freque-plugin.js",
        "psych-freque-plugin.js"
    ]
}
```

### Electron
Scans folder automatically via `electronAPI.scanPluginFolder()`.
No manifest needed.

### User Custom Folder (Both)
```javascript
// Set user's custom plugin folder
window.pluginAutoloader.setUserPluginFolder('/path/to/user/plugins');
await window.pluginAutoloader.refresh();
```

---

## Files Included

```
freque-migration/
├── MIGRATION_PLAN.md              # Detailed 6-phase plan
├── MAIN_JS_SPLIT_ANALYSIS.md      # Line-by-line main.js breakdown ← NEW
├── QUICK_START.md                 # This file
├── package.json                   # Dependencies + scripts
├── vite.config.js                 # Build config with obfuscation
│
├── src/
│   ├── main.js                    # Entry point template
│   ├── plugins/
│   │   └── core/
│   │       └── PluginAutoloader.js   # Runtime plugin loader
│   └── audio/
│       └── FrequencyBandCalculator.js # Example converted module
│
├── electron/
│   └── preload.js                 # Secure plugin folder access
│
├── scripts/
│   └── compile-bytecode.js        # V8 bytecode compilation
│
└── plugins/
    └── manifest.json              # Browser plugin registry
```

> 📄 **Start with `MAIN_JS_SPLIT_ANALYSIS.md`** — it has the week-by-week extraction plan with exact line numbers.

---

## FAQ

**Q: Will my existing plugins break?**
A: No. Plugins stay external and load exactly as before.

**Q: Do plugin devs need build tools?**
A: No. They still deliver a single `.js` file.

**Q: Is the code 100% protected?**
A: No JavaScript can be 100% protected. But this makes theft hard enough that most will give up or buy a license.

**Q: What about shader code?**
A: Shaders are harder to protect (GPU needs readable code). Consider keeping complex shader logic minimal or server-side for critical IP.

**Q: Can I use this gradually?**
A: Yes! Start with Vite + minification only. Add obfuscation later. Add bytecode for Electron when ready.
