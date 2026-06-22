import { type Doc } from "../../_generated/dataModel"
import { linearGraphqlUrl } from "../../providers/linear/config"
import { requireLinearCredentials } from "../../providers/linear/credentials"
import { fetchJsonObject } from "../../shared/http"
import {
  boundedNumber,
  readArray,
  readRecord,
  requiredString,
} from "../../shared/input"

export async function callLinearTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>
) {
  const credentials = requireLinearCredentials(integration)

  if (tool === "linear_search_issues") {
    const query = normalizeSearchQuery(requiredString(args.query, "query"))
    const exactIssue = await getLinearIssueSummaryByIdentifier(
      credentials.tokens.access,
      query
    )
    const result = await linearGraphql(credentials.tokens.access, {
      query: `
        query MiloIssueSearch($query: String!, $first: Int!) {
          issues(
            first: $first
            filter: {
              or: [
                { title: { containsIgnoreCase: $query } }
                { description: { containsIgnoreCase: $query } }
                { comments: { body: { containsIgnoreCase: $query } } }
              ]
            }
          ) {
            nodes {
              id
              identifier
              title
              url
              updatedAt
              state { name type }
              assignee { id name }
              creator { id name }
            }
          }
        }
      `,
      variables: {
        query,
        first: boundedNumber(args.first, 10, 1, 25),
      },
    })
    const issuesById = new Map<string, unknown>()

    if (exactIssue !== null) {
      issuesById.set(String(exactIssue.id), exactIssue)
    }

    for (const issue of readArray(
      readRecord(readRecord(result.data).issues).nodes
    )) {
      const record = readRecord(issue)

      issuesById.set(String(record.id), record)
    }

    return { query, issues: [...issuesById.values()] }
  }

  if (tool === "linear_get_issue") {
    const result = await linearGraphql(credentials.tokens.access, {
      query: `
        query MiloIssue($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            description
            url
            createdAt
            updatedAt
            state { name type }
            assignee { id name }
            creator { id name }
            comments(first: 25) {
              nodes {
                id
                body
                createdAt
                updatedAt
                url
                user { id name }
              }
            }
          }
        }
      `,
      variables: { id: requiredString(args.issueId, "issueId") },
    })

    return readRecord(result.data).issue ?? null
  }

  if (tool === "linear_list_comments") {
    const result = await linearGraphql(credentials.tokens.access, {
      query: `
        query MiloIssueComments($id: String!, $first: Int!) {
          issue(id: $id) {
            id
            comments(first: $first) {
              nodes {
                id
                body
                createdAt
                updatedAt
                url
                user { id name }
              }
            }
          }
        }
      `,
      variables: {
        id: requiredString(args.issueId, "issueId"),
        first: boundedNumber(args.first, 25, 1, 50),
      },
    })

    return readArray(
      readRecord(readRecord(readRecord(result.data).issue).comments).nodes
    )
  }

  if (tool === "linear_add_comment") {
    return await linearGraphql(credentials.tokens.access, {
      query: `
        mutation MiloAddComment($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
            comment { id body url }
          }
        }
      `,
      variables: {
        input: {
          issueId: requiredString(args.issueId, "issueId"),
          body: requiredString(args.body, "body"),
        },
      },
    })
  }

  throw new Error(`Unknown Linear tool: ${tool}`)
}

function normalizeSearchQuery(query: string) {
  const unquoted = query.replace(/^["'](.*)["']$/, "$1").trim()

  if (unquoted === "") {
    throw new Error("query is required")
  }

  return unquoted
}

async function getLinearIssueSummaryByIdentifier(token: string, query: string) {
  if (!/^[a-z]+-\d+$/i.test(query)) {
    return null
  }

  const result = await linearGraphql(token, {
    query: `
      query MiloIssueSummary($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          url
          updatedAt
          state { name type }
          assignee { id name }
          creator { id name }
        }
      }
    `,
    variables: { id: query.toUpperCase() },
  })

  return readOptionalRecord(readRecord(result.data).issue)
}

async function linearGraphql(token: string, body: Record<string, unknown>) {
  const result = await fetchJsonObject(linearGraphqlUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body,
  })

  if (result?.errors !== undefined) {
    throw new Error(`Linear GraphQL request failed: ${JSON.stringify(result)}`)
  }

  return result
}

function readOptionalRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? readRecord(value)
    : null
}
