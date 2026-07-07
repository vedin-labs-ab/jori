import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, internalQuery } from "../_generated/server"
import { scopeValidator } from "../shared/audience"
import { type QueryLikeCtx } from "../shared/context"
import { canAccessAutomation } from "./access"
import {
  createAutomation,
  fireAutomation,
  getTenantAutomation,
  pauseAutomation,
  removeAutomation,
  resumeAutomation,
  searchAutomations,
  updateAutomation,
} from "./lifecycle"
import { accessInput, automationType, triggerInput } from "./schema"

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    artifactId: v.optional(v.id("artifacts")),
    name: v.string(),
    instructions: v.string(),
    scope: v.optional(scopeValidator),
    access: accessInput,
    type: automationType,
    trigger: triggerInput,
    createdBy: v.optional(v.id("persons")),
  },
  handler: async (ctx, args) => await createAutomation(ctx, args),
})

export const search = internalQuery({
  args: {
    tenantId: v.string(),
    personId: v.optional(v.id("persons")),
    query: v.optional(v.string()),
    includeCompleted: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const automations = await searchAutomations(ctx, args)

    return automations.filter((automation) =>
      canAccessAutomation(automation, args.personId)
    )
  },
})

export const read = internalQuery({
  args: {
    tenantId: v.string(),
    personId: v.optional(v.id("persons")),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const automation = await ctx.db.get(args.automationId)

    if (
      automation === null ||
      automation.tenantId !== args.tenantId ||
      !canAccessAutomation(automation, args.personId)
    ) {
      return null
    }

    return automation
  },
})

export const update = internalMutation({
  args: {
    tenantId: v.string(),
    personId: v.optional(v.id("persons")),
    automationId: v.id("automations"),
    artifactId: v.optional(v.id("artifacts")),
    name: v.optional(v.string()),
    instructions: v.optional(v.string()),
    scope: v.optional(scopeValidator),
    access: v.optional(accessInput),
    type: v.optional(automationType),
    trigger: v.optional(triggerInput),
  },
  handler: async (ctx, args) => {
    await requireRecordAccess(ctx, args)

    return await updateAutomation(ctx, args)
  },
})

export const pause = internalMutation({
  args: {
    tenantId: v.string(),
    personId: v.optional(v.id("persons")),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    await requireRecordAccess(ctx, args)

    return await pauseAutomation(ctx, args)
  },
})

export const resume = internalMutation({
  args: {
    tenantId: v.string(),
    personId: v.optional(v.id("persons")),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    await requireRecordAccess(ctx, args)

    return await resumeAutomation(ctx, args)
  },
})

export const remove = internalMutation({
  args: {
    tenantId: v.string(),
    personId: v.optional(v.id("persons")),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    await requireRecordAccess(ctx, args)

    return await removeAutomation(ctx, args)
  },
})

export const fire = internalMutation({
  args: {
    automationId: v.id("automations"),
    expectedAt: v.number(),
  },
  handler: async (ctx, args) => await fireAutomation(ctx, args),
})

async function requireRecordAccess(
  ctx: QueryLikeCtx,
  args: {
    tenantId: string
    personId?: Id<"persons">
    automationId: Doc<"automations">["_id"]
  }
) {
  const automation = await getTenantAutomation(
    ctx,
    args.tenantId,
    args.automationId
  )

  if (!canAccessAutomation(automation, args.personId)) {
    throw new Error("Automation not found.")
  }
}
