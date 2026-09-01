import { type Visibility } from "@contracts/visibility"
import { useMutation, useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { useEffect, useState } from "react"
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
import { Spinner } from "@/components/ui/spinner"
import { api } from "../../../../convex/_generated/api"
import { AudienceSummary } from "./audience"
import { VisibilityField } from "./field"

type SetVisibilityArgs = FunctionArgs<typeof api.visibility.console.set>

export type VisibilityTarget = SetVisibilityArgs["target"]

/** Post-creation access settings for one material or folder, opened from
 *  its menu or edit surface. Saves through the one visibility mutation;
 *  owned targets accept changes from their owner only, so the dialog
 *  disables itself for everyone else. */
export function VisibilityDialog({
  noun,
  onOpenChange,
  open,
  organizationId,
  ownerId,
  target,
  value,
}: {
  noun: string
  onOpenChange: (open: boolean) => void
  open: boolean
  organizationId: string
  /** The owning person; undefined targets accept changes from any member. */
  ownerId?: string
  target: VisibilityTarget
  value: Visibility
}) {
  const [draft, setDraft] = useState<Visibility>(value)
  const [isSaving, setIsSaving] = useState(false)
  const setVisibility = useMutation(api.visibility.console.set)
  const grantees = useQuery(
    api.visibility.console.grantees,
    open ? { organizationId } : "skip"
  )
  const canEdit =
    ownerId === undefined ||
    grantees === undefined ||
    grantees.viewerId === ownerId

  useEffect(() => {
    if (open) {
      setDraft(value)
    }
  }, [open, value])

  const save = async () => {
    setIsSaving(true)

    try {
      await setVisibility({
        organizationId,
        target,
        visibility: draft as SetVisibilityArgs["visibility"],
      })
      onOpenChange(false)
    } catch {
      toast.error(`Could not update who can see this ${noun}.`)
    } finally {
      setIsSaving(false)
    }
  }

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
        <fieldset className="grid gap-2" disabled={!canEdit}>
          <VisibilityField
            id={`${target.kind}-visibility`}
            noun={noun}
            onChange={setDraft}
            organizationId={organizationId}
            value={draft}
          />
          <AudienceSummary
            organizationId={organizationId}
            target={target}
            value={draft}
          />
        </fieldset>
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
            onClick={() => void save()}
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
