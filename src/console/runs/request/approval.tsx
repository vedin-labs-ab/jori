import { useAction } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { AlertCircle, Check, Clock3, Loader2, UserPen, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProviderLogo } from "@/shared/logo/provider"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import { absoluteTime, expirationLabel } from "../../shared/time"
import { type ExecutionApproval } from "../types"
import { useRunRequestCarousel } from "./carousel"
import { type RunRequestMeta, RunRequestSection } from "./section"

type ApprovalDecisionArgs = FunctionArgs<typeof api.approvals.console.decide>

export function ApprovalCallout({
  approvals,
  now,
  organizationId,
}: {
  approvals: ExecutionApproval[]
  now: number
  organizationId: string
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
            organizationId={organizationId}
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
  organizationId,
}: {
  approval: ExecutionApproval
  organizationId: string
}) {
  const decide = useAction(api.approvals.console.decide)
  const [pendingDecision, setPendingDecision] =
    useState<ApprovalDecisionArgs["decision"]>()

  const submit = async (decision: ApprovalDecisionArgs["decision"]) => {
    setPendingDecision(decision)

    try {
      await decide({
        approvalId: approval.id as ApprovalDecisionArgs["approvalId"],
        decision,
        organizationId,
      })
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
      label: "Cancelled by Milo",
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
