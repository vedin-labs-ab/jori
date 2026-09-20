import { availableFolderName } from "@contracts/folders/name"
import { useMutation, useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode } from "react"
import { type EditPersistence } from "@/shared/console/edit/controller"
import { EditingProvider } from "@/shared/console/edit/provider"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { useActiveOrganization } from "@/shared/session/auth"
import { api } from "../../convex/_generated/api"

/** One create-and-rename session, bound to each kind's existing mutations. */
export function ConsoleEditing({ children }: { children: ReactNode }) {
  const organizationId = useActiveOrganization().data?.id
  return organizationId === undefined ? (
    children
  ) : (
    <BoundEditing organizationId={organizationId}>{children}</BoundEditing>
  )
}
function BoundEditing({
  organizationId,
  children,
}: {
  organizationId: string
  children: ReactNode
}) {
  const persistence = usePersistence(organizationId)
  return (
    <EditingProvider {...persistence} scope={organizationId}>
      {children}
    </EditingProvider>
  )
}
function usePersistence(organizationId: string): EditPersistence {
  const changes = useChanges(organizationId)
  const navigate = useConsoleNavigate()
  const tree = useQuery(api.folders.console.tree, { organizationId })
  return {
    ...changes,
    name: (kind, parentId) =>
      kind === "folder"
        ? availableFolderName(
            (tree?.status === "ready" ? tree.folders : [])
              .filter((f) => f.parentId === parentId)
              .map((f) => f.name)
          )
        : `New ${kind}`,
    onReveal: (_kind, folderId) =>
      navigate(
        folderId === undefined
          ? { to: "/folders" }
          : { to: "/folders/$folderId", params: { folderId } }
      ),
  }
}
function useChanges(
  organizationId: string
): Pick<EditPersistence, "onCreate" | "onRename"> {
  const folderCreate = useMutation(api.folders.console.create)
  const folderRename = useMutation(api.folders.console.update)
  const tableCreate = useMutation(api.tables.console.create)
  const tableRename = useMutation(api.tables.console.update)
  const storeCreate = useMutation(api.stores.console.create)
  const storeRename = useMutation(api.stores.console.update)
  const fileRename = useMutation(api.files.console.update)
  return {
    onCreate: async (kind, parentId) => {
      const folderId = parentId as GenericId<"folders"> | undefined
      if (kind === "folder") {
        const folder = await folderCreate({
          organizationId,
          parentId: folderId,
        })
        return { id: folder.folderId, kind, name: folder.name, parentId }
      }
      const args = {
        organizationId,
        folderId,
        visibility: { mode: "organization" as const },
      }
      if (kind === "table") {
        const table = await tableCreate(args)
        return {
          id: table.tableId,
          kind,
          name: table.name,
          parentId,
          table: table,
        }
      }
      const store = await storeCreate(args)
      return {
        id: store.storeId,
        kind,
        name: store.name,
        parentId,
        store: { ...store, version: 0 },
      }
    },
    onRename: (item, name) => {
      if (item.kind === "folder") {
        return folderRename({
          organizationId,
          folderId: item.id as GenericId<"folders">,
          name,
        })
      }
      if (item.kind === "file") {
        return fileRename({
          organizationId,
          fileId: item.id as GenericId<"files">,
          name,
        })
      }
      const id = item.id as GenericId<"collections">
      return item.kind === "table"
        ? tableRename({ organizationId, tableId: id, name })
        : storeRename({ organizationId, storeId: id, name })
    },
  }
}
