import { type RuntimeContext } from "../../../contracts/runtime/context"
import { type ParkedCommand } from "../../../contracts/runtime/waiters"
import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { uploadRunFile } from "../../files/upload"
import { drainRunSession, retargetRunSession } from "../sessions"
import { sendRunReply } from "../surface"
import { addRunReaction } from "../surface/reactions"
import {
  callRunTool,
  executeRunApproval,
  fetchRunCloneCredentials,
  requestRunApproval,
} from "../tools/broker"
import { type RuntimePlatform } from "./types"

type PlatformArgs<Name extends keyof RuntimePlatform> = Parameters<
  RuntimePlatform[Name]
>[0]

/** The port over one step action: each call is either a helper running in
 *  this action or a single query or mutation on the run's own records. */
export class ActionPlatform implements RuntimePlatform {
  constructor(
    private readonly ctx: ActionCtx,
    private readonly context: RuntimeContext
  ) {}

  addReaction = (args: PlatformArgs<"addReaction">) =>
    addRunReaction(this.ctx, args)

  appendTranscript = async (messages: PlatformArgs<"appendTranscript">) => {
    await this.mutation(internal.runs.execution.transcript.records.append, {
      messages,
      runId: this.runId,
    })
  }

  callTool = (args: PlatformArgs<"callTool">) => callRunTool(this.ctx, args)

  clearDraft = async () => {
    await this.mutation(internal.runs.execution.drafts.records.clear, {
      runId: this.runId,
    })
  }

  createAgentRun = (args: PlatformArgs<"createAgentRun">) =>
    this.mutation(internal.runtime.agents.create, args)

  drainSession = (args: PlatformArgs<"drainSession">) =>
    drainRunSession(this.ctx, args.sessionId, this.runId)

  executeApproval = (args: PlatformArgs<"executeApproval">) =>
    executeRunApproval(this.ctx, args)

  fetchGitHubCloneCredentials = (
    args: PlatformArgs<"fetchGitHubCloneCredentials">
  ) => fetchRunCloneCredentials(this.ctx, args)

  finishRun = async (args: PlatformArgs<"finishRun">) => {
    await this.mutation(internal.runs.records.finish, {
      result: args.result,
      runId: this.runId,
    })
  }

  listTranscript = () =>
    this.query(internal.runs.execution.transcript.records.list, {
      runId: this.runId,
    })

  loadRunHandoffs = (args: PlatformArgs<"loadRunHandoffs">) =>
    this.query(internal.runs.execution.waiters.handoffs.load, args)

  markApprovalConsumed = async (args: PlatformArgs<"markApprovalConsumed">) => {
    await this.mutation(
      internal.runs.execution.waiters.handoffs.consumeApproval,
      args
    )
  }

  markOfferConsumed = async (args: PlatformArgs<"markOfferConsumed">) => {
    await this.mutation(
      internal.runs.execution.waiters.handoffs.consumeOffer,
      args
    )
  }

  park = (args: PlatformArgs<"park">) =>
    this.mutation(internal.runs.execution.waiters.records.park, {
      ...args,
      ...(this.context.session === null
        ? {}
        : { sessionId: this.context.session.id }),
      runId: this.runId,
    })

  readAgentRuns = (args: PlatformArgs<"readAgentRuns">) =>
    this.query(internal.runtime.agents.readChildren, args)

  readWaiter = (args: PlatformArgs<"readWaiter">) =>
    this.query(
      internal.runs.execution.waiters.records.get,
      args
    ) as Promise<ParkedCommand | null>

  recordEvent = async (args: PlatformArgs<"recordEvent">) => {
    await this.mutation(internal.runs.execution.traces.records.record, args)
  }

  recordUsage = async (args: PlatformArgs<"recordUsage">) => {
    await this.mutation(internal.billing.usage.records.record, {
      ...args,
      runId: this.runId,
    })
  }

  requestApproval = (args: PlatformArgs<"requestApproval">) =>
    requestRunApproval(this.ctx, args)

  resolveWaiter = async (args: PlatformArgs<"resolveWaiter">) => {
    await this.mutation(internal.runs.execution.waiters.records.resolve, args)
  }

  retarget = (args: PlatformArgs<"retarget">) =>
    retargetRunSession(this.ctx, this.context, args.target)

  sendReply = (args: PlatformArgs<"sendReply">) => sendRunReply(this.ctx, args)

  stopAgentRun = (args: PlatformArgs<"stopAgentRun">) =>
    this.mutation(internal.runtime.agents.stop, args)

  tailTranscript = () =>
    this.query(internal.runs.execution.transcript.records.tail, {
      runId: this.runId,
    })

  uploadFile = (args: PlatformArgs<"uploadFile">) =>
    uploadRunFile(this.ctx, {
      ...args,
      organizationId: this.context.run.organizationId,
    })

  writeDraft = async (args: PlatformArgs<"writeDraft">) => {
    await this.mutation(internal.runs.execution.drafts.records.write, {
      ...args,
      runId: this.runId,
    })
  }

  private get runId() {
    return this.context.run.id
  }

  private get query() {
    return this.ctx.runQuery
  }

  private get mutation() {
    return this.ctx.runMutation
  }
}
