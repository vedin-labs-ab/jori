import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { countNoun } from "@/shared/console/count"
import { showErrorToast } from "@/shared/console/error"
import { fileNoun } from "@/shared/console/files/list/config"
import { type FileRow } from "@/shared/console/files/types"
import { type RowSelection } from "@/shared/console/list/selection"
import { downloadFiles } from "@/shared/files/archive"
import { api } from "../../../convex/_generated/api"
import { useMaterialBulk } from "../shared/materials/bulk"

/** Delete, shared by the list's row menu and the detail page's breadcrumb
 *  menu. It reports through a toast; the caller decides what follows. A
 *  file is renamed in place, through the console's editing session. */
export function useFileActions(
  organizationId: string,
  { onDeleted }: { onDeleted?: () => void } = {}
) {
  const removeFile = useMutation(api.files.console.remove)
  const [pendingFileId, setPendingFileId] = useState<FileRow["fileId"]>()

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

  return { deleteFile, pendingFileId }
}

/** The selection bar's actions: deletes run the same mutation the row menu
 *  uses, downloads reuse each row's storage URL. */
export function useFileBulk(
  organizationId: string,
  selection: RowSelection<FileRow>
) {
  const removeFile = useMutation(api.files.console.remove)

  return useMaterialBulk({
    downloadAll: downloadFiles,
    download: (row) => downloadFiles([row]),
    noun: fileNoun,
    remove: (row) => removeFile({ organizationId, fileId: row.fileId }),
    removal: {
      success: (rows) => `Deleted ${countNoun(rows.length, fileNoun)}.`,
      verb: "delete",
    },
    selection,
  })
}
