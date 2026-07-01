import { v } from "convex/values"
import { internalQuery } from "../../_generated/server"
import { loadActivityData } from "../activity/load"
import { projectActivity } from "../activity/project"
import { canSee } from "./access"
import {
  matchesActivityFilter,
  normalizeQuery,
  normalizeTimestamp,
  pageRunMatches,
} from "./filters"
import { normalizeRunId } from "./ids"
import { pageItems } from "./page"
import { loadCandidateRuns } from "./runs"
import { searchRunActivityArgs, searchRunsArgs } from "./schema"

export const searchRuns = internalQuery({
  args: {
    currentRunId: v.id("runs"),
    ...searchRunsArgs,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.currentRunId)

    if (current === null) {
      return { cursor: null, runs: [] }
    }

    const candidates = await loadCandidateRuns(ctx, current, args)
    const page = await pageRunMatches(
      ctx,
      {
        candidates,
        current,
        query: normalizeQuery(args.query),
        source: args.source,
        status: args.status,
        since: normalizeTimestamp(args.since),
        until: normalizeTimestamp(args.until),
      },
      {
        cursor: args.cursor,
        limit: args.limit,
      }
    )

    return { cursor: page.cursor, runs: page.runs }
  },
})

export const searchRunActivity = internalQuery({
  args: {
    currentRunId: v.id("runs"),
    ...searchRunActivityArgs,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const targetRunId = normalizeRunId(ctx, args.runId)

    if (targetRunId === undefined || targetRunId === null) {
      return { cursor: null, items: [] }
    }

    const [current, target] = await Promise.all([
      ctx.db.get(args.currentRunId),
      ctx.db.get(targetRunId),
    ])

    if (current === null || target === null || !canSee(current, target)) {
      return { cursor: null, items: [] }
    }

    const items = projectActivity(await loadActivityData(ctx, target)).filter(
      (item) => matchesActivityFilter(item, args.filter)
    )
    const page = pageItems(items, {
      cursor: args.cursor,
      limit: args.limit,
      limitFallback: 20,
    })

    return { cursor: page.cursor, items: page.page }
  },
})
