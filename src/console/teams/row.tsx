import { PencilLine, Trash2 } from "lucide-react"
import { useState } from "react"
import { OrganizationTableActionMenu } from "@/components/auth/organization/table"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { TeamDeleteDialog } from "./delete"
import { TeamRenameDialog } from "./rename"
import { type RosterMember, TeamRoster } from "./roster"

export type Team = {
  id: string
  name: string
  createdAt: number
  members: RosterMember[]
}

export type TeamPermissions = {
  canDelete: boolean
  canManageMembers: boolean
  canUpdate: boolean
}

/** One team: name, roster, and the gated management actions. */
export function TeamRow({
  team,
  permissions,
}: {
  team: Team
  permissions: TeamPermissions
}) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <TableRow>
      <TableCell className="font-medium">{team.name}</TableCell>

      <TableCell>
        <TeamRoster canManage={permissions.canManageMembers} team={team} />
      </TableCell>

      <TableCell className="text-end">
        {permissions.canUpdate || permissions.canDelete ? (
          <OrganizationTableActionMenu label={`Actions: ${team.name}`}>
            {permissions.canUpdate ? (
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <PencilLine />
                Rename team
              </DropdownMenuItem>
            ) : null}
            {permissions.canDelete ? (
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                variant="destructive"
              >
                <Trash2 />
                Delete team
              </DropdownMenuItem>
            ) : null}
          </OrganizationTableActionMenu>
        ) : null}

        <TeamRenameDialog
          onOpenChange={setRenameOpen}
          open={renameOpen}
          team={team}
        />
        <TeamDeleteDialog
          onOpenChange={setDeleteOpen}
          open={deleteOpen}
          team={team}
        />
      </TableCell>
    </TableRow>
  )
}
