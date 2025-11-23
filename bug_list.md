# Bug List

## Current Issues

### High Priority
- ✅ **Plugin Settings Persistence**: COMPLETE - Implemented automatic preset persistence system for all plugins. User presets (Save/Export/Import) now work automatically for all current and future plugins without requiring plugin developer changes. Presets are saved to localStorage and restored on app restart. Control values update correctly when presets are loaded.
- **Fix ChromeSphere Presets**: Fix current chromesphere presets
- ✅ **Fix ChromeSphere Beat React**: COMPLETE - Fixed by adding `frequencies` and `dataArray` properties to `generateBasicAudioFeatures()` in spectrum-analyzer.js. The Master Animation Loop now provides complete audio data (including frequency arrays) to all plugins via `sharedAudioData`, enabling beat reactivity and all audio-driven effects to work correctly.
- ✅ **AM Viz Opacity Fix**: COMPLETE - Opacity set to full opacity (1.0) by default (handled by user)
- ✅ **AM Visualization Mode Persistence**: COMPLETE - Visualization mode selection (0-10) now persists across sessions. `currentMode` is saved to localStorage whenever changed via `setVisualizationMode()` or `setOfficialAudioMotionPreset()`. On app restart, the saved mode is restored - regular modes (0-6) load via `initAudioMotion()`, Pro presets (7-10) load automatically after initialization. Fixed plugin-mixer-integration.js error that was preventing proper control creation.
- ✅ **Video Folder Playlist**: COMPLETE - Implemented full video playlist functionality with folder scanning, thumbnail generation, metadata parsing, persistence, and auto-rescan. Video file choice persists in localStorage and restores on app restart.
- ✅ **Mixer Sliders to Dials**: COMPLETE - Converted 70 sliders to dials across 7 visualization systems (Chromospheres, Psyque, Nebula, Blobs, Fluidity, Starfall, Infinite Zoom). All with proper initialization, value handling, and sync where needed. Kaleidoscope sliders left as-is (would require creating new event handlers from scratch).
- ✅ **AM Vis ON/OFF Toggle Not Working for Advanced Visualizations**: COMPLETE - Fixed `toggleVisualization()` method to handle both regular and advanced (Pro) AudioMotion visualizations. The toggle now properly hides/shows the official AudioMotion canvas when advanced visualizations are active, and no longer switches back to regular mode when toggling back ON.
- **Kaleidoscope Toggle Affects Plugins**: In the Kaleidoscope header section, turning off AM viz also incorrectly toggles off plugins. The AM viz toggle should only affect AudioMotion visualizations, not plugin visualizations.
- **AM Preset Export Causes App Relaunch**: When exporting the AM visualizations user-generated presets list, an "export successful" toaster message appears, then the app immediately relaunches/reloads. This should not happen - export should complete without reload.
- **Smooth Color Morphing When Morph ON**: AM visualization morph transitions are abrupt - need smooth color interpolation between presets. Requires changes to core AM library.
- **Extend Morph Functionality to Advanced AM Visualizations**: Add color morphing capabilities to Advanced AM visualizations (Pro presets 7-10), similar to the morph functionality available in regular AM visualizations.
- **Background Opacity Slider for All AM Viz**: Add universal background opacity slider that covers all AudioMotion visualizations (regular and advanced)
- **Fix Background Slider in Fluidity and IZ**: Background opacity sliders not working correctly in Fluidity and Infinite Zoom visualizations
- **Ensure All Viz Have Background Opacity**: Verify and implement background opacity option for all visualizations (AM, IZ, Fluidity, WebGL, all plugins)
- **Audio Priority System Bug**: When video from file and playlist audio are both playing, visualizations are incorrectly driven by video file audio instead of playlist audio. Simple fix needed: If playlist play buttons are toggled on, video from file should be muted. When playlist is toggled off, video from file should stay muted. Live audio input should mute everything else and take priority.
- **Debug Code Cleanup Required**: Remove all debug code completely (not commented) and remove all previously commented code throughout entire codebase
- **Background Color Not Respected by Record/Live Display**: Background color (B button in header) not respected by record or live display
- ✅ **Mixer Panel Collapsible**: COMPLETE - Added collapse button next to Peek button. When collapsed, mixer shows only handle, name, and ON/OFF toggle. Smooth height transition animation. Channels remain horizontally scrollable and reorderable. State persists to localStorage. Collapsed state changes header styling with subtle background highlight.
- ✅ **Dial Double-Click Reset**: COMPLETE - Double clicking on a dial sets value back to default setting stored in data-default attribute
- ✅ **Video Playlist Auto-Play**: COMPLETE - Video playlist no longer auto-plays when V button selected
- ✅ **PSYCH Plugin Flow Complexity Bug**: COMPLETE - Fixed shader code to prevent flow complexity from affecting zoom
- ✅ **Remove Console Code from Plugins**: COMPLETE - Removed all console.log and debug code from all plugins

### Recently Completed (Latest Session)
- ✅ **Plugin Removal Not Detected**: Fixed missing `unregisterPlugin()` method in FrequePluginManager and `removePluginChannelStrip()` in PluginMixerIntegration. Modified PluginAutoLoader polling to immediately unload missing plugins instead of just marking them. When plugins are removed from the plugins folder, they now automatically disappear from the mixer within 12 seconds (polling interval), or immediately when "Refresh Plugins" is clicked. The complete cleanup chain removes channel strips, all kaleidoscope toggles (mixer, header, display captures), state variables, and updates localStorage.
- ✅ **Display List Quality Too Low**: Implemented Option A Enhanced with 5 critical fixes: 1) Increased all bitrates dramatically (1080p: 15/35/60 Mbps, 4K: 100/150/200 Mbps), 2) Changed default preset to "Broadcast" (60 Mbps), 3) Added pixel-perfect 1080p rendering (`imageSmoothingEnabled = false`), 4) Added high-quality 4K Lanczos upscaling (`imageSmoothingQuality = 'high'`), 5) Forced h264-high codec for all presets. Result: ~100% quality improvement for 1080p, ~145% for 4K. Applied to both Recording and Live Display.
- ✅ **Kaleidoscope Z-Index Reordering**: Consolidated to single kaleidoscope canvas at z-index 100. All sources (video + visualizations + plugins) now drawn in correct z-index order using `getActiveCanvasesInZIndexOrder()`. Video can be reordered in front of/behind visualizations via mixer. IZ now appears correctly in Live Display.
- ✅ **Kaleidoscope Background Opacity on Fluid & Nebula**: Added black background fill for Fluid when `TRANSPARENT=false` with `BACKGROUND_OPACITY` support. Added `globalCompositeOperation='screen'` for Nebula when `knockoutBackground` is enabled. Both settings now work correctly in Kaleidoscope, Live Display, and Recording.
- ✅ **AM Visualization Switching**: Fixed Reg→Adv→Reg transitions killing animations. Added `lastRegularMode` tracking to preserve visualization state. Animations and visual settings now properly restored when switching back to regular presets.

### Completed (Previous Sessions)
- ✅ **Plugin Kaleidoscope Integration**: FULLY COMPLETE - Implemented comprehensive plugin integration with kaleidoscope system. All current and future plugins automatically get kaleidoscope toggles in mixer channel and display capture sections. Plugin canvases are properly captured, composited, hidden/shown, and respect plugin-specific features (opacity, knockout background). System works seamlessly with record, live display, and kaleidoscope capture. Nebula's knockout background now works at pixel level (transparent scene vs. black scene).
- ✅ **Fluidity Missing Drag Handle**: Fluidity now has drag handle and full integration into reorder and z-index system
- ✅ **LiveDisplay/Record Quality Issue**: Fixed quality degradation issue with generic plugin rendering API. Implemented comprehensive plugin rendering API in `FrequePluginBase` with 7 methods (`shouldClearCanvas()`, `getOpacity()`, `getBlendMode()`, `beforeComposite()`, `customComposite()`, `afterComposite()`, `getRenderingContext()`). This provides future-proof support for ALL plugin types (2D Canvas, Three.js, WebGL, shader-based, particle systems). Nebula plugin now correctly renders with opacity and knockout background in recordings and live displays. Zero effort required from plugin developers - all methods have sensible defaults. Updated all 4 composite rendering locations in RecordManager and LiveDisplayManager to use generic API.
- ✅ **30fps Throttling Quality Issue**: Default frame rate changed to 60 FPS for recording and live display across all HTML dropdowns and JavaScript defaults
- ✅ **Nebula ON/OFF Toggle Sync**: Fixed synchronization between mixer and header button
- ✅ **Placeholder handles for Audio and Kaleidoscope channels**: Non-functional, no arrows
- ✅ **Drop indicators**: Showing left border highlight during drag operations

### Medium Priority  
- **Drop indicators**: need to create better indicators and ensure proper drop position
- **Channel Order Persistence**: Fluidity and other channels not maintaining correct positions after app restart due to localStorage timing issues
- **Display Channel Drop Prevention**: Prevent dropping onto display channel strips and to the right of Kaleidoscope
- ✅ **Last Used Visualization Persistence**: COMPLETE - Last used visualization mode (0-10) now persists across sessions via localStorage. Implemented as part of AM Visualization Mode Persistence fix.
- **Storm Plugin Performance**: Storm plugin is too CPU intensive and runs too slow - needs optimization
- **Nebula Morphing Toggle Broken**: Morphing toggle updates settings correctly but does not actually affect the visualization - morphing effect not working despite console messages showing successful updates
- **Three.js ES Module Migration**: Migrate from global THREE (three.min.js) to ES modules before Three.js r160 release. See [three_refactor.md](three_refactor.md) for detailed migration plan and analysis.

### Low Priority
- **ADD Global settings
- **ADD Timeline functionality or some other way to stage longer visual presentations
- **Mixer Panel Detachment**: Add ability to detach mixer panel from main interface

## Planned Plugin Conversions

- **Convert WebGL/Starfall to Plugin**: Migrate WebGL visualization to plugin architecture

## Architecture Notes
- **Single Kaleidoscope Canvas**: All sources (video, native viz, plugins) composite to one canvas at z-index 100. Z-index ordering fully dynamic and mixer-controlled.
- **Plugin-Agnostic Rendering**: Future plugins work seamlessly with zero code changes. Generic property handling for opacity, blend modes, backgrounds.
- **Shared Canvas Architecture**: Both custom and official AudioMotion analyzers share the same canvas for seamless switching.

### FEATURE ENHANCEMENTS
- **Improve Mixer by Embedding Minimized Mixer in Footer**: Add a minimized/compact version of the mixer panel in the footer for quick access to essential controls without taking up main interface space
- **Create Content**: Develop content creation features and tools
- **Electron App**: Package the application as a standalone Electron desktop application
- **MAO VIDEO onto sphere, cube, otehr obljects that spin, rotate to audio
- **MAP VIDEO onto fluidity shader
- **HChange Window size sent to OBS to 9:16 with safe zone overlay

### DOCUMENTATION
- **Review Dev Documentation**: Review and update all developer documentation for accuracy, completeness, and clarity
- How to use in livestreams - enhance, OBS, TIK etc