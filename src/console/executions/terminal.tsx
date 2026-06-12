import { useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { SquareTerminal } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { api } from "../../../convex/_generated/api"
import { EmptyTraceNotice, TerminalFrame, TerminalNotice } from "./notice"
import {
  type LiveStreamStatus,
  maxVisibleTraceLines,
  type TraceConnection,
  useTraceLines,
} from "./trace"
import { type ExecutionItem } from "./types"

type ExecutionId = FunctionArgs<
  typeof api.executions.monitor.trace
>["executionId"]

export function TraceTerminal({
  execution,
  tenantId,
}: {
  execution: ExecutionItem
  tenantId: string
}) {
  const isOngoing =
    execution.status === "queued" || execution.status === "running"
  const hasAvailableTrace = isOngoing || execution.traceFileId !== undefined
  const [hasLoadedTrace, setHasLoadedTrace] = useState(hasAvailableTrace)

  useEffect(() => {
    if (hasAvailableTrace) {
      setHasLoadedTrace(true)
    }
  }, [hasAvailableTrace])

  return (
    <div className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[10rem_1fr]">
      <div className="flex items-start gap-2 font-medium">
        <SquareTerminal className="mt-0.5 size-3.5 text-muted-foreground" />
        Trace
      </div>
      {hasLoadedTrace ? (
        <ConnectedTerminal executionId={execution.id} tenantId={tenantId} />
      ) : null}
      {!hasLoadedTrace ? (
        <TerminalFrame>
          <EmptyTraceNotice />
        </TerminalFrame>
      ) : null}
    </div>
  )
}

function ConnectedTerminal({
  executionId,
  tenantId,
}: {
  executionId: string
  tenantId: string
}) {
  const connection = useQuery(api.executions.monitor.trace, {
    executionId: executionId as ExecutionId,
    tenantId,
  })
  const [hasConnectedTrace, setHasConnectedTrace] = useState(false)
  const {
    lines,
    retryStoredTrace,
    storedTraceError,
    storedTraceStatus,
    streamStatus,
    trimmedLineCount,
  } = useTraceLines(connection)
  const isFinalizingTrace =
    connection?.type === "missing" && hasConnectedTrace && lines.length === 0

  useEffect(() => {
    if (connection?.type === "live" || connection?.type === "stored") {
      setHasConnectedTrace(true)
    }
  }, [connection?.type])

  return (
    <TerminalFrame
      caption={captionFor(connection, {
        hasLines: lines.length > 0,
        streamStatus,
        trimmedLineCount,
      })}
    >
      {lines.length > 0 ? (
        <TraceLines lines={lines} />
      ) : (
        <TerminalNotice
          connection={connection}
          isFinalizingTrace={isFinalizingTrace}
          onRetryStoredTrace={retryStoredTrace}
          storedTraceError={storedTraceError}
          storedTraceStatus={storedTraceStatus}
          streamStatus={streamStatus}
        />
      )}
    </TerminalFrame>
  )
}

function TraceLines({ lines }: { lines: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const trace = useMemo(() => lines.map(formatTraceLine).join("\n"), [lines])

  // Re-runs after every render, so each batch of appended lines keeps the
  // view pinned to the bottom unless the user scrolled up.
  useEffect(() => {
    const element = scrollRef.current

    if (element !== null && stickToBottom.current) {
      element.scrollTop = element.scrollHeight
    }
  })

  return (
    <div
      className="h-full overflow-y-auto px-2.5 py-2"
      onScroll={(event) => {
        const element = event.currentTarget
        stickToBottom.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 24
      }}
      ref={scrollRef}
    >
      <code className="block whitespace-pre-wrap break-words font-mono leading-relaxed">
        {trace}
      </code>
    </div>
  )
}

function formatTraceLine(line: string) {
  try {
    return JSON.stringify(JSON.parse(line), null, 2)
  } catch {
    return line
  }
}

function captionFor(
  connection: TraceConnection | undefined,
  input: {
    hasLines: boolean
    streamStatus: LiveStreamStatus
    trimmedLineCount: number
  }
) {
  if (connection === undefined) {
    return "Connecting..."
  }

  if (connection.type === "pending") {
    return "Starting"
  }

  if (connection.type === "live") {
    return (
      <StatusCaption pulse={input.streamStatus !== "interrupted"}>
        {input.streamStatus === "interrupted" ? "Reconnecting" : "Live"}
      </StatusCaption>
    )
  }

  if (connection.type === "stored") {
    if (input.trimmedLineCount > 0) {
      return `Stored, last ${new Intl.NumberFormat().format(
        maxVisibleTraceLines
      )} lines`
    }

    return <StatusCaption>Stored</StatusCaption>
  }

  return input.hasLines ? "Stream ended" : undefined
}

function StatusCaption({
  children,
  pulse = false,
}: {
  children: ReactNode
  pulse?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="relative grid size-2.5 shrink-0 place-items-center">
        {pulse ? (
          <span className="absolute size-1.5 animate-ping rounded-full bg-primary opacity-75" />
        ) : null}
        <span
          className={cn(
            "relative block size-1.5 rounded-full",
            pulse ? "bg-primary" : "bg-muted-foreground"
          )}
        />
      </span>
      {children}
    </span>
  )
}
