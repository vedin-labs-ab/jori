import {
  type BillingInterval,
  formatUsd,
  type PlanKey,
  plans,
} from "@contracts/billing"
import { ArrowRight } from "lucide-react"
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
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBillingCheckout } from "./actions"

export function PlanPicker({ organizationId }: { organizationId: string }) {
  const checkout = useBillingCheckout(organizationId)
  const [interval, setInterval] = useState<BillingInterval>("month")
  const [chosen, setChosen] = useState<PlanKey | null>(null)

  const choose = (plan: PlanKey) => {
    setChosen(plan)
    void checkout.choosePlan(plan, interval)
  }

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
            integration; usage is billed at provider list rates.
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
              onChoose={choose}
              pending={checkout.pending !== null}
              plan={plan.key}
              spinning={checkout.pending === "plan" && chosen === plan.key}
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
  pending,
  plan,
  spinning,
}: {
  interval: BillingInterval
  onChoose: (plan: PlanKey) => void
  pending: boolean
  plan: PlanKey
  spinning: boolean
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
          {formatUsd(details.monthlyAllowanceMicros)} usage included monthly
        </p>
      </div>
      <Button disabled={pending} onClick={() => onChoose(plan)}>
        {spinning ? <Spinner /> : <ArrowRight />}
        Choose
      </Button>
    </div>
  )
}
