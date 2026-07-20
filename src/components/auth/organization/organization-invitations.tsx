"use client"

import type { OrganizationLocalization } from "@better-auth-ui/core/plugins"
import {
  type OrganizationAuthClient,
  useAuth,
  useAuthPlugin,
  useHasPermission,
  useListOrganizationInvitations
} from "@better-auth-ui/react"
import { Search, Send } from "lucide-react"
import { type ComponentProps, useMemo, useState } from "react"

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
import { OrganizationInvitationRow } from "./organization-invitation-row"
import { OrganizationInvitationRowSkeleton } from "./organization-invitation-row-skeleton"
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

const invitationStatuses = [
  "pending",
  "accepted",
  "rejected",
  "canceled"
] as const

/** Props for the `OrganizationInvitations` component. */
export type OrganizationInvitationsProps = {
  className?: string
}

/** Organization invitations table with inline filters and per-row actions. */
export function OrganizationInvitations({
  className,
  ...props
}: OrganizationInvitationsProps & ComponentProps<"div">) {
  const { authClient, localization } = useAuth()
  const { localization: organizationLocalization, roles } =
    useAuthPlugin(organizationPlugin)

  const { data: invitations, isPending: invitationsPending } =
    useListOrganizationInvitations(authClient as OrganizationAuthClient)

  const { isPending: invitationPermissionPending } = useHasPermission(
    authClient as OrganizationAuthClient,
    {
      permissions: { invitation: ["cancel"] }
    }
  )

  const isPending = invitationsPending || invitationPermissionPending

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>()
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return invitations?.filter(
      (invitation) =>
        (roleFilter === "all" || invitation.role === roleFilter) &&
        (statusFilter === "all" || invitation.status === statusFilter) &&
        invitation.email.toLowerCase().includes(normalizedSearch)
    )
  }, [search, invitations, roleFilter, statusFilter])

  const sortedInvitations = useMemo(() => {
    if (!sortDescriptor || !filteredInvitations) return filteredInvitations

    return [...filteredInvitations].sort((first, second) => {
      const column = sortDescriptor.column as keyof typeof first
      let comparison = 0

      if (column === "createdAt") {
        comparison =
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime()
      } else {
        comparison = String(first[column]).localeCompare(String(second[column]))
      }

      if (sortDescriptor.direction === "descending") {
        comparison *= -1
      }

      return comparison
    })
  }, [sortDescriptor, filteredInvitations])

  const hasFilters =
    search.trim() !== "" || roleFilter !== "all" || statusFilter !== "all"
  const roleOptions = Object.entries(roles).map(([value, label]) => ({
    label,
    value
  }))
  const statusOptions = invitationStatuses.map((value) => ({
    label:
      organizationLocalization[value as keyof OrganizationLocalization] ??
      value,
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
      <h3 className="truncate text-sm font-semibold">
        {organizationLocalization.invitations}
      </h3>

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
          aria-label={organizationLocalization.invitations}
          className="min-w-2xl [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4"
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
              <OrganizationSortableTableHead
                sortDirection={
                  sortDescriptor?.column === "email"
                    ? sortDescriptor.direction
                    : undefined
                }
                onClick={() => toggleSort("email")}
              >
                {localization.auth.email}
              </OrganizationSortableTableHead>

              <OrganizationSortableTableHead
                sortDirection={
                  sortDescriptor?.column === "createdAt"
                    ? sortDescriptor.direction
                    : undefined
                }
                onClick={() => toggleSort("createdAt")}
              >
                {organizationLocalization.invitedAt}
              </OrganizationSortableTableHead>

              <OrganizationFilterTableHead
                allLabel={organizationLocalization.all}
                disabled={isPending}
                label={organizationLocalization.role}
                onValueChange={setRoleFilter}
                options={roleOptions}
                value={roleFilter}
              />

              <OrganizationFilterTableHead
                allLabel={organizationLocalization.all}
                disabled={isPending}
                label={organizationLocalization.status}
                onValueChange={setStatusFilter}
                options={statusOptions}
                value={statusFilter}
              />

              <TableHead className="text-end">
                {organizationLocalization.actions}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isPending ? (
              <OrganizationInvitationRowSkeleton />
            ) : !sortedInvitations?.length ? (
              <OrganizationTableEmpty
                colSpan={5}
                description={
                  hasFilters
                    ? "Adjust the search or filters."
                    : organizationLocalization.organizationInvitationsEmptyDescription
                }
                icon={Send}
                title={
                  hasFilters
                    ? "No matching invitations"
                    : organizationLocalization.noInvitations
                }
              />
            ) : (
              sortedInvitations.map((invitation) => (
                <OrganizationInvitationRow
                  key={invitation.id}
                  invitation={invitation}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
