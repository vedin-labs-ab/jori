import { useMutation, useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { CreationDialogs, type FolderCreation } from "./create/dialogs"
import { NewInFolderMenu } from "./create/menu"
import { useLeaveDeletedFolder } from "./delete/leave"
import { FolderFrame } from "./frame"
import { FolderHeaderActions } from "./header"
import { FolderContents } from "./list/contents"
import { type FolderDialogRequest, FolderDialogs } from "./manage"
import { MoveResourceDialog } from "./move"
import { type FolderDetail, type FolderResource, toFiledType } from "./types"
import { FolderUsageLine } from "./usage/line"

/** A folder's Contents tab: everything filed here, headed by the month's
 *  spend whenever there is any. */
export function FolderPage({ folderId }: { folderId: string }) {
  return (
    <FolderFrame folderId={folderId} tab="contents">
      {(folder, organizationId) => (
        <FolderContentsView folder={folder} organizationId={organizationId} />
      )}
    </FolderFrame>
  )
}

function FolderContentsView({
  folder,
  organizationId,
}: {
  folder: FolderDetail
  organizationId: string
}) {
  const contents = useQuery(api.folders.console.contents, {
    organizationId,
    folderId: folder.folderId,
  })
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const [creation, setCreation] = useState<FolderCreation>()
  const [moving, setMoving] = useState<FolderResource>()
  const unfile = useUnfileResource(organizationId, folder)
  // The page's own trail: deleting any folder on it takes this page too.
  const leaveDeletedFolder = useLeaveDeletedFolder(
    useMemo(() => folder.path.map((segment) => segment.folderId), [folder.path])
  )

  return (
    <>
      <FolderHeaderActions
        folder={folder}
        onCreate={setCreation}
        onDialog={setDialog}
      />
      <FolderUsageLine
        folderId={folder.folderId}
        organizationId={organizationId}
      />
      <FolderContents
        contents={contents}
        folderId={folder.folderId}
        newMenu={
          <NewInFolderMenu
            onCreate={setCreation}
            onNewFolder={() =>
              setDialog({ type: "create", parentId: folder.folderId })
            }
          >
            <Button type="button">
              <Plus />
              New
            </Button>
          </NewInFolderMenu>
        }
        onMove={setMoving}
        onUnfile={unfile}
      />
      <FolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        onDeleted={leaveDeletedFolder}
        organizationId={organizationId}
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

function useUnfileResource(organizationId: string, folder: FolderDetail) {
  const file = useMutation(api.folders.console.file)

  return (resource: FolderResource) => {
    void file({
      organizationId,
      resourceType: toFiledType(resource.type),
      resourceId: resource.id,
      folderId: null,
    })
      .then(() =>
        toast.success(`Moved ${resource.name} out of ${folder.name}.`)
      )
      .catch((error: unknown) =>
        showErrorToast(error, "Could not remove it from the folder.")
      )
  }
}
