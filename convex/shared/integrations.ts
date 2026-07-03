import { v } from "convex/values"
import { integrations, toolSurfaces } from "../../contracts/integrations"

export {
  type Integration,
  integrationLabel,
  integrationLabels,
  integrationProviders,
  integrations,
  isGoogleIntegration,
  isMicrosoftIntegration,
  isUserScopedIntegration,
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
