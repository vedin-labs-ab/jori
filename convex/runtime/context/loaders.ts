import {
  isTerminalRunStatus,
  type RunStatus,
} from "../../../contracts/runtime/runs"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type RuntimeSkill } from "../../skills/runtime"
import { syncSessionReactions } from "../sessions"

export type LoadedRun = {
  _id: Id<"runs">
  status: RunStatus
  organizationId: string
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

export async function loadRuntimeSkills(
  ctx: ActionCtx,
  organizationId: string
) {
  return (await ctx.runQuery(internal.skills.catalog.listForRuntime, {
    organizationId,
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
    return (await ctx.runQuery(
      internal.runs.execution.sandboxes.records.retainedByRun,
      {
        runId: args.runId,
      }
    )) as LoadedSandbox
  }

  return (await ctx.runMutation(
    internal.runs.execution.sandboxes.records.claimForRun,
    {
      runId: args.runId,
    }
  )) as LoadedSandbox
}
