import { v } from "convex/values"
import {
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { requireClerkUserId } from "../identity/users"
import {
  type ConfigurablePermissionMode,
  getToolPermission,
  isModeAllowed,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
  toolPermissions,
} from "./catalog"

const permissionModeValidator = v.union(
  v.literal("allowed"),
  v.literal("prompted"),
  v.literal("blocked")
)

export const list = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      return null
    }

    const overrides = await listOverrides(ctx, args.tenantId)
    const modes = resolveToolModes(overrides)
    const overridesByTool = new Map(
      overrides.map((override) => [override.tool, override.mode])
    )

    return toolPermissions.map((permission) => ({
      ...permission,
      mode: resolveToolMode(modes, permission.tool),
      overrideMode: overridesByTool.get(permission.tool) ?? null,
    }))
  },
})

export const set = mutation({
  args: {
    tenantId: v.string(),
    tool: v.string(),
    mode: permissionModeValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error("Authentication required")
    }

    const permission = getToolPermission(args.tool)

    if (permission === undefined) {
      throw new Error("Unknown tool")
    }

    if (!isModeAllowed(permission, args.mode)) {
      throw new Error("This tool permission cannot be changed to that mode")
    }

    const existing = await getOverride(ctx, args.tenantId, args.tool)
    const userId = requireClerkUserId(identity)

    if (args.mode === permission.defaultMode) {
      if (existing !== null) {
        await ctx.db.delete(existing._id)
      }

      return { mode: args.mode, overrideMode: null }
    }

    if (existing === null) {
      await ctx.db.insert("permissions", {
        tenantId: args.tenantId,
        tool: args.tool,
        mode: args.mode,
        updatedBy: userId,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.patch(existing._id, {
        mode: args.mode,
        updatedBy: userId,
        updatedAt: Date.now(),
      })
    }

    return { mode: args.mode, overrideMode: args.mode }
  },
})

export const listForRuntime = internalQuery({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await listOverrides(ctx, args.tenantId)
  },
})

async function listOverrides(ctx: QueryLikeCtx, tenantId: string) {
  return await ctx.db
    .query("permissions")
    .withIndex("by_tenant", (query) => query.eq("tenantId", tenantId))
    .collect()
}

async function getOverride(ctx: MutationCtx, tenantId: string, tool: string) {
  return await ctx.db
    .query("permissions")
    .withIndex("by_tenant_and_tool", (query) =>
      query.eq("tenantId", tenantId).eq("tool", tool)
    )
    .unique()
}

type QueryLikeCtx = QueryCtx | MutationCtx

export type { ConfigurablePermissionMode, PermissionMode }
