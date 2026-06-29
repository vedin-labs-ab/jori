import { v } from "convex/values"
import { query } from "../../_generated/server"
import { requireTenantAccess } from "../../identity/access"
import { loadActivityData } from "./load"
import { projectActivity } from "./project"

export const list = query({
  args: {
    runId: v.id("runs"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const run = await ctx.db.get(args.runId)

    if (run === null || run.tenantId !== args.tenantId) {
      return { items: [], status: "missing" as const }
    }

    return {
      items: projectActivity(await loadActivityData(ctx, run)),
      status: "loaded" as const,
    }
  },
})
