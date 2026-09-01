import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, internalQuery } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { visibilityValidator } from "../visibility/schema"
import { createSight } from "../visibility/sight"
import { canSeeAutomation, requireVisibleAutomation } from "./access"
import { canExecuteAutomationRunTools } from "./execution"
import {
  createAutomation,
  fireAutomation,
  removeAutomation,
  searchAutomations,
  updateAutomation,
} from "./lifecycle"
import { deleteOwnedAutomations } from "./lifecycle/children"
import {
  accessInput,
  automationBinding,
  automationType,
  triggerInput,
} from "./schema"

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    ...automationBinding,
    parent: v.optional(
      v.object({
        id: v.id("automations"),
        version: v.optional(v.number()),
      })
    ),
    name: v.string(),
    instructions: v.string(),
    visibility: v.optional(visibilityValidator),
    access: accessInput,
    type: automationType,
    trigger: triggerInput,
    createdBy: v.optional(v.id("persons")),
  },
  handler: async (ctx, args) => await createAutomation(ctx, args),
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
    const automations = await searchAutomations(ctx, args)
    const sight = createSight(ctx, args)
    const visible: typeof automations = []

    for (const automation of automations) {
      if (await canSeeAutomation(sight, automation)) {
        visible.push(automation)
      }
    }

    return visible
  },
})

export const read = internalQuery({
  args: {
    organizationId: v.string(),
    personId: v.optional(v.id("persons")),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const automation = await ctx.db.get(args.automationId)

    if (
      automation === null ||
      automation.organizationId !== args.organizationId ||
      !(await canSeeAutomation(createSight(ctx, args), automation))
    ) {
      return null
    }

    return automation
  },
})

export const canExecuteRunTools = internalQuery({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    return run !== null && (await canExecuteAutomationRunTools(ctx, run))
  },
})

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    personId: v.optional(v.id("persons")),
    automationId: v.id("automations"),
    name: v.optional(v.string()),
    instructions: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    access: v.optional(accessInput),
    type: v.optional(automationType),
    trigger: v.optional(triggerInput),
  },
  handler: async (ctx, args) => {
    await requireRecordAccess(ctx, args)

    return await updateAutomation(ctx, { ...args, updatedBy: args.personId })
  },
})

export const remove = internalMutation({
  args: {
    organizationId: v.string(),
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

export const cleanupOwned = internalMutation({
  args: { parentId: v.id("automations") },
  handler: async (ctx, args) =>
    await deleteOwnedAutomations(ctx, args.parentId),
})

async function requireRecordAccess(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId?: Id<"persons">
    automationId: Doc<"automations">["_id"]
  }
) {
  await requireVisibleAutomation(ctx, args)
}
