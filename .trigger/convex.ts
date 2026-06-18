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

  async uploadFile(args: {
    bytes: Uint8Array
    description?: string
    executionId: Id<"executions">
    mimeType: string
    name: string
  }) {
    const url = new URL("/milo/files", requireConvexSiteUrl())
    url.searchParams.set("name", args.name)

    if (args.description !== undefined) {
      url.searchParams.set("description", args.description)
    }

    const response = await fetch(url, {
      body: args.bytes,
      headers: {
        "content-type": args.mimeType,
        "x-milo-execution-id": args.executionId,
        "x-milo-worker-secret": this.secret,
      },
      method: "POST",
    })
    const result = (await response.json().catch(() => null)) as unknown

    if (!response.ok) {
      throw new Error(fileUploadError(result))
    }

    return result
  }

  async fetchGitHubTarball(args: {
    executionId: Id<"executions">
    owner: string
    ref?: string
    repo: string
  }) {
    const response = await fetch(
      new URL("/milo/github/tarball", requireConvexSiteUrl()),
      {
        body: JSON.stringify({
          owner: args.owner,
          ref: args.ref,
          repo: args.repo,
        }),
        headers: {
          "content-type": "application/json",
          "x-milo-execution-id": args.executionId,
          "x-milo-worker-secret": this.secret,
        },
        method: "POST",
      }
    )

    if (!response.ok) {
      throw new Error(
        await response.text().catch(() => "GitHub tarball failed")
      )
    }

    return new Uint8Array(await response.arrayBuffer())
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

function requireConvexSiteUrl() {
  const url =
    process.env.CONVEX_SITE_URL?.trim() ||
    process.env.VITE_CONVEX_SITE_URL?.trim()

  if (url === undefined || url === "") {
    throw new Error("Missing CONVEX_SITE_URL")
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

function fileUploadError(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error
  }

  return "File upload failed"
}
