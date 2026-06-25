import { type Doc } from "../../../_generated/dataModel"
import { requireLinearCredentials } from "../../../providers/linear/credentials"
import { requiredString } from "../../../shared/input"
import { linearGraphql } from "./client"

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
