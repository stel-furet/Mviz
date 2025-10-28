# Mviz Bug List

## 🌊 Fluid Dynamics Issues

### 1. **Purple Injection into Water Scheme**
- **Issue**: Purple colors are being injected into the Water Caustic scheme (should be 100% blue)
- **Possibly Affects**: Other pure color schemes (Fire, Jerry)
- **Status**: Reported, needs investigation

### 2. **Waiting Animation Color Bleed**
- **Issue**: Purple and blue colors appear when saturation is 0 and audio drops
- **Occurs**: During song breaks, low audio moments
- **Suspected Cause**: Waiting animation bleeding through during audio-reactive mode
- **Status**: Reported, needs investigation

### 3. **Random Button Missing**
- **Issue**: Need a random button for fluid dynamics controls
- **Status**: Requested feature

## 🎵 Audio System Issues

### 4. **Genre-Based Color Assignment**
- **Issue**: Automatic color scheme selection based on music genre detection not implemented
- **Status**: TODO item

### 5. **Advanced Beat Controls**
- **Issue**: Advanced beat detection system has no user controls (sensitivity, beat type toggles, feedback)
- **Status**: TODO item

## 🎨 UI/UX Issues

### 6. **Visual Effects Section Cleanup**
- **Issue**: Visual Effects section (Colorful, Bloom, Sunrays) not being used effectively
- **Status**: TODO - remove or repurpose

### 7. **Preset Buttons Missing**
- **Issue**: Need Ambient and Metal preset buttons for quick setup
- **Status**: TODO items

## 🖥️ Display Integration Issues

### 8. **Live Display Integration**
- **Issue**: Fluid Dynamics not fully integrated with Live Display, Record, Kaleidoscope
- **Status**: Partial integration complete, needs full testing

### 9. **Record Integration**
- **Issue**: Fluid Dynamics integration with Record system needs verification
- **Status**: Completed but needs testing

### 10. **Kaleidoscope Integration**
- **Issue**: Fluid Dynamics integration with Kaleidoscope system needs verification
- **Status**: Completed but needs testing

## 📹 Video System Issues

### 11. **Video Source Switching Black Screen**
- **Issue**: When selecting file video, then selecting camera source with live video already active, camera video goes black when file video fade out completes. Then no video is viewable until app reloaded.
- **Reproduction**: 1) Start live camera video 2) Switch to file video 3) Switch back to camera - camera goes black after fade
- **Status**: Reported, needs investigation

## 🎮 WebGL System Issues

### 12. **WebGL Mixer Function Errors**
- **Issue**: Multiple function call errors when interacting with WebGL visualization controls
- **Errors**: 
  - `this.updateMixerStarfallToggle is not a function`
  - `this.updateMixerStarfallColorSchemeSelect is not a function`
  - `this.updateMixerStarfallParticleCountSlider is not a function`
  - `this.updateMixerStarfallParticleSizeSlider is not a function`
  - `this.updateMixerStarfallSpeedSlider is not a function`
  - `this.updateMixerStarfallGravitySlider is not a function`
  - `this.updateMixerStarfallSaturationSlider is not a function`
  - `this.updateMixerStarfallTwinkleSlider is not a function`
  - `this.updateMixerStarfallStarPercentageSlider is not a function`
  - `this.updateMixerStarfallAudioReactivitySlider is not a function`
- **Occurs**: When enabling/disabling WebGL, changing color schemes, or adjusting any WebGL control sliders
- **Suspected Cause**: Missing mixer synchronization functions for WebGL/Starfall controls
- **Status**: Reported, needs investigation

### 13. **Kaleidoscope Preset Application Error**
- **Issue**: TypeError when applying kaleidoscope presets
- **Error**: `Uncaught TypeError: Cannot read properties of undefined (reading 'segments')`
- **Location**: `FrequeVisualizer.applyKaleidoscopePreset (main.js:21434:44)`
- **Occurs**: When clicking kaleidoscope preset buttons or during visualization mode changes
- **Suspected Cause**: Undefined kaleidoscope configuration object when trying to access segments property
- **Status**: Reported, needs investigation

### 15. **BroadcastChannel Closed Error in Multi-Display System**
- **Issue**: InvalidStateError when trying to send messages to closed display windows
- **Error**: `Uncaught InvalidStateError: Failed to execute 'postMessage' on 'BroadcastChannel': Channel is closed`
- **Location**: `DisplayInstance.updateSettings (multi-display-manager.js:1160:34)`
- **Occurs**: After opening and closing any display window (e.g., Display 1), then toggling video controls or other settings
- **Suspected Cause**: DisplayInstance not properly cleaning up BroadcastChannel references when display window is closed, causing attempts to send messages to closed channels
- **Status**: Reported, needs investigation

### 16. **Advanced AM Visualization Window Resize Jumping**
- **Issue**: Advanced AudioMotion visualizations jump around the screen when window is resized
- **Occurs**: During window resize operations with Advanced AM viz active
- **Suspected Cause**: Advanced AM viz positioning/scaling logic differs from regular AM viz implementation
- **Fix Approach**: Compare with regular AM viz resize handling for proper implementation
- **Status**: Reported, needs investigation

### 17. **Missing Wait Animations for AM Visualizations**
- **Issue**: Wait animations should play for all AM visualizations when no audio is present
- **Occurs**: When record button is hit, when audio is muted on file video, when transporter audio is muted
- **Expected Behavior**: All AM visualizations should show waiting/idle animations during audio silence
- **Status**: Reported, needs implementation

---

# COMPLETE TODO LIST - BUG FIXES & ENHANCEMENTS

## 🔊 Audio & Visualization Issues
1. ✅ **COMPLETED: Regular AM viz and Pro viz have distinctly different sound output levels** - Added user Volume Adjust slider (0-100%) in Advanced section, defaults to 0% (muted)
2. ✅ **COMPLETED: In user presets list, rename 'Last Random Pro' to 'Last Random' and ensure it's always last in list** - Unified naming, added sorting logic to keep "Last Random" at end
3. ✅ **COMPLETED: Advanced presets need wait animation like regular presets have during loading** - Fixed audio connection timing issues
4. **Fix: Advanced presets not fully resetting all parameters when switching - parameters like Radial are leaking to new preset**
5. ✅ **COMPLETED: Energy Morph not working for Advanced visualizations** - Fixed energy bar fill for Advanced visualizations
6. ✅ **COMPLETED: User controls for Advanced morph parameters** - Added comprehensive Advanced Preset Controls UI
7. ✅ **COMPLETED: Make Energy Morph the default selection** - Set Energy as default morph mode on app load

## 🎵 Audio System
8. ✅ **COMPLETED: Clicking play just after app launch before audio is scanned causes error** - Implemented play button loading state with "Tracks Loading..." message
9. ✅ **COMPLETED: When fast-forwarding to a track, first track in list always plays instead of selected track** - Fixed track selection logic
10. ✅ **COMPLETED: Clear Audio Input functionality** - Added Clear Input buttons in header and mixer with state sync

## 🎨 UI/UX Improvements
11. **Improve: Better UI continuity between settings panels for consistent user experience**
12. ✅ **COMPLETED: Better user preset management - add clear list button** - Added Clear All Presets button with confirmation modal
13. **Fix: Click Outside handler for all panels and mixer**
14. **Fix: Match Header button order to Mixer order**

## 📹 Video System
15. **Add: More video effects**
16. ✅ **COMPLETED: Clear Video Input functionality** - Added Clear Input buttons in header and mixer with state sync

## 🔧 Technical Enhancements
17. ✅ **COMPLETED: Official AudioMotion library to add more gradients and color options** - Added 12 new gradients including sunset, ocean, fire, neon, aurora, galaxy, plasma, cosmic, forest, volcano, arctic, desert

## 🏷️ Branding & Cleanup
18. ✅ **COMPLETED: Rename app everywhere to FREQUE, remove all MVPro, Vizzy, GitItUp references** - Complete rebranding including header logo, meta tags, preset names, localStorage keys, BroadcastChannels
19. **Remove: All console messages and debug code from the app**
20. ✅ **COMPLETED: Remove the Pro suffix from the Advanced AM Viz button labels** - Updated preset names: Fluid, Prism, Twin Peaks, Circus
21. **Add: New UI colors and color scheme options ⭐ NEW**
22. **Fix: Footer Live Background button not found - B button disappeared when renaming application elements to FREQUE**
23. **Fix: WebGL mixer function errors - Multiple missing mixer synchronization functions for WebGL/Starfall controls (updateMixerStarfallToggle, updateMixerStarfallColorSchemeSelect, and 8 other slider update functions)**
24. **Fix: Kaleidoscope preset application error - TypeError when accessing 'segments' property of undefined kaleidoscope configuration object**
25. **Fix: Playlist Export Function Broken - Playlist export functionality is not working properly**
26. **Fix: BroadcastChannel Closed Error in Multi-Display System - InvalidStateError when trying to send messages to closed display windows after opening/closing display windows**
27. **Fix: Advanced AM Visualization Window Resize Jumping - Advanced AudioMotion visualizations jump around screen during window resize (compare with regular AM viz implementation)**
28. **Add: Wait Animations for All AM Visualizations - Implement waiting/idle animations when no audio is present (record button, muted video audio, muted transporter)**
29. **Enhance: Edit Official AM Library for Full Color Morphing - Modify AudioMotion library to allow full and smooth color morphing capabilities**
30. **Research: Audio Loopback Requirements - Check if BlackHole/Loopback are really needed for audio capture and update documentation accordingly**

## 🔊 Audio Controls
27. ✅ **COMPLETED: Speaker icon in transport needs to function as a mute button** - Implemented mute/unmute functionality with SVG icon state changes

## 📂 Playlist System Issues

### 14. **Playlist Export Function Broken**
- **Issue**: Playlist export functionality is not working properly
- **Status**: Reported, needs investigation

## 🔄 Preset System Issues
28. ✅ **COMPLETED: Last Random not visible until app restarted** - Fixed preset dropdown updates after random preset creation
29. ✅ **COMPLETED: After loading preset list from file, app must be restarted before it is visible** - Fixed preset import visibility with immediate dropdown updates

## 🎨 Visualization Button Issues
30. ✅ **COMPLETED: Visualization button active state color** - Set IZ, Blobs, Starfall, Fluidity, Nebula buttons to use info-color (blue) when active
31. ✅ **COMPLETED: Infinite Zoom, Fluidity blue highlight turns off when viz toggled OFF** - Fixed button state persistence
32. ✅ **COMPLETED: Blobs label shows "On/Off" text** - Removed "On/Off" from Blobs button label
33. ✅ **COMPLETED: Starfall label color needs to be white when active** - Fixed text color for active state
34. ✅ **COMPLETED: Fluidity button blue color changes back when panel closed** - Fixed state persistence on panel close
35. ✅ **COMPLETED: Nebula button blue color controlled by button click instead of ON/OFF toggle** - Fixed to be controlled by visualization state only