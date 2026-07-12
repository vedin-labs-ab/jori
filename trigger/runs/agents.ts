import { type ToolRuntime } from "../tool/runtime"
import { type AgentRunStatus, type ConvexId, type JsonObject } from "../types"
import { parkWaitpoint } from "./waiter"

const maxAgents = 20

export async function waitForAgents(runtime: ToolRuntime, input: JsonObject) {
  const runIds = readRunIds(input.runIds)
  const deadline = readDeadline(input.deadline)
  const readRuns = async () =>
    await runtime.convex.readAgentRuns({
      parentId: runtime.context.run.id,
      runIds,
    })

  let runs = await readRuns()

  if (allTerminal(runs)) {
    return { reason: "completed", runs }
  }

  if (deadline <= Date.now()) {
    return { reason: "deadline", runs }
  }

  const wake = await parkWaitpoint(runtime, {
    condition: { kind: "runs", runIds },
    deadline,
    resolved: async () => allTerminal(await readRuns()),
  })

  runs = await readRuns()

  return {
    reason:
      allTerminal(runs) || wake.reason === "resolved"
        ? "completed"
        : wake.reason === "expired"
          ? "deadline"
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

function readDeadline(value: unknown) {
  if (typeof value !== "string" || !value.endsWith("Z")) {
    throw new Error("deadline must be a UTC ISO 8601 timestamp ending in Z.")
  }

  const deadline = Date.parse(value)

  if (!Number.isFinite(deadline)) {
    throw new Error("deadline must be a valid UTC ISO 8601 timestamp.")
  }

  return deadline
}

function allTerminal(runs: AgentRunStatus[]) {
  return runs.every(
    (run) =>
      run.status === "completed" ||
      run.status === "failed" ||
      run.status === "stopped"
  )
}
