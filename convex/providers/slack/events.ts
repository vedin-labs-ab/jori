export type SlackEventPayload = {
  type: string
  challenge?: string
  team_id?: string
  event_id?: string
  event?: SlackEvent
  authorizations?: Array<{
    team_id?: string
  }>
}

type SlackEvent = {
  type?: string
  subtype?: string
  user?: string
  item_user?: string
  bot_id?: string
  channel?: string
  channel_type?: string
  text?: string
  ts?: string
  thread_ts?: string
  client_msg_id?: string
  reaction?: string
  event_ts?: string
  item?: {
    type?: string
    channel?: string
    ts?: string
  }
}

export function getSlackMessage(payload: SlackEventPayload) {
  const event = payload.event

  if (event === undefined) {
    return null
  }

  if (event.type !== "app_mention" && event.type !== "message") {
    return null
  }

  if (event.ts === undefined) {
    return null
  }

  const accountId =
    payload.team_id ??
    payload.authorizations?.find((authorization) => authorization.team_id)
      ?.team_id

  if (accountId === undefined) {
    return null
  }

  const externalId = `slack:${accountId}:${event.client_msg_id ?? event.ts}`

  return {
    accountId,
    type: getSlackMessageType(event),
    externalId,
    mentioned: event.type === "app_mention",
    actorId: event.user ?? event.bot_id,
    actorAliases: slackActorAliases(event),
    actorKind:
      event.bot_id === undefined ? ("user" as const) : ("bot" as const),
    conversationId: event.thread_ts ?? event.ts,
    text: event.text,
    observedAt: Number.isFinite(Number(event.ts))
      ? Math.round(Number(event.ts) * 1000)
      : undefined,
    data: slackMessageData(payload, event),
  }
}

export function getSlackReaction(payload: SlackEventPayload) {
  const event = payload.event

  if (event === undefined) {
    return null
  }

  if (event.type !== "reaction_added" && event.type !== "reaction_removed") {
    return null
  }

  if (
    event.user === undefined ||
    event.reaction === undefined ||
    event.item?.type !== "message" ||
    event.item.channel === undefined ||
    event.item.ts === undefined
  ) {
    return null
  }

  const accountId =
    payload.team_id ??
    payload.authorizations?.find((authorization) => authorization.team_id)
      ?.team_id

  if (accountId === undefined) {
    return null
  }

  const channelId = event.item.channel
  const messageTs = event.item.ts

  return {
    accountId,
    action:
      event.type === "reaction_added"
        ? ("added" as const)
        : ("removed" as const),
    actorId: event.user,
    externalId: slackReactionExternalId(payload, event, {
      accountId,
      channelId,
      messageTs,
    }),
    observedAt: Number.isFinite(Number(event.event_ts))
      ? Math.round(Number(event.event_ts) * 1000)
      : undefined,
    reaction: `:${event.reaction}:`,
    target: {
      key: `slack:message:${channelId}:${messageTs}`,
      identifiers: [`slack:channel:${channelId}`, `slack:message:${messageTs}`],
      actorId: event.item_user,
      conversationId: messageTs,
    },
  }
}

function slackReactionExternalId(
  payload: SlackEventPayload,
  event: SlackEvent,
  target: {
    accountId: string
    channelId: string
    messageTs: string
  }
) {
  return [
    "slack",
    target.accountId,
    payload.event_id ??
      [
        event.type,
        event.user,
        event.reaction,
        target.channelId,
        target.messageTs,
        event.event_ts,
      ].join(":"),
  ].join(":")
}

function slackMessageData(payload: SlackEventPayload, event: SlackEvent) {
  return {
    ts: event.ts,
    ...optionalObject("channel", slackChannel(event)),
    ...optionalObject("thread", slackThread(event)),
    ...optionalObject("event", slackEvent(payload, event)),
  }
}

function slackActorAliases(event: SlackEvent) {
  if (event.bot_id === undefined || event.bot_id === event.user) {
    return []
  }

  return [{ type: "slack.bot", id: event.bot_id }]
}

function slackChannel(event: SlackEvent) {
  if (event.channel === undefined) {
    return undefined
  }

  return { id: event.channel }
}

function slackThread(event: SlackEvent) {
  return event.thread_ts === undefined ? undefined : { ts: event.thread_ts }
}

function slackEvent(payload: SlackEventPayload, event: SlackEvent) {
  if (payload.event_id === undefined && event.subtype === undefined) {
    return undefined
  }

  return {
    ...optionalString("id", payload.event_id),
    ...optionalString("subtype", event.subtype),
  }
}

function getSlackMessageType(event: SlackEvent) {
  if (event.type !== "message" && event.type !== "app_mention") {
    return "message.unknown"
  }

  if (event.channel_type === "channel") {
    return "message.channels"
  }

  if (event.channel_type === "group") {
    return "message.groups"
  }

  if (event.channel_type === "im") {
    return "message.im"
  }

  if (event.channel_type === "mpim") {
    return "message.mpim"
  }

  return "message.unknown"
}

function optionalObject(
  key: string,
  value: Record<string, unknown> | undefined
) {
  return value === undefined ? {} : { [key]: value }
}

function optionalString(key: string, value: string | undefined) {
  return value === undefined || value === "" ? {} : { [key]: value }
}
