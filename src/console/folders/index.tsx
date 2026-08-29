import { useNavigate } from "@tanstack/react-router"
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
import { type FolderDialogRequest, FolderDialogs } from "./manage"
import { MoveResourceDialog } from "./move"
import {
  type FiledResourceType,
  type FolderDetail,
  type FolderResource,
  type FolderRow,
  toFiledType,
} from "./types"

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
  const folder =
    detail?.status === "ready" ? (detail.folder ?? undefined) : undefined

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
  const navigate = useNavigate()
  const contents = useQuery(api.folders.console.contents, {
    organizationId,
    folderId: folder.folderId,
  })
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const [creation, setCreation] = useState<FolderCreation>()
  const [moving, setMoving] = useState<FolderResource>()
  const filing = useFolderFiling(organizationId, folder)

  /** Deleting the folder being viewed leaves its page for the parent's. */
  function leaveDeletedFolder(deleted: FolderRow) {
    if (deleted.folderId !== folder.folderId) {
      return
    }

    if (deleted.parentId === undefined) {
      void navigate({ to: "/runs" })
    } else {
      void navigate({
        to: "/folders/$folderId",
        params: { folderId: deleted.parentId },
      })
    }
  }

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
          onUnfile={filing.unfile}
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
        filing={filing}
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
        resourceType: toFiledType(resource),
        resourceId: resource.id,
        name: resource.name,
        folderId: folder.folderId,
      }
}

/** The existing create dialogs, composed unchanged: each reports the new
 *  resource's id, and the folder files it right after. */
function CreationDialogs({
  creation,
  filing,
  onClose,
  organizationId,
}: {
  creation: FolderCreation | undefined
  filing: ReturnType<typeof useFolderFiling>
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
        isOpen={creation === "table"}
        onCreated={filing.fileCreated("collection")}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
      <CreateStoreDialog
        isOpen={creation === "store"}
        onCreated={filing.fileCreated("collection")}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
      <UploadFileDialog
        isOpen={creation === "file"}
        onCreated={filing.fileCreated("file")}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
    </>
  )
}

function useFolderFiling(organizationId: string, folder: FolderDetail) {
  const file = useMutation(api.folders.console.file)

  return {
    /** Files a freshly created resource here. Creation already succeeded,
     *  so a failure only means the resource stayed at the workspace root. */
    fileCreated(resourceType: FiledResourceType) {
      return (resourceId: string) => {
        void file({
          organizationId,
          resourceType,
          resourceId,
          folderId: folder.folderId,
        }).catch(() =>
          toast.error(`Created, but it could not be filed into ${folder.name}.`)
        )
      }
    },
    unfile(resource: FolderResource) {
      void file({
        organizationId,
        resourceType: toFiledType(resource),
        resourceId: resource.id,
        folderId: null,
      })
        .then(() =>
          toast.success(`Moved ${resource.name} out of ${folder.name}.`)
        )
        .catch((error: unknown) =>
          showErrorToast(error, "Could not remove it from the folder.")
        )
    },
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
