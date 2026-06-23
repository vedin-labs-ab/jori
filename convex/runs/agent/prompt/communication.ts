import { replyAddress } from "../../../messages/surface"
import {
  type CommunicationGuidance,
  createCommunicationGuidance,
} from "../../../skills/communication"
import { type AgentRuntimeInput } from "../input"

export function createCommunicationInstructions(
  input: AgentRuntimeInput
): CommunicationGuidance | null {
  if (input.type !== "message" || replyAddress(input.message) === null) {
    return null
  }

  return createCommunicationGuidance({
    integration: input.messageIntegration,
    profile: "agent-final-reply",
  })
}
