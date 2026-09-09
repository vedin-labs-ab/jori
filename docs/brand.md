# Jori brand assets

[Docs index](index.md)

Jori keeps the rounded square and low horizontal slit. The light version is
black with a solid white slit. The dark version is its exact inverse, white
with a solid black slit. Both have transparent corners. The lettering is
outlined Geist Medium, so exported logos do not depend on installed fonts.

## Choose an asset

Paths below are relative to `public/brand/`. `light` means artwork for a light
background; `dark` means artwork for a dark background.

| Placement | Files | Treatment |
| --- | --- | --- |
| Site and console | `src/shared/brand` components | Shared mark geometry; the enclosing `.dark` class selects the inverse. Public navigation uses a separate icon and live name. |
| Standalone symbol | `mark/mark-{light,dark}.svg` | Tight transparent canvas. PNGs at 512 and 1024px are available. |
| Complete logo | `wordmark/wordmark-{light,dark}.svg` | Fixed lettering and icon gap. PNGs are 256px high. |
| Provider avatar, profile image, organization logo | `avatar/avatar-light-512.png` | Opaque, padded square. The complete mark survives a circular crop. Use this light asset for all four integration providers. |
| Browser tab and search | `favicon/favicon.svg`, PNGs at 16/32/48/96px, ICO | Tight transparent corners. SVG follows the browser's color preference; raster fallbacks use the light version. |
| Regular installed icon | `favicon/android-chrome-{192,512}.png` | Tight transparent rounded square, manifest purpose `any`. |
| Masked installed icon | `favicon/maskable-512.png` | Opaque black square with white slit. The platform supplies the outside silhouette. |
| Apple home screen | `favicon/apple-touch-icon.png` | Opaque 180px square. The platform supplies the outside silhouette. |
| Automatic link preview | `social/og-light.png` | Opaque 1200 × 630 image, selected in Open Graph and X metadata. |
| Manual marketing | `social/og-dark.png`, `social/social-{light,dark}.png` | Alternate landscape image and dedicated 1080 × 1080 compositions. |

The PNG and SVG mark files have no invisible rectangular margin. Do not add
a white background to them. Opaque avatar, launcher, and social files are
separate exports because their destinations crop, mask, or composite images.
Installed icons do not automatically change with browser or page theme.

The dark avatar export is available for other placements. Provider app profiles
and bots use the same light avatar in both regions; see
[integration branding](integrations.md#current-choices) for names and descriptions.

## Size and clear space

Use the complete logo when introducing Jori, and the symbol in tabs, avatars,
inline mentions, and compact controls. The minimum standalone symbol size is
16px. Use the exported complete logo at 24px high or larger.

Public navigation uses `BrandLink`: a 32px symbol, an 8px gap, and live Geist
Medium text at 16px. Keep the icon and name separate and upright. These are
the established proportions in the marketing header and footer, also shared
by the sign-in and public console shells.

Marketing prose uses the `Jori` component in `src/landing/section.tsx`:
a 0.95em symbol beside the live semibold name, sized to the surrounding text.
Its four paired tilts are intentional: left (-9°/+3°), right (+8°/-3°),
slight (-6°/+2°), and steep (+11°/-4°), listed as symbol/name. Preserve the
chosen tilt at each occurrence. This opposing lean is part of the marketing
identity, alongside the updated mark artwork.

The gap from icon to lettering is one-quarter of the icon width. Leave at
least the same amount around a standalone logo in page layout: 8px around a
32px symbol. This clear space belongs to the container, not the source SVG.
Navigation alignment follows the visible left edge. Compact inline mentions
and browser icons are intentional exceptions to the clear-space rule.

Do not stretch, change the slit, apply opacity, or add shadows, borders, or
CSS filters to the logo. Keep exported wordmarks and social artwork at their
fixed proportions and upright. The separate live name in public navigation
and the paired rotations in marketing prose are deliberate UI treatments;
do not replace them with the complete SVG wordmark. On a photograph or a
busy background, place the correct version on a quiet solid background.

## Update the set

Run from a task worktree:

```sh
pnpm brand
pnpm exec playwright install chromium
pnpm brand:social
pnpm test scripts/brand/assets.test.ts src/routes/-branding.test.tsx
```

`pnpm brand` renders the checked-in geometry and outlined lettering with
Sharp. `pnpm brand:social` starts an isolated local Vite server and captures
the actual landing demo components with Playwright. It needs no backend or
environment files. Chromium only needs installing once per Playwright version.
Commit regenerated images with source changes, then follow the normal landing
checks. Inspect the four social images after changes to the hero or console.

The hero and social cards share their headline in
`src/shared/brand/content.ts`. Both use the same console and conversation
components. Changing the live layout still requires recapturing the PNGs.

Lettering is generated from the installed Geist font at weight 500 by
`scripts/brand/lettering.py`. Only if the lettering changes, run that script
with Python, FontTools, and Brotli installed, then rebuild all exports. Geist
uses the SIL Open Font License; its notice is in the installed font package.

The public asset directory replaces the obsolete black/white mark exports
and previous `og.jpg`. Update provider dashboards with the avatar PNG where
they require an upload. Local asset generation does not change provider
registrations, deployed files, or images cached by social platforms.

## Platform decisions

Google recommends a favicon larger than 48px; the stable 96px PNG satisfies
that recommendation. The 512px organization image exceeds its 112px minimum
and is legible on white. [Search favicons](https://developers.google.com/search/docs/appearance/favicon-in-search),
[organization logos](https://developers.google.com/search/docs/appearance/structured-data/organization).

The maskable icon is separate from the regular icon. Its slit fits inside the
central safe circle, whose radius is 40% of the image width. Apple receives
an opaque square, without a second baked-in rounded mask.
[Maskable icons](https://web.dev/articles/maskable-icon),
[Apple touch icons](https://developer.chrome.com/docs/lighthouse/pwa/apple-touch-icon).

Open Graph has no viewer-theme selector. Light and dark images are manual
alternatives, not two entries that a social platform will switch between.
Metadata selects one opaque image and describes its actual content.
[Open Graph](https://ogp.me/).

SVG favicon theme support varies by browser. Browsers that ignore its media
query receive the conventional black mark with white slit. Safari has a
tracked issue with media queries inside SVG favicons.
[HTML icons](https://html.spec.whatwg.org/multipage/links.html#rel-icon),
[WebKit issue](https://bugs.webkit.org/show_bug.cgi?id=309949).
