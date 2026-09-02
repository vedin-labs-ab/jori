import { EditFileDialog } from "@/shared/console/files/edit"
import { EditMaterialDialog } from "@/shared/console/materials/dialogs/edit"
import { useRetained } from "@/shared/console/retain"
import { storeEditBlurb } from "@/shared/console/stores/list/config"
import { tableEditBlurb } from "@/shared/console/tables/list/config"
import { fileRowOf, materialMoveSubject } from "../derive/materials"
import { type DemoMaterial } from "../fixtures/types"
import { useDemoWorkspace } from "../workspace"
import { DemoMoveDialog } from "./move"
import { DemoVisibilityDialog } from "./visibility"

/** What a material's menu can open: its details, its sharing, or a move. */
export type MaterialRequest = {
  kind: "access" | "edit" | "move"
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

  function closeWhenDismissed(open: boolean) {
    if (!open) {
      onClose()
    }
  }

  if (material === undefined) {
    return null
  }

  return (
    <>
      <MaterialEditDialog
        material={material}
        onClose={onClose}
        onOpenChange={closeWhenDismissed}
        open={request?.kind === "edit"}
      />
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

/** A file's details are its own dialog; a table's and a store's share one. */
function MaterialEditDialog({
  material,
  onClose,
  onOpenChange,
  open,
}: {
  material: DemoMaterial
  onClose: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { actions } = useDemoWorkspace()

  if (material.kind === "file") {
    return (
      <EditFileDialog
        file={open ? fileRowOf(material) : undefined}
        isSaving={false}
        onOpenChange={onOpenChange}
        onSave={(file, values) => {
          actions.updateMaterial(file.fileId, values)
          onClose()
        }}
      />
    )
  }

  return (
    <EditMaterialDialog
      blurb={material.kind === "table" ? tableEditBlurb : storeEditBlurb}
      isSaving={false}
      material={open ? material : undefined}
      noun={material.kind}
      onOpenChange={onOpenChange}
      onSave={(values) => {
        actions.updateMaterial(material.id, values)
        onClose()
      }}
    />
  )
}
