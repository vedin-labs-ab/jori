import { type Infer, v } from "convex/values"
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

// Where a Slack surface message (approval prompt, integration offer) was delivered,
// so later status changes can update that message in place.
export const slackMessageDeliveryValidator = v.object({
  integration: v.literal("slack"),
  integrationId: v.id("integrations"),
  data: v.object({
    channelId: v.string(),
    messageTs: v.string(),
    threadTs: v.optional(v.string()),
  }),
})

/**
 * A resolved tool contract: which tools a run may use per integration, and
 * whether web tools are available. Jobs always carry one; runs
 * without a job may carry their own, and omitting it grants the
 * full tool surface.
 */
export const accessValidator = v.object({
  integrations: v.array(
    v.object({
      id: v.id("integrations"),
      tools: v.array(v.string()),
    })
  ),
  web: v.boolean(),
})

export type Access = Infer<typeof accessValidator>

export function getIntegrationTools(
  access: Access,
  integrationId: Access["integrations"][number]["id"]
) {
  return (
    access.integrations.find((integration) => integration.id === integrationId)
      ?.tools ?? []
  )
}

export function hasIntegrationTools(
  access: Access,
  integrationId: Access["integrations"][number]["id"]
) {
  return getIntegrationTools(access, integrationId).length > 0
}
