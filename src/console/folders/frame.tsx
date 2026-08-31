import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useMemo } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { ConsoleListContent, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListLoading } from "../shared/list/loading"
import {
  type MaterialBreadcrumb,
  useMaterialTrail,
} from "../shared/materials/breadcrumb"
import { type FolderDetail } from "./types"

// The folder surface is two views of the same thing: what is filed here,
// and what it costs. Both hang off this frame, so a folder resolves, names
// the breadcrumb, and offers the same pair of tabs exactly once.

export type FolderTab = "contents" | "usage"

/** The surface's secondary navigation, in the console's tab form: links
 *  styled as tabs, so the active one deep-links and survives a reload. The
 *  organization-wide pair leads with the folder overview itself. */
export function FolderSurfaceTabs({
  folderId,
  tab,
}: {
  /** Absent across the whole organization, where the pair spans /folders. */
  folderId?: string
  tab: FolderTab
}) {
  return (
    <div className="border-b px-4 py-2 md:px-6">
      <Tabs value={tab}>
        <TabsList className="!h-7 w-fit">
          <TabsTrigger asChild value="contents">
            {folderId === undefined ? (
              <Link to="/folders">Folders</Link>
            ) : (
              <Link params={{ folderId }} to="/folders/$folderId">
                Contents
              </Link>
            )}
          </TabsTrigger>
          <TabsTrigger asChild value="usage">
            {folderId === undefined ? (
              <Link to="/folders/usage">Usage</Link>
            ) : (
              <Link params={{ folderId }} to="/folders/$folderId/usage">
                Usage
              </Link>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}

/** Resolves the folder a page is about and hands it over, replacing the
 *  whole view while it loads or when there is nothing to show. */
export function FolderFrame({
  children,
  folderId,
  tab,
}: {
  children: (folder: FolderDetail, organizationId: string) => ReactNode
  folderId: string
  tab: FolderTab
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <FolderResolver
          folderId={folderId as GenericId<"folders">}
          organizationId={organizationId}
          tab={tab}
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
  tab,
}: {
  children: (folder: FolderDetail, organizationId: string) => ReactNode
  folderId: GenericId<"folders">
  organizationId: string
  tab: FolderTab
}) {
  const detail = useQuery(api.folders.console.get, {
    organizationId,
    folderId,
  })
  const folder = detail?.status === "ready" ? detail.folder : undefined

  useMaterialTrail(useMemo(() => folderBreadcrumb(folder), [folder]))

  return (
    <ConsoleListLayout>
      <FolderSurfaceTabs folderId={folderId} tab={tab} />
      {folder === undefined ? (
        <ConsoleListContent>
          <FolderFallback detail={detail} />
        </ConsoleListContent>
      ) : (
        children(folder, organizationId)
      )}
    </ConsoleListLayout>
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

/** The folder's header crumb: the /folders overview leads the trail —
 *  every material page starts from its parent surface — then the ancestor
 *  folders, then the folder itself as the current page. */
function folderBreadcrumb(
  folder: FolderDetail | undefined
): MaterialBreadcrumb | undefined {
  if (folder === undefined) {
    return undefined
  }

  return {
    name: folder.name,
    trail: [
      { name: "Folders", to: "/folders" },
      ...folder.path.slice(0, -1).map((segment) => ({
        name: segment.name,
        to: "/folders/$folderId",
        params: { folderId: segment.folderId },
      })),
    ],
  }
}
