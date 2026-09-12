import { type ReplyPart } from "../../../contracts/replies/parts"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import {
  type AgentRuntimeInput,
  requireInputIntegration,
} from "../../runs/agent/input"
import { requireGitHubRuntimeToken } from "../github/credentials"
import {
  addIssueComment,
  replyToPullRequestReviewComment,
} from "../github/delivery/comments"
import { postLinearComment } from "../linear/delivery/comments"
import { prepareIntegrationForRuntime } from "../runtime"
import { postSlackMessage, type SlackBlock } from "../slack/delivery/messages"
import { type ReplyAddress } from "./targets"

type MessageInput = Extract<AgentRuntimeInput, { type: "message" }>

export async function sendSurfaceReply(
  ctx: ActionCtx,
  input: MessageInput,
  address: ReplyAddress,
  args: {
    blocks?: SlackBlock[]
    parts?: ReplyPart[]
    text: string
  }
) {
  switch (address.type) {
    case "console":
      await ctx.runMutation(internal.messages.console.reply, {
        conversationId: address.conversationId,
        parts: args.parts,
        runId: input.run._id,
        text: args.text,
      })
      return
    case "slack":
      await sendSlackReply(
        await prepareReplyIntegration(ctx, input),
        address,
        args
      )
      return
    case "linear":
      await sendLinearReply(
        await prepareReplyIntegration(ctx, input),
        address,
        args.text
      )
      return
    case "github":
      await sendGitHubReply(
        await prepareReplyIntegration(ctx, input),
        address,
        args.text
      )
      return
  }

  assertNever(address)
}

/** Provider replies go out with fresh credentials; the console needs none. */
async function prepareReplyIntegration(ctx: ActionCtx, input: MessageInput) {
  return await prepareIntegrationForRuntime(ctx, {
    integration: requireInputIntegration(input),
  })
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
