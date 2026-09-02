import { useConvex, useMutation } from "convex/react"
import { countNoun } from "@/shared/console/count"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { type RowSelection } from "@/shared/console/list/selection"
import {
  bulkMaterialRemovalSuccess,
  useMaterialRemoval,
} from "@/shared/console/materials/removal"
import { storeNoun } from "@/shared/console/stores/list/config"
import { type StoreSummary } from "@/shared/console/stores/types"
import { api } from "../../../convex/_generated/api"
import { exportStoreById } from "./export"

type StoreTarget = Pick<StoreSummary, "storeId" | "name" | "archivedAt">

export function useStoreRemoval(organizationId: string) {
  const remove = useMutation(api.stores.console.remove)
  const restore = useMutation(api.stores.console.restore)
  return useMaterialRemoval<StoreTarget>({
    identify: (store) => store.storeId,
    noun: "store",
    remove: (store) => remove({ organizationId, storeId: store.storeId }),
    restore: (store) => restore({ organizationId, storeId: store.storeId }),
  })
}

/** The selection bar's actions: each removes or exports per selected row,
 *  through the same mutations and exporter the row-level actions use. */
export function useStoreBulk(
  organizationId: string,
  selection: RowSelection<StoreSummary>
) {
  const convex = useConvex()
  const remove = useMutation(api.stores.console.remove)
  const runner = useBulkRunner()

  function removeSelected() {
    const rows = selection.selected

    void runner.run(
      rows,
      (row) => remove({ organizationId, storeId: row.storeId }),
      {
        noun: storeNoun.plural,
        success: bulkMaterialRemovalSuccess(rows, storeNoun),
        verb: "remove",
      }
    )
  }

  function downloadSelected() {
    const rows = selection.selected

    void runner.run(
      rows,
      (row) => exportStoreById(convex, organizationId, row.storeId),
      {
        intervalMs: 300,
        noun: storeNoun.plural,
        success: `Downloaded ${countNoun(rows.length, storeNoun)}.`,
        verb: "download",
      }
    )
  }

  return { downloadSelected, isBusy: runner.isBusy, removeSelected }
}
