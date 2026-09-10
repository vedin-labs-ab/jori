import { type RuntimeContext } from "../../contracts/runtime/context"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type AgentRuntimeInput } from "../runs/agent/input"
import { type RuntimeSkill, runtimeSkillNames } from "../skills/runtime"
import {
  type LoadedSession,
  loadRuntimeSkills,
  loadSandboxReference,
} from "./context/loaders"
import { runtimeResponse, runtimeToolSnapshot } from "./context/response"
import { runLifecycleTools } from "./native"
import {
  type RuntimePermissions,
  runtimePermissions,
} from "./permissions/index"
import { loadActiveSurface } from "./surface"

// Spelled out rather than inferred: the step actions that call loadRuntime
// are themselves part of the generated api, and an inferred type would send
// TypeScript around that circle.
export type LoadedRuntime = {
  activeSurface: Awaited<ReturnType<typeof loadActiveSurface>>
  context: RuntimeContext
  input: AgentRuntimeInput
  lifecycleTools: ReturnType<typeof runLifecycleTools>
  permissions: RuntimePermissions
  session: LoadedSession
  skills: RuntimeSkill[]
  tools: ReturnType<typeof runtimeToolSnapshot>
}

/**
 * Everything a step needs to know about a run, rebuilt from the database on
 * every step. Nothing is carried between steps but the run id, so a resumed
 * step reads the same records a fresh one does.
 */
export async function loadRuntime(
  ctx: ActionCtx,
  runId: Id<"runs">
): Promise<LoadedRuntime> {
  await ctx.runMutation(internal.sessions.execution.reconcile, { runId })
  const { input, session } = await loadRunRecords(ctx, runId)
  const { run } = input
  const skills = await loadRuntimeSkills(ctx, run.organizationId)
  const [sandbox, permissions, activeSurface] = await Promise.all([
    loadSandboxReference(ctx, { runId, status: run.status }),
    runtimePermissions(ctx, input, runtimeSkillNames(skills)),
    loadActiveSurface(ctx, {
      input,
      runId,
      target: session?.target ?? null,
    }),
  ])
  const lifecycleTools = runLifecycleTools()

  return {
    activeSurface,
    context: runtimeResponse({
      activeSurface,
      input,
      lifecycleTools,
      permissions,
      sandbox,
      session,
    }),
    input,
    lifecycleTools,
    permissions,
    session,
    skills,
    tools: runtimeToolSnapshot(
      input,
      activeSurface,
      lifecycleTools,
      permissions
    ),
  }
}

async function loadRunRecords(ctx: ActionCtx, runId: Id<"runs">) {
  const [session, input] = (await Promise.all([
    ctx.runQuery(internal.sessions.data.getByRun, { runId }),
    ctx.runQuery(internal.runs.records.getInputByRun, { runId }),
  ])) as [LoadedSession, AgentRuntimeInput | null]

  if (input === null) {
    throw new Error("Runtime context not found.")
  }

  return { input, session }
}
