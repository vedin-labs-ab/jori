import { Closing } from "../cta"
import { MarketingShell } from "../shell"
import { Faq } from "./faq"
import { Tiers } from "./tiers"

export function PricingPage() {
  return (
    <MarketingShell>
      <Intro />
      <Tiers />
      <Faq />
      <Closing lede="Pick a plan. Tomorrow starts with a brief." />
    </MarketingShell>
  )
}

function Intro() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-14 md:pt-24">
      <div className="max-w-2xl">
        <h1 className="font-medium text-4xl text-balance tracking-tight sm:text-5xl">
          One price for the whole organization.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
          No seats to count. Everyone joins, Milo learns the whole company, and
          the work it does is billed in dollars at provider list rates. Never
          marked up.
        </p>
      </div>
    </section>
  )
}
