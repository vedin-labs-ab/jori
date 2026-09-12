import { PageIntro } from "../section"
import { MarketingShell } from "../shell"
import { Faq } from "./faq"
import { Shape } from "./shape"

export function PricingPage() {
  return (
    <MarketingShell closing="Join the waitlist and you'll see the numbers before they're public.">
      <PageIntro
        lede="Not per seat, and not marked up. The shape is settled. The numbers are not, and we'd rather say so."
        title="One price for the whole organization."
      />
      <Shape />
      <Faq />
    </MarketingShell>
  )
}
