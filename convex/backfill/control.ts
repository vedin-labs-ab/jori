import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalMutation } from "../_generated/server"
import { deductionPaused } from "../deduction/limits"
import { backfillWindowMs } from "./limits"

const supported = ["github", "linear"] as const

// Operator entrypoint, run per organization during pilot setup:
//
//   npx convex run backfill/control:start '{"organizationId": "..."}'
//
// One import per supported active integration, covering the deduction
// bootstrap horizon. Integrations already mid-import are left alone, so the
// call is safe to repeat.
export const start = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    if (deductionPaused) {
      return { started: [] }
    }

    const now = Date.now()
    const window = { start: now - backfillWindowMs, end: now }
    const active = await ctx.db
      .query("integrations")
      .withIndex("by_organization_and_status", (index) =>
        index.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect()
    const running = new Set(
      (
        await ctx.db
          .query("backfills")
          .withIndex("by_organization", (index) =>
            index.eq("organizationId", args.organizationId)
          )
          .collect()
      )
        .filter((backfill) => backfill.status === "running")
        .map((backfill) => backfill.integrationId)
    )
    const started: string[] = []

    for (const integration of active) {
      if (
        !supported.includes(
          integration.integration as (typeof supported)[number]
        ) ||
        running.has(integration._id)
      ) {
        continue
      }

      const backfillId = await ctx.db.insert("backfills", {
        organizationId: args.organizationId,
        integrationId: integration._id,
        status: "running",
        window,
        stats: { events: 0, duplicates: 0, steps: 0 },
        startedAt: now,
      })

      await ctx.scheduler.runAfter(0, internal.backfill.step.step, {
        backfillId,
      })
      started.push(integration.integration)
    }

    return { started }
  },
})
