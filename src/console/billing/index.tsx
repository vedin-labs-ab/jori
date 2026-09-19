import { useQuery } from "convex/react"
import { useEffect } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { SectionGroup } from "@/components/ui/section"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../convex/_generated/api"
import { type BillingAccount } from "./actions"
import { billingReturnToasts, billingSearch } from "./actions/return"
import { Activity } from "./activity"
import { AutoTopUpRow } from "./autotopup"
import { StorageSettings } from "./storage"
import { SummaryBand } from "./summary"

export function BillingSettings({
  organizationId,
}: {
  organizationId: string
}) {
  useBillingReturnToasts()

  const overview = useQuery(api.billing.console.overview, { organizationId })
  const retention = useQuery(api.retention.console.status, { organizationId })

  if (overview === undefined) {
    return <Skeleton className="h-56" />
  }

  return (
    <SectionGroup>
      <StateAlert account={overview.account} />
      <Card className="min-w-0 gap-0 py-0">
        <SummaryBand
          account={overview.account}
          deletesAt={
            retention?.state === "retained" ? retention.deletesAt : undefined
          }
          organizationId={organizationId}
        />
        <AutoTopUpRow
          available={overview.automaticTopUpsAvailable}
          account={overview.account}
          organizationId={organizationId}
        />
      </Card>
      <StorageSettings organizationId={organizationId} />
      <Activity entries={overview.entries} />
    </SectionGroup>
  )
}

function StateAlert({ account }: { account: BillingAccount | null }) {
  if (account === null) {
    return null
  }

  // No plan and a paused plan are not warnings up here: the plan cell says
  // so beside the button that fixes it, and an empty balance is what either
  // looks like, not a shortfall.
  if (account.state.kind !== "active") {
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

function useBillingReturnToasts() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const { billing: status } = billingSearch({
      billing: url.searchParams.get("billing"),
    })

    if (status === undefined) {
      return
    }

    const message =
      status === "portal" || status === "canceled"
        ? undefined
        : billingReturnToasts[status]

    if (message !== undefined) {
      toast.info(message, { id: `billing-${status}` })
    }

    url.searchParams.delete("billing")
    window.history.replaceState(window.history.state, "", url)
  }, [])
}
