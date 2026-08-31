import { useMutation, useQuery } from "convex/react"
import { Upload } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { downloadUrl } from "@/shared/files/download"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { type MoveResourceTarget } from "../folders/types"
import { ConsolePage } from "../page"
import { showErrorToast } from "../shared/error"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../shared/layout"
import { SelectionActionsBar } from "../shared/list/bar"
import { countNoun, useBulkRunner } from "../shared/list/bulk"
import { resettingControls, useListControls } from "../shared/list/controls"
import { ConsoleListFooter, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListPager } from "../shared/list/pager"
import { useClientPagination } from "../shared/list/pagination"
import { type RowSelection, useRowSelection } from "../shared/list/selection"
import { useFolderNames } from "../shared/materials/folders"
import { VisibilityDialog } from "../shared/visibility/dialog"
import { EditFileDialog } from "./edit"
import { fileListConfig } from "./list"
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

/** The whole organization's files behind header-embedded controls: facets
 *  and sorts narrow client-side, the shared pager windows the result. */
function useFileList(organizationId: string) {
  const files = useQuery(api.files.console.list, { organizationId })
  const folders = useFolderNames(organizationId)
  const config = fileListConfig(files ?? [], folders)
  const controls = useListControls(config)
  const rows = controls.apply(files ?? [])
  const pagination = useClientPagination({
    hasFilters: controls.hasActiveControls,
    isReady: files !== undefined,
    itemLabel: fileNoun,
    items: rows,
    totalCount: files?.length ?? 0,
  })

  return {
    config,
    controls: resettingControls(controls, pagination.reset),
    folders,
    hasFilters: controls.hasActiveControls,
    isLoading: files === undefined,
    pagination,
  }
}

/** One bag of page state, so the view and its overlays stay small. */
function useFilesPage(organizationId: string) {
  const list = useFileList(organizationId)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editFile, setEditFile] = useState<FileRow>()
  const [accessFile, setAccessFile] = useState<FileRow>()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const actions = useFileActions(organizationId, () => setEditFile(undefined))
  const selection = useRowSelection({
    identify: (file: FileRow) => file.fileId,
    rows: list.pagination.visibleRows,
  })

  return {
    ...list,
    accessFile,
    actions,
    bulk: useFileBulk(organizationId, selection),
    editFile,
    isUploadOpen,
    moving,
    selection,
    setAccessFile,
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
        config={page.config}
        controls={page.controls}
        files={page.pagination.visibleRows}
        folders={page.folders}
        hasFilters={page.hasFilters}
        isLoading={page.isLoading}
        onAccess={page.setAccessFile}
        onDelete={page.actions.deleteFile}
        onEdit={page.setEditFile}
        onMoveToFolder={(file) => page.setMoving([toMoveTarget(file)])}
        onUpload={() => page.setIsUploadOpen(true)}
        pendingFileId={page.actions.pendingFileId}
        selection={page.selection}
      />
      {page.isLoading ? null : (
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
      {page.accessFile === undefined ? null : (
        <VisibilityDialog
          noun="file"
          onOpenChange={(open) => {
            if (!open) {
              page.setAccessFile(undefined)
            }
          }}
          open
          organizationId={organizationId}
          ownerId={page.accessFile.ownerId}
          target={{ kind: "file", id: page.accessFile.fileId }}
          value={page.accessFile.visibility}
        />
      )}
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
