import { type ComponentProps } from "react"
import { Table } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useMarquee } from "./pointer/marquee"
import { type RowSelection } from "./selection"

// Full-bleed list surface: the table is the page content. Rows run
// edge-to-edge under a sticky header, with the page's horizontal padding
// applied inside the outermost cells so cell content still lines up with
// the shell header.

/** Page root for full-bleed list pages. Relative so the floating selection
 *  bar can anchor to it, and the `list` container the column tiers in
 *  list/controls are measured against. */
export function ConsoleListLayout({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "@container/list relative flex min-h-0 min-w-0 flex-1 flex-col",
        className
      )}
      {...props}
    />
  )
}

/** Padded fallback region for the states that replace the table: loading
 *  skeletons, empty states, and errors. */
export function ConsoleListContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-6 @3xl/inset:px-6",
        className
      )}
      {...props}
    />
  )
}

/** The full-bleed table itself: one scroll container for both axes, header
 *  cells pinned to its top. The sticky header draws its own hairline (a tr
 *  border would scroll away with the rows), and the shadcn table wrapper
 *  stops scrolling so this container stays the only scrollport. Given the
 *  list's selection, a drag across it sweeps a marquee over the rows. */
export function ConsoleListTable<Row>({
  className,
  fill = true,
  selection,
  ...props
}: ComponentProps<typeof Table> & {
  /** Off, the table keeps to its rows so an empty region can take the
   *  rest of the page under its header. */
  fill?: boolean
  selection?: RowSelection<Row>
}) {
  const marquee = useMarquee(selection)

  return (
    <div
      className={cn(
        "relative min-h-0 overflow-auto [&>[data-slot=table-container]]:overflow-visible",
        fill ? "flex-1" : "shrink-0"
      )}
      onPointerDown={marquee.onPointerDown}
      ref={marquee.ref}
    >
      {marquee.box}
      <Table
        className={cn(
          "[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background",
          "[&_th]:shadow-[inset_0_-1px_0_var(--color-border)] [&_thead_tr]:border-0",
          "[&_td:first-child]:pl-4 [&_th:first-child]:pl-4 @3xl/inset:[&_td:first-child]:pl-6 @3xl/inset:[&_th:first-child]:pl-6",
          "[&_td:last-child]:pr-4 [&_th:last-child]:pr-4 @3xl/inset:[&_td:last-child]:pr-6 @3xl/inset:[&_th:last-child]:pr-6",
          className
        )}
        {...props}
      />
    </div>
  )
}

/** Bottom bar pinned under the table, hosting the pager. Borderless — the
 *  sticky table header already frames the list, and rows fade out into the
 *  footer without a second hairline. */
export function ConsoleListFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-background px-4 py-2 @3xl/inset:px-6", className)}
      {...props}
    />
  )
}
