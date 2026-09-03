import { type ListFacet } from "../list/controls"
import { type MaterialOwner } from "./cells/owner"

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

/** How an owned row shows in an Owner cell, by the same rule the facet
 *  labels it with — so filtering to an option keeps exactly the rows whose
 *  cell reads that way. A row no person owns is Jori's own work. */
export function materialOwner(
  row: Owned & { ownerImage?: string }
): MaterialOwner {
  if (row.ownerId === undefined) {
    return { kind: "jori" }
  }

  return { kind: "person", name: ownerLabel(row), image: row.ownerImage }
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

/** How a table or store summary shows in an Owner cell: the person the
 *  query resolved, or Jori when it resolved none. Keyed by the resolved
 *  name rather than the id, so a summary whose owner did not resolve
 *  reads as Jori's own. */
export function summaryOwner(row: {
  ownerImage?: string
  ownerName?: string
}): MaterialOwner {
  if (row.ownerName === undefined) {
    return { kind: "jori" }
  }

  return { kind: "person", name: row.ownerName, image: row.ownerImage }
}

/** How a file shows in an Owner cell: the uploading person for uploads;
 *  Jori itself for files an agent run saved. */
export function fileOwner(file: {
  ownerImage?: string
  ownerName?: string
  source: "run" | "upload"
}): MaterialOwner {
  if (file.source === "run") {
    return { kind: "jori" }
  }

  return {
    kind: "person",
    name: file.ownerName ?? "Member",
    image: file.ownerImage,
  }
}
