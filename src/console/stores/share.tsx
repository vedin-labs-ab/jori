import { useMutation, usePaginatedQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { type Id } from "../../../convex/_generated/dataModel"
import { sharePageSize } from "../shared/materials/history"
import { MaterialLinksDialog } from "../shared/materials/links"

export function StoreLinksDialog({
  onOpenChange,
  open,
  organizationId,
  storeId,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  organizationId: string
  storeId: Id<"stores">
}) {
  const shares = usePaginatedQuery(
    api.stores.share.page,
    open ? { organizationId, storeId } : "skip",
    { initialNumItems: sharePageSize }
  )
  const create = useMutation(api.stores.share.create)
  const revoke = useMutation(api.stores.share.revoke)

  return (
    <MaterialLinksDialog
      noun="store"
      onMint={(expiresInHours) =>
        create({ organizationId, storeId, expiresInHours })
      }
      onOpenChange={onOpenChange}
      onRevoke={(share) =>
        revoke({ organizationId, storeId, shareId: share.shareId })
      }
      open={open}
      shares={shares}
    />
  )
}
