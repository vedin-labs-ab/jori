import { type ProviderUsage } from "../../contracts/billing"
import { type ToolSurface } from "../../contracts/integrations"
import { type JsonObject, type JsonValue } from "../../contracts/json"
import { type ReplyPart } from "../../contracts/replies/parts"
import {
  type DrainedSessionBatch,
  type RuntimeContext,
} from "../../contracts/runtime/context"
import { type RuntimeEventRecord } from "../../contracts/runtime/events"
import { type UploadedFile } from "../../contracts/runtime/files"
import {
  type ApprovalExecution,
  type RunHandoffs,
} from "../../contracts/runtime/handoffs"
import { type RuntimeId } from "../../contracts/runtime/ids"
import { type AgentRunStatus } from "../../contracts/runtime/runs"
import { type SurfaceReactionTarget } from "../../contracts/runtime/surface"
import {
  type ParkedCommand,
  type ParkedWaiter,
  type WaiterCondition,
} from "../../contracts/runtime/waiters"
import { internal } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
import { uploadRunFile } from "../files/upload"
import { type TranscriptMessage } from "../runs/execution/transcript/schema"
import { type LoadedRuntime } from "./context"
import { RemoteSandbox } from "./sandbox/remote"
import { type SandboxRuntime } from "./sandbox/types"
import { drainRunSession, retargetRunSession } from "./sessions"
import { sendRunReply } from "./surface"
import { addRunReaction } from "./surface/reactions"
import {
  callRunTool,
  executeRunApproval,
  fetchRunCloneCredentials,
  requestRunApproval,
} from "./tools/broker"

export type GitHubCloneCredentials = {
  remoteUrl: string
  token: string
  username: string
}

export type TranscriptTail = {
  assistant: TranscriptMessage | null
  results: TranscriptMessage[]
}

type RunId = RuntimeId<"runs">
type RunRef = { runId: RunId }
type WaiterRef = { waiterId: RuntimeId<"waiters"> }
type SessionRef = { sessionId: RuntimeId<"sessions"> }
type ApprovalRef = { approvalId: RuntimeId<"approvals"> }
type ApprovalConsumption = ApprovalRef & { message?: TranscriptMessage }
type OfferRef = { integrationOfferId: RuntimeId<"integrationOffers"> }
type ChildRunArgs = { parentId: RunId; runId: RunId }
type AgentRunsArgs = {
  parentId: RunId
  runIds: RuntimeId<"runs">[]
}
type CloneArgs = RunRef & { owner: string; repo: string }
type ParkArgs = {
  condition?: WaiterCondition
  expiresAt: number
  token?: string
}
type ReactionArgs = RunRef & { reaction: string; target: SurfaceReactionTarget }

type ReplyArgs = RunRef & {
  blocks?: JsonObject[]
  parts?: ReplyPart[]
  target?: string
  text: string
}

type ToolCallArgs = RunRef & {
  input: JsonObject
  surface: ToolSurface
  tool: string
}

type ApprovalArgs = ToolCallArgs & { replyTarget?: string }

type AgentRunArgs = {
  parentId: RunId
  task: string
  title: string
  tools?: string[]
}

type UploadArgs = RunRef & {
  bytes: Uint8Array
  mimeType: string
  name: string
}

type DraftArgs = { reasoning: string; text: string; turn: number }

/**
 * Everything a step of the loop does to the world outside its own process.
 * The loop, the tools and the traces see only this port, so they stay
 * testable against an in-memory fake.
 */
export type RuntimePlatform = {
  addReaction(args: ReactionArgs): Promise<unknown>
  appendTranscript(messages: TranscriptMessage[]): Promise<void>
  callTool(args: ToolCallArgs): Promise<JsonValue>
  clearDraft(): Promise<void>
  createAgentRun(args: AgentRunArgs): Promise<unknown>
  drainSession(args: SessionRef): Promise<DrainedSessionBatch>
  executeApproval(args: ApprovalRef & RunRef): Promise<ApprovalExecution>
  fetchGitHubCloneCredentials(args: CloneArgs): Promise<GitHubCloneCredentials>
  finishRun(args: { result: string }): Promise<void>
  listTranscript(): Promise<TranscriptMessage[]>
  loadRunHandoffs(args: RunRef): Promise<RunHandoffs>
  markApprovalConsumed(args: ApprovalConsumption): Promise<void>
  markOfferConsumed(args: OfferRef): Promise<void>
  park(args: ParkArgs): Promise<ParkedWaiter>
  readAgentRuns(args: AgentRunsArgs): Promise<AgentRunStatus[]>
  readWaiter(args: WaiterRef): Promise<ParkedCommand | null>
  recordEvent(args: RuntimeEventRecord): Promise<void>
  recordUsage(args: ProviderUsage): Promise<void>
  requestApproval(args: ApprovalArgs): Promise<unknown>
  resolveWaiter(args: WaiterRef): Promise<void>
  retarget(args: { target: string }): Promise<void>
  sendReply(args: ReplyArgs): Promise<unknown>
  stopAgentRun(args: ChildRunArgs): Promise<unknown>
  tailTranscript(): Promise<TranscriptTail>
  uploadFile(args: UploadArgs): Promise<UploadedFile>
  writeDraft(args: DraftArgs): Promise<void>
}

export type AgentRuntime = {
  context: RuntimeContext
  platform: RuntimePlatform
  sandbox: SandboxRuntime
}

/** What recording and waiting need of a runtime: the platform to write
 *  through and the context that names the run. */
export type TraceRuntime = Pick<AgentRuntime, "context" | "platform">

/** The runtime a step hands its loop: this action as the platform, and the
 *  run's sandbox reached through Node actions. */
export function createAgentRuntime(
  ctx: ActionCtx,
  loaded: LoadedRuntime
): AgentRuntime {
  return {
    context: loaded.context,
    platform: new ActionPlatform(ctx, loaded.context),
    sandbox: new RemoteSandbox(
      ctx,
      loaded.input.run._id,
      loaded.context.run.sandboxId
    ),
  }
}

/** The port over one step action: each call is either a helper running in
 *  this action or a single query or mutation on the run's own records. */
export class ActionPlatform implements RuntimePlatform {
  constructor(
    private readonly ctx: ActionCtx,
    private readonly context: RuntimeContext
  ) {}

  addReaction = (args: ReactionArgs) => addRunReaction(this.ctx, args)

  appendTranscript = async (messages: TranscriptMessage[]) => {
    await this.mutation(internal.runs.execution.transcript.records.append, {
      messages,
      runId: this.runId,
    })
  }

  callTool = (args: ToolCallArgs) => callRunTool(this.ctx, args)

  clearDraft = async () => {
    await this.mutation(internal.runs.execution.drafts.records.clear, {
      runId: this.runId,
    })
  }

  createAgentRun = (args: AgentRunArgs) =>
    this.mutation(internal.runtime.agents.create, args)

  drainSession = (args: SessionRef) =>
    drainRunSession(this.ctx, args.sessionId, this.runId)

  executeApproval = (args: ApprovalRef & RunRef) =>
    executeRunApproval(this.ctx, args)

  fetchGitHubCloneCredentials = (args: CloneArgs) =>
    fetchRunCloneCredentials(this.ctx, args)

  finishRun = async (args: { result: string }) => {
    await this.mutation(internal.runs.records.finish, {
      result: args.result,
      runId: this.runId,
    })
  }

  listTranscript = () =>
    this.query(internal.runs.execution.transcript.records.list, {
      runId: this.runId,
    })

  loadRunHandoffs = (args: RunRef) =>
    this.query(internal.runs.execution.waiters.handoffs.load, args)

  markApprovalConsumed = async (args: ApprovalConsumption) => {
    await this.mutation(
      internal.runs.execution.waiters.handoffs.consumeApproval,
      args
    )
  }

  markOfferConsumed = async (args: OfferRef) => {
    await this.mutation(
      internal.runs.execution.waiters.handoffs.consumeOffer,
      args
    )
  }

  park = (args: ParkArgs) =>
    this.mutation(internal.runs.execution.waiters.records.park, {
      ...args,
      ...(this.context.session === null
        ? {}
        : { sessionId: this.context.session.id }),
      runId: this.runId,
    })

  readAgentRuns = (args: AgentRunsArgs) =>
    this.query(internal.runtime.agents.readChildren, args)

  readWaiter = (args: WaiterRef) =>
    this.query(
      internal.runs.execution.waiters.records.get,
      args
    ) as Promise<ParkedCommand | null>

  recordEvent = async (args: RuntimeEventRecord) => {
    await this.mutation(internal.runs.execution.traces.records.record, args)
  }

  recordUsage = async (args: ProviderUsage) => {
    await this.mutation(internal.billing.usage.records.record, {
      ...args,
      runId: this.runId,
    })
  }

  requestApproval = (args: ApprovalArgs) => requestRunApproval(this.ctx, args)

  resolveWaiter = async (args: WaiterRef) => {
    await this.mutation(internal.runs.execution.waiters.records.resolve, args)
  }

  retarget = (args: { target: string }) =>
    retargetRunSession(this.ctx, this.context, args.target)

  sendReply = (args: ReplyArgs) => sendRunReply(this.ctx, args)

  stopAgentRun = (args: ChildRunArgs) =>
    this.mutation(internal.runtime.agents.stop, args)

  tailTranscript = () =>
    this.query(internal.runs.execution.transcript.records.tail, {
      runId: this.runId,
    })

  uploadFile = (args: UploadArgs) =>
    uploadRunFile(this.ctx, {
      ...args,
      organizationId: this.context.run.organizationId,
    })

  writeDraft = async (args: DraftArgs) => {
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
