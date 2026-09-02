import { type CountedNoun, countNoun } from "@/shared/console/count"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { type RowSelection } from "@/shared/console/list/selection"

/** The selection bar's actions: each removes or downloads per selected row,
 *  through the same mutation and exporter the row-level actions use. */
export function useMaterialBulk<Row>({
  download,
  noun,
  remove,
  removal,
  selection,
}: {
  download: (row: Row) => Promise<unknown>
  noun: CountedNoun
  remove: (row: Row) => Promise<unknown>
  removal: { success: (rows: Row[]) => string; verb: string }
  selection: RowSelection<Row>
}) {
  const runner = useBulkRunner()

  function removeSelected() {
    const rows = selection.selected

    void runner.run(rows, remove, {
      noun: noun.plural,
      success: removal.success(rows),
      verb: removal.verb,
    })
  }

  function downloadSelected() {
    const rows = selection.selected

    void runner.run(rows, download, {
      intervalMs: 300,
      noun: noun.plural,
      success: `Downloaded ${countNoun(rows.length, noun)}.`,
      verb: "download",
    })
  }

  return { downloadSelected, isBusy: runner.isBusy, removeSelected }
}
