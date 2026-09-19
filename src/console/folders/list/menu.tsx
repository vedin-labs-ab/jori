import { type GenericId } from "convex/values"
import { FolderInput, FolderMinus } from "lucide-react"
import { useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useFile } from "@/console/files/query"
import { DeleteFileDialog } from "@/shared/console/files/delete"
import { FileMenuItems } from "@/shared/console/files/menu"
import { type FolderResource } from "@/shared/console/folders/types"
import { JobRowMenu } from "@/shared/console/jobs/list/actions"
import { MaterialFilingItems } from "@/shared/console/materials/actions"
import { MaterialRowMenu } from "@/shared/console/materials/actions/menu"
import { menuWidth, RowMenuTrigger } from "@/shared/console/menu"
import { storeDeleteDescription } from "@/shared/console/stores/list/config"
import { tableDeleteDescription } from "@/shared/console/tables/list/config"
import { type FolderResourceActions } from "./actions"

// A filed resource offers the same menu here that it offers on its own
// page, plus the one action only a folder listing can take: leaving the
// folder without choosing another one.

export function ResourceRowMenu({
  actions,
  resource,
}: {
  actions: FolderResourceActions
  resource: FolderResource
}) {
  switch (resource.type) {
    case "table":
    case "store":
      return <MaterialResourceMenu actions={actions} resource={resource} />
    case "file":
      return <FileResourceMenu actions={actions} resource={resource} />
    case "job":
      return <JobResourceMenu actions={actions} resource={resource} />
    case "chat":
      return <ChatResourceMenu actions={actions} resource={resource} />
  }
}

type ResourceMenu = {
  actions: FolderResourceActions
  resource: FolderResource
}

function ChatResourceMenu({ actions, resource }: ResourceMenu) {
  return (
    <DropdownMenu>
      <RowMenuTrigger name={resource.name} />
      <DropdownMenuContent align="end" className={menuWidth}>
        <MaterialFilingItems
          onAccess={() => actions.onAccess(resource)}
          onMoveToFolder={() => actions.onMove(resource)}
          onUnfile={
            actions.onUnfile ? () => actions.onUnfile?.(resource) : undefined
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Tables and stores share one lifecycle, so they share one branch. Nothing
 *  archived is ever listed in a folder, so these rows only ever archive. */
function MaterialResourceMenu({ actions, resource }: ResourceMenu) {
  const isTable = resource.type === "table"

  return (
    <MaterialRowMenu
      deleteDescription={
        isTable ? tableDeleteDescription : storeDeleteDescription
      }
      isDeleting={actions.removal.isDeleting(resource)}
      isRestoring={actions.removal.isRestoring(resource)}
      material={{ name: resource.name, archivedAt: undefined }}
      noun={isTable ? "table" : "store"}
      onAccess={() => actions.onAccess(resource)}
      onDelete={() => actions.removal.remove(resource)}
      onEdit={() => actions.onEdit(resource)}
      onMoveToFolder={() => actions.onMove(resource)}
      onRestore={() => actions.removal.restore(resource)}
      onUnfile={
        actions.onUnfile ? () => actions.onUnfile?.(resource) : undefined
      }
    />
  )
}

/** A listing row carries no download URL, so the file resolves itself the
 *  moment its menu opens — nothing is asked for until someone asks. */
function FileResourceMenu({ actions, resource }: ResourceMenu) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const result = useFile(
    actions.organizationId,
    isMenuOpen ? resource.id : undefined
  )
  const file = {
    fileId: resource.id as GenericId<"files">,
    name: resource.name,
  }
  const url = result?.status === "ready" ? (result.file?.url ?? null) : null

  return (
    <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
      <DropdownMenu onOpenChange={setIsMenuOpen}>
        <RowMenuTrigger name={resource.name} />
        <DropdownMenuContent align="end" className={menuWidth}>
          <FileMenuItems
            file={{ name: resource.name, url }}
            isPending={actions.files.pendingFileId === resource.id}
            onAccess={() => actions.onAccess(resource)}
            onEdit={() => actions.onEdit(resource)}
            onMoveToFolder={() => actions.onMove(resource)}
            onRemove={() => setIsDeleteOpen(true)}
            onUnfile={
              actions.onUnfile ? () => actions.onUnfile?.(resource) : undefined
            }
            withLinks
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteFileDialog
        file={file}
        isPending={actions.files.pendingFileId === resource.id}
        onDelete={() => actions.files.deleteFile(file)}
      />
    </AlertDialog>
  )
}

/** Until the job itself is in hand, the row offers only what the
 *  filing alone can answer for. */
function JobResourceMenu({ actions, resource }: ResourceMenu) {
  const job = actions.jobOf(resource)

  if (job === undefined) {
    return <FilingOnlyMenu actions={actions} resource={resource} />
  }

  return (
    <JobRowMenu
      job={job}
      isControlling={actions.editor.controllingJobId === job.id}
      isDeleting={actions.editor.deletingJobId === job.id}
      onDelete={(target) => void actions.editor.deleteJob(target)}
      onEdit={actions.editor.openEditForm}
      onMoveToFolder={() => actions.onMove(resource)}
      onPausedChange={(target, paused) =>
        void actions.editor.setJobPaused(target, paused)
      }
      onUnfile={
        actions.onUnfile ? () => actions.onUnfile?.(resource) : undefined
      }
    />
  )
}

function FilingOnlyMenu({ actions, resource }: ResourceMenu) {
  return (
    <DropdownMenu>
      <RowMenuTrigger name={resource.name} />
      <DropdownMenuContent align="end" className={menuWidth}>
        <DropdownMenuItem onSelect={() => actions.onMove(resource)}>
          <FolderInput />
          Move to folder…
        </DropdownMenuItem>
        {actions.onUnfile ? (
          <DropdownMenuItem onSelect={() => actions.onUnfile?.(resource)}>
            <FolderMinus />
            Remove from folder
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
