import {
  type OrganizationAuthClient,
  useAuth,
  useAuthPlugin,
  useCancelInvitation,
  useHasPermission
} from "@better-auth-ui/react"
import type { Invitation } from "better-auth/client"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { TableCell, TableRow } from "@/components/ui/table"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { OrganizationInvitationRowSkeleton } from "./organization-invitation-row-skeleton"

export type OrganizationInvitationRowProps = {
  invitation: Invitation
}

export function OrganizationInvitationRow({
  invitation
}: OrganizationInvitationRowProps) {
  const { authClient } = useAuth()
  const { localization: organizationLocalization, roles } =
    useAuthPlugin(organizationPlugin)

  const {
    data: cancelInvitationPermission,
    isPending: cancelPermissionPending
  } = useHasPermission(authClient as OrganizationAuthClient, {
    permissions: { invitation: ["cancel"] }
  })

  const { mutate: cancelInvitation, isPending: cancelPending } =
    useCancelInvitation(authClient as OrganizationAuthClient)

  const roleLabel = roles?.[invitation.role] ?? invitation.role

  const statusLabel =
    organizationLocalization[
      invitation.status as keyof typeof organizationLocalization
    ] ?? invitation.status

  if (cancelPermissionPending) {
    return <OrganizationInvitationRowSkeleton />
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{invitation.email}</TableCell>

      <TableCell className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
        {new Date(invitation.createdAt).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short"
        })}
      </TableCell>

      <TableCell>{roleLabel}</TableCell>

      <TableCell>
        <Badge variant="secondary">{String(statusLabel)}</Badge>
      </TableCell>

      <TableCell className="text-end">
        {cancelInvitationPermission?.success &&
          invitation.status === "pending" && (
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              disabled={cancelPending}
              onClick={() => cancelInvitation({ invitationId: invitation.id })}
              aria-label={organizationLocalization.cancelInvitation}
            >
              {cancelPending ? <Spinner /> : <X />}
            </Button>
          )}
      </TableCell>
    </TableRow>
  )
}
