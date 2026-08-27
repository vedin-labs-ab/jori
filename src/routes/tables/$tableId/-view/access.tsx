import { type GenericId } from "convex/values"
import { lazy } from "react"
import { MaterialAccess } from "@/shared/materials/access"
import { TableShareView } from "@/shared/materials/table"

/** Lazy so anonymous share-link visitors do not download the member console
 *  graph after the session check establishes that there is no member. */
const TableView = lazy(() =>
  import("@/console/tables/detail").then((module) => ({
    default: module.TableView,
  }))
)

export function TableAccess({
  secret,
  tableId,
}: {
  secret: string | null
  tableId: string
}) {
  return (
    <MaterialAccess
      label="Loading table"
      renderMember={(fallback) => (
        <TableView
          fallback={fallback}
          tableId={tableId as GenericId<"tables">}
        />
      )}
      renderShare={() =>
        secret === null ? null : (
          <TableShareView secret={secret} tableId={tableId} />
        )
      }
      secret={secret}
    />
  )
}
