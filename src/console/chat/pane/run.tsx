import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { displayNowForRun, useExecutionClock } from "@/shared/console/runs/time"
import { type ExecutionItem } from "@/shared/console/runs/types"
import { api } from "../../../../convex/_generated/api"
import { useRunRowSlots } from "../../runs/list/slots"

/** A run in the pane: the row the Activity page lists it as, open to
 *  its detail, over the same log, requests, and stop control. */
export function PaneRun({
  id,
  organizationId,
}: {
  id: string
  organizationId: string
}) {
  const execution = useQuery(api.runs.console.live.get, {
    organizationId,
    runId: id as GenericId<"runs">,
  })

  if (execution === undefined) {
    return <ConsoleListLoading />
  }

  if (execution === null) {
    return null
  }

  return <PaneExecution execution={execution} organizationId={organizationId} />
}

function PaneExecution({
  execution,
  organizationId,
}: {
  execution: ExecutionItem
  organizationId: string
}) {
  const now = useExecutionClock([execution])
  const slots = useRunRowSlots(organizationId)

  return (
    <ChatPaneBody
      material={{
        kind: "run",
        execution,
        now: displayNowForRun(execution, now),
        slots,
      }}
    />
  )
}
