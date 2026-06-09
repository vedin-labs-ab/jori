import { getMicrosoftConnectedUserId, getMicrosoftMentions } from "./data"

export function isMicrosoftConnectedUserMessage(
  actorId: string | undefined,
  integrationData: unknown
) {
  const connectedUserId = getMicrosoftConnectedUserId(integrationData)

  return actorId !== undefined && actorId === connectedUserId
}

export function isMiloRelevantMicrosoftMessage(
  text: string | undefined,
  type: string,
  messageData: unknown
) {
  if (!type.startsWith("teams.")) {
    return false
  }

  if (
    getMicrosoftMentions(messageData).some((mention) =>
      /\bmilo\b/i.test(mention)
    )
  ) {
    return true
  }

  if (text === undefined) {
    return false
  }

  return /\bmilo\b/i.test(stripHtml(text))
}

function stripHtml(value: string) {
  return value.replaceAll(/<[^>]*>/g, " ")
}
