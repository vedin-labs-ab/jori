import { PageIntro } from "../section"
import { MarketingShell } from "../shell"
import { Custom } from "./custom"
import { Extras } from "./extras"
import { Faq } from "./faq"
import { Plans } from "./plans"

export function PricingPage() {
  return (
    <MarketingShell closing="Paid pilots include personal setup. Tell us which recurring job you'd like to start with, and we'll contact you if it's a fit.">
      <PageIntro
        lede="The hosted plan includes everyone on your team, AI usage, and file storage."
        title="One plan for your organization."
      />
      <Plans />
      <Extras />
      <Custom />
      <Faq />
    </MarketingShell>
  )
}
