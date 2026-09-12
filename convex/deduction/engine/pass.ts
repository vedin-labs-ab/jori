import { v } from "convex/values"
import { defaultSelection } from "../../../contracts/models/selection"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import {
  bootstrapMaxChunksPerSweep,
  deductionPaused,
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

// One review per organization per beat, stages in order: efforts first, then each
// belief kind's incremental review, then its consolidation when due. The
// belief stages always see what this beat's effort stage wrote.
const stageRuns: { stage: PassStage; scope: PassScope }[] = [
  { stage: "effort", scope: "window" },
  ...beliefKinds.flatMap((kind) => [
    { stage: kind, scope: "window" as const },
    { stage: kind, scope: "full" as const },
  ]),
]

// Hourly heartbeat: hands every organization with at least one active integration
// to the run action. Due checks live in the opener, so this stays cheap.
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (deductionPaused) {
      return
    }

    for (const organizationId of await activeOrganizations(ctx)) {
      await ctx.scheduler.runAfter(0, internal.deduction.engine.pass.run, {
        organizationId,
      })
    }
  },
})

// The organization registry is "organizations with at least one active integration": a
// organization without sources has nothing to review. Full scan is fine at current
// integration counts; revisit with a dedicated index if that changes.
async function activeOrganizations(ctx: MutationCtx) {
  const integrations = await ctx.db.query("integrations").collect()
  const organizations = new Set(
    integrations
      .filter((integration) => integration.status === "active")
      .map((integration) => integration.organizationId)
  )

  return [...organizations].slice(0, sweepBatch)
}

// Backfill forces catch-up passes between ingest batches. Force skips the
// cadence rest only, never the running-pass guard or window derivation, and
// stays off the full-scope consolidations so a paced import cannot trigger
// week-scale restructuring every few minutes.
export const run = internalAction({
  args: { organizationId: v.string(), force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (deductionPaused) {
      return
    }

    const force = args.force === true
    const stages = force
      ? stageRuns.filter((stageRun) => stageRun.scope === "window")
      : stageRuns

    for (const { stage, scope } of stages) {
      await runStage(ctx, args.organizationId, stage, scope, force)
    }
  },
})

// One judged review per window: open, assemble, judge, apply. Loops windows
// so an effort bootstrap catches up to now within a single sweep.
async function runStage(
  ctx: ActionCtx,
  organizationId: string,
  stage: PassStage,
  scope: PassScope,
  force = false
) {
  for (let chunk = 0; chunk < bootstrapMaxChunksPerSweep; chunk += 1) {
    const opened: OpenedPass | null = await ctx.runMutation(
      internal.deduction.engine.pass.open,
      { organizationId, stage, scope, force }
    )

    if (opened === null) {
      return
    }

    try {
      await reviewWindow(ctx, organizationId, opened)
    } catch (error) {
      await ctx.runMutation(internal.deduction.engine.pass.fail, {
        passId: opened.passId,
        error: error instanceof Error ? error.message : String(error),
      })

      return
    }
  }
}

// Opens the next window for a organization, stage, and scope, failing a stale
// running pass on the way. Windows derive from completed passes only, so a
// failed pass retries the same window.
export const open = internalMutation({
  args: {
    organizationId: v.string(),
    stage: passStage,
    scope: passScope,
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (
      deductionPaused ||
      (await isWorkspaceDeleting(ctx, args.organizationId))
    ) {
      return null
    }
    const now = Date.now()
    const timing = stageTiming(args.stage, args.scope)
    const latest = await latestPass(ctx, args)

    if (latest?.status === "running") {
      if (!isStaleRunning(now, latest)) {
        return null
      }

      await ctx.db.patch(latest._id, {
        status: "failed",
        endedAt: now,
        error: "Stale running pass failed by the next opener.",
      })
    } else if (
      args.force !== true &&
      !isPassDue(now, latest ?? undefined, timing.cadenceMs)
    ) {
      return null
    }

    const completed = await latestCompletedPass(ctx, args)
    const window = nextPassWindow(now, completed?.window.end, timing.chunked)

    if (window === null) {
      return null
    }

    const passId = await ctx.db.insert("passes", {
      organizationId: args.organizationId,
      stage: args.stage,
      scope: args.scope,
      status: "running",
      window,
      prompt: { version: promptVersion(args), model: defaultSelection.model },
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
  args: { organizationId: string; stage: PassStage; scope: PassScope }
) {
  return await ctx.db
    .query("passes")
    .withIndex("by_organization_and_stage_and_scope_and_started_at", (index) =>
      index
        .eq("organizationId", args.organizationId)
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
  args: { organizationId: string; stage: PassStage; scope: PassScope }
): Promise<Doc<"passes"> | null> {
  return await ctx.db
    .query("passes")
    .withIndex("by_organization_and_stage_and_scope_and_started_at", (index) =>
      index
        .eq("organizationId", args.organizationId)
        .eq("stage", args.stage)
        .eq("scope", args.scope)
    )
    .order("desc")
    .filter((query) => query.eq(query.field("status"), "completed"))
    .first()
}
