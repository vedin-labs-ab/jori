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
import { PurchaseAgreement } from "./agreement"

export function PlanPicker({ organizationId }: { organizationId: string }) {
  const [accepted, setAccepted] = useState(false)
  const checkout = useBillingCheckout(organizationId)
  const [interval, setInterval] = useState<BillingInterval>("month")
  const [chosen, setChosen] = useState<PlanKey | null>(null)

  const choose = (plan: PlanKey) => {
    if (!accepted) {
      return
    }
    setChosen(plan)
    void checkout.choosePlan(plan, interval)
  }

  return (
    <Dialog onOpenChange={() => setAccepted(false)}>
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
        <PurchaseAgreement accepted={accepted} onChange={setAccepted} />
        <div className="flex flex-col gap-3">
          {Object.values(plans).map((plan) => (
            <PlanOption
              interval={interval}
              key={plan.key}
              onChoose={choose}
              pending={!accepted || checkout.pending !== null}
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
