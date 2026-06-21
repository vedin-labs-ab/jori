import {
  formatRuntimeSkill,
  getRuntimeSkillForIntegration,
} from "../skills/runtime"
import { type MessageRoutingContext } from "./context"

export function createRoutingGuidance(context: MessageRoutingContext) {
  const skill = getRuntimeSkillForIntegration(context.integration)

  if (skill === null) {
    return null
  }

  return ["Surface guidance:", formatRuntimeSkill(skill)].join("\n\n")
}
