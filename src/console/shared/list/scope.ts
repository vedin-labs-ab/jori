import { type Scope, scopeLabels } from "@contracts/permissions/scope"

export const scopeFilterOptions = [
  { label: "All", value: "all" },
  { label: scopeLabels.organization, value: "organization" },
  { label: scopeLabels.personal, value: "personal" },
] as const

export type ScopeFilter = (typeof scopeFilterOptions)[number]["value"]

export function matchesScopeFilter(scope: Scope, filter: ScopeFilter) {
  return filter === "all" || scope === filter
}
