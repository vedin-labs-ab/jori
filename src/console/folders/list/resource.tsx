import { Link } from "@tanstack/react-router"
import { FolderInput, FolderMinus, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { MaterialScopeMark } from "../../shared/materials/scope"
import { absoluteTime, relativeTime, useNow } from "../../shared/time"
import { type ResourceDragPayload } from "../drag/plan"
import { useResourceRowDrag } from "../drag/state"
import { type FolderResource, resourcePresentation } from "../types"
import { nameLinkClassName, rowDragClasses } from "./style"

/** One filed resource in a folder's listing, linking to its own surface.
 *  The row drags: resources file onto any folder row or unfile onto the
 *  sidebar's group header. */
export function ResourceListRow({
  folderId,
  onMove,
  onUnfile,
  resource,
}: {
  /** The folder being viewed — the one the resource already sits in. */
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
      {/* Resources hold nothing, so the Items column carries a quiet dash —
          an empty cell under a sortable header would read as missing data. */}
      <TableCell className="text-muted-foreground/60">&mdash;</TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(resource.updatedAt)}
      >
        {relativeTime(resource.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">
        <ResourceMenu onMove={onMove} onUnfile={onUnfile} resource={resource} />
      </TableCell>
    </TableRow>
  )
}

function ResourceMenu({
  onMove,
  onUnfile,
  resource,
}: {
  onMove: (resource: FolderResource) => void
  onUnfile: (resource: FolderResource) => void
  resource: FolderResource
}) {
  return (
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
          className={nameLinkClassName}
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
          className={nameLinkClassName}
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
          className={nameLinkClassName}
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
          className={nameLinkClassName}
          draggable={false}
          title={resource.name}
          to="/automations"
        >
          {label}
        </Link>
      )
  }
}
