import {
  type OrganizationAuthClient,
  useListOrganizationMembers,
} from "@better-auth-ui/react"
import { UserRoundPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/shared/session/auth"

export type RosterMember = {
  userId: string
  name: string
  image?: string
}

const stackLimit = 4

/** The roster cell: an avatar stack with the count, plus the picker for
 *  people allowed to change who belongs. */
export function TeamRoster({
  team,
  canManage,
}: {
  team: { id: string; name: string; members: RosterMember[] }
  canManage: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <RosterAvatars members={team.members} />
      {canManage ? <RosterMenu team={team} /> : null}
    </div>
  )
}

function RosterAvatars({ members }: { members: RosterMember[] }) {
  if (members.length === 0) {
    return <span className="text-muted-foreground">No members</span>
  }

  return (
    <>
      <AvatarGroup>
        {members.slice(0, stackLimit).map((member) => (
          <Avatar key={member.userId} size="sm">
            <AvatarImage alt={member.name} src={member.image} />
            <AvatarFallback>
              {member.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {members.length > stackLimit ? (
          <AvatarGroupCount className="size-6 text-[0.625rem]">
            +{members.length - stackLimit}
          </AvatarGroupCount>
        ) : null}
      </AvatarGroup>
      <span className="text-muted-foreground text-xs tabular-nums">
        {members.length}
      </span>
    </>
  )
}

/** Search scores only the option labels: item identity is the user id,
 *  which must never match text the user types. */
function rosterFilter(_value: string, search: string, keywords?: string[]) {
  const haystack = (keywords ?? []).join(" ").toLowerCase()

  return haystack.includes(search.trim().toLowerCase()) ? 1 : 0
}

/** Compact searchable picker over the organization's members: selecting a
 *  person toggles their team membership. */
function RosterMenu({
  team,
}: {
  team: { id: string; name: string; members: RosterMember[] }
}) {
  const { data: membersData } = useListOrganizationMembers(
    authClient as OrganizationAuthClient
  )
  const [pendingUserId, setPendingUserId] = useState<string>()
  const rosterIds = new Set(team.members.map((member) => member.userId))

  async function toggle(userId: string) {
    setPendingUserId(userId)

    const body = { teamId: team.id, userId }
    const { error } = rosterIds.has(userId)
      ? await authClient.organization.removeTeamMember(body)
      : await authClient.organization.addTeamMember(body)

    setPendingUserId(undefined)

    if (error) {
      toast.error(error.message ?? "Could not update the team's members.")
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Edit members: ${team.name}`}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <UserRoundPlus />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command filter={rosterFilter}>
          <CommandInput placeholder="Search members…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {membersData?.members.map((member) => (
                <CommandItem
                  data-checked={rosterIds.has(member.userId)}
                  disabled={pendingUserId !== undefined}
                  key={member.userId}
                  keywords={[member.user.name, member.user.email]}
                  onSelect={() => void toggle(member.userId)}
                  value={member.userId}
                >
                  <span className="truncate">{member.user.name}</span>
                  {pendingUserId === member.userId ? <Spinner /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
