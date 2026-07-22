import { Closing } from "../cta"
import { PageIntro } from "../section"
import { MarketingShell } from "../shell"
import { Faq } from "./faq"
import { Tiers } from "./tiers"

export function PricingPage() {
  return (
    <MarketingShell>
      <PageIntro
        lede="No seats to count. Everyone joins, Milo learns the whole company, and the work it does is billed in dollars at provider list rates. Never marked up."
        title="One price for the whole organization."
      />
      <Tiers />
      <Faq />
      <Closing lede="Pick a plan. Tomorrow starts with a brief." />
    </MarketingShell>
  )
}
