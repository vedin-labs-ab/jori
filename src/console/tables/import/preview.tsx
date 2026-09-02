import { type TableColumn } from "@contracts/tables/columns"
import { FieldError } from "@/components/ui/field"
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
import { countLabel } from "@/shared/console/count"
import { columnTypeOptions } from "@/shared/console/tables/draft"
import { scrollFadeX } from "@/shared/fade"
import { type CsvRow, type CsvRowIssue, type CsvTablePlan } from "./infer"

const previewRowLimit = 5
const shownIssueLimit = 8

/** What the import will create: the deduced columns with their types, and
 *  a peek at the first rows — or the per-line issues blocking the file. */
export function ImportTablePreview({
  plan,
}: {
  plan: Exclude<CsvTablePlan, { status: "error" }>
}) {
  const rows = plan.status === "ready" ? plan.rows : []

  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-xs">
        {countLabel(plan.columns.length, "column")} deduced from the file. Types
        and required flags follow the data; you can adjust columns after the
        table is created.
      </p>
      <TableFrame className={cn(scrollFadeX, "max-h-64 overflow-auto")}>
        <Table>
          <TableHeader>
            <TableRow>
              {plan.columns.map((column) => (
                <ColumnHead column={column} key={column.id} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, previewRowLimit).map((row) => (
              <PreviewRow columns={plan.columns} key={row.line} row={row} />
            ))}
          </TableBody>
        </Table>
      </TableFrame>
      {plan.status === "ready" && plan.rows.length > previewRowLimit ? (
        <p className="text-muted-foreground text-xs">
          …and {countLabel(plan.rows.length - previewRowLimit, "more row")}.
        </p>
      ) : null}
      {plan.status === "invalid" ? (
        <ImportIssues issues={plan.issues} total={plan.total} />
      ) : null}
    </div>
  )
}

function ColumnHead({ column }: { column: TableColumn }) {
  const label = columnTypeOptions.find(
    (option) => option.value === column.type
  )?.label

  return (
    <TableHead className="whitespace-nowrap">
      <span className="block max-w-48 truncate font-medium">{column.name}</span>
      <span className="block font-normal text-muted-foreground text-xs">
        {label}
        {column.required === true ? " · required" : ""}
      </span>
    </TableHead>
  )
}

function PreviewRow({ columns, row }: { columns: TableColumn[]; row: CsvRow }) {
  return (
    <TableRow>
      {columns.map((column) => {
        const value = row.values[column.id]

        return (
          <TableCell
            className="max-w-48 truncate text-muted-foreground"
            key={column.id}
          >
            {value === undefined ? "" : String(value)}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

function ImportIssues({
  issues,
  total,
}: {
  issues: CsvRowIssue[]
  total: number
}) {
  return (
    <FieldError className="grid gap-1">
      <p>
        {issues.length} of {countLabel(total, "row")} cannot be imported. Fix
        the file and pick it again; nothing has been imported.
      </p>
      <ul className="grid list-disc gap-0.5 pl-4">
        {issues.slice(0, shownIssueLimit).map((issue) => (
          <li key={`${issue.line}-${issue.message}`}>
            Line {issue.line}: {issue.message}
          </li>
        ))}
      </ul>
      {issues.length > shownIssueLimit ? (
        <p>…and {issues.length - shownIssueLimit} more.</p>
      ) : null}
    </FieldError>
  )
}
