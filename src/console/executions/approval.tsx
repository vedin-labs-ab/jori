import { useAction } from "convex/react"
import { type FunctionArgs } from "convex/server"
import {
  ArrowUpRight,
  Check,
  Clock3,
  Loader2,
  UserCheck,
  UserPen,
  UserX,
  X,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { api } from "../../../convex/_generated/api"
import { absoluteTime, approvalLabel, formatDuration } from "./format"
import { ProviderLogo } from "./source"
import { type ExecutionItem } from "./types"

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
  const HeaderIcon =
    approval.state === "expired"
      ? UserX
      : approval.state === "approved" || approval.state === "consumed"
        ? UserCheck
        : UserPen

  return (
    <div className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[10rem_1fr]">
      <div className="flex items-start gap-2 font-medium">
        <HeaderIcon className="mt-0.5 size-3.5 text-muted-foreground" />
        Approval
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex min-w-0 items-center gap-2 font-medium text-sm">
            <ProviderLogo className="size-4" provider={approval.provider} />
            <span className="truncate">{approval.toolLabel}</span>
          </span>
          <span className="text-muted-foreground">
            {approvalLabel(approval.state)}
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
  const source = approval.source ?? fallbackApprovalSource(approval)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
      {source === undefined ? null : (
        <>
          <ApprovalSource source={source} />
          <span className="px-1 text-muted-foreground/60" aria-hidden="true">
            ·
          </span>
        </>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {expirationLabel(approval, now)}
          </span>
        </TooltipTrigger>
        <TooltipContent>{absoluteTime(approval.expiresAt)}</TooltipContent>
      </Tooltip>
    </div>
  )
}

function ApprovalSource({
  source,
}: {
  source: NonNullable<ExecutionItem["approval"]>["source"]
}) {
  if (source === undefined) {
    return null
  }

  if (source.url === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <ProviderLogo provider={source.provider} />
        {source.label}
      </span>
    )
  }

  return (
    <a
      className="group/status-link relative inline-flex items-center gap-1.5 rounded-sm underline-offset-4 transition-[color,padding] duration-200 hover:pr-4 hover:text-foreground focus-visible:pr-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      href={source.url}
      rel="noreferrer"
      target="_blank"
    >
      <ProviderLogo provider={source.provider} />
      <span>{source.label}</span>
      <ArrowUpRight
        aria-hidden="true"
        className="pointer-events-none absolute right-0 size-3 -translate-x-1 opacity-0 transition-all duration-200 ease-out group-hover/status-link:translate-x-0 group-hover/status-link:opacity-100 group-focus-visible/status-link:translate-x-0 group-focus-visible/status-link:opacity-100"
      />
    </a>
  )
}

function fallbackApprovalSource(
  approval: NonNullable<ExecutionItem["approval"]>
) {
  return approval.delivery === undefined
    ? undefined
    : {
        label: approval.delivery,
      }
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
