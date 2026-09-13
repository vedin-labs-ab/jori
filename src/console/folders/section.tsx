import { useQuery } from "convex/react"
import { useMemo, useState } from "react"
import { useFolderRequests } from "@/shared/console/folders/edit/state"
import { useFolderExpansion } from "@/shared/console/folders/expansion"
import { FolderTree } from "@/shared/console/folders/section"
import {
  activeFolderId,
  ancestorFolderIds,
} from "@/shared/console/folders/tree"
import {
  type CreationRequest,
  type FolderRow,
} from "@/shared/console/folders/types"
import { useActiveOrganization } from "@/shared/session/auth"
import { api } from "../../../convex/_generated/api"
import { CreationDialogs } from "./create/dialogs"
import { useLeaveDeletedFolder } from "./delete/leave"
import { FolderDialogs } from "./manage"

/** The sidebar's Folders section, bound to the active organization: its
 *  tree from Convex, and the lifecycle and creation dialogs the tree's
 *  rows raise. */
export function SidebarFolders({ pathname }: { pathname: string }) {
  const organizationId = useActiveOrganization().data?.id

  if (organizationId === undefined) {
    return null
  }

  return <FoldersGroup organizationId={organizationId} pathname={pathname} />
}

function FoldersGroup({
  organizationId,
  pathname,
}: {
  organizationId: string
  pathname: string
}) {
  const tree = useQuery(api.folders.console.tree, { organizationId })
  const folders = tree?.status === "ready" ? tree.folders : undefined
  const [dialog, setDialog] = useFolderRequests("sidebar")
  const [creation, setCreation] = useState<CreationRequest>()
  const activeId = activeFolderId(pathname)
  const expansion = useFolderExpansion(activeId, folders)
  const leaveDeletedFolder = useLeaveDeletedFolder(
    useViewedTrail(activeId, folders)
  )

  if (tree !== undefined && tree.status !== "ready") {
    return null
  }

  return (
    <>
      <FolderTree
        expansion={expansion}
        folders={folders}
        onCreate={setCreation}
        onDialog={setDialog}
        onNewFolder={() => setDialog({ type: "create" })}
        pathname={pathname}
      />
      <FolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        onDeleted={leaveDeletedFolder}
        organizationId={organizationId}
      />
      <CreationDialogs
        onClose={() => setCreation(undefined)}
        organizationId={organizationId}
        request={creation}
      />
    </>
  )
}

/** The open folder and its ancestors: deleting any of them takes the open
 *  folder with it, since a delete takes the whole subtree. */
function useViewedTrail(
  activeId: string | undefined,
  folders: FolderRow[] | undefined
) {
  return useMemo(
    () =>
      activeId === undefined
        ? []
        : [activeId, ...ancestorFolderIds(folders ?? [], activeId)],
    [activeId, folders]
  )
}
