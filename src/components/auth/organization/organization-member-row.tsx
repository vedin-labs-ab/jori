"use client"

import {
  type OrganizationAuthClient,
  useAuth,
  useAuthPlugin,
  useHasPermission,
  useSession,
  useUpdateMemberRole
} from "@better-auth-ui/react"
import type { Member, Organization, User } from "better-auth/client"
import { ChevronDown, LogOut, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { TableCell, TableRow } from "@/components/ui/table"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { UserView } from "../user/user-view"
import { LeaveOrganizationDialog } from "./leave-organization-dialog"
import { OrganizationMemberRowSkeleton } from "./organization-member-row-skeleton"
import { RemoveMemberDialog } from "./remove-member-dialog"
import { OrganizationTableActionMenu } from "./table"

export type OrganizationMemberRowProps = {
  member: Member & { user: Partial<User> }
  isOwner?: boolean
  organization: Organization
}

export function OrganizationMemberRow({
  member,
  isOwner,
  organization
}: OrganizationMemberRowProps) {
  const { authClient } = useAuth()
  const { localization: organizationLocalization, roles } =
    useAuthPlugin(organizationPlugin)

  const { data: session } = useSession(authClient)

  const { data: hasUpdatePermission, isPending: updatePermissionPending } =
    useHasPermission(authClient as OrganizationAuthClient, {
      permissions: { member: ["update"] }
    })

  const { data: hasDeletePermission, isPending: deletePermissionPending } =
    useHasPermission(authClient as OrganizationAuthClient, {
      permissions: { member: ["delete"] }
    })

  const isPending = updatePermissionPending || deletePermissionPending

  const { mutate: updateMemberRole, isPending: isUpdatingRole } =
    useUpdateMemberRole(authClient as OrganizationAuthClient, {
      onSuccess: () => toast.success(organizationLocalization.memberRoleUpdated)
    })

  const roleLabel = roles?.[member.role] ?? member.role

  const assignableRoles = Object.entries(roles).filter(
    ([key]) => isOwner || key !== "owner"
  )

  const isCurrentUser = session?.user.id === member.userId
  const memberLabel = member.user.name ?? member.user.email ?? roleLabel

  const [removeOpen, setRemoveOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  if (isPending) {
    return <OrganizationMemberRowSkeleton />
  }

  return (
    <TableRow>
      <TableCell>
        <UserView user={member.user} />
      </TableCell>

      <TableCell>
        <MemberRoleMenu
          disabled={!hasUpdatePermission?.success}
          label={`${organizationLocalization.changeMemberRole}: ${memberLabel}`}
          onValueChange={(role) =>
            updateMemberRole({ memberId: member.id, role })
          }
          options={assignableRoles}
          pending={isUpdatingRole}
          role={member.role}
          roleLabel={roleLabel}
        />
      </TableCell>

      <TableCell className="text-end">
        {isCurrentUser || hasDeletePermission?.success ? (
          <OrganizationTableActionMenu
            label={`${organizationLocalization.actions}: ${memberLabel}`}
          >
            {isCurrentUser ? (
              <DropdownMenuItem
                onSelect={() => setLeaveOpen(true)}
                variant="destructive"
              >
                <LogOut />
                {organizationLocalization.leaveOrganization}
              </DropdownMenuItem>
            ) : hasDeletePermission?.success ? (
              <DropdownMenuItem
                onSelect={() => setRemoveOpen(true)}
                variant="destructive"
              >
                <Trash2 />
                {organizationLocalization.removeMember}
              </DropdownMenuItem>
            ) : null}
          </OrganizationTableActionMenu>
        ) : null}

        {isCurrentUser ? (
          <LeaveOrganizationDialog
            open={leaveOpen}
            onOpenChange={setLeaveOpen}
            organization={organization}
          />
        ) : hasDeletePermission?.success ? (
          <RemoveMemberDialog
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            member={member}
          />
        ) : null}
      </TableCell>
    </TableRow>
  )
}

function MemberRoleMenu({
  disabled,
  label,
  onValueChange,
  options,
  pending,
  role,
  roleLabel
}: {
  disabled: boolean
  label: string
  onValueChange: (role: string) => void
  options: [string, string][]
  pending: boolean
  role: string
  roleLabel: string
}) {
  if (disabled) {
    return <span>{roleLabel}</span>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label}
          className="-ml-2"
          disabled={pending}
          size="sm"
          type="button"
          variant="ghost"
        >
          {roleLabel}
          {pending ? <Spinner /> : <ChevronDown />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          onValueChange={(value) => {
            if (value !== role) {
              onValueChange(value)
            }
          }}
          value={role}
        >
          {options.map(([value, optionLabel]) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {optionLabel}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
