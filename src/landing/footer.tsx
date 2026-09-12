import { type ReactNode, useId } from "react"
import { cn } from "@/lib/utils"
import { PrivacyChoices } from "@/shared/analytics/preferences"
import { brandHeadline } from "@/shared/brand/content"
import { wordmarkPaths } from "@/shared/brand/lettering"
import { BrandLink } from "@/shared/brand/link"
import { regionConfig } from "@/shared/region/config"
import { RegionFlag, StarRing } from "@/shared/region/flags"
import { PageLink, type PageLinkTarget, pageLinkClassName } from "./link"

const signInUrl = new URL("/sign-in", regionConfig.publicOrigin).toString()

/** Only pages that exist. Every column would be longer with pages that do
 *  not, and a footer that promises more than the site has is the first thing
 *  a careful visitor checks. The legal documents sit on the closing line
 *  instead, beside the privacy choices they describe. That line pads its
 *  links sideways and pulls itself back by the same amount, so the last one
 *  still ends on the container edge. */
const footerColumns: { links: PageLinkTarget[]; title: string }[] = [
  {
    title: "Product",
    links: [
      { label: "Overview", to: "/" },
      { label: "Pricing", to: "/pricing" },
      { label: "Trust", to: "/trust" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "GitHub", href: "https://github.com/vedin-labs-ab/jori" },
      { label: "Contact", href: "mailto:hello@usejori.com" },
      { label: "Sign in", href: signInUrl },
    ],
  },
]

const legalLinks: PageLinkTarget[] = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "DPA", href: "/dpa" },
]

/**
 * The page ends as a sheet resting on the footer: the strip at the top is the
 * page's own ground with its bottom corners rounded off, and everything under
 * it is the opposite theme. The strip is positioned so it paints over the
 * footer's ground, which starts behind it, and `inverted` is what flips the
 * mark, the flags, and every token in one place, whichever theme the page is
 * in.
 */
export function LandingFooter() {
  return (
    <footer>
      <div className="relative h-8 rounded-b-3xl bg-background" />
      <div className="inverted -mt-8 bg-background pt-8 text-foreground">
        <div className="mx-auto w-full max-w-6xl px-6 pt-16 md:pt-20">
          <div className="flex flex-col gap-12 md:flex-row md:justify-between md:gap-16">
            <div className="max-w-xs">
              <BrandLink />
              <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
                {brandHeadline}
              </p>
              <Assurances />
            </div>
            <nav
              aria-label="Footer"
              className="grid grid-cols-2 gap-x-12 gap-y-8 sm:gap-x-20"
            >
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <h2 className="font-medium text-sm">{column.title}</h2>
                  <ul className="mt-3 text-muted-foreground text-sm">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <PageLink link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div className="mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t pt-6 text-muted-foreground text-sm">
            <p className="py-1">© {new Date().getFullYear()} Vedin Labs AB</p>
            <ul className="-mx-2.5 flex flex-wrap items-center">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <PageLink className="px-2.5" link={link} />
                </li>
              ))}
              <li>
                <PrivacyChoices
                  className={cn(
                    pageLinkClassName,
                    "h-auto px-2.5 font-normal text-muted-foreground text-sm hover:no-underline"
                  )}
                />
              </li>
            </ul>
          </div>
        </div>
        <Wordmark />
      </div>
    </footer>
  )
}

/** The two facts the trust page opens on, worn as badges: where the data
 *  lives, and the regulation it is built for. Both link nowhere because the
 *  page that expands on them is one column over. */
function Assurances() {
  return (
    <dl className="mt-8 flex gap-8">
      <Assurance detail="Stored in your region" term="EU or US">
        <RegionFlag className="h-6 w-8" region="eu" />
        <RegionFlag className="h-6 w-8" region="us" />
      </Assurance>
      <Assurance detail="Built to comply" term="GDPR">
        <GdprBadge />
      </Assurance>
    </dl>
  )
}

function Assurance({
  children,
  detail,
  term,
}: {
  children: ReactNode
  detail: string
  term: string
}) {
  return (
    <div className="text-sm">
      <dt className="flex h-9 items-center gap-1.5">{children}</dt>
      <dd className="mt-2.5 font-medium leading-tight">
        {term}
        <span className="mt-0.5 block font-normal text-muted-foreground">
          {detail}
        </span>
      </dd>
    </div>
  )
}

/** The EU flag's ring of stars around the regulation's name, at the size of
 *  the flags beside it. */
function GdprBadge() {
  return (
    <svg
      aria-hidden="true"
      className="size-9 rounded-full ring-1 ring-foreground/10 ring-inset"
      viewBox="0 0 36 36"
    >
      <circle cx="18" cy="18" fill="#003399" r="18" />
      <StarRing cx={18} cy={18} radius={14.5} size={1.5} />
      <text
        className="fill-white font-semibold"
        dominantBaseline="central"
        fontSize="8"
        textAnchor="middle"
        x="18"
        y="18"
      >
        GDPR
      </text>
    </svg>
  )
}

/** The letters of the wordmark, cropped a little above the baseline so the
 *  page ends on the name without a second logo. Set in glyph coordinates
 *  rather than the mark's, which is why no transform applies. The fill is
 *  the ground with a little ink mixed in, so it is a shade off in either
 *  theme, and the stroke paints under it: the outline stays a hairline
 *  outside each letter, and the seams where the font's contours overlap
 *  never show. A faint grain, clipped to the letters, keeps the fill from
 *  reading as flat print. */
/** The letters run from x 2.93 to 82.38 and start at y -34.31. The crop
 *  leaves room outside them on the left, right, and top for the outer
 *  pixel of the stroke, which the viewport would otherwise clip. */
const wordmarkCrop = { x: 2.6, y: -34.7, width: 80.1, height: 29.3 }

function Wordmark() {
  const id = useId()
  const grain = `${id}grain`
  const letters = `${id}letters`
  const paths = wordmarkPaths.map((path) => (
    <path d={path} key={path} vectorEffect="non-scaling-stroke" />
  ))

  return (
    <div className="mx-auto mt-14 w-full max-w-6xl px-6 md:mt-20">
      <svg
        aria-hidden="true"
        className="block w-full fill-[color-mix(in_oklch,var(--background),var(--foreground)_7%)] stroke-foreground/30 [paint-order:stroke]"
        strokeWidth="2"
        viewBox={Object.values(wordmarkCrop).join(" ")}
      >
        <defs>
          {/* The frequency is in glyph units: a pixel or two at desktop
              width, finer on a phone. One octave, so it is grain and not
              cloud. */}
          <filter id={grain}>
            <feTurbulence
              baseFrequency="10"
              numOctaves="1"
              stitchTiles="stitch"
              type="fractalNoise"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <clipPath id={letters}>{paths}</clipPath>
        </defs>
        {paths}
        <rect
          {...wordmarkCrop}
          clipPath={`url(#${letters})`}
          filter={`url(#${grain})`}
          opacity="0.06"
          stroke="none"
        />
      </svg>
    </div>
  )
}
