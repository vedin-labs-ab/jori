import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireTenantAccess } from "../skills/access"
import { summarizeExecution } from "./summaries"

export const page = query({
  args: {
    tenantId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const page = await ctx.db
      .query("executions")
      .withIndex("by_tenant", (index) => index.eq("tenantId", args.tenantId))
      .order("desc")
      .paginate(args.paginationOpts)

    const rows = []

    for (const execution of page.page) {
      rows.push(await summarizeExecution(ctx, execution))
    }

    return {
      ...page,
      page: rows,
    }
  },
})
