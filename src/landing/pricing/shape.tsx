import { formatUsd, trial } from "@contracts/billing"
import { Receipt, Users, Wallet } from "lucide-react"
import { Definition } from "../section"
import { UsageMeter } from "./usage"

/** What is settled about pricing is its shape, not its numbers. Publishing the
 *  shape is honest and still says the useful thing: Jori is not sold by the
 *  seat, and usage is not a margin line. */
const principles = [
  {
    icon: Users,
    title: "No seats to count",
    body: "One price for the organization. Everyone joins, including the people who only ever open an app someone else handed over.",
  },
  {
    icon: Receipt,
    title: "Usage at cost",
    body: "The model work Jori does is billed in dollars at the provider's public list rates, never marked up. Every run shows what it cost.",
  },
  {
    icon: Wallet,
    title: "Nothing to be surprised by",
    body: "Usage draws from prepaid credit rather than a metered invoice. Auto top-up is opt-in and capped, and the console keeps a live tally.",
  },
] as const

export function Shape() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      <dl className="grid gap-x-16 gap-y-8 md:grid-cols-3">
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
      {/* The prose says what is not decided; the meter shows the part that
          is, which is the half a reader has to take on faith otherwise. */}
      <div className="mt-20 grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div>
          <h2 className="max-w-xl font-medium text-2xl text-balance tracking-tight">
            Final numbers land when Jori opens.
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed">
            We would rather price it once we know what the work costs to run.
            Everyone on the waitlist sees the numbers first.
          </p>
          <dl className="mt-8 grid max-w-xl gap-x-10 gap-y-6 sm:grid-cols-2">
            <Definition term="In every plan">
              Every integration, mentions, ask-first approvals, receipts.
            </Definition>
            <Definition term="To start">
              {trial.days} days and {formatUsd(trial.grantMicros)} of usage, no
              card.
            </Definition>
          </dl>
        </div>
        <UsageMeter />
      </div>
    </section>
  )
}
