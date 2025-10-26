# 🏷️ Rename to Mentl - Complete Inventory

**Goal**: Replace all references to `Vizzy`, `MVPro`, `GitItUp`, and `GitUp` with `Mentl` throughout the codebase.

## 📊 Summary Statistics

| Term | Total Occurrences | Files Affected |
|------|------------------|----------------|
| **vizzy** (lowercase) | 26 | 8 files |
| **Vizzy** (capitalized) | 50 | 15 files |
| **mvpro** (lowercase) | 17 | 4 files |
| **MVPro** (capitalized) | 2 | 2 files |
| **MVPRO** (uppercase) | 3 | 2 files |
| **gitup** (lowercase) | 36 | 6 files |
| **GitItUp** (capitalized) | 61 | 8 files |

**Total**: 195 references across 25+ files

---

## 🔍 Detailed Inventory

### 1. **vizzy** (lowercase) - 26 occurrences

#### **CSS Files**
- `index.html` (2 occurrences):
  - Line 32: `<link rel="stylesheet" href="vizzy.css">`
  - Line 1405: `<link rel="stylesheet" href="vizzy.css">`

#### **LocalStorage Keys**
- `js/playlist-manager.js` (6 occurrences):
  - Line 550: `localStorage.getItem('vizzy_current_playlist')`
  - Line 599: `localStorage.setItem('vizzy_current_playlist', ...)`
  - Line 603: `const cacheKey = 'vizzy_playlist_cache_${folderHash}'`
  - Line 625: `localStorage.getItem('vizzy_playlist_cache_index')`
  - Line 636: `localStorage.setItem('vizzy_playlist_cache_index', ...)`
  - Line 645: `const cacheKey = 'vizzy_playlist_cache_${folderHash}'`

- `js/theme-system.js` (2 occurrences):
  - Line 7: `localStorage.getItem('vizzy-theme')`
  - Line 15: `localStorage.setItem('vizzy-theme', selectedTheme)`

#### **Documentation Files**
- `UI_ELEMENT_AUDIT.md` (3 occurrences)
- `UI_CLEANUP_STRATEGY.md` (2 occurrences)
- `COMPREHENSIVE_UI_AND_BUG_MANAGEMENT_PLAN.md` (1 occurrence)
- `UI_STYLING_CONSISTENCY_PLAN.md` (1 occurrence)
- `vizzy_architecture.html` (2 occurrences)

#### **Archive Files**
- `Attic/9-12 BAK index.html` (7 occurrences) - Similar localStorage keys

---

### 2. **Vizzy** (capitalized) - 50 occurrences

#### **Recording Settings**
- `js/main.js` (3 occurrences):
  - Line 1626: `this.customFilename = 'Vizzy_Recording'`
  - Line 1728: `this.customFilename = settings.customFilename || 'Vizzy_Recording'`
  - Line 1860: `this.customFilename = e.target.value || 'Vizzy_Recording'`

#### **UI Labels & Placeholders**
- `index.html` (1 occurrence):
  - Line 2057: `<input ... placeholder="Vizzy_Recording" ...>`

#### **File Dialog Descriptions**
- `js/playlist-manager.js` (2 occurrences):
  - Line 84: Comment `// Simple "V" for Vizzy`
  - Line 235: `const request = indexedDB.open('VizzyPlaylistDB', 1)`
  - Line 1895: `description: 'Vizzy Playlist Files'`

#### **Documentation & Architecture Files**
- `bug_list.md` (1 occurrence)
- `UI_CLEANUP_STRATEGY.md` (1 occurrence)
- `COMPREHENSIVE_UI_AND_BUG_MANAGEMENT_PLAN.md` (1 occurrence)
- `UI_STYLING_CONSISTENCY_PLAN.md` (1 occurrence)
- `Poss_Layer_Arch.md` (1 occurrence)
- `vizzy_architecture.html` (4 occurrences)
- `ODP.html` (7 occurrences)
- `ODP.md` (7 occurrences)
- `MAJOR_FEATURES_DEVELOPMENT_PLAN.md` (2 occurrences)
- `UIO_MASTER_PLAN.md` (3 occurrences)
- `Color_Schemes_2025.html` (3 occurrences)
- `Vizzy_UI_Proposal.html` (4 occurrences)

#### **Archive Files**
- `Attic/9-12 BAK index.html` (10 occurrences) - Similar patterns

---

### 3. **mvpro** (lowercase) - 17 occurrences

#### **BroadcastChannel Names**
- `js/main.js` (3 occurrences):
  - Line 7825: `new BroadcastChannel('mvpro-live-display-settings-${displayId}')`
  - Line 7826: Console log with channel name
  - Line 7963: `localStorage.getItem('mvpro_live_display_settings_${this.displayId}')`
  - Line 7990: `localStorage.setItem('mvpro_live_display_settings_${this.displayId}', ...)`

- `js/multi-display-manager.js` (4 occurrences):
  - Line 1046: `new BroadcastChannel('mvpro-live-display-${displayId}')`
  - Line 1050: `new BroadcastChannel('mvpro-live-display-settings-${displayId}')`
  - Line 1064: `localStorage.getItem('mvpro_display_${this.displayId}_settings')`
  - Line 1096: `localStorage.setItem('mvpro_display_${this.displayId}_settings', ...)`

#### **Script Includes**
- `index.html` (1 occurrence):
  - Line 42: `<script src="js/mvpro_webgl.js"></script>`

#### **Display Window**
- `Display.html` (1 occurrence):
  - Line 186: `new BroadcastChannel('mvpro-live-display-${this.displayId}')`

#### **Documentation**
- `WebGL_Visualization_Project.md` (3 occurrences)
- `STREAMMANAGER_REPLACEMENT_PLAN.md` (1 occurrence)

---

### 4. **MVPro** (capitalized) - 2 occurrences

- `bug_list.md` (1 occurrence): In rename task description
- `js/multi-display-manager.js` (1 occurrence):
  - Line 1108: `'MVPro_Display_${this.displayId}'` (window name)

---

### 5. **MVPRO** (uppercase) - 3 occurrences

#### **UI Headers**
- `index.html` (1 occurrence):
  - Line 2472: `<span>MVPRO Mixer</span>`

- `mvpro_mixer_proto.html` (2 occurrences):
  - Line 6: `<title>MVPRO Mixer Prototype</title>`
  - Line 251: `MVPRO Mixer` (header text)

---

### 6. **gitup** (lowercase) - 36 occurrences

#### **LocalStorage Keys**
- `js/main.js` (12 occurrences):
  - Line 1720: `localStorage.getItem('gitup_record_settings')`
  - Line 1758: `localStorage.setItem('gitup_record_settings', ...)`
  - Line 8959: `new BroadcastChannel('gitup-live-display')`
  - Line 9008: `localStorage.getItem('gitup_display_settings')`
  - Line 9027: `localStorage.setItem('gitup_display_settings', ...)`
  - Line 21709: `localStorage.getItem('gitup_background_image')`
  - Line 21742: `localStorage.setItem('gitup_background_image', ...)`
  - Line 21759: `localStorage.removeItem('gitup_background_image')`
  - Line 22956: `localStorage.getItem('gitup_bgcolor')`
  - Line 22975: `localStorage.setItem('gitup_bgcolor', ...)`

- `js/spectrum-analyzer.js` (1 occurrence):
  - Line 141: `localStorage.setItem('gitup_bgcolor', ...)`

#### **Archive Files**
- `Attic/9-12 BAK index.html` (19 occurrences) - Similar localStorage patterns
- `Attic/9-12 BAK Display.html` (1 occurrence)
- `Attic/9-4 DISPLAY FINAL main window.html` (12 occurrences)
- `Attic/9-4 DISPLAY FINAL Display Window.html` (1 occurrence)

---

### 7. **GitItUp** (capitalized) - 61 occurrences

#### **Class Names**
- `js/main.js` (25+ occurrences):
  - Line 10020: `class GitItUpVisualizer {`
  - Line 27396: `window.visualizer = new GitItUpVisualizer()`
  - Lines 27599, 27683, 27753, 27823: `GitItUpVisualizer.prototype.apply...`
  - Lines 27908, 27918, 27926, 27967, 27987: `GitItUpVisualizer.prototype.load/save...`
  - Lines 28092, 28110, 28129: `GitItUpVisualizer.prototype.update/export/import...`
  - Lines 28897, 28911, 28925: `GitItUpVisualizer.prototype.updateMixer...`

#### **Window Titles & Display Names**
- `js/main.js` (1 occurrence):
  - Line 9182: `window.open('display.html', 'GitItUp Live Display', ...)`

#### **UI Elements**
- `index.html` (3 occurrences):
  - Line 8: `<meta name="author" content="GitItUp">`
  - Line 55: `<button ... title="About GitItUp">i</button>`
  - Line 1430: `<h3>GitItUp Music Visualizer</h3>`

#### **Documentation Comments**
- `js/main.js` (1 occurrence):
  - Line 18430: `6. In GitItUp, select "BlackHole 2ch" as input`

#### **Documentation Files**
- `bug_list.md` (1 occurrence)
- `Attic/BACKGROUND_SECTION_REMOVAL_PLAN.md` (1 occurrence)
- `Attic/OUTPUT_SECTION_REMOVAL_PLAN.md` (1 occurrence)
- `vizzy_architecture.html` (3 occurrences)
- `ODP.md` (3 occurrences)
- `MAJOR_FEATURES_DEVELOPMENT_PLAN.md` (1 occurrence)

#### **Archive Files**
- `Attic/9-12 BAK index.html` (12 occurrences) - Similar patterns
- `Attic/9-12 BAK Display.html` (2 occurrences)
- `Attic/9-4 DISPLAY FINAL main window.html` (8 occurrences)
- `Attic/9-4 DISPLAY FINAL Display Window.html` (2 occurrences)

---

## 🎯 Replacement Strategy

### **Phase 1: Core Application Files**
1. **`js/main.js`** - Class names, localStorage keys, BroadcastChannels
2. **`index.html`** - Meta tags, UI text, script includes
3. **`js/playlist-manager.js`** - localStorage keys, database names
4. **`js/multi-display-manager.js`** - BroadcastChannels, localStorage keys
5. **`js/theme-system.js`** - localStorage keys
6. **`js/spectrum-analyzer.js`** - localStorage keys

### **Phase 2: CSS & Assets**
1. **Rename `vizzy.css`** → **`metl.css`**
2. **Update CSS references** in HTML files

### **Phase 3: Documentation & Config Files**
1. **Documentation files** (`.md`, `.html`)
2. **Prototype files** (`mvpro_mixer_proto.html`)
3. **Display files** (`Display.html`)

### **Phase 4: Archive Cleanup** (Optional)
1. **Attic folder files** - Update for consistency

---

## 🔄 Suggested Replacements

| Original | Replacement |
|----------|-------------|
| `vizzy` | `mentl` |
| `Vizzy` | `Mentl` |
| `VIZZY` | `MENTL` |
| `mvpro` | `mentl` |
| `MVPro` | `Mentl` |
| `MVPRO` | `MENTL` |
| `gitup` | `mentl` |
| `GitItUp` | `Mentl` |
| `GitUp` | `Mentl` |
| `vizzy.css` | `mentl.css` |
| `VizzyPlaylistDB` | `MentlPlaylistDB` |
| `Vizzy_Recording` | `Mentl_Recording` |
| `GitItUp Music Visualizer` | `Mentl Music Visualizer` |
| `GitItUp Live Display` | `Mentl Live Display` |
| `MVPRO Mixer` | `MENTL Mixer` |

---

## ⚠️ Critical Considerations

### **LocalStorage Keys**
- Changing localStorage keys will **reset user data**
- Consider migration strategy for:
  - `vizzy_current_playlist` → `mentl_current_playlist`
  - `vizzy-theme` → `mentl-theme`
  - `gitup_record_settings` → `mentl_record_settings`
  - `gitup_display_settings` → `mentl_display_settings`
  - `gitup_background_image` → `mentl_background_image`
  - `gitup_bgcolor` → `mentl_bgcolor`

### **BroadcastChannel Names**
- Changing channel names will **break live display communication**
- Ensure all instances are updated simultaneously:
  - `gitup-live-display` → `mentl-live-display`
  - `mvpro-live-display-*` → `mentl-live-display-*`
  - `mvpro-live-display-settings-*` → `mentl-live-display-settings-*`

### **File Dependencies**
- `vizzy.css` → `mentl.css` requires updating all HTML references
- `js/mvpro_webgl.js` → consider renaming to `js/mentl_webgl.js`

### **Database Names**
- `VizzyPlaylistDB` → `MentlPlaylistDB` will require database migration

---

## 📋 Implementation Checklist

- [ ] **Phase 1**: Core application files
- [ ] **Phase 2**: CSS file rename and references
- [ ] **Phase 3**: Documentation updates
- [ ] **Phase 4**: Archive file cleanup
- [ ] **Testing**: Verify all functionality works
- [ ] **Migration**: Handle localStorage/database transitions
- [ ] **Cleanup**: Remove old references

**Estimated Time**: 2-3 hours for complete implementation
**Risk Level**: Medium (due to localStorage and BroadcastChannel changes)
