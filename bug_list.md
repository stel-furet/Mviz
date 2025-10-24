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

---

# COMPLETE TODO LIST - BUG FIXES & ENHANCEMENTS

## 🔊 Audio & Visualization Issues
1. ✅ **COMPLETED: Regular AM viz and Pro viz have distinctly different sound output levels** - Added user Volume Adjust slider (0-100%) in Advanced section, defaults to 0% (muted)
2. ✅ **COMPLETED: In user presets list, rename 'Last Random Pro' to 'Last Random' and ensure it's always last in list** - Unified naming, added sorting logic to keep "Last Random" at end
3. **Add: Pro presets need wait animation like regular presets have during loading**
4. **Fix: Pro presets not fully resetting all parameters when switching - parameters like Radial are leaking to new preset**
5. **Fix: Energy Morph not working for Pro visualizations**
6. **Add: User controls for Pro morph parameters and possibly break out Pro parameters into separate container**
7. **Add: Make Energy Morph the default selection**

## 🎵 Audio System
8. **Fix: Clicking play just after app launch before audio is scanned causes error - disable play button until audio loading complete, show 'Loading...' message**
9. **Fix: When fast-forwarding to a track, first track in list always plays instead of selected track**
10. **Add: Clear Audio Input functionality**

## 🎨 UI/UX Improvements
11. **Improve: Better UI continuity between settings panels for consistent user experience**
12. **Add: Better user preset management - add clear list button**
13. **Fix: Click Outside handler for all panels and mixer**
14. **Fix: Match Header button order to Mixer order**

## 📹 Video System
15. **Add: More video effects**
16. **Add: Clear Video Input functionality**

## 🔧 Technical Enhancements
17. **Modify: Official AudioMotion library to add more gradients and color options**

## 🏷️ Branding & Cleanup
18. **Rename: App everywhere to Metl, remove all MVPro, Vizzy, GitItUp references**
19. **Remove: All console messages and debug code**
20. **Fix: Remove the Pro suffix from the Advanced AM Viz button labels**

## 🔊 Audio Controls
21. **Add: Speaker icon in transport needs to function as a mute button**

## 🔄 Preset System Issues
22. **Fix: Last Random not visible until app restarted**
23. **Fix: After loading preset list from file, app must be restarted before it is visible**