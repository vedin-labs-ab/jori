import { type Scope, scopeLabels } from "@contracts/permissions/scope"
import { type ListFacet } from "./controls"

/** Sharing facet for header-embedded list controls, defaulting to every
 *  scope. */
export const scopeFacet: ListFacet<{ scope: Scope }> = {
  label: "Sharing",
  options: [
    { label: scopeLabels.organization, value: "organization" },
    { label: scopeLabels.personal, value: "personal" },
  ],
  resolve: (row) => row.scope,
}

export const scopeFilterOptions = [
  { label: "All", value: "all" },
  { label: scopeLabels.organization, value: "organization" },
  { label: scopeLabels.personal, value: "personal" },
] as const

export type ScopeFilter = (typeof scopeFilterOptions)[number]["value"]

export function matchesScopeFilter(scope: Scope, filter: ScopeFilter) {
  return filter === "all" || scope === filter
}
