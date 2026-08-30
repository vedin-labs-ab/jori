import { Link } from "@tanstack/react-router"
import { Layers } from "lucide-react"
import { type ReactNode } from "react"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { countLabel } from "@/lib/count"
import { type FacetEntry, type ListControls } from "../../shared/list/controls"
import { ConsoleListTable } from "../../shared/list/frame"
import { FilterHead, SortHead } from "../../shared/list/head"
import { folderIcon } from "../../shared/materials/folders"
import { absoluteTime, relativeTime, useNow } from "../../shared/time"
import { useFolderRowDrag } from "../drag/state"
import { type ListedFolder } from "../types"
import { nameLinkClassName, rowDragClasses } from "./style"

/** The full-bleed Name/Kind/Items/Updated table both folder surfaces share:
 *  the /folders overview lists the root folders, a folder's page its
 *  contents. Cells carry a fixed height because rows differ in tallest
 *  content — a resource row's menu button outgrows a folder row's bare
 *  link — and mixed row heights read as a glitch. */
export function FolderListTable({
  children,
  controls,
  kinds,
}: {
  children: ReactNode
  controls: ListControls
  kinds: FacetEntry[]
}) {
  return (
    <ConsoleListTable className="[&_td]:h-10">
      <TableHeader>
        <TableRow>
          <SortHead controls={controls} label="Name" sortKey="name" />
          <FilterHead controls={controls} facets={kinds} label="Kind" />
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
 *  anything, matching the sidebar tree's cue. */
export function FolderListRow({ folder }: { folder: ListedFolder }) {
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
        <Link
          className={nameLinkClassName}
          draggable={false}
          params={{ folderId: folder.folderId }}
          title={folder.name}
          to="/folders/$folderId"
        >
          <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{folder.name}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">Folder</TableCell>
      <ItemsCell folder={folder} />
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(folder.updatedAt)}
      >
        {relativeTime(folder.updatedAt, now)}
      </TableCell>
      <TableCell />
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
      <div
        className="flex items-center gap-1.5 text-muted-foreground tabular-nums"
        title={label}
      >
        <Layers aria-hidden className="size-4 shrink-0" />
        {folder.folderCount + folder.resourceCount}
        <span className="sr-only">{label}</span>
      </div>
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
