import { SignUpButton, useAuth } from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The one call to action, auth-aware: strangers sign up, members go to the
// console. `prominent` bumps the size for hero and closing placements.
export function GetStarted({ prominent = false }: { prominent?: boolean }) {
  const { isLoaded, isSignedIn } = useAuth()
  const className = cn(prominent && "h-10 px-4 text-sm")

  if (isLoaded && isSignedIn) {
    return (
      <Button asChild className={className} size="lg">
        <Link to="/console">
          Open console
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    )
  }

  return (
    <SignUpButton mode="modal">
      <Button className={className} disabled={!isLoaded} size="lg">
        Get started
        <ArrowRight data-icon="inline-end" />
      </Button>
    </SignUpButton>
  )
}
