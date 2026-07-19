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

/** One sentence with the three knobs inline: trigger, amount, monthly cap. */
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
  const thresholdUsd =
    config?.thresholdMicros !== undefined
      ? microsToDollars(config.thresholdMicros)
      : autoTopUp.defaultThresholdUsd
  const amountUsd = config
    ? microsToDollars(config.amountMicros)
    : autoTopUp.defaultAmountUsd
  const capUsd = config
    ? microsToDollars(config.monthlyCapMicros)
    : autoTopUp.defaultCapUsd
  const current = { thresholdUsd, amountUsd, monthlyCapUsd: capUsd }

  const apply = (next: Partial<typeof current> | null) => {
    configure({
      tenantId,
      config: next === null ? null : { ...current, ...next },
    }).catch((error) => showErrorToast(error, "Could not update auto top-up."))
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-b-xl border-t bg-muted/30 px-6 py-4">
      <div className="min-w-48 flex-1">
        <Label htmlFor="auto-top-up">Auto top-up</Label>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-muted-foreground text-sm">
          {enabled ? (
            <>
              <span>Below</span>
              <InlineAmount
                onChange={(value) => apply({ thresholdUsd: value })}
                options={autoTopUp.thresholdsUsd}
                value={thresholdUsd}
              />
              <span>, add</span>
              <InlineAmount
                onChange={(value) => apply({ amountUsd: value })}
                options={autoTopUp.amountsUsd}
                value={amountUsd}
              />
              <span>· at most</span>
              <InlineAmount
                onChange={(value) => apply({ monthlyCapUsd: value })}
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
            <span>When the balance runs low, add money automatically.</span>
          )}
        </div>
      </div>
      <Switch
        checked={enabled}
        id="auto-top-up"
        onCheckedChange={(checked) => apply(checked ? {} : null)}
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
