import { Link } from "@tanstack/react-router"
import { UserButton } from "@/components/auth/user/user-button"
import { BrandLink } from "@/shared/brand/link"
import { useSession } from "@/shared/session/auth"
import { GetStarted, SessionButton } from "./cta"

export function LandingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
      <div className="flex items-center gap-7">
        <BrandLink />
        <nav
          aria-label="Main"
          className="flex items-center gap-5 text-muted-foreground text-sm"
        >
          <Link className="transition-colors hover:text-foreground" to="/trust">
            Trust
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            to="/pricing"
          >
            Pricing
          </Link>
        </nav>
      </div>
      <HeaderActions />
    </header>
  )
}

function HeaderActions() {
  const session = useSession()
  const isSignedIn = session.data !== null && session.data !== undefined

  return (
    <div className="flex items-center gap-2">
      {!isSignedIn ? (
        <SessionButton
          pending={session.isPending}
          to="/auth/sign-in"
          variant="ghost"
        >
          Sign in
        </SessionButton>
      ) : null}
      <GetStarted />
      {isSignedIn ? <UserButton size="icon" /> : null}
    </div>
  )
}
