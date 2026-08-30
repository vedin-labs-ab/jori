import { Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/shared/session/auth"
import { type Team } from "./row"

/** Destructive confirm before a team disappears, memberships and all. */
export function TeamDeleteDialog({
  team,
  open,
  onOpenChange,
}: {
  team: Team
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isPending, setIsPending] = useState(false)

  async function handleDelete() {
    setIsPending(true)

    const { error } = await authClient.organization.removeTeam({
      teamId: team.id,
    })

    setIsPending(false)

    if (error) {
      toast.error(error.message ?? "Could not delete the team.")
    } else {
      onOpenChange(false)
      toast.success("Team deleted.")
    }
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete team</AlertDialogTitle>
          <AlertDialogDescription>
            {team.name} will be deleted and its members lose the grouping.
            Nobody leaves the organization.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            disabled={isPending}
            onClick={handleDelete}
            type="button"
            variant="destructive"
          >
            {isPending && <Spinner />}
            Delete team
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
