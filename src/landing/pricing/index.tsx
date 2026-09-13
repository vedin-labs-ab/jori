import { PageIntro } from "../section"
import { MarketingShell } from "../shell"
import { Custom } from "./custom"
import { Extras } from "./extras"
import { Faq } from "./faq"
import { Plans } from "./plans"

export function PricingPage() {
  return (
    <MarketingShell closing="Tell us what your team does by hand every week. We'll set the pilot up with you.">
      <PageIntro
        lede="Bring the people and the work. Choose who takes care of the rest."
        title="Your whole company. One price."
      />
      <Plans />
      <Extras />
      <Custom />
      <Faq />
    </MarketingShell>
  )
}
