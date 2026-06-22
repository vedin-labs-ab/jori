import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx, internalQuery } from "../../_generated/server"
import { callGitHubTool } from "../../broker/tools/github"
import { callLinearTool } from "../../broker/tools/linear"
import { postSlackMessage } from "../../broker/tools/slack"
import { activeMessageIntegration } from "../../messages/data"
import { type ReplyAddress, replyAddress } from "../../messages/surface"
import { readProviderDataString } from "../../providers/data"

export async function sendOutboxReply(ctx: ActionCtx, item: Doc<"outbox">) {
  const operation = item.operation

  if (operation.type !== "reply.send") {
    return undefined
  }

  const source = await replySource(ctx, item)

  if (source === null) {
    return undefined
  }

  return await sendReply(source.integration, source.address, operation.text)
}

async function replySource(ctx: ActionCtx, item: Doc<"outbox">) {
  const operation = item.operation

  if (operation.type !== "reply.send") {
    return null
  }

  const source: ReplySource | null = await ctx.runQuery(
    internal.runtime.replies.delivery.getReplySource,
    {
      messageId: operation.messageId,
      tenantId: item.tenantId,
    }
  )

  return source
}

export const getReplySource = internalQuery({
  args: {
    messageId: v.id("messages"),
    tenantId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    if (message === null || message.tenantId !== args.tenantId) {
      return null
    }

    const integration = await activeMessageIntegration(ctx, message)
    const address = replyAddress(message)

    return integration === null || address === null
      ? null
      : { address, integration }
  },
})

type ReplySource = {
  address: ReplyAddress
  integration: Doc<"integrations">
}

async function sendReply(
  integration: Doc<"integrations">,
  address: ReplyAddress,
  text: string
) {
  switch (address.type) {
    case "github":
      return await sendGitHubReply(integration, address, text)
    case "linear":
      return await sendLinearReply(integration, address, text)
    case "slack":
      return await sendSlackReply(integration, address, text)
  }
}

async function sendGitHubReply(
  integration: Doc<"integrations">,
  address: Extract<ReplyAddress, { type: "github" }>,
  body: string
) {
  const result = await callGitHubTool(
    integration,
    address.kind === "review"
      ? "github_reply_to_pull_request_review_comment"
      : "github_add_issue_comment",
    githubReplyArgs(address, body)
  )

  return readDeliveryId(result, "GitHub reply")
}

function githubReplyArgs(
  address: Extract<ReplyAddress, { type: "github" }>,
  body: string
) {
  if (address.kind === "review") {
    return {
      owner: address.owner,
      repo: address.repo,
      pullNumber: numberId(address.pullNumber, "GitHub pull number"),
      commentId: numberId(address.commentId, "GitHub comment ID"),
      body,
    }
  }

  return {
    owner: address.owner,
    repo: address.repo,
    issueNumber: numberId(address.issueNumber, "GitHub issue number"),
    body,
  }
}

async function sendLinearReply(
  integration: Doc<"integrations">,
  address: Extract<ReplyAddress, { type: "linear" }>,
  body: string
) {
  const result = await callLinearTool(integration, "linear_add_comment", {
    issueId: address.issueId,
    body,
  })

  return readDeliveryId(result, "Linear reply")
}

async function sendSlackReply(
  integration: Doc<"integrations">,
  address: Extract<ReplyAddress, { type: "slack" }>,
  text: string
) {
  const response = await postSlackMessage(integration, {
    channel: address.channelId,
    text,
    thread_ts: address.threadTs,
  })

  return readDeliveryId(response, "Slack reply")
}

function readDeliveryId(result: unknown, label: string) {
  const id =
    readProviderDataString(result, "id") ?? readProviderDataString(result, "ts")

  if (id === undefined) {
    throw new Error(`${label} did not return a delivery id.`)
  }

  return id
}

function numberId(value: number | string | undefined, label: string) {
  const id = typeof value === "number" ? value : Number(value)

  if (!Number.isInteger(id)) {
    throw new Error(`${label} is invalid.`)
  }

  return id
}
