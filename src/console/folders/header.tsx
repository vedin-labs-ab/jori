import { Link } from "@tanstack/react-router"
import {
  ChartNoAxesColumn,
  FolderInput,
  LockKeyhole,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../shared/layout"
import { type FolderCreation } from "./create/dialogs"
import { NewInFolderMenu } from "./create/menu"
import { type FolderDialogRequest } from "./manage"
import { type FolderDetail } from "./types"

// What the folder surface puts in the console header: creating things sits
// in the header's own actions, and everything about the folder itself hangs
// off its name in the breadcrumb, the way material pages do it.

export function FolderHeaderActions({
  onCreate,
  onNewFolder,
}: {
  onCreate: (creation: FolderCreation) => void
  onNewFolder: () => void
}) {
  return (
    <ConsoleHeaderActions>
      <NewInFolderMenu onCreate={onCreate} onNewFolder={onNewFolder}>
        <ConsoleHeaderButton icon={<Plus />} label="New" type="button" />
      </NewInFolderMenu>
    </ConsoleHeaderActions>
  )
}

/** The folder's menu, opened from its name in the breadcrumb: what it
 *  costs, what it is, and what removes it. */
export function FolderTitleMenu({
  folder,
  onDialog,
}: {
  folder: FolderDetail
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <DropdownMenuContent align="start" className="w-44">
      <DropdownMenuItem asChild>
        <Link
          params={{ folderId: folder.folderId }}
          to="/folders/$folderId/usage"
        >
          <ChartNoAxesColumn />
          Usage
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => onDialog({ type: "rename", folder })}>
        <Pencil />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onDialog({ type: "access", folder })}>
        <LockKeyhole />
        Sharing…
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onDialog({ type: "move", folder })}>
        <FolderInput />
        Move to…
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => onDialog({ type: "delete", folder })}
        variant="destructive"
      >
        <Trash2 />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

/** The overview's menu. Nothing here is a folder, so the tree's own spend
 *  is all its name has to offer. */
export function FoldersTitleMenu() {
  return (
    <DropdownMenuContent align="start" className="w-44">
      <DropdownMenuItem asChild>
        <Link to="/folders/usage">
          <ChartNoAxesColumn />
          Usage
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
