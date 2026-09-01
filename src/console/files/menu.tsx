import { useNavigate } from "@tanstack/react-router"
import {
  Download,
  ExternalLink,
  FolderInput,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { type ReactNode, useState } from "react"
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
import { MoveResourceDialog } from "../folders/move"
import { useMaterialBreadcrumb } from "../shared/materials/breadcrumb"
import { VisibilityDialog } from "../shared/visibility/dialog"
import { EditFileDialog } from "./edit"
import { toMoveTarget, useFileActions } from "./manage"
import { type FileRow } from "./types"

type FileActionProps = {
  file: FileRow
  isPending: boolean
  onAccess: (file: FileRow) => void
  onDelete: (file: FileRow) => void
  onEdit: (file: FileRow) => void
  onMoveToFolder: (file: FileRow) => void
}

/** The file's actions and the delete confirmation they open, with no
 *  trigger of their own: the list row hangs them off its ⋯ button, the
 *  detail page off its breadcrumb name. Children lead the menu, for the
 *  links the detail page already carries in its header. */
function FileActions({
  align,
  children,
  file,
  isPending,
  onAccess,
  onDelete,
  onEdit,
  onMoveToFolder,
}: FileActionProps & { align: "end" | "start"; children?: ReactNode }) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <DropdownMenuContent align={align} className="w-44">
        {children}
        <DropdownMenuItem disabled={isPending} onSelect={() => onEdit(file)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isPending} onSelect={() => onAccess(file)}>
          <LockKeyhole />
          Sharing…
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isPending}
          onSelect={() => onMoveToFolder(file)}
        >
          <FolderInput />
          Move to folder…
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isPending}
          onSelect={() => setIsDeleteOpen(true)}
          variant="destructive"
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
      <DeleteFileDialog
        file={file}
        isPending={isPending}
        onDelete={() => onDelete(file)}
      />
    </AlertDialog>
  )
}

/** The row's actions in the file list. */
export function FileMenu(props: FileActionProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Manage ${props.file.name}`}
          disabled={props.isPending}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <FileActions align="end" {...props}>
        <FileLinkItems file={props.file} />
      </FileActions>
    </DropdownMenu>
  )
}

/** The same actions on the detail page, hung off the file's name in the
 *  breadcrumb — the shell owns that trigger, so this publishes only the
 *  menu, and owns the dialogs the actions open. */
export function FileTitleMenu({
  file,
  organizationId,
}: {
  file: FileRow
  organizationId: string
}) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<FileDialog>()
  const actions = useFileActions(organizationId, {
    onDeleted: () => void navigate({ to: "/files" }),
    onSaved: () => setDialog(undefined),
  })
  const isPending = actions.pendingFileId === file.fileId

  useMaterialBreadcrumb(
    file.name,
    <FileActions
      align="start"
      file={file}
      isPending={isPending}
      onAccess={() => setDialog("access")}
      onDelete={actions.deleteFile}
      onEdit={() => setDialog("edit")}
      onMoveToFolder={() => setDialog("move")}
    />
  )

  return (
    <FileDialogs
      dialog={dialog}
      file={file}
      isSaving={isPending}
      onClose={() => setDialog(undefined)}
      onSave={actions.saveFile}
      organizationId={organizationId}
    />
  )
}

type FileDialog = "access" | "edit" | "move"

function FileDialogs({
  dialog,
  file,
  isSaving,
  onClose,
  onSave,
  organizationId,
}: {
  dialog: FileDialog | undefined
  file: FileRow
  isSaving: boolean
  onClose: () => void
  onSave: (file: FileRow, values: { name: string; description: string }) => void
  organizationId: string
}) {
  function closeWhenDismissed(open: boolean) {
    if (!open) {
      onClose()
    }
  }

  return (
    <>
      <EditFileDialog
        file={dialog === "edit" ? file : undefined}
        isSaving={isSaving}
        onOpenChange={closeWhenDismissed}
        onSave={onSave}
      />
      <VisibilityDialog
        noun="file"
        onOpenChange={closeWhenDismissed}
        open={dialog === "access"}
        organizationId={organizationId}
        ownerId={file.ownerId}
        target={{ kind: "file", id: file.fileId }}
        value={file.visibility}
      />
      <MoveResourceDialog
        onClose={onClose}
        organizationId={organizationId}
        resource={dialog === "move" ? toMoveTarget(file) : undefined}
      />
    </>
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
