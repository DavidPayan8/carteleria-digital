---
name: SignageFlow Precision System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  container-max: 1440px
  sidebar-width: 260px
  gutter: 16px
---

## Brand & Style
The design system is engineered for high-utility enterprise environments where clarity and operational speed are paramount. The brand personality is authoritative yet invisible, prioritizing the user's content and device statuses over decorative elements. 

The aesthetic follows a **Modern Corporate** direction, blending the structural rigor of a developer tool like Linear with the refined accessibility of the Shopify Admin. The UI utilizes high-contrast boundaries, a restricted color palette, and expansive whitespace to reduce cognitive load during long sessions of fleet management. Key characteristics include razor-sharp alignment, functional density, and a complete absence of trendy visual effects like glassmorphism or deep shadows.

## Colors
The palette is rooted in a "Deep Slate and Paper" philosophy. The primary surface is pure white (#ffffff), supported by a subtle light gray (#f8fafc) for secondary containers and sidebar backgrounds to create clear structural separation.

### Core Tones
- **Primary (Slate 900):** Used for primary text, iconography, and high-emphasis buttons.
- **Indigo (Primary Accent):** Reserved for active navigation states, focus rings, and primary action highlights.
- **Borders (Slate 200):** A consistent 1px stroke used to define all interactive zones and data containers.

### Functional States
Status colors are non-negotiable and must be used with consistent semantic meaning:
- **Emerald:** Active signage, "Online" heartbeat.
- **Rose:** Critical alerts, "Offline" devices.
- **Amber:** Pending configuration, "Unpaired" hardware.
- **Indigo:** Background processes, "Updating" firmware.

## Typography
This design system utilizes **Inter** for all UI elements due to its exceptional legibility in dense data environments. The type scale is tight, favoring small jumps in scale to maintain information density.

- **Weight Usage:** Use `600` (SemiBold) for all headings and primary labels to provide contrast against the white background. Use `400` (Regular) for all body text and descriptions.
- **Monospacing:** Use JetBrains Mono for Device IDs, MAC addresses, and log entries to ensure character alignment and readability of technical strings.
- **Labels:** `label-sm` is intended for table headers and secondary category labels, always presented in uppercase with slight letter spacing to differentiate from interactive text.

## Layout & Spacing
The system follows a strict **4px grid** rhythm. Components and layouts should always use increments of 4px for padding and margins.

- **Grid Strategy:** A 12-column fluid grid is used for the main content area, while the Sidebar and Side Panels (Drawers) remain fixed-width.
- **Side Panels:** Global navigation resides in a 260px left sidebar. Detail views and "Quick Edits" utilize a 400px right-aligned slide-over panel.
- **Desktop (1440px+):** 32px outer margins, 24px gutters.
- **Tablet (768px-1024px):** 16px outer margins, 16px gutters. Sidebar collapses to an icon-only rail.
- **Mobile (<768px):** 16px outer margins. Content stacks vertically. Sidebars are hidden behind a burger menu.

## Elevation & Depth
Depth is signaled through **Tonal Layering** and **Micro-Outlines** rather than traditional shadows. This keeps the interface feeling "flat" and performant.

- **Level 0 (Base):** `#f8fafc` (The main canvas background).
- **Level 1 (Card/Surface):** White background with a 1px `#e2e8f0` border. Used for the primary content area and data tables.
- **Level 2 (Popovers/Modals):** White background with a subtle, ultra-thin 1px border (#cbd5e1) and a very tight 4px blur shadow at 5% opacity to provide minimal lift.
- **Active State:** Use a 2px Indigo (#6366f1) border or high-contrast slate background to denote selection. 
- **Z-Index:** Side panels sit above the main content with a vertical divider. Modals sit on a 40% opacity Slate-900 overlay.

## Shapes
The shape language is "Soft-Square." This creates a professional, structural feel while avoiding the clinical harshness of perfectly sharp corners.

- **Standard Elements:** Buttons, Input Fields, and Cards use `rounded-md` (4px / 0.25rem).
- **Large Containers:** Modals and Side Panels use `rounded-lg` (8px / 0.5rem) on internal corners if applicable.
- **Status Indicators:** Small status pips (dots) are always circular (999px), while Status Tags (Badges) use `rounded-md` with a subtle background tint.

## Components
- **Buttons:** 
  - *Primary:* Solid Slate-900 with white text. No gradient.
  - *Secondary:* White background, Slate-200 border, Slate-900 text.
  - *Ghost:* No background or border. Indigo text for actions, Slate-500 for neutral.
- **DataGrids:** Rows must have a fixed height of 48px. Use 1px horizontal dividers only. Header cells use `label-sm` typography. 
- **Input Fields:** 1px Slate-200 border, 8px padding. On focus, the border changes to Indigo-500 with a 2px Indigo-100 outer glow.
- **Status Badges:** Use a light tint of the state color for the background (e.g., 10% opacity) and a high-contrast version of the same color for the text. Include a 6px circular pip to the left of the text.
- **Side Panels:** Enter from the right. Header includes a Breadcrumb (`label-sm`) and a Close button. Footer contains primary/secondary actions aligned to the right.
- **Iconography:** Use 1.5pt stroke icons (Lucide/Feather style). Icons should be 20px in size within a 24px bounding box.