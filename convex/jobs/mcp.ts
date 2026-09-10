import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type JoriToolRequest, readRecord } from "../shared/input"
import { visibilityFromInput } from "../visibility/schema"
import { type JobAccessInput } from "./access"
import { type JobTriggerInput, type JobType } from "./schema"

type AddJobArgs = {
  key?: string
  name: string
  instructions: string
  visibility?: "private" | "organization"
  access: JobAccessInput
  type: JobType
  trigger: JobTriggerInput
}

type SearchJobsArgs = {
  query?: string
  includeCompleted?: boolean
  limit?: number
}

type ReadJobArgs = {
  jobId: Id<"jobs">
}

type UpdateJobArgs = {
  jobId: Id<"jobs">
  name?: string
  instructions?: string
  visibility?: "private" | "organization"
  access?: JobAccessInput
  type?: JobType
  trigger?: JobTriggerInput
}

export async function callJoriJobTool(
  ctx: ActionCtx,
  execution: {
    organizationId: string
    createdBy?: Id<"persons">
    runId?: Id<"runs">
    job?: { id: Id<"jobs">; version?: number }
  },
  request: JoriToolRequest
) {
  const args = readRecord(request.args)

  if (request.tool === "add_job") {
    const { visibility, ...input } = args as AddJobArgs
    return await ctx.runMutation(internal.jobs.records.create, {
      ...input,
      visibility:
        visibility === undefined ? undefined : visibilityFromInput(visibility),
      organizationId: execution.organizationId,
      runId: execution.runId,
      createdBy: execution.createdBy,
      parent: input.type === "once" ? execution.job : undefined,
    })
  }

  if (request.tool === "search_jobs") {
    return await ctx.runQuery(internal.jobs.records.search, {
      ...(args as SearchJobsArgs),
      organizationId: execution.organizationId,
      runId: execution.runId,
      personId: execution.createdBy,
    })
  }

  if (request.tool === "read_job") {
    return await ctx.runQuery(internal.jobs.records.read, {
      ...(args as ReadJobArgs),
      organizationId: execution.organizationId,
      runId: execution.runId,
      personId: execution.createdBy,
    })
  }

  if (request.tool === "update_job") {
    const { visibility, ...input } = args as UpdateJobArgs
    return await ctx.runMutation(internal.jobs.records.update, {
      ...input,
      visibility:
        visibility === undefined ? undefined : visibilityFromInput(visibility),
      organizationId: execution.organizationId,
      runId: execution.runId,
      personId: execution.createdBy,
    })
  }

  if (request.tool === "delete_job") {
    return await ctx.runMutation(internal.jobs.records.remove, {
      ...(args as ReadJobArgs),
      organizationId: execution.organizationId,
      runId: execution.runId,
      personId: execution.createdBy,
    })
  }

  throw new Error(`Unknown Jori tool: ${request.tool}`)
}
