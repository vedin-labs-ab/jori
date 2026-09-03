import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { countNoun } from "@/shared/console/count"
import { showErrorToast } from "@/shared/console/error"
import { fileNoun } from "@/shared/console/files/list/config"
import { type FileRow } from "@/shared/console/files/types"
import { type RowSelection } from "@/shared/console/list/selection"
import { type MaterialEdit } from "@/shared/console/materials/dialogs/edit"
import { downloadUrl } from "@/shared/files/download"
import { api } from "../../../convex/_generated/api"
import { useMaterialBulk } from "../shared/materials/bulk"

/** Rename and delete, shared by the list's row menu and the detail page's
 *  breadcrumb menu. Both report through toasts; the caller decides what
 *  follows a save or a delete. */
export function useFileActions(
  organizationId: string,
  { onDeleted, onSaved }: { onDeleted?: () => void; onSaved?: () => void } = {}
) {
  const updateFile = useMutation(api.files.console.update)
  const removeFile = useMutation(api.files.console.remove)
  const [pendingFileId, setPendingFileId] = useState<FileRow["fileId"]>()

  function saveFile(file: FileRow, values: MaterialEdit) {
    setPendingFileId(file.fileId)
    void updateFile({
      organizationId,
      fileId: file.fileId,
      name: values.name,
    })
      .then(() => {
        toast.success("File updated.")
        onSaved?.()
      })
      .catch((error: unknown) =>
        showErrorToast(error, "Could not update the file.")
      )
      .finally(() => setPendingFileId(undefined))
  }

  function deleteFile(file: Pick<FileRow, "fileId" | "name">) {
    setPendingFileId(file.fileId)
    void removeFile({ organizationId, fileId: file.fileId })
      .then(() => {
        toast.success(`Deleted ${file.name}.`)
        onDeleted?.()
      })
      .catch((error: unknown) =>
        showErrorToast(error, "Could not delete the file.")
      )
      .finally(() => setPendingFileId(undefined))
  }

  return { deleteFile, pendingFileId, saveFile }
}

/** The selection bar's actions: deletes run the same mutation the row menu
 *  uses, downloads reuse each row's storage URL. */
export function useFileBulk(
  organizationId: string,
  selection: RowSelection<FileRow>
) {
  const removeFile = useMutation(api.files.console.remove)

  return useMaterialBulk({
    download: async (row) => {
      if (row.url === null) {
        throw new Error("File has no download URL")
      }

      downloadUrl(row.name, row.url)
    },
    noun: fileNoun,
    remove: (row) => removeFile({ organizationId, fileId: row.fileId }),
    removal: {
      success: (rows) => `Deleted ${countNoun(rows.length, fileNoun)}.`,
      verb: "delete",
    },
    selection,
  })
}
