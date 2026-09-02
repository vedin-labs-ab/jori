import { PageIntro } from "../section"
import { MarketingShell } from "../shell"
import { ApprovalsSection, ReceiptsSection } from "./approvals"
import {
  BoundariesSection,
  DataSection,
  ScopeSection,
  VisibilitySection,
} from "./facts"
import { ModesSection } from "./modes"

export function TrustPage() {
  return (
    <MarketingShell closing="Set the modes, watch the receipts, expand from there. Tell us what you'd hand over first.">
      <PageIntro
        lede="Handing work to Jori means handing it your repositories, your issues, your threads, and your inbox. That access comes with controls you can see and receipts you can audit."
        title="Built to be checked."
      />
      <ModesSection />
      <ApprovalsSection />
      <ReceiptsSection />
      <ScopeSection />
      <VisibilitySection />
      <BoundariesSection />
      <DataSection />
    </MarketingShell>
  )
}
