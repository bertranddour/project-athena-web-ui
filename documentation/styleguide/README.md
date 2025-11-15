# Wave Artisans UI

Wave Artisans UI is a neumorphic-inspired style guide built with Tailwind CSS 4.x. The project ships a single `index.html` demo plus a companion spec (`WAVE-ARTISANS-SPEC.md`) so engineers and coding assistants can implement the system consistently.

## Project structure

```
.
├── index.html              # Complete UI demo (copy-paste ready Tailwind markup)
├── WAVE-ARTISANS-SPEC.md   # Implementation guidance / tokens / component recipes
└── images/                 # Brand assets (logo + sample imagery)
```

## Getting started

1. Install nothing—open `index.html` in a browser. Tailwind 4.x loads from the CDN.
2. When integrating into an app, copy the CSS block from `index.html` (OKLCH variables, shadow utilities, spinner & skeleton keyframes) into your own stylesheet or Tailwind plugin.
3. Use `WAVE-ARTISANS-SPEC.md` as the authoritative reference for typography, spacing, color accents, elevations, and component patterns.

## Notes

- Dark mode is intentionally unsupported.
- All colors come from Tailwind’s zinc base and standard accent palettes (teal, rose, amber, etc.).
- Spinner and skeleton rely on custom keyframes; make sure to port them if you lift the components.
