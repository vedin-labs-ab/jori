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
  bot_id?: string
  channel?: string
  channel_type?: string
  text?: string
  ts?: string
  thread_ts?: string
  client_msg_id?: string
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
    actorId: event.user ?? event.bot_id,
    actorKind:
      event.bot_id === undefined ? ("user" as const) : ("bot" as const),
    conversationId: event.thread_ts ?? event.ts,
    text: event.text,
    observedAt: Number.isFinite(Number(event.ts))
      ? Math.round(Number(event.ts) * 1000)
      : undefined,
    data: {
      channelId: event.channel,
      eventId: payload.event_id,
      ts: event.ts,
      threadTs: event.thread_ts,
      channelType: event.channel_type,
      subtype: event.subtype,
      botId: event.bot_id,
    },
  }
}

function getSlackMessageType(event: SlackEvent) {
  if (event.type !== "message") {
    return event.type ?? "message"
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

  return "message"
}
