import { useQuery } from "convex/react"
import { MoveDialog } from "@/shared/console/folders/dialogs/move"
import {
  type MoveResourceTarget,
  type MoveSubject,
  resourceSubject,
} from "@/shared/console/folders/types"
import { api } from "../../../../convex/_generated/api"
import { useMoveRun } from "./run"

/** MoveResourcesDialog specialized for exactly one resource, for hosts
 *  whose move affordance is inherently singular (detail pages, row menus
 *  outside a selectable list). */
export function MoveResourceDialog({
  onClose,
  organizationId,
  resource,
}: {
  onClose: () => void
  organizationId: string
  resource: MoveResourceTarget | undefined
}) {
  return (
    <MoveResourcesDialog
      onClose={onClose}
      organizationId={organizationId}
      resources={resource === undefined ? undefined : [resource]}
    />
  )
}

/** MoveToFolderDialog specialized for filed resources — a single row's
 *  "Move to folder…" and a bulk selection both pass through here. Pass the
 *  resources to open; it closes by clearing them. */
export function MoveResourcesDialog({
  onClose,
  organizationId,
  resources,
}: {
  onClose: () => void
  organizationId: string
  resources: MoveResourceTarget[] | undefined
}) {
  return (
    <MoveToFolderDialog
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
      organizationId={organizationId}
      subject={
        resources === undefined || resources.length === 0
          ? undefined
          : resourceSubject(resources)
      }
    />
  )
}

/** The shared "Move to folder…" dialog bound to Convex: the organization's
 *  tree to choose from, and the move itself. Open it by passing a subject;
 *  pass undefined to close. */
export function MoveToFolderDialog({
  onOpenChange,
  organizationId,
  subject,
}: {
  onOpenChange: (open: boolean) => void
  organizationId: string
  subject: MoveSubject | undefined
}) {
  const tree = useQuery(api.folders.console.tree, { organizationId })
  const move = useMoveRun(organizationId)

  return (
    <>
      <MoveDialog
        folders={tree?.status === "ready" ? tree.folders : undefined}
        isBusy={move.isBusy}
        onMove={(destinationId) => {
          if (subject !== undefined) {
            void move.run(subject, destinationId).then((landed) => {
              if (landed) {
                onOpenChange(false)
              }
            })
          }
        }}
        onOpenChange={onOpenChange}
        subject={subject}
      />
      {move.dialog}
    </>
  )
}
