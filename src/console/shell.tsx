import {
  OrganizationSwitcher,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/shared/brand"

const consoleNavigation = [
  { label: "Console", to: "/console" },
  { label: "Integrations", to: "/integrations" },
  { label: "Skills", to: "/skills" },
] as const

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
      {isLoaded && isSignedIn ? <ConsoleNavigation /> : null}

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

function ConsoleNavigation() {
  return (
    <nav className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
      {consoleNavigation.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: true }}
          className="inline-flex h-8 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          activeProps={{
            className: "bg-accent text-accent-foreground",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
