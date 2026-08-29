import { useMutation, useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { UploadFileDialog } from "../files/upload"
import { ConsolePage } from "../page"
import { showErrorToast } from "../shared/error"
import { ConsolePageLayout, ConsoleScrollableGrid } from "../shared/layout"
import { ConsoleListSkeleton } from "../shared/list/skeleton"
import {
  type MaterialBreadcrumb,
  useMaterialTrail,
} from "../shared/materials/breadcrumb"
import { CreateStoreDialog } from "../stores/create"
import { CreateTableDialog } from "../tables/create"
import { FolderContents } from "./contents"
import {
  type FolderCreation,
  FolderHeaderActions,
  NewInFolderMenu,
} from "./header"
import { useLeaveDeletedFolder } from "./leave"
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
      <ConsolePageLayout>
        <ConsoleListSkeleton />
      </ConsolePageLayout>
    )
  }

  if (detail.status === "unauthorized") {
    return (
      <ConsolePageLayout>
        <Alert variant="destructive">
          <AlertTitle>Could not load the folder</AlertTitle>
          <AlertDescription>{detail.message}</AlertDescription>
        </Alert>
      </ConsolePageLayout>
    )
  }

  if (folder === undefined) {
    return (
      <ConsolePageLayout>
        <Alert>
          <AlertTitle>Folder not found</AlertTitle>
          <AlertDescription>
            The folder may have been deleted or belongs to another organization.
          </AlertDescription>
        </Alert>
      </ConsolePageLayout>
    )
  }

  return <FolderReadyView folder={folder} organizationId={organizationId} />
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
    <ConsolePageLayout>
      <FolderHeaderActions
        folder={folder}
        onCreate={setCreation}
        onDialog={setDialog}
      />
      <ConsoleScrollableGrid>
        <FolderContents
          contents={contents}
          folderId={folder.folderId}
          newMenu={
            <NewInFolderMenu
              folderId={folder.folderId}
              onCreate={setCreation}
              onDialog={setDialog}
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
      </ConsoleScrollableGrid>
      <FolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        onDeleted={leaveDeletedFolder}
        organizationId={organizationId}
      />
      <CreationDialogs
        creation={creation}
        folderId={folder.folderId}
        onClose={() => setCreation(undefined)}
        organizationId={organizationId}
      />
      <MoveResourceDialog
        onClose={() => setMoving(undefined)}
        organizationId={organizationId}
        resource={movingResource(moving, folder)}
      />
    </ConsolePageLayout>
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

/** The existing create dialogs with this folder pre-selected in their
 *  Folder field, so creation lands here atomically. */
function CreationDialogs({
  creation,
  folderId,
  onClose,
  organizationId,
}: {
  creation: FolderCreation | undefined
  folderId: string
  onClose: () => void
  organizationId: string
}) {
  function closeWhenDismissed(open: boolean) {
    if (!open) {
      onClose()
    }
  }

  return (
    <>
      <CreateTableDialog
        initialFolderId={folderId}
        isOpen={creation === "table"}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
      <CreateStoreDialog
        initialFolderId={folderId}
        isOpen={creation === "store"}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
      <UploadFileDialog
        initialFolderId={folderId}
        isOpen={creation === "file"}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
    </>
  )
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

function folderBreadcrumb(
  folder: FolderDetail | undefined
): MaterialBreadcrumb | undefined {
  if (folder === undefined) {
    return undefined
  }

  return {
    name: folder.name,
    trail: folder.path.slice(0, -1).map((segment) => ({
      name: segment.name,
      to: "/folders/$folderId",
      params: { folderId: segment.folderId },
    })),
  }
}
