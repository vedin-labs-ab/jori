import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { type ArtifactSummary } from "../types"

export function DeleteArtifactDialog({
  artifact,
  isDeleting,
  onDelete,
  onOpenChange,
  open,
}: {
  artifact: ArtifactSummary
  isDeleting: boolean
  onDelete: () => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
}) {
  const isArchived = artifact.archivedAt !== undefined
  const hasAutomations = artifact.automations.length > 0

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchived ? "Delete" : "Archive"} "{artifact.title}"?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived
              ? "This permanently deletes the artifact and removes stored versions, assets, sessions, and unshared source content. Its attached automations are deleted with it."
              : `This removes the artifact from the active list. Existing links stop opening this app.${hasAutomations ? " Its attached automations pause so nothing keeps writing to it." : ""}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={onDelete}
            variant={isArchived ? "destructive" : "default"}
          >
            {isArchived ? "Delete artifact" : "Archive artifact"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
