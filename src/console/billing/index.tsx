import { useQuery } from "convex/react"
import { useEffect } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { SectionGroup } from "@/components/ui/section"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../convex/_generated/api"
import { type BillingAccount } from "./actions"
import { Activity } from "./activity"
import { AutoTopUpRow } from "./autotopup"
import { SummaryBand } from "./summary"

export function BillingSettings({
  organizationId,
}: {
  organizationId: string
}) {
  useBillingReturnToasts()

  const overview = useQuery(api.billing.console.overview, { organizationId })

  if (overview === undefined) {
    return <Skeleton className="h-56" />
  }

  return (
    <SectionGroup>
      <StateAlert account={overview.account} />
      <Card className="min-w-0 gap-0 py-0">
        <SummaryBand
          account={overview.account}
          organizationId={organizationId}
        />
        <AutoTopUpRow
          account={overview.account}
          organizationId={organizationId}
        />
      </Card>
      <Activity entries={overview.entries} />
    </SectionGroup>
  )
}

function StateAlert({ account }: { account: BillingAccount | null }) {
  if (account === null) {
    return null
  }

  if (account.state.kind === "paused") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Subscription paused</AlertTitle>
        <AlertDescription>
          Scheduled work is on hold and mentions go unanswered. Choose a plan or
          fix the payment method to get Jori working again.
        </AlertDescription>
      </Alert>
    )
  }

  // No plan is not a warning: the plan cell says so and offers the plan,
  // and an empty balance is what no plan looks like, not a shortfall.
  if (account.state.kind === "unsubscribed") {
    return null
  }

  if (account.micros.allowance + account.micros.wallet <= 0) {
    return (
      <Alert>
        <AlertTitle>Out of usage</AlertTitle>
        <AlertDescription>
          New work is paused until the wallet is topped up or the monthly
          allowance resets.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

const billingReturnToasts: Record<string, string> = {
  subscribed:
    "Checkout submitted. Your plan updates once payment is confirmed.",
  "topped-up":
    "Top-up submitted. Your balance updates once payment is confirmed.",
}

function useBillingReturnToasts() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const status = url.searchParams.get("billing")

    if (status === null) {
      return
    }

    const message = billingReturnToasts[status]

    if (message !== undefined) {
      toast.info(message, { id: `billing-${status}` })
    }

    url.searchParams.delete("billing")
    window.history.replaceState(window.history.state, "", url)
  }, [])
}
