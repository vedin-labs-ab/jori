import { type ReactNode } from "react"
import { type ColumnTier } from "../../list/controls"
import { absoluteTime, relativeTime } from "../../time"
import { VisibilityLabel } from "../../visibility/badge"
import { type VisibilitySubject } from "../../visibility/summary"
import { type MaterialColumn } from "../list"
import { summaryOwner } from "../owners"
import { MaterialFolderCell } from "./folder"
import {
  type MaterialOwner,
  MaterialOwnerCell,
  ownerColumnClassName,
} from "./owner"

// The columns a kind of material list is built from. Tables and stores
// share the whole set; a job list picks the folder, owner, and time
// columns and adds its own.

/** A sortable column holding one figure about the row. */
export function measureColumn<Row>(
  label: string,
  sortKey: string,
  cell: (row: Row) => ReactNode,
  tier: ColumnTier
): MaterialColumn<Row> {
  return { cell, head: { sortKey }, label, tier }
}

/** Who the row belongs to, with the owner facet on its head. */
export function ownerColumn<Row>(
  owner: (row: Row) => MaterialOwner,
  tier: ColumnTier
): MaterialColumn<Row> {
  return {
    cell: (row) => <MaterialOwnerCell owner={owner(row)} />,
    className: ownerColumnClassName,
    head: { facets: ["owner"] },
    label: "Owner",
    tier,
  }
}

/** A sortable moment, told relative to now with the absolute time on
 *  hover; a row without one shows a quiet dash. */
export function timeColumn<Row>(
  label: string,
  sortKey: string,
  at: (row: Row) => number | undefined,
  tier: ColumnTier
): MaterialColumn<Row> {
  return {
    // A created row can arrive between the list clock’s ticks.
    cell: (row, context) =>
      timeCell(at(row), Math.max(context.now, Date.now())),
    head: { sortKey },
    label,
    tier,
  }
}

function timeCell(at: number | undefined, now: number) {
  if (at === undefined) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <span className="text-muted-foreground" title={absoluteTime(at)}>
      {relativeTime(at, now)}
    </span>
  )
}

type MaterialSummaryRow = {
  createdAt: number
  folderId?: string
  ownerImage?: string
  ownerName?: string
  updatedAt: number
}

/** The columns every table and store list shows after its own measures:
 *  the folder, when it was made, whose it is, and when it last changed.
 *  When it last changed is the one every list keeps down to a phone; the
 *  rest come back as the list widens, in the order they are worth. */
export function materialColumns<
  Row extends MaterialSummaryRow & VisibilitySubject,
>(measures: MaterialColumn<Row>[]): MaterialColumn<Row>[] {
  return [
    ...measures,
    ...accessColumns<Row>(),
    timeColumn("Created", "created", (row) => row.createdAt, "5xl"),
    ownerColumn(summaryOwner, "4xl"),
    timeColumn("Last Updated", "updated", (row) => row.updatedAt, "sm"),
  ]
}

/** Location establishes the baseline; Audience shows only this item's own
 * restriction. Keep the pair together at every resource-list breakpoint. */
export function accessColumns<
  Row extends VisibilitySubject,
>(): MaterialColumn<Row>[] {
  return [
    {
      cell: (row, context) => (
        <MaterialFolderCell folderId={row.folderId} folders={context.folders} />
      ),
      head: { facets: ["folder"] },
      label: "Folder",
      tier: "3xl",
    },
    {
      label: "Audience",
      tier: "3xl",
      cell: (row) => (
        <VisibilityLabel
          quietDefault
          visibility={row.visibility}
          folderId={row.folderId}
          ownerId={row.ownerId}
        />
      ),
    },
  ]
}
