import { decodeJson } from "../../../../contracts/json"
import { type RuntimeValueSummary } from "../../../../contracts/runtime/trace"
import { toolTraceDetails } from "../../../runtime/trace/tool"
import { type RunCompaction } from "../../schema"
import { type TranscriptMessage } from "./schema"

export type TranscriptRow = { message: TranscriptMessage; order: number }

type ToolRow = Extract<TranscriptMessage, { role: "tool" }>

/** Tool results older than this many assistant turns read as stubs once a
 *  run has cleared; everything older than `summaryKeepTurns` reads as the
 *  summary once it has summarized. */
export const clearKeepTurns = 4
export const summaryKeepTurns = 3

const compactedHeading = "# Compacted history"
const compactedNote =
  "The transcript before this point was condensed to keep the run within the model's context window. What follows summarizes it; the turns after it are verbatim."

/**
 * The transcript as the model sees it. Rows stay whole on disk: a run that
 * cleared reads its older tool results as stubs, and one that summarized
 * reads everything before the summary's boundary as the summary row.
 */
export function compactTranscript(
  rows: TranscriptRow[],
  compaction: RunCompaction | undefined
): TranscriptMessage[] {
  if (compaction === undefined) {
    return rows.map((row) => row.message)
  }

  const summary = compaction.summary
  const kept =
    summary === undefined
      ? rows
      : rows.filter((row) => row.order >= summary.before)
  const messages = kept.map((row) =>
    isClearedTool(row, compaction.clearedBefore)
      ? stubToolRow(row.message)
      : row.message
  )

  return summary === undefined
    ? messages
    : [compactedHistory(summary.content), ...messages]
}

/** The order that opens the last `keepTurns` assistant turns; rows below it
 *  are older than those turns. Null while the transcript holds no more
 *  turns than that, so there is nothing older to condense. */
export function keepBoundary(rows: TranscriptRow[], keepTurns: number) {
  const assistants = rows.filter((row) => row.message.role === "assistant")
  const opening =
    assistants.length > keepTurns
      ? assistants[assistants.length - keepTurns]
      : undefined

  return opening?.order ?? null
}

export function compactedHistory(content: string): TranscriptMessage {
  return {
    content: [compactedHeading, compactedNote, content].join("\n\n"),
    role: "user",
  }
}

function isClearedTool(
  row: TranscriptRow,
  clearedBefore: number | undefined
): row is TranscriptRow & { message: ToolRow } {
  return (
    row.message.role === "tool" &&
    clearedBefore !== undefined &&
    row.order < clearedBefore
  )
}

/** The stub carries what the trace layer keeps of a result — its shape and
 *  the first characters — so the model knows what it once saw and how to
 *  see it again. */
function stubToolRow(message: ToolRow): ToolRow {
  return {
    ...message,
    content: `[Cleared to save context] ${message.toolName} returned ${describeResult(message.content)}. Re-run the tool to see the full result.`,
  }
}

function describeResult(content: string) {
  return describeSummary(toolTraceDetails(decodeToolResult(content)).result)
}

function describeSummary(result: RuntimeValueSummary) {
  switch (result.kind) {
    case "array":
      return `an array of ${result.size} items`
    case "boolean":
      return "a boolean"
    case "null":
      return "nothing"
    case "number":
      return `the number ${result.preview}`
    case "object":
      return describeObject(result)
    case "string":
      return `a string of ${result.length} characters starting: ${JSON.stringify(result.preview)}`
  }
}

function describeObject(
  result: Extract<RuntimeValueSummary, { kind: "object" }>
) {
  const items =
    result.itemKey === undefined
      ? ""
      : ` holding ${result.itemCount} ${result.itemKey}${result.hasMore === true ? " with more to page" : ""}`

  return `an object with ${result.size} keys${items}`
}

function decodeToolResult(content: string): unknown {
  try {
    return decodeJson(content)
  } catch {
    return content
  }
}
