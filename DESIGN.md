---
name: TunnelScope
description: Passive IPsec VPN analysis. Read the tunnel without opening it.
colors:
  void: "#000000"
  lumin: "#ffffff"
typography:
  display:
    fontFamily: "Doto, JetBrains Mono, monospace"
    fontSize: "clamp(44px, 5.6vw, 80px)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "normal"
  headline:
    fontFamily: "Doto, JetBrains Mono, monospace"
    fontSize: "clamp(34px, 4vw, 56px)"
    fontWeight: 900
    lineHeight: 1
  numeral:
    fontFamily: "Doto, JetBrains Mono, monospace"
    fontSize: "clamp(84px, 10vw, 160px)"
    fontWeight: 900
    lineHeight: 0.85
  grade:
    fontFamily: "Doto, JetBrains Mono, monospace"
    fontSize: "88px"
    fontWeight: 900
    lineHeight: 0.8
  numeral-sm:
    fontFamily: "Doto, JetBrains Mono, monospace"
    fontSize: "56px"
    fontWeight: 900
    lineHeight: 1
  title:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  none: "0px"
spacing:
  gutter-mobile: "20px"
  gutter-desktop: "32px"
  section: "96px"
  container: "1280px"
components:
  button-primary:
    backgroundColor: "{colors.lumin}"
    textColor: "{colors.void}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.void}"
    textColor: "{colors.lumin}"
  button-secondary:
    backgroundColor: "{colors.void}"
    textColor: "{colors.lumin}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  button-secondary-pressed:
    backgroundColor: "{colors.lumin}"
    textColor: "{colors.void}"
  button-primary-inverted:
    backgroundColor: "{colors.void}"
    textColor: "{colors.lumin}"
    rounded: "{rounded.none}"
    height: "48px"
  panel:
    backgroundColor: "{colors.void}"
    textColor: "{colors.lumin}"
    rounded: "{rounded.none}"
  panel-inverted:
    backgroundColor: "{colors.lumin}"
    textColor: "{colors.void}"
    rounded: "{rounded.none}"
---

# Design System: TunnelScope

## Overview

**Creative North Star: "The Observer's Field"**

TunnelScope's public surface shows encrypted traffic the way a passive observer actually receives it: a field of hairlines whose only information is width, spacing and timing. The system is built from two values, black and white, and one move, inversion. When the product explains something, the field flips from ciphertext (white on black) to verdict (black on white). Everything else stays out of the way so a judge or analyst understands the offer in one screen.

The lineage is data-sublime installation work: dense barcode fields, sine traces and dot-matrix numerals, held to a strict monochrome. It is deliberately sparse on the landing page; density belongs to data, not to chrome. Scope: this system governs the public landing route (`/welcome`). The signed-in analysis app keeps its incumbent dashboard system, where IKE amber, ESP cyan and AH violet carry protocol meaning.

**Key Characteristics:**
- Two colours only, with hierarchy from size, weight and inversion.
- Solid dot-matrix display type over a monospaced reading face.
- Data drawn from real capture packets, never decorative noise.
- Square corners and 1px rules everywhere.
- One signature interaction: the panel inverts into the verdict.

## Colors

A strict two-value palette: the ground is void, the ink is light, and swapping them is the system's only accent.

### Primary
- **Lumin** (#ffffff): all text, rules, bars and primary buttons on the black ground; the full ground of inverted sections such as the verdict panel and the Proof section.

### Neutral
- **Void** (#000000): the page ground, the ink of inverted sections, and the text of primary buttons.

### Named Rules
**The Two-Value Rule.** Nothing on the landing page uses grey, alpha text, gradients or glow. Secondary information is made smaller or lighter in weight, never dimmer.

**The Inversion Rule.** Inversion is the only emphasis. A section, a panel or a pressed control becomes important by swapping void and lumin, and the swap is used once per region at most.

## Typography

**Display Font:** Doto 900 (with JetBrains Mono, monospace)
**Body Font:** JetBrains Mono (with ui-monospace, monospace)

**Character:** A solid dot-matrix face for anything read from across a room, paired with a sober monospace that keeps every number tabular and every sentence calm.

### Hierarchy
- **Display** (900, clamp(44px, 5.6vw, 80px), 0.95): the hero headline, uppercase, four lines at most on desktop.
- **Headline** (900, clamp(34px, 4vw, 56px), 1): section titles, uppercase.
- **Numeral** (900, clamp(84px, 10vw, 160px), 0.85): the before/after scores in the Proof section.
- **Grade** (900, 88px, 0.8): the grade letter in the verdict panel; 56px (numeral-sm) where a grade sits inside a step artifact.
- **Title** (600, 20px, 1.4): step titles and short labels with weight.
- **Body** (400, 17px, 1.6): sentence-case reading text, verdict rows and table cells; 42ch maximum in the hero and 34-40ch elsewhere.
- **Label** (500, 13px, 0.08em): navigation, panel headers, captions, method notes and button text, sentence case.

### Named Rules
**The Solid Dot Rule.** Doto is always set at weight 900 so it stays legible on a projector; the hollow 700 stipple is not used.

**The Sentence Case Rule.** Reading text and controls are sentence case. Uppercase belongs only to Doto display lines.

## Layout

A centred container of 1280px with 20px gutters on mobile and 32px from 768px. The hero is a two-column split from 1024px (offer left, evidence right) and fills the viewport below the 64px header; below 1024px it stacks offer first. Sections are separated by full-width 1px rules and 96px of vertical padding. Multi-step content sits in one ruled row of equal columns divided by 1px vertical rules, collapsing to stacked rows with horizontal rules on mobile. The page has exactly three content regions after the header: hero, how it works, proof.

## Elevation & Depth

The system is completely flat: no shadows, no blur, no layering. Depth is conveyed only by inversion, which reads as the foreground, and by 1px rules, which separate regions.

### Named Rules
**The Flat Field Rule.** If something needs to stand forward, invert it; never add a shadow.

## Shapes

Every corner is square (0px). Containers are outlined with a 1px lumin rule on void, or a 1px void rule on lumin. The recurring silhouette is the barcode: groups of full-height hairlines whose widths (1 to 4px) encode packet size and whose spacing encodes the time between packets. Small barcode groups cap both ends of every button.

## Components

### Buttons
Buttons are rectangular, carry barcode end-caps on both sides of the label, and invert on hover.
- **Shape:** square corners (0px), 48px tall, 20px horizontal padding.
- **Primary:** lumin fill with void text; on inverted sections, void fill with lumin text.
- **Secondary:** 1px lumin outline on void with lumin text.
- **Hover / Focus:** hover swaps fill and text; focus shows a 2px solid outline in the opposite value with a 2px offset.
- **Pressed (toggle):** a pressed toggle takes the primary fill and sets `aria-pressed`.

### Cards / Containers
- **Corner Style:** square (0px).
- **Background:** void, or lumin when inverted.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px rule in the opposite value; a 1px header rule separates the panel title row.
- **Internal Padding:** 16px for header rows, 24px for content.

### Navigation
A 64px header on void with a 1px lumin rule beneath. The monochrome shield mark and the TUNNELSCOPE wordmark sit on the left. Section links are plain 13px labels that invert on hover. Sign in sits on the right in a 1px outline, and its label becomes Open dashboard when the visitor is signed in. On mobile the section links hide and only the mark and Sign in remain.

### Barcode Field (signature)
A canvas drawn from a capture's real packet list: one full-height hairline per packet, its width set by packet length and the gap before it set by the time since the previous packet. A smoothed packets-per-second line runs across the field with a void knock-out around it. The field drifts slowly and holds still under reduced motion. Inverted, it renders as a 48px strip that keeps the same packets above the verdict. It always carries an accessible label that describes what the bars mean.

## Do's and Don'ts

### Do:
- **Do** use only #000000 and #ffffff on landing surfaces, and express emphasis by inversion.
- **Do** draw every barcode, histogram or trace from real scenario or capture data.
- **Do** label demonstration data as a built-in demo scenario wherever a visitor could mistake it for a live capture.
- **Do** keep one idea per screen: one sentence of body copy in the hero and three steps at most in any sequence.
- **Do** set Doto at weight 900 and keep reading text in sentence-case JetBrains Mono.

### Don't:
- **Don't** use grey or alpha text, gradients, glows, blur or shadows on landing surfaces.
- **Don't** add small labels or kickers above headlines; the headline stands alone.
- **Don't** fill the landing page with dashboard density (stat rows, readout columns, scrubbers, scenario lists); those belong in the signed-in app.
- **Don't** round corners.
- **Don't** claim results the data does not show; S06 and S01 are different scenarios, so never say the same tunnel was fixed.
