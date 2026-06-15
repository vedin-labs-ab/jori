import {
  type AutomationEventIntegration,
  automationEventCatalog,
} from "@contracts/automations/events"

export type EventIntegrationConnectionState = {
  integrations: Array<{
    connected: boolean
    provider: AutomationEventIntegration
  }>
}

export type EventIntegrationOption = {
  connected: boolean | undefined
  index: number
  provider: AutomationEventIntegration
}

export function getIntegrationOptions(
  connections: EventIntegrationConnectionState | undefined
): EventIntegrationOption[] {
  const connectedIntegrations = new Map(
    connections?.integrations.map((option) => [
      option.provider,
      option.connected,
    ])
  )

  return automationEventCatalog
    .map((definition, index) => ({
      connected: connectedIntegrations.get(definition.provider),
      index,
      provider: definition.provider,
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
