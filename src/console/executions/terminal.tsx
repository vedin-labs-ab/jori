import { useQuery } from "convex/react"
import { type FunctionArgs, type FunctionReturnType } from "convex/server"
import { Cable, SquareTerminal } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { api } from "../../../convex/_generated/api"
import { type ExecutionItem } from "./types"

type TraceConnection = FunctionReturnType<typeof api.executions.monitor.trace>
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
  const [isMonitoring, setIsMonitoring] = useState(false)
  const isOngoing =
    execution.status === "queued" || execution.status === "running"

  return (
    <div className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[10rem_1fr]">
      <div className="flex items-start gap-2 font-medium">
        <SquareTerminal className="mt-0.5 size-3.5 text-muted-foreground" />
        Trace
      </div>
      {isMonitoring ? (
        <ConnectedTerminal executionId={execution.id} tenantId={tenantId} />
      ) : (
        <TerminalFrame caption={isOngoing ? "Live monitoring is opt-in" : ""}>
          <div className="grid h-full place-items-center">
            <Button
              onClick={() => setIsMonitoring(true)}
              type="button"
              variant="outline"
            >
              <Cable data-icon="inline-start" />
              {isOngoing ? "Connect" : "Load trace"}
            </Button>
          </div>
        </TerminalFrame>
      )}
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
  const lines = useTraceLines(connection)

  return (
    <TerminalFrame caption={captionFor(connection, lines.length > 0)}>
      {lines.length > 0 ? (
        <TraceLines lines={lines} />
      ) : (
        <TerminalNotice connection={connection} />
      )}
    </TerminalFrame>
  )
}

function TerminalFrame({
  caption,
  children,
}: {
  caption: string
  children: React.ReactNode
}) {
  return (
    <div className="grid h-64 min-w-0 grid-rows-[auto_1fr] overflow-hidden rounded-md bg-muted">
      <div className="flex items-center justify-between gap-2 border-b px-2.5 py-1.5 text-muted-foreground">
        <span className="font-medium">Agent trace</span>
        <span>{caption}</span>
      </div>
      <div className="min-h-0">{children}</div>
    </div>
  )
}

function TraceLines({ lines }: { lines: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

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
      <code className="block whitespace-pre-wrap break-all font-mono leading-relaxed">
        {lines.join("\n")}
      </code>
    </div>
  )
}

function TerminalNotice({
  connection,
}: {
  connection: TraceConnection | undefined
}) {
  if (connection?.type === "missing") {
    return (
      <div className="grid h-full place-items-center text-muted-foreground">
        No trace recorded.
      </div>
    )
  }

  return (
    <div className="grid h-full place-items-center">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-3.5" />
        {connection?.type === "pending"
          ? "Waiting for the sandbox to start..."
          : "Waiting for trace output..."}
      </span>
    </div>
  )
}

function useTraceLines(connection: TraceConnection | undefined) {
  const [lines, setLines] = useState<string[]>([])
  const liveUrl = connection?.type === "live" ? connection.url : undefined
  const storedUrl = connection?.type === "stored" ? connection.url : undefined

  useEffect(() => {
    if (liveUrl === undefined) {
      return
    }

    const source = new EventSource(liveUrl)

    // Each connection replays the full trace file, so reconnects stay
    // duplicate-free by simply starting from an empty buffer.
    source.onopen = () => setLines([])
    source.onmessage = (event) => {
      setLines((current) => [...current, event.data])
    }

    return () => source.close()
  }, [liveUrl])

  useEffect(() => {
    if (storedUrl === undefined) {
      return
    }

    const controller = new AbortController()

    void fetch(storedUrl, { signal: controller.signal })
      .then((response) => response.text())
      .then((trace) =>
        setLines(trace.split("\n").filter((line) => line !== ""))
      )
      .catch(() => undefined)

    return () => controller.abort()
  }, [storedUrl])

  return lines
}

function captionFor(
  connection: TraceConnection | undefined,
  hasLines: boolean
) {
  if (connection === undefined) {
    return "Connecting..."
  }

  if (connection.type === "pending") {
    return "Waiting for sandbox"
  }

  if (connection.type === "live") {
    return "Live"
  }

  if (connection.type === "stored") {
    return "Stored trace"
  }

  return hasLines ? "Stream ended" : ""
}
