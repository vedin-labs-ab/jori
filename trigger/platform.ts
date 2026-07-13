import { type ToolSurface } from "../contracts/integrations"
import { type JsonObject, type JsonValue } from "../contracts/json"
import {
  type ActiveSurface,
  type AgentRunPayload,
  type AgentRunStatus,
  type ConvexId,
  type DrainedSessionBatch,
  type HandoffSubject,
  type RunHandoffs,
  type RuntimeContext,
  type RuntimeEventInput,
  type RuntimePrompt,
  type RuntimeTool,
  type SurfaceReactionTarget,
  type WaiterCondition,
} from "./types"

export type UploadedAsset = {
  assetId: ConvexId<"assets">
  mimeType: string
  name: string
  size: number
  url: string | null
}

export type GitHubCloneCredentials = {
  remoteUrl: string
  token: string
  username: string
}

export type RuntimePlatform = {
  addReaction(args: {
    reaction: string
    runId: ConvexId<"runs">
    target: SurfaceReactionTarget
  }): Promise<unknown>
  callTool(args: {
    input: JsonObject
    runId: ConvexId<"runs">
    surface: ToolSurface
    tool: string
  }): Promise<JsonValue>
  createAgentRun(args: {
    parentId: ConvexId<"runs">
    task: string
    title: string
    tools?: string[]
  }): Promise<unknown>
  createWaiter(args: {
    runId: ConvexId<"runs">
    sessionId?: ConvexId<"sessions">
    waitpointId: string
    expiresAt: number
    condition?: WaiterCondition
  }): Promise<ConvexId<"waiters">>
  drainSessionMessages(args: {
    limit?: number
    sessionId: ConvexId<"sessions">
  }): Promise<DrainedSessionBatch>
  executeApproval(args: {
    approvalId: ConvexId<"approvals">
    runId: ConvexId<"runs">
  }): Promise<string>
  expireWaiter(args: { waiterId: ConvexId<"waiters"> }): Promise<void>
  fetchGitHubCloneCredentials(args: {
    owner: string
    repo: string
    runId: ConvexId<"runs">
  }): Promise<GitHubCloneCredentials>
  loadRun(payload: AgentRunPayload, attempt: number): Promise<RuntimeContext>
  loadRunHandoffs(args: { runId: ConvexId<"runs"> }): Promise<RunHandoffs>
  loadRunHandoffSubjects(args: {
    subjects: HandoffSubject[]
  }): Promise<RunHandoffs>
  markApprovalConsumed(args: {
    approvalId: ConvexId<"approvals">
  }): Promise<void>
  markOfferConsumed(args: {
    integrationOfferId: ConvexId<"integrationOffers">
  }): Promise<void>
  markSandboxCleaned(args: {
    error?: string
    externalId: string
  }): Promise<void>
  readAgentRuns(args: {
    parentId: ConvexId<"runs">
    runIds: ConvexId<"runs">[]
  }): Promise<AgentRunStatus[]>
  recordEvent(args: {
    attempt?: number
    callId?: string
    data?: RuntimeEventInput["data"]
    key: string
    runId: ConvexId<"runs">
    sequence: number
    type: RuntimeEventInput["type"]
  }): Promise<void>
  releaseSandbox(args: {
    externalId: string
    runId: ConvexId<"runs">
  }): Promise<{ expiresAt: number } | null>
  reloadContext(args: { runId: ConvexId<"runs"> }): Promise<{
    prompt: RuntimePrompt
    tools: RuntimeTool[]
    activeSurface: ActiveSurface | null
  }>
  requestApproval(args: {
    input: JsonObject
    replyTarget?: string
    runId: ConvexId<"runs">
    surface: ToolSurface
    tool: string
  }): Promise<unknown>
  reserveExpiredSandboxCleanup(args: {
    expiresAt: number
    externalId: string
    runId: ConvexId<"runs">
  }): Promise<boolean>
  sendReply(args: {
    blocks?: JsonObject[]
    runId: ConvexId<"runs">
    target?: string
    text: string
  }): Promise<unknown>
  uploadAsset(args: {
    bytes: Uint8Array
    description?: string
    mimeType: string
    name: string
    runId: ConvexId<"runs">
  }): Promise<UploadedAsset>
  upsertSandbox(args: {
    externalId: string
    runId: ConvexId<"runs">
  }): Promise<void>
}
