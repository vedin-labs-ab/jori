import {
  FolderInput,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../shared/layout"
import { type FolderCreation } from "./create/dialogs"
import { NewInFolderMenu, NewInFolderSub } from "./create/menu"
import { type FolderDialogRequest } from "./manage"
import { type FolderDetail } from "./types"

export function FolderHeaderActions({
  folder,
  onCreate,
  onDialog,
}: {
  folder: FolderDetail
  onCreate: (creation: FolderCreation) => void
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <ConsoleHeaderActions>
      <NewInFolderMenu
        onCreate={onCreate}
        onNewFolder={() =>
          onDialog({ type: "create", parentId: folder.folderId })
        }
      >
        <ConsoleHeaderButton icon={<Plus />} label="New" type="button" />
      </NewInFolderMenu>
      <FolderPageMenu folder={folder} onCreate={onCreate} onDialog={onDialog} />
    </ConsoleHeaderActions>
  )
}

function FolderPageMenu({
  folder,
  onCreate,
  onDialog,
}: {
  folder: FolderDetail
  onCreate: (creation: FolderCreation) => void
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${folder.name}`}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <NewInFolderSub
          onCreate={onCreate}
          onNewFolder={() =>
            onDialog({ type: "create", parentId: folder.folderId })
          }
        />
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
