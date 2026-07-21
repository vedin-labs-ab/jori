import type { LucideIcon } from "lucide-react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  MoreHorizontal,
  Search,
  X
} from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"

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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { TableCell, TableHead, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type OrganizationTableSortDirection = "ascending" | "descending"

export type OrganizationTableFilterOption = {
  label: string
  value: string
}

export function OrganizationSearchableTableHead({
  label,
  placeholder,
  value,
  disabled,
  onValueChange
}: {
  label: string
  placeholder: string
  value: string
  disabled?: boolean
  onValueChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef(false)

  useEffect(() => {
    if (!open && restoreFocusRef.current) {
      restoreFocusRef.current = false
      triggerRef.current?.focus()
    }
  }, [open])

  function close() {
    restoreFocusRef.current = true
    onValueChange("")
    setOpen(false)
  }

  return (
    <TableHead className="min-w-48">
      {open ? (
        <InputGroup className="-ml-2 w-48">
          <InputGroupInput
            aria-label={placeholder}
            autoFocus
            className="[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            disabled={disabled}
            onChange={(event) => onValueChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                event.stopPropagation()
                close()
              }
            }}
            placeholder={placeholder}
            type="search"
            value={value}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label={`Clear ${label.toLowerCase()} search`}
              onClick={close}
              size="icon-xs"
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      ) : (
        <Button
          aria-label={`Search ${label.toLowerCase()}`}
          className="-ml-2"
          disabled={disabled}
          onClick={() => setOpen(true)}
          ref={triggerRef}
          size="sm"
          variant="ghost"
        >
          {label}
          <Search />
        </Button>
      )}
    </TableHead>
  )
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

export function OrganizationActionsTableHead({ label }: { label: string }) {
  return (
    <TableHead className="w-12 text-end">
      <span className="sr-only">{label}</span>
    </TableHead>
  )
}

export function OrganizationTableActionMenu({
  children,
  disabled,
  label,
  pending
}: {
  children: ReactNode
  disabled?: boolean
  label: string
  pending?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label}
          disabled={disabled || pending}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {pending ? <Spinner /> : <MoreHorizontal />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
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
