import { Link, useLocation } from "@tanstack/react-router"
import { type MouseEvent } from "react"
import { cn } from "@/lib/utils"

export type PageLinkTarget = { label: string } & (
  | { href: string }
  | { to: string }
)

/** Padded to a 24px target box: navigation links stand on their own, so the
 *  inline exception to WCAG 2.5.8 does not cover them. */
export const pageLinkClassName =
  "inline-flex items-center py-1 transition-colors hover:text-foreground"

/** One navigation link for the header and the footer. Router links keep the
 *  site client-side; anything else is a plain anchor, opened in a new tab
 *  when it leaves the site. A link to the page the reader is already on
 *  would do nothing, so it takes them to the top instead, the way the logo
 *  does: the router has no navigation to perform, and the page scrolls
 *  itself, with motion only where the reader allows it. */
export function PageLink({
  className,
  link,
}: {
  className?: string
  link: PageLinkTarget
}) {
  const pathname = useLocation({ select: (location) => location.pathname })

  if ("to" in link) {
    return (
      <Link
        className={cn(pageLinkClassName, className)}
        onClick={link.to === pathname ? scrollToTop : undefined}
        to={link.to}
      >
        {link.label}
      </Link>
    )
  }

  const external = link.href.startsWith("https://")

  return (
    <a
      className={cn(pageLinkClassName, className)}
      href={link.href}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {link.label}
    </a>
  )
}

function scrollToTop(event: MouseEvent) {
  event.preventDefault()
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  })
}
