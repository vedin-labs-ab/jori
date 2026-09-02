import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { DeleteFileDialog } from "@/shared/console/files/delete"
import { EditFileDialog } from "@/shared/console/files/edit"
import { FileMenuItems } from "@/shared/console/files/menu"
import { type FileRow } from "@/shared/console/files/types"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { menuWidth } from "@/shared/console/menu"
import { MoveResourceDialog } from "../folders/move"
import { VisibilityDialog } from "../shared/visibility/dialog"
import { toMoveTarget, useFileActions } from "./manage"

type FileDialog = "access" | "edit" | "move"

/** The file's actions hung off its name in the breadcrumb — the shell owns
 *  that trigger, so this publishes only the menu, and owns the dialogs the
 *  actions open. Open and Download are left out: the detail page's header
 *  already carries both. */
export function FileTitleMenu({
  file,
  organizationId,
}: {
  file: FileRow
  organizationId: string
}) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<FileDialog>()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const actions = useFileActions(organizationId, {
    onDeleted: () => void navigate({ to: "/files" }),
    onSaved: () => setDialog(undefined),
  })
  const isPending = actions.pendingFileId === file.fileId

  useMaterialBreadcrumb(
    file.name,
    <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
      <DropdownMenuContent align="start" className={menuWidth}>
        <FileMenuItems
          file={file}
          isPending={isPending}
          onAccess={() => setDialog("access")}
          onEdit={() => setDialog("edit")}
          onMoveToFolder={() => setDialog("move")}
          onRemove={() => setIsDeleteOpen(true)}
          withLinks={false}
        />
      </DropdownMenuContent>
      <DeleteFileDialog
        file={file}
        isPending={isPending}
        onDelete={() => actions.deleteFile(file)}
      />
    </AlertDialog>
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
