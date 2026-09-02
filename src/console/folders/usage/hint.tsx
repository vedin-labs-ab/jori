import { formatUsd } from "@contracts/billing"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { UsageHintButton } from "@/shared/console/folders/usage/hint"
import { ConsoleHeaderAside } from "@/shared/console/layout"
import { api } from "../../../../convex/_generated/api"

/** What a folder — or the whole tree — has cost lately, beside its crumb.
 *  A figure this small is not worth a loading state of its own: the hint
 *  shows nothing, divider included, until the number is real. */
export function FolderUsageHint({
  folderId,
  organizationId,
}: {
  /** Absent across the whole organization. */
  folderId?: GenericId<"folders">
  organizationId: string
}) {
  const spend = useQuery(api.folders.usage.spend, {
    organizationId,
    ...(folderId === undefined ? {} : { folderId }),
  })

  if (spend === undefined) {
    return null
  }

  return (
    <ConsoleHeaderAside>
      <UsageHintButton amount={formatUsd(spend.micros)} folderId={folderId} />
    </ConsoleHeaderAside>
  )
}
