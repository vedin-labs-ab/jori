"use client"

import {
  type OrganizationAuthClient,
  useAuth,
  useAuthPlugin,
  useCreateOrganization
} from "@better-auth-ui/react"
import { Briefcase } from "lucide-react"
import { type SyntheticEvent, useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"

/** Props for the `CreateOrganizationDialog` component. */
export type CreateOrganizationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrganizationDialog({
  open,
  onOpenChange
}: CreateOrganizationDialogProps) {
  const { authClient, localization } = useAuth()
  const { localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin)

  const [name, setName] = useState("")
  const [nameError, setNameError] = useState<string>()

  const { mutate: createOrganization, isPending: isCreating } =
    useCreateOrganization(authClient as OrganizationAuthClient, {
      onSuccess: () => onOpenChange(false)
    })

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Better Auth requires a unique slug; Jori never shows one, so it is
    // generated rather than asked for.
    createOrganization({ name, slug: crypto.randomUUID() })
  }

  useEffect(() => {
    if (!open) {
      setName("")
      setNameError(undefined)
    }
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Briefcase />
            </AlertDialogMedia>

            <AlertDialogTitle>
              {organizationLocalization.createOrganization}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {organizationLocalization.organizationsDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-4">
            <Field data-invalid={!!nameError}>
              <Label htmlFor="create-organization-name">
                {organizationLocalization.name}
              </Label>

              <Input
                id="create-organization-name"
                name="name"
                autoFocus
                required
                placeholder={organizationLocalization.namePlaceholder}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError(undefined)
                }}
                onInvalid={(e) => {
                  e.preventDefault()
                  setNameError(localization.auth.fieldRequired)
                }}
                aria-invalid={!!nameError}
                disabled={isCreating}
              />

              <FieldError>{nameError}</FieldError>
            </Field>

          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>
              {localization.settings.cancel}
            </AlertDialogCancel>

            <Button type="submit" disabled={isCreating}>
              {isCreating && <Spinner />}

              {organizationLocalization.createOrganization}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
