import {
  Download,
  ExternalLink,
  FolderInput,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type FileRow } from "./types"

export function FileMenu({
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
    <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Manage ${file.name}`}
            disabled={isPending}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <FileLinkItems file={file} />
          <DropdownMenuItem onSelect={() => onEdit(file)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAccess(file)}>
            <LockKeyhole />
            Sharing…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onMoveToFolder(file)}>
            <FolderInput />
            Move to folder…
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setIsDeleteOpen(true)}
            variant="destructive"
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
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

function FileLinkItems({ file }: { file: FileRow }) {
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

function DeleteFileDialog({
  file,
  isPending,
  onDelete,
}: {
  file: FileRow
  isPending: boolean
  onDelete: () => void
}) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="wrap-anywhere">
          Delete "{file.name}"?
        </AlertDialogTitle>
        <AlertDialogDescription>
          This permanently deletes the file and its stored contents. Anything
          that references it loses access.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={isPending}
          onClick={onDelete}
          variant="destructive"
        >
          Delete file
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
