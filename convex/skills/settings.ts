import { v } from "convex/values"
import { mutation } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import { getSkillSetting } from "./data"

export const setGlobalEnabled = mutation({
  args: {
    tenantId: v.string(),
    skillId: v.id("skills"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const skill = await ctx.db.get(args.skillId)

    if (skill === null || skill.tenantId !== null) {
      throw new Error("Global skill not found.")
    }

    const setting = await getSkillSetting(ctx, args.tenantId, skill.name)

    if (args.enabled) {
      if (setting !== null) {
        await ctx.db.delete(setting._id)
      }

      return { enabled: true }
    }

    const userId = requireClerkUserId(identity)
    const now = Date.now()

    if (setting === null) {
      await ctx.db.insert("skillSettings", {
        tenantId: args.tenantId,
        skillName: skill.name,
        enabled: false,
        updatedBy: userId,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(setting._id, {
        enabled: false,
        updatedBy: userId,
        updatedAt: now,
      })
    }

    return { enabled: false }
  },
})
