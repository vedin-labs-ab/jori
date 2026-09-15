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
- Icon sizes follow their role: `size-4` (16px) for sidebar navigation and
  resource rows; `size-3.5` (14px) for standard buttons, inputs, menus, and
  disclosure controls; `size-3` (12px) for compact controls and inline
  metadata. Let shared controls size their icons, including loading states,
  instead of repeating a size at each call site. Sidebar defaults must allow
  smaller supporting icons. A chevron naturally draws less ink than a search
  icon in the same box; do not enlarge it to compensate.
- Larger icon tiles and previews use 20px or 24px; illustrations, brand marks,
  and avatars have their own scale. Tiny badge indicators may use 10px.
  Icon dimensions and button hit areas are separate: never shrink a hit area
  just to make its icon smaller.
- People, organizations, and Jori share one avatar shape, `rounded-avatar`,
  the brand mark's corner at any size.
- Desktop-first, responsive, no gradients. Check both schemes at phone,
  tablet, and desktop widths.
- Console views in `src/shared/console` take props and emit callbacks.
  `src/console` binds them to Convex and `src/landing/demo` to fixtures, so
  the landing shows the real console rather than a lookalike.
