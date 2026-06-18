import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { automationEventCriteriaKey } from "../events"

type EventTrigger = Extract<Doc<"automations">["trigger"], { event: string }>

export async function ensureSubscription(
  ctx: MutationCtx,
  args: {
    tenantId: string
    trigger: EventTrigger
  }
) {
  const now = Date.now()
  const criteriaKey = automationEventCriteriaKey(args.trigger.criteria)
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
    tenantId: args.tenantId,
    integrationId: args.trigger.integrationId,
    event: args.trigger.event,
    criteria: args.trigger.criteria,
    criteriaKey,
    status: "active",
    createdAt: now,
    updatedAt: now,
  })
}

export async function releaseSubscription(
  ctx: MutationCtx,
  args: {
    tenantId: string
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
  const criteriaKey = automationEventCriteriaKey(trigger.criteria)
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_integration_event_criteria", (index) =>
      index
        .eq("integrationId", trigger.integrationId)
        .eq("event", trigger.event)
        .eq("criteriaKey", criteriaKey)
    )
    .first()

  if (subscription !== null || trigger.filter === undefined) {
    return subscription
  }

  return await ctx.db
    .query("subscriptions")
    .withIndex("by_integration_event_resource", (index) =>
      index
        .eq("integrationId", trigger.integrationId)
        .eq("event", trigger.event)
        .eq("resource", trigger.filter)
    )
    .first()
}

async function hasMatchingAutomation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    trigger: EventTrigger
    exceptAutomationId?: Id<"automations">
  }
) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_tenant_status", (index) =>
      index.eq("tenantId", args.tenantId).eq("status", "active")
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
      automationEventCriteriaKey(trigger.criteria) ===
        automationEventCriteriaKey(args.trigger.criteria)
    )
  })
}
