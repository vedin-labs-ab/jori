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
import { type Automation } from "../types"

export function DeleteAutomationDialog({
  isDeleting,
  onDelete,
  onOpenChange,
  open,
  automation,
}: {
  isDeleting: boolean
  onDelete: () => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  automation: Automation
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{automation.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the automation and cancels its upcoming
            runs. Past runs are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={onDelete}
            variant="destructive"
          >
            Delete automation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
