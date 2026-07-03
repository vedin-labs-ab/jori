import { type Doc } from "../../_generated/dataModel"
import { type RecentActivity } from "../../conversations/recency"
import { type WorkstreamContext } from "../../deduction/roster"
import { type RecentConversation } from "../../messages/history"
import { type OrganizationFacts } from "../../organization/facts"

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
  recency: RecentActivity[]
  organization: OrganizationFacts | null
  workstreams: WorkstreamContext[] | null
}

export type AutomationRuntimeInput = {
  type: "automation"
  run: Doc<"runs">
  integration: RuntimeIntegration | null
  integrations: RuntimeIntegration[]
  automation: Doc<"automations">
  event: Doc<"events"> | null
  organization: OrganizationFacts | null
  workstreams: WorkstreamContext[] | null
}

export type InstructionRuntimeInput = {
  type: "instruction"
  run: Doc<"runs">
  integrations: RuntimeIntegration[]
  instructions: string
  organization: OrganizationFacts | null
  workstreams: WorkstreamContext[] | null
}

export type AgentRuntimeInput =
  | AutomationRuntimeInput
  | InstructionRuntimeInput
  | MessageRuntimeInput
