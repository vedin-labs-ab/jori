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
  type IntegrationProvider,
  isUserScopedProvider,
} from "../providers/catalog"
import { projectAccessForConsole } from "./access"
import {
  createAutomation,
  maxSearchResults,
  removeAutomation,
  searchAutomations,
  updateAutomation,
} from "./data"
import { automationEventCatalog } from "./events"
import { accessInput, triggerInput } from "./schema"

export const list = query({
  args: {
    tenantId: v.string(),
    query: v.string(),
    includeCompleted: v.boolean(),
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
      includeCompleted: args.includeCompleted,
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

export const eventProviders = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const ownerId = requireClerkUserId(identity)

    return {
      providers: await Promise.all(
        automationEventCatalog.map(async (definition) => ({
          provider: definition.provider,
          connected: await hasActiveProviderIntegration(ctx, {
            provider: definition.provider,
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
    provider: integration?.provider,
    event: trigger.event,
    criteria: trigger.criteria,
    filter: trigger.filter,
  }
}

async function hasActiveProviderIntegration(
  ctx: QueryCtx,
  args: {
    provider: IntegrationProvider
    ownerId: string
    tenantId: string
  }
) {
  const integration = isUserScopedProvider(args.provider)
    ? await ctx.db
        .query("integrations")
        .withIndex("by_tenant_and_provider_and_owner", (query) =>
          query
            .eq("tenantId", args.tenantId)
            .eq("provider", args.provider)
            .eq("ownerId", args.ownerId)
        )
        .first()
    : await ctx.db
        .query("integrations")
        .withIndex("by_tenant_and_provider", (query) =>
          query.eq("tenantId", args.tenantId).eq("provider", args.provider)
        )
        .first()

  return integration?.status === "active"
}
