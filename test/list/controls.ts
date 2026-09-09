import { type ListControls } from "../../src/shared/console/list/controls"

export function listControls(
  overrides: Partial<ListControls> = {}
): ListControls {
  return {
    getFacet: () => undefined,
    hasActiveControls: false,
    isFacetActive: () => false,
    setFacet: () => undefined,
    sort: undefined,
    toggleSort: () => undefined,
    ...overrides,
  }
}
