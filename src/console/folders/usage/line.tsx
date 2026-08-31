import { formatUsd } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { api } from "../../../../convex/_generated/api"
import { countLabel } from "../../shared/count"
import { defaultUsageDays } from "./types"

/**
 * What this folder has cost lately, as one line above its contents — the
 * question "is this folder expensive?" answered before it has to be asked,
 * and a way through to the whole picture. A folder that has spent nothing
 * says nothing.
 */
export function FolderUsageLine({
  folderId,
  organizationId,
}: {
  folderId: GenericId<"folders">
  organizationId: string
}) {
  const usage = useQuery(api.folders.usage.overview, {
    organizationId,
    folderId,
    days: defaultUsageDays,
  })

  if (
    usage === undefined ||
    (usage.totals.micros === 0 && usage.totals.ended === 0)
  ) {
    return null
  }

  return (
    <div className="border-b px-4 py-2 md:px-6">
      <Link
        className="text-muted-foreground text-xs tabular-nums underline-offset-2 hover:text-foreground hover:underline"
        params={{ folderId }}
        search={{ usage: defaultUsageDays }}
        to="/folders/$folderId"
      >
        {formatUsd(usage.totals.micros)} ·{" "}
        {countLabel(usage.totals.ended, "run")}
        {usage.totals.failed === 0 ? "" : ` · ${usage.totals.failed} failed`} in
        the last {defaultUsageDays} days
      </Link>
    </div>
  )
}
