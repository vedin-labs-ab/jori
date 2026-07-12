import { ConvexHttpClient } from "convex/browser"
import { type ToolSurface } from "../contracts/integrations"
import { decodeToolResult, encodeToolInput } from "../contracts/transport"
import { api } from "../convex/_generated/api"
import { createAgentRun, readAgentRuns } from "./convex/agents"
import {
  markSandboxCleaned,
  releaseSandbox,
  reserveExpiredSandboxCleanup,
  upsertSandbox,
} from "./convex/sandboxes"
import {
  fetchGitHubCloneCredentials,
  type GitHubCloneArgs,
  requireConvexUrl,
  requireWorkerSecret,
  type UploadAssetArgs,
  uploadAsset,
} from "./transport"
import {
  type ActiveSurface,
  type AgentRunPayload,
  type ConvexId,
  type DrainedSessionBatch,
  type HandoffSubject,
  type JsonObject,
  type RunHandoffs,
  type RuntimeContext,
  type RuntimeEventInput,
  type RuntimePrompt,
  type RuntimeTool,
  type SurfaceReactionTarget,
  type WaiterCondition,
} from "./types"

export class MiloConvexClient {
  private readonly client = new ConvexHttpClient(requireConvexUrl())
  private readonly secret = requireWorkerSecret()

  async loadRun(payload: AgentRunPayload, attempt: number) {
    return (await this.client.action(api.runtime.context.load, {
      attempt,
      runId: payload.runId,
      secret: this.secret,
    })) as RuntimeContext
  }

  async recordEvent(args: {
    attempt?: number
    callId?: string
    data?: RuntimeEventInput["data"]
    key: string
    runId: ConvexId<"runs">
    sequence: number
    type: RuntimeEventInput["type"]
  }) {
    await this.client.mutation(api.runtime.traces.data.record, {
      ...args,
      secret: this.secret,
    })
  }

  async callTool(args: {
    input: JsonObject
    runId: ConvexId<"runs">
    surface: ToolSurface
    tool: string
  }) {
    const result = await this.client.action(api.runtime.tools.call, {
      ...encodeToolInput(args.input),
      runId: args.runId,
      secret: this.secret,
      surface: args.surface,
      tool: args.tool,
    })

    return decodeToolResult(result)
  }

  async executeApproval(args: {
    approvalId: ConvexId<"approvals">
    runId: ConvexId<"runs">
  }) {
    return (await this.client.action(api.runtime.tools.executeApproval, {
      approvalId: args.approvalId,
      runId: args.runId,
      secret: this.secret,
    })) as string
  }

  async loadRunHandoffs(args: { runId: ConvexId<"runs"> }) {
    return (await this.client.query(api.runtime.waiters.handoffs.load, {
      runId: args.runId,
      secret: this.secret,
    })) as RunHandoffs
  }

  async loadRunHandoffSubjects(args: { subjects: HandoffSubject[] }) {
    return (await this.client.query(api.runtime.waiters.handoffs.loadSubjects, {
      secret: this.secret,
      subjects: args.subjects,
    })) as RunHandoffs
  }

  async markApprovalConsumed(args: { approvalId: ConvexId<"approvals"> }) {
    await this.client.mutation(api.runtime.waiters.handoffs.consumeApproval, {
      approvalId: args.approvalId,
      secret: this.secret,
    })
  }

  async markOfferConsumed(args: {
    integrationOfferId: ConvexId<"integrationOffers">
  }) {
    await this.client.mutation(api.runtime.waiters.handoffs.consumeOffer, {
      integrationOfferId: args.integrationOfferId,
      secret: this.secret,
    })
  }

  async createWaiter(args: {
    runId: ConvexId<"runs">
    sessionId?: ConvexId<"sessions">
    waitpointId: string
    expiresAt: number
    condition?: WaiterCondition
  }) {
    return (await this.client.mutation(api.runtime.waiters.data.create, {
      runId: args.runId,
      ...(args.sessionId === undefined ? {} : { sessionId: args.sessionId }),
      waitpointId: args.waitpointId,
      expiresAt: args.expiresAt,
      ...(args.condition === undefined ? {} : { condition: args.condition }),
      secret: this.secret,
    })) as ConvexId<"waiters">
  }

  async expireWaiter(args: { waiterId: ConvexId<"waiters"> }) {
    await this.client.mutation(api.runtime.waiters.data.expire, {
      waiterId: args.waiterId,
      secret: this.secret,
    })
  }

  async reloadContext(args: { runId: ConvexId<"runs"> }) {
    return (await this.client.action(api.runtime.context.reload, {
      runId: args.runId,
      secret: this.secret,
    })) as {
      prompt: RuntimePrompt
      tools: RuntimeTool[]
      activeSurface: ActiveSurface | null
    }
  }

  async sendReply(args: {
    blocks?: JsonObject[]
    runId: ConvexId<"runs">
    target?: string
    text: string
  }) {
    return await this.client.action(api.runtime.surface.sendReply, {
      ...args,
      secret: this.secret,
    })
  }

  async addReaction(args: {
    reaction: string
    runId: ConvexId<"runs">
    target: SurfaceReactionTarget
  }) {
    return await this.client.action(api.runtime.surface.reactions.add, {
      ...args,
      secret: this.secret,
    })
  }

  async drainSessionMessages(args: {
    limit?: number
    sessionId: ConvexId<"sessions">
  }) {
    return (await this.client.action(api.runtime.sessions.drain, {
      limit: args.limit,
      secret: this.secret,
      sessionId: args.sessionId,
    })) as DrainedSessionBatch
  }

  async requestApproval(args: {
    input: JsonObject
    replyTarget?: string
    runId: ConvexId<"runs">
    surface: ToolSurface
    tool: string
  }) {
    return await this.client.action(api.runtime.tools.requestApproval, {
      ...encodeToolInput(args.input),
      ...(args.replyTarget === undefined
        ? {}
        : { replyTarget: args.replyTarget }),
      runId: args.runId,
      secret: this.secret,
      surface: args.surface,
      tool: args.tool,
    })
  }

  async createAgentRun(args: {
    parentId: ConvexId<"runs">
    task: string
    title: string
    tools?: string[]
  }) {
    return await createAgentRun(this.client, this.secret, args)
  }

  async readAgentRuns(args: {
    parentId: ConvexId<"runs">
    runIds: ConvexId<"runs">[]
  }) {
    return await readAgentRuns(this.client, this.secret, args)
  }

  async uploadAsset(args: UploadAssetArgs) {
    return await uploadAsset(this.secret, args)
  }

  async fetchGitHubCloneCredentials(args: GitHubCloneArgs) {
    return await fetchGitHubCloneCredentials(this.secret, args)
  }

  async upsertSandbox(args: { externalId: string; runId: ConvexId<"runs"> }) {
    await upsertSandbox(this.client, this.secret, args)
  }

  async releaseSandbox(args: {
    externalId: string
    runId: ConvexId<"runs">
  }): Promise<{ expiresAt: number } | null> {
    return await releaseSandbox(this.client, this.secret, args)
  }

  async reserveExpiredSandboxCleanup(args: {
    expiresAt: number
    externalId: string
    runId: ConvexId<"runs">
  }): Promise<boolean> {
    return await reserveExpiredSandboxCleanup(this.client, this.secret, args)
  }

  async markSandboxCleaned(args: { error?: string; externalId: string }) {
    await markSandboxCleaned(this.client, this.secret, args)
  }
}
