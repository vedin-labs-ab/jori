import { MenuProvenance } from "@/shared/console/menu/provenance"
import { countLabel } from "../count"
import { summaryOwner } from "../materials/owners"
import { type TableSummary } from "./types"

/** The table's own first lines for its title menu: whose it is, how fresh
 *  it is, and how much it holds. */
export function TableLead({
  table,
}: {
  table: Pick<
    TableSummary,
    "ownerImage" | "ownerName" | "rowCount" | "updatedAt"
  >
}) {
  return (
    <MenuProvenance
      detail={countLabel(table.rowCount, "row")}
      owner={summaryOwner(table)}
      updatedAt={table.updatedAt}
    />
  )
}
