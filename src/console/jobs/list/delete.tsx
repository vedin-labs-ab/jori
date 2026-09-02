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
import { type Job } from "../types"

export function DeleteJobDialog({
  isDeleting,
  onDelete,
  onOpenChange,
  open,
  job,
}: {
  isDeleting: boolean
  onDelete: () => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  job: Job
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="wrap-anywhere">
            Delete "{job.name}"?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the job and cancels its upcoming runs. Past
            runs are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={onDelete}
            variant="destructive"
          >
            Delete job
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
