Nice — this is a strong direction already. What you’re asking for now is basically a **handoff-ready product design spec** that a UI/UX researcher or product designer could turn into Figma components and usability validation work.

I’ll write this like a **real design system brief**, not just UI ideas.

---

# News Workspace UI — Design Specification (v1)

## Product Intent

The interface is a **news-intelligence workspace**, not a news reader.

Primary goals:

* Reduce cognitive load when tracking evolving topics
* Make relationships between stories visible
* Allow users to “hold onto” information via pinning
* Preserve reading flow while enabling exploration

The interface should feel like:

> A calm research workspace with living information.

Not:

* a dashboard
* a terminal
* a social feed
* a sci-fi graph visualization

---

# Visual Direction

## Tone

We’re moving from **dark glassmorphism** toward:

**“Light research workspace”**

Design references:

* Linear
* Notion
* Apple Freeform
* Arc browser
* Figma canvas
* Bloomberg Terminal (information density, not styling)

---

## Color System

### Background

Primary background should be **light and matte**.

Recommended base:

```
Canvas: #F6F7F9
Surface: #FFFFFF
Divider: #E6E8EB
```

Avoid:

* gradients
* heavy shadows
* dark themes (initially)

---

### Accent Color

Single accent color for interaction signals.

Example:

```
Accent: #4F7DF3
Accent-soft: #EAF0FF
```

Used for:

* selection
* hover states
* connection indicators
* active filters
* focus rings

---

### Semantic colors

Keep restrained:

```
Positive: #2E9B5F
Warning: #C98A2E
Negative: #C04A4A
Neutral-tag: #F0F2F5
```

No neon colors.

---

# Glassmorphism Guidance

We keep the **feeling of layering**, but remove heavy blur.

Replace glass with:

* soft elevation
* thin borders
* subtle translucency only when overlapping

Surface styling:

```
background: rgba(255,255,255,0.85)
border: 1px solid #E6E8EB
backdrop-blur: minimal (optional)
shadow: 0 2px 6px rgba(0,0,0,0.05)
```

Pinned board can retain **slightly more translucency** than flow.

---

# Layout Grid

Use a **3-zone workspace layout**.

```
TopBar: fixed
Body: CSS grid (3 columns)
```

Recommended grid:

```
| Lens | Flow | Pins |
| 260  | auto | 320  |
```

Responsive behavior:

* Lens collapses first
* Pins collapse second
* Flow always remains

---

# Top Bar Spec

Height: **64px**

Contains:

* Workspace title or logo (left)
* Search / command input (center)
* View toggles (right)
* User controls (far right)

Search should feel like:

* Spotlight / command palette hybrid
* Primary entry point

Search width:

```
min: 420px
max: 720px
```

---

# News Flow Column

This is the **primary surface**.

Width target:

```
720–880px
```

Scrolling behavior:

* Smooth
* No card snapping
* Maintain scroll position on expansion

---

# Story Strip Component

This is the core UI primitive.

## States

1. Collapsed
2. Peek
3. Inspect

---

## Collapsed Strip

Height: ~64–72px

Contains:

* headline
* source + timestamp
* entity chips
* pin icon
* expand icon

Layout:

```
| signal bar | content | actions |
```

Signal bar:

* 4px vertical indicator
* shows cluster/topic color

---

## Peek State

Expands inline.

Adds:

* summary text
* “why surfaced” explanation
* related topic preview

Padding:

```
16–20px internal
```

Animation:

```
height + opacity
150–200ms
```

No physics or bounce.

---

## Inspect State

Still inline.
Avoid modal takeover.

Adds:

* entities
* related stories
* timeline position
* source credibility
* cluster context

Max height:
~420px before scroll inside strip.

---

# Connector Band

Appears between related strips.

Purpose:
Show relationships without graph mode.

Height:

```
28–36px
```

Contains:

* “Shared topics”
* entity chips
* relationship type label

Style:

* subtle dotted line
* low contrast
* fades when scrolling

---

# Pinned Board (Thumb-tack lane)

Width:

```
320px
```

This column should feel like:

> a workspace surface, not a sidebar

---

## Board Surface

Background slightly warmer than canvas:

```
#FBFBFC
```

Optional:
very subtle noise texture.

---

## Pinned Item Card

Smaller than story strip.

Height:

```
56–64px
```

Top-left:
📌 tack icon

Style:

* soft elevation
* tighter padding
* denser text

---

## Pin Interaction

When pinning:

* card slides right
* slight scale-down
* fade into board

Duration:

```
220ms
```

---

## Pin Groups

Pinned board supports grouping.

Group header:

* label
* collapse toggle
* item count

Spacing:

```
16px between groups
```

---

# Typography

System font stack recommended.

```
Inter / SF Pro / Segoe UI
```

Sizes:

```
Headline: 16–17px
Body: 14px
Meta: 12px
Chips: 11–12px
```

Line-height:

```
1.35–1.45
```

Avoid oversized typography.

This is a **research interface**, not editorial design.

---

# Motion Principles

Motion must:

* reinforce spatial continuity
* never feel decorative
* preserve scroll context

Rules:

* <250ms transitions
* no spring physics
* no parallax
* no floating animations

---

# Interaction Model

Keyboard support is important.

Suggested shortcuts:

```
/ → focus search
j/k → move between stories
enter → expand
p → pin
esc → collapse
```

---

# Accessibility Targets

Minimum:

* WCAG AA contrast
* visible focus states
* keyboard navigation for flow
* readable at 110% zoom

---

# Design Philosophy Summary

The product should feel:

* calm
* intelligent
* spatially coherent
* lightly layered
* research-oriented
* readable for long sessions

The UI should never feel:

* glossy
* futuristic
* animated for show
* dashboard-heavy
* graph-toy-like

---

If you want, next step we can:

* Convert this into a **Figma component inventory**
* Build a **token system (spacing, radius, elevation, color tokens)**
* Or create a **React/Vite layout scaffold** that implements the structure.
