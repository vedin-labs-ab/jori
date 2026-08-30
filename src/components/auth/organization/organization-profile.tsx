import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin,
  useUpdateOrganization
} from "@better-auth-ui/react"
import { toast } from "sonner"

import { EditableText } from "@/components/ui/editable"
import { Field, FieldGroup, FieldTitle } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { ChangeOrganizationLogo } from "./change-organization-logo"

export type OrganizationProfileProps = {
  className?: string
}

/** Active organization logo and name with independent editors. Better
 *  Auth's slug stays a hidden implementation detail — generated at
 *  creation, never shown or edited. */
export function OrganizationProfile({ className }: OrganizationProfileProps) {
  const { authClient } = useAuth()
  const { localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin)
  const { data: activeOrganization } = useActiveOrganization(
    authClient as OrganizationAuthClient
  )
  const { mutateAsync: updateOrganization, isPending } = useUpdateOrganization(
    authClient as OrganizationAuthClient,
    {
      onSuccess: () =>
        toast.success(organizationLocalization.organizationUpdatedSuccess)
    }
  )

  return (
    <FieldGroup className={className}>
      {activeOrganization ? (
        <Field>
          <FieldTitle>{organizationLocalization.name}</FieldTitle>
          <EditableText
            autoComplete="organization"
            disabled={isPending}
            label={organizationLocalization.name}
            onSave={async (name) => {
              await updateOrganization({ data: { name } })
            }}
            placeholder={organizationLocalization.namePlaceholder}
            size="lg"
            value={activeOrganization.name}
          />
        </Field>
      ) : (
        <OrganizationProfileFieldSkeleton
          label={organizationLocalization.name}
        />
      )}

      <ChangeOrganizationLogo />
    </FieldGroup>
  )
}

function OrganizationProfileFieldSkeleton({ label }: { label: string }) {
  return (
    <Field>
      <FieldTitle>{label}</FieldTitle>
      <Skeleton className="h-8 w-56 rounded-md" />
    </Field>
  )
}
