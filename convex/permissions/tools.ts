import { v } from "convex/values"
import {
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { ensureCurrentPerson } from "../persons/clerk"
import {
  type ConfigurablePermissionMode,
  getToolPermission,
  isModeAllowed,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
  toolPermissions,
} from "./catalog"
import { listPermissionOverrides } from "./read"

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
    await requireTenantAccess(ctx, args.tenantId)

    const overrides = await listPermissionOverrides(ctx, args.tenantId)
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
    await requireTenantAccess(ctx, args.tenantId)

    const permission = getToolPermission(args.tool)

    if (permission === undefined) {
      throw new Error("Unknown tool")
    }

    if (!isModeAllowed(permission, args.mode)) {
      throw new Error("This tool permission cannot be changed to that mode")
    }

    const existing = await getOverride(ctx, args.tenantId, args.tool)
    const personId = await ensureCurrentPerson(ctx, args.tenantId)

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
        updatedBy: personId,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.patch(existing._id, {
        mode: args.mode,
        updatedBy: personId,
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
    return await listPermissionOverrides(ctx, args.tenantId)
  },
})

async function getOverride(ctx: MutationCtx, tenantId: string, tool: string) {
  return await ctx.db
    .query("permissions")
    .withIndex("by_tenant_and_tool", (query) =>
      query.eq("tenantId", tenantId).eq("tool", tool)
    )
    .unique()
}

export type { ConfigurablePermissionMode, PermissionMode }
