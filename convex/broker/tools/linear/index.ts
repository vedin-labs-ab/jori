import { isRecord } from "../../../../contracts/json"
import { type Doc } from "../../../_generated/dataModel"
import { requireLinearCredentials } from "../../../integrations/linear/credentials"
import { postLinearComment } from "../../../integrations/linear/delivery/comments"
import { addLinearReaction } from "../../../integrations/linear/delivery/reactions"
import { linearGraphql } from "../../../integrations/linear/graphql"
import {
  boundedNumber,
  readArray,
  readRecord,
  requiredString,
} from "../../../shared/input"

export async function callLinearTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>
) {
  const credentials = requireLinearCredentials(integration)

  if (tool === "linear_search_issues") {
    return await searchLinearIssues(credentials.tokens.access, args)
  }

  if (tool === "linear_get_issue") {
    const result = await linearGraphql<Record<string, unknown>>(
      credentials.tokens.access,
      {
        query: `
        query JoriIssue($id: String!) {
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
                parent { id }
                user { id name }
              }
            }
          }
        }
      `,
        variables: { id: requiredString(args.issueId, "issueId") },
      }
    )

    return readRecord(result.data).issue ?? null
  }

  if (tool === "linear_list_comments") {
    const result = await linearGraphql<Record<string, unknown>>(
      credentials.tokens.access,
      {
        query: `
        query JoriIssueComments($id: String!, $first: Int!) {
          issue(id: $id) {
            id
            comments(first: $first) {
              nodes {
                id
                body
                createdAt
                updatedAt
                url
                parent { id }
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
      }
    )

    return readArray(
      readRecord(readRecord(readRecord(result.data).issue).comments).nodes
    )
  }

  if (tool === "linear_add_comment") {
    const payload = mutationPayload(
      await postLinearComment(integration, args),
      "commentCreate"
    )

    return {
      success: payload.success === true,
      comment: payload.comment ?? null,
    }
  }

  if (tool === "linear_add_reaction") {
    const payload = mutationPayload(
      await addLinearReaction(integration, args),
      "reactionCreate"
    )

    return {
      success: payload.success === true,
      reaction: payload.reaction ?? null,
    }
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

  const result = await linearGraphql<Record<string, unknown>>(token, {
    query: `
      query JoriIssueSummary($id: String!) {
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

function readOptionalRecord(value: unknown) {
  return isRecord(value) ? value : null
}

function mutationPayload(result: unknown, mutation: string) {
  return readRecord(readRecord(readRecord(result).data)[mutation])
}

async function searchLinearIssues(
  token: string,
  args: Record<string, unknown>
) {
  const query = normalizeSearchQuery(requiredString(args.query, "query"))
  const exactIssue = await getLinearIssueSummaryByIdentifier(token, query)
  const result = await linearGraphql<Record<string, unknown>>(token, {
    query: `
        query JoriIssueSearch($query: String!, $first: Int!) {
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
