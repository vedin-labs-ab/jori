import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin,
  useHasPermission,
  useListOrganizationMembers,
  useSession
} from "@better-auth-ui/react"
import { Users } from "lucide-react"
import { type ComponentProps, useMemo, useState } from "react"

import { SectionHeader } from "@/components/ui/section"
import {
  Table,
  TableBody,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { cn } from "@/lib/utils"
import { OrganizationMemberRow } from "./organization-member-row"
import { OrganizationMemberRowSkeleton } from "./organization-member-row-skeleton"
import {
  OrganizationActionsTableHead,
  OrganizationFilterTableHead,
  OrganizationSearchableTableHead,
  OrganizationTableEmpty
} from "./table"

/** Props for the `OrganizationMembers` component. */
export type OrganizationMembersProps = {
  className?: string
}

/**
 * Organization members table with title, invite control, and per-row actions.
 */
export function OrganizationMembers({
  className,
  ...props
}: OrganizationMembersProps & ComponentProps<"div">) {
  const { authClient } = useAuth()
  const { localization: organizationLocalization, roles } =
    useAuthPlugin(organizationPlugin)

  const { data: session } = useSession(authClient)
  const { data: activeOrganization, isPending: activeOrganizationPending } =
    useActiveOrganization(authClient as OrganizationAuthClient)
  const { data: membersData, isPending: membersPending } =
    useListOrganizationMembers(authClient as OrganizationAuthClient)

  const { isPending: updatePermissionPending } = useHasPermission(
    authClient as OrganizationAuthClient,
    {
      permissions: { member: ["update"] }
    }
  )
  const { isPending: deletePermissionPending } = useHasPermission(
    authClient as OrganizationAuthClient,
    {
      permissions: { member: ["delete"] }
    }
  )

  const isPending =
    activeOrganizationPending ||
    membersPending ||
    updatePermissionPending ||
    deletePermissionPending

  const [roleFilter, setRoleFilter] = useState("all")
  const [search, setSearch] = useState("")

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return membersData?.members.filter(
      (member) =>
        (roleFilter === "all" || member.role === roleFilter) &&
        (member.user.name.toLowerCase().includes(normalizedSearch) ||
          member.user.email.toLowerCase().includes(normalizedSearch))
    )
  }, [search, membersData?.members, roleFilter])

  const isOwner = membersData?.members.some(
    (member) => member.role === "owner" && member.userId === session?.user.id
  )
  const hasFilters = search.trim() !== "" || roleFilter !== "all"
  const roleOptions = Object.entries(roles).map(([value, label]) => ({
    label,
    value
  }))

  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      <SectionHeader title={organizationLocalization.members} />

      <div className="overflow-x-auto rounded-lg border">
        <Table
          aria-label={organizationLocalization.members}
          className="min-w-lg [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4"
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
              <OrganizationSearchableTableHead
                disabled={isPending}
                label={organizationLocalization.member}
                onValueChange={setSearch}
                placeholder="Search members"
                value={search}
              />

              <OrganizationFilterTableHead
                allLabel={organizationLocalization.all}
                disabled={isPending}
                label={organizationLocalization.role}
                onValueChange={setRoleFilter}
                options={roleOptions}
                value={roleFilter}
              />

              <OrganizationActionsTableHead
                label={organizationLocalization.actions}
              />
            </TableRow>
          </TableHeader>

          <TableBody>
            {isPending ? (
              <OrganizationMemberRowSkeleton />
            ) : !activeOrganization || !filteredMembers?.length ? (
              <OrganizationTableEmpty
                colSpan={3}
                description={
                  hasFilters
                    ? "Adjust the search or role filter."
                    : "Members appear here after they join the organization."
                }
                icon={Users}
                title={hasFilters ? "No matching members" : "No members yet"}
              />
            ) : (
              filteredMembers.map((member) => (
                <OrganizationMemberRow
                  key={member.id}
                  member={member}
                  isOwner={isOwner}
                  organization={activeOrganization}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
