import { PencilLine } from "lucide-react"
import { type SyntheticEvent, useState } from "react"
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
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/shared/session/auth"
import { type Team } from "./row"

/** Rename dialog: the team keeps its identity, only the label changes. */
export function TeamRenameDialog({
  team,
  open,
  onOpenChange,
}: {
  team: Team
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = String(new FormData(event.currentTarget).get("name")).trim()

    if (name === "" || name === team.name) {
      onOpenChange(false)
      return
    }

    setIsPending(true)

    const { error } = await authClient.organization.updateTeam({
      teamId: team.id,
      data: { name },
    })

    setIsPending(false)

    if (error) {
      toast.error(error.message ?? "Could not rename the team.")
    } else {
      onOpenChange(false)
      toast.success("Team renamed.")
    }
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <PencilLine />
            </AlertDialogMedia>
            <AlertDialogTitle>Rename team</AlertDialogTitle>
            <AlertDialogDescription>
              Give {team.name} a new name.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Field>
            <Label htmlFor="team-rename-name">Name</Label>
            <Input
              autoFocus
              defaultValue={team.name}
              disabled={isPending}
              id="team-rename-name"
              name="name"
              required
            />
          </Field>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button disabled={isPending} type="submit">
              {isPending && <Spinner />}
              Rename team
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
