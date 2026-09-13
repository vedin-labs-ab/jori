import { Layers } from "lucide-react"
import { type ReactNode } from "react"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { countLabel } from "../../count"
import { SelectionHeadCell, SelectionRowCell } from "../../list/bar"
import {
  columnTier,
  type FacetEntry,
  type ListControls,
} from "../../list/controls"
import { ConsoleListTable } from "../../list/frame"
import { FilterHead, SortHead } from "../../list/head"
import { type RowSelection } from "../../list/selection"
import { MaterialMeasureCell } from "../../materials/cells/measure"
import { MaterialOwnerCell } from "../../materials/cells/owner"
import { folderIcon } from "../../materials/folders"
import { materialOwner } from "../../materials/owners"
import { ConsoleLink } from "../../shell/link"
import { absoluteTime, relativeTime, useNow } from "../../time"
import {
  VisibilityCell,
  VisibilityHead,
  VisibilityNameMark,
} from "../../visibility/table"
import { type DragPayload } from "../drag/plan"
import { DraggableTableRow } from "../drag/row"
import { useFolderRowDrag } from "../drag/state"
import { FolderName } from "../edit/name"
import { FolderRowMenu } from "../menu"
import { type FolderDialogRequest, type ListedFolder } from "../types"
import { type FolderListEntry } from "./controls"
import { nameLinkClassName } from "./style"

/** How many columns the table spans, for a row that stands in for all. */
export const folderTableColumns = 8

/** The full-bleed table both folder surfaces share: the /folders overview
 *  lists the root folders, a folder's page its contents. The selection
 *  column leads, then identity — what a row is, and whose it is — the
 *  measures follow, and the last column carries every row's own menu.
 *  Cells hold a fixed height so the menu button cannot make one row
 *  taller than its neighbours. Each column names the width it is worth,
 *  head and cells alike: a narrow box keeps the name and when it last
 *  changed, and the rest return as the list widens. Kind goes first —
 *  the row's own icon already says what it is. */
export function FolderListTable({
  children,
  controls,
  kinds,
  owners,
  selection,
}: {
  children: ReactNode
  controls: ListControls
  kinds: FacetEntry[]
  owners: FacetEntry[]
  selection: RowSelection<FolderListEntry>
}) {
  return (
    <ConsoleListTable className="[&_td]:h-10">
      <TableHeader>
        <TableRow>
          <SelectionHeadCell selection={selection} />
          <SortHead controls={controls} label="Name" sortKey="name" />
          <VisibilityHead />
          <FilterHead
            className={columnTier.xl}
            controls={controls}
            facets={kinds}
            label="Kind"
          />
          <FilterHead
            className={columnTier.lg}
            controls={controls}
            facets={owners}
            label="Owner"
          />
          <SortHead
            className={columnTier["2xl"]}
            controls={controls}
            label="Items"
            sortKey="items"
          />
          <SortHead
            className={columnTier.xs}
            controls={controls}
            label="Updated"
            sortKey="updated"
          />
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </ConsoleListTable>
  )
}

/** One folder row, wherever folders list: it links to the folder's page
 *  and drags like a sidebar row, and a selected row takes the rest of the
 *  selection — folders and resources alike — with it. A dotted icon marks
 *  a folder holding anything, matching the sidebar tree's cue, and the
 *  Owner cell shows whoever made it. */
export function FolderListRow({
  folder,
  onDialog,
  selected,
  selection,
}: {
  folder: ListedFolder
  onDialog: (request: FolderDialogRequest) => void
  /** The selection, as a drag would carry it. */
  selected: DragPayload
  selection: RowSelection<FolderListEntry>
}) {
  const drag = useFolderRowDrag(
    "contents",
    { folderId: folder.folderId, name: folder.name },
    selected
  )
  const now = useNow(30_000)
  const FolderIcon = folderIcon(folder.hasContents)

  return (
    <DraggableTableRow
      data-state={selection.isSelected(folder) ? "selected" : undefined}
      drag={drag}
    >
      <SelectionRowCell
        label={`Select ${folder.name}`}
        row={folder}
        selection={selection}
      />
      <TableCell data-row-link>
        <FolderName folder={folder} surface="contents">
          <ConsoleLink
            className={nameLinkClassName}
            draggable={false}
            params={{ folderId: folder.folderId }}
            title={folder.name}
            to="/folders/$folderId"
          >
            <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{folder.name}</span>
            <VisibilityNameMark
              visibility={folder.visibility}
              folderId={folder.parentId}
              ownerId={folder.createdBy}
            />
          </ConsoleLink>
        </FolderName>
      </TableCell>
      <VisibilityCell
        visibility={folder.visibility}
        folderId={folder.parentId}
        ownerId={folder.createdBy}
      />
      <TableCell className={cn("text-muted-foreground", columnTier.xl)}>
        Folder
      </TableCell>
      <TableCell className={columnTier.lg}>
        <MaterialOwnerCell owner={materialOwner(folder)} />
      </TableCell>
      <ItemsCell folder={folder} />
      <TableCell
        className={cn("text-muted-foreground", columnTier.xs)}
        title={absoluteTime(folder.updatedAt)}
      >
        {relativeTime(folder.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">
        <FolderRowMenu folder={folder} onDialog={onDialog} />
      </TableCell>
    </DraggableTableRow>
  )
}

/** Items column: one combined number — how many things a click would reveal,
 *  direct subfolders plus the filed resources this viewer can see — with the
 *  breakdown in the tooltip. */
function ItemsCell({ folder }: { folder: ListedFolder }) {
  const label = itemsLabel(folder)

  return (
    <TableCell className={columnTier["2xl"]}>
      <MaterialMeasureCell
        className="tabular-nums"
        icon={Layers}
        label={label}
        value={folder.folderCount + folder.resourceCount}
      />
    </TableCell>
  )
}

function itemsLabel(folder: ListedFolder) {
  const parts = [
    folder.folderCount > 0 ? countLabel(folder.folderCount, "folder") : null,
    folder.resourceCount > 0
      ? countLabel(folder.resourceCount, "resource")
      : null,
  ].filter((part) => part !== null)

  return parts.length === 0 ? "Empty folder" : parts.join(", ")
}
