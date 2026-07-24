import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { type ComponentProps, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { usePublicSession } from "@/shared/session/public"
import { WaitlistForm } from "./waitlist/form"

/** The anchor every call to action points at. `MarketingShell` is what puts it
 *  on a page, so whether it exists is a fact the shell already knows. */
export const waitlistAnchor = "waitlist"

// Every marketing page ends on the same handshake.
export function Closing({ lede }: { lede: string }) {
  return (
    <section className="scroll-mt-10 border-t" id={waitlistAnchor}>
      <div className="mx-auto w-full max-w-6xl px-6 pt-14 pb-24 md:pt-18 md:pb-32">
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
 *  else drops to the waitlist. Pages that close on it scroll down; the rest
 *  (legal documents) send the reader to the home page's. `prominent` bumps the
 *  size for hero placements. */
export function GetStarted({
  onWaitlistPage = true,
  prominent = false,
}: {
  onWaitlistPage?: boolean
  prominent?: boolean
}) {
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

  const label = (
    <>
      Join the waitlist
      <ArrowRight data-icon="inline-end" />
    </>
  )

  return (
    <Button asChild size={size}>
      {onWaitlistPage ? (
        <a href={`#${waitlistAnchor}`}>{label}</a>
      ) : (
        <Link hash={waitlistAnchor} to="/">
          {label}
        </Link>
      )}
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
