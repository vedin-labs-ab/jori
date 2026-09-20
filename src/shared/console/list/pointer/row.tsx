import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useRef,
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
  const element = useRef<HTMLTableRowElement | null>(null)

  return (
    <RowMenuArea
      disabled={isEditing}
      onEnter={() => (element.current ? openRowLink(element.current) : null)}
      // The menu speaks for the row it opened on, so that row is picked
      // first unless it is already part of the selection.
      onOpen={() => (isSelected ? undefined : selection.pick(row))}
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
          }
        }}
        onDoubleClick={(event) => {
          if (isRowSurface(event)) {
            openRowLink(event.currentTarget)
          }
        }}
        onPointerDown={(event) => {
          if (isOnRowLink(event)) {
            drag.listeners?.onPointerDown?.(event)
          }
        }}
        onPointerDownCapture={drag.onPointerDownCapture}
        ref={(node) => {
          element.current = node
          drag.setNodeRef(node)
        }}
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
    openRowLink(event.currentTarget)
  }
}

/** Clicks the name link as the keyboard would, so the router and the
 *  demo's local navigation open the row the same way. */
function openRowLink(row: HTMLTableRowElement) {
  row
    .querySelector(`${rowLinkSelector}[href]`)
    ?.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, cancelable: true })
    )
}
