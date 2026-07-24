import { type ReactNode } from "react"
import { Closing } from "./cta"
import { LandingFooter } from "./footer"
import { LandingHeader } from "./header"

/** Marketing pages end on the waitlist handshake. Declaring its lede here is
 *  what puts the anchor on the page, so the header's call to action can never
 *  point at a section that is not there. Legal documents pass none and send
 *  their readers to the home page's instead. */
export function MarketingShell({
  children,
  closing,
}: {
  children: ReactNode
  closing?: string
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <LandingHeader onWaitlistPage={closing !== undefined} />
      <main className="flex-1">
        {children}
        {closing === undefined ? null : <Closing lede={closing} />}
      </main>
      <LandingFooter />
    </div>
  )
}
