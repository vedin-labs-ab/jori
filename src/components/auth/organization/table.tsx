import type { LucideIcon } from "lucide-react"
import { Filter, MoreHorizontal, Search, X } from "lucide-react"
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
import { HeadButton, SortIcon } from "@/shared/console/list/head"

export type OrganizationTableSortDirection = "ascending" | "descending"

const sortDirections = { ascending: "asc", descending: "desc" } as const

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
        <HeadButton
          aria-label={`Search ${label.toLowerCase()}`}
          disabled={disabled}
          onClick={() => setOpen(true)}
          ref={triggerRef}
        >
          {label}
          <Search />
        </HeadButton>
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
      <HeadButton active={sortDirection !== undefined} onClick={onClick}>
        {children}
        <SortIcon
          direction={sortDirection && sortDirections[sortDirection]}
        />
      </HeadButton>
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
          <HeadButton
            active={isActive}
            aria-label={`${label}: ${selectedOption?.label ?? allLabel}`}
            disabled={disabled}
          >
            <Filter className={isActive ? "text-foreground" : undefined} />
            {selectedOption?.label ?? label}
          </HeadButton>
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
        <Empty className="sticky left-4 min-h-40 w-[calc(100cqw-2rem)] max-w-full rounded-none p-4 whitespace-normal">
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
