import { ConvexHttpClient } from "convex/browser"
import { type ToolSurface } from "../contracts/integrations"
import { decodeToolResult, encodeToolInput } from "../contracts/transport"
import { api } from "../convex/_generated/api"
import {
  fetchGitHubCloneCredentials,
  type GitHubCloneArgs,
  requireConvexUrl,
  requireWorkerSecret,
  type UploadAttachmentArgs,
  uploadAttachment,
} from "./transport"
import {
  type ActiveSurface,
  type AgentRunPayload,
  type ConvexId,
  type JsonObject,
  type RunHandoffs,
  type RuntimeContext,
  type RuntimeEventInput,
  type RuntimeMessage,
  type RuntimeTool,
  type RuntimeTraceSource,
} from "./types"

export class MiloConvexClient {
  private readonly client = new ConvexHttpClient(requireConvexUrl())
  private readonly secret = requireWorkerSecret()

  async loadRun(payload: AgentRunPayload) {
    return (await this.client.action(api.runtime.context.load, {
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
    source: RuntimeTraceSource
    type: RuntimeEventInput["type"]
  }) {
    await this.client.mutation(api.runtime.traces.record, {
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

  async markApprovalConsumed(args: { approvalId: ConvexId<"approvals"> }) {
    await this.client.mutation(api.runtime.waiters.handoffs.consumeApproval, {
      approvalId: args.approvalId,
      secret: this.secret,
    })
  }

  async markOfferConsumed(args: { setupLinkId: ConvexId<"setupLinks"> }) {
    await this.client.mutation(api.runtime.waiters.handoffs.consumeOffer, {
      setupLinkId: args.setupLinkId,
      secret: this.secret,
    })
  }

  async createWaiter(args: {
    runId: ConvexId<"runs">
    sessionId?: ConvexId<"sessions">
    waitpointId: string
    expiresAt: number
  }) {
    return (await this.client.mutation(api.runtime.waiters.data.create, {
      runId: args.runId,
      ...(args.sessionId === undefined ? {} : { sessionId: args.sessionId }),
      waitpointId: args.waitpointId,
      expiresAt: args.expiresAt,
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
      prompt: string
      tools: RuntimeTool[]
      activeSurface: ActiveSurface | null
    }
  }

  async sendReply(args: {
    blocks?: JsonObject[]
    runId: ConvexId<"runs">
    text: string
  }) {
    return await this.client.action(api.runtime.surface.sendReply, {
      ...args,
      secret: this.secret,
    })
  }

  async drainSessionMessages(args: {
    limit?: number
    sessionId: ConvexId<"sessions">
  }) {
    return (await this.client.mutation(api.runtime.sessions.drain, {
      limit: args.limit,
      secret: this.secret,
      sessionId: args.sessionId,
    })) as {
      hasMore: boolean
      messages: RuntimeMessage[]
    }
  }

  async requestApproval(args: {
    input: JsonObject
    runId: ConvexId<"runs">
    surface: ToolSurface
    tool: string
  }) {
    return await this.client.action(api.runtime.tools.requestApproval, {
      ...encodeToolInput(args.input),
      runId: args.runId,
      secret: this.secret,
      surface: args.surface,
      tool: args.tool,
    })
  }

  async createChildRun(args: {
    parentId: ConvexId<"runs">
    task: string
    title?: string
  }) {
    return await this.client.action(api.runtime.children.create, {
      parentId: args.parentId,
      secret: this.secret,
      task: args.task,
      title: args.title,
    })
  }

  async uploadAttachment(args: UploadAttachmentArgs) {
    return await uploadAttachment(this.secret, args)
  }

  async fetchGitHubCloneCredentials(args: GitHubCloneArgs) {
    return await fetchGitHubCloneCredentials(this.secret, args)
  }

  async upsertSandbox(args: { externalId: string; runId: ConvexId<"runs"> }) {
    await this.client.mutation(api.runtime.sandboxes.upsert, {
      ...args,
      secret: this.secret,
    })
  }

  async releaseSandbox(args: {
    externalId: string
    runId: ConvexId<"runs">
  }): Promise<{ expiresAt: number } | null> {
    return (await this.client.mutation(api.runtime.sandboxes.release, {
      ...args,
      secret: this.secret,
    })) as { expiresAt: number } | null
  }

  async reserveExpiredSandboxCleanup(args: {
    expiresAt: number
    externalId: string
    runId: ConvexId<"runs">
  }): Promise<boolean> {
    return (await this.client.mutation(
      api.runtime.sandboxes.reserveExpiredCleanup,
      {
        ...args,
        secret: this.secret,
      }
    )) as boolean
  }

  async markSandboxCleaned(args: { error?: string; externalId: string }) {
    const input =
      args.error === undefined
        ? { externalId: args.externalId, secret: this.secret }
        : {
            error: args.error,
            externalId: args.externalId,
            secret: this.secret,
          }

    await this.client.mutation(api.runtime.sandboxes.markCleaned, {
      ...input,
    })
  }
}
