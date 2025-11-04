# Bug List

## Current Issues

### High Priority
- **Z-Index Values Incorrect**: When IZ is below AM in mixer, it still appears on top - z-index system not working properly
- **AM + Fluidity Display Flicker**: Using AudioMotion and Fluidity together causes external display to flicker
- **Storm Plugin Performance**: Storm plugin is too CPU intensive and runs too slow - needs optimization
- **Nebula Morphing Toggle Broken**: Morphing toggle updates settings correctly but does not actually affect the visualization - morphing effect not working despite console messages showing successful updates
- **Audio Priority System Bug**: When video from file and playlist audio are both playing, visualizations are incorrectly driven by video file audio instead of playlist audio. Simple fix needed: If playlist play buttons are toggled on, video from file should be muted. When playlist is toggled off, video from file should stay muted. Live audio input should mute everything else and take priority.
- **Plugin Kaleidoscope Integration**: ✅ **FULLY COMPLETE** - Implemented comprehensive plugin integration with kaleidoscope system. All current and future plugins automatically get kaleidoscope toggles in mixer channel and display capture sections. Plugin canvases are properly captured, composited, hidden/shown, and respect plugin-specific features (opacity, knockout background). System works seamlessly with record, live display, and kaleidoscope capture. Nebula's knockout background now works at pixel level (transparent scene vs. black scene).
- **Fluidity Missing Drag Handle**: Fluidity needs drag handle and integration into reorder and z-index system as a native visualization
- **Debug Code Cleanup Required**: Remove all debug code completely (not commented) and remove all previously commented code throughout entire codebase
- **Background Color Not Respected by Record/Live Display**: Background color (B button in header) not respected by record or live display

### Medium Priority  
- **Channel Order Persistence**: Fluidity and other channels not maintaining correct positions after app restart due to localStorage timing issues
- **Display Channel Drop Prevention**: Prevent dropping onto display channel strips and to the right of Kaleidoscope
- **Last Used Visualization Persistence**: Make the last used visualization persistent across sessions
- **Debug Code Cleanup**: Clean up all remaining debug code throughout the application
- **30fps Throttling Quality Issue**: Fluid Dynamics and Infinite Zoom use 30fps throttling which causes jerky motion in 60fps/4K recordings - need to remove throttling for professional quality output

### Low Priority
- **Mixer Panel Detachment**: Add ability to detach mixer panel from main interface
- **Mixer Panel Collapsible**: Make mixer collapsible to just handles, labels, and ON/OFF toggles with expand button
- **Remove Plugin Buttons**: Remove the "Remove Plugin" buttons from channel strips as they are no longer needed

## Planned Plugin Conversions
- **Convert Nebula to Plugin**: Migrate all 41 Nebula controls (including 9 audio reactive toggles) from header panel to plugin mixer channel strip (Phase 1) - IN PROGRESS
- **Convert Fluidity to Plugin**: Migrate all 13 Fluidity controls + preset system to plugin architecture (Phase 2)

## Recently Fixed
- ✅ Nebula ON/OFF Toggle Sync - Fixed synchronization between mixer and header button
- ✅ Placeholder handles for Audio and Kaleidoscope channels (non-functional, no arrows)
- ✅ Drop indicators showing left border highlight during drag operations