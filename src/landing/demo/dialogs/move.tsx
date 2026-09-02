import { MoveDialog } from "@/shared/console/folders/dialogs/move"
import { type MoveSubject } from "@/shared/console/folders/types"
import { type FolderId } from "../fixtures/types"
import { type DemoActions } from "../state/actions"
import { useDemoFolders, useDemoWorkspace } from "../workspace"

/** The move dialog over the workspace: a folder re-parents, filed
 *  resources re-file, and the move lands at once. */
export function DemoMoveDialog({
  onOpenChange,
  subject,
}: {
  onOpenChange: (open: boolean) => void
  subject: MoveSubject | undefined
}) {
  const { actions } = useDemoWorkspace()
  const folders = useDemoFolders()

  return (
    <MoveDialog
      folders={folders}
      isBusy={false}
      onMove={(destination) => {
        if (subject !== undefined) {
          move(actions, subject, destination as FolderId | null)
        }

        onOpenChange(false)
      }}
      onOpenChange={onOpenChange}
      subject={subject}
    />
  )
}

function move(
  actions: DemoActions,
  subject: MoveSubject,
  destination: FolderId | null
) {
  if (subject.kind === "folder") {
    actions.moveFolder(subject.folderId as FolderId, destination)

    return
  }

  for (const resource of subject.resources) {
    actions.fileResource(
      resource.resourceType,
      resource.resourceId,
      destination
    )
  }
}
