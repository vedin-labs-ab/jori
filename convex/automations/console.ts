import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { mutation, query } from "../_generated/server"
import { checkTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/clerk"
import { resolvePersonByIdentity } from "../persons/links"
import { scopeValidator } from "../shared/audience"
import { type QueryLikeCtx } from "../shared/context"
import {
  automationScope,
  canAccessAutomation,
  projectAccessForConsole,
} from "./access"
import { automationEventCatalog } from "./events"
import { findEventIntegration } from "./integrations"
import {
  createAutomation,
  createAutomationRun,
  getTenantAutomation,
  maxSearchResults,
  pauseAutomation,
  removeAutomation,
  resumeAutomation,
  searchAutomations,
  updateAutomation,
} from "./lifecycle"
import * as automationSchema from "./schema"

export const list = query({
  args: {
    tenantId: v.string(),
    query: v.string(),
    statusFilter: v.union(v.literal("all"), automationSchema.status),
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

    const personId = await resolvePersonByIdentity(ctx, {
      tenantId: args.tenantId,
      provider: "clerk",
      externalId: requireClerkUserId(access.identity),
    })
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
        automations
          .filter((automation) => canAccessAutomation(automation, personId))
          .map((automation) => toConsoleAutomation(ctx, automation))
      ),
    }
  },
})

export const get = query({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.tenantId)

    return await toConsoleAutomation(
      ctx,
      await requireAccessibleAutomation(ctx, args, personId)
    )
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
    ...automationSchema.automationBinding,
    name: v.string(),
    instructions: v.string(),
    scope: v.optional(scopeValidator),
    access: automationSchema.accessInput,
    type: automationSchema.automationType,
    trigger: automationSchema.triggerInput,
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
    scope: v.optional(scopeValidator),
    access: automationSchema.accessInput,
    type: v.optional(automationSchema.automationType),
    trigger: v.optional(automationSchema.triggerInput),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.tenantId)
    await requireAccessibleAutomation(ctx, args, personId)

    return await toConsoleAutomation(ctx, await updateAutomation(ctx, args))
  },
})

export const pause = mutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.tenantId)
    await requireAccessibleAutomation(ctx, args, personId)

    return await toConsoleAutomation(ctx, await pauseAutomation(ctx, args))
  },
})

export const resume = mutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.tenantId)
    await requireAccessibleAutomation(ctx, args, personId)

    return await toConsoleAutomation(ctx, await resumeAutomation(ctx, args))
  },
})

export const remove = mutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.tenantId)
    await requireAccessibleAutomation(ctx, args, personId)
    await removeAutomation(ctx, args)

    return null
  },
})

export const run = mutation({
  args: {
    tenantId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await ensureCurrentPerson(ctx, args.tenantId)
    const automation = await getTenantAutomation(
      ctx,
      args.tenantId,
      args.automationId
    )

    if (!canAccessAutomation(automation, personId)) {
      throw new Error("Automation not found.")
    }

    if (automation.type === "event") {
      throw new Error("Event automations run when their event arrives.")
    }

    const runId = await createAutomationRun(ctx, {
      automation,
      cause: { type: "manual", personId },
      now: Date.now(),
    })

    return { runId }
  },
})

/** Ownership rule on top of tenant access: personal automations are owner-only. */
async function requireAccessibleAutomation(
  ctx: QueryLikeCtx,
  args: { tenantId: string; automationId: Doc<"automations">["_id"] },
  personId: Doc<"persons">["_id"]
) {
  const automation = await getTenantAutomation(
    ctx,
    args.tenantId,
    args.automationId
  )

  if (!canAccessAutomation(automation, personId)) {
    throw new Error("Automation not found.")
  }

  return automation
}

export async function toConsoleAutomation(
  ctx: QueryLikeCtx,
  automation: Doc<"automations">
) {
  return {
    id: automation._id,
    key: automation.key,
    playbook: automation.playbook,
    artifactId: automation.artifactId,
    name: automation.name,
    instructions: automation.instructions,
    scope: automationScope(automation),
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
  ctx: QueryLikeCtx,
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
