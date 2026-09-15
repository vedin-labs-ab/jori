import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { checkRunBudget } from "../../billing/guard"
import { mark } from "../../discovery/sync/intent"
import { getTimeTriggerAt } from "../timing"
import { hasInactiveParent } from "./children"
import { createJobRun } from "./run"
import { scheduleNextCronJob } from "./trigger"

export async function fireJob(
  ctx: MutationCtx,
  args: {
    jobId: Id<"jobs">
    expectedAt: number
  }
): Promise<{ runId: Id<"runs"> } | null> {
  const job = await ctx.db.get(args.jobId)
  const now = Date.now()

  if (
    job === null ||
    job.status !== "active" ||
    job.type === "event" ||
    !("nextAt" in job.trigger || "at" in job.trigger) ||
    getTimeTriggerAt(job.trigger) !== args.expectedAt
  ) {
    return null
  }

  if (await hasInactiveParent(ctx, job)) {
    await ctx.db.delete(job._id)
    return null
  }

  // A blocked budget drops this cycle's run but still advances the schedule,
  // so a paused organization resumes cleanly instead of replaying a backlog.
  const budget = await checkRunBudget(ctx, {
    organizationId: job.organizationId,
    interactive: false,
  })

  if (job.type === "once") {
    const runId = budget.ok
      ? await createJobRun(ctx, {
          job,
          cause: {
            type: "time",
            scheduledAt: args.expectedAt,
          },
          now,
        })
      : null

    await settleOnceJob(ctx, job, now)

    return runId === null ? null : { runId }
  }

  const trigger = await scheduleNextCronJob(ctx, job, now)
  const runId = budget.ok
    ? await createJobRun(ctx, {
        job: { ...job, trigger },
        cause: {
          type: "time",
          scheduledAt: args.expectedAt,
        },
        now,
      })
    : null

  await ctx.db.patch(job._id, {
    trigger,
    updatedAt: now,
  })

  return runId === null ? null : { runId }
}

/** A fired one-shot job has done its work: a person's job stays as a
 *  completed record, while one owned by another job goes with its firing. */
async function settleOnceJob(ctx: MutationCtx, job: Doc<"jobs">, now: number) {
  if (job.parent === undefined) {
    await ctx.db.patch(job._id, {
      status: "completed",
      trigger: {
        ...job.trigger,
        functionId: undefined,
      },
      updatedAt: now,
    })
    await mark(ctx, job.organizationId, job._id)
  } else {
    await ctx.db.delete(job._id)
    await mark(ctx, job.organizationId, job._id)
  }
}

export async function startEventJobs(
  ctx: MutationCtx,
  args: {
    event: Doc<"events">
    now: number
  }
) {
  const budget = await checkRunBudget(ctx, {
    organizationId: args.event.organizationId,
    interactive: false,
  })

  if (!budget.ok) {
    return []
  }

  const integration = await ctx.db.get(args.event.integrationId)
  const jobs = await ctx.db
    .query("jobs")
    .withIndex("by_organization_status", (index) =>
      index
        .eq("organizationId", args.event.organizationId)
        .eq("status", "active")
    )
    .collect()
  const runIds: Id<"runs">[] = []

  for (const job of jobs) {
    if (!matchesEvent(job, args.event)) {
      continue
    }

    runIds.push(
      await createJobRun(ctx, {
        job,
        event: args.event,
        integration,
        cause: {
          type: "event",
          eventId: args.event._id,
        },
        now: args.now,
      })
    )
  }

  return runIds
}

export function matchesEvent(job: Doc<"jobs">, event: Doc<"events">) {
  const trigger = job.trigger

  if (
    job.type !== "event" ||
    !("integrationId" in trigger) ||
    trigger.integrationId !== event.integrationId ||
    trigger.event !== event.type
  ) {
    return false
  }

  const triggerMatch = trigger.match

  if (triggerMatch === undefined) {
    return true
  }

  const eventMatch = event.match

  if (eventMatch === undefined) {
    return false
  }

  return Object.entries(triggerMatch).every(
    ([key, value]) => eventMatch[key] === value
  )
}
