# Design

## Theme

Light-only today: `.dark` tokens exist in `src/styles.css` but nothing toggles the class (the sonner Toaster is pinned `theme="light"`). White surfaces, near-black ink, hairline neutral borders. No gradients, ever (hard rule in AGENTS.md). No glassmorphism, no decorative shadows.

## Color

Pure-neutral shadcn ramp plus one committed accent:

- `--background` oklch(1 0 0), `--foreground` oklch(0.145 0 0)
- `--muted` oklch(0.97 0 0), `--muted-foreground` oklch(0.556 0 0)
- `--border` / `--input` oklch(0.922 0 0)
- `--primary` muted sage green oklch(0.535 0.051 153.5): primary buttons, links, small highlights. Keep it scarce; it reads as the brand color because it is rare.
- Semantic: `--destructive` oklch(0.575 0.121 33.2), `--warning`, `--informational`.

## Typography

Geist Variable is the only family (weights 100–900 loaded, `--font-heading` = `--font-sans`). Product UI runs small and dense (buttons text-xs). Marketing surfaces scale up but stay in-family: contrast comes from size and weight (400 body, 500–600 display), tight tracking on display sizes.

## Components

shadcn/ui primitives in `src/components/ui` with default styling; never modify them, never recreate them by hand (install via `npx shadcn@latest add`). Signature trait: tactile buttons, a 2px hard edge (`--tactile-depth` + `--tactile-edge` color-mix) that the button physically presses into on :active. Radius base 0.625rem (`rounded-md` on controls, larger radii available via the scale).

## Layout

Tailwind v4 via className only; do not touch `src/styles.css` unless clearly necessary. Console pages run full-width; bounded max-width containers are reserved for marketing and document content. Desktop-optimized, fully responsive.

## Motion

tw-animate-css is available (`animate-in`, `fade-in`, `slide-in-from-*`). The product barely animates: transitions on buttons, a scale swap on copy confirmation. Marketing may add one orchestrated entrance and small hover physics: ease-out curves only, no bounce, no parallax, gate everything behind `motion-safe:`.
