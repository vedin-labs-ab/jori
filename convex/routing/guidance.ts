import { integrationLabels } from "../shared/integrations"
import { createCommunicationGuidance } from "../skills/communication"
import { getRuntimeSkillForIntegration } from "../skills/runtime"
import { type MessageRoutingContext } from "./context"

export function createRoutingGuidance(context: MessageRoutingContext) {
  const skill = getRuntimeSkillForIntegration(context.integration)

  if (skill === null) {
    return null
  }

  return createCommunicationGuidance({
    contract: "routing-message-text",
    destination: integrationLabels[context.integration],
    skill,
  })
}
