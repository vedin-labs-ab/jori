import { formatUsd, plan } from "@contracts/billing"
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
import { useBillingCheckout } from "./actions"
import { PurchaseAgreement } from "./agreement"

/** There is one plan, so choosing it is confirming it: the price, what it
 *  includes, and the purchase agreement, then Stripe. */
export function PlanPicker({ organizationId }: { organizationId: string }) {
  const [accepted, setAccepted] = useState(false)
  const checkout = useBillingCheckout(organizationId)

  return (
    <Dialog onOpenChange={() => setAccepted(false)}>
      <DialogTrigger asChild>
        <Button>Choose a plan</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to {plan.label}</DialogTitle>
          <DialogDescription>
            One price for the whole organization. Every integration included;
            usage is billed at provider list rates.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border p-4">
          <p className="font-medium">{plan.label}</p>
          <p className="text-muted-foreground text-sm">
            ${plan.monthlyPriceUsd} / month · everyone included ·{" "}
            {formatUsd(plan.monthlyAllowanceMicros)} usage included monthly
          </p>
        </div>
        <PurchaseAgreement accepted={accepted} onChange={setAccepted} />
        <Button
          disabled={!accepted || checkout.pending !== null}
          onClick={() => void checkout.subscribe()}
        >
          {checkout.pending === "plan" ? <Spinner /> : <ArrowRight />}
          Continue to checkout
        </Button>
      </DialogContent>
    </Dialog>
  )
}
