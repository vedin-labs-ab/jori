import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server"
import {
  bootstrapMaxChunksPerSweep,
  judgeModel,
  promptVersions,
  sweepBatch,
} from "../limits"
import {
  beliefKinds,
  type PassScope,
  type PassStage,
  passScope,
  passStage,
} from "../schema"
import { type OpenedPass, reviewWindow } from "./review"
import {
  isPassDue,
  isStaleRunning,
  nextPassWindow,
  stageTiming,
} from "./schedule"

// One review per tenant per beat, stages in order: efforts first, then each
// belief kind's incremental review, then its consolidation when due. The
// belief stages always see what this beat's effort stage wrote.
const stageRuns: { stage: PassStage; scope: PassScope }[] = [
  { stage: "effort", scope: "window" },
  ...beliefKinds.flatMap((kind) => [
    { stage: kind, scope: "window" as const },
    { stage: kind, scope: "full" as const },
  ]),
]

// Hourly heartbeat: hands every tenant with at least one active integration
// to the run action. Due checks live in the opener, so this stays cheap.
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const tenantId of await activeTenants(ctx)) {
      await ctx.scheduler.runAfter(0, internal.deduction.engine.pass.run, {
        tenantId,
      })
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

export const run = internalAction({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    for (const { stage, scope } of stageRuns) {
      await runStage(ctx, args.tenantId, stage, scope)
    }
  },
})

// One judged review per window: open, assemble, judge, apply. Loops windows
// so an effort bootstrap catches up to now within a single sweep.
async function runStage(
  ctx: ActionCtx,
  tenantId: string,
  stage: PassStage,
  scope: PassScope
) {
  for (let chunk = 0; chunk < bootstrapMaxChunksPerSweep; chunk += 1) {
    const opened: OpenedPass | null = await ctx.runMutation(
      internal.deduction.engine.pass.open,
      { tenantId, stage, scope }
    )

    if (opened === null) {
      return
    }

    try {
      await reviewWindow(ctx, tenantId, opened)
    } catch (error) {
      await ctx.runMutation(internal.deduction.engine.pass.fail, {
        passId: opened.passId,
        error: error instanceof Error ? error.message : String(error),
      })

      return
    }
  }
}

// Opens the next window for a tenant, stage, and scope, failing a stale
// running pass on the way. Windows derive from completed passes only, so a
// failed pass retries the same window.
export const open = internalMutation({
  args: { tenantId: v.string(), stage: passStage, scope: passScope },
  handler: async (ctx, args) => {
    const now = Date.now()
    const timing = stageTiming(args.stage, args.scope)
    const latest = await latestPass(ctx, args)

    if (!isPassDue(now, latest ?? undefined, timing.cadenceMs)) {
      return null
    }

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

    const completed = await latestCompletedPass(ctx, args)
    const window = nextPassWindow(now, completed?.window.end, timing.chunked)

    if (window === null) {
      return null
    }

    const passId = await ctx.db.insert("passes", {
      tenantId: args.tenantId,
      stage: args.stage,
      scope: args.scope,
      status: "running",
      window,
      prompt: { version: promptVersion(args), model: judgeModel },
      startedAt: now,
    })

    return { passId, stage: args.stage, scope: args.scope, window }
  },
})

function promptVersion(args: { stage: PassStage; scope: PassScope }) {
  if (args.stage === "effort") {
    return promptVersions.effort
  }

  return args.scope === "window"
    ? promptVersions.workstream
    : promptVersions.consolidation
}

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
  args: { tenantId: string; stage: PassStage; scope: PassScope }
) {
  return await ctx.db
    .query("passes")
    .withIndex("by_tenant_and_stage_and_scope_and_started_at", (index) =>
      index
        .eq("tenantId", args.tenantId)
        .eq("stage", args.stage)
        .eq("scope", args.scope)
    )
    .order("desc")
    .first()
}

// Read-only and shared with the console pulse, so cadence math has exactly
// one source of "the last reviewed window".
export async function latestCompletedPass(
  ctx: QueryCtx,
  args: { tenantId: string; stage: PassStage; scope: PassScope }
): Promise<Doc<"passes"> | null> {
  return await ctx.db
    .query("passes")
    .withIndex("by_tenant_and_stage_and_scope_and_started_at", (index) =>
      index
        .eq("tenantId", args.tenantId)
        .eq("stage", args.stage)
        .eq("scope", args.scope)
    )
    .order("desc")
    .filter((query) => query.eq(query.field("status"), "completed"))
    .first()
}
