import { useQuery } from "convex/react"
import { type GrantOptions } from "@/shared/console/visibility/field"
import { type GrantOption } from "@/shared/console/visibility/grants"
import { api } from "../../../../convex/_generated/api"

/** Who the organization's sharing fields may offer. */
export function useGrantOptions(organizationId: string): GrantOptions {
  return {
    people: usePeopleOptions(organizationId),
    teams: useTeamOptions(organizationId),
  }
}

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
