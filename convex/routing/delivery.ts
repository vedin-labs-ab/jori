import { internal } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
import { callGitHubTool } from "../broker/tools/github"
import { callLinearTool } from "../broker/tools/linear"
import { postSlackMessage } from "../broker/tools/slack"
import { readProviderDataString } from "../providers/data"
import { type ReplyTarget, type TextReplyTarget } from "./surface"

export async function deliverTextReply(
  ctx: ActionCtx,
  target: TextReplyTarget
) {
  try {
    const deliveryId = await sendReply(target, target.text)

    await ctx.runMutation(internal.routing.replies.recordReplyDelivery, {
      deliveryId,
      routingId: target.routingId,
    })
  } catch (error) {
    await ctx.runMutation(internal.routing.replies.recordReplyFailure, {
      error: formatDeliveryError(error),
      routingId: target.routingId,
    })
  }
}

export async function deliverFinalReply(
  ctx: ActionCtx,
  content: string,
  target: ReplyTarget
) {
  try {
    const deliveryId = await sendReply(target, content)

    await ctx.runMutation(internal.routing.replies.recordFinalReplyDelivery, {
      content,
      deliveryId,
      routingId: target.routingId,
    })

    return { delivered: true }
  } catch (error) {
    await ctx.runMutation(internal.routing.replies.releaseFinalReply, {
      error: formatDeliveryError(error),
      routingId: target.routingId,
    })
    throw error
  }
}

async function sendReply(target: ReplyTarget, text: string) {
  switch (target.address.type) {
    case "github":
      return await sendGitHubReply(target, text)
    case "linear":
      return await sendLinearReply(target, text)
    case "slack":
      return await sendSlackReply(target, text)
  }
}

async function sendGitHubReply(target: ReplyTarget, text: string) {
  if (target.address.type !== "github") {
    throw new Error("Reply target is not GitHub.")
  }

  const result = await callGitHubTool(
    target.integration,
    target.address.kind === "review"
      ? "github_reply_to_pull_request_review_comment"
      : "github_add_issue_comment",
    githubReplyArgs(target.address, text)
  )

  return readDeliveryId(result, "GitHub reply")
}

function githubReplyArgs(
  address: Extract<ReplyTarget["address"], { type: "github" }>,
  body: string
) {
  if (address.kind === "review") {
    return {
      owner: address.owner,
      repo: address.repo,
      pullNumber: address.pullNumber,
      commentId: numberId(address.commentId, "GitHub comment ID"),
      body,
    }
  }

  return {
    owner: address.owner,
    repo: address.repo,
    issueNumber: address.issueNumber,
    body,
  }
}

async function sendLinearReply(target: ReplyTarget, text: string) {
  if (target.address.type !== "linear") {
    throw new Error("Reply target is not Linear.")
  }

  const result = await callLinearTool(
    target.integration,
    "linear_add_comment",
    {
      issueId: target.address.issueId,
      body: text,
    }
  )

  return readDeliveryId(result, "Linear reply")
}

async function sendSlackReply(target: ReplyTarget, text: string) {
  if (target.address.type !== "slack") {
    throw new Error("Reply target is not Slack.")
  }

  const response = await postSlackMessage(target.integration, {
    channel: target.address.channelId,
    text,
    thread_ts: target.address.threadTs,
  })
  const deliveryId = readProviderDataString(response, "ts")

  if (deliveryId === undefined) {
    throw new Error("Slack reply response is missing ts.")
  }

  return deliveryId
}

function formatDeliveryError(error: unknown) {
  return error instanceof Error ? error.message : "Reply delivery failed"
}

function readDeliveryId(value: unknown, label: string) {
  const record = readRecord(value)
  const commentCreate = readRecord(readRecord(record.data).commentCreate)
  const id = record.id ?? readRecord(commentCreate.comment).id

  if (typeof id === "string" || typeof id === "number") {
    return String(id)
  }

  throw new Error(`${label} response is missing ID.`)
}

function numberId(value: string | undefined, label: string) {
  const id = Number(value)

  if (!Number.isFinite(id)) {
    throw new Error(`${label} is invalid.`)
  }

  return id
}

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}
