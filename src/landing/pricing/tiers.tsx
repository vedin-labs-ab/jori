import { GetStarted } from "../cta"

// Placeholder amounts: the tier structure is decided, the numbers are
// estimates to be replaced before launch.
const tiers = [
  {
    name: "Starter",
    price: 29,
    credits: "250 credits per seat, monthly",
    seats: "Up to 3 seats",
    support: "Email support",
    featured: false,
  },
  {
    name: "Team",
    price: 59,
    credits: "750 credits per seat, monthly",
    seats: "Up to 25 seats",
    support: "Priority support",
    featured: true,
  },
  {
    name: "Company",
    price: 119,
    credits: "2,000 credits per seat, monthly",
    seats: "Unlimited seats",
    support: "Dedicated onboarding and support",
    featured: false,
  },
] as const

export function Tiers() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      <div className="grid items-start gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <TierCard key={tier.name} tier={tier} />
        ))}
      </div>
      <p className="mt-6 max-w-2xl text-muted-foreground text-sm leading-relaxed">
        Every plan includes every integration, every playbook, mentions,
        ask-first approvals, and receipts. A typical run costs about one credit;
        add 100 credits for $10 whenever you need them.
      </p>
    </section>
  )
}

function TierCard({ tier }: { tier: (typeof tiers)[number] }) {
  return (
    <div
      className={`rounded-xl border bg-card p-6 ${
        tier.featured ? "border-primary/50" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium text-lg">{tier.name}</h2>
        {tier.featured ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary text-xs">
            Most teams start here
          </span>
        ) : null}
      </div>
      <p className="mt-4">
        <span className="font-medium text-4xl tabular-nums tracking-tight">
          ${tier.price}
        </span>
        <span className="ml-1.5 text-muted-foreground text-sm">
          per seat, per month
        </span>
      </p>
      <ul className="mt-5 space-y-2 text-muted-foreground text-sm">
        <li>{tier.credits}</li>
        <li>{tier.seats}</li>
        <li>{tier.support}</li>
      </ul>
      <div className="mt-6">
        <GetStarted />
      </div>
    </div>
  )
}
