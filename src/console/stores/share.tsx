import { useMutation, usePaginatedQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { sharePageSize } from "@/shared/console/materials/history"
import { MaterialLinksDialog } from "@/shared/console/materials/links"
import { api } from "../../../convex/_generated/api"

export function StoreLinksDialog({
  onOpenChange,
  open,
  organizationId,
  storeId,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  organizationId: string
  storeId: GenericId<"collections">
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
