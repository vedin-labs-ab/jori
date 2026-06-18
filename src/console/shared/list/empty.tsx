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
