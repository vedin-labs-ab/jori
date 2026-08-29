import { Link } from "@tanstack/react-router"
import { Folder, FolderInput, FolderMinus, MoreHorizontal } from "lucide-react"
import { type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ConsoleEmptyState } from "../shared/list/empty"
import { ConsoleListSkeleton } from "../shared/list/skeleton"
import { MaterialScopeMark } from "../shared/materials/scope"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
import { type ResourceDragPayload } from "./drag/plan"
import { useFolderRowDrag, useResourceRowDrag } from "./drag/state"
import {
  type FolderContentsResult,
  type FolderResource,
  resourcePresentation,
} from "./types"

/** A folder's listing: subfolders first, then the filed resources in one
 *  name-sorted run, each linking to its own surface. Rows drag: subfolders
 *  move like sidebar rows, resources file onto any folder row or unfile
 *  onto the sidebar's group header. */
export function FolderContents({
  contents,
  folderId,
  newMenu,
  onMove,
  onUnfile,
}: {
  contents: FolderContentsResult | undefined
  /** The folder being viewed — the one filed resources already sit in. */
  folderId: string
  /** The header's "New" menu again, as the empty state's call to action. */
  newMenu: ReactNode
  onMove: (resource: FolderResource) => void
  onUnfile: (resource: FolderResource) => void
}) {
  if (contents === undefined) {
    return <ConsoleListSkeleton />
  }

  if (contents.status !== "ready") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the folder</AlertTitle>
        <AlertDescription>
          {contents.status === "unauthorized"
            ? contents.message
            : "The folder may have been deleted."}
        </AlertDescription>
      </Alert>
    )
  }

  if (contents.folders.length === 0 && contents.resources.length === 0) {
    return (
      <ConsoleEmptyState
        action={newMenu}
        description="File tables, stores, files, and automations here, or add a subfolder."
        icon={Folder}
        title="Empty folder"
      />
    )
  }

  return (
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contents.folders.map((folder) => (
            <SubfolderRow folder={folder} key={folder.folderId} />
          ))}
          {contents.resources.map((resource) => (
            <ResourceRow
              folderId={folderId}
              key={resource.id}
              onMove={onMove}
              onUnfile={onUnfile}
              resource={resource}
            />
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

/** Drag styling for a listing row, mirroring the sidebar's: the source
 *  dims, the hovered valid target takes the accent, plain hover goes quiet
 *  while a drag runs, and a landed move fades the row in where it settled
 *  — unless the user prefers reduced motion. */
function rowDragClasses(drag: {
  isDragActive: boolean
  isDragSource: boolean
  isDropTarget?: boolean
  isSettling?: boolean
}) {
  return cn(
    drag.isDragActive && !drag.isDropTarget && "hover:bg-transparent",
    drag.isDragSource && "opacity-50",
    drag.isDropTarget && "bg-accent",
    drag.isSettling &&
      "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
  )
}

function SubfolderRow({
  folder,
}: {
  folder: FolderContentsResult["folders"][number]
}) {
  const drag = useFolderRowDrag("contents", folder.folderId, folder.name)
  const now = useNow(30_000)

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
          className={resourceLinkClassName}
          draggable={false}
          params={{ folderId: folder.folderId }}
          title={folder.name}
          to="/folders/$folderId"
        >
          <Folder className="size-4 shrink-0 text-muted-foreground" />
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

function ResourceRow({
  folderId,
  onMove,
  onUnfile,
  resource,
}: {
  folderId: string
  onMove: (resource: FolderResource) => void
  onUnfile: (resource: FolderResource) => void
  resource: FolderResource
}) {
  const drag = useResourceRowDrag(resourcePayload(resource, folderId))
  const now = useNow(30_000)

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
        <ResourceLink resource={resource} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {resourcePresentation(resource).label}
          {resource.status === "paused" || resource.status === "completed" ? (
            <Badge variant="secondary">
              {resource.status === "paused" ? "Paused" : "Completed"}
            </Badge>
          ) : null}
        </span>
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(resource.updatedAt)}
      >
        {relativeTime(resource.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Open actions for ${resource.name}`}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => onMove(resource)}>
              <FolderInput />
              Move to folder…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUnfile(resource)}>
              <FolderMinus />
              Remove from folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

function resourcePayload(
  resource: FolderResource,
  folderId: string
): ResourceDragPayload {
  return {
    kind: "resource",
    type: resource.type,
    id: resource.id,
    name: resource.name,
    mimeType: resource.mimeType,
    folderId,
  }
}

/** Name-cell link class for this listing. The width cap sits on the link
 *  itself, not the table cell — browsers ignore max-width on table cells
 *  when sizing auto-layout columns — so a long name truncates inside the
 *  capped link instead of widening the column. */
const resourceLinkClassName =
  "flex max-w-64 items-center gap-2 font-medium hover:underline"

/** The resource's own surface. Automations have no detail page — their list
 *  opens the editor — so an automation row lands on the list. */
function ResourceLink({ resource }: { resource: FolderResource }) {
  const Icon = resourcePresentation(resource).icon
  const label = (
    <>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{resource.name}</span>
      {resource.scope === "personal" ? (
        <MaterialScopeMark scope="personal" />
      ) : null}
    </>
  )

  switch (resource.type) {
    case "table":
      return (
        <Link
          className={resourceLinkClassName}
          draggable={false}
          params={{ tableId: resource.id }}
          title={resource.name}
          to="/tables/$tableId"
        >
          {label}
        </Link>
      )
    case "store":
      return (
        <Link
          className={resourceLinkClassName}
          draggable={false}
          params={{ storeId: resource.id }}
          title={resource.name}
          to="/stores/$storeId"
        >
          {label}
        </Link>
      )
    case "file":
      return (
        <Link
          className={resourceLinkClassName}
          draggable={false}
          params={{ fileId: resource.id }}
          title={resource.name}
          to="/files/$fileId"
        >
          {label}
        </Link>
      )
    case "automation":
      return (
        <Link
          className={resourceLinkClassName}
          draggable={false}
          title={resource.name}
          to="/automations"
        >
          {label}
        </Link>
      )
  }
}
