import { useMutation, usePaginatedQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type Id } from "../../../../convex/_generated/dataModel"
import { sharePageSize } from "../../shared/materials/history"
import { MaterialLinksDialog } from "../../shared/materials/links"

export function TableLinksDialog({
  onOpenChange,
  open,
  organizationId,
  tableId,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  organizationId: string
  tableId: Id<"tables">
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
