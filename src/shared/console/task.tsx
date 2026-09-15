"use client"

import { ChevronDownIcon, SearchIcon } from "lucide-react"
import { type ComponentProps } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export const TaskItem = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => (
  <div className={cn("text-muted-foreground text-sm", className)} {...props}>
    {children}
  </div>
)

export const TaskLabel = ({
  className,
  shimmer = false,
  ...props
}: ComponentProps<"span"> & { shimmer?: boolean }) => (
  <span className={cn(shimmer ? "shimmer" : null, className)} {...props} />
)

export const Task = ({
  defaultOpen = true,
  className,
  ...props
}: ComponentProps<typeof Collapsible>) => (
  <Collapsible className={className} defaultOpen={defaultOpen} {...props} />
)

export const TaskTrigger = ({
  children,
  className,
  title,
  ...props
}: ComponentProps<typeof CollapsibleTrigger> & { title: string }) => (
  <CollapsibleTrigger asChild className={cn("group", className)} {...props}>
    {children ?? (
      <div className="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
        <SearchIcon className="size-4" />
        <p className="text-sm">{title}</p>
        <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
      </div>
    )}
  </CollapsibleTrigger>
)

export const TaskContent = ({
  children,
  className,
  ...props
}: ComponentProps<typeof CollapsibleContent>) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  >
    {/* The nesting is carried by the indent and by the disclosure control
        above it. The runs timeline already draws its own hairline rail one
        column to the left, so a second, heavier rule here read as a competing
        one rather than as depth. */}
    <div className="mt-4 space-y-2 pl-4">{children}</div>
  </CollapsibleContent>
)
