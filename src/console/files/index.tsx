import { useQuery } from "convex/react"
import { Upload } from "lucide-react"
import { useState } from "react"
import { useFolderNames } from "@/console/shared/materials/names"
import { EditFileDialog } from "@/shared/console/files/edit"
import { FileTable } from "@/shared/console/files/list"
import {
  fileDeleteDescription,
  fileListConfig,
  fileNoun,
} from "@/shared/console/files/list/config"
import { type FileRow } from "@/shared/console/files/types"
import {
  type MoveResourceTarget,
  moveTarget,
} from "@/shared/console/folders/types"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
} from "@/shared/console/layout"
import { SelectionActionsBar } from "@/shared/console/list/bar"
import { useListState } from "@/shared/console/list/controls"
import {
  ConsoleListFooter,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { closeOnDismiss } from "@/shared/console/retain"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { OrganizationVisibilityDialog } from "../shared/visibility/dialog"
import { UploadFileDialog } from "./dialogs"
import { useFileActions, useFileBulk } from "./manage"

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
  const listing = useListState({
    config: fileListConfig(folders, files ?? []),
    identify: (file: FileRow) => file.fileId,
    isReady: files !== undefined,
    noun: fileNoun,
    rows: files ?? [],
    totalCount: files?.length ?? 0,
  })

  return { ...listing, folders, isLoading: files === undefined }
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

  return {
    ...list,
    accessFile,
    actions,
    bulk: useFileBulk(organizationId, list.selection),
    editFile,
    isUploadOpen,
    moving,
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
        onOpenChange={closeOnDismiss(() => page.setEditFile(undefined))}
        onSave={page.actions.saveFile}
      />
      {page.accessFile === undefined ? null : (
        <OrganizationVisibilityDialog
          noun="file"
          onOpenChange={closeOnDismiss(() => page.setAccessFile(undefined))}
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

function toMoveTarget(file: FileRow) {
  return moveTarget("file", file.fileId, file)
}
