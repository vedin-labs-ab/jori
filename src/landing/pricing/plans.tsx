import {
  ArrowUpRight,
  CloudUpload,
  Folder,
  type LucideIcon,
  Users,
  Zap,
} from "lucide-react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { repositoryUrl } from "@/shared/brand/content"
import { IntegrationLogo } from "@/shared/logo/integration"
import { GetStarted } from "../cta"

/** Marketing's numbers for the cloud plan. `contracts/billing.ts` still
 *  carries the plans the console sells, and it changes when billing does. */
const cloud = {
  monthlyPriceUsd: 49,
  monthlyAllowanceUsd: 20,
  storageGb: 25,
}

type Plan = {
  action: ReactNode
  footer: string
  label: string
  price: string
  priceNote: string
  rows: readonly {
    icon: LucideIcon
    note: string
    term: string
    value: string
  }[]
  title: ReactNode
  value: string
}

/** Two folders, one workspace. Cloud and self-hosted hold the same rows in
 *  the same order, so the second tab reads as the same offer with the
 *  upkeep moved across the table, which is the whole difference. */
const plans: readonly Plan[] = [
  {
    value: "cloud",
    label: "Cloud",
    title: (
      <>
        The workspace is yours.
        <br />
        The upkeep is ours.
      </>
    ),
    price: `$${cloud.monthlyPriceUsd}`,
    priceNote: "per month",
    rows: [
      {
        icon: Users,
        term: "People",
        value: "Everyone included",
        note: "No seats to count",
      },
      {
        icon: Zap,
        term: "AI usage",
        value: `$${cloud.monthlyAllowanceUsd} a month`,
        note: "Shared by every job and chat",
      },
      {
        icon: Folder,
        term: "File storage",
        value: `${cloud.storageGb} GB`,
        note: "One place for the team's materials",
      },
      {
        icon: CloudUpload,
        term: "Hosting & updates",
        value: "Handled by us",
        note: "You focus on the work",
      },
    ],
    footer: "Pilots are set up by us, a few teams at a time.",
    action: <GetStarted prominent />,
  },
  {
    value: "self-hosted",
    label: "Self-hosted",
    title: (
      <>
        The workspace is yours.
        <br />
        So is the upkeep.
      </>
    ),
    price: "Free",
    priceNote: "for internal use",
    rows: [
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

/** The plans are folders in the drive the rest of the site shows: a tab
 *  each, and one body the open tab joins. The open tab shares the body's
 *  ground and paints over its top edge, so the two are one shape; the
 *  closed tab sits a step lower and behind, the way the next folder in a
 *  drawer does. */
export function Plans() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-14 md:pt-20">
      <TabsPrimitive.Root defaultValue="cloud">
        <TabsPrimitive.List
          aria-label="Plans"
          className="relative z-10 -mb-px flex items-end gap-1.5 pl-5 sm:pl-8"
        >
          {plans.map((plan) => (
            <TabsPrimitive.Trigger
              className={cn(
                "inline-flex h-11 items-center rounded-t-xl border bg-muted px-5 font-medium text-muted-foreground text-sm transition-colors outline-none",
                "hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                "data-[state=active]:h-12 data-[state=active]:border-b-transparent data-[state=active]:bg-card data-[state=active]:text-foreground"
              )}
              key={plan.value}
              value={plan.value}
            >
              {plan.label}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
        <div className="rounded-2xl border bg-card text-card-foreground">
          {plans.map((plan) => (
            <TabsPrimitive.Content
              className="outline-none"
              key={plan.value}
              value={plan.value}
            >
              <PlanBody plan={plan} />
            </TabsPrimitive.Content>
          ))}
        </div>
      </TabsPrimitive.Root>
    </section>
  )
}

function PlanBody({ plan }: { plan: Plan }) {
  return (
    <>
      <div className="px-6 pt-8 pb-8 sm:px-8 sm:pt-10 sm:pb-10 md:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <h2 className="font-medium text-2xl tracking-tight sm:text-3xl">
            {plan.title}
          </h2>
          <p className="shrink-0 sm:text-right">
            <span className="block font-medium text-4xl tracking-tight sm:text-5xl">
              {plan.price}
            </span>
            <span className="mt-1 block text-muted-foreground text-sm">
              {plan.priceNote}
            </span>
          </p>
        </div>
        {/* Four facts across rather than four rows down: the folder spans
            the page, and a two-column row across it is mostly air. */}
        <dl className="mt-8 grid gap-x-8 gap-y-8 border-t pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {plan.rows.map((row) => (
            <div key={row.term}>
              <dt className="flex items-center gap-2 text-muted-foreground text-sm">
                <row.icon className="size-4 shrink-0" />
                {row.term}
              </dt>
              <dd className="mt-2">
                <span className="block font-medium text-lg tracking-tight">
                  {row.value}
                </span>
                <span className="mt-0.5 block text-muted-foreground text-sm leading-relaxed">
                  {row.note}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col gap-4 rounded-b-2xl border-t bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 md:px-10">
        <p className="text-muted-foreground text-sm">{plan.footer}</p>
        {plan.action}
      </div>
    </>
  )
}
