import { useQuery } from "convex/react"
import { EditFileDialog } from "@/shared/console/files/edit"
import { type FileDialog } from "@/shared/console/files/menu"
import { type FileRow } from "@/shared/console/files/types"
import { UploadFileDialog as UploadDialog } from "@/shared/console/files/upload"
import { moveTarget } from "@/shared/console/folders/types"
import { type MaterialEdit } from "@/shared/console/materials/dialogs/edit"
import { closeOnDismiss } from "@/shared/console/retain"
import { api } from "../../../convex/_generated/api"
import { MoveResourceDialog } from "../folders/move"
import { OrganizationVisibilityDialog } from "../shared/visibility/dialog"
import { useGrantOptions } from "../shared/visibility/options"
import { useUploadAction } from "./upload"

/** The kit's upload dialog over the organization: its folders and
 *  grantees for the fields, and storage plus a file row for each upload. */
export function UploadFileDialog({
  initialFolderId,
  isOpen,
  onOpenChange,
  organizationId,
}: {
  /** Pre-selects the Folder field, e.g. on a folder page's "New" menu. */
  initialFolderId?: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const tree = useQuery(api.folders.console.tree, { organizationId })

  return (
    <UploadDialog
      folders={tree?.status === "ready" ? tree.folders : undefined}
      grantOptions={useGrantOptions(organizationId)}
      initialFolderId={initialFolderId}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      upload={useUploadAction(organizationId)}
    />
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
