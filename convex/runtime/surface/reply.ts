import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { requireGitHubRuntimeToken } from "../../integrations/github/credentials"
import {
  addIssueComment,
  replyToPullRequestReviewComment,
} from "../../integrations/github/delivery/comments"
import { postLinearComment } from "../../integrations/linear/delivery/comments"
import { prepareIntegrationForRuntime } from "../../integrations/runtime"
import {
  postSlackMessage,
  type SlackBlock,
} from "../../integrations/slack/delivery/messages"
import { type ReplyAddress } from "../../messages/surface"
import { type AgentRuntimeInput } from "../../runs/agent/input"

export async function sendSurfaceReply(
  ctx: ActionCtx,
  input: Extract<AgentRuntimeInput, { type: "message" }>,
  address: ReplyAddress,
  args: {
    blocks?: SlackBlock[]
    text: string
  }
) {
  const integration = await prepareIntegrationForRuntime(ctx, {
    integration: input.integration,
  })

  switch (address.type) {
    case "slack":
      await sendSlackReply(integration, address, args)
      return
    case "linear":
      await sendLinearReply(integration, address, args.text)
      return
    case "github":
      await sendGitHubReply(integration, address, args.text)
      return
  }

  assertNever(address)
}

export function optionalSlackBlocks(value: unknown): SlackBlock[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!Array.isArray(value) || !value.every(isSlackBlock)) {
    throw new Error("blocks must be an array of Block Kit block objects")
  }

  return value.length === 0 ? undefined : value
}

async function sendGitHubReply(
  integration: Doc<"integrations">,
  address: Extract<ReplyAddress, { type: "github" }>,
  text: string
) {
  if (address.kind === "issue") {
    await addIssueComment(requireGitHubRuntimeToken(integration), {
      owner: address.owner,
      repo: address.repo,
      issueNumber: address.issueNumber,
      body: text,
    })
    return
  }

  await replyToPullRequestReviewComment(
    requireGitHubRuntimeToken(integration),
    {
      owner: address.owner,
      repo: address.repo,
      pullNumber: address.pullNumber,
      commentId: githubCommentId(address.commentId),
      body: text,
    }
  )
}

function githubCommentId(value: string | undefined) {
  const id = Number(value)

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("GitHub review reply target is invalid.")
  }

  return id
}

async function sendLinearReply(
  integration: Doc<"integrations">,
  address: Extract<ReplyAddress, { type: "linear" }>,
  text: string
) {
  await postLinearComment(integration, {
    body: text,
    target: address.target,
  })
}

async function sendSlackReply(
  integration: Doc<"integrations">,
  address: Extract<ReplyAddress, { type: "slack" }>,
  args: {
    blocks?: SlackBlock[]
    text: string
  }
) {
  await postSlackMessage(integration, {
    blocks: args.blocks,
    channel: address.channelId,
    text: args.text,
    thread_ts: address.threadTs,
  })
}

function assertNever(value: never): never {
  throw new Error(`Unsupported reply target: ${JSON.stringify(value)}`)
}

function isSlackBlock(value: unknown): value is SlackBlock {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
