import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin,
  useHasPermission,
  useListOrganizationMembers,
  useSession
} from "@better-auth-ui/react"
import type { Member } from "better-auth/client"
import { Search, Users } from "lucide-react"
import { type ComponentProps, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "@/components/ui/input-group"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { cn } from "@/lib/utils"
import { InviteMemberDialog } from "./invite-member-dialog"
import { OrganizationMemberRow } from "./organization-member-row"
import { OrganizationMemberRowSkeleton } from "./organization-member-row-skeleton"
import {
  OrganizationFilterTableHead,
  OrganizationSortableTableHead,
  OrganizationTableEmpty,
  type OrganizationTableSortDirection
} from "./table"

type SortDescriptor = {
  column: string
  direction: OrganizationTableSortDirection
}

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

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>()
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

  const sortedMembers = useMemo(() => {
    if (!sortDescriptor || !filteredMembers) return filteredMembers

    return [...filteredMembers].sort((a, b) => {
      const column = sortDescriptor.column as keyof Member | "user"
      const first =
        column === "user"
          ? a.user.name || a.user.email
          : String(a[column])
      const second =
        column === "user"
          ? b.user.name || b.user.email
          : String(b[column])

      let comparison = first.localeCompare(second)
      if (sortDescriptor.direction === "descending") {
        comparison *= -1
      }

      return comparison
    })
  }, [sortDescriptor, filteredMembers])

  const [inviteOpen, setInviteOpen] = useState(false)

  const isOwner = membersData?.members.some(
    (member) => member.role === "owner" && member.userId === session?.user.id
  )
  const hasFilters = search.trim() !== "" || roleFilter !== "all"
  const roleOptions = Object.entries(roles).map(([value, label]) => ({
    label,
    value
  }))

  function toggleSort(column: string) {
    setSortDescriptor((current) => {
      if (current?.column !== column) {
        return { column, direction: "ascending" }
      }
      if (current.direction === "ascending") {
        return { column, direction: "descending" }
      }
      return undefined
    })
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex items-end justify-between gap-3">
        <h3 className="truncate text-sm font-semibold">
          {organizationLocalization.members}
        </h3>

        <Button
          className="shrink-0"
          size="sm"
          disabled={isPending}
          onClick={() => setInviteOpen(true)}
        >
          {organizationLocalization.inviteMember}
        </Button>
      </div>

      <InputGroup className="min-w-0 sm:w-[220px]">
        <InputGroupInput
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={organizationLocalization.search}
          placeholder={organizationLocalization.search}
          disabled={isPending}
        />

        <InputGroupAddon>
          <Search className="text-muted-foreground" />
        </InputGroupAddon>
      </InputGroup>

      <div className="overflow-x-auto rounded-lg border">
        <Table
          aria-label={organizationLocalization.members}
          className="min-w-lg [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4"
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
              <OrganizationSortableTableHead
                sortDirection={
                  sortDescriptor?.column === "user"
                    ? sortDescriptor.direction
                    : undefined
                }
                onClick={() => toggleSort("user")}
              >
                {organizationLocalization.member}
              </OrganizationSortableTableHead>

              <OrganizationFilterTableHead
                allLabel={organizationLocalization.all}
                disabled={isPending}
                label={organizationLocalization.role}
                onValueChange={setRoleFilter}
                options={roleOptions}
                value={roleFilter}
              />

              <TableHead className="text-end">
                {organizationLocalization.actions}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isPending ? (
              <OrganizationMemberRowSkeleton />
            ) : !activeOrganization || !sortedMembers?.length ? (
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
              sortedMembers.map((member) => (
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

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}
