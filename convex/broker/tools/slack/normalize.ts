import { compactRecord } from "../../../../contracts/json"
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

  return compactRecord({
    ts: optionalString(message.ts) ?? "",
    threadTs: optionalString(message.thread_ts),
    userId: optionalString(message.user),
    botId: optionalString(message.bot_id),
    subtype: optionalString(message.subtype),
    text: optionalString(message.text) ?? "",
    blocks:
      Array.isArray(message.blocks) && message.blocks.length > 0
        ? message.blocks
        : undefined,
    reactions: reactions.length > 0 ? reactions : undefined,
    replyCount:
      typeof message.reply_count === "number" ? message.reply_count : undefined,
    edited: message.edited === undefined ? undefined : true,
  })
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

  return compactRecord({
    matches: readArray(messages.matches)
      .map(readRecord)
      .map((match) =>
        compactRecord({
          ...slackMessage(match),
          channelId: optionalString(readRecord(match.channel).id),
          channelName: optionalString(readRecord(match.channel).name),
          permalink: optionalString(match.permalink),
        })
      ),
    totalCount: typeof messages.total === "number" ? messages.total : 0,
    page: typeof paging.page === "number" ? paging.page : undefined,
    pageCount: typeof paging.pages === "number" ? paging.pages : undefined,
  })
}

export function slackSentResult(result: unknown) {
  const envelope = readRecord(result)

  return compactRecord({
    status: "sent" as const,
    channel: optionalString(envelope.channel),
    ts: optionalString(envelope.ts),
  })
}

function slackChannel(channel: Record<string, unknown>) {
  return compactRecord({
    channelId: optionalString(channel.id) ?? "",
    name: optionalString(channel.name),
    type: slackChannelType(channel),
    topic: optionalString(readRecord(channel.topic).value),
    memberCount:
      typeof channel.num_members === "number" ? channel.num_members : undefined,
    archived: channel.is_archived === true ? true : undefined,
    userId: optionalString(channel.user),
  })
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

  return compactRecord({
    userId: optionalString(member.id) ?? "",
    name: optionalString(member.name),
    realName: optionalString(member.real_name),
    displayName: optionalString(profile.display_name),
    email: optionalString(profile.email),
    isBot: member.is_bot === true ? true : undefined,
    deleted: member.deleted === true ? true : undefined,
    timeZone: optionalString(member.tz),
  })
}

function nextCursor(envelope: Record<string, unknown>) {
  const cursor = optionalString(
    readRecord(envelope.response_metadata).next_cursor
  )

  return cursor === undefined ? {} : { nextCursor: cursor }
}
