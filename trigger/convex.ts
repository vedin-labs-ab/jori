import { ConvexHttpClient } from "convex/browser"
import { type ToolSurface } from "../contracts/integrations"
import { api } from "../convex/_generated/api"
import {
  type AgentRunPayload,
  type ConvexId,
  type JsonObject,
  type RuntimeContext,
  type RuntimeEventInput,
  type RuntimeMessage,
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
    approved?: boolean
    input: JsonObject
    runId: ConvexId<"runs">
    surface: ToolSurface
    tool: string
  }) {
    return await this.client.action(api.runtime.tools.call, {
      approved: args.approved,
      args: args.input,
      runId: args.runId,
      secret: this.secret,
      surface: args.surface,
      tool: args.tool,
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
    waitpointTokenId: string
  }) {
    return await this.client.action(api.runtime.tools.requestApproval, {
      args: args.input,
      runId: args.runId,
      secret: this.secret,
      surface: args.surface,
      tool: args.tool,
      waitpointTokenId: args.waitpointTokenId,
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

  async uploadAttachment(args: {
    bytes: Uint8Array
    description?: string
    mimeType: string
    name: string
    runId: ConvexId<"runs">
  }) {
    const url = new URL("/milo/attachments", requireConvexSiteUrl())
    url.searchParams.set("name", args.name)

    if (args.description !== undefined) {
      url.searchParams.set("description", args.description)
    }

    const response = await fetch(url, {
      body: toArrayBuffer(args.bytes),
      headers: {
        "content-type": args.mimeType,
        "x-milo-run-id": args.runId,
        "x-milo-worker-secret": this.secret,
      },
      method: "POST",
    })
    const result = (await response.json().catch(() => null)) as unknown

    if (!response.ok) {
      throw new Error(attachmentUploadError(result))
    }

    return result
  }

  async fetchGitHubTarball(args: {
    owner: string
    ref?: string
    repo: string
    runId: ConvexId<"runs">
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
          "x-milo-run-id": args.runId,
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

function attachmentUploadError(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error
  }

  return "Attachment upload failed"
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)

  return copy.buffer
}
