import { ConvexHttpClient } from "convex/browser"
import { type ToolSurface } from "../contracts/integrations"
import { api } from "../convex/_generated/api"
import { type Id } from "../convex/_generated/dataModel"
import {
  type AgentRunPayload,
  type JsonObject,
  type RuntimeContext,
  type SandboxCleanupPayload,
} from "./types"

export class MiloConvexClient {
  private readonly client = new ConvexHttpClient(requireConvexUrl())
  private readonly secret = requireWorkerSecret()

  async loadRun(payload: AgentRunPayload) {
    return (await this.client.action(api.runtime.context.load, {
      executionId: payload.executionId,
      runId: payload.runId,
      secret: this.secret,
    })) as RuntimeContext
  }

  async recordEvent(args: {
    attempt?: number
    eventKey: string
    executionId: Id<"executions">
    payload?: JsonObject
    runId: Id<"runs">
    sequence: number
    source: string
    toolCallId?: string
    type: string
  }) {
    await this.client.mutation(api.runtime.events.record, {
      ...args,
      secret: this.secret,
    })
  }

  async callTool(args: {
    approved?: boolean
    executionId: Id<"executions">
    input: JsonObject
    surface: ToolSurface
    tool: string
  }) {
    return await this.client.action(api.runtime.tools.call, {
      approved: args.approved,
      args: args.input,
      executionId: args.executionId,
      secret: this.secret,
      surface: args.surface,
      tool: args.tool,
    })
  }

  async requestApproval(args: {
    executionId: Id<"executions">
    input: JsonObject
    surface: ToolSurface
    tool: string
    waitpointTokenId: string
  }) {
    return await this.client.action(api.runtime.tools.requestApproval, {
      args: args.input,
      executionId: args.executionId,
      secret: this.secret,
      surface: args.surface,
      tool: args.tool,
      waitpointTokenId: args.waitpointTokenId,
    })
  }

  async createChildRun(args: {
    parentRunId: Id<"runs">
    task: string
    title?: string
  }) {
    return await this.client.action(api.runtime.children.create, {
      parentRunId: args.parentRunId,
      secret: this.secret,
      task: args.task,
      title: args.title,
    })
  }

  async upsertSandbox(args: {
    executionId: Id<"executions">
    runId: Id<"runs">
    sandboxId: string
    status: "created" | "reconnected" | "running"
    traceHost?: string
  }) {
    await this.client.mutation(api.runtime.sandboxes.upsert, {
      ...args,
      secret: this.secret,
    })
  }

  async markSandboxCleaned(args: SandboxCleanupPayload) {
    await this.client.mutation(api.runtime.sandboxes.markCleaned, {
      ...args,
      secret: this.secret,
    })
  }
}

function requireConvexUrl() {
  const url =
    process.env.CONVEX_URL?.trim() || process.env.VITE_CONVEX_URL?.trim()

  if (url === undefined || url === "") {
    throw new Error("Missing CONVEX_URL")
  }

  return url
}

function requireWorkerSecret() {
  const secret = process.env.MILO_WORKER_SECRET?.trim()

  if (secret === undefined || secret === "") {
    throw new Error("Missing MILO_WORKER_SECRET")
  }

  return secret
}
