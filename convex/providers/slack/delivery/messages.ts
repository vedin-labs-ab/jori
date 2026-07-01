import { type Doc } from "../../../_generated/dataModel"
import { type RunAsset } from "../../../assets/read"
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
