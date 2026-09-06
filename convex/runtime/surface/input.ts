import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type AgentRuntimeInput } from "../../runs/agent/input"

export async function requireMessageSurfaceInput(
  ctx: ActionCtx,
  args: {
    runId: Id<"runs">
    surface: "reply" | "reaction"
  }
): Promise<Extract<AgentRuntimeInput, { type: "message" }>> {
  const input = (await ctx.runQuery(internal.runs.records.getInputByRun, {
    runId: args.runId,
  })) as AgentRuntimeInput | null

  if (input === null || input.type !== "message") {
    throw new Error(`Run has no active ${args.surface} surface.`)
  }

  if (input.integration !== null && input.integration.status !== "active") {
    throw new Error(`Active ${args.surface} integration is not active.`)
  }

  return input
}
