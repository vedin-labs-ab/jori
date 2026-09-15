import { plan } from "@contracts/billing"
import { ArrowUpRight, CloudUpload, Folder, Users, Zap } from "lucide-react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { repositoryUrl } from "@/shared/brand/content"
import { IntegrationLogo } from "@/shared/logo/integration"
import {
  type PlanFact,
  planFacts,
  planPriceNote,
  planTitle,
} from "@/shared/plan"
import { PlanFacts } from "@/shared/plan/facts"
import {
  Folder as FolderSurface,
  FolderTab,
  FolderTabs,
} from "@/shared/plan/folder"
import { GetStarted } from "../cta"

type Tier = {
  action: ReactNode
  facts: readonly PlanFact[]
  footer: string
  label: string
  price: string
  priceNote: string
  title: readonly [string, string]
  value: string
}

/** Two folders, one workspace. Cloud is the plan as the contract states
 *  it; self-hosted holds the same four facts in the same order, so the
 *  second tab reads as the first with the upkeep moved across, which is
 *  the whole difference. */
const tiers: readonly Tier[] = [
  {
    value: "cloud",
    label: plan.label,
    title: planTitle,
    price: `$${plan.monthlyPriceUsd}`,
    priceNote: planPriceNote,
    facts: planFacts,
    footer: "Pilots are set up by us, a few teams at a time.",
    action: <GetStarted prominent />,
  },
  {
    value: "self-hosted",
    label: "Self-hosted",
    title: ["The workspace is yours.", "So is the upkeep."],
    price: "Free",
    priceNote: "open source",
    facts: [
      {
        icon: Users,
        term: "People",
        value: "Everyone included",
        note: "No seats to count",
      },
      {
        icon: Zap,
        term: "AI usage",
        value: "Your model accounts",
        note: "Paid to the provider directly",
      },
      {
        icon: Folder,
        term: "File storage",
        value: "Your storage",
        note: "As much as you give it",
      },
      {
        icon: CloudUpload,
        term: "Hosting & updates",
        value: "Handled by you",
        note: "Deployment, maintenance, and updates",
      },
    ],
    footer: "Infrastructure and AI costs are yours.",
    action: (
      <Button asChild size="xl" variant="outline">
        <a href={repositoryUrl} rel="noreferrer" target="_blank">
          <IntegrationLogo
            data-icon="inline-start"
            decorative
            integration="github"
          />
          View on GitHub
          <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
        </a>
      </Button>
    ),
  },
]

/** The plans are folders in the drive the rest of the site shows, and the
 *  tabs are the folder's own, with Radix behind them for the keyboard. */
export function Plans() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-12 md:pt-16">
      <TabsPrimitive.Root defaultValue="cloud">
        <FolderTabs asChild className="sm:pl-8">
          <TabsPrimitive.List aria-label="Plans">
            {tiers.map((tier) => (
              <TabsPrimitive.Trigger
                asChild
                key={tier.value}
                value={tier.value}
              >
                <FolderTab>{tier.label}</FolderTab>
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>
        </FolderTabs>
        <FolderSurface>
          {tiers.map((tier) => (
            <TabsPrimitive.Content
              className="outline-none"
              key={tier.value}
              value={tier.value}
            >
              <TierBody tier={tier} />
            </TabsPrimitive.Content>
          ))}
        </FolderSurface>
      </TabsPrimitive.Root>
    </section>
  )
}

function TierBody({ tier }: { tier: Tier }) {
  return (
    <>
      <div className="px-6 pt-8 pb-8 sm:px-8 sm:pt-10 sm:pb-10 md:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <h2 className="font-medium text-2xl tracking-tight sm:text-3xl">
            {tier.title[0]}
            <br />
            {tier.title[1]}
          </h2>
          <p className="shrink-0 sm:text-right">
            <span className="block font-medium text-4xl tracking-tight sm:text-5xl">
              {tier.price}
            </span>
            <span className="mt-1 block text-muted-foreground text-sm">
              {tier.priceNote}
            </span>
          </p>
        </div>
        <PlanFacts className="mt-8" facts={tier.facts} />
      </div>
      <div className="flex flex-col gap-4 rounded-b-2xl border-t bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 md:px-10">
        <p className="text-muted-foreground text-sm">{tier.footer}</p>
        {tier.action}
      </div>
    </>
  )
}
