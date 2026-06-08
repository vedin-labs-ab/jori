export function getSlackBotUserId(data: unknown) {
  return readSlackDataString(data, "botUserId")
}

export function getSlackChannelType(data: unknown) {
  return readSlackDataString(data, "channelType")
}

function readSlackDataString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "string" ? value : undefined
}
