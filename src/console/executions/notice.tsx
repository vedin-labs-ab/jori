import { AlertTriangle, RefreshCcw, SquareTerminal } from "lucide-react"
import { type ReactElement, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { codeBlockFrameClassName, DetailFrame } from "./details"
import {
  type LiveStreamStatus,
  type StoredTraceStatus,
  type TraceConnection,
} from "./trace"

export function TerminalFrame({
  action,
  caption,
  children,
}: {
  action?: ReactNode
  caption?: ReactElement | string
  children: ReactNode
}) {
  return (
    <DetailFrame
      action={action}
      className={codeBlockFrameClassName}
      header={caption}
    >
      {children}
    </DetailFrame>
  )
}

export function EmptyTraceNotice() {
  return (
    <div className="grid h-full place-items-center text-muted-foreground">
      No trace recorded.
    </div>
  )
}

export function TerminalNotice({
  connection,
  isFinalizingTrace = false,
  onRetryStoredTrace,
  storedTraceError,
  storedTraceStatus,
  streamStatus,
}: {
  connection: TraceConnection | undefined
  isFinalizingTrace?: boolean
  onRetryStoredTrace: () => void
  storedTraceError: string | undefined
  storedTraceStatus: StoredTraceStatus
  streamStatus: LiveStreamStatus
}) {
  if (connection?.type === "missing" && !isFinalizingTrace) {
    return <EmptyTraceNotice />
  }

  if (connection?.type === "stored" && storedTraceError !== undefined) {
    return (
      <TraceErrorNotice
        message={storedTraceError}
        onRetry={onRetryStoredTrace}
      />
    )
  }

  if (connection?.type === "stored" && storedTraceStatus === "loaded") {
    return <EmptyStoredTraceNotice />
  }

  return (
    <div className="grid h-full place-items-center">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-3.5" />
        {isFinalizingTrace
          ? "Finalizing trace..."
          : connection?.type === "pending"
            ? "Waiting for the run to start..."
            : streamStatus === "interrupted"
              ? "Reconnecting to trace..."
              : "Waiting for trace output..."}
      </span>
    </div>
  )
}

function EmptyStoredTraceNotice() {
  return (
    <Empty className="h-full">
      <EmptyMedia
        className="bg-background text-muted-foreground"
        variant="icon"
      >
        <SquareTerminal />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No trace output</EmptyTitle>
        <EmptyDescription>
          The run stopped before any trace events were recorded.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function TraceErrorNotice({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      className="grid h-full place-items-center p-4 text-center"
      role="alert"
    >
      <div className="grid max-w-sm place-items-center gap-3">
        <AlertTriangle className="size-5 text-destructive" />
        <div className="grid gap-1">
          <p className="font-medium text-sm">Trace unavailable</p>
          <p className="text-muted-foreground text-xs/relaxed">{message}</p>
        </div>
        <Button onClick={onRetry} size="sm" type="button" variant="outline">
          <RefreshCcw />
          Try again
        </Button>
      </div>
    </div>
  )
}
