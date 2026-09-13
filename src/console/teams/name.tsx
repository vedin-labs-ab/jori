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
import { DialogForm } from "@/shared/console/materials/form"
import { authClient } from "@/shared/session/auth"

export function TeamNameDialog({
  team,
  open,
  onOpenChange,
}: {
  team?: { id: string; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(team?.name ?? "")
  const [isPending, setIsPending] = useState(false)

  const operation = team === undefined ? "create" : "rename"
  const title = team === undefined ? "Create team" : "Rename team"
  const nameId = `team-${operation}-name`

  async function submit() {
    const trimmed = name.trim()

    if (trimmed === "" || trimmed === team?.name) {
      if (team !== undefined) {
        onOpenChange(false)
      }

      return
    }

    setIsPending(true)

    const { error } = await (team === undefined
      ? authClient.organization.createTeam({ name: trimmed })
      : authClient.organization.updateTeam({
          teamId: team.id,
          data: { name: trimmed },
        }))

    setIsPending(false)

    if (error) {
      toast.error(error.message ?? `Could not ${operation} the team.`)
      return
    }

    onOpenChange(false)
    if (team === undefined) {
      setName("")
    }
    toast.success(team === undefined ? "Team created." : "Team renamed.")
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {team === undefined
              ? "Name a group of people who work together."
              : `Give ${team.name} a new name.`}
          </DialogDescription>
        </DialogHeader>
        <DialogForm disabled={isPending} onSubmit={() => void submit()}>
          <Field>
            <Label htmlFor={nameId}>Name</Label>
            <Input
              autoFocus
              disabled={isPending}
              id={nameId}
              onChange={(event) => setName(event.target.value)}
              placeholder={team === undefined ? "Engineering" : undefined}
              value={name}
            />
          </Field>
          <DialogFooter>
            <Button disabled={name.trim() === "" || isPending} type="submit">
              {isPending && <Spinner />}
              {title}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}
