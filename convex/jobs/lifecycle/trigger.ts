import {
  assertJobEventIsAvailable,
  getJobEventDefinition,
  normalizeJobEventMatch,
} from "../../../contracts/jobs/events"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveIntegrationForPrincipal } from "../../integrations/resolve"
import { type ExecutionPrincipal } from "../../runs/principal"
import { type JobTriggerInput, type JobType } from "../schema"
import { getTimeTrigger, getTimeTriggerAt } from "../timing"

export async function resolveTrigger(
  ctx: MutationCtx,
  args: {
    principal: ExecutionPrincipal
    organizationId: string
    type: JobType
    trigger: JobTriggerInput
    now: number
  }
): Promise<Doc<"jobs">["trigger"]> {
  if (args.type === "event") {
    if (!("integration" in args.trigger)) {
      throw new Error("Event jobs need an event trigger.")
    }

    const definition = getJobEventDefinition(
      args.trigger.integration,
      args.trigger.event
    )

    if (definition === undefined) {
      throw new Error("Choose a supported job event.")
    }

    assertJobEventIsAvailable(definition)

    const match = normalizeJobEventMatch(definition, args.trigger.match)

    return {
      integrationId: (
        await resolveIntegrationForPrincipal(ctx, {
          integration: args.trigger.integration,
          principal: args.principal,
          organizationId: args.organizationId,
        })
      )._id,
      event: definition.value,
      match,
    }
  }

  if (args.type === "once") {
    if (!("at" in args.trigger)) {
      throw new Error("One-time jobs need a time trigger.")
    }

    return getTimeTrigger({ type: "once", at: args.trigger.at }, args.now)
  }

  if (!("expression" in args.trigger)) {
    throw new Error("Recurring jobs need a cron expression.")
  }

  return getTimeTrigger(
    {
      type: "cron",
      expression: args.trigger.expression,
      timezone: args.trigger.timezone,
    },
    args.now
  )
}

export async function scheduleJobIfNeeded(
  ctx: MutationCtx,
  jobId: Id<"jobs">,
  trigger: Doc<"jobs">["trigger"]
) {
  const scheduledTrigger = await scheduleTrigger(ctx, {
    jobId,
    trigger,
  })

  if (scheduledTrigger !== trigger) {
    await ctx.db.patch(jobId, { trigger: scheduledTrigger })
  }
}

export async function scheduleNextCronJob(
  ctx: MutationCtx,
  job: Doc<"jobs">,
  now: number
) {
  if (job.type !== "cron" || !("expression" in job.trigger)) {
    throw new Error("Job does not use a cron trigger.")
  }

  const trigger = getTimeTrigger(
    {
      type: "cron",
      expression: job.trigger.expression,
      timezone: job.trigger.timezone,
    },
    now
  )

  return await scheduleTrigger(ctx, {
    jobId: job._id,
    trigger,
  })
}

export async function cancelTrigger(
  ctx: MutationCtx,
  trigger: Doc<"jobs">["trigger"]
) {
  if ("functionId" in trigger && trigger.functionId !== undefined) {
    await ctx.scheduler.cancel(trigger.functionId)
  }
}

export async function scheduleTrigger(
  ctx: MutationCtx,
  args: {
    jobId: Id<"jobs">
    trigger: Doc<"jobs">["trigger"]
  }
) {
  if ("integrationId" in args.trigger) {
    return args.trigger
  }

  const expectedAt = getTimeTriggerAt(args.trigger)
  const functionId = await ctx.scheduler.runAt(
    expectedAt,
    internal.jobs.records.fire,
    {
      jobId: args.jobId,
      expectedAt,
    }
  )

  return { ...args.trigger, functionId }
}
