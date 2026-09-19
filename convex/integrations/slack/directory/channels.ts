import { type Doc } from "../../../_generated/dataModel"
import { readRecord, readString } from "../../../shared/input"
import { slackQueryApi } from "../api"
import { requireSlackCredentials } from "../credentials"
import { getSlackChannelId } from "../data"

// Visibility is present only for real channels; DMs and group DMs carry
// none, which is what keeps them out of the places layer downstream.
type SlackChannelContext = {
  id: string
  name: string
  visibility?: "private" | "public"
  /** A Slack Connect channel: people from other workspaces read it. */
  external?: true
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

async function fetchSlackChannelContext(
  integration: Doc<"integrations">,
  channelId: string
): Promise<SlackChannelContext | undefined> {
  try {
    const result = await slackQueryApi(
      requireSlackCredentials(integration).user.access,
      "conversations.info",
      { channel: channelId }
    )
    const channel = readRecord(result?.channel)
    const name = readString(channel, "name")

    if (name === undefined) {
      return undefined
    }

    return { id: channelId, name, ...channelVisibility(channel) }
  } catch {
    return undefined
  }
}

function channelVisibility(channel: Record<string, unknown>) {
  if (channel.is_im === true || channel.is_mpim === true) {
    return {}
  }

  return {
    visibility:
      channel.is_private === true ? ("private" as const) : ("public" as const),
    ...(channel.is_ext_shared === true ? { external: true as const } : {}),
  }
}
