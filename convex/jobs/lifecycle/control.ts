import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { releaseSubscription } from "../subscriptions/data"
import { deleteOwnedJobs } from "./children"
import { getOrganizationJob, getRequiredJob } from "./read"
import { activateTrigger, cancelTrigger, scheduleNextCronJob } from "./trigger"

export async function pauseJob(
  ctx: MutationCtx,
  args: {
    organizationId: string
    jobId: Id<"jobs">
  }
) {
  const job = await getOrganizationJob(ctx, args.organizationId, args.jobId)

  requirePausableJob(job)

  if (job.status === "paused") {
    return job
  }

  if (job.status === "completed") {
    throw new Error("Completed jobs cannot be paused.")
  }

  await stopJob(ctx, job)

  const trigger = clearTriggerFunction(job.trigger)
  await ctx.db.patch(job._id, {
    version: (job.version ?? 1) + 1,
    trigger,
    status: "paused",
    updatedAt: Date.now(),
  })
  await deleteOwnedJobs(ctx, job._id)

  return await getRequiredJob(ctx, job._id)
}

export async function resumeJob(
  ctx: MutationCtx,
  args: {
    organizationId: string
    jobId: Id<"jobs">
  }
) {
  const job = await getOrganizationJob(ctx, args.organizationId, args.jobId)

  requirePausableJob(job)

  if (job.status === "active") {
    return job
  }

  if (job.status === "completed") {
    throw new Error("Completed jobs cannot be resumed.")
  }

  const now = Date.now()
  const trigger =
    job.type === "cron"
      ? await scheduleNextCronJob(ctx, job, now)
      : "integrationId" in job.trigger
        ? await activateTrigger(ctx, { ...job, jobId: job._id })
        : job.trigger

  await ctx.db.patch(job._id, {
    trigger,
    status: "active",
    updatedAt: now,
  })

  return await getRequiredJob(ctx, job._id)
}

export async function removeJob(
  ctx: MutationCtx,
  args: {
    organizationId: string
    jobId: Id<"jobs">
  }
) {
  const job = await getOrganizationJob(ctx, args.organizationId, args.jobId)

  await stopJob(ctx, job)
  await ctx.db.delete(job._id)
  await deleteOwnedJobs(ctx, job._id)

  return { deleted: true, jobId: job._id }
}

async function stopJob(ctx: MutationCtx, job: Doc<"jobs">) {
  await cancelTrigger(ctx, job.trigger)

  if (job.type === "event" && "integrationId" in job.trigger) {
    await releaseSubscription(ctx, {
      organizationId: job.organizationId,
      trigger: job.trigger,
      exceptJobId: job._id,
    })
  }
}

function requirePausableJob(job: Doc<"jobs">) {
  if (job.type === "once") {
    throw new Error("One-time jobs cannot be paused.")
  }
}

function clearTriggerFunction(trigger: Doc<"jobs">["trigger"]) {
  if (!("nextAt" in trigger)) {
    return trigger
  }

  return {
    expression: trigger.expression,
    timezone: trigger.timezone,
    nextAt: trigger.nextAt,
  }
}
