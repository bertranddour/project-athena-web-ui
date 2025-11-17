# Wave Artisans UI — Implementation Spec

This document summarizes the decisions encoded in `index.html` so any coding assistant (Codex, Copilot, etc.) can wire the system into apps or websites without having to reverse-engineer the demo.

## 1. Foundations

| Token | Value | Notes |
| --- | --- | --- |
| Base surface | Tailwind `bg-zinc-200` | Never use dark mode. Pages sit on zinc-200 with generous breathing room. |
| Text color | `text-zinc-800` (body), `text-zinc-600` (secondary) | Maintains contrast within soft UI aesthetic. |
| Font | Nunito Sans (Google Fonts) | Load weights 400/600/700 and set as the root font family. |
| Container | `max-w-6xl mx-auto px-6 py-16 space-y-16` | Provides the vertical rhythm referenced in the style guide. |

### Brand assets & metadata

- Ship the Wave Artisans logomark from `images/wave-artisan-logo.svg` on every branded surface along with matching favicons: `favicon.svg` plus an `.ico` fallback for legacy browsers.
- Provide comprehensive platform icons and previews—include `apple-touch-icon.png` and Open Graph/Twitter image tags so surfaces render correctly when pinned or shared.
- Keep these assets in sync with the repository copies; if you re-export them, update both the SVG and raster variants.

### Typography scale

| Usage | Class recipe |
| --- | --- |
| Display | `text-4xl md:text-5xl font-semibold tracking-tight` |
| Section heading | `text-2xl font-semibold` |
| Body | `text-base leading-relaxed text-zinc-600` |
| Label | `text-xs uppercase tracking-[0.3em] text-zinc-500` |
| Quote | `border-l-4 border-zinc-300/80 pl-6 italic text-lg text-zinc-600` |

### Layout & spacing

- Use Tailwind’s default breakpoints. Switch to two-column grids at `md`.
- Spacing scale relies on multiples of `0.5rem` (4, 8, 16, 24, 32). Cards typically use `p-8` and are separated with `space-y-6`.
- Grids: `grid grid-cols-12 gap-2` for track visualizations, `lg:grid-cols-3` for layout spec cards.

## 2. Elevations & shadows

Custom utilities defined in `<style>` must be ported to any build pipeline:

| Utility class | Purpose | Shadow recipe |
| --- | --- | --- |
| `.shadow-wave-panel` | Large raised panels | `25px 25px 60px var(--zinc-400), -25px -25px 60px var(--zinc-50)` |
| `.shadow-wave-well` | Raised cards/buttons | `18px 18px 40px var(--zinc-400), -18px -18px 40px var(--zinc-50)` |
| `.shadow-wave-button` | Interactive buttons | `12px 12px 32px var(--zinc-400), -12px -12px 32px var(--zinc-50)` |
| `.shadow-wave-inset` | Recessed meters/scroll rails | `inset 20px 20px 40px var(--zinc-400), inset -20px -20px 40px var(--zinc-50)` |
| `.shadow-wave-knob` / `.shadow-wave-knob-core` | Circular knobs | Outer raised + inner inset versions. |
| `.shadow-wave-slider` | Range track | `inset 6px 6px 14px var(--zinc-300), inset -6px -6px 14px var(--zinc-50)` |
| `.shadow-wave-embossed` / `.input-embossed` | Embossed cards & inputs | Use inset twins as defined. |

> **Important:** These utilities reference CSS custom properties (OKLCH zinc palette). Include the `:root` block from the HTML file in any build.

## 3. Color accents

- Present neutral cards with left-aligned color blocks (`w-16`) for main accents (teal, rose, amber) and semantics (rose, orange, yellow, green, teal, fuchsia, zinc). Blocks sit on `bg-zinc-100`.
- All status indicators use minimal color dots (size `2.5`, `rounded-full`) instead of full-color backgrounds.

### Lists

- Bulleted copy: `list-disc pl-5 space-y-2 text-zinc-600` for standard unordered content.
- Numbered sequences: `list-decimal pl-6 space-y-2` and keep each block to five steps or fewer.
- Checklists: `space-y-3` stack with `flex items-center gap-3` rows and SoftUI chips (`size-5 rounded-full bg-zinc-200 shadow-wave-button`) that swap the glyph between `✓` (complete) and `○` (pending).

## 4. Components

### Buttons

- Icon-first tiles: `neo-btn flex flex-col gap-2.5 rounded-[1.5rem] bg-zinc-200 px-10 py-8 text-xs uppercase tracking-[0.35em] shadow-wave-button`.
- Single-line actions: `neo-btn rounded-full bg-zinc-200 px-12 py-4 text-xs uppercase tracking-[0.3em] shadow-wave-button`.
- Button group: wrap pills inside `rounded-full bg-zinc-200 border border-zinc-300/60 p-1 flex gap-2`.
- Enforce SoftUI neutrality by stripping all default browser borders via a global `button { border: none; }` rule; text-only actions should add `bg-transparent` so they remain flat until hovered.
- The "Wave Artisans Console" composition in `index.html` is a reference playground—feel free to reuse its individual knobs, sliders, and button stacks, but never ship the entire console block as a production component.

### Controls

- Slider: native `input[type=range]` with `.wave-slider`; thumb uses `background-color: var(--zinc-100)` and white border.
- Knob: `.shadow-wave-knob` container with `.shadow-wave-knob-core` pseudo element.
- Checkboxes: standard `<input type=checkbox>` with `rounded-lg border border-zinc-300/60 bg-zinc-200 shadow-wave-button accent-zinc-500`.
- Toggle: `input.wave-toggle` (68×34px, rounded-full) pairs inset rail shadows with a gradient thumb that translates roughly 30px to the right when checked so the state visibly slides from OFF → ON.

### Forms

- Text inputs/textarea: `.input-embossed` class (inset shadows) on `bg-zinc-200` with `px-4 py-3` and Nunito labels above.
- Selects: raised treatment using `.shadow-wave-button` plus a custom chevron; `appearance-none`.
- Disabled state: apply `opacity-60 cursor-not-allowed`.

### Badges & Alerts

- Badges: `inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-300/60` with colored dot spans (`size-2.5 bg-{color}-400`).
- Alerts: `rounded-[1.5rem] border border-zinc-300/60 px-5 py-3 flex items-center gap-3 text-sm text-zinc-600`, include color dot + action button.

### Utility Components

- Spinner (`.wave-spinner`) and skeleton (`.wave-skeleton`) rely on custom keyframes `wave-spin` (1.8s) and `wave-shimmer` (2.5s). Ensure these CSS blocks travel with the component.
- Toast (“Sonner” style): raised card `shadow-wave-panel px-6 py-4 flex gap-4`.
- Menu: `rounded-[1.5rem] bg-zinc-200 border border-zinc-300/60 divide-y`.
- Scroll area: `rounded-[1.5rem] shadow-wave-inset p-4 max-h-60 overflow-y-auto`.

### Imagery

- Unlabeled images: `figure` with `overflow-hidden` and either `border border-zinc-300/60` or `shadow-wave-well`; the `<img>` stretches to full width/height (no padding).
- Labeled images: remove top/horizontal padding, use `rounded-t-[1.5rem]` on the image and place label below with `px-6 pt-3`.

## 5. Tables & Data

- Table wrapper: `overflow-x-auto rounded-[1.5rem] bg-zinc-200 shadow-wave-panel`.
- Table cells: `px-8 py-4 text-sm text-zinc-600`, header uses uppercase tracking.
- Row dividers: `border-t border-zinc-300/60`.

## 6. Implementation Tips

1. **Bring the CSS block** from `wave-artisans-tailwind.html` into your global stylesheet (or convert to Tailwind plugin). Without the custom shadows and OKLCH variables the look will collapse.
2. **Use Tailwind utilities verbatim**. Copy the class strings from the demo; they encode spacing, radius, and typography decisions.
3. **Avoid dark mode**. The brand explicitly disallows it.
4. **Keep whitespace**. Section wrappers use `space-y-6`/`space-y-8`. Resist the urge to compress vertical margins.
5. **Testing**: components render best at `max-w-6xl`. For responsive previews, inspect breakpoints `sm`, `md`, `lg`, `xl`.

With these rules, a coding assistant can scaffold routes, components, or design systems that match the Wave Artisans UI without revisiting the HTML demo each time.
