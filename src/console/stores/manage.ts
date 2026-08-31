import { useConvex, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { countNoun, useBulkRunner } from "../shared/list/bulk"
import { type ListConfig } from "../shared/list/controls"
import { type RowSelection } from "../shared/list/selection"
import { type FolderNames, folderFacet } from "../shared/materials/folders"
import { ownerFacet } from "../shared/materials/owners"
import {
  bulkMaterialRemovalSuccess,
  useMaterialRemoval,
} from "../shared/materials/removal"
import { exportStoreById } from "./export"
import { type StoreSummary } from "./types"

type StoreTarget = Pick<StoreSummary, "storeId" | "name" | "archivedAt">

export const storeNoun = { plural: "stores", singular: "store" }

/** What the store list headers sort and filter: the shared material facets
 *  plus this page's name, count, and time sorts. Owner options come from
 *  the listed rows themselves. */
export function storeListConfig(
  folders: FolderNames | undefined,
  stores: readonly StoreSummary[]
): ListConfig<StoreSummary> {
  return {
    facets: {
      folder: folderFacet(folders),
      owner: ownerFacet(stores),
    },
    sorts: {
      created: (store) => store.createdAt,
      name: (store) => store.name,
      // Schemaless stores sort together below every counted schema.
      properties: (store) => store.propertyCount ?? -1,
      updated: (store) => store.updatedAt,
      version: (store) => store.version,
    },
  }
}

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

export const storeDeleteDescription =
  "This permanently deletes the store and its stored value. Anything that reads it loses access."
