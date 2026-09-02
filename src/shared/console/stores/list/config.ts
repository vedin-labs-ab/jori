import { type ListConfig } from "../../list/controls"
import { type FolderNames, folderFacet } from "../../materials/folders"
import { ownerFacet } from "../../materials/owners"
import { type StoreSummary } from "../types"

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

export const storeDeleteDescription =
  "This permanently deletes the store and its stored value. Anything that reads it loses access."

export const storeEditBlurb = "Rename the store or update its description."
