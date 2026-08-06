import { internal } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
import { type JoriToolRequest, readRecord } from "../shared/input"
import { type ReadWorkstreamsArgs } from "./agent"

const workstreamTools = new Set(["read_workstreams"])

export function isWorkstreamTool(tool: string) {
  return workstreamTools.has(tool)
}

export async function callWorkstreamTool(
  ctx: ActionCtx,
  run: { organizationId: string },
  request: JoriToolRequest
) {
  const args = readRecord(request.args)

  return await ctx.runQuery(internal.workstreams.agent.readWorkstreams, {
    ...(args as Omit<ReadWorkstreamsArgs, "organizationId">),
    organizationId: run.organizationId,
  })
}
