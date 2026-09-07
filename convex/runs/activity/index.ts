import { v } from "convex/values"
import { query } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { resolveConsolePerson } from "../../persons/account"
import { runVisibleToPerson } from "../console/filters"
import { loadActivityData } from "./load"
import { projectActivity } from "./project"

export const list = query({
  args: {
    runId: v.id("runs"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await resolveConsolePerson(
      ctx,
      args.organizationId,
      identity
    )

    const run = await ctx.db.get(args.runId)

    if (
      run === null ||
      run.organizationId !== args.organizationId ||
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
