import { v } from "convex/values"
import {
  type ConfigurablePermissionMode,
  getToolPermission,
  isToolPermissionConfigurable,
  isUserVisibleToolPermission,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
  type ToolPermission,
  toolPermissions,
  type UserVisibleToolPermission,
} from "../../contracts/permissions"
import {
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { ensureCurrentPerson } from "../persons/clerk"
import { listPermissionOverrides } from "./read"

const permissionModeValidator = v.union(
  v.literal("allowed"),
  v.literal("prompted"),
  v.literal("blocked")
)

export const list = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const overrides = await listPermissionOverrides(ctx, args.organizationId)
    const modes = resolveToolModes(overrides)
    const overridesByTool = new Map(
      overrides.map((override) => [override.tool, override.mode])
    )

    return toolPermissions
      .filter((permission) => isUserVisibleToolPermission(permission.tool))
      .map((permission) =>
        userVisiblePermission({
          mode: resolveToolMode(modes, permission.tool),
          overrideMode: overridesByTool.get(permission.tool) ?? null,
          permission,
        })
      )
  },
})

export const set = mutation({
  args: {
    organizationId: v.string(),
    tool: v.string(),
    mode: permissionModeValidator,
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const permission = getToolPermission(args.tool)

    if (permission === undefined) {
      throw new Error("Unknown tool")
    }

    if (!isToolPermissionConfigurable(permission)) {
      throw new Error("This tool permission cannot be changed to that mode")
    }

    const existing = await getOverride(ctx, args.organizationId, args.tool)
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    if (args.mode === permission.defaultMode) {
      if (existing !== null) {
        await ctx.db.delete(existing._id)
      }

      return { mode: args.mode, overrideMode: null }
    }

    if (existing === null) {
      await ctx.db.insert("permissions", {
        organizationId: args.organizationId,
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
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await listPermissionOverrides(ctx, args.organizationId)
  },
})

async function getOverride(
  ctx: MutationCtx,
  organizationId: string,
  tool: string
) {
  return await ctx.db
    .query("permissions")
    .withIndex("by_organization_and_tool", (query) =>
      query.eq("organizationId", organizationId).eq("tool", tool)
    )
    .unique()
}

function userVisiblePermission(args: {
  mode: PermissionMode
  overrideMode: ConfigurablePermissionMode | null
  permission: ToolPermission
}): UserVisibleToolPermission {
  const { usage: _usage, ...permission } = args.permission

  return {
    ...permission,
    mode: args.mode,
    overrideMode: args.overrideMode,
  }
}

export type { ConfigurablePermissionMode, PermissionMode }
