import { topUp } from "@contracts/billing"
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
import { Input } from "@/components/ui/input"
import { useBillingCheckout } from "./actions"

/**
 * Presets cover the common case; the input takes any whole amount from the
 * minimum up. Checkout also saves the card, which unlocks auto top-up.
 */
export function TopUpDialog({ tenantId }: { tenantId: string }) {
  const checkout = useBillingCheckout(tenantId)
  const [amount, setAmount] = useState(String(topUp.presetsUsd[0]))
  const parsed = Number(amount)
  const valid =
    Number.isInteger(parsed) && parsed >= topUp.minimumUsd && parsed <= 1000

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Top up</Button>
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
          <Input
            inputMode="numeric"
            min={topUp.minimumUsd}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            value={amount}
          />
          {valid ? null : (
            <p className="text-muted-foreground text-sm">
              Any whole amount from ${topUp.minimumUsd} to $1,000.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button disabled={!valid} onClick={() => checkout.topUp(parsed)}>
            Continue to checkout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
