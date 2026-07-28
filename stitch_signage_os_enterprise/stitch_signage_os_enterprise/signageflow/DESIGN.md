---
name: SignageFlow
colors:
  surface: '#fcf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
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
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#fcf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
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
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  sidebar_width: 240px
  drawer_width: 480px
---

## Brand & Style
The design system is engineered for a high-performance Digital Signage CMS, prioritizing utility, clarity, and reliability. The aesthetic is rooted in **Corporate Minimalism**, drawing inspiration from industry-leading developer tools and fintech dashboards. The target audience consists of IT managers and marketing professionals who require a high-density, low-friction interface for managing global screen networks.

The emotional response should be one of absolute control and stability. By utilizing a "System-as-Infrastructure" approach, the UI recedes to highlight the user's content, using precision-aligned grids and a disciplined neutral palette. Every element serves a functional purpose, eschewing decorative trends in favor of long-term professional usability.

## Colors
The palette is centered on a "Slate and Navy" foundation to convey authority and technical precision.
- **Primary:** Deep Navy (#0F172A) is used for primary actions, sidebar backgrounds, and high-emphasis text.
- **Neutral:** A refined scale of Slate grays provides the structural framework, with #F8FAFC for the main application background to reduce eye strain.
- **Semantic:** 
    - **Emerald (Online):** Used for active players and successful deployments.
    - **Amber (Unpaired):** Used for pending hardware or configuration warnings.
    - **Rose (Offline):** High-visibility alerts for disconnected screens or failed broadcasts.
- **Accents:** Secondary actions utilize subtle gray ghost buttons to maintain a clear visual hierarchy.

## Typography
Inter is the workhorse of this design system, utilized for its exceptional legibility at small sizes and its neutral, modern character. 
- **Headings:** Feature tight negative letter-spacing (-0.01em to -0.02em) to create a compact, "premium tech" feel.
- **Data Display:** For hardware IDs, MAC addresses, and technical logs, **JetBrains Mono** is introduced to provide clear character differentiation (e.g., 0 vs O).
- **Hierarchy:** Use `body-sm` (13px) as the standard density for DataGrids and sidebars to maximize information density without sacrificing readability.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid model**. 
- **Navigation:** A fixed-width left sidebar (240px) provides persistent navigation.
- **Content:** The main stage is fluid but constrained by a maximum width of 1600px to maintain line-length readability on ultra-wide monitors.
- **Rhythm:** A 4px baseline grid ensures vertical alignment. Standard component spacing is set at 16px (`md`), while high-density data views use 8px (`sm`) padding for row heights.
- **Breakpoints:**
    - Mobile (<768px): Sidebar collapses into a bottom-sheet or hamburger menu.
    - Tablet (768px - 1024px): Sidebar collapses to an icon-only rail (64px).
    - Desktop (>1024px): Full layout with optional right-side drawers for screen configuration.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows.
- **Level 0 (Background):** Slate-50 (#F8FAFC) - the canvas.
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF) with a 1px border of Slate-200. This is the primary container for data.
- **Level 2 (Popovers/Modals):** Pure White with a very soft ambient shadow: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`.
- **Interactions:** Hover states on interactive rows should use a subtle background shift to Slate-50 rather than an elevation increase.

## Shapes
The shape language is "Soft-Square." A consistent 6px corner radius (defined as `roundedness: 1`/Soft) is applied to all buttons, input fields, and card containers. 
- **Small Elements:** Buttons and Inputs use 6px.
- **Large Elements:** Modals and Drawers use 8px.
- **Interactive States:** Focus rings should be offset by 2px and use a 2px width in the primary blue color to ensure accessibility without cluttering the shape.

## Components
- **Buttons:** Primary buttons are solid Slate-900 with white text. Secondary buttons are white with a Slate-200 border. Use 13px bold text for button labels to maintain a professional, compact look.
- **DataGrids:** The core of the CMS. Rows should have a minimum height of 40px (compact) or 52px (standard). Header cells should use `label-caps` typography with a subtle bottom border.
- **Status Chips:** Small, pill-shaped indicators. Use light tinted backgrounds with dark text (e.g., Light Emerald background with Dark Emerald text) for "Online" status.
- **Input Fields:** 1px borders using Slate-300. On focus, the border transitions to Primary Blue with a subtle 2pt outer glow.
- **Drawers (Sliding Panels):** Used for "Screen Details" or "Content Scheduling." These emerge from the right, covering 480px, and use a Level 2 elevation to sit above the main grid.
- **Density Toggle:** A button group allowing users to switch between "Comfortable" and "Compact" views, adjusting the spacing tokens globally from `md` to `sm`.