import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type UsageDays } from "@/shared/console/folders/usage/types"
import { UsageView } from "@/shared/console/folders/usage/view"
import { api } from "../../../../convex/_generated/api"

/** The Usage view bound to what its scope spent: the overview the backend
 *  ranks and zero-fills for the window, queried here and handed to the
 *  view as it arrives. */
export function FolderUsage({
  days,
  folderId,
  onDaysChange,
  organizationId,
}: {
  days: UsageDays
  /** Absent across the whole organization. */
  folderId?: GenericId<"folders">
  onDaysChange: (days: UsageDays) => void
  organizationId: string
}) {
  const usage = useQuery(api.folders.usage.overview, {
    organizationId,
    days,
    ...(folderId === undefined ? {} : { folderId }),
  })

  return (
    <UsageView
      days={days}
      folderId={folderId}
      onDaysChange={onDaysChange}
      usage={usage}
    />
  )
}
