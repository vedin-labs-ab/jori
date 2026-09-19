import { type Infer, v } from "convex/values"
import {
  integrations,
  messageIntegrations,
  messageSurfaces,
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
  isMessageSurface,
  isMicrosoftIntegration,
  isUserScopedIntegration,
  type MessageIntegration,
  type MessageSurface,
  messageIntegrations,
  messageSurfaceLabel,
  messageSurfaces,
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

export const messageSurfaceValidator = v.union(
  ...messageSurfaces.map((surface) => v.literal(surface))
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
 * which of Jori's own. Core tools need no grant. Jobs always carry one; runs
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
  jori: v.array(v.string()),
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

/** Whether a contract grants nothing its ceiling lacks. */
export function isAccessWithin(access: Access, ceiling: Access) {
  return (
    access.jori.every((tool) => ceiling.jori.includes(tool)) &&
    access.integrations.every((entry) => {
      const held = getIntegrationTools(ceiling, entry.id)

      return entry.tools.every((tool) => held.includes(tool))
    })
  )
}

export function hasIntegrationTools(
  access: Access,
  integrationId: Access["integrations"][number]["id"]
) {
  return getIntegrationTools(access, integrationId).length > 0
}
