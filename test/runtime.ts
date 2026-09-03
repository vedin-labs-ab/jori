import { vi } from "vitest"
import { type RuntimeContext } from "../contracts/runtime/context"
import { type RuntimeId } from "../contracts/runtime/ids"
import { type RuntimePrompt } from "../contracts/runtime/prompt"
import { type RuntimeModelTokens } from "../contracts/runtime/trace"
import { type WaiterWake } from "../contracts/runtime/waiters"
import { maxTurns, runAct } from "../convex/runtime/loop/act"
import { runModelTurn } from "../convex/runtime/loop/model"
import { isParked } from "../convex/runtime/loop/park"
import {
  type ModelResponse,
  type ModelRuntime,
  type ModelToolCall,
} from "../convex/runtime/model/types"
import {
  type AgentRuntime,
  type RuntimePlatform,
} from "../convex/runtime/platform"
import { type SandboxRuntime } from "../convex/runtime/sandbox/types"
import { executeToolCall } from "../convex/runtime/tools/index"
import { createPlatform, createSandbox } from "./platform"

export type QueuedModelResponse =
  | {
      content: string
      reasoning?: string | null
      type: "stop"
      tokens?: RuntimeModelTokens
    }
  | {
      content: string | null
      reasoning?: string | null
      toolCalls: ModelToolCall[]
      type: "tool_calls"
      tokens?: RuntimeModelTokens
    }

export function runtimeId<TableName extends string>(value: string) {
  return value as RuntimeId<TableName>
}

/** A loaded run context with every field at its quiet default. */
export function runtimeContext(
  overrides: Partial<RuntimeContext> = {}
): RuntimeContext {
  return {
    activeSurface: null,
    run: {
      id: runtimeId<"runs">("run_1"),
      organizationId: "organization",
      rootId: null,
      sandboxId: null,
      status: "running",
    },
    session: null,
    tools: [],
    ...overrides,
  }
}

export function runtimePrompt(
  overrides: Partial<RuntimePrompt> = {}
): RuntimePrompt {
  return {
    context: "context",
    instructions: "system",
    organization: null,
    person: null,
    place: null,
    requester: null,
    ...overrides,
  }
}

export function createRuntime(
  options: {
    context?: RuntimeContext
    platform?: RuntimePlatform
    sandbox?: SandboxRuntime
  } = {}
): AgentRuntime {
  return {
    context: options.context ?? runtimeContext(),
    platform: options.platform ?? createPlatform(),
    sandbox: options.sandbox ?? createSandbox(),
  }
}

/** One tool call that is expected to answer within the step. */
export async function runTool(args: {
  call: ModelToolCall
  runtime: AgentRuntime
  sequence?: number
  wake?: WaiterWake
}) {
  const outcome = await executeToolCall({ sequence: 100, ...args })

  if (isParked(outcome)) {
    throw new Error("The tool call parked unexpectedly.")
  }

  return outcome
}

/** The workflow handler, in process: model then act per turn, feeding a
 *  queued wake into act whenever it parks. */
export async function runLoop(args: {
  model: ModelRuntime
  prompt?: RuntimePrompt
  runtime: AgentRuntime
  wakes?: WaiterWake[]
}) {
  const wakes = [...(args.wakes ?? [])]

  for (let turn = 1; turn <= maxTurns; turn += 1) {
    await runModelTurn({
      model: args.model,
      prompt: args.prompt ?? runtimePrompt(),
      runtime: args.runtime,
      turn,
    })

    let outcome = await runAct({ runtime: args.runtime, turn })

    while (outcome.status === "parked") {
      outcome = await runAct({
        runtime: args.runtime,
        turn,
        wake: nextWake(wakes),
      })
    }

    if (outcome.status !== "continue") {
      return outcome.status
    }
  }

  return "failed" as const
}

export function createQueuedModel(responses: QueuedModelResponse[]) {
  const queue = responses.map(queuedModelResponse)

  return {
    complete: vi.fn<ModelRuntime["complete"]>(async () => {
      const response = queue.shift()

      if (response === undefined) {
        throw new Error("No model response queued.")
      }

      return response
    }),
  } satisfies ModelRuntime
}

function nextWake(wakes: WaiterWake[]): WaiterWake {
  const wake = wakes.shift()

  if (wake === undefined) {
    throw new Error("No wake queued for a parked run.")
  }

  return wake
}

function queuedModelResponse(response: QueuedModelResponse): ModelResponse {
  const base = {
    reasoning: response.reasoning ?? null,
    tokens: response.tokens ?? emptyTokens(),
  }

  return response.type === "stop"
    ? { ...base, content: response.content, type: "stop" }
    : {
        ...base,
        content: response.content,
        toolCalls: response.toolCalls,
        type: "tool_calls",
      }
}

function emptyTokens(): RuntimeModelTokens {
  return {
    cacheRead: 0,
    cacheWrite: 0,
    input: 0,
    output: 0,
    reasoning: 0,
    total: 0,
    uncached: 0,
  }
}
