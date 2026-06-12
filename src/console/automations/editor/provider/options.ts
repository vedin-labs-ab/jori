import {
  type AutomationEventProvider,
  automationEventCatalog,
} from "../../../../../convex/automations/events"

export type EventProviderConnectionState = {
  providers: Array<{
    connected: boolean
    provider: AutomationEventProvider
  }>
}

export type EventProviderOption = {
  connected: boolean | undefined
  index: number
  provider: AutomationEventProvider
}

export function getProviderOptions(
  connections: EventProviderConnectionState | undefined
): EventProviderOption[] {
  const connectedProviders = new Map(
    connections?.providers.map((option) => [option.provider, option.connected])
  )

  return automationEventCatalog
    .map((definition, index) => ({
      connected: connectedProviders.get(definition.provider),
      index,
      provider: definition.provider,
    }))
    .sort(
      (left, right) =>
        providerSortRank(left) - providerSortRank(right) ||
        left.index - right.index
    )
}

function providerSortRank(option: EventProviderOption) {
  if (option.connected === true) {
    return 0
  }

  return option.connected === undefined ? 1 : 2
}
