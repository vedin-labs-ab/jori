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
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { showErrorToast } from "@/shared/console/error"
import { DialogForm } from "@/shared/console/materials/form"
import { localTimezone } from "@/shared/console/time"
import { activateOrganization, authClient } from "@/shared/session/auth"
import { rememberTimezone } from "./pending"
import { TimezoneField } from "./timezone"

/**
 * Creating an organization: a name, and the zone its days are counted in.
 *
 * Creation lands the member inside the new organization, which every
 * organization switch in Jori does by reloading — the Convex token carries
 * the organization claim and is minted per page load. The chosen zone is
 * left where the console picks it up on the way back.
 */
export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useCreateOrganization()

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!form.isCreating) {
          onOpenChange(next)
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Name it, and set the zone its days are counted in.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={form.isCreating}
          onSubmit={() => void form.submit()}
        >
          <OrganizationNameField
            disabled={form.isCreating}
            error={form.nameError}
            name={form.name}
            onNameChange={form.setName}
          />
          <TimezoneField
            description="Days in usage and reports follow this zone."
            disabled={form.isCreating}
            id="create-organization-timezone"
            onChange={form.setTimezone}
            value={form.timezone}
          />
          <DialogFooter>
            <Button disabled={form.isCreating} type="submit">
              {form.isCreating ? <Spinner /> : null}
              Create organization
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

function OrganizationNameField({
  disabled,
  error,
  name,
  onNameChange,
}: {
  disabled: boolean
  error: string | undefined
  name: string
  onNameChange: (name: string) => void
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="create-organization-name">Name</Label>
      <Input
        aria-invalid={error === undefined ? undefined : true}
        autoFocus
        disabled={disabled}
        id="create-organization-name"
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="Acme"
        value={name}
      />
      <FieldError>{error}</FieldError>
    </div>
  )
}

function useCreateOrganization() {
  const [name, setNameState] = useState("")
  const [nameError, setNameError] = useState<string>()
  const [timezone, setTimezone] = useState(localTimezone)
  const [isCreating, setIsCreating] = useState(false)

  // Validation shows only after a submit attempt; new input clears it.
  function setName(next: string) {
    setNameState(next)
    setNameError(undefined)
  }

  async function submit() {
    if (name.trim() === "") {
      setNameError("Name your organization.")

      return
    }

    setIsCreating(true)

    // Better Auth requires a unique slug; Jori never shows one, so it is
    // generated rather than asked for.
    const { data, error } = await authClient.organization.create({
      name: name.trim(),
      slug: crypto.randomUUID(),
    })

    if (!data) {
      setIsCreating(false)
      toast.error(error?.message ?? "Could not create the organization.")

      return
    }

    rememberTimezone(data.id, timezone)

    try {
      // Reloads, so nothing after this runs and the spinner stays put.
      await activateOrganization(data.id)
    } catch (caught) {
      setIsCreating(false)
      showErrorToast(
        caught,
        "Created the organization, but couldn't open it. Reload to continue."
      )
    }
  }

  return {
    isCreating,
    name,
    nameError,
    setName,
    setTimezone,
    submit,
    timezone,
  }
}
