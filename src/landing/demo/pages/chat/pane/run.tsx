import { useMemo } from "react"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { displayNowForRun, useExecutionClock } from "@/shared/console/runs/time"
import { useDemoWorkspace } from "../../../workspace"
import { useRunRowSlots } from "../../slots"

/** The run's row out of the workspace, open to the same detail the
 *  Activity page shows. */
export function DemoPaneRun({ runId }: { runId: string }) {
  const { actions, state } = useDemoWorkspace()
  const execution = state.runs.find((run) => run.id === runId)
  const runs = useMemo(
    () => (execution === undefined ? [] : [execution]),
    [execution]
  )
  const now = useExecutionClock(runs)
  const slots = useRunRowSlots(actions, state.activity)

  if (execution === undefined) {
    return null
  }

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
