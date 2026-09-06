import { replyAddress } from "../../../messages/targets"
import {
  type CommunicationInstructions,
  createCommunicationGuidance,
} from "../../../skills/communication"
import { type RuntimeSkill } from "../../../skills/runtime"
import { type AgentRuntimeInput } from "../input"

export function createCommunicationInstructions(
  input: AgentRuntimeInput,
  skills: readonly RuntimeSkill[],
  options: { activeSurface: boolean }
): CommunicationInstructions | null {
  if (
    !options.activeSurface ||
    input.type !== "message" ||
    replyAddress(input.message) === null
  ) {
    return null
  }

  return createCommunicationGuidance({ surface: input.surface, skills })
}
