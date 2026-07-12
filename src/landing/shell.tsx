import { type ReactNode } from "react"
import { LandingFooter } from "./footer"
import { LandingHeader } from "./header"

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
    </div>
  )
}
