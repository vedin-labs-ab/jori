import { formatUsd, trial } from "@contracts/billing"
import { Button } from "@/components/ui/button"

/** What is settled about pricing is its shape, not its numbers. Publishing the
 *  shape is honest and still says the useful thing: Milo is not sold by the
 *  seat, and usage is not a margin line. */
const principles = [
  {
    title: "No seats to count",
    body: "One price for the organization. Everyone joins, including the people who only ever open an app someone else handed over.",
  },
  {
    title: "Usage at cost",
    body: "The model work Milo does is billed in dollars at the provider's public list rates, never marked up. Every run shows what it cost.",
  },
  {
    title: "Nothing to be surprised by",
    body: "Usage draws from prepaid credit rather than a metered invoice. Auto top-up is opt-in and capped, and the console keeps a live tally.",
  },
] as const

export function Shape() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      <div className="grid gap-4 md:grid-cols-3">
        {principles.map((principle) => (
          <Principle
            body={principle.body}
            key={principle.title}
            title={principle.title}
          />
        ))}
      </div>
      <div className="mt-10 border-t pt-10">
        <h2 className="font-medium text-2xl tracking-tight">
          Final numbers land when Milo opens.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
          We're opening to a few teams at a time and setting each one up
          ourselves, so we would rather price it once we know what the work
          costs to run. Everyone on the waitlist sees the numbers first. Every
          plan includes every integration, mentions, ask-first approvals, and
          receipts, and the {trial.days}-day trial starts with{" "}
          {formatUsd(trial.grantMicros)} of usage and no card.
        </p>
        <div className="mt-7">
          <Button asChild variant="outline">
            <a href="mailto:hello@milo.app">Ask about pricing</a>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Principle({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
        {body}
      </p>
    </div>
  )
}
