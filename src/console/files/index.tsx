import { useQuery } from "convex/react"
import { Upload } from "lucide-react"
import { useState } from "react"
import { useFolderNames } from "@/console/shared/materials/names"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
} from "@/shared/console/layout"
import { SelectionActionsBar } from "@/shared/console/list/bar"
import {
  resettingControls,
  useListControls,
} from "@/shared/console/list/controls"
import {
  ConsoleListFooter,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { useClientPagination } from "@/shared/console/list/pagination"
import { useRowSelection } from "@/shared/console/list/selection"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { type MoveResourceTarget } from "../folders/types"
import { ConsolePage } from "../page"
import { VisibilityDialog } from "../shared/visibility/dialog"
import { EditFileDialog } from "./edit"
import {
  fileDeleteDescription,
  fileListConfig,
  fileNoun,
  toMoveTarget,
  useFileActions,
  useFileBulk,
} from "./manage"
import { FileTable } from "./table"
import { type FileRow } from "./types"
import { UploadFileDialog } from "./upload"

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
  const actions = useFileActions(organizationId, {
    onSaved: () => setEditFile(undefined),
  })
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
