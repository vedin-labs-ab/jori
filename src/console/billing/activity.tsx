import { formatUsd } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  columnFilteringFeature,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  flexRender,
  rowSortingFeature,
  type SortingState,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { Filter } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
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
import { HeadButton, SortIcon } from "@/shared/console/list/head"
import { absoluteTime } from "@/shared/console/time"
import { StableLabel } from "@/shared/label"
import { type BillingOverview } from "./actions"
import { BillingActivityEmpty } from "./empty"
import { type ActivityKind, type ActivityRow, kindLabels, toRow } from "./model"

type BillingEntry = BillingOverview["entries"][number]

const features = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { equalsString: filterFn_equalsString },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },
})

/** Billing statement with sortable time and amount, plus an inline kind filter. */
export function Activity({ entries }: { entries: BillingEntry[] }) {
  const rows = useMemo(() => entries.map(toRow), [entries])
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const table = useTable({
    features,
    data: rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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

type ActivityTableInstance = ReturnType<
  typeof useTable<typeof features, ActivityRow>
>

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
                {row.getAllCells().map((cell) => (
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

function SortHeader({
  column,
  children,
  align = "start",
}: {
  column: Column<typeof features, ActivityRow>
  children: ReactNode
  align?: "start" | "end"
}) {
  const sorted = column.getIsSorted()
  const direction = sorted === false ? undefined : sorted

  return (
    <HeadButton
      active={direction !== undefined}
      align={align}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      <SortIcon direction={direction} />
    </HeadButton>
  )
}

/**
 * The kind filter lives in the What header: a Filter-prefixed label that
 * opens a radio menu and shows the active choice in place.
 */
function KindHeader({
  column,
}: {
  column: Column<typeof features, ActivityRow>
}) {
  const value = (column.getFilterValue() as ActivityKind | undefined) ?? ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <HeadButton active={value !== ""}>
          <Filter className={value === "" ? "" : "text-foreground"} />
          <StableLabel alternatives={Object.values(kindLabels)}>
            {value === "" ? "What" : kindLabels[value]}
          </StableLabel>
        </HeadButton>
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

const columns: ColumnDef<typeof features, ActivityRow>[] = [
  {
    accessorKey: "timestamp",
    sortFn: "basic",
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
    sortFn: "basic",
    header: ({ column }) => (
      <div className="text-right">
        <SortHeader align="end" column={column}>
          Amount
        </SortHeader>
      </div>
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
