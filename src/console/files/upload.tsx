import { type Scope } from "@contracts/permissions/scope"
import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "../../../convex/_generated/api"
import { FolderField } from "../folders/field"
import { showErrorToast } from "../shared/error"
import { DialogForm } from "../shared/materials/form"
import { MaterialScopeField } from "../shared/materials/scope"

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
          <DialogTitle>Upload file</DialogTitle>
          <DialogDescription>
            Add a file to the workspace so Jori and your team can use it.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={upload.file === null || upload.isUploading}
          onSubmit={() => void upload.submit()}
        >
          <UploadFields organizationId={organizationId} upload={upload} />
          <DialogFooter>
            <Button
              disabled={upload.file === null || upload.isUploading}
              type="submit"
            >
              {upload.isUploading ? <Loader2 className="animate-spin" /> : null}
              Upload
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
      <div className="grid gap-2">
        <Label htmlFor="file-upload-input">File</Label>
        <Input
          id="file-upload-input"
          onChange={(event) =>
            upload.setFile(event.target.files?.item(0) ?? null)
          }
          type="file"
        />
      </div>
      <MaterialScopeField
        id="file-upload-scope"
        noun="file"
        onScopeChange={upload.setScope}
        scope={upload.scope}
      />
      <FolderField
        id="file-upload-folder"
        onChange={upload.setFolderId}
        organizationId={organizationId}
        value={upload.folderId}
      />
      <div className="grid gap-2">
        <Label htmlFor="file-upload-description">Description</Label>
        <Input
          id="file-upload-description"
          onChange={(event) => upload.setDescription(event.target.value)}
          placeholder="Optional note that helps others find it"
          value={upload.description}
        />
      </div>
    </div>
  )
}

type FileUpload = ReturnType<typeof useFileUpload>

function useFileUpload(
  organizationId: string,
  initialFolderId: string | null,
  onUploaded: () => void
) {
  const generateUploadUrl = useMutation(api.files.console.uploadUrl)
  const createFile = useMutation(api.files.console.create)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState<Scope>("organization")
  const [folderId, setFolderId] = useState(initialFolderId)
  const [isUploading, setIsUploading] = useState(false)

  async function submit() {
    if (file === null || isUploading) {
      return
    }

    setIsUploading(true)

    try {
      const storageId = await uploadToStorage(
        await generateUploadUrl({ organizationId }),
        file
      )

      await createFile({
        organizationId,
        storageId,
        name: file.name,
        description: description.trim() === "" ? undefined : description,
        scope,
        folderId:
          folderId === null ? undefined : (folderId as GenericId<"folders">),
      })

      toast.success(`Uploaded ${file.name}.`)
      setFile(null)
      setDescription("")
      setFolderId(initialFolderId)
      onUploaded()
    } catch (error) {
      showErrorToast(error, "Could not upload the file.")
    } finally {
      setIsUploading(false)
    }
  }

  return {
    description,
    file,
    folderId,
    isUploading,
    scope,
    setDescription,
    setFile,
    setFolderId,
    setScope,
    submit,
  }
}

async function uploadToStorage(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": file.type === "" ? "application/octet-stream" : file.type,
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${await response.text()}`)
  }

  const { storageId } = (await response.json()) as {
    storageId: GenericId<"_storage">
  }

  return storageId
}
