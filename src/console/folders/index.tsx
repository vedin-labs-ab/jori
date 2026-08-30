import { useMutation, useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { Plus } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { showErrorToast } from "../shared/error"
import { ConsoleListContent, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListLoading } from "../shared/list/loading"
import {
  type MaterialBreadcrumb,
  useMaterialTrail,
} from "../shared/materials/breadcrumb"
import { CreationDialogs, type FolderCreation } from "./create/dialogs"
import { NewInFolderMenu } from "./create/menu"
import { FolderHeaderActions } from "./header"
import { useLeaveDeletedFolder } from "./leave"
import { FolderContents } from "./list/contents"
import { type FolderDialogRequest, FolderDialogs } from "./manage"
import { MoveResourceDialog } from "./move"
import { type FolderDetail, type FolderResource, toFiledType } from "./types"

export function FolderPage({ folderId }: { folderId: string }) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <FolderView
          folderId={folderId as GenericId<"folders">}
          organizationId={organizationId}
        />
      )}
    </ConsolePage>
  )
}

function FolderView({
  folderId,
  organizationId,
}: {
  folderId: GenericId<"folders">
  organizationId: string
}) {
  const detail = useQuery(api.folders.console.get, {
    organizationId,
    folderId,
  })
  const folder = detail?.status === "ready" ? detail.folder : undefined

  useMaterialTrail(useMemo(() => folderBreadcrumb(folder), [folder]))

  if (detail === undefined) {
    return (
      <FolderFallback>
        <ConsoleListLoading />
      </FolderFallback>
    )
  }

  if (detail.status === "unauthorized") {
    return (
      <FolderFallback>
        <Alert variant="destructive">
          <AlertTitle>Could not load the folder</AlertTitle>
          <AlertDescription>{detail.message}</AlertDescription>
        </Alert>
      </FolderFallback>
    )
  }

  if (folder === undefined) {
    return (
      <FolderFallback>
        <Alert>
          <AlertTitle>Folder not found</AlertTitle>
          <AlertDescription>
            The folder may have been deleted or belongs to another organization.
          </AlertDescription>
        </Alert>
      </FolderFallback>
    )
  }

  return <FolderReadyView folder={folder} organizationId={organizationId} />
}

/** What replaces the whole page before there is a folder to list. */
function FolderFallback({ children }: { children: ReactNode }) {
  return (
    <ConsoleListLayout>
      <ConsoleListContent>{children}</ConsoleListContent>
    </ConsoleListLayout>
  )
}

function FolderReadyView({
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
  const leaveDeletedFolder = useLeaveDeletedFolder(folder.folderId)

  return (
    <ConsoleListLayout>
      <FolderHeaderActions
        folder={folder}
        onCreate={setCreation}
        onDialog={setDialog}
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
    </ConsoleListLayout>
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

/** The folder's header crumb: the /folders overview leads the trail —
 *  every material page starts from its parent surface — then the ancestor
 *  folders, then the folder itself as the current page. */
function folderBreadcrumb(
  folder: FolderDetail | undefined
): MaterialBreadcrumb | undefined {
  if (folder === undefined) {
    return undefined
  }

  return {
    name: folder.name,
    trail: [
      { name: "Folders", to: "/folders" },
      ...folder.path.slice(0, -1).map((segment) => ({
        name: segment.name,
        to: "/folders/$folderId",
        params: { folderId: segment.folderId },
      })),
    ],
  }
}
