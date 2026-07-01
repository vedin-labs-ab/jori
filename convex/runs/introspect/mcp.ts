import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"

type IntrospectionRequest = {
  args?: unknown
  tool: string
}

type RunContext = {
  _id?: Id<"runs">
}

type SearchRunsArgs = {
  cursor?: string
  limit?: number
  parentId?: string
  query?: string
  rootId?: string
  runIds?: string[]
  scope?: "conversation" | "tenant" | "all"
  since?: number
  source?: "slack" | "github" | "linear" | "automation"
  status?: "queued" | "running" | "completed" | "failed" | "stopped"
  until?: number
}

type SearchRunActivityArgs = {
  cursor?: string
  filter?: ("agent" | "approval" | "asset" | "error" | "model" | "tool")[]
  limit?: number
  runId: string
}

const runIntrospectionTools = new Set(["search_runs", "search_run_activity"])

export function isRunIntrospectionTool(tool: string) {
  return runIntrospectionTools.has(tool)
}

export async function callRunIntrospectionTool(
  ctx: ActionCtx,
  run: RunContext,
  request: IntrospectionRequest
) {
  if (run._id === undefined) {
    throw new Error("Run introspection requires a current run.")
  }

  const args = normalizeToolArgs(request.args)

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

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args
}
