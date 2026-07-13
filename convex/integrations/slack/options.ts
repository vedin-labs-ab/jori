import { type IntegrationOption } from "../../../contracts/integrations/options"
import {
  compactDescription,
  maxOptions,
  normalizeQuery,
  type OptionLoaderArgs,
  optionalOptionString,
  readRecord,
} from "../options/common"
import { slackQueryApi } from "./api"
import { requireSlackCredentials } from "./credentials"
import {
  readSlackDirectoryUsers,
  type SlackDirectoryUser,
  slackDirectoryUserProfile,
} from "./directory/users"

const maxSlackPages = 5
const slackChannelTypes = "public_channel,private_channel"

export async function searchSlackChannels(args: OptionLoaderArgs) {
  const credentials = requireSlackCredentials(args.integration)
  const normalizedQuery = normalizeQuery(args.query)
  const options: IntegrationOption[] = []
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

export async function searchSlackUsers(args: OptionLoaderArgs) {
  const credentials = requireSlackCredentials(args.integration)
  const normalizedQuery = normalizeQuery(args.query)
  const botUserId = optionalOptionString(
    readRecord(args.integration.data).botUserId
  )
  const options: IntegrationOption[] = []
  let cursor: string | undefined

  for (let page = 0; page < maxSlackPages; page += 1) {
    const result = await slackQueryApi(credentials.user, "users.list", {
      cursor,
      limit: 200,
    })

    for (const user of readSlackDirectoryUsers(result)) {
      if (options.length >= maxOptions) {
        return options
      }

      const option = slackUserOption(user, botUserId)

      if (
        option !== undefined &&
        normalizeQuery(
          [option.label, option.description].filter(Boolean).join(" ")
        ).includes(normalizedQuery)
      ) {
        options.push(option)
      }
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

function slackUserOption(
  user: SlackDirectoryUser,
  botUserId: string | undefined
): IntegrationOption | undefined {
  if (
    user.deleted === true ||
    user.is_bot === true ||
    user.is_app_user === true ||
    user.id === botUserId ||
    user.id === "USLACKBOT"
  ) {
    return undefined
  }

  const handle = optionalOptionString(user.name)
  const profile = slackDirectoryUserProfile(user)
  const label = profile.name

  if (label === undefined) {
    return undefined
  }

  return {
    value: user.id,
    label,
    description: compactDescription([
      handle === undefined ? undefined : `@${handle}`,
      profile.email,
    ]),
  }
}
