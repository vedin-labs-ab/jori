import { type ReactNode } from "react"
import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../../dot"
import { JobStatus } from "../../jobs/status"
import { SelectionRowCell } from "../../list/bar"
import { columnTier } from "../../list/controls"
import { type RowSelection } from "../../list/selection"
import { MaterialOwnerCell } from "../../materials/cells/owner"
import { materialOwner } from "../../materials/owners"
import { ConsoleLink } from "../../shell/link"
import { absoluteTime, relativeTime, useNow } from "../../time"
import { VisibilityCell, VisibilityNameMark } from "../../visibility/table"
import { type DragPayload } from "../drag/plan"
import { DraggableTableRow } from "../drag/row"
import { useResourceRowDrag } from "../drag/state"
import {
  type FolderResource,
  resourceDestination,
  resourcePresentation,
} from "../types"
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
      <TableCell data-row-link>
        <ResourceLink resource={resource} folderId={folderId} />
      </TableCell>
      <VisibilityCell {...resource} folderId={folderId} />
      <TableCell className={cn("text-muted-foreground", columnTier.xl)}>
        <span className="inline-flex items-center gap-1.5">
          {resourcePresentation(resource).label}
          {resource.status === "paused" || resource.status === "completed" ? (
            <>
              <SeparatorDot />
              <JobStatus status={resource.status} />
            </>
          ) : null}
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

/** The resource's own surface. */
function ResourceLink({
  resource,
  folderId,
}: {
  resource: FolderResource
  folderId: string
}) {
  const Icon = resourcePresentation(resource).icon

  return (
    <ConsoleLink
      {...resourceDestination(resource)}
      className={nameLinkClassName}
      draggable={false}
      title={resource.name}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{resource.name}</span>
      <VisibilityNameMark {...resource} folderId={folderId} />
    </ConsoleLink>
  )
}
