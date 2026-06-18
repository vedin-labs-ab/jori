import { slackQueryApi } from "../../providers/slack/api"
import { requireSlackCredentials } from "../../providers/slack/credentials"
import {
  type AutomationEventOption,
  maxOptions,
  normalizeQuery,
  type OptionLoaderArgs,
} from "./common"

const maxSlackPages = 5
const slackChannelTypes = "public_channel,private_channel"

export async function searchSlackChannels(args: OptionLoaderArgs) {
  const credentials = requireSlackCredentials(args.integration)
  const normalizedQuery = normalizeQuery(args.query)
  const options: AutomationEventOption[] = []
  let cursor: string | undefined

  for (let page = 0; page < maxSlackPages; page += 1) {
    const result = await slackQueryApi(credentials.user, "conversations.list", {
      cursor,
      exclude_archived: true,
      limit: 200,
      types: slackChannelTypes,
    })

    for (const channel of readSlackChannels(result)) {
      if (options.length >= maxOptions) {
        return options
      }

      if (!normalizeQuery(channel.name).includes(normalizedQuery)) {
        continue
      }

      options.push({
        value: channel.id,
        label: `#${channel.name}`,
        description: slackChannelDescription(channel),
      })
    }

    cursor = readSlackCursor(result)

    if (cursor === undefined) {
      return options
    }
  }

  return options
}

type SlackChannel = {
  id: string
  name: string
  is_private?: boolean
  num_members?: number
}

function readSlackChannels(result: Record<string, unknown> | null) {
  const channels = result?.channels

  return Array.isArray(channels) ? channels.filter(isSlackChannel) : []
}

function isSlackChannel(value: unknown): value is SlackChannel {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const channel = value as Record<string, unknown>

  return typeof channel.id === "string" && typeof channel.name === "string"
}

function readSlackCursor(result: Record<string, unknown> | null) {
  const metadata = result?.response_metadata

  if (typeof metadata !== "object" || metadata === null) {
    return undefined
  }

  const cursor = (metadata as Record<string, unknown>).next_cursor

  return typeof cursor === "string" && cursor !== "" ? cursor : undefined
}

function slackChannelDescription(channel: SlackChannel) {
  const visibility = channel.is_private === true ? "Private" : "Public"

  if (typeof channel.num_members !== "number") {
    return visibility
  }

  return `${visibility} - ${channel.num_members} members`
}
