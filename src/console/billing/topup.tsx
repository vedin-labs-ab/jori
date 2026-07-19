import { topUp } from "@contracts/billing"
import { ArrowUpRight, Plus } from "lucide-react"
import { useState } from "react"
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
import { useBillingCheckout } from "./actions"

/**
 * Presets cover the common case; the input takes any whole amount from the
 * minimum up. Checkout also saves the card, which unlocks auto top-up.
 */
export function TopUpDialog({ tenantId }: { tenantId: string }) {
  const checkout = useBillingCheckout(tenantId)
  const [amount, setAmount] = useState(String(topUp.defaultUsd))
  const parsed = Number(amount)
  const valid =
    Number.isInteger(parsed) &&
    parsed >= topUp.minimumUsd &&
    parsed <= topUp.maximumUsd

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
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
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {topUp.presetsUsd.map((preset) => (
              <Button
                key={preset}
                onClick={() => setAmount(String(preset))}
                size="sm"
                variant={amount === String(preset) ? "default" : "outline"}
              >
                ${preset}
              </Button>
            ))}
          </div>
          <InputGroup>
            <InputGroupInput
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
            <p className="text-muted-foreground text-sm">
              Any whole amount from ${topUp.minimumUsd} to $
              {topUp.maximumUsd.toLocaleString("en-US")}.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={!valid || checkout.pending !== null}
            onClick={() => checkout.topUp(parsed)}
          >
            Continue to checkout
            {checkout.pending === "top-up" ? <Spinner /> : <ArrowUpRight />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
