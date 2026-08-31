import { topUp } from "@contracts/billing"
import { ArrowUpRight, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { ConsoleFilterToggle } from "../shared/layout"
import { DialogForm } from "../shared/materials/form"
import { useBillingCheckout } from "./actions"

const presetOptions = topUp.presetsUsd.map((preset) => ({
  label: `$${preset}`,
  value: String(preset),
}))

/**
 * Presets cover the common case; the input takes any whole amount from the
 * minimum up. Checkout also saves the card, which unlocks auto top-up.
 */
export function TopUpDialog({
  available,
  organizationId,
}: {
  available: boolean
  organizationId: string
}) {
  const checkout = useBillingCheckout(organizationId)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(topUp.defaultUsd))
  const parsed = Number(amount)
  const valid =
    Number.isInteger(parsed) &&
    parsed >= topUp.minimumUsd &&
    parsed <= topUp.maximumUsd

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (nextOpen && !available) {
          toast.info("Choose or reactivate a plan before topping up.", {
            id: "billing-plan-required-top-up",
          })
          return
        }

        setOpen(nextOpen)
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button aria-disabled={!available} variant="outline">
          <Plus />
          Top up
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Top up the wallet</DialogTitle>
          <DialogDescription>
            Prepaid usage that rolls over until it is used. The card is saved
            for auto top-ups.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={!valid || checkout.pending !== null}
          onSubmit={() => checkout.topUp(parsed)}
        >
          <div className="flex flex-col gap-3">
            <ConsoleFilterToggle
              label="Amount"
              onValueChange={setAmount}
              options={presetOptions}
              value={amount}
            />
            <div className="flex flex-col gap-1.5">
              <InputGroup>
                <InputGroupInput
                  // The toggle above owns the "Amount" label, and this field
                  // is its free-entry twin rather than a control it names. It
                  // had no name of its own, which announced it as a bare
                  // spinbutton on the one path in the app that charges a card.
                  aria-label="Top-up amount in US dollars"
                  aria-describedby={valid ? undefined : "top-up-amount-issue"}
                  aria-invalid={valid ? undefined : true}
                  inputMode="numeric"
                  min={topUp.minimumUsd}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  value={amount}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>$</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              {valid ? null : (
                <p
                  className="text-destructive text-xs"
                  id="top-up-amount-issue"
                  role="alert"
                >
                  Any whole amount from ${topUp.minimumUsd} to $
                  {topUp.maximumUsd.toLocaleString("en-US")}.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!valid || checkout.pending !== null}
              type="submit"
            >
              Continue to checkout
              {checkout.pending === "top-up" ? <Spinner /> : <ArrowUpRight />}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}
