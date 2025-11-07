#!/usr/bin/env python3
import re

# Read main.js
with open('/Users/steveyatson/Desktop/GitItUp/Mviz/js/main.js', 'r') as f:
    content = f.read()

# Find the LiveDisplayManager.compositeFrame() method and replace it
# The pattern is very similar to RecordManager but with displaySettings checks

# Pattern to match the old LiveDisplayManager logic
old_pattern = r"""        // Get source canvas \(main visualization canvas\)
        let sourceCanvas = null;
        
        // Determine which canvas to capture based on current state
        if \(this\.visualizer\.kaleidoscopeEnabled\) \{
            // Check if any visualization is being captured by kaleidoscope
            const anyVizCapturedByKaleidoscope = this\.visualizer\.kaleidoscopeApplyToViz \|\| 
                                               this\.visualizer\.kaleidoscopeApplyToInfiniteZoom \|\| 
                                               this\.visualizer\.kaleidoscopeApplyToWebGL \|\| 
                                               this\.visualizer\.kaleidoscopeApplyToFluidDynamics \|\| 
                                               this\.visualizer\.kaleidoscopeApplyToNebula;
            
            if \(anyVizCapturedByKaleidoscope && this\.visualizer\.kaleidoscopeVizCanvas\) \{
                sourceCanvas = this\.visualizer\.kaleidoscopeVizCanvas;
            \} else if \(this\.visualizer\.kaleidoscopeApplyToVideo && this\.visualizer\.kaleidoscopeVideoCanvas\) \{
                sourceCanvas = this\.visualizer\.kaleidoscopeVideoCanvas;
            \} else if \(this\.visualizer\.audioMotion\?\.canvas\) \{
                sourceCanvas = this\.visualizer\.audioMotion\.canvas;
            \}
        \} else if \(this\.visualizer\.audioMotion\?\.canvas\) \{
            sourceCanvas = this\.visualizer\.audioMotion\.canvas;
        \}
        
        if \(!sourceCanvas\) \{
            console\.warn\(`LiveDisplay \$\{this\.displayId\}: No source canvas found for streaming`\);
            return;
        \}"""

new_code = """        // Check if kaleidoscope is active with any sources
        const kaleidoscopeActive = this.visualizer.kaleidoscopeEnabled && 
                                   this.visualizer.kaleidoscopeCanvas && 
                                   this.visualizer.kaleidoscopeCanvas.style.display !== 'none';"""

# Replace the pattern
content = re.sub(old_pattern, new_code, content)

# Save
with open('/Users/steveyatson/Desktop/GitItUp/Mviz/js/main.js', 'w') as f:
    f.write(content)

print("LiveDisplayManager canvas selection updated!")

