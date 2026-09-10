import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { showErrorToast } from "../../error"
import { DialogForm } from "../../materials/form"

/** Name-only form shared by folder create and rename; the name is validated
 *  on submit, like the other material dialogs, and the host's save says
 *  what became of it. */
export function FolderNameDialog({
  initialName,
  isOpen,
  onOpenChange,
  onSubmit,
  submitLabel,
  title,
}: {
  initialName: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (name: string) => Promise<void>
  submitLabel: string
  title: string
}) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)
  const [wasOpen, setWasOpen] = useState(isOpen)

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)

    if (isOpen) {
      setName(initialName)
      setError(undefined)
    }
  }

  async function submit() {
    if (name.trim() === "") {
      setError("Name is required.")

      return
    }

    setIsSaving(true)

    try {
      await onSubmit(name.trim())
      onOpenChange(false)
    } catch (submitError) {
      showErrorToast(submitError, "Could not save the folder.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!isSaving) {
          onOpenChange(open)
        }
      }}
      open={isOpen}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogForm disabled={isSaving} onSubmit={() => void submit()}>
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              aria-invalid={error === undefined ? undefined : true}
              id="folder-name"
              onChange={(event) => {
                setName(event.target.value)
                setError(undefined)
              }}
              value={name}
            />
            <FieldError>{error}</FieldError>
          </div>
          <DialogFooter>
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}
