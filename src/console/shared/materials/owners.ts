import { type ListFacet } from "../list/controls"

/** Owner facet for header-embedded list controls: the owners present in
 *  the listed rows by display name, with Jori standing in for rows an
 *  organization-principal run created. */
export function ownerFacet<Row extends { ownerName?: string }>(
  rows: readonly Row[]
): ListFacet<Row> {
  const names = [...new Set(rows.map(resolveOwner))].sort((left, right) =>
    left.localeCompare(right)
  )

  return {
    label: "Owner",
    options: names.map((name) => ({ label: name, value: name })),
    resolve: resolveOwner,
  }
}

function resolveOwner(row: { ownerName?: string }) {
  return row.ownerName ?? "Jori"
}
