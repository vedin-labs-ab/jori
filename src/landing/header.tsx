import { Link } from "@tanstack/react-router"
import { lazy, type ReactNode, Suspense } from "react"
import { BrandLink } from "@/shared/brand/link"
import { usePublicSession } from "@/shared/session/public"
import { GetStarted, SessionButton } from "./cta"

const LandingAccount = lazy(() =>
  import("./account").then((module) => ({ default: module.LandingAccount }))
)

export function LandingHeader({ onWaitlistPage }: { onWaitlistPage: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5">
      <div className="flex items-center gap-5">
        <BrandLink />
        <nav
          aria-label="Main"
          className="flex items-center text-muted-foreground text-sm"
        >
          <NavLink to="/trust">Trust</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
        </nav>
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

function HeaderActions({ onWaitlistPage }: { onWaitlistPage: boolean }) {
  const session = usePublicSession()
  const isSignedIn = session.data !== null && session.data !== undefined

  return (
    <div className="flex items-center gap-2">
      {!isSignedIn ? (
        <SessionButton
          pending={session.isPending}
          to="/sign-in"
          variant="ghost"
        >
          Sign in
        </SessionButton>
      ) : null}
      <GetStarted onWaitlistPage={onWaitlistPage} />
      {isSignedIn ? (
        <Suspense fallback={<div aria-hidden="true" className="size-8" />}>
          <LandingAccount />
        </Suspense>
      ) : null}
    </div>
  )
}
