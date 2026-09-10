import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import {
  type FolderListEntry,
  isFolderEntry,
} from "@/shared/console/folders/list/controls"
import {
  type FolderSelection,
  type FolderSelectionActions,
  folderSelectionRemovalSuccess,
} from "@/shared/console/folders/list/select"
import {
  type FolderResource,
  type MoveSubject,
} from "@/shared/console/folders/types"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { closeOnDismiss } from "@/shared/console/retain"
import { api } from "../../../../convex/_generated/api"
import { MoveToFolderDialog } from "../move"

/** What a folder listing's selection bar does here: the move opens the
 *  shared dialog over the whole selection, and a removal takes each row
 *  the way its own menu would — folders with their subfolders, tables
 *  and stores into the archive, files and jobs for good. */
export function useFolderSelectionActions(organizationId: string): {
  actions: FolderSelectionActions
  dialog: ReactNode
} {
  const [moving, setMoving] = useState<MoveSubject>()
  const runner = useBulkRunner()
  const remove = useRemoveEntry(organizationId)

  return {
    actions: {
      isBusy: runner.isBusy,
      onMove: setMoving,
      onRemove: (selection: FolderSelection) =>
        void runner.run(
          [...selection.folders, ...selection.resources],
          remove,
          {
            noun: "items",
            success: folderSelectionRemovalSuccess(selection),
            verb: "remove",
          }
        ),
    },
    dialog: (
      <MoveToFolderDialog
        onOpenChange={closeOnDismiss(() => setMoving(undefined))}
        organizationId={organizationId}
        subject={moving}
      />
    ),
  }
}

/** One removal per kind of row, through the mutation its own page uses. */
function useRemoveEntry(organizationId: string) {
  const removeFolder = useMutation(api.folders.console.remove)
  const removeTable = useMutation(api.tables.console.remove)
  const removeStore = useMutation(api.stores.console.remove)
  const removeFile = useMutation(api.files.console.remove)
  const removeJob = useMutation(api.jobs.console.remove)
  const fileResource = useMutation(api.folders.console.file)
  const removeResource = (resource: FolderResource) => {
    switch (resource.type) {
      case "chat":
        return fileResource({
          organizationId,
          resourceType: "chat",
          resourceId: resource.id,
          folderId: null,
        })
      case "table":
        return removeTable({
          organizationId,
          tableId: resource.id as GenericId<"collections">,
        })
      case "store":
        return removeStore({
          organizationId,
          storeId: resource.id as GenericId<"collections">,
        })
      case "file":
        return removeFile({
          organizationId,
          fileId: resource.id as GenericId<"files">,
        })
      case "job":
        return removeJob({
          organizationId,
          jobId: resource.id as GenericId<"jobs">,
        })
    }
  }

  return (entry: FolderListEntry) =>
    isFolderEntry(entry)
      ? removeFolder({
          organizationId,
          folderId: entry.folderId,
          deleteResources: false,
        })
      : removeResource(entry)
}
