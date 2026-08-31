import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import { lazy, type ReactNode, Suspense } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BrandLink } from "@/shared/brand/link"
import { usePublicSession } from "@/shared/session/public"
import { GetStarted, SessionButton } from "./cta"

const LandingAccount = lazy(() =>
  import("./account").then((module) => ({ default: module.LandingAccount }))
)

const navLinks = [
  { label: "Trust", to: "/trust" },
  { label: "Pricing", to: "/pricing" },
] as const

/** One row at every width. The header used to wrap into two lines on a phone,
 *  which put the brand and the call to action on separate rows and read as a
 *  layout that had run out of room rather than one that had been designed. */
export function LandingHeader({ onWaitlistPage }: { onWaitlistPage: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-5">
      <div className="flex items-center gap-1 sm:gap-5">
        <BrandLink />
        <nav
          aria-label="Main"
          className="hidden items-center text-muted-foreground text-sm sm:flex"
        >
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <MobileNav />
      </div>
      <HeaderActions onWaitlistPage={onWaitlistPage} />
    </header>
  )
}

/** Padded to a 24px target box: nav links are their own targets, not words in
 *  a sentence, so the inline exception to WCAG 2.5.8 does not cover them. */
function NavLink({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Link
      className="inline-flex items-center px-2.5 py-1 transition-colors hover:text-foreground"
      to={to}
    >
      {children}
    </Link>
  )
}

/**
 * Two links do not earn a menu on their own, and hiding what already fits is
 * worse than showing it. What earns this one is that the row cannot hold them
 * beside a call to action at 375px, and the call to action is what a first
 * visit is for.
 *
 * It sits with the brand rather than opposite it, so the left of the header is
 * everywhere you can go and the right is the one thing to do. Sign in joins
 * the links for the same reason: it is navigation, and it keeps the action
 * group one decision wide.
 */
function MobileNav() {
  const session = usePublicSession()
  const isSignedIn = session.data !== null && session.data !== undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* The glyph stays 28px, which is the size the header row is built
            around, but this is the only way to reach anything on a phone and
            28px is a thumb's worth short. The pseudo-element takes the hit box
            out to 44 without taking any layout, the same trick the field hints
            use. */}
        <Button
          className='relative after:absolute after:-inset-2 after:content-[""] sm:hidden'
          size="icon"
          variant="ghost"
        >
          <Menu />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {navLinks.map((link) => (
          <DropdownMenuItem asChild key={link.to}>
            <Link to={link.to}>{link.label}</Link>
          </DropdownMenuItem>
        ))}
        {isSignedIn ? null : (
          <DropdownMenuItem asChild>
            <Link to="/sign-in">Sign in</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function HeaderActions({ onWaitlistPage }: { onWaitlistPage: boolean }) {
  const session = usePublicSession()
  const isSignedIn = session.data !== null && session.data !== undefined

  return (
    <div className="flex items-center gap-2">
      {isSignedIn ? null : (
        <SessionButton
          className="hidden sm:inline-flex"
          pending={session.isPending}
          to="/sign-in"
          variant="ghost"
        >
          Sign in
        </SessionButton>
      )}
      <GetStarted onWaitlistPage={onWaitlistPage} />
      {isSignedIn ? (
        <Suspense fallback={<div aria-hidden="true" className="size-8" />}>
          <LandingAccount />
        </Suspense>
      ) : null}
    </div>
  )
}
