import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { gb } from "./format"
import { StorageFull, StorageNotice } from "./notice"

export function StorageUsage({
  organizationId,
  breakdown = false,
  folderId,
}: {
  organizationId: string
  breakdown?: boolean
  folderId?: GenericId<"folders">
}) {
  const usage = useQuery(api.files.capacity.console.overview, {
    organizationId,
    folderId,
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
          {gb(usage.bytes)}
          {folderId === undefined ? ` / ${gb(usage.capacity)}` : ""} GB
        </span>
      </div>
      {folderId === undefined ? (
        <Progress value={percent} aria-label="Storage used" />
      ) : null}
      {folderId === undefined && usage.bytes === usage.capacity ? (
        <StorageFull />
      ) : null}
      {folderId === undefined &&
      percent >= 90 &&
      usage.bytes < usage.capacity ? (
        <p className="text-sm text-muted-foreground" role="status">
          Storage is nearly full. Add capacity in Billing or remove files you no
          longer need.
        </p>
      ) : null}
      {breakdown && usage.folders.length > 0 ? (
        <dl className="mt-2 divide-y text-sm">
          {usage.folders.map((folder) => (
            <div
              className="flex justify-between gap-4 py-2"
              key={folder.folderId ?? "unfiled"}
            >
              <dt className="truncate">{folder.name}</dt>
              <dd className="shrink-0 tabular-nums">{gb(folder.bytes)} GB</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {folderId === undefined && usage.bytes > usage.capacity ? (
        <StorageNotice organizationId={organizationId} />
      ) : null}
    </div>
  )
}
