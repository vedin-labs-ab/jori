import {
  replyAddress,
  supportsSurfaceReaction,
} from "../../../messages/surface"
import {
  type CommunicationGuidance,
  createCommunicationGuidance,
} from "../../../skills/communication"
import { type RuntimeSkill } from "../../../skills/runtime"
import { type AgentRuntimeInput } from "../input"

export function createCommunicationInstructions(
  input: AgentRuntimeInput,
  skills: readonly RuntimeSkill[]
): CommunicationGuidance | null {
  if (input.type !== "message" || replyAddress(input.message) === null) {
    return null
  }

  return createCommunicationGuidance({
    integration: input.messageIntegration,
    profile: "agent-final-reply",
    reactions: supportsSurfaceReaction(input.messageIntegration),
    skills,
  })
}
