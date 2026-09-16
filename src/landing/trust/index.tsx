import { Jori, PageIntro } from "../section"
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
    <MarketingShell
      closing={
        <>
          Tell us which job you'd like <Jori tilt="right" /> to take on. If it's
          a fit for a paid pilot, we'll help you set it up and choose the access
          it needs.
        </>
      }
    >
      <PageIntro
        lede={
          <>
            Choose which accounts <Jori tilt="left" /> can use and what they can
            do. Review their actions and costs in each run's record.
          </>
        }
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
