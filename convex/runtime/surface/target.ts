import { type SurfaceReactionTarget } from "../../../contracts/runtime"
import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import {
  getSlackChannelId,
  getSlackMessageTs,
} from "../../integrations/slack/data"
import { readDataObject, readDataString } from "../../shared/data"

export type ReactionAddress =
  | { type: "slack"; channel: string; timestamp: string }
  | {
      type: "linear"
      target: { type: "comment"; id: string } | { type: "issue"; id: string }
    }
  | {
      type: "github"
      commentId: number
      owner: string
      repo: string
      subject: "issue_comment" | "pull_request_review_comment"
    }

export async function resolveReactionAddress(
  ctx: QueryCtx,
  message: Doc<"messages">,
  target: SurfaceReactionTarget
): Promise<ReactionAddress | null> {
  if (message.integration === "slack") {
    return await resolveSlackAddress(ctx, message, target)
  }

  if (message.integration === "linear") {
    return await resolveLinearAddress(ctx, message, target)
  }

  if (message.integration === "github") {
    return await resolveGitHubAddress(ctx, message, target)
  }

  return null
}

async function resolveSlackAddress(
  ctx: QueryCtx,
  message: Doc<"messages">,
  target: SurfaceReactionTarget
) {
  if (!("messageTs" in target)) {
    return null
  }

  const match = await findVisibleMessage(
    ctx,
    message,
    (candidate) => getSlackMessageTs(candidate.data) === target.messageTs
  )
  const channel = match === null ? undefined : getSlackChannelId(match.data)

  return channel === undefined
    ? null
    : { type: "slack" as const, channel, timestamp: target.messageTs }
}

async function resolveLinearAddress(
  ctx: QueryCtx,
  message: Doc<"messages">,
  target: SurfaceReactionTarget
) {
  if (!("type" in target)) {
    return null
  }

  if (target.type === "comment" && typeof target.commentId === "string") {
    return await resolveLinearCommentAddress(ctx, message, target.commentId)
  }

  if (target.type !== "issue") {
    return null
  }

  return matchesLinearIssue(message, target.issueId)
    ? {
        type: "linear" as const,
        target: { type: "issue" as const, id: target.issueId },
      }
    : null
}

async function resolveLinearCommentAddress(
  ctx: QueryCtx,
  message: Doc<"messages">,
  commentId: string
) {
  const match = await findVisibleMessage(
    ctx,
    message,
    (candidate) => readDataString(candidate.data, "commentId") === commentId
  )

  return match === null
    ? null
    : {
        type: "linear" as const,
        target: { type: "comment" as const, id: commentId },
      }
}

async function resolveGitHubAddress(
  ctx: QueryCtx,
  message: Doc<"messages">,
  target: SurfaceReactionTarget
) {
  if (
    !("type" in target) ||
    target.type !== "comment" ||
    typeof target.commentId !== "number"
  ) {
    return null
  }

  const match = await findVisibleMessage(
    ctx,
    message,
    (candidate) => Number(githubCommentId(candidate)) === target.commentId
  )

  return match === null
    ? null
    : githubAddressForMessage(match, target.commentId)
}

// A message is addressable when it is the run's own message or sits within
// the last 100 messages of the same conversation.
export async function findVisibleMessage(
  ctx: QueryCtx,
  message: Doc<"messages">,
  predicate: (message: Doc<"messages">) => boolean
) {
  if (predicate(message)) {
    return message
  }

  if (message.conversationId === undefined) {
    return null
  }

  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", message.tenantId)
        .eq("integrationId", message.integrationId)
        .eq("conversationId", message.conversationId)
    )
    .order("desc")
    .take(100)

  return messages.find(predicate) ?? null
}

function matchesLinearIssue(message: Doc<"messages">, issueId: string) {
  return (
    message.conversationId === issueId ||
    readDataString(message.data, "issueId") === issueId
  )
}

function githubAddressForMessage(
  message: Doc<"messages">,
  commentId: number
): ReactionAddress | null {
  const repository = readDataObject(message.data, "repository")
  const fullName = readDataString(repository, "fullName")
  const parts = fullName?.split("/")

  if (parts?.length !== 2) {
    return null
  }

  return {
    type: "github",
    commentId,
    owner: parts[0],
    repo: parts[1],
    subject:
      githubCommentKind(message) === "pull_request_review"
        ? "pull_request_review_comment"
        : "issue_comment",
  }
}

function githubCommentKind(message: Doc<"messages">) {
  return readDataString(readDataObject(message.data, "comment"), "kind")
}

function githubCommentId(message: Doc<"messages">) {
  return readDataString(readDataObject(message.data, "comment"), "id")
}
