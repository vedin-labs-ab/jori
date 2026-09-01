import { useMutation, useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { CreationDialogs, type FolderCreation } from "./create/dialogs"
import { NewInFolderMenu } from "./create/menu"
import { FolderFrame } from "./frame"
import { FolderHeaderActions } from "./header"
import { FolderContents } from "./list/contents"
import { MoveResourceDialog } from "./move"
import { useFilingConfirmation } from "./move/confirm"
import { type FolderDetail, type FolderResource, toFiledType } from "./types"

/** A folder's page: everything filed here. */
export function FolderPage({ folderId }: { folderId: string }) {
  return (
    <FolderFrame folderId={folderId} view="contents">
      {(folder, organizationId, onNewFolder) => (
        <FolderContentsView
          folder={folder}
          onNewFolder={onNewFolder}
          organizationId={organizationId}
        />
      )}
    </FolderFrame>
  )
}

function FolderContentsView({
  folder,
  onNewFolder,
  organizationId,
}: {
  folder: FolderDetail
  onNewFolder: () => void
  organizationId: string
}) {
  const contents = useQuery(api.folders.console.contents, {
    organizationId,
    folderId: folder.folderId,
  })
  const [creation, setCreation] = useState<FolderCreation>()
  const [moving, setMoving] = useState<FolderResource>()
  const unfile = useUnfileResource(organizationId, folder)

  return (
    <>
      <FolderHeaderActions onCreate={setCreation} onNewFolder={onNewFolder} />
      <FolderContents
        contents={contents}
        folderId={folder.folderId}
        newMenu={
          <NewInFolderMenu onCreate={setCreation} onNewFolder={onNewFolder}>
            <Button type="button">
              <Plus />
              New
            </Button>
          </NewInFolderMenu>
        }
        onMove={setMoving}
        onUnfile={unfile.request}
      />
      <CreationDialogs
        onClose={() => setCreation(undefined)}
        organizationId={organizationId}
        request={
          creation === undefined
            ? undefined
            : { creation, folderId: folder.folderId }
        }
      />
      <MoveResourceDialog
        onClose={() => setMoving(undefined)}
        organizationId={organizationId}
        resource={movingResource(moving, folder)}
      />
      {unfile.dialog}
    </>
  )
}

/** Resources listed here sit in this folder by definition. */
function movingResource(
  resource: FolderResource | undefined,
  folder: FolderDetail
) {
  return resource === undefined
    ? undefined
    : {
        resourceType: toFiledType(resource.type),
        resourceId: resource.id,
        name: resource.name,
        folderId: folder.folderId,
      }
}

/** Leaving a folder widens an audience as surely as entering one narrows
 *  it, so unfiling asks the same question a move does. */
function useUnfileResource(organizationId: string, folder: FolderDetail) {
  const file = useMutation(api.folders.console.file)
  const confirmation = useFilingConfirmation(organizationId)
  const unfile = async (resource: FolderResource) => {
    try {
      await file({
        organizationId,
        resourceType: toFiledType(resource.type),
        resourceId: resource.id,
        folderId: null,
      })
      toast.success(`Moved ${resource.name} out of ${folder.name}.`)
    } catch (error) {
      showErrorToast(error, "Could not remove it from the folder.")
    }
  }

  return {
    dialog: confirmation.dialog,
    request: (resource: FolderResource) =>
      confirmation.request({
        resourceType: toFiledType(resource.type),
        resourceId: resource.id,
        name: resource.name,
        folderId: null,
        run: () => unfile(resource),
      }),
  }
}
