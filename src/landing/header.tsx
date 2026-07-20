import { Link } from "@tanstack/react-router"
import { UserButton } from "@/components/auth/user/user-button"
import { Button } from "@/components/ui/button"
import { BrandLink } from "@/shared/brand/link"
import { authClient, isSessionLoading } from "@/shared/session/auth"
import { GetStarted } from "./cta"

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
  const sessionQuery = authClient.useSession()
  const isSignedIn =
    sessionQuery.data !== null && sessionQuery.data !== undefined

  return (
    <div className="flex items-center gap-2">
      {!isSignedIn ? (
        <Button
          asChild
          disabled={isSessionLoading(sessionQuery)}
          size="lg"
          variant="ghost"
        >
          <Link to="/auth/sign-in">Sign in</Link>
        </Button>
      ) : null}
      <GetStarted />
      {isSignedIn ? <UserButton size="icon" /> : null}
    </div>
  )
}
