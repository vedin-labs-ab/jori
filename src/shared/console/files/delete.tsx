import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** The confirmation a file's Delete passes through, wherever it is raised.
 *  Render it inside the host's own <AlertDialog>. */
export function DeleteFileDialog({
  file,
  isPending,
  onDelete,
}: {
  file: { name: string }
  isPending: boolean
  onDelete: () => void
}) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="wrap-anywhere">
          Delete "{file.name}"?
        </AlertDialogTitle>
        <AlertDialogDescription>
          This permanently deletes the file and its stored contents. Anything
          that references it loses access.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={isPending}
          onClick={onDelete}
          variant="destructive"
        >
          Delete file
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
