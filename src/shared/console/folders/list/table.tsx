import { Folder, Layers } from "lucide-react"
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
import { CreatedItemRow } from "../../edit/row"
import { type Edit } from "../../edit/state"
import {
  columnTier,
  type FacetEntry,
  type ListControls,
  nameColumnClassName,
} from "../../list/controls"
import { ConsoleListTable } from "../../list/frame"
import { FilterHead, SortHead } from "../../list/head"
import { ListRow } from "../../list/pointer/row"
import { type RowSelection } from "../../list/selection"
import { SelectionHeadCell, SelectionRowCell } from "../../list/selection/bar"
import { MaterialMeasureCell } from "../../materials/cells/measure"
import {
  MaterialOwnerCell,
  ownerColumnClassName,
} from "../../materials/cells/owner"
import { materialOwner } from "../../materials/owners"
import { ConsoleLink } from "../../shell/link"
import { absoluteTime, relativeTime, useNow } from "../../time"
import {
  VisibilityCell,
  VisibilityHead,
  VisibilityNameMark,
} from "../../visibility/table"
import { type DragPayload } from "../drag/plan"
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
 *  taller than its neighbors. Each column names the width it is worth,
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
    <ConsoleListTable className="[&_td]:h-10" selection={selection}>
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
            className={cn(columnTier.lg, ownerColumnClassName)}
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
            className={columnTier.sm}
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

/** One folder row, wherever folders list: it opens the folder's page
 *  and drags by its name like a sidebar row, and a selected row takes the
 *  rest of the selection with it. Folder icons are independent of contents, and the
 *  Owner cell shows whoever made it. */
export function FolderListRow({
  folder,
  onDialog,
  selected,
  selection,
  selectionMenu,
}: {
  folder: ListedFolder
  onDialog: (request: FolderDialogRequest) => void
  /** The selection, as a drag would carry it. */
  selected: DragPayload
  selection: RowSelection<FolderListEntry>
  selectionMenu: ReactNode
}) {
  const drag = useFolderRowDrag(
    "contents",
    { folderId: folder.folderId, name: folder.name },
    selected
  )

  return (
    <ListRow<FolderListEntry>
      drag={drag}
      row={folder}
      selection={selection}
      selectionMenu={selectionMenu}
    >
      <SelectionRowCell
        label={`Select ${folder.name}`}
        row={folder}
        selection={selection}
      />
      <TableCell data-row-link className={nameColumnClassName}>
        <FolderName folder={folder} surface="contents">
          <ConsoleLink
            className={nameLinkClassName}
            draggable={false}
            params={{ folderId: folder.folderId }}
            title={folder.name}
            to="/folders/$folderId"
          >
            <Folder className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{folder.name}</span>
            <VisibilityNameMark
              visibility={folder.visibility}
              folderId={folder.parentId}
              ownerId={folder.createdBy}
            />
          </ConsoleLink>
        </FolderName>
      </TableCell>
      <FolderCells folder={folder} />
      <TableCell className="text-right">
        <FolderRowMenu folder={folder} onDialog={onDialog} />
      </TableCell>
    </ListRow>
  )
}

export function CreatedFolderRow({
  edit,
  folder,
}: {
  edit: Edit
  folder: ListedFolder | undefined
}) {
  return (
    <CreatedItemRow edit={edit}>
      <FolderCells folder={folder} parentId={edit.item.parentId} inert />
    </CreatedItemRow>
  )
}

function FolderCells({
  folder,
  parentId,
  inert,
}: {
  folder: ListedFolder | undefined
  parentId?: string
  inert?: boolean
}) {
  const now = useNow(30_000)
  return (
    <>
      <VisibilityCell
        visibility={folder?.visibility ?? { mode: "organization" }}
        inert={inert}
        folderId={folder?.parentId ?? parentId}
        ownerId={folder?.createdBy}
      />
      <TableCell className={cn("text-muted-foreground", columnTier.xl)}>
        Folder
      </TableCell>
      <TableCell
        className={cn(columnTier.lg, ownerColumnClassName)}
        inert={inert}
      >
        {folder ? <MaterialOwnerCell owner={materialOwner(folder)} /> : "—"}
      </TableCell>
      {folder ? (
        <ItemsCell folder={folder} />
      ) : (
        <TableCell className={columnTier["2xl"]}>—</TableCell>
      )}
      <TableCell
        className={cn("text-muted-foreground", columnTier.sm)}
        title={folder ? absoluteTime(folder.updatedAt) : undefined}
      >
        {folder ? relativeTime(Math.min(folder.updatedAt, now), now) : "—"}
      </TableCell>
    </>
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
