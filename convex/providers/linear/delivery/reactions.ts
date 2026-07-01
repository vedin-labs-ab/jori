import { type Doc } from "../../../_generated/dataModel"
import {
  readRecord,
  requiredObject,
  requiredString,
} from "../../../shared/input"
import { requireLinearCredentials } from "../credentials"
import { linearGraphql } from "../graphql"

type ReactionTargetField = "commentId" | "issueId" | "projectUpdateId"
type ReactionTargetType = "comment" | "issue" | "projectUpdate"
type LinearReactionTarget = {
  id: string
  type: ReactionTargetType
}

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
  const target = readReactionTarget(args.target)
  const field = reactionTargetField(target.type)

  return { [field]: target.id }
}

function readReactionTarget(value: unknown): LinearReactionTarget {
  const target = readRecord(requiredObject(value, "target"))
  const id = requiredString(target.id, "target.id")
  const type = requiredString(target.type, "target.type")

  if (type === "comment" || type === "issue" || type === "projectUpdate") {
    return { id, type }
  }

  throw new Error("target.type must be comment, issue, or projectUpdate")
}

function reactionTargetField(type: ReactionTargetType): ReactionTargetField {
  switch (type) {
    case "comment":
      return "commentId"
    case "issue":
      return "issueId"
    case "projectUpdate":
      return "projectUpdateId"
  }
}
