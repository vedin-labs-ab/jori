import { useMutation, usePaginatedQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { sharePageSize } from "@/shared/console/materials/history"
import { MaterialLinksDialog } from "@/shared/console/materials/links"
import { api } from "../../../../convex/_generated/api"

export function TableLinksDialog({
  onOpenChange,
  open,
  organizationId,
  tableId,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  organizationId: string
  tableId: GenericId<"collections">
}) {
  const shares = usePaginatedQuery(
    api.tables.share.page,
    open ? { organizationId, tableId } : "skip",
    { initialNumItems: sharePageSize }
  )
  const create = useMutation(api.tables.share.create)
  const revoke = useMutation(api.tables.share.revoke)

  return (
    <MaterialLinksDialog
      noun="table"
      onMint={(expiresInHours) =>
        create({ organizationId, tableId, expiresInHours })
      }
      onOpenChange={onOpenChange}
      onRevoke={(share) =>
        revoke({ organizationId, tableId, shareId: share.shareId })
      }
      open={open}
      shares={shares}
    />
  )
}
