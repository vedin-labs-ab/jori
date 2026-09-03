import { useEffect } from "react"
import { toast } from "sonner"
import { FolderPickerField } from "@/shared/console/folders/field"
import { type CreationRequest } from "@/shared/console/folders/types"
import { CreateMaterialDialog } from "@/shared/console/materials/dialogs/create"
import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { storeCreateBlurb } from "@/shared/console/stores/list/config"
import { tableCreateBlurb } from "@/shared/console/tables/list/config"
import { useJobEditor } from "../editor"
import { grantOptions } from "../fixtures/people"
import { useDemoFolders, useDemoWorkspace } from "../workspace"

const blurbs = {
  table: tableCreateBlurb,
  store: storeCreateBlurb,
} as const

/** The resource creation dialogs, shared by the folder page and the sidebar
 *  tree. Tables and stores open their create dialog; a job opens the page's
 *  editor; a file has nowhere to be uploaded to here. */
export function DemoCreationDialogs({
  onClose,
  request,
}: {
  onClose: () => void
  request: CreationRequest | undefined
}) {
  const editor = useJobEditor()

  useEffect(() => {
    if (request?.creation === "job") {
      editor.openCreateForm(request.folderId)
      onClose()
    } else if (request?.creation === "file") {
      toast("Files upload from the console.")
      onClose()
    }
  }, [editor, onClose, request])

  return (
    <>
      <DemoCreateMaterialDialog
        kind="table"
        onClose={onClose}
        request={request?.creation === "table" ? request : undefined}
      />
      <DemoCreateMaterialDialog
        kind="store"
        onClose={onClose}
        request={request?.creation === "store" ? request : undefined}
      />
    </>
  )
}

/** The create dialog for one material kind, over the workspace. */
export function DemoCreateMaterialDialog({
  kind,
  onClose,
  request,
}: {
  kind: "table" | "store"
  onClose: () => void
  /** Open while set; the last one is kept through the close animation. */
  request: CreationRequest | undefined
}) {
  const { actions } = useDemoWorkspace()
  const folders = useDemoFolders()
  const retained = useRetained(request)

  return (
    <CreateMaterialDialog
      blurb={blurbs[kind]}
      create={(args) => {
        actions.createMaterial(kind, args)

        return Promise.resolve()
      }}
      folderField={(field) => (
        <FolderPickerField {...field} folders={folders} />
      )}
      grantOptions={grantOptions}
      initialFolderId={retained?.folderId}
      isOpen={request !== undefined}
      key={`${kind}:${retained?.folderId}`}
      noun={kind}
      onOpenChange={closeOnDismiss(onClose)}
    />
  )
}
