import { getLinearBotId } from "./data"

export function isMiloRelevantLinearMessage(
  text: string | undefined,
  type: string
) {
  if (type.startsWith("comment.")) {
    return mentionsMilo(text)
  }

  return false
}

export function isLinearAppMessage(
  actorId: string | undefined,
  integrationData: unknown
) {
  if (actorId === undefined) {
    return false
  }

  return actorId === getLinearBotId(integrationData)
}

function mentionsMilo(text: string | undefined) {
  return text !== undefined && /\bmilo\b/i.test(text)
}
