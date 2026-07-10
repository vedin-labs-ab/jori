import { type LucideIcon } from "lucide-react"
import { type ComponentProps } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

/** Empty state for filterable list pages: with filters active it asks to
 *  widen them, otherwise it introduces the domain with the given copy. */
export function FilterableEmptyState({
  description,
  hasFilters,
  icon,
  noun,
}: {
  description: string
  hasFilters: boolean
  icon: LucideIcon
  noun: string
}) {
  return (
    <ConsoleEmptyState
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
  className,
  description,
  icon: Icon,
  title,
}: {
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
    </Empty>
  )
}
