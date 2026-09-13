import { MarketingShell } from "../shell"
import { Custom } from "./custom"
import { Extras } from "./extras"
import { Faq } from "./faq"
import { Plans } from "./plans"

export function PricingPage() {
  return (
    <MarketingShell closing="Tell us what your team does by hand every week. We'll set the pilot up with you.">
      <Intro />
      <Plans />
      <Extras />
      <Custom />
      <Faq />
    </MarketingShell>
  )
}

/** Split where the other pages stack: the claim on the left, and on the
 *  right the one choice the page asks for, which the folder tabs under it
 *  are about to make. */
function Intro() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-14 md:pt-24">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:items-end md:gap-12">
        <h1 className="max-w-2xl font-medium text-4xl text-balance tracking-tight sm:text-5xl lg:text-6xl">
          Your whole company. <br className="hidden sm:inline" />
          One price.
        </h1>
        <p className="max-w-md text-lg text-muted-foreground leading-relaxed md:justify-self-end">
          Bring the people and the work. Choose who takes care of the rest.
        </p>
      </div>
    </section>
  )
}
