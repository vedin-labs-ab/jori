import { type ListConfig } from "../../list/controls"
import { type FolderNames, folderFacet } from "../../materials/folders"
import { ownerFacet } from "../../materials/owners"
import { type TableSummary } from "../types"

export const tableNoun = { plural: "tables", singular: "table" }

/** What the table list headers sort and filter: the shared material facets
 *  plus this page's name, count, and time sorts. Owner options come from
 *  the listed rows themselves. */
export function tableListConfig(
  folders: FolderNames | undefined,
  tables: readonly TableSummary[]
): ListConfig<TableSummary> {
  return {
    facets: {
      folder: folderFacet(folders),
      owner: ownerFacet(tables),
    },
    sorts: {
      columns: (table) => table.columns.length,
      created: (table) => table.createdAt,
      name: (table) => table.name,
      rows: (table) => table.rowCount,
      updated: (table) => table.updatedAt,
    },
  }
}

/** What the create dialog says under its title. */

export const tableDeleteDescription =
  "This permanently deletes the table and every row in it. Anything that reads it loses access."
