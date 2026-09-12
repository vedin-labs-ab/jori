import { Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { PrivacyChoices } from "@/shared/analytics/preferences"
import { brandHeadline } from "@/shared/brand/content"
import { wordmarkPaths } from "@/shared/brand/lettering"
import { BrandLink } from "@/shared/brand/link"
import { regionConfig } from "@/shared/region/config"
import { RegionFlag, StarRing } from "@/shared/region/flags"

const signInUrl = new URL("/sign-in", regionConfig.publicOrigin).toString()

type FooterLink = { label: string } & ({ href: string } | { to: string })

/** Only pages that exist. Every column would be longer with pages that do
 *  not, and a footer that promises more than the site has is the first thing
 *  a careful visitor checks. */
const footerColumns: { links: FooterLink[]; title: string }[] = [
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
      { label: "Contact", href: "mailto:support@usejori.com" },
      { label: "Sign in", href: signInUrl },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "DPA", href: "/dpa" },
    ],
  },
]

/** Padded to a 24px target box: the links stand in a column, so the inline
 *  exception to WCAG 2.5.8 does not cover them. */
const footerLinkClassName =
  "inline-flex items-center py-1 transition-colors hover:text-foreground"

/**
 * The page ends as a sheet resting on the footer: the strip at
 * the top is the page's own ground with its bottom corners rounded off, and
 * everything under it is the console's dark theme. Scoping `dark` here is what
 * inverts the mark, the flags, and every token in one place, so the footer
 * never names a colour the rest of the site does not have.
 */
export function LandingFooter() {
  return (
    <footer className="bg-foreground">
      <div className="h-8 rounded-b-3xl bg-background" />
      <div className="dark text-foreground">
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
              className="grid grid-cols-3 gap-x-8 gap-y-8 sm:gap-x-16"
            >
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <h2 className="font-medium text-sm">{column.title}</h2>
                  <ul className="mt-3 text-muted-foreground text-sm">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <FooterLink link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div className="mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t pt-6 text-muted-foreground text-sm">
            <p>© {new Date().getFullYear()} Vedin Labs AB</p>
            <PrivacyChoices
              className={cn(
                footerLinkClassName,
                "h-auto px-0 font-normal text-muted-foreground text-sm hover:no-underline"
              )}
            />
          </div>
        </div>
        <Wordmark />
      </div>
    </footer>
  )
}

function FooterLink({ link }: { link: FooterLink }) {
  if ("to" in link) {
    return (
      <Link className={footerLinkClassName} to={link.to}>
        {link.label}
      </Link>
    )
  }

  const external = link.href.startsWith("https://")

  return (
    <a
      className={footerLinkClassName}
      href={link.href}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {link.label}
    </a>
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
        <RegionFlag className="-ml-2 h-6 w-8" region="us" />
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
      <dt className="flex h-9 items-center">{children}</dt>
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
      <StarRing cx={18} cy={18} radius={14.5} size={1} />
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

/** The letters of the wordmark, outlined and cut off below their x-height,
 *  so the page ends on the name without a second logo. Set in glyph
 *  coordinates rather than the mark's, which is why no transform applies. */
const wordmarkCrop = "2.9 -34.4 79.5 21.5"

function Wordmark() {
  return (
    <div className="mx-auto mt-14 w-full max-w-6xl px-6 md:mt-20">
      <svg
        aria-hidden="true"
        className="block w-full fill-none stroke-foreground/30"
        viewBox={wordmarkCrop}
      >
        {wordmarkPaths.map((path) => (
          <path d={path} key={path} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  )
}
