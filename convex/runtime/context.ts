import { v } from "convex/values"
import {
  type DrainedSessionBatch,
  type RunHandoffs,
  type RuntimeContext,
  type RuntimeContextReload,
} from "../../contracts/runtime/worker"
import { api, internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx, action, internalMutation } from "../_generated/server"
import { type AgentRuntimeInput } from "../runs/agent/input"
import { recordTrace } from "../runs/execution/traces/data"
import { isTerminalRunStatus, toolSnapshot } from "../runs/schema"
import { drainSession } from "../sessions/drain"
import { runtimeSkillNames } from "../skills/runtime"
import {
  type LoadedRun,
  type LoadedSession,
  loadRunSession,
  loadRuntimeSkills,
  loadSandboxReference,
} from "./context/loaders"
import {
  buildRuntimePrompt,
  runtimeResponse,
  runtimeToolSnapshot,
  runtimeTools,
} from "./context/response"
import { runLifecycleTools } from "./lifecycle"
import { runtimePermissions } from "./permissions/index"
import { requireWorkerSecret } from "./secret"
import { syncSessionReactions } from "./sessions"
import { loadActiveSurface } from "./surface"

type PreparedRun = {
  drained: DrainedSessionBatch | null
  person: string | null
}

async function prepareWorkerRun(
  ctx: ActionCtx,
  args: {
    attempt: number
    runId: Id<"runs">
    session: LoadedSession
    tools: ReturnType<typeof runtimeToolSnapshot>
  }
) {
  return (await ctx.runMutation(internal.runtime.context.prepareRun, {
    attempt: args.attempt,
    runId: args.runId,
    ...(args.session === null ? {} : { sessionId: args.session._id }),
    tools: args.tools,
  })) as PreparedRun | null
}

async function loadWorkerHandoffs(
  ctx: ActionCtx,
  args: { runId: Id<"runs">; secret: string }
) {
  return (await ctx.runQuery(
    api.runtime.waiters.handoffs.load,
    args
  )) as RunHandoffs
}

export const load = action({
  args: {
    attempt: v.number(),
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<RuntimeContext> => {
    requireWorkerSecret(args.secret)

    const [session, run] = (await Promise.all([
      ctx.runQuery(internal.sessions.data.getByRun, { runId: args.runId }),
      ctx.runQuery(internal.runs.records.get, { runId: args.runId }),
    ])) as [LoadedSession, LoadedRun | null]

    if (run === null) {
      throw new Error("Runtime context not found.")
    }

    // The reaction sync must finish before the input read below so the
    // prompt renders current reactions; skills don't depend on it.
    const [skills] = await Promise.all([
      loadRuntimeSkills(ctx, run.tenantId),
      session === null
        ? Promise.resolve()
        : syncSessionReactions(ctx, session._id),
    ])

    const input = (await ctx.runQuery(internal.runs.records.getInputByRun, {
      runId: args.runId,
    })) as AgentRuntimeInput | null

    if (input === null) {
      throw new Error("Runtime context not found.")
    }

    const skillNames = runtimeSkillNames(skills)
    const [sandbox, permissions, activeSurface, handoffs] = await Promise.all([
      loadSandboxReference(ctx, { runId: args.runId, status: run.status }),
      runtimePermissions(ctx, input, skillNames),
      loadActiveSurface(ctx, input, args.runId),
      loadWorkerHandoffs(ctx, {
        runId: args.runId,
        secret: args.secret,
      }),
    ])
    const lifecycleTools = runLifecycleTools()

    const prepared = await prepareWorkerRun(ctx, {
      attempt: args.attempt,
      runId: args.runId,
      session,
      tools: runtimeToolSnapshot(
        input,
        activeSurface,
        lifecycleTools,
        permissions
      ),
    })

    return runtimeResponse({
      activeSurface,
      drained: prepared?.drained ?? null,
      handoffs,
      input,
      lifecycleTools,
      permissions,
      prompt: buildRuntimePrompt(input, activeSurface, permissions, skills, {
        person: prepared?.person ?? null,
      }),
      run,
      sandbox,
      session,
    })
  },
})

export const reload = action({
  args: {
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<RuntimeContextReload> => {
    requireWorkerSecret(args.secret)

    const session = await loadRunSession(ctx, args.runId)

    const input = (await ctx.runQuery(internal.runs.records.getInputByRun, {
      runId: args.runId,
    })) as AgentRuntimeInput | null

    if (input === null) {
      throw new Error("Runtime context not found.")
    }

    const skills = await loadRuntimeSkills(ctx, input.run.tenantId)
    const permissions = await runtimePermissions(
      ctx,
      input,
      runtimeSkillNames(skills)
    )
    const activeSurface = await loadActiveSurface(ctx, input, args.runId)
    const lifecycleTools = runLifecycleTools()

    return {
      prompt: buildRuntimePrompt(input, activeSurface, permissions, skills, {
        person: session?.recency?.requester ?? null,
      }),
      activeSurface: activeSurface.state,
      tools: runtimeTools(lifecycleTools, activeSurface, permissions),
    }
  },
})

// Prepares the run in one transaction: the prepared and started traces, the
// status flip to running, and the initial session drain land together so the
// worker starts its loop with zero extra round trips and a failed prepare
// consumes nothing. Alongside the drained batch it returns the requester's
// stored person context — rendered by this drain on the first attempt,
// re-served from the session on retries — for the prompt prefix.
export const prepareRun = internalMutation({
  args: {
    attempt: v.number(),
    runId: v.id("runs"),
    sessionId: v.optional(v.id("sessions")),
    tools: toolSnapshot,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null) {
      return null
    }

    await recordTrace(ctx, {
      run,
      key: `run:${args.runId}:prepared`,
      type: "run.prepared",
      data: {
        tools: args.tools,
      },
    })

    if (isTerminalRunStatus(run.status)) {
      return null
    }

    await recordTrace(ctx, {
      attempt: args.attempt,
      key: `${args.runId}:0:run.started:attempt-${args.attempt}`,
      run,
      sequence: 0,
      type: "run.started",
    })

    if (run.status === "queued") {
      await ctx.db.patch(args.runId, { status: "running" })
    }

    if (args.sessionId === undefined) {
      return { drained: null, person: null }
    }

    const drained = await drainSession(ctx, { sessionId: args.sessionId })
    const session = await ctx.db.get(args.sessionId)

    return { drained, person: session?.recency?.requester ?? null }
  },
})
