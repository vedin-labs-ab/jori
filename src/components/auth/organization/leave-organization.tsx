"use client"

import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin
} from "@better-auth-ui/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { LeaveOrganizationDialog } from "./leave-organization-dialog"

/**
 * Danger-zone row to leave the active organization.
 */
export function LeaveOrganization() {
  const { authClient } = useAuth()
  const { localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin)

  const { data: activeOrganization } = useActiveOrganization(
    authClient as OrganizationAuthClient
  )

  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <CardTitle>
          {organizationLocalization.leaveOrganization}
        </CardTitle>

        <CardDescription className="mt-0.5">
          {organizationLocalization.leaveOrganizationDescription}
        </CardDescription>
      </div>

      <Button
        disabled={!activeOrganization}
        size="sm"
        variant="destructive"
        onClick={() => setConfirmOpen(true)}
      >
        {organizationLocalization.leaveOrganization}
      </Button>

      {activeOrganization && (
        <LeaveOrganizationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          organization={activeOrganization}
        />
      )}
    </div>
  )
}
