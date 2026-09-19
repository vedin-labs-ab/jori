import { type MessageSurface, type ToolSurface } from "../integrations"
import { type JsonObject } from "../json"
import { type ToolAccess } from "../permissions"
import { type RuntimeId } from "./ids"
import { type RunStatus } from "./runs"

export type ActiveSurface = {
  communicated: boolean
  surface: MessageSurface
  target: string | null
}

type RuntimeToolRoute =
  | "agent"
  // Distinct from ToolSurface/activeSurface, which names integrations like Slack.
  | "surface"
  | "convex"
  | "run"
  | "sandbox"

export type RuntimeTool = {
  access: ToolAccess
  description: string
  inputSchema: JsonObject
  mode?: "allowed" | "blocked" | "prompted" | "required"
  name: string
  route: RuntimeToolRoute
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
    id: RuntimeId<"runs">
    rootId: RuntimeId<"runs"> | null
    sandboxId: string | null
    status: RunStatus
    organizationId: string
  }
  session: {
    id: RuntimeId<"sessions">
  } | null
  tools: RuntimeTool[]
}

export type DrainedSessionBatch = {
  contexts?: string[]
  hasMore: boolean
  interactions?: RuntimeInteraction[]
  messages: RuntimeMessage[]
}

export type RuntimeMessage = {
  /** Resource and folder metadata, resolved for the execution audience. */
  context?: string
  actor: string | null
  actorIds: string[]
  createdAt: number
  id: RuntimeId<"messages">
  identifiers: string[]
  mentioned: boolean
  observedAt: number | null
  reactions: string | null
  replyTarget: string | null
  source: "bot" | "person" | "self" | "unknown"
  text: string
  type: string
}

export type RuntimeInteraction = {
  actor: string | null
  actorIds: string[]
  createdAt: number
  id: RuntimeId<"reactions">
  identifiers: string[]
  observedAt: number | null
  preview: string | null
  reaction: string
  source: RuntimeMessage["source"]
  target: string
  type: "reaction.added" | "reaction.removed"
}
