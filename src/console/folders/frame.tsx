import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { ConsoleListContent, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListLoading } from "../shared/list/loading"
import {
  type MaterialBreadcrumb,
  type MaterialBreadcrumbSegment,
  useMaterialTrail,
} from "../shared/materials/breadcrumb"
import { useLeaveDeletedFolder } from "./delete/leave"
import { type FolderDialogRequest, FolderDialogs } from "./manage"
import { FolderTitleMenu } from "./menu"
import { type FolderDetail } from "./types"
import { FolderUsageHint } from "./usage/hint"

// The folder surface: one folder, resolved once, placed in the breadcrumb,
// with the lifecycle dialogs its menu opens. What each page makes of the
// folder is its own business, and arrives as children.

/** Which of the folder's pages is being framed — the crumb ends at the
 *  folder itself, or carries on to what it costs. */
export type FolderView = "contents" | "usage"

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
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  // The page's own trail: deleting any folder on it takes this page too.
  const leaveDeletedFolder = useLeaveDeletedFolder(
    useMemo(
      () => folder?.path.map((segment) => segment.folderId) ?? [],
      [folder]
    )
  )

  useFolderCrumb({ folder, onDialog: setDialog, organizationId, suffix, view })

  return (
    <ConsoleListLayout>
      {folder === undefined ? (
        <ConsoleListContent>
          <FolderFallback detail={detail} />
        </ConsoleListContent>
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

type FolderCrumb = {
  folder: FolderDetail | undefined
  onDialog: (request: FolderDialogRequest) => void
  organizationId: string
  suffix?: (organizationId: string) => ReactNode
  view: FolderView
}

/** The folder's header crumb: the /folders overview leads the trail — every
 *  material page starts from its parent surface — then the ancestor
 *  folders. The folder's own page ends there, its name opening the folder's
 *  menu and its spend sitting beside it; its usage page hangs one more
 *  crumb off the name, which becomes the way back — and needs no hint,
 *  being the page the hint points at, though it may mark its own name. */
function useFolderCrumb(args: FolderCrumb) {
  const { folder, onDialog, organizationId, suffix, view } = args

  useMaterialTrail(
    // The menu and the aside are fresh elements per call, so the crumb is
    // memoized on what they are made of rather than on themselves.
    useMemo(
      () => folderCrumb({ folder, onDialog, organizationId, suffix, view }),
      [folder, onDialog, organizationId, suffix, view]
    )
  )
}

function folderCrumb({
  folder,
  onDialog,
  organizationId,
  suffix,
  view,
}: FolderCrumb): MaterialBreadcrumb | undefined {
  if (folder === undefined) {
    return undefined
  }

  const ancestors: MaterialBreadcrumbSegment[] = [
    { name: "Folders", to: "/folders" },
    ...folder.path.slice(0, -1).map((segment) => ({
      name: segment.name,
      params: { folderId: segment.folderId },
      to: "/folders/$folderId",
    })),
  ]

  if (view === "usage") {
    return {
      name: "Usage",
      suffix: suffix?.(organizationId),
      trail: [
        ...ancestors,
        {
          name: folder.name,
          params: { folderId: folder.folderId },
          to: "/folders/$folderId",
        },
      ],
    }
  }

  return {
    aside: (
      <FolderUsageHint
        folderId={folder.folderId as GenericId<"folders">}
        organizationId={organizationId}
      />
    ),
    menu: <FolderTitleMenu folder={folder} onDialog={onDialog} />,
    name: folder.name,
    trail: ancestors,
  }
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
