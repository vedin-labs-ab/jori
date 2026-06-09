import {
  OrganizationSwitcher,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/tanstack-react-start"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/shared/brand"

export function ConsoleHeader({
  isLoaded,
  isSignedIn,
}: {
  isLoaded: boolean
  isSignedIn: boolean | undefined
}) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <BrandMark />

      <div className="ml-auto flex items-center gap-2">
        {!isLoaded ? (
          <Button variant="outline" size="sm" disabled>
            Loading
          </Button>
        ) : null}
        {isLoaded && !isSignedIn ? (
          <>
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign up</Button>
            </SignUpButton>
          </>
        ) : null}
        {isLoaded && isSignedIn ? (
          <>
            <OrganizationSwitcher />
            <UserButton />
          </>
        ) : null}
      </div>
    </header>
  )
}
