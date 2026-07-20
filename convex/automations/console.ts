import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { mutation, query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { requireClerkUserId } from "../access/users"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/clerk"
import { resolvePersonByIdentity } from "../persons/identity/links"
import { scopeValidator } from "../shared/audience"
import { type QueryLikeCtx } from "../shared/context"
import { canAccessAutomation } from "./access"
import { toAutomationDisplay } from "./display"
import {
  createAutomation,
  createAutomationRun,
  getOrganizationAutomation,
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
    organizationId: v.string(),
    query: v.string(),
    statusFilter: v.union(v.literal("all"), automationSchema.status),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        automations: [],
      }
    }

    const personId = await resolvePersonByIdentity(ctx, {
      organizationId: args.organizationId,
      provider: "clerk",
      externalId: requireClerkUserId(access.identity),
    })
    const automations = await searchAutomations(ctx, {
      organizationId: args.organizationId,
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
          .map((automation) => toAutomationDisplay(ctx, automation))
      ),
    }
  },
})

export const get = query({
  args: {
    organizationId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    return await toAutomationDisplay(
      ctx,
      await requireAccessibleAutomation(ctx, args, personId)
    )
  },
})

// Playbook-bound creates go through playbooks/actions.create, which also
// provisions the playbook's artifact; this creates plain automations only.
export const create = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    instructions: v.string(),
    scope: v.optional(scopeValidator),
    access: automationSchema.accessInput,
    type: automationSchema.automationType,
    trigger: automationSchema.triggerInput,
  },
  handler: async (ctx, args) => {
    const createdBy = await ensureCurrentPerson(ctx, args.organizationId)
    const automation = await createAutomation(ctx, {
      ...args,
      createdBy,
    })

    return await toAutomationDisplay(ctx, automation)
  },
})

export const update = mutation({
  args: {
    organizationId: v.string(),
    automationId: v.id("automations"),
    name: v.string(),
    instructions: v.string(),
    scope: v.optional(scopeValidator),
    access: automationSchema.accessInput,
    type: v.optional(automationSchema.automationType),
    trigger: v.optional(automationSchema.triggerInput),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    await requireAccessibleAutomation(ctx, args, personId)

    return await toAutomationDisplay(
      ctx,
      await updateAutomation(ctx, { ...args, updatedBy: personId })
    )
  },
})

export const pause = mutation({
  args: {
    organizationId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    await requireAccessibleAutomation(ctx, args, personId)

    return await toAutomationDisplay(ctx, await pauseAutomation(ctx, args))
  },
})

export const resume = mutation({
  args: {
    organizationId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    await requireAccessibleAutomation(ctx, args, personId)

    return await toAutomationDisplay(ctx, await resumeAutomation(ctx, args))
  },
})

export const remove = mutation({
  args: {
    organizationId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    await requireAccessibleAutomation(ctx, args, personId)
    await removeAutomation(ctx, args)

    return null
  },
})

export const run = mutation({
  args: {
    organizationId: v.string(),
    automationId: v.id("automations"),
  },
  handler: async (ctx, args) => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)
    const automation = await getOrganizationAutomation(
      ctx,
      args.organizationId,
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

/** Ownership rule on top of organization access: personal automations are owner-only. */
async function requireAccessibleAutomation(
  ctx: QueryLikeCtx,
  args: { organizationId: string; automationId: Doc<"automations">["_id"] },
  personId: Doc<"persons">["_id"]
) {
  const automation = await getOrganizationAutomation(
    ctx,
    args.organizationId,
    args.automationId
  )

  if (!canAccessAutomation(automation, personId)) {
    throw new Error("Automation not found.")
  }

  return automation
}
