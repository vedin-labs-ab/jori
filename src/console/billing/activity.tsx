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
import { ArrowUpDown } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
 * a search over descriptions, and a source filter. Rows written before
 * attribution existed simply leave those cells blank.
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
        <>
          <ActivityToolbar table={table} />
          <ActivityTable table={table} />
        </>
      )}
    </section>
  )
}

type ActivityTableInstance = ReturnType<typeof useReactTable<ActivityRow>>

function ActivityToolbar({ table }: { table: ActivityTableInstance }) {
  const search = table.getColumn("label")
  const source = table.getColumn("source")

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Input
        className="h-8 w-56"
        onChange={(event) => search?.setFilterValue(event.target.value)}
        placeholder="Search activity"
        value={(search?.getFilterValue() as string) ?? ""}
      />
      <Select
        onValueChange={(value) =>
          source?.setFilterValue(value === "all" ? undefined : value)
        }
        value={(source?.getFilterValue() as string) ?? "all"}
      >
        <SelectTrigger className="w-36" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {sources.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ActivityTable({ table }: { table: ActivityTableInstance }) {
  return (
    <Table className="mt-2">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
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
  return (
    <Button
      className={`-ml-3 h-8 ${align === "right" ? "-mr-3 ml-0 float-right" : ""}`}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      size="sm"
      variant="ghost"
    >
      {children}
      <ArrowUpDown />
    </Button>
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
    header: "Source",
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
