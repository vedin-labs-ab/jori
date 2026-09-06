import { type Doc } from "../../_generated/dataModel"
import { type WorkstreamContext } from "../../deduction/roster"
import { type RecentConversation } from "../../messages/history"
import { type OrganizationFacts } from "../../organization/facts"
import { type RequesterContext } from "../../persons/profile/context"
import { type PlaceContext } from "../../places/context"
import { type Access, type MessageSurface } from "../../shared/integrations"

export type RuntimeIntegration = Doc<"integrations">

type MessageRuntimeInput = {
  type: "message"
  surface: MessageSurface
  run: Doc<"runs">
  /** The row the message arrived through; null on the console surface. */
  integration: RuntimeIntegration | null
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

type JobRuntimeInput = {
  type: "job"
  access: Access
  instructions: string
  run: Doc<"runs">
  integration: RuntimeIntegration | null
  integrations: RuntimeIntegration[]
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
  | JobRuntimeInput
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

export function requireInputIntegration(
  input: Extract<AgentRuntimeInput, { type: "message" }>
) {
  if (input.integration === null) {
    throw new Error(`The ${input.surface} surface has no integration.`)
  }

  return input.integration
}

export function inputAccess(input: AgentRuntimeInput): Access | undefined {
  return input.type === "message" ? undefined : input.access
}
