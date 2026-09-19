import { useQuery } from "convex/react"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../convex/_generated/api"
import { Balance } from "./balance"

/** Mounted on organization Usage only. Billing's query and purchase action
 * enforce the same organization access here as in Billing settings. */
export function UsageBalance({ organizationId }: { organizationId: string }) {
  const overview = useQuery(api.billing.console.overview, { organizationId })

  return (
    <section aria-label="Organization credit" className="border-b pb-4">
      <div className="max-w-2xl">
        {overview === undefined ? (
          <Skeleton aria-label="Loading available credit" className="h-28" />
        ) : (
          <Balance account={overview.account} organizationId={organizationId} />
        )}
      </div>
    </section>
  )
}
