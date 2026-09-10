import { useRef, useState } from "react"
import { grantOptions } from "@/landing/demo/fixtures/people"
import { useDemoFolders, useDemoWorkspace } from "@/landing/demo/workspace"
import { FolderPickerField } from "@/shared/console/folders/field"
import { CreateMaterialDialog } from "@/shared/console/materials/dialogs/create"
import { tableCreateBlurb } from "@/shared/console/tables/list/config"

/** Real create form and local workspace write, with a delayed service result. */
export function CreationState({ state }: { state: string }) {
  const [open, setOpen] = useState(true)
  const attempts = useRef(0)
  const folders = useDemoFolders()
  const { actions } = useDemoWorkspace()

  return (
    <CreateMaterialDialog
      blurb={tableCreateBlurb}
      create={async (values) => {
        const attempt = attempts.current++
        await new Promise((resolve) => setTimeout(resolve, 1100))
        if (state === "create-error" && attempt === 0) {
          throw new Error("Layout fixture simulated creation failure")
        }
        actions.createMaterial("table", values)
      }}
      folderField={(field) => (
        <FolderPickerField {...field} folders={folders} />
      )}
      grantOptions={grantOptions}
      isOpen={open}
      noun="table"
      onOpenChange={setOpen}
    />
  )
}
