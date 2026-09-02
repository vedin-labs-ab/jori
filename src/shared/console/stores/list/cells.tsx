import { Braces, Database, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { countLabel } from "@/shared/console/count"
import { MaterialMeasureCell } from "@/shared/console/materials/cells/measure"
import {
  MaterialNameCell,
  materialNameLinkClassName,
} from "@/shared/console/materials/cells/name"
import { VisibilityMark } from "@/shared/console/visibility/badge"
import { ConsoleLink } from "../../shell/link"
import { type StoreSummary } from "../types"

/** Name column: the store icon, a link to the store, and the list's badge
 *  conventions — a scope badge for personal stores, an archived badge for
 *  archived ones. Organization stores carry no scope badge. */
export function StoreNameCell({ store }: { store: StoreSummary }) {
  return (
    <MaterialNameCell icon={Database}>
      <ConsoleLink
        className={materialNameLinkClassName}
        params={{ storeId: store.storeId }}
        title={store.name}
        to="/stores/$storeId"
      >
        {store.name}
      </ConsoleLink>
      {store.visibility.mode === "organization" ? null : (
        <VisibilityMark visibility={store.visibility} />
      )}
      {store.archivedAt === undefined ? null : (
        <Badge variant="secondary">Archived</Badge>
      )}
    </MaterialNameCell>
  )
}

/** Properties column: a small icon and how many leaf properties — actual
 *  writable value slots — the store's schema declares, however deeply they
 *  nest. A store without a schema shows an em dash. */
export function StorePropertiesCell({ store }: { store: StoreSummary }) {
  return (
    <MaterialMeasureCell
      icon={Braces}
      label={
        store.propertyCount === undefined
          ? "No schema"
          : countLabel(store.propertyCount, "property")
      }
      value={store.propertyCount ?? "—"}
    />
  )
}

/** Version column: the value's write count. v0 honestly means the store has
 *  never been written. */
export function StoreVersionCell({ store }: { store: StoreSummary }) {
  return (
    <MaterialMeasureCell
      icon={History}
      label={countLabel(store.version, "write")}
      value={`v${store.version}`}
    />
  )
}
