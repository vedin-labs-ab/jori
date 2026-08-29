import { Link } from "@tanstack/react-router"
import {
  ChevronRight,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { type FolderDialogRequest } from "./manage"
import { type FolderNode } from "./tree"
import { type FolderRow } from "./types"

export type FolderExpansion = {
  isExpanded: (folderId: string) => boolean
  toggle: (folderId: string) => void
}

/** One sidebar tree row: the button navigates to the folder's page, the
 *  chevron expands its children into an indented sub-list, and the hover
 *  menu raises the lifecycle dialogs. */
export function FolderTreeItem({
  expansion,
  node,
  onDialog,
  pathname,
}: {
  expansion: FolderExpansion
  node: FolderNode<FolderRow>
  onDialog: (request: FolderDialogRequest) => void
  pathname: string
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = hasChildren && expansion.isExpanded(node.folderId)
  const FolderIcon = isExpanded ? FolderOpen : Folder

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === `/folders/${node.folderId}`}
        tooltip={node.name}
      >
        <Link params={{ folderId: node.folderId }} to="/folders/$folderId">
          <FolderIcon />
          <span>{node.name}</span>
        </Link>
      </SidebarMenuButton>
      {hasChildren ? (
        <SidebarMenuAction
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.name}`}
          className="right-6"
          onClick={() => expansion.toggle(node.folderId)}
        >
          <ChevronRight
            className={cn("transition-transform", isExpanded && "rotate-90")}
          />
        </SidebarMenuAction>
      ) : null}
      <FolderRowMenu folder={node} onDialog={onDialog} />
      {isExpanded ? (
        <SidebarMenuSub>
          {node.children.map((child) => (
            <FolderTreeItem
              expansion={expansion}
              key={child.folderId}
              node={child}
              onDialog={onDialog}
              pathname={pathname}
            />
          ))}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  )
}

function FolderRowMenu({
  folder,
  onDialog,
}: {
  folder: FolderRow
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction
          aria-label={`Open actions for ${folder.name}`}
          showOnHover
        >
          <MoreHorizontal />
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44" side="right">
        <DropdownMenuItem onSelect={() => onDialog({ type: "rename", folder })}>
          <Pencil />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            onDialog({ type: "create", parentId: folder.folderId })
          }
        >
          <FolderPlus />
          New subfolder
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDialog({ type: "move", folder })}>
          <FolderInput />
          Move to…
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onDialog({ type: "delete", folder })}
          variant="destructive"
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
