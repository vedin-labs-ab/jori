import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

/** Post-creation access settings for one material or folder, opened from
 *  its menu or edit surface: the sharing field over who it reaches, and
 *  the way to keep or drop the draft. Owned targets accept changes from
 *  their owner only, so the dialog disables itself for everyone else. */
export function SharingDialog({
  audience,
  canEdit,
  field,
  isSaving,
  noun,
  onOpenChange,
  onSave,
  open,
}: {
  /** Who the draft reaches, said under the field. */
  audience: ReactNode
  canEdit: boolean
  /** The sharing field, bound to the draft. */
  field: ReactNode
  isSaving: boolean
  noun: string
  onOpenChange: (open: boolean) => void
  onSave: () => void
  open: boolean
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="sm:max-w-sm"
        // Autofocusing the field-help button pops its tooltip over the
        // freshly opened dialog, so focus stays where the pointer is.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Sharing</DialogTitle>
          <DialogDescription>
            {canEdit
              ? `Choose who can see this ${noun}.`
              : `Only the owner can change who sees this ${noun}.`}
          </DialogDescription>
        </DialogHeader>
        <SharingFields audience={audience} canEdit={canEdit} field={field} />
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!canEdit || isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? <Spinner /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The dialog's body on its own: the sharing field over who the draft
 *  reaches, for a page that shows sharing in place rather than in a
 *  dialog. Disabled as one, since neither says anything without the other. */
export function SharingFields({
  audience,
  canEdit,
  field,
}: {
  audience: ReactNode
  canEdit: boolean
  field: ReactNode
}) {
  return (
    <fieldset className="grid gap-2" disabled={!canEdit}>
      {field}
      {audience}
    </fieldset>
  )
}
