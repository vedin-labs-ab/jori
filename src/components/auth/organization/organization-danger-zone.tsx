"use client"

import {
  type OrganizationAuthClient,
  useAuth,
  useHasPermission
} from "@better-auth-ui/react"
import { TriangleAlert } from "lucide-react"
import type { ComponentProps } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Section, SectionHeader } from "@/components/ui/section"
import { Separator } from "@/components/ui/separator"
import { DeleteOrganization } from "./delete-organization"
import { DeleteOrganizationSkeleton } from "./delete-organization-skeleton"
import { LeaveOrganization } from "./leave-organization"

export type OrganizationDangerZoneProps = {
  className?: string
}

/**
 * Danger zone heading with `LeaveOrganization` and `DeleteOrganization`
 * for the active organization in a single card.
 *
 * Resolves the `organization:delete` permission before rendering anything to
 * avoid flashing `LeaveOrganization` (and a stray separator) before the
 * delete row appears or disappears.
 */
export function OrganizationDangerZone({
  className,
  ...props
}: OrganizationDangerZoneProps & ComponentProps<"section">) {
  const { authClient, localization } = useAuth()

  const { data: deletePermission, isPending: deletePermissionPending } =
    useHasPermission(authClient as OrganizationAuthClient, {
      permissions: { organization: ["delete"] }
    })

  const canDelete = !!deletePermission?.success

  return (
    <Section className={className} {...props}>
      <SectionHeader
        icon={<TriangleAlert className="text-destructive" />}
        title={localization.settings.dangerZone}
      />

      <Card className="gap-0 py-0">
        <CardContent className="py-4">
          {deletePermissionPending ? (
            <DeleteOrganizationSkeleton />
          ) : (
            <LeaveOrganization />
          )}
        </CardContent>

        {!deletePermissionPending && canDelete ? (
          <>
            <Separator />
            <CardContent className="py-4">
              <DeleteOrganization />
            </CardContent>
          </>
        ) : null}
      </Card>
    </Section>
  )
}
