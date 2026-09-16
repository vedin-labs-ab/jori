import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { WaitlistForm } from "./waitlist/form"

/** The anchor every call to action points at. `MarketingShell` is what puts it
 *  on a page, so whether it exists is a fact the shell already knows. */
const waitlistAnchor = "waitlist"

// Every marketing page ends on the same handshake.
export function Closing({ lede }: { lede: ReactNode }) {
  return (
    <section className="scroll-mt-10" id={waitlistAnchor}>
      <div className="mx-auto w-full max-w-6xl px-6 pt-14 pb-24 md:pt-18 md:pb-32">
        <h2 className="font-medium text-4xl tracking-tight sm:text-5xl">
          Start with one recurring job.
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

/** Marketing never reads regional sessions. Pages that close on the waitlist scroll down; the rest
 *  (legal documents) send the reader to the home page's. `prominent` bumps the
 *  size for hero placements. */
export function GetStarted({
  onWaitlistPage = true,
  prominent = false,
}: {
  onWaitlistPage?: boolean
  prominent?: boolean
}) {
  const size = prominent ? "xl" : "lg"

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
