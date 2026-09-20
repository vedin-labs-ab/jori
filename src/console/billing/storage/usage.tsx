import { useQuery } from "convex/react"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { gb } from "./format"
import { StorageFull, StorageNotice } from "./notice"

/** How much of the organization's file capacity is used, and what to do as
 *  it fills. */
export function StorageUsage({ organizationId }: { organizationId: string }) {
  const usage = useQuery(api.files.capacity.console.overview, {
    organizationId,
  })
  if (usage === undefined) {
    return <Skeleton className="h-12" aria-label="Loading storage usage" />
  }
  const percent = Math.min(100, (usage.bytes / usage.capacity) * 100)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-4 text-sm">
        <span>Files</span>
        <span className="tabular-nums">
          {gb(usage.bytes)} / {gb(usage.capacity)} GB
        </span>
      </div>
      <Progress value={percent} aria-label="Storage used" />
      {usage.bytes === usage.capacity ? <StorageFull /> : null}
      {percent >= 90 && usage.bytes < usage.capacity ? (
        <p className="text-sm text-muted-foreground" role="status">
          Storage is nearly full. Add capacity in Billing or remove files you no
          longer need.
        </p>
      ) : null}
      {usage.bytes > usage.capacity ? (
        <StorageNotice organizationId={organizationId} />
      ) : null}
    </div>
  )
}
