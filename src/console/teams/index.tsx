import {
  type OrganizationAuthClient,
  useHasPermission,
} from "@better-auth-ui/react"
import { useQuery } from "convex/react"
import { UsersRound } from "lucide-react"
import {
  OrganizationActionsTableHead,
  OrganizationTableEmpty,
} from "@/components/auth/organization/table"
import { Section } from "@/components/ui/section"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { authClient } from "@/shared/session/auth"
import { api } from "../../../convex/_generated/api"
import { TeamRow } from "./row"

/** The Teams tab: every organization member sees the teams and their
 *  rosters, the way the People tab shows the member list; management is for
 *  those the server grants the team permissions — owners and admins. */
export function TeamsSettings({ organizationId }: { organizationId: string }) {
  const teams = useQuery(api.organization.teams.list, { organizationId })
  const permissions = useTeamPermissions()

  return (
    <Section>
      <TableFrame>
        <Table aria-label="Teams" className="min-w-lg">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-48">Team</TableHead>
              <TableHead>Members</TableHead>
              <OrganizationActionsTableHead label="Actions" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {teams === undefined ? (
              <TeamRowSkeleton />
            ) : teams.length === 0 ? (
              <OrganizationTableEmpty
                colSpan={3}
                description="Group people who work together. Teams can then be given access as one."
                icon={UsersRound}
                title="No teams yet"
              />
            ) : (
              teams.map((team) => (
                <TeamRow key={team.id} permissions={permissions} team={team} />
              ))
            )}
          </TableBody>
        </Table>
      </TableFrame>
    </Section>
  )
}

/** What the signed-in member may do to teams, mirroring the server's role
 *  statements: rename and delete ride the team permissions, roster changes
 *  ride member update — the same permission that gates the People tab. */
function useTeamPermissions() {
  const organizationAuthClient = authClient as OrganizationAuthClient
  const { data: update } = useHasPermission(organizationAuthClient, {
    permissions: { team: ["update"] },
  })
  const { data: remove } = useHasPermission(organizationAuthClient, {
    permissions: { team: ["delete"] },
  })
  const { data: members } = useHasPermission(organizationAuthClient, {
    permissions: { member: ["update"] },
  })

  return {
    canDelete: remove?.success === true,
    canManageMembers: members?.success === true,
    canUpdate: update?.success === true,
  }
}

function TeamRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24" />
      </TableCell>
      <TableCell />
    </TableRow>
  )
}
