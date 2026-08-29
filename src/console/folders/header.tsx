import {
  Database,
  FolderInput,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Table2,
  Trash2,
  Upload,
} from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../shared/layout"
import { type FolderDialogRequest } from "./manage"
import { type FolderDetail } from "./types"

/** What the folder page can create in place; everything but the subfolder
 *  is created by the surface's own dialog and then filed here. */
export type FolderCreation = "table" | "store" | "file"

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
        folderId={folder.folderId}
        onCreate={onCreate}
        onDialog={onDialog}
      >
        <ConsoleHeaderButton icon={<Plus />} label="New" type="button" />
      </NewInFolderMenu>
      <FolderPageMenu folder={folder} onDialog={onDialog} />
    </ConsoleHeaderActions>
  )
}

/** The "New" dropdown, reused as the empty state's call to action. */
export function NewInFolderMenu({
  children,
  folderId,
  onCreate,
  onDialog,
}: {
  children: ReactNode
  folderId: string
  onCreate: (creation: FolderCreation) => void
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onSelect={() => onDialog({ type: "create", parentId: folderId })}
        >
          <FolderPlus />
          New folder
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCreate("table")}>
          <Table2 />
          New table
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCreate("store")}>
          <Database />
          New store
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCreate("file")}>
          <Upload />
          Upload file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FolderPageMenu({
  folder,
  onDialog,
}: {
  folder: FolderDetail
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
        <DropdownMenuItem onSelect={() => onDialog({ type: "rename", folder })}>
          <Pencil />
          Rename
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
