import { Closing } from "../cta"
import { PageIntro } from "../section"
import { MarketingShell } from "../shell"
import { Faq } from "./faq"
import { Shape } from "./shape"

export function PricingPage() {
  return (
    <MarketingShell>
      <PageIntro
        lede="No seats to count. Everyone joins, Milo learns the whole company, and the work it does is billed in dollars at provider list rates. Never marked up."
        title="One price for the whole organization."
      />
      <Shape />
      <Faq />
      <Closing lede="Join the waitlist and you'll see the numbers before they're public." />
    </MarketingShell>
  )
}
