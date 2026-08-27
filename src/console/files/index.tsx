import { useMutation } from "convex/react"
import { Upload } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { showErrorToast } from "../shared/error"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsolePageLayout,
} from "../shared/layout"
import { ConsoleListPager } from "../shared/list/pager"
import { EditFileDialog } from "./edit"
import { useFilePagination } from "./pagination"
import { FileTable } from "./table"
import { type FileRow } from "./types"
import { UploadFileDialog } from "./upload"

export function FilesPage() {
  return (
    <ConsolePage>
      {(organizationId) => <FilesCard organizationId={organizationId} />}
    </ConsolePage>
  )
}

function FilesCard({ organizationId }: { organizationId: string }) {
  const pagination = useFilePagination(organizationId)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editFile, setEditFile] = useState<FileRow>()
  const actions = useFileActions(organizationId, () => setEditFile(undefined))

  return (
    <ConsolePageLayout>
      <ConsoleHeaderActions>
        <ConsoleHeaderButton
          className="w-fit"
          icon={<Upload />}
          label="Upload file"
          onClick={() => setIsUploadOpen(true)}
          type="button"
        />
      </ConsoleHeaderActions>

      <FileTable
        files={pagination.visibleRows}
        isLoading={pagination.isLoading}
        onDelete={actions.deleteFile}
        onEdit={setEditFile}
        pendingFileId={actions.pendingFileId}
      />
      <ConsoleListPager pagination={pagination} />

      <UploadFileDialog
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        organizationId={organizationId}
      />
      <EditFileDialog
        file={editFile}
        isSaving={
          editFile !== undefined && actions.pendingFileId === editFile.fileId
        }
        onOpenChange={(open) => {
          if (!open) {
            setEditFile(undefined)
          }
        }}
        onSave={actions.saveFile}
      />
    </ConsolePageLayout>
  )
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
