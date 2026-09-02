import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, internalQuery } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { visibilityValidator } from "../visibility/schema"
import { createSight } from "../visibility/sight"
import { canSeeJob, requireVisibleJob } from "./access"
import { canExecuteJobRunTools } from "./execution"
import {
  createJob,
  fireJob,
  removeJob,
  searchJobs,
  updateJob,
} from "./lifecycle"
import { deleteOwnedJobs } from "./lifecycle/children"
import { accessInput, jobBinding, jobType, triggerInput } from "./schema"

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    ...jobBinding,
    parent: v.optional(
      v.object({
        id: v.id("jobs"),
        version: v.optional(v.number()),
      })
    ),
    name: v.string(),
    instructions: v.string(),
    visibility: v.optional(visibilityValidator),
    access: accessInput,
    type: jobType,
    trigger: triggerInput,
    createdBy: v.optional(v.id("persons")),
  },
  handler: async (ctx, args) => await createJob(ctx, args),
})

export const search = internalQuery({
  args: {
    organizationId: v.string(),
    personId: v.optional(v.id("persons")),
    query: v.optional(v.string()),
    includeCompleted: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const jobs = await searchJobs(ctx, args)
    const sight = createSight(ctx, args)
    const visible: typeof jobs = []

    for (const job of jobs) {
      if (await canSeeJob(sight, job)) {
        visible.push(job)
      }
    }

    return visible
  },
})

export const read = internalQuery({
  args: {
    organizationId: v.string(),
    personId: v.optional(v.id("persons")),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)

    if (
      job === null ||
      job.organizationId !== args.organizationId ||
      !(await canSeeJob(createSight(ctx, args), job))
    ) {
      return null
    }

    return job
  },
})

export const canExecuteRunTools = internalQuery({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    return run !== null && (await canExecuteJobRunTools(ctx, run))
  },
})

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    personId: v.optional(v.id("persons")),
    jobId: v.id("jobs"),
    name: v.optional(v.string()),
    instructions: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    access: v.optional(accessInput),
    type: v.optional(jobType),
    trigger: v.optional(triggerInput),
  },
  handler: async (ctx, args) => {
    await requireRecordAccess(ctx, args)

    return await updateJob(ctx, { ...args, updatedBy: args.personId })
  },
})

export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    personId: v.optional(v.id("persons")),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    await requireRecordAccess(ctx, args)

    return await removeJob(ctx, args)
  },
})

export const fire = internalMutation({
  args: {
    jobId: v.id("jobs"),
    expectedAt: v.number(),
  },
  handler: async (ctx, args) => await fireJob(ctx, args),
})

export const cleanupOwned = internalMutation({
  args: { parentId: v.id("jobs") },
  handler: async (ctx, args) => await deleteOwnedJobs(ctx, args.parentId),
})

async function requireRecordAccess(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId?: Id<"persons">
    jobId: Doc<"jobs">["_id"]
  }
) {
  await requireVisibleJob(ctx, args)
}
