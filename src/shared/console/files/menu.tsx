import { Download, ExternalLink, Trash2 } from "lucide-react"
import { useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MaterialCoreItems } from "@/shared/console/materials/actions"
import { menuWidth, RowMenuTrigger } from "@/shared/console/menu"
import { DeleteFileDialog } from "./delete"
import { type FileRow } from "./types"

// The canonical menu for a file, as items only. The list row and a folder
// listing's row lead with the links to the file itself; the detail page
// leaves them out, because its header already carries the same two.

export function FileMenuItems({
  file,
  isPending,
  onAccess,
  onEdit,
  onMoveToFolder,
  onRemove,
  onUnfile,
  withLinks,
}: {
  file: { name: string; url: string | null }
  isPending: boolean
  onAccess: () => void
  onEdit: () => void
  onMoveToFolder: () => void
  onRemove: () => void
  /** Folder listings only: unfiling acts on the filing, not on the file. */
  onUnfile?: () => void
  /** Whether to lead with Open and Download. */
  withLinks: boolean
}) {
  return (
    <>
      {withLinks ? <FileLinkItems file={file} /> : null}
      <MaterialCoreItems
        isPending={isPending}
        onAccess={onAccess}
        onEdit={onEdit}
        onMoveToFolder={onMoveToFolder}
        onUnfile={onUnfile}
      />
      <DropdownMenuItem
        disabled={isPending}
        onSelect={onRemove}
        variant="destructive"
      >
        <Trash2 />
        Delete
      </DropdownMenuItem>
    </>
  )
}

/** The file's menu on its own list row, trigger and confirmation included. */
export function FileRowMenu({
  file,
  isPending,
  onAccess,
  onDelete,
  onEdit,
  onMoveToFolder,
}: {
  file: FileRow
  isPending: boolean
  onAccess: (file: FileRow) => void
  onDelete: (file: FileRow) => void
  onEdit: (file: FileRow) => void
  onMoveToFolder: (file: FileRow) => void
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
      <DropdownMenu>
        <RowMenuTrigger name={file.name} />
        <DropdownMenuContent align="end" className={menuWidth}>
          <FileMenuItems
            file={file}
            isPending={isPending}
            onAccess={() => onAccess(file)}
            onEdit={() => onEdit(file)}
            onMoveToFolder={() => onMoveToFolder(file)}
            onRemove={() => setIsDeleteOpen(true)}
            withLinks
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteFileDialog
        file={file}
        isPending={isPending}
        onDelete={() => onDelete(file)}
      />
    </AlertDialog>
  )
}

function FileLinkItems({
  file,
}: {
  file: { name: string; url: string | null }
}) {
  if (file.url === null) {
    return null
  }

  return (
    <>
      <DropdownMenuItem asChild>
        <a href={file.url} rel="noreferrer" target="_blank">
          <ExternalLink />
          Open
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a download={file.name} href={file.url} rel="noreferrer">
          <Download />
          Download
        </a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  )
}
