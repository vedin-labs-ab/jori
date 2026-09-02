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
import { DialogForm } from "@/shared/console/materials/form"
import { type Job } from "../types"
import { JobEditorFields, type JobEditorFieldsProps } from "./fields"

/** The job editor as the console opens it: a dialog around the editor's
 *  fields, titled for creating or editing, with the one button that saves.
 *  A creation offers the Folder field and an edit previews the next run;
 *  existing jobs move through the folder surfaces instead. */
export function JobEditorDialog({
  isOpen,
  isSaving,
  job,
  onOpenChange,
  onSave,
  ...fields
}: Omit<JobEditorFieldsProps, "showRunPreview"> & {
  isOpen: boolean
  isSaving: boolean
  /** The job being edited; undefined creates one. */
  job: Job | undefined
  onOpenChange: (isOpen: boolean) => void
  onSave: () => void
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isSaving) {
          return
        }

        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {job === undefined ? "New job" : "Edit job"}
          </DialogTitle>
          <DialogDescription>
            Tell Jori what to do, what it can access, and when to run.
          </DialogDescription>
        </DialogHeader>

        {/* Form semantics only: this editor spans several sections and an
            accidental Enter must not save it, so the explicit button stays
            the sole way to submit. */}
        <DialogForm>
          <JobEditorFields
            {...fields}
            folderField={job === undefined ? fields.folderField : undefined}
            showRunPreview={job !== undefined}
          />

          <DialogFooter>
            <Button type="button" onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {job === undefined ? "Create job" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}
