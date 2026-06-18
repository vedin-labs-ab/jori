import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { checkTenantAccess, requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import {
  type Integration,
  isUserScopedIntegration,
} from "../shared/integrations"
import { projectAccessForConsole } from "./access"
import { automationEventCatalog } from "./events"
import {
  createAutomation,
  maxSearchResults,
  removeAutomation,
  searchAutomations,
  updateAutomation,
} from "./lifecycle"
import { accessInput, status, triggerInput } from "./schema"

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
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const ownerId = requireClerkUserId(identity)

    return {
      integrations: await Promise.all(
        automationEventCatalog.map(async (definition) => ({
          integration: definition.integration,
          connected: await hasActiveIntegration(ctx, {
            integration: definition.integration,
            ownerId,
            tenantId: args.tenantId,
          }),
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
    access: accessInput,
    trigger: triggerInput,
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const automation = await createAutomation(ctx, {
      ...args,
      createdBy: requireClerkUserId(identity),
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
    access: accessInput,
    trigger: v.optional(triggerInput),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    return await toConsoleAutomation(ctx, await updateAutomation(ctx, args))
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
    status: automation.status,
    trigger: await projectTriggerForConsole(ctx, automation.trigger),
    access: await projectAccessForConsole(ctx, automation.access),
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
    lastRunAt: automation.lastRunAt,
  }
}

async function projectTriggerForConsole(
  ctx: MutationCtx | QueryCtx,
  trigger: Doc<"automations">["trigger"]
) {
  if (trigger.type !== "event") {
    return trigger
  }

  const integration = await ctx.db.get(trigger.integrationId)

  return {
    type: "event" as const,
    integration: integration?.integration,
    event: trigger.event,
    criteria: trigger.criteria,
    filter: trigger.filter,
  }
}

async function hasActiveIntegration(
  ctx: QueryCtx,
  args: {
    integration: Integration
    ownerId: string
    tenantId: string
  }
) {
  const integration = isUserScopedIntegration(args.integration)
    ? await ctx.db
        .query("integrations")
        .withIndex("by_tenant_and_integration_and_owner", (query) =>
          query
            .eq("tenantId", args.tenantId)
            .eq("integration", args.integration)
            .eq("ownerId", args.ownerId)
        )
        .first()
    : await ctx.db
        .query("integrations")
        .withIndex("by_tenant_and_integration", (query) =>
          query
            .eq("tenantId", args.tenantId)
            .eq("integration", args.integration)
        )
        .first()

  return integration?.status === "active"
}
