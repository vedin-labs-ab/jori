import { v } from "convex/values"
import { internalQuery } from "../../_generated/server"
import { loadActivityData } from "../activity/load"
import { projectActivity } from "../activity/project"
import { canSee } from "./access"
import {
  matchesActivityFilter,
  normalizeQuery,
  projectMatches,
} from "./filters"
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
    const summaries = await projectMatches(ctx, {
      candidates,
      current,
      query: normalizeQuery(args.query),
      source: args.source,
      status: args.status,
      since: args.since,
      until: args.until,
    })
    const page = pageItems(summaries, {
      cursor: args.cursor,
      limit: args.limit,
    })

    return { cursor: page.cursor, runs: page.page }
  },
})

export const searchRunActivity = internalQuery({
  args: {
    currentRunId: v.id("runs"),
    ...searchRunActivityArgs,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const [current, target] = await Promise.all([
      ctx.db.get(args.currentRunId),
      ctx.db.get(args.runId),
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
