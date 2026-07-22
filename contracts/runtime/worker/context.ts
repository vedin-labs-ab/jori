import { type MessageIntegration, type ToolSurface } from "../../integrations"
import { type JsonObject } from "../../json"
import { type ToolAccess } from "../../permissions"
import { type RuntimePrompt } from "../prompt"
import { type AgentRunStatus } from "./agents"
import { type RunHandoffs } from "./handoffs"
import { type RuntimeId } from "./ids"

export type ActiveSurface = {
  communicated: boolean
  surface: MessageIntegration
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
  /** Set by finish_run during the loop; recorded with run.completed. */
  result: string | null
  run: {
    id: RuntimeId<"runs">
    rootId: RuntimeId<"runs"> | null
    sandboxId: string | null
    status: AgentRunStatus["status"]
    organizationId: string
  }
  session: {
    id: RuntimeId<"sessions">
  } | null
  tools: RuntimeTool[]
}

export type RuntimeContextReload = Pick<
  RuntimeContext,
  "activeSurface" | "prompt" | "tools"
>

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
  id: RuntimeId<"messages">
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
  id: RuntimeId<"reactions">
  identifiers: string[]
  observedAt: number | null
  preview: string | null
  reaction: string
  source: RuntimeMessage["source"]
  target: string
  type: "reaction.added" | "reaction.removed"
}
