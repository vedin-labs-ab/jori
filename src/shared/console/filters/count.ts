/** How many facets sit off their default: one flag per facet. */
export function countActiveFilters(...active: boolean[]) {
  return active.filter(Boolean).length
}
