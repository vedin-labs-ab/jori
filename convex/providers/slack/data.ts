export function getSlackBotId(data: unknown) {
  return readSlackDataString(data, "botId")
}

export function getSlackTeamName(data: unknown) {
  const team = readSlackDataObject(data, "team")

  return readSlackDataString(team, "name")
}

export function getSlackChannelType(data: unknown) {
  return readSlackDataString(data, "channelType")
}

function readSlackDataObject(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "object" && value !== null ? value : undefined
}

function readSlackDataString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "string" ? value : undefined
}
