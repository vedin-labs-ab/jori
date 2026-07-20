import { Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { UserButton } from "@/components/auth/user/user-button"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/shared/brand"

export function PublicConsoleFrame({
  children,
  isSignedIn,
}: {
  children: ReactNode
  isSignedIn: boolean
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <PublicConsoleHeader isSignedIn={isSignedIn} />
      {children}
    </main>
  )
}

function PublicConsoleHeader({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <BrandMark />
      <div className="ml-auto flex items-center gap-2">
        {!isSignedIn ? (
          <Button asChild size="sm">
            <Link to="/auth/sign-in">Sign in</Link>
          </Button>
        ) : null}
        {isSignedIn ? <UserButton size="icon" /> : null}
      </div>
    </header>
  )
}
