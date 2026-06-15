import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { slackQueryApi } from "../../broker/tools/slack/client"
import { requireSlackCredentials } from "./credentials"
import { getSlackChannelId } from "./data"

type SlackChannelContext = {
  id: string
  name: string
}

export async function enrichSlackMessageData(
  ctx: ActionCtx,
  args: {
    accountId: string
    data: unknown
  }
) {
  const channelId = getSlackChannelId(args.data)

  if (channelId === undefined) {
    return args.data
  }

  const integration = await ctx.runQuery(
    internal.integrations.lookup.activeByProviderExternal,
    { provider: "slack", externalId: args.accountId }
  )

  if (integration === null) {
    return args.data
  }

  const channel = await fetchSlackChannelContext(integration, channelId)

  if (channel === undefined) {
    return args.data
  }

  return {
    ...readRecord(args.data),
    channel,
  }
}

export async function fetchSlackChannelContext(
  integration: Doc<"integrations">,
  channelId: string
): Promise<SlackChannelContext | undefined> {
  try {
    const result = await slackQueryApi(
      requireSlackCredentials(integration).user,
      "conversations.info",
      { channel: channelId }
    )
    const channel = readRecord(result?.channel)
    const name = readString(channel, "name")

    return name === undefined ? undefined : { id: channelId, name }
  } catch {
    return undefined
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key]

  return typeof value === "string" && value !== "" ? value : undefined
}
