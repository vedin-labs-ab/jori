import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react"
import { TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useEditing } from "../../edit/state"
import { type RowDrag, rowDragClasses } from "../../folders/drag/style"
import { RowMenuArea } from "../../menu/row"
import { type RowSelection } from "../selection"
import { interactiveSelector, rowLinkSelector } from "./targets"

/** A list row under a pointer, as a file manager's list reads it. A click
 *  picks the row, with ⌘/Ctrl adding to the selection and Shift running
 *  from the last pick; a double-click opens it; a right-click opens its
 *  menu. The name is the handle a drag moves the row by, which leaves a
 *  press anywhere else free to sweep a marquee. Checkboxes, menus, and
 *  other links keep their own actions, and the name stays a link for the
 *  keyboard, a touch, and a middle-click. Mark the name cell with
 *  `data-row-link`. */
export function ListRow<Row>({
  className,
  drag,
  row,
  selection,
  selectionMenu,
  ...props
}: ComponentProps<typeof TableRow> & {
  drag: RowDrag
  row: Row
  selection: RowSelection<Row>
  /** What a right-click offers when the row is one of several selected. */
  selectionMenu?: ReactNode
}) {
  const isEditing = useEditing()?.edit !== undefined
  const isSelected = selection.isSelected(row)

  return (
    <RowMenuArea
      disabled={isEditing}
      selectionMenu={
        isSelected && selection.count > 1 ? selectionMenu : undefined
      }
    >
      <TableRow
        {...props}
        {...drag.attributes}
        className={cn(rowFocusClasses, rowDragClasses(drag), className)}
        data-row-id={selection.identify(row)}
        data-state={isSelected ? "selected" : undefined}
        onClick={(event) => {
          if (isTouch(event)) {
            followRowLink(event)
          } else if (event.detail > 0 && isRowSurface(event)) {
            selection.pick(row, pickMode(event))
          }
        }}
        onClickCapture={(event) => {
          drag.onClickCapture(event)

          // The name picks the row like any other cell. Its link still
          // answers the keyboard and a touch, whose clicks pass through.
          if (event.detail > 0 && !isTouch(event) && isOnRowLink(event)) {
            event.preventDefault()
          }
        }}
        onContextMenu={(event) => {
          if (isEditing) {
            // The editor's own menu, not the list's behind it.
            event.stopPropagation()
          } else if (!isSelected && rowTarget(event) !== null) {
            selection.pick(row)
          }
        }}
        onDoubleClick={(event) => {
          if (isRowSurface(event)) {
            openRowLink(event)
          }
        }}
        onPointerDown={(event) => {
          if (isOnRowLink(event)) {
            drag.listeners?.onPointerDown?.(event)
          }
        }}
        onPointerDownCapture={drag.onPointerDownCapture}
        ref={drag.setNodeRef}
      />
    </RowMenuArea>
  )
}

// Keep the anchor as the keyboard target, but show its focus on the whole
// row. Other controls, including inline editors, focus themselves.
const rowFocusClasses =
  "has-[[data-row-link]_a:focus-visible]:outline-2 has-[[data-row-link]_a:focus-visible]:-outline-offset-2 has-[[data-row-link]_a:focus-visible]:outline-ring [&_[data-row-link]_a:focus-visible]:outline-none"

function rowTarget(event: SyntheticEvent<HTMLTableRowElement>) {
  const target = event.target

  // React events from a portaled menu still bubble through its row.
  return target instanceof Element && event.currentTarget.contains(target)
    ? target
    : null
}

function isOnRowLink(event: SyntheticEvent<HTMLTableRowElement>) {
  const link = rowTarget(event)?.closest(rowLinkSelector)

  return link != null && event.currentTarget.contains(link)
}

/** Whether the event landed on the row itself: its name, or a cell with
 *  no control of its own under the pointer. */
function isRowSurface(event: SyntheticEvent<HTMLTableRowElement>) {
  const target = rowTarget(event)

  return (
    target !== null &&
    (isOnRowLink(event) || target.closest(interactiveSelector) === null)
  )
}

function isTouch(event: MouseEvent) {
  return (event.nativeEvent as Partial<PointerEvent>).pointerType === "touch"
}

function pickMode(event: MouseEvent) {
  if (event.shiftKey) {
    return "range"
  }

  return event.metaKey || event.ctrlKey ? "toggle" : "alone"
}

/** A tap has no double-click to open with, so it opens the row from any
 *  cell without a control of its own. */
function followRowLink(event: MouseEvent<HTMLTableRowElement>) {
  if (
    !event.defaultPrevented &&
    event.button === 0 &&
    rowTarget(event)?.closest(interactiveSelector) === null
  ) {
    openRowLink(event)
  }
}

/** Clicks the name link as the keyboard would, so the router and the
 *  demo's local navigation open the row the same way. */
function openRowLink(event: MouseEvent<HTMLTableRowElement>) {
  event.currentTarget
    .querySelector(`${rowLinkSelector}[href]`)
    ?.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, cancelable: true })
    )
}
