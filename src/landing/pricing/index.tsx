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
          A seat for every teammate. Credits for the work.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
          Every seat includes credits that cover Milo's runs. Add more whenever
          a busy week needs them.
        </p>
      </div>
    </section>
  )
}
