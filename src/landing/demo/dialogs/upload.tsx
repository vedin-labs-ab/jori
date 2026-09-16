import { UploadFileDialog } from "@/shared/console/files/upload"
import { grantOptions } from "../fixtures/people"
import { useDemoFolders, useDemoWorkspace } from "../workspace"

/** How long one file "uploads" in the workspace. Nothing leaves the page,
 *  but the row still passes through its uploading state the way it would
 *  against storage, so the flow reads the same. */
export const uploadPause = 350

/** The console's upload dialog over the workspace: the files a person
 *  picks land in memory, filed and shared the way the dialog was set, and
 *  open in the same viewer the console gives an upload. */
export function DemoUploadDialog({
  initialFolderId,
  isOpen,
  onOpenChange,
}: {
  initialFolderId?: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}) {
  const { actions } = useDemoWorkspace()
  const folders = useDemoFolders()

  return (
    <UploadFileDialog
      folders={folders}
      grantOptions={grantOptions}
      initialFolderId={initialFolderId}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      upload={async (file, values) => {
        await new Promise((resolve) => setTimeout(resolve, uploadPause))
        actions.addFile(file, values)
      }}
    />
  )
}
