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
import { cn } from "@/lib/utils"

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
    <Empty className={cn("min-h-48 rounded-md", className)}>
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
