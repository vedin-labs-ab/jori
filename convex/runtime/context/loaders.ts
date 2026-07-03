import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { isTerminalRunStatus } from "../../runs/schema"
import { type RuntimeSkill } from "../../skills/runtime"
import { syncSessionReactions } from "../sessions"

export type LoadedRun = {
  _id: Id<"runs">
  status: "completed" | "failed" | "queued" | "running" | "stopped"
  tenantId: string
}
export type LoadedSandbox = { externalId: string } | null
export type LoadedSession = {
  _id: Id<"sessions">
  recency?: { requester?: string }
} | null

export async function loadRunSession(ctx: ActionCtx, runId: Id<"runs">) {
  const session = (await ctx.runQuery(internal.sessions.data.getByRun, {
    runId,
  })) as LoadedSession

  if (session !== null) {
    await syncSessionReactions(ctx, session._id)
  }

  return session
}

export async function loadRuntimeSkills(ctx: ActionCtx, tenantId: string) {
  return (await ctx.runQuery(internal.skills.catalog.listForRuntime, {
    tenantId,
  })) as RuntimeSkill[]
}

export async function loadSandboxReference(
  ctx: ActionCtx,
  args: {
    runId: Id<"runs">
    status: Doc<"runs">["status"]
  }
): Promise<LoadedSandbox> {
  if (isTerminalRunStatus(args.status)) {
    return (await ctx.runQuery(internal.runtime.sandboxes.retainedByRun, {
      runId: args.runId,
    })) as LoadedSandbox
  }

  return (await ctx.runMutation(internal.runtime.sandboxes.claimForRun, {
    runId: args.runId,
  })) as LoadedSandbox
}
