import { Closing } from "../cta"
import { MarketingShell } from "../shell"
import { ApprovalsSection, ReceiptsSection } from "./approvals"
import { BoundariesSection, DataSection, ScopeSection } from "./facts"
import { ModesSection } from "./modes"

export function TrustPage() {
  return (
    <MarketingShell>
      <Intro />
      <ModesSection />
      <ApprovalsSection />
      <ReceiptsSection />
      <ScopeSection />
      <BoundariesSection />
      <DataSection />
      <Closing lede="Set the modes, watch the receipts, expand from there." />
    </MarketingShell>
  )
}

function Intro() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-14 md:pt-24">
      <div className="max-w-2xl">
        <h1 className="font-medium text-4xl text-balance tracking-tight sm:text-5xl">
          Built to be checked.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
          Milo reads your email, your calendar, and your team's threads. That
          access comes with controls you can see and receipts you can audit.
          This page explains exactly who can do what.
        </p>
      </div>
    </section>
  )
}
