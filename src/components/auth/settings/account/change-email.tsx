"use client"

import { useAuth, useChangeEmail, useSession } from "@better-auth-ui/react"
import { type SyntheticEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Section, SectionHeader } from "@/components/ui/section"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

export type ChangeEmailProps = {
  className?: string
}

/** Email update form with session-aware loading and validation states. */
export function ChangeEmail({ className }: ChangeEmailProps) {
  const { authClient, baseURL, localization, viewPaths } = useAuth()
  const { data: session } = useSession(authClient)

  const { mutate: changeEmail, isPending } = useChangeEmail(authClient, {
    onSuccess: () => toast.success(localization.settings.changeEmailSuccess)
  })

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
  }>({})

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    changeEmail({
      newEmail: formData.get("email") as string,
      callbackURL: `${baseURL}/${viewPaths.settings.account}`
    })
  }

  return (
    <Section className={className}>
      <SectionHeader title={localization.settings.changeEmail} />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field data-invalid={!!fieldErrors.email}>
          <Label htmlFor="email">{localization.auth.email}</Label>

          {session ? (
            <Input
              key={session?.user.email}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={session?.user.email}
              placeholder={localization.auth.emailPlaceholder}
              disabled={isPending}
              required
              onChange={() => {
                setFieldErrors((prev) => ({
                  ...prev,
                  email: undefined
                }))
              }}
              onInvalid={(e) => {
                e.preventDefault()
                setFieldErrors((prev) => ({
                  ...prev,
                  email: (e.target as HTMLInputElement).validationMessage
                }))
              }}
              aria-describedby={fieldErrors.email ? "change-email-error" : undefined}
              aria-invalid={!!fieldErrors.email}
            />
          ) : (
            <Skeleton>
              <Input className="invisible" />
            </Skeleton>
          )}

          <FieldError id="change-email-error">{fieldErrors.email}</FieldError>
        </Field>

        <div>
          <Button type="submit" size="sm" disabled={isPending || !session}>
            {isPending && <Spinner />}

            {localization.settings.updateEmail}
          </Button>
        </div>
      </form>
    </Section>
  )
}
