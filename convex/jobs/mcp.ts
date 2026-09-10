import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type JoriToolRequest, readRecord } from "../shared/input"
import { type ResourceViewer } from "../visibility/resources"
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
  {
    job,
    ...viewer
  }: ResourceViewer & {
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
      organizationId: viewer.organizationId,
      runId: viewer.runId,
      createdBy: viewer.personId,
      parent: input.type === "once" ? job : undefined,
    })
  }

  if (request.tool === "search_jobs") {
    return await ctx.runQuery(internal.jobs.records.search, {
      ...(args as SearchJobsArgs),
      ...viewer,
    })
  }

  if (request.tool === "read_job") {
    return await ctx.runQuery(internal.jobs.records.read, {
      ...(args as ReadJobArgs),
      ...viewer,
    })
  }

  if (request.tool === "update_job") {
    const { visibility, ...input } = args as UpdateJobArgs
    return await ctx.runMutation(internal.jobs.records.update, {
      ...input,
      visibility:
        visibility === undefined ? undefined : visibilityFromInput(visibility),
      ...viewer,
    })
  }

  if (request.tool === "delete_job") {
    return await ctx.runMutation(internal.jobs.records.remove, {
      ...(args as ReadJobArgs),
      ...viewer,
    })
  }

  throw new Error(`Unknown Jori tool: ${request.tool}`)
}
