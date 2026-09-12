import { PageIntro } from "../section"
import { MarketingShell } from "../shell"
import { Faq } from "./faq"
import { Shape } from "./shape"

export function PricingPage() {
  return (
    <MarketingShell closing="Join the waitlist and you'll see the numbers before they're public.">
      <PageIntro
        lede="Jori is available through paid pilots. Public plan prices have not been announced. Plans cover the organization, with model usage billed at the provider's public list rates. Join the waitlist to hear when access opens."
        title="One price for the whole organization."
      />
      <Shape />
      <Faq />
    </MarketingShell>
  )
}
