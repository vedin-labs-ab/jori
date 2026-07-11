import { SignInButton, UserButton, useAuth } from "@clerk/tanstack-react-start"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/shared/brand"
import { GetStarted } from "./cta"

export function LandingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <BrandMark />
      <HeaderActions />
    </header>
  )
}

function HeaderActions() {
  const { isLoaded, isSignedIn } = useAuth()

  return (
    <div className="flex items-center gap-2">
      {!isSignedIn ? (
        <SignInButton mode="modal">
          <Button disabled={!isLoaded} size="lg" variant="ghost">
            Sign in
          </Button>
        </SignInButton>
      ) : null}
      <GetStarted />
      {isLoaded && isSignedIn ? <UserButton /> : null}
    </div>
  )
}
