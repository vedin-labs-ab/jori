import { type JsonObject } from "../../../contracts/json"
import {
  type Duration,
  durationMilliseconds,
  isDurationUnit,
} from "../../../contracts/runtime/duration"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { maxAgentWaitRuns } from "../../../contracts/runtime/tools"
import { type Id } from "../../_generated/dataModel"
import { type WaiterWake } from "../../runs/execution/waiters/schema"
import { optionalStringArray, requiredString } from "../../shared/input"
import { isParked, park, recordResumed } from "../loop/park"
import { type AgentRunStatus, type AgentRuntime } from "../platform/types"

const minTimeoutMs = durationMilliseconds({ unit: "seconds", value: 5 })
const maxTimeoutMs = durationMilliseconds({ unit: "days", value: 30 })
const defaultTimeoutMs = durationMilliseconds({ unit: "minutes", value: 15 })

/** The agent-route tools: delegate, join, and stop child runs. */
export async function executeAgentTool(
  runtime: AgentRuntime,
  args: {
    input: JsonObject
    name: string
    onParked: () => Promise<void>
    wake?: WaiterWake
  }
) {
  const input = args.input

  if (args.name === "wait_for_agents") {
    return await waitForAgents(runtime, args)
  }

  if (args.name === "start_agent") {
    return await runtime.platform.createAgentRun({
      parentId: runtime.context.run.id,
      task: requiredString(input.task, "task"),
      title: requiredString(input.title, "title"),
      tools:
        input.tools === undefined
          ? undefined
          : optionalStringArray(input.tools),
    })
  }

  if (args.name === "stop_agent") {
    return await runtime.platform.stopAgentRun({
      parentId: runtime.context.run.id,
      runId: requiredString(input.runId, "runId") as Id<"runs">,
    })
  }

  throw new Error(`Unknown agent tool: ${args.name}`)
}

async function waitForAgents(
  runtime: AgentRuntime,
  args: {
    input: JsonObject
    onParked: () => Promise<void>
    wake?: WaiterWake
  }
) {
  const runIds = readRunIds(args.input.runIds)
  const timeoutMs = readTimeoutMilliseconds(args.input.timeout)
  const readRuns = async () =>
    await runtime.platform.readAgentRuns({
      parentId: runtime.context.run.id,
      runIds,
    })

  if (args.wake !== undefined) {
    return await resumeWait(runtime, args.wake, await readRuns())
  }

  const runs = await readRuns()

  if (allTerminal(runs)) {
    return { reason: "completed", runs }
  }

  const outcome = await park(runtime, {
    condition: { kind: "runs", runIds },
    deadline: Date.now() + timeoutMs,
    onParked: args.onParked,
    resolved: async () => allTerminal(await readRuns()),
  })

  return isParked(outcome)
    ? outcome
    : { reason: "completed", runs: await readRuns() }
}

async function resumeWait(
  runtime: AgentRuntime,
  wake: WaiterWake,
  runs: AgentRunStatus[]
) {
  await recordResumed(runtime, wake)

  return { reason: wakeReason(wake, runs), runs }
}

function wakeReason(wake: WaiterWake, runs: AgentRunStatus[]) {
  if (allTerminal(runs) || wake.reason === "resolved") {
    return "completed"
  }

  return wake.reason === "expired" ? "timeout" : "interrupted"
}

function readRunIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Missing runIds")
  }

  const runIds = [
    ...new Set(
      value.filter(
        (runId): runId is string =>
          typeof runId === "string" && runId.trim() !== ""
      )
    ),
  ] as Id<"runs">[]

  if (runIds.length === 0 || runIds.length > maxAgentWaitRuns) {
    throw new Error(`Agent waits require 1-${maxAgentWaitRuns} child runs.`)
  }

  return runIds
}

function readTimeoutMilliseconds(value: unknown) {
  if (value === undefined || value === null) {
    return defaultTimeoutMs
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("timeout must be an object with unit and value.")
  }

  const timeout = value as Partial<Duration>

  if (!isDurationUnit(timeout.unit)) {
    throw new Error("timeout.unit must be seconds, minutes, hours, or days.")
  }

  if (
    typeof timeout.value !== "number" ||
    !Number.isSafeInteger(timeout.value) ||
    timeout.value < 1
  ) {
    throw new Error("timeout.value must be a positive whole number.")
  }

  const milliseconds = durationMilliseconds({
    unit: timeout.unit,
    value: timeout.value,
  })

  if (milliseconds < minTimeoutMs || milliseconds > maxTimeoutMs) {
    throw new Error("timeout must be between 5 seconds and 30 days.")
  }

  return milliseconds
}

function allTerminal(runs: AgentRunStatus[]) {
  return runs.every((run) => isTerminalRunStatus(run.status))
}
