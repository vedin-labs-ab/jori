import { type ProviderUsage } from "../../../contracts/billing"
import { type ToolSurface } from "../../../contracts/integrations"
import { type JsonObject, type JsonValue } from "../../../contracts/json"
import { type ReplyPart } from "../../../contracts/replies/parts"
import {
  type DrainedSessionBatch,
  type RuntimeContext,
} from "../../../contracts/runtime/context"
import { type RuntimeEventRecord } from "../../../contracts/runtime/events"
import { type UploadedFile } from "../../../contracts/runtime/files"
import {
  type ApprovalExecution,
  type RunHandoffs,
} from "../../../contracts/runtime/handoffs"
import { type RuntimeId } from "../../../contracts/runtime/ids"
import { type AgentRunStatus } from "../../../contracts/runtime/runs"
import { type SurfaceReactionTarget } from "../../../contracts/runtime/surface"
import {
  type ParkedCommand,
  type ParkedWaiter,
  type WaiterCondition,
} from "../../../contracts/runtime/waiters"
import { type TranscriptMessage } from "../../runs/execution/transcript/schema"
import { type SandboxRuntime } from "../sandbox/types"

export type GeneratedImage = {
  image: { bytes: Uint8Array; mimeType: string } | null
  usage: ProviderUsage
  failure?: string
}

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
  generateImage(prompt: string): Promise<GeneratedImage>
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
