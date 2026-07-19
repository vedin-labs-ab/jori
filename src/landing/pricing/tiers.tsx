import { formatUsd, plans, trial } from "@contracts/billing"
import { Button } from "@/components/ui/button"
import { GetStarted } from "../cta"

const tiers = [
  {
    plan: plans.starter,
    blurb: "For a founder and the first people in.",
    support: "Email support",
    featured: false,
  },
  {
    plan: plans.team,
    blurb: "For companies that run on Milo.",
    support: "Priority support",
    featured: true,
  },
] as const

export function Tiers() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      <div className="grid items-start gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <TierCard key={tier.plan.key} tier={tier} />
        ))}
        <EnterpriseCard />
      </div>
      <p className="mt-6 max-w-2xl text-muted-foreground text-sm leading-relaxed">
        Every plan includes every integration, every playbook, mentions,
        ask-first approvals, and receipts. Usage beyond the included amount is
        billed in dollars at the model provider's public list rates, from a
        prepaid wallet you control. Start with a {trial.days}-day trial that
        includes {formatUsd(trial.grantMicros)} of usage, no card required.
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
        <h2 className="font-medium text-lg">{tier.plan.label}</h2>
        {tier.featured ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary text-xs">
            Most teams start here
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-muted-foreground text-sm">{tier.blurb}</p>
      <p className="mt-4">
        <span className="font-medium text-4xl tabular-nums tracking-tight">
          ${tier.plan.monthlyPriceUsd}
        </span>
        <span className="ml-1.5 text-muted-foreground text-sm">
          per organization, per month
        </span>
      </p>
      <p className="mt-1 text-muted-foreground text-sm">
        ${tier.plan.annualPriceUsd.toLocaleString("en-US")} a year, save 20%
      </p>
      <ul className="mt-5 space-y-2 text-muted-foreground text-sm">
        <li>
          {formatUsd(tier.plan.includedMonthlyMicros)} of usage included monthly
        </li>
        <li>Up to {tier.plan.memberLimit} members</li>
        <li>{tier.support}</li>
      </ul>
      <div className="mt-6">
        <GetStarted />
      </div>
    </div>
  )
}

function EnterpriseCard() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="font-medium text-lg">Enterprise</h2>
      <p className="mt-1.5 text-muted-foreground text-sm">
        For more than {plans.team.memberLimit} members, or special needs.
      </p>
      <p className="mt-4">
        <span className="font-medium text-4xl tracking-tight">Custom</span>
      </p>
      <p className="mt-1 text-muted-foreground text-sm">Annual agreements</p>
      <ul className="mt-5 space-y-2 text-muted-foreground text-sm">
        <li>Usage volume terms</li>
        <li>SSO, SCIM, audit log, retention controls</li>
        <li>Onboarding and supported self-hosting</li>
      </ul>
      <div className="mt-6">
        <Button asChild variant="outline">
          <a href="mailto:hello@milo.app">Talk to us</a>
        </Button>
      </div>
    </div>
  )
}
