import { Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { UserButton } from "@/components/auth/user/user-button"
import { Button } from "@/components/ui/button"
import { BrandLink } from "@/shared/brand/link"

/**
 * The console before there is a console: signed out, signed in without an
 * organization, or held at the launch gate.
 *
 * Each of those is one decision on an otherwise empty page, so the block is
 * centered rather than pinned to the top-left of a wide frame, and the page
 * margin matches sign-in and the not-found view. Its contents stay
 * left-aligned, because centered labels and inputs read as a poster.
 */
export function PublicConsoleFrame({
  children,
  isSignedIn,
}: {
  children: ReactNode
  isSignedIn: boolean
}) {
  return (
    <main className="flex min-h-svh flex-col px-6 py-7 sm:px-10 sm:py-9">
      <PublicConsoleHeader isSignedIn={isSignedIn} />
      <div className="flex flex-1 items-center justify-center pb-16">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </main>
  )
}

function PublicConsoleHeader({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <BrandLink />
      <div className="ml-auto flex items-center gap-2">
        {!isSignedIn ? (
          <Button asChild size="sm">
            <Link to="/sign-in">Sign in</Link>
          </Button>
        ) : null}
        {isSignedIn ? <UserButton hideSettings size="icon" /> : null}
      </div>
    </header>
  )
}
