import {
  type OrganizationAuthClient,
  useHasPermission,
} from "@better-auth-ui/react"
import { Plus, UsersRound } from "lucide-react"
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

/** Minimal creation dialog: a team is a name, everything else comes later. */
export function TeamCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = String(new FormData(event.currentTarget).get("name")).trim()

    if (name === "") {
      return
    }

    setIsPending(true)

    const { error } = await authClient.organization.createTeam({ name })

    setIsPending(false)

    if (error) {
      toast.error(error.message ?? "Could not create the team.")
    } else {
      onOpenChange(false)
      toast.success("Team created.")
    }
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <UsersRound />
            </AlertDialogMedia>
            <AlertDialogTitle>Create team</AlertDialogTitle>
            <AlertDialogDescription>
              Name a group of people who work together.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Field>
            <Label htmlFor="team-create-name">Name</Label>
            <Input
              autoFocus
              disabled={isPending}
              id="team-create-name"
              name="name"
              placeholder="Engineering"
              required
            />
          </Field>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button disabled={isPending} type="submit">
              {isPending && <Spinner />}
              Create team
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
