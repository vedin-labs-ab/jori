import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { materialMoveSubject } from "../derive/materials"
import { type DemoMaterial } from "../fixtures/types"
import { DemoMoveDialog } from "./move"
import { DemoVisibilityDialog } from "./visibility"

/** What a material's menu can open: its sharing, or a move. Renaming opens
 *  nothing: the name is edited in place. */
export type MaterialRequest = {
  kind: "access" | "move"
  material: DemoMaterial
}

/** The dialogs a material's menu opens, over the workspace. The last
 *  material is kept so a closing dialog does not empty mid-animation. */
export function MaterialDialogs({
  onClose,
  request,
}: {
  onClose: () => void
  request: MaterialRequest | undefined
}) {
  const retained = useRetained(request)
  const material = retained?.material

  const closeWhenDismissed = closeOnDismiss(onClose)

  if (material === undefined) {
    return null
  }

  return (
    <>
      <DemoVisibilityDialog
        noun={material.kind}
        onOpenChange={closeWhenDismissed}
        open={request?.kind === "access"}
        target={{ kind: material.kind, id: material.id }}
        value={material.visibility}
      />
      <DemoMoveDialog
        onOpenChange={closeWhenDismissed}
        subject={
          request?.kind === "move" ? materialMoveSubject(material) : undefined
        }
      />
    </>
  )
}
