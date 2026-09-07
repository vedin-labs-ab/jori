import { encodeToolResult } from "../../contracts/json"
import { type TranscriptRow } from "../../convex/runs/execution/transcript/compact"
import { type TranscriptMessage } from "../../convex/runs/execution/transcript/schema"
import { type MessageCauseKind } from "../../convex/runs/schema"
import { id, type TestDatabase } from "./database"

type ActivityData = import("../../convex/runs/activity/types").ActivityData
type Doc<TableName extends keyof DataModel> =
  import("../../convex/_generated/dataModel").Doc<TableName>
type DataModel = import("../../convex/_generated/dataModel").DataModel
type QueryCtx = import("../../convex/_generated/server").QueryCtx
type RunSnapshot =
  import("../../convex/_generated/dataModel").Doc<"runs">["snapshot"]
type RunSnapshotInput = Omit<RunSnapshot, "title">

/** Activity projection input with every relation empty; callers add the
 *  run and whatever the test exercises. */
export function emptyActivityData(): Omit<ActivityData, "run"> {
  return {
    agents: [],
    approvals: [],
    collections: [],
    files: [],
    offers: [],
    traces: [],
    waiters: [],
  }
}

export function jobDisplay(
  overrides: Partial<RunSnapshotInput> = {}
): RunSnapshotInput {
  return {
    source: {
      type: "job",
    },
    context: [],
    ...overrides,
  }
}

export function eventJobDisplay(input: {
  context?: RunSnapshot["context"]
  surface?: NonNullable<RunSnapshot["source"]["surface"]>
  url?: string
}): RunSnapshotInput {
  return jobDisplay({
    source: {
      type: "job",
      surface: input.surface,
      ...(input.url === undefined ? {} : { url: input.url }),
    },
    context: input.context ?? [],
  })
}

export function messageDisplay(input: {
  context?: RunSnapshot["context"]
  kind: MessageCauseKind
  surface?: NonNullable<RunSnapshot["source"]["surface"]>
  url?: string
}): RunSnapshotInput {
  const surface = input.surface ?? "slack"

  return {
    source: {
      type: "message",
      surface,
      ...(input.url === undefined ? {} : { url: input.url }),
    },
    context: input.context ?? [],
  }
}

export function oneShotDisplay(): RunSnapshotInput {
  return jobDisplay({
    source: {
      type: "job",
      surface: "jori",
    },
  })
}

export function recurringDisplay(input: {
  context?: RunSnapshot["context"]
  schedule?: string
}): RunSnapshotInput {
  return jobDisplay({
    source: {
      type: "job",
      surface: "jori",
    },
    context: [
      { type: "schedule", label: input.schedule ?? "Daily at 09:00 UTC" },
      ...(input.context ?? []),
    ],
  })
}

/** A query context whose `db.get` resolves ids from `docs`, and whose
 *  `db.query` serves the given rows for the named tables and nothing for
 *  every other table. */
export function fakeQueryCtx(
  docs: Record<string, unknown>,
  rows: Record<string, unknown[]> = {}
) {
  return {
    db: {
      get: async (id: string) => docs[id] ?? null,
      query: (table: string) => ({
        withIndex: () => queryResult(rows[table] ?? []),
      }),
    },
  } as unknown as QueryCtx
}

/** A query result readers can take, order, iterate, or read the first row
 *  of, backed by one in-memory list. */
export function queryResult(rows: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      yield* rows
    },
    first: async () => rows[0] ?? null,
    order: () => queryResult(rows),
    take: async (count: number) => rows.slice(0, count),
  }
}

/** The `run.prepared` trace rows the run projection reads, so the tool
 *  snapshot stored on a run reaches the summary under test. */
export function preparedTraceRows(run: { preparedTools?: unknown }) {
  return run.preparedTools === undefined
    ? []
    : [{ data: { tools: run.preparedTools }, type: "run.prepared" }]
}

/** A run row with the fields the activity projection reads; overrides
 *  refine any of them. */
export function runDoc(overrides: Partial<Doc<"runs">> = {}): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: runSnapshot("Run"),
    status: "running",
    organizationId: "organization",
    ...overrides,
  } as Doc<"runs">
}

/** A completed run for the summary under test; the run's own fields and
 *  the overrides refine it, and a prepared tool snapshot rides along for
 *  `preparedTraceRows`. */
export function testRun(
  run: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) {
  return {
    _id: "run",
    _creationTime: 0,
    organizationId: "organization",
    status: "completed",
    createdAt: 0,
    endedAt: 1000,
    ...run,
    ...overrides,
  } as Doc<"runs"> & { preparedTools?: unknown }
}

export function runSnapshot(title: string): Doc<"runs">["snapshot"] {
  return { context: [], source: { type: "manual" }, title }
}

/** A trace row keyed and timestamped from its own timestamp, so tests read
 *  as a sequence of moments rather than a table of ids. */
export function traceDoc(
  overrides: Partial<Doc<"traces">> & Pick<Doc<"traces">, "timestamp" | "type">
): Doc<"traces"> {
  return {
    _creationTime: overrides.timestamp,
    _id: id<"traces">(`trace-${overrides.timestamp}`),
    callId: undefined,
    key: `trace:${overrides.timestamp}`,
    runId: id<"runs">("run"),
    sequence: undefined,
    organizationId: "organization",
    ...overrides,
  } as Doc<"traces">
}

/** Activity projection input around a default run. */
export function activityData(
  overrides: Partial<ActivityData> = {}
): ActivityData {
  return { ...emptyActivityData(), run: runDoc(), ...overrides }
}

/** Six assistant turns at even orders, each answered by one tool result. */
export function transcript(): TranscriptRow[] {
  const messages: TranscriptMessage[] = [
    { content: "Rename the renewals table.", role: "user" },
    assistantRow("read_file", "call_3"),
    toolRow(3, "read_file", encodeToolResult("x".repeat(600))),
    assistantRow("list_items", "call_5"),
    toolRow(
      5,
      "list_items",
      encodeToolResult({ cursor: "next", items: [{ id: 1 }, { id: 2 }] })
    ),
    assistantRow("bash", "call_7"),
    toolRow(7, "bash", encodeToolResult({ exitCode: 0, stdout: "ok" })),
    assistantRow("read_file", "call_9"),
    toolRow(9, "read_file", encodeToolResult("short")),
    assistantRow("bash", "call_11"),
    toolRow(11, "bash", encodeToolResult({ exitCode: 0 })),
    { content: "Done.", role: "assistant" },
  ]

  return messages.map((message, index) => ({ message, order: index + 1 }))
}

export function toolRow(
  order: number,
  toolName: string,
  content: string
): TranscriptMessage {
  return { content, role: "tool", toolCallId: `call_${order}`, toolName }
}

/** A run whose last prompt sat at 130k tokens. */
export async function liveRun(
  database: TestDatabase,
  status: Doc<"runs">["status"] = "running"
) {
  return await database.insert("runs", {
    organizationId: "org",
    audience: "organization",
    cause: { type: "manual" },
    principal: { kind: "organization" },
    promptTokens: 130_000,
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status,
    createdAt: 0,
  })
}

export async function traces(database: TestDatabase) {
  return (await database
    .query("traces")
    .collect()) as unknown as Doc<"traces">[]
}

function assistantRow(name: string, id: string): TranscriptMessage {
  return {
    content: null,
    role: "assistant",
    toolCalls: [{ args: { path: "x" }, id, name }],
  }
}
