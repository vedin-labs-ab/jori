export type MicrosoftTeamsMessageResource = {
  type: "teams.channel_reply" | "teams.channel_message" | "teams.chat_message"
  resource: string
  teamId?: string
  channelId?: string
  chatId?: string
  messageId: string
  replyId?: string
  conversationId: string
}

export function parseTeamsMessageResource(
  resource: string
): MicrosoftTeamsMessageResource | null {
  return (
    parseGraphChannelReplyResource(resource) ??
    parseGraphChannelMessageResource(resource) ??
    parseGraphChatMessageResource(resource) ??
    parseSlashChannelReplyResource(resource) ??
    parseSlashChannelMessageResource(resource) ??
    parseSlashChatMessageResource(resource)
  )
}

function parseGraphChannelReplyResource(resource: string) {
  const match = resource.match(
    /^teams\('([^']+)'\)\/channels\('([^']+)'\)\/messages\('([^']+)'\)\/replies\('([^']+)'\)$/i
  )

  if (match === null) {
    return null
  }

  const [, teamId, channelId, messageId, replyId] = match

  return createChannelReplyTarget({
    resource,
    teamId,
    channelId,
    messageId,
    replyId,
  })
}

function parseGraphChannelMessageResource(resource: string) {
  const match = resource.match(
    /^teams\('([^']+)'\)\/channels\('([^']+)'\)\/messages\('([^']+)'\)$/i
  )

  if (match === null) {
    return null
  }

  const [, teamId, channelId, messageId] = match

  return createChannelMessageTarget({ resource, teamId, channelId, messageId })
}

function parseGraphChatMessageResource(resource: string) {
  const match = resource.match(/^chats\('([^']+)'\)\/messages\('([^']+)'\)$/i)

  if (match === null) {
    return null
  }

  const [, chatId, messageId] = match

  return createChatMessageTarget({ resource, chatId, messageId })
}

function parseSlashChannelReplyResource(resource: string) {
  const match = resource.match(
    /^teams\/([^/]+)\/channels\/([^/]+)\/messages\/([^/]+)\/replies\/([^/]+)$/i
  )

  if (match === null) {
    return null
  }

  const [, teamId, channelId, messageId, replyId] = match

  return createChannelReplyTarget({
    resource,
    teamId,
    channelId,
    messageId,
    replyId,
  })
}

function parseSlashChannelMessageResource(resource: string) {
  const match = resource.match(
    /^teams\/([^/]+)\/channels\/([^/]+)\/messages\/([^/]+)$/i
  )

  if (match === null) {
    return null
  }

  const [, teamId, channelId, messageId] = match

  return createChannelMessageTarget({ resource, teamId, channelId, messageId })
}

function parseSlashChatMessageResource(resource: string) {
  const match = resource.match(/^chats\/([^/]+)\/messages\/([^/]+)$/i)

  if (match === null) {
    return null
  }

  const [, chatId, messageId] = match

  return createChatMessageTarget({ resource, chatId, messageId })
}

function createChannelReplyTarget(args: {
  resource: string
  teamId: string
  channelId: string
  messageId: string
  replyId: string
}): MicrosoftTeamsMessageResource {
  return {
    type: "teams.channel_reply",
    resource: args.resource,
    teamId: args.teamId,
    channelId: args.channelId,
    messageId: args.messageId,
    replyId: args.replyId,
    conversationId: `teams:${args.teamId}:${args.channelId}:${args.messageId}`,
  }
}

function createChannelMessageTarget(args: {
  resource: string
  teamId: string
  channelId: string
  messageId: string
}): MicrosoftTeamsMessageResource {
  return {
    type: "teams.channel_message",
    resource: args.resource,
    teamId: args.teamId,
    channelId: args.channelId,
    messageId: args.messageId,
    conversationId: `teams:${args.teamId}:${args.channelId}:${args.messageId}`,
  }
}

function createChatMessageTarget(args: {
  resource: string
  chatId: string
  messageId: string
}): MicrosoftTeamsMessageResource {
  return {
    type: "teams.chat_message",
    resource: args.resource,
    chatId: args.chatId,
    messageId: args.messageId,
    conversationId: `chats:${args.chatId}`,
  }
}
