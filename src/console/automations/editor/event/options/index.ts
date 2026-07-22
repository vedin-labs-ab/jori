import {
  type AutomationEventIntegration,
  automationEventCatalog,
} from "@contracts/automations/events"

type EventIntegrationConnectionState = {
  integrations: Array<{
    connected: boolean
    integration: AutomationEventIntegration
  }>
}

export type EventIntegrationOption = {
  connected: boolean | undefined
  index: number
  integration: AutomationEventIntegration
}

export function getIntegrationOptions(
  connections: EventIntegrationConnectionState | undefined
): EventIntegrationOption[] {
  const connectedIntegrations = new Map(
    connections?.integrations.map((option) => [
      option.integration,
      option.connected,
    ])
  )

  return automationEventCatalog
    .map((definition, index) => ({
      connected: connectedIntegrations.get(definition.integration),
      index,
      integration: definition.integration,
    }))
    .sort(
      (left, right) =>
        integrationSortRank(left) - integrationSortRank(right) ||
        left.index - right.index
    )
}

function integrationSortRank(option: EventIntegrationOption) {
  if (option.connected === true) {
    return 0
  }

  return option.connected === undefined ? 1 : 2
}
