import { type Dispatch, type SetStateAction } from "react"
import { useMaterialRemoval } from "@/shared/console/materials/removal"
import { type TableSummary } from "@/shared/console/tables/types"

/** Lifecycle view states over the real pending/toast hook. No backend writes. */
export function useLifecycle(
  state: string,
  setRows: Dispatch<SetStateAction<TableSummary[]>>
) {
  async function outcome() {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    if (state.endsWith("-error")) {
      throw new Error("Could not update the table.")
    }
  }
  return useMaterialRemoval<TableSummary>({
    identify: (table) => table.tableId,
    noun: "table",
    remove: async (target) => {
      await outcome()
      // The live active list excludes archived rows as well as deleted rows.
      setRows((rows) => rows.filter((row) => row.tableId !== target.tableId))
    },
    restore: async (target) => {
      await outcome()
      setRows((rows) =>
        rows.map((row) =>
          row.tableId === target.tableId
            ? { ...row, archivedAt: undefined }
            : row
        )
      )
    },
  })
}
