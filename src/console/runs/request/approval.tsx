import { useAction } from "convex/react"
import { ApprovalCallout } from "@/shared/console/runs/request/approval"
import { type ExecutionApproval } from "@/shared/console/runs/types"
import { api } from "../../../../convex/_generated/api"

/** A run's approvals bound to Convex: the decide action, scoped to the
 *  organization the run belongs to. */
export function RunApprovals({
  approvals,
  now,
  organizationId,
}: {
  approvals: ExecutionApproval[]
  now: number
  organizationId: string
}) {
  const decide = useAction(api.approvals.console.decide)

  return (
    <ApprovalCallout
      approvals={approvals}
      now={now}
      onDecide={async (approval, decision) => {
        await decide({ approvalId: approval.id, decision, organizationId })
      }}
    />
  )
}
