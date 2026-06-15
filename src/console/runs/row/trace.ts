import { useEffect, useState } from "react"

export type TraceConnection =
  | { type: "live"; url: string }
  | { type: "stored"; url: string }
  | { type: "pending" }
  | { type: "missing" }

export type StoredTraceStatus = "idle" | "loading" | "loaded"
export type LiveStreamStatus = "idle" | "connecting" | "open" | "interrupted"

export const maxVisibleTraceLines = 2000

export function useTraceLines(connection: TraceConnection | undefined) {
  const liveUrl = connection?.type === "live" ? connection.url : undefined
  const storedUrl = connection?.type === "stored" ? connection.url : undefined
  const liveTrace = useLiveTrace(liveUrl)
  const storedTrace = useStoredTrace(storedUrl)

  if (liveUrl !== undefined) {
    return {
      lines: liveTrace.lines,
      retryStoredTrace: storedTrace.retryStoredTrace,
      storedTraceError: undefined,
      storedTraceStatus: "idle" as const,
      streamStatus: liveTrace.streamStatus,
      trimmedLineCount: liveTrace.trimmedLineCount,
    }
  }

  return {
    lines: storedTrace.lines,
    retryStoredTrace: storedTrace.retryStoredTrace,
    storedTraceError: storedTrace.storedTraceError,
    storedTraceStatus: storedTrace.storedTraceStatus,
    streamStatus: "idle" as const,
    trimmedLineCount: storedTrace.trimmedLineCount,
  }
}

function useLiveTrace(liveUrl: string | undefined) {
  const [lines, setLines] = useState<string[]>([])
  const [streamStatus, setStreamStatus] = useState<LiveStreamStatus>("idle")
  const [trimmedLineCount, setTrimmedLineCount] = useState(0)

  useEffect(() => {
    if (liveUrl === undefined) {
      setLines([])
      setStreamStatus("idle")
      setTrimmedLineCount(0)
      return
    }

    const source = new EventSource(liveUrl)
    setLines([])
    setStreamStatus("connecting")
    setTrimmedLineCount(0)

    // Each connection replays the full trace file, so reconnects stay
    // duplicate-free by simply starting from an empty buffer.
    source.onopen = () => {
      setLines([])
      setTrimmedLineCount(0)
      setStreamStatus("open")
    }
    source.onmessage = (event) => {
      setLines((current) => appendTraceLine(current, event.data))
    }
    source.onerror = () => {
      setStreamStatus("interrupted")
    }

    return () => source.close()
  }, [liveUrl])

  return { lines, streamStatus, trimmedLineCount }
}

function useStoredTrace(storedUrl: string | undefined) {
  const [lines, setLines] = useState<string[]>([])
  const [retryToken, setRetryToken] = useState(0)
  const [storedTraceError, setStoredTraceError] = useState<string>()
  const [storedTraceStatus, setStoredTraceStatus] =
    useState<StoredTraceStatus>("idle")
  const [trimmedLineCount, setTrimmedLineCount] = useState(0)
  const requestKey = `${storedUrl ?? "none"}:${retryToken}`

  useEffect(() => {
    if (storedUrl === undefined) {
      setLines([])
      setStoredTraceError(undefined)
      setStoredTraceStatus("idle")
      setTrimmedLineCount(0)
      return
    }

    return loadStoredTrace({
      requestKey,
      setLines,
      setStoredTraceError,
      setStoredTraceStatus,
      setTrimmedLineCount,
      storedUrl,
    })
  }, [requestKey, storedUrl])

  return {
    lines,
    retryStoredTrace: () => setRetryToken((current) => current + 1),
    storedTraceError,
    storedTraceStatus,
    trimmedLineCount,
  }
}

function loadStoredTrace({
  requestKey,
  setLines,
  setStoredTraceError,
  setStoredTraceStatus,
  setTrimmedLineCount,
  storedUrl,
}: {
  requestKey: string
  setLines: (lines: string[]) => void
  setStoredTraceError: (error: string | undefined) => void
  setStoredTraceStatus: (status: StoredTraceStatus) => void
  setTrimmedLineCount: (count: number) => void
  storedUrl: string
}) {
  const controller = new AbortController()
  let isActive = true

  setLines([])
  setStoredTraceError(undefined)
  setStoredTraceStatus("loading")
  setTrimmedLineCount(0)

  void fetch(storedUrl, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Trace request ${requestKey} failed`)
      }

      return response.text()
    })
    .then((trace) => {
      if (!isActive) {
        return
      }

      const traceLines = parseTraceLines(trace)
      setLines(limitTraceLines(traceLines))
      setTrimmedLineCount(Math.max(0, traceLines.length - maxVisibleTraceLines))
      setStoredTraceStatus("loaded")
    })
    .catch((error: unknown) => {
      if (!isActive || isAbortError(error)) {
        return
      }

      setLines([])
      setStoredTraceError("Stored trace could not be loaded.")
      setStoredTraceStatus("loaded")
    })

  return () => {
    isActive = false
    controller.abort()
  }
}

export function appendTraceLine(current: string[], line: string) {
  return limitTraceLines([...current, line])
}

export function limitTraceLines(lines: string[]) {
  if (lines.length <= maxVisibleTraceLines) {
    return lines
  }

  return lines.slice(lines.length - maxVisibleTraceLines)
}

function parseTraceLines(trace: string) {
  return trace.split("\n").filter((line) => line !== "")
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}
