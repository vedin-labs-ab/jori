import {
  extraStorageMonthlyUsd,
  plan,
  storage,
  termsVersion,
} from "@contracts/billing"
import { useAction } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { useId, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../../convex/_generated/api"
import { billingReturnUrl } from "../actions"
import { PurchaseAgreement } from "../agreement"

export type StorageOverview = FunctionReturnType<
  typeof api.billing.storage.console.overview
>

export function StorageEdit({
  organizationId,
  overview,
  close,
}: {
  organizationId: string
  overview: StorageOverview
  close: () => void
}) {
  const id = useId()
  const form = useStorageEdit(organizationId, overview, close)
  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>Extra storage in GB</Label>
        <Input
          id={id}
          type="number"
          min={overview.hasSubscription ? 0 : storage.minimumExtraGb}
          max={storage.maximumExtraGb}
          step={1}
          value={form.amount}
          onChange={(event) => form.setAmount(event.target.value)}
          disabled={form.pending}
        />
      </div>
      <p className="text-sm">
        {form.valid
          ? `${(plan.storageGb + form.extraGb).toLocaleString()} GB total for $${extraStorageMonthlyUsd(form.extraGb).toFixed(2)}/month extra, before tax.`
          : `Choose ${storage.minimumExtraGb}–${storage.maximumExtraGb.toLocaleString()} GB${overview.hasSubscription ? ", or 0 to cancel extra storage" : ""}.`}
      </p>
      <p className="text-sm text-muted-foreground">
        {changeDescription(overview, form.extraGb)}
      </p>
      <PurchaseAgreement accepted={form.accepted} onChange={form.setAccepted} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={form.disabled} onClick={() => void form.save()}>
          {form.pending ? "Updating…" : submitLabel(overview, form.extraGb)}
        </Button>
        <Button variant="ghost" disabled={form.pending} onClick={close}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function useStorageEdit(
  organizationId: string,
  overview: StorageOverview,
  close: () => void
) {
  const checkout = useAction(api.billing.storage.actions.checkout)
  const change = useAction(api.billing.storage.actions.change)
  const [amount, setAmount] = useState(String(overview.extraGb || 30))
  const [accepted, setAccepted] = useState(false)
  const [pending, setPending] = useState(false)
  const { extraGb, valid } = capacityInput(amount, overview.hasSubscription)
  const unchanged =
    extraGb === overview.extraGb && overview.pendingGb === undefined
  const disabled =
    !valid ||
    !accepted ||
    pending ||
    !overview.canPurchase ||
    overview.pendingGb === 0 ||
    unchanged
  const save = async () => {
    if (disabled) {
      return
    }
    setPending(true)
    try {
      const args = {
        organizationId,
        extraGb,
        businessPurchase: true as const,
        termsVersion,
      } as const
      if (overview.hasSubscription) {
        await change(args)
        toast.success(
          extraGb < overview.extraGb
            ? "Storage reduction scheduled for renewal."
            : "Storage updated."
        )
        close()
      } else {
        const result = await checkout({
          ...args,
          returnUrl: billingReturnUrl(true),
        })
        window.location.assign(result.url)
      }
    } catch (error) {
      showErrorToast(error, "Could not update storage.")
    } finally {
      setPending(false)
    }
  }
  return {
    amount,
    setAmount,
    accepted,
    setAccepted,
    pending,
    extraGb,
    valid,
    disabled,
    save,
  }
}

function submitLabel(overview: StorageOverview, extraGb: number) {
  if (!overview.hasSubscription) {
    return "Continue to checkout"
  }
  if (extraGb < overview.extraGb) {
    return "Schedule reduction"
  }
  return extraGb === overview.extraGb
    ? "Keep current capacity"
    : "Confirm increase"
}

function changeDescription(overview: StorageOverview, extraGb: number) {
  if (extraGb < overview.extraGb) {
    return "The reduction takes effect at renewal. If your files no longer fit, uploads stop. You have 30 days after notice to download and remove excess files or restore capacity before the newest excess files are deleted."
  }
  if (!overview.hasSubscription) {
    return "Polar shows the total before purchase. Your extra capacity starts after payment and renews monthly until canceled."
  }
  if (extraGb === overview.extraGb) {
    return overview.pendingGb === undefined
      ? "Choose a different capacity to make a change."
      : "Keep your current capacity and cancel the scheduled reduction."
  }
  if (!Number.isFinite(extraGb)) {
    return "Capacity increases after payment."
  }
  return `The prorated increase is charged now, up to $${extraStorageMonthlyUsd(Math.max(0, extraGb - overview.extraGb)).toFixed(2)} before tax. Capacity increases after payment.`
}

function capacityInput(amount: string, hasSubscription: boolean) {
  const extraGb = Number(amount)
  const valid =
    amount.trim() !== "" &&
    Number.isInteger(extraGb) &&
    ((extraGb === 0 && hasSubscription) ||
      (extraGb >= storage.minimumExtraGb && extraGb <= storage.maximumExtraGb))
  return { extraGb, valid }
}
