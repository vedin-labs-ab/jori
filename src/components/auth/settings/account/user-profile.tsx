import {
  type AdditionalFieldValue,
  parseAdditionalFieldValue
} from "@better-auth-ui/core"
import {
  type UsernameAuthClient,
  useAuth,
  useSession,
  useUpdateUser
} from "@better-auth-ui/react"
import { type SyntheticEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Section, SectionHeader } from "@/components/ui/section"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { AdditionalField } from "../../additional-field"
import { ChangeAvatar } from "./change-avatar"

export type UserProfileProps = {
  className?: string
}

/** Profile fields and avatar controls for the signed-in user. */
export function UserProfile({ className }: UserProfileProps) {
  const { additionalFields, authClient, localization } = useAuth()
  const { data: session } = useSession(authClient as UsernameAuthClient)

  const { mutate: updateUser, isPending } = useUpdateUser(authClient, {
    onSuccess: () => toast.success(localization.settings.profileUpdatedSuccess)
  })

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
  }>({})

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string

    const additionalFieldValues: Record<string, unknown> = {}

    for (const field of additionalFields ?? []) {
      if (field.profile === false || field.readOnly) continue
      const value = parseAdditionalFieldValue(
        field,
        formData.get(field.name) as string | null
      )

      if (field.validate) {
        try {
          await field.validate(value)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : String(error))
          return
        }
      }

      // `null` = explicit clear (forward to backend); `undefined` = omitted.
      if (value !== undefined) {
        additionalFieldValues[field.name] = value
      }
    }

    updateUser({
      name,
      ...additionalFieldValues
    })
  }

  return (
    <Section className={className}>
      <SectionHeader title={localization.settings.userProfile} />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldGroup>
          <ChangeAvatar />

          <Field data-invalid={!!fieldErrors.name}>
            <Label htmlFor="name">{localization.auth.name}</Label>

            {session ? (
              <Input
                key={session?.user.name}
                id="name"
                name="name"
                autoComplete="name"
                defaultValue={session?.user.name}
                placeholder={localization.auth.name}
                disabled={isPending}
                required
                onChange={() => {
                  setFieldErrors((prev) => ({
                    ...prev,
                    name: undefined
                  }))
                }}
                onInvalid={(e) => {
                  e.preventDefault()

                  setFieldErrors((prev) => ({
                    ...prev,
                    name: (e.target as HTMLInputElement).validationMessage
                  }))
                }}
                aria-invalid={!!fieldErrors.name}
              />
            ) : (
              <Skeleton>
                <Input className="invisible" />
              </Skeleton>
            )}

            <FieldError>{fieldErrors.name}</FieldError>
          </Field>

          {additionalFields?.map((field) => {
            if (field.profile === false) return null

            if (!session) {
              if (field.inputType === "hidden") {
                return null
              }

              return (
                <Skeleton key={field.name}>
                  <Input className="invisible" />
                </Skeleton>
              )
            }

            const value = (session.user as Record<string, unknown>)[field.name]

            // Re-mount when the session value loads so the field's
            // uncontrolled `defaultValue` reflects the latest data.
            const key = `${field.name}:${
              value instanceof Date ? value.toISOString() : String(value ?? "")
            }`

            return (
              <AdditionalField
                key={key}
                name={field.name}
                field={{
                  ...field,
                  // `defaultValue` is sign-up-only; on the profile we
                  // always seed from the session.
                  defaultValue: value as AdditionalFieldValue | null
                }}
                isPending={isPending}
              />
            )
          })}
        </FieldGroup>

        <div>
          <Button type="submit" size="sm" disabled={isPending || !session}>
            {isPending && <Spinner />}

            {localization.settings.saveChanges}
          </Button>
        </div>
      </form>
    </Section>
  )
}
