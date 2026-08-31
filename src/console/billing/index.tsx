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

  const trialEnded =
    account.state.kind === "trial" && account.state.endsAt < Date.now()

  if (trialEnded) {
    return (
      <Alert>
        <AlertTitle>Trial ended</AlertTitle>
        <AlertDescription>
          Jori is paused until the organization is on a plan. Everything is
          saved and resumes the moment you subscribe.
        </AlertDescription>
      </Alert>
    )
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
  subscribed: "Plan activated. Jori is on the clock.",
  "topped-up": "Wallet topped up.",
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
      toast.success(message, { id: `billing-${status}` })
    }

    url.searchParams.delete("billing")
    window.history.replaceState(window.history.state, "", url)
  }, [])
}
