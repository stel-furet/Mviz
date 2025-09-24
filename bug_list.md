# Bug List - Vizzy Music Visualizer

## Bug Tracking System

This document serves as a centralized bug tracking system for the Vizzy Music Visualizer project. Bugs are categorized by severity and status for easy management and prioritization.

---

## Bug Categories

### Severity Levels
- **🔴 Critical**: Application crashes, data loss, security issues
- **🟠 High**: Major functionality broken, significant user impact
- **🟡 Medium**: Minor functionality issues, workarounds available
- **🟢 Low**: Cosmetic issues, minor improvements

### Status Levels
- **🆕 New**: Recently reported, not yet triaged
- **🔍 Investigating**: Under investigation, root cause being identified
- **🛠️ In Progress**: Actively being worked on
- **🧪 Testing**: Fix implemented, under testing
- **✅ Resolved**: Bug fixed and verified
- **❌ Won't Fix**: Decided not to fix (with reason)
- **📋 Duplicate**: Duplicate of existing bug

---

## Active Bugs

### 🔴 Critical Bugs
*No critical bugs currently reported*

### 🟠 High Priority Bugs
*No high priority bugs currently reported*

### 🟡 Medium Priority Bugs

#### Bug ID: BUG-001
**Title**: Visualization Preset Dropdown Label Not Displaying Selected Name
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
When a visualization preset is selected from the presets dropdown, the selected preset's name should be displayed as the dropdown label, but currently it's not updating properly.

**Steps to Reproduce**:
1. Open the visualization presets dropdown
2. Select any preset
3. Observe that the dropdown label doesn't change to show the selected preset name

**Expected Behavior**:
The dropdown should display the name of the currently selected preset

**Actual Behavior**:
The dropdown label remains unchanged or shows incorrect information

---

#### Bug ID: BUG-002
**Title**: Missing Rescan Button in Audio and Video Panels
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
Audio and Video panels lack a rescan button. Currently when new sources are added, the application needs to be restarted to detect them.

**Steps to Reproduce**:
1. Add new audio or video sources to the system
2. Open the Audio or Video panel
3. Observe that new sources are not detected
4. Restart the application to see new sources appear

**Expected Behavior**:
A rescan button should be available to refresh the source list without restarting

**Actual Behavior**:
No rescan functionality available, requiring application restart

---

#### Bug ID: BUG-003
**Title**: Kaleidoscope Aspect Ratio Incorrect in Record Panel
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
The Kaleidoscope visualization displays with incorrect aspect ratio when recording.

**Steps to Reproduce**:
1. Enable Kaleidoscope visualization
2. Start recording
3. Observe incorrect aspect ratio in recorded output

**Expected Behavior**:
Kaleidoscope should maintain correct aspect ratio during recording

**Actual Behavior**:
Aspect ratio is distorted in recorded output

---

#### Bug ID: BUG-004
**Title**: UI Elements in Record Panel Not Working Properly
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
Various UI elements in the Record panel are not functioning correctly.

**Steps to Reproduce**:
1. Open the Record panel
2. Interact with various UI controls
3. Observe non-functional elements

**Expected Behavior**:
All UI elements should work as expected

**Actual Behavior**:
Some UI elements are non-functional

---

#### Bug ID: BUG-005
**Title**: Dropdowns in Record Panel Need Correct Styling
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
Dropdown elements in the Record panel are not styled correctly according to the new base.css standards.

**Steps to Reproduce**:
1. Open the Record panel
2. Observe dropdown styling
3. Compare with other panels using new styling

**Expected Behavior**:
Dropdowns should use consistent styling from base.css

**Actual Behavior**:
Dropdowns use outdated or inconsistent styling

---

#### Bug ID: BUG-006
**Title**: Missing 2K Option in Resolution Dropdown
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
The Resolution dropdown in the Record panel is missing a 2K option.

**Steps to Reproduce**:
1. Open the Record panel
2. Open the Resolution dropdown
3. Look for 2K option

**Expected Behavior**:
2K resolution option should be available

**Actual Behavior**:
2K option is missing from the dropdown

---

#### Bug ID: BUG-007
**Title**: Record Panel Functionality Needs Research Before Panel Positioning Update
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
The Record panel needs comprehensive research to ensure all functionality is present and working properly before implementing the panel positioning system update.

**Steps to Reproduce**:
1. Open the Record panel
2. Test all available functionality
3. Document any missing or broken features

**Expected Behavior**:
All Record panel functionality should be documented and working

**Actual Behavior**:
Unknown - needs research to determine current state

---

#### Bug ID: BUG-010
**Title**: Kaleidoscope Rotation Slows Down When Recording Starts
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
Kaleidoscope rotation speed decreases when recording begins, causing inconsistent visual behavior.

**Steps to Reproduce**:
1. Enable Kaleidoscope visualization
2. Set rotation speed to a desired value
3. Start recording
4. Observe rotation speed change

**Expected Behavior**:
Kaleidoscope rotation should maintain consistent speed during recording

**Actual Behavior**:
Rotation speed slows down when recording starts

---

#### Bug ID: BUG-011
**Title**: Background Color Not Captured in Recording, Always Black
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
The background color setting is not captured in recordings - the background always appears black regardless of the selected color.

**Steps to Reproduce**:
1. Set a background color in the visualization settings
2. Start recording
3. Review the recorded output

**Expected Behavior**:
The recording should capture the selected background color

**Actual Behavior**:
The recording background is always black, ignoring the color setting

---

#### Bug ID: BUG-009
**Title**: File Video Audio Not Affecting Visualization When Unmuted
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
When file video or audio is unmuted, it should affect the visualization but currently does not.

**Steps to Reproduce**:
1. Load a file video or audio source
2. Unmute the audio/video
3. Observe visualization behavior

**Expected Behavior**:
The visualization should react to the unmuted audio/video content

**Actual Behavior**:
The visualization does not respond to unmuted file audio/video

---

#### Bug ID: BUG-008
**Title**: Kaleidoscope Animate Toggle Should Reset to Center Position
**Severity**: 🟡 Medium
**Status**: 🆕 New
**Reported**: 2024-12-19
**Reporter**: User
**Assigned**: TBD

**Description**: 
When turning Kaleidoscope Animate ON then OFF again, it should reset the Kaleidoscope to center position.

**Steps to Reproduce**:
1. Open Kaleidoscope panel
2. Turn Animate ON
3. Turn Animate OFF
4. Observe Kaleidoscope position

**Expected Behavior**:
Kaleidoscope should return to center position when Animate is turned OFF

**Actual Behavior**:
Kaleidoscope remains in its last animated position

### 🟢 Low Priority Bugs
*No low priority bugs currently reported*

---

## Resolved Bugs

### Recently Resolved
*No recently resolved bugs*

### Historical Resolved Bugs
*No historical resolved bugs*

---

## Bug Report Template

When adding new bugs, use this template:

```markdown
### Bug ID: [AUTO-GENERATED]
**Title**: [Brief description]
**Severity**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
**Status**: 🆕 New | 🔍 Investigating | 🛠️ In Progress | 🧪 Testing | ✅ Resolved | ❌ Won't Fix | 📋 Duplicate
**Reported**: [Date]
**Reporter**: [Name/Username]
**Assigned**: [Developer name]

**Description**: 
[Detailed description of the bug]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Environment**:
- OS: [Operating System]
- Browser: [Browser and version]
- Vizzy Version: [Version number]

**Screenshots/Logs**:
[Attach relevant screenshots or error logs]

**Additional Notes**:
[Any additional context or information]
```

---

## Bug Statistics

### Current Status Summary
- **Total Bugs**: 11
- **Critical**: 0
- **High**: 0
- **Medium**: 11
- **Low**: 0
- **Resolved**: 0

### Monthly Trends
*No data available yet*

---

## Bug Management Workflow

### 1. Bug Reporting
- Use the template above when adding new bugs
- Assign appropriate severity level
- Include all relevant information
- Add screenshots/logs when possible

### 2. Bug Triage
- Review new bugs weekly
- Assign severity if not already assigned
- Assign to appropriate developer
- Update status to "Investigating"

### 3. Bug Resolution
- Update status as work progresses
- Add resolution notes when fixed
- Move to "Resolved" section when complete
- Update statistics

### 4. Bug Closure
- Verify fix works as expected
- Test in multiple environments
- Update documentation if needed
- Close bug and archive

---

## Quick Add Commands

To quickly add bugs, use these commands:

### Add Critical Bug
```bash
# Add to bug list: Critical - [Title] - [Description]
```

### Add High Priority Bug
```bash
# Add to bug list: High - [Title] - [Description]
```

### Add Medium Priority Bug
```bash
# Add to bug list: Medium - [Title] - [Description]
```

### Add Low Priority Bug
```bash
# Add to bug list: Low - [Title] - [Description]
```

---

## Integration Notes

This bug list integrates with:
- GitHub Issues (if applicable)
- Development workflow
- Testing procedures
- Release planning

---

*Last Updated: [Current Date]*
*Next Review: [Next Review Date]*
