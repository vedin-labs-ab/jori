import { v } from "convex/values"
import { query } from "../../_generated/server"
import { requireTenantAccess } from "../../identity/access"
import { runVisibleToPerson } from "../console/filters"
import { resolveConsolePerson } from "../console/person"
import { loadActivityData } from "./load"
import { projectActivity } from "./project"

export const list = query({
  args: {
    runId: v.id("runs"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const personId = await resolveConsolePerson(ctx, args.tenantId, identity)

    const run = await ctx.db.get(args.runId)

    if (
      run === null ||
      run.tenantId !== args.tenantId ||
      !runVisibleToPerson(run, personId)
    ) {
      return { items: [], status: "missing" as const }
    }

    return {
      items: projectActivity(await loadActivityData(ctx, run, personId)),
      status: "loaded" as const,
    }
  },
})
