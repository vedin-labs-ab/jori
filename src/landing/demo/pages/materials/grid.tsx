import { AskJoriAction } from "@/shared/console/chat/pane/ask"
import { countLabel } from "@/shared/console/count"
import {
  ConsoleListFooter,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import { MaterialHeaderActions } from "@/shared/console/materials/detail/header"
import { RowGrid } from "@/shared/console/tables/grid"
import { type TableDetail, type TableRow } from "@/shared/console/tables/types"
import { useDemoGrid } from "./rows"

/** The table's page body: the console's grid over the workspace under
 *  the header actions, with its row count in the footer. */
export function TableGrid({
  rows,
  table,
}: {
  rows: TableRow[]
  table: TableDetail
}) {
  const grid = useDemoGrid(table, rows)

  return (
    <ConsoleListLayout>
      <MaterialHeaderActions
        isExporting={false}
        onExport={() => undefined}
        onShare={grid.openShare}
      >
        <AskJoriAction target={{ kind: "table", id: table.tableId }} />
      </MaterialHeaderActions>
      <RowGrid {...grid.props} />
      <ConsoleListFooter>
        <p className="text-muted-foreground text-xs">
          {countLabel(rows.length, "row")}
        </p>
      </ConsoleListFooter>
      {grid.overlays}
    </ConsoleListLayout>
  )
}
