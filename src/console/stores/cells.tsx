import { Link } from "@tanstack/react-router"
import { Braces, Database, History, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { countLabel } from "@/lib/count"
import { MaterialOwnerCell } from "../shared/materials/owner"
import { MaterialScopeBadge } from "../shared/materials/scope"
import { type StoreSummary } from "./types"

/** Name column: the store icon, a link to the store, and the list's badge
 *  conventions — a scope badge for personal stores, an archived badge for
 *  archived ones. Organization stores carry no scope badge. */
export function StoreNameCell({ store }: { store: StoreSummary }) {
  return (
    <div className="grid gap-0.5">
      <div className="flex items-center gap-2">
        <Database
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <Link
          className="truncate font-medium hover:underline"
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
      </div>
      {store.description === undefined ? null : (
        <p
          className="truncate pl-6 text-muted-foreground"
          title={store.description}
        >
          {store.description}
        </p>
      )}
    </div>
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
