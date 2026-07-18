import { optionalString, readArray, readRecord } from "../../../shared/input"

// Slack Web API envelopes are mapped into compact Milo shapes at this edge:
// identifiers keep Slack's values (ts, channel and user IDs) so they thread
// straight back into follow-up calls, and the ok/noise fields drop away.

export type SlackMessage = {
  ts: string
  threadTs?: string
  userId?: string
  botId?: string
  subtype?: string
  text: string
  blocks?: unknown[]
  reactions?: Array<{ name: string; count: number }>
  replyCount?: number
  edited?: boolean
}

export function slackMessage(message: Record<string, unknown>): SlackMessage {
  const reactions = readArray(message.reactions)
    .map(readRecord)
    .map((reaction) => ({
      name: optionalString(reaction.name) ?? "",
      count: typeof reaction.count === "number" ? reaction.count : 0,
    }))

  return {
    ts: optionalString(message.ts) ?? "",
    ...(field("threadTs", message.thread_ts) as object),
    ...(field("userId", message.user) as object),
    ...(field("botId", message.bot_id) as object),
    ...(field("subtype", message.subtype) as object),
    text: optionalString(message.text) ?? "",
    ...(Array.isArray(message.blocks) && message.blocks.length > 0
      ? { blocks: message.blocks }
      : {}),
    ...(reactions.length > 0 ? { reactions } : {}),
    ...(typeof message.reply_count === "number"
      ? { replyCount: message.reply_count }
      : {}),
    ...(message.edited === undefined ? {} : { edited: true }),
  }
}

export function slackMessageListing(result: unknown) {
  const envelope = readRecord(result)

  return {
    messages: readArray(envelope.messages)
      .map(readRecord)
      .map((message) => slackMessage(message)),
    hasMore: envelope.has_more === true,
  }
}

export function slackChannelListing(result: unknown) {
  const envelope = readRecord(result)

  return {
    channels: readArray(envelope.channels)
      .map(readRecord)
      .map((channel) => slackChannel(channel)),
    ...nextCursor(envelope),
  }
}

export function slackMemberListing(result: unknown) {
  const envelope = readRecord(result)

  return {
    members: readArray(envelope.members)
      .map(readRecord)
      .map((member) => slackMember(member)),
    ...nextCursor(envelope),
  }
}

export function slackSearchListing(result: unknown) {
  const messages = readRecord(readRecord(result).messages)
  const paging = readRecord(messages.paging)

  return {
    matches: readArray(messages.matches)
      .map(readRecord)
      .map((match) => ({
        ...slackMessage(match),
        ...(field("channelId", readRecord(match.channel).id) as object),
        ...(field("channelName", readRecord(match.channel).name) as object),
        ...(field("permalink", match.permalink) as object),
      })),
    totalCount: typeof messages.total === "number" ? messages.total : 0,
    ...(typeof paging.page === "number" ? { page: paging.page } : {}),
    ...(typeof paging.pages === "number" ? { pageCount: paging.pages } : {}),
  }
}

export function slackSentResult(result: unknown) {
  const envelope = readRecord(result)

  return {
    status: "sent" as const,
    ...(field("channel", envelope.channel) as object),
    ...(field("ts", envelope.ts) as object),
  }
}

function slackChannel(channel: Record<string, unknown>) {
  return {
    channelId: optionalString(channel.id) ?? "",
    ...(field("name", channel.name) as object),
    type: slackChannelType(channel),
    ...(field("topic", readRecord(channel.topic).value) as object),
    ...(typeof channel.num_members === "number"
      ? { memberCount: channel.num_members }
      : {}),
    ...(channel.is_archived === true ? { archived: true } : {}),
    ...(field("userId", channel.user) as object),
  }
}

function slackChannelType(channel: Record<string, unknown>) {
  if (channel.is_im === true) {
    return "im"
  }
  if (channel.is_mpim === true) {
    return "mpim"
  }

  return channel.is_private === true ? "private_channel" : "public_channel"
}

function slackMember(member: Record<string, unknown>) {
  const profile = readRecord(member.profile)

  return {
    userId: optionalString(member.id) ?? "",
    ...(field("name", member.name) as object),
    ...(field("realName", member.real_name) as object),
    ...(field("displayName", profile.display_name) as object),
    ...(field("email", profile.email) as object),
    ...(member.is_bot === true ? { isBot: true } : {}),
    ...(member.deleted === true ? { deleted: true } : {}),
    ...(field("timeZone", member.tz) as object),
  }
}

function nextCursor(envelope: Record<string, unknown>) {
  const cursor = optionalString(
    readRecord(envelope.response_metadata).next_cursor
  )

  return cursor === undefined || cursor === "" ? {} : { nextCursor: cursor }
}

function field(key: string, value: unknown) {
  const text = optionalString(value)

  return text === undefined || text === "" ? {} : { [key]: text }
}
