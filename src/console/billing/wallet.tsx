import {
  autoTopUp,
  formatUsd,
  microsPerDollar,
  plans,
  trial,
} from "@contracts/billing"
import { useMutation } from "convex/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import { TopUpDialog } from "./topup"

export function WalletCard({
  account,
  tenantId,
}: {
  account: BillingAccount | null
  tenantId: string
}) {
  const includedMicros = account?.includedMicros ?? trial.grantMicros
  const grantMicros =
    account === null || account.plan === undefined
      ? trial.grantMicros
      : plans[account.plan].includedMonthlyMicros
  const walletMicros = account?.walletMicros ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
        <CardDescription>
          Included usage resets monthly. Wallet money is prepaid and rolls over;
          every run's cost lands in the activity below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Included this cycle</span>
            <span className="text-muted-foreground tabular-nums">
              {formatUsd(Math.max(includedMicros, 0))} of{" "}
              {formatUsd(grantMicros)} left
            </span>
          </div>
          <Progress
            value={Math.max(
              0,
              Math.min(100, (includedMicros / grantMicros) * 100)
            )}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Wallet</p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {formatUsd(walletMicros)}
            </p>
          </div>
          <TopUpDialog tenantId={tenantId} />
        </div>
        <AutoTopUpControls account={account} tenantId={tenantId} />
      </CardContent>
    </Card>
  )
}

function AutoTopUpControls({
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
    ? config.amountMicros / microsPerDollar
    : autoTopUp.amountsUsd[0]
  const capUsd = config
    ? config.monthlyCapMicros / microsPerDollar
    : autoTopUp.monthlyCapsUsd[2]

  const apply = (next: { amountUsd: number; monthlyCapUsd: number } | null) => {
    configure({ tenantId, config: next }).catch((error) =>
      showErrorToast(error, "Could not update auto top-up.")
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="auto-top-up">Auto top-up</Label>
          <p className="text-muted-foreground text-sm">
            When the balance drops below {formatUsd(autoTopUp.thresholdMicros)},
            add money automatically.
          </p>
        </div>
        <Switch
          checked={enabled}
          id="auto-top-up"
          onCheckedChange={(checked) =>
            apply(
              checked
                ? { amountUsd: amountUsd ?? 25, monthlyCapUsd: capUsd ?? 200 }
                : null
            )
          }
        />
      </div>
      {enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <AmountSelect
            label="Add"
            onChange={(value) =>
              apply({ amountUsd: value, monthlyCapUsd: capUsd ?? 200 })
            }
            options={autoTopUp.amountsUsd}
            value={amountUsd ?? 25}
          />
          <AmountSelect
            label="Monthly cap"
            onChange={(value) =>
              apply({ amountUsd: amountUsd ?? 25, monthlyCapUsd: value })
            }
            options={autoTopUp.monthlyCapsUsd}
            value={capUsd ?? 200}
          />
          {account !== null && account.autoTopUpUsedMicros > 0 ? (
            <p className="text-muted-foreground text-sm">
              {formatUsd(account.autoTopUpUsedMicros)} used this month
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function AmountSelect({
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
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <Select
        onValueChange={(next) => onChange(Number(next))}
        value={String(value)}
      >
        <SelectTrigger className="w-24" size="sm">
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
    </div>
  )
}
