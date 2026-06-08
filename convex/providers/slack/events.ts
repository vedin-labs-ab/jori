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

export function getSlackSourceItem(payload: SlackEventPayload) {
  const event = payload.event

  if (event === undefined) {
    return null
  }

  if (
    event.type !== "app_mention" &&
    !(event.type === "message" && event.subtype === undefined)
  ) {
    return null
  }

  if (event.bot_id !== undefined || event.ts === undefined) {
    return null
  }

  const externalAccountId =
    payload.team_id ??
    payload.authorizations?.find((authorization) => authorization.team_id)
      ?.team_id

  if (externalAccountId === undefined) {
    return null
  }

  const externalId = `slack:${externalAccountId}:${event.client_msg_id ?? event.ts}`

  return {
    externalAccountId,
    kind: getSlackSourceItemKind(event),
    externalId,
    authorId: event.user,
    locationId: event.channel,
    conversationId: event.thread_ts ?? event.ts,
    content: event.text,
    observedAt: Number.isFinite(Number(event.ts))
      ? Math.round(Number(event.ts) * 1000)
      : undefined,
    data: {
      eventId: payload.event_id,
      ts: event.ts,
      threadTs: event.thread_ts,
      channelType: event.channel_type,
    },
  }
}

function getSlackSourceItemKind(event: SlackEvent) {
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
