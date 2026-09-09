import { type GenericId } from "convex/values"
import { lazy } from "react"
import { useMaterialMode } from "@/console/frame/mode"
import { useShareSecret } from "@/shared/share/link"
import { TableShareView } from "@/shared/share/table"

/** Lazy so anonymous share-link visitors do not download the member console
 *  graph after the section frame establishes that there is no member. */
const TableView = lazy(() =>
  import("@/console/tables/detail").then((module) => ({
    default: module.TableView,
  }))
)

export function TableAccess({ tableId }: { tableId: string }) {
  const mode = useMaterialMode()
  const secret = useShareSecret() ?? null

  if (mode === "share") {
    return <TableShareView secret={secret} tableId={tableId} />
  }

  return (
    <TableView
      fallback={
        secret === null ? undefined : (
          <TableShareView secret={secret} tableId={tableId} />
        )
      }
      tableId={tableId as GenericId<"collections">}
    />
  )
}
