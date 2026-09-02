import { useMutation, usePaginatedQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { sharePageSize } from "@/shared/console/materials/history"
import { MaterialLinksDialog } from "@/shared/console/materials/links"
import { api } from "../../../convex/_generated/api"

export function FileLinksDialog({
  fileId,
  onOpenChange,
  open,
  organizationId,
}: {
  fileId: GenericId<"files">
  onOpenChange: (open: boolean) => void
  open: boolean
  organizationId: string
}) {
  const shares = usePaginatedQuery(
    api.files.share.page,
    open ? { organizationId, fileId } : "skip",
    { initialNumItems: sharePageSize }
  )
  const create = useMutation(api.files.share.create)
  const revoke = useMutation(api.files.share.revoke)

  return (
    <MaterialLinksDialog
      noun="file"
      onMint={(expiresInHours) =>
        create({ organizationId, fileId, expiresInHours })
      }
      onOpenChange={onOpenChange}
      onRevoke={(share) =>
        revoke({ organizationId, fileId, shareId: share.shareId })
      }
      open={open}
      shares={shares}
    />
  )
}
