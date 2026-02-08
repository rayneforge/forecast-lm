Perfect — let’s turn the concept into something a **designer can immediately build in Figma** and a **frontend team can map to code tokens**.

I’ll split this into two parts:

1. Figma component inventory
2. Design token system

Think of this as the **foundation of a design system**, not just a single screen.

---

# Part 1 — Figma Component Inventory

This is organized the way a designer would structure pages in Figma.

Recommended Figma file structure:

```
01 Foundations
02 Primitives
03 Components
04 Patterns
05 Screens
```

---

# Foundations Page

## Color Styles

Create Figma color styles:

### Canvas

* Canvas / Default
* Canvas / Surface
* Canvas / Board
* Border / Subtle
* Border / Strong

### Accent

* Accent / Primary
* Accent / Soft
* Accent / Hover
* Accent / Active

### Text

* Text / Primary
* Text / Secondary
* Text / Muted
* Text / Inverse

### Semantic

* Status / Positive
* Status / Warning
* Status / Negative

---

## Typography Styles

Create text styles:

```
Display / WorkspaceTitle
Heading / StoryHeadline
Body / Default
Body / Meta
Label / Chip
Label / SectionHeader
```

---

## Effects

Create reusable effects:

```
Elevation / 1
Elevation / 2
Elevation / Floating
```

No blur effects by default.

---

# Primitives Page

These are atomic building blocks.

## Icons

* Pin
* Expand
* Search
* Filter
* Group
* Export
* Close
* Arrow

Use a consistent stroke size.

---

## Chip Component

Variants:

```
Entity
Topic
Filter
Neutral
Active
```

Auto-layout enabled.

---

## Divider

Variants:

```
Solid
Dotted
Faded
```

---

## Signal Bar

Small vertical indicator component.

Variants:

```
Neutral
Accent
ClusterColor
```

---

# Components Page

Now we define the UI system.

---

## TopBar Component

Structure:

```
TopBar
 ├ LogoArea
 ├ SearchInput
 ├ ViewToggleGroup
 └ UserControls
```

Variants:

```
Default
SearchFocused
LensOpen
```

---

## SearchInput Component

States:

```
Idle
Focused
Typing
CommandMode
```

Subcomponents:

* Input field
* Search icon
* Placeholder label

---

## StoryStrip Component (Core Component)

This is the most important component.

Variants:

```
Collapsed
Peek
Inspect
PinnedPreview
```

Subcomponents:

```
StoryStrip
 ├ SignalBar
 ├ Headline
 ├ MetaRow
 ├ EntityChips
 ├ Summary
 ├ WhySurfaced
 ├ RelatedPreview
 └ ActionIcons
```

Use auto-layout vertically.

---

## ConnectorBand Component

Variants:

```
SharedTopics
TimelineLink
SemanticNeighbor
```

Subcomponents:

* Label
* Chip list
* Connector line

---

## PinnedBoard Component

Structure:

```
PinnedBoard
 ├ Header
 ├ GroupList
 └ FooterActions
```

---

## PinnedItem Component

Variants:

```
Default
Hover
Dragging
Grouped
```

Subcomponents:

```
PinIcon
Headline
NotePreview
Meta
```

---

## PinGroup Component

Structure:

```
GroupHeader
ItemStack
```

Variants:

```
Expanded
Collapsed
```

---

## LensPanel Component

Variants:

```
Expanded
Collapsed
```

Subcomponents:

```
FilterSection
FilterOption
Slider
Toggle
```

---

# Patterns Page

These represent composed UI sections.

---

## News Flow Pattern

Stack:

```
StoryStrip
ConnectorBand
StoryStrip
StoryStrip
ConnectorBand
```

---

## Pin Board Pattern

Stack:

```
Group
Group
Ungrouped Items
```

---

## Workspace Layout Pattern

Three-column layout frame:

```
Lens | Flow | Pins
```

Make this a reusable frame.

---

# Screens Page

Create frames for:

* Default workspace
* Expanded story
* Search active
* Pin board populated
* Lens expanded

These become **UX testing screens**.

---

# Part 2 — Design Token System

These tokens should map directly to:

* CSS variables
* Tailwind config
* design system JSON
* component library theme

---

# Color Tokens

## Canvas

```
color.canvas.default = #F6F7F9
color.canvas.surface = #FFFFFF
color.canvas.board = #FBFBFC
```

---

## Borders

```
color.border.subtle = #E6E8EB
color.border.strong = #D6D9DD
```

---

## Text

```
color.text.primary = #1F2328
color.text.secondary = #59636E
color.text.muted = #8A939D
```

---

## Accent

```
color.accent.primary = #4F7DF3
color.accent.soft = #EAF0FF
color.accent.hover = #3E6BE0
```

---

## Semantic

```
color.success = #2E9B5F
color.warning = #C98A2E
color.error = #C04A4A
```

---

# Spacing Tokens

Use a **4px base grid**.

```
space.1 = 4
space.2 = 8
space.3 = 12
space.4 = 16
space.5 = 20
space.6 = 24
space.8 = 32
space.10 = 40
space.12 = 48
```

---

# Radius Tokens

```
radius.sm = 6
radius.md = 10
radius.lg = 14
radius.xl = 18
```

Story strips should use `radius.md`.

Pinned items use `radius.sm`.

---

# Elevation Tokens

Keep these minimal.

```
elevation.1 = 0 1px 2px rgba(0,0,0,0.04)
elevation.2 = 0 2px 6px rgba(0,0,0,0.06)
elevation.float = 0 6px 20px rgba(0,0,0,0.08)
```

---

# Layout Tokens

```
layout.topbar.height = 64
layout.lens.width = 260
layout.flow.maxWidth = 880
layout.pins.width = 320
```

---

# Motion Tokens

```
motion.fast = 120ms
motion.normal = 180ms
motion.slow = 240ms
```

Easing:

```
ease.standard = cubic-bezier(0.2, 0, 0, 1)
```

---

# Typography Tokens

```
font.size.meta = 12
font.size.body = 14
font.size.headline = 16
font.size.title = 20
```

Line heights:

```
line.tight = 1.3
line.normal = 1.45
```

