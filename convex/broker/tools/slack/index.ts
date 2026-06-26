import { type Doc } from "../../../_generated/dataModel"
import {
  type AssetContext,
  type RunAsset,
  readRunAssets,
} from "../../../assets/read"
import { slackJsonApi, slackQueryApi } from "../../../providers/slack/api"
import { requireSlackCredentials } from "../../../providers/slack/credentials"
import {
  boundedNumber,
  optionalString,
  requiredString,
} from "../../../shared/input"
import { postSlackFiles } from "./upload"

export type SlackBlock = Record<string, unknown>

export async function postSlackMessage(
  integration: Doc<"integrations">,
  args: {
    channel: string
    text: string
    thread_ts?: string
    blocks?: SlackBlock[]
    assets?: RunAsset[]
  }
) {
  const credentials = requireSlackCredentials(integration)
  const assets = args.assets ?? []

  if (assets.length > 0) {
    return await postSlackFiles(credentials.bot, {
      assets,
      channel: args.channel,
      text: args.text,
      thread_ts: args.thread_ts,
    })
  }

  return await slackJsonApi(credentials.bot, "chat.postMessage", {
    channel: args.channel,
    text: args.text,
    thread_ts: args.thread_ts,
    blocks: args.blocks,
  })
}

export async function updateSlackMessage(
  integration: Doc<"integrations">,
  args: {
    channel: string
    ts: string
    text: string
    blocks?: SlackBlock[]
  }
) {
  const credentials = requireSlackCredentials(integration)

  return await slackJsonApi(credentials.bot, "chat.update", {
    channel: args.channel,
    ts: args.ts,
    text: args.text,
    blocks: args.blocks,
  })
}

export async function addSlackMessageReaction(
  integration: Doc<"integrations">,
  args: {
    channel: string
    name: string
    timestamp: string
  }
) {
  const credentials = requireSlackCredentials(integration)

  return await addSlackReaction(credentials.bot, args)
}

export async function callSlackTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>,
  context?: AssetContext
) {
  const credentials = requireSlackCredentials(integration)

  if (tool === "channels_list") {
    return await slackQueryApi(credentials.user, "conversations.list", {
      limit: boundedNumber(args.limit, 100, 1, 1000),
      cursor: optionalString(args.cursor),
      types:
        optionalString(args.types) ?? "public_channel,private_channel,im,mpim",
    })
  }

  if (tool === "conversations_history") {
    return await slackQueryApi(credentials.user, "conversations.history", {
      channel: requiredString(args.channel, "channel"),
      limit: boundedNumber(args.limit, 50, 1, 100),
      latest: optionalString(args.latest),
      oldest: optionalString(args.oldest),
      inclusive:
        typeof args.inclusive === "boolean" ? args.inclusive : undefined,
    })
  }

  if (tool === "conversations_replies") {
    return await slackQueryApi(credentials.user, "conversations.replies", {
      channel: requiredString(args.channel, "channel"),
      ts: requiredString(args.ts, "ts"),
      limit: boundedNumber(args.limit, 50, 1, 100),
    })
  }

  if (tool === "conversations_search_messages") {
    return await slackQueryApi(credentials.user, "search.messages", {
      query: requiredString(args.query, "query"),
      count: boundedNumber(args.count, 20, 1, 100),
      page: boundedNumber(args.page, 1, 1, 100),
    })
  }

  if (tool === "users_search") {
    return await searchSlackUsers(credentials.user, args)
  }

  if (tool === "conversations_add_message") {
    return await postSlackMessageTool(integration, args, context)
  }

  if (tool === "slack_add_reaction") {
    return await addSlackReaction(credentials.bot, args)
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
    return result
  }

  return {
    ...result,
    members: result.members.filter((member: Record<string, unknown>) =>
      JSON.stringify(member).toLowerCase().includes(query)
    ),
  }
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

async function addSlackReaction(token: string, args: Record<string, unknown>) {
  return await slackJsonApi(token, "reactions.add", {
    channel: requiredString(args.channel, "channel"),
    name: requiredReactionName(args.name),
    timestamp: requiredString(args.timestamp, "timestamp"),
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

function requiredReactionName(value: unknown) {
  const name = requiredString(value, "name").replace(/^:+|:+$/g, "")

  if (name === "") {
    throw new Error("name is required")
  }

  return name
}
