import { autoTopUp, formatUsd, microsToDollars } from "@contracts/billing"
import { useMutation } from "convex/react"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { showErrorToast } from "@/shared/console/error"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { api } from "../../../convex/_generated/api"
import { type BillingAccount } from "./actions"

export function AutoTopUpRow({
  available,
  ...props
}: {
  available: boolean
  account: BillingAccount | null
  organizationId: string
}) {
  if (!available) {
    return (
      <ConsoleEmptyState
        className="rounded-none border-t"
        description="Use Top up to add prepaid usage whenever you need it."
        icon={RefreshCw}
        title="Automatic top-ups are coming soon"
      />
    )
  }

  return <AutoTopUpSettings {...props} />
}

/** One sentence with the three knobs inline: trigger, amount, monthly cap. */
function AutoTopUpSettings({
  account,
  organizationId,
}: {
  account: BillingAccount | null
  organizationId: string
}) {
  const configure = useMutation(api.billing.console.configureAutoTopUp)
  const available = account?.canFundWallet ?? false
  const policy = available ? account?.topUp.micros : undefined
  const enabled = policy !== undefined
  const thresholdUsd = policy
    ? microsToDollars(policy.threshold)
    : autoTopUp.defaultThresholdUsd
  const amountUsd = policy
    ? microsToDollars(policy.amount)
    : autoTopUp.defaultAmountUsd
  const capUsd = policy ? microsToDollars(policy.cap) : autoTopUp.defaultCapUsd
  const current = { thresholdUsd, amountUsd, monthlyCapUsd: capUsd }
  const description = available
    ? "When the balance runs low, add money automatically."
    : "Available once the organization is on an active plan."

  const apply = (next: Partial<typeof current> | null) => {
    configure({
      organizationId,
      config: next === null ? null : { ...current, ...next },
    }).catch((error) => showErrorToast(error, "Could not update auto top-up."))
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t bg-muted/30 p-4">
      <div className="min-w-48 flex-1">
        <Label htmlFor="auto-top-up">Auto top-up</Label>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs/relaxed text-muted-foreground">
          {enabled ? (
            <>
              <span>Below</span>
              <span className="flex items-center">
                <InlineAmount
                  label="Auto top-up balance threshold"
                  onChange={(value) => apply({ thresholdUsd: value })}
                  options={autoTopUp.thresholdsUsd}
                  value={thresholdUsd}
                />
                <span className="whitespace-pre">, add</span>
              </span>
              <InlineAmount
                label="Auto top-up amount"
                onChange={(value) => apply({ amountUsd: value })}
                options={autoTopUp.amountsUsd}
                value={amountUsd}
              />
              <span>· at most</span>
              <InlineAmount
                label="Monthly auto top-up limit"
                onChange={(value) => apply({ monthlyCapUsd: value })}
                options={autoTopUp.monthlyCapsUsd}
                value={capUsd}
              />
              <span>a month</span>
              {account !== null && account.topUp.charged.micros > 0 ? (
                <span>
                  · {formatUsd(account.topUp.charged.micros)} used so far
                </span>
              ) : null}
            </>
          ) : (
            <span>{description}</span>
          )}
        </div>
      </div>
      <AutoTopUpSwitch
        available={available}
        checked={enabled}
        onCheckedChange={(checked) => apply(checked ? {} : null)}
      />
    </div>
  )
}

function AutoTopUpSwitch({
  available,
  checked,
  onCheckedChange,
}: {
  available: boolean
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Switch
      aria-disabled={!available}
      checked={checked}
      className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      id="auto-top-up"
      onCheckedChange={(nextChecked) => {
        if (available) {
          onCheckedChange(nextChecked)
        } else {
          toast.info("Choose or reactivate a plan to use auto top-up.", {
            id: "billing-plan-required-auto-top-up",
          })
        }
      }}
    />
  )
}

function InlineAmount({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: number) => void
  options: number[]
  value: number
}) {
  return (
    <Select
      onValueChange={(next) => onChange(Number(next))}
      value={String(value)}
    >
      <SelectTrigger aria-label={label} className="h-7 w-20" size="sm">
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
