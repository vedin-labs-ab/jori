import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { checkTenantAccess, requireTenantAccess } from "../identity/access"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/clerk"
import { projectAccessForConsole } from "./access"
import { automationEventCatalog } from "./events"
import { findEventIntegration } from "./integrations"
import {
  createAutomation,
  maxSearchResults,
  pauseAutomation,
  removeAutomation,
  resumeAutomation,
  searchAutomations,
  updateAutomation,
} from "./lifecycle"
import {
  accessInput,
  automationType,
  automationVisibility,
  status,
  triggerInput,
} from "./schema"

export const list = query({
  args: {
    tenantId: v.string(),
    query: v.string(),
    statusFilter: v.union(v.literal("all"), status),
  },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        automations: [],
      }
    }

    const automations = await searchAutomations(ctx, {
      tenantId: args.tenantId,
      query: args.query,
      status: args.statusFilter === "all" ? undefined : args.statusFilter,
      includeCompleted: args.statusFilter === "all",
      limit: maxSearchResults,
    })

    return {
      status: "ready" as const,
      automations: await Promise.all(
        automations.map((automation) => toConsoleAutomation(ctx, automation))
      ),
    }
  },
})

export const eventIntegrations = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerId = await resolveCurrentPerson(ctx, args.tenantId)

    return {
      integrations: await Promise.all(
        automationEventCatalog.map(async (definition) => ({
          integration: definition.integration,
          connected:
            (
              await findEventIntegration(ctx, {
                integration: definition.integration,
                ownerId,
                tenantId: args.tenantId,
              })
            )?.status === "active",
        }))
      ),
    }
  },
})

export const create = mutation({
  args: {
    tenantId: v.string(),
    name: v.string(),
    instructions: v.string(),
    visibility: v.optional(automationVisibility),
    access: accessInput,
    type: automationType,
    trigger: triggerInput,
  },
  handler: async (ctx, args) => {
    const createdBy = await ensureCurrentPerson(ctx, args.tenantId)
    const automation = await createAutomation(ctx, {
      ...args,
      createdBy,
    })

    return await toConsoleAutomation(ctx, automation)
  },
})

export const update = mutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
    name: v.string(),
    instructions: v.string(),
    visibility: v.optional(automationVisibility),
    access: accessInput,
    type: v.optional(automationType),
    trigger: v.optional(triggerInput),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    return await toConsoleAutomation(ctx, await updateAutomation(ctx, args))
  },
})

export const pause = mutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    return await toConsoleAutomation(ctx, await pauseAutomation(ctx, args))
  },
})

export const resume = mutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    return await toConsoleAutomation(ctx, await resumeAutomation(ctx, args))
  },
})

export const remove = mutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    await removeAutomation(ctx, args)

    return null
  },
})

async function toConsoleAutomation(
  ctx: MutationCtx | QueryCtx,
  automation: Doc<"automations">
) {
  return {
    id: automation._id,
    name: automation.name,
    instructions: automation.instructions,
    visibility: automation.visibility ?? "private",
    type: automation.type,
    status: automation.status,
    trigger: await projectTriggerForConsole(ctx, automation),
    access: await projectAccessForConsole(ctx, automation.access),
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
    firedAt: automation.firedAt,
  }
}

async function projectTriggerForConsole(
  ctx: MutationCtx | QueryCtx,
  automation: Doc<"automations">
) {
  const trigger = automation.trigger

  if (automation.type !== "event" || !("integrationId" in trigger)) {
    return trigger
  }

  const integration = await ctx.db.get(trigger.integrationId)

  return {
    integration: integration?.integration,
    event: trigger.event,
    match: trigger.match,
  }
}
