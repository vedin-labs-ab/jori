import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "@/shared/console/error"
import {
  DeleteFolderDialog,
  type FolderImpact,
} from "@/shared/console/folders/dialogs/delete"
import { type ManagedFolder } from "@/shared/console/folders/types"
import { api } from "../../../../convex/_generated/api"

/** The delete dialog bound to Convex: the subtree's counts read for the
 *  folder in question, and the one mutation that takes it. */
export function DeleteFolder({
  folder,
  isOpen,
  onDeleted,
  onOpenChange,
  organizationId,
}: {
  folder: ManagedFolder | undefined
  isOpen: boolean
  onDeleted: (folder: ManagedFolder) => void
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const summary = useQuery(
    api.folders.console.subtree,
    folder === undefined
      ? "skip"
      : { organizationId, folderId: folder.folderId }
  )
  const remove = useMutation(api.folders.console.remove)
  const [isDeleting, setIsDeleting] = useState(false)

  async function submit(target: ManagedFolder, deleteResources: boolean) {
    setIsDeleting(true)

    try {
      await remove({
        organizationId,
        folderId: target.folderId,
        deleteResources,
      })
      toast.success(`Deleted ${target.name}.`)
      onOpenChange(false)
      onDeleted(target)
    } catch (error) {
      showErrorToast(error, "Could not delete the folder.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DeleteFolderDialog
      folder={folder}
      impact={readImpact(summary)}
      isDeleting={isDeleting}
      isOpen={isOpen}
      onDelete={(deleteResources) => {
        if (folder !== undefined) {
          void submit(folder, deleteResources)
        }
      }}
      onOpenChange={onOpenChange}
    />
  )
}

/** The counts while they are ready; nothing while they load, and null for
 *  a folder that is no longer there to count. */
function readImpact(
  summary: ReturnType<typeof useQuery<typeof api.folders.console.subtree>>
): FolderImpact | null | undefined {
  if (summary === undefined) {
    return undefined
  }

  return summary.status === "ready"
    ? {
        folderCount: summary.folderCount,
        parentName: summary.parentName,
        resourceCount: summary.resourceCount,
      }
    : null
}
