import { formatUsd, plan } from "@contracts/billing"
import { Progress } from "@/components/ui/progress"
import { shortDate } from "@/shared/console/time"
import { FieldHelp } from "@/shared/field"
import { type BillingAccount } from "./actions"
import { TopUpDialog } from "./topup"

/** Current organization credit, independent of any spend-reporting window. */
export function Balance({
  account,
  organizationId,
}: {
  account: BillingAccount | null
  organizationId: string
}) {
  // Without a plan there is no allowance to meter, so the monthly row says
  // when one starts instead of measuring nothing against nothing.
  const subscribed =
    account === null || account.state.kind === "unsubscribed" ? null : account
  const remainingMicros = Math.max(account?.micros.allowance ?? 0, 0)
  const walletMicros = account?.micros.wallet ?? 0
  // A manual allowance can lift the balance above the plan's, so the
  // denominator follows it.
  const allowanceMicros = Math.max(plan.monthlyAllowanceMicros, remainingMicros)

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-start gap-3">
        <div className="min-w-32 flex-1">
          <p className="text-xs/relaxed font-medium text-muted-foreground">
            Available credit
          </p>
          <p className="mt-1.5 font-medium text-2xl tabular-nums tracking-tight">
            {formatUsd(remainingMicros + walletMicros)}
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <TopUpDialog
            available={account?.canFundWallet ?? false}
            organizationId={organizationId}
          />
        </div>
      </div>
      <div className="mt-1.5 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2.5 text-sm sm:items-center">
        <span className="text-muted-foreground">Monthly</span>
        {subscribed === null ? (
          <span className="text-muted-foreground">Starts with a plan</span>
        ) : (
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Progress
              className="order-2 h-1.5 w-full sm:order-none sm:flex-1"
              value={Math.min(100, (remainingMicros / allowanceMicros) * 100)}
            />
            <span className="tabular-nums sm:whitespace-nowrap">
              {formatUsd(remainingMicros)}{" "}
              <span className="text-muted-foreground">
                of {formatUsd(allowanceMicros)} · {resetLabel(subscribed)}
              </span>
            </span>
          </div>
        )}
        <span className="text-muted-foreground">Wallet</span>
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 tabular-nums">
          {formatUsd(walletMicros)}{" "}
          <span className="text-muted-foreground">· rolls over</span>
          <FieldHelp label="How the wallet is spent" side="top">
            Wallet money is prepaid and never expires. Runs spend the monthly
            allowance first; the wallet covers the rest.
          </FieldHelp>
        </span>
      </div>
    </>
  )
}

function resetLabel(account: BillingAccount) {
  return account.renewsAt === undefined
    ? "resets monthly"
    : `resets ${shortDate(account.renewsAt)}`
}
