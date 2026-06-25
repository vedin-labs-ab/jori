import { type Doc } from "../../../_generated/dataModel"
import { requireLinearCredentials } from "../../../providers/linear/credentials"
import { readRecord, requiredString } from "../../../shared/input"
import { linearGraphql } from "./client"

export type LinearCommentTarget =
  | {
      id: string
      issueId: string
      type: "comment"
    }
  | {
      id: string
      type: "issue"
    }

export async function postLinearComment(
  integration: Doc<"integrations">,
  args: Record<string, unknown>
) {
  const credentials = requireLinearCredentials(integration)

  return await linearGraphql(credentials.tokens.access, {
    query: `
      mutation MiloAddComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
            url
            parent { id }
            issue { id identifier }
          }
        }
      }
    `,
    variables: {
      input: commentCreateInput(args),
    },
  })
}

function commentCreateInput(args: Record<string, unknown>) {
  const target = readTarget(args.target)

  return {
    body: requiredString(args.body, "body"),
    ...(target.type === "issue"
      ? { issueId: target.id }
      : { issueId: target.issueId, parentId: target.id }),
  }
}

function readTarget(value: unknown): LinearCommentTarget {
  const target = readRecord(value)
  const id = requiredString(target.id, "target.id")
  const type = requiredString(target.type, "target.type")

  if (type === "issue") {
    return { id, type }
  }

  if (type === "comment") {
    return {
      id,
      issueId: requiredString(target.issueId, "target.issueId"),
      type,
    }
  }

  throw new Error("target.type must be issue or comment")
}
