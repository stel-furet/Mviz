# Bug List

## 🚨 CRITICAL BUGS

### 1. Advanced AudioMotion Toggle Control Missing
**Priority:** HIGH  
**Status:** NEW  
**Description:** Advanced AudioMotion visualizations (Fluid, Prism, Twin Peaks, Circus) cannot be toggled OFF independently. The Visualizer Panel ON/OFF only controls regular AM visualizations (radial, spectrum). Both systems can run simultaneously (which is beneficial) but need independent control.  
**Impact:** No way to disable Advanced AM visualizations once activated  
**Location:** Visualizer Panel controls  

### 2. AudioMotion Color Gradient Errors
**Priority:** CRITICAL  
**Status:** NEW  
**Description:** Multiple `TypeError: Cannot read properties of undefined (reading 'color')` errors in `audiomotion-analyzer.js:2053` at `setBarColor` function. Causing continuous error spam and potential rendering issues.  
**Impact:** Application instability, console spam, potential visualization failures  
**Location:** `audiomotion-analyzer.js:2053` - `setBarColor` function  
**Stack Trace:** `setBarColor → _draw → executeAudioMotionDrawing → renderAudioMotionFrame → render → animate`  

### 3. AudioMotion minDecibels Configuration Error
**Priority:** HIGH  
**Status:** NEW  
**Description:** `IndexSizeError: Failed to set the 'minDecibels' property on 'AnalyserNode': The minDecibels provided (-25) is greater than or equal to the maximum bound (-25)`  
**Impact:** AudioMotion analyzer configuration failure  
**Location:** `audiomotion-analyzer.js:594` - minDecibels setter  

### 4. Master Animation Test System Console Spam
**Priority:** MEDIUM  
**Status:** NEW  
**Description:** `master-animation-test.js` is outputting test results every few seconds, creating console spam that makes debugging difficult.  
**Impact:** Console pollution, difficult debugging  
**Location:** `master-animation-test.js:86` - Test results logging  

## 🔧 RESOLVED BUGS

### ✅ Advanced AudioMotion Visualizations Not Rendering
**Status:** FIXED  
**Description:** Advanced AudioMotion visualizations (Fluid, Prism, Twin Peaks, Circus) were not rendering when Master Animation Controller was active due to critical bug in `masterToggleAnalyzer()` method.  
**Fix:** Fixed `AudioMotionMasterWrapper.masterToggleAnalyzer()` to call original `toggleAnalyzer()` method first, then sync Master Animation Controller state.  
**Date:** 2025-10-29  

### ✅ WebGL Mixer Function Errors
**Status:** FIXED  
**Description:** `TypeError: this.updateMixerStarfallToggle is not a function` when clicking WebGL controls.  
**Fix:** Added missing Starfall methods to `MultiDisplayManager` class and corrected method calls in `FrequeVisualizer.toggleWebGL()`.  
**Date:** 2025-10-29  