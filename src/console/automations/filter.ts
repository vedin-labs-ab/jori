import { type Automation, type AutomationFilter } from "./types"

export function hasAutomationFilters(query: string, filter: AutomationFilter) {
  return query.trim() !== "" || filter !== "active"
}

export function filterAutomationsByView(
  automations: Automation[],
  filter: AutomationFilter
) {
  if (filter === "all") {
    return automations
  }

  return automations.filter((automation) => automation.status === filter)
}
