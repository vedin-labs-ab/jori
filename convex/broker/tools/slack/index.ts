import { type Doc } from "../../../_generated/dataModel"
import { type AssetContext, readRunAssets } from "../../../assets/read"
import { slackQueryApi } from "../../../integrations/slack/api"
import { requireSlackCredentials } from "../../../integrations/slack/credentials"
import {
  addSlackMessageReaction,
  postSlackMessage,
  type SlackBlock,
} from "../../../integrations/slack/delivery/messages"
import {
  boundedNumber,
  optionalString,
  requiredString,
} from "../../../shared/input"
import {
  slackChannelListing,
  slackMemberListing,
  slackMessageListing,
  slackSearchListing,
  slackSentResult,
} from "./normalize"

export async function callSlackTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>,
  context?: AssetContext
) {
  const credentials = requireSlackCredentials(integration)

  if (tool === "channels_list") {
    return slackChannelListing(
      await slackQueryApi(credentials.user, "conversations.list", {
        limit: boundedNumber(args.limit, 100, 1, 1000),
        cursor: optionalString(args.cursor),
        types:
          optionalString(args.types) ??
          "public_channel,private_channel,im,mpim",
      })
    )
  }

  if (tool === "conversations_history") {
    return slackMessageListing(
      await slackQueryApi(credentials.user, "conversations.history", {
        channel: requiredString(args.channel, "channel"),
        limit: boundedNumber(args.limit, 50, 1, 100),
        latest: optionalString(args.latest),
        oldest: optionalString(args.oldest),
        inclusive:
          typeof args.inclusive === "boolean" ? args.inclusive : undefined,
      })
    )
  }

  if (tool === "conversations_replies") {
    return slackMessageListing(
      await slackQueryApi(credentials.user, "conversations.replies", {
        channel: requiredString(args.channel, "channel"),
        ts: requiredString(args.ts, "ts"),
        limit: boundedNumber(args.limit, 50, 1, 100),
      })
    )
  }

  if (tool === "conversations_search_messages") {
    return slackSearchListing(
      await slackQueryApi(credentials.user, "search.messages", {
        query: requiredString(args.query, "query"),
        count: boundedNumber(args.count, 20, 1, 100),
        page: boundedNumber(args.page, 1, 1, 100),
      })
    )
  }

  if (tool === "users_search") {
    return await searchSlackUsers(credentials.user, args)
  }

  if (tool === "conversations_add_message") {
    return slackSentResult(
      await postSlackMessageTool(integration, args, context)
    )
  }

  if (tool === "slack_add_reaction") {
    await addSlackMessageReaction(integration, {
      channel: requiredString(args.channel, "channel"),
      name: requiredString(args.name, "name"),
      timestamp: requiredString(args.timestamp, "timestamp"),
    })

    return { status: "added" as const }
  }

  throw new Error(`Unknown Slack tool: ${tool}`)
}

async function searchSlackUsers(token: string, args: Record<string, unknown>) {
  const result = await slackQueryApi(token, "users.list", {
    limit: boundedNumber(args.limit, 100, 1, 200),
    cursor: optionalString(args.cursor),
  })
  const query = optionalString(args.query)?.toLowerCase()

  if (
    result === null ||
    query === undefined ||
    !Array.isArray(result.members)
  ) {
    return slackMemberListing(result)
  }

  return slackMemberListing({
    ...result,
    members: result.members.filter((member: Record<string, unknown>) =>
      JSON.stringify(member).toLowerCase().includes(query)
    ),
  })
}

async function postSlackMessageTool(
  integration: Doc<"integrations">,
  args: Record<string, unknown>,
  context?: AssetContext
) {
  const assets = await readRunAssets(context, args.assets, {
    maxBytes: 25 * 1024 * 1024,
  })
  const channel = requiredString(args.channel, "channel")
  const threadTs = optionalString(args.thread_ts)
  const text = requiredString(args.text, "text")
  const blocks = optionalBlocks(args.blocks)

  return await postSlackMessage(integration, {
    assets,
    blocks,
    channel,
    text,
    thread_ts: threadTs,
  })
}

function optionalBlocks(value: unknown) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (
    !Array.isArray(value) ||
    !value.every(
      (block) =>
        typeof block === "object" && block !== null && !Array.isArray(block)
    )
  ) {
    throw new Error("blocks must be an array of Block Kit block objects")
  }

  return value.length === 0 ? undefined : (value as SlackBlock[])
}
