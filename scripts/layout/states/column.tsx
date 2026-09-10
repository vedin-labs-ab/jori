import { useEffect, useRef, useState } from "react"
import { useColumnSheetForm } from "@/shared/console/tables/column"
import {
  ColumnSheet,
  type ColumnSheetState,
} from "@/shared/console/tables/sheet"
import {
  type TableColumn,
  type TableDetail,
} from "@/shared/console/tables/types"

export function useColumnState(table: TableDetail, state: string) {
  const [current, setCurrent] = useState(table)
  const [sheet, setSheet] = useState<ColumnSheetState>()
  const attempts = useRef(0)
  const close = (open: boolean) => {
    if (!open) {
      setSheet(undefined)
    }
  }
  const form = useColumnSheetForm({
    onOpenChange: close,
    onSave: async (columns) => {
      await new Promise((resolve) => setTimeout(resolve, 1100))
      attempts.current += 1
      if (state === "grid-column-error" && attempts.current === 1) {
        throw new Error("Could not save the column.")
      }
      setCurrent((previous) => ({ ...previous, columns }))
    },
    state: sheet,
    table: current,
  })
  useEffect(() => {
    const receive = (event: KeyboardEvent) => {
      if (event.key === "F8" && state === "grid-column-removed") {
        setTimeout(
          () =>
            setCurrent((previous) => ({
              ...previous,
              columns: previous.columns.slice(1),
            })),
          1100
        )
      }
    }
    window.addEventListener("keydown", receive)
    return () => window.removeEventListener("keydown", receive)
  }, [state])
  return {
    table: current,
    inspect: (column: TableColumn) => setSheet({ mode: "edit", id: column.id }),
    create: () => setSheet({ mode: "create" }),
    overlay: (
      <ColumnSheet
        form={form}
        onOpenChange={close}
        state={sheet}
        table={current}
      />
    ),
  }
}
