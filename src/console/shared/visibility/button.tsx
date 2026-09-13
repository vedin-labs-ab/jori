import { type Visibility } from "@contracts/visibility"
import { useState } from "react"
import { VisibilityButton } from "@/shared/console/visibility/badge"
import { OrganizationVisibilityDialog, type VisibilityTarget } from "./dialog"

/** A pane's access control uses the same dialog and permissions as its page. */
export function OrganizationVisibilityButton({
  organizationId,
  target,
  folderId,
  ownerId,
  visibility,
}: {
  organizationId: string
  target: VisibilityTarget
  folderId?: string
  ownerId?: string
  visibility: Visibility
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <VisibilityButton
        folderId={folderId}
        ownerId={ownerId}
        visibility={visibility}
        onClick={() => setOpen(true)}
      />
      <OrganizationVisibilityDialog
        noun={target.kind}
        onOpenChange={setOpen}
        open={open}
        organizationId={organizationId}
        ownerId={ownerId}
        target={target}
        value={visibility}
      />
    </>
  )
}
