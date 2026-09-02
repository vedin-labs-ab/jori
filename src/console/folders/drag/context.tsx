import { useQuery } from "convex/react"
import { type ReactNode, useMemo } from "react"
import { FolderDragProvider } from "@/shared/console/folders/drag/provider"
import { useActiveOrganization } from "@/shared/session/auth"
import { api } from "../../../../convex/_generated/api"
import { useDropActions } from "./drop"

/** The console's drag surface: the shared provider over the organization's
 *  folder tree, with a drop running the backend move or re-file behind
 *  the audience confirmation. */
export function ConsoleFolderDrag({ children }: { children: ReactNode }) {
  const organizationId = useActiveOrganization().data?.id
  const folders = useFolderRows(organizationId)
  const drop = useDropActions(organizationId, folders)

  return (
    <FolderDragProvider folders={folders} onDrop={drop.run}>
      {children}
      {drop.dialog}
    </FolderDragProvider>
  )
}

/** The organization's folder tree, for drop planning and blocked rows.
 *  Convex shares the subscription with the sidebar's own tree query. */
function useFolderRows(organizationId: string | undefined) {
  const tree = useQuery(
    api.folders.console.tree,
    organizationId === undefined ? "skip" : { organizationId }
  )

  return useMemo(() => (tree?.status === "ready" ? tree.folders : []), [tree])
}
