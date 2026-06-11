import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireTenantAccess } from "../skills/access"

export const trace = query({
  args: {
    executionId: v.id("executions"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const execution = await ctx.db.get(args.executionId)

    if (execution === null || execution.tenantId !== args.tenantId) {
      return { type: "missing" as const }
    }

    const trace = execution.trace

    if (trace !== undefined && "fileId" in trace) {
      const url = await ctx.storage.getUrl(trace.fileId)

      return url === null
        ? { type: "missing" as const }
        : { type: "stored" as const, url }
    }

    if (trace !== undefined && "host" in trace) {
      return {
        type: "live" as const,
        url: `https://${trace.host}/trace?token=${trace.token}`,
      }
    }

    if (execution.status === "queued" || execution.status === "running") {
      return { type: "pending" as const }
    }

    return { type: "missing" as const }
  },
})
