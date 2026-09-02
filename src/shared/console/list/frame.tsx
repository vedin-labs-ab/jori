import { type ComponentProps } from "react"
import { Table } from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Full-bleed list surface: the table is the page content. Rows run
// edge-to-edge under a sticky header, with the page's horizontal padding
// applied inside the outermost cells so cell content still lines up with
// the shell header.

/** Page root for full-bleed list pages. Relative so the floating selection
 *  bar can anchor to it. */
export function ConsoleListLayout({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  )
}

/** Filter row above the table, padded to the page frame and closed off
 *  with a hairline before the table header starts. */
export function ConsoleListToolbar({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-4 py-3 md:px-6",
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
        "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-6 md:px-6",
        className
      )}
      {...props}
    />
  )
}

/** The full-bleed table itself: one scroll container for both axes, header
 *  cells pinned to its top. The sticky header draws its own hairline (a tr
 *  border would scroll away with the rows), and the shadcn table wrapper
 *  stops scrolling so this container stays the only scrollport. */
export function ConsoleListTable({
  className,
  fill = true,
  ...props
}: ComponentProps<typeof Table> & {
  /** Off, the table keeps to its rows so an empty region can take the
   *  rest of the page under its header. */
  fill?: boolean
}) {
  return (
    <div
      className={cn(
        "relative min-h-0 overflow-auto [&>[data-slot=table-container]]:overflow-visible",
        fill ? "flex-1" : "shrink-0"
      )}
    >
      <Table
        className={cn(
          "[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background",
          "[&_th]:shadow-[inset_0_-1px_0_var(--color-border)] [&_thead_tr]:border-0",
          "[&_td:first-child]:pl-4 [&_th:first-child]:pl-4 md:[&_td:first-child]:pl-6 md:[&_th:first-child]:pl-6",
          "[&_td:last-child]:pr-4 [&_th:last-child]:pr-4 md:[&_td:last-child]:pr-6 md:[&_th:last-child]:pr-6",
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
      className={cn("bg-background px-4 py-2 md:px-6", className)}
      {...props}
    />
  )
}
