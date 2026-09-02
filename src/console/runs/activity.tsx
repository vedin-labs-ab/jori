import { useQuery } from "convex/react"
import { ActivityLog } from "@/shared/console/runs/activity"
import { type ExecutionItem } from "@/shared/console/runs/types"
import { api } from "../../../convex/_generated/api"

/** A run's log, bound to Convex: the activity query for one run in one
 *  organization, rendered through the shared log view. */
export function RunActivity({
  now,
  runId,
  organizationId,
}: {
  now: number
  runId: ExecutionItem["id"]
  organizationId: string
}) {
  const activity = useQuery(api.runs.activity.index.list, {
    runId,
    organizationId,
  })

  return <ActivityLog activity={activity} now={now} />
}
