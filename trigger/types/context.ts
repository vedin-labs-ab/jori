import { type ToolSurface } from "../../contracts/integrations"
import { type JsonObject } from "../../contracts/json"
import { type ToolAccess } from "../../contracts/permissions"
import { type RuntimePrompt } from "../../contracts/runtime/prompt"
import { type RunHandoffs } from "./handoff"
import { type ConvexId } from "./id"

export type ActiveSurface = {
  communicated: boolean
  surface: "github" | "linear" | "slack"
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

export type RuntimeContext = {
  activeSurface: ActiveSurface | null
  drained: DrainedSessionBatch | null
  handoffs: RunHandoffs
  prompt: RuntimePrompt
  run: {
    id: ConvexId<"runs">
    rootId: ConvexId<"runs"> | null
    sandboxId: string | null
    status: "completed" | "failed" | "queued" | "running" | "stopped"
    tenantId: string
  }
  session: {
    id: ConvexId<"sessions">
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
  actor: string | null
  actorIds: string[]
  authority: "authoritative" | "soft"
  createdAt: number
  id: ConvexId<"messages">
  identifiers: string[]
  integration: string
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
  id: ConvexId<"reactions">
  identifiers: string[]
  observedAt: number | null
  preview: string | null
  reaction: string
  source: "bot" | "person" | "self" | "unknown"
  target: string
  type: "reaction.added" | "reaction.removed"
}
