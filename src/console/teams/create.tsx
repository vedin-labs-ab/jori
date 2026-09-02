import {
  type OrganizationAuthClient,
  useHasPermission,
} from "@better-auth-ui/react"
import { Plus } from "lucide-react"
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

/** Header action for the Teams tab. Only shown to people the server would
 *  let create a team — owners and admins under the default role statements. */
export function TeamCreateButton() {
  const { data: permission } = useHasPermission(
    authClient as OrganizationAuthClient,
    { permissions: { team: ["create"] } }
  )
  const [open, setOpen] = useState(false)

  if (!permission?.success) {
    return null
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" type="button">
        <Plus />
        Create team
      </Button>
      <TeamCreateDialog onOpenChange={setOpen} open={open} />
    </>
  )
}

/** Minimal creation dialog in the console's creation idiom: a team is a
 *  name, everything else comes later. */
export function TeamCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState("")
  const [isPending, setIsPending] = useState(false)

  async function submit() {
    if (name.trim() === "") {
      return
    }

    setIsPending(true)

    const { error } = await authClient.organization.createTeam({
      name: name.trim(),
    })

    setIsPending(false)

    if (error) {
      toast.error(error.message ?? "Could not create the team.")
    } else {
      onOpenChange(false)
      setName("")
      toast.success("Team created.")
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>
            Name a group of people who work together.
          </DialogDescription>
        </DialogHeader>
        <DialogForm disabled={isPending} onSubmit={() => void submit()}>
          <Field>
            <Label htmlFor="team-create-name">Name</Label>
            <Input
              autoFocus
              disabled={isPending}
              id="team-create-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Engineering"
              value={name}
            />
          </Field>
          <DialogFooter>
            <Button disabled={name.trim() === "" || isPending} type="submit">
              {isPending && <Spinner />}
              Create team
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}
