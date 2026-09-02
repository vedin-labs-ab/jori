import { useQuery } from "convex/react"
import { type GrantOption } from "@/shared/console/visibility/grants"
import { api } from "../../../../convex/_generated/api"

/** The organization's grantable people, from the visibility surface. */
export function usePeopleOptions(organizationId: string) {
  const grantees = useQuery(api.visibility.console.grantees, {
    organizationId,
  })

  return grantees?.people === undefined
    ? undefined
    : grantees.people.map(
        (person): GrantOption => ({
          id: person.personId,
          name: person.name ?? "Member",
          image: person.image,
        })
      )
}

/** The organization's teams, from the teams settings surface. */
export function useTeamOptions(organizationId: string) {
  const teams = useQuery(api.organization.teams.list, { organizationId })

  return Array.isArray(teams)
    ? teams.map(
        (team): GrantOption => ({
          id: team.id,
          name: team.name,
          hint:
            team.members.length === 1
              ? "1 member"
              : `${team.members.length} members`,
        })
      )
    : undefined
}
