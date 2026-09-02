import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { countNoun } from "@/shared/console/count"
import { showErrorToast } from "@/shared/console/error"
import { fileNoun } from "@/shared/console/files/list/config"
import { type FileRow } from "@/shared/console/files/types"
import { type MoveResourceTarget } from "@/shared/console/folders/types"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { type RowSelection } from "@/shared/console/list/selection"
import { downloadUrl } from "@/shared/files/download"
import { api } from "../../../convex/_generated/api"

export function toMoveTarget(file: FileRow): MoveResourceTarget {
  return {
    resourceType: "file",
    resourceId: file.fileId,
    name: file.name,
    folderId: file.folderId,
  }
}

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

  function saveFile(
    file: FileRow,
    values: { name: string; description: string }
  ) {
    setPendingFileId(file.fileId)
    void updateFile({
      organizationId,
      fileId: file.fileId,
      name: values.name,
      description: values.description,
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
  const runner = useBulkRunner()

  function removeSelected() {
    const rows = selection.selected

    void runner.run(
      rows,
      (row) => removeFile({ organizationId, fileId: row.fileId }),
      {
        noun: fileNoun.plural,
        success: `Deleted ${countNoun(rows.length, fileNoun)}.`,
        verb: "delete",
      }
    )
  }

  function downloadSelected() {
    const rows = selection.selected

    void runner.run(
      rows,
      async (row) => {
        if (row.url === null) {
          throw new Error("File has no download URL")
        }

        downloadUrl(row.name, row.url)
      },
      {
        intervalMs: 300,
        noun: fileNoun.plural,
        success: `Downloaded ${countNoun(rows.length, fileNoun)}.`,
        verb: "download",
      }
    )
  }

  return { downloadSelected, isBusy: runner.isBusy, removeSelected }
}
