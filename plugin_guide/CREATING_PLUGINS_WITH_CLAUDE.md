# Creating Freque Plugins with Claude

**A complete guide for using Claude (me!) to create music visualization plugins with minimal coding knowledge**

---

## 🎯 What This Guide Is For

You want to create amazing music visualizations for Freque, but you:
- Have basic programming understanding (know what variables, functions are)
- Don't want to write all the code yourself
- Want to describe your vision and let AI handle the technical details
- Need guidance on how to communicate your ideas effectively

**This guide shows you exactly how to work with me to create plugins quickly and correctly.**

---

## 🚀 Quick Start: Your First Plugin in 10 Minutes

### Step 1: Copy This Template

```
Claude, help me create a Freque music visualization plugin:

**Plugin Name:** [choose a simple, descriptive name]
Example: "cosmic-waves", "beat-pulse", "frequency-rings"

**Visual Effect:** [describe what you want to see]
Example: "Colorful circles that expand from the center"

**Audio Response:** [how it should react to music]
Example: "Circles get bigger with bass, faster with high notes"

**Controls:** [what should be adjustable]
Example: "Circle size, color, speed, number of circles"

Use the Freque plugin architecture with FrequePluginBase.
Make it work with the Master Animation Controller.
Include proper UI controls and at least 2 presets.
```

### Step 2: Fill It In

Here's a filled example:

```
Claude, help me create a Freque music visualization plugin:

**Plugin Name:** rainbow-spirals

**Visual Effect:** Colorful spirals that rotate and pulse outward from the center of the screen

**Audio Response:** 
- Bass makes spirals thicker
- Mid frequencies control rotation speed  
- High frequencies change colors
- Beat drops cause a burst effect

**Controls:**
- Spiral count (3-12)
- Thickness (thin to thick)
- Rotation speed
- Color scheme (rainbow, blue, red, purple)
- Beat sensitivity

Use the Freque plugin architecture with FrequePluginBase.
Make it work with the Master Animation Controller.
Include proper UI controls and at least 3 presets (gentle, energetic, intense).
```

### Step 3: Send It to Me

Paste your filled template in a message to me, and I'll generate:
- ✅ Complete working plugin code
- ✅ All UI controls properly configured
- ✅ Multiple presets
- ✅ Audio reactivity fully implemented
- ✅ Proper error handling
- ✅ Comments explaining the code

---

## 💡 How to Describe Your Vision

### The Magic Formula

**Good plugin request = Visual + Audio + Interaction**

#### 1. Visual (What It Looks Like)

**Be specific about:**
- Shapes (circles, lines, particles, waves, 3D objects)
- Movement (rotating, pulsing, flowing, exploding)
- Colors (specific colors, gradients, shifting hues)
- Layout (center, edges, full screen, layered)

**Examples:**

✅ **Good:** "Glowing particles that form a sphere, with trails as they move"

❌ **Too vague:** "Some particles"

✅ **Good:** "Vertical bars like an equalizer, with neon blue gradient"

❌ **Too vague:** "Bars"

✅ **Good:** "3D tunnel with hexagonal patterns that scroll toward the viewer"

❌ **Too vague:** "A tunnel"

#### 2. Audio Response (How It Reacts)

**Three main frequency ranges:**
- **Bass** (deep sounds, kick drum, bass guitar) - good for size, intensity
- **Mid** (vocals, most instruments) - good for speed, movement
- **Treble** (high sounds, cymbals, hi-hats) - good for detail, sparkle

**Examples:**

✅ **Good:** 
- "Particles grow larger with bass"
- "Rotation speed increases with mid frequencies"
- "Color shifts from blue to red based on treble"
- "Beat drops trigger explosion effect"

❌ **Too vague:**
- "Reacts to music"
- "Changes with sound"

#### 3. Interaction (What Users Control)

**Common controls to include:**
- Count/Amount (how many elements)
- Size (how big things are)
- Speed (how fast things move)
- Color scheme (different color options)
- Intensity/Sensitivity (how much it reacts)
- On/Off toggles for features

**Example control list:**
```
- Particle count (100-10000)
- Particle size (small/medium/large)
- Animation speed (slow to fast)
- Color scheme (rainbow, fire, ocean, neon)
- Bass sensitivity (0-200%)
- Enable/disable trails
- Enable/disable beat pulse
```

---

## 📝 Real-World Examples

### Example 1: Simple 2D Effect

**Request:**
```
Claude, create a plugin called "energy-rings":

Visual: Concentric rings emanating from the center, like ripples in water. 
Each ring is a different color from a gradient. Rings fade out as they expand.

Audio Response:
- New rings spawn faster with higher energy
- Ring expansion speed increases with bass
- Colors shift through rainbow based on treble
- Beat drops make rings pulse brighter

Controls:
- Ring count (3-15)
- Expansion speed
- Fade out time
- Color gradient (rainbow, warm, cool, monochrome)
- Beat pulse intensity

Create 3 presets: subtle, normal, intense
```

**What I'll deliver:**
- Complete plugin with smooth ring animation
- Proper fade-out effect
- Beat detection system
- All controls working
- Three presets as specified

---

### Example 2: 3D Visualization

**Request:**
```
Claude, create a 3D plugin called "audio-galaxy":

Visual: A 3D galaxy of stars/particles that rotate slowly. 
Particles should be different sizes and have a soft glow.
Camera should orbit around the galaxy.

Audio Response:
- Bass makes particles pulse larger
- Mid frequencies speed up rotation
- Treble affects particle brightness
- Beat drops cause particles to briefly shoot outward then return

Controls:
- Particle count (1000-20000)
- Particle size
- Rotation speed
- Camera distance
- Color scheme (white stars, rainbow, nebula colors)
- Enable/disable camera orbit
- Enable/disable beat bursts

Use Three.js for 3D rendering.
Create 4 presets: ambient, energetic, explosive, minimal
```

**What I'll deliver:**
- Full Three.js setup
- Shader-based particle system
- Camera orbit system
- Beat detection with burst effect
- All controls and presets
- Proper WebGL cleanup

---

### Example 3: Complex Multi-Layer Effect

**Request:**
```
Claude, create "frequency-fountain":

Visual: Particles fountain up from the bottom of the screen like water,
with different colors representing different frequency ranges.
Bass = red/orange particles (center)
Mid = yellow/green particles (middle)
Treble = blue/purple particles (edges)

Audio Response:
- Each frequency range controls its own particle emission rate
- Bass particles are larger and slower
- Treble particles are smaller and faster
- Overall energy affects fountain height
- Beat drops cause all particles to explode upward

Controls:
- Total particle count
- Particle lifetime
- Fountain width
- Gravity strength
- Color intensity
- Enable/disable frequency separation
- Enable/disable gravity
- Beat burst strength

Create presets for different music genres: electronic, rock, classical, ambient
```

**What I'll deliver:**
- Multi-layered particle system
- Frequency-split audio analysis
- Physics simulation (gravity, velocity)
- Genre-optimized presets
- All controls with proper ranges

---

## 🎨 Describing Visual Styles

### Abstract Patterns

**Good phrases:**
- "Geometric shapes that tessellate"
- "Flowing lines like aurora borealis"
- "Kaleidoscopic patterns that mirror and repeat"
- "Fractal-like branching structures"
- "Mandala patterns that rotate"

### Nature-Inspired

**Good phrases:**
- "Particles that move like a flock of birds"
- "Waves like ocean ripples"
- "Lightning-like branches"
- "Galaxy spiral arms"
- "Flower petals that bloom"

### Tech/Cyber Aesthetic

**Good phrases:**
- "Digital glitch effects"
- "Matrix-style falling code"
- "Neon grid like Tron"
- "Holographic interference patterns"
- "Circuit board pathways"

### References to Existing Visualizations

**You can reference:**
- "Like iTunes visualizer but..."
- "Similar to Windows Media Player bars"
- "Like the Nebula plugin but with..."
- "Inspired by Milkdrop but simpler"

---

## 🔧 Modifying Existing Plugins

### Pattern 1: "Take X and change Y"

```
Claude, take the Storm plugin and modify it:

Changes:
- Instead of star-shaped particles, make them circles
- Add a gravity effect pulling particles down
- Change colors to only use shades of blue
- Add a "wind strength" control
- Make particles leave glowing trails
```

### Pattern 2: "Combine X with Y"

```
Claude, create a plugin that combines:
- The particle system from Storm
- The 3D camera movement from Audio Particles 3D
- Add color schemes from both

Make particles rotate in 3D space with camera controls.
```

### Pattern 3: "X but simpler/more complex"

```
Claude, create a simpler version of Nebula:
- Keep the 3D particle cloud
- Remove all the expansion/chaos controls
- Just have: particle count, color, and rotation speed
- Make it very minimal and clean
```

---

## 🎯 Specifying Controls

### Control Template

```
For each control, specify:
1. Type (slider, dropdown, checkbox, button)
2. Label (what it's called in UI)
3. Range (min/max for sliders)
4. Default value
5. What it affects

Example:
- Slider: "Particle Count", 100-5000, default 1000, controls number of particles
- Dropdown: "Color Theme", options [Rainbow, Fire, Ocean, Neon], affects particle colors
- Checkbox: "Enable Trails", default true, makes particles leave trails
- Button: "Explode", triggers explosion effect when clicked
```

### Grouping Controls

```
**Basic Controls:**
- Particle count
- Size
- Speed

**Audio Reactivity:**
- Bass sensitivity
- Mid sensitivity
- Treble sensitivity
- Beat detection on/off

**Visual Settings:**
- Color scheme
- Opacity
- Blur amount
- Glow intensity

**Advanced:**
- Physics strength
- Camera distance
- Render quality
```

---

## 🎭 Creating Effective Presets

### Preset Template

```
Preset Name: [descriptive name]
Purpose: [what music/mood is this for]
Settings:
- [control]: [value]
- [control]: [value]
...
```

### Example Presets

**For a particle system:**

```
Preset 1: "Ambient"
Purpose: Calm, slow music - meditative
Settings:
- Particle count: 500
- Size: small
- Speed: 0.3x
- Color: soft blue
- Bass reactive: yes
- Beat pulse: no

Preset 2: "Energetic"
Purpose: Fast, upbeat music - dance/electronic
Settings:
- Particle count: 5000
- Size: medium
- Speed: 2.0x
- Color: rainbow
- Bass reactive: yes
- Beat pulse: yes

Preset 3: "Explosive"
Purpose: Heavy, intense music - metal/dubstep
Settings:
- Particle count: 10000
- Size: large
- Speed: 3.0x
- Color: fire red
- Bass reactive: yes
- Beat pulse: yes
- Burst intensity: maximum
```

---

## 💬 Having a Conversation with Me

### It's Iterative!

**First message:** Get the basics working
```
Claude, create a plugin with glowing orbs that pulse with bass
```

**Second message:** Add features
```
Now add controls for orb count and color scheme
```

**Third message:** Refine behavior
```
Make the orbs move more smoothly, and add trails
```

**Fourth message:** Polish
```
Add 3 presets and make the beat detection more sensitive
```

### Asking for Explanations

**You can always ask:**
- "Explain how the beat detection works"
- "What does this part of the code do?"
- "How can I make the particles move faster?"
- "Why isn't the color changing working?"

**I'll explain in simple terms:**
- What each section does
- Why certain approaches were used
- How to modify specific behaviors
- What to change for different effects

### Troubleshooting Together

**If something doesn't work:**

1. Describe the problem specifically
```
"The particles aren't appearing on screen"
```

2. I'll ask diagnostic questions
```
- Are there any errors in the browser console?
- Is the plugin showing as active in the mixer?
- Can you see the canvas element?
```

3. We fix it together
```
I'll provide the fix and explain what was wrong
```

---

## 🎓 Learning as You Go

### Understanding the Code

When I provide code, it includes comments like:

```javascript
// Get audio energy (0-1 range)
const energy = this.getAudioEnergy();

// Map energy to particle size (5-20 pixels)
const size = 5 + (energy * 15);

// Draw particle with calculated size
this.ctx.arc(x, y, size, 0, Math.PI * 2);
```

### Key Concepts You'll Learn

**Even without deep coding knowledge, you'll understand:**

1. **Audio Reactivity**
   - How frequency ranges work
   - Why bass affects size (feels natural)
   - Why treble affects speed/detail (matches perception)

2. **Animation**
   - deltaTime for smooth movement
   - Easing for natural motion
   - Frame-rate independent updates

3. **Visual Effects**
   - Particle systems
   - Color manipulation
   - Blending modes
   - Opacity and layering

4. **User Interface**
   - Slider ranges and defaults
   - Checkbox toggles
   - Preset configurations

### Growing Your Skills

**Start simple:**
```
1st plugin: Pulsing circles (1 day to create)
```

**Add complexity:**
```
2nd plugin: Particles with trails (understand more)
```

**Get creative:**
```
3rd plugin: 3D effects with shaders (confident now)
```

---

## ✅ Quality Checklist

When you receive code from me, check that it has:

- [ ] Works when you load it (no errors)
- [ ] Appears in the mixer with ON/OFF toggle
- [ ] Has all requested controls
- [ ] Has all requested presets
- [ ] Reacts to audio as described
- [ ] Includes comments explaining code
- [ ] Follows naming convention (`pluginname-freque-plugin.js`)
- [ ] Extends `FrequePluginBase`
- [ ] Has proper cleanup (for Three.js plugins)

---

## 🚨 Common Mistakes to Avoid

### ❌ Too Vague

"Make something cool with particles that reacts to music"

### ✅ Specific

"Create particles that form spiral patterns, expand with bass, rotate with mid frequencies, change color with treble, and pulse on beats"

---

### ❌ Unrealistic Expectations

"Make a photorealistic 3D city that rebuilds itself based on the song structure"

### ✅ Achievable Goals

"Create a 3D building block structure that grows taller with energy and changes colors based on frequencies"

---

### ❌ Inconsistent Terms

"Make it react to bass" then later "make the low sounds do something else"

### ✅ Consistent Language

Use the same terms throughout: bass, mid, treble, energy, beat

---

## 🎯 Advanced Techniques

Once you're comfortable, try these:

### Request 1: Shader Effects

```
Claude, create a plugin using GLSL shaders:

Visual: Rippling wave distortion effect that warps the whole screen

Audio Response:
- Bass controls wave amplitude
- Mid controls wave frequency
- Treble controls distortion amount

Make it overlay on top of other visualizations.
```

### Request 2: Physics Simulation

```
Claude, create a plugin with physics:

Visual: Particles connected by springs, forming a cloth-like mesh

Audio Response:
- Bass creates downward force (gravity pulse)
- Beat drops send a shockwave through the mesh
- Mid frequencies add wind force

Include controls for:
- Grid size
- Spring stiffness
- Damping
- Wind strength
```

### Request 3: Multiple Layers

```
Claude, create a multi-layer plugin:

Layer 1 (background): Slow-moving gradient based on bass
Layer 2 (middle): Rotating shapes reacting to mid frequencies
Layer 3 (foreground): Fast particles responding to treble

Each layer should have independent opacity controls.
```

---

## 📚 Reference Quick Guide

### Audio Frequency Ranges

```
Bass (Low):    20-250 Hz    → Kick, bass guitar, low synths
Mid (Middle):  250-4000 Hz  → Vocals, most instruments
Treble (High): 4000-20k Hz  → Hi-hats, cymbals, high synths
```

### Common Visual Effects

```
Scale:      Make things bigger/smaller
Rotate:     Spin objects
Translate:  Move objects
Opacity:    Fade in/out
Color:      Shift hue/saturation
Blur:       Soft focus
Glow:       Additive blending
Trail:      Motion blur effect
Pulse:      Rhythmic size change
Burst:      Sudden expansion
```

### Performance Guidelines

```
Particle count:
- Low-end: 1,000-5,000
- Mid-range: 5,000-15,000
- High-end: 15,000+

Frame rate target: 60 FPS
```

---

## 🎉 Success Stories

### "I described rippling water and Claude made it real"

**User request:** "Particles that ripple outward like raindrops hitting water"

**Result:** Plugin with perfect circular wave propagation, interference patterns, and audio reactivity. User learned about wave simulation.

---

### "From idea to working plugin in 15 minutes"

**User request:** "Make the Storm plugin but with gravity and trails"

**Result:** Modified plugin delivered in one response, user understood how to modify existing plugins.

---

### "I don't code but I made a 3D visualizer"

**User request:** "3D spinning cube where each face shows different audio data"

**Result:** Full Three.js implementation with proper camera, materials, and audio mapping. User gained confidence to request more complex effects.

---

## 🤝 Let's Create Together

Remember:
- Start simple, iterate
- Be specific about what you want
- Don't worry about technical terms - describe it naturally
- Ask questions if you don't understand
- Experiment and have fun!

---

## 📋 Ultimate Plugin Request Template

Copy this and fill it out completely:

```
Claude, help me create a Freque plugin:

═══════════════════════════════════════
BASIC INFO
═══════════════════════════════════════
Plugin Name: [one-word-or-hyphenated]
Type: [2D Canvas / 3D Three.js / Shader-based]

═══════════════════════════════════════
VISUAL DESCRIPTION
═══════════════════════════════════════
Main Elements: [what do you see]

Movement Style: [how things move]

Color Scheme: [colors and how they change]

Layout: [where things appear on screen]

═══════════════════════════════════════
AUDIO REACTIVITY
═══════════════════════════════════════
Bass Response: [what bass frequencies affect]

Mid Response: [what mid frequencies affect]

Treble Response: [what high frequencies affect]

Beat Detection: [what happens on beat drops]

═══════════════════════════════════════
CONTROLS
═══════════════════════════════════════
Sliders:
- [name]: [min]-[max], default [value]
- [name]: [min]-[max], default [value]

Dropdowns:
- [name]: [option1, option2, option3...]

Checkboxes:
- [name]: [what it toggles]

Buttons:
- [name]: [what it does]

═══════════════════════════════════════
PRESETS (at least 2)
═══════════════════════════════════════
Preset 1: [name]
Purpose: [what music/mood]
Settings: [key settings]

Preset 2: [name]
Purpose: [what music/mood]
Settings: [key settings]

═══════════════════════════════════════
SPECIAL REQUESTS
═══════════════════════════════════════
[any specific techniques, references, or special features]

═══════════════════════════════════════
```

---

**Ready to create your plugin? Let's do this! 🚀**

Send me your request and I'll turn your vision into working code.
