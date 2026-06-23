import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { callGitHubTool } from "../../broker/tools/github"
import { callLinearTool } from "../../broker/tools/linear"
import {
  postSlackMessage,
  type SlackBlock,
} from "../../broker/tools/slack/index"
import { prepareIntegrationForRuntime } from "../../integrations/runtime"
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

  if (address.type === "slack") {
    await postSlackMessage(integration, {
      blocks: args.blocks,
      channel: address.channelId,
      text: args.text,
      thread_ts: address.threadTs,
    })
    return
  }

  if (address.type === "linear") {
    await callLinearTool(integration, "linear_add_comment", {
      issueId: address.issueId,
      body: args.text,
    })
    return
  }

  await sendGitHubReply(integration, address, args.text)
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
    await callGitHubTool(integration, "github_add_issue_comment", {
      owner: address.owner,
      repo: address.repo,
      issueNumber: address.issueNumber,
      body: text,
    })
    return
  }

  await callGitHubTool(
    integration,
    "github_reply_to_pull_request_review_comment",
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

function isSlackBlock(value: unknown): value is SlackBlock {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
