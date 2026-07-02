import { replyAddress } from "../../../messages/surface"
import {
  type CommunicationGuidance,
  createCommunicationGuidance,
} from "../../../skills/communication"
import { type RuntimeSkill } from "../../../skills/runtime"
import { type AgentRuntimeInput } from "../input"

export function createCommunicationInstructions(
  input: AgentRuntimeInput,
  skills: readonly RuntimeSkill[],
  options: { activeSurface: boolean }
): CommunicationGuidance | null {
  if (
    !options.activeSurface ||
    input.type !== "message" ||
    replyAddress(input.message) === null
  ) {
    return null
  }

  return createCommunicationGuidance({
    integration: input.messageIntegration,
    profile: "agent-final-reply",
    skills,
  })
}
