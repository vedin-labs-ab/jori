import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { FolderInput, FolderMinus, MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteFileDialog } from "@/shared/console/files/delete"
import { FileMenuItems } from "@/shared/console/files/menu"
import { type FolderResource } from "@/shared/console/folders/types"
import { JobRowMenu } from "@/shared/console/jobs/list/actions"
import { DeleteJobDialog } from "@/shared/console/jobs/list/delete"
import { MaterialRowMenu } from "@/shared/console/materials/actions/menu"
import { menuWidth } from "@/shared/console/menu"
import { storeDeleteDescription } from "@/shared/console/stores/list/config"
import { tableDeleteDescription } from "@/shared/console/tables/list/config"
import { api } from "../../../../convex/_generated/api"
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
  }
}

type ResourceMenu = {
  actions: FolderResourceActions
  resource: FolderResource
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
      onUnfile={() => actions.onUnfile(resource)}
    />
  )
}

/** A listing row carries no download URL, so the file resolves itself the
 *  moment its menu opens — nothing is asked for until someone asks. */
function FileResourceMenu({ actions, resource }: ResourceMenu) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const result = useQuery(
    api.files.console.get,
    isMenuOpen
      ? {
          organizationId: actions.organizationId,
          fileId: resource.id as GenericId<"files">,
        }
      : "skip"
  )
  const file = {
    fileId: resource.id as GenericId<"files">,
    name: resource.name,
  }
  const url = result?.status === "ready" ? (result.file?.url ?? null) : null

  return (
    <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
      <DropdownMenu onOpenChange={setIsMenuOpen}>
        <ResourceMenuTrigger name={resource.name} />
        <DropdownMenuContent align="end" className={menuWidth}>
          <FileMenuItems
            file={{ name: resource.name, url }}
            isPending={actions.files.pendingFileId === resource.id}
            onAccess={() => actions.onAccess(resource)}
            onEdit={() => actions.onEdit(resource)}
            onMoveToFolder={() => actions.onMove(resource)}
            onRemove={() => setIsDeleteOpen(true)}
            onUnfile={() => actions.onUnfile(resource)}
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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const job = actions.jobOf(resource)

  if (job === undefined) {
    return <FilingOnlyMenu actions={actions} resource={resource} />
  }

  return (
    <>
      <JobRowMenu
        job={job}
        isControlling={actions.editor.controllingJobId === job.id}
        isDeleting={actions.editor.deletingJobId === job.id}
        onDeleteRequest={() => setIsDeleteOpen(true)}
        onEdit={actions.editor.openEditForm}
        onMoveToFolder={() => actions.onMove(resource)}
        onPausedChange={(target, paused) =>
          void actions.editor.setJobPaused(target, paused)
        }
        onUnfile={() => actions.onUnfile(resource)}
      />
      <DeleteJobDialog
        job={job}
        isDeleting={actions.editor.deletingJobId === job.id}
        onDelete={() => void actions.editor.deleteJob(job)}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
      />
    </>
  )
}

function FilingOnlyMenu({ actions, resource }: ResourceMenu) {
  return (
    <DropdownMenu>
      <ResourceMenuTrigger name={resource.name} />
      <DropdownMenuContent align="end" className={menuWidth}>
        <DropdownMenuItem onSelect={() => actions.onMove(resource)}>
          <FolderInput />
          Move to folder…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onUnfile(resource)}>
          <FolderMinus />
          Remove from folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ResourceMenuTrigger({ name }: { name: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        aria-label={`Open actions for ${name}`}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <MoreHorizontal />
      </Button>
    </DropdownMenuTrigger>
  )
}
