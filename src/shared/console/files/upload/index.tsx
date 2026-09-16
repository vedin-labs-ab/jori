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
import { AdvancedSettings, DialogForm } from "@/shared/console/materials/form"
import { FolderPickerField } from "../../folders/field"
import { type FolderRow } from "../../folders/types"
import { type GrantOptions, VisibilityField } from "../../visibility/field"
import { FileDropzone } from "./dropzone"
import { UploadList } from "./list"
import {
  type FileUpload,
  pendingUploads,
  type UploadAction,
  useFileUpload,
} from "./queue"

export type { UploadAction, UploadValues } from "./queue"

/** The upload dialog: pick or drop files, set the folder and audience the
 *  batch shares, and hand each file to the host's upload one at a time.
 *  The host supplies the folder rows and grant options the fields offer,
 *  and what landing a file means. */
export function UploadFileDialog({
  folders,
  grantOptions,
  initialFolderId,
  isOpen,
  onOpenChange,
  upload,
}: {
  /** Undefined while the rows are still on their way. */
  folders: FolderRow[] | undefined
  grantOptions: GrantOptions
  /** Pre-selects the Folder field, e.g. on a folder page's "New" menu. */
  initialFolderId?: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  upload: UploadAction
}) {
  const state = useFileUpload(upload, initialFolderId ?? null, () =>
    onOpenChange(false)
  )
  const pending = pendingUploads(state.items).length
  const isDisabled = pending === 0 || state.isUploading

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!state.isUploading) {
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
        <DialogForm disabled={isDisabled} onSubmit={() => void state.submit()}>
          <UploadFields
            folders={folders}
            grantOptions={grantOptions}
            upload={state}
          />
          <DialogFooter>
            <Button disabled={isDisabled} type="submit">
              {state.isUploading ? <Loader2 className="animate-spin" /> : null}
              {pending > 1 ? `Upload ${pending} files` : "Upload"}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

function UploadFields({
  folders,
  grantOptions,
  upload,
}: {
  folders: FolderRow[] | undefined
  grantOptions: GrantOptions
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
        <FolderPickerField
          folders={folders}
          id="file-upload-folder"
          onChange={upload.setFolderId}
          value={upload.folderId}
        />
        <VisibilityField
          id="file-upload-visibility"
          noun="file"
          onChange={upload.setVisibility}
          options={grantOptions}
          value={upload.visibility}
        />
      </AdvancedSettings>
    </div>
  )
}
