import { Folder, Plus } from "lucide-react"
import { useMemo } from "react"
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
import { scrollFade } from "@/shared/fade"
import { groupLabelButton } from "../shell/group"
import { ConsoleLink } from "../shell/link"
import { NewInFolderMenu } from "./create"
import { useExpandHoverHandler, useRootDrop } from "./drag/state"
import { type FolderExpansion } from "./expansion"
import { FolderTreeItem } from "./row"
import { buildFolderTree } from "./tree"
import {
  type CreationRequest,
  type FolderDialogRequest,
  type FolderRow,
} from "./types"

/** The sidebar's Folders section: the organization's folder tree below the
 *  workspace navigation, with a group action for a new root folder. Rows
 *  raise requests — a dialog, a creation — that the host answers. */
export function FolderTree({
  expansion,
  folders,
  onCreate,
  onDialog,
  onNewFolder,
  pathname,
}: {
  expansion: FolderExpansion
  /** Undefined while the rows are still on their way. */
  folders: FolderRow[] | undefined
  onCreate: (request: CreationRequest) => void
  onDialog: (request: FolderDialogRequest) => void
  onNewFolder: () => void
  pathname: string
}) {
  // The drag context lives at the shell, above both panes; hand it this
  // tree's dwell-to-expand handler so drags can descend into the sidebar.
  useExpandHoverHandler(useExpandOnHover(folders, expansion))

  return (
    <>
      {/* The tree is a hover-and-drag surface with no icon-rail form, so
          icon-collapsed mode swaps the whole group for one Folders entry
          and navigation continues on the /folders page. The group takes
          the height the navigation above and below it leaves, and scrolls
          on its own, so a long tree never pushes the platform group away. */}
      <SidebarGroup className="min-h-28 flex-1 group-data-[collapsible=icon]:hidden">
        <FoldersLabel />
        {/* The "+" creates at the top level: a root folder, or a resource
            whose dialog starts unfiled with the Folder field free to set. */}
        <NewInFolderMenu
          onCreate={(creation) => onCreate({ creation })}
          onNewFolder={onNewFolder}
        >
          <SidebarGroupAction aria-label="New" title="New">
            <Plus />
          </SidebarGroupAction>
        </NewInFolderMenu>
        {/* The label and the "+" stay put; only the rows scroll. */}
        <SidebarGroupContent
          className={cn("min-h-0 flex-1 overflow-y-auto", scrollFade)}
        >
          <SidebarMenu>
            <FolderTreeItems
              expansion={expansion}
              folders={folders}
              onCreate={onCreate}
              onDialog={onDialog}
              onNewFolder={onNewFolder}
              pathname={pathname}
            />
          </SidebarMenu>
        </SidebarGroupContent>
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
                <ConsoleLink to="/folders">
                  <Folder />
                  <span>Folders</span>
                </ConsoleLink>
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
 *  in the control the other groups toggle from. */
function FoldersLabel() {
  const root = useRootDrop()

  return (
    <SidebarGroupLabel
      className={cn(
        root.isDropTarget && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
      ref={root.setNodeRef}
    >
      <Button asChild className={groupLabelButton} variant="ghost">
        <ConsoleLink to="/folders">Folders</ConsoleLink>
      </Button>
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
    if (parentIds.has(folderId)) {
      expansion.expand(folderId)
    }
  }
}

function FolderTreeItems({
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
