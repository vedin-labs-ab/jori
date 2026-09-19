"use client"

import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin,
  useHasPermission
} from "@better-auth-ui/react"
import { useQuery } from "convex/react"
import { useState } from "react"
import { api } from "../../../../convex/_generated/api"

import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { longDate } from "@/shared/console/time"
import { DeleteOrganizationDialog } from "./delete-organization-dialog"
import { DeleteOrganizationSkeleton } from "./delete-organization-skeleton"

/**
 * Danger-zone row to delete the active organization. Hidden for members without
 * the `organization:delete` permission.
 */
export function DeleteOrganization() {
  const { authClient } = useAuth()
  const { localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin)

  const { data: activeOrganization } = useActiveOrganization(
    authClient as OrganizationAuthClient
  )

  const { data: permission, isPending: permissionPending } = useHasPermission(
    authClient as OrganizationAuthClient,
    {
      permissions: { organization: ["delete"] }
    }
  )

  // An ended subscription schedules its own deletion, so beside that notice
  // this row has to say it is the other one: by hand, and today.
  const retention = useQuery(
    api.retention.console.status,
    activeOrganization ? { organizationId: activeOrganization.id } : "skip"
  )

  const [confirmOpen, setConfirmOpen] = useState(false)

  if (permissionPending) {
    return <DeleteOrganizationSkeleton />
  }

  if (!permission?.success) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <CardTitle>
          {organizationLocalization.deleteOrganization}
        </CardTitle>

        <CardDescription className="mt-0.5">
          {retention?.state === "retained"
            ? `Delete this organization and its data today instead of on ${longDate(retention.deletesAt)}. Export anything you need first.`
            : "Permanently delete this organization and its data. Export anything you need first."}
        </CardDescription>
      </div>

      <Button
        disabled={!activeOrganization}
        size="sm"
        variant="destructive"
        onClick={() => setConfirmOpen(true)}
      >
        {organizationLocalization.deleteOrganization}
      </Button>

      {activeOrganization && (
        <DeleteOrganizationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          organization={activeOrganization}
        />
      )}
    </div>
  )
}
