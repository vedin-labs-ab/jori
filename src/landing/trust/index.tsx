import { Closing } from "../cta"
import { PageIntro } from "../section"
import { MarketingShell } from "../shell"
import { ApprovalsSection, ReceiptsSection } from "./approvals"
import { BoundariesSection, DataSection, ScopeSection } from "./facts"
import { ModesSection } from "./modes"

export function TrustPage() {
  return (
    <MarketingShell>
      <PageIntro
        lede="Milo reads your email, your calendar, and your team's threads. That access comes with controls you can see and receipts you can audit. This page explains exactly who can do what."
        title="Built to be checked."
      />
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
