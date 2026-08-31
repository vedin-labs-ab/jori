import { usePaginatedQuery, useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
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
import { displayCellText } from "@/shared/cell"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { api } from "../../../convex/_generated/api"
import { useShareExpired } from "./link"
import { ShareShell, ShareUnavailable } from "./shell"

const rowPageSize = 50

type SharedTable = NonNullable<FunctionReturnType<typeof api.tables.share.get>>

/** Views a table through a share link or its public visibility, without a
 *  signed-in session. The secret rides along on every reactive read, so a
 *  revoked or expired link empties the page on its own; a public table
 *  needs no secret at all. */
export function TableShareView({
  secret,
  tableId,
}: {
  secret: string | null
  tableId: string
}) {
  const table = useQuery(api.tables.share.get, {
    tableId,
    secret: secret ?? undefined,
  })
  const isExpired = useShareExpired(table?.expiresAt)
  const openPath = `/tables/${encodeURIComponent(tableId)}`

  if (table === undefined) {
    return <FullscreenSkeletonLoader aria-label="Loading table" />
  }

  if (table === null || isExpired) {
    return <ShareUnavailable openPath={openPath} />
  }

  return (
    <ShareShell
      isPublic={table.access === "public"}
      name={table.name}
      openPath={openPath}
    >
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
  secret: string | null
  table: SharedTable
  tableId: string
}) {
  const rows = usePaginatedQuery(
    api.tables.share.rows,
    { tableId, secret: secret ?? undefined },
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
                <TableHead key={column.id}>{column.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.results.map((row) => (
              <TableRow key={row.rowId}>
                {table.columns.map((column) => (
                  <TableCell key={column.id}>
                    {displayCellText(row.values[column.id])}
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
