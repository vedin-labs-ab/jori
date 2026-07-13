export function slackChannelUrl({
  channelId,
  teamId,
}: {
  channelId: string | undefined
  teamId: string | null | undefined
}) {
  if (teamId == null || channelId === undefined) {
    return undefined
  }

  const params = new URLSearchParams({
    channel: channelId,
    team: teamId,
  })

  return `https://slack.com/app_redirect?${params.toString()}`
}

export function slackMessageUrl({
  channelId,
  messageTs,
  teamId,
}: {
  channelId: string | undefined
  messageTs: string | undefined
  teamId: string | null | undefined
}) {
  if (teamId == null || channelId === undefined || messageTs === undefined) {
    return undefined
  }

  const params = new URLSearchParams({
    channel: channelId,
    message_ts: messageTs,
    team: teamId,
  })

  return `https://slack.com/app_redirect?${params.toString()}`
}
