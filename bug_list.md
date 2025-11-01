# Bug List

## Current Issues

### High Priority
- **Z-Index Values Incorrect**: When IZ is below AM in mixer, it still appears on top - z-index system not working properly
- **AM + Fluidity Display Flicker**: Using AudioMotion and Fluidity together causes external display to flicker
- **Storm Plugin Performance**: Storm plugin is too CPU intensive and runs too slow - needs optimization

### Medium Priority  
- **Channel Order Persistence**: Fluidity and other channels not maintaining correct positions after app restart due to localStorage timing issues
- **Display Channel Drop Prevention**: Prevent dropping onto display channel strips and to the right of Kaleidoscope
- **Last Used Visualization Persistence**: Make the last used visualization persistent across sessions
- **Debug Code Cleanup**: Clean up all remaining debug code throughout the application

### Low Priority
- **Convert Fluidity to Plugin**: Convert Fluidity visualization to use the plugin architecture
- **Mixer Panel Detachment**: Add ability to detach mixer panel from main interface
- **Mixer Panel Collapsible**: Make mixer collapsible to just handles, labels, and ON/OFF toggles with expand button
- **Remove Plugin Buttons**: Remove the "Remove Plugin" buttons from channel strips as they are no longer needed

## Recently Fixed
- ✅ Nebula ON/OFF Toggle Sync - Fixed synchronization between mixer and header button
- ✅ Placeholder handles for Audio and Kaleidoscope channels (non-functional, no arrows)
- ✅ Drop indicators showing left border highlight during drag operations