import { useAction } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { AlertCircle, Check, Clock3, Loader2, UserPen, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "../../../../convex/_generated/api"
import { ProviderLogo } from "../../shared/logo/provider"
import { absoluteTime, formatDuration } from "../../shared/time"
import { type ExecutionItem } from "../types"
import { type RunRequestMeta, RunRequestSection } from "./layout"

type ApprovalDecisionArgs = FunctionArgs<typeof api.approvals.console.decide>

export function ApprovalCallout({
  approval,
  now,
  tenantId,
}: {
  approval: NonNullable<ExecutionItem["approval"]>
  now: number
  tenantId: string
}) {
  return (
    <RunRequestSection
      actions={
        approval.state === "pending" ? (
          <ApprovalActions approval={approval} tenantId={tenantId} />
        ) : undefined
      }
      label="Approval"
      labelIcon={UserPen}
      meta={approvalMeta(approval, now)}
      summary={approval.summary}
      title={approval.toolLabel}
      titleIcon={<ProviderLogo className="size-4" surface={approval.surface} />}
    />
  )
}

function ApprovalActions({
  approval,
  tenantId,
}: {
  approval: NonNullable<ExecutionItem["approval"]>
  tenantId: string
}) {
  const decide = useAction(api.approvals.console.decide)
  const [pendingDecision, setPendingDecision] =
    useState<ApprovalDecisionArgs["decision"]>()
  const [error, setError] = useState<string>()

  const submit = async (decision: ApprovalDecisionArgs["decision"]) => {
    setPendingDecision(decision)
    setError(undefined)

    try {
      await decide({
        approvalId: approval.id as ApprovalDecisionArgs["approvalId"],
        decision,
        tenantId,
      })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update approval."
      )
    } finally {
      setPendingDecision(undefined)
    }
  }

  return (
    <div className="grid gap-2">
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
      {error !== undefined ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : null}
    </div>
  )
}

function expirationLabel(
  approval: NonNullable<ExecutionItem["approval"]>,
  now: number
) {
  if (now >= approval.expiresAt) {
    return `Expired at ${absoluteTime(approval.expiresAt)}`
  }

  return `Expires in ${formatDuration(Math.max(0, approval.expiresAt - now))}`
}

function approvalMeta(
  approval: NonNullable<ExecutionItem["approval"]>,
  now: number
): RunRequestMeta | null {
  if (approval.state === "pending" || approval.state === "expired") {
    const hasExpired = now >= approval.expiresAt

    return {
      Icon: Clock3,
      iconClassName: hasExpired ? "text-warning" : undefined,
      label: expirationLabel(approval, now),
      tooltip: absoluteTime(approval.expiresAt),
    }
  }

  if (approval.state === "approved" && approval.decidedAt !== undefined) {
    return {
      Icon: Check,
      iconClassName: "text-primary",
      label: `Approved at ${absoluteTime(approval.decidedAt)}`,
      tooltip: absoluteTime(approval.decidedAt),
    }
  }

  if (approval.state === "denied" && approval.decidedAt !== undefined) {
    return {
      Icon: X,
      iconClassName: "text-destructive",
      label: `Denied at ${absoluteTime(approval.decidedAt)}`,
      tooltip: absoluteTime(approval.decidedAt),
    }
  }

  if (approval.state === "cancelled") {
    return {
      Icon: X,
      iconClassName: "text-muted-foreground",
      label: "Cancelled by Milo",
      tooltip: "Milo withdrew this request",
    }
  }

  if (approval.state === "failed") {
    return {
      Icon: AlertCircle,
      iconClassName: "text-destructive",
      label: "Approval delivery failed",
      tooltip: "Milo could not deliver this approval request",
    }
  }

  return null
}
