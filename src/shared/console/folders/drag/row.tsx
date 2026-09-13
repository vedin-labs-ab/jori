import {
  type ComponentProps,
  type MouseEvent,
  type SyntheticEvent,
} from "react"
import { TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { type RowDrag, rowDragClasses } from "./style"

/** List rows open their name-cell link from any noninteractive cell. The
 *  same cells also start a drag; checkboxes, menus, and other links keep
 *  their own actions. Mark the name cell with `data-row-link`. */
export function DraggableTableRow({
  className,
  drag,
  onClick,
  onPointerDown,
  ...props
}: ComponentProps<typeof TableRow> & { drag: RowDrag }) {
  return (
    <TableRow
      {...props}
      {...drag.attributes}
      {...drag.listeners}
      className={cn(rowFocusClasses, rowDragClasses(drag), className)}
      onClick={(event) => {
        onClick?.(event)
        followRowLink(event)
      }}
      onClickCapture={drag.onClickCapture}
      onPointerDown={(event) => {
        onPointerDown?.(event)

        if (!event.defaultPrevented && canDragFrom(event)) {
          drag.listeners?.onPointerDown?.(event)
        }
      }}
      onPointerDownCapture={drag.onPointerDownCapture}
      ref={drag.setNodeRef}
    />
  )
}

// Keep the anchor as the keyboard target, but show its focus on the whole
// clickable row. Other controls, including inline editors, focus themselves.
const rowFocusClasses =
  "has-[[data-row-link]_a:focus-visible]:outline-2 has-[[data-row-link]_a:focus-visible]:-outline-offset-2 has-[[data-row-link]_a:focus-visible]:outline-ring [&_[data-row-link]_a:focus-visible]:outline-none"

const interactiveSelector = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",")

function rowTarget(event: SyntheticEvent<HTMLTableRowElement>) {
  const target = event.target

  // React events from a portaled menu still bubble through its row.
  return target instanceof Element && event.currentTarget.contains(target)
    ? target
    : null
}

function canDragFrom(event: SyntheticEvent<HTMLTableRowElement>) {
  const target = rowTarget(event)
  const interactive = target?.closest(interactiveSelector)

  return (
    target !== null &&
    (interactive == null ||
      interactive === event.currentTarget.querySelector("[data-row-link] a"))
  )
}

function followRowLink(event: MouseEvent<HTMLTableRowElement>) {
  const target = rowTarget(event)

  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    target === null ||
    target.closest(interactiveSelector) !== null
  ) {
    return
  }

  // Dispatch on the existing link so local demo navigation, the router,
  // and modifier keys all follow the same path as clicking its name.
  const link = event.currentTarget.querySelector("[data-row-link] a[href]")

  link?.dispatchEvent(new window.MouseEvent("click", event.nativeEvent))
}
