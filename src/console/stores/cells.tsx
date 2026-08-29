import { Link } from "@tanstack/react-router"
import { Braces, Database, History, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { countLabel } from "@/lib/count"
import {
  MaterialNameCell,
  materialNameLinkClassName,
} from "../shared/materials/cells/name"
import { MaterialOwnerCell } from "../shared/materials/cells/owner"
import { MaterialScopeBadge } from "../shared/materials/scope"
import { type StoreSummary } from "./types"

/** Name column: the store icon, a link to the store, and the list's badge
 *  conventions — a scope badge for personal stores, an archived badge for
 *  archived ones. Organization stores carry no scope badge. */
export function StoreNameCell({ store }: { store: StoreSummary }) {
  return (
    <MaterialNameCell description={store.description} icon={Database}>
      <Link
        className={materialNameLinkClassName}
        params={{ storeId: store.storeId }}
        title={store.name}
        to="/stores/$storeId"
      >
        {store.name}
      </Link>
      {store.scope === "personal" ? (
        <MaterialScopeBadge scope="personal" />
      ) : null}
      {store.archivedAt === undefined ? null : (
        <Badge variant="secondary">Archived</Badge>
      )}
    </MaterialNameCell>
  )
}

/** Properties column: a small icon and how many top-level properties the
 *  store's schema declares. */
export function StorePropertiesCell({ store }: { store: StoreSummary }) {
  return (
    <IconValueCell
      icon={Braces}
      label={countLabel(store.propertyCount, "property")}
      value={store.propertyCount}
    />
  )
}

/** Version column: the value's write count. v0 honestly means the store has
 *  never been written. */
export function StoreVersionCell({ store }: { store: StoreSummary }) {
  return (
    <IconValueCell
      icon={History}
      label={countLabel(store.version, "write")}
      value={`v${store.version}`}
    />
  )
}

/** Owner column: the creating person, or Jori itself when no named owner
 *  resolves — the organization-principal run case. */
export function StoreOwnerCell({ store }: { store: StoreSummary }) {
  const owner =
    store.ownerName === undefined
      ? ({ kind: "jori" } as const)
      : ({ kind: "person", name: store.ownerName } as const)

  return <MaterialOwnerCell owner={owner} />
}

function IconValueCell({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string | number
}) {
  return (
    <div
      className="flex items-center gap-1.5 text-muted-foreground"
      title={label}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {value}
      <span className="sr-only">{label}</span>
    </div>
  )
}
