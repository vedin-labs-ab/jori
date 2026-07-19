import {
  type BillingInterval,
  formatUsd,
  type PlanKey,
  plans,
} from "@contracts/billing"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBillingCheckout } from "./actions"

export function PlanPicker({ tenantId }: { tenantId: string }) {
  const checkout = useBillingCheckout(tenantId)
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
              onChoose={checkout.choosePlan}
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
  onChoose: (plan: PlanKey, interval: BillingInterval) => void
  plan: PlanKey
}) {
  const details = plans[plan]
  const price =
    interval === "year"
      ? `$${details.annualPriceUsd.toLocaleString("en-US")} / year`
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
