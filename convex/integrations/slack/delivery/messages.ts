import { type Doc } from "../../../_generated/dataModel"
import { type FileAttachment } from "../../../files/attachments"
import { requiredString } from "../../../shared/input"
import { slackJsonApi } from "../api"
import { requireSlackCredentials } from "../credentials"
import { postSlackFiles } from "./upload"

export type SlackBlock = Record<string, unknown>

export async function postSlackMessage(
  integration: Doc<"integrations">,
  args: {
    channel: string
    text: string
    thread_ts?: string
    blocks?: SlackBlock[]
    files?: FileAttachment[]
  }
) {
  const credentials = requireSlackCredentials(integration)
  const files = args.files ?? []

  if (files.length > 0) {
    return await postSlackFiles(credentials.bot.access, {
      files,
      channel: args.channel,
      text: args.text,
      thread_ts: args.thread_ts,
    })
  }

  return await slackJsonApi(credentials.bot.access, "chat.postMessage", {
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

  return await slackJsonApi(credentials.bot.access, "chat.update", {
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

  return await addSlackReaction(credentials.bot.access, args)
}

async function addSlackReaction(token: string, args: Record<string, unknown>) {
  return await slackJsonApi(token, "reactions.add", {
    channel: requiredString(args.channel, "channel"),
    name: requiredReactionName(args.name),
    timestamp: requiredString(args.timestamp, "timestamp"),
  })
}

function requiredReactionName(value: unknown) {
  const name = requiredString(value, "name").replace(/^:+|:+$/g, "")

  if (name === "") {
    throw new Error("name is required")
  }

  return name
}
