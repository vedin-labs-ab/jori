import { autoTopUp, formatUsd, microsToDollars } from "@contracts/billing"
import { useMutation } from "convex/react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { type BillingAccount } from "./actions"

/**
 * One sentence with the two knobs inline. The threshold is fixed policy, so
 * it reads as copy rather than a control.
 */
export function AutoTopUpRow({
  account,
  tenantId,
}: {
  account: BillingAccount | null
  tenantId: string
}) {
  const configure = useMutation(api.billing.console.configureAutoTopUp)
  const config = account?.autoTopUp
  const enabled = config !== undefined
  const amountUsd = config
    ? microsToDollars(config.amountMicros)
    : autoTopUp.defaultAmountUsd
  const capUsd = config
    ? microsToDollars(config.monthlyCapMicros)
    : autoTopUp.defaultCapUsd

  const apply = (next: { amountUsd: number; monthlyCapUsd: number } | null) => {
    configure({ tenantId, config: next }).catch((error) =>
      showErrorToast(error, "Could not update auto top-up.")
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t px-6 py-4">
      <div className="min-w-48 flex-1">
        <Label htmlFor="auto-top-up">Auto top-up</Label>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-muted-foreground text-sm">
          {enabled ? (
            <>
              <span>Below {formatUsd(autoTopUp.thresholdMicros)}, add</span>
              <InlineAmount
                onChange={(value) =>
                  apply({ amountUsd: value, monthlyCapUsd: capUsd })
                }
                options={autoTopUp.amountsUsd}
                value={amountUsd}
              />
              <span>· at most</span>
              <InlineAmount
                onChange={(value) => apply({ amountUsd, monthlyCapUsd: value })}
                options={autoTopUp.monthlyCapsUsd}
                value={capUsd}
              />
              <span>a month</span>
              {account !== null && account.autoTopUpUsedMicros > 0 ? (
                <span>
                  · {formatUsd(account.autoTopUpUsedMicros)} used so far
                </span>
              ) : null}
            </>
          ) : (
            <span>
              When the balance drops below{" "}
              {formatUsd(autoTopUp.thresholdMicros)}, add money automatically.
            </span>
          )}
        </div>
      </div>
      <Switch
        checked={enabled}
        id="auto-top-up"
        onCheckedChange={(checked) =>
          apply(checked ? { amountUsd, monthlyCapUsd: capUsd } : null)
        }
      />
    </div>
  )
}

function InlineAmount({
  onChange,
  options,
  value,
}: {
  onChange: (value: number) => void
  options: number[]
  value: number
}) {
  return (
    <Select
      onValueChange={(next) => onChange(Number(next))}
      value={String(value)}
    >
      <SelectTrigger className="h-7 w-20" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={String(option)}>
            ${option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
