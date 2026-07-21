"use client"

import { useAuth, useSession, useUpdateUser } from "@better-auth-ui/react"
import { toast } from "sonner"

import { EditableText } from "@/components/ui/editable"
import { Field, FieldGroup, FieldTitle } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { ChangeAvatar } from "./change-avatar"

export type UserProfileProps = {
  className?: string
}

/** User name and avatar controls for the signed-in user. */
export function UserProfile({ className }: UserProfileProps) {
  const { authClient, localization } = useAuth()
  const { data: session } = useSession(authClient)
  const { mutateAsync: updateUser, isPending } = useUpdateUser(authClient, {
    onSuccess: () => toast.success(localization.settings.profileUpdatedSuccess)
  })

  return (
    <FieldGroup className={className}>
      <Field>
        <FieldTitle>{localization.auth.name}</FieldTitle>
        {session ? (
          <EditableText
            autoComplete="name"
            disabled={isPending}
            label={localization.auth.name}
            onSave={async (name) => {
              await updateUser({ name })
            }}
            placeholder={localization.auth.name}
            size="lg"
            value={session.user.name}
          />
        ) : (
          <Skeleton className="h-8 w-56 rounded-md" />
        )}
      </Field>

      <ChangeAvatar />
    </FieldGroup>
  )
}
