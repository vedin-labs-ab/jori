import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"
import { type CountedNoun } from "../../count"
import { type EditItem, type EditKind } from "../../edit/state"
import { type ResourceDragItem } from "../../folders/drag/plan"
import {
  type ColumnTier,
  type ListConfig,
  type ListControls,
} from "../../list/controls"
import { type RowSelection } from "../../list/selection"
import { type SelectionActions } from "../../list/selection/bar"
import { type FolderNames } from "../folders"

export type MaterialListRow = { name: string }

/** What a cell may read besides its row: the organization's folder names,
 *  and the clock relative times are told against. */
export type MaterialCellContext = {
  folders: FolderNames | undefined
  now: number
}

/** One column between Name and the menu. Its head sorts the list, opens
 *  the named facets, or — left plain — only labels the column. The tier
 *  says how wide the list must be before the column earns its place. */
export type MaterialColumn<Row> = {
  cell: (row: Row, context: MaterialCellContext) => ReactNode
  className?: string
  head?: { facets: readonly string[] } | { sortKey: string }
  label: string
  tier: ColumnTier
  title?: (row: Row) => string
}

/** One way the page starts something new, its header button again: the
 *  empty state offers it, and so does a right-click on the list's
 *  background. */
export type MaterialCreate = {
  icon: LucideIcon
  label: string
  onSelect: () => void
}

/** What tells one material list from another. */
export type MaterialListKind<Row> = {
  /** A row still being named, for the kinds that are made in place. */
  createdRow?: (item: EditItem) => Row | undefined
  columns: readonly MaterialColumn<Row>[]
  /** The page's create actions, the primary one first. */
  creates: readonly MaterialCreate[]
  description: string
  /** The row as a drag carries it. */
  drag: (row: Row) => ResourceDragItem
  /** What a row is, to the session that renames it in place. Left out by
   *  a kind that is edited whole, as a job is. */
  editKind?: Exclude<EditKind, "folder">
  icon: LucideIcon
  identify: (row: Row) => string
  /** The row's menu, trigger and all. */
  menu: (row: Row) => ReactNode
  nameCell: (row: Row) => ReactNode
  noun: CountedNoun
  /** The row's own icon, where the kind alone does not decide it. */
  rowIcon?: (row: Row) => LucideIcon
}

export type MaterialListProps<Row> = {
  config: ListConfig<Row>
  controls: ListControls
  folders: FolderNames | undefined
  hasFilters: boolean
  kind: MaterialListKind<Row>
  rows: Row[]
  selection: RowSelection<Row>
  /** What the dock, and a right-click on several selected rows, offer. */
  selectionActions: SelectionActions
  unauthorizedMessage: string | undefined
}
