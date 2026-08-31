import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { ConsoleListContent, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListLoading } from "../shared/list/loading"
import { useMaterialTrail } from "../shared/materials/breadcrumb"
import { useLeaveDeletedFolder } from "./delete/leave"
import { FolderTitleMenu } from "./header"
import { type FolderDialogRequest, FolderDialogs } from "./manage"
import { type FolderDetail } from "./types"
import { UsageOverlay } from "./usage/overlay"
import { type UsageDays } from "./usage/types"

// The folder surface: one folder, resolved once, named in the breadcrumb
// with its own menu hanging off the name, with the lifecycle dialogs that
// menu opens and the usage panel it leads to. What is filed here is the
// page's own business, and arrives as children.

/** Resolves the folder a page is about and hands it over, replacing the
 *  whole view while it loads or when there is nothing to show. */
export function FolderFrame({
  children,
  folderId,
  usage,
}: {
  children: (
    folder: FolderDetail,
    organizationId: string,
    onNewFolder: () => void
  ) => ReactNode
  folderId: string
  /** The usage panel's window, while the URL holds it open. */
  usage: UsageDays | undefined
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <FolderResolver
          folderId={folderId as GenericId<"folders">}
          organizationId={organizationId}
          usage={usage}
        >
          {children}
        </FolderResolver>
      )}
    </ConsolePage>
  )
}

function FolderResolver({
  children,
  folderId,
  organizationId,
  usage,
}: {
  children: (
    folder: FolderDetail,
    organizationId: string,
    onNewFolder: () => void
  ) => ReactNode
  folderId: GenericId<"folders">
  organizationId: string
  usage: UsageDays | undefined
}) {
  const detail = useQuery(api.folders.console.get, { organizationId, folderId })
  const folder = detail?.status === "ready" ? detail.folder : undefined
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  // The page's own trail: deleting any folder on it takes this page too.
  const leaveDeletedFolder = useLeaveDeletedFolder(
    useMemo(
      () => folder?.path.map((segment) => segment.folderId) ?? [],
      [folder]
    )
  )

  useFolderCrumb(folder, setDialog)

  return (
    <ConsoleListLayout>
      <UsageOverlay
        days={usage}
        folderId={folderId}
        organizationId={organizationId}
      >
        {folder === undefined ? (
          <ConsoleListContent>
            <FolderFallback detail={detail} />
          </ConsoleListContent>
        ) : (
          children(folder, organizationId, () =>
            setDialog({ type: "create", parentId: folderId })
          )
        )}
      </UsageOverlay>
      <FolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        onDeleted={leaveDeletedFolder}
        organizationId={organizationId}
      />
    </ConsoleListLayout>
  )
}

/** The folder's header crumb: the /folders overview leads the trail — every
 *  material page starts from its parent surface — then the ancestor
 *  folders, then the folder itself, its name opening the folder's menu. */
function useFolderCrumb(
  folder: FolderDetail | undefined,
  onDialog: (request: FolderDialogRequest) => void
) {
  useMaterialTrail(
    useMemo(
      () =>
        folder === undefined
          ? undefined
          : {
              menu: <FolderTitleMenu folder={folder} onDialog={onDialog} />,
              name: folder.name,
              trail: [
                { name: "Folders", to: "/folders" },
                ...folder.path.slice(0, -1).map((segment) => ({
                  name: segment.name,
                  params: { folderId: segment.folderId },
                  to: "/folders/$folderId",
                })),
              ],
            },
      [folder, onDialog]
    )
  )
}

/** What stands in for the page before there is a folder to show it for. */
function FolderFallback({
  detail,
}: {
  detail: ReturnType<typeof useQuery<typeof api.folders.console.get>>
}) {
  if (detail === undefined) {
    return <ConsoleListLoading />
  }

  if (detail.status === "unauthorized") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the folder</AlertTitle>
        <AlertDescription>{detail.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert>
      <AlertTitle>Folder not found</AlertTitle>
      <AlertDescription>
        The folder may have been deleted or belongs to another organization.
      </AlertDescription>
    </Alert>
  )
}
