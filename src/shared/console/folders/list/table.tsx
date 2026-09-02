import { Layers } from "lucide-react"
import { type ReactNode } from "react"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { countLabel } from "../../count"
import { type FacetEntry, type ListControls } from "../../list/controls"
import { ConsoleListTable } from "../../list/frame"
import { FilterHead, SortHead } from "../../list/head"
import { MaterialMeasureCell } from "../../materials/cells/measure"
import { MaterialOwnerCell } from "../../materials/cells/owner"
import { folderIcon } from "../../materials/folders"
import { materialOwner } from "../../materials/owners"
import { ConsoleLink } from "../../shell/link"
import { absoluteTime, relativeTime, useNow } from "../../time"
import { useFolderRowDrag } from "../drag/state"
import { FolderRowMenu } from "../menu"
import { type FolderDialogRequest, type ListedFolder } from "../types"
import { nameLinkClassName, rowDragClasses } from "./style"

/** The full-bleed table both folder surfaces share: the /folders overview
 *  lists the root folders, a folder's page its contents. Identity columns
 *  lead — what a row is, and whose it is — the measures follow, and the
 *  last column carries every row's own menu. Cells hold a fixed height so
 *  the menu button cannot make one row taller than its neighbours. */
export function FolderListTable({
  children,
  controls,
  kinds,
  owners,
}: {
  children: ReactNode
  controls: ListControls
  kinds: FacetEntry[]
  owners: FacetEntry[]
}) {
  return (
    <ConsoleListTable className="[&_td]:h-10">
      <TableHeader>
        <TableRow>
          <SortHead controls={controls} label="Name" sortKey="name" />
          <FilterHead controls={controls} facets={kinds} label="Kind" />
          <FilterHead controls={controls} facets={owners} label="Owner" />
          <SortHead controls={controls} label="Items" sortKey="items" />
          <SortHead controls={controls} label="Updated" sortKey="updated" />
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </ConsoleListTable>
  )
}

/** One folder row, wherever folders list: it links to the folder's page
 *  and drags like a sidebar row. A dotted icon marks a folder holding
 *  anything, matching the sidebar tree's cue, and the Owner cell shows
 *  whoever made it. */
export function FolderListRow({
  folder,
  onDialog,
}: {
  folder: ListedFolder
  onDialog: (request: FolderDialogRequest) => void
}) {
  const drag = useFolderRowDrag("contents", folder.folderId, folder.name)
  const now = useNow(30_000)
  const FolderIcon = folderIcon(folder.hasContents)

  return (
    <TableRow
      {...drag.attributes}
      {...drag.listeners}
      className={rowDragClasses(drag)}
      onClickCapture={drag.onClickCapture}
      onPointerDownCapture={drag.onPointerDownCapture}
      ref={drag.setNodeRef}
    >
      <TableCell>
        <ConsoleLink
          className={nameLinkClassName}
          draggable={false}
          params={{ folderId: folder.folderId }}
          title={folder.name}
          to="/folders/$folderId"
        >
          <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{folder.name}</span>
        </ConsoleLink>
      </TableCell>
      <TableCell className="text-muted-foreground">Folder</TableCell>
      <TableCell>
        <MaterialOwnerCell owner={materialOwner(folder)} />
      </TableCell>
      <ItemsCell folder={folder} />
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(folder.updatedAt)}
      >
        {relativeTime(folder.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">
        <FolderRowMenu folder={folder} onDialog={onDialog} />
      </TableCell>
    </TableRow>
  )
}

/** Items column: one combined number — how many things a click would reveal,
 *  direct subfolders plus the filed resources this viewer can see — with the
 *  breakdown in the tooltip. */
function ItemsCell({ folder }: { folder: ListedFolder }) {
  const label = itemsLabel(folder)

  return (
    <TableCell>
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
