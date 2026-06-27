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
    }

    if (existing === null) {
      await ctx.db.insert("organizationDiscovery", value)

      return
    }

    await ctx.db.replace(existing._id, value)
  },
})

export const step = internalMutation({
  args: {
    tenantId: v.string(),
    kind: discoveryStepKind,
    label: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const discovery = await readDiscovery(ctx, args.tenantId)

    if (discovery === null) {
      return
    }

    const entry = {
      at: Date.now(),
      kind: args.kind,
      label: args.label,
      ...(args.url === undefined ? {} : { url: args.url }),
    }
    await ctx.db.patch(discovery._id, {
      steps: [...discovery.steps, entry].slice(-maxSteps),
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

    await ctx.db.patch(discovery._id, {
      status: args.error === undefined ? "succeeded" : "failed",
      endedAt: Date.now(),
      ...(args.error === undefined ? {} : { error: args.error }),
    })
  },
})

async function readDiscovery(ctx: QueryCtx | MutationCtx, tenantId: string) {
  return await ctx.db
    .query("organizationDiscovery")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .unique()
}
