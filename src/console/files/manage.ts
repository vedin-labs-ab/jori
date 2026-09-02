import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { countNoun } from "@/shared/console/count"
import { showErrorToast } from "@/shared/console/error"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { type ListConfig, type ListFacet } from "@/shared/console/list/controls"
import { type RowSelection } from "@/shared/console/list/selection"
import {
  type FolderNames,
  folderFacet,
} from "@/shared/console/materials/folders"
import { ownerFacet } from "@/shared/console/materials/owners"
import { downloadUrl } from "@/shared/files/download"
import { type FileKind, fileKind } from "@/shared/files/kind"
import { api } from "../../../convex/_generated/api"
import { type MoveResourceTarget } from "../folders/types"
import { type FileRow } from "./types"

/** What the file list headers sort and filter: the kinds present in the
 *  data, the organization's folders, and the page's sortable columns. */
export function fileListConfig(
  files: readonly FileRow[],
  folders: FolderNames | undefined
): ListConfig<FileRow> {
  return {
    facets: {
      folder: folderFacet(folders),
      kind: kindFacet(files),
      owner: ownerFacet(files),
    },
    sorts: {
      created: (file) => file.createdAt,
      name: (file) => file.name,
      size: (file) => file.size,
      updated: (file) => file.updatedAt,
    },
  }
}

/** Type facet over the kind labels the registry reads from the listed
 *  files, so the menu only offers kinds that actually occur — each with
 *  the kind's own icon. */
function kindFacet(files: readonly FileRow[]): ListFacet<FileRow> {
  const kindsByLabel = new Map<string, FileKind>()

  for (const file of files) {
    const kind = fileKind(file.mimeType, file.name)

    kindsByLabel.set(kind.label, kind)
  }

  const labels = [...kindsByLabel.keys()].sort((left, right) =>
    left.localeCompare(right)
  )

  return {
    label: "Type",
    options: labels.map((label) => ({
      icon: kindsByLabel.get(label)?.icon,
      label,
      value: label,
    })),
    resolve: rowKindLabel,
  }
}

function rowKindLabel(file: FileRow) {
  return fileKind(file.mimeType, file.name).label
}

export const fileNoun = { plural: "files", singular: "file" }

export const fileDeleteDescription =
  "This permanently deletes the files and their stored contents. Anything that references them loses access."

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
