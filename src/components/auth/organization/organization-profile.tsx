import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin,
  useUpdateOrganization
} from "@better-auth-ui/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { EditableText } from "@/components/ui/editable"
import { Field, FieldError, FieldTitle } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { cn } from "@/lib/utils"
import { ChangeOrganizationLogo } from "./change-organization-logo"
import {
  sanitizeSlug,
  SlugAvailabilityIndicator,
  useSlugAvailability
} from "./slug"

export type OrganizationProfileProps = {
  className?: string
}

/** Active organization logo, name, and slug with independent editors. */
export function OrganizationProfile({ className }: OrganizationProfileProps) {
  const { authClient } = useAuth()
  const {
    checkSlug,
    localization: organizationLocalization,
    slugPrefix
  } = useAuthPlugin(organizationPlugin)
  const { data: activeOrganization } = useActiveOrganization(
    authClient as OrganizationAuthClient
  )
  const [slugDraft, setSlugDraft] = useState(activeOrganization?.slug ?? "")

  useEffect(() => {
    setSlugDraft(activeOrganization?.slug ?? "")
  }, [activeOrganization?.slug])

  const slugAvailability = useSlugAvailability(
    slugDraft,
    activeOrganization?.slug,
    checkSlug
  )
  const { mutateAsync: updateOrganization, isPending } = useUpdateOrganization(
    authClient as OrganizationAuthClient,
    {
      onSuccess: () =>
        toast.success(organizationLocalization.organizationUpdatedSuccess)
    }
  )

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <ChangeOrganizationLogo />

      {activeOrganization ? (
        <>
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

          <Field data-invalid={slugAvailability === "unavailable"}>
            <FieldTitle>{organizationLocalization.slug}</FieldTitle>
            <EditableText
              disabled={isPending}
              displayValue={`${slugPrefix}${activeOrganization.slug}`}
              endContent={
                <SlugAvailabilityIndicator status={slugAvailability} />
              }
              inputStart={slugPrefix || undefined}
              label={organizationLocalization.slug}
              onDraftChange={setSlugDraft}
              onSave={async (slug) => {
                await updateOrganization({ data: { slug } })
              }}
              placeholder={organizationLocalization.slugPlaceholder}
              saveDisabled={
                slugAvailability === "checking" ||
                slugAvailability === "unavailable"
              }
              transform={sanitizeSlug}
              value={activeOrganization.slug}
            />
            <FieldError>
              {slugAvailability === "unavailable"
                ? "This slug is unavailable."
                : undefined}
            </FieldError>
          </Field>
        </>
      ) : (
        <OrganizationProfileSkeleton
          name={organizationLocalization.name}
          slug={organizationLocalization.slug}
        />
      )}
    </div>
  )
}

function OrganizationProfileSkeleton({
  name,
  slug
}: {
  name: string
  slug: string
}) {
  return (
    <>
      {[name, slug].map((label) => (
        <Field key={label}>
          <FieldTitle>{label}</FieldTitle>
          <Skeleton className="h-8 w-56 rounded-md" />
        </Field>
      ))}
    </>
  )
}
