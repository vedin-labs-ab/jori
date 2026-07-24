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
import { type AppSummary } from "../types"

export function DeleteAppDialog({
  app,
  isDeleting,
  onDelete,
  onOpenChange,
  open,
}: {
  app: AppSummary
  isDeleting: boolean
  onDelete: () => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
}) {
  const isArchived = app.archivedAt !== undefined
  const hasAutomations = app.automations.length > 0

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchived ? "Delete" : "Archive"} "{app.title}"?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived
              ? "This permanently deletes the app and removes stored versions, assets, sessions, and unshared source content. Its attached automations are deleted with it."
              : `This removes the app from the active list. Existing links stop opening this app.${hasAutomations ? " Its attached automations pause so nothing keeps writing to it." : ""}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={onDelete}
            variant={isArchived ? "destructive" : "default"}
          >
            {isArchived ? "Delete app" : "Archive app"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
