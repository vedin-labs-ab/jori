import { EditFileDialog } from "@/shared/console/files/edit"
import { type FileDialog } from "@/shared/console/files/menu"
import { type FileRow } from "@/shared/console/files/types"
import { moveTarget } from "@/shared/console/folders/types"
import { type MaterialEdit } from "@/shared/console/materials/dialogs/edit"
import { closeOnDismiss } from "@/shared/console/retain"
import { MoveResourceDialog } from "../folders/move"
import { OrganizationVisibilityDialog } from "../shared/visibility/dialog"

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
