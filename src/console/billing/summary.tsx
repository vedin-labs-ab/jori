import { formatUsd, plans, trial } from "@contracts/billing"
import { CreditCard } from "lucide-react"
import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { FieldHelp } from "../automations/help"
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
  organizationId,
}: {
  account: BillingAccount | null
  organizationId: string
}) {
  return (
    <div className="grid min-w-0 lg:grid-cols-[5fr_7fr]">
      <PlanCell account={account} organizationId={organizationId} />
      <CardContent className="min-w-0 pt-0 pb-4 lg:py-4">
        <AvailableCell account={account} organizationId={organizationId} />
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
  const subscribed = account !== null && account.plan !== undefined

  return (
    <CardContent className="min-w-0 py-4">
      <MetricLabel>Plan</MetricLabel>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-medium text-2xl tracking-tight">
          {planName(account)}
        </span>
        {account?.state === "paused" ? (
          <Badge variant="destructive">Paused</Badge>
        ) : null}
      </div>
      <p className="mt-1.5 text-xs/relaxed text-muted-foreground">
        {planDetail(account)}
      </p>
      <div className="mt-5 flex gap-2">
        {subscribed ? null : <PlanPicker organizationId={organizationId} />}
        {account?.hasStripeCustomer ? (
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
  organizationId,
}: {
  account: BillingAccount | null
  organizationId: string
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
      <div className="flex min-w-0 flex-wrap items-start gap-3">
        <div className="min-w-32 flex-1">
          <MetricLabel>Available usage</MetricLabel>
          <p className="mt-1.5 font-medium text-2xl tabular-nums tracking-tight">
            {formatUsd(includedMicros + walletMicros)}
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <TopUpDialog
            available={account?.canFundWallet ?? false}
            organizationId={organizationId}
          />
        </div>
      </div>
      <div className="mt-1.5 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2.5 text-sm sm:items-center">
        <span className="text-muted-foreground">
          {account === null || account.state === "trial" ? "Trial" : "Monthly"}
        </span>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Progress
            className="order-2 h-1.5 w-full sm:order-none sm:flex-1"
            value={Math.min(100, (includedMicros / grantMicros) * 100)}
          />
          <span className="tabular-nums sm:whitespace-nowrap">
            {formatUsd(includedMicros)}{" "}
            <span className="text-muted-foreground">
              of {formatUsd(grantMicros)} · {resetLabel(account)}
            </span>
          </span>
        </div>
        <span className="text-muted-foreground">Wallet</span>
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 tabular-nums">
          {formatUsd(walletMicros)}{" "}
          <span className="text-muted-foreground">· rolls over</span>
          <FieldHelp label="How the wallet is spent" side="top">
            Wallet money is prepaid and never expires. Runs spend the monthly
            allowance first; the wallet covers the rest.
          </FieldHelp>
        </span>
      </div>
    </>
  )
}

function MetricLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs/relaxed font-medium text-muted-foreground">
      {children}
    </p>
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
