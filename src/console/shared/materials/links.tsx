import { useMutation, usePaginatedQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { sharePageSize } from "@/shared/console/materials/history"
import { MaterialLinksDialog as LinksDialog } from "@/shared/console/materials/links"
import { api } from "../../../../convex/_generated/api"

type ShareTarget =
  | { kind: "file"; id: GenericId<"files"> }
  | { kind: "store" | "table"; id: GenericId<"collections"> }

const shareApi = {
  file: api.files.share,
  store: api.stores.share,
  table: api.tables.share,
}

/** Bind the material's share history and actions to its existing endpoints. */
export function MaterialLinksDialog({
  onOpenChange,
  open,
  organizationId,
  target,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  organizationId: string
  target: ShareTarget
}) {
  const functions = shareApi[target.kind]
  const args = {
    organizationId,
    ...(target.kind === "file"
      ? { fileId: target.id }
      : target.kind === "store"
        ? { storeId: target.id }
        : { tableId: target.id }),
  }
  const shares = usePaginatedQuery(functions.page, open ? args : "skip", {
    initialNumItems: sharePageSize,
  })
  const create = useMutation(functions.create)
  const revoke = useMutation(functions.revoke)

  return (
    <LinksDialog
      noun={target.kind}
      onMint={(expiresInHours) => create({ ...args, expiresInHours })}
      onOpenChange={onOpenChange}
      onRevoke={(share) => revoke({ ...args, shareId: share.shareId })}
      open={open}
      shares={shares}
    />
  )
}
