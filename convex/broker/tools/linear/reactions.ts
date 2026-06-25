import { type Doc } from "../../../_generated/dataModel"
import { requireLinearCredentials } from "../../../providers/linear/credentials"
import { requiredString } from "../../../shared/input"
import { linearGraphql } from "./client"

type ReactionTargetField = "commentId" | "issueId" | "projectUpdateId"

export async function addLinearReaction(
  integration: Doc<"integrations">,
  args: Record<string, unknown>
) {
  const credentials = requireLinearCredentials(integration)

  return await linearGraphql(credentials.tokens.access, {
    query: `
      mutation MiloAddReaction($input: ReactionCreateInput!) {
        reactionCreate(input: $input) {
          success
          reaction {
            id
            emoji
            user { id name }
          }
        }
      }
    `,
    variables: {
      input: reactionInput(args),
    },
  })
}

function reactionInput(args: Record<string, unknown>) {
  return {
    emoji: requiredString(args.emoji, "emoji"),
    ...reactionTarget(args),
  }
}

function reactionTarget(args: Record<string, unknown>) {
  const targets = [
    targetField("commentId", args.commentId),
    targetField("issueId", args.issueId),
    targetField("projectUpdateId", args.projectUpdateId),
  ].filter((target) => target !== null)

  if (targets.length !== 1) {
    throw new Error(
      "Provide exactly one Linear reaction target: commentId, issueId, or projectUpdateId."
    )
  }

  return Object.fromEntries(targets)
}

function targetField(
  field: ReactionTargetField,
  value: unknown
): [ReactionTargetField, string] | null {
  if (value === undefined || value === null) {
    return null
  }

  return [field, requiredString(value, field)]
}
