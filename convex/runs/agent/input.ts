import { type Doc } from "../../_generated/dataModel"
import { type WorkstreamContext } from "../../deduction/roster"
import { type RecentConversation } from "../../messages/history"
import { type OrganizationFacts } from "../../organization/facts"
import { type PlaceContext } from "../../places/context"
import { type MessageIntegration } from "../../shared/integrations"

export type RuntimeIntegration = Doc<"integrations">

export type MessageRuntimeInput = {
  type: "message"
  messageIntegration: MessageIntegration
  run: Doc<"runs">
  integration: RuntimeIntegration
  integrations: RuntimeIntegration[]
  message: Doc<"messages">
  conversation: RecentConversation
  organization: OrganizationFacts | null
  place: PlaceContext | null
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
