import { automationEventMatchKey } from "../../../contracts/automations/events"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"

type EventTrigger = Extract<Doc<"automations">["trigger"], { event: string }>

export async function ensureSubscription(
  ctx: MutationCtx,
  args: {
    organizationId: string
    trigger: EventTrigger
  }
) {
  const now = Date.now()
  const matchKey = automationEventMatchKey(args.trigger.match)
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
    exceptAutomationId?: Id<"automations">
  }
) {
  if (await hasMatchingAutomation(ctx, args)) {
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
  const matchKey = automationEventMatchKey(trigger.match)
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

async function hasMatchingAutomation(
  ctx: MutationCtx,
  args: {
    organizationId: string
    trigger: EventTrigger
    exceptAutomationId?: Id<"automations">
  }
) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_organization_status", (index) =>
      index.eq("organizationId", args.organizationId).eq("status", "active")
    )
    .collect()

  return automations.some((automation) => {
    if (automation._id === args.exceptAutomationId) {
      return false
    }

    const trigger = automation.trigger

    return (
      automation.type === "event" &&
      "integrationId" in trigger &&
      trigger.integrationId === args.trigger.integrationId &&
      trigger.event === args.trigger.event &&
      automationEventMatchKey(trigger.match) ===
        automationEventMatchKey(args.trigger.match)
    )
  })
}
