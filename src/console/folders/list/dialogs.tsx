import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useFile } from "@/console/files/query"
import { type FolderResource } from "@/shared/console/folders/types"
import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { api } from "../../../../convex/_generated/api"
import { ConversationVisibility } from "../../chat/filing/access"
import { OrganizationVisibilityDialog } from "../../shared/visibility/dialog"

// Sharing a filed resource asks for more than a listing row carries — a
// full audience — so each kind resolves its own row through the query its
// own page already uses, and the dialog opens on what comes back. The
// resolved row is retained so closing animates out. Renaming needs none of
// this: a row is renamed in place.

/** The resource whose audience is being set. */
export type ResourceRequest = { resource: FolderResource }

export function FolderResourceDialogs({
  onClose,
  organizationId,
  request,
}: {
  onClose: () => void
  organizationId: string
  request: ResourceRequest | undefined
}) {
  return (
    <>
      <TableDialogs
        onClose={onClose}
        organizationId={organizationId}
        request={requestFor(request, "table")}
      />
      <StoreDialogs
        onClose={onClose}
        organizationId={organizationId}
        request={requestFor(request, "store")}
      />
      <FileDialogs
        onClose={onClose}
        organizationId={organizationId}
        request={requestFor(request, "file")}
      />
      <ChatDialog
        onClose={onClose}
        organizationId={organizationId}
        request={requestFor(request, "chat")}
      />
    </>
  )
}

function requestFor(
  request: ResourceRequest | undefined,
  type: FolderResource["type"]
) {
  return request?.resource.type === type ? request : undefined
}

type KindDialogs = {
  onClose: () => void
  organizationId: string
  request: ResourceRequest | undefined
}

function ChatDialog({ onClose, organizationId, request }: KindDialogs) {
  const resource = useRetained(request?.resource)

  return resource === undefined ? null : (
    <ConversationVisibility
      conversationId={resource.id as GenericId<"conversations">}
      key={resource.id}
      onClose={onClose}
      open={request !== undefined}
      organizationId={organizationId}
    />
  )
}

function TableDialogs({ onClose, organizationId, request }: KindDialogs) {
  const result = useQuery(
    api.tables.console.get,
    request === undefined
      ? "skip"
      : {
          organizationId,
          tableId: request.resource.id as GenericId<"collections">,
        }
  )
  const table = useRetained(
    result?.status === "ready" && result.table !== null
      ? result.table
      : undefined
  )

  if (table === undefined) {
    return null
  }

  return (
    <OrganizationVisibilityDialog
      noun="table"
      onOpenChange={closeOnDismiss(onClose)}
      open={request !== undefined}
      organizationId={organizationId}
      ownerId={table.ownerId}
      target={{ kind: "table", id: table.tableId }}
      value={table.visibility}
    />
  )
}

function StoreDialogs({ onClose, organizationId, request }: KindDialogs) {
  const result = useQuery(
    api.stores.console.get,
    request === undefined
      ? "skip"
      : {
          organizationId,
          storeId: request.resource.id as GenericId<"collections">,
        }
  )
  const store = useRetained(
    result?.status === "ready" && result.store !== null
      ? result.store
      : undefined
  )

  if (store === undefined) {
    return null
  }

  return (
    <OrganizationVisibilityDialog
      noun="store"
      onOpenChange={closeOnDismiss(onClose)}
      open={request !== undefined}
      organizationId={organizationId}
      ownerId={store.ownerId}
      target={{ kind: "store", id: store.storeId }}
      value={store.visibility}
    />
  )
}

function FileDialogs({ onClose, organizationId, request }: KindDialogs) {
  const result = useFile(organizationId, request?.resource.id)
  const file = useRetained(
    result?.status === "ready" && result.file !== null ? result.file : undefined
  )

  if (file === undefined) {
    return null
  }

  return (
    <OrganizationVisibilityDialog
      noun="file"
      onOpenChange={closeOnDismiss(onClose)}
      open={request !== undefined}
      organizationId={organizationId}
      ownerId={file.ownerId}
      target={{ kind: "file", id: file.fileId }}
      value={file.visibility}
    />
  )
}
