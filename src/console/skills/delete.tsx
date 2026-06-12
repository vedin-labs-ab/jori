import { Loader2, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { type Skill } from "./types"

export function DeleteSkill({
  isPending,
  onDelete,
  skill,
}: {
  isPending: boolean
  onDelete: () => void
  skill: Skill
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 />}
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{skill.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the skill. Milo stops applying it to new
            runs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDelete}>
            Delete skill
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
