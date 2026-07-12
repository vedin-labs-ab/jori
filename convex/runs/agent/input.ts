import { type Doc } from "../../_generated/dataModel"
import { type WorkstreamContext } from "../../deduction/roster"
import { type RecentConversation } from "../../messages/history"
import { type OrganizationFacts } from "../../organization/facts"
import { type RequesterContext } from "../../persons/profile/context"
import { type PlaceContext } from "../../places/context"
import { type Access, type MessageIntegration } from "../../shared/integrations"

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
  requester: RequesterContext | null
  place: PlaceContext | null
  /** The requester's IANA zone, when known; drives the prompt's local time. */
  timezone: string | null
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
  requester: RequesterContext | null
  timezone: string | null
  workstreams: WorkstreamContext[] | null
}

export type InstructionRuntimeInput = {
  type: "instruction"
  run: Doc<"runs">
  integrations: RuntimeIntegration[]
  instructions: string
  access?: Access
  organization: OrganizationFacts | null
  requester: RequesterContext | null
  timezone: string | null
  workstreams: WorkstreamContext[] | null
}

export type AgentRuntimeInput =
  | AutomationRuntimeInput
  | InstructionRuntimeInput
  | MessageRuntimeInput

export function findRunIntegration(
  input: AgentRuntimeInput,
  surface: RuntimeIntegration["integration"]
) {
  return (
    input.integrations.find(
      (integration) =>
        integration.status === "active" && integration.integration === surface
    ) ?? null
  )
}
