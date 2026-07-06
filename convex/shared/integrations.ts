import { v } from "convex/values"
import {
  integrations,
  messageIntegrations,
  toolSurfaces,
} from "../../contracts/integrations"

export {
  type Integration,
  integrationLabel,
  integrationLabels,
  integrationProviders,
  integrations,
  isGoogleIntegration,
  isMessageIntegration,
  isMicrosoftIntegration,
  isUserScopedIntegration,
  type MessageIntegration,
  messageIntegrations,
  providerForIntegration,
  type ToolSurface,
  toolSurfaceLabel,
  toolSurfaces,
} from "../../contracts/integrations"

export const integrationValidator = v.union(
  ...integrations.map((integration) => v.literal(integration))
)

export const toolSurfaceValidator = v.union(
  ...toolSurfaces.map((surface) => v.literal(surface))
)

export const messageIntegrationValidator = v.union(
  ...messageIntegrations.map((integration) => v.literal(integration))
)

// Where a surface message (approval prompt, integration offer) was delivered,
// so later status changes can update that message in place.
export const messageDeliveryValidator = v.union(
  v.object({
    integration: v.literal("slack"),
    integrationId: v.id("integrations"),
    data: v.object({
      channelId: v.string(),
      messageTs: v.string(),
      threadTs: v.optional(v.string()),
    }),
  })
)
