import { type Visibility } from "@contracts/visibility"
import { useEffect, useState } from "react"
import { AudienceLine } from "@/shared/console/visibility/audience"
import { VisibilityDialog } from "@/shared/console/visibility/dialog"
import { VisibilityField } from "@/shared/console/visibility/field"
import { type AudienceTarget, resolveAudience } from "../derive/audience"
import { grantOptions, viewerId } from "../fixtures/people"
import { type VisibilityTarget } from "../state/types"
import { useDemoWorkspace } from "../workspace"

/** The sharing dialog over the workspace: a draft of who may see the
 *  target, said back as the people it reaches, saved in place. */
export function DemoVisibilityDialog({
  noun,
  onOpenChange,
  open,
  target,
  value,
}: {
  noun: string
  onOpenChange: (open: boolean) => void
  open: boolean
  target: VisibilityTarget
  value: Visibility
}) {
  const { actions } = useDemoWorkspace()
  const [draft, setDraft] = useState<Visibility>(value)

  useEffect(() => {
    if (open) {
      setDraft(value)
    }
  }, [open, value])

  return (
    <VisibilityDialog
      audience={<DemoAudience target={target} value={draft} />}
      canEdit
      field={
        <VisibilityField
          id={`${target.kind}-visibility`}
          noun={noun}
          onChange={setDraft}
          options={grantOptions}
          value={draft}
        />
      }
      isSaving={false}
      noun={noun}
      onOpenChange={onOpenChange}
      onSave={() => {
        actions.setVisibility(target, draft)
        onOpenChange(false)
      }}
      open={open}
    />
  )
}

/** Who a draft visibility reaches, with the folder that narrows it named
 *  the way the console names it. */
export function DemoAudience({
  target,
  value,
}: {
  target: AudienceTarget
  value: Visibility
}) {
  const { state } = useDemoWorkspace()
  const audience = resolveAudience(state, target, value)

  return (
    <AudienceLine audience={audience} mode={value.mode} viewerId={viewerId} />
  )
}
