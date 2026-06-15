import { availableAutomationEventCatalog } from "./available"
import { pendingAutomationEventCatalog } from "./pending"
import { type AutomationEventIntegrationDefinition } from "./types"

export { automationEventOptionSources } from "./types"

export const automationEventCatalog = [
  ...availableAutomationEventCatalog,
  ...pendingAutomationEventCatalog,
] as const satisfies readonly AutomationEventIntegrationDefinition[]
