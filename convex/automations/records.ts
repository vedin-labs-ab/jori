import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, internalQuery } from "../_generated/server"
import { scopeValidator } from "../shared/audience"
import { type QueryLikeCtx } from "../shared/context"
import { canAccessAutomation } from "./access"
import { canExecuteAutomationRunTools } from "./execution"
import {
  createAutomation,
  fireAutomation,
  getOrganizationAutomation,
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
    parentId: v.optional(v.id("automations")),
    expectedParentConfigurationVersion: v.optional(v.number()),
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
    organizationId: v.string(),
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
    organizationId: v.string(),
    personId: v.optional(v.id("persons")),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const automation = await ctx.db.get(args.automationId)

    if (
      automation === null ||
      automation.organizationId !== args.organizationId ||
      !canAccessAutomation(automation, args.personId)
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
    appId: v.optional(v.id("apps")),
    name: v.optional(v.string()),
    instructions: v.optional(v.string()),
    scope: v.optional(scopeValidator),
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
  const automation = await getOrganizationAutomation(
    ctx,
    args.organizationId,
    args.automationId
  )

  if (!canAccessAutomation(automation, args.personId)) {
    throw new Error("Automation not found.")
  }
}
