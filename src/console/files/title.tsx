import { type ReactNode, useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { DeleteFileDialog } from "@/shared/console/files/delete"
import { EditFileDialog } from "@/shared/console/files/edit"
import { FileMenuItems } from "@/shared/console/files/menu"
import { type FileRow } from "@/shared/console/files/types"
import { moveTarget } from "@/shared/console/folders/types"
import { type MaterialEdit } from "@/shared/console/materials/dialogs/edit"
import { menuWidth } from "@/shared/console/menu"
import { closeOnDismiss } from "@/shared/console/retain"
import { MoveResourceDialog } from "../folders/move"
import { OrganizationVisibilityDialog } from "../shared/visibility/dialog"

export type FileDialog = "access" | "edit" | "move"

/** The file's actions hung off its name in the breadcrumb — the shell owns
 *  that trigger and the view publishes the crumb, so this is only the
 *  menu's content, led by the view's own lines, and the confirmation the
 *  delete passes through. Open and Download are left out: the detail
 *  page's header already carries both. */
export function FileTitleMenu({
  file,
  isPending,
  lead,
  onDelete,
  onOpen,
}: {
  file: FileRow
  isPending: boolean
  lead: ReactNode
  onDelete: () => void
  /** Opens one of the dialogs the page renders; see `FileDialogs`. */
  onOpen: (dialog: FileDialog) => void
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
      <DropdownMenuContent align="start" className={menuWidth}>
        {lead}
        <FileMenuItems
          file={file}
          isPending={isPending}
          onAccess={() => onOpen("access")}
          onEdit={() => onOpen("edit")}
          onMoveToFolder={() => onOpen("move")}
          onRemove={() => setIsDeleteOpen(true)}
          withLinks={false}
        />
      </DropdownMenuContent>
      <DeleteFileDialog file={file} isPending={isPending} onDelete={onDelete} />
    </AlertDialog>
  )
}

/** The dialogs the title menu opens, rendered by the page. */
export function FileDialogs({
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
  onSave: (file: FileRow, values: MaterialEdit) => void
  organizationId: string
}) {
  const closeWhenDismissed = closeOnDismiss(onClose)

  return (
    <>
      <EditFileDialog
        file={dialog === "edit" ? file : undefined}
        isSaving={isSaving}
        onOpenChange={closeWhenDismissed}
        onSave={onSave}
      />
      <OrganizationVisibilityDialog
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
        resource={
          dialog === "move" ? moveTarget("file", file.fileId, file) : undefined
        }
      />
    </>
  )
}
