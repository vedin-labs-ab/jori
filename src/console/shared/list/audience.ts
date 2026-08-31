/** Console lists offer one two-way audience facet: what a person keeps to
 *  themselves, and what the whole organization sees. Richer grants live on
 *  each item's own visibility. */
export type ListAudience = "personal" | "organization"

export const audienceFilterOptions = [
  { label: "All", value: "all" },
  { label: "Organization", value: "organization" },
  { label: "Personal", value: "personal" },
] as const

export type AudienceFilter = (typeof audienceFilterOptions)[number]["value"]

export function matchesAudienceFilter(
  audience: ListAudience,
  filter: AudienceFilter
) {
  return filter === "all" || audience === filter
}
