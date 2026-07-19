import {
  type BillingInterval,
  formatUsd,
  type PlanKey,
  plans,
  trial,
} from "@contracts/billing"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { shortDate } from "../shared/time"
import { type BillingAccount, useBillingCheckout } from "./actions"

export function PlanCard({
  account,
  tenantId,
}: {
  account: BillingAccount | null
  tenantId: string
}) {
  const checkout = useBillingCheckout(tenantId)
  const subscribed = account !== null && account.plan !== undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Plan
          <PlanBadge account={account} />
        </CardTitle>
        <CardDescription>{planDescription(account)}</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        {planDetail(account)}
      </CardContent>
      <CardFooter className="gap-2">
        {subscribed ? null : <PlanPicker onChoose={checkout.choosePlan} />}
        {account?.hasStripeCustomer ? (
          <Button onClick={checkout.managePortal} variant="outline">
            Manage billing
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}

function PlanBadge({ account }: { account: BillingAccount | null }) {
  if (account === null || account.state === "trial") {
    return <Badge variant="secondary">Trial</Badge>
  }

  if (account.state === "paused") {
    return <Badge variant="destructive">Paused</Badge>
  }

  return (
    <Badge variant="secondary">
      {account.plan === undefined ? "Active" : plans[account.plan].label}
    </Badge>
  )
}

function planDescription(account: BillingAccount | null) {
  if (account === null || account.state === "trial") {
    return `${trial.days} days of everything Milo does, with ${formatUsd(trial.grantMicros)} of usage included.`
  }

  if (account.state === "paused") {
    return "The subscription is paused, so scheduled work is on hold."
  }

  return "One price for the whole organization. Usage is billed at provider list rates."
}

function planDetail(account: BillingAccount | null) {
  if (account === null) {
    return "The trial starts with Milo's first run."
  }

  if (account.state === "trial") {
    return account.trialEndsAt === undefined
      ? "Trial in progress."
      : `Trial ends ${shortDate(account.trialEndsAt)}.`
  }

  if (account.plan === undefined) {
    return "No plan selected."
  }

  const plan = plans[account.plan]
  const price =
    account.interval === "year"
      ? `$${plan.annualPriceUsd} per year`
      : `$${plan.monthlyPriceUsd} per month`

  return account.nextGrantAt === undefined
    ? price
    : `${price}. Included usage resets ${shortDate(account.nextGrantAt)}.`
}

type ChoosePlan = (plan: PlanKey, interval: BillingInterval) => void

function PlanPicker({ onChoose }: { onChoose: ChoosePlan }) {
  const [interval, setInterval] = useState<BillingInterval>("month")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Choose a plan</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a plan</DialogTitle>
          <DialogDescription>
            One price for the whole organization. Every plan includes every
            integration and playbook; usage is billed at provider list rates.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          onValueChange={(value) => setInterval(value as BillingInterval)}
          value={interval}
        >
          <TabsList>
            <TabsTrigger value="month">Monthly</TabsTrigger>
            <TabsTrigger value="year">Annual, 20% off</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-3">
          {Object.values(plans).map((plan) => (
            <PlanOption
              interval={interval}
              key={plan.key}
              onChoose={onChoose}
              plan={plan.key}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PlanOption({
  interval,
  onChoose,
  plan,
}: {
  interval: BillingInterval
  onChoose: ChoosePlan
  plan: PlanKey
}) {
  const details = plans[plan]
  const price =
    interval === "year"
      ? `$${details.annualPriceUsd} / year`
      : `$${details.monthlyPriceUsd} / month`

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
      <div>
        <p className="font-medium">{details.label}</p>
        <p className="text-muted-foreground text-sm">
          {price} · up to {details.memberLimit} members ·{" "}
          {formatUsd(details.includedMonthlyMicros)} usage included monthly
        </p>
      </div>
      <Button onClick={() => onChoose(plan, interval)}>Choose</Button>
    </div>
  )
}
