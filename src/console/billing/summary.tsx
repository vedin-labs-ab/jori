import { formatUsd, plans, trial } from "@contracts/billing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { shortDate } from "../shared/time"
import { type BillingAccount, useBillingCheckout } from "./actions"
import { PlanPicker } from "./plan"
import { TopUpDialog } from "./topup"

/**
 * The stat band: plan on the left, money on the right. The right side leads
 * with the aggregate the run guard actually enforces, then itemizes the two
 * pots: the metered allotment (which has a real total) and the bar-less
 * wallet (which is an open balance, so a meter would lie).
 */
export function SummaryBand({
  account,
  tenantId,
}: {
  account: BillingAccount | null
  tenantId: string
}) {
  return (
    <div className="grid md:grid-cols-[5fr_7fr]">
      <PlanCell account={account} tenantId={tenantId} />
      <div className="p-6 pt-0 md:pt-6">
        <AvailableCell account={account} tenantId={tenantId} />
      </div>
    </div>
  )
}

function PlanCell({
  account,
  tenantId,
}: {
  account: BillingAccount | null
  tenantId: string
}) {
  const checkout = useBillingCheckout(tenantId)
  const subscribed = account !== null && account.plan !== undefined

  return (
    <div className="p-6">
      <p className="text-muted-foreground text-sm">Plan</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-medium text-2xl tracking-tight">
          {planName(account)}
        </span>
        {account?.state === "paused" ? (
          <Badge variant="destructive">Paused</Badge>
        ) : null}
      </div>
      <p className="mt-1.5 text-muted-foreground text-sm">
        {planDetail(account)}
      </p>
      <div className="mt-5 flex gap-2">
        {subscribed ? null : <PlanPicker tenantId={tenantId} />}
        {account?.hasStripeCustomer ? (
          <Button onClick={checkout.managePortal} variant="outline">
            Manage billing
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function planName(account: BillingAccount | null) {
  if (account === null || account.state === "trial") {
    return "Trial"
  }

  return account.plan === undefined ? "None" : plans[account.plan].label
}

function planDetail(account: BillingAccount | null) {
  if (account === null) {
    return "14 days of everything Milo does. Starts with the first run."
  }

  if (account.state === "trial") {
    return account.trialEndsAt === undefined
      ? "Everything Milo does, on the house."
      : `Everything Milo does, until ${shortDate(account.trialEndsAt)}.`
  }

  if (account.plan === undefined) {
    return "Pick a plan to keep Milo working."
  }

  const plan = plans[account.plan]

  return account.interval === "year"
    ? `$${plan.annualPriceUsd.toLocaleString("en-US")} a year, for the whole organization.`
    : `$${plan.monthlyPriceUsd} a month, for the whole organization.`
}

function AvailableCell({
  account,
  tenantId,
}: {
  account: BillingAccount | null
  tenantId: string
}) {
  const includedMicros = Math.max(
    account?.includedMicros ?? trial.grantMicros,
    0
  )
  const walletMicros = account?.walletMicros ?? 0
  // Subscribing mid-trial folds the trial remainder into the first cycle, so
  // the balance can exceed the plan grant; the denominator follows it.
  const grantMicros = Math.max(
    account === null || account.plan === undefined
      ? trial.grantMicros
      : plans[account.plan].includedMonthlyMicros,
    includedMicros
  )

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Available usage</p>
          <p className="mt-1.5 font-medium text-2xl tabular-nums tracking-tight">
            {formatUsd(includedMicros + walletMicros)}
          </p>
        </div>
        <TopUpDialog tenantId={tenantId} />
      </div>
      <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-sm">
        <span className="text-muted-foreground">
          {account === null || account.state === "trial" ? "Trial" : "Monthly"}
        </span>
        <div className="flex items-center gap-3">
          <Progress
            className="h-1.5 flex-1"
            value={Math.min(100, (includedMicros / grantMicros) * 100)}
          />
          <span className="whitespace-nowrap tabular-nums">
            {formatUsd(includedMicros)}{" "}
            <span className="text-muted-foreground">
              of {formatUsd(grantMicros)} · {resetLabel(account)}
            </span>
          </span>
        </div>
        <span className="text-muted-foreground">Wallet</span>
        <span className="tabular-nums">
          {formatUsd(walletMicros)}{" "}
          <span className="text-muted-foreground">rolls over · spent last</span>
        </span>
      </div>
    </>
  )
}

function resetLabel(account: BillingAccount | null) {
  if (account === null) {
    return "starts with the first run"
  }

  if (account.state === "trial") {
    return account.trialEndsAt === undefined
      ? "trial"
      : `ends ${shortDate(account.trialEndsAt)}`
  }

  return account.nextGrantAt === undefined
    ? "resets monthly"
    : `resets ${shortDate(account.nextGrantAt)}`
}
