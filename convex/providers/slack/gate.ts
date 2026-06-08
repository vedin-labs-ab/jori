export function isMiloRelevantMessage(
  text: string | undefined,
  type: string,
  messageData: unknown,
  integrationData: unknown
) {
  if (type === "app_mention") {
    return true
  }

  if (type === "message.im") {
    return true
  }

  if (text === undefined) {
    return false
  }

  const botUserId = getBotUserId(integrationData)

  if (botUserId !== undefined && text.includes(`<@${botUserId}>`)) {
    return true
  }

  return getChannelType(messageData) === "im" && /\bmilo\b/i.test(text)
}

function getBotUserId(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "botUserId" in data &&
    typeof data.botUserId === "string"
  ) {
    return data.botUserId
  }

  return undefined
}

function getChannelType(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "channelType" in data &&
    typeof data.channelType === "string"
  ) {
    return data.channelType
  }

  return undefined
}
