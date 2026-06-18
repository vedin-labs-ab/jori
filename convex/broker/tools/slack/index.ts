import { type Doc } from "../../../_generated/dataModel"
import {
  type FileAttachment,
  type FileContext,
  readFileAttachments,
} from "../../../files/attachments"
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
    attachments?: FileAttachment[]
  }
) {
  const credentials = requireSlackCredentials(integration)
  const attachments = args.attachments ?? []

  if (attachments.length > 0) {
    return await postSlackFiles(credentials.bot, {
      attachments,
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

export async function setSlackThreadStatus(
  integration: Doc<"integrations">,
  args: {
    channelId: string
    status: string
    threadTs: string
  }
) {
  const credentials = requireSlackCredentials(integration)

  return await slackJsonApi(credentials.bot, "assistant.threads.setStatus", {
    channel_id: args.channelId,
    status: args.status,
    thread_ts: args.threadTs,
  })
}

export async function callSlackTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>,
  context?: FileContext
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
    const result = await slackQueryApi(credentials.user, "users.list", {
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

  if (tool === "conversations_add_message") {
    return await postSlackMessage(integration, {
      attachments: await readFileAttachments(context, args.attachments, {
        maxBytes: 25 * 1024 * 1024,
      }),
      channel: requiredString(args.channel, "channel"),
      text: requiredString(args.text, "text"),
      thread_ts: optionalString(args.thread_ts),
      blocks: optionalBlocks(args.blocks),
    })
  }

  throw new Error(`Unknown Slack tool: ${tool}`)
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
