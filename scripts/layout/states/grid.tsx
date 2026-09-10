import { ConvexProvider, ConvexReactClient } from "convex/react"
import { type FunctionReference, getFunctionName } from "convex/server"
import { useEffect, useMemo, useState } from "react"
import { useRowWrites } from "@/console/tables/detail/rows"
import { tableRows, tableSummaries } from "@/landing/demo/derive/materials"
import { demoId } from "@/landing/demo/fixtures/ids"
import { useDemoWorkspace } from "@/landing/demo/workspace"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { useRowSelection } from "@/shared/console/list/selection"
import { RowGrid } from "@/shared/console/tables/grid"
import { type TableRow } from "@/shared/console/tables/types"
import { useColumnState } from "./column"

const ignore = () => undefined

function useGridData(state: string) {
  const workspace = useDemoWorkspace()
  const table = useMemo(
    () => tableSummaries(workspace.state)[0],
    [workspace.state]
  )
  const allRows = useMemo(() => {
    const seeds = tableRows(workspace.state, table.tableId)
    return Array.from({ length: 300 }, (_, index) => ({
      ...seeds[index % seeds.length],
      rowId: demoId("documents", `layout-${index}`),
    }))
  }, [table, workspace.state])
  const [rows, setRows] = useState(allRows.slice(0, 150))
  const [loading, setLoading] = useState(state === "grid-loading")
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(state !== "grid-more")
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1100)
    return () => clearTimeout(timer)
  }, [])
  return {
    exhausted,
    loading,
    loadingMore,
    rows,
    setRows,
    table,
    loadMore: () => {
      setLoadingMore(true)
      setTimeout(() => {
        setRows(allRows)
        setExhausted(true)
        setLoadingMore(false)
      }, 1100)
    },
  }
}

type GridData = ReturnType<typeof useGridData>

/** Actual write hooks, with only the local client's service call replaced. */
function localClient(state: string, setRows: GridData["setRows"]) {
  let attempts = 0
  const client = new ConvexReactClient("https://layout-fixture.invalid", {
    unsavedChangesWarning: false,
  })
  return Object.assign(client, {
    mutation: async (
      reference: FunctionReference<"mutation">,
      args: {
        rowId: string
        values: Record<string, unknown>
      }
    ) => {
      await new Promise((resolve) => setTimeout(resolve, 1100))
      attempts += 1
      if (attempts === 1 && state === "grid-conflict") {
        setRows((rows) =>
          rows.map((row) =>
            row.rowId === args.rowId
              ? { ...row, version: row.version + 1 }
              : row
          )
        )
        throw new Error("version conflict")
      }
      if (attempts === 1 && state === "grid-error") {
        throw new Error("Could not update the row.")
      }
      if (getFunctionName(reference).endsWith(":removeRow")) {
        setRows((rows) => rows.filter((row) => row.rowId !== args.rowId))
        return {}
      }
      setRows((rows) =>
        rows.map((row) =>
          row.rowId === args.rowId
            ? {
                ...row,
                values: { ...row.values, ...args.values },
                version: row.version + 1,
              }
            : row
        )
      )
      return {}
    },
  })
}

export function GridStates({ state }: { state: string }) {
  const data = useGridData(state)
  const [client] = useState(() => localClient(state, data.setRows))
  useEffect(
    () => () => {
      void client.close()
    },
    [client]
  )
  return (
    <ConvexProvider client={client}>
      <GridBody data={data} state={state} />
    </ConvexProvider>
  )
}

function GridBody({ data, state }: { data: GridData; state: string }) {
  const column = useColumnState(data.table, state)
  const writes = useRowWrites("layout-fixture", data.table.tableId)
  const selection = useRowSelection({
    identify: (row: TableRow) => row.rowId,
    rows: data.rows,
  })
  return (
    <ConsoleListLayout>
      <RowGrid
        columns={column.table.columns}
        disabled={false}
        freshRowId={undefined}
        isExhausted={data.exhausted}
        isLoading={data.loading}
        isLoadingMore={data.loadingMore}
        loadMore={data.loadMore}
        onAddColumn={column.create}
        onAddRow={ignore}
        onCommit={writes.updateCell}
        onDeleteRow={(row) => void writes.deleteRow(row)}
        onDuplicateRow={ignore}
        onFreshSettled={ignore}
        onInsertRow={ignore}
        onInspectColumn={column.inspect}
        pendingRowId={writes.pendingRowId}
        rows={data.rows}
        selection={selection}
      />
      {column.overlay}
    </ConsoleListLayout>
  )
}
