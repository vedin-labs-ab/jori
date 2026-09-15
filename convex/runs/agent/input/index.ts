import { type Doc } from "../../../_generated/dataModel"
import { type RecentConversation } from "../../../conversations/history/index"
import { type OrganizationFacts } from "../../../organization/facts"
import { type RequesterContext } from "../../../persons/profile/context"
import { type PlaceContext } from "../../../places/context"
import { type Access, type MessageSurface } from "../../../shared/integrations"

export type RuntimeIntegration = Doc<"integrations">

type RuntimeInputContext = {
  run: Doc<"runs">
  integrations: RuntimeIntegration[]
  organization: OrganizationFacts | null
  requester: RequesterContext | null
  /** The requester's IANA zone, when known; drives the prompt's local time. */
  timezone: string | null
}

type MessageRuntimeInput = RuntimeInputContext & {
  type: "message"
  surface: MessageSurface
  /** The row the message arrived through; null on the console surface. */
  integration: RuntimeIntegration | null
  message: Doc<"messages">
  conversation: RecentConversation
  place: PlaceContext | null
}

type JobRuntimeInput = RuntimeInputContext & {
  type: "job"
  access: Access
  instructions: string
  integration: RuntimeIntegration | null
  event: Doc<"events"> | null
}

export type InstructionRuntimeInput = RuntimeInputContext & {
  type: "instruction"
  instructions: string
  access?: Access
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
