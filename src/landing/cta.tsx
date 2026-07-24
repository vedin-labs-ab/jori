import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { type ComponentProps, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { usePublicSession } from "@/shared/session/public"
import { WaitlistForm } from "./waitlist/form"

/** The anchor every call to action points at. Each marketing page ends on the
 *  same waitlist section, so the target exists wherever the button appears. */
export const waitlistAnchor = "waitlist"

// Every marketing page ends on the same handshake.
export function Closing({ lede }: { lede: string }) {
  return (
    <section
      className="mx-auto w-full max-w-6xl scroll-mt-10 px-6 pb-24 md:pb-32"
      id={waitlistAnchor}
    >
      <div className="border-t pt-14 md:pt-18">
        <h2 className="font-medium text-4xl tracking-tight sm:text-5xl">
          Opening to a few teams at a time.
        </h2>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground leading-relaxed">
          {lede}
        </p>
        <div className="mt-10">
          <WaitlistForm />
        </div>
      </div>
    </section>
  )
}

/** The one call to action, auth-aware: members go to the console, everyone
 *  else drops to the waitlist that closes every page. `prominent` bumps the
 *  size for hero placements. */
export function GetStarted({ prominent = false }: { prominent?: boolean }) {
  const session = usePublicSession()
  const isSignedIn = session.data !== null && session.data !== undefined
  const size = prominent ? "xl" : "lg"

  if (isSignedIn) {
    return (
      <SessionButton pending={session.isPending} size={size} to="/console">
        Open console
        <ArrowRight data-icon="inline-end" />
      </SessionButton>
    )
  }

  return (
    <Button asChild size={size}>
      <a href={`#${waitlistAnchor}`}>
        Join the waitlist
        <ArrowRight data-icon="inline-end" />
      </a>
    </Button>
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
