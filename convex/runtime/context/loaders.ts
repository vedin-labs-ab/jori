import { type ModelSelection } from "../../../contracts/models/selection"
import {
  isTerminalRunStatus,
  type RunStatus,
} from "../../../contracts/runtime/runs"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type RuntimeSkill } from "../../skills/runtime"

export type LoadedRun = {
  _id: Id<"runs">
  model?: ModelSelection
  status: RunStatus
  organizationId: string
}
export type LoadedSandbox = { externalId: string } | null
export type LoadedSession = {
  _id: Id<"sessions">
  recency?: { requester?: string }
  target?: string
} | null

export async function loadRuntimeSkills(
  ctx: ActionCtx,
  organizationId: string
): Promise<RuntimeSkill[]> {
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
