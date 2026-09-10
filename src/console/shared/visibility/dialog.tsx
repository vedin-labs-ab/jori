import { type Visibility } from "@contracts/visibility"
import { useMutation, useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type ReactNode, useEffect, useState } from "react"
import { toast } from "sonner"
import { VisibilityDialog } from "@/shared/console/visibility/dialog"
import { api } from "../../../../convex/_generated/api"
import { AudienceSummary } from "./audience"
import { OrganizationVisibilityField } from "./field"

type SetVisibilityArgs = FunctionArgs<typeof api.visibility.console.set>

export type VisibilityTarget = SetVisibilityArgs["target"]

/** The sharing dialog bound to one material or folder: its draft, the
 *  organization's grantees, and the one visibility mutation that saves
 *  it. Owned targets accept changes from their owner only. */
export function OrganizationVisibilityDialog({
  noun,
  notice,
  onOpenChange,
  open,
  organizationId,
  ownerId,
  target,
  value,
}: {
  noun: string
  notice?: (draft: Visibility) => ReactNode
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
    <VisibilityDialog
      audience={
        <AudienceSummary
          organizationId={organizationId}
          target={target}
          value={draft}
        />
      }
      canEdit={canEdit}
      field={
        <OrganizationVisibilityField
          id={`${target.kind}-visibility`}
          noun={noun}
          onChange={setDraft}
          organizationId={organizationId}
          value={draft}
        />
      }
      isSaving={isSaving}
      noun={noun}
      notice={notice?.(draft)}
      onOpenChange={onOpenChange}
      onSave={() => void save()}
      open={open}
    />
  )
}
