import { useMutation, useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useMemo, useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "@/shared/console/error"
import {
  type FolderContentsResult,
  type FolderDetail,
  type FolderResource,
  moveTarget,
  toFiledType,
} from "@/shared/console/folders/types"
import { type Job } from "@/shared/console/jobs/types"
import { api } from "../../../../convex/_generated/api"
import { useFileActions } from "../../files/manage"
import { useJobEditorHost } from "../../jobs/editor/host"
import { useStoreRemoval } from "../../stores/manage"
import { useTableRemoval } from "../../tables/manage"
import { MoveResourceDialog } from "../move"
import { useMoveConfirmation } from "../move/confirm"
import { FolderResourceDialogs, type ResourceRequest } from "./dialogs"

// Everything a folder listing's rows can do to what is filed in them,
// resolved once for the page: the lifecycle hooks each kind's own page
// uses, and the dialogs those actions open. Rows raise requests; this owns
// the state and renders the overlays exactly once.

export type FolderResourceActions = {
  /** The listed job as its own page knows it, once resolved. */
  jobOf: (resource: FolderResource) => Job | undefined
  editor: ReturnType<typeof useJobEditorHost>["editor"]
  files: ReturnType<typeof useFileActions>
  onAccess: (resource: FolderResource) => void
  onEdit: (resource: FolderResource) => void
  onMove: (resource: FolderResource) => void
  onUnfile: ((resource: FolderResource) => void) | undefined
  organizationId: string
  removal: MaterialResourceRemoval
}

/** Archiving and restoring a filed table or store, addressed by the listing
 *  row rather than by each kind's own summary. */
type MaterialResourceRemoval = {
  isDeleting: (resource: FolderResource) => boolean
  isRestoring: (resource: FolderResource) => boolean
  remove: (resource: FolderResource) => void
  restore: (resource: FolderResource) => void
}

export function useFolderResourceActions({
  contents,
  folder,
  organizationId,
}: {
  contents: FolderContentsResult | undefined
  folder: FolderDetail | undefined
  organizationId: string
}): { actions: FolderResourceActions; dialogs: ReactNode } {
  const [request, setRequest] = useState<ResourceRequest>()
  const [moving, setMoving] = useState<FolderResource>()
  const resources = contents?.status === "ready" ? contents.resources : []
  const jobs = useListedJobs(organizationId, resources)
  const host = useJobEditorHost(organizationId)
  const files = useFileActions(organizationId)
  const removal = useMaterialResourceRemoval(organizationId)
  const unfile = useUnfileResource(organizationId, folder)

  return {
    actions: {
      jobOf: (resource) => jobs.get(resource.id),
      editor: host.editor,
      files,
      onAccess: (resource) => setRequest({ kind: "access", resource }),
      onEdit: (resource) => setRequest({ kind: "edit", resource }),
      onMove: setMoving,
      onUnfile: folder === undefined ? undefined : unfile.request,
      organizationId,
      removal,
    },
    dialogs: (
      <>
        <FolderResourceDialogs
          onClose={() => setRequest(undefined)}
          organizationId={organizationId}
          request={request}
        />
        <MoveResourceDialog
          onClose={() => setMoving(undefined)}
          organizationId={organizationId}
          resource={
            moving === undefined
              ? undefined
              : moveTarget(toFiledType(moving.type), moving.id, {
                  name: moving.name,
                  folderId: folder?.folderId,
                })
          }
        />
        {unfile.dialog}
        {host.dialog}
      </>
    ),
  }
}

function useMaterialResourceRemoval(
  organizationId: string
): MaterialResourceRemoval {
  const store = useStoreRemoval(organizationId)
  const table = useTableRemoval(organizationId)
  const target = (resource: FolderResource) => ({
    name: resource.name,
    archivedAt: undefined,
  })

  return {
    isDeleting: (resource) =>
      (resource.type === "table" ? table.removingId : store.removingId) ===
      resource.id,
    isRestoring: (resource) =>
      (resource.type === "table" ? table.restoringId : store.restoringId) ===
      resource.id,
    remove: (resource) => {
      const collectionId = resource.id as GenericId<"collections">

      void (resource.type === "table"
        ? table.removeMaterial({ ...target(resource), tableId: collectionId })
        : store.removeMaterial({ ...target(resource), storeId: collectionId }))
    },
    restore: (resource) => {
      const collectionId = resource.id as GenericId<"collections">

      void (resource.type === "table"
        ? table.restoreMaterial({ ...target(resource), tableId: collectionId })
        : store.restoreMaterial({ ...target(resource), storeId: collectionId }))
    },
  }
}

/** Jobs have no per-row query of their own, so a folder holding one
 *  reads the same list its page does and picks its rows out of it. Folders
 *  without jobs ask for nothing. */
function useListedJobs(
  organizationId: string,
  resources: readonly FolderResource[]
) {
  const hasJobs = resources.some((resource) => resource.type === "job")
  const listed = useQuery(
    api.jobs.console.list,
    hasJobs
      ? { organizationId, query: "", statusFilter: "all" as const }
      : "skip"
  )

  return useMemo(
    () =>
      new Map(
        (listed?.status === "ready" ? listed.jobs : []).map((job) => [
          job.id as string,
          job,
        ])
      ),
    [listed]
  )
}

/** Leaving a folder widens an audience as surely as entering one narrows
 *  it, so unfiling asks the same question a move does. */
function useUnfileResource(
  organizationId: string,
  folder: FolderDetail | undefined
) {
  const file = useMutation(api.folders.console.file)
  const confirmation = useMoveConfirmation(organizationId)
  const unfile = async (resource: FolderResource) => {
    try {
      await file({
        organizationId,
        resourceType: toFiledType(resource.type),
        resourceId: resource.id,
        folderId: null,
      })
      toast.success(`Moved ${resource.name} out of ${folder?.name}.`)
    } catch (error) {
      showErrorToast(error, "Could not remove it from the folder.")
    }
  }

  return {
    dialog: confirmation.dialog,
    request: (resource: FolderResource) =>
      confirmation.request({
        subject: {
          kind: "resource",
          resourceType: toFiledType(resource.type),
          resourceId: resource.id,
        },
        name: resource.name,
        folderId: null,
        run: () => unfile(resource),
      }),
  }
}
