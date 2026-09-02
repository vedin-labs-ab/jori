import { useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"
import { DeleteFileDialog } from "@/shared/console/files/delete"
import { FileMenuItems } from "@/shared/console/files/menu"
import { type FolderResource } from "@/shared/console/folders/types"
import { JobRowMenu } from "@/shared/console/jobs/list/actions"
import { DeleteJobDialog } from "@/shared/console/jobs/list/delete"
import { MaterialRowMenu } from "@/shared/console/materials/actions/menu"
import { menuWidth, RowMenuTrigger } from "@/shared/console/menu"
import { storeDeleteDescription } from "@/shared/console/stores/list/config"
import { tableDeleteDescription } from "@/shared/console/tables/list/config"
import { jobMoveSubject } from "../derive/jobs"
import { materialOf } from "../derive/materials"
import { MaterialDialogs, type MaterialRequest } from "../dialogs/materials"
import { DemoMoveDialog } from "../dialogs/move"
import { useJobEditor } from "../editor"
import { type DemoMaterial } from "../fixtures/types"
import { useDemoWorkspace } from "../workspace"

// A filed resource offers the same menu here that it offers on its own
// page, plus the one action only a folder listing can take: leaving the
// folder without choosing another one.

export function DemoResourceMenu({ resource }: { resource: FolderResource }) {
  const { state } = useDemoWorkspace()

  if (resource.type === "job") {
    return <JobResourceMenu resource={resource} />
  }

  const material = materialOf(state, resource.id)

  if (material === undefined) {
    return null
  }

  return material.kind === "file" ? (
    <FileResourceMenu material={material} />
  ) : (
    <MaterialResourceMenu material={material} />
  )
}

/** Tables and stores share one lifecycle, so they share one branch. */
function MaterialResourceMenu({ material }: { material: DemoMaterial }) {
  const { actions } = useDemoWorkspace()
  const [request, setRequest] = useState<MaterialRequest>()
  const isTable = material.kind === "table"

  return (
    <>
      <MaterialRowMenu
        deleteDescription={
          isTable ? tableDeleteDescription : storeDeleteDescription
        }
        isDeleting={false}
        isRestoring={false}
        material={{ name: material.name, archivedAt: undefined }}
        noun={isTable ? "table" : "store"}
        onAccess={() => setRequest({ kind: "access", material })}
        onDelete={() => actions.removeMaterial(material.id)}
        onEdit={() => setRequest({ kind: "edit", material })}
        onMoveToFolder={() => setRequest({ kind: "move", material })}
        onRestore={() => undefined}
        onUnfile={() => actions.fileResource("collection", material.id, null)}
      />
      <MaterialDialogs
        onClose={() => setRequest(undefined)}
        request={request}
      />
    </>
  )
}

function FileResourceMenu({ material }: { material: DemoMaterial }) {
  const { actions } = useDemoWorkspace()
  const [request, setRequest] = useState<MaterialRequest>()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
      <DropdownMenu>
        <RowMenuTrigger name={material.name} />
        <DropdownMenuContent align="end" className={menuWidth}>
          <FileMenuItems
            file={{ name: material.name, url: null }}
            isPending={false}
            onAccess={() => setRequest({ kind: "access", material })}
            onEdit={() => setRequest({ kind: "edit", material })}
            onMoveToFolder={() => setRequest({ kind: "move", material })}
            onRemove={() => setIsDeleteOpen(true)}
            onUnfile={() => actions.fileResource("file", material.id, null)}
            withLinks
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteFileDialog
        file={material}
        isPending={false}
        onDelete={() => actions.removeMaterial(material.id)}
      />
      <MaterialDialogs
        onClose={() => setRequest(undefined)}
        request={request}
      />
    </AlertDialog>
  )
}

function JobResourceMenu({ resource }: { resource: FolderResource }) {
  const { actions, state } = useDemoWorkspace()
  const editor = useJobEditor()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const job = state.jobs.find((candidate) => candidate.id === resource.id)

  if (job === undefined) {
    return null
  }

  return (
    <>
      <JobRowMenu
        isControlling={false}
        isDeleting={false}
        job={job}
        onDeleteRequest={() => setIsDeleteOpen(true)}
        onEdit={editor.openEditForm}
        onMoveToFolder={() => setIsMoveOpen(true)}
        onPausedChange={actions.setJobPaused}
        onUnfile={() => actions.fileResource("job", job.id, null)}
      />
      <DeleteJobDialog
        isDeleting={false}
        job={job}
        onDelete={() => actions.deleteJob(job)}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
      />
      <DemoMoveDialog
        onOpenChange={setIsMoveOpen}
        subject={isMoveOpen ? jobMoveSubject(job) : undefined}
      />
    </>
  )
}
