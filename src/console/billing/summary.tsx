import { plan } from "@contracts/billing"
import { CreditCard } from "lucide-react"
import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { type BillingAccount, useBillingCheckout } from "./actions"
import { Balance } from "./balance"
import { PlanPicker } from "./plan"

/**
 * The stat band: plan on the left, money on the right. The right side leads
 * with the aggregate the run guard actually enforces, then itemizes the two
 * pots: the metered allotment (which has a real total) and the bar-less
 * wallet (which is an open balance, so a meter would lie).
 */
export function SummaryBand({
  account,
  organizationId,
}: {
  account: BillingAccount | null
  organizationId: string
}) {
  return (
    <div className="grid min-w-0 lg:grid-cols-[5fr_7fr]">
      <PlanCell account={account} organizationId={organizationId} />
      <CardContent className="min-w-0 pt-0 pb-4 lg:py-4">
        <Balance account={account} organizationId={organizationId} />
      </CardContent>
    </div>
  )
}

function PlanCell({
  account,
  organizationId,
}: {
  account: BillingAccount | null
  organizationId: string
}) {
  const checkout = useBillingCheckout(organizationId)
  const subscribed = account !== null && account.state.kind !== "unsubscribed"

  return (
    <CardContent className="min-w-0 py-4">
      <MetricLabel>Plan</MetricLabel>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-medium text-2xl tracking-tight">
          {planName(account)}
        </span>
        {account?.state.kind === "paused" ? (
          <Badge variant="destructive">Paused</Badge>
        ) : null}
      </div>
      <p className="mt-1.5 text-xs/relaxed text-muted-foreground">
        {planDetail(account)}
      </p>
      <div className="mt-5 flex gap-2">
        {subscribed ? null : <PlanPicker organizationId={organizationId} />}
        {account?.hasCustomer ? (
          <Button
            disabled={checkout.pending !== null}
            onClick={checkout.managePortal}
            variant="outline"
          >
            {checkout.pending === "portal" ? <Spinner /> : <CreditCard />}
            Manage billing
          </Button>
        ) : null}
      </div>
    </CardContent>
  )
}

function planName(account: BillingAccount | null) {
  if (account === null || account.state.kind === "unsubscribed") {
    return "No plan"
  }

  return plan.label
}

function planDetail(account: BillingAccount | null) {
  if (account === null || account.state.kind === "unsubscribed") {
    return `${plan.label} is $${plan.monthlyPriceUsd} a month for the whole organization. Jori starts working once you subscribe.`
  }

  return `$${plan.monthlyPriceUsd} a month, for the whole organization.`
}

function MetricLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs/relaxed font-medium text-muted-foreground">
      {children}
    </p>
  )
}
