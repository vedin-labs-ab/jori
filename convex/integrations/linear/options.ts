import { fetchJsonObject } from "../../shared/http"
import { optionalString, readArray } from "../../shared/input"
import {
  compactDescription,
  maxOptions,
  normalizeQuery,
  type OptionLoaderArgs,
  optionalMatch,
  optionMatches,
  readNestedString,
  readRecord,
  requiredOptionString,
} from "../options/common"
import { linearGraphqlUrl } from "./config"
import { requireLinearCredentials } from "./credentials"

export async function searchLinearTeams(args: OptionLoaderArgs) {
  const result = await linearGraphql(args, {
    query: `
      query MiloAutomationTeams($first: Int!) {
        teams(first: $first) { nodes { id key name } }
      }
    `,
    variables: { first: maxOptions },
  })
  const normalizedQuery = normalizeQuery(args.query)

  return readArray(readRecord(readRecord(result.data).teams).nodes)
    .map(readRecord)
    .map((team) => ({
      value: requiredOptionString(team.id),
      label: requiredOptionString(team.name),
      description: requiredOptionString(team.key),
    }))
    .filter((option) => optionMatches(option, normalizedQuery))
}

export async function searchLinearProjects(args: OptionLoaderArgs) {
  const result = await linearGraphql(args, {
    query: `
      query MiloAutomationProjects($first: Int!) {
        projects(first: $first) {
          nodes { id name state teams { nodes { id key name } } }
        }
      }
    `,
    variables: { first: maxOptions },
  })
  const normalizedQuery = normalizeQuery(args.query)
  const teamId = optionalMatch(args.match, "team")

  return readArray(readRecord(readRecord(result.data).projects).nodes)
    .map(readRecord)
    .filter((project) => projectMatchesTeam(project, teamId))
    .map((project) => ({
      value: requiredOptionString(project.id),
      label: requiredOptionString(project.name),
      description: compactDescription([
        optionalString(project.state),
        projectTeamSummary(project),
      ]),
    }))
    .filter((option) => optionMatches(option, normalizedQuery))
}

export async function searchLinearIssues(args: OptionLoaderArgs) {
  const normalizedQuery = normalizeQuery(args.query)
  const result = await linearGraphql(args, issueSearchBody(normalizedQuery))
  const teamId = optionalMatch(args.match, "team")
  const projectId = optionalMatch(args.match, "project")

  return readArray(readRecord(readRecord(result.data).issues).nodes)
    .map(readRecord)
    .filter((issue) => issueMatchesMatch(issue, teamId, projectId))
    .map((issue) => ({
      value: requiredOptionString(issue.id),
      label: `${requiredOptionString(issue.identifier)} ${requiredOptionString(issue.title)}`,
      description: compactDescription([
        readNestedString(issue, "state", "name"),
        readNestedString(issue, "team", "key"),
        readNestedString(issue, "project", "name"),
      ]),
    }))
}

async function linearGraphql(
  args: OptionLoaderArgs,
  body: Record<string, unknown>
) {
  const credentials = requireLinearCredentials(args.integration)
  const result = await fetchJsonObject(linearGraphqlUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${credentials.tokens.access}`,
      "content-type": "application/json",
    },
    body,
  })

  if (result?.errors !== undefined) {
    throw new Error("Linear option request failed")
  }

  return result
}

function issueSearchBody(query: string) {
  const fields = `
    nodes {
      id
      identifier
      title
      team { id key name }
      project { id name }
      state { name type }
    }
  `

  return query === ""
    ? {
        query: `query MiloAutomationIssues($first: Int!) {
          issues(first: $first) { ${fields} }
        }`,
        variables: { first: maxOptions },
      }
    : {
        query: `query MiloAutomationIssues($first: Int!, $query: String!) {
          issues(first: $first, filter: { title: { containsIgnoreCase: $query } }) {
            ${fields}
          }
        }`,
        variables: { first: maxOptions, query },
      }
}

function projectMatchesTeam(
  project: Record<string, unknown>,
  teamId: string | undefined
) {
  if (teamId === undefined) {
    return true
  }

  return readArray(readRecord(project.teams).nodes).some(
    (team) => readRecord(team).id === teamId
  )
}

function projectTeamSummary(project: Record<string, unknown>) {
  const teams = readArray(readRecord(project.teams).nodes)
    .map((team) => optionalString(readRecord(team).key))
    .filter((team): team is string => team !== undefined)

  return teams.length === 0 ? undefined : teams.join(", ")
}

function issueMatchesMatch(
  issue: Record<string, unknown>,
  teamId: string | undefined,
  projectId: string | undefined
) {
  return (
    (teamId === undefined ||
      readNestedString(issue, "team", "id") === teamId) &&
    (projectId === undefined ||
      readNestedString(issue, "project", "id") === projectId)
  )
}
