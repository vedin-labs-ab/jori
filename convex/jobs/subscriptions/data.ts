import { jobEventMatchKey } from "../../../contracts/jobs/events"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"

type EventTrigger = Extract<Doc<"jobs">["trigger"], { event: string }>

export async function ensureSubscription(
  ctx: MutationCtx,
  args: {
    organizationId: string
    trigger: EventTrigger
  }
) {
  const now = Date.now()
  const matchKey = jobEventMatchKey(args.trigger.match)
  const existing = await findSubscription(ctx, args.trigger)

  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      status: "active",
      error: undefined,
      updatedAt: now,
    })
    return existing._id
  }

  return await ctx.db.insert("subscriptions", {
    organizationId: args.organizationId,
    integrationId: args.trigger.integrationId,
    event: args.trigger.event,
    match: args.trigger.match,
    matchKey,
    status: "active",
    createdAt: now,
    updatedAt: now,
  })
}

export async function releaseSubscription(
  ctx: MutationCtx,
  args: {
    organizationId: string
    trigger: EventTrigger
    exceptJobId?: Id<"jobs">
  }
) {
  if (await hasMatchingJob(ctx, args)) {
    return false
  }

  const subscription = await findSubscription(ctx, args.trigger)

  if (subscription === null) {
    return false
  }

  await ctx.db.delete(subscription._id)

  return true
}

async function findSubscription(ctx: MutationCtx, trigger: EventTrigger) {
  const matchKey = jobEventMatchKey(trigger.match)
  return await ctx.db
    .query("subscriptions")
    .withIndex("by_integration_event_match", (index) =>
      index
        .eq("integrationId", trigger.integrationId)
        .eq("event", trigger.event)
        .eq("matchKey", matchKey)
    )
    .first()
}

async function hasMatchingJob(
  ctx: MutationCtx,
  args: {
    organizationId: string
    trigger: EventTrigger
    exceptJobId?: Id<"jobs">
  }
) {
  const jobs = await ctx.db
    .query("jobs")
    .withIndex("by_organization_status", (index) =>
      index.eq("organizationId", args.organizationId).eq("status", "active")
    )
    .collect()

  return jobs.some((job) => {
    if (job._id === args.exceptJobId) {
      return false
    }

    const trigger = job.trigger

    return (
      job.type === "event" &&
      "integrationId" in trigger &&
      trigger.integrationId === args.trigger.integrationId &&
      trigger.event === args.trigger.event &&
      jobEventMatchKey(trigger.match) === jobEventMatchKey(args.trigger.match)
    )
  })
}
