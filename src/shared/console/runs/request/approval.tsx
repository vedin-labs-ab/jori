import { type FunctionArgs } from "convex/server"
import { AlertCircle, Check, Clock3, Loader2, UserPen, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProviderLogo } from "@/shared/logo/provider"
import { type api } from "../../../../../convex/_generated/api"
import { showErrorToast } from "../../error"
import { absoluteTime, expirationLabel } from "../../time"
import { type ExecutionApproval } from "../types"
import { useRunRequestCarousel } from "./carousel"
import { type RunRequestMeta, RunRequestSection } from "./section"

export type ApprovalDecision = FunctionArgs<
  typeof api.approvals.console.decide
>["decision"]

export function ApprovalCallout({
  approvals,
  now,
  onDecide,
}: {
  approvals: ExecutionApproval[]
  now: number
  /** Records the decision; a rejection is shown as the failure. */
  onDecide: (
    approval: ExecutionApproval,
    decision: ApprovalDecision
  ) => Promise<void>
}) {
  const carousel = useRunRequestCarousel(approvals.length)
  const approval = approvals[carousel.index] ?? approvals[0]

  if (approval === undefined) {
    return null
  }

  return (
    <RunRequestSection
      actions={
        approval.state === "pending" ? (
          <ApprovalActions
            key={approval.id}
            approval={approval}
            onDecide={onDecide}
          />
        ) : undefined
      }
      label={{ count: approvals.length, singular: "Approval" }}
      labelIcon={UserPen}
      meta={approvalMeta(approval, now)}
      navigation={{
        count: approvals.length,
        index: carousel.index,
        itemLabel: "approval",
        onNext: carousel.onNext,
        onPrevious: carousel.onPrevious,
      }}
      summary={approval.summary}
      title={approval.toolLabel}
      titleIcon={<ProviderLogo className="size-4" surface={approval.surface} />}
    />
  )
}

function ApprovalActions({
  approval,
  onDecide,
}: {
  approval: ExecutionApproval
  onDecide: (
    approval: ExecutionApproval,
    decision: ApprovalDecision
  ) => Promise<void>
}) {
  const [pendingDecision, setPendingDecision] = useState<ApprovalDecision>()

  const submit = async (decision: ApprovalDecision) => {
    setPendingDecision(decision)

    try {
      await onDecide(approval, decision)
    } catch (caught) {
      showErrorToast(caught, "Couldn't update the approval.")
    } finally {
      setPendingDecision(undefined)
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        disabled={pendingDecision !== undefined}
        onClick={() => void submit("denied")}
        size="sm"
        type="button"
        variant="outline"
        className="text-destructive hover:text-destructive"
      >
        {pendingDecision === "denied" ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <X data-icon="inline-start" />
        )}
        Deny
      </Button>
      <Button
        disabled={pendingDecision !== undefined}
        onClick={() => void submit("approved")}
        size="sm"
        type="button"
      >
        {pendingDecision === "approved" ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <Check data-icon="inline-start" />
        )}
        Approve
      </Button>
    </div>
  )
}

function approvalMeta(
  approval: ExecutionApproval,
  now: number
): RunRequestMeta | null {
  if (approval.state === "pending" || approval.state === "expired") {
    const hasExpired = now >= approval.expiresAt

    return {
      Icon: Clock3,
      iconClassName: hasExpired ? "text-warning" : undefined,
      label: expirationLabel(approval.expiresAt, now),
    }
  }

  if (approval.state === "approved" && approval.decidedAt !== undefined) {
    return {
      Icon: Check,
      iconClassName: "text-primary",
      label: `Approved at ${absoluteTime(approval.decidedAt)}`,
    }
  }

  if (approval.state === "denied" && approval.decidedAt !== undefined) {
    return {
      Icon: X,
      iconClassName: "text-destructive",
      label: `Denied at ${absoluteTime(approval.decidedAt)}`,
    }
  }

  if (approval.state === "cancelled") {
    return {
      Icon: X,
      iconClassName: "text-muted-foreground",
      label: "Cancelled by Jori",
    }
  }

  if (approval.state === "failed") {
    return {
      Icon: AlertCircle,
      iconClassName: "text-destructive",
      label: "Approval delivery failed",
    }
  }

  return null
}
