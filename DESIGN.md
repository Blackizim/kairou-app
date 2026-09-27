# DESIGN.md — kairou Streaming Design System (Refined Cinema Edition)

> **Aesthetic Philosophy**: Understated, premium cinema craftsmanship. Inspired by Apple TV+, Linear, and high-end film festival archives. No artificial neon glows, no futuristic sci-fi bloom, and zero emojis — purely content-forward discovery, deep ink blacks, precision slate dividers, and an intentional, subtle light-blue interactive accent.

---

## 1. Brand Core & Identity

- **Brand Name**: `kairou`
- **Category**: High-Fidelity Cinema & Television Streaming Platform
- **Visual Tone**: Sophisticated, restrained, elegant, cinematic, razor-sharp
- **Core Principles**:
  1. **Content is the Hero**: The artwork, photography, and cinematography take center stage. UI chrome recedes into the background.
  2. **No AI-Slop Neon**: Avoid loud fluorescent dropshadows, cartoonish glows, and animated neon pulses. Every edge is crisp, physical, and deliberate.
  3. **Strict Iconography**: 100% SVG vector icons via `lucide-react`. Zero Unicode emojis in UI labels, toasts, or badges.
  4. **Direct Catalog Discovery**: Instant entry into live TMDB-powered catalogs without gatekeeping landing splash screens.

---

## 2. Color Palette & Semantic Tokens

| Token | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `kairou-void` | `#07090e` | Deep ink canvas background (OLED optimized) |
| `kairou-surface-1` | `#0d1117` | Secondary surfaces, navigation bar, footer |
| `kairou-surface-2` | `#131822` | Card backgrounds, elevated panels, modal body |
| `kairou-surface-3` | `#1a2230` | Hover states, active list items, toolbars |
| `kairou-border-subtle` | `rgba(255, 255, 255, 0.07)` | Standard card and container hairlines |
| `kairou-border-medium` | `rgba(255, 255, 255, 0.14)` | Focused inputs, modal outlines |
| `kairou-blue-light` | `#38bdf8` | Light blue interactive accent (Sky 400), icons, badges |
| `kairou-blue-primary`| `#0ea5e9` | Primary interactive buttons, active state fills |
| `kairou-blue-hover` | `#0284c7` | Pressed / hover state |
| `kairou-text-primary`| `#f8fafc` | Pure white for titles and primary headers |
| `kairou-text-secondary`| `#94a3b8` | Neutral slate for synopsis, metadata, and subtitles |
| `kairou-text-muted` | `#64748b` | Timestamps, secondary tags, inactive controls |

---

## 3. Typography & Spacing Scale

- **Typeface**: Plus Jakarta Sans / Inter / System Sans
- **Letter Spacing**:
  - Display Titles: `-0.03em`
  - Body & Synopsis: Normal (`0em`)
  - Badges & Microcopy: `+0.04em` (Uppercase, track-wide)
- **Hierarchy**:
  - Hero Title: `text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight`
  - Section Title: `text-lg sm:text-xl font-bold tracking-tight text-white`
  - Card Title: `text-xs sm:text-sm font-semibold text-white`
  - Metadata: `text-xs text-slate-400`

---

## 4. Component Standards

### 4.1 Top 10 Rail
- Sculpted, architectural numerals (1 to 10) in subtle matte gradient slate (`#334155` to `#1e293b`), positioned gracefully alongside vertical movie posters.
- No heavy neon glow or artificial laser outlines.

### 4.2 Media Cards
- Aspect ratios: `2:3` for standard movie posters, `16:9` for widescreen productions.
- Subdued hover lift (`scale-[1.03]`), fine border transition to `border-slate-600` or subtle `border-sky-500/40`.
- Quick action buttons (Play, Watchlist, Info) in clean frosted slate circles.

### 4.3 Cinema Video Player
- Borderless immersive overlay with auto-dimming controls.
- Integrated TMDB YouTube official trailer stream or HTML5 video fallback.
- Minimalist timeline slider, volume control, and clean resolution badges.

### 4.4 Iconography & Imagery
- All icons sourced exclusively from `lucide-react`.
- Official high-resolution images provided via TMDB CDN (`w500` and `original`).

---

## 5. Do's and Don'ts

### Do:
- Use subtle opacity tints (`bg-sky-500/15`, `border-white/[0.08]`) rather than saturated color blocks.
- Rely on rich photography and official movie backdrops to bring vibrant color to the page.
- Keep layout transitions snappy (150ms–250ms ease-out).

### Don't:
- Do NOT use emojis anywhere in the UI.
- Do NOT use heavy neon box-shadows or pulsing glows.
- Do NOT introduce landing pages, paywalls, or multi-step signups before showing the catalog.
