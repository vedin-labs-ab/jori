import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { mutation, query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { requireUserId } from "../access/users"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { resolvePersonByIdentity } from "../persons/identity/links"
import { type QueryLikeCtx } from "../shared/context"
import { visibilityValidator } from "../visibility/schema"
import { createSight } from "../visibility/sight"
import { canSeeJob, requireVisibleJob } from "./access"
import { toJobDisplay } from "./display"
import {
  createJob,
  maxSearchResults,
  pauseJob,
  removeJob,
  resumeJob,
  searchJobs,
  updateJob,
} from "./lifecycle"
import * as jobSchema from "./schema"

export const list = query({
  args: {
    organizationId: v.string(),
    query: v.string(),
    statusFilter: v.union(v.literal("all"), jobSchema.status),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        jobs: [],
      }
    }

    const personId = await resolvePersonByIdentity(ctx, {
      organizationId: args.organizationId,
      provider: "auth",
      externalId: requireUserId(access.identity),
    })
    const jobs = await searchJobs(ctx, {
      organizationId: args.organizationId,
      query: args.query,
      status: args.statusFilter === "all" ? undefined : args.statusFilter,
      includeCompleted: args.statusFilter === "all",
      limit: maxSearchResults,
    })

    const sight = createSight(ctx, {
      organizationId: args.organizationId,
      personId,
    })
    const visible: typeof jobs = []

    for (const job of jobs) {
      if (await canSeeJob(sight, job)) {
        visible.push(job)
      }
    }

    return {
      status: "ready" as const,
      jobs: await Promise.all(visible.map((job) => toJobDisplay(ctx, job))),
    }
  },
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    instructions: v.string(),
    visibility: v.optional(visibilityValidator),
    folderId: v.optional(v.id("folders")),
    access: jobSchema.accessInput,
    type: jobSchema.jobType,
    trigger: jobSchema.triggerInput,
  },
  handler: async (ctx, args) => {
    const createdBy = await ensureCurrentPerson(ctx, args.organizationId)
    const job = await createJob(ctx, {
      ...args,
      createdBy,
    })

    return await toJobDisplay(ctx, job)
  },
})

export const update = mutation({
  args: {
    organizationId: v.string(),
    jobId: v.id("jobs"),
    name: v.string(),
    instructions: v.string(),
    visibility: v.optional(visibilityValidator),
    access: jobSchema.accessInput,
    type: v.optional(jobSchema.jobType),
    trigger: v.optional(jobSchema.triggerInput),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    await requireAccessibleJob(ctx, args, personId)

    return await toJobDisplay(
      ctx,
      await updateJob(ctx, { ...args, updatedBy: personId })
    )
  },
})

export const pause = mutation({
  args: {
    organizationId: v.string(),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    await requireAccessibleJob(ctx, args, personId)

    return await toJobDisplay(ctx, await pauseJob(ctx, args))
  },
})

export const resume = mutation({
  args: {
    organizationId: v.string(),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    await requireAccessibleJob(ctx, args, personId)

    return await toJobDisplay(ctx, await resumeJob(ctx, args))
  },
})

export const remove = mutation({
  args: {
    organizationId: v.string(),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    await requireAccessibleJob(ctx, args, personId)
    await removeJob(ctx, args)

    return null
  },
})

/** Visibility rule on top of organization access: the resolver decides. */
async function requireAccessibleJob(
  ctx: QueryLikeCtx,
  args: { organizationId: string; jobId: Doc<"jobs">["_id"] },
  personId: Doc<"persons">["_id"]
) {
  return await requireVisibleJob(ctx, { ...args, personId })
}
