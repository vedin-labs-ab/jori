import type { LucideIcon } from "lucide-react"
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty"
import { TableCell, TableHead, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type OrganizationTableSortDirection = "ascending" | "descending"

export type OrganizationTableFilterOption = {
  label: string
  value: string
}

export function OrganizationSortableTableHead({
  children,
  sortDirection,
  onClick
}: {
  children: ReactNode
  sortDirection?: OrganizationTableSortDirection
  onClick: () => void
}) {
  return (
    <TableHead aria-sort={sortDirection ?? "none"}>
      <Button
        className={cn(
          "-ml-2",
          sortDirection && "bg-muted text-foreground dark:bg-muted/50"
        )}
        onClick={onClick}
        size="sm"
        variant="ghost"
      >
        {children}
        {sortDirection === "ascending" ? (
          <ArrowUp className="text-foreground" />
        ) : sortDirection === "descending" ? (
          <ArrowDown className="text-foreground" />
        ) : (
          <ArrowUpDown />
        )}
      </Button>
    </TableHead>
  )
}

export function OrganizationFilterTableHead({
  label,
  allLabel,
  value,
  options,
  disabled,
  onValueChange
}: {
  label: string
  allLabel: string
  value: string
  options: OrganizationTableFilterOption[]
  disabled?: boolean
  onValueChange: (value: string) => void
}) {
  const selectedOption = options.find((option) => option.value === value)
  const isActive = value !== "all"

  return (
    <TableHead>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`${label}: ${selectedOption?.label ?? allLabel}`}
            className={cn(
              "-ml-2",
              isActive && "bg-muted text-foreground dark:bg-muted/50"
            )}
            disabled={disabled}
            size="sm"
            variant="ghost"
          >
            <Filter className={isActive ? "text-foreground" : undefined} />
            {selectedOption?.label ?? label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            <DropdownMenuRadioItem value="all">
              {allLabel}
            </DropdownMenuRadioItem>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </TableHead>
  )
}

export function OrganizationTableEmpty({
  colSpan,
  icon: Icon,
  title,
  description
}: {
  colSpan: number
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <Empty className="min-h-40 rounded-none p-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  )
}
