import { useConvex, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { countNoun, useBulkRunner } from "../shared/list/bulk"
import { type ListConfig } from "../shared/list/controls"
import { scopeFacet } from "../shared/list/scope"
import { type RowSelection } from "../shared/list/selection"
import { statusFacet } from "../shared/materials/archive"
import { type FolderNames, folderFacet } from "../shared/materials/folders"
import {
  bulkMaterialRemovalSuccess,
  useMaterialRemoval,
} from "../shared/materials/removal"
import { exportStoreById } from "./export"
import { type StoreSummary } from "./types"

type StoreTarget = Pick<StoreSummary, "storeId" | "name" | "archivedAt">

export const storeNoun = { plural: "stores", singular: "store" }

/** What the store list headers sort and filter: the shared material facets
 *  plus this page's name, count, and time sorts. */
export function storeListConfig(
  folders: FolderNames | undefined
): ListConfig<StoreSummary> {
  return {
    facets: {
      folder: folderFacet(folders),
      scope: scopeFacet,
      status: statusFacet,
    },
    sorts: {
      created: (store) => store.createdAt,
      name: (store) => store.name,
      properties: (store) => store.propertyCount,
      updated: (store) => store.updatedAt,
      version: (store) => store.version,
    },
  }
}

export function useStoreRemoval(organizationId: string) {
  const remove = useMutation(api.stores.console.remove)
  const restore = useMutation(api.stores.console.restore)
  const removal = useMaterialRemoval<StoreTarget>({
    identify: (store) => store.storeId,
    noun: "store",
    remove: (store) => remove({ organizationId, storeId: store.storeId }),
    restore: (store) => restore({ organizationId, storeId: store.storeId }),
  })

  return {
    removeStore: removal.removeMaterial,
    removingStoreId: removal.removingId,
    restoreStore: removal.restoreMaterial,
    restoringStoreId: removal.restoringId,
  }
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

export const storeDeleteDescription =
  "This permanently deletes the store, its schema, and its stored value. Anything that reads it loses access."
