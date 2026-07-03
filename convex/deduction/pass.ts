import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  type MutationCtx,
} from "../_generated/server"
import { type PassInput } from "./input"
import {
  bootstrapMaxChunksPerSweep,
  judgeModel,
  promptVersion,
  sweepBatch,
} from "./limits"
import { judgePass } from "./review/judge"
import { isPassDue, isStaleRunning, nextPassWindow } from "./schedule"
import { type BeliefKind, beliefKind, beliefKinds } from "./schema"

// Hourly heartbeat: hands every tenant that is due a review to the run action,
// one per kind. Mirrors the organization source sweep.
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    for (const tenantId of await activeTenants(ctx)) {
      for (const kind of beliefKinds) {
        const latest = await latestPass(ctx, tenantId, kind)

        if (isPassDue(now, latest ?? undefined)) {
          await ctx.scheduler.runAfter(0, internal.deduction.pass.run, {
            tenantId,
            kind,
          })
        }
      }
    }
  },
})

// The tenant registry is "tenants with at least one active integration": a
// tenant without sources has nothing to review. Full scan is fine at current
// integration counts; revisit with a dedicated index if that changes.
async function activeTenants(ctx: MutationCtx) {
  const integrations = await ctx.db.query("integrations").collect()
  const tenants = new Set(
    integrations
      .filter((integration) => integration.status === "active")
      .map((integration) => integration.tenantId)
  )

  return [...tenants].slice(0, sweepBatch)
}

// One judged review per window: open, assemble, judge, apply. Loops windows
// so a bootstrap catches up to now within a single sweep.
export const run = internalAction({
  args: { tenantId: v.string(), kind: beliefKind },
  handler: async (ctx, args) => {
    for (let chunk = 0; chunk < bootstrapMaxChunksPerSweep; chunk += 1) {
      const opened: OpenedPass | null = await ctx.runMutation(
        internal.deduction.pass.open,
        args
      )

      if (opened === null) {
        return
      }

      try {
        await reviewWindow(ctx, args, opened)
      } catch (error) {
        await ctx.runMutation(internal.deduction.pass.fail, {
          passId: opened.passId,
          error: error instanceof Error ? error.message : String(error),
        })

        return
      }
    }
  },
})

type OpenedPass = {
  passId: Id<"passes">
  window: { start: number; end: number }
}

async function reviewWindow(
  ctx: ActionCtx,
  args: { tenantId: string; kind: BeliefKind },
  opened: OpenedPass
) {
  const input: PassInput = await ctx.runQuery(
    internal.deduction.input.assemble,
    { tenantId: args.tenantId, kind: args.kind, window: opened.window }
  )
  const quiet = input.events.length === 0 && input.conversations.length === 0
  const { ops, invalid } = quiet
    ? { ops: [], invalid: 0 }
    : await judgePass({ kind: args.kind, input })

  await ctx.runMutation(internal.deduction.apply.apply, {
    passId: opened.passId,
    ops,
    invalid,
    allowed: toAllowed(input),
    counts: {
      beliefs: input.roster.length,
      events: input.events.length,
      conversations: input.conversations.length,
    },
  })
}

// The applier validates citations against exactly what this pass showed the
// judge; for conversations, observedAt carries summarizedAt.
function toAllowed(input: PassInput) {
  return {
    events: input.events.map((event) => ({
      id: event.id as string,
      observedAt: event.observedAt,
      integrationId: event.integrationId as string,
    })),
    conversations: input.conversations.map((conversation) => ({
      id: conversation.id as string,
      observedAt: conversation.summarizedAt,
      integrationId: conversation.integrationId as string,
    })),
  }
}

// Opens the next window for a tenant and kind, failing a stale running pass
// on the way. Windows derive from completed passes only, so a failed pass
// retries the same window.
export const open = internalMutation({
  args: { tenantId: v.string(), kind: beliefKind },
  handler: async (ctx, args) => {
    const now = Date.now()
    const latest = await latestPass(ctx, args.tenantId, args.kind)

    if (latest?.status === "running") {
      if (!isStaleRunning(now, latest)) {
        return null
      }

      await ctx.db.patch(latest._id, {
        status: "failed",
        endedAt: now,
        error: "Stale running pass failed by the next opener.",
      })
    }

    const completed = await latestCompletedPass(ctx, args.tenantId, args.kind)
    const window = nextPassWindow(now, completed?.window.end)

    if (window === null) {
      return null
    }

    const passId = await ctx.db.insert("passes", {
      tenantId: args.tenantId,
      kind: args.kind,
      status: "running",
      window,
      prompt: { version: promptVersion, model: judgeModel },
      startedAt: now,
    })

    return { passId, window }
  },
})

export const fail = internalMutation({
  args: { passId: v.id("passes"), error: v.string() },
  handler: async (ctx, args) => {
    const pass = await ctx.db.get(args.passId)

    if (pass !== null && pass.status === "running") {
      await ctx.db.patch(args.passId, {
        status: "failed",
        endedAt: Date.now(),
        error: args.error,
      })
    }
  },
})

async function latestPass(
  ctx: MutationCtx,
  tenantId: string,
  kind: BeliefKind
) {
  return await ctx.db
    .query("passes")
    .withIndex("by_tenant_and_kind_and_started_at", (index) =>
      index.eq("tenantId", tenantId).eq("kind", kind)
    )
    .order("desc")
    .first()
}

async function latestCompletedPass(
  ctx: MutationCtx,
  tenantId: string,
  kind: BeliefKind
): Promise<Doc<"passes"> | null> {
  return await ctx.db
    .query("passes")
    .withIndex("by_tenant_and_kind_and_started_at", (index) =>
      index.eq("tenantId", tenantId).eq("kind", kind)
    )
    .order("desc")
    .filter((query) => query.eq(query.field("status"), "completed"))
    .first()
}
