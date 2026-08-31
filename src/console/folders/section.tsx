import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { Folder, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useActiveOrganization } from "@/shared/session/auth"
import { api } from "../../../convex/_generated/api"
import { CreationDialogs, type CreationRequest } from "./create/dialogs"
import { NewInFolderMenu } from "./create/menu"
import { useLeaveDeletedFolder } from "./delete/leave"
import { useExpandHoverHandler, useRootDrop } from "./drag/state"
import { type FolderDialogRequest, FolderDialogs } from "./manage"
import { type FolderExpansion, FolderTreeItem } from "./row"
import { ancestorFolderIds, buildFolderTree } from "./tree"
import { type FolderRow } from "./types"

/** The sidebar's Folders section: the organization's folder tree below the
 *  workspace navigation, with a group action for a new root folder. */
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
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const [creation, setCreation] = useState<CreationRequest>()
  const activeId = activeFolderId(pathname)
  const expansion = useFolderExpansion(activeId, folders)
  const leaveDeletedFolder = useLeaveDeletedFolder(
    useViewedTrail(activeId, folders)
  )

  // The drag context lives at the shell, above both panes; hand it this
  // tree's dwell-to-expand handler so drags can descend into the sidebar.
  useExpandHoverHandler(useExpandOnHover(folders, expansion))

  if (tree !== undefined && tree.status !== "ready") {
    return null
  }

  return (
    <>
      {/* The tree is a hover-and-drag surface with no icon-rail form, so
          icon-collapsed mode swaps the whole group for one Folders entry
          and navigation continues on the /folders page. */}
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <FoldersLabel />
        {/* The "+" creates at the top level: a root folder, or a resource
            whose dialog starts unfiled with the Folder field free to set. */}
        <NewInFolderMenu
          onCreate={(kind) => setCreation({ creation: kind })}
          onNewFolder={() => setDialog({ type: "create" })}
        >
          <SidebarGroupAction aria-label="New" title="New">
            <Plus />
          </SidebarGroupAction>
        </NewInFolderMenu>
        <SidebarGroupContent>
          <SidebarMenu>
            <FolderMenuItems
              expansion={expansion}
              folders={folders}
              onCreate={setCreation}
              onDialog={setDialog}
              onNewFolder={() => setDialog({ type: "create" })}
              pathname={pathname}
            />
          </SidebarMenu>
        </SidebarGroupContent>
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
      </SidebarGroup>
      <SidebarGroup className="hidden group-data-[collapsible=icon]:block">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/folders")}
                tooltip="Folders"
              >
                <Link to="/folders">
                  <Folder />
                  <span>Folders</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

/** The group label doubles as the drop target that moves a dragged folder
 *  back to the top level — and its text links to the /folders overview,
 *  resting exactly where the plain label sat and growing the ghost pill
 *  on hover like the breadcrumb trigger. */
function FoldersLabel() {
  const root = useRootDrop()

  return (
    <SidebarGroupLabel
      className={cn(
        root.isDropTarget && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
      ref={root.setNodeRef}
    >
      {/* Constant geometry: the pill's room comes from padding cancelled
          by negative margin, so the text never moves and a shell remount
          mid-hover has nothing to replay — unlike the breadcrumb, this
          control sits under the pointer exactly when navigation remounts
          the sidebar. */}
      <Button
        asChild
        className="-mx-1.5 h-6 px-1.5 font-normal text-sidebar-foreground/70 text-xs"
        variant="ghost"
      >
        <Link to="/folders">Folders</Link>
      </Button>
    </SidebarGroupLabel>
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

/** Opens a collapsed folder that a drag dwells on, so a drop can descend
 *  into the tree without releasing. */
function useExpandOnHover(
  folders: FolderRow[] | undefined,
  expansion: FolderExpansion
) {
  const parentIds = useMemo(
    () =>
      new Set<string>(
        (folders ?? []).flatMap((row) =>
          row.parentId === undefined ? [] : [row.parentId]
        )
      ),
    [folders]
  )

  return (folderId: string) => {
    if (parentIds.has(folderId)) {
      expansion.expand(folderId)
    }
  }
}

function FolderMenuItems({
  expansion,
  folders,
  onCreate,
  onDialog,
  onNewFolder,
  pathname,
}: {
  expansion: FolderExpansion
  folders: FolderRow[] | undefined
  onCreate: (request: CreationRequest) => void
  onDialog: (request: FolderDialogRequest) => void
  onNewFolder: () => void
  pathname: string
}) {
  const nodes = useMemo(() => buildFolderTree(folders ?? []), [folders])

  if (folders === undefined) {
    return (
      <>
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      </>
    )
  }

  if (nodes.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          className="text-muted-foreground"
          onClick={onNewFolder}
          tooltip="New folder"
        >
          <Plus />
          <span>New folder</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <>
      {nodes.map((node) => (
        <FolderTreeItem
          expansion={expansion}
          key={node.folderId}
          node={node}
          onCreate={onCreate}
          onDialog={onDialog}
          pathname={pathname}
        />
      ))}
    </>
  )
}

// Expansion is session UI state that must outlive the sidebar: each page
// composes its own ConsolePage, so the shell remounts on every surface
// change, and the only stable ancestor is the app root, which serves public
// pages too and should not host console feature state. A module-scope set is
// the smallest thing that survives; each mount snapshots it into React state
// and every toggle writes through. Folder ids are globally unique, so
// entries left by other organizations are inert.
const sessionExpanded = new Set<string>()

function useFolderExpansion(
  activeId: string | undefined,
  folders: FolderRow[] | undefined
): FolderExpansion {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(sessionExpanded)
  )

  // Reveal the active folder once the rows arrive by expanding its
  // ancestors, so a deep link lands on a visible row.
  useEffect(() => {
    if (activeId === undefined || folders === undefined) {
      return
    }

    const ancestors = ancestorFolderIds(folders, activeId)

    if (ancestors.some((folderId) => !sessionExpanded.has(folderId))) {
      for (const folderId of ancestors) {
        sessionExpanded.add(folderId)
      }

      setExpanded(new Set(sessionExpanded))
    }
  }, [activeId, folders])

  return {
    // Expand-only, for actions that reveal (navigation clicks, deep
    // links); collapsing stays exclusively the chevron's toggle.
    expand: (folderId) => {
      if (!sessionExpanded.has(folderId)) {
        sessionExpanded.add(folderId)
        setExpanded(new Set(sessionExpanded))
      }
    },
    isExpanded: (folderId) => expanded.has(folderId),
    toggle: (folderId) => {
      if (sessionExpanded.has(folderId)) {
        sessionExpanded.delete(folderId)
      } else {
        sessionExpanded.add(folderId)
      }

      setExpanded(new Set(sessionExpanded))
    },
  }
}

function activeFolderId(pathname: string) {
  return pathname.match(/^\/folders\/([^/]+)$/)?.[1]
}
