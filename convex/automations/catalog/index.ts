import { availableAutomationEventCatalog } from "./available"
import { pendingAutomationEventCatalog } from "./pending"
import { type AutomationEventProviderDefinition } from "./types"

export { automationEventOptionSources } from "./types"

export const automationEventCatalog = [
  ...availableAutomationEventCatalog,
  ...pendingAutomationEventCatalog,
] as const satisfies readonly AutomationEventProviderDefinition[]
