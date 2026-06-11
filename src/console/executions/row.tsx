import { FileText, Timer } from "lucide-react"
import { useState } from "react"
import {
  ApprovalCallout,
  CodeBlockDetail,
  CodeDetail,
  ErrorDetail,
  ExecutionDetails,
  RelativeTime,
} from "./details"
import { formatDuration, relativeTime } from "./format"
import { SourceParts } from "./source"
import { ApprovalBadge, MetaPill, StatusIcon } from "./status"
import { StopExecution } from "./stop"
import { TraceTerminal } from "./terminal"
import { type ExecutionItem } from "./types"

export function ExecutionRow({
  execution,
  now,
  tenantId,
}: {
  execution: ExecutionItem
  now: number
  tenantId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const durationMs = durationFor(execution, now)

  return (
    <article className="overflow-hidden rounded-md border bg-background">
      <button
        className="grid w-full grid-cols-[auto_1fr] items-center gap-3 p-3 text-left md:grid-cols-[auto_1fr_auto]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <StatusIcon status={execution.status} />
        <ExecutionTitle execution={execution} />
        <ExecutionMeta
          durationMs={durationMs}
          execution={execution}
          now={now}
        />
      </button>
      {isOpen ? (
        <ExpandedExecution
          execution={execution}
          now={now}
          tenantId={tenantId}
        />
      ) : null}
    </article>
  )
}

function ExecutionTitle({ execution }: { execution: ExecutionItem }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium text-sm">{execution.title}</div>
      <SourceParts parts={execution.sourceParts} />
    </div>
  )
}

function ExecutionMeta({
  durationMs,
  execution,
  now,
}: {
  durationMs: number | undefined
  execution: ExecutionItem
  now: number
}) {
  return (
    <div className="col-span-2 flex flex-wrap items-center gap-3 justify-self-start md:col-span-1 md:justify-self-end">
      {execution.approval?.state === "pending" ? (
        <ApprovalBadge expiresAt={execution.approval.expiresAt} now={now} />
      ) : null}
      {durationMs !== undefined ? (
        <MetaPill icon={Timer} label={formatDuration(durationMs)} />
      ) : null}
      <RelativeTime
        absolute={execution.createdAt}
        value={relativeTime(execution.createdAt, now)}
      />
    </div>
  )
}

function ExpandedExecution({
  execution,
  now,
  tenantId,
}: {
  execution: ExecutionItem
  now: number
  tenantId: string
}) {
  const isOngoing =
    execution.status === "queued" || execution.status === "running"

  return (
    <div className="grid gap-0">
      <CodeBlockDetail
        icon={FileText}
        label="Prompt"
        value={execution.objective ?? execution.title}
      />
      {execution.approval !== null ? (
        <ApprovalCallout approval={execution.approval} now={now} />
      ) : null}
      {execution.error !== undefined ? (
        <ErrorDetail value={execution.error} />
      ) : null}
      <TraceTerminal execution={execution} tenantId={tenantId} />
      <ExecutionDetails>
        <CodeDetail label="Sandbox" value={execution.sandboxId} />
        <CodeDetail label="Hash" value={execution.hash} />
        <CodeDetail label="Prompt" value={execution.promptId} />
        <CodeDetail label="Trace" value={execution.traceFileId} />
        <CodeDetail label="Stopped by" value={execution.stoppedBy} />
        {isOngoing ? (
          <StopExecution
            className="ms-auto"
            executionId={execution.id}
            tenantId={tenantId}
          />
        ) : null}
      </ExecutionDetails>
    </div>
  )
}

function durationFor(execution: ExecutionItem, now: number) {
  if (execution.finishedAt === undefined) {
    return Math.max(0, now - execution.createdAt)
  }

  return execution.durationMs
}
