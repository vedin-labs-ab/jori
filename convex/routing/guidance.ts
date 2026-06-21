import { createCommunicationGuidance } from "../skills/communication"
import { createRoutingCapabilityGuidance } from "./capabilities"
import { type MessageRoutingContext } from "./context"

export function createRoutingGuidance(context: MessageRoutingContext) {
  const parts = [
    createRoutingCapabilityGuidance(context.capabilitySummary),
    createCommunicationGuidance({
      integration: context.integration,
      profile: "routing-message",
    }),
  ].filter(isPresent)

  return parts.length === 0 ? null : parts.join("\n\n")
}

function isPresent<T>(value: T | null): value is T {
  return value !== null
}
