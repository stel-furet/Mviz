# Bug List

## Current Issues

### High Priority
- **Nebula ON/OFF Toggle Sync**: Mixer's Nebula toggle (`id="mixerNebulaToggle"`) is not synchronized with header button (`id="headerNebulaBtn"`) - broke recently
- **Channel Order Persistence**: Fluidity and other channels not maintaining correct positions after app restart due to localStorage timing issues

### Medium Priority  
- **Last Used Visualization Persistence**: Make the last used visualization persistent across sessions
- **Mixer Panel Detachment**: Add ability to detach mixer panel from main interface
- **Mixer Panel Minimization**: Add ability to minimize mixer panel to show only ON/OFF toggles

### Low Priority
- **Display Channel Drop Prevention**: Prevent dropping onto display channel strips and to the right of Kaleidoscope
- **Remove Plugin Buttons**: Remove the "Remove Plugin" buttons from channel strips as they are no longer needed

## Recently Fixed
- ✅ Placeholder handles for Audio and Kaleidoscope channels (non-functional, no arrows)
- ✅ Drop indicators showing left border highlight during drag operations