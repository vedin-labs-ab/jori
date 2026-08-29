import { useMutation } from "convex/react"
import { Upload } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { downloadUrl } from "@/lib/download"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { type MoveResourceTarget } from "../folders/types"
import { ConsolePage } from "../page"
import { showErrorToast } from "../shared/error"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../shared/layout"
import { SelectionActionsBar } from "../shared/list/bar"
import { countNoun, useBulkRunner } from "../shared/list/bulk"
import { ConsoleListFooter, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListPager } from "../shared/list/pager"
import { type RowSelection, useRowSelection } from "../shared/list/selection"
import { useFolderNames } from "../shared/materials/folders"
import { EditFileDialog } from "./edit"
import { useFilePagination } from "./pagination"
import { FileTable } from "./table"
import { type FileRow } from "./types"
import { UploadFileDialog } from "./upload"

const fileNoun = { plural: "files", singular: "file" }

const fileDeleteDescription =
  "This permanently deletes the files and their stored contents. Anything that references them loses access."

export function FilesPage() {
  return (
    <ConsolePage>
      {(organizationId) => <FilesView organizationId={organizationId} />}
    </ConsolePage>
  )
}

/** One bag of page state, so the view and its overlays stay small. */
function useFilesPage(organizationId: string) {
  const pagination = useFilePagination(organizationId)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editFile, setEditFile] = useState<FileRow>()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const actions = useFileActions(organizationId, () => setEditFile(undefined))
  const selection = useRowSelection({
    identify: (file: FileRow) => file.fileId,
    rows: pagination.visibleRows,
  })

  return {
    actions,
    bulk: useFileBulk(organizationId, selection),
    editFile,
    folders: useFolderNames(organizationId),
    isUploadOpen,
    moving,
    pagination,
    selection,
    setEditFile,
    setIsUploadOpen,
    setMoving,
  }
}

function FilesView({ organizationId }: { organizationId: string }) {
  const page = useFilesPage(organizationId)

  return (
    <ConsoleListLayout>
      <ConsoleHeaderActions>
        <ConsoleHeaderButton
          className="w-fit"
          icon={<Upload />}
          label="Upload file"
          onClick={() => page.setIsUploadOpen(true)}
          type="button"
        />
      </ConsoleHeaderActions>
      <FileTable
        files={page.pagination.visibleRows}
        folders={page.folders}
        isLoading={page.pagination.isLoading}
        onDelete={page.actions.deleteFile}
        onEdit={page.setEditFile}
        onMoveToFolder={(file) => page.setMoving([toMoveTarget(file)])}
        onUpload={() => page.setIsUploadOpen(true)}
        pendingFileId={page.actions.pendingFileId}
        selection={page.selection}
      />
      {page.pagination.isLoading ? null : (
        <ConsoleListFooter>
          <ConsoleListPager pagination={page.pagination} />
        </ConsoleListFooter>
      )}
      <FilesOverlays organizationId={organizationId} page={page} />
    </ConsoleListLayout>
  )
}

/** The selection bar and the page's dialogs — everything that floats over
 *  the list. */
function FilesOverlays({
  organizationId,
  page,
}: {
  organizationId: string
  page: ReturnType<typeof useFilesPage>
}) {
  return (
    <>
      <SelectionActionsBar
        count={page.selection.count}
        isBusy={page.bulk.isBusy}
        noun={fileNoun}
        onClear={page.selection.clear}
        onDownload={page.bulk.downloadSelected}
        onMove={() => page.setMoving(page.selection.selected.map(toMoveTarget))}
        onRemove={page.bulk.removeSelected}
        removal={{
          description: fileDeleteDescription,
          isDestructive: true,
          label: "Delete",
        }}
      />
      <UploadFileDialog
        isOpen={page.isUploadOpen}
        onOpenChange={page.setIsUploadOpen}
        organizationId={organizationId}
      />
      <EditFileDialog
        file={page.editFile}
        isSaving={
          page.editFile !== undefined &&
          page.actions.pendingFileId === page.editFile.fileId
        }
        onOpenChange={(open) => {
          if (!open) {
            page.setEditFile(undefined)
          }
        }}
        onSave={page.actions.saveFile}
      />
      <MoveResourcesDialog
        onClose={() => page.setMoving(undefined)}
        organizationId={organizationId}
        resources={page.moving}
      />
    </>
  )
}

function toMoveTarget(file: FileRow): MoveResourceTarget {
  return {
    resourceType: "file",
    resourceId: file.fileId,
    name: file.name,
    folderId: file.folderId,
  }
}

/** The selection bar's actions: deletes run the same mutation the row menu
 *  uses, downloads reuse each row's storage URL. */
function useFileBulk(organizationId: string, selection: RowSelection<FileRow>) {
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

function useFileActions(organizationId: string, onSaved: () => void) {
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
        onSaved()
      })
      .catch((error: unknown) =>
        showErrorToast(error, "Could not update the file.")
      )
      .finally(() => setPendingFileId(undefined))
  }

  function deleteFile(file: FileRow) {
    setPendingFileId(file.fileId)
    void removeFile({ organizationId, fileId: file.fileId })
      .then(() => toast.success(`Deleted ${file.name}.`))
      .catch((error: unknown) =>
        showErrorToast(error, "Could not delete the file.")
      )
      .finally(() => setPendingFileId(undefined))
  }

  return { deleteFile, pendingFileId, saveFile }
}
