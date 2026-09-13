import { v } from "convex/values"
import { query } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { resolveConsoleRun } from "../visibility"
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
    const visible = await resolveConsoleRun(ctx, args, identity)

    if (visible === null) {
      return null
    }

    const { run, personId } = visible
    return await summarizeRun(ctx, run, personId)
  },
})
