import { Link } from "@tanstack/react-router"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { folderIcon } from "../shared/materials/folders"
import { menuWidth } from "../shared/menu"
import { type CreationRequest } from "./create/dialogs"
import { NewInFolderSub } from "./create/menu"
import { type FolderRowDrag, useFolderRowDrag } from "./drag/state"
import { type FolderDialogRequest } from "./manage"
import { FolderMenuItems } from "./menu"
import { activeFolderId, type FolderNode } from "./tree"
import { type FolderRow } from "./types"

export type FolderExpansion = {
  expand: (folderId: string) => void
  isExpanded: (folderId: string) => boolean
  toggle: (folderId: string) => void
}

/** One sidebar tree row: the button navigates to the folder's page, the
 *  chevron expands its children into an indented sub-list, the hover menu
 *  raises the lifecycle dialogs, and the row drags onto other rows (or the
 *  group header) to move the folder. */
export function FolderTreeItem({
  expansion,
  node,
  onCreate,
  onDialog,
  pathname,
}: {
  expansion: FolderExpansion
  node: FolderNode<FolderRow>
  onCreate: (request: CreationRequest) => void
  onDialog: (request: FolderDialogRequest) => void
  pathname: string
}) {
  const drag = useFolderRowDrag("sidebar", node.folderId, node.name)
  const hasChildren = node.children.length > 0
  const isExpanded = hasChildren && expansion.isExpanded(node.folderId)

  return (
    <SidebarMenuItem>
      {/* The item's own hover group spans its whole subtree, so a nested
          row would reveal every ancestor's menu. This wrapper is the row's
          hover boundary: actions inside reveal only when THIS row is
          hovered, and position against it, not the subtree. */}
      <div className="group/row relative">
        <FolderRowLink
          drag={drag}
          folderId={node.folderId}
          hasChildren={hasChildren}
          hasContents={node.hasContents}
          isActive={activeFolderId(pathname) === node.folderId}
          isExpanded={isExpanded}
          name={node.name}
          onNavigate={() => expansion.expand(node.folderId)}
        />
        {hasChildren ? (
          <RowChevron
            isDragActive={drag.isDragActive}
            isExpanded={isExpanded}
            name={node.name}
            onToggle={() => expansion.toggle(node.folderId)}
          />
        ) : null}
        <FolderTreeMenu
          folder={node}
          isDragActive={drag.isDragActive}
          onCreate={onCreate}
          onDialog={onDialog}
        />
      </div>
      {isExpanded ? (
        // The default sub-list insets both edges, so at the backend's
        // depth-8 nesting cap rows would shrink from the right and lose
        // their actions column. Keep the guide line but move the whole
        // per-level step to the left (16px: 10px margin + 6px padding),
        // so every row at every depth ends on the same right edge and
        // still fits a readable name at depth 8.
        <SidebarMenuSub className="mr-0 ml-2.5 pr-0 pl-1.5">
          {node.children.map((child) => (
            <FolderTreeItem
              expansion={expansion}
              key={child.folderId}
              node={child}
              onCreate={onCreate}
              onDialog={onDialog}
              pathname={pathname}
            />
          ))}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  )
}

function FolderRowLink({
  drag,
  folderId,
  hasChildren,
  hasContents,
  isActive,
  isExpanded,
  name,
  onNavigate,
}: {
  drag: FolderRowDrag
  folderId: string
  hasChildren: boolean
  hasContents: boolean
  isActive: boolean
  isExpanded: boolean
  name: string
  onNavigate: () => void
}) {
  const FolderIcon = folderIcon(hasContents, isExpanded)

  return (
    <SidebarMenuButton
      asChild
      className={cn(
        // The base button only clears the "…" action (pr-8); rows with a
        // chevron column too need the name held clear of both.
        hasChildren && "group-has-data-[sidebar=menu-action]/menu-item:pr-14",
        rowDragClasses(drag)
      )}
      isActive={isActive}
      tooltip={name}
    >
      <Link
        {...drag.attributes}
        {...drag.listeners}
        draggable={false}
        // Navigating into a folder also reveals it in the tree. Expand
        // only — collapsing stays the chevron's job — and the drag guard
        // above swallows the click that can follow a short drag.
        onClick={onNavigate}
        onClickCapture={drag.onClickCapture}
        onPointerDownCapture={drag.onPointerDownCapture}
        params={{ folderId }}
        ref={drag.setNodeRef}
        to="/folders/$folderId"
      >
        <FolderIcon />
        <span className="min-w-0 truncate">{name}</span>
      </Link>
    </SidebarMenuButton>
  )
}

/** Drag styling for a row: the source dims, the hovered valid target takes
 *  the sidebar accent, plain hover goes quiet while a drag runs (passing
 *  over a row is not acting on it), and a landed move fades the row in
 *  where it settled — unless the user prefers reduced motion. */
function rowDragClasses(drag: FolderRowDrag) {
  return cn(
    drag.isDragActive &&
      !drag.isDropTarget &&
      "hover:bg-transparent hover:text-current",
    drag.isDragSource && "opacity-50",
    drag.isDropTarget && "bg-sidebar-accent text-sidebar-accent-foreground",
    drag.isSettling &&
      "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
  )
}

function RowChevron({
  isDragActive,
  isExpanded,
  name,
  onToggle,
}: {
  isDragActive: boolean
  isExpanded: boolean
  name: string
  onToggle: () => void
}) {
  return (
    <SidebarMenuAction
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${name}`}
      // Same reveal pattern as the "…" menu below: hidden on pointer
      // viewports until the row is hovered or holds keyboard focus, always
      // shown on touch viewports — plus always shown while expanded, so an
      // open subtree keeps its collapse handle in sight.
      className={cn(
        "right-6 aria-expanded:opacity-100 md:opacity-0",
        !isDragActive &&
          "group-has-[:focus-visible]/row:opacity-100 group-hover/row:opacity-100"
      )}
      onClick={onToggle}
    >
      <ChevronRight
        className={cn(
          "transition-transform motion-reduce:transition-none",
          isExpanded && "rotate-90"
        )}
      />
    </SidebarMenuAction>
  )
}

/** The tree row's menu: the canonical folder menu, led by the way into
 *  creating something here — the sidebar has no other New affordance, while
 *  the folder page carries one in its header. */
function FolderTreeMenu({
  folder,
  isDragActive,
  onCreate,
  onDialog,
}: {
  folder: FolderRow
  isDragActive: boolean
  onCreate: (request: CreationRequest) => void
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Not showOnHover: that keys off the item-wide group (see the row
            wrapper's comment); this reveal is scoped to the row's own
            group. Keyboard reveal keys off focus-visible, not focus-within,
            so a mouse click leaves no lingering "…"; while a drag passes
            over rows the menu stays hidden entirely. */}
        <SidebarMenuAction
          aria-label={`Open actions for ${folder.name}`}
          className={cn(
            "aria-expanded:opacity-100 md:opacity-0",
            !isDragActive &&
              "group-has-[:focus-visible]/row:opacity-100 group-hover/row:opacity-100"
          )}
        >
          <MoreHorizontal />
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={menuWidth} side="right">
        <NewInFolderSub
          onCreate={(creation) =>
            onCreate({ creation, folderId: folder.folderId })
          }
          onNewFolder={() =>
            onDialog({ type: "create", parentId: folder.folderId })
          }
        />
        <DropdownMenuSeparator />
        <FolderMenuItems folder={folder} onDialog={onDialog} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
