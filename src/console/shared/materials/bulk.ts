import { useState } from "react"
import { toast } from "sonner"
import { type CountedNoun, countNoun } from "@/shared/console/count"
import { showErrorToast } from "@/shared/console/error"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { type RowSelection } from "@/shared/console/list/selection"

/** Removes selected rows individually. Downloads may use one archive for
 * the selection or the same exporter as each row's menu. */
export function useMaterialBulk<Row>({
  download,
  downloadAll,
  noun,
  remove,
  removal,
  selection,
}: {
  download: (row: Row) => Promise<unknown>
  downloadAll?: (rows: Row[]) => Promise<unknown>
  noun: CountedNoun
  remove: (row: Row) => Promise<unknown>
  removal: { success: (rows: Row[]) => string; verb: string }
  selection: RowSelection<Row>
}) {
  const runner = useBulkRunner()
  const [isDownloading, setIsDownloading] = useState(false)

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

    if (downloadAll) {
      setIsDownloading(true)
      void downloadAll(rows)
        .then(() =>
          toast.success(`Download ready for ${countNoun(rows.length, noun)}.`)
        )
        .catch((error: unknown) =>
          showErrorToast(
            error,
            `Could not download the selected ${noun.plural}.`
          )
        )
        .finally(() => setIsDownloading(false))
      return
    }

    void runner.run(rows, download, {
      intervalMs: 300,
      noun: noun.plural,
      success: `Downloaded ${countNoun(rows.length, noun)}.`,
      verb: "download",
    })
  }

  return {
    downloadSelected,
    isBusy: runner.isBusy || isDownloading,
    removeSelected,
  }
}
