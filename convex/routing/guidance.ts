import { createCommunicationGuidance } from "../skills/communication"
import { type MessageRoutingContext } from "./context"

export function createRoutingGuidance(context: MessageRoutingContext) {
  return createCommunicationGuidance({
    integration: context.integration,
    profile: "routing-message",
  })
}
