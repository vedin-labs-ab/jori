import { plan } from "@contracts/billing"
import { ArrowRight } from "lucide-react"
import { type ComponentProps, useState } from "react"
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
import { planFacts, planPriceNote, planTitle } from "@/shared/plan"
import { PlanFacts } from "@/shared/plan/facts"
import { Folder, FolderTab, FolderTabs } from "@/shared/plan/folder"
import { useBillingCheckout } from "./actions"
import { PurchaseAgreement } from "./agreement"

/** There is one plan, so subscribing is confirming it: the plan, then the
 *  agreement, then Polar. */
export function PlanPicker({ organizationId }: { organizationId: string }) {
  const [accepted, setAccepted] = useState(false)
  const checkout = useBillingCheckout(organizationId)

  return (
    <Dialog onOpenChange={() => setAccepted(false)}>
      <DialogTrigger asChild>
        <Button>Subscribe</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to {plan.label}</DialogTitle>
          <DialogDescription>
            One price for the whole organization. Cancel any time.
          </DialogDescription>
        </DialogHeader>
        <PlanOffer />
        <PurchaseAgreement accepted={accepted} onChange={setAccepted} />
        <CheckoutButton
          disabled={!accepted || checkout.pending !== null}
          onClick={() => void checkout.subscribe()}
          pending={checkout.pending === "plan"}
          size="lg"
        />
      </DialogContent>
    </Dialog>
  )
}

/** The plan as the pricing page shows it, at a dialog's width: the same
 *  words and the same numbers a person read before signing up. */
export function PlanOffer() {
  return (
    <div>
      <FolderTabs className="pl-4">
        <FolderTab
          active
          className="h-8 px-3.5 text-xs data-[state=active]:h-9"
          tone="muted"
        >
          {plan.label}
        </FolderTab>
      </FolderTabs>
      <Folder className="p-4" tone="muted">
        <div className="flex items-start justify-between gap-4">
          <p className="font-medium text-base leading-snug tracking-tight">
            {planTitle[0]}
            <br />
            {planTitle[1]}
          </p>
          <p className="shrink-0 text-right">
            <span className="block font-medium text-2xl tabular-nums tracking-tight">
              ${plan.monthlyPriceUsd}
            </span>
            <span className="block text-muted-foreground text-xs">
              {planPriceNote}
            </span>
          </p>
        </div>
        <PlanFacts className="mt-4" dense facts={planFacts} />
      </Folder>
    </div>
  )
}

/** The way on to Polar, wherever the plan is bought. */
export function CheckoutButton({
  pending,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button {...props}>
      Continue to checkout
      {pending ? (
        <Spinner data-icon="inline-end" />
      ) : (
        <ArrowRight data-icon="inline-end" />
      )}
    </Button>
  )
}
