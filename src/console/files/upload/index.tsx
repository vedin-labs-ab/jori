import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FolderField } from "../../folders/field"
import { AdvancedSettings, DialogForm } from "../../shared/materials/form"
import { VisibilityField } from "../../shared/visibility/field"
import { FileDropzone } from "./dropzone"
import { UploadList } from "./list"
import { type FileUpload, pendingUploads, useFileUpload } from "./queue"

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
  const upload = useFileUpload(organizationId, initialFolderId ?? null, () =>
    onOpenChange(false)
  )
  const pending = pendingUploads(upload.items).length
  const isDisabled = pending === 0 || upload.isUploading

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!upload.isUploading) {
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Add files to the workspace so Jori and your team can use them.
          </DialogDescription>
        </DialogHeader>
        <DialogForm disabled={isDisabled} onSubmit={() => void upload.submit()}>
          <UploadFields organizationId={organizationId} upload={upload} />
          <DialogFooter>
            <Button disabled={isDisabled} type="submit">
              {upload.isUploading ? <Loader2 className="animate-spin" /> : null}
              {pending > 1 ? `Upload ${pending} files` : "Upload"}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

function UploadFields({
  organizationId,
  upload,
}: {
  organizationId: string
  upload: FileUpload
}) {
  return (
    <div className="grid gap-4">
      {/* The dropzone and its queue read as one control, so they sit a
          notch tighter than the form sections around them. */}
      <div className="grid gap-3">
        <FileDropzone disabled={upload.isUploading} onFiles={upload.addFiles} />
        <UploadList
          disabled={upload.isUploading}
          items={upload.items}
          onClear={upload.clear}
          onRemove={upload.removeFile}
        />
      </div>
      <AdvancedSettings>
        <FolderField
          id="file-upload-folder"
          onChange={upload.setFolderId}
          organizationId={organizationId}
          value={upload.folderId}
        />
        <VisibilityField
          id="file-upload-visibility"
          noun="file"
          onChange={upload.setVisibility}
          organizationId={organizationId}
          value={upload.visibility}
        />
      </AdvancedSettings>
    </div>
  )
}
