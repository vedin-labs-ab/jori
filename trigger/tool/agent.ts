import {
  type Duration,
  durationMilliseconds,
  isDurationUnit,
} from "../../contracts/runtime/duration"
import { type AgentRunStatus, type ConvexId, type JsonObject } from "../types"
import { parkWaitpoint } from "../waiter"
import { type ToolRuntime } from "./runtime"

const maxAgents = 20
const minTimeoutMs = durationMilliseconds({ unit: "seconds", value: 5 })
const maxTimeoutMs = durationMilliseconds({ unit: "days", value: 30 })

export async function waitForAgents(
  runtime: ToolRuntime,
  input: JsonObject,
  onParked?: () => Promise<void>
) {
  const runIds = readRunIds(input.runIds)
  const timeoutMs = readTimeoutMilliseconds(input.timeout)
  const readRuns = async () =>
    await runtime.convex.readAgentRuns({
      parentId: runtime.context.run.id,
      runIds,
    })

  let runs = await readRuns()

  if (allTerminal(runs)) {
    return { reason: "completed", runs }
  }

  const wake = await parkWaitpoint(runtime, {
    condition: { kind: "runs", runIds },
    deadline: Date.now() + timeoutMs,
    onParked,
    resolved: async () => allTerminal(await readRuns()),
  })

  runs = await readRuns()

  return {
    reason:
      allTerminal(runs) || wake.reason === "resolved"
        ? "completed"
        : wake.reason === "expired"
          ? "timeout"
          : "interrupted",
    runs,
  }
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
  ] as ConvexId<"runs">[]

  if (runIds.length === 0 || runIds.length > maxAgents) {
    throw new Error(`Agent waits require 1-${maxAgents} child runs.`)
  }

  return runIds
}

function readTimeoutMilliseconds(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Missing timeout")
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
  return runs.every(
    (run) =>
      run.status === "completed" ||
      run.status === "failed" ||
      run.status === "stopped"
  )
}
