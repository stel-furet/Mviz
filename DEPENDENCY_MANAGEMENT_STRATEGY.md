# Dependency Management Strategy

## Overview

This document outlines the dependency management strategy for audio analysis modules to prevent load order issues and dependency nightmares.

## Load Order Documentation

To prevent dependency management nightmares and load order issues, we will:

1. **Add explicit dependency comments in `index.html`** - Clear comment blocks showing:
   - Which modules have no dependencies (base modules)
   - Which modules depend on others (dependent modules)
   - Load order requirements

2. **Dependency Structure:**

```
Audio Analysis Modules (load order matters):
├── Tier 1: Base Calculators (no dependencies)
│   ├── tempo-detector.js
│   ├── frequency-band-calculator.js
│   └── silence-detector.js (NEW)
│
├── Tier 2: Detectors Using Calculators (load after Tier 1)
│   ├── beat-detector-enhanced.js (uses FrequencyBandCalculator)
│   └── energy-pattern-detector.js (NEW - uses FrequencyBandCalculator)
│
└── Tier 3: Main Analyzer (uses all above)
    └── spectrum-analyzer.js (uses all Tier 1 & 2 modules)
```

3. **Implementation:**
   - Add comment blocks in `index.html` before each tier
   - Document dependencies in each new module's header comment
   - Keep all audio analysis modules grouped together in `index.html`

4. **Benefits:**
   - Clear visual structure prevents load order mistakes
   - Easy to see dependencies at a glance
   - Reduces risk of missing script tags
   - Makes future additions easier

## Example Comment Block for index.html

```html
<!-- ============================================
     AUDIO ANALYSIS MODULES - LOAD ORDER MATTERS
     ============================================
     
     Tier 1: Base Calculators (no dependencies)
     - Can be loaded in any order
     - Used by Tier 2 and Tier 3 modules
     ============================================ -->
<script src="js/tempo-detector.js"></script>
<script src="js/frequency-band-calculator.js"></script>
<script src="js/silence-detector.js"></script>

<!-- ============================================
     Tier 2: Detectors Using Calculators
     - Must load AFTER Tier 1 modules
     - Uses FrequencyBandCalculator
     ============================================ -->
<script src="js/beat-detector-enhanced.js"></script>
<script src="js/energy-pattern-detector.js"></script>

<!-- ============================================
     Tier 3: Main Analyzer
     - Must load AFTER all Tier 1 & 2 modules
     - Uses all audio analysis modules
     ============================================ -->
<script src="js/spectrum-analyzer.js"></script>
```

## Current Dependencies

### Existing Modules

**TempoDetector** (`js/tempo-detector.js`)
- **Dependencies:** None
- **Used by:** `SpectrumAnalyzer`, `AudioAnalyzer` (main.js), `WebGLBeatDetector`

**FrequencyBandCalculator** (`js/frequency-band-calculator.js`)
- **Dependencies:** None
- **Used by:** `BeatDetectorEnhanced`, `SpectrumAnalyzer`, `AudioAnalyzer` (main.js), `audio-test-freque-plugin.js`

**BeatDetectorEnhanced** (`js/beat-detector-enhanced.js`)
- **Dependencies:** `FrequencyBandCalculator` (passed as parameter)
- **Used by:** `SpectrumAnalyzer`, `AudioAnalyzer` (main.js)

### New Modules (To Be Added)

**SilenceDetector** (`js/silence-detector.js`)
- **Dependencies:** None
- **Used by:** `SpectrumAnalyzer`

**EnergyPatternDetector** (`js/energy-pattern-detector.js`)
- **Dependencies:** `FrequencyBandCalculator` (for frequency band analysis)
- **Used by:** `SpectrumAnalyzer`

## Dependency Rules

1. **Tier 1 modules** can be loaded in any order relative to each other
2. **Tier 2 modules** must load after all Tier 1 modules
3. **Tier 3 modules** must load after all Tier 1 and Tier 2 modules
4. All audio analysis modules should be grouped together in `index.html`
5. Dependencies are passed as parameters (not imported), so classes just need to be defined before instantiation

## Risk Mitigation

### Current Risk Level: **LOW to MEDIUM**

**Why it's LOW:**
- Classes are instantiated at runtime, not at load time
- Dependencies are passed as parameters, not imported
- Current load order is correct
- No circular dependencies

**Why there's some risk:**
- Manual load order management in `index.html`
- Easy to miss adding a script tag
- No build-time dependency checking
- Hard to spot circular dependencies

**Mitigation Strategies:**
1. Clear comment blocks in `index.html` (this document)
2. Document dependencies in module header comments
3. Group related modules together
4. Test after adding new modules
5. Keep dependency structure simple (avoid circular dependencies)

## Adding New Modules

When adding a new audio analysis module:

1. **Determine dependencies:**
   - Does it use `FrequencyBandCalculator`? → Tier 2
   - Does it use other calculators? → Tier 2
   - No dependencies? → Tier 1

2. **Add to appropriate tier in `index.html`:**
   - Add script tag in correct tier section
   - Update comment block if needed

3. **Document in module header:**
   ```javascript
   /**
    * Energy Pattern Detector
    * Detects energy build-ups, drops, and breakdowns
    * 
    * Dependencies: FrequencyBandCalculator (passed as parameter)
    * Used by: SpectrumAnalyzer
    */
   ```

4. **Test load order:**
   - Verify module loads without errors
   - Verify dependencies are available when module is instantiated

## main.js Split: New src/ Folder Structure

The main.js split (Stage 1) will create a new `src/` folder with extracted classes.

### Load Order for Extracted Classes

```html
<!-- ============================================
     EXTRACTED CLASSES FROM main.js
     Stage 1: Global Classes (no ES6 modules)
     See MAIN_JS_SPLIT_ANALYSIS.md for details
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

<!-- Tier 3: Effects Controllers -->
<script src="src/effects/KaleidoscopeController.js"></script>
<script src="src/effects/VisualEffectsController.js"></script>
<script src="src/effects/FluidNebulaController.js"></script>

<!-- Tier 4: UI Controllers -->
<script src="src/ui/MixerController.js"></script>
<script src="src/ui/FooterController.js"></script>
<script src="src/ui/PanelManager.js"></script>

<!-- Tier 5: Core Modules -->
<script src="src/core/AudioInputManager.js"></script>
<script src="src/core/VideoInputManager.js"></script>
<script src="src/playlist/PlaylistManager.js"></script>
<script src="src/playlist/PlaylistUI.js"></script>
<script src="src/visualization/MorphController.js"></script>
<script src="src/visualization/ModeManager.js"></script>

<!-- Tier 6: Main Entry Point -->
<script src="src/core/FrequeVisualizer.js"></script>
<script src="src/main.js"></script>
```

### Extracted Class Dependencies

| Class | Dependencies | Used By |
|-------|--------------|---------|
| ParameterController | None | AIAutopilot |
| GenreDetector | None | AudioAnalyzer |
| StructureDetector | AudioAnalyzer | AIAutopilot |
| AudioAnalyzer | TempoDetector, FrequencyBandCalculator, BeatDetectorEnhanced | AIAutopilot |
| DecisionEngine | ParameterController | AIAutopilot |
| RecordManager | None | FrequeVisualizer |
| LiveDisplayManager | None | FrequeVisualizer |
| StreamManager | None | FrequeVisualizer |
| KaleidoscopeController | None | FrequeVisualizer |
| VisualEffectsController | None | FrequeVisualizer |
| FluidNebulaController | None | FrequeVisualizer |
| MixerController | None | FrequeVisualizer |
| FooterController | None | FrequeVisualizer |
| PanelManager | None | FrequeVisualizer |
| AudioInputManager | None | FrequeVisualizer |
| VideoInputManager | None | FrequeVisualizer |
| PlaylistManager | None | FrequeVisualizer |
| PlaylistUI | PlaylistManager | FrequeVisualizer |
| MorphController | None | FrequeVisualizer |
| ModeManager | None | FrequeVisualizer |
| FrequeVisualizer | All above | window.visualizer |

---

## Future Considerations

**Stage 2 (ES6 Modules):** After Stage 1 is complete and stable:
- Convert to ES6 modules with explicit imports/exports
- Add Vite for bundling
- Add barrel exports (index.js files)
- See `MIGRATION_PLAN.md` for details

For now, the current approach (global classes with parameter passing) is sufficient and maintainable.

