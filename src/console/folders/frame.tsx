import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useMemo } from "react"
import { folderBreadcrumb } from "@/shared/console/folders/breadcrumb"
import { useFolderRequests } from "@/shared/console/folders/edit/state"
import {
  type FolderDetail,
  type FolderDialogRequest,
} from "@/shared/console/folders/types"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { MaterialPlaceholder } from "@/shared/console/materials/detail/placeholder"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { useLeaveDeletedFolder } from "./delete/leave"
import { FolderDialogs } from "./manage"
import { FolderUsageHint } from "./usage/hint"

// The folder surface: one folder, resolved once, placed in the breadcrumb,
// with the lifecycle dialogs its menu opens. What each page makes of the
// folder is its own business, and arrives as children.

/** Which of the folder's pages is being framed — the crumb ends at the
 *  folder itself, or carries on to what it costs. */
type FolderView = "contents" | "usage"

/** What a framed folder page is handed: the folder itself, the organization
 *  it belongs to, and the two ways into the dialogs the frame hosts. */
export type FramedFolder = {
  folder: FolderDetail
  onDialog: (request: FolderDialogRequest) => void
  onNewFolder: () => void
  organizationId: string
}

/** Resolves the folder a page is about and hands it over, replacing the
 *  whole view while it loads or when there is nothing to show. */
export function FolderFrame({
  children,
  folderId,
  suffix,
  view,
}: {
  children: (framed: FramedFolder) => ReactNode
  /** What follows the usage page's name in its crumb, when it has a mark
   *  to hang there. Given the organization, which the crumb's home in the
   *  shell header cannot read from context. */
  suffix?: (organizationId: string) => ReactNode
  folderId: string
  view: FolderView
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <FolderResolver
          folderId={folderId as GenericId<"folders">}
          organizationId={organizationId}
          suffix={suffix}
          view={view}
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
  suffix,
  view,
}: {
  children: (framed: FramedFolder) => ReactNode
  folderId: GenericId<"folders">
  organizationId: string
  suffix?: (organizationId: string) => ReactNode
  view: FolderView
}) {
  const detail = useQuery(api.folders.console.get, { organizationId, folderId })
  const folder = detail?.status === "ready" ? detail.folder : undefined
  const [dialog, setDialog] = useFolderRequests("contents")
  // The page's own trail: deleting any folder on it takes this page too.
  const leaveDeletedFolder = useLeaveDeletedFolder(
    useMemo(
      () => folder?.path.map((segment) => segment.folderId) ?? [],
      [folder]
    )
  )

  useMaterialTrail(
    useMemo(
      () =>
        folder === undefined
          ? undefined
          : folderBreadcrumb({
              folder,
              onDialog: setDialog,
              view,
              suffix: view === "usage" ? suffix?.(organizationId) : undefined,
              aside: (
                <FolderUsageHint
                  folderId={folder.folderId as GenericId<"folders">}
                  organizationId={organizationId}
                />
              ),
            }),
      [folder, setDialog, organizationId, suffix, view]
    )
  )

  return (
    <ConsoleListLayout>
      {folder === undefined ? (
        <FolderFallback detail={detail} />
      ) : (
        children({
          folder,
          onDialog: setDialog,
          onNewFolder: () => setDialog({ type: "create", parentId: folderId }),
          organizationId,
        })
      )}
      <FolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        onDeleted={leaveDeletedFolder}
        organizationId={organizationId}
      />
    </ConsoleListLayout>
  )
}

function FolderFallback({
  detail,
}: {
  detail: ReturnType<typeof useQuery<typeof api.folders.console.get>>
}) {
  return (
    <MaterialPlaceholder
      noun="folder"
      status={
        detail?.status === "unauthorized"
          ? "unauthorized"
          : detail === undefined
            ? "loading"
            : "not_found"
      }
      message={detail?.status === "unauthorized" ? detail.message : undefined}
    />
  )
}
