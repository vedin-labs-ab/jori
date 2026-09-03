import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { EditFileDialog } from "@/shared/console/files/edit"
import { type FolderResource } from "@/shared/console/folders/types"
import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { api } from "../../../../convex/_generated/api"
import { useFileActions } from "../../files/manage"
import { OrganizationVisibilityDialog } from "../../shared/visibility/dialog"
import { EditStoreDialog } from "../../stores/edit"
import { EditTableDialog } from "../../tables/edit"

// Editing and sharing a filed resource asks for more than a listing row
// carries — a full audience, for one — so each kind resolves its own
// row through the query its own page already uses, and the dialog opens on
// what comes back. The resolved row is retained so closing animates out.

export type ResourceRequest = {
  kind: "access" | "edit"
  resource: FolderResource
}

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
    <>
      <EditTableDialog
        onOpenChange={closeOnDismiss(onClose)}
        organizationId={organizationId}
        table={request?.kind === "edit" ? table : undefined}
      />
      <OrganizationVisibilityDialog
        noun="table"
        onOpenChange={closeOnDismiss(onClose)}
        open={request?.kind === "access"}
        organizationId={organizationId}
        ownerId={table.ownerId}
        target={{ kind: "table", id: table.tableId }}
        value={table.visibility}
      />
    </>
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
    <>
      <EditStoreDialog
        onOpenChange={closeOnDismiss(onClose)}
        organizationId={organizationId}
        store={request?.kind === "edit" ? store : undefined}
      />
      <OrganizationVisibilityDialog
        noun="store"
        onOpenChange={closeOnDismiss(onClose)}
        open={request?.kind === "access"}
        organizationId={organizationId}
        ownerId={store.ownerId}
        target={{ kind: "store", id: store.storeId }}
        value={store.visibility}
      />
    </>
  )
}

function FileDialogs({ onClose, organizationId, request }: KindDialogs) {
  const actions = useFileActions(organizationId, { onSaved: onClose })
  const result = useQuery(
    api.files.console.get,
    request === undefined
      ? "skip"
      : { organizationId, fileId: request.resource.id as GenericId<"files"> }
  )
  const file = useRetained(
    result?.status === "ready" && result.file !== null ? result.file : undefined
  )

  if (file === undefined) {
    return null
  }

  return (
    <>
      <EditFileDialog
        file={request?.kind === "edit" ? file : undefined}
        isSaving={actions.pendingFileId !== undefined}
        onOpenChange={closeOnDismiss(onClose)}
        onSave={actions.saveFile}
      />
      <OrganizationVisibilityDialog
        noun="file"
        onOpenChange={closeOnDismiss(onClose)}
        open={request?.kind === "access"}
        organizationId={organizationId}
        ownerId={file.ownerId}
        target={{ kind: "file", id: file.fileId }}
        value={file.visibility}
      />
    </>
  )
}
