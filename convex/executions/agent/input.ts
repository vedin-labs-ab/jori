import { type Doc } from "../../_generated/dataModel"
import { type RoutingConversationEntry } from "../../routing/history"

export type MessageIntegration = "github" | "linear" | "slack"
export type RuntimeIntegration = Doc<"integrations">

export type MessageRuntimeInput = {
  type: "message"
  messageIntegration: MessageIntegration
  run: Doc<"runs">
  integration: RuntimeIntegration
  integrations: RuntimeIntegration[]
  message: Doc<"messages">
  conversation: RoutingConversationEntry[]
  routing: {
    reply: string | null
    route: "agent" | "ignore" | "reply"
  } | null
}

export type AutomationRuntimeInput = {
  type: "automation"
  run: Doc<"runs">
  integration: RuntimeIntegration | null
  integrations: RuntimeIntegration[]
  automation: Doc<"automations">
  event: Doc<"events"> | null
}

export type AgentRuntimeInput = MessageRuntimeInput | AutomationRuntimeInput
