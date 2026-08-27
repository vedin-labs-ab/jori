import { type ToolSurface } from "../contracts/integrations"
import { type JsonObject, type JsonValue } from "../contracts/json"
import { type SurfaceReactionTarget } from "../contracts/runtime/surface"
import {
  type AgentRunPayload,
  type AgentRunStatus,
  type DrainedSessionBatch,
  type HandoffSubject,
  type RunHandoffs,
  type RuntimeContext,
  type RuntimeContextReload,
  type RuntimeEventInput,
  type RuntimeId,
  type WaiterCondition,
} from "../contracts/runtime/worker"

export type UploadedFile = {
  fileId: RuntimeId<"files">
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
    runId: RuntimeId<"runs">
    target: SurfaceReactionTarget
  }): Promise<unknown>
  callTool(args: {
    input: JsonObject
    runId: RuntimeId<"runs">
    surface: ToolSurface
    tool: string
  }): Promise<JsonValue>
  createAgentRun(args: {
    parentId: RuntimeId<"runs">
    task: string
    title: string
    tools?: string[]
  }): Promise<unknown>
  createWaiter(args: {
    runId: RuntimeId<"runs">
    sessionId?: RuntimeId<"sessions">
    waitpointId: string
    expiresAt: number
    condition?: WaiterCondition
  }): Promise<RuntimeId<"waiters">>
  drainSessionMessages(args: {
    limit?: number
    sessionId: RuntimeId<"sessions">
  }): Promise<DrainedSessionBatch>
  executeApproval(args: {
    approvalId: RuntimeId<"approvals">
    runId: RuntimeId<"runs">
  }): Promise<string>
  expireWaiter(args: { waiterId: RuntimeId<"waiters"> }): Promise<void>
  fetchGitHubCloneCredentials(args: {
    owner: string
    repo: string
    runId: RuntimeId<"runs">
  }): Promise<GitHubCloneCredentials>
  loadRun(payload: AgentRunPayload, attempt: number): Promise<RuntimeContext>
  loadRunHandoffs(args: { runId: RuntimeId<"runs"> }): Promise<RunHandoffs>
  loadRunHandoffSubjects(args: {
    subjects: HandoffSubject[]
  }): Promise<RunHandoffs>
  markApprovalConsumed(args: {
    approvalId: RuntimeId<"approvals">
  }): Promise<void>
  markOfferConsumed(args: {
    integrationOfferId: RuntimeId<"integrationOffers">
  }): Promise<void>
  markSandboxCleaned(args: {
    error?: string
    externalId: string
  }): Promise<void>
  readAgentRuns(args: {
    parentId: RuntimeId<"runs">
    runIds: RuntimeId<"runs">[]
  }): Promise<AgentRunStatus[]>
  stopAgentRun(args: {
    parentId: RuntimeId<"runs">
    runId: RuntimeId<"runs">
  }): Promise<unknown>
  recordEvent(args: {
    attempt?: number
    callId?: string
    data?: RuntimeEventInput["data"]
    key: string
    runId: RuntimeId<"runs">
    sequence: number
    type: RuntimeEventInput["type"]
  }): Promise<void>
  releaseSandbox(args: {
    externalId: string
    runId: RuntimeId<"runs">
  }): Promise<{ expiresAt: number } | null>
  reloadContext(args: {
    runId: RuntimeId<"runs">
  }): Promise<RuntimeContextReload>
  requestApproval(args: {
    input: JsonObject
    replyTarget?: string
    runId: RuntimeId<"runs">
    surface: ToolSurface
    tool: string
  }): Promise<unknown>
  reserveExpiredSandboxCleanup(args: {
    expiresAt: number
    externalId: string
    runId: RuntimeId<"runs">
  }): Promise<boolean>
  sendReply(args: {
    blocks?: JsonObject[]
    runId: RuntimeId<"runs">
    target?: string
    text: string
  }): Promise<unknown>
  uploadFile(args: {
    bytes: Uint8Array
    description?: string
    mimeType: string
    name: string
    runId: RuntimeId<"runs">
  }): Promise<UploadedFile>
  upsertSandbox(args: {
    externalId: string
    runId: RuntimeId<"runs">
  }): Promise<void>
}
