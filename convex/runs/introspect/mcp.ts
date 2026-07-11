import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type MiloToolRequest, readRecord } from "../../shared/input"
import { type SearchRunActivityArgs, type SearchRunsArgs } from "./schema"

type RunContext = {
  _id?: Id<"runs">
}

const runIntrospectionTools = new Set(["search_runs", "search_run_activity"])

export function isRunIntrospectionTool(tool: string) {
  return runIntrospectionTools.has(tool)
}

export async function callRunIntrospectionTool(
  ctx: ActionCtx,
  run: RunContext,
  request: MiloToolRequest
) {
  if (run._id === undefined) {
    throw new Error("Run introspection requires a current run.")
  }

  const args = readRecord(request.args)

  if (request.tool === "search_runs") {
    return await ctx.runQuery(internal.runs.introspect.query.searchRuns, {
      ...(args as SearchRunsArgs),
      currentRunId: run._id,
    })
  }

  if (request.tool === "search_run_activity") {
    return await ctx.runQuery(
      internal.runs.introspect.query.searchRunActivity,
      {
        ...(args as SearchRunActivityArgs),
        currentRunId: run._id,
      }
    )
  }

  throw new Error(`Unknown run introspection tool: ${request.tool}`)
}
