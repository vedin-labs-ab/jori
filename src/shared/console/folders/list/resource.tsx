import { Check, type LucideIcon, Pause } from "lucide-react"
import { type ReactNode } from "react"
import { TableCell } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { SelectionRowCell } from "../../list/bar"
import { columnTier } from "../../list/controls"
import { type RowSelection } from "../../list/selection"
import { MaterialOwnerCell } from "../../materials/cells/owner"
import { materialOwner } from "../../materials/owners"
import { ConsoleLink } from "../../shell/link"
import { absoluteTime, relativeTime, useNow } from "../../time"
import { VisibilityMark } from "../../visibility/badge"
import { type DragPayload } from "../drag/plan"
import { DraggableTableRow } from "../drag/row"
import { useResourceRowDrag } from "../drag/state"
import { type FolderResource, resourcePresentation } from "../types"
import { type FolderListEntry, resourceDragItem } from "./controls"
import { nameLinkClassName } from "./style"

/** One filed resource in a folder's listing, linking to its own surface.
 *  The row drags: resources file onto any folder row or unfile onto the
 *  sidebar's group header, and a selected row takes the rest of the
 *  selected resources with it. Its menu, trigger and all, is handed in:
 *  what a filed resource can be asked to do is its own kind's business. */
export function ResourceListRow({
  folderId,
  menu,
  resource,
  selected,
  selection,
}: {
  /** The folder being viewed — the one the resource already sits in. */
  folderId: string
  menu: ReactNode
  resource: FolderResource
  /** The selection, as a drag would carry it. */
  selected: DragPayload
  selection: RowSelection<FolderListEntry>
}) {
  const drag = useResourceRowDrag(
    resourceDragItem(resource, folderId),
    selected
  )
  const now = useNow(30_000)

  return (
    <DraggableTableRow
      data-state={selection.isSelected(resource) ? "selected" : undefined}
      drag={drag}
    >
      <SelectionRowCell
        label={`Select ${resource.name}`}
        row={resource}
        selection={selection}
      />
      <TableCell>
        <ResourceLink resource={resource} />
      </TableCell>
      <TableCell className={cn("text-muted-foreground", columnTier.xl)}>
        <span className="inline-flex items-center gap-1.5">
          {resourcePresentation(resource).label}
          <ResourceStatusMark status={resource.status} />
        </span>
      </TableCell>
      <TableCell className={columnTier.lg}>
        <MaterialOwnerCell owner={materialOwner(resource)} />
      </TableCell>
      {/* Resources hold nothing, so the Items column carries a quiet dash —
          an empty cell under a sortable header would read as missing data. */}
      <TableCell className={cn("text-muted-foreground/60", columnTier["2xl"])}>
        &mdash;
      </TableCell>
      <TableCell
        className={cn("text-muted-foreground", columnTier.xs)}
        title={absoluteTime(resource.updatedAt)}
      >
        {relativeTime(resource.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">{menu}</TableCell>
    </DraggableTableRow>
  )
}

/** A job that is not running says so with a muted glyph, in the
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

/** The resource's own surface. */
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
        <ConsoleLink
          className={nameLinkClassName}
          draggable={false}
          params={{ tableId: resource.id }}
          title={resource.name}
          to="/tables/$tableId"
        >
          {label}
        </ConsoleLink>
      )
    case "store":
      return (
        <ConsoleLink
          className={nameLinkClassName}
          draggable={false}
          params={{ storeId: resource.id }}
          title={resource.name}
          to="/stores/$storeId"
        >
          {label}
        </ConsoleLink>
      )
    case "file":
      return (
        <ConsoleLink
          className={nameLinkClassName}
          draggable={false}
          params={{ fileId: resource.id }}
          title={resource.name}
          to="/files/$fileId"
        >
          {label}
        </ConsoleLink>
      )
    case "job":
      return (
        <ConsoleLink
          className={nameLinkClassName}
          draggable={false}
          params={{ jobId: resource.id }}
          title={resource.name}
          to="/jobs/$jobId"
        >
          {label}
        </ConsoleLink>
      )
  }
}
