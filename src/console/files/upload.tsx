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
import { showErrorToast } from "../shared/error"
import { MaterialScopeField } from "../shared/materials/scope"

export function UploadFileDialog({
  isOpen,
  onCreated,
  onOpenChange,
  organizationId,
}: {
  isOpen: boolean
  /** Ran with the new file's id, e.g. to file it into a folder. */
  onCreated?: (fileId: string) => void
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const upload = useFileUpload(organizationId, (fileId) => {
    onOpenChange(false)
    onCreated?.(fileId)
  })

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
        <UploadFields upload={upload} />
        <DialogFooter>
          <Button
            disabled={upload.file === null || upload.isUploading}
            onClick={() => void upload.submit()}
            type="button"
          >
            {upload.isUploading ? <Loader2 className="animate-spin" /> : null}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UploadFields({ upload }: { upload: FileUpload }) {
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
  onUploaded: (fileId: string) => void
) {
  const generateUploadUrl = useMutation(api.files.console.uploadUrl)
  const createFile = useMutation(api.files.console.create)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState<Scope>("organization")
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
      const fileId = await createFile({
        organizationId,
        storageId,
        name: file.name,
        description: description.trim() === "" ? undefined : description,
        scope,
      })

      toast.success(`Uploaded ${file.name}.`)
      setFile(null)
      setDescription("")
      onUploaded(fileId)
    } catch (error) {
      showErrorToast(error, "Could not upload the file.")
    } finally {
      setIsUploading(false)
    }
  }

  return {
    description,
    file,
    isUploading,
    scope,
    setDescription,
    setFile,
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
