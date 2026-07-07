import { internalMutation } from "../_generated/server"

/**
 * One-off: fold the legacy visibility field into scope. Delete this file and
 * the schema's visibility line once it has run against the deployment.
 */
export const scopeFromVisibility = internalMutation({
  args: {},
  handler: async (ctx) => {
    const automations = await ctx.db.query("automations").collect()

    for (const automation of automations) {
      await ctx.db.patch(automation._id, {
        scope:
          automation.scope ??
          (automation.visibility === "public" ? "organization" : "personal"),
        visibility: undefined,
      })
    }

    return { migrated: automations.length }
  },
})
