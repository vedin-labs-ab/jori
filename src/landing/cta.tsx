import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { type ComponentProps, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { usePublicSession } from "@/shared/session/public"

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
  const session = usePublicSession()
  const isSignedIn = session.data !== null && session.data !== undefined

  return (
    <SessionButton
      pending={session.isPending}
      size={prominent ? "xl" : "lg"}
      to={isSignedIn ? "/console" : "/auth/sign-in"}
    >
      {isSignedIn ? "Open console" : "Get started"}
      <ArrowRight data-icon="inline-end" />
    </SessionButton>
  )
}

/** A session-aware link button for marketing surfaces: disabled while the
 *  session state resolves, a plain link afterwards. The pending markup
 *  matches what the server renders, so hydration stays clean. */
export function SessionButton({
  children,
  pending,
  to,
  ...buttonProps
}: {
  children: ReactNode
  pending: boolean
  to: string
} & Pick<ComponentProps<typeof Button>, "className" | "size" | "variant">) {
  if (pending) {
    return (
      <Button disabled size="lg" {...buttonProps}>
        {children}
      </Button>
    )
  }

  return (
    <Button asChild size="lg" {...buttonProps}>
      <Link to={to}>{children}</Link>
    </Button>
  )
}
