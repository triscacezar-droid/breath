# Visualization Variants Design

**Date:** 2026-03-08

## Overview

Each of the three main slots (label, progress, center) can be swapped for alternative visualizations. Presets apply a full combination; per-slot overrides allow fine-tuning. Visibility sliders (Off / Info only / On) remain unchanged and control *whether* each slot is shown; variant choice controls *how* it is shown when visible.

---

## 1. Slot Roles and Variant Types

| Slot | Role | Variants |
|------|------|----------|
| **Label** | Phase label (what phase it is) | `words` · `icons` · `minimal` |
| **Progress** | Phase progress (elapsed time) | `dots` · `bar` · `arc` |
| **Center** | Breath rhythm (expand/contract) | `circle` · `ring` · `wave` |

**Variant descriptions:**
- **Label:** `words` = "Breathe In", "Hold", etc.; `icons` = ↑ — ↓; `minimal` = single letter or none
- **Progress:** `dots` = current L→R/R→L dots; `bar` = horizontal bar that fills; `arc` = circular arc around center
- **Center:** `circle` = current sphere; `ring` = hollow circle, same scale; `wave` = concentric ripples expand/contract

---

## 2. Presets and Overrides

| Preset | Label | Progress | Center |
|--------|-------|----------|--------|
| **Classic** | words | dots | circle |
| **Minimal** | icons | bar | ring |
| **Abstract** | minimal | arc | wave |

- Presets set all three slots at once.
- Per-slot overrides change one slot independently.
- No "locked to preset" mode; only the three variant IDs are stored.
- Presets are shortcuts that write those values.

---

## 3. UI Placement

**Location:** New "Visualization" section in the settings panel.

**Order:** Label → Progress → Center (matches vertical order on screen).

```
Visualization
  [Classic] [Minimal] [Abstract]
  Label:    [Words  ▼]
  Progress: [Dots   ▼]
  Center:   [Circle ▼]
```

**Integration:** Visibility sliders (Text, Dots, Sphere) stay as-is. Variant choice applies when the slot is visible.

---

## 4. Architecture, State, Persistence

**State:**
- `labelVariant: 'words' | 'icons' | 'minimal'`
- `progressVariant: 'dots' | 'bar' | 'arc'`
- `centerVariant: 'circle' | 'ring' | 'wave'`

**Components:**
- **Label slot:** `PhaseWords` | `PhaseIcons` | `PhaseMinimal` (props: `label`, `prevLabel`, `labelAnimating`)
- **Progress slot:** `PhaseDots` | `PhaseBar` | `PhaseArc` (props: `phase`, `secondsLeft`, `duration`, `timingMode`, `durations`, `breathMode`, `cycleCount`)
- **Center slot:** `CircleVisual` | `RingVisual` | `WaveVisual` (props: `scale`, `sphereAnulomLeft`, `phase`, etc.)

**Persistence:** Store in `localStorage` (e.g. `breath-visualization`), same pattern as color scheme and breath mode. Load on init; save on change.

**Anulom Vilom:** Center variants use same horizontal position logic (`sphereAnulomLeft`). Progress variants preserve L→R/R→L where applicable.

**Error handling:** Invalid stored variant ID → fall back to Classic preset for that slot.
