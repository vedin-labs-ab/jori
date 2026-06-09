export function isMiloRelevantGitHubMessage(
  text: string | undefined,
  type: string
) {
  if (type.startsWith("comment.")) {
    return mentionsMilo(text)
  }

  return false
}

export function isGitHubAppMessage(actorType: string | undefined) {
  return actorType === "Bot"
}

function mentionsMilo(text: string | undefined) {
  return text !== undefined && /\bmilo\b/i.test(text)
}
