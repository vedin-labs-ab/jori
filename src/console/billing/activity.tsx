import { formatUsd } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Section, SectionHeader } from "@/components/ui/section"
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { RevealArrow } from "@/shared/console/dot"
import { absoluteTime } from "@/shared/console/time"
import { type BillingOverview } from "./actions"
import { BillingActivityEmpty } from "./empty"

type BillingEntry = BillingOverview["entries"][number]

type ActivityKind = "run" | "allowance" | "top-up"

type ActivityRow = {
  id: string
  timestamp: number
  kind: ActivityKind
  label: string
  runId: string | undefined
  dot: string | undefined
  signedMicros: number
  balanceMicros: number
}

const kindLabels: Record<ActivityKind, string> = {
  run: "Runs",
  allowance: "Allowances",
  "top-up": "Top-ups",
}

/** Billing statement with sortable time and amount, plus an inline kind filter. */
export function Activity({ entries }: { entries: BillingEntry[] }) {
  const rows = useMemo(() => entries.map(toRow), [entries])
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <Section>
      <SectionHeader
        description="Every allowance, top-up, and run, priced at provider list rates."
        title="Activity"
      />
      <ActivityTable table={table} />
    </Section>
  )
}

type ActivityTableInstance = ReturnType<typeof useReactTable<ActivityRow>>

function ActivityTable({ table }: { table: ActivityTableInstance }) {
  return (
    <TableFrame>
      <Table className="min-w-xl">
        <TableHeader>
          {/* The header stays neutral while its controls are active. */}
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              className="hover:bg-transparent has-aria-expanded:bg-transparent"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getCoreRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <BillingActivityEmpty />
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="h-16 text-center text-muted-foreground"
                colSpan={columns.length}
              >
                No matching activity.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

/** Persist the ghost hover treatment while the control is active. */
function headerButtonClass(active: boolean) {
  return cn("-ml-2", active && "bg-muted text-foreground dark:bg-muted/50")
}

function SortHeader({
  column,
  children,
  align = "left",
}: {
  column: Column<ActivityRow>
  children: ReactNode
  align?: "left" | "right"
}) {
  const sorted = column.getIsSorted()

  return (
    <Button
      className={cn(
        headerButtonClass(sorted !== false),
        align === "right" && "-mr-2 ml-0 float-right"
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
      size="sm"
      variant="ghost"
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="text-foreground" />
      ) : sorted === "desc" ? (
        <ArrowDown className="text-foreground" />
      ) : (
        <ArrowUpDown />
      )}
    </Button>
  )
}

/**
 * The kind filter lives in the What header: a Filter-prefixed label that
 * opens a radio menu and shows the active choice in place.
 */
function KindHeader({ column }: { column: Column<ActivityRow> }) {
  const value = (column.getFilterValue() as ActivityKind | undefined) ?? ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={headerButtonClass(value !== "")}
          size="sm"
          variant="ghost"
        >
          <Filter className={value === "" ? "" : "text-foreground"} />
          {value === "" ? "What" : kindLabels[value]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          onValueChange={(next) =>
            column.setFilterValue(next === "" ? undefined : next)
          }
          value={value}
        >
          <DropdownMenuRadioItem value="">Everything</DropdownMenuRadioItem>
          {Object.entries(kindLabels).map(([kind, label]) => (
            <DropdownMenuRadioItem key={kind} value={kind}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * One text treatment for every kind; only the suffix differs. Runs link to
 * their receipt and reveal an arrow on hover, credits carry their kind dot.
 */
function WhatCell({ row }: { row: ActivityRow }) {
  if (row.kind === "run" && row.runId !== undefined) {
    return (
      <Link
        className="group/reveal inline-flex max-w-md items-center gap-0.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        search={{ run: row.runId }}
        to="/runs"
      >
        <span className="truncate">{row.label}</span>
        <RevealArrow className="shrink-0" />
      </Link>
    )
  }

  return (
    <span className="inline-flex max-w-md items-center gap-1.5">
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", row.dot)}
      />
      <span className="truncate">{row.label}</span>
    </span>
  )
}

const columns: ColumnDef<ActivityRow>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => <SortHeader column={column}>When</SortHeader>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {absoluteTime(row.original.timestamp)}
      </span>
    ),
  },
  {
    accessorKey: "kind",
    filterFn: "equalsString",
    header: ({ column }) => <KindHeader column={column} />,
    cell: ({ row }) => <WhatCell row={row.original} />,
  },
  {
    accessorKey: "signedMicros",
    header: ({ column }) => (
      <SortHeader align="right" column={column}>
        Amount
      </SortHeader>
    ),
    cell: ({ row }) => (
      <div
        className={cn(
          "text-right tabular-nums",
          row.original.signedMicros > 0 && "text-primary"
        )}
      >
        {row.original.signedMicros > 0
          ? `+${formatUsd(row.original.signedMicros)}`
          : formatUsd(row.original.signedMicros)}
      </div>
    ),
  },
  {
    id: "balance",
    header: () => <div className="text-right">Available</div>,
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground tabular-nums">
        {formatUsd(row.original.balanceMicros)}
      </div>
    ),
  },
]

const entryKinds: Record<BillingEntry["type"], ActivityKind> = {
  debit: "run",
  allowance: "allowance",
  topup: "top-up",
}

function toRow(entry: BillingEntry): ActivityRow {
  return {
    id: entry._id,
    timestamp: entry.timestamp,
    kind: entryKinds[entry.type],
    label: entryLabel(entry),
    runId: entry.type === "debit" ? entry.runId : undefined,
    dot: entryDot(entry),
    signedMicros:
      entry.type === "debit" ? -entry.micros.amount : entry.micros.amount,
    balanceMicros: entry.micros.balance,
  }
}

function entryLabel(entry: BillingEntry) {
  if (entry.type === "debit") {
    return entry.runTitle ?? "Run"
  }

  if (entry.type === "topup") {
    return entry.auto ? "Auto top-up" : "Top-up"
  }

  if (entry.source === "manual") {
    return "Manual allowance"
  }

  return entry.source === "trial" ? "Trial allowance" : "Monthly allowance"
}

function entryDot(entry: BillingEntry) {
  if (entry.type === "allowance") {
    return entry.source === "trial" ? "bg-warning" : "bg-primary"
  }

  return entry.type === "topup" ? "bg-informational" : undefined
}
