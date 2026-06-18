import { useAction } from "convex/react"
import { type FunctionArgs } from "convex/server"
import {
  Check,
  Clock3,
  Loader2,
  type LucideIcon,
  UserPen,
  X,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { api } from "../../../../convex/_generated/api"
import { ProviderLogo } from "../../shared/logo/provider"
import { absoluteTime, formatDuration } from "../../shared/time"
import { type ExecutionItem } from "../types"

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
    <div className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[10rem_1fr]">
      <div className="flex items-start gap-2 font-medium">
        <UserPen className="mt-0.5 size-3.5 text-muted-foreground" />
        Approval
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex min-w-0 items-center gap-2 font-medium text-sm">
            <ProviderLogo className="size-4" surface={approval.surface} />
            <span className="truncate">{approval.toolLabel}</span>
          </span>
        </div>
        <p className="mt-3 text-foreground text-sm leading-relaxed">
          {approval.summary}
        </p>
        <ApprovalFooter approval={approval} now={now} tenantId={tenantId} />
      </div>
    </div>
  )
}

function ApprovalFooter({
  approval,
  now,
  tenantId,
}: {
  approval: NonNullable<ExecutionItem["approval"]>
  now: number
  tenantId: string
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
      <ApprovalMeta approval={approval} now={now} />
      {approval.state === "pending" ? (
        <ApprovalActions approval={approval} tenantId={tenantId} />
      ) : null}
    </div>
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

function ApprovalMeta({
  approval,
  now,
}: {
  approval: NonNullable<ExecutionItem["approval"]>
  now: number
}) {
  const meta = approvalMeta(approval, now)

  if (meta === null) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1.5">
            <meta.Icon className={cn("size-3.5", meta.iconClassName)} />
            {meta.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>{meta.tooltip}</TooltipContent>
      </Tooltip>
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
): {
  Icon: LucideIcon
  iconClassName?: string
  label: string
  tooltip: string
} | null {
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

  return null
}
