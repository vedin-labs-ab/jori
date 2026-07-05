import { type Doc } from "../../../_generated/dataModel"
import { readRecord, readString } from "../../../shared/input"
import { slackQueryApi } from "../api"
import { requireSlackCredentials } from "../credentials"
import { getSlackChannelId } from "../data"

type SlackChannelContext = {
  id: string
  name: string
}

export async function enrichSlackMessageData(args: {
  data: unknown
  integration: Doc<"integrations"> | null
}) {
  const channelId = getSlackChannelId(args.data)

  if (channelId === undefined || args.integration === null) {
    return args.data
  }

  const channel = await fetchSlackChannelContext(args.integration, channelId)

  if (channel === undefined) {
    return args.data
  }

  return {
    ...readRecord(args.data),
    channel: {
      ...readRecord(readRecord(args.data).channel),
      ...channel,
    },
  }
}

export async function resolveSlackChannelNames(
  integration: Doc<"integrations">,
  channelIds: string[]
): Promise<Map<string, string>> {
  const names = new Map<string, string>()

  await Promise.all(
    [...new Set(channelIds)].map(async (channelId) => {
      const channel = await fetchSlackChannelContext(integration, channelId)

      if (channel !== undefined) {
        names.set(channelId, channel.name)
      }
    })
  )

  return names
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
