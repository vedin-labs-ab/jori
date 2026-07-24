import { Link } from "@tanstack/react-router"
import { BrandLink } from "@/shared/brand/link"
import { RegionPicker } from "@/shared/region/picker"

const footerLinks = [
  { label: "Trust", to: "/trust" },
  { label: "Pricing", to: "/pricing" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
] as const

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <BrandLink />
          <p className="text-muted-foreground text-sm">
            An AI teammate for the work your team repeats.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground text-sm"
          >
            {footerLinks.map((link) => (
              <Link
                className="transition-colors hover:text-foreground"
                key={link.to}
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
            <a
              className="transition-colors hover:text-foreground"
              href="mailto:hello@milo.app"
            >
              hello@milo.app
            </a>
          </nav>
          <RegionPicker />
        </div>
      </div>
    </footer>
  )
}
