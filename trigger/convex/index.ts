import { ConvexHttpClient } from "convex/browser"
import { type ToolSurface } from "../../contracts/integrations"
import { type JsonObject } from "../../contracts/json"
import { type SurfaceReactionTarget } from "../../contracts/runtime/surface"
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
} from "../../contracts/runtime/worker"
import { decodeToolResult, encodeToolInput } from "../../contracts/transport"
import { api } from "../../convex/_generated/api"
import { type RuntimePlatform } from "../platform"
import { type UploadAssetArgs, uploadAsset } from "./assets"
import { requireConvexUrl, requireWorkerSecret } from "./config"
import { fetchGitHubCloneCredentials, type GitHubCloneArgs } from "./github"

export class MiloConvexClient implements RuntimePlatform {
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
    runId: RuntimeId<"runs">
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
    runId: RuntimeId<"runs">
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
    approvalId: RuntimeId<"approvals">
    runId: RuntimeId<"runs">
  }) {
    return (await this.client.action(api.runtime.tools.executeApproval, {
      approvalId: args.approvalId,
      runId: args.runId,
      secret: this.secret,
    })) as string
  }

  async loadRunHandoffs(args: { runId: RuntimeId<"runs"> }) {
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

  async markApprovalConsumed(args: { approvalId: RuntimeId<"approvals"> }) {
    await this.client.mutation(api.runtime.waiters.handoffs.consumeApproval, {
      approvalId: args.approvalId,
      secret: this.secret,
    })
  }

  async markOfferConsumed(args: {
    integrationOfferId: RuntimeId<"integrationOffers">
  }) {
    await this.client.mutation(api.runtime.waiters.handoffs.consumeOffer, {
      integrationOfferId: args.integrationOfferId,
      secret: this.secret,
    })
  }

  async createWaiter(args: {
    runId: RuntimeId<"runs">
    sessionId?: RuntimeId<"sessions">
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
    })) as RuntimeId<"waiters">
  }

  async expireWaiter(args: { waiterId: RuntimeId<"waiters"> }) {
    await this.client.mutation(api.runtime.waiters.data.expire, {
      waiterId: args.waiterId,
      secret: this.secret,
    })
  }

  async reloadContext(args: { runId: RuntimeId<"runs"> }) {
    return (await this.client.action(api.runtime.context.reload, {
      runId: args.runId,
      secret: this.secret,
    })) as RuntimeContextReload
  }

  async sendReply(args: {
    blocks?: JsonObject[]
    runId: RuntimeId<"runs">
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
    runId: RuntimeId<"runs">
    target: SurfaceReactionTarget
  }) {
    return await this.client.action(api.runtime.surface.reactions.add, {
      ...args,
      secret: this.secret,
    })
  }

  async drainSessionMessages(args: {
    limit?: number
    sessionId: RuntimeId<"sessions">
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
    runId: RuntimeId<"runs">
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
    parentId: RuntimeId<"runs">
    task: string
    title: string
    tools?: string[]
  }) {
    return await this.client.action(api.runtime.agents.create, {
      ...args,
      secret: this.secret,
    })
  }

  async readAgentRuns(args: {
    parentId: RuntimeId<"runs">
    runIds: RuntimeId<"runs">[]
  }) {
    return (await this.client.query(api.runtime.agents.readChildren, {
      ...args,
      secret: this.secret,
    })) as AgentRunStatus[]
  }

  async stopAgentRun(args: {
    parentId: RuntimeId<"runs">
    runId: RuntimeId<"runs">
  }) {
    return await this.client.action(api.runtime.agents.stop, {
      ...args,
      secret: this.secret,
    })
  }

  async uploadAsset(args: UploadAssetArgs) {
    return await uploadAsset(this.secret, args)
  }

  async fetchGitHubCloneCredentials(args: GitHubCloneArgs) {
    return await fetchGitHubCloneCredentials(this.secret, args)
  }

  async upsertSandbox(args: { externalId: string; runId: RuntimeId<"runs"> }) {
    await this.client.mutation(api.runtime.sandboxes.upsert, {
      ...args,
      secret: this.secret,
    })
  }

  async releaseSandbox(args: {
    externalId: string
    runId: RuntimeId<"runs">
  }): Promise<{ expiresAt: number } | null> {
    return (await this.client.mutation(api.runtime.sandboxes.release, {
      ...args,
      secret: this.secret,
    })) as { expiresAt: number } | null
  }

  async reserveExpiredSandboxCleanup(args: {
    expiresAt: number
    externalId: string
    runId: RuntimeId<"runs">
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
    await this.client.mutation(api.runtime.sandboxes.markCleaned, {
      ...args,
      secret: this.secret,
    })
  }
}
