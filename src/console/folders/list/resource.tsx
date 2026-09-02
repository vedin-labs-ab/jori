import { Link } from "@tanstack/react-router"
import { Check, type LucideIcon, Pause } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MaterialOwnerCell } from "../../shared/materials/cells/owner"
import { materialOwner } from "../../shared/materials/owners"
import { absoluteTime, relativeTime, useNow } from "../../shared/time"
import { VisibilityMark } from "../../shared/visibility/badge"
import { type ResourceDragPayload } from "../drag/plan"
import { useResourceRowDrag } from "../drag/state"
import { type FolderResource, resourcePresentation } from "../types"
import { type FolderResourceActions } from "./actions"
import { ResourceRowMenu } from "./menu"
import { nameLinkClassName, rowDragClasses } from "./style"

/** One filed resource in a folder's listing, linking to its own surface.
 *  The row drags: resources file onto any folder row or unfile onto the
 *  sidebar's group header. */
export function ResourceListRow({
  actions,
  folderId,
  resource,
}: {
  actions: FolderResourceActions
  /** The folder being viewed — the one the resource already sits in. */
  folderId: string
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
          <ResourceStatusMark status={resource.status} />
        </span>
      </TableCell>
      <TableCell>
        <MaterialOwnerCell owner={materialOwner(resource)} />
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
        <ResourceRowMenu actions={actions} resource={resource} />
      </TableCell>
    </TableRow>
  )
}

/** An automation that is not running says so with a muted glyph, in the
 *  same quiet idiom as the visibility mark beside its name — a badge in a
 *  Kind cell reads as a second kind. Active resources carry no mark. */
function ResourceStatusMark({ status }: { status: FolderResource["status"] }) {
  const mark = status === undefined ? undefined : statusMarks[status]

  if (mark === undefined) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="shrink-0">
          <mark.icon aria-hidden className="size-3.5" />
          <span className="sr-only">{mark.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{mark.label}</TooltipContent>
    </Tooltip>
  )
}

const statusMarks: Partial<
  Record<
    NonNullable<FolderResource["status"]>,
    { icon: LucideIcon; label: string }
  >
> = {
  completed: { icon: Check, label: "Completed" },
  paused: { icon: Pause, label: "Paused" },
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
      {resource.visibility === "organization" ? null : (
        <VisibilityMark visibility={resource.visibility} />
      )}
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
