import { type ReactNode } from "react"
import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../../dot"
import { CreatedItemRow } from "../../edit/row"
import { type Edit } from "../../edit/state"
import { JobStatus } from "../../jobs/status"
import { SelectionRowCell } from "../../list/bar"
import { columnTier, nameColumnClassName } from "../../list/controls"
import { type RowSelection } from "../../list/selection"
import {
  MaterialOwnerCell,
  ownerColumnClassName,
} from "../../materials/cells/owner"
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
  folderId: string | undefined
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
      <TableCell data-row-link className={nameColumnClassName}>
        <ResourceLink resource={resource} folderId={folderId} />
      </TableCell>
      <ResourceCells resource={resource} folderId={folderId} />
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
  folderId: string | undefined
}) {
  const Icon = resourcePresentation(resource).icon

  return (
    <ConsoleLink
      data-edit-key={`${resource.type}:${resource.id}`}
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

export function CreatedResourceRow({
  edit,
  resource,
}: {
  edit: Edit
  resource: FolderResource | undefined
}) {
  const material = edit.item.table ?? edit.item.store
  const snapshot: FolderResource | undefined =
    material === undefined
      ? undefined
      : {
          ...material,
          id: "tableId" in material ? material.tableId : material.storeId,
          type: edit.item.kind === "store" ? "store" : "table",
        }
  return (
    <CreatedItemRow edit={edit}>
      <ResourceCells
        resource={resource ?? snapshot}
        folderId={edit.item.parentId}
        inert
      />
    </CreatedItemRow>
  )
}
function ResourceCells({
  resource,
  folderId,
  inert,
}: {
  resource: FolderResource | undefined
  folderId: string | undefined
  inert?: boolean
}) {
  const now = useNow(30_000)
  return (
    <>
      <VisibilityCell
        {...resource}
        visibility={resource?.visibility ?? { mode: "organization" }}
        folderId={folderId}
        inert={inert}
      />
      <TableCell className={cn("text-muted-foreground", columnTier.xl)}>
        <span className="inline-flex items-center gap-1.5">
          {resource ? resourcePresentation(resource).label : "—"}
          {resource?.status === "paused" || resource?.status === "completed" ? (
            <>
              <SeparatorDot />
              <JobStatus status={resource.status} />
            </>
          ) : null}
        </span>
      </TableCell>
      <TableCell className={cn(columnTier.lg, ownerColumnClassName)}>
        {resource ? <MaterialOwnerCell owner={materialOwner(resource)} /> : "—"}
      </TableCell>
      {/* Resources hold nothing, so the Items column carries a quiet dash —
          an empty cell under a sortable header would read as missing data. */}
      <TableCell className={cn("text-muted-foreground/60", columnTier["2xl"])}>
        &mdash;
      </TableCell>
      <TableCell
        className={cn("text-muted-foreground", columnTier.sm)}
        title={resource ? absoluteTime(resource.updatedAt) : undefined}
      >
        {resource ? relativeTime(Math.min(resource.updatedAt, now), now) : "—"}
      </TableCell>
    </>
  )
}
