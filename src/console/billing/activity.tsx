import { formatUsd } from "@contracts/billing"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { absoluteTime } from "../shared/time"
import { type BillingOverview } from "./actions"

type BillingEntry = BillingOverview["entries"][number]

type ActivityRow = {
  id: string
  timestamp: number
  label: string
  source: string
  signedMicros: number
  balanceMicros: number | undefined
}

const sources = ["Included", "Wallet", "Included + Wallet"]

/**
 * The statement, as the stock shadcn data table: sortable time and amount,
 * and a source filter folded into its own column header to keep the surface
 * dense. Rows written before attribution existed simply leave cells blank.
 */
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
    <section>
      <h2 className="font-medium">Activity</h2>
      <p className="mt-0.5 text-muted-foreground text-sm">
        Every allowance, top-up, and run, priced at provider list rates.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-muted-foreground text-sm">
          Nothing yet. Costs appear here as Milo works.
        </p>
      ) : (
        <ActivityTable table={table} />
      )}
    </section>
  )
}

type ActivityTableInstance = ReturnType<typeof useReactTable<ActivityRow>>

function ActivityTable({ table }: { table: ActivityTableInstance }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
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
          {table.getRowModel().rows.length === 0 ? (
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
    </div>
  )
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
      className={`-ml-3 h-8 ${align === "right" ? "-mr-3 ml-0 float-right" : ""}`}
      onClick={() => column.toggleSorting(sorted === "asc")}
      size="sm"
      variant="ghost"
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp />
      ) : sorted === "desc" ? (
        <ArrowDown />
      ) : (
        <ArrowUpDown />
      )}
    </Button>
  )
}

/**
 * The filter lives in the column header itself: a Filter-prefixed label that
 * opens a radio menu. The icon brightens while a filter is active.
 */
function SourceHeader({ column }: { column: Column<ActivityRow> }) {
  const value = (column.getFilterValue() as string) ?? ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="-ml-3 h-8" size="sm" variant="ghost">
          <Filter className={value === "" ? "" : "text-foreground"} />
          {value === "" ? "Source" : value}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          onValueChange={(next) =>
            column.setFilterValue(next === "" ? undefined : next)
          }
          value={value}
        >
          <DropdownMenuRadioItem value="">All sources</DropdownMenuRadioItem>
          {sources.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {option}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
    accessorKey: "label",
    filterFn: "includesString",
    header: "What",
    cell: ({ row }) => row.original.label,
  },
  {
    accessorKey: "source",
    filterFn: "equalsString",
    header: ({ column }) => <SourceHeader column={column} />,
    cell: ({ row }) =>
      row.original.source === "" ? null : (
        <Badge
          variant={row.original.source === "Wallet" ? "outline" : "secondary"}
        >
          {row.original.source}
        </Badge>
      ),
  },
  {
    accessorKey: "signedMicros",
    header: ({ column }) => (
      <SortHeader align="right" column={column}>
        Amount
      </SortHeader>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
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
        {row.original.balanceMicros === undefined
          ? null
          : formatUsd(row.original.balanceMicros)}
      </div>
    ),
  },
]

function toRow(entry: BillingEntry): ActivityRow {
  return {
    id: entry._id,
    timestamp: entry.timestamp,
    label: entryLabel(entry),
    source: entrySource(entry),
    signedMicros:
      entry.type === "debit" ? -entry.amountMicros : entry.amountMicros,
    balanceMicros: entry.balanceMicros,
  }
}

function entrySource(entry: BillingEntry) {
  if (entry.type === "grant") {
    return "Included"
  }

  if (entry.type === "topup") {
    return "Wallet"
  }

  if (entry.includedMicros === undefined) {
    return ""
  }

  if (entry.includedMicros >= entry.amountMicros) {
    return "Included"
  }

  return entry.includedMicros === 0 ? "Wallet" : "Included + Wallet"
}

function entryLabel(entry: BillingEntry) {
  if (entry.type === "debit") {
    return entry.runTitle ?? "Run"
  }

  if (entry.type === "topup") {
    return entry.auto ? "Auto top-up" : "Wallet top-up"
  }

  return entry.source === "trial" ? "Trial allowance" : "Monthly allowance"
}
