import { AlertCircle, Clock3, Target, Timer, Zap } from "lucide-react"
import { useState } from "react"
import {
  ApprovalCallout,
  CodeDetail,
  DetailLine,
  ExecutionDetails,
} from "./details"
import { formatDuration, relativeTime, statusCopy } from "./format"
import { SourceParts } from "./source"
import { ApprovalBadge, MetaPill, StatusIcon } from "./status"
import { type ExecutionItem } from "./types"

export function ExecutionRow({
  defaultOpen,
  execution,
  now,
}: {
  defaultOpen: boolean
  execution: ExecutionItem
  now: number
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const durationMs = durationFor(execution, now)

  return (
    <article className="rounded-md border bg-background">
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
      {isOpen ? <ExpandedExecution execution={execution} now={now} /> : null}
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
      <span className="text-muted-foreground text-xs">
        {relativeTime(execution.createdAt, now)}
      </span>
    </div>
  )
}

function ExpandedExecution({
  execution,
  now,
}: {
  execution: ExecutionItem
  now: number
}) {
  return (
    <div className="grid gap-0 border-t px-3 pb-3">
      <DetailLine
        icon={Target}
        label="Prompt"
        value={execution.objective ?? execution.title}
      />
      <DetailLine
        icon={Zap}
        label="Progress"
        value={
          execution.progress ??
          statusCopy(execution.status, execution.approval?.state)
        }
      />
      <DetailLine icon={Clock3} label="Trigger" value={execution.trigger} />
      {execution.approval !== null ? (
        <ApprovalCallout approval={execution.approval} now={now} />
      ) : null}
      {execution.error !== undefined ? (
        <DetailLine icon={AlertCircle} label="Error" value={execution.error} />
      ) : null}
      <ExecutionDetails createdAt={execution.createdAt}>
        <CodeDetail label="Sandbox" value={execution.sandboxId} />
        <CodeDetail label="Hash" value={execution.hash} />
        <CodeDetail label="Prompt" value={execution.promptId} />
        <CodeDetail label="Trace" value={execution.traceFileId} />
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
