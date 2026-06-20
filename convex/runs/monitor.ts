import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"

export const trace = query({
  args: {
    runId: v.id("runs"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const run = await ctx.db.get(args.runId)

    if (run === null || run.tenantId !== args.tenantId) {
      return { type: "missing" as const }
    }

    if (run.status === "queued" || run.status === "running") {
      return { type: "pending" as const }
    }

    return { type: "missing" as const }
  },
})
