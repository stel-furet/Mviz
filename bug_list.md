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