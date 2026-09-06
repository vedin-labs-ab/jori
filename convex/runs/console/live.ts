import { v } from "convex/values"
import { query } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { runVisibleToPerson } from "./filters"
import { resolveConsolePerson } from "./person"
import { summarizeRun } from "./summaries"

/** One run as the Activity page would list it, for a surface following
 *  that run on its own — the chat, while Jori answers. Missing, foreign,
 *  and invisible runs all read as null. */
export const get = query({
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
      return null
    }

    return await summarizeRun(ctx, run, personId)
  },
})
