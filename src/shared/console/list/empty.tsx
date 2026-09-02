import { type LucideIcon } from "lucide-react"
import { type ComponentProps, type ReactNode } from "react"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { TableCell, TableRow } from "@/components/ui/table"

/** Keeps the header row's controls reachable when filters empty a list:
 *  the empty state rides inside the table as one full-width row. */
export function EmptyRow({
  children,
  colSpan,
}: {
  children: ReactNode
  colSpan: number
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="p-6" colSpan={colSpan}>
        {children}
      </TableCell>
    </TableRow>
  )
}

/** The region an empty list leaves: whatever height the page has left,
 *  with the state centered in it, so every list page reads the same when
 *  there is nothing to show. */
export function ConsoleListEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6 md:px-6">
      {children}
    </div>
  )
}

/** Empty state for filterable list pages: with filters active it asks to
 *  widen them, otherwise it introduces the domain with the given copy and
 *  offers the page's primary action. */
export function FilterableEmptyState({
  action,
  description,
  hasFilters,
  icon,
  noun,
}: {
  /** The page's primary action, mirroring its header button. */
  action?: ReactNode
  description: string
  hasFilters: boolean
  icon: LucideIcon
  noun: string
}) {
  return (
    <ConsoleEmptyState
      action={hasFilters ? undefined : action}
      description={
        hasFilters
          ? "Adjust the filters or search to widen the results."
          : description
      }
      icon={icon}
      title={hasFilters ? `No matching ${noun}` : `No ${noun} yet`}
    />
  )
}

export function ConsoleEmptyState({
  action,
  className,
  description,
  icon: Icon,
  title,
}: {
  /** The page's primary action, mirroring its header button. */
  action?: ReactNode
  className?: ComponentProps<typeof Empty>["className"]
  description: string
  icon: LucideIcon
  title: string
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action === undefined ? null : <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
