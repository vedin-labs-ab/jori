import { getSlackBotUserId, getSlackChannelType } from "./data"

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

  const botUserId = getSlackBotUserId(integrationData)

  if (botUserId !== undefined && text.includes(`<@${botUserId}>`)) {
    return true
  }

  return getSlackChannelType(messageData) === "im" && /\bmilo\b/i.test(text)
}
