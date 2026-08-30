import { type ListFacet } from "../list/controls"

type Owned = { ownerId?: string; ownerName?: string }

const joriOwner = "jori"

/** Owner facet for header-embedded list controls: the owners present in
 *  the listed rows, keyed by their person id — two people sharing a
 *  display name stay separate options — with Jori standing in for rows an
 *  organization-principal run created. */
export function ownerFacet<Row extends Owned>(
  rows: readonly Row[]
): ListFacet<Row> {
  const labels = new Map<string, string>()

  for (const row of rows) {
    labels.set(resolveOwner(row), ownerLabel(row))
  }

  const options = [...labels]
    .map(([value, label]) => ({ label, value }))
    .sort((left, right) => left.label.localeCompare(right.label))

  return {
    label: "Owner",
    options,
    resolve: resolveOwner,
  }
}

function resolveOwner(row: Owned) {
  return row.ownerId ?? joriOwner
}

function ownerLabel(row: Owned) {
  if (row.ownerId === undefined) {
    return "Jori"
  }

  return row.ownerName ?? "Member"
}
