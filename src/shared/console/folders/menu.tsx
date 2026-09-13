import {
  ChartNoAxesColumn,
  FolderInput,
  LockKeyhole,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { menuWidth, RowMenuTrigger } from "../menu"
import { ConsoleLink } from "../shell/link"
import { type FolderDialogRequest, type ManagedFolder } from "./types"

// The canonical menu for a folder, as items only: what it costs, what it
// is, and what removes it. The breadcrumb, the sidebar tree row, and a
// folder listing's row all compose exactly this inside their own trigger.

export function FolderMenuItems({
  folder,
  onDialog,
}: {
  folder: ManagedFolder
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <>
      <DropdownMenuItem asChild>
        <ConsoleLink
          params={{ folderId: folder.folderId }}
          to="/folders/$folderId/usage"
        >
          <ChartNoAxesColumn />
          Usage
        </ConsoleLink>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => onDialog({ type: "rename", folder })}>
        <Pencil />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onDialog({ type: "access", folder })}>
        <LockKeyhole />
        Audience…
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onDialog({ type: "move", folder })}>
        <FolderInput />
        Move to folder…
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => onDialog({ type: "delete", folder })}
        variant="destructive"
      >
        <Trash2 />
        Delete
      </DropdownMenuItem>
    </>
  )
}

/** The folder's menu, opened from its name in the breadcrumb. */
export function FolderTitleMenu({
  folder,
  onDialog,
}: {
  folder: ManagedFolder
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <DropdownMenuContent align="start" className={menuWidth}>
      <FolderMenuItems folder={folder} onDialog={onDialog} />
    </DropdownMenuContent>
  )
}

/** The same menu on a folder listing's row, trigger and all. */
export function FolderRowMenu({
  folder,
  onDialog,
}: {
  folder: ManagedFolder
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <DropdownMenu>
      <RowMenuTrigger name={folder.name} />
      <DropdownMenuContent align="end" className={menuWidth}>
        <FolderMenuItems folder={folder} onDialog={onDialog} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The overview's menu. Nothing there is a folder, so the tree's own spend
 *  is all its name has to offer. */
export function FoldersTitleMenu() {
  return (
    <DropdownMenuContent align="start" className={menuWidth}>
      <DropdownMenuItem asChild>
        <ConsoleLink to="/folders/usage">
          <ChartNoAxesColumn />
          Usage
        </ConsoleLink>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
