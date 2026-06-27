import { v } from "convex/values"
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
  query,
} from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { discoveryStepKind } from "./schema"

const maxSteps = 40

export const get = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    return await readDiscovery(ctx, args.tenantId)
  },
})

export const start = internalMutation({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const existing = await readDiscovery(ctx, args.tenantId)
    const value = {
      tenantId: args.tenantId,
      status: "running" as const,
      steps: [],
      startedAt: Date.now(),
      errors: [],
    }

    if (existing === null) {
      await ctx.db.insert("organizationDiscovery", value)

      return
    }

    await ctx.db.replace(existing._id, value)
  },
})

export const startStep = internalMutation({
  args: {
    tenantId: v.string(),
    kind: discoveryStepKind,
    label: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const discovery = await readDiscovery(ctx, args.tenantId)

    if (discovery === null) {
      throw new Error("Discovery run has not started.")
    }

    const startedAt = Date.now()
    const entry = {
      kind: args.kind,
      label: args.label,
      startedAt,
      ...(args.url === undefined ? {} : { url: args.url }),
    }
    await ctx.db.patch(discovery._id, {
      steps: [...discovery.steps, entry].slice(-maxSteps),
    })

    return startedAt
  },
})

export const completeStep = internalMutation({
  args: {
    tenantId: v.string(),
    startedAt: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const discovery = await readDiscovery(ctx, args.tenantId)

    if (discovery === null) {
      return
    }

    const completedAt = Date.now()

    await ctx.db.patch(discovery._id, {
      steps: discovery.steps.map((step) =>
        step.startedAt === args.startedAt
          ? {
              ...step,
              completedAt,
              ...(args.error === undefined ? {} : { error: args.error }),
            }
          : step
      ),
      errors: appendError(discovery.errors, args.error),
    })
  },
})

export const finish = internalMutation({
  args: { tenantId: v.string(), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const discovery = await readDiscovery(ctx, args.tenantId)

    if (discovery === null) {
      return
    }

    const endedAt = Date.now()

    await ctx.db.patch(discovery._id, {
      status: "completed",
      endedAt,
      steps: closeOpenSteps(discovery.steps, endedAt, args.error),
      errors: appendError(discovery.errors, args.error),
    })
  },
})

function closeOpenSteps(
  steps: Array<{
    completedAt?: number
    error?: string
    kind: "page" | "summary"
    label: string
    startedAt: number
    url?: string
  }>,
  completedAt: number,
  error: string | undefined
) {
  return steps.map((step) =>
    step.completedAt !== undefined || step.error !== undefined
      ? step
      : {
          ...step,
          completedAt,
          ...(error === undefined ? {} : { error }),
        }
  )
}

function appendError(errors: string[], error: string | undefined) {
  if (error === undefined || errors.includes(error)) {
    return errors
  }

  return [...errors, error]
}

async function readDiscovery(ctx: QueryCtx | MutationCtx, tenantId: string) {
  return await ctx.db
    .query("organizationDiscovery")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .unique()
}
