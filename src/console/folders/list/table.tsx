import { Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConsoleListTable } from "../../shared/list/frame"
import { absoluteTime, relativeTime, useNow } from "../../shared/time"
import { useFolderRowDrag } from "../drag/state"
import { folderIcon, type ListedFolder } from "../types"
import { nameLinkClassName, rowDragClasses } from "./style"

/** The full-bleed Name/Kind/Updated table both folder surfaces share: the
 *  /folders overview lists the root folders, a folder's page its contents.
 *  Cells carry a fixed height because rows differ in tallest content — a
 *  resource row's menu button outgrows a folder row's bare link — and
 *  mixed row heights read as a glitch. */
export function FolderListTable({ children }: { children: ReactNode }) {
  return (
    <ConsoleListTable className="[&_td]:h-10">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Updated</TableHead>
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
