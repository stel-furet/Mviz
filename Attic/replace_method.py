#!/usr/bin/env python3
import re

# Read the main.js file
with open('/Users/steveyatson/Desktop/GitItUp/Mviz/js/main.js', 'r') as f:
    content = f.read()

# Read the new method
with open('/Users/steveyatson/Desktop/GitItUp/Mviz/temp_kaleidoscope_method.js', 'r') as f:
    new_method = f.read()

# Remove the header comments from the new method
new_method = re.sub(r'^// TEMPORARY FILE.*?\n// This will replace.*?\n\n', '', new_method)

# Find the start of applyKaleidoscopeEffect() method
pattern = r'    applyKaleidoscopeEffect\(\) \{.*?    \}\n    setKaleidoscopeSegments\(value\) \{'

# Replace the method
new_content = re.sub(pattern, '    ' + new_method.strip() + '\n    setKaleidoscopeSegments(value) {', content, flags=re.DOTALL)

# Write back
with open('/Users/steveyatson/Desktop/GitItUp/Mviz/js/main.js', 'w') as f:
    f.write(new_content)

print("Replacement complete!")

