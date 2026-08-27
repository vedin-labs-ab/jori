import { usePaginatedQuery, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { api } from "../../../convex/_generated/api"
import { displayCellText } from "./cells"
import { useShareExpired } from "./share"
import { ShareShell, ShareUnavailable } from "./shell"

const rowPageSize = 50

type SharedTable = NonNullable<
  ReturnType<typeof useQuery<typeof api.tables.share.get>>
>

/** Views a table through a share link, without a signed-in session. The
 *  secret rides along on every reactive read, so a revoked or expired link
 *  empties the page on its own. */
export function TableShareView({
  secret,
  tableId,
}: {
  secret: string
  tableId: string
}) {
  const table = useQuery(api.tables.share.get, { tableId, secret })
  const isExpired = useShareExpired(table?.expiresAt)
  const openPath = `/tables/${encodeURIComponent(tableId)}`

  if (table === undefined) {
    return <FullscreenSkeletonLoader aria-label="Loading table" />
  }

  if (table === null || isExpired) {
    return <ShareUnavailable openPath={openPath} />
  }

  return (
    <ShareShell name={table.name} openPath={openPath}>
      {table.description === undefined ? null : (
        <p className="text-muted-foreground text-sm">{table.description}</p>
      )}
      <SharedRows secret={secret} table={table} tableId={tableId} />
    </ShareShell>
  )
}

function SharedRows({
  secret,
  table,
  tableId,
}: {
  secret: string
  table: SharedTable
  tableId: string
}) {
  const rows = usePaginatedQuery(
    api.tables.share.rows,
    { tableId, secret },
    { initialNumItems: rowPageSize }
  )

  if (rows.status === "LoadingFirstPage") {
    return <FullscreenSkeletonLoader aria-label="Loading rows" />
  }

  if (rows.results.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">This table has no rows.</p>
    )
  }

  return (
    <>
      <TableFrame>
        <Table>
          <TableHeader>
            <TableRow>
              {table.columns.map((column) => (
                <TableHead key={column.key}>{column.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.results.map((row) => (
              <TableRow key={row.rowId}>
                {table.columns.map((column) => (
                  <TableCell key={column.key}>
                    {displayCellText(column, row.values[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>
      {rows.status === "Exhausted" ? null : (
        <div className="flex justify-center">
          <Button
            disabled={rows.status === "LoadingMore"}
            onClick={() => rows.loadMore(rowPageSize)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {rows.status === "LoadingMore" ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      )}
    </>
  )
}
