import { formatUsd, trial } from "@contracts/billing"
import { Receipt, Users, Wallet } from "lucide-react"
import { Definition, Section } from "../section"
import { UsageMeter } from "./usage"

/** What is settled about pricing is its shape, not its numbers. Publishing the
 *  shape is honest and still says the useful thing: Jori is not sold by the
 *  seat, and the bill is the provider's own rate rather than a multiplier on
 *  it. Where Jori does earn on usage is named rather than implied, because
 *  `contracts/billing.ts` bills every prompt token at list whether it was
 *  cached or not, and a reader who works that out for themselves is owed the
 *  sentence up front. */
const principles = [
  {
    icon: Users,
    title: "No seats to count",
    body: "Everyone joins, including the people who only ever open a page someone handed them.",
  },
  {
    icon: Receipt,
    title: "No markup on usage",
    body: "Model work is billed in dollars at the provider's public list rates. What we make on it is the difference good caching buys, never a multiplier on your bill. Every run shows what it was billed.",
  },
  {
    icon: Wallet,
    title: "No surprise invoice",
    body: "Usage draws from prepaid credit rather than a metered invoice. Auto top-up is opt-in and capped, and the console keeps a live tally.",
  },
] as const

export function Shape() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
        <dl className="grid gap-x-12 gap-y-8 md:grid-cols-3">
          {principles.map((principle) => (
            <Definition
              icon={principle.icon}
              key={principle.title}
              term={principle.title}
            >
              {principle.body}
            </Definition>
          ))}
        </dl>
      </section>
      {/* The prose says what is not decided; the meter shows the part that
          is, which is the half a reader has to take on faith otherwise. */}
      <Section
        lede="A run is billed at the provider's list rates. We'd rather set the flat fee once we've watched real teams run, and everyone on the waitlist sees it first."
        support
        title="Usage is settled. The plan price isn't."
      >
        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
          <dl className="grid max-w-xl gap-x-12 gap-y-8 sm:grid-cols-2">
            <Definition term="Included">
              Every integration, mentions, ask-first approvals, and receipts.
            </Definition>
            <Definition term="To start">
              {trial.days} days and {formatUsd(trial.allowanceMicros)} of usage,
              no card.
            </Definition>
          </dl>
          <UsageMeter />
        </div>
      </Section>
    </>
  )
}
