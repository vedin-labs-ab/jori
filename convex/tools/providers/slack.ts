import { type Doc } from "../../_generated/dataModel"
import { requireSlackCredentials } from "../../providers/slack/credentials"
import {
  boundedNumber,
  fetchJson,
  optionalString,
  requiredString,
} from "./common"

export type SlackBlock = Record<string, unknown>

export async function postSlackMessage(
  integration: Doc<"integrations">,
  args: {
    channel: string
    text: string
    thread_ts?: string
    blocks?: SlackBlock[]
  }
) {
  const credentials = requireSlackCredentials(integration)

  return await slackApi(credentials.bot, "chat.postMessage", {
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

  return await slackApi(credentials.bot, "chat.update", {
    channel: args.channel,
    ts: args.ts,
    text: args.text,
    blocks: args.blocks,
  })
}

export async function callSlackTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>
) {
  const credentials = requireSlackCredentials(integration)

  if (tool === "channels_list") {
    return await slackApi(credentials.user, "conversations.list", {
      limit: boundedNumber(args.limit, 100, 1, 1000),
      cursor: optionalString(args.cursor),
      types:
        optionalString(args.types) ?? "public_channel,private_channel,im,mpim",
    })
  }

  if (tool === "conversations_history") {
    return await slackApi(credentials.user, "conversations.history", {
      channel: requiredString(args.channel, "channel"),
      limit: boundedNumber(args.limit, 50, 1, 100),
      latest: optionalString(args.latest),
      oldest: optionalString(args.oldest),
      inclusive:
        typeof args.inclusive === "boolean" ? args.inclusive : undefined,
    })
  }

  if (tool === "conversations_replies") {
    return await slackApi(credentials.user, "conversations.replies", {
      channel: requiredString(args.channel, "channel"),
      ts: requiredString(args.ts, "ts"),
      limit: boundedNumber(args.limit, 50, 1, 100),
    })
  }

  if (tool === "conversations_search_messages") {
    return await slackApi(credentials.user, "search.messages", {
      query: requiredString(args.query, "query"),
      count: boundedNumber(args.count, 20, 1, 100),
      page: boundedNumber(args.page, 1, 1, 100),
    })
  }

  if (tool === "users_search") {
    const result = await slackApi(credentials.user, "users.list", {
      limit: boundedNumber(args.limit, 100, 1, 200),
      cursor: optionalString(args.cursor),
    })
    const query = optionalString(args.query)?.toLowerCase()

    if (query === undefined || !Array.isArray(result.members)) {
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
      channel: requiredString(args.channel, "channel"),
      text: requiredString(args.text, "text"),
      thread_ts: optionalString(args.thread_ts),
    })
  }

  throw new Error(`Unknown Slack tool: ${tool}`)
}

async function slackApi(
  token: string,
  method: string,
  body: Record<string, unknown>
) {
  const result = await fetchJson(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body,
  })

  if (result !== null && result.ok === false) {
    throw new Error(`Slack API request failed: ${JSON.stringify(result)}`)
  }

  return result
}
