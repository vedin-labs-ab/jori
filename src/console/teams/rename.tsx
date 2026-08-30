import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/shared/session/auth"
import { DialogForm } from "../shared/materials/form"
import { type Team } from "./row"

/** Rename dialog in the console's edit idiom: the team keeps its
 *  identity, only the label changes. */
export function TeamRenameDialog({
  team,
  open,
  onOpenChange,
}: {
  team: Team
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(team.name)
  const [isPending, setIsPending] = useState(false)

  async function submit() {
    const trimmed = name.trim()

    if (trimmed === "" || trimmed === team.name) {
      onOpenChange(false)

      return
    }

    setIsPending(true)

    const { error } = await authClient.organization.updateTeam({
      teamId: team.id,
      data: { name: trimmed },
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename team</DialogTitle>
          <DialogDescription>Give {team.name} a new name.</DialogDescription>
        </DialogHeader>
        <DialogForm disabled={isPending} onSubmit={() => void submit()}>
          <Field>
            <Label htmlFor="team-rename-name">Name</Label>
            <Input
              autoFocus
              disabled={isPending}
              id="team-rename-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </Field>
          <DialogFooter>
            <Button disabled={name.trim() === "" || isPending} type="submit">
              {isPending && <Spinner />}
              Rename team
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}
