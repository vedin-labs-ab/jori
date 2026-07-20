import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { authClient } from "@/shared/session/auth"

// Every marketing page ends on the same handshake.
export function Closing({ lede }: { lede: string }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24 md:pb-32">
      <div className="border-t pt-14 md:pt-18">
        <h2 className="font-medium text-4xl tracking-tight sm:text-5xl">
          Meet Milo.
        </h2>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground leading-relaxed">
          {lede}
        </p>
        <div className="mt-8">
          <GetStarted prominent />
        </div>
      </div>
    </section>
  )
}

// The one call to action, auth-aware: strangers sign in with a work account,
// members go to the console. `prominent` bumps the size for hero and closing
// placements.
export function GetStarted({ prominent = false }: { prominent?: boolean }) {
  const { data: session, isPending } = authClient.useSession()
  const className = cn(prominent && "h-10 px-4 text-sm")

  if (session !== null && session !== undefined) {
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
    <Button asChild className={className} disabled={isPending} size="lg">
      <Link to="/auth/sign-in">
        Get started
        <ArrowRight data-icon="inline-end" />
      </Link>
    </Button>
  )
}
