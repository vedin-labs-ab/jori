import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { type Skill } from "./types"

export function DeleteSkillDialog({
  isPending,
  onDelete,
  skill,
}: {
  isPending: boolean
  onDelete: () => void
  skill: Skill
}) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete "{skill.name}"?</AlertDialogTitle>
        <AlertDialogDescription>
          This permanently deletes the skill. Milo stops applying it to new
          runs.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={isPending}
          onClick={onDelete}
          variant="destructive"
        >
          Delete skill
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
