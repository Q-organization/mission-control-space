# Mission Control Space - Visual Design Guide

## Art Style: "Stylized Sci-Fi Cartoon"

A polished, playful game art style that balances detail with readability. Inspired by modern mobile games with a premium feel.

### Style Characteristics

| Aspect | Description |
|--------|-------------|
| **Rendering** | Clean vector/cartoon with soft shading and depth |
| **Detail Level** | Medium - enough detail to be interesting, not overwhelming |
| **Shapes** | Rounded, friendly, futuristic - domes, cylinders, smooth curves |
| **Lighting** | Soft glow effects, emissive accents, rim lighting |
| **Depth** | Layered elements with clear foreground/background separation |

### Color Palettes

**Shop Station (Upgrade Shop)**
- Primary: Blue `#5490ff`
- Accent: Cyan `#00d4ff`
- Glow: Soft cyan emissive highlights
- Use for: Tech, upgrades, purchases

**Factory Station (Planet Factory)**
- Primary: Orange `#ffa500`
- Accent: Gold `#ffd700`
- Glow: Warm golden emissive highlights
- Use for: Crafting, building, production

### Notion Task Type Planets

**Bug Planet**
- Primary: Red `#ff4444`
- Accent: Crimson/Orange `#ff6600`
- Theme: Cracked surface, glowing fissures, warning lights, damaged structures
- Use for: Bug tickets from Notion

**Enhancement Planet**
- Primary: Purple `#9944ff`
- Accent: Magenta/Pink `#ff44ff`
- Theme: Holographic displays, upgrade modules, glowing circuits, antenna arrays
- Use for: Enhancement/feature tickets from Notion

**Task Planet**
- Primary: Teal `#44ddaa`
- Accent: Green/Cyan `#00ffaa`
- Theme: Small outposts, communication towers, data nodes, work stations
- Use for: Generic task tickets from Notion

> **Note:** Priority (Critical, High, Medium, Low) controls size and pulsation effects, not skin.

### Planet Design Structure

```
┌─────────────────────────┐
│    STATION/BUILDING     │  ← Detailed structure on top
│   (domes, antennas,     │     Multiple elements, glowing windows
│    smokestacks, etc.)   │
├─────────────────────────┤
│                         │
│    PLANET SPHERE        │  ← Textured surface with craters/patches
│    (with surface        │     Slight 3D shading
│     details)            │
│                         │
├─────────────────────────┤
│    GLOWING RING         │  ← Horizontal ring with glow effect
└─────────────────────────┘
```

### Prompt Template for Fal AI (nano-banana)

```
A stylized cartoon planet with a futuristic [BUILDING_TYPE] station on top.
[COLOR] planet with surface details and craters, glowing [ACCENT_COLOR] ring around it.
The [BUILDING_TYPE] base has multiple rounded buildings, [SPECIFIC_ELEMENTS].
Clean vector game art style with nice depth and soft glow effects.
[COLOR] and [ACCENT_COLOR] color palette with glowing accents.
Dark space background with stars.
```

**Variables:**
- `[BUILDING_TYPE]`: shop, factory, lab, hangar, etc.
- `[COLOR]`: blue, orange, purple, green, etc.
- `[ACCENT_COLOR]`: cyan, gold, pink, lime, etc.
- `[SPECIFIC_ELEMENTS]`:
  - Shop: "domes, antennas, glowing windows and neon signs"
  - Factory: "smokestacks with soft emissions, gears, pipes, glowing furnaces"
  - Lab: "satellite dishes, glowing tubes, holographic displays"

### Example Prompts Used

**Shop Station:**
```
A stylized cartoon planet with a futuristic shop station on top. Blue planet with surface details and craters, glowing cyan ring around it. The shop base has multiple rounded buildings, domes, antennas, glowing windows and neon signs. Clean vector game art style with nice depth and soft glow effects. Cyan and blue color palette with glowing accents. Dark space background with stars.
```

**Factory Station:**
```
A stylized cartoon planet with a futuristic factory station on top. Orange planet with surface details and craters, glowing golden ring around it. The factory base has multiple rounded buildings, smokestacks with soft emissions, gears, pipes, glowing furnaces and industrial lights. Clean vector game art style with nice depth and soft glow effects. Orange and gold color palette with glowing accents. Dark space background with stars.
```

**Bug Planet (Notion):**
```
A stylized cartoon planet with a bug/virus theme. Red and dark crimson planet with cracked surface and glowing fissures, glowing red ring around it. The surface has crystalline shards, warning lights, and damaged structures. Clean vector game art style with nice depth and soft glow effects. Red and orange color palette with glowing accents. Dark space background with stars.
```

**Enhancement Planet (Notion):**
```
A stylized cartoon planet with an enhancement/upgrade theme. Purple and violet planet with glowing tech patterns on surface, glowing magenta ring around it. The surface has holographic displays, upgrade modules, glowing circuits and antenna arrays. Clean vector game art style with nice depth and soft glow effects. Purple and pink color palette with glowing accents. Dark space background with stars.
```

**Task Planet (Notion):**
```
A stylized cartoon planet with a task/work theme. Teal and green planet with surface details and craters, glowing cyan ring around it. The surface has small outposts, communication towers, data nodes and work stations. Clean vector game art style with nice depth and soft glow effects. Teal and green color palette with glowing accents. Dark space background with stars.
```

### Post-Processing

1. Generate image with Fal AI `nano-banana` model
2. Remove background with Fal AI `birefnet` model
3. Save as PNG with transparency

### References

Style reference image: `/dev/youreyes/ebf36629-a7ce-4c3c-a71e-04f1c9cc4bc1.png`

### Key Principles

1. **Readability**: Must be instantly recognizable at small sizes (50-110px radius)
2. **Playfulness**: Friendly, inviting, not intimidating
3. **Polish**: Glow effects and details give premium feel
4. **Consistency**: All station planets should feel like they belong together
5. **Function clarity**: The building on top should clearly communicate the station's purpose
