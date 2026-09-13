import { v } from "convex/values"
import { query } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { resolveConsoleRun } from "../visibility"
import { loadActivityData } from "./load"
import { projectActivity } from "./project"

export const list = query({
  args: {
    runId: v.id("runs"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const visible = await resolveConsoleRun(ctx, args, identity)

    if (visible === null) {
      return { items: [], status: "missing" as const }
    }

    const { run, personId } = visible
    return {
      items: projectActivity(await loadActivityData(ctx, run, personId)),
      status: "loaded" as const,
    }
  },
})
