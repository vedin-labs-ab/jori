# UI

[AGENTS.md](../AGENTS.md)

- shadcn/ui primitives, installed with `npx shadcn@latest add`, carry Jori's
  tactile styling (`--tactile-*`). When you reinstall or override one, diff
  it and carry that styling over so it looks the same after.
- Tailwind for static styling, inline styles for runtime values, and
  `src/styles.css` for theme tokens and global rules only.
- Colors come from theme tokens, never literals, so both schemes hold.
  `inverted` flips a surface to the opposite scheme. A mark loaded from a
  file goes through `LogoImage` in `src/shared/logo`, flagged `ink` when
  it is drawn in one dark ink, so it flips too.
- People, organizations, and Jori share one avatar shape, `rounded-avatar`,
  the brand mark's corner at any size.
- Desktop-first, responsive, no gradients. Check both schemes at phone,
  tablet, and desktop widths.
- Console views in `src/shared/console` take props and emit callbacks.
  `src/console` binds them to Convex and `src/landing/demo` to fixtures, so
  the landing shows the real console rather than a lookalike.
