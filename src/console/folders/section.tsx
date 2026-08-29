import { useQuery } from "convex/react"
import { Plus } from "lucide-react"
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
import { useActiveOrganization } from "@/shared/session/auth"
import { api } from "../../../convex/_generated/api"
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

  if (tree !== undefined && tree.status !== "ready") {
    return null
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Folders</SidebarGroupLabel>
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
        organizationId={organizationId}
      />
    </SidebarGroup>
  )
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

// Expansion is session UI state. The shell remounts on every route change,
// so the set lives at module scope and each mount snapshots it.
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
