import { v } from "convex/values"
import { encodeToolResult, type JsonObject } from "../../../contracts/json"
import {
  isTerminalRunStatus,
  maxRunTurns,
} from "../../../contracts/runtime/runs"
import { type WaiterWake } from "../../../contracts/runtime/waiters"
import { internalAction } from "../../_generated/server"
import { type TranscriptMessage } from "../../runs/execution/transcript/schema"
import { waiterWake } from "../../runs/execution/waiters/schema"
import { loadRuntime } from "../context"
import { createAgentRuntime } from "../platform"
import { type AgentRuntime } from "../platform/types"
import { executeToolCall } from "../tools/index"
import { recordRuntimeEvent } from "../trace/record"
import { reconcileHandoffs } from "./handoffs"
import { isParked, parkHandoffs } from "./park"
import { stopRepairMessages } from "./repair"
import { appendSessionMessages } from "./transcript"

export type ActOutcome =
  | { status: "completed" | "continue" | "failed" | "stopped" }
  | { eventId: string; status: "parked" }

type PendingCall = {
  args: JsonObject
  id: string
  index: number
  name: string
}

type ToolRun =
  | { sequence: number; status: "finished" | "ran" }
  | { eventId: string; status: "parked" }

const actOutcome = v.union(
  v.object({
    status: v.union(
      v.literal("completed"),
      v.literal("continue"),
      v.literal("failed"),
      v.literal("stopped")
    ),
  }),
  v.object({ eventId: v.string(), status: v.literal("parked") })
)

/** One turn's tool calls and their settlement, as a workflow step. */
export const step = internalAction({
  args: {
    runId: v.id("runs"),
    turn: v.number(),
    wake: v.optional(waiterWake),
  },
  returns: actOutcome,
  handler: async (ctx, args): Promise<ActOutcome> => {
    const loaded = await loadRuntime(ctx, args.runId)

    return await runAct({
      runtime: createAgentRuntime(ctx, loaded),
      turn: args.turn,
      ...(args.wake === undefined ? {} : { wake: args.wake }),
    })
  },
})

const maxTurnsError = "Model loop exceeded the maximum step count."
const toolSequenceOffset = 100

/**
 * One turn's tool calls, then whatever the turn settles into. The transcript
 * is the whole state: the calls still to run are the assistant's calls with
 * no tool row yet, so a resumed step picks up exactly where it stopped.
 */
export async function runAct(args: {
  runtime: AgentRuntime
  turn: number
  wake?: WaiterWake
}): Promise<ActOutcome> {
  const { runtime, turn, wake } = args

  if (
    isTerminalRunStatus(runtime.context.run.status) ||
    wake?.reason === "cancelled"
  ) {
    return { status: "stopped" }
  }

  const tail = await runtime.platform.tailTranscript()
  const assistant = tail.assistant

  if (assistant === null || assistant.role !== "assistant") {
    throw new Error("The turn has no assistant message to act on.")
  }

  const outcome = await actOnTurn(runtime, assistant.toolCalls ?? [], {
    results: tail.results,
    turn,
    wake,
  })

  // A turn that would go on past the last one fails instead, whatever the
  // model answered with.
  if (outcome.status === "continue" && turn >= maxRunTurns) {
    await failRun(runtime)

    return { status: "failed" }
  }

  return outcome
}

async function actOnTurn(
  runtime: AgentRuntime,
  calls: AssistantCalls,
  args: { results: TranscriptMessage[]; turn: number; wake?: WaiterWake }
): Promise<ActOutcome> {
  const { turn, wake } = args

  if (calls.length === 0) {
    return await settle(runtime, "stop", turn * toolSequenceOffset)
  }

  const pending = pendingCalls(calls, args.results)

  // Nothing pending on a wake means the run parked while settling, not
  // inside a call, so it settles again now that the wait is over.
  if (pending.length === 0 && wake !== undefined) {
    return await settle(
      runtime,
      "finish",
      turn * toolSequenceOffset + calls.length
    )
  }

  const tools = await runToolCalls(runtime, { pending, turn, wake })

  if (tools.status === "parked") {
    return tools
  }

  if (tools.status === "finished") {
    return await settle(runtime, "finish", tools.sequence + 1)
  }

  await appendSessionMessages(runtime)

  return { status: "continue" }
}

async function runToolCalls(
  runtime: AgentRuntime,
  args: { pending: PendingCall[]; turn: number; wake?: WaiterWake }
): Promise<ToolRun> {
  let sequence = args.turn * toolSequenceOffset
  // The wake belongs to the first call still pending: that is the call the
  // run parked on.
  let wake = args.wake

  for (const [position, call] of args.pending.entries()) {
    sequence = args.turn * toolSequenceOffset + call.index

    const result = await executeToolCall({
      call: { args: call.args, id: call.id, name: call.name },
      runtime,
      sequence,
      ...(wake === undefined ? {} : { wake }),
    })

    wake = undefined

    if (isParked(result)) {
      return { eventId: result.parked.eventId, status: "parked" }
    }

    await runtime.platform.appendTranscript([
      {
        content: result.content,
        role: "tool",
        toolCallId: call.id,
        toolName: call.name,
      },
    ])

    if (result.finished) {
      await skipCalls(runtime, args.pending.slice(position + 1))

      return { sequence, status: "finished" }
    }
  }

  return { sequence, status: "ran" }
}

/** Calls after the one that finished the run never execute, but the model's
 *  message still names them, and every call it names needs an answer before
 *  the transcript can go back to a model. */
async function skipCalls(runtime: AgentRuntime, calls: PendingCall[]) {
  if (calls.length === 0) {
    return
  }

  await runtime.platform.appendTranscript(
    calls.map((call) => ({
      content: encodeToolResult({
        reason: "The run finished before this call ran.",
        status: "skipped",
      }),
      role: "tool",
      toolCallId: call.id,
      toolName: call.name,
    }))
  )
}

/**
 * What the turn amounts to once its calls are done: settled handoffs and
 * fresh session messages are progress worth another turn, an open handoff is
 * something to wait for, and neither means the turn's own outcome stands.
 */
async function settle(
  runtime: AgentRuntime,
  kind: "finish" | "stop",
  sequence: number
): Promise<ActOutcome> {
  for (;;) {
    const { pending, progressed } = await reconcileHandoffs(runtime)

    if (progressed) {
      return { status: "continue" }
    }

    if (pending.length === 0) {
      return await finalize(runtime, kind, sequence)
    }

    const parked = await parkHandoffs(runtime, pending)

    if (isParked(parked)) {
      return { eventId: parked.parked.eventId, status: "parked" }
    }
  }
}

async function finalize(
  runtime: AgentRuntime,
  kind: "finish" | "stop",
  sequence: number
): Promise<ActOutcome> {
  if (kind === "finish") {
    await recordRuntimeEvent(runtime.platform, runtime.context, {
      sequence,
      type: "run.completed",
    })

    return { status: "completed" }
  }

  await runtime.platform.appendTranscript(stopRepairMessages(runtime.context))

  return { status: "continue" }
}

type AssistantCalls = NonNullable<
  Extract<TranscriptMessage, { role: "assistant" }>["toolCalls"]
>

function pendingCalls(
  calls: AssistantCalls,
  results: TranscriptMessage[]
): PendingCall[] {
  const recorded = new Set(
    results.map((row) => (row.role === "tool" ? row.toolCallId : ""))
  )

  return calls
    .map((call, index) => ({ ...call, index }))
    .filter((call) => !recorded.has(call.id))
}

async function failRun(runtime: AgentRuntime) {
  await recordRuntimeEvent(runtime.platform, runtime.context, {
    data: { error: maxTurnsError },
    sequence: maxRunTurns * toolSequenceOffset + toolSequenceOffset,
    type: "run.failed",
  })
}
