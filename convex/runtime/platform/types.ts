import { type ProviderUsage } from "../../../contracts/billing"
import {
  type MessageSurface,
  type ToolSurface,
} from "../../../contracts/integrations"
import { type JsonObject, type JsonValue } from "../../../contracts/json"
import { type ToolAccess } from "../../../contracts/permissions"
import { type ReplyPart } from "../../../contracts/replies/parts"
import { type RunStatus } from "../../../contracts/runtime/runs"
import { type SurfaceReactionTarget } from "../../../contracts/runtime/surface"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ApprovalExecution } from "../../approvals/execution"
import { type UploadedFile } from "../../files/upload"
import {
  type RuntimeTraceType,
  type TraceData,
} from "../../runs/execution/traces/schema"
import { type TranscriptMessage } from "../../runs/execution/transcript/schema"
import { type RunHandoffs } from "../../runs/execution/waiters/handoffs"
import { type WaiterCondition } from "../../runs/execution/waiters/schema"
import { type DrainedSessionBatch } from "../../sessions/drain"
import { type SandboxRuntime } from "../sandbox/types"

export type ActiveSurface = {
  communicated: boolean
  surface: MessageSurface
  target: string | null
}

export type RuntimeTool = {
  access: ToolAccess
  description: string
  inputSchema: JsonObject
  mode?: "allowed" | "blocked" | "prompted" | "required"
  name: string
  // "surface" is distinct from ToolSurface/activeSurface, which names
  // integrations like Slack.
  route: "agent" | "surface" | "convex" | "run" | "sandbox"
  surface?: ToolSurface
  tool?: string
}

/**
 * What one step of a run needs to know about it. Every step rebuilds this
 * from the database, so it holds only what the loaders read: no prompt, no
 * history, no handoffs.
 */
export type RuntimeContext = {
  activeSurface: ActiveSurface | null
  run: {
    id: Id<"runs">
    rootId: Id<"runs"> | null
    sandboxId: string | null
    status: RunStatus
    organizationId: string
  }
  session: {
    id: Id<"sessions">
  } | null
  tools: RuntimeTool[]
}

/** What a parent sees of a child run it delegated to. */
export type AgentRunStatus = {
  runId: Id<"runs">
  title: string
  status: RunStatus
  error: string | null
  /** Outcome the child returned via finish_run; null until it completes. */
  result: string | null
}

/** One trace as the runtime hands it over, keyed so a replayed step writes
 *  the row it already wrote. The prepared trace is written by the run's own
 *  mutation and never travels this way. */
export type RuntimeEventRecord = {
  callId?: string
  data?: TraceData
  key: string
  runId: Id<"runs">
  sequence: number
  type: RuntimeTraceType
}

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

type RunId = Id<"runs">
type RunRef = { runId: RunId }
type WaiterRef = { waiterId: Id<"waiters"> }
type SessionRef = { sessionId: Id<"sessions"> }
type ApprovalRef = { approvalId: Id<"approvals"> }
type ApprovalConsumption = ApprovalRef & { message?: TranscriptMessage }
type OfferRef = { integrationOfferId: Id<"integrationOffers"> }
type ChildRunArgs = { parentId: RunId; runId: RunId }
type AgentRunsArgs = {
  parentId: RunId
  runIds: RunId[]
}
type ParkedWaiter = { eventId: string; waiterId: Id<"waiters"> }

/** What a waiter remembers so the tool can collect its output after waking. */
type WaiterMemory = Pick<Doc<"waiters">, "condition" | "token">
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
  readWaiter(args: WaiterRef): Promise<WaiterMemory | null>
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
