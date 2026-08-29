import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { Folder, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
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
import { FolderDragProvider } from "./drag/context"
import { useRootDrop } from "./drag/state"
import { useLeaveDeletedFolder } from "./leave"
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
  const expansion = useFolderExpansion(activeFolderId(pathname), folders)
  const leaveDeletedFolder = useLeaveDeletedFolder(activeFolderId(pathname))
  const expandOnHover = useExpandOnHover(folders, expansion)

  if (tree !== undefined && tree.status !== "ready") {
    return null
  }

  return (
    <FolderDragProvider
      folders={folders ?? []}
      onExpandHover={expandOnHover}
      organizationId={organizationId}
    >
      {/* The tree is a hover-and-drag surface with no icon-rail form, so
          icon-collapsed mode swaps the whole group for one Folders entry
          and navigation continues on the /folders page. */}
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <FoldersLabel />
        <SidebarGroupAction
          aria-label="New folder"
          onClick={() => setDialog({ type: "create" })}
          title="New folder"
        >
          <Plus />
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            <FolderMenuItems
              expansion={expansion}
              folders={folders}
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
    </FolderDragProvider>
  )
}

/** The group label doubles as the drop target that moves a dragged folder
 *  back to the top level. */
function FoldersLabel() {
  const root = useRootDrop()

  return (
    <SidebarGroupLabel
      className={cn(
        root.isDropTarget && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
      ref={root.setNodeRef}
    >
      Folders
    </SidebarGroupLabel>
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
    if (parentIds.has(folderId) && !expansion.isExpanded(folderId)) {
      expansion.toggle(folderId)
    }
  }
}

function FolderMenuItems({
  expansion,
  folders,
  onDialog,
  onNewFolder,
  pathname,
}: {
  expansion: FolderExpansion
  folders: FolderRow[] | undefined
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
