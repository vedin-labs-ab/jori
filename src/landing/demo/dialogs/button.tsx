import { type Visibility } from "@contracts/visibility"
import { useState } from "react"
import { VisibilityButton } from "@/shared/console/visibility/badge"
import { type VisibilityTarget } from "../state/types"
import { DemoVisibilityDialog } from "./visibility"

export function DemoVisibilityButton({
  target,
  folderId,
  ownerId,
  visibility,
}: {
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
      <DemoVisibilityDialog
        noun={target.kind}
        onOpenChange={setOpen}
        open={open}
        target={target}
        value={visibility}
      />
    </>
  )
}
