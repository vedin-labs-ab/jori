import { Link } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BrandLink } from "@/shared/brand/link"
import { regionConfig } from "@/shared/region/config"
import { GetStarted } from "./cta"

const signInUrl = new URL("/sign-in", regionConfig.publicOrigin).toString()
const githubUrl = "https://github.com/vedin-labs-ab/jori"

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
          <a
            className="inline-flex items-center px-2.5 py-1 transition-colors hover:text-foreground"
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
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
 * These links do not earn a menu on their own, and hiding what already fits is
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
        <DropdownMenuItem asChild>
          <a href={githubUrl} rel="noreferrer" target="_blank">
            GitHub
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={signInUrl}>Sign in</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function HeaderActions({ onWaitlistPage }: { onWaitlistPage: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        className="hidden sm:inline-flex"
        size="lg"
        variant="ghost"
      >
        <a href={signInUrl}>Sign in</a>
      </Button>
      <GetStarted onWaitlistPage={onWaitlistPage} />
    </div>
  )
}
