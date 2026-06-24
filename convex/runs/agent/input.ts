import { type Doc } from "../../_generated/dataModel"
import { type RecentConversation } from "../../messages/history"

export type MessageIntegration = "github" | "linear" | "slack"
export type RuntimeIntegration = Doc<"integrations">

export type MessageRuntimeInput = {
  type: "message"
  messageIntegration: MessageIntegration
  run: Doc<"runs">
  integration: RuntimeIntegration
  integrations: RuntimeIntegration[]
  message: Doc<"messages">
  conversation: RecentConversation
}

export type AutomationRuntimeInput = {
  type: "automation"
  run: Doc<"runs">
  integration: RuntimeIntegration | null
  integrations: RuntimeIntegration[]
  automation: Doc<"automations">
  event: Doc<"events"> | null
}

export type InstructionRuntimeInput = {
  type: "instruction"
  run: Doc<"runs">
  integrations: RuntimeIntegration[]
  instructions: string
}

export type AgentRuntimeInput =
  | AutomationRuntimeInput
  | InstructionRuntimeInput
  | MessageRuntimeInput
