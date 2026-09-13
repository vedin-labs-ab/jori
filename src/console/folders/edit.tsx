import { useMutation, useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode } from "react"
import { FolderEditingProvider } from "@/shared/console/folders/edit/provider"
import { useActiveOrganization } from "@/shared/session/auth"
import { api } from "../../../convex/_generated/api"

export function ConsoleFolderEditing({ children }: { children: ReactNode }) {
  const organizationId = useActiveOrganization().data?.id
  const create = useMutation(api.folders.console.create)
  const rename = useMutation(api.folders.console.update)
  const tree = useQuery(
    api.folders.console.tree,
    organizationId === undefined ? "skip" : { organizationId }
  )
  if (organizationId === undefined) {
    return children
  }
  return (
    <FolderEditingProvider
      key={organizationId}
      folders={tree?.status === "ready" ? tree.folders : []}
      onCreate={(parentId) =>
        create({
          organizationId,
          parentId: parentId as GenericId<"folders"> | undefined,
        })
      }
      onRename={(folderId, name) =>
        rename({
          organizationId,
          folderId: folderId as GenericId<"folders">,
          name,
        })
      }
    >
      {children}
    </FolderEditingProvider>
  )
}
