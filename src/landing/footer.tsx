import { Link } from "@tanstack/react-router"
import { PrivacyChoices } from "@/shared/analytics/preferences"
import { brandHeadline } from "@/shared/brand/content"
import { BrandLink } from "@/shared/brand/link"

const footerLinks = [
  { label: "Trust", to: "/trust" },
  { label: "Pricing", to: "/pricing" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
] as const

/** Padded to a 24px target box, then pulled back by the same amount so the
 *  row still starts on the container edge. */
const footerLinkClassName =
  "inline-flex items-center px-2.5 py-1 transition-colors hover:text-foreground"

export function LandingFooter() {
  return (
    <footer>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <BrandLink />
          <p className="text-muted-foreground text-sm">{brandHeadline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <nav
            aria-label="Footer"
            className="-mx-2.5 flex flex-wrap items-center gap-y-1 text-muted-foreground text-sm"
          >
            {footerLinks.map((link) => (
              <Link className={footerLinkClassName} key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
            <PrivacyChoices className={footerLinkClassName} />
          </nav>
        </div>
      </div>
    </footer>
  )
}
