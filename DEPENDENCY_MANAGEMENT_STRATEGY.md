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

## Future Considerations

If the codebase grows significantly, consider:
- ES6 modules with explicit imports/exports
- Build system (Webpack, Rollup) for dependency management
- Dependency injection container
- Module bundling for production

For now, the current approach (global classes with parameter passing) is sufficient and maintainable.

