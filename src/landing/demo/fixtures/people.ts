import { type GrantOptions } from "@/shared/console/visibility/field"
import { demoId } from "./ids"
import { type PersonId } from "./types"

export type DemoPerson = {
  id: PersonId
  name: string
  teamIds: readonly string[]
}

export const teamIds = {
  design: "teams_design",
  engineering: "teams_engineering",
  finance: "teams_finance",
  marketing: "teams_marketing",
} as const

export function personId(name: string) {
  return demoId("persons", name)
}

/** The signed-in person the mocks speak for. */
export const viewerId = personId("maya")

export const people: readonly DemoPerson[] = [
  person("maya", "Maya Lund", teamIds.finance),
  person("priya", "Priya Natarajan", teamIds.finance),
  person("elin", "Elin Sjöberg", teamIds.finance),
  person("tom", "Tom Achebe", teamIds.finance),
  person("sara", "Sara Holm", teamIds.finance),
  person("noor", "Noor Haddad", teamIds.finance),
  person("jonas", "Jonas Berg", teamIds.engineering),
  person("liv", "Liv Andersen", teamIds.engineering),
  person("ravi", "Ravi Menon", teamIds.engineering),
  person("kim", "Kim Park", teamIds.engineering),
  person("ida", "Ida Lindqvist", teamIds.marketing),
  person("omar", "Omar Farouk", teamIds.marketing),
  person("hanna", "Hanna Ek", teamIds.design),
]

export const teams = [
  { id: teamIds.engineering, name: "Engineering" },
  { id: teamIds.marketing, name: "Marketing" },
  { id: teamIds.finance, name: "Billing" },
  { id: teamIds.design, name: "Design" },
] as const

/** Who the sharing fields may offer, the way the console lists them. */
export const grantOptions: GrantOptions = {
  people: people.map((person) => ({ id: person.id, name: person.name })),
  teams: teams.map((team) => ({
    id: team.id,
    name: team.name,
    hint: memberHint(team.id),
  })),
}

export function personName(id: PersonId | undefined) {
  return people.find((person) => person.id === id)?.name
}

/** Owner fields for every mock projection, resolved from the people directory. */
export function ownerFields<Id extends PersonId | undefined>(ownerId: Id) {
  return { ownerId, ownerName: personName(ownerId), ownerImage: undefined }
}

function person(key: string, name: string, teamId: string): DemoPerson {
  return { id: personId(key), name, teamIds: [teamId] }
}

function memberHint(teamId: string) {
  const count = people.filter((person) =>
    person.teamIds.includes(teamId)
  ).length

  return count === 1 ? "1 member" : `${count} members`
}
