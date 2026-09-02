import { useMutation } from "convex/react"
import { StopRunButton } from "@/shared/console/runs/row/stop"
import { type ExecutionItem } from "@/shared/console/runs/types"
import { api } from "../../../../convex/_generated/api"

/** The stop control bound to one run: the stop mutation, scoped to the
 *  organization the run belongs to. */
export function StopExecution({
  runId,
  organizationId,
}: {
  runId: ExecutionItem["id"]
  organizationId: string
}) {
  const stop = useMutation(api.runs.control.stop)

  return (
    <StopRunButton
      onStop={async () => {
        await stop({ runId, organizationId })
      }}
    />
  )
}
