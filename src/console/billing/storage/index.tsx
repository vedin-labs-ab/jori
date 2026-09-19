import { extraStorageMonthlyUsd, plan } from "@contracts/billing"
import { useQuery } from "convex/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Section, SectionHeader } from "@/components/ui/section"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { useBillingCheckout } from "../actions"
import { StorageEdit, type StorageOverview } from "./edit"
import { StorageUsage } from "./usage"

export function StorageSettings({
  organizationId,
}: {
  organizationId: string
}) {
  const overview = useQuery(api.billing.storage.console.overview, {
    organizationId,
  })
  const [editing, setEditing] = useState(false)
  if (overview === undefined) {
    return <Skeleton className="h-28" aria-label="Loading storage" />
  }
  return (
    <Section>
      <SectionHeader
        title="Storage"
        description={`${plan.storageGb} GB included. Extra capacity renews monthly and does not use your AI credit.`}
        action={
          overview.pendingGb === 0 ? (
            <StorageResume organizationId={organizationId} />
          ) : overview.canPurchase && !editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              {overview.hasSubscription ? "Change storage" : "Add storage"}
            </Button>
          ) : undefined
        }
      />
      <StorageUsage organizationId={organizationId} />
      <StorageSubscription overview={overview} />
      {editing && overview.pendingGb !== 0 ? (
        <StorageEdit
          organizationId={organizationId}
          overview={overview}
          close={() => setEditing(false)}
        />
      ) : null}
    </Section>
  )
}

function StorageSubscription({ overview }: { overview: StorageOverview }) {
  return (
    <>
      {overview.extraGb > 0 ? (
        <p className="text-sm text-muted-foreground">
          {overview.extraGb.toLocaleString()} GB extra · $
          {extraStorageMonthlyUsd(overview.extraGb).toFixed(2)}/month before tax
        </p>
      ) : null}
      {overview.pendingGb !== undefined ? (
        <p className="text-sm text-muted-foreground">
          Changes to {overview.pendingGb} GB extra at the next renewal
          {overview.renewsAt === undefined
            ? "."
            : ` on ${new Date(overview.renewsAt).toLocaleDateString()}.`}
        </p>
      ) : null}
    </>
  )
}

function StorageResume({ organizationId }: { organizationId: string }) {
  const checkout = useBillingCheckout(organizationId)
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={checkout.pending !== null}
      onClick={() => void checkout.managePortal()}
    >
      Resume in Manage billing
    </Button>
  )
}
