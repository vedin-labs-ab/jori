import { useState } from "react"
import { useMaterialUpdate } from "@/console/shared/materials/update"
import { EditMaterialDialog } from "@/shared/console/materials/dialogs/edit"
import { tableEditBlurb } from "@/shared/console/tables/list/config"

/** Only the service outcome is simulated. The save hook and view are real. */
export function PendingDialog({ state }: { state: string }) {
  const [open, setOpen] = useState(true)
  const [material] = useState({ name: "Customer renewals" })
  const update = useMaterialUpdate(
    "table",
    () =>
      new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (state === "save-error") {
            reject(new Error("Layout fixture simulated update failure"))
          } else {
            resolve()
          }
        }, 1100)
      }),
    () => setOpen(false)
  )

  return (
    <EditMaterialDialog
      blurb={tableEditBlurb}
      isSaving={update.isSaving}
      material={open ? material : undefined}
      noun="table"
      onOpenChange={setOpen}
      onSave={update.save}
    />
  )
}
