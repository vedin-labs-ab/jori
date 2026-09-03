import { useMemo } from "react"
import { ActivityLog } from "@/shared/console/runs/activity"
import { ApprovalCallout } from "@/shared/console/runs/request/approval"
import { OfferCallout } from "@/shared/console/runs/request/offer"
import { type RunRowSlots } from "@/shared/console/runs/row"
import { ExpandedExecution } from "@/shared/console/runs/row/expanded"
import { StopRunButton } from "@/shared/console/runs/row/stop"
import { type DemoActions } from "../state/actions"
import { type DemoState } from "../state/types"

/** The row slots over the workspace, held steady across ticks of the
 *  clock so a memoized row re-renders for its own run alone. The Activity
 *  page and a job's Runs section share them. */
export function useRunRowSlots(
  actions: DemoActions,
  activity: DemoState["activity"]
) {
  return useMemo<RunRowSlots>(
    () => ({
      expanded: (execution, now) => (
        <ExpandedExecution
          approvals={
            <ApprovalCallout
              approvals={execution.approvals}
              now={now}
              onDecide={(approval, decision) => {
                actions.decideApproval(execution.id, approval.id, decision)

                return Promise.resolve()
              }}
            />
          }
          execution={execution}
          log={<ActivityLog activity={activity[execution.id]} now={now} />}
          offers={
            <OfferCallout
              now={now}
              offers={execution.offers}
              onCancel={(offer) => {
                actions.settleOffer(execution.id, offer.id, "cancelled")

                return Promise.resolve()
              }}
              onClaim={() => Promise.resolve({ status: "connected" as const })}
            />
          }
        />
      ),
      stop: (execution) => (
        <StopRunButton
          onStop={() => {
            actions.stopRun(execution.id)

            return Promise.resolve()
          }}
        />
      ),
    }),
    [actions, activity]
  )
}
