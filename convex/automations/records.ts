import { v } from "convex/values"
import { internalMutation, internalQuery } from "../_generated/server"
import {
  createAutomation,
  fireAutomation,
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
    access: accessInput,
    type: automationType,
    trigger: triggerInput,
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => await createAutomation(ctx, args),
})

export const search = internalQuery({
  args: {
    tenantId: v.string(),
    query: v.optional(v.string()),
    includeCompleted: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => await searchAutomations(ctx, args),
})

export const read = internalQuery({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const automation = await ctx.db.get(args.automationId)

    if (automation === null || automation.tenantId !== args.tenantId) {
      return null
    }

    return automation
  },
})

export const update = internalMutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
    artifactId: v.optional(v.id("artifacts")),
    name: v.optional(v.string()),
    instructions: v.optional(v.string()),
    access: v.optional(accessInput),
    type: v.optional(automationType),
    trigger: v.optional(triggerInput),
  },
  handler: async (ctx, args) => await updateAutomation(ctx, args),
})

export const pause = internalMutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => await pauseAutomation(ctx, args),
})

export const resume = internalMutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => await resumeAutomation(ctx, args),
})

export const remove = internalMutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => await removeAutomation(ctx, args),
})

export const fire = internalMutation({
  args: {
    automationId: v.id("automations"),
    expectedAt: v.number(),
  },
  handler: async (ctx, args) => await fireAutomation(ctx, args),
})
