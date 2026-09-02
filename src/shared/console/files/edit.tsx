import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
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
import { DialogForm } from "@/shared/console/materials/form"
import { type FileRow } from "./types"

export function EditFileDialog({
  file,
  isSaving,
  onOpenChange,
  onSave,
}: {
  file: FileRow | undefined
  isSaving: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: (file: FileRow, values: { name: string; description: string }) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    setName(file?.name ?? "")
    setDescription(file?.description ?? "")
  }, [file])

  return (
    <Dialog
      open={file !== undefined}
      onOpenChange={(open) => {
        if (!isSaving) {
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit file</DialogTitle>
          <DialogDescription>
            Rename the file or update its description.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={file === undefined || name.trim() === "" || isSaving}
          onSubmit={() => {
            if (file !== undefined) {
              onSave(file, { name, description })
            }
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="file-edit-name">Name</Label>
            <Input
              id="file-edit-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="file-edit-description">Description</Label>
            <Input
              id="file-edit-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional note that helps others find it"
              value={description}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={file === undefined || name.trim() === "" || isSaving}
              type="submit"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}
