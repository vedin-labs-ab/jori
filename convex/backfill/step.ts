import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { fetchGitHubBackfillPage, type GitHubCursor } from "./github"
import { recordBatch, stepDelayMs, stepEvents } from "./limits"
import { fetchLinearBackfillPage, type LinearCursor } from "./linear"
import { type BackfillEvent } from "./page"

// One paced ingest step: fetch up to a window's worth of history, record it,
// force a catch-up pass, rest, repeat. The rest keeps each forced window past
// the engine's minimum and each batch under the judge's event cap, so paced
// ingestion never outruns judgment and history is never silently dropped.
export const step = internalAction({
  args: { backfillId: v.id("backfills") },
  handler: async (ctx, args) => {
    const loaded = await ctx.runQuery(internal.backfill.record.byId, {
      backfillId: args.backfillId,
    })

    if (loaded === null || loaded.backfill.status !== "running") {
      return
    }

    try {
      const integration = await prepareIntegrationForRuntime(ctx, {
        integration: loaded.integration,
      })
      const events: BackfillEvent[] = []
      let cursor = loaded.backfill.cursor
      let exhausted = false

      while (events.length < stepEvents && !exhausted) {
        const page =
          integration.integration === "github"
            ? await fetchGitHubBackfillPage(
                integration,
                cursor as GitHubCursor | undefined,
                loaded.backfill.window
              )
            : await fetchLinearBackfillPage(
                integration,
                cursor as LinearCursor | undefined,
                loaded.backfill.window
              )

        events.push(...page.events)

        if (page.cursor === null) {
          exhausted = true
        } else {
          cursor = page.cursor
        }
      }

      for (let index = 0; index < events.length; index += recordBatch) {
        await ctx.runMutation(internal.backfill.record.record, {
          backfillId: args.backfillId,
          events: events.slice(index, index + recordBatch),
        })
      }

      await ctx.runMutation(internal.backfill.record.advance, {
        backfillId: args.backfillId,
        cursor,
        completed: exhausted,
      })

      // The catch-up pass consumes what this step wrote; the next step waits
      // long enough for its own forced window to clear the engine minimum.
      await ctx.scheduler.runAfter(0, internal.deduction.engine.pass.run, {
        organizationId: loaded.backfill.organizationId,
        force: true,
      })

      if (!exhausted) {
        await ctx.scheduler.runAfter(stepDelayMs, internal.backfill.step.step, {
          backfillId: args.backfillId,
        })
      }
    } catch (error) {
      await ctx.runMutation(internal.backfill.record.fail, {
        backfillId: args.backfillId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
})
